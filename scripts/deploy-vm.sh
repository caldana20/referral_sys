#!/bin/bash

# Deployment script for Google Cloud VM
# Run this script on the VM after SSH'ing into it

set -e  # Exit on error

echo "🚀 Starting deployment setup..."

# Update system
echo "📦 Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js already installed: $(node --version)"
fi

# Install Git
if ! command -v git &> /dev/null; then
    echo "📦 Installing Git..."
    sudo apt-get install -y git
else
    echo "✅ Git already installed"
fi

# Install PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
else
    echo "✅ PM2 already installed"
fi

# Install Nginx
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing Nginx..."
    sudo apt-get install -y nginx
else
    echo "✅ Nginx already installed"
fi

echo ""
echo "✅ Basic software installation complete!"
echo ""
echo "Next steps:"
echo "1. Clone your repository: git clone <your-repo-url> ~/referral-system"
echo "2. Install dependencies: cd ~/referral-system && npm install && cd server && npm install && cd ../client && npm install"
echo "3. Build frontend: cd ~/referral-system/client && npm run build"
echo "4. Set up .env file in server directory"
echo "5. Configure PM2 and Nginx (see DEPLOYMENT.md for details)"

