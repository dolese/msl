# MSL — Secure person registry

Mobile-first registry for recording people (photo, phone, National ID) with consent,
role-based access, an append-only audit log, and expiring read-only share links.

**Stack:** TypeScript everywhere for application code; plain JavaScript (with `// @ts-check`)
for tool config and scripts.

| Layer    | Tech |
|----------|------|
| API      | Node 20+, Express 5, Drizzle ORM, PostgreSQL, Zod |
| Web      | React 19, React Router 7, Vite |
| Shared   | Zod schemas, roles/permissions, DTO types — used by both API and web |

## Project structure

```
msl/
├── package.json                 # npm workspaces + root scripts
├── tsconfig.base.json           # shared strict TS settings
├── docker-compose.yml           # local Postgres
├── .env.example                 # copy to .env
│
├── packages/
│   └── shared/                  # @msl/shared — single source of truth for both sides
│       └── src/
│           ├── roles.ts         # admin / registrar / viewer + permission matrix, can()
│           ├── schemas.ts       # Zod: login, registration (TZ phone, NIDA format, PDPA consent), share TTLs, queries
│           ├── types.ts         # DTOs: RecordDTO, UserDTO, AuditEventDTO, SharedRecordDTO, Paginated<T>
│           ├── mask.ts          # maskNationalId(), initials()
│           └── index.ts
│
├── apps/
│   ├── api/                     # @msl/api — Express REST API
│   │   ├── drizzle.config.js    # JS config
│   │   ├── vitest.config.js     # JS config
│   │   ├── drizzle/             # generated SQL migrations
│   │   ├── scripts/seed.js      # JS script: demo users + TOTP enrolment URLs
│   │   ├── test/                # vitest unit tests
│   │   └── src/
│   │       ├── index.ts         # server entry
│   │       ├── app.ts           # middleware chain + route mounting
│   │       ├── config/env.ts    # validated environment (fails fast)
│   │       ├── db/
│   │       │   ├── schema.ts    # users, sessions, records, share_links, audit_events
│   │       │   └── client.ts
│   │       ├── lib/
│   │       │   ├── crypto.ts    # AES-256-GCM, HMAC, scrypt passwords, tokens
│   │       │   ├── audit.ts     # audit() writer
│   │       │   ├── upload.ts    # multer: 5 MB, JPEG/PNG/WebP, random filenames
│   │       │   └── …            # keys, http-error, mask-ip
│   │       ├── middleware/
│   │       │   ├── auth.ts      # session loader, requireAuth, requirePermission
│   │       │   ├── csrf.ts      # per-session CSRF token check
│   │       │   ├── rate-limit.ts
│   │       │   └── error.ts
│   │       ├── modules/         # one folder per feature: *.routes.ts + *.service.ts
│   │       │   ├── auth/        # login (password + TOTP), lockout after 5 fails, logout
│   │       │   ├── records/     # list/search, create, reveal ID, verify, photo, CSV export, history
│   │       │   ├── share/       # create link (hashed token) + public read-only endpoint
│   │       │   ├── users/       # list, invite, change role, unlock
│   │       │   └── audit/       # filtered, paginated audit log
│   │       └── types/express.d.ts
│   │
│   └── web/                     # @msl/web — React SPA
│       ├── vite.config.js       # JS config (proxies /api in dev)
│       ├── index.html
│       └── src/
│           ├── main.tsx, App.tsx         # routes
│           ├── api/client.ts             # typed fetch client, attaches CSRF header
│           ├── hooks/                    # useAuth (session + can()), useAsync
│           ├── lib/                      # date/phone formatting, audit event labels
│           ├── components/               # AppHeader, AppLayout, Avatar, Badge, Chip, Pagination, RequireAuth
│           ├── pages/
│           │   ├── LoginPage.tsx         # email + password + 2FA code
│           │   ├── RecordsPage.tsx       # search, filters, pagination, New / Export
│           │   ├── NewRegistrationPage.tsx
│           │   ├── RecordDetailPage.tsx  # reveal ID, share link, activity history
│           │   ├── UsersPage.tsx         # users and roles
│           │   ├── AuditLogPage.tsx      # grouped by day
│           │   └── SharedRecordPage.tsx  # public /s/:token view
│           └── styles/global.css
```

### How the shared package is consumed
`@msl/shared` exports a `source` condition pointing at its TypeScript, so the API (via
`tsx --conditions=source`), Vite and `tsc` all read `src/` directly in development — no
rebuild loop. `npm run build` emits `packages/shared/dist` for production Node.

## Security model

- **National ID** is encrypted with AES-256-GCM; an HMAC enables duplicate detection without
  decrypting. Only the last 2 digits are stored in clear for masking. The full value is
  returned only by `POST /records/:id/reveal-id` (admin only, `Cache-Control: no-store`) and
  every reveal is audited.
- **Sign-in** requires password (scrypt) + TOTP. 5 failures lock the account; the error message
  never reveals which factor was wrong.
- **Sessions:** random token in an `HttpOnly; SameSite=Strict` cookie (`Secure` in production);
  only its SHA-256 is stored. Every non-GET request must carry the session's `X-CSRF-Token`.
- **Share links:** 1 h / 24 h / 7 d; only the token hash is stored; the public endpoint returns
  masked data, is rate-limited, `no-store` and `noindex`; every view is audited.
- **Audit log:** append-only; IPs stored masked (`196.41.xx.xx`).
- **PDPA consent** is mandatory on registration and its timestamp is stored.

## Getting started

```bash
cp .env.example .env              # then fill ID_ENCRYPTION_KEY and ID_HASH_KEY (command in the file)
docker compose up -d db
npm install
npm run db:migrate
npm run db:seed                   # prints otpauth:// URLs — add them to an authenticator app
npm run dev                       # API :4000, web :5173
```

Demo password for seeded users: `ChangeMe123!`. Users seeded with 2FA off can't sign in
until TOTP enrolment is built (see TODO in `users.service.ts`).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | API (watch) + Vite dev server |
| `npm run typecheck` | `tsc --noEmit` in every workspace |
| `npm test` | Vitest in shared + api |
| `npm run build` | shared → dist, api → dist, web → dist |
| `npm run db:generate -w @msl/api` | new migration after editing `schema.ts` |

## Not built yet
- Invite email + password set + TOTP enrolment flow (invite currently creates the user only)
- Registrar / date filters in the records list (chips are placeholders); user filter in the audit log
- Record edit form in the web UI (API `PATCH /records/:id` exists)
- Photo storage on object storage with encryption at rest (currently local disk)
- Redis-backed rate limiting for multi-instance deployments
