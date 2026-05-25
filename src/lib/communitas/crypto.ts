/**
 * Server-side AES-256-GCM helpers for the "Brief an sich selbst" feature.
 *
 * The key comes from LETTER_ENCRYPTION_KEY (base64, 32 bytes decoded).
 * This module is the ONLY place on the server where Communitas member content
 * is encrypted/decrypted in clear. Everything else (cell, kreis) is server-blind
 * and decrypted only client-side.
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'node:crypto';

const IV_BYTES = 12;
const KEY_BYTES = 32;
const AUTH_TAG_BYTES = 16;

function loadKey(): Buffer {
  const raw = process.env.LETTER_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'LETTER_ENCRYPTION_KEY is not set. Cannot encrypt/decrypt letters.'
    );
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `LETTER_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${key.length}).`
    );
  }
  return key;
}

export interface EncryptedLetter {
  ciphertext: Buffer; // GCM ciphertext + appended 16-byte auth tag
  iv: Buffer;        // 12-byte nonce
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Returns the ciphertext (with auth tag appended) and the IV.
 */
export function encryptLetter(plaintext: string): EncryptedLetter {
  const key = loadKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([enc, tag]),
    iv,
  };
}

/**
 * Decrypt a buffer produced by encryptLetter().
 * Throws if the auth tag does not verify.
 */
export function decryptLetter(ciphertext: Buffer, iv: Buffer): string {
  if (iv.length !== IV_BYTES) {
    throw new Error(`IV must be ${IV_BYTES} bytes, got ${iv.length}.`);
  }
  if (ciphertext.length < AUTH_TAG_BYTES) {
    throw new Error('Ciphertext too short to contain an auth tag.');
  }
  const key = loadKey();
  const enc = ciphertext.subarray(0, ciphertext.length - AUTH_TAG_BYTES);
  const tag = ciphertext.subarray(ciphertext.length - AUTH_TAG_BYTES);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}
