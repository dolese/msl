import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decrypt, encrypt, hashPassword, hmac, verifyPassword } from '../src/lib/crypto.js';
import { maskIp } from '../src/lib/mask-ip.js';

const key = randomBytes(32);

describe('crypto', () => {
  it('round-trips AES-GCM and uses a fresh IV each time', () => {
    const id = '19900115-12345-00001-23';
    const a = encrypt(id, key);
    expect(decrypt(a, key)).toBe(id);
    expect(encrypt(id, key).equals(a)).toBe(false);
  });

  it('rejects tampered ciphertext', () => {
    const blob = encrypt('secret', key);
    blob[blob.length - 1]! ^= 1;
    expect(() => decrypt(blob, key)).toThrow();
  });

  it('hmac is deterministic for duplicate detection', () => {
    expect(hmac('x', key)).toBe(hmac('x', key));
  });

  it('hashes and verifies passwords', async () => {
    const h = await hashPassword('correct horse');
    expect(await verifyPassword('correct horse', h)).toBe(true);
    expect(await verifyPassword('wrong', h)).toBe(false);
  });
});

describe('maskIp', () => {
  it('masks the last two octets', () => {
    expect(maskIp('196.41.12.34')).toBe('196.41.xx.xx');
    expect(maskIp('::ffff:196.41.12.34')).toBe('196.41.xx.xx');
  });
});
