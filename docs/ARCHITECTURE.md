# Architecture and inline mode

## Request flow

```text
Private chat                         Inline mode
------------                         -----------
text message  ──► TTS ──► sendVoice  inline_query ──► TTS
                                             │
                                             ▼
                              upload voice to the user's private chat
                                             │
                                   take voice.file_id, delete the message
                                             │
                                             ▼
                              answerInlineQuery(CachedVoice(file_id))
```

## Private chats

`handlers/message.js` accepts text only in private chats. It looks up the
user's saved voice, checks the rate limit, calls Grok TTS, and sends the result
with `sendVoice`. No caption or extra message is added. Errors are reported as
plain text because there is no audio to send.

## Inline mode

Inline queries must be answered with a `file_id` that already exists on
Telegram's servers. `handlers/inline_query.js` therefore:

1. Synthesizes the audio.
2. Uploads it to the querying user's private chat as a temporary carrier.
3. Reads `message.voice.file_id`.
4. Deletes the carrier message.
5. Answers with `InlineQueryResultCachedVoice`.

The file itself stays on Telegram's servers, so the cached `file_id` keeps
working after the carrier message is deleted. No third-party file host is used.

This also explains why inline mode requires pressing **Start** in the bot's
private chat once: Telegram does not let a bot initiate a private conversation.
If the bot cannot address the user, it answers with an "Open the bot and press
Start first" hint instead of a voice note.

## Inline query races

Telegram sends an inline query while the user is still typing. Each invocation
stores its query id in `inline_queries`, keyed by user. After the slow TTS call,
an invocation re-reads the row: if a newer query has arrived, it stops without
uploading or answering. Only the latest text produces a result, and typing does
not flood the private chat with carrier uploads.

## Audio cache

`lib/tts.js` builds a cache key from the voice id and a cyrb53-style hash of the
text. `voice_cache` stores the resulting Telegram `file_id`. Repeat requests
send the cached file directly, with no TTS call and no upload. If Telegram
rejects a cached `file_id`, `lib/voice.js` drops it and regenerates the audio.

## Rate limits

`lib/store.js` implements fixed-window buckets in the `usage` table:

- `DM_RATE_LIMIT` — 20 requests per 60 seconds per user.
- `INLINE_RATE_LIMIT` — 300 requests per 60 seconds per user.

The inline bucket is large because inline queries arrive while typing. Cached
texts do not consume the inline bucket.

## TTS request

`lib/tts.js` calls `POST https://api.x.ai/v1/tts` with:

- `text` — the user's text;
- `voice_id` — the saved voice;
- `language: "auto"` — automatic language detection;
- `text_normalization: true` — numbers, abbreviations and symbols are spoken;
- `output_format` — MP3, 24 kHz, 128 kbps.

The API accepts up to 60,000 characters per request. Grokify limits private
messages to `MAX_TEXT` (4000) and inline queries are capped by Telegram at 256
characters.

## Project layout

```text
tgcloud/
├─ handlers/
│  ├─ message.js          # private chats, commands, voice generation
│  ├─ callback_query.js   # voice picker buttons
│  └─ inline_query.js     # inline mode
├─ lib/
│  ├─ config.example.js   # template; copy to config.js
│  ├─ config.js           # secrets and tunables (git-ignored)
│  ├─ store.js            # database helpers
│  ├─ tts.js              # xAI TTS request and audio cache key
│  ├─ ui.js               # UI text and voice keyboard
│  ├─ voice.js            # sendVoice and inline carrier uploads
│  └─ voices.js           # official Grok voice list
└─ schema.js              # tables
```

## Database

- `users` — `user_id` → selected `voice_id`.
- `voice_cache` — `cache_key` → Telegram `file_id`.
- `usage` — fixed-window rate limiting.
- `inline_queries` — newest inline query id per user.

There are no foreign keys; the runtime has them disabled, so the application
keeps the tables independent.
