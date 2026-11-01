# Configuration

All tunables live in `tgcloud/lib/config.js`, created from `config.example.js`
in the repository root.

| Option | Default | Meaning |
| --- | --- | --- |
| `XAI_API_KEY` | — | Your xAI API key. Required. |
| `XAI_TTS_URL` | `https://api.x.ai/v1/tts` | TTS endpoint. |
| `XAI_VOICES_URL` | `https://api.x.ai/v1/tts/voices` | Voice catalog endpoint. |
| `DEFAULT_VOICE` | `eve` | Voice used until the user picks another one. Must be a valid id from the catalog. |
| `TTS_LANGUAGE` | `auto` | BCP-47 language code or automatic detection. |
| `VOICE_CACHE_TTL` | 86400 | Seconds before the cached voice catalog is refreshed (24 hours). |
| `DM_RATE_LIMIT` | 20 / 60 s | Voice requests per user in private chats. |
| `INLINE_RATE_LIMIT` | 300 / 60 s | Inline TTS requests per user. Inline queries arrive while typing, so this bucket is large. |
| `MAX_TEXT` | 4000 | Maximum text length accepted in private chats. |

## Voices

The picker is built from `GET https://api.x.ai/v1/tts/voices`; there is no
hardcoded voice list in the project. `tgcloud/lib/voice-catalog.js` fetches the
catalog, stores it as JSON in the `voice_catalog` table, and refreshes it after
`VOICE_CACHE_TTL` seconds (24 hours by default). New or removed voices appear
automatically after the cache expires.

To force a refresh, delete the cached row; the next request fetches the list:

```sql
DELETE FROM voice_catalog;
```

`tgcloud/lib/voices.js` contains only helpers (page size, id validation, name
lookup). `DEFAULT_VOICE` must be an id returned by the voices endpoint (`eve` is
the xAI default). Users can override it with `/voice`; the choice is stored per
Telegram user id.

Custom xAI voices are not returned by the built-in voices endpoint, so they do
not appear in the picker.

## Audio format

`lib/tts.js` requests MP3 at 24 kHz / 128 kbps. `sendVoice` accepts MP3, OGG/OPUS
and M4A; MP3 is used because it is what the xAI TTS API returns and Telegram
displays it as a voice note.

## Text handling

- Private messages are limited to `MAX_TEXT` characters.
- Inline queries are limited by Telegram to 256 characters.
- The TTS API accepts up to 60,000 characters per request.
- `text_normalization: true` expands numbers, abbreviations and symbols before
  synthesis.
- `language: "auto"` lets the model detect the language. Set `TTS_LANGUAGE` to a
  BCP-47 code (for example `en`, `ru`, `de`, `pt-BR`) for a fixed language.

## Database

`tgcloud/schema.js` defines five tables:

- `users` — selected voice per Telegram user.
- `voice_cache` — `file_id` by `(voice, text)` hash.
- `voice_catalog` — JSON catalog fetched from the xAI voices endpoint.
- `usage` — fixed-window rate limiting.
- `inline_queries` — newest inline query id per user.

Run `npx tgcloud migrate` after changing the schema. The platform never applies
schema changes during `push`.

## Resetting a user's voice

The voice choice is a normal row in `users`. A user can change it with `/voice`.
To reset it from the server side, delete the row:

```sql
DELETE FROM users WHERE user_id = 123456789;
```

The next request falls back to `DEFAULT_VOICE`.
