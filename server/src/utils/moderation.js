// Content & Image Moderation and Input Integrity Utility (Server)
// Prevents foul/profane language (English & Roman Urdu), gibberish/spam, and unsafe/invalid images or posts.

const BLOCKED_WORDS = [
  // English profanity / slurs / NSFW
  'fuck', 'fucker', 'fucking', 'fck', 'fuk', 'shit', 'bullshit', 'bitch', 'bastard',
  'asshole', 'dick', 'pussy', 'cunt', 'whore', 'slut', 'porn', 'xxx', 'nude', 'nudes',
  'naked', 'sex', 'boobs', 'penis', 'vagina', 'cock', 'nsfw', 'hentai', 'onlyfans',
  'retard', 'nigga', 'nigger', 'faggot', 'motherfucker', 'mf', 'stfu', 'wtf',
  // Roman Urdu / Hindi common foul words
  'bc', 'mc', 'bhenchod', 'behenchod', 'madarchod', 'chutiya', 'chutia', 'gandu',
  'harami', 'haramzada', 'kamina', 'kameena', 'kanjar', 'randi', 'gashti', 'lund',
  'lora', 'loda', 'bhosdi', 'bhosdike', 'bsdk', 'gaand', 'gand', 'tatti', 'kutta',
  'kutiya', 'ullu', 'lanat', 'laanti', 'beghairat', 'chawal',
];

const BLOCKED_REGEXES = BLOCKED_WORDS.map(
  (word) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
);

const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

// Max base64 size (~7MB string = ~5MB image)
const MAX_BASE64_LENGTH = 7 * 1024 * 1024;

/**
 * Checks if text is meaningless gibberish (e.g. "aaaaaa", "asdfghjkl", only symbols/numbers)
 */
function isGibberishOrSpam(text) {
  if (!text || typeof text !== 'string') return false;
  const cleaned = text.replace(/https?:\/\/\S+/gi, '').trim();
  if (!cleaned) return false;

  // 7+ identical consecutive characters (e.g. "aaaaaaa", "!!!!!!!")
  if (/(.)\1{6,}/i.test(cleaned)) {
    return true;
  }

  // Common keyboard mash patterns
  if (/^(asdfgh|qwertyui|zxcvbn)+$/i.test(cleaned.replace(/\s+/g, ''))) {
    return true;
  }

  return false;
}

/**
 * Checks text for profanity, foul language, or spam/gibberish.
 * @param {string} text
 * @param {object} options
 * @param {number} [options.minLength]
 * @param {string} [options.fieldName]
 * @returns {{ clean: boolean, reason?: string }}
 */
function checkTextContent(text, options = {}) {
  const { minLength = 0, fieldName = 'Content' } = options;
  if (!text || typeof text !== 'string') {
    if (minLength > 0) {
      return { clean: false, reason: `${fieldName} is required (minimum ${minLength} characters).` };
    }
    return { clean: true };
  }

  const normalized = text.trim();
  if (minLength > 0 && normalized.length < minLength) {
    return {
      clean: false,
      reason: `${fieldName} is too short. Please provide at least ${minLength} characters.`,
    };
  }

  for (const regex of BLOCKED_REGEXES) {
    if (regex.test(normalized)) {
      return {
        clean: false,
        reason: `${fieldName} contains inappropriate or foul language. Please keep RiphahKonnect respectful and professional.`,
      };
    }
  }

  if (isGibberishOrSpam(normalized)) {
    return {
      clean: false,
      reason: `${fieldName} appears to contain meaningless/spam text. Please enter clear, meaningful information.`,
    };
  }

  return { clean: true };
}

/**
 * Validates that an image URL or base64 data URI is a safe, valid image.
 * @param {string} imageUrl
 * @returns {{ safe: boolean, reason?: string }}
 */
function checkImageSafety(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) {
    return { safe: true };
  }

  const trimmed = imageUrl.trim();

  if (trimmed.startsWith('data:')) {
    const match = trimmed.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/);
    if (!match) {
      return {
        safe: false,
        reason: 'Invalid image format. Only JPEG, PNG, GIF, and WEBP images are allowed.',
      };
    }
    const mimeType = match[1].toLowerCase();
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType)) {
      return {
        safe: false,
        reason: `Unsupported image type (${mimeType}). Only JPEG, PNG, GIF, and WEBP are allowed.`,
      };
    }
    if (trimmed.length > MAX_BASE64_LENGTH) {
      return {
        safe: false,
        reason: 'Image file is too large. Maximum allowed size is 5MB.',
      };
    }
    return { safe: true };
  }

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { safe: false, reason: 'Image URL must use HTTP or HTTPS.' };
    }
    const lowerUrl = trimmed.toLowerCase();
    for (const word of ['porn', 'xxx', 'nsfw', 'nude', 'naked', 'hentai', 'sex', 'onlyfans']) {
      if (lowerUrl.includes(word)) {
        return { safe: false, reason: 'Inappropriate image URL detected.' };
      }
    }
    return { safe: true };
  } catch {
    return { safe: false, reason: 'Invalid image URL or data format.' };
  }
}

/**
 * Validates feed post rules by post type (GENERAL, QUESTION, RESOURCE).
 * @param {object} params
 * @param {string} params.content
 * @param {string} params.type
 * @param {string} [params.imageUrl]
 * @returns {{ valid: boolean, reason?: string }}
 */
function validatePostByType({ content, type = 'GENERAL', imageUrl }) {
  const trimmed = (content || '').trim();
  const hasImage = Boolean(imageUrl && imageUrl.trim());

  if (!trimmed && !hasImage) {
    return { valid: false, reason: 'Please write something or attach a picture before posting.' };
  }

  // Check foul language / gibberish if text is provided
  if (trimmed) {
    const modCheck = checkTextContent(trimmed, { minLength: 1, fieldName: 'Post content' });
    if (!modCheck.clean) {
      return { valid: false, reason: modCheck.reason };
    }
  }

  // Check image safety if attached
  if (hasImage) {
    const imgCheck = checkImageSafety(imageUrl);
    if (!imgCheck.safe) {
      return { valid: false, reason: imgCheck.reason };
    }
  }

  if (type === 'QUESTION') {
    if (trimmed.length < 3) {
      return {
        valid: false,
        reason: 'Please enter a clear question (at least 3 characters).',
      };
    }
  }

  if (type === 'RESOURCE') {
    const hasUrl = /https?:\/\/[^\s]+/i.test(trimmed);
    if (!hasUrl && !hasImage) {
      return {
        valid: false,
        reason: 'A Resource post must include a resource link (https://...) or an attached picture/material.',
      };
    }
  }

  return { valid: true };
}

module.exports = {
  checkTextContent,
  checkImageSafety,
  validatePostByType,
};
