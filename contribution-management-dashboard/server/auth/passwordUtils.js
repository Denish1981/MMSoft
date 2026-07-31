const crypto = require('crypto');

/**
 * Hash a plaintext password using PBKDF2 with a random 16-byte salt.
 * Returns string formatted as: $pbkdf2$100000$<salt_hex>$<hash_hex>
 */
const hashPassword = (password) => {
    if (!password) return '';
    const salt = crypto.randomBytes(16).toString('hex');
    const iterations = 100000;
    const keylen = 64;
    const digest = 'sha512';
    const hash = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest).toString('hex');
    return `$pbkdf2$${iterations}$${salt}$${hash}`;
};

/**
 * Verify a candidate password against the stored password in DB.
 * Supports:
 * - Hashed passwords: $pbkdf2$<iterations>$<salt>$<hash>
 * - Legacy plaintext passwords
 *
 * Returns object: { isValid: boolean, needsRehash: boolean }
 */
const verifyPassword = (candidatePassword, storedPassword) => {
    if (!storedPassword || !candidatePassword) {
        return { isValid: false, needsRehash: false };
    }

    // Hashed password check
    if (typeof storedPassword === 'string' && storedPassword.startsWith('$pbkdf2$')) {
        const parts = storedPassword.split('$');
        // Expected format: ['', 'pbkdf2', '100000', '<salt>', '<hash>']
        if (parts.length === 5) {
            const iterations = parseInt(parts[2], 10);
            const salt = parts[3];
            const storedHashHex = parts[4];
            const keylen = Buffer.from(storedHashHex, 'hex').length;

            const computedHashHex = crypto.pbkdf2Sync(candidatePassword, salt, iterations, keylen, 'sha512').toString('hex');

            const buf1 = Buffer.from(storedHashHex, 'hex');
            const buf2 = Buffer.from(computedHashHex, 'hex');

            if (buf1.length === buf2.length && crypto.timingSafeEqual(buf1, buf2)) {
                return { isValid: true, needsRehash: false };
            }
        }
        return { isValid: false, needsRehash: false };
    }

    // Legacy plaintext password check
    if (storedPassword === candidatePassword) {
        return { isValid: true, needsRehash: true };
    }

    return { isValid: false, needsRehash: false };
};

module.exports = {
    hashPassword,
    verifyPassword
};
