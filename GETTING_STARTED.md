# Getting Started with KUMII API Gateway

Welcome! This guide will help you set up and run the KUMII API Management System locally in under 15 minutes.

**For Vercel deployment**, see [docs/VERCEL_DEPLOYMENT.md](docs/VERCEL_DEPLOYMENT.md)

## Prerequisites

Before you begin, ensure you have:

- ✅ Node.js 18 or later ([download](https://nodejs.org/))
- ✅ Git
- ✅ A Supabase account ([sign up free](https://supabase.com))
- ✅ A code editor (VS Code recommended)

Optional:
- Redis (can use memory fallback)
- Docker (for containerized deployment)
- Vercel account (for cloud deployment)

---

## 🚀 Quick Start (5 minutes)

### Option A: Local Development

Follow steps 1-5 below for local development.

### Option B: Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login and deploy
vercel login
vercel --prod
```

See [docs/VERCEL_DEPLOYMENT.md](docs/VERCEL_DEPLOYMENT.md) for details.

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/kumii-dev/apimanager.git
cd apimanager
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to initialize (~2 minutes)
3. Go to **SQL Editor** and create a new query
4. Copy the contents of `supabase/migrations/001_initial_schema.sql`
5. Paste and run the SQL migration
6. Go to **Settings** → **API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key

### 3. Configure Gateway Server

```bash
cd gateway-server

# Copy environment template
cp .env.example .env

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Edit .env file with your values:
# - SUPABASE_URL (from step 2)
# - SUPABASE_ANON_KEY (from step 2)
# - SUPABASE_SERVICE_ROLE_KEY (from step 2)
# - KMS_MASTER_KEY (generated above)
```

Your `.env` should look like:

```env
NODE_ENV=development
PORT=3000

SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

KMS_MASTER_KEY=abcdefghijklmnopqrstuvwxyz123456789==

# Optional: Leave Redis commented out to use memory
# REDIS_URL=redis://localhost:6379

CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
DEV_MODE=false
DEV_BYPASS_AUTH=false
```

### 4. Install & Run Gateway Server

```bash
# Still in gateway-server directory
npm install

# Start development server
npm run dev
```

You should see:

```
╔══════════════════════════════════════════════════════════════╗
║   🛡️  KUMII API Gateway - Security-First Architecture       ║
║   Status: Running                                            ║
║   Port: 3000                                                 ║
╚══════════════════════════════════════════════════════════════╝
```

### 5. Configure Admin Client

Open a new terminal:

```bash
cd admin-client

# Copy environment template
cp .env.example .env

# Edit .env with your Supabase URL and anon key
```

Your `.env` should look like:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 6. Install & Run Admin Client

```bash
# Still in admin-client directory
npm install

# Start development server
npm run dev
```

Visit: **http://localhost:5173**

---

## 👤 Create Your First User

### Option A: Via Supabase Dashboard

1. Go to your Supabase project → **Authentication** → **Users**
2. Click **Add User** → **Create new user**
3. Enter email and password
4. Click **Create user**

### Option B: Via Admin UI Signup

1. Go to http://localhost:5173
2. Click "Sign Up"
3. Enter email and password
4. Check your email for confirmation link
5. Click confirmation link

### Make User an Admin

```sql
-- In Supabase SQL Editor
UPDATE profiles 
SET role = 'platform_admin'
WHERE email = 'your-email@example.com';
```

Now you can log in as an admin!

---

## 🎯 Your First API Route

### Step 1: Log In

1. Go to http://localhost:5173/login
2. Enter your credentials
3. You should be redirected to the dashboard

### Step 2: Create a Connector

1. Click **Connectors** in the navigation
2. Click **Create Connector**
3. Fill in the form:

```
Name: JSONPlaceholder API
Type: REST
Base URL: https://jsonplaceholder.typicode.com
Auth Type: none
Timeout: 30000
```

4. Click **Create**

### Step 3: Create a Route

1. Click **Routes** in the navigation
2. Click **Create Route**
3. Fill in the form:

```
Name: Get All Posts
Module Prefix: /api/v1/cms
Path Pattern: /posts
HTTP Method: GET
Upstream Path: /posts
Auth Required: No (unchecked)
```

4. Under **Cache Configuration**:
```
Enabled: Yes
TTL: 60 seconds
```

5. Click **Create**

### Step 4: Test Your Route

Open a new terminal and run:

```bash
curl http://localhost:3000/api/v1/cms/posts
```

You should get JSON data from JSONPlaceholder!

**Congratulations!** 🎉 You just proxied your first API request!

---

## 🧪 Testing

### Run All Tests

```bash
cd gateway-server
npm test
```

### Run Security Tests

```bash
npm run test:security
```

### Check Code Coverage

```bash
npm run test:coverage
```

---

## 🔍 Exploring Features

### View Audit Logs

1. Go to http://localhost:5173/audit-logs
2. You'll see all actions logged with:
   - Timestamp
   - User
   - Action type
   - Resource affected
   - IP address

### Monitor Metrics

```bash
curl http://localhost:3000/admin/metrics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test SSRF Protection

Try creating a connector with a private IP:

```bash
curl -X POST http://localhost:3000/admin/connectors \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bad Connector",
    "type": "rest",
    "base_url": "http://localhost/admin"
  }'
```

You should get an SSRF protection error! ✅

### Test Rate Limiting

Send 101 requests quickly:

```bash
for i in {1..101}; do
  curl http://localhost:3000/health
done
```

Request #101 should return `429 Too Many Requests`.

---

## 📚 Next Steps

### Learn More

- 📖 [API Documentation](docs/API.md) - Complete API reference
- 🛡️ [Security Documentation](docs/SECURITY.md) - ISO 27001 controls
- 🚀 [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment

### Advanced Features

1. **Request Transformation**
   - Transform request/response data
   - See: Transform DSL in API docs

2. **Circuit Breakers**
   - Automatic failure handling
   - Configurable thresholds

3. **Secret Rotation**
   - Rotate API keys without downtime
   - Version tracking

4. **Multi-Tenancy**
   - Create multiple tenants
   - Isolated data and routes

---

## 🆘 Troubleshooting

### Gateway won't start

**Error**: `Configuration validation failed`

```bash
# Check your .env file
cat gateway-server/.env

# Ensure all required vars are set
# Verify KMS_MASTER_KEY is base64 encoded 32 bytes
```

**Error**: `Cannot find module`

```bash
# Reinstall dependencies
cd gateway-server
rm -rf node_modules package-lock.json
npm install
```

### Database connection fails

**Error**: `Failed to connect to Supabase`

1. Verify Supabase project is running
2. Check URL and keys in `.env`
3. Ensure SQL migration ran successfully
4. Test connection:

```bash
curl https://YOUR_PROJECT.supabase.co/rest/v1/tenants \
  -H "apikey: YOUR_ANON_KEY"
```

### Auth not working

**Error**: `Invalid or expired token`

1. Clear browser local storage
2. Re-login
3. Verify Supabase Auth is enabled:
   - Go to **Authentication** → **Providers**
   - Ensure **Email** provider is enabled

### Admin client won't connect

**Error**: `Network Error`

1. Verify gateway server is running on port 3000
2. Check CORS configuration in gateway `.env`
3. Ensure `CORS_ALLOWED_ORIGINS` includes `http://localhost:5173`

### Getting 403 Forbidden

1. Check your user's role:

```sql
SELECT email, role FROM profiles WHERE email = 'your-email@example.com';
```

2. If role is 'user', upgrade to admin:

```sql
UPDATE profiles SET role = 'platform_admin' WHERE email = 'your-email@example.com';
```

---

## 💡 Tips & Best Practices

### Development

- ✅ Use `DEV_MODE=false` for realistic testing
- ✅ Never commit `.env` files
- ✅ Run `npm audit` regularly
- ✅ Use `npm run lint` before committing

### Security

- ✅ Generate new `KMS_MASTER_KEY` for each environment
- ✅ Rotate service role key periodically
- ✅ Review audit logs daily
- ✅ Test SSRF protection with your connectors

### Performance

- ✅ Enable caching for read-heavy routes
- ✅ Use Redis in production
- ✅ Set appropriate timeouts
- ✅ Monitor circuit breaker states

---

## 🎓 Understanding the Architecture

```
User Request
    │
    ↓
Admin UI (React)
    │
    ↓ JWT Auth
    │
Gateway Server (Express)
    │
    ├─→ Auth Middleware (Verify JWT)
    ├─→ Rate Limiter (Protect against DoS)
    ├─→ RBAC Check (Authorize)
    ├─→ Route Matcher (Find config)
    ├─→ SSRF Guard (Validate URL)
    ├─→ Circuit Breaker (Check health)
    ├─→ Proxy Request (Forward to upstream)
    ├─→ Transform (Optional DSL)
    ├─→ Cache (Optional)
    └─→ Audit Log (Record event)
    │
    ↓
Upstream API
    │
    ↓
Response → Transform → Cache → User
```

---

## 📞 Getting Help

- 📧 **Email**: support@kumii.com
- 💬 **Discord**: [Join our community](https://discord.gg/kumii)
- 🐛 **Issues**: [GitHub Issues](https://github.com/kumii-dev/apimanager/issues)
- 📖 **Docs**: [Full Documentation](https://docs.kumii.com)

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📄 License

Proprietary - KUMII Platform

---

**Happy coding! 🚀**

Need help? Don't hesitate to reach out!
