import { and, eq, gt } from 'drizzle-orm';
import { formatRegNo, maskNationalId, SHARE_TTLS, type SharedRecordDTO, type ShareTtl } from '@msl/shared';
import { db } from '../../db/client.js';
import { records, shareLinks } from '../../db/schema.js';
import { randomToken, sha256 } from '../../lib/crypto.js';
import { env } from '../../config/env.js';
import { notFound } from '../../lib/http-error.js';

/** Only the hash of the token is stored; the raw token lives in the URL only. */
export async function createShareLink(recordId: string, createdById: string, ttl: ShareTtl) {
  const token = randomToken(24);
  const expiresAt = new Date(Date.now() + SHARE_TTLS[ttl] * 1000);
  await db.insert(shareLinks).values({ tokenHash: sha256(token), recordId, createdById, expiresAt });
  return { url: `${env().WEB_ORIGIN}/s/${token}`, expiresAt: expiresAt.toISOString() };
}

export async function resolveShareToken(token: string) {
  const [row] = await db
    .select({ link: shareLinks, record: records })
    .from(shareLinks)
    .innerJoin(records, eq(records.id, shareLinks.recordId))
    .where(and(eq(shareLinks.tokenHash, sha256(token)), eq(shareLinks.revoked, false), gt(shareLinks.expiresAt, new Date())))
    .limit(1);
  if (!row) throw notFound('This link is invalid or has expired');
  return row;
}

export function toSharedDTO(row: Awaited<ReturnType<typeof resolveShareToken>>, token: string): SharedRecordDTO {
  return {
    regNo: formatRegNo(row.record.seq, row.record.createdAt),
    plots: row.record.plots,
    fullName: row.record.fullName,
    phone: row.record.phone,
    nationalIdMasked: maskNationalId(row.record.nationalIdLast2),
    status: row.record.status,
    registeredAt: row.record.createdAt.toISOString(),
    photoUrl: row.record.photoPath ? `/api/public/share/${token}/photo` : null,
    expiresAt: row.link.expiresAt.toISOString(),
  };
}
