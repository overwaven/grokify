import { api, BotApiError } from 'sdk';
import {
  getUserVoice,
  takeRateLimit,
  markInlineQuery,
  isLatestInlineQuery,
  getCachedFileId,
} from '../lib/store.js';
import { getInlineFileId } from '../lib/voice.js';
import { getVoices } from '../lib/voice-catalog.js';
import { cacheKey } from '../lib/tts.js';
import { isVoiceId, voiceName } from '../lib/voices.js';
import { DEFAULT_VOICE, MAX_TEXT, INLINE_RATE_LIMIT } from '../lib/config.js';

async function botUsername() {
  try {
    const me = await api.getMe();
    return me.username ?? null;
  } catch {
    return null;
  }
}

function hintResult(id, title, description, messageText, buttonUrl, buttonText) {
  const result = {
    type: 'article',
    id,
    title,
    description,
    input_message_content: {
      message_text: messageText,
      link_preview_options: { is_disabled: true },
    },
  };
  if (buttonUrl) {
    result.reply_markup = {
      inline_keyboard: [[{ text: buttonText, url: buttonUrl }]],
    };
  }
  return result;
}

async function botLink() {
  const username = await botUsername();
  return username ? { username, url: `https://t.me/${username}?start=voice` } : null;
}

export default async function (query) {
  const userId = query.from?.id;
  const text = (query.query ?? '').trim();

  // Remember this query id. If the user keeps typing while Grok is working,
  // older invocations notice they are stale and never answer or upload.
  if (userId) await markInlineQuery(userId, query.id);
  const stillWanted = () => isLatestInlineQuery(userId, query.id);

  const saved = userId ? await getUserVoice(userId) : DEFAULT_VOICE;
  const voices = await getVoices().catch((error) => {
    console.warn('voice catalog unavailable', error?.message ?? error);
    return [];
  });
  const voiceId = voices.length && !isVoiceId(saved, voices) ? DEFAULT_VOICE : saved;

  if (!text) {
    const link = await botLink();
    return api.answerInlineQuery({
      inline_query_id: query.id,
      cache_time: 0,
      is_personal: true,
      results: [
        hintResult(
          'empty',
          "Type some text — I'll voice it with Grok",
          'For example: @bot Hello, how are you?',
          link
            ? `Type your text after the bot name and I'll send a voice note. Voice: ${voiceName(voiceId, voices)}.`
            : "Type your text after the bot name and I'll send a voice note.",
          link?.url,
          'Choose a voice',
        ),
      ],
    });
  }

  if (text.length > MAX_TEXT) {
    return api.answerInlineQuery({
      inline_query_id: query.id,
      cache_time: 0,
      is_personal: true,
      results: [
        hintResult(
          'too-long',
          'Text is too long',
          `Maximum ${MAX_TEXT} characters`,
          `Text is too long. Maximum ${MAX_TEXT} characters.`,
        ),
      ],
    });
  }

  const key = cacheKey(text, voiceId);
  const cached = await getCachedFileId(key);

  if (
    !cached &&
    userId &&
    !(await takeRateLimit(userId, INLINE_RATE_LIMIT.limit, INLINE_RATE_LIMIT.windowSec))
  ) {
    return api.answerInlineQuery({
      inline_query_id: query.id,
      cache_time: 0,
      is_personal: true,
      results: [
        hintResult(
          'rate',
          'Too many requests',
          'Wait a minute and try again',
          'Too many voice requests. Wait a minute and try again.',
        ),
      ],
    });
  }

  if (userId && !(await stillWanted())) return;

  try {
    const fileId = await getInlineFileId(userId, text, voiceId, stillWanted);
    if (!fileId) return;
    if (!(await stillWanted())) return;

    const short = text.length > 60 ? `${text.slice(0, 57)}…` : text;
    return await api.answerInlineQuery({
      inline_query_id: query.id,
      cache_time: 0,
      is_personal: true,
      results: [
        {
          type: 'voice',
          id: key,
          voice_file_id: fileId,
          title: `${voiceName(voiceId, voices)} · ${short}`,
        },
      ],
    });
  } catch (error) {
    console.error('inline voice generation failed', error);

    if (userId && !(await stillWanted())) return;

    const link = await botLink();
    const notStarted =
      error instanceof BotApiError &&
      (error.code === 403 || /bot can't initiate conversation/i.test(error.description ?? ''));

    return api.answerInlineQuery({
      inline_query_id: query.id,
      cache_time: 0,
      is_personal: true,
      results: [
        hintResult(
          notStarted ? 'start-bot' : 'error',
          notStarted ? 'Open the bot and press Start first' : "Couldn't generate the voice note",
          notStarted
            ? 'Inline voice notes are created through a private chat with the bot.'
            : 'Try sending the request again.',
          notStarted
            ? "Open the bot's private chat and press Start to use inline mode."
            : "Couldn't generate the voice note. Please try again.",
          link?.url,
          notStarted ? 'Open bot' : undefined,
        ),
      ],
    });
  }
}
