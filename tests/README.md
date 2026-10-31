# End-to-end test

`tests/e2e.mjs` drives a real Chromium through the whole demo flow against a **fresh** database:
signup rules, login, catalog validation, users, customers, templates, subscription status machine,
billing run (preview, commit, idempotent re-run, time machine), invoice GST split, payments,
role restrictions, portal scoping and password reset. It prints one PASS/FAIL line per step and
saves a screenshot for every failure.

```bash
npx playwright install chromium          # once
rm -f prisma/dev.db && npx prisma migrate deploy && npx prisma db seed
npm run build && npx next start -p 3177  # or: npm run dev -- -p 3177
npm run test:e2e                         # in a second terminal
```

Set `E2E_BASE_URL` to point at another port. The run is destructive for the local DB, so reset it afterwards.
