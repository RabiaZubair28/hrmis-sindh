# Sindh HRMIS (NestJS + React + MongoDB)

Green, animated HRMIS starter implementing User Profile and Leave Requests with policy engines, role-based approval chains, JWT auth, leave ledger, internal notes, and 3-day auto-forwarding.

## Stack
- API: NestJS, MongoDB/Mongoose, JWT, class-validator, Schedule
- Web: React + Vite + TypeScript + Framer Motion

## Quick start
1. Copy `apps/api/.env.example` to `apps/api/.env` and set `MONGODB_URI` + `JWT_SECRET`.
2. `npm install`
3. `npm run dev`

API: `http://localhost:3000/api`
Web: `http://localhost:5173`

## Important policy decisions
- Leave duration is inclusive calendar days. This implements the stated sandwich behavior: Mon→Mon = 8 days; Mon→Sat = 6 days.
- Leave balance accrues at 4 days for each completed service month from joining date.
- Balance deductions happen only on final approval and are recorded in a ledger.
- Secretary + Minister are modeled as a parallel final stage for MS/DHO requests; both must approve. This is isolated in `ApprovalChainResolver` and can be changed to sequential routing without touching leave policy engines.
- Non-final steps auto-forward after 72 hours. Final approval steps never auto-forward.
- Doctor requesters cannot see internal chain comments; internal workflow roles can see earlier notes.


## Role-aware leave workspace

The leave frontend and API now separate personal leave from approval work:

- **Doctor:** New Leave Request + Leave History.
- **MS/DHO:** My Leave Requests (new/history) + Employee Leave Requests (pending/processed). Casual leave is final at MS/DHO; other employee leaves can be proceeded/rejected.
- **SO / DS / AS / SS / Secretary / Minister:** Pending Requests + Processed History. Intermediate actors can Proceed/Reject; final actors can Approve/Reject.
- Internal reviewers can see prior chain notes and attachments. Doctor-facing history strips internal notes.
- Non-final active steps auto-forward after 72 hours; final approval steps persist until acted on.
- `GET /api/leaves/processed` returns actor-specific processed history.
- Users cannot act on their own leave request.

When a mapped MS/DHO or Section Officer exists, the approval step is frozen to that account. For secretariat roles, a concrete actor is frozen automatically only when exactly one active account exists for that role; otherwise the active role queue remains available until an authorized actor takes the step.

## Test account login repair
If DS/AS/SS/Secretary/Minister test logins were created by an older starter version, rerun:

```bash
npm run seed:test-users -w @hrmis/api
```

The seeder now reconciles an existing test account by email **or** personnel number, reactivates it, resets its role, and re-hashes its password from `apps/api/.env`. It also verifies every test password before exiting. A successful run prints `login verified` for all nine roles.

## Production deployment

1. Copy `apps/api/.env.example` to `apps/api/.env` on the server and replace MongoDB, JWT, CORS and seeded-account values.
2. Copy `.env.production.example` to `.env` in the repository root and set the public API URL and desired host ports.
3. Build with `docker compose -f docker-compose.prod.yml build --no-cache`.
4. Start with `docker compose -f docker-compose.prod.yml up -d`.
5. Seed the demo/role accounts once with `docker compose -f docker-compose.prod.yml exec api npm run seed:test-users` only if those accounts are required on that deployment.
6. Put HTTPS/reverse proxy in front of the web/API services and set `CORS_ORIGIN` to the exact frontend origin.

Do not commit populated `.env` files. The supplied archive intentionally contains only `.env.example` templates. Leave-action uploads use a persistent Docker volume in the production compose file.
# hrmis-sindh
