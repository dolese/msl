/** "19900115-12345-00001-23" -> "****-****-****-23" */
export function maskNationalId(id: string): string {
  const last = id.replace(/\D/g, '').slice(-2);
  return `****-****-****-${last}`;
}

/** "Amina Juma Hassan" -> "AJ" (first two names, as in the record list) */
export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const second = parts[1]?.[0] ?? '';
  return (first + second).toUpperCase();
}

/** MSL-2026-000027 */
export function formatRegNo(seq: number, createdAt: Date | string): string {
  const year = new Date(createdAt).toLocaleString('en-GB', { year: 'numeric', timeZone: 'Africa/Dar_es_Salaam' });
  return `MSL-${year}-${String(seq).padStart(6, '0')}`;
}

/** Accepts "MSL-2026-000027", "000027" or "27" and returns 27; otherwise null. */
export function parseRegNo(q: string): number | null {
  const m = q.trim().toUpperCase().match(/^(?:MSL-\d{4}-)?0*(\d{1,9})$/);
  return m ? Number(m[1]) : null;
}
