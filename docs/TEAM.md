# Team Plan — Four Members

## Ownership
1. **Lead / Integration:** clarify scope, manage task board, review PRs, integrate, coordinate demo.
2. **UI / User Journey:** build the screens or Odoo views, navigation, responsive layout, and useful states.
3. **Backend / Odoo Logic:** own models, business rules, APIs, permissions, and server-side validation.
4. **QA / Data / Delivery:** prepare test data, test edge cases, verify setup, maintain instructions, and coordinate demo rehearsal.

Roles are flexible; everyone should contribute and understand the full product.

## Working agreement
- Each task has an owner and a reviewer.
- Use branches such as `feat/<short-name>` or `fix/<short-name>`.
- Open a pull request for review; keep changes small.
- Tell teammates before changing shared models, APIs, or interfaces.
- Keep `main` working. Never commit `.env`, credentials, or private data.

## Sprint priorities
1. Understand the statement and judging criteria.
2. Build one complete, demonstrable workflow.
3. Validate data and handle common failure cases.
4. Polish the UI and rehearse the demo.
5. Add extras only after the MVP is stable.

## Final demo checklist
- [ ] Fresh start/setup works.
- [ ] Main workflow passes end-to-end.
- [ ] No dead buttons or critical errors in the demo path.
- [ ] All teammates can explain their contribution.
- [ ] Demo fits the event time limit.
- [ ] Be clear about what is real, mocked, or incomplete.
