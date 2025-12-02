/**
 * Encryption utilities for sensitive customer data
 * Uses AES-256-GCM (authenticated encryption) for maximum security
 * 
 * IMPORTANT: Set ENCRYPTION_KEY in environment (32 bytes / 64 hex chars)
 * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

const crypto = require('crypto');

// Algorithm: AES-256-GCM provides both encryption and authentication
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // For key derivation

/**
 * Get encryption key from environment
 * In production, use a key management service (AWS KMS, HashiCorp Vault)
 */
function getEncryptionKey() {
    const key = process.env.ENCRYPTION_KEY;
    
    if (!key) {
        console.error('⚠️ ENCRYPTION_KEY not set! Sensitive data will NOT be encrypted.');
        console.error('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
        return null;
    }
    
    // Key should be 64 hex characters (32 bytes)
    if (key.length !== 64) {
        console.error('⚠️ ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
        return null;
    }
    
    return Buffer.from(key, 'hex');
}

/**
 * Encrypt sensitive data (e.g., Twilio auth tokens)
 * 
 * @param {string} plaintext - The data to encrypt
 * @returns {string|null} - Base64 encoded encrypted data, or null if encryption fails
 * 
 * Format: base64(iv + authTag + ciphertext)
 */
function encrypt(plaintext) {
    if (!plaintext) return null;
    
    const key = getEncryptionKey();
    if (!key) {
        // In development without key, return plaintext with marker
        // This allows the app to work but data is NOT secure
        console.warn('⚠️ Encryption disabled - storing plaintext (INSECURE)');
        return `UNENCRYPTED:${plaintext}`;
    }
    
    try {
        // Generate random IV for each encryption
        const iv = crypto.randomBytes(IV_LENGTH);
        
        // Create cipher
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
            authTagLength: AUTH_TAG_LENGTH
        });
        
        // Encrypt
        const encrypted = Buffer.concat([
            cipher.update(plaintext, 'utf8'),
            cipher.final()
        ]);
        
        // Get authentication tag
        const authTag = cipher.getAuthTag();
        
        // Combine: IV + AuthTag + Ciphertext
        const combined = Buffer.concat([iv, authTag, encrypted]);
        
        // Return as base64 with prefix for identification
        return `ENC:${combined.toString('base64')}`;
    } catch (error) {
        console.error('Encryption error:', error.message);
        return null;
    }
}

/**
 * Decrypt sensitive data
 * 
 * @param {string} encryptedData - Base64 encoded encrypted data
 * @returns {string|null} - Decrypted plaintext, or null if decryption fails
 */
function decrypt(encryptedData) {
    if (!encryptedData) return null;
    
    // Handle unencrypted data (development mode)
    if (encryptedData.startsWith('UNENCRYPTED:')) {
        console.warn('⚠️ Reading unencrypted data - should be encrypted in production');
        return encryptedData.slice(12); // Remove prefix
    }
    
    // Check for encrypted prefix
    if (!encryptedData.startsWith('ENC:')) {
        // Legacy plaintext data - return as-is but warn
        console.warn('⚠️ Found legacy unencrypted data - should be migrated');
        return encryptedData;
    }
    
    const key = getEncryptionKey();
    if (!key) {
        console.error('Cannot decrypt: ENCRYPTION_KEY not set');
        return null;
    }
    
    try {
        // Remove prefix and decode
        const combined = Buffer.from(encryptedData.slice(4), 'base64');
        
        // Extract components
        const iv = combined.slice(0, IV_LENGTH);
        const authTag = combined.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
        const ciphertext = combined.slice(IV_LENGTH + AUTH_TAG_LENGTH);
        
        // Create decipher
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
            authTagLength: AUTH_TAG_LENGTH
        });
        decipher.setAuthTag(authTag);
        
        // Decrypt
        const decrypted = Buffer.concat([
            decipher.update(ciphertext),
            decipher.final()
        ]);
        
        return decrypted.toString('utf8');
    } catch (error) {
        console.error('Decryption error:', error.message);
        // Could be tampered data or wrong key
        return null;
    }
}

/**
 * Hash sensitive data for lookup (one-way)
 * Useful for indexing without exposing the actual value
 * 
 * @param {string} data - Data to hash
 * @returns {string} - SHA-256 hash
 */
function hash(data) {
    if (!data) return null;
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a secure random token
 * 
 * @param {number} length - Token length in bytes (default 32)
 * @returns {string} - Hex encoded token
 */
function generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Securely compare two strings (timing-safe)
 * Prevents timing attacks
 * 
 * @param {string} a - First string
 * @param {string} b - Second string  
 * @returns {boolean} - True if equal
 */
function secureCompare(a, b) {
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Mask sensitive data for logging
 * Shows first 4 and last 4 characters only
 * 
 * @param {string} data - Sensitive data
 * @returns {string} - Masked string
 */
function mask(data) {
    if (!data || data.length < 12) return '****';
    return `${data.slice(0, 4)}...${data.slice(-4)}`;
}

module.exports = {
    encrypt,
    decrypt,
    hash,
    generateToken,
    secureCompare,
    mask,
    ALGORITHM
};
