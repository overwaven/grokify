import { api } from 'sdk';
import { getUserVoice, takeRateLimit } from '../lib/store.js';
import { getVoices } from '../lib/voice-catalog.js';
import { sendVoiceMessage } from '../lib/voice.js';
import { isVoiceId } from '../lib/voices.js';
import { pickerText, voiceKeyboard, welcomeText, helpText } from '../lib/ui.js';
import { DEFAULT_VOICE, DM_RATE_LIMIT, MAX_TEXT } from '../lib/config.js';

async function botUsername() {
  try {
    const me = await api.getMe();
    return me.username ?? null;
  } catch {
    return null;
  }
}

async function loadVoices() {
  try {
    return await getVoices();
  } catch (error) {
    console.warn('voice catalog unavailable', error?.message ?? error);
    return [];
  }
}

function pickerVoiceId(saved, voices) {
  return voices.length && !isVoiceId(saved, voices) ? DEFAULT_VOICE : saved;
}

export default async function (message) {
  // Settings and voice generation live in private chats only.
  if (message.chat?.type !== 'private' || !message.from) return;

  const text = (message.text ?? '').trim();
  if (!text) return;

  const chatId = message.chat.id;
  const userId = message.from.id;

  if (text.startsWith('/')) {
    const command = text.split(/[\s@]/)[0].toLowerCase();

    if (command === '/start') {
      const username = await botUsername();
      const saved = await getUserVoice(userId);
      const voices = await loadVoices();
      const voiceId = pickerVoiceId(saved, voices);

      await api.setMyCommands({
        commands: [
          { command: 'voice', description: 'Choose a voice' },
          { command: 'help', description: 'How to use' },
        ],
      }).catch(() => {});

      const params = {
        chat_id: chatId,
        text: welcomeText(voiceId, voices, username),
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      };
      if (voices.length) {
        params.reply_markup = { inline_keyboard: voiceKeyboard(voices, voiceId, 0) };
      }
      await api.sendMessage(params);
      return;
    }

    if (command === '/voice' || command === '/voices' || command === '/settings') {
      const saved = await getUserVoice(userId);
      const voices = await loadVoices();

      if (!voices.length) {
        await api.sendMessage({
          chat_id: chatId,
          text: "Couldn't load the voice list. Please try again in a moment.",
        });
        return;
      }

      const voiceId = pickerVoiceId(saved, voices);
      await api.sendMessage({
        chat_id: chatId,
        text: pickerText(voiceId, voices),
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
        reply_markup: { inline_keyboard: voiceKeyboard(voices, voiceId, 0) },
      });
      return;
    }

    if (command === '/help') {
      const username = await botUsername();
      await api.sendMessage({
        chat_id: chatId,
        text: helpText(username),
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      });
      return;
    }

    return;
  }

  if (text.length > MAX_TEXT) {
    await api.sendMessage({
      chat_id: chatId,
      text: `Text is too long (maximum ${MAX_TEXT} characters).`,
    });
    return;
  }

  const saved = await getUserVoice(userId);
  const voiceId = saved || DEFAULT_VOICE;

  if (!(await takeRateLimit(userId, DM_RATE_LIMIT.limit, DM_RATE_LIMIT.windowSec))) {
    await api.sendMessage({
      chat_id: chatId,
      text: 'Too many requests in a row. Please wait a minute and try again.',
    });
    return;
  }

  await api
    .sendChatAction({ chat_id: chatId, action: 'record_voice' })
    .catch(() => {});

  try {
    // Only a voice note goes back — no captions, no extra messages.
    await sendVoiceMessage(chatId, text, voiceId);
  } catch (error) {
    console.error('voice generation failed', error);
    const errorText =
      error?.status === 404
        ? 'Your saved voice is no longer available. Choose another one with /voice.'
        : error?.status === 429
          ? 'Grok TTS is busy. Please try again in a few seconds.'
          : "Couldn't generate the voice note. Please try again.";
    await api.sendMessage({ chat_id: chatId, text: errorText });
  }
}
