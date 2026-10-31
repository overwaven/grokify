import { table, integer, text } from 'sdk/db';

// Per-user settings. The chosen voice is used both in private chats and in
// inline mode, because inline queries carry the same Telegram user id.
export const users = table('users', {
  userId: integer('user_id').primaryKey(),
  voiceId: text('voice_id').notNull().default('eve'),
  updatedAt: integer('updated_at').notNull().default(0),
});

// Telegram file_id cache. Grok TTS is the slow and billable part, so a
// (voice, text) pair is synthesized once and then re-sent by file id.
export const voiceCache = table('voice_cache', {
  cacheKey: text('cache_key').primaryKey(),
  fileId: text('file_id').notNull(),
  voiceId: text('voice_id').notNull(),
  createdAt: integer('created_at').notNull().default(0),
});

// Simple fixed-window rate limiter, keyed by Telegram user id.
export const usage = table('usage', {
  userId: integer('user_id').primaryKey(),
  windowStart: integer('window_start').notNull(),
  count: integer('count').notNull().default(0),
});

// Inline queries arrive on every keystroke. The newest query id is stored so
// older, still-running invocations can stop before uploading/answering.
export const inlineQueries = table('inline_queries', {
  userId: integer('user_id').primaryKey(),
  queryId: text('query_id').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
