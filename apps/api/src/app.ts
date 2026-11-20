import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { env } from './config/env.js';
import { csrfProtection } from './middleware/csrf.js';
import { loadSession, requireAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { recordsRouter } from './modules/records/records.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { publicShareRouter } from './modules/share/share.routes.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use((req, res, next) => {
    // Strict CORS: only the web app origin, with credentials.
    const origin = req.get('origin');
    if (origin === env().WEB_ORIGIN) {
      res.set({
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Token',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE',
        Vary: 'Origin',
      });
    }
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  });
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/public/share', publicShareRouter);

  app.use('/api', loadSession, csrfProtection);
  app.use('/api/auth', authRouter);
  app.use('/api/records', requireAuth, recordsRouter);
  app.use('/api/users', requireAuth, usersRouter);
  app.use('/api/audit', requireAuth, auditRouter);

  app.use(errorHandler);
  return app;
}
