# Token Encryption Format (`access_token_enc`)

This project now defines token encryption/decryption in `src/Security/TokenCipher.php`.

## Exact algorithm

- Primitive: `sodium_crypto_secretbox()` / `sodium_crypto_secretbox_open()`
- Cipher suite: XSalsa20-Poly1305 (libsodium secretbox)
- Nonce: 24 random bytes (`random_bytes(24)`)
- Key: `DATA_KEY` normalized to 32 bytes

## Accepted `DATA_KEY` formats

- Raw 32-byte key, or
- Base64/Base64URL-encoded value that decodes to 32 bytes

## Serialized payload layout

Before final storage encoding:

- `0x01` (1-byte version)
- `nonce` (24 bytes)
- `ciphertext_with_mac` (secretbox output)

Stored value (`access_token_enc`):

- Base64URL (no padding) of `version || nonce || ciphertext_with_mac`

## Minimal usage

```php
use PaymentsKonvertti\Security\TokenCipher;

$dataKey = $_ENV['DATA_KEY'];

$accessTokenEnc = TokenCipher::encrypt($plainAccessToken, $dataKey);
$plainAccessToken = TokenCipher::decrypt($accessTokenEnc, $dataKey);
```
