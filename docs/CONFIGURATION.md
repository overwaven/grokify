# Configuration

All tunables live in `tgcloud/lib/config.js`, created from `config.example.js`
in the repository root.

| Option | Default | Meaning |
| --- | --- | --- |
| `XAI_API_KEY` | — | Your xAI API key. Required. |
| `XAI_TTS_URL` | `https://api.x.ai/v1/tts` | TTS endpoint. |
| `DEFAULT_VOICE` | `eve` | Voice used until the user picks another one. |
| `TTS_LANGUAGE` | `auto` | BCP-47 language code or automatic detection. |
| `DM_RATE_LIMIT` | 20 / 60 s | Voice requests per user in private chats. |
| `INLINE_RATE_LIMIT` | 300 / 60 s | Inline TTS requests per user. Inline queries arrive while typing, so this bucket is large. |
| `MAX_TEXT` | 4000 | Maximum text length accepted in private chats. |

## Voices

The official voice list is in `tgcloud/lib/voices.js`:

```text
altair   ara     atlas    aurora   carina   castor   celeste
cosmo    eve     helios   helix    iris     kepler   leo
liora    lumen   luna     lux      naksh    orion    perseus
rex      rigel   sal      sirius   ursa     zagan    zenith
```

It mirrors `GET https://api.x.ai/v1/tts/voices`. If xAI adds or removes a voice,
update the array. Voice ids are case-insensitive in the xAI API; Grokify stores
the canonical lowercase id.

To change the default voice, set `DEFAULT_VOICE` to one of the ids above. Users
can override it with `/voice`; the choice is stored per Telegram user id.

To add a custom xAI voice, add its id to `VOICES` in `tgcloud/lib/voices.js`.
The picker will show it like any built-in voice, and the TTS request will use the
custom voice id.

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

`tgcloud/schema.js` defines four tables:

- `users` — selected voice per Telegram user.
- `voice_cache` — `file_id` by `(voice, text)` hash.
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
