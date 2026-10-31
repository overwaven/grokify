import { api } from 'sdk';
import { getUserVoice, takeRateLimit } from '../lib/store.js';
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

export default async function (message) {
  // Settings and voice generation live in private chats only.
  if (message.chat?.type !== 'private' || !message.from) return;

  const text = (message.text ?? '').trim();
  if (!text) return;

  const chatId = message.chat.id;
  const userId = message.from.id;

  if (text.startsWith('/')) {
    const command = text.split(/[\s@]/)[0].toLowerCase();
    const username = await botUsername();
    const saved = await getUserVoice(userId);
    const voiceId = isVoiceId(saved) ? saved : DEFAULT_VOICE;

    if (command === '/start') {
      await api.setMyCommands({
        commands: [
          { command: 'voice', description: 'Choose a voice' },
          { command: 'help', description: 'How to use' },
        ],
      }).catch(() => {});

      await api.sendMessage({
        chat_id: chatId,
        text: welcomeText(voiceId, username),
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
        reply_markup: { inline_keyboard: voiceKeyboard(voiceId, 0) },
      });
      return;
    }

    if (command === '/voice' || command === '/voices' || command === '/settings') {
      await api.sendMessage({
        chat_id: chatId,
        text: pickerText(voiceId),
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
        reply_markup: { inline_keyboard: voiceKeyboard(voiceId, 0) },
      });
      return;
    }

    if (command === '/help') {
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
  const voiceId = isVoiceId(saved) ? saved : DEFAULT_VOICE;

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
    await api.sendMessage({
      chat_id: chatId,
      text:
        error?.status === 429
          ? 'Grok TTS is busy. Please try again in a few seconds.'
          : "Couldn't generate the voice note. Please try again.",
    });
  }
}
