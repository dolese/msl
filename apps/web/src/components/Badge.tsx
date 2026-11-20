import type { RecordStatus, Role } from '@msl/shared';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral';
const TONE: Record<RecordStatus | Role, Tone> = {
  verified: 'success', pending: 'warning', rejected: 'danger',
  admin: 'primary', registrar: 'info', viewer: 'neutral',
};
const LABEL: Partial<Record<RecordStatus | Role, string>> = { pending: 'Pending review' };

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function StatusBadge({ value }: { value: RecordStatus | Role }) {
  return <span className={`badge badge-${TONE[value]}`}>{LABEL[value] ?? capitalize(value)}</span>;
}

export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
