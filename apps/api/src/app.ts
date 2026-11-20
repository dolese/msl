import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { csrfProtection } from './middleware/csrf.js';
import { loadSession, requireAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';
import { notFound } from './lib/http-error.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { recordsRouter } from './modules/records/records.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { publicShareRouter } from './modules/share/share.routes.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet({
    contentSecurityPolicy: {
      // blob: lets the registration form preview the chosen photo before upload
      directives: { 'img-src': ["'self'", 'data:', 'blob:'] },
    },
  }));
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

  app.use('/api', (_req, _res, next) => next(notFound()));
  serveWebApp(app);

  app.use(errorHandler);
  return app;
}

/**
 * In production the API also serves the built React app, so web + API share one
 * domain (required for the SameSite=Strict session cookie and relative /api calls).
 */
function serveWebApp(app: express.Express) {
  const here = dirname(fileURLToPath(import.meta.url));
  const dir = env().WEB_DIST_DIR ?? resolve(here, '../../web/dist'); // apps/api/dist -> apps/web/dist
  const index = resolve(dir, 'index.html');
  if (!existsSync(index)) return; // dev: Vite serves the web app
  app.use(express.static(dir, { index: false, maxAge: '1h' }));
  // Client-side routes (/records/123, /s/:token, …) all load index.html
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    res.set('Cache-Control', 'no-cache').sendFile(index);
  });
}
