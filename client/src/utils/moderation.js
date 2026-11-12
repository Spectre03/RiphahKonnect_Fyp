// Client-side Content, Image & Post Validation Utility
// Ensures no foul language, gibberish, or invalid images/posts are submitted.

const BLOCKED_WORDS = [
  'fuck', 'fucker', 'fucking', 'fck', 'fuk', 'shit', 'bullshit', 'bitch', 'bastard',
  'asshole', 'dick', 'pussy', 'cunt', 'whore', 'slut', 'porn', 'xxx', 'nude', 'nudes',
  'naked', 'sex', 'boobs', 'penis', 'vagina', 'cock', 'nsfw', 'hentai', 'onlyfans',
  'retard', 'nigga', 'nigger', 'faggot', 'motherfucker', 'mf', 'stfu', 'wtf',
  'bc', 'mc', 'bhenchod', 'behenchod', 'madarchod', 'chutiya', 'chutia', 'gandu',
  'harami', 'haramzada', 'kamina', 'kameena', 'kanjar', 'randi', 'gashti', 'lund',
  'lora', 'loda', 'bhosdi', 'bhosdike', 'bsdk', 'gaand', 'gand', 'tatti', 'kutta',
  'kutiya', 'ullu', 'lanat', 'laanti', 'beghairat', 'chawal',
];

const BLOCKED_REGEXES = BLOCKED_WORDS.map(
  (word) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
);

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export function isGibberishOrSpam(text) {
  if (!text || typeof text !== 'string') return false;
  const cleaned = text.replace(/https?:\/\/\S+/gi, '').trim();
  if (!cleaned) return false;

  if (/(.)\1{6,}/i.test(cleaned)) return true;
  if (/^(asdfgh|qwertyui|zxcvbn)+$/i.test(cleaned.replace(/\s+/g, ''))) return true;

  return false;
}

/**
 * Checks text for profanity/foul language and gibberish/spam.
 * @param {string} text
 * @param {object} [options]
 * @param {number} [options.minLength]
 * @param {string} [options.fieldName]
 * @returns {{ clean: boolean, reason?: string }}
 */
export function checkTextContent(text, options = {}) {
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
      reason: `${fieldName} is too short (minimum ${minLength} characters required).`,
    };
  }

  for (const regex of BLOCKED_REGEXES) {
    if (regex.test(normalized)) {
      return {
        clean: false,
        reason: `${fieldName} contains inappropriate or foul language. Please keep RiphahKonnect respectful.`,
      };
    }
  }

  if (isGibberishOrSpam(normalized)) {
    return {
      clean: false,
      reason: `${fieldName} appears to contain meaningless/spam text. Please enter clear, meaningful details.`,
    };
  }

  return { clean: true };
}

/**
 * Validates an image File object before converting to base64.
 * @param {File} file
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateImageFile(file) {
  if (!file) return { valid: false, reason: 'No file selected.' };
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      reason: 'Only JPEG, PNG, GIF, and WEBP image files are allowed.',
    };
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      reason: 'Image size must be under 5MB.',
    };
  }
  const lowerName = (file.name || '').toLowerCase();
  for (const word of ['porn', 'xxx', 'nsfw', 'nude', 'naked', 'hentai', 'sex', 'onlyfans', 'fuck', 'shit']) {
    if (lowerName.includes(word)) {
      return {
        valid: false,
        reason: 'This image file violates community safety guidelines.',
      };
    }
  }
  return { valid: true };
}

/**
 * Converts a validated image File to a base64 data URI.
 * @param {File} file
 * @returns {Promise<string>}
 */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}
