import { fetch } from 'sdk';
import { XAI_API_KEY, XAI_TTS_URL, TTS_LANGUAGE } from './config.js';

// xAI returns raw audio bytes. The SDK documents json()/text()/streaming, so
// support the byte readers when present and otherwise concatenate the stream.
async function readBodyBytes(res) {
  if (typeof res.bytes === 'function') {
    return new Uint8Array(await res.bytes());
  }
  if (typeof res.arrayBuffer === 'function') {
    return new Uint8Array(await res.arrayBuffer());
  }

  const chunks = [];
  let total = 0;
  for await (const chunk of res.body) {
    const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
    chunks.push(bytes);
    total += bytes.length;
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const bytes of chunks) {
    out.set(bytes, offset);
    offset += bytes.length;
  }
  return out;
}

// cyrb53-style 53-bit string hash, rendered as two base36 halves.
function hashText(text) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(36) + (h1 >>> 0).toString(36);
}

export function cacheKey(text, voiceId) {
  return `${voiceId}:${hashText(text)}`;
}

// Calls Grok TTS and returns the MP3 bytes as a Uint8Array.
export async function synthesize(text, voiceId) {
  const res = await fetch(XAI_TTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${XAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      voice_id: voiceId,
      language: TTS_LANGUAGE,
      text_normalization: true,
      output_format: {
        codec: 'mp3',
        sample_rate: 24000,
        bit_rate: 128000,
      },
    }),
  });

  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.text()).slice(0, 300);
    } catch {
      // Ignore a body that cannot be read; the status is enough.
    }
    const error = new Error(`xAI TTS ${res.status}${detail ? `: ${detail}` : ''}`);
    error.status = res.status;
    throw error;
  }

  const bytes = await readBodyBytes(res);
  if (!bytes || bytes.length === 0) {
    throw new Error('xAI TTS returned an empty audio body');
  }
  return bytes;
}
