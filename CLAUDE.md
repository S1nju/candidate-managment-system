# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Monorepo, two independent apps under `src/`:

- `src/backend` — Laravel 12 API (PHP 8.3), domain-driven module structure
- `src/frontend` — Next.js 16 (App Router), TypeScript, Tailwind v4, shadcn/Radix UI

There is no root package manager — always `cd` into `src/backend` or `src/frontend` first.

## Commands

### Backend (`src/backend`)

```bash
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate --seed        # seeds admin@signme.com / worker@signme.com (password: "password")

php artisan serve                 # or: composer run dev (serves + queue:listen + vite, concurrently)

php artisan test --compact                                   # full suite (Pest)
php artisan test --compact tests/Feature/SomeTest.php        # single file
php artisan test --compact --filter=testName                 # single test

vendor/bin/pint --dirty           # format only changed files before finishing any PHP change
```

Tests run against in-memory SQLite (see `phpunit.xml`), not the MySQL dev database.

### Frontend (`src/frontend`)

```bash
npm install
cp .env.local.example .env.local
npm run dev
npm run build
npm run lint       # eslint .
```

No test script/framework is configured in the frontend.

### Docker (full stack)

```bash
cd src && docker compose up -d --build
docker exec -it signme-app php artisan migrate --seed
```
Spins up frontend (:3000), backend (:8000), Reverb websockets (:8080), MySQL, Redis.

## Backend architecture

The backend is **not** the stock Laravel `app/` layout — it's organized by domain module under `app/Modules/<Name>/`, each with its own `Http/` (controllers, requests), `Models/`, `Routes/api.php`, and `Services/` (some also have `Database/Migrations/` and `Repositories/`).

Modules: `Analytics`, `Audit`, `Auth`, `Candidates`, `Forms`, `Notifications`, `Signing`, `Users`.

`app/Providers/ModuleServiceProvider.php` is what makes this work — on boot it globs `app/Modules/*` and, per module:
- registers `Routes/api.php` under the `api` middleware group with an `/api` prefix (so module route files should NOT re-declare the prefix)
- registers `Routes/web.php` under `web` if present
- auto-loads `Database/Migrations/` if present

Service/repository bindings are **not** auto-discovered — they're wired explicitly in `ModuleServiceProvider::register()`. Add new module services there.

New module code (controller, model, service, migration) goes inside that module's own subtree, not the classic `app/Http/Controllers` or `database/migrations`. Follow the sibling module's structure when adding to a module.

Follows Laravel 12 conventions: middleware/providers registered in `bootstrap/app.php` (no `Kernel.php`), Form Requests for validation, Eloquent over raw `DB::`, `config()` not `env()` outside config files.

### Auth

Sanctum SPA cookie auth (not token-based, despite `src/frontend/README.md` describing a Clerk starter template — that README is stale boilerplate left over from the frontend scaffold and does not reflect the actual auth implementation). Frontend must call `GET /sanctum/csrf-cookie` before mutating requests; `services/api/client.ts` reads the `XSRF-TOKEN` cookie and attaches it as `X-XSRF-TOKEN`. RBAC on top via `spatie/laravel-permission`.

### Signature/contract security (`Signing` module)

`SignatureSecurityService` implements the tamper-evident signing engine: HMAC-SHA256 over a canonical payload (`signer_id`, `signer_email`, `signer_role`, `contract_id`, `pdf_checksum`, `signed_at`, `ip_address`) keyed on `config('app.key')`, plus a SHA-256 checksum of the generated PDF. Both are stored on `GeneratedContract` and re-verified by the public `GET /api/public/signature/{hash}/verify` endpoint. Any change to the signed-payload fields or checksum logic breaks verification of previously-signed documents — treat it as a compatibility-sensitive surface.

### Third-party integration

Identity verification goes through the Didit SDK (`Candidates` module, `DiditService`) via a redirect-and-webhook flow (`verify-callback`), not an embedded widget.

## Frontend architecture

`services/api/` is a centralized API layer — one file per backend domain (`auth.api.ts`, `candidates.api.ts`, `forms.api.ts`, `signing.api.ts`, `users.api.ts`, `analytics.api.ts`, `audit.api.ts`, `notifications.api.ts`), all built on the shared `apiClient` in `client.ts`. New backend calls should be added to the matching domain file rather than called ad hoc from components.

Route groups under `app/`:
- `(auth)/login` — internal login
- `apply/[uuid]` — public candidate application form (unauthenticated)
- `candidate/sign/[token]` — public tokenized signing view (unauthenticated)
- `dashboard/` — authenticated admin/recruiter area

`middleware.ts` intentionally does no server-side auth gating — everything is enforced client-side via the `useAuth` hook (`hooks/use-auth.ts`). Don't assume route protection happens at the edge.

Real-time features use `laravel-echo` + `pusher-js` against the backend's Reverb server.
