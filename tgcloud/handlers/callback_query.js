import { api } from 'sdk';
import { getUserVoice, setUserVoice } from '../lib/store.js';
import { getVoices } from '../lib/voice-catalog.js';
import { isVoiceId, voiceName } from '../lib/voices.js';
import { pickerText, voiceKeyboard } from '../lib/ui.js';
import { DEFAULT_VOICE } from '../lib/config.js';

function pageFrom(value) {
  const page = Number.parseInt(value, 10);
  return Number.isFinite(page) && page >= 0 ? page : 0;
}

async function loadVoices() {
  try {
    return await getVoices();
  } catch (error) {
    console.warn('voice catalog unavailable', error?.message ?? error);
    return [];
  }
}

export default async function (query) {
  const data = query.data ?? '';
  const userId = query.from.id;
  const chatId = query.message?.chat?.id;
  const messageId = query.message?.message_id;

  if (data === 'c') {
    await api.answerCallbackQuery({ callback_query_id: query.id });
    if (chatId && messageId) {
      await api.deleteMessage({ chat_id: chatId, message_id: messageId }).catch(() => {});
    }
    return;
  }

  if (data === 'n') {
    await api.answerCallbackQuery({ callback_query_id: query.id });
    return;
  }

  if (data.startsWith('v:')) {
    const voices = await loadVoices();

    if (!voices.length) {
      await api.answerCallbackQuery({
        callback_query_id: query.id,
        text: "Couldn't load the voice list. Try again.",
      });
      return;
    }

    const [, voiceId, page] = data.split(':');

    if (!isVoiceId(voiceId, voices)) {
      await api.answerCallbackQuery({
        callback_query_id: query.id,
        text: 'Unknown voice',
      });
      return;
    }

    await setUserVoice(userId, voiceId);

    await api.answerCallbackQuery({
      callback_query_id: query.id,
      text: `Voice: ${voiceName(voiceId, voices)}`,
    });

    if (!chatId || !messageId) return;

    try {
      await api.editMessageText({
        chat_id: chatId,
        message_id: messageId,
        text: pickerText(voiceId, voices),
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: voiceKeyboard(voices, voiceId, pageFrom(page)) },
      });
    } catch (error) {
      // "message is not modified" is harmless.
      if (!/not modified/i.test(error?.description ?? '')) throw error;
    }
    return;
  }

  if (data.startsWith('p:')) {
    const voices = await loadVoices();

    if (!voices.length) {
      await api.answerCallbackQuery({
        callback_query_id: query.id,
        text: "Couldn't load the voice list. Try again.",
      });
      return;
    }

    const saved = await getUserVoice(userId);
    const currentVoice = isVoiceId(saved, voices) ? saved : DEFAULT_VOICE;

    await api.answerCallbackQuery({ callback_query_id: query.id });

    if (!chatId || !messageId) return;

    try {
      await api.editMessageReplyMarkup({
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: voiceKeyboard(voices, currentVoice, pageFrom(data.slice(2))),
        },
      });
    } catch (error) {
      if (!/not modified/i.test(error?.description ?? '')) throw error;
    }
    return;
  }

  await api.answerCallbackQuery({ callback_query_id: query.id });
}
