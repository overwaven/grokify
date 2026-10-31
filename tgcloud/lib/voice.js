import { api, InputFile, BotApiError } from 'sdk';
import { synthesize, cacheKey } from './tts.js';
import { getCachedFileId, putCachedFileId, dropCachedFileId } from './store.js';

const VOICE_FILE_NAME = 'voice.mp3';
const VOICE_MIME = 'audio/mpeg';

const voiceFile = (bytes) =>
  new InputFile(bytes, VOICE_FILE_NAME, { type: VOICE_MIME });

// Sends a real voice note (no caption) into a private chat. A cached file_id is
// reused when possible, so repeated texts cost neither latency nor TTS credits.
export async function sendVoiceMessage(chatId, text, voiceId) {
  const key = cacheKey(text, voiceId);
  const cached = await getCachedFileId(key);

  if (cached) {
    try {
      return await api.sendVoice({ chat_id: chatId, voice: cached });
    } catch (error) {
      if (error instanceof BotApiError && (error.code === 400 || error.code === 404)) {
        await dropCachedFileId(key);
      } else {
        throw error;
      }
    }
  }

  const bytes = await synthesize(text, voiceId);
  const message = await api.sendVoice({ chat_id: chatId, voice: voiceFile(bytes) });
  await putCachedFileId(key, message.voice.file_id, voiceId);
  return message;
}

// Inline mode needs a file_id *before* answering. The voice is uploaded to the
// querying user's private chat (the only chat we can address), then the carrier
// message is deleted — the file stays on Telegram's servers and the file_id
// remains valid. Returns null if the query was superseded while synthesizing.
export async function getInlineFileId(chatId, text, voiceId, isStillWanted) {
  const key = cacheKey(text, voiceId);
  const cached = await getCachedFileId(key);
  if (cached) return cached;

  const bytes = await synthesize(text, voiceId);

  if (isStillWanted && !(await isStillWanted())) return null;

  const message = await api.sendVoice({
    chat_id: chatId,
    voice: voiceFile(bytes),
    disable_notification: true,
  });

  const fileId = message.voice.file_id;
  await putCachedFileId(key, fileId, voiceId);

  // Keep the private chat clean: this message only existed to mint a file_id.
  try {
    await api.deleteMessage({ chat_id: chatId, message_id: message.message_id });
  } catch (error) {
    console.warn('could not delete temporary voice upload', error?.description ?? error);
  }

  return fileId;
}
