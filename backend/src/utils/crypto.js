const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';

const getEncryptionKey = () => {
  const envKey = process.env.SUPABASE_ENCRYPTION_KEY;
  if (!envKey) {
    throw new Error('SUPABASE_ENCRYPTION_KEY environment variable is not defined.');
  }
  
  // If the key is a 64-character hex string, parse it to a 32-byte Buffer
  if (envKey.length === 64 && /^[0-9a-fA-F]+$/.test(envKey)) {
    return Buffer.from(envKey, 'hex');
  }
  
  // Otherwise, derive a reliable 32-byte key via SHA-256 hashing
  return crypto.createHash('sha256').update(String(envKey)).digest();
};

/**
 * Encrypts a plain-text string using AES-256-CBC
 * @param {string} text Plain-text to encrypt
 * @returns {string} Encrypted string in format "iv:ciphertext"
 */
const encrypt = (text) => {
  if (!text) return '';
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption failed:', error.message);
    throw error;
  }
};

/**
 * Decrypts a ciphertext string in format "iv:ciphertext" using AES-256-CBC
 * If the input doesn't match the format, it returns the input raw (backward compatibility)
 * @param {string} encryptedText Ciphertext to decrypt
 * @returns {string} Decrypted plain-text
 */
const decrypt = (encryptedText) => {
  if (!encryptedText) return '';
  try {
    const parts = encryptedText.split(':');
    // If it doesn't contain a colon separating iv and ciphertext, treat as raw/unencrypted
    if (parts.length !== 2) {
      return encryptedText;
    }
    const key = getEncryptionKey();
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed, returning raw string:', error.message);
    return encryptedText;
  }
};

module.exports = {
  encrypt,
  decrypt
};
