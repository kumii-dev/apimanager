# Deployment Guide

## KUMII API Gateway - Production Deployment

### Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ (or Supabase account)
- Redis instance (optional)
- Domain with TLS certificate
- Environment with at least 2GB RAM

---

## Production Architecture

```
┌─────────────────┐
│   Load Balancer │  (AWS ALB / Nginx)
│   TLS Termination│
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│   Gateway Server (x2+)  │  Auto-scaling
│   Node.js + Express     │  Health checks
└────────┬────────────────┘
         │
         ├──────────┬──────────┐
         ▼          ▼          ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Supabase │  │  Redis   │  │  Logs    │
│ Postgres │  │  Cache   │  │  (S3)    │
└──────────┘  └──────────┘  └──────────┘
```

---

## Step 1: Database Setup

### Option A: Supabase (Recommended)

1. Create a project at [supabase.com](https://supabase.com)
2. Note your project URL and API keys
3. Run migration in SQL Editor:

```bash
# Copy migration content
cat supabase/migrations/001_initial_schema.sql

# Paste into Supabase SQL Editor and execute
```

4. Verify RLS is enabled:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

All tables should show `rowsecurity = true`.

### Option B: Self-Hosted PostgreSQL

1. Install PostgreSQL 14+:

```bash
# Ubuntu/Debian
sudo apt-get install postgresql-14

# macOS
brew install postgresql@14
```

2. Create database:

```sql
CREATE DATABASE kumii_api_gateway;
CREATE USER kumii_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE kumii_api_gateway TO kumii_user;
```

3. Run migration:

```bash
psql -U kumii_user -d kumii_api_gateway -f supabase/migrations/001_initial_schema.sql
```

---

## Step 2: Generate Master Encryption Key

```bash
# Generate 32-byte key (base64 encoded)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Store securely (e.g., AWS Secrets Manager, HashiCorp Vault)
```

**CRITICAL**: Never commit this key to version control!

---

## Step 3: Environment Configuration

### Gateway Server

Create `.env` file:

```bash
cd gateway-server
cp .env.example .env
```

Edit `.env`:

```env
NODE_ENV=production
PORT=3000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Cryptography (CRITICAL)
KMS_MASTER_KEY=your_base64_key_here

# Redis (Production recommended)
REDIS_URL=redis://your-redis-host:6379
REDIS_PASSWORD=your_redis_password
REDIS_TLS=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_ADMIN_MAX_REQUESTS=1000

# CORS (Update with your domains)
CORS_ALLOWED_ORIGINS=https://admin.kumii.com,https://app.kumii.com
CORS_CREDENTIALS=true

# Logging
LOG_LEVEL=info
LOG_PRETTY=false

# SSRF Protection
SSRF_BLOCKED_CIDRS=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,127.0.0.0/8,169.254.0.0/16
SSRF_BLOCKED_HOSTNAMES=localhost,metadata.google.internal

# Production Settings
DEV_MODE=false
DEV_BYPASS_AUTH=false
```

### Admin Client

Create `.env`:

```bash
cd admin-client
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_BASE_URL=https://api.kumii.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

---

## Step 4: Install Dependencies

```bash
# Gateway Server
cd gateway-server
npm ci --production

# Admin Client
cd ../admin-client
npm ci
```

---

## Step 5: Build Applications

```bash
# Gateway Server
cd gateway-server
npm run build

# Verify build
ls -la dist/

# Admin Client
cd ../admin-client
npm run build

# Verify build
ls -la dist/
```

---

## Step 6: Deploy Gateway Server

### Option A: Docker

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY dist ./dist

EXPOSE 3000

USER node

CMD ["node", "dist/server.js"]
```

Build and run:

```bash
docker build -t kumii-gateway .
docker run -p 3000:3000 --env-file .env kumii-gateway
```

### Option B: PM2 (Process Manager)

```bash
npm install -g pm2

# Start with PM2
pm2 start dist/server.js --name kumii-gateway -i 2

# Save process list
pm2 save

# Setup startup script
pm2 startup
```

### Option C: Systemd Service

Create `/etc/systemd/system/kumii-gateway.service`:

```ini
[Unit]
Description=KUMII API Gateway
After=network.target

[Service]
Type=simple
User=kumii
WorkingDirectory=/opt/kumii/gateway-server
EnvironmentFile=/opt/kumii/gateway-server/.env
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable kumii-gateway
sudo systemctl start kumii-gateway
sudo systemctl status kumii-gateway
```

---

## Step 7: Deploy Admin Client

### Option A: Static Hosting (S3 + CloudFront)

```bash
# Build
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket/admin-client/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

### Option B: Nginx

```nginx
server {
    listen 80;
    server_name admin.kumii.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.kumii.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    root /var/www/admin-client/dist;
    index index.html;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass https://api.kumii.com;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Step 8: Configure Load Balancer

### AWS Application Load Balancer

1. Create target group for gateway servers
2. Configure health check: `/health`
3. Enable stickiness (for sessions)
4. Setup TLS certificate (ACM)
5. Configure security group (allow 443)

### Nginx Load Balancer

```nginx
upstream gateway_backend {
    least_conn;
    server gateway1.internal:3000 max_fails=3 fail_timeout=30s;
    server gateway2.internal:3000 max_fails=3 fail_timeout=30s;
}

server {
    listen 443 ssl http2;
    server_name api.kumii.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://gateway_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://gateway_backend/health;
        access_log off;
    }
}
```

---

## Step 9: Monitoring & Logging

### Prometheus Metrics

Expose metrics:

```bash
curl https://api.kumii.com/admin/metrics
```

Configure Prometheus scraper:

```yaml
scrape_configs:
  - job_name: 'kumii-gateway'
    static_configs:
      - targets: ['api.kumii.com:3000']
    metrics_path: '/admin/metrics'
```

### Log Aggregation

Ship logs to centralized system:

```bash
# CloudWatch
pm2 install pm2-cloudwatch

# Datadog
pm2 install pm2-datadog

# ELK Stack
# Configure filebeat to ship logs
```

### Alerting

Setup alerts for:
- High error rate (> 5%)
- Rate limit hits (> 10/min)
- Circuit breaker open
- SSRF attempts
- Failed auth attempts (> 5/min)

---

## Step 10: Create Admin User

```sql
-- Connect to database
psql -U kumii_user -d kumii_api_gateway

-- Create platform admin (after Supabase Auth signup)
UPDATE profiles 
SET role = 'platform_admin'
WHERE email = 'admin@kumii.com';
```

---

## Post-Deployment Checklist

### Security

- [ ] TLS certificate valid and auto-renewing
- [ ] Firewall rules configured (only 443 open)
- [ ] Secrets stored securely (not in environment)
- [ ] CORS origins updated (no localhost)
- [ ] Rate limits appropriate for traffic
- [ ] Security headers verified
- [ ] SSRF protection tested

### Monitoring

- [ ] Health checks passing
- [ ] Metrics endpoint accessible
- [ ] Logs flowing to aggregation system
- [ ] Alerts configured and tested
- [ ] Uptime monitoring setup (Pingdom, UptimeRobot)

### Backups

- [ ] Database backups automated (daily)
- [ ] Backup restoration tested
- [ ] Backup retention policy defined (90 days)
- [ ] Off-site backup storage

### Documentation

- [ ] Runbooks created
- [ ] On-call rotation defined
- [ ] Incident response plan documented
- [ ] Contact list updated

---

## Scaling Recommendations

### Horizontal Scaling

Gateway servers are stateless (with Redis):
- Add more instances behind load balancer
- Auto-scaling based on CPU/memory
- Recommended: 2-10 instances

### Database Scaling

- Supabase: Automatic scaling
- Self-hosted: Read replicas for read-heavy workloads

### Redis Scaling

- Redis Cluster for > 10 gateway instances
- Sentinel for high availability

---

## Maintenance

### Daily

- Check error logs
- Review security events
- Verify backup completion

### Weekly

- Review metrics and performance
- Update dependencies (`npm audit`)
- Check for security advisories

### Monthly

- Rotate master encryption key
- Review access permissions
- Conduct security audit
- Test disaster recovery

### Quarterly

- Penetration testing
- Capacity planning
- Update documentation

---

## Rollback Procedure

If deployment fails:

```bash
# PM2
pm2 rollback kumii-gateway

# Docker
docker stop kumii-gateway
docker run --env-file .env previous-version

# Systemd
sudo systemctl stop kumii-gateway
# Replace binary with previous version
sudo systemctl start kumii-gateway
```

---

## Troubleshooting

### Service won't start

```bash
# Check logs
pm2 logs kumii-gateway
journalctl -u kumii-gateway -f

# Validate config
node -e "require('./dist/config').validateConfig()"

# Check database connection
psql $SUPABASE_URL
```

### High memory usage

```bash
# Check memory
pm2 monit

# Restart if needed
pm2 restart kumii-gateway
```

### Circuit breakers stuck open

```bash
# Reset via API
curl -X POST https://api.kumii.com/admin/circuit-breaker/reset \
  -H "Authorization: Bearer $TOKEN"
```

---

## Support

**Email**: support@kumii.com
**Docs**: https://docs.kumii.com
**Status**: https://status.kumii.com

---

**Last Updated**: 2024-01-15
