export const VOICES_PER_PAGE = 8;

export function isVoiceId(id, voices) {
  return typeof id === 'string' && voices.some((voice) => voice.id === id);
}

export function voiceName(id, voices) {
  const voice = voices.find((item) => item.id === id);
  return voice ? voice.name : id;
}

export function voicePageCount(voices) {
  return Math.max(1, Math.ceil(voices.length / VOICES_PER_PAGE));
}
