# API Documentation

## KUMII API Gateway - Complete API Reference

### Base URL

```
Production: https://api.kumii.com
Development: http://localhost:3000
```

### Authentication

All admin endpoints require JWT authentication via Supabase.

```bash
# Get token from Supabase Auth
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## Admin API

### Module Prefixes

#### GET /admin/modules

List all available module prefixes.

**Request:**
```bash
curl -X GET http://localhost:3000/admin/modules \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "modules": [
    { "prefix": "/api/v1/market", "description": "Market data and trading" },
    { "prefix": "/api/v1/capital", "description": "Capital management" },
    { "prefix": "/api/v1/mentorship", "description": "Mentorship platform" },
    { "prefix": "/api/v1/collaboration", "description": "Collaboration tools" },
    { "prefix": "/api/v1/cms", "description": "Content management" },
    { "prefix": "/api/v1/analytics", "description": "Analytics and reporting" }
  ]
}
```

---

### API Connectors

#### POST /admin/connectors

Create a new API connector.

**Request:**
```bash
curl -X POST http://localhost:3000/admin/connectors \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CoinGecko API",
    "type": "rest",
    "base_url": "https://api.coingecko.com/api/v3",
    "auth_type": "api_key",
    "auth_config": {
      "header_name": "x-cg-pro-api-key",
      "secret_type": "api_key"
    },
    "headers": {
      "Accept": "application/json"
    },
    "timeout_ms": 30000,
    "retry_config": {
      "enabled": true,
      "max_attempts": 3,
      "backoff_ms": 1000
    },
    "circuit_breaker_config": {
      "enabled": true,
      "failure_threshold": 5,
      "reset_timeout_ms": 60000
    },
    "secret": "YOUR_API_KEY_HERE"
  }'
```

**Response:**
```json
{
  "id": "uuid",
  "name": "CoinGecko API",
  "type": "rest",
  "base_url": "https://api.coingecko.com/api/v3",
  "is_active": true,
  "created_at": "2024-01-15T10:00:00Z"
}
```

#### GET /admin/connectors

List all connectors for your tenant.

**Request:**
```bash
curl -X GET http://localhost:3000/admin/connectors \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "connectors": [
    {
      "id": "uuid",
      "name": "CoinGecko API",
      "type": "rest",
      "base_url": "https://api.coingecko.com/api/v3",
      "is_active": true,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 1
}
```

#### GET /admin/connectors/:id

Get a specific connector.

**Request:**
```bash
curl -X GET http://localhost:3000/admin/connectors/uuid \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### PATCH /admin/connectors/:id

Update a connector.

**Request:**
```bash
curl -X PATCH http://localhost:3000/admin/connectors/uuid \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CoinGecko API (Updated)",
    "timeout_ms": 45000
  }'
```

#### DELETE /admin/connectors/:id

Delete a connector.

**Request:**
```bash
curl -X DELETE http://localhost:3000/admin/connectors/uuid \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### POST /admin/connectors/:id/rotate-secret

Rotate connector secret.

**Request:**
```bash
curl -X POST http://localhost:3000/admin/connectors/uuid/rotate-secret \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "newSecret": "NEW_API_KEY_HERE"
  }'
```

---

### API Routes

#### POST /admin/routes

Create a new route.

**Request:**
```bash
curl -X POST http://localhost:3000/admin/routes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "connector_id": "connector-uuid",
    "name": "Get Bitcoin Price",
    "module_prefix": "/api/v1/market",
    "path_pattern": "/crypto/bitcoin",
    "http_method": "GET",
    "upstream_path": "/simple/price?ids=bitcoin&vs_currencies=usd",
    "auth_required": false,
    "allowed_roles": ["user", "staff", "tenant_admin", "platform_admin"],
    "cache_config": {
      "enabled": true,
      "ttl_seconds": 60
    },
    "rate_limit_config": {
      "enabled": true,
      "max_requests": 100,
      "window_seconds": 60
    }
  }'
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Get Bitcoin Price",
  "module_prefix": "/api/v1/market",
  "path_pattern": "/crypto/bitcoin",
  "http_method": "GET",
  "is_active": true,
  "created_at": "2024-01-15T10:00:00Z"
}
```

#### GET /admin/routes

List all routes.

**Request:**
```bash
curl -X GET http://localhost:3000/admin/routes \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### GET /admin/routes/:id

Get a specific route.

**Request:**
```bash
curl -X GET http://localhost:3000/admin/routes/uuid \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### PATCH /admin/routes/:id

Update a route.

**Request:**
```bash
curl -X PATCH http://localhost:3000/admin/routes/uuid \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cache_config": {
      "enabled": true,
      "ttl_seconds": 120
    }
  }'
```

#### DELETE /admin/routes/:id

Delete a route.

**Request:**
```bash
curl -X DELETE http://localhost:3000/admin/routes/uuid \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### POST /admin/routes/:id/test

Test a route (dry-run).

**Request:**
```bash
curl -X POST http://localhost:3000/admin/routes/uuid/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "test_data": {
      "params": {},
      "query": {},
      "body": {}
    }
  }'
```

---

### Audit Logs

#### GET /admin/audit-logs

Get audit logs for your tenant.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 50, max: 100)
- `action` (filter by action)
- `resource_type` (filter by resource type)
- `user_id` (filter by user)
- `from_date` (ISO 8601)
- `to_date` (ISO 8601)
- `severity` (debug, info, warn, error, critical)
- `status` (success, failure, pending)

**Request:**
```bash
curl -X GET "http://localhost:3000/admin/audit-logs?page=1&limit=50&action=connector.create" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "tenant_id": "tenant-uuid",
      "user_id": "user-uuid",
      "action": "connector.create",
      "resource_type": "connector",
      "resource_id": "connector-uuid",
      "request_id": "req-uuid",
      "ip_address": "192.168.1.1",
      "details": {},
      "severity": "info",
      "status": "success",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```

---

### Metrics

#### GET /admin/metrics

Get system metrics.

**Request:**
```bash
curl -X GET http://localhost:3000/admin/metrics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "uptime_seconds": 3600,
  "requests_total": 1500,
  "requests_by_status": {
    "200": 1200,
    "400": 50,
    "401": 20,
    "403": 10,
    "429": 5,
    "500": 15
  },
  "requests_by_method": {
    "GET": 1000,
    "POST": 300,
    "PATCH": 150,
    "DELETE": 50
  },
  "circuit_breakers": {
    "connector-uuid": {
      "state": "CLOSED",
      "failures": 0,
      "successes": 100
    }
  },
  "rate_limits": {
    "hits": 5,
    "blocked": 2
  }
}
```

---

## Proxy API

Dynamic routes configured via admin API.

### Example: Market Data

**Request:**
```bash
curl -X GET http://localhost:3000/api/v1/market/crypto/bitcoin
```

**Response:**
```json
{
  "bitcoin": {
    "usd": 45000
  }
}
```

---

## Security Headers

All responses include security headers:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'
```

---

## Rate Limiting

Rate limits are enforced per-user (authenticated) or per-IP (anonymous).

**Headers in Response:**
```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1673780400
```

**429 Response:**
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 60
}
```

---

## Error Responses

### 400 Bad Request

```json
{
  "error": "Validation Error",
  "message": "Invalid request data",
  "details": [
    {
      "path": "name",
      "message": "Required"
    }
  ]
}
```

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid authorization header"
}
```

### 403 Forbidden

```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

### 404 Not Found

```json
{
  "error": "Not Found",
  "message": "The requested resource does not exist"
}
```

### 429 Too Many Requests

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 60
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

---

## Transform DSL

Routes support safe transformations:

### SET

Set a value at path:

```json
{
  "type": "set",
  "path": "body.status",
  "value": "processed"
}
```

### REMOVE

Remove a field:

```json
{
  "type": "remove",
  "path": "body.internal_field"
}
```

### RENAME

Rename a field:

```json
{
  "type": "rename",
  "path": "body.old_name",
  "newPath": "body.new_name"
}
```

### DEFAULT

Set default if missing:

```json
{
  "type": "default",
  "path": "body.status",
  "value": "pending"
}
```

### MAP

Extract field from array:

```json
{
  "type": "map",
  "path": "body.items",
  "mapField": "id"
}
```

---

## Connector Types

### REST

Standard RESTful API.

### GraphQL

GraphQL endpoint.

### SOAP

SOAP web service.

### Custom

Custom connector with specific logic.

---

## Authentication Types

### none

No authentication required.

### api_key

API key in header or query parameter.

### bearer

Bearer token in Authorization header.

### basic

Basic authentication (username:password).

### oauth2

OAuth 2.0 client credentials flow.

### custom

Custom authentication logic.

---

## Complete Example Workflow

### 1. Create Connector

```bash
curl -X POST http://localhost:3000/admin/connectors \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Weather API",
    "type": "rest",
    "base_url": "https://api.openweathermap.org/data/2.5",
    "auth_type": "api_key",
    "auth_config": {
      "param_name": "appid",
      "secret_type": "api_key"
    },
    "secret": "YOUR_WEATHER_API_KEY"
  }'
```

### 2. Create Route

```bash
curl -X POST http://localhost:3000/admin/routes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "connector_id": "CONNECTOR_UUID",
    "name": "Get Current Weather",
    "module_prefix": "/api/v1/analytics",
    "path_pattern": "/weather/:city",
    "http_method": "GET",
    "upstream_path": "/weather?q={city}",
    "auth_required": false,
    "cache_config": {
      "enabled": true,
      "ttl_seconds": 300
    }
  }'
```

### 3. Use Route

```bash
curl -X GET http://localhost:3000/api/v1/analytics/weather/London
```

---

For more information, see the [Security Documentation](./SECURITY.md).
