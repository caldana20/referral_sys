# Deployment Guide: Referral System to Google Cloud VM

## Prerequisites
- Google Cloud account with billing enabled
- gcloud CLI installed and authenticated
- Your code pushed to a Git repository (GitHub, GitLab, etc.)

## Development vs Production Architecture

**Development (Local):**
- Frontend: Vite dev server on `http://localhost:5173`
- Backend: Express server on `http://localhost:5000`
- Database: SQLite file (`server/database.sqlite`)

**Production (Google Cloud VM):**
- Frontend: Built static files served by Nginx on port 80/443
- Backend: Express server on `http://localhost:5000` (proxied by Nginx)
- Database: SQLite file (`server/database.sqlite`)
- **Port 5173 is NOT used in production** - only for local development

## Step 1: Create a Google Cloud Project

```bash
# Create a new project (or use existing)
gcloud projects create referral-system-app --name="Referral System"

# Set the project as active
gcloud config set project referral-system-app

# Enable billing (you'll need to do this in the console if not already enabled)
# Visit: https://console.cloud.google.com/billing
```

## Step 2: Create a VM Instance

```bash
# Create a VM instance
gcloud compute instances create referralsysvm \
  --zone=us-west1-b \
  --machine-type=e2-small \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=20GB \
  --tags=http-server,https-server

# Allow HTTP and HTTPS traffic
gcloud compute firewall-rules create allow-http \
  --allow tcp:80 \
  --source-ranges 0.0.0.0/0 \
  --target-tags http-server

gcloud compute firewall-rules create allow-https \
  --allow tcp:443 \
  --source-ranges 0.0.0.0/0 \
  --target-tags https-server

# Note: Port 5173 is ONLY for development (Vite dev server)
# In production, we build the frontend and serve it via Nginx on port 80/443
# We only need port 5000 for the backend (which Nginx will proxy to)
# So we don't need to open port 5173 in production
```

## Step 3: SSH into the VM

```bash
# Get the external IP
gcloud compute instances describe referralsysvm --zone=us-west1-b --format='get(networkInterfaces[0].accessConfigs[0].natIP)'

# SSH into the VM
gcloud compute ssh referralsysvm --zone=us-west1-b
```

## Step 4: Install Required Software on VM

Once SSH'd into the VM, run:

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git
sudo apt-get install -y git

# Install PM2 (process manager for Node.js)
sudo npm install -g pm2

# Install Nginx (reverse proxy)
sudo apt-get install -y nginx

# Verify installations
node --version
npm --version
pm2 --version
```

## Step 5: Clone Your Repository

```bash
# Create app directory
mkdir -p ~/referral-system
cd ~/referral-system

# Clone your repository (replace with your actual repo URL)
git clone https://github.com/caldana20/referral_sys.git .

# Or if using SSH:
# git clone git@github.com:yourusername/referral_sys.git .
```

## Step 6: Install Dependencies

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..

# Install client dependencies
cd client
npm install
cd ..
```

## Step 7: Build the Frontend

```bash
cd client
npm run build
cd ..
```

## Step 8: Set Up Environment Variables

```bash
# Create .env file for server
cd server
nano .env
```

Add the following (adjust values as needed):
```env
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
CLIENT_URL=https://your-domain.com
NODE_ENV=production
```

**Important Notes:**
- `CLIENT_URL` should be your production domain (e.g., `https://referrals.yourcleaningangels.com`)
- **DO NOT** use `http://localhost:5173` in production - that's only for development
- The frontend runs on port 5173 in development, but in production it's built and served via Nginx on port 80/443

Save and exit (Ctrl+X, then Y, then Enter)

## Step 9: Set Up Database

```bash
cd ~/referral-system/server

# The database will be created automatically when the app runs
# But you can verify the database.sqlite file exists after first run
```

## Step 10: Configure PM2 to Run the Server

```bash
cd ~/referral-system/server

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'referral-server',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
EOF

# Start the server with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
# Follow the instructions it prints (usually involves running a sudo command)
```

## Step 11: Configure Nginx as Reverse Proxy

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/referral-app
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;  # Replace with your domain or use VM's IP

    # Serve static frontend files
    location / {
        root /home/your-username/referral-system/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Node.js backend
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Note:** Replace `your-username` with your actual username on the VM (run `whoami` to check)

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/referral-app /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## Step 12: Set Up SSL Certificate (Optional but Recommended)

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d referrals.yourcleaningangels.com

# Certbot will automatically configure Nginx and set up auto-renewal
```

## Step 13: Update Client URL in Environment

**IMPORTANT:** Update the `CLIENT_URL` in `server/.env` to match your production URL:

```bash
cd ~/referral-system/server
nano .env
```

Change `CLIENT_URL` from:
```env
CLIENT_URL=http://localhost:5173  # ❌ Development only
```

To your production URL:
```env
CLIENT_URL=https://your-domain.com  # ✅ Production
# OR if using IP:
# CLIENT_URL=http://YOUR_VM_EXTERNAL_IP
```

**Why this matters:** The `CLIENT_URL` is used in emails to generate referral links. If it's set to `localhost:5173`, the links in emails won't work for your users.

Then restart PM2:
```bash
pm2 restart referral-server
```

## Step 14: Verify Everything is Working

```bash
# Check PM2 status
pm2 status

# Check PM2 logs
pm2 logs referral-server

# Check Nginx status
sudo systemctl status nginx

# Test from VM
curl http://localhost:5000
curl http://localhost
```

## Step 15: Access Your App

- **If using domain:** Visit `https://your-domain.com`
- **If using IP:** Visit `http://YOUR_VM_EXTERNAL_IP`

## Useful Commands for Maintenance

```bash
# View server logs
pm2 logs referral-server

# Restart server
pm2 restart referral-server

# Stop server
pm2 stop referral-server

# View server status
pm2 status

# Update code
cd ~/referral-system
git pull
cd client && npm run build && cd ..
pm2 restart referral-server

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

**📖 For detailed step-by-step update instructions, see [UPDATE_GUIDE.md](./UPDATE_GUIDE.md)**

## Troubleshooting

1. **Can't access the app:**
   - Check firewall rules: `gcloud compute firewall-rules list`
   - Check VM is running: `gcloud compute instances list`
   - Check PM2: `pm2 status`
   - Check Nginx: `sudo systemctl status nginx`

2. **Server not starting:**
   - Check logs: `pm2 logs referral-server`
   - Verify .env file exists and has correct values
   - Check database permissions

3. **Frontend not loading (404 error):**
   - **Check if frontend was built:**
     ```bash
     ls -la ~/referral-system/client/dist
     ```
     If the `dist` folder doesn't exist or is empty, build it:
     ```bash
     cd ~/referral-system/client
     npm run build
     ```
   
   - **Check your username matches Nginx config:**
     ```bash
     whoami  # Note your username
     ```
     Then verify the path in Nginx config matches:
     ```bash
     sudo cat /etc/nginx/sites-available/referral-app | grep root
     ```
     The path should be `/home/YOUR_USERNAME/referral-system/client/dist`
   
   - **Check if Nginx config is enabled:**
     ```bash
     ls -la /etc/nginx/sites-enabled/
     ```
     You should see `referral-app` symlinked. If not:
     ```bash
     sudo ln -s /etc/nginx/sites-available/referral-app /etc/nginx/sites-enabled/
     sudo rm /etc/nginx/sites-enabled/default  # Remove default if still there
     sudo nginx -t  # Test config
     sudo systemctl restart nginx
     ```
   
   - **Check Nginx error logs for specific errors:**
     ```bash
     sudo tail -20 /var/log/nginx/error.log
     ```
   
   - **Fix file permissions (Permission denied error):**
     ```bash
     # Make sure Nginx can read the files
     # Option 1: Make files readable by all (recommended for static files)
     sudo chmod -R 755 ~/referral-system/client/dist
     sudo chmod -R 755 ~/referral-system/client
     sudo chmod -R 755 ~/referral-system
     
     # Option 2: Add www-data to your group and set group permissions
     sudo usermod -a -G $USER www-data
     sudo chown -R $USER:www-data ~/referral-system/client/dist
     sudo chmod -R 755 ~/referral-system/client/dist
     
     # After fixing permissions, restart Nginx
     sudo systemctl restart nginx
     ```
     
     **Note:** The `Permission denied (13)` error means Nginx can't access the files. The above commands fix this by making the directories readable.

## Security Recommendations

1. **Set up SSH keys** instead of password authentication
2. **Configure firewall** to only allow necessary ports
3. **Keep system updated:** `sudo apt-get update && sudo apt-get upgrade`
4. **Use strong JWT_SECRET** in production
5. **Set up regular backups** of your database
6. **Monitor logs** regularly for suspicious activity

