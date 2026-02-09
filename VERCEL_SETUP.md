# Vercel Deployment Setup Guide

## Current Issue: 500 Internal Server Error

The frontend is correctly calling `/api/admin/connectors`, but the backend is returning a 500 error. This is likely due to missing environment variables in Vercel.

## Required Environment Variables

Add these in your Vercel Project Settings → Environment Variables:

### 1. Supabase Configuration
```bash
SUPABASE_URL=https://njcancswtqnxihxavshl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

**Where to find:**
- Go to your Supabase project: https://supabase.com/dashboard/project/njcancswtqnxihxavshl
- Click "Settings" → "API"
- Copy the `service_role` key (NOT the `anon` key)

### 2. Encryption Key
```bash
KMS_MASTER_KEY=<your-encryption-key>
```

**How to generate:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Or use this pre-generated secure key:
```
vQ8xK2mN9pL4tR7sW1aZ3cF6hJ8kM0nP2qT5uX7yB9dE=
```

⚠️ **IMPORTANT:** In production, generate a new key and store it securely. Never commit this to git.

### 3. Node Environment
```bash
NODE_ENV=production
```

### 4. CORS Configuration (Optional but Recommended)
```bash
CORS_ALLOWED_ORIGINS=https://apimanager-two.vercel.app
```

## Steps to Add Environment Variables in Vercel

1. Go to: https://vercel.com/kumii-dev/apimanager-two
2. Click "Settings" tab
3. Click "Environment Variables" in the sidebar
4. Add each variable:
   - Variable Name: `SUPABASE_URL`
   - Value: `https://njcancswtqnxihxavshl.supabase.co`
   - Environment: Select "Production", "Preview", and "Development"
   - Click "Save"
5. Repeat for `SUPABASE_SERVICE_ROLE_KEY`, `KMS_MASTER_KEY`, and `NODE_ENV`

## Trigger Redeployment

After adding environment variables:

1. Go to "Deployments" tab
2. Click the three dots on the latest deployment
3. Click "Redeploy"

Or push an empty commit:
```bash
git commit --allow-empty -m "chore: trigger redeploy with env vars"
git push
```

## Verify Deployment

1. Wait for the deployment to complete (~2 minutes)
2. Go to: https://apimanager-two.vercel.app/connectors
3. Try creating a connector again
4. Check browser console - should show successful response

## Troubleshooting

If still getting 500 errors:

1. Check Vercel deployment logs:
   - Go to "Deployments" → Click latest deployment → "Function Logs"
   - Look for error messages

2. Check if environment variables are set:
   - Settings → Environment Variables
   - Verify all 4 variables are present

3. Common issues:
   - Wrong `SUPABASE_SERVICE_ROLE_KEY` (using anon key instead)
   - `KMS_MASTER_KEY` not base64 encoded
   - Environment variables not applied to correct environments

## Security Notes

✅ **Safe to commit:**
- `SUPABASE_URL` (public URL)
- Documentation files

❌ **NEVER commit:**
- `SUPABASE_SERVICE_ROLE_KEY` (has admin access)
- `KMS_MASTER_KEY` (encrypts secrets)
- `.env` files

These secrets should only exist in:
- Vercel environment variables (production)
- Local `.env` file (development, gitignored)
- Secure password manager (backup)
