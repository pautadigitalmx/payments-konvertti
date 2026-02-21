<?php

declare(strict_types=1);

namespace PaymentsKonvertti\Security;

use InvalidArgumentException;
use RuntimeException;

/**
 * Encrypts/decrypts sensitive tokens (for example access_token_enc) using libsodium secretbox.
 *
 * Algorithm
 * - Cipher primitive: XSalsa20-Poly1305 via sodium_crypto_secretbox().
 * - Nonce: random 24 bytes from random_bytes().
 * - Key: 32-byte DATA_KEY (raw bytes or base64-encoded).
 *
 * Data layout (before final encoding):
 * - 1 byte version marker: 0x01
 * - 24 bytes nonce
 * - N bytes ciphertext+MAC (secretbox output)
 *
 * Stored format:
 * - base64url_no_padding( version || nonce || cipher )
 */
final class TokenCipher
{
    private const VERSION_V1 = "\x01";
    private const KEY_BYTES = 32;
    private const NONCE_BYTES = 24;
    private const MAC_BYTES = 16;

    /**
     * @param string $plaintext Raw token plaintext.
     * @param string $dataKey DATA_KEY value; can be raw 32-byte key or base64/base64url encoded 32-byte key.
     */
    public static function encrypt(string $plaintext, string $dataKey): string
    {
        self::assertSodiumLoaded();

        $key = self::normalizeKey($dataKey);
        $nonce = random_bytes(self::NONCE_BYTES);
        $cipher = sodium_crypto_secretbox($plaintext, $nonce, $key);

        $payload = self::VERSION_V1 . $nonce . $cipher;

        return self::base64UrlEncode($payload);
    }

    /**
     * @param string $encoded Stored access_token_enc value.
     * @param string $dataKey DATA_KEY value; can be raw 32-byte key or base64/base64url encoded 32-byte key.
     */
    public static function decrypt(string $encoded, string $dataKey): string
    {
        self::assertSodiumLoaded();

        $key = self::normalizeKey($dataKey);
        $payload = self::base64UrlDecode($encoded);

        if ($payload === '' || strlen($payload) < 1 + self::NONCE_BYTES + self::MAC_BYTES) {
            throw new InvalidArgumentException('Invalid token payload length.');
        }

        $version = $payload[0];
        if ($version !== self::VERSION_V1) {
            throw new InvalidArgumentException('Unsupported token payload version.');
        }

        $offset = 1;
        $nonce = substr($payload, $offset, self::NONCE_BYTES);
        $cipher = substr($payload, $offset + self::NONCE_BYTES);

        $plaintext = sodium_crypto_secretbox_open($cipher, $nonce, $key);
        if ($plaintext === false) {
            throw new RuntimeException('Token decryption failed (bad key, tampered payload, or invalid format).');
        }

        return $plaintext;
    }

    private static function normalizeKey(string $dataKey): string
    {
        if (strlen($dataKey) === self::KEY_BYTES) {
            return $dataKey;
        }

        $decoded = self::base64UrlDecode($dataKey, true);
        if (strlen($decoded) === self::KEY_BYTES) {
            return $decoded;
        }

        throw new InvalidArgumentException('DATA_KEY must be 32 raw bytes or base64/base64url encoding of 32 bytes.');
    }

    private static function assertSodiumLoaded(): void
    {
        if (!function_exists('sodium_crypto_secretbox') || !function_exists('sodium_crypto_secretbox_open')) {
            throw new RuntimeException('libsodium is required for TokenCipher but is not available in this PHP runtime.');
        }
    }

    private static function base64UrlEncode(string $bytes): string
    {
        return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $input, bool $strict = false): string
    {
        $normalized = strtr($input, '-_', '+/');
        $padding = strlen($normalized) % 4;
        if ($padding > 0) {
            $normalized .= str_repeat('=', 4 - $padding);
        }

        $decoded = base64_decode($normalized, true);
        if ($decoded === false) {
            if ($strict) {
                return '';
            }

            throw new InvalidArgumentException('Invalid base64/base64url payload.');
        }

        return $decoded;
    }
}
