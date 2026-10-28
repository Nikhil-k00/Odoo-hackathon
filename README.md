# Odoo Hackathon — Team Starter

A lightweight, professional scaffold for a four-person team. Keep the repository small, agree on the MVP, and adapt the structure to the official challenge.

## Quick start
1. Add all four teammates as repository collaborators.
2. Read `docs/CHALLENGE.md` when the problem statement is released.
3. Choose the architecture that fits the rules: Odoo module, separate frontend/backend, or hybrid.
4. Assign tasks, build one complete user workflow, and integrate early.
5. Test the workflow and rehearse the demo before submission.

## Structure
```text
.
├── frontend/       # Separate UI, only if needed
├── backend/        # Separate API/business logic, only if needed
├── odoo_addons/    # Custom Odoo modules, if needed
├── docs/
│   ├── CHALLENGE.md
│   └── TEAM.md
├── .env.example
├── .gitignore
└── README.md
```

## Architecture rule
Do not install a framework or create boilerplate just because a folder exists. If the challenge is Odoo-native, use `odoo_addons/` and Odoo's models, views, access rules, and business logic where appropriate. Add a separate frontend or backend only when the requirements justify it.

## Team engineering rules
- Keep `main` stable and demoable.
- Use one branch and pull request per task; ask a teammate to review.
- Never commit secrets, `.env`, API keys, or real user data.
- Validate inputs and handle errors.
- Prefer working, dynamic behavior over static mockups. Clearly identify mock data if used.
- Freeze features early enough to test and rehearse.
