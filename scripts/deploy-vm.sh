#!/usr/bin/env bash
set -euo pipefail

# Bootstrap a fresh Ubuntu VM for Docker + Nginx + certbot.
# Run this after SSH'ing into the VM.

echo "Updating packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

echo "Installing prerequisites..."
sudo apt-get install -y ca-certificates curl gnupg lsb-release

echo "Installing Docker Engine..."
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "Adding current user to docker group (log out/in to apply)..."
sudo usermod -aG docker "$USER"

echo "Installing Git, Nginx, certbot..."
sudo apt-get install -y git nginx certbot python3-certbot-nginx

echo ""
echo "Done. Next steps on the VM:"
echo "1) Re-login or 'newgrp docker' so Docker group applies."
echo "2) Clone the repo under /opt/referral_sys (or preferred path)."
echo "3) Copy env templates: server/env.example -> server/.env, env.compose.example -> .env, next-app/env.local.example -> next-app/.env.local."
echo "4) docker compose build && docker compose up -d"
echo "5) Configure Nginx from nginx.conf.example, then obtain certs with certbot."
echo "6) Run migrations/seeds: ./scripts/compose-migrate.sh"

