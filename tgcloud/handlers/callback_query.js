import { api } from 'sdk';
import { getUserVoice, setUserVoice } from '../lib/store.js';
import { isVoiceId, voiceName } from '../lib/voices.js';
import { pickerText, voiceKeyboard } from '../lib/ui.js';
import { DEFAULT_VOICE } from '../lib/config.js';

function pageFrom(value) {
  const page = Number.parseInt(value, 10);
  return Number.isFinite(page) && page >= 0 ? page : 0;
}

export default async function (query) {
  const data = query.data ?? '';
  const userId = query.from.id;
  const chatId = query.message?.chat?.id;
  const messageId = query.message?.message_id;

  const saved = await getUserVoice(userId);
  const currentVoice = isVoiceId(saved) ? saved : DEFAULT_VOICE;

  if (data.startsWith('v:')) {
    const [, voiceId, page] = data.split(':');

    if (!isVoiceId(voiceId)) {
      await api.answerCallbackQuery({
        callback_query_id: query.id,
        text: 'Unknown voice',
      });
      return;
    }

    await setUserVoice(userId, voiceId);

    await api.answerCallbackQuery({
      callback_query_id: query.id,
      text: `Voice: ${voiceName(voiceId)}`,
    });

    if (!chatId || !messageId) return;

    try {
      await api.editMessageText({
        chat_id: chatId,
        message_id: messageId,
        text: pickerText(voiceId),
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: voiceKeyboard(voiceId, pageFrom(page)) },
      });
    } catch (error) {
      // "message is not modified" is harmless.
      if (!/not modified/i.test(error?.description ?? '')) throw error;
    }
    return;
  }

  if (data.startsWith('p:')) {
    await api.answerCallbackQuery({ callback_query_id: query.id });

    if (!chatId || !messageId) return;

    try {
      await api.editMessageReplyMarkup({
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: voiceKeyboard(currentVoice, pageFrom(data.slice(2))),
        },
      });
    } catch (error) {
      if (!/not modified/i.test(error?.description ?? '')) throw error;
    }
    return;
  }

  if (data === 'c') {
    await api.answerCallbackQuery({ callback_query_id: query.id });
    if (chatId && messageId) {
      await api.deleteMessage({ chat_id: chatId, message_id: messageId }).catch(() => {});
    }
    return;
  }

  await api.answerCallbackQuery({ callback_query_id: query.id });
}
