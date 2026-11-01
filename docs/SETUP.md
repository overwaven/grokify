# Setup

## Requirements

- Node.js 18 or newer.
- A Telegram bot created with [@BotFather](https://t.me/BotFather).
- An [xAI API key](https://console.x.ai) with access to the TTS API.

## 1. Prepare the bot in BotFather

1. Create a bot with `/newbot` and choose a name (for example, **Grokify**).
2. Enable inline mode with `/setinline`.
3. Open **your bot → Serverless** and turn Serverless on.
4. Open **Serverless → CLI Access** and copy the access token. It looks like
   `app<id>:<secret>` and is **not** the bot API token.

Optional polish:

- `/setname` — set the display name to **Grokify**.
- `/setdescription` — describe the bot for new users.
- `/setuserpic` — add an avatar.

> If you regenerate the bot API token later, re-enable Serverless and issue a
> fresh CLI access token. Telegram Serverless keeps its own copy of the bot
> token; a stale copy makes `webhook` and `getMe` fail with
> `Bot API request failed`.

## 2. Clone and install

```bash
git clone https://github.com/overwaven/grokify.git
cd grokify
npm install
cp config.example.js tgcloud/lib/config.js
```

## 3. Add your xAI key

Edit `tgcloud/lib/config.js`:

```js
export const XAI_API_KEY = 'xai-...';
```

`tgcloud/lib/config.js` is git-ignored. Never commit your key.

## 4. Link and deploy

```bash
npx tgcloud login     # paste the CLI access token from BotFather
npx tgcloud push      # deploy handlers, lib modules and schema
npx tgcloud migrate   # create the database tables
```

`push` deploys code only. `migrate` changes the database separately. Run both
the first time, and run `migrate` whenever `tgcloud/schema.js` changes.

## 5. First run

Open the bot's private chat and press **Start**. Then:

- send any text to get a voice note;
- send `/voice` to choose a voice;
- type `@yourbot your text` in any chat for inline mode.

The bot sets its command list (`/voice`, `/help`) on the first `/start`.

## Updating the code

```bash
git pull
npm install
npx tgcloud push
```

Run `npx tgcloud migrate` only if `tgcloud/schema.js` changed.

## Checking the deployment

```bash
npx tgcloud status      # local vs deployed
npx tgcloud webhook     # webhook URL, allowed updates, sync state
npx tgcloud run handlers/message '{ chat: { id: 1 }, text: "hi" }'
```

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common problems.
