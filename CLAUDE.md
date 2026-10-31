# Recurra - Subscription Management System (Odoo Hackathon)

## Stack
Next.js App Router + TypeScript, Tailwind + shadcn/ui, Prisma + SQLite, Zod, bcryptjs, jose.

## Hard rules
- Build ONLY the lane of the member you are working for (M1..M5). See the build guide PDF
  (`Recurra_Team_Build_Guide.pdf` in the repo root).
- NEVER edit files owned by another lane. Shared files are owned by M1:
  prisma/*, src/lib/*, src/middleware.ts, src/components/app-sidebar.tsx,
  src/components/ui/*, src/app/layout.tsx, src/app/(app)/layout.tsx, src/app/page.tsx,
  CLAUDE.md, README.md, package.json.
- Need a shared change? Stop and tell the user to ask M1. Do not work around it.
- Need a new npm package? Ask the user first (package.json conflicts).
- All data comes from the DB through Prisma. No hardcoded or static JSON data.
- Every form: Zod validation in the Server Action + inline error messages in the UI.
- Every Server Action and page calls requireRole([...]) from @/lib/session.
- UI: shadcn components, p-6 page padding, gap-4, status shown with <Badge>,
  tables wrapped in overflow-x-auto (mobile friendly), toast on success/error.
- Money: round2() and formatINR() from @/lib/money. Dates: addDays/addPeriod from @/lib/dates.
- Commit small and often with clear messages, e.g. "feat(catalog): add plan form".

## Shared helpers (made by M1)
```ts
import { prisma } from "@/lib/db"
import { getSession, requireRole, createSession, destroySession } from "@/lib/session"
  getSession(): Promise<{ userId: string; role: "ADMIN"|"INTERNAL"|"PORTAL"; name: string } | null>
  requireRole(roles: Role[]): Promise<Session>   // redirects to /login if not logged in,
                                                  // to / (role home) if logged in with a wrong role
  createSession(user: { id: string; role: string; name: string }): Promise<void>  // sets httpOnly cookie
  destroySession(): Promise<void>
import { round2, formatINR } from "@/lib/money"
import { addDays, addPeriod } from "@/lib/dates"
  // addPeriod(date, "DAILY"|"WEEKLY"|"MONTHLY"|"YEARLY")
import { logoutAction } from "@/lib/auth-actions"   // server action used by the sidebar Logout button
```
Each placeholder page.tsx (made by M1) is meant to be REPLACED by the lane owner.

## Folder ownership
M1: shared files above, prisma/seed.ts
M2: src/app/(auth)/**, src/app/(app)/users/**, customers/**, dashboard/**, reports/**,
    src/features/auth/**, src/features/reports/**
M3: src/app/(app)/products/**, taxes/**, plans/**, discounts/**, src/features/catalog/**
M4: src/app/(app)/templates/**, subscriptions/**, src/app/portal/**, src/features/subscriptions/**
M5: src/app/(app)/billing/**, invoices/**, payments/**, src/features/billing/**

## Status rules
Subscription: DRAFT -> QUOTATION -> CONFIRMED -> ACTIVE -> CLOSED ; ACTIVE <-> PAUSED (if plan.pausable)
Invoice: DRAFT -> CONFIRMED -> PAID ; DRAFT or CONFIRMED -> CANCELLED

## Demo accounts (seed)
admin@recurra.in / Admin@1234     staff@recurra.in / Staff@1234     customer1@demo.in / Customer@1234

## Local setup
```bash
npm install
cp .env.example .env
npx prisma migrate dev      # creates prisma/dev.db
npx prisma db seed          # demo data
npm run dev                 # http://localhost:3000
npx tsc --noEmit            # run before every commit
```
