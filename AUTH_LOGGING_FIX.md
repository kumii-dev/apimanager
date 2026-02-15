# Auth Login Multiple Logging Fix

## Problem
When refreshing `/audit-logs` or any other admin page, the `auth.login` action was being logged **3-4 times** for a single request, creating excessive audit log entries.

## Root Cause
The authentication middleware (`requireAdmin()`) was being applied multiple times due to nested route configuration:

### Before Fix - Middleware Chain:
```
Request → /admin/audit-logs
  ↓
1. adminRoutes.use(requireAdmin())     ← First auth check + log
  ↓
2. adminRoutes.use('/audit-logs', ...)  ← Route mounting
  ↓
3. auditLogRoutes.use(requireAdmin())  ← Second auth check + log (REDUNDANT!)
  ↓
Handler executes
```

This happened in **3 route files**:
- `/routes/auditLogs.ts` - Had redundant `requireAdmin()`
- `/routes/connectors.ts` - Had redundant `requireAdmin()`
- `/routes/routesAdmin.ts` - Had redundant `requireAdmin()`

## Solution
Removed the redundant `requireAdmin()` calls from child routers since authentication is already handled by the parent `adminRoutes` router.

### Files Changed:

#### 1. `/gateway-server/src/routes/auditLogs.ts`
```typescript
// BEFORE
auditLogRoutes.use(requireAdmin()); // ❌ Redundant

// AFTER
// Auth is already handled by parent adminRoutes ✅
// No need to apply requireAdmin() again here
```

#### 2. `/gateway-server/src/routes/connectors.ts`
```typescript
// BEFORE
connectorRoutes.use(requireAdmin()); // ❌ Redundant

// AFTER
// Auth is already handled by parent adminRoutes ✅
```

#### 3. `/gateway-server/src/routes/routesAdmin.ts`
```typescript
// BEFORE
routeRoutes.use(requireAdmin()); // ❌ Redundant

// AFTER
// Auth is already handled by parent adminRoutes ✅
```

## Result
Now each request to `/admin/*` routes triggers authentication **only once**, creating a single `auth.login` audit log entry per request instead of 3-4.

### Before:
```
[Auth] Starting authentication check
[Auth] Verifying token with Supabase
[Auth] Token verification complete
[Auth] Fetching user profile
[Auth] Profile fetch complete
{"action":"auth.login"} ← Log 1

[Auth] Starting authentication check  ← REDUNDANT
[Auth] Verifying token with Supabase
[Auth] Token verification complete
[Auth] Fetching user profile
[Auth] Profile fetch complete
{"action":"auth.login"} ← Log 2

[Auth] Starting authentication check  ← REDUNDANT
[Auth] Verifying token with Supabase
[Auth] Token verification complete
[Auth] Fetching user profile
[Auth] Profile fetch complete
{"action":"auth.login"} ← Log 3
```

### After:
```
[Auth] Starting authentication check
[Auth] Verifying token with Supabase
[Auth] Token verification complete
[Auth] Fetching user profile
[Auth] Profile fetch complete
{"action":"auth.login"} ← Single log entry ✅
```

## Benefits
1. **Reduced database writes**: 66% fewer audit log entries
2. **Improved performance**: Authentication runs once instead of 3 times
3. **Cleaner audit logs**: No duplicate authentication entries
4. **Lower latency**: Faster response times for admin endpoints

## Testing
Refresh any admin page (e.g., `/audit-logs`, `/connectors`, `/routes`) and verify that only **one** `auth.login` entry appears per request instead of 3-4.

## Architecture Pattern
This follows the **DRY (Don't Repeat Yourself)** principle and proper Express.js middleware layering:

```
Parent Router (adminRoutes)
  ├─ Global middleware (requireAdmin) ← Apply here
  └─ Child Routers
       ├─ auditLogRoutes ← Don't reapply
       ├─ connectorRoutes ← Don't reapply
       └─ routeRoutes ← Don't reapply
```

## Date Fixed
February 15, 2026

## Related Files
- `/gateway-server/src/routes/admin.ts` - Parent router with auth
- `/gateway-server/src/routes/auditLogs.ts` - Fixed
- `/gateway-server/src/routes/connectors.ts` - Fixed
- `/gateway-server/src/routes/routesAdmin.ts` - Fixed
- `/gateway-server/src/middleware/auth.ts` - Auth middleware (no changes needed)
