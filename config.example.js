// Copy this file to tgcloud/lib/config.js and fill in your xAI API key.
// tgcloud/lib/config.js is git-ignored, so your key never enters the repository.

export const XAI_API_KEY = 'xai-...';
export const XAI_TTS_URL = 'https://api.x.ai/v1/tts';
export const XAI_VOICES_URL = 'https://api.x.ai/v1/tts/voices';

export const DEFAULT_VOICE = 'eve';

// The voice catalog is fetched from xAI and cached for 24 hours.
export const VOICE_CACHE_TTL = 60 * 60 * 24;
export const TTS_LANGUAGE = 'auto';

// Per-user limits. Inline queries arrive while the user types, so the inline
// bucket is deliberately generous; the DM bucket only guards direct messages.
export const DM_RATE_LIMIT = {
  limit: 20,
  windowSec: 60,
};

export const INLINE_RATE_LIMIT = {
  limit: 300,
  windowSec: 60,
};

// Telegram caps inline queries at 256 characters and messages at 4096.
export const MAX_TEXT = 4000;
