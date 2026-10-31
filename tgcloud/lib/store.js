import { db } from 'sdk';
import { eq } from 'sdk/db';
import { users, voiceCache, usage, inlineQueries } from '../schema.js';
import { DEFAULT_VOICE } from './config.js';

const nowSec = () => Math.floor(Date.now() / 1000);

export async function getUserVoice(userId) {
  const row = await db.select().from(users).where(eq(users.userId, userId)).get();
  return row?.voiceId || DEFAULT_VOICE;
}

export async function setUserVoice(userId, voiceId) {
  const now = nowSec();
  await db
    .insert(users)
    .values({ userId, voiceId, updatedAt: now })
    .onConflictDoUpdate({
      target: users.userId,
      set: { voiceId, updatedAt: now },
    })
    .run();
}

export async function getCachedFileId(cacheKey) {
  const row = await db
    .select()
    .from(voiceCache)
    .where(eq(voiceCache.cacheKey, cacheKey))
    .get();
  return row?.fileId ?? null;
}

export async function putCachedFileId(cacheKey, fileId, voiceId) {
  const now = nowSec();
  await db
    .insert(voiceCache)
    .values({ cacheKey, fileId, voiceId, createdAt: now })
    .onConflictDoUpdate({
      target: voiceCache.cacheKey,
      set: { fileId, voiceId, createdAt: now },
    })
    .run();
}

export async function dropCachedFileId(cacheKey) {
  await db.delete(voiceCache).where(eq(voiceCache.cacheKey, cacheKey)).run();
}

export async function takeRateLimit(userId, limit, windowSec) {
  const now = nowSec();
  const row = await db.select().from(usage).where(eq(usage.userId, userId)).get();

  if (!row || now - row.windowStart >= windowSec) {
    await db
      .insert(usage)
      .values({ userId, windowStart: now, count: 1 })
      .onConflictDoUpdate({
        target: usage.userId,
        set: { windowStart: now, count: 1 },
      })
      .run();
    return true;
  }

  if (row.count >= limit) return false;

  await db.update(usage).set({ count: row.count + 1 }).where(eq(usage.userId, userId)).run();
  return true;
}

export async function markInlineQuery(userId, queryId) {
  await db
    .insert(inlineQueries)
    .values({ userId, queryId, updatedAt: nowSec() })
    .onConflictDoUpdate({
      target: inlineQueries.userId,
      set: { queryId, updatedAt: nowSec() },
    })
    .run();
}

export async function isLatestInlineQuery(userId, queryId) {
  const row = await db
    .select()
    .from(inlineQueries)
    .where(eq(inlineQueries.userId, userId))
    .get();
  return row?.queryId === queryId;
}
