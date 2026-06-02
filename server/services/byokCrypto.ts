import { encrypt, decrypt } from "../../encryption.js";

/**
 * Encrypt/decrypt BYOK keys-at-rest (in SQLite).
 *
 * We intentionally reuse the project's existing AES-256-GCM helper in /encryption.js.
 * The stored string is safe to persist in a TEXT column.
 */
export function encryptByokKey(plainText: string): string {
  // `encryption.js` throws if ENCRYPTION_KEY is missing/invalid at import-time.
  return encrypt(plainText);
}

export function decryptByokKey(storedCipherText: string): string | null {
  // Backward compatibility:
  // older installs may have stored BYOK keys as plaintext in geminiApiKeyEncrypted.
  // encryption.js formats ciphertext as: ivHex:authTagHex:encryptedHex (exactly 2 ':' separators)
  const trimmed = storedCipherText?.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(":");
  const looksLikeEncryptedFormat = parts.length === 3;

  if (!looksLikeEncryptedFormat) {
    // Assume plaintext and return as-is.
    return trimmed;
  }

  const decrypted = decrypt(trimmed);
  if (decrypted) return decrypted;

  // If decryption failed, don't brick the user—fall back to returning stored value.
  return trimmed;
}
