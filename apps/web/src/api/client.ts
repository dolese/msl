import type {
  AuditEventDTO, DashboardDTO, LoginInput, Paginated, RecordDTO, Role, SharedRecordDTO, ShareTtl, UserDTO,
} from '@msl/shared';

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: Record<string, string[]>) {
    super(message);
  }
}

let csrfToken: string | null = null;
export const setCsrfToken = (t: string | null) => { csrfToken = t; };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (csrfToken && init.method && init.method !== 'GET') headers.set('X-CSRF-Token', csrfToken);

  const res = await fetch(`/api${path}`, { ...init, headers, credentials: 'include' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? res.statusText, body.details);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

const qs = (params: Record<string, string | number | undefined>) => {
  const s = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]),
  ).toString();
  return s ? `?${s}` : '';
};

type SessionUser = { id: string; name: string; email: string; role: Role };

export const api = {
  login: (body: LoginInput) =>
    request<{ user: SessionUser; csrfToken: string }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  authConfig: () => request<{ twoFactorRequired: boolean }>('/auth/config'),
  me: () => request<{ user: SessionUser; csrfToken: string }>('/auth/me'),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<void>('/auth/password', { method: 'POST', body: JSON.stringify(body) }),

  listRecords: (p: { q?: string; status?: string; page?: number }) =>
    request<Paginated<RecordDTO>>(`/records${qs(p)}`),
  dashboard: () => request<DashboardDTO>('/dashboard'),
  reject: (id: string, reason?: string) => request<void>(`/records/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  stats: () => request<{ total: number; verified: number; pending: number; rejected: number }>('/records/stats'),
  getRecord: (id: string) => request<RecordDTO>(`/records/${id}`),
  createRecord: (form: FormData) => request<RecordDTO>('/records', { method: 'POST', body: form }),
  revealId: (id: string) => request<{ nationalId: string }>(`/records/${id}/reveal-id`, { method: 'POST' }),
  verify: (id: string) => request<void>(`/records/${id}/verify`, { method: 'POST' }),
  share: (id: string, ttl: ShareTtl) =>
    request<{ url: string; expiresAt: string }>(`/records/${id}/share`, { method: 'POST', body: JSON.stringify({ ttl }) }),
  history: (id: string) => request<AuditEventDTO[]>(`/records/${id}/history`),
  photoUrl: (id: string, download = false) => `/api/records/${id}/photo${download ? '?download=1' : ''}`,
  exportUrl: '/api/records/export.csv',

  listUsers: () => request<UserDTO[]>('/users'),
  unlockUser: (id: string) => request<UserDTO>(`/users/${id}/unlock`, { method: 'POST' }),
  inviteUser: (body: { name: string; email: string; role: Role; password: string }) =>
    request<UserDTO>('/users', { method: 'POST', body: JSON.stringify(body) }),

  listAudit: (p: { q?: string; userId?: string; days?: number; page?: number }) =>
    request<Paginated<AuditEventDTO>>(`/audit${qs(p)}`),

  getShared: (token: string) => request<SharedRecordDTO>(`/public/share/${token}`),
};
