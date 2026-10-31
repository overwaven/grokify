# Security and privacy

## API key

- The xAI key lives in `tgcloud/lib/config.js`, which is git-ignored.
- Never commit `tgcloud/lib/config.js`, paste the key into an issue, or include
  it in a pull request.
- Telegram Serverless modules do not receive environment variables, so the key
  has to be part of the deployed module. If you need stricter secret handling,
  keep the deployment private or inject the key through a secret-management
  tool.
- Rotate the key in the xAI console if it is ever exposed.

## Bot token vs CLI access token

- The **bot API token** (`<id>:<secret>`) is used by Telegram. Grokify does not
  need it in the repository.
- The **CLI access token** (`app<id>:<secret>`) is used by `tgcloud`. It is stored
  in `.tgcloud/credentials`, which is git-ignored.
- If you regenerate the bot token, re-enable Serverless and issue a fresh CLI
  access token. See [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## User data

- The bot stores only the Telegram user id, the selected voice, rate-limit
  counters and cached Telegram `file_id`s.
- Generated audio is cached as a Telegram `file_id`; the audio itself remains on
  Telegram's servers.
- Inline mode uploads a temporary carrier voice note to the **same user's**
  private chat and deletes it immediately. No third-party file host is used.
- Grokify does not read or answer group messages. Inline queries carry only the
  text the user typed, the user id and standard Telegram metadata.

## Abuse and cost

- Per-user rate limits protect the xAI key from runaway usage.
- The audio cache avoids paying twice for the same `(voice, text)` pair.
- Rate limits are not a hard spending cap. Monitor your xAI usage and rotate the
  key if needed.

## Reporting a vulnerability

Open a private security advisory on GitHub:
**Security → Advisories → Report a vulnerability**. Do not open a public issue
for a key leak or an exploitable bug.
