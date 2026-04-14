import { createDecipheriv } from "node:crypto";
import { inflateRawSync } from "node:zlib";

const SEALED_HEADER = 0x9e85dced;

export interface UnsealOptions {
  /** Base64-encoded AES-256 keys to try */
  keys: string[];
}

/**
 * Decrypt a sealed event response from FingerprintIQ.
 *
 * @param sealedBase64 - Base64-encoded sealed result from identify() response
 * @param options - Decryption keys
 * @returns The full event data including all signals
 * @throws If no key matches or the data is invalid
 *
 * @example
 * ```typescript
 * import { unsealEventResponse } from '@fingerprintiq/server';
 *
 * const event = unsealEventResponse(result.sealedResult, {
 *   keys: [process.env.FIQ_SEALED_KEY!],
 * });
 * console.log(event.signals.client.canvas);
 * ```
 */
export function unsealEventResponse(
  sealedBase64: string,
  options: UnsealOptions,
): unknown {
  const sealed = Buffer.from(sealedBase64, "base64");

  if (sealed.length < 16 + 16) {
    // header + nonce + at least auth tag
    throw new Error("Sealed data too short");
  }

  const header = sealed.readUInt32BE(0);
  if (header !== SEALED_HEADER) {
    throw new Error(`Invalid sealed result header: 0x${header.toString(16)}`);
  }

  const nonce = sealed.subarray(4, 16);
  const ciphertext = sealed.subarray(16);

  // AES-GCM auth tag is last 16 bytes
  const authTag = ciphertext.subarray(ciphertext.length - 16);
  const encrypted = ciphertext.subarray(0, ciphertext.length - 16);

  for (const keyBase64 of options.keys) {
    try {
      const key = Buffer.from(keyBase64, "base64");
      if (key.length !== 32) continue;

      const decipher = createDecipheriv("aes-256-gcm", key, nonce);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);

      // Try to decompress (deflate-raw)
      let plaintext: Buffer;
      try {
        plaintext = inflateRawSync(decrypted);
      } catch {
        // If decompression fails, treat as uncompressed
        plaintext = decrypted;
      }

      return JSON.parse(plaintext.toString("utf-8"));
    } catch {
      continue; // Try next key
    }
  }

  throw new Error("Failed to unseal: no matching key");
}
