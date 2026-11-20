// @ts-check
import '../src/load-env.js';
/**
 * Seeds the demo users from the design (all with password "ChangeMe123!").
 * With SEED_2FA=true it also enrols 2FA for the users marked twoFactor and prints
 * the otpauth:// URLs to add to an authenticator app (only needed if REQUIRE_2FA=true).
 * Run: npm run db:seed
 */
import { authenticator } from 'otplib';
import { db } from '../src/db/client.js';
import { users } from '../src/db/schema.js';
import { hashPassword } from '../src/lib/crypto.js';

/** @type {Array<{ name: string, email: string, role: 'admin' | 'registrar' | 'viewer', twoFactor: boolean }>} */
const people = [
  { name: 'James Kimaro', email: 'james@company.co.tz', role: 'admin', twoFactor: true },
  { name: 'Sarah Mwangi', email: 'sarah@company.co.tz', role: 'admin', twoFactor: true },
  { name: 'David Kapinga', email: 'david@company.co.tz', role: 'registrar', twoFactor: false },
  { name: 'Halima Nassoro', email: 'halima@company.co.tz', role: 'registrar', twoFactor: true },
  { name: 'Peter Mushi', email: 'peter@partner.co.tz', role: 'viewer', twoFactor: false },
];

const with2fa = process.env.SEED_2FA === 'true';
const passwordHash = await hashPassword('ChangeMe123!');

for (const p of people) {
  const totpSecret = with2fa && p.twoFactor ? authenticator.generateSecret() : null;
  await db
    .insert(users)
    .values({ name: p.name, email: p.email, role: p.role, passwordHash, totpSecret })
    .onConflictDoNothing({ target: users.email });
  if (totpSecret) {
    console.log(`${p.email.padEnd(24)} ${authenticator.keyuri(p.email, 'MSL', totpSecret)}`);
  } else {
    console.log(`${p.email.padEnd(24)} ${p.role}`);
  }
}

process.exit(0);
