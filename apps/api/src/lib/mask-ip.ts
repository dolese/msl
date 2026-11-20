/** 196.41.12.34 -> 196.41.xx.xx (keeps enough for triage, drops the host part) */
export function maskIp(ip: string): string {
  const v4 = ip.replace(/^::ffff:/, '');
  const parts = v4.split('.');
  return parts.length === 4 ? `${parts[0]}.${parts[1]}.xx.xx` : v4.split(':').slice(0, 3).join(':') + ':…';
}
