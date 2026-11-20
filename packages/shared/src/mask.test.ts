import { describe, expect, it } from 'vitest';
import { initials, maskNationalId } from './mask.js';
import { createRecordSchema } from './schemas.js';

describe('mask', () => {
  it('masks national id keeping last 2 digits', () => {
    expect(maskNationalId('19900115-12345-00001-23')).toBe('****-****-****-23');
  });
  it('builds initials', () => {
    expect(initials('Amina Juma Hassan')).toBe('AJ');
    expect(initials('Peter')).toBe('P');
  });
});

describe('createRecordSchema', () => {
  it('normalises phone and requires consent', () => {
    const ok = createRecordSchema.parse({
      fullName: 'Amina Juma Hassan',
      phone: '0712 345 678',
      nationalId: '19900115-12345-00001-23',
      consent: true,
    });
    expect(ok.phone).toBe('+255712345678');
    expect(
      createRecordSchema.safeParse({ ...ok, consent: false }).success,
    ).toBe(false);
  });
});
