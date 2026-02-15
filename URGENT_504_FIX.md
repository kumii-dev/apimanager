# 504 Gateway Timeout - URGENT FIX NEEDED

## Current Error

```
GET https://apimanager-two.vercel.app/api/admin/connectors 504 (Gateway Timeout)
```

## Root Cause

The Vercel serverless function is **timing out after 30 seconds** because:

1. ❌ **Backend environment variables are NOT configured**
2. ❌ Config validation is failing or hanging when trying to load
3. ❌ The Express app can't initialize without proper credentials

## CRITICAL: Add Backend Environment Variables NOW

The serverless function (API) needs these variables to work. Go to:
**Vercel Dashboard** → **apimanager-two** → **Settings** → **Environment Variables**

### Required Variables (Backend)

**1. NODE_ENV**
```
NODE_ENV=production
```
Purpose: Sets production mode

---

**2. SUPABASE_URL**
```
SUPABASE_URL=https://njcancswtqnxihxavshl.supabase.co
```
Purpose: Database connection endpoint

---

**3. SUPABASE_SERVICE_ROLE_KEY** 
```
SUPABASE_SERVICE_ROLE_KEY=<GET_FROM_SUPABASE_DASHBOARD>
```
⚠️ **WHERE TO FIND THIS:**
1. Go to: https://supabase.com/dashboard/project/njcancswtqnxihxavshl/settings/api
2. Look for "Project API keys" section
3. Copy the **`service_role` key** (NOT the anon key)
4. It should start with `eyJhbGciOi...`

Purpose: Database admin access for the API

---

**4. SUPABASE_ANON_KEY**
```
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qY2FuY3N3dHFueGloeGF2c2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNzg4MTUsImV4cCI6MjA4NTk1NDgxNX0.D7aA-FXLKQXz-8uSlGGextYNBgxSd5jgYqoMDoly7s0
```
Purpose: Backend config validation (required by config schema)

---

**5. KMS_MASTER_KEY** 
```
KMS_MASTER_KEY=<GENERATE_NEW_KEY>
```
⚠️ **HOW TO GENERATE:**

Run this command in your terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output (should be 44 characters, ending with `=` or `==`)

Example output: `xK8vN2mQ5pR7tW9yB3fH6jL4nP8sV1aZ0cE5gM7iO2k=`

Purpose: Encrypts API keys and secrets in the database

---

### Frontend Variables (Already Documented)

**6. VITE_SUPABASE_URL**
```
VITE_SUPABASE_URL=https://njcancswtqnxihxavshl.supabase.co
```

**7. VITE_SUPABASE_ANON_KEY**
```
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qY2FuY3N3dHFueGloeGF2c2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNzg4MTUsImV4cCI6MjA4NTk1NDgxNX0.D7aA-FXLKQXz-8uSlGGextYNBgxSd5jgYqoMDoly7s0
```

---

## Quick Setup Steps

### 1. Generate KMS Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Copy the output - you'll need it in step 3.

### 2. Get Supabase Service Role Key

1. Visit: https://supabase.com/dashboard/project/njcancswtqnxihxavshl/settings/api
2. Scroll to "Project API keys"
3. Copy the `service_role` secret key (click "Reveal" if hidden)

### 3. Add All 7 Variables to Vercel

Go to: https://vercel.com/kumii-dev/apimanager-two/settings/environment-variables

For EACH variable:
1. Click "Add New"
2. Enter the name (e.g., `NODE_ENV`)
3. Enter the value
4. ☑️ Check: **Production** (and optionally Preview/Development)
5. Click "Save"

Repeat for all 7 variables.

### 4. Trigger Rebuild

The latest commit will trigger a rebuild automatically. Or:
1. Go to: https://vercel.com/kumii-dev/apimanager-two
2. Click "Redeploy" on latest deployment

### 5. Monitor Build

1. Go to: https://vercel.com/kumii-dev/apimanager-two/deployments
2. Click on the latest deployment
3. Watch the "Building" tab
4. Should complete in 2-3 minutes

### 6. Check Function Logs

After deployment:
1. Same page, click "Functions" tab
2. Look for `/api/index.ts`
3. Check logs for:
   - ✅ `[Vercel] Initializing Express app...`
   - ✅ `[Vercel] Express app initialized successfully`
   - ❌ Any error messages

---

## Verification

### Test 1: Health Check
```bash
curl https://apimanager-two.vercel.app/api/health
```

Expected:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-15T...",
  "environment": "production"
}
```

### Test 2: Check Logs

Visit: https://apimanager-two.vercel.app

Open browser console (F12), should see:
```
[Vercel] GET /api/health
[Vercel] Routing to Express: /health
[Vercel] Request completed in XXXms
```

### Test 3: Connectors Page

1. Visit: https://apimanager-two.vercel.app/login
2. Log in with Supabase credentials
3. Go to: https://apimanager-two.vercel.app/connectors
4. Should load without timeout (may show empty list if no connectors exist)

---

## Why This Happened

1. **Config validation runs at import time** - when the Express app module is loaded
2. **Missing required variables** - config schema requires all these variables
3. **No fallback values** - the config is strict for security reasons
4. **Serverless timeout** - function can't complete init in 30 seconds, returns 504

---

## Timeline

- **Add variables**: 5 minutes (generate key + copy from Supabase)
- **Vercel rebuild**: 2-3 minutes (automatic)
- **Test**: 1 minute

**Total: ~8-10 minutes** to fix! 🚀

---

## Still Timing Out?

If you still get 504 after adding variables:

### Check Function Logs
https://vercel.com/kumii-dev/apimanager-two → Latest deployment → Functions → `/api/index.ts`

Look for:
- `[Vercel] Environment check:` - should show `true` for all variables
- `Configuration validation failed` - means wrong values
- Any other error messages

### Verify Variables Are Set

In Function logs, look for:
```
[Vercel] Environment check: {
  NODE_ENV: 'production',
  hasSupabaseUrl: true,
  hasSupabaseKey: true,
  hasKmsKey: true
}
```

All should be `true`!

### Common Issues

**Wrong KMS key format:**
- Must be 32 bytes base64 encoded
- Should be 44 characters long
- Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

**Wrong Supabase key:**
- Make sure you copied the `service_role` key, NOT the `anon` key
- Both are needed but in different variables

**Variables not applied:**
- Remember: You need to **REBUILD**, not just redeploy
- The latest commit should trigger a rebuild automatically

---

## Next Steps After Fix

Once the API is working (no more 504):

1. ✅ Test login flow
2. ✅ Test all admin pages (connectors, routes, audit logs)
3. ✅ Create test connectors/routes
4. ✅ Verify everything works end-to-end

---

## Contact/Support

If still stuck after following these steps:
1. Check Vercel function logs for specific error messages
2. Check browser console for client-side errors
3. Verify all 7 environment variables are set correctly in Vercel dashboard
