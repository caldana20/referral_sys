#!/usr/bin/env bash
set -euo pipefail

# Run inside the project root after `docker compose up -d`
# Applies schema and seeds TenantHost entries (requires env in server/.env)

docker compose exec backend node scripts/syncSchema.js
docker compose exec backend node scripts/seedTenantHosts.js

