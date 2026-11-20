export const ROLES = ['admin', 'registrar', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = {
  'records:read': ['admin', 'registrar', 'viewer'],
  'records:create': ['admin', 'registrar'],
  'records:update': ['admin', 'registrar'],
  'records:verify': ['admin'],
  'records:revealId': ['admin'],
  'records:export': ['admin'],
  'share:create': ['admin', 'registrar'],
  'users:manage': ['admin'],
  'audit:read': ['admin'],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}
