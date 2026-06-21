# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This App Is

FS Comp Core is an internal operations system for a second-hand laptop business (FS Comp). It manages the full lifecycle of refurbished laptops: from PSI batch intake → initial QC → daily QC → sales → reporting. It also has a public-facing PC builder configurator. The primary language throughout the codebase, UI strings, database field names, and comments is **Bahasa Indonesia**.

## Commands

```bash
npm run dev          # Start dev server at localhost:3000
npm run build        # prisma generate + next build
npm run lint         # ESLint

npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:migrate   # Deploy pending migrations (prisma migrate deploy)
npm run db:studio    # Open Prisma Studio
```

There is no test suite — no Jest, Vitest, or similar installed.

## Environment Variables

```env
DATABASE_URL="postgresql://user:password@host:5432/fscomp_core"
CORE_PUBLIC_URL="https://core.fscomp.id"          # defaults to this value if unset
N8N_SALES_WEBHOOK_URL=""                           # optional, triggers WhatsApp on each sale
WA_OWNER_NUMBER="0816660056"                       # optional, for n8n WhatsApp alerts
WA_REPORT_GROUP_ID=""                              # optional
OPENAI_API_KEY=""                                  # optional, for AI features
OPENAI_MODEL=""                                    # optional
```

## Architecture

### Data layer: dual-source

Most pages query **Prisma directly** from server components and server actions. `lib/api.ts` holds static demo arrays (`batches`, `units`, `dailyQcs`, `aiLogs`) that serve as **fallback data** for pages not yet migrated to the database, and are still used by `/api/ai/daily-report`. When adding new features, prefer querying Prisma.

`lib/prisma.ts` exports a singleton `prisma` client (standard Next.js global pattern to avoid duplicate connections in dev).

### Auth & session

Authentication is entirely cookie-based — no NextAuth, no JWT library.

- `lib/auth.ts` — defines the `User` type, `demoUsers` (hardcoded fallback credentials), and role-permission helpers (`canViewPrice`, `canEditBatch`, etc.).
- `lib/session.ts` — reads/writes the `fscomp_user` HTTP-only cookie (12h, stores JSON of `{ name, username, password, role }`). Exports `getCurrentUser()`, `requireUser()`, `requireRole([...])`.
- `lib/user-store.ts` — on first DB login, syncs `demoUsers` into the `User` table automatically. Passwords are stored as-is in the DB.
- `middleware.ts` — protects all non-public routes; redirects `magang` role to `/qc-harian` if they navigate outside their allowed paths.

**Public paths** (no login required): `/login`, `/katalog`, `/katalog/*`, `/unit/[id]`, `/nota/*`.

**Role hierarchy**: `admin` > `teknisi` > `sales` > `magang`.

### Mutation pattern (Server Actions)

Every page directory that has forms contains an `actions.ts` file marked `"use server"`. The consistent pattern:

1. Call `requireRole([...])` immediately to enforce auth.
2. Extract fields from `FormData` using local helpers (`text()`, `numberValue()`, `numberOrNull()`).
3. Write to Prisma, using `prisma.$transaction()` for multi-table writes.
4. Call `revalidatePath()` for all affected routes, then `redirect()`.
5. On validation failure, `redirect("...?error=<key>")` — the page reads the query param to show an inline error.

### API routes (app/api/)

These exist for **external integrations only**, not for internal page data:

| Route | Purpose |
|---|---|
| `GET /api/integrations/n8n/whatsapp-alert` | n8n polls this to send WhatsApp unit-problem alerts |
| `GET /api/integrations/n8n/daily-qc-list` | Daily QC summary for n8n workflows |
| `GET /api/integrations/catalog/spreadsheet-export` | Catalog data export for Google Sheets |
| `GET /api/finance/report` | Finance summary export |
| `GET /api/ai/daily-report` | AI daily report (currently still uses static demo data) |
| `POST /api/admin/backup` | Trigger database backup |
| `GET /api/attendance/export` | Attendance export |
| `GET /api/batch-psi/[id]/export` | Batch export |
| `GET /api/users/export` | User export |

Routes that query the live database export `dynamic = "force-dynamic"`.

### Unit lifecycle

```
BatchPSI created → Units imported (status: RECHECK)
  → QcAwal performed → status → VERIFIED / VERIFIED_WITH_NOTES / CANDIDATE_RETUR / RETUR_DISTRIBUTOR
  → QcHarian daily checks (any role including magang)
  → Sale created → unit.soldAt set (marks as sold)
  → Sale can be voided (unit.soldAt cleared) or restored
```

A unit can only be sold if it has at least one `QcHarian` entry and the latest `masihLolos !== TIDAK_LOLOS`.

### Key database models

- **`BatchPSI`** — supplier batch with payment due tracking
- **`Unit`** — laptop unit with specs, pricing, status (`UnitStatus` enum)
- **`QcAwal`** — one-time initial QC (1:1 with Unit), covers hardware + software checklist items as `QcResult` (OK/NOTES/FAIL)
- **`QcHarian`** — daily QC records (1:many with Unit); `masihLolos` uses `DailyStatus` enum
- **`Sale`** + **`SaleItem`** — cashier transaction; sale location is either `WIRADESA` or `KAJEN` (profit split 60/40 for Kajen)
- **`LicenseRecord`** — software licenses (Windows, Office, Antivirus) auto-created from `SaleItem` when the item name/category implies a license
- **`InventoryItem`** — accessories/components stock; can be linked to a Unit or used in Rakit PC
- **`PcComponent`** / **`PcBuildPreset`** / **`PcBuildDraft`** — PC builder feature (public builder at `/katalog/rakit-pc`, admin at `/rakit-pc`)
- **`UnitAuditLog`** — immutable log of field changes on Unit
- **`Attendance`** — check-in/check-out with optional geo + photo

### PC Builder module

`lib/pc-compatibility.ts` — pure compatibility checker; takes an array of selected `PcCompatibilityComponent` and returns `PcCompatibilityIssue[]` with `"bad"` or `"warn"` severity. Checks: CPU socket, memory type, form factor, storage interface, GPU length, cooler height, radiator size, PSU capacity.

`lib/pc-builder.ts` — `getPublicPcBuilderData()` fetches active components and presets; returns `{ connected: false }` on DB error so the public page gracefully degrades.

### Migrations

Migration files live in `prisma/migrations/` named `YYYYMMDDNNNN_description`. Deploy with `npm run db:migrate` (`prisma migrate deploy`). **Never use `prisma db push` or `prisma migrate reset` in production.**

### n8n / WhatsApp integration

Sale notification flow: `createSaleAction` (in `app/sales/actions.ts`) calls `notifySaleToN8n()` after the transaction commits. This fires-and-forgets a POST to `N8N_SALES_WEBHOOK_URL`. Failure does not roll back the sale.

The `CORE_PUBLIC_URL` env var is used throughout to construct absolute URLs for receipts, unit detail links, and WhatsApp messages.
