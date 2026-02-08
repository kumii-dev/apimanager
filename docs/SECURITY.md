# Security Documentation

## ISO 27001:2022 Control Implementation

### A.5 Access Control

#### A.5.1 Business Requirements

**Control**: Access to information and systems shall be controlled based on business and security requirements.

**Implementation**:
- ✅ Role-Based Access Control (RBAC) with 4 roles:
  - `platform_admin`: Full system access
  - `tenant_admin`: Tenant-level management
  - `staff`: Read-only access
  - `user`: API usage only
- ✅ Row Level Security (RLS) in PostgreSQL
- ✅ JWT-based authentication via Supabase Auth
- ✅ Zero Trust architecture (every request verified)
- ✅ Least privilege principle enforced

**Testing**:
```bash
# Test RBAC enforcement
npm run test -- auth.test.ts

# Verify RLS policies
psql -f supabase/migrations/001_initial_schema.sql --dry-run
```

#### A.5.2 User Access Management

**Control**: Formal user access provisioning process.

**Implementation**:
- ✅ User onboarding via Supabase Auth
- ✅ Automatic profile creation with trigger
- ✅ Default role assignment (`user`)
- ✅ Admin-controlled role elevation
- ✅ Audit trail for all access changes

---

### A.10 Cryptography

#### A.10.1.1 Cryptographic Controls

**Control**: Use cryptography to protect confidentiality and integrity.

**Implementation**:
- ✅ AES-256-GCM for secrets encryption
- ✅ Random IV per encryption (prevents pattern analysis)
- ✅ Authentication tag (prevents tampering)
- ✅ Master key from environment (KMS_MASTER_KEY)
- ✅ TLS 1.2+ for all communications
- ✅ Secure key storage (never in code/logs)

**Code Reference**:
```typescript
// gateway-server/src/services/crypto.ts
export class CryptoService {
  encrypt(plaintext: string): EncryptedData {
    // AES-256-GCM implementation
  }
}
```

#### A.10.1.2 Key Management

**Control**: Manage cryptographic keys throughout their lifecycle.

**Implementation**:
- ✅ Master key generation: `crypto.randomBytes(32)`
- ✅ Secret rotation via API endpoint
- ✅ Version tracking for secrets
- ✅ Automatic expiration support
- ✅ Secure key storage (environment variables)
- ✅ Key access audit logging

**Key Generation**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

### A.12 Operations Security

#### A.12.1 Operational Procedures

**Control**: Ensure correct and secure operations.

**Implementation**:
- ✅ Rate limiting (100 req/min default)
- ✅ Request size limits (10MB default)
- ✅ Request timeout (30s default)
- ✅ Circuit breaker pattern
- ✅ Graceful degradation
- ✅ Health checks (`/health`, `/readiness`)

**Configuration**:
```env
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
REQUEST_SIZE_LIMIT=10mb
REQUEST_TIMEOUT_MS=30000
```

#### A.12.4 Logging and Monitoring

**Control**: Log events and generate evidence.

**Implementation**:
- ✅ Structured logging (Pino)
- ✅ Correlation IDs (X-Request-ID)
- ✅ Automatic redaction of secrets
- ✅ Security event logging:
  - Authentication attempts
  - Authorization failures
  - Admin actions
  - Secret rotations
  - Rate limit hits
  - SSRF attempts
- ✅ Centralized audit trail (database)
- ✅ Log retention policy

**Audit Events**:
```typescript
auditLogger.logSecurityEvent({
  action: 'security.ssrf_attempt',
  userId: req.user?.id,
  ipAddress: req.ip,
  details: { url: suspiciousUrl },
  severity: 'critical',
});
```

---

### A.14 Secure Development

#### A.14.2 Security in Development

**Control**: Secure development lifecycle.

**Implementation**:
- ✅ Input validation with Zod (all endpoints)
- ✅ Output encoding
- ✅ SSRF protection
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS prevention (React escaping + CSP)
- ✅ CSRF protection (SameSite cookies)
- ✅ Prototype pollution prevention
- ✅ Safe transformation DSL (no eval)
- ✅ Dependency scanning (`npm audit`)
- ✅ Type safety (TypeScript strict mode)

**Validation Example**:
```typescript
const connectorSchema = z.object({
  name: z.string().min(1).max(255),
  base_url: z.string().url(),
  auth_type: z.enum(['none', 'api_key', 'bearer', 'basic', 'oauth2']),
});
```

---

## OWASP ASVS Level 2+ Compliance

### V2: Authentication

- ✅ V2.1.1: User credentials never logged
- ✅ V2.1.2: Password/secret transmitted over TLS only
- ✅ V2.1.4: Secure password reset (via Supabase)
- ✅ V2.2.1: Anti-automation controls (rate limiting)
- ✅ V2.5.1: Secure session management (JWT)
- ✅ V2.7.1: Service authentication (service role key)

### V3: Session Management

- ✅ V3.2.1: Fresh authentication for sensitive operations
- ✅ V3.3.1: Logout invalidates session tokens
- ✅ V3.5.2: Encrypted secrets at rest

### V4: Access Control

- ✅ V4.1.1: Least privilege principle
- ✅ V4.1.3: Deny by default
- ✅ V4.1.5: Access control enforced on server
- ✅ V4.2.1: RBAC enforcement
- ✅ V4.3.1: Administrative interfaces segregated

### V5: Validation, Sanitization, Encoding

- ✅ V5.1.1: Input validation on trusted server
- ✅ V5.1.3: URL validation (SSRF protection)
- ✅ V5.1.4: Structured data validation (Zod)
- ✅ V5.2.3: Auto-escaping (React)
- ✅ V5.3.1: Output encoding

### V7: Error Handling & Logging

- ✅ V7.1.1: No sensitive data in errors
- ✅ V7.1.2: Useful error messages (non-technical)
- ✅ V7.2.1: Security event logging
- ✅ V7.3.1: Log integrity (append-only audit table)

### V8: Data Protection

- ✅ V8.2.1: Client-side sensitive data protection
- ✅ V8.2.2: No sensitive data in browser storage
- ✅ V8.2.3: Authenticated data removed on logout
- ✅ V8.3.4: Secrets encrypted with strong algorithms

### V10: Malicious Code

- ✅ V10.2.1: No unsafe functions (eval, Function)
- ✅ V10.3.2: Integrity checks (subresource integrity)
- ✅ V10.3.3: Dependency vulnerability scanning

### V12: Files and Resources

- ✅ V12.5.1: SSRF validation
- ✅ V12.5.2: URL parsing uses safe libraries
- ✅ V12.6.1: Adequate HTTP response headers

### V14: Configuration

- ✅ V14.1.1: Secure TLS configuration
- ✅ V14.2.1: Out-of-band deployment
- ✅ V14.3.3: Debug features disabled in production
- ✅ V14.4.1: HTTP headers set securely

---

## OWASP Top 10 2021 Mitigations

### A01:2021 – Broken Access Control

**Mitigations**:
- ✅ RBAC with 4 distinct roles
- ✅ Row Level Security (RLS) in database
- ✅ Tenant isolation at DB and API level
- ✅ Authorization checks on every request
- ✅ No IDOR vulnerabilities (UUIDs + RLS)

### A02:2021 – Cryptographic Failures

**Mitigations**:
- ✅ AES-256-GCM for encryption at rest
- ✅ TLS 1.2+ for data in transit
- ✅ No sensitive data in logs (redaction)
- ✅ Secure key management (KMS)
- ✅ Strong random number generation

### A03:2021 – Injection

**Mitigations**:
- ✅ Parameterized queries (Supabase client)
- ✅ Input validation with Zod
- ✅ No eval or unsafe deserialization
- ✅ Safe transformation DSL
- ✅ Command injection prevention

### A04:2021 – Insecure Design

**Mitigations**:
- ✅ Zero Trust architecture
- ✅ Defense in depth (multiple layers)
- ✅ Secure by default configuration
- ✅ Threat modeling (SSRF, IDOR, etc.)
- ✅ Rate limiting and circuit breakers

### A05:2021 – Security Misconfiguration

**Mitigations**:
- ✅ Helmet security headers
- ✅ CORS allowlist (no wildcards)
- ✅ Secure defaults in configuration
- ✅ Development mode safeguards
- ✅ Error messages don't leak info
- ✅ Dependency vulnerability scanning

### A06:2021 – Vulnerable Components

**Mitigations**:
- ✅ Regular `npm audit` checks
- ✅ Automated dependency updates
- ✅ Minimal dependencies
- ✅ Known-good versions pinned
- ✅ Supply chain security practices

### A07:2021 – Identification & Authentication Failures

**Mitigations**:
- ✅ Strong authentication (Supabase Auth)
- ✅ MFA support (via Supabase)
- ✅ Rate limiting on auth endpoints
- ✅ No credential stuffing (rate limits)
- ✅ Secure session management (JWT)

### A08:2021 – Software & Data Integrity Failures

**Mitigations**:
- ✅ Audit logging (tamper-evident)
- ✅ Signed JWTs (integrity)
- ✅ Input validation (integrity checks)
- ✅ Version control for configs
- ✅ No unsafe deserialization

### A09:2021 – Security Logging & Monitoring Failures

**Mitigations**:
- ✅ Comprehensive audit logging
- ✅ Security event monitoring
- ✅ Correlation IDs for tracing
- ✅ Metrics endpoint for monitoring
- ✅ Alerting on suspicious activity
- ✅ Log retention and analysis

### A10:2021 – Server-Side Request Forgery (SSRF)

**Mitigations**:
- ✅ Dedicated SSRF protection service
- ✅ URL validation and sanitization
- ✅ Private IP range blocking (RFC 1918)
- ✅ DNS rebinding protection
- ✅ Metadata endpoint blocking
- ✅ Protocol allowlist (HTTP/HTTPS only)
- ✅ Audit logging of attempts

**Blocked CIDRs**:
- `10.0.0.0/8` (Private)
- `172.16.0.0/12` (Private)
- `192.168.0.0/16` (Private)
- `127.0.0.0/8` (Loopback)
- `169.254.0.0/16` (Link-local)

**Blocked Hostnames**:
- `localhost`
- `metadata.google.internal`
- DNS rebinding patterns (*.nip.io, *.xip.io, *.sslip.io)

---

## CIS Critical Security Controls v8

### CIS 2: Inventory and Control of Software Assets

- ✅ `package.json` locks dependencies
- ✅ `npm audit` in CI/CD pipeline
- ✅ Regular dependency updates
- ✅ Minimal attack surface (few dependencies)

### CIS 3: Data Protection

- ✅ Data at rest encryption (AES-256-GCM)
- ✅ Data in transit encryption (TLS 1.2+)
- ✅ Secret segregation (separate table)
- ✅ Access controls (RLS)
- ✅ Data retention policies

### CIS 5: Account Management

- ✅ RBAC with 4 roles
- ✅ Least privilege
- ✅ Centralized authentication (Supabase)
- ✅ MFA support
- ✅ Account lifecycle management

### CIS 6: Access Control Management

- ✅ Authentication required (default)
- ✅ Authorization on every request
- ✅ Tenant isolation
- ✅ Session management
- ✅ Admin segregation

### CIS 8: Audit Log Management

- ✅ Comprehensive logging
- ✅ Centralized audit trail
- ✅ Tamper-evident logs
- ✅ Log correlation (request IDs)
- ✅ Security event monitoring
- ✅ Log retention

---

## Security Testing

### Automated Tests

```bash
# Run all security tests
npm run test:security

# Test SSRF protection
npm test -- ssrf.test.ts

# Test RBAC enforcement
npm test -- auth.test.ts

# Test input validation
npm test -- validation.test.ts

# Test circuit breaker
npm test -- circuit.test.ts
```

### Manual Security Checklist

- [ ] SSRF protection (try localhost, 127.0.0.1, 10.0.0.1)
- [ ] RBAC (try accessing admin endpoints as user)
- [ ] Rate limiting (send 101 requests in 60s)
- [ ] Input validation (send invalid JSON, XSS payloads)
- [ ] SQL injection (try in query params)
- [ ] IDOR (try accessing other tenant's resources)
- [ ] Secret leakage (check logs for secrets)
- [ ] CORS (test from unauthorized origin)

### Penetration Testing

Recommended tools:
- **OWASP ZAP**: Automated security scanning
- **Burp Suite**: Manual testing
- **SQLMap**: SQL injection testing
- **Nikto**: Web server scanning

---

## Incident Response

### Security Event Severity

| Level | Description | Response Time |
|-------|-------------|---------------|
| **Critical** | Active attack, data breach | Immediate |
| **Error** | Failed security control | < 1 hour |
| **Warn** | Suspicious activity | < 4 hours |
| **Info** | Normal security event | Monitor |

### Response Procedures

1. **Detection**: Monitor audit logs and metrics
2. **Analysis**: Investigate using correlation IDs
3. **Containment**: Disable affected resources (circuit breaker)
4. **Eradication**: Fix vulnerability, rotate secrets
5. **Recovery**: Re-enable services, verify integrity
6. **Lessons Learned**: Update controls, document

---

## Compliance Checklist

### Pre-Production

- [ ] All tests passing (including security tests)
- [ ] No `npm audit` warnings
- [ ] KMS_MASTER_KEY generated and secured
- [ ] TLS certificates valid
- [ ] RLS enabled on all tables
- [ ] CORS allowlist configured (no localhost in prod)
- [ ] Rate limits appropriate for traffic
- [ ] Monitoring and alerting configured
- [ ] Backup strategy in place
- [ ] Incident response plan documented

### Ongoing

- [ ] Monthly security review
- [ ] Quarterly penetration testing
- [ ] Dependency updates (weekly)
- [ ] Log analysis (daily)
- [ ] Access review (monthly)
- [ ] Secret rotation (quarterly)
- [ ] Disaster recovery tests (quarterly)

---

## Security Contact

**Email**: security@kumii.com

**PGP Key**: [Available on request]

**Response Time**: < 24 hours for security issues

---

**Last Updated**: 2024-01-15
**Next Review**: 2024-04-15
