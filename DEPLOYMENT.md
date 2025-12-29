# Deployment Guide: GCP VM + Docker Compose + Nginx + Cloud SQL

Target architecture:
- GCP VM runs Docker Compose: `frontend` (Next.js, port 3000) and `backend` (Express API, port 5000).
- Host-level Nginx terminates TLS on 80/443, proxies `/` to frontend and `/api` to backend.
- Cloud SQL Postgres for data.
- SendGrid for email, Stripe for billing/webhooks.

## 1) Prerequisites
- Domain DNS ready; static IP reserved for the VM.
- GCP IAM permissions to create VM, firewall rules, and Cloud SQL.
- Secrets: JWT secret, SendGrid API key, Stripe secret/webhook/price IDs, verified `SENDGRID_FROM_EMAIL`.

## 2) Provision GCP VM (example)
```bash
gcloud compute instances create referral-vm \
  --zone=us-west1-b \
  --machine-type=e2-standard-2 \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=30GB \
  --tags=http-server,https-server,ssh

gcloud compute firewall-rules create allow-http --allow tcp:80 --target-tags=http-server
gcloud compute firewall-rules create allow-https --allow tcp:443 --target-tags=https-server
```
Reserve a static IP and attach it to the VM.

## 3) Create Cloud SQL Postgres
```bash
gcloud sql instances create referral-sql \
  --database-version=POSTGRES_15 \
  --tier=db-custom-2-3840 \
  --region=us-west1 \
  --storage-size=20GB \
  --availability-type=zonal \
  --backup-start-time=03:00

gcloud sql users create referral_app --instance=referral-sql --password='strong-password'
gcloud sql databases create referral_prod --instance=referral-sql
```
Allow the VM IP in authorized networks for the instance. Note `DB_HOST` (public IP), `DB_NAME`, `DB_USER`, `DB_PASS`.

## 4) DNS
- A records pointing to the VM IP: `refoza.com`, `www.refoza.com`, `*.tenant.refoza.com`.

## 5) Prep the VM
```bash
gcloud compute ssh referral-vm --zone=us-west1-b
cd /opt
sudo mkdir -p /opt/referral_sys && sudo chown $USER:$USER /opt/referral_sys
git clone <your-repo-url> /opt/referral_sys
cd /opt/referral_sys
./scripts/deploy-vm.sh   # installs docker, compose plugin, nginx, certbot
# re-login or run: newgrp docker
```

## 6) Environment files
- Copy templates and fill secrets:
  - `cp server/env.example server/.env`
  - `cp env.compose.example .env`
  - `cp next-app/env.local.example next-app/.env.local`

Key backend envs to set (server/.env):
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`, `DB_SSL=true`
- `HOST_BASE=*.tenant.refoza.com`
- `CLIENT_URL_BASE=https://*.tenant.refoza.com`
- `CORS_DOMAIN_SUFFIX=.tenant.refoza.com`
- `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`, `STRIPE_PORTAL_RETURN_URL`
- Optional: `BILLING_BYPASS_TENANT`, `FREE_TENANT_SLUG`, `FREE_TENANT_NAME`

Frontend/compose env (project `.env` and `next-app/.env.local`):
- `NEXT_PUBLIC_API_BASE_URL=https://*.tenant.refoza.com/api`
- `NEXT_PUBLIC_SITE_HOST=default.tenant.refoza.com` (or your wildcard/apex host for SSR)

## 7) Build and run
```bash
docker compose build
docker compose up -d
```

## 8) Migrate and seed (inside running containers)
```bash
./scripts/compose-migrate.sh
# If you need to regenerate hosts for existing tenants:
docker compose exec backend node scripts/fixPrimaryHosts.js
```

## 9) Nginx + TLS
- Use `nginx.conf.example` as a template; place at `/etc/nginx/sites-available/referral` and symlink into `sites-enabled`.
- Set upstreams to `127.0.0.1:3000` (frontend) and `127.0.0.1:5000` (backend).
- Create ACME webroot: `sudo mkdir -p /var/www/certbot`.
- Test config: `sudo nginx -t`, then `sudo systemctl reload nginx`.
- Obtain certs (wildcard needs DNS-01):
  - For apex/`www`: `sudo certbot --nginx -d refoza.com -d www.refoza.com`
  - For `*.tenant.refoza.com`: `sudo certbot certonly --manual --preferred-challenges dns -d '*.tenant.refoza.com'`
- Update `nginx.conf` cert paths to the issued files and reload Nginx.

## 10) Stripe webhook
- In Stripe Dashboard, set the endpoint to `https://www.refoza.com/api/billing/webhook` (or your domain) with signing secret `STRIPE_WEBHOOK_SECRET`.
- Use test mode keys for validation; run a test Checkout and Portal flow.

## 11) Operations
- Logs: `docker compose logs -f backend` / `frontend`.
- Restart services: `docker compose restart backend frontend`.
- Update app: `git pull`, `docker compose build`, `docker compose up -d`.
- Backups: enable automated backups in Cloud SQL; rotate SendGrid/Stripe keys as needed.

## 12) Smoke tests
- `curl https://default.tenant.refoza.com/api/meta/tenant` should resolve a tenant payload.
- Open `https://default.tenant.refoza.com/admin/login`, log in, and verify dashboard loads.
- Generate a referral link from admin, ensure link host matches `*.tenant.refoza.com`.
- Submit a referral/estimate; confirm email send (SendGrid) and data stored in Postgres.
- Billing: start a Stripe Checkout in test mode and confirm webhook updates subscription fields.

## 13) Hardening
- UFW: allow 22, 80, 443; deny everything else.
- Fail2ban (optional) for SSH/HTTP.
- Log rotation: rely on Docker’s json-file defaults or set log-opts; rotate Nginx logs via logrotate.
- Cert renewal: certbot installs a systemd timer; verify with `systemctl list-timers | grep certbot`.

