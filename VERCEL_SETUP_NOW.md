# ✅ VERCEL ENVIRONMENT VARIABLES - QUICK SETUP

## 🚀 Go Here Now:
**https://vercel.com/kumii-dev/apimanager-two/settings/environment-variables**

---

## 📋 Add These 7 Variables (Copy-Paste Each One):

### ☑️ Variable 1: NODE_ENV
```
Name:  NODE_ENV
Value: production
✓ Check: Production
```

---

### ☑️ Variable 2: SUPABASE_URL
```
Name:  SUPABASE_URL
Value: https://njcancswtqnxihxavshl.supabase.co
✓ Check: Production
```

---

### ☑️ Variable 3: SUPABASE_ANON_KEY
```
Name:  SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qY2FuY3N3dHFueGloeGF2c2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNzg4MTUsImV4cCI6MjA4NTk1NDgxNX0.D7aA-FXLKQXz-8uSlGGextYNBgxSd5jgYqoMDoly7s0
✓ Check: Production
```

---

### ☑️ Variable 4: SUPABASE_SERVICE_ROLE_KEY (CRITICAL!)
```
Name:  SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qY2FuY3N3dHFueGloeGF2c2hsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM3ODgxNSwiZXhwIjoyMDg1OTU0ODE1fQ.Ymhnw36OnhcgpDaYLYBv401lK85rGSbb2WiE3iuziEc
✓ Check: Production
```

---

### ☑️ Variable 5: KMS_MASTER_KEY (CRITICAL!)
```
Name:  KMS_MASTER_KEY
Value: NZsvazi6qCvzTfmn4KAWjFyyDjufUx4nzxo5IHHhNc8=
✓ Check: Production
```
⚠️ **IMPORTANT**: This is a NEW key I just generated. It's different from your local one, which is fine for production.

---

### ☑️ Variable 6: VITE_SUPABASE_URL
```
Name:  VITE_SUPABASE_URL
Value: https://njcancswtqnxihxavshl.supabase.co
✓ Check: Production
```

---

### ☑️ Variable 7: VITE_SUPABASE_ANON_KEY
```
Name:  VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qY2FuY3N3dHFueGloeGF2c2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNzg4MTUsImV4cCI6MjA4NTk1NDgxNX0.D7aA-FXLKQXz-8uSlGGextYNBgxSd5jgYqoMDoly7s0
✓ Check: Production
```

---

## 🎯 Quick Steps:

1. **Open Vercel**: https://vercel.com/kumii-dev/apimanager-two/settings/environment-variables

2. **For EACH variable above**:
   - Click "**Add New**" button
   - Copy the **Name** from above
   - Copy the **Value** from above
   - Click the "**Production**" checkbox ✓
   - Click "**Save**"
   - Repeat for all 7 variables

3. **Wait for rebuild** (~2-3 minutes, automatic)

4. **Test it**:
   - Visit: https://apimanager-two.vercel.app/connectors
   - Should load without 504 timeout
   - May need to log in first at: https://apimanager-two.vercel.app/login

---

## 🔍 Verification

### After adding variables, check:

**Build Status:**
- Go to: https://vercel.com/kumii-dev/apimanager-two/deployments
- Latest deployment should show "Building..." then "Ready"

**Function Logs:**
- Click on the latest deployment
- Click "Functions" tab
- Look for `/api/index.ts`
- Should see:
  ```
  [Vercel] Initializing Express app...
  [Vercel] Environment check: {
    NODE_ENV: 'production',
    hasSupabaseUrl: true,
    hasSupabaseKey: true,
    hasKmsKey: true
  }
  [Vercel] Express app initialized successfully
  ```

**Test Health Check:**
```bash
curl https://apimanager-two.vercel.app/api/health
```
Should return:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-15T...",
  "environment": "production"
}
```

---

## ⏱️ Timeline

- ✅ **Add 7 variables**: ~5 minutes (just copy-paste)
- ⏳ **Vercel rebuild**: ~2-3 minutes (automatic)
- ✅ **Test & verify**: ~1 minute

**Total: ~8 minutes to working app!** 🎉

---

## 🆘 Still Having Issues?

If 504 timeout persists after adding variables:

1. **Check all 7 variables are set** in Vercel dashboard
2. **Verify rebuild completed** - not just redeployed
3. **Check function logs** for error messages
4. **Try health endpoint** first: `/api/health`

---

## 📝 Notes

- The `KMS_MASTER_KEY` value above is **production-only**
- Your local development uses a different key (that's fine!)
- Never commit these keys to git (already in `.gitignore`)
- Service role key has full database access (keep secure!)

---

## 🎉 Success Criteria

After setup, you should be able to:
- ✅ Visit https://apimanager-two.vercel.app
- ✅ Log in with Supabase credentials
- ✅ View connectors page without errors
- ✅ View routes page without errors
- ✅ All CRUD operations work

---

**Ready? Start here:** https://vercel.com/kumii-dev/apimanager-two/settings/environment-variables 🚀
