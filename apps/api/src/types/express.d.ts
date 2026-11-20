import type { AccountKind, Role } from '@msl/shared';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; name: string; email: string | null; username: string | null; kind: AccountKind; role: Role };
      session?: { id: string; csrfToken: string };
    }
  }
}
export {};
