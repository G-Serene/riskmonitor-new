# Production Deployment Guide

## Overview

This guide covers deploying the Risk Dashboard system to production environments with proper scalability, security, and monitoring.

## Architecture Options

### Option 1: Single Server Deployment (Recommended for MVP)
```
┌─────────────────────────────────────────────────────────────┐
│                     Single Server                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Nginx     │  │   FastAPI   │  │    Background       │ │
│  │   Proxy     │  │   Server    │  │    Worker           │ │
│  │             │  │             │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              PostgreSQL Database                       │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Option 2: Multi-Service Deployment (Production Scale)
```
┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐
│   Load      │    │   API       │    │   Background        │
│   Balancer  │───▶│   Servers   │    │   Workers           │
│   (Nginx)   │    │   (2+ nodes)│    │   (2+ nodes)        │
└─────────────┘    └─────────────┘    └─────────────────────┘
                            │                     │
                            ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Managed PostgreSQL Database                   │
│              (AWS RDS / Google Cloud SQL)                  │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Server Requirements
- **OS:** Ubuntu 20.04+ / CentOS 8+ / Amazon Linux 2
- **CPU:** 2+ cores (4+ recommended)
- **RAM:** 4GB minimum (8GB+ recommended) 
- **Storage:** 20GB+ SSD
- **Network:** Public IP with ports 80, 443 open

### Required Services
- **Python 3.12+**
- **PostgreSQL 14+** (or managed database)
- **Nginx** (reverse proxy)
- **Systemd** (process management)
- **SSL Certificate** (Let's Encrypt recommended)

## Database Migration (SQLite → PostgreSQL)

### 1. Install PostgreSQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start and enable
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create Database and User
```bash
sudo -u postgres psql

CREATE DATABASE risk_dashboard;
CREATE USER dashboard_user WITH ENCRYPTED PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE risk_dashboard TO dashboard_user;
\q
```

### 3. Update Database Schema
```sql
-- Connect to PostgreSQL
psql -h localhost -U dashboard_user -d risk_dashboard

-- Create tables (same schema as SQLite)
-- Copy schema from existing SQLite database
.dump | psql -h localhost -U dashboard_user -d risk_dashboard
```

### 4. Update Environment Configuration
```env
# .env
DATABASE_URL=postgresql://dashboard_user:secure_password_here@localhost:5432/risk_dashboard
RISK_DB=postgresql://dashboard_user:secure_password_here@localhost:5432/risk_dashboard
```

## Application Deployment

### 1. Server Setup
```bash
# Create application user
sudo useradd -m -s /bin/bash dashboard
sudo usermod -aG sudo dashboard

# Switch to application user
sudo su - dashboard

# Create application directory
mkdir -p /home/dashboard/app
cd /home/dashboard/app
```

### 2. Application Installation
```bash
# Clone repository
git clone <your-repo> .

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r api_requirements.txt
pip install gunicorn  # Production WSGI server
pip install psycopg2-binary  # PostgreSQL adapter
```

### 3. Environment Configuration
```bash
# Create production environment file
cat > .env << EOF
DATABASE_URL=postgresql://dashboard_user:secure_password_here@localhost:5432/risk_dashboard
OPENAI_API_KEY=your_production_openai_key
DEBUG=false
LOG_LEVEL=INFO
API_HOST=127.0.0.1
API_PORT=8000
CORS_ORIGINS=https://yourdomain.com
EOF

# Secure the environment file
chmod 600 .env
```

### 4. Database Initialization
```bash
# Initialize production database
python news_risk_analyzer.py --setup

# Add initial test data (optional)
python dev_utils.py add-test --count 10
```

## Process Management with Systemd

### 1. API Server Service
```bash
sudo tee /etc/systemd/system/risk-dashboard-api.service << EOF
[Unit]
Description=Risk Dashboard API Server
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=dashboard
Group=dashboard
WorkingDirectory=/home/dashboard/app
Environment=PATH=/home/dashboard/app/venv/bin
ExecStart=/home/dashboard/app/venv/bin/gunicorn risk_dashboard_api:app -w 4 -k uvicorn.workers.UvicornWorker -b 127.0.0.1:8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
```

### 2. Background Worker Service
```bash
sudo tee /etc/systemd/system/risk-dashboard-worker.service << EOF
[Unit]
Description=Risk Dashboard Background Worker
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=dashboard
Group=dashboard
WorkingDirectory=/home/dashboard/app
Environment=PATH=/home/dashboard/app/venv/bin
ExecStart=/home/dashboard/app/venv/bin/python news_risk_analyzer.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

### 3. Enable and Start Services
```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable services
sudo systemctl enable risk-dashboard-api
sudo systemctl enable risk-dashboard-worker

# Start services
sudo systemctl start risk-dashboard-api
sudo systemctl start risk-dashboard-worker

# Check status
sudo systemctl status risk-dashboard-api
sudo systemctl status risk-dashboard-worker
```

## Nginx Configuration

### 1. Install Nginx
```bash
sudo apt install nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 2. Create Site Configuration
```bash
sudo tee /etc/nginx/sites-available/risk-dashboard << EOF
upstream dashboard_api {
    server 127.0.0.1:8000;
    keepalive 32;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    
    # API Backend
    location /api/ {
        proxy_pass http://dashboard_api;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # SSE-specific configuration
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
        proxy_read_timeout 24h;
    }
    
    # Frontend (if serving from same server)
    location / {
        root /var/www/risk-dashboard;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
    
    # Static files
    location /static/ {
        alias /home/dashboard/app/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check
    location /health {
        proxy_pass http://dashboard_api/api/health;
        access_log off;
    }
}
EOF
```

### 3. Enable Site
```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/risk-dashboard /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## SSL Certificate (Let's Encrypt)

### 1. Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx
```

### 2. Obtain Certificate
```bash
# Stop nginx temporarily
sudo systemctl stop nginx

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Start nginx
sudo systemctl start nginx
```

### 3. Auto-renewal
```bash
# Add renewal cron job
sudo crontab -e

# Add this line
0 12 * * * /usr/bin/certbot renew --quiet
```

## Frontend Deployment (Next.js)

### Option 1: Static Export (Recommended)
```bash
# In your Next.js project
npm run build
npm run export

# Copy to web server
sudo cp -r out/* /var/www/risk-dashboard/
```

### Option 2: Node.js Server
```bash
# On server
npm install
npm run build

# Create systemd service
sudo tee /etc/systemd/system/risk-dashboard-frontend.service << EOF
[Unit]
Description=Risk Dashboard Frontend
After=network.target

[Service]
Type=simple
User=dashboard
WorkingDirectory=/home/dashboard/frontend
ExecStart=/usr/bin/npm start
Restart=always
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF
```

## Monitoring and Logging

### 1. Log Configuration
```bash
# Create log directories
sudo mkdir -p /var/log/risk-dashboard
sudo chown dashboard:dashboard /var/log/risk-dashboard

# Configure log rotation
sudo tee /etc/logrotate.d/risk-dashboard << EOF
/var/log/risk-dashboard/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 dashboard dashboard
}
EOF
```

### 2. Application Logging
```python
# Update logging configuration in your app
import logging
from logging.handlers import RotatingFileHandler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s: %(message)s',
    handlers=[
        RotatingFileHandler('/var/log/risk-dashboard/app.log', maxBytes=10000000, backupCount=10),
        logging.StreamHandler()
    ]
)
```

### 3. Health Monitoring
```bash
# Create monitoring script
cat > /home/dashboard/monitor.sh << EOF
#!/bin/bash

# Check API health
if ! curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "API health check failed" | mail -s "Dashboard Alert" admin@yourdomain.com
fi

# Check worker process
if ! pgrep -f "news_risk_analyzer.py" > /dev/null; then
    echo "Worker process not running" | mail -s "Dashboard Alert" admin@yourdomain.com
fi
EOF

chmod +x /home/dashboard/monitor.sh

# Add to cron
crontab -e
# Add: */5 * * * * /home/dashboard/monitor.sh
```

## Security Hardening

### 1. Firewall Configuration
```bash
# Install UFW
sudo apt install ufw

# Basic rules
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

# Enable firewall
sudo ufw enable
```

### 2. Database Security
```bash
# Secure PostgreSQL
sudo -u postgres psql

# Disable remote connections if not needed
# Edit /etc/postgresql/*/main/postgresql.conf
listen_addresses = 'localhost'

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 3. Application Security
```python
# Update CORS settings in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Specific domains only
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

## Backup Strategy

### 1. Database Backup
```bash
# Create backup script
cat > /home/dashboard/backup.sh << EOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/dashboard/backups"
mkdir -p \$BACKUP_DIR

# PostgreSQL backup
pg_dump -h localhost -U dashboard_user -d risk_dashboard > \$BACKUP_DIR/db_backup_\$DATE.sql

# Keep only last 30 days
find \$BACKUP_DIR -name "db_backup_*.sql" -mtime +30 -delete
EOF

chmod +x /home/dashboard/backup.sh

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /home/dashboard/backup.sh
```

### 2. Application Backup
```bash
# Backup application code and configuration
tar -czf /home/dashboard/backups/app_backup_$(date +%Y%m%d).tar.gz \
    /home/dashboard/app \
    /etc/systemd/system/risk-dashboard-*.service \
    /etc/nginx/sites-available/risk-dashboard
```

## Performance Tuning

### 1. Database Optimization
```sql
-- PostgreSQL tuning
-- Edit /etc/postgresql/*/main/postgresql.conf

shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
```

### 2. Application Optimization
```python
# Use connection pooling
from sqlalchemy.pool import QueuePool

# Increase worker processes
# gunicorn -w 4 --worker-class uvicorn.workers.UvicornWorker
```

### 3. Nginx Optimization
```nginx
# Add to nginx.conf
worker_processes auto;
worker_connections 1024;

# Gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript;
```

## Deployment Checklist

### Pre-deployment
- [ ] Server provisioned with required specs
- [ ] Domain name configured and DNS propagated
- [ ] SSL certificate obtained
- [ ] Database created and secured
- [ ] Environment variables configured
- [ ] Application tested locally

### Deployment
- [ ] Application code deployed
- [ ] Database schema migrated
- [ ] Services configured and started
- [ ] Nginx configured and SSL enabled
- [ ] Health checks passing
- [ ] Monitoring configured

### Post-deployment
- [ ] Load testing completed
- [ ] Backup strategy verified
- [ ] Monitoring alerts configured
- [ ] Documentation updated
- [ ] Team access configured

## Troubleshooting

### Common Issues

#### 1. Service Won't Start
```bash
# Check logs
sudo journalctl -u risk-dashboard-api -f
sudo journalctl -u risk-dashboard-worker -f

# Check configuration
sudo systemctl status risk-dashboard-api
```

#### 2. Database Connection Issues
```bash
# Test connection
psql -h localhost -U dashboard_user -d risk_dashboard

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

#### 3. SSL Issues
```bash
# Test certificate
openssl s_client -connect yourdomain.com:443

# Renew certificate
sudo certbot renew --dry-run
```

#### 4. High Memory Usage
```bash
# Monitor processes
htop
sudo iotop

# Check application logs for memory leaks
```

## Scaling Considerations

### Horizontal Scaling
- Load balancer with multiple API servers
- Separate worker nodes
- Database read replicas
- CDN for static assets

### Vertical Scaling
- Increase server resources
- Optimize database queries
- Implement caching (Redis)
- Use async processing

This deployment guide provides a production-ready setup with proper security, monitoring, and scalability considerations.
