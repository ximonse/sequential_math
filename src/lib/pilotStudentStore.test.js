import { describe, expect, it } from 'vitest';
import { webcrypto } from 'node:crypto';
import {
  PilotStudentVaultError,
  createVaultAad,
  decryptVaultValue,
  encryptVaultValue,
} from './pilotStudentStore.js';

const studentId = 'a'.repeat(32);

describe('pilot student vault crypto contract', () => {
  it('round-trips an encrypted snapshot with a non-extractable AES-GCM key', async () => {
    const key = await webcrypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    const encrypted = await encryptVaultValue({
      cryptoApi: webcrypto,
      key,
      studentId,
      recordType: 'snapshot',
      value: { schemaVersion: 1, recentProblems: [] },
    });

    expect(key.extractable).toBe(false);
    expect(encrypted.iv.byteLength).toBe(12);
    expect(new Uint8Array(encrypted.ciphertext)).not.toEqual(new TextEncoder().encode(JSON.stringify({ schemaVersion: 1, recentProblems: [] })));
    await expect(decryptVaultValue({ cryptoApi: webcrypto, key, studentId, recordType: 'snapshot', encrypted })).resolves.toEqual({ schemaVersion: 1, recentProblems: [] });
  });

  it('binds ciphertext to the student and record type through AAD', async () => {
    const key = await webcrypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    const encrypted = await encryptVaultValue({ cryptoApi: webcrypto, key, studentId, recordType: 'event', value: { id: 'event-12345678' } });

    await expect(decryptVaultValue({ cryptoApi: webcrypto, key, studentId: 'b'.repeat(32), recordType: 'event', encrypted })).rejects.toMatchObject({ code: 'DECRYPT_FAILED' });
    await expect(decryptVaultValue({ cryptoApi: webcrypto, key, studentId, recordType: 'snapshot', encrypted })).rejects.toMatchObject({ code: 'DECRYPT_FAILED' });
  });

  it('refuses to encrypt credentials or CSRF data', async () => {
    const key = await webcrypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await expect(encryptVaultValue({ cryptoApi: webcrypto, key, studentId, recordType: 'event', value: { id: 'event-12345678', csrfToken: 'secret' } })).rejects.toMatchObject({ code: 'SENSITIVE_VALUE' });
    await expect(encryptVaultValue({ cryptoApi: webcrypto, key, studentId, recordType: 'snapshot', value: { auth: { qrSecret: 'secret' } } })).rejects.toMatchObject({ code: 'SENSITIVE_VALUE' });
  });

  it('creates stable AAD only for valid vault records', () => {
    expect(new TextDecoder().decode(createVaultAad({ studentId, recordType: 'snapshot' }))).toBe(`pilot-student-v1|${studentId}|snapshot`);
    expect(() => createVaultAad({ studentId, recordType: 'other' })).toThrow(PilotStudentVaultError);
  });
});
