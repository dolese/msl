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
