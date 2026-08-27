# Render single-service deployment

This build serves the Vite frontend and NestJS API from one Render Web Service and one domain.

## Render service settings

- Type: Web Service
- Repository: this repository
- Branch: `main`
- Build Command: `npm ci --include=dev && npm run build`
- Start Command: `npm run start:prod`
- Health Check Path: `/`

## Required Render environment variables

Set these in Render -> Service -> Environment:

- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN=8h`
- `CORS_ORIGIN=https://hrmis-sindh.com`
- bootstrap/test user variables only if you intend to seed those accounts

Do not set `PORT`; Render injects it automatically.
Do not set `VITE_API_URL` for production. The built frontend calls same-origin `/api`.

## Domain

Attach `hrmis-sindh.com` to this single Web Service. The root URL serves React; `/api/*` stays on NestJS.

## Seeding

After the service is deployed and environment variables are configured, use the Render Shell once:

`npm run seed:test-users -w @hrmis/api`
