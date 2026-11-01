# Grokify

Turn text into **voice notes** with Grok Text-to-Speech, running on
[Telegram Serverless](https://core.telegram.org/bots/serverless).

Grokify works in private chats and inline mode: send text and get a real voice
note back, or type `@yourbot your text` in any chat.

## Features

- Real `sendVoice` voice notes — no captions, no audio tracks.
- Inline mode with `InlineQueryResultCachedVoice`.
- Per-user voice selection (`/voice`) shared by private chats and inline mode.
- All 28 official Grok voices.
- Text normalization and automatic language detection.
- `(voice, text)` audio cache via Telegram `file_id`.
- Per-user rate limits.
- No servers: handlers, database and HTTP run in Telegram's V8 isolates.

## Quick start

1. In [@BotFather](https://t.me/BotFather): `/newbot`, then `/setinline`, then
   open **your bot → Serverless** and enable it. Copy the **CLI Access** token.
2. Clone and install:

   ```bash
   git clone https://github.com/overwaven/grokify.git
   cd grokify
   npm install
   cp config.example.js tgcloud/lib/config.js
   ```

3. Put your xAI key in `tgcloud/lib/config.js`.
4. Deploy:

   ```bash
   npx tgcloud login
   npx tgcloud push
   npx tgcloud migrate
   ```

5. Press **Start** in the bot's private chat, then send text.

## Usage

- **Private chat:** send text → one voice note.
- **Voice:** `/voice` → pick from 28 voices; the choice is saved.
- **Inline:** `@yourbot your text` in any chat → tap the voice result.
- **Help:** `/help`.

## Documentation

- [Setup and BotFather](docs/SETUP.md)
- [Architecture and inline mode](docs/ARCHITECTURE.md)
- [Configuration](docs/CONFIGURATION.md)
- [Security and privacy](docs/SECURITY.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## License

[AGPL-3.0-only](LICENSE). Strong copyleft: distributed or network-facing
derivatives must be released under AGPL-3.0 with source. Proprietary and
closed-source derivatives are not permitted.
