import type { Role } from '@msl/shared';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; name: string; email: string; role: Role };
      session?: { id: string; csrfToken: string };
    }
  }
}
export {};
