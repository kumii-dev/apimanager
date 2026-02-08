# KUMII API Management & Routing System

## Security Architecture & ISO 27001 Compliance

A production-grade, security-first API gateway with dynamic routing and secure admin UI.

**🚀 Deploy to Vercel in 5 minutes** - See [Vercel Deployment Guide](docs/VERCEL_DEPLOYMENT.md)

### 🛡️ Security Standards Compliance

#### ISO/IEC 27001:2022 Control Mapping

| Control | Implementation |
|---------|---------------|
| **A.5 Access Control** | RBAC, RLS, Zero Trust, Least Privilege |
| **A.8 Asset Management** | Connector & Route Registry, Version Control |
| **A.10 Cryptography** | AES-256-GCM, KMS, TLS, Secret Encryption |
| **A.12 Operations Security** | Rate Limiting, Circuit Breaker, Monitoring |
| **A.12.4 Logging** | Structured Audit Logs, Correlation IDs |
| **A.14 Secure Development** | Input Validation, OWASP Top 10, ASVS L2+ |
| **A.15 Supplier Relationships** | Dependency Auditing, Supply Chain Security |
| **A.17 Business Continuity** | Circuit Breaker, Retry Logic, Graceful Degradation |

#### NIST Cybersecurity Framework

- **Identify**: Asset registry, role mapping, tenant isolation
- **Protect**: Encryption, RBAC, RLS, input validation, secure headers
- **Detect**: Audit logging, metrics, security event monitoring
- **Respond**: Rate limiting, circuit breaker, SSRF blocking
- **Recover**: Retry logic, graceful degradation, health checks

#### CIS Critical Security Controls v8

- **CIS 2**: Supply chain security (npm audit, dependency management)
- **CIS 3**: Data protection (encryption at rest/transit, secret management)
- **CIS 5**: Account management (RBAC, least privilege, Supabase Auth)
- **CIS 6**: Access control (tenant isolation, RLS, zero trust)
- **CIS 8**: Audit log management (structured logging, correlation)

#### OWASP Compliance

- **ASVS Level 2+**: Authentication, session management, access control
- **Top 10 2021**: All mitigations implemented
  - A01 Broken Access Control → RBAC + RLS
  - A02 Cryptographic Failures → AES-256-GCM
  - A03 Injection → Zod validation, parameterized queries
  - A04 Insecure Design → Zero trust, defense in depth
  - A05 Security Misconfiguration → Secure defaults, helmet
  - A07 SSRF → URL validation, allowlists
  - A08 Data Integrity → Audit logs, versioning
  - A09 Logging Failures → Structured logging, redaction
  - A10 SSRF → Dedicated blocker module

### 🏗️ Architecture

```
┌─────────────────┐
│  Admin Client   │  React + TypeScript (RBAC gated)
│  (Vite + RB5)   │  Secrets masked, rotation flow
└────────┬────────┘
         │ HTTPS + JWT
         ▼
┌─────────────────────────────────────────────────┐
│           Gateway Server (Express)              │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐           │
│  │ Auth Guard   │  │ Rate Limiter │           │
│  │ (Zero Trust) │  │ (Redis/Mem)  │           │
│  └──────────────┘  └──────────────┘           │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐           │
│  │ Route Engine │  │ Connector    │           │
│  │ (Dynamic)    │  │ Registry     │           │
│  └──────────────┘  └──────────────┘           │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐           │
│  │ Transform    │  │ Circuit      │           │
│  │ DSL (Safe)   │  │ Breaker      │           │
│  └──────────────┘  └──────────────┘           │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐           │
│  │ Crypto (AES) │  │ SSRF Blocker │           │
│  │ KMS          │  │ (IP/DNS)     │           │
│  └──────────────┘  └──────────────┘           │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐           │
│  │ Audit Logger │  │ Metrics      │           │
│  │ (Pino)       │  │ (Prometheus) │           │
│  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│   Supabase      │  Auth + Postgres + RLS
│                 │  Tenant isolation
│  ┌───────────┐  │  Secret protection
│  │ RLS       │  │  Audit trail
│  │ Policies  │  │
│  └───────────┘  │
└─────────────────┘
```

### 🔐 Security Features

#### Defense in Depth

1. **Network Layer**: TLS, CORS allowlist, secure headers (helmet)
2. **Application Layer**: Rate limiting, input validation, SSRF blocking
3. **Business Logic**: RBAC, tenant isolation, circuit breaker
4. **Data Layer**: RLS, encryption at rest, secret protection
5. **Audit Layer**: Structured logging, correlation IDs, security events

#### Zero Trust Principles

- Every request authenticated (except explicit public endpoints)
- No implicit trust between components
- Least privilege everywhere (API, DB, UI)
- Continuous verification
- Assume breach mentality

#### Secrets Management (CIS 3 / ISO A.10)

- **Encryption**: AES-256-GCM with KMS master key
- **Storage**: Separate `api_connector_secrets` table
- **Access**: Service role only, never via API
- **Rotation**: Built-in flow, versioned
- **Logging**: Complete redaction
- **UI**: Masked display, no retrieval

### 📦 Project Structure

```
.
├── vercel.json             # Vercel deployment config
├── gateway-server/          # API Gateway (Node + Express + TS)
│   ├── api/                # Vercel serverless functions
│   │   └── index.ts        # Function entry point
│   ├── src/
│   │   ├── server.ts       # Main entry
│   │   ├── config/         # Environment & security config
│   │   ├── middleware/     # Auth, rate limit, validation
│   │   ├── routes/         # Admin & proxy routes
│   │   ├── services/       # Core business logic
│   │   │   ├── crypto.ts   # AES-256-GCM encryption
│   │   │   ├── ssrf.ts     # SSRF blocker
│   │   │   ├── transform.ts # Safe DSL engine
│   │   │   ├── circuit.ts  # Circuit breaker
│   │   │   └── audit.ts    # Audit logger
│   │   ├── connectors/     # Connector implementations
│   │   └── utils/          # Helpers
│   ├── tests/              # Security & unit tests
│   └── package.json
│
├── admin-client/           # Admin UI (React + Vite + TS)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── config/         # API endpoints
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Route pages
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Connectors.tsx
│   │   │   ├── Routes.tsx
│   │   │   └── AuditLogs.tsx
│   │   ├── services/       # API client, auth
│   │   ├── hooks/          # React hooks
│   │   └── types/          # TypeScript types
│   └── package.json
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Full schema + RLS
│
├── docs/
│   ├── SECURITY.md         # Security controls reference
│   ├── API.md              # API documentation
│   └── DEPLOYMENT.md       # Deployment guide
│
└── README.md
```

### 🚀 Quick Start

#### Local Development

- Node.js 18+
- PostgreSQL 14+ (or Supabase account)
- Redis (optional, in-memory fallback available)

See [GETTING_STARTED.md](GETTING_STARTED.md) for detailed local setup.

#### Vercel Deployment (Recommended)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy
vercel --prod
```

See [docs/VERCEL_DEPLOYMENT.md](docs/VERCEL_DEPLOYMENT.md) for complete guide.

#### 1. Setup Environment

```bash
# Gateway Server
cd gateway-server
cp .env.example .env
# Edit .env with your Supabase credentials and KMS key
npm install

# Admin Client
cd ../admin-client
cp .env.example .env
# Edit .env with gateway URL
npm install
```

#### 2. Database Setup

```bash
# If using local Supabase:
supabase init
supabase start
supabase db reset

# If using hosted Supabase:
# Run supabase/migrations/001_initial_schema.sql in SQL Editor
```

#### 3. Generate Master Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Add to gateway-server/.env as KMS_MASTER_KEY
```

#### 4. Start Services

```bash
# Terminal 1: Gateway Server
cd gateway-server
npm run dev

# Terminal 2: Admin Client
cd admin-client
npm run dev
```

#### 5. Access Admin UI

Navigate to `http://localhost:5173` and login with Supabase credentials.

### 🔑 Roles & Permissions

| Role | Capabilities |
|------|-------------|
| **platform_admin** | All tenants, all operations, system config |
| **tenant_admin** | Own tenant: manage connectors, routes, view audit |
| **staff** | Own tenant: view connectors, routes (read-only) |
| **user** | Use proxied APIs (if granted) |

### 🛠️ API Endpoints

#### Admin API (RBAC Protected)

```
POST   /admin/connectors                    # Create connector
GET    /admin/connectors                    # List connectors
GET    /admin/connectors/:id                # Get connector
PATCH  /admin/connectors/:id                # Update connector
DELETE /admin/connectors/:id                # Delete connector
POST   /admin/connectors/:id/rotate-secret  # Rotate secret

POST   /admin/routes                        # Create route
GET    /admin/routes                        # List routes
GET    /admin/routes/:id                    # Get route
PATCH  /admin/routes/:id                    # Update route
DELETE /admin/routes/:id                    # Delete route
POST   /admin/routes/:id/test               # Test route (dry-run)

GET    /admin/audit-logs                    # View audit logs
GET    /admin/metrics                       # System metrics
GET    /admin/modules                       # Available module prefixes
```

#### Proxy API (Dynamic)

```
*      /api/v1/market/*        # Routed dynamically
*      /api/v1/capital/*
*      /api/v1/mentorship/*
*      /api/v1/collaboration/*
*      /api/v1/cms/*
*      /api/v1/analytics/*
```

### 🧪 Testing

```bash
cd gateway-server
npm test                  # Run all tests
npm run test:security     # Security-focused tests
npm run test:coverage     # Coverage report
```

Test coverage includes:
- RBAC enforcement
- SSRF blocking
- Transform DSL safety
- Route matching
- Encryption/decryption
- Tenant isolation

### 📊 Monitoring & Observability

#### Structured Logging (Pino)

Every log includes:
- `requestId`: Correlation across services
- `tenantId`: Tenant isolation
- `userId`: Actor traceability
- `action`: What happened
- `resource`: What was affected
- `timestamp`: When it happened

#### Security Events

Automatically logged:
- Authentication attempts (success/failure)
- Authorization failures
- Admin actions (create/update/delete)
- Secret rotations
- Rate limit hits
- SSRF attempts
- Route changes
- Connector changes

#### Metrics Endpoint

`GET /admin/metrics` returns Prometheus-compatible metrics:
- Request counts by route, method, status
- Request duration histograms
- Rate limit hits
- Circuit breaker states
- Active connections

### 🔄 Secret Rotation

```bash
# Via Admin UI
1. Navigate to Connectors
2. Click "Rotate Secret" on connector
3. Enter new secret
4. Confirm rotation

# Via API
curl -X POST https://api.kumii.com/admin/connectors/123/rotate-secret \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"newSecret": "new_secret_value"}'
```

Rotation process:
1. Validates new secret
2. Encrypts with AES-256-GCM
3. Stores with new version number
4. Logs rotation event
5. Old secret kept for rollback (7 days)

### 🚨 Incident Response

#### Rate Limit Exceeded

**Detection**: `rate_limit_exceeded` event in audit logs
**Response**: 
1. Check `/admin/metrics` for source IP
2. Review `/admin/audit-logs` for patterns
3. Adjust rate limits if legitimate
4. Block IP if malicious (infrastructure level)

#### SSRF Attempt

**Detection**: `ssrf_attempt` event in audit logs
**Response**:
1. Alert security team immediately
2. Review connector configuration
3. Check route definitions
4. Audit user permissions
5. Consider disabling connector temporarily

#### Unauthorized Access

**Detection**: `auth_failure` or `authz_failure` events
**Response**:
1. Verify user identity
2. Check role assignments
3. Review RLS policies
4. Check for privilege escalation attempts
5. Force password reset if compromised

### 📝 Compliance Checklists

#### Pre-Deployment Checklist

- [ ] KMS_MASTER_KEY generated (32 bytes, base64)
- [ ] SUPABASE_URL and keys configured
- [ ] RLS enabled on all tables
- [ ] Admin accounts created with MFA
- [ ] Rate limits configured appropriately
- [ ] CORS allowlist configured
- [ ] TLS certificates valid
- [ ] Backup strategy in place
- [ ] Monitoring alerts configured
- [ ] Security contact updated

#### Monthly Security Review

- [ ] Review audit logs for anomalies
- [ ] Check failed authentication attempts
- [ ] Verify rate limit effectiveness
- [ ] Update dependencies (npm audit)
- [ ] Review active connectors
- [ ] Validate RLS policies
- [ ] Test secret rotation
- [ ] Review access permissions
- [ ] Check system metrics
- [ ] Update threat model

### 📚 Documentation

- [Security Controls](docs/SECURITY.md) - Detailed security implementation
- [API Reference](docs/API.md) - Complete API documentation
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment
- [Connector Development](docs/CONNECTORS.md) - Creating custom connectors

### 🤝 Contributing

Security-first development:
1. All input validated with Zod
2. All secrets encrypted
3. All actions audited
4. All tests passing
5. No security warnings

### 📄 License

Proprietary - KUMII Platform

### 🔒 Security Contact

For security issues: security@kumii.com

**Do not open public issues for security vulnerabilities.**

---

**Built with security as the foundation, not an afterthought.**
