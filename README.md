# Recurra — Subscription Management System

**Odoo Hackathon 2026 · Team entry for the Brightloop Software problem statement**

Brightloop doesn't need a better spreadsheet. It needs billing that runs itself. Recurra bills on
schedule, can never bill twice, applies taxes and discounts on its own, and shows finance the real
numbers on one screen.

## Problem
Brightloop sells recurring software plans but tracks customers, renewals, invoices and payments by
hand. Invoices are missed or raised twice, GST is split incorrectly across states, and nobody knows
the real MRR or how much is overdue.

## Features
| Area | What it does | Lane |
|------|--------------|------|
| Auth & users | Signup with password rules, login, password reset, admin-created staff, customer records | M2 |
| Dashboard & reports | Active subscriptions, revenue, outstanding, overdue, MRR with filters | M2 |
| Catalog | Taxes, products with variants, recurring plans, discounts (admin only) | M3 |
| Sales | Quotation templates, subscriptions with lines, status machine, audit timeline, customer portal | M4 |
| Billing | Billing run with dry-run preview and "bill as of" date, idempotent invoice generation, GST split (CGST+SGST / IGST), payments | M5 |

Highlights for judges: a billing run you can replay safely (a DB unique constraint makes double
billing impossible, so running twice creates 0 new invoices), a time-machine "bill as of" date,
GST split by customer state, an audit timeline per subscription and a live KPI dashboard.

## Roles
| Role | Can do |
|------|--------|
| ADMIN | Everything, including users, discounts and committing billing runs |
| INTERNAL | Day-to-day operations; cannot configure users or discounts |
| PORTAL | Customer; sees and acts only on their own subscriptions and invoices |

## Tech stack
Next.js 15 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 + shadcn/ui · Prisma 6 + SQLite ·
Zod · bcryptjs · jose (JWT session cookie). Runs fully offline on a laptop; no cloud services.

## Setup
Requires Node 20+ and Git.

```bash
git clone https://github.com/Nikhil-k00/Odoo-hackathon.git
cd Odoo-hackathon
npm install
cp .env.example .env
npx prisma migrate dev      # creates prisma/dev.db and runs the seed
npx prisma db seed          # re-run the seed if needed (safe to repeat)
npm run dev                 # http://localhost:3000
```

Useful scripts: `npm run typecheck` (tsc), `npm run lint`, `npm run build`, `npm run db:reset`
(wipes the local DB and re-seeds).

## Demo accounts
| Role | Email | Password |
|------|-------|----------|
| ADMIN | admin@recurra.in | Admin@1234 |
| INTERNAL | staff@recurra.in | Staff@1234 |
| PORTAL (Kerala) | customer1@demo.in | Customer@1234 |
| PORTAL (Kerala) | customer2@demo.in | Customer@1234 |
| PORTAL (Karnataka) | customer3@demo.in | Customer@1234 |

The seed also creates GST 18%, two products (one with a Brand = Odoo variant at +₹560), Monthly and
Yearly plans and an active 10% discount (LAUNCH10).

## Project structure
```
prisma/            schema (frozen) + seed
src/app/(auth)/    login, signup, forgot-password, reset
src/app/(app)/     authenticated app with sidebar: dashboard, catalog, sales, billing, admin
src/app/portal/    customer portal
src/components/    app-sidebar, placeholder-page, shadcn ui/*
src/features/      lane-specific server logic (auth, catalog, subscriptions, billing, reports)
src/lib/           db, session (JWT), money, dates, auth-actions
src/middleware.ts  redirects to /login when no session cookie
```
Team conventions, folder ownership and shared helper signatures live in `CLAUDE.md`.
The full build guide is `Recurra_Team_Build_Guide.pdf`.

## Demo flow
1. Sign up with a weak password (errors shown), then a strong one; land in the portal.
2. Admin creates GST 18%, a product with the Odoo variant, a monthly plan and a 10% discount.
3. Admin creates an internal user; staff cannot open Users or Discounts.
4. Staff creates a subscription from a template: Draft → Quotation → Confirmed → Active, with a timeline.
5. Admin runs billing: preview, run, run again (0 new, all skipped).
6. Staff opens the invoice: discount + CGST/SGST, print, record payment → PAID.
7. Admin sets "bill as of" two months ahead: new invoices, one overdue.
8. Customer portal shows only that customer's data; pause if the plan allows.
9. Dashboard and reports show active subs, revenue, outstanding, overdue and MRR.

## Screenshots
_Added after integration._
