# Step-by-Step Guide: Updating the App on Remote VM

This guide walks you through updating your referral system application on your Google Cloud VM after making changes to the code.

## Prerequisites
- Access to your Google Cloud VM
- Code pushed to your Git repository (GitHub, GitLab, etc.)
- SSH access configured

## Step 1: SSH into Your VM

```bash
# SSH into your VM
gcloud compute ssh referralsysvm --zone=us-west1-b

# Or if you have the IP address:
# ssh your-username@YOUR_VM_IP
```

## Step 2: Navigate to Your Application Directory

```bash
cd ~/referral-system
```

## Step 3: Check Current Status

Before updating, it's good practice to check the current status:

```bash
# Check PM2 status (your server process)
pm2 status

# Check if there are any uncommitted changes (should be none in production)
git status
```

## Step 4: Pull Latest Code from Git

```bash
# Pull the latest changes from your repository
git pull origin main

# Or if you're on a different branch:
# git pull origin your-branch-name
```

**Note:** If you get merge conflicts, resolve them carefully. In production, it's best to ensure your local changes are committed and pushed before pulling.

## Step 5: Install/Update Dependencies (if needed)

### Check if package.json files changed

```bash
# Check if server dependencies changed
cd server
git diff HEAD~1 package.json

# Check if client dependencies changed
cd ../client
git diff HEAD~1 package.json
```

### Update Server Dependencies (if package.json changed)

```bash
cd ~/referral-system/server
npm install
```

### Update Client Dependencies (if package.json changed)

```bash
cd ~/referral-system/client
npm install
```

**Note:** If `package.json` hasn't changed, you can skip this step.

## Step 6: Rebuild the Frontend

**Important:** Always rebuild the frontend after code changes, even if dependencies didn't change.

```bash
cd ~/referral-system/client
npm run build
```

This creates the production-ready static files in the `dist` folder that Nginx serves.

## Step 7: Check for Environment Variable Changes

If you added new environment variables, update the `.env` file:

```bash
cd ~/referral-system/server
nano .env
```

Add or update any new variables, then save (Ctrl+X, then Y, then Enter).

## Step 8: Restart the Server

Restart PM2 to apply the changes:

```bash
# Restart the server
pm2 restart referral-server

# Or if you prefer to stop and start:
# pm2 stop referral-server
# pm2 start referral-server
```

## Step 9: Verify Everything is Working

### Check PM2 Status

```bash
pm2 status
```

You should see `referral-server` with status `online`.

### Check Server Logs

```bash
# View recent logs
pm2 logs referral-server --lines 50

# Or follow logs in real-time (press Ctrl+C to exit)
pm2 logs referral-server
```

Look for any errors or warnings. Common issues:
- Database connection errors
- Missing environment variables
- Port conflicts

### Test the Application

```bash
# Test backend API (from VM)
curl http://localhost:5000/api/rewards/active

# Test frontend (from VM)
curl http://localhost
```

### Test from Your Browser

- Visit your domain: `https://your-domain.com`
- Or visit your VM's IP: `http://YOUR_VM_EXTERNAL_IP`
- Test key functionality:
  - Generate referral link
  - Access referral landing page
  - Admin login

## Step 10: Check Nginx (if needed)

If you made changes to static files or routes, verify Nginx is serving correctly:

```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx error logs
sudo tail -20 /var/log/nginx/error.log

# Test Nginx configuration
sudo nginx -t

# Restart Nginx if needed
sudo systemctl restart nginx
```

## Quick Update Script

For frequent updates, you can create a script to automate the process:

```bash
# Create update script
nano ~/update-app.sh
```

Add this content:

```bash
#!/bin/bash
set -e  # Exit on error

echo "🔄 Starting app update..."

cd ~/referral-system

echo "📥 Pulling latest code..."
git pull origin main

echo "📦 Installing dependencies..."
cd server && npm install && cd ..
cd client && npm install && cd ..

echo "🏗️  Building frontend..."
cd client && npm run build && cd ..

echo "🔄 Restarting server..."
pm2 restart referral-server

echo "✅ Update complete!"
echo "📊 Checking status..."
pm2 status

echo "📝 Recent logs:"
pm2 logs referral-server --lines 20 --nostream
```

Make it executable:

```bash
chmod +x ~/update-app.sh
```

Then you can update with a single command:

```bash
~/update-app.sh
```

## Troubleshooting

### Server Won't Start

```bash
# Check logs for errors
pm2 logs referral-server

# Check if port 5000 is in use
sudo lsof -i :5000

# Check environment variables
cd ~/referral-system/server
cat .env
```

### Frontend Not Updating

```bash
# Verify build completed
ls -la ~/referral-system/client/dist

# Check Nginx is serving the right directory
sudo cat /etc/nginx/sites-available/referral-app | grep root

# Clear browser cache or test in incognito mode
```

### Database Issues

```bash
# Check database file exists and permissions
ls -la ~/referral-system/server/database.sqlite

# If needed, fix permissions
sudo chown $USER:$USER ~/referral-system/server/database.sqlite
```

### Git Pull Conflicts

If you get merge conflicts:

```bash
# See what files have conflicts
git status

# Option 1: Stash local changes (if any)
git stash
git pull
git stash pop

# Option 2: Reset to remote (WARNING: loses local changes)
git fetch origin
git reset --hard origin/main
```

## Rollback Procedure

If something goes wrong and you need to rollback:

```bash
cd ~/referral-system

# See recent commits
git log --oneline -10

# Rollback to previous commit (replace COMMIT_HASH)
git reset --hard COMMIT_HASH

# Rebuild and restart
cd client && npm run build && cd ..
pm2 restart referral-server
```

## Best Practices

1. **Always test locally first** before deploying to production
2. **Commit and push changes** to Git before pulling on the server
3. **Check PM2 logs** after every update
4. **Keep backups** of your database regularly
5. **Update during low-traffic periods** when possible
6. **Monitor the application** after updates for a few minutes

## Common Update Scenarios

### Scenario 1: Simple Code Change (No New Dependencies)

```bash
cd ~/referral-system
git pull
cd client && npm run build && cd ..
pm2 restart referral-server
```

### Scenario 2: Added New Dependencies

```bash
cd ~/referral-system
git pull
cd server && npm install && cd ..
cd client && npm install && cd ..
cd client && npm run build && cd ..
pm2 restart referral-server
```

### Scenario 3: Database Schema Changes

```bash
cd ~/referral-system
git pull
cd server && npm install && cd ..
# Run any database migrations if you have them
cd client && npm run build && cd ..
pm2 restart referral-server
```

### Scenario 4: Environment Variable Changes

```bash
cd ~/referral-system
git pull
nano server/.env  # Update environment variables
cd client && npm run build && cd ..
pm2 restart referral-server
```

## Summary Checklist

- [ ] SSH into VM
- [ ] Navigate to app directory
- [ ] Pull latest code from Git
- [ ] Install/update dependencies (if needed)
- [ ] Rebuild frontend (`npm run build`)
- [ ] Update environment variables (if needed)
- [ ] Restart PM2 server
- [ ] Check PM2 status
- [ ] Review logs for errors
- [ ] Test application in browser
- [ ] Verify key functionality works

## Need Help?

If you encounter issues:

1. Check PM2 logs: `pm2 logs referral-server`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify environment variables are set correctly
4. Ensure database file has correct permissions
5. Check firewall rules if external access is failing

