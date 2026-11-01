import { db, fetch } from 'sdk';
import { eq } from 'sdk/db';
import { voiceCatalog } from '../schema.js';
import { XAI_API_KEY, XAI_VOICES_URL, VOICE_CACHE_TTL } from './config.js';

// Warm isolates keep the catalog in memory; cold isolates read the database.
let memory = null;

function isFresh(fetchedAt, now) {
  return Number.isFinite(fetchedAt) && now - fetchedAt < VOICE_CACHE_TTL;
}

// Returns the voice list from GET /v1/tts/voices, cached in the database.
// On a failed refresh, a stale cached list is still usable.
export async function getVoices() {
  const now = Math.floor(Date.now() / 1000);

  if (memory && isFresh(memory.fetchedAt, now)) {
    return memory.voices;
  }

  const row = await db
    .select()
    .from(voiceCatalog)
    .where(eq(voiceCatalog.id, 1))
    .get();

  if (row && Array.isArray(row.payload) && row.payload.length && isFresh(row.fetchedAt, now)) {
    memory = { voices: row.payload, fetchedAt: row.fetchedAt };
    return row.payload;
  }

  try {
    const voices = await fetchVoices();
    await db
      .insert(voiceCatalog)
      .values({ id: 1, payload: voices, fetchedAt: now })
      .onConflictDoUpdate({
        target: voiceCatalog.id,
        set: { payload: voices, fetchedAt: now },
      })
      .run();
    memory = { voices, fetchedAt: now };
    return voices;
  } catch (error) {
    if (row && Array.isArray(row.payload) && row.payload.length) {
      console.warn('voice catalog refresh failed; using the cached list', error?.message ?? error);
      memory = { voices: row.payload, fetchedAt: row.fetchedAt };
      return row.payload;
    }
    throw error;
  }
}

async function fetchVoices() {
  const res = await fetch(XAI_VOICES_URL, {
    headers: { Authorization: `Bearer ${XAI_API_KEY}` },
  });

  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.text()).slice(0, 300);
    } catch {
      // The status is enough when the body cannot be read.
    }
    const error = new Error(`xAI voices ${res.status}${detail ? `: ${detail}` : ''}`);
    error.status = res.status;
    throw error;
  }

  const data = await res.json();
  const list = Array.isArray(data?.voices) ? data.voices : [];
  if (!list.length) throw new Error('xAI returned an empty voice list');

  return list.map((voice) => ({
    id: String(voice.voice_id).toLowerCase(),
    name: String(voice.name || voice.voice_id),
    gender: voice.gender || '',
    language: voice.language || '',
  }));
}
