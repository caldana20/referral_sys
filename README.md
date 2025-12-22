# Referral System (Next.js frontend + Express API)

## Run the app (Next-only)
- Install deps: `npm run install-all` (root). This installs root + server + next-app.
- Start dev (Next + API): `npm run dev` (root) — runs Express on 5000 and Next on 3000.
- Next standalone: `cd next-app && npm run dev`
- Build/start Next (prod): `cd next-app && npm run build && npm run start`

## Environment
- Server: set in `server/.env` (includes DB, JWT, SENDGRID, `CLIENT_URL_BASE=http://localhost:3000`)
- Next: set in `next-app/.env.local`
  - `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000`

## Removed legacy Vite client
- The old `client/` app is no longer used. All frontend is in `next-app/`.

## Email Notifications Setup (SendGrid)
1) Create a SendGrid account and verify a sender (Settings → Sender Authentication).
2) Generate an API key (Settings → API Keys).
3) In `server/.env`:
```
SENDGRID_API_KEY=SG.your-api-key-here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```
Notes:
- `SENDGRID_FROM_EMAIL` must be a verified sender.
- `EMAIL_USER` can be used as a fallback for sender email.
