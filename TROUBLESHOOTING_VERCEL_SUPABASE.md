# Troubleshooting: Vercel ↔ Supabase Connection Timeout

## Problem
- ✅ Health endpoint works: `GET /api/health` → 200 OK in 0.5s
- ❌ Authenticated endpoints timeout: `GET /api/admin/connectors` → 504 after 30s
- ❌ Supabase test endpoint times out: `GET /api/debug/supabase` → FUNCTION_INVOCATION_TIMEOUT after 30s

## Root Cause
**Vercel serverless functions cannot connect to Supabase**, likely due to one of:
1. Regional network routing issues
2. Supabase connection limits
3. IPv6 vs IPv4 configuration
4. Missing connection pooling configuration

## Solutions to Try

### Solution 1: Verify Supabase is Reachable (Quick Test)
```bash
curl -I https://njcancswtqnxihxavshl.supabase.co/rest/v1/
```

Expected: Should respond in < 1 second with `200 OK`

If this times out from your machine, there's a broader Supabase connectivity issue.

### Solution 2: Use Supabase Connection Pooler (Recommended for Serverless)

Supabase provides connection pooling specifically for serverless environments.

1. Go to: https://supabase.com/dashboard/project/njcancswtqnxihxavshl/settings/database
2. Find "Connection pooling" section
3. Look for "Connection string" in **Transaction mode**
4. The URL should include port `:6543` instead of `:5432`

However, since we're using the REST API (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`), connection pooling shouldn't be the issue. The REST API uses HTTPS, not direct PostgreSQL connections.

### Solution 3: Check Supabase Region

1. Go to: https://supabase.com/dashboard/project/njcancswtqnxihxavshl/settings/general
2. Check the "Region" field
3. If it's in a different region than Vercel (US East - iad1), this could cause high latency

**Recommended regions for Vercel iad1:**
- US East (North Virginia)
- US East (Ohio)

### Solution 4: Test from Vercel's Region

The timeout might be specific to Vercel's network. Test if Supabase is reachable from AWS US-East:

```bash
# From an AWS EC2 instance in us-east-1:
curl -w "Time: %{time_total}s\n" https://njcancswtqnxihxavshl.supabase.co/rest/v1/
```

### Solution 5: Check Supabase Service Status

Visit: https://status.supabase.com/

Look for any ongoing incidents affecting the REST API.

### Solution 6: Increase Supabase Connection Limits

If using many concurrent connections:

1. Go to Database settings
2. Check current connection limit
3. Increase if needed (free tier: 60 connections max)

### Solution 7: Use Supabase Edge Functions Instead

If Vercel → Supabase continues to fail, consider:
- Deploy the backend as Supabase Edge Functions (Deno)
- Keep the frontend on Vercel
- This ensures backend and database are in the same region

### Solution 8: Check Vercel Environment Variables

Verify environment variables are set correctly in Vercel:

```bash
# These should be set in Vercel Dashboard → Settings → Environment Variables
SUPABASE_URL=https://njcancswtqnxihxavshl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  (starts with eyJ)
KMS_MASTER_KEY=wtc/QOA...  (base64 encoded)
NODE_ENV=production
```

### Solution 9: Test with Simpler Supabase Client Configuration

Try creating the Supabase client with minimal configuration:

```typescript
const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        'x-client-info': 'vercel-serverless',
      },
      fetch: (url, options = {}) => {
        return fetch(url, {
          ...options,
          signal: AbortSignal.timeout(5000), // 5s timeout
          // Force IPv4
          // @ts-ignore
          family: 4,
        });
      },
    },
  }
);
```

### Solution 10: Bypass Authentication Temporarily (Testing Only)

To isolate whether the issue is authentication-specific:

1. Set `DEV_BYPASS_AUTH=true` in Vercel environment variables (DANGEROUS - testing only!)
2. This will skip Supabase authentication
3. Test if `/api/admin/connectors` works without auth
4. **IMPORTANT:** Remove this after testing!

## Diagnostic Commands

```bash
# Test health endpoint (works)
curl https://apimanager-two.vercel.app/api/health

# Test Supabase connectivity (times out)
curl https://apimanager-two.vercel.app/api/debug/supabase

# Test authenticated endpoint (times out)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://apimanager-two.vercel.app/api/admin/connectors

# Test Supabase directly
curl -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  https://njcancswtqnxihxavshl.supabase.co/rest/v1/api_connectors?limit=1
```

## Next Steps

1. **Wait for debug endpoint deployment** (2 minutes)
2. **Test improved debug endpoint**: `curl https://apimanager-two.vercel.app/api/debug/supabase`
3. **Check Vercel function logs** for detailed output
4. **Verify Supabase region** matches or is close to Vercel region
5. **Test Supabase REST API directly** to rule out Supabase issues

## Expected Timeline

- If Supabase is reachable: Queries should complete in < 1 second
- If timing out: Indicates network-level connectivity issue
- If erroring quickly: Indicates authentication or permission issue (solvable)

## Contact

If none of these solutions work, this is likely a Vercel ↔ Supabase network routing issue that may require:
- Contacting Vercel support
- Or moving backend to Supabase Edge Functions
- Or using a different hosting provider (Railway, Fly.io, etc.)
