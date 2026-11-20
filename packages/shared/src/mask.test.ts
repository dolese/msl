import { describe, expect, it } from 'vitest';
import { formatRegNo, initials, maskNationalId, parseRegNo } from './mask.js';
import { createRecordSchema, inviteUserSchema, nationalId } from './schemas.js';

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
      plots: '3',
      consent: true,
    });
    expect(ok.phone).toBe('+255712345678');
    expect(
      createRecordSchema.safeParse({ ...ok, consent: false }).success,
    ).toBe(false);
  });
});

describe('NIDA number', () => {
  it('accepts 20 digits with or without dashes and stores the dashed form', () => {
    expect(nationalId.parse('19881020456060000314')).toBe('19881020-45606-00003-14');
    expect(nationalId.parse('19881020-45606-00003-14')).toBe('19881020-45606-00003-14');
    expect(nationalId.parse(' 1988 1020 4560 6000 0314 ')).toBe('19881020-45606-00003-14');
    expect(nationalId.safeParse('1988102045606000031').success).toBe(false);
  });
});

describe('plots and registration numbers', () => {
  const base = { fullName: 'Ester Kashinje Buyobe', phone: '0714715378', nationalId: '19881020456060000314', consent: true };
  it('requires a whole number of plots', () => {
    expect(createRecordSchema.parse({ ...base, plots: '3' }).plots).toBe(3);
    expect(createRecordSchema.parse({ ...base, plots: 0 }).plots).toBe(0);
    expect(createRecordSchema.safeParse({ ...base, plots: '' }).success).toBe(false);
    expect(createRecordSchema.safeParse({ ...base, plots: '2.5' }).success).toBe(false);
  });
  it('formats and parses registration numbers', () => {
    expect(formatRegNo(27, '2026-11-20T06:29:27Z')).toBe('MSL-2026-000027');
    expect(parseRegNo('MSL-2026-000027')).toBe(27);
    expect(parseRegNo('27')).toBe(27);
    expect(parseRegNo('Amina')).toBeNull();
  });
});

describe('team accounts', () => {
  it('accepts a team account with a lowercase username', () => {
    const t = inviteUserSchema.parse({ kind: 'team', name: 'Team Kinondoni', username: 'Team.Kinondoni', role: 'registrar', password: 'abcd-efgh-jkmn' });
    expect(t.kind === 'team' && t.username).toBe('team.kinondoni');
    expect(inviteUserSchema.safeParse({ kind: 'team', name: 'X Team', username: 'a b', role: 'registrar', password: 'abcd-efgh-jkmn' }).success).toBe(false);
  });
});
