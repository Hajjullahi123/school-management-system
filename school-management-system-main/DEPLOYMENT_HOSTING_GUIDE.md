# School Management System - Deployment & Hosting Guide

## Table of Contents
1. [Introduction](#introduction)
2. [System Requirements](#system-requirements)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Hosting Options](#hosting-options)
5. [Deployment Methods](#deployment-methods)
6. [Platform-Specific Guides](#platform-specific-guides)
7. [Domain & SSL Setup](#domain--ssl-setup)
8. [Database Setup](#database-setup)
9. [Environment Configuration](#environment-configuration)
10. [Post-Deployment Tasks](#post-deployment-tasks)
11. [Monitoring & Maintenance](#monitoring--maintenance)
12. [Scaling Strategies](#scaling-strategies)
13. [Backup & Recovery](#backup--recovery)
14. [Security Best Practices](#security-best-practices)
15. [Troubleshooting](#troubleshooting)

---

## Introduction

This guide provides comprehensive instructions for deploying and hosting the School Management System in a production environment. It covers various hosting platforms, deployment strategies, and best practices.

### What You'll Need

- Basic command line knowledge
- Access to a hosting platform account
- Domain name (recommended)
- Credit card for paid services (if applicable)
- 2-4 hours for initial setup

---

## System Requirements

### Minimum Server Requirements

**For Small Schools (< 500 students)**:
- **CPU**: 2 vCPUs
- **RAM**: 2GB
- **Storage**: 20GB SSD
- **Bandwidth**: 100GB/month
- **OS**: Ubuntu 20.04 LTS or newer

**For Medium Schools (500-2000 students)**:
- **CPU**: 4 vCPUs
- **RAM**: 4GB
- **Storage**: 50GB SSD
- **Bandwidth**: 500GB/month
- **OS**: Ubuntu 20.04 LTS or newer

**For Large Schools (2000+ students)**:
- **CPU**: 8 vCPUs
- **RAM**: 8GB
- **Storage**: 100GB SSD
- **Bandwidth**: 1TB/month
- **OS**: Ubuntu 20.04 LTS or newer

### Software Requirements

**Backend**:
- Node.js 18.x or higher
- npm 9.x or higher
- SQLite (included) or PostgreSQL (recommended for production)

**Frontend**:
- Modern web server (Nginx, Apache, or Caddy)
- Node.js for building

**Optional**:
- PM2 for process management
- Redis for caching (recommended)
- Nginx for reverse proxy

---

## Pre-Deployment Checklist

### Code Preparation

- [ ] All features tested locally
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Build process verified
- [ ] Dependencies updated
- [ ] Security vulnerabilities checked
- [ ] API endpoints tested
- [ ] File upload limits configured

### Infrastructure

- [ ] Hosting platform selected
- [ ] Domain name purchased
- [ ] SSL certificate planned
- [ ] Backup strategy defined
- [ ] Monitoring tools chosen
- [ ] Email service configured

### Documentation

- [ ] Deployment steps documented
- [ ] Environment variables listed
- [ ] Database schema documented
- [ ] API documentation ready
- [ ] User guide prepared

---

## Hosting Options

### 1. **Recommended: DigitalOcean (Best Overall)**

**Pros**:
- ✅ Excellent documentation
- ✅ Predictable pricing ($12-$48/month)
- ✅ Easy to scale
- ✅ Great performance
- ✅ 1-click apps available
- ✅ Good support

**Cons**:
- ❌ Requires technical knowledge
- ❌ No managed database in basic plan

**Best For**: Schools with IT staff or technical administrators

**Pricing**:
- **Basic**: $12/month (1GB RAM, 1 vCPU)
- **Standard**: $24/month (2GB RAM, 2 vCPUs)
- **Professional**: $48/month (4GB RAM, 2 vCPUs)

**Setup Time**: 30-60 minutes

---

### 2. **Easiest: Heroku (Beginner-Friendly)**

**Pros**:
- ✅ Very easy to deploy
- ✅ Free tier available
- ✅ Automatic deployments from Git
- ✅ Built-in SSL
- ✅ Add-ons marketplace
- ✅ No server management

**Cons**:
- ❌ More expensive at scale
- ❌ Free tier sleeps after 30 min inactivity
- ❌ Limited customization

**Best For**: Quick deployment, schools without IT staff

**Pricing**:
- **Free**: $0/month (limited, sleeps)
- **Hobby**: $7/month per dyno
- **Standard**: $25-50/month
- **Performance**: $250+/month

**Setup Time**: 15-30 minutes

---

### 3. **Budget-Friendly: Render.com**

**Pros**:
- ✅ Free tier (better than Heroku)
- ✅ Easy deployment
- ✅ Automatic SSL
- ✅ No sleep on free tier
- ✅ Good documentation

**Cons**:
- ❌ Slower cold starts on free tier
- ❌ Limited regions
- ❌ Newer platform

**Best For**: Testing, small schools, budget-conscious

**Pricing**:
- **Free**: $0/month (limited resources)
- **Starter**: $7/month
- **Standard**: $25/month
- **Pro**: $85/month

**Setup Time**: 20-40 minutes

---

### 4. **Enterprise: AWS (Amazon Web Services)**

**Pros**:
- ✅ Extremely scalable
- ✅ Comprehensive services
- ✅ Global infrastructure
- ✅ Enterprise-grade security
- ✅ Pay-as-you-go pricing

**Cons**:
- ❌ Complex setup
- ❌ Steep learning curve
- ❌ Unpredictable costs
- ❌ Requires expertise

**Best For**: Large schools, multi-school systems, enterprise deployments

**Pricing**: Variable, typically $50-500+/month depending on usage

**Setup Time**: 2-4 hours

---

### 5. **Developer-Friendly: Vercel + Railway**

**Pros**:
- ✅ Excellent for full-stack apps
- ✅ Fast deployments
- ✅ Great developer experience
- ✅ Automatic preview deployments

**Cons**:
- ❌ Can be expensive at scale
- ❌ Serverless limitations

**Best For**: Modern deployment workflow, continuous deployment

**Pricing**:
- **Vercel Free**: $0/month (frontend)
- **Railway**: $5-20/month (backend + database)

**Setup Time**: 30-45 minutes

---

### 6. **Traditional: VPS (Vultr, Linode, Hetzner)**

**Pros**:
- ✅ Full control
- ✅ Competitive pricing
- ✅ Predictable costs
- ✅ Good performance

**Cons**:
- ❌ Requires server administration
- ❌ Manual setup and maintenance
- ❌ Security is your responsibility

**Best For**: Schools with dedicated IT staff

**Pricing**: $5-50/month depending on specs

**Setup Time**: 1-3 hours

---

## Deployment Methods

### Method 1: DigitalOcean Deployment (Recommended)

#### Step 1: Create Droplet

1. **Sign up** at digitalocean.com
2. **Create Droplet**:
   - Choose Ubuntu 22.04 LTS
   - Select plan (minimum $12/month)
   - Choose datacenter region (closest to your location)
   - Add SSH key (recommended) or use password
   - Click "Create Droplet"

#### Step 2: Initial Server Setup

```bash
# SSH into your server
ssh root@your_server_ip

# Update system
apt update && apt upgrade -y

# Create a new user (replace 'schooladmin' with your username)
adduser schooladmin
usermod -aG sudo schooladmin

# Switch to new user
su - schooladmin
```

#### Step 3: Install Node.js

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

#### Step 4: Install PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Setup PM2 to start on boot
pm2 startup
# Run the command it outputs
```

#### Step 5: Clone and Setup Application

```bash
# Install Git
sudo apt install git -y

# Clone your repository
cd /var/www
sudo mkdir school-management
sudo chown schooladmin:schooladmin school-management
cd school-management

# Clone from your Git repository
git clone https://github.com/yourusername/school-management.git .

# Or upload files via SFTP/SCP
```

#### Step 6: Setup Backend

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install --production

# Setup environment variables
nano .env
```

Add the following to `.env`:
```env
NODE_ENV=production
PORT=5000
DATABASE_URL="file:./dev.db"
JWT_SECRET=your_super_secret_jwt_key_change_this
CLIENT_URL=https://yourdomain.com
```

```bash
# Run database migrations
npx prisma generate
npx prisma db push

# Start server with PM2
pm2 start npm --name "school-api" -- start
pm2 save
```

#### Step 7: Setup Frontend

```bash
# Navigate to client directory
cd ../client

# Install dependencies
npm install

# Create production build
npm run build

# The build will be in the 'dist' folder
```

#### Step 8: Install and Configure Nginx

```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/school-management
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend
    location / {
        root /var/www/school-management/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Uploads
    location /uploads {
        alias /var/www/school-management/server/uploads;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/school-management /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

#### Step 9: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts
# Certbot will automatically configure Nginx for HTTPS
```

#### Step 10: Setup Firewall

```bash
# Enable UFW firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Check status
sudo ufw status
```

---

### Method 2: Heroku Deployment (Easiest)

#### Step 1: Prepare Application

Create `Procfile` in root directory:
```
web: cd server && npm start
```

Create `package.json` in root directory:
```json
{
  "name": "school-management",
  "version": "1.0.0",
  "scripts": {
    "start": "cd server && npm start",
    "build": "cd client && npm install && npm run build",
    "heroku-postbuild": "npm run build"
  },
  "engines": {
    "node": "18.x",
    "npm": "9.x"
  }
}
```

#### Step 2: Deploy to Heroku

```bash
# Install Heroku CLI
# Download from: https://devcenter.heroku.com/articles/heroku-cli

# Login to Heroku
heroku login

# Create new app
heroku create your-school-name

# Add PostgreSQL database (recommended for production)
heroku addons:create heroku-postgresql:mini

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_secret_key
heroku config:set CLIENT_URL=https://your-school-name.herokuapp.com

# Deploy
git push heroku main

# Run migrations
heroku run npx prisma db push

# Open app
heroku open
```

---

### Method 3: Render.com Deployment

#### Step 1: Create render.yaml

Create `render.yaml` in root:
```yaml
services:
  - type: web
    name: school-management-api
    env: node
    buildCommand: cd server && npm install && npx prisma generate
    startCommand: cd server && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: school-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: CLIENT_URL
        value: https://your-school.onrender.com

  - type: web
    name: school-management-web
    env: static
    buildCommand: cd client && npm install && npm run build
    staticPublishPath: ./client/dist
    routes:
      - type: rewrite
        source: /api/*
        destination: https://school-management-api.onrender.com/api/*

databases:
  - name: school-db
    databaseName: school_management
    user: school_user
```

#### Step 2: Deploy

1. Push code to GitHub
2. Go to render.com
3. Click "New +" → "Blueprint"
4. Connect your GitHub repository
5. Render will automatically deploy based on `render.yaml`

---

## Domain & SSL Setup

### Purchasing a Domain

**Recommended Registrars**:
1. **Namecheap** - Affordable, good support
2. **Google Domains** - Simple, reliable
3. **Cloudflare** - Free WHOIS privacy, DNS included

**Cost**: $10-15/year for .com domains

### Pointing Domain to Server

#### For DigitalOcean/VPS:

1. Get your server IP address
2. Go to your domain registrar
3. Update DNS records:
   ```
   Type: A
   Name: @
   Value: your_server_ip
   TTL: 3600

   Type: A
   Name: www
   Value: your_server_ip
   TTL: 3600
   ```
4. Wait 1-24 hours for DNS propagation

#### For Heroku:

1. Add custom domain in Heroku dashboard
2. Get DNS target from Heroku
3. Add CNAME record in your DNS:
   ```
   Type: CNAME
   Name: www
   Value: your-app.herokuapp.com
   TTL: 3600
   ```

### SSL Certificate

**Option 1: Let's Encrypt (Free)**
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**Option 2: Cloudflare (Free)**
1. Add site to Cloudflare
2. Update nameservers at registrar
3. Enable "Full (strict)" SSL mode
4. Automatic HTTPS enabled

---

## Database Setup

### SQLite (Development/Small Schools)

**Pros**: Simple, no setup required
**Cons**: Limited concurrency, not ideal for production

Already configured in the application.

### PostgreSQL (Recommended for Production)

#### On DigitalOcean:

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Create database and user
sudo -u postgres psql

CREATE DATABASE school_management;
CREATE USER school_admin WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE school_management TO school_admin;
\q
```

Update `.env`:
```env
DATABASE_URL="postgresql://school_admin:your_password@localhost:5432/school_management"
```

Run migrations:
```bash
npx prisma db push
```

#### On Heroku:

```bash
# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Database URL is automatically set
```

---

## Environment Configuration

### Production Environment Variables

Create `.env` file in `server` directory:

```env
# Environment
NODE_ENV=production

# Server
PORT=5000

# Database
DATABASE_URL="file:./dev.db"
# Or for PostgreSQL:
# DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# JWT
JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long

# Client URL
CLIENT_URL=https://yourdomain.com

# Email (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Payment Gateways (Optional)
PAYSTACK_SECRET_KEY=sk_live_xxxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
FLUTTERWAVE_SECRET_KEY=FLWSECK-xxxxx
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-xxxxx

# SMS (Optional)
SMS_USERNAME=your_username
SMS_API_KEY=your_api_key
SMS_SENDER_ID=SchoolName
```

### Security Notes

- Never commit `.env` to Git
- Use strong, unique JWT_SECRET
- Rotate secrets regularly
- Use environment-specific values

---

## Post-Deployment Tasks

### 1. Create Super Admin

```bash
# SSH into server
cd /var/www/school-management/server

# Run super admin creation script
node create_superadmin.js
```

### 2. Initial Data Setup

1. Login as super admin
2. Create your school
3. Activate license
4. Setup academic sessions and terms
5. Create admin user for the school
6. Configure school settings

### 3. Test All Features

- [ ] User login/logout
- [ ] Student registration
- [ ] Result entry
- [ ] Fee payment
- [ ] File uploads
- [ ] Email sending
- [ ] Report generation
- [ ] CBT system

### 4. Setup Monitoring

#### Install monitoring tools:

```bash
# Install PM2 monitoring
pm2 install pm2-logrotate

# Setup log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

#### Setup uptime monitoring:
- Use UptimeRobot (free)
- Monitor your domain every 5 minutes
- Get alerts via email/SMS

---

## Monitoring & Maintenance

### Application Monitoring

**PM2 Monitoring**:
```bash
# View logs
pm2 logs

# Monitor processes
pm2 monit

# View process list
pm2 list

# Restart application
pm2 restart school-api
```

### Server Monitoring

**Check disk space**:
```bash
df -h
```

**Check memory**:
```bash
free -m
```

**Check CPU**:
```bash
top
```

### Database Maintenance

**Backup database**:
```bash
# For SQLite
cp server/prisma/dev.db backups/dev-$(date +%Y%m%d).db

# For PostgreSQL
pg_dump school_management > backup-$(date +%Y%m%d).sql
```

**Optimize database**:
```bash
# For PostgreSQL
psql school_management -c "VACUUM ANALYZE;"
```

### Log Management

**View Nginx logs**:
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

**View application logs**:
```bash
pm2 logs school-api --lines 100
```

---

## Scaling Strategies

### Vertical Scaling (Upgrade Server)

**When to scale**:
- CPU usage consistently > 70%
- Memory usage > 80%
- Slow response times

**How to scale on DigitalOcean**:
1. Power off droplet
2. Resize to larger plan
3. Power on
4. Verify application works

### Horizontal Scaling (Multiple Servers)

**For large deployments**:
1. Setup load balancer
2. Deploy multiple app servers
3. Use shared database
4. Implement session storage (Redis)

### Database Scaling

**Read Replicas**:
- Setup for read-heavy operations
- Reduces load on primary database

**Connection Pooling**:
```javascript
// In server configuration
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  pool_size = 10
}
```

---

## Backup & Recovery

### Automated Backups

**Daily Database Backup Script**:

Create `/home/schooladmin/backup.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/schooladmin/backups"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
cp /var/www/school-management/server/prisma/dev.db $BACKUP_DIR/db-$DATE.db

# Backup uploads
tar -czf $BACKUP_DIR/uploads-$DATE.tar.gz /var/www/school-management/server/uploads

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

**Setup cron job**:
```bash
chmod +x /home/schooladmin/backup.sh
crontab -e

# Add this line (runs daily at 2 AM):
0 2 * * * /home/schooladmin/backup.sh
```

### Off-site Backups

**Option 1: DigitalOcean Spaces**
- S3-compatible object storage
- $5/month for 250GB

**Option 2: Google Drive**
- Use rclone to sync backups
- Free up to 15GB

**Option 3: AWS S3**
- Pay-as-you-go pricing
- Highly reliable

### Recovery Procedures

**Restore Database**:
```bash
# Stop application
pm2 stop school-api

# Restore database
cp backups/db-20241231.db server/prisma/dev.db

# Restart application
pm2 start school-api
```

---

## Security Best Practices

### Server Security

1. **Keep System Updated**:
```bash
sudo apt update && sudo apt upgrade -y
```

2. **Setup Firewall**:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

3. **Disable Root Login**:
```bash
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart sshd
```

4. **Install Fail2Ban**:
```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
```

### Application Security

1. **Use HTTPS Only**
2. **Implement Rate Limiting**
3. **Validate All Inputs**
4. **Use Prepared Statements** (Prisma does this)
5. **Keep Dependencies Updated**:
```bash
npm audit
npm audit fix
```

6. **Set Security Headers** (in Nginx):
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
```

### Database Security

1. **Use Strong Passwords**
2. **Limit Database Access**
3. **Regular Backups**
4. **Encrypt Sensitive Data**

---

## Troubleshooting

### Common Issues

#### Application Won't Start

**Check logs**:
```bash
pm2 logs school-api
```

**Common causes**:
- Missing environment variables
- Database connection failed
- Port already in use

**Solutions**:
```bash
# Check if port is in use
sudo lsof -i :5000

# Kill process on port
sudo kill -9 PID

# Restart application
pm2 restart school-api
```

#### Database Connection Error

**Check database status**:
```bash
# For PostgreSQL
sudo systemctl status postgresql
```

**Verify connection string**:
```bash
# Test connection
psql -h localhost -U school_admin -d school_management
```

#### Nginx 502 Bad Gateway

**Causes**:
- Backend not running
- Wrong proxy_pass URL
- Firewall blocking

**Solutions**:
```bash
# Check backend status
pm2 status

# Test Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

#### SSL Certificate Issues

**Renew certificate**:
```bash
sudo certbot renew
```

**Force renewal**:
```bash
sudo certbot renew --force-renewal
```

#### Out of Disk Space

**Check disk usage**:
```bash
df -h
```

**Clean up**:
```bash
# Clean old logs
sudo journalctl --vacuum-time=7d

# Clean package cache
sudo apt clean

# Remove old backups
find /home/schooladmin/backups -mtime +30 -delete
```

---

## Cost Estimation

### Small School (< 500 students)

**Monthly Costs**:
- Server (DigitalOcean): $12
- Domain: $1 (annual $12)
- SSL: Free (Let's Encrypt)
- Backups: $5 (optional)
- **Total**: ~$18/month

### Medium School (500-2000 students)

**Monthly Costs**:
- Server (DigitalOcean): $24-48
- Domain: $1
- SSL: Free
- Backups: $10
- Monitoring: $5
- **Total**: ~$40-64/month

### Large School (2000+ students)

**Monthly Costs**:
- Server (DigitalOcean): $96+
- Domain: $1
- SSL: Free
- Backups: $20
- Monitoring: $10
- CDN: $10
- **Total**: ~$137+/month

---

## Conclusion

This guide provides comprehensive instructions for deploying the School Management System. Choose the hosting option that best fits your technical expertise and budget.

### Quick Start Recommendations

**For Beginners**: Start with Heroku or Render.com
**For IT Professionals**: Use DigitalOcean or AWS
**For Budget-Conscious**: Use Render.com free tier or cheap VPS

### Next Steps

1. Choose your hosting platform
2. Follow the deployment guide
3. Configure domain and SSL
4. Setup backups
5. Monitor your application
6. Train your users

### Getting Help

- Check troubleshooting section
- Review platform documentation
- Contact hosting support
- Consult with IT professionals

**Document Version**: 1.0  
**Last Updated**: December 2024  
**Prepared By**: School Management System Team

---

*For technical support, please contact your system administrator or hosting provider.*
