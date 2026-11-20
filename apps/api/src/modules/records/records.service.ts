import { and, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import {
  formatRegNo, maskNationalId, parseRegNo, type Paginated, type RecordDTO, type RecordStatus,
  createRecordSchema, listRecordsQuery, updateRecordSchema,
} from '@msl/shared';
import type { z } from 'zod';
import { db } from '../../db/client.js';
import { records, users } from '../../db/schema.js';
import { decrypt, encrypt, hmac } from '../../lib/crypto.js';
import { idEncryptionKey, idHashKey } from '../../lib/keys.js';
import { conflict, notFound } from '../../lib/http-error.js';

type RecordRow = typeof records.$inferSelect;

const selection = { record: records, registrar: { id: users.id, name: users.name } };

export function toDTO(row: RecordRow, registrar: { id: string; name: string }): RecordDTO {
  return {
    id: row.id,
    regNo: formatRegNo(row.seq, row.createdAt),
    fullName: row.fullName,
    phone: row.phone,
    nationalIdMasked: maskNationalId(row.nationalIdLast2),
    status: row.status,
    hasPhoto: !!row.photoPath,
    plots: row.plots,
    registeredBy: registrar,
    fieldOfficer: row.fieldOfficer,
    consentAt: row.consentAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listRecords(query: z.infer<typeof listRecordsQuery>): Promise<Paginated<RecordDTO>> {
  const filters: SQL[] = [];
  if (query.q) {
    const like = `%${query.q.replace(/[%_\\]/g, '\\$&')}%`;
    const seq = parseRegNo(query.q);
    const digits = query.q.replace(/\D/g, '');
    filters.push(or(
      ilike(records.fullName, like),
      ilike(records.phone, like),
      // phones are stored as +255…, so "0714715378" should match too
      ...(digits.length >= 6 ? [ilike(records.phone, `%${digits.replace(/^0/, '')}%`)] : []),
      ...(seq !== null ? [eq(records.seq, seq)] : []),
    )!);
  }
  if (query.status) filters.push(eq(records.status, query.status));
  if (query.registrarId) filters.push(eq(records.registeredById, query.registrarId));
  const where = filters.length ? and(...filters) : undefined;

  const [rows, [totalRow]] = await Promise.all([
    db.select(selection).from(records).innerJoin(users, eq(users.id, records.registeredById))
      .where(where).orderBy(desc(records.createdAt))
      .limit(query.pageSize).offset((query.page - 1) * query.pageSize),
    db.select({ n: count() }).from(records).where(where),
  ]);
  return {
    items: rows.map((r) => toDTO(r.record, r.registrar)),
    page: query.page,
    pageSize: query.pageSize,
    total: totalRow?.n ?? 0,
  };
}

export async function getRecord(id: string) {
  const [row] = await db.select(selection).from(records)
    .innerJoin(users, eq(users.id, records.registeredById)).where(eq(records.id, id)).limit(1);
  if (!row) throw notFound('Record not found');
  return row;
}

export async function createRecord(
  input: z.output<typeof createRecordSchema>,
  registeredById: string,
  photoPath: string | null,
  fieldOfficer: string | null,
) {
  const nationalIdHash = hmac(input.nationalId, idHashKey());
  const [dupe] = await db.select({ id: records.id }).from(records)
    .where(eq(records.nationalIdHash, nationalIdHash)).limit(1);
  if (dupe) throw conflict('A record with this National ID already exists');

  const [row] = await db.insert(records).values({
    fullName: input.fullName,
    phone: input.phone,
    nationalIdEnc: encrypt(input.nationalId, idEncryptionKey()),
    nationalIdHash,
    nationalIdLast2: input.nationalId.slice(-2),
    photoPath,
    plots: input.plots,
    fieldOfficer,
    consentAt: new Date(),
    registeredById,
  }).returning();
  return row!;
}

export async function updateRecord(id: string, input: z.output<typeof updateRecordSchema>) {
  const [row] = await db.update(records).set({ ...input, updatedAt: new Date() })
    .where(eq(records.id, id)).returning();
  if (!row) throw notFound('Record not found');
  return row;
}

export async function setStatus(id: string, status: RecordStatus) {
  const [row] = await db.update(records).set({ status, updatedAt: new Date() })
    .where(eq(records.id, id)).returning();
  if (!row) throw notFound('Record not found');
  return row;
}

export const revealNationalId = (row: RecordRow) => decrypt(row.nationalIdEnc, idEncryptionKey());

/** CSV export — masked IDs only. */
export async function exportCsv(): Promise<{ csv: string; count: number }> {
  const rows = await db.select(selection).from(records)
    .innerJoin(users, eq(users.id, records.registeredById)).orderBy(desc(records.createdAt));
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [
    'registration_no,full_name,phone,national_id,plots,status,registered_by,field_officer,registered_at',
    ...rows.map(({ record: r, registrar }) =>
      [formatRegNo(r.seq, r.createdAt), r.fullName, r.phone, maskNationalId(r.nationalIdLast2), r.plots == null ? '' : String(r.plots),
        r.status, registrar.name, r.fieldOfficer ?? '', r.createdAt.toISOString()]
        .map(esc).join(',')),
  ];
  return { csv: lines.join('\n'), count: rows.length };
}

/** Counts per status for the summary cards on the Records page. */
export async function recordStats() {
  const rows = await db.select({ status: records.status, n: count() }).from(records).groupBy(records.status);
  const by = (s: RecordStatus) => rows.find((r) => r.status === s)?.n ?? 0;
  return { total: rows.reduce((sum, r) => sum + r.n, 0), verified: by('verified'), pending: by('pending'), rejected: by('rejected') };
}
