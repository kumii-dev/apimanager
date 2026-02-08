# Vercel Deployment Guide

## Prerequisites
- Vercel account
- GitHub repository
- Supabase project

## Quick Deploy

### 1. Connect Repository
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project
vercel link
```

### 2. Configure Environment Variables

In Vercel dashboard, add these environment variables:

#### Gateway Server Variables
```
NODE_ENV=production
PORT=3000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Crypto (32-byte base64 key)
KMS_MASTER_KEY=your-base64-encoded-32-byte-key

# Redis (optional - use Upstash)
REDIS_URL=redis://default:password@redis-xxxxx.upstash.io:6379

# CORS
ALLOWED_ORIGINS=https://your-domain.vercel.app,https://admin.your-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Security
DEV_BYPASS_AUTH=false
SSRF_BLOCKED_CIDRS=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,127.0.0.0/8
```

#### Admin Client Variables
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=https://your-domain.vercel.app/api
```

### 3. Deploy
```bash
# Deploy to production
vercel --prod

# Or use GitHub integration (automatic)
git push origin main
```

## Architecture on Vercel

### Monorepo Structure
```
vercel.json          # Vercel configuration
├── gateway-server/  # API (Serverless Functions)
│   └── api/
│       └── index.ts # Function handler
└── admin-client/    # Static site (Edge Network)
    └── dist/        # Built files
```

### Request Routing
1. **`/api/*`** → Gateway serverless function
2. **`/health`** → Gateway serverless function  
3. **`/readiness`** → Gateway serverless function
4. **`/*`** → Admin client static files

### Limitations on Vercel

#### 1. Serverless Function Timeouts
- **Free/Hobby**: 10 seconds max
- **Pro**: 60 seconds max
- **Enterprise**: 900 seconds max

**Impact**: Long-running proxy requests may timeout
**Solution**: Use streaming or job queues for long operations

#### 2. Cold Starts
- Functions sleep after inactivity
- First request has ~1-2s latency

**Solution**: 
- Use Vercel Pro for lower cold start times
- Implement cron job to keep functions warm
- Optimize bundle size

#### 3. Stateless Functions
- No persistent memory between requests
- Redis required for rate limiting

**Solution**: Use **Upstash Redis** (Vercel integration)

#### 4. File System
- Read-only file system
- No local file uploads

**Solution**: Use Supabase Storage for file uploads

#### 5. Max Request Size
- 4.5MB payload limit (Hobby)
- 4.5MB (Pro)

**Solution**: Use pre-signed URLs for large uploads

## Recommended Vercel Add-ons

### 1. Upstash Redis (Rate Limiting)
```bash
vercel integrations add upstash-redis
```
- Auto-configures `REDIS_URL`
- Pay-per-request pricing
- Global replication

### 2. Vercel Cron Jobs (Keep Warm)
Create `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/health",
    "schedule": "*/5 * * * *"
  }]
}
```

### 3. Vercel Analytics
```bash
npm install @vercel/analytics
```

Add to `admin-client/src/main.tsx`:
```typescript
import { Analytics } from '@vercel/analytics/react';

<Analytics />
```

## Performance Optimization

### 1. Edge Network
Admin client automatically deployed to edge network (fast global access)

### 2. Function Regions
Update `vercel.json`:
```json
{
  "functions": {
    "api/*.ts": {
      "memory": 1024,
      "maxDuration": 10,
      "regions": ["iad1", "sfo1", "fra1"]
    }
  }
}
```

### 3. Caching Headers
Already configured in `gateway-server/src/server.ts`:
```typescript
app.use(helmet({
  hsts: { maxAge: 31536000 }
}));
```

### 4. Bundle Size
- Tree-shaking enabled (Vite)
- Code splitting enabled
- Dependencies optimized

## Monitoring

### 1. Vercel Dashboard
- Function execution logs
- Performance metrics
- Error tracking

### 2. Supabase Dashboard
- Database queries
- RLS policy violations
- API usage

### 3. Upstash Console
- Redis operations
- Rate limit hits
- Cache performance

## CI/CD Pipeline

### Automatic Deployments
1. **Push to `main`** → Production deploy
2. **Push to `develop`** → Preview deploy
3. **Pull requests** → Preview deploy

### Preview URLs
Every PR gets a unique URL:
```
https://kumii-api-gateway-git-feature-username.vercel.app
```

### Environment Variables per Branch
```bash
# Production
vercel env add KMS_MASTER_KEY production

# Preview
vercel env add KMS_MASTER_KEY preview

# Development
vercel env add KMS_MASTER_KEY development
```

## Cost Estimation

### Vercel Hobby (Free)
- ✅ 100GB bandwidth
- ✅ 100 serverless function executions/day
- ✅ 10s function timeout
- ❌ No custom domains on API
- ❌ No team collaboration

### Vercel Pro ($20/month)
- ✅ 1TB bandwidth
- ✅ 1000 serverless function executions/day
- ✅ 60s function timeout
- ✅ Custom domains
- ✅ Team collaboration
- ✅ Lower cold starts

### Upstash Redis
- **Free tier**: 10,000 commands/day
- **Pay-as-you-go**: $0.20 per 100k commands

### Supabase
- **Free tier**: 500MB database, 1GB file storage
- **Pro ($25/month)**: 8GB database, 100GB storage

## Security on Vercel

### 1. Environment Variables
- Encrypted at rest
- Not exposed to client
- Per-environment isolation

### 2. Edge Functions
- Run in isolated V8 isolates
- No cross-tenant data leakage

### 3. DDoS Protection
- Automatic (Vercel Pro)
- Rate limiting recommended (our implementation)

### 4. SSL/TLS
- Automatic HTTPS
- TLS 1.2+ enforced

### 5. Secret Scanning
```bash
vercel env ls
# Verify no secrets exposed
```

## Troubleshooting

### Function Timeout
```
Error: FUNCTION_INVOCATION_TIMEOUT
```
**Solution**: 
- Optimize database queries
- Use indexes
- Implement caching
- Upgrade to Pro for 60s timeout

### Cold Start Issues
```
First request slow (2-3s)
```
**Solution**:
- Add cron job to keep warm
- Optimize bundle size
- Use edge functions where possible

### Rate Limit Not Working
```
Rate limiting bypassed
```
**Solution**:
- Verify `REDIS_URL` configured
- Check Upstash connection
- Fallback to memory store activates (check logs)

### CORS Errors
```
Access-Control-Allow-Origin missing
```
**Solution**:
- Add domain to `ALLOWED_ORIGINS`
- Check `vercel.json` rewrites
- Verify middleware order

## Migration from Other Platforms

### From AWS Lambda
- Similar serverless model
- Environment variables map 1:1
- Remove `serverless.yml`

### From Heroku
- Similar deployment flow
- Replace Heroku Redis with Upstash
- Remove `Procfile`

### From Railway
- Similar monorepo support
- Environment variables compatible
- Remove `railway.json`

## Best Practices

### 1. Use Monorepo
✅ Both services in one repo
✅ Shared types/utilities
✅ Single deployment

### 2. Optimize Bundle
```bash
# Analyze bundle
npm run build -- --analyze
```

### 3. Use Edge Config (Optional)
For feature flags without database:
```bash
vercel edge-config add
```

### 4. Implement Health Checks
Already configured:
- `/health` - Basic health
- `/readiness` - DB connection check

### 5. Monitor Function Execution
```bash
vercel logs --follow
```

## Production Checklist

- [ ] Environment variables configured
- [ ] Custom domain added
- [ ] Upstash Redis connected
- [ ] Supabase RLS policies active
- [ ] Rate limiting tested
- [ ] CORS configured
- [ ] Health checks working
- [ ] Logs streaming
- [ ] Analytics enabled
- [ ] Cron job for warmup (optional)
- [ ] Error tracking (Sentry optional)
- [ ] Performance monitoring

## Support

- **Vercel Discord**: https://vercel.com/discord
- **Vercel Docs**: https://vercel.com/docs
- **Upstash Docs**: https://docs.upstash.com
- **Supabase Docs**: https://supabase.com/docs

---

**Your KUMII API Gateway is now production-ready on Vercel!** 🚀
