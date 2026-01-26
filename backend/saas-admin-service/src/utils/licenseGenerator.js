const crypto = require('crypto');

/**
 * Generate a secure license key for a tenant
 * Format: DENTA-XXXXX-XXXXX-XXXXX-XXXXX
 */
function generateLicenseKey(tenantId, planId) {
  try {
    // Create a hash from tenant and plan IDs for uniqueness
    const hash = crypto.createHash('sha256')
      .update(`${tenantId}-${planId}-${Date.now()}`)
      .digest('hex');
    
    // Take first 20 characters and format as license key
    const keyPart = hash.substring(0, 20).toUpperCase();
    
    // Format as DENTA-XXXXX-XXXXX-XXXXX-XXXXX
    const formattedKey = `DENTA-${keyPart.substring(0, 5)}-${keyPart.substring(5, 10)}-${keyPart.substring(10, 15)}-${keyPart.substring(15, 20)}`;
    
    return formattedKey;
  } catch (error) {
    throw new Error('Failed to generate license key');
  }
}

/**
 * Validate license key format
 */
function validateLicenseKeyFormat(licenseKey) {
  const pattern = /^DENTA-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/;
  return pattern.test(licenseKey);
}

/**
 * Generate API key for tenant
 */
function generateApiKey(tenantId) {
  try {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256')
      .update(`${tenantId}-${timestamp}-${random}`)
      .digest('hex');
    
    return `dk_${hash.substring(0, 32)}`;
  } catch (error) {
    throw new Error('Failed to generate API key');
  }
}

/**
 * Generate secure token for various purposes
 */
function generateSecureToken(length = 32) {
  try {
    return crypto.randomBytes(length).toString('hex');
  } catch (error) {
    throw new Error('Failed to generate secure token');
  }
}

/**
 * Generate activation code for license
 */
function generateActivationCode() {
  try {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${code.substring(0, 4)}-${code.substring(4, 8)}`;
  } catch (error) {
    throw new Error('Failed to generate activation code');
  }
}

/**
 * Encrypt sensitive data
 */
function encryptData(data, key) {
  try {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 */
function decryptData(encryptedData, key) {
  try {
    const algorithm = 'aes-256-gcm';
    const decipher = crypto.createDecipher(algorithm, key);
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generate checksum for license validation
 */
function generateChecksum(data) {
  try {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  } catch (error) {
    throw new Error('Failed to generate checksum');
  }
}

/**
 * Validate checksum
 */
function validateChecksum(data, expectedChecksum) {
  try {
    const actualChecksum = generateChecksum(data);
    return actualChecksum === expectedChecksum;
  } catch (error) {
    return false;
  }
}

module.exports = {
  generateLicenseKey,
  validateLicenseKeyFormat,
  generateApiKey,
  generateSecureToken,
  generateActivationCode,
  encryptData,
  decryptData,
  generateChecksum,
  validateChecksum
};