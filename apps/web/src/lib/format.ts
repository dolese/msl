const tz = 'Africa/Dar_es_Salaam';

export const formatShortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: tz });

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: tz });

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz });

export const formatDateTime = (iso: string) => `${formatShortDate(iso)}, ${formatTime(iso)}`;

export function minutesUntil(iso: string) {
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60_000));
}

/** "James Kimaro" -> "James K." */
export const shortName = (name: string) => {
  const [first, second] = name.split(' ');
  return second ? `${first} ${second[0]}.` : first ?? name;
};

/** "****-****-****-23" -> "•••• •••• •••• 23" */
export const formatMaskedId = (masked: string) => masked.replace(/\*/g, '•').replace(/-/g, ' ');

/** "+255712345678" -> "+255 712 345 678" */
export const formatPhone = (p: string) => p.replace(/^\+255(\d{3})(\d{3})(\d{3})$/, '+255 $1 $2 $3');

/** "Nov 18, 2026 at 10:42 AM" */
export const formatDateTimeLong = (iso: string) => `${formatDate(iso)} at ${formatTime(iso)}`;
