# KUMII API Management System - Complete Project Structure

## 📁 Repository Overview

```
apimanager/
├── README.md                          # Main documentation
├── GETTING_STARTED.md                 # Quick start guide
├── LICENSE                            # Proprietary license
│
├── gateway-server/                    # API Gateway (Node.js + Express)
│   ├── src/
│   │   ├── server.ts                 # Main entry point
│   │   ├── config/
│   │   │   └── index.ts              # Configuration with validation
│   │   ├── middleware/
│   │   │   ├── auth.ts               # JWT authentication + RBAC
│   │   │   ├── rateLimit.ts          # Rate limiting (Redis/memory)
│   │   │   ├── errorHandler.ts       # Centralized error handling
│   │   │   └── validation.ts         # Input validation (Zod)
│   │   ├── services/
│   │   │   ├── crypto.ts             # AES-256-GCM encryption
│   │   │   ├── ssrf.ts               # SSRF protection
│   │   │   ├── audit.ts              # Audit logging (Pino)
│   │   │   ├── circuit.ts            # Circuit breaker pattern
│   │   │   ├── transform.ts          # Safe transformation DSL
│   │   │   ├── cache.ts              # Cache service
│   │   │   └── supabase.ts           # Supabase client
│   │   ├── routes/
│   │   │   ├── admin.ts              # Admin API router
│   │   │   ├── proxy.ts              # Dynamic proxy router
│   │   │   ├── connectors.ts         # Connector CRUD
│   │   │   ├── routesAdmin.ts        # Route CRUD
│   │   │   ├── auditLogs.ts          # Audit log queries
│   │   │   └── metrics.ts            # Metrics endpoint
│   │   ├── connectors/
│   │   │   ├── base.ts               # Base connector class
│   │   │   ├── rest.ts               # REST connector
│   │   │   ├── graphql.ts            # GraphQL connector
│   │   │   └── registry.ts           # Connector registry
│   │   └── utils/
│   │       ├── validation.ts         # Validation helpers
│   │       └── helpers.ts            # Common utilities
│   ├── tests/
│   │   ├── ssrf.test.ts              # SSRF protection tests
│   │   ├── auth.test.ts              # RBAC tests
│   │   ├── crypto.test.ts            # Encryption tests
│   │   ├── circuit.test.ts           # Circuit breaker tests
│   │   ├── transform.test.ts         # Transform DSL tests
│   │   └── integration/              # Integration tests
│   ├── package.json                  # Dependencies
│   ├── tsconfig.json                 # TypeScript config
│   ├── .env.example                  # Environment template
│   └── jest.config.js                # Jest configuration
│
├── admin-client/                      # Admin UI (React + Vite)
│   ├── src/
│   │   ├── App.tsx                   # Main app component
│   │   ├── main.tsx                  # Entry point
│   │   ├── App.css                   # Global styles
│   │   ├── config/
│   │   │   └── constants.ts          # App constants
│   │   ├── components/
│   │   │   ├── Navigation.tsx        # Main navigation
│   │   │   ├── ProtectedRoute.tsx    # Route guard
│   │   │   ├── Loading.tsx           # Loading spinner
│   │   │   ├── ErrorBoundary.tsx     # Error boundary
│   │   │   └── forms/
│   │   │       ├── ConnectorForm.tsx # Connector form
│   │   │       └── RouteForm.tsx     # Route form
│   │   ├── pages/
│   │   │   ├── Login.tsx             # Login page
│   │   │   ├── Dashboard.tsx         # Dashboard
│   │   │   ├── Connectors.tsx        # Connector management
│   │   │   ├── Routes.tsx            # Route management
│   │   │   └── AuditLogs.tsx         # Audit log viewer
│   │   ├── services/
│   │   │   ├── supabase.ts           # Supabase client
│   │   │   └── api.ts                # API client (Axios)
│   │   ├── hooks/
│   │   │   ├── useAuth.ts            # Auth hook
│   │   │   ├── useConnectors.ts      # Connector hook
│   │   │   └── useRoutes.ts          # Route hook
│   │   └── types/
│   │       └── index.ts              # TypeScript types
│   ├── public/
│   │   └── index.html                # HTML template
│   ├── package.json                  # Dependencies
│   ├── tsconfig.json                 # TypeScript config
│   ├── vite.config.ts                # Vite configuration
│   └── .env.example                  # Environment template
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql    # Database schema + RLS
│
└── docs/
    ├── API.md                         # API documentation + curl examples
    ├── SECURITY.md                    # Security controls reference
    ├── DEPLOYMENT.md                  # Production deployment guide
    └── CONNECTORS.md                  # Connector development guide
```

---

## 🔑 Key Files Explained

### Gateway Server

#### `src/server.ts`
- Main Express application
- Security middleware setup (helmet, CORS)
- Route mounting
- Graceful shutdown handling

#### `src/config/index.ts`
- Environment variable validation (Zod)
- Configuration object with type safety
- Startup validation
- Security defaults

#### `src/middleware/auth.ts`
- JWT token verification via Supabase
- RBAC implementation (4 roles)
- User context attachment
- Audit logging

#### `src/services/crypto.ts`
- **AES-256-GCM** encryption/decryption
- Random IV generation
- Authentication tag verification
- Secret redaction for logs

#### `src/services/ssrf.ts`
- CIDR range validation
- Private IP blocking (RFC 1918)
- DNS rebinding protection
- URL encoding attack prevention
- Cloud metadata endpoint blocking

#### `src/services/audit.ts`
- Structured logging with Pino
- Security event categorization
- Automatic secret redaction
- Correlation ID support
- Database persistence

#### `src/services/circuit.ts`
- Circuit breaker pattern implementation
- State management (CLOSED/OPEN/HALF_OPEN)
- Configurable thresholds
- Registry for multiple connectors

#### `src/services/transform.ts`
- Safe transformation DSL (no eval)
- Operations: SET, REMOVE, RENAME, DEFAULT, MAP
- Prototype pollution prevention
- Path validation

### Admin Client

#### `src/App.tsx`
- Main React application
- Route configuration
- Session management
- Protected route wrapper

#### `src/services/api.ts`
- Axios client with interceptors
- Automatic token refresh
- Request ID generation
- Centralized error handling

#### `src/pages/*.tsx`
- Dashboard: System overview
- Connectors: CRUD operations
- Routes: CRUD operations
- AuditLogs: Log viewer with filtering

### Database

#### `supabase/migrations/001_initial_schema.sql`
- Complete PostgreSQL schema
- Row Level Security (RLS) policies
- Indexes for performance
- Triggers for timestamps
- Views for common queries
- Audit trail tables

### Documentation

#### `docs/API.md`
- Complete API reference
- curl examples for all endpoints
- Request/response schemas
- Error responses
- Rate limiting info

#### `docs/SECURITY.md`
- ISO 27001 control mapping
- OWASP ASVS compliance
- OWASP Top 10 mitigations
- CIS Controls implementation
- Security testing guide
- Incident response procedures

#### `docs/DEPLOYMENT.md`
- Production deployment steps
- Infrastructure setup
- Environment configuration
- Monitoring and logging
- Scaling recommendations
- Troubleshooting guide

---

## 🔐 Security Architecture Layers

### Layer 1: Network
- TLS 1.2+ encryption
- CORS allowlist
- Security headers (Helmet)

### Layer 2: Application
- Rate limiting (100 req/min)
- Request size limits (10MB)
- SSRF protection
- Input validation (Zod)

### Layer 3: Business Logic
- RBAC (4 roles)
- Tenant isolation
- Circuit breaker
- Transform DSL (safe)

### Layer 4: Data
- RLS in PostgreSQL
- AES-256-GCM encryption
- Secret segregation
- Audit trail

### Layer 5: Monitoring
- Structured logging
- Correlation IDs
- Security event tracking
- Metrics collection

---

## 📊 Data Flow

### Admin Action (Create Connector)

```
1. User → Admin UI (React)
   - Form validation
   - Secret masked in UI

2. Admin UI → Gateway Server
   - POST /admin/connectors
   - JWT in Authorization header
   - Request ID generated

3. Gateway Server
   - Auth middleware: Verify JWT
   - RBAC check: Require admin role
   - Rate limiter: Check limit
   - Input validation: Zod schema
   - SSRF check: Validate base_url

4. Crypto Service
   - Encrypt secret with AES-256-GCM
   - Generate random IV
   - Store encrypted value + IV + tag

5. Supabase (Postgres)
   - INSERT into api_connectors
   - INSERT into api_connector_secrets (encrypted)
   - RLS enforces tenant isolation

6. Audit Logger
   - Log action with correlation ID
   - Redact secret from logs
   - Store in audit_logs table

7. Response
   - Return connector (without secret)
   - Include correlation ID in header
```

### Proxy Request (Dynamic Route)

```
1. User → Gateway Server
   - GET /api/v1/market/crypto/bitcoin
   - Optional: JWT auth

2. Gateway Server
   - Auth middleware: Verify if required
   - Rate limiter: Check limit
   - Route matcher: Find in database

3. Database Query
   - SELECT from v_active_routes view
   - Join with connectors table
   - RLS filters by tenant

4. SSRF Protection
   - Validate upstream URL
   - Block private IPs
   - Check DNS rebinding

5. Circuit Breaker
   - Check connector health
   - Open if too many failures

6. Secret Decryption
   - Fetch from api_connector_secrets
   - Decrypt with service role
   - Add to request headers

7. Upstream Request
   - Proxy to connector base_url
   - Apply timeout (30s default)
   - Retry if idempotent (3 attempts)

8. Transform (Optional)
   - Apply request transform
   - Apply response transform
   - Safe DSL execution

9. Cache (Optional)
   - Check cache (Redis/memory)
   - Store with TTL
   - Invalidate on updates

10. Audit Log
    - Log proxy request
    - Record duration
    - Track success/failure

11. Response
    - Return to user
    - Include rate limit headers
```

---

## 🧪 Testing Strategy

### Unit Tests
- Individual service functions
- Middleware behavior
- Validation schemas
- Error handling

### Integration Tests
- API endpoint flows
- Database operations
- Authentication flows
- Authorization checks

### Security Tests
- SSRF protection (all vectors)
- RBAC enforcement
- Input validation
- Encryption/decryption
- Rate limiting
- Audit logging

### Performance Tests
- Load testing (Artillery)
- Stress testing
- Cache effectiveness
- Database query performance

---

## 📦 Dependencies

### Gateway Server (Production)
- express: Web framework
- helmet: Security headers
- cors: CORS handling
- @supabase/supabase-js: Database client
- axios: HTTP client
- zod: Schema validation
- pino: Structured logging
- redis: Caching (optional)
- express-rate-limit: Rate limiting

### Gateway Server (Development)
- typescript: Type safety
- tsx: TS execution
- jest: Testing framework
- eslint: Code linting

### Admin Client
- react: UI framework
- react-router-dom: Routing
- react-bootstrap: UI components
- axios: API client
- @supabase/supabase-js: Auth client
- zod: Schema validation
- react-hook-form: Form handling

---

## 🚀 Development Workflow

1. **Local Setup**
   ```bash
   git clone repo
   cd gateway-server && npm install
   cd ../admin-client && npm install
   ```

2. **Database Migration**
   ```bash
   # Run in Supabase SQL Editor
   supabase/migrations/001_initial_schema.sql
   ```

3. **Environment Config**
   ```bash
   cp .env.example .env
   # Edit with your values
   ```

4. **Start Development**
   ```bash
   # Terminal 1: Gateway
   cd gateway-server && npm run dev
   
   # Terminal 2: Admin UI
   cd admin-client && npm run dev
   ```

5. **Run Tests**
   ```bash
   cd gateway-server
   npm test
   npm run test:security
   ```

6. **Build for Production**
   ```bash
   # Gateway
   cd gateway-server && npm run build
   
   # Admin UI
   cd admin-client && npm run build
   ```

---

## 📈 Metrics Tracked

- Request count by endpoint
- Request duration (p50, p95, p99)
- Error rate by status code
- Rate limit hits
- Circuit breaker states
- Cache hit/miss ratio
- Database query time
- Upstream API latency

---

## 🎯 Roadmap

### V1.0 (Current)
- ✅ Core gateway functionality
- ✅ Admin UI
- ✅ RBAC with 4 roles
- ✅ AES-256-GCM encryption
- ✅ SSRF protection
- ✅ Audit logging
- ✅ Rate limiting
- ✅ Circuit breaker

### V1.1 (Planned)
- [ ] GraphQL connector support
- [ ] Webhook support
- [ ] API key authentication
- [ ] Advanced caching strategies
- [ ] Metrics dashboard

### V2.0 (Future)
- [ ] WebSocket support
- [ ] Plugin system
- [ ] Multi-region deployment
- [ ] Advanced analytics
- [ ] AI-powered insights

---

**This is a production-grade, security-first API management system built with ISO 27001 compliance at its core.**
