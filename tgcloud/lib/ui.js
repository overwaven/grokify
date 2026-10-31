import { VOICES, VOICES_PER_PAGE, voicePageCount, voiceName } from './voices.js';

export function pickerText(voiceId) {
  return [
    `🎙 <b>Voice: ${voiceName(voiceId)}</b>`,
    '',
    'Pick a voice. It is saved for direct messages and inline mode.',
  ].join('\n');
}

export function welcomeText(voiceId, botUsername) {
  const inline = botUsername ? `@${botUsername} your text` : 'the bot name + your text';
  return [
    '🎙 <b>Grokify</b> — text to speech with Grok voices.',
    '',
    "Send me text and I'll reply with a voice note.",
    `In any chat: <code>${inline}</code>`,
    '',
    `Current voice: <b>${voiceName(voiceId)}</b>`,
  ].join('\n');
}

export function helpText(botUsername) {
  const inline = botUsername ? `@${botUsername} your text` : 'the bot name + your text';
  return [
    "Send me text and I'll turn it into a voice note.",
    '',
    '• In this chat: just send the text.',
    `• In any chat: <code>${inline}</code>`,
    '',
    '/voice — choose a voice',
  ].join('\n');
}

export function voiceKeyboard(voiceId, page) {
  const pages = voicePageCount();
  const safePage = Math.min(Math.max(page, 0), pages - 1);
  const start = safePage * VOICES_PER_PAGE;
  const slice = VOICES.slice(start, start + VOICES_PER_PAGE);

  const rows = [];
  for (let i = 0; i < slice.length; i += 2) {
    rows.push(
      slice.slice(i, i + 2).map((voice) => ({
        text: `${voice.id === voiceId ? '✅ ' : ''}${voice.name}`,
        callback_data: `v:${voice.id}:${safePage}`,
      })),
    );
  }

  const nav = [];
  if (safePage > 0) {
    nav.push({ text: '‹ Back', callback_data: `p:${safePage - 1}` });
  }
  nav.push({ text: `${safePage + 1}/${pages}`, callback_data: 'n' });
  if (safePage < pages - 1) {
    nav.push({ text: 'Next ›', callback_data: `p:${safePage + 1}` });
  }
  rows.push(nav);
  rows.push([{ text: 'Close', callback_data: 'c' }]);

  return rows;
}
