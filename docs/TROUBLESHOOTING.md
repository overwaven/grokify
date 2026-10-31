# Troubleshooting

## `Bot API request failed` from `tgcloud webhook` or `tgcloud run`

The bot token stored by Telegram Serverless is stale. In BotFather:

1. Open **your bot → Serverless**.
2. Turn Serverless off and on again.
3. Open **Serverless → CLI Access** and issue a new token.
4. Run `npx tgcloud login` and paste the new token.
5. Run `npx tgcloud webhook` to confirm the webhook is in sync.

This usually happens after regenerating the bot API token: the platform keeps
its own copy, and the CLI token alone does not refresh it.

## Inline mode says "Open the bot and press Start first"

Press **Start** in the bot's private chat once. Inline voice notes are uploaded
through that chat to obtain a `file_id`, and Telegram does not let a bot initiate
a private conversation.

## No inline results at all

- Enable inline mode: BotFather → `/setinline`.
- Make sure `handlers/inline_query.js` is deployed: `npx tgcloud status`, then
  `npx tgcloud push`.
- Check the webhook: `npx tgcloud webhook` should list `inline_query` in
  `allowed updates`. If not, run `npx tgcloud webhook sync`.

## The selected voice is not used inline

The voice is stored per Telegram user id. Pick it in the same account you use
for inline queries: `/voice` → tap a voice → check the checkmark.

## `/voice` opens but the checkmark does not move

- The callback handler must be deployed: `handlers/callback_query.js`.
- Run `npx tgcloud push` and try again.
- Check the bot logs with `npx tgcloud run handlers/callback_query` if needed.

## `Text is too long`

Private messages are limited to `MAX_TEXT` (4000 characters by default). Inline
queries are limited by Telegram to 256 characters. Increase `MAX_TEXT` in
`tgcloud/lib/config.js` if needed; the TTS API accepts up to 60,000 characters.

## TTS errors

- **401** — the xAI key is missing or invalid. Check `tgcloud/lib/config.js` and
  redeploy with `npx tgcloud push`.
- **404** — unknown voice id. Check `tgcloud/lib/voices.js` against
  `GET https://api.x.ai/v1/tts/voices`.
- **429** — xAI is rate limiting. Wait and try again; the bot also applies its
  own per-user limits.
- **500 / 503** — xAI is temporarily unavailable. Retry later.

## Database errors after a schema change

Run `npx tgcloud migrate`. `push` deploys code but never changes the database.
The first deployment needs both `push` and `migrate`.

## The bot replies with text instead of a voice note

Text replies are error messages: TTS failed, the rate limit was hit, or the text
was too long. Check the handler logs with:

```bash
npx tgcloud run handlers/message '{ chat: { id: 1 }, text: "hi" }'
```

## Still stuck?

Run `npx tgcloud status` and `npx tgcloud webhook`, then open an issue with the
output (remove any secrets first).
