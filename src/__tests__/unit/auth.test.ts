import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, generateClassCode } from '@/lib/auth-utils';

describe('hashPassword / verifyPassword', () => {
  it('hashes a password and verifies it correctly', async () => {
    const plain = 'my-secret-password';
    const hash = await hashPassword(plain);

    expect(hash).not.toBe(plain);
    expect(hash.startsWith('$2')).toBe(true); // bcrypt hash prefix

    const isValid = await verifyPassword(plain, hash);
    expect(isValid).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('correct-password');
    const isValid = await verifyPassword('wrong-password', hash);
    expect(isValid).toBe(false);
  });
});

describe('generateClassCode', () => {
  it('returns a 6-character string', () => {
    const code = generateClassCode();
    expect(code).toHaveLength(6);
  });

  it('uses only uppercase alphanumeric characters (ambiguous chars excluded)', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateClassCode();
      expect(code).toMatch(/^[A-Z2-9]+$/);
      // Ensure ambiguous characters (0, 1, O, I) are NOT included
      expect(code).not.toMatch(/[01OI]/);
    }
  });

  it('generates unique codes', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateClassCode()));
    // With 6 chars from 32-char alphabet: 32^6 = ~1 billion possibilities → high uniqueness
    expect(codes.size).toBeGreaterThan(90);
  });
});
