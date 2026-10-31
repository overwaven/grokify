// Built-in xAI / Grok voices, in the order returned by GET /v1/tts/voices.
export const VOICES = [
  { id: 'altair', name: 'Altair', gender: 'male' },
  { id: 'ara', name: 'Ara', gender: 'female' },
  { id: 'atlas', name: 'Atlas', gender: 'male' },
  { id: 'aurora', name: 'Aurora', gender: 'female' },
  { id: 'carina', name: 'Carina', gender: 'female' },
  { id: 'castor', name: 'Castor', gender: 'male' },
  { id: 'celeste', name: 'Celeste', gender: 'female' },
  { id: 'cosmo', name: 'Cosmo', gender: 'male' },
  { id: 'eve', name: 'Eve', gender: 'female' },
  { id: 'helios', name: 'Helios', gender: 'male' },
  { id: 'helix', name: 'Helix', gender: 'male' },
  { id: 'iris', name: 'Iris', gender: 'female' },
  { id: 'kepler', name: 'Kepler', gender: 'male' },
  { id: 'leo', name: 'Leo', gender: 'male' },
  { id: 'liora', name: 'Liora', gender: 'female' },
  { id: 'lumen', name: 'Lumen', gender: 'male' },
  { id: 'luna', name: 'Luna', gender: 'female' },
  { id: 'lux', name: 'Lux', gender: 'male' },
  { id: 'naksh', name: 'Naksh', gender: 'male' },
  { id: 'orion', name: 'Orion', gender: 'male' },
  { id: 'perseus', name: 'Perseus', gender: 'male' },
  { id: 'rex', name: 'Rex', gender: 'male' },
  { id: 'rigel', name: 'Rigel', gender: 'male' },
  { id: 'sal', name: 'Sal', gender: 'male' },
  { id: 'sirius', name: 'Sirius', gender: 'male' },
  { id: 'ursa', name: 'Ursa', gender: 'female' },
  { id: 'zagan', name: 'Zagan', gender: 'male' },
  { id: 'zenith', name: 'Zenith', gender: 'male' },
];

export const VOICE_IDS = new Set(VOICES.map((voice) => voice.id));

export const VOICES_PER_PAGE = 8;

export function isVoiceId(id) {
  return typeof id === 'string' && VOICE_IDS.has(id);
}

export function voiceName(id) {
  const voice = VOICES.find((item) => item.id === id);
  return voice ? voice.name : id;
}

export function voicePageCount() {
  return Math.ceil(VOICES.length / VOICES_PER_PAGE);
}
