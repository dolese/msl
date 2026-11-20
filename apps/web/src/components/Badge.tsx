import type { RecordStatus, Role } from '@msl/shared';

const tone: Record<RecordStatus | Role, string> = {
  verified: 'green', pending: 'amber', rejected: 'red',
  admin: 'green', registrar: 'blue', viewer: 'grey',
};

export function Badge({ value }: { value: RecordStatus | Role }) {
  return <span className={`badge badge-${tone[value]}`}>{value[0]!.toUpperCase() + value.slice(1)}</span>;
}
