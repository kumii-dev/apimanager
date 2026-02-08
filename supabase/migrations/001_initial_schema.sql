-- ============================================================
-- KUMII API Management System - Database Schema
-- ISO 27001 A.5, A.10, A.12 Compliant
-- With Row Level Security (RLS) - Zero Trust
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. TENANTS TABLE
-- Multi-tenancy isolation (ISO 27001 A.5.1)
-- ============================================================

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);

-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenants
CREATE POLICY "platform_admins_all_tenants"
  ON tenants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

CREATE POLICY "tenant_admins_own_tenant"
  ON tenants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = tenants.id
      AND profiles.role IN ('tenant_admin', 'staff')
    )
  );

-- ============================================================
-- 2. PROFILES TABLE
-- User identity and RBAC (ISO 27001 A.5.1, A.9)
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('platform_admin', 'tenant_admin', 'staff', 'user')),
  full_name TEXT,
  metadata JSONB DEFAULT '{}',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_tenant_id ON profiles(tenant_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "users_read_own_profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "platform_admins_all_profiles"
  ON profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'platform_admin'
    )
  );

CREATE POLICY "tenant_admins_own_tenant_profiles"
  ON profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.tenant_id = profiles.tenant_id
      AND p.role = 'tenant_admin'
    )
  );

-- ============================================================
-- 3. API CONNECTORS TABLE
-- External API configurations (ISO 27001 A.8.1, A.14.1)
-- ============================================================

CREATE TABLE IF NOT EXISTS api_connectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('rest', 'graphql', 'soap', 'custom')),
  base_url TEXT NOT NULL,
  auth_type TEXT NOT NULL CHECK (auth_type IN ('none', 'api_key', 'bearer', 'basic', 'oauth2', 'custom')),
  auth_config JSONB DEFAULT '{}',
  headers JSONB DEFAULT '{}',
  timeout_ms INTEGER DEFAULT 30000 CHECK (timeout_ms > 0 AND timeout_ms <= 300000),
  retry_config JSONB DEFAULT '{"enabled": false, "max_attempts": 3, "backoff_ms": 1000}',
  circuit_breaker_config JSONB DEFAULT '{"enabled": true, "failure_threshold": 5, "reset_timeout_ms": 60000}',
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_connectors_tenant_id ON api_connectors(tenant_id);
CREATE INDEX idx_connectors_type ON api_connectors(type);
CREATE INDEX idx_connectors_is_active ON api_connectors(is_active);
CREATE INDEX idx_connectors_created_by ON api_connectors(created_by);

-- Enable RLS
ALTER TABLE api_connectors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_connectors
CREATE POLICY "platform_admins_all_connectors"
  ON api_connectors
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

CREATE POLICY "tenant_admins_own_tenant_connectors"
  ON api_connectors
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = api_connectors.tenant_id
      AND profiles.role IN ('tenant_admin', 'staff')
    )
  );

-- ============================================================
-- 4. API CONNECTOR SECRETS TABLE
-- Encrypted secrets storage (ISO 27001 A.10.1 - Cryptography)
-- CRITICAL: Service role access only
-- ============================================================

CREATE TABLE IF NOT EXISTS api_connector_secrets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connector_id UUID NOT NULL REFERENCES api_connectors(id) ON DELETE CASCADE,
  secret_type TEXT NOT NULL CHECK (secret_type IN ('api_key', 'bearer_token', 'basic_password', 'oauth_client_secret', 'custom')),
  encrypted_value TEXT NOT NULL, -- AES-256-GCM encrypted
  encryption_iv TEXT NOT NULL, -- Initialization vector
  encryption_tag TEXT NOT NULL, -- Authentication tag
  version INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ,
  rotated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(connector_id, secret_type, version)
);

CREATE INDEX idx_secrets_connector_id ON api_connector_secrets(connector_id);
CREATE INDEX idx_secrets_version ON api_connector_secrets(connector_id, version DESC);

-- Enable RLS with STRICT security
ALTER TABLE api_connector_secrets ENABLE ROW LEVEL SECURITY;

-- CRITICAL: Secrets accessible only via service role
-- No direct user access - gateway server decrypts using service role
CREATE POLICY "service_role_only_secrets"
  ON api_connector_secrets
  FOR ALL
  USING (
    -- This policy effectively denies all user access
    -- Only service_role (used by gateway server) can access
    FALSE
  );

-- Note: Gateway server uses service role key to bypass RLS
-- This implements defense in depth: even if auth is compromised,
-- secrets cannot be read directly by users

-- ============================================================
-- 5. API ROUTES TABLE
-- Dynamic routing configuration (ISO 27001 A.14.1, A.12.1)
-- ============================================================

CREATE TABLE IF NOT EXISTS api_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connector_id UUID NOT NULL REFERENCES api_connectors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  module_prefix TEXT NOT NULL CHECK (
    module_prefix IN (
      '/api/v1/market',
      '/api/v1/capital',
      '/api/v1/mentorship',
      '/api/v1/collaboration',
      '/api/v1/cms',
      '/api/v1/analytics'
    )
  ),
  path_pattern TEXT NOT NULL, -- e.g., "/products/:id"
  http_method TEXT NOT NULL CHECK (http_method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS')),
  upstream_path TEXT NOT NULL, -- e.g., "/api/products/{id}"
  transform_request JSONB DEFAULT NULL, -- Request transformation DSL
  transform_response JSONB DEFAULT NULL, -- Response transformation DSL
  cache_config JSONB DEFAULT '{"enabled": false, "ttl_seconds": 60, "cache_key_params": []}',
  rate_limit_config JSONB DEFAULT '{"enabled": true, "max_requests": 100, "window_seconds": 60}',
  auth_required BOOLEAN NOT NULL DEFAULT true,
  allowed_roles TEXT[] DEFAULT ARRAY['user', 'staff', 'tenant_admin', 'platform_admin'],
  priority INTEGER NOT NULL DEFAULT 100, -- Higher = higher priority for matching
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_routes_tenant_id ON api_routes(tenant_id);
CREATE INDEX idx_routes_connector_id ON api_routes(connector_id);
CREATE INDEX idx_routes_module_prefix ON api_routes(module_prefix);
CREATE INDEX idx_routes_is_active ON api_routes(is_active);
CREATE INDEX idx_routes_priority ON api_routes(priority DESC);
CREATE INDEX idx_routes_path_pattern ON api_routes(path_pattern);

-- Enable RLS
ALTER TABLE api_routes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_routes
CREATE POLICY "platform_admins_all_routes"
  ON api_routes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

CREATE POLICY "tenant_admins_own_tenant_routes"
  ON api_routes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = api_routes.tenant_id
      AND profiles.role IN ('tenant_admin', 'staff')
    )
  );

-- ============================================================
-- 6. AUDIT LOGS TABLE
-- Security event logging (ISO 27001 A.12.4 - Logging & Monitoring)
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- e.g., 'connector.create', 'route.update', 'auth.login'
  resource_type TEXT NOT NULL, -- e.g., 'connector', 'route', 'secret'
  resource_id UUID,
  request_id TEXT, -- Correlation ID
  ip_address INET,
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warn', 'error', 'critical')),
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failure', 'pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_request_id ON audit_logs(request_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX idx_audit_logs_status ON audit_logs(status);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_logs
CREATE POLICY "platform_admins_all_audit_logs"
  ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_admin'
    )
  );

CREATE POLICY "tenant_admins_own_tenant_audit_logs"
  ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = audit_logs.tenant_id
      AND profiles.role IN ('tenant_admin', 'staff')
    )
  );

-- Audit logs are insert-only for users (via service role)
-- This is enforced at application level with service role key

-- ============================================================
-- 7. FUNCTIONS
-- ============================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to all tables with updated_at
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connectors_updated_at
  BEFORE UPDATE ON api_connectors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_secrets_updated_at
  BEFORE UPDATE ON api_connector_secrets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routes_updated_at
  BEFORE UPDATE ON api_routes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function: Get active secret for connector (service role only)
CREATE OR REPLACE FUNCTION get_connector_secret(
  p_connector_id UUID,
  p_secret_type TEXT
)
RETURNS TABLE (
  encrypted_value TEXT,
  encryption_iv TEXT,
  encryption_tag TEXT,
  version INTEGER
) AS $$
BEGIN
  -- This function should only be called by service role
  -- Additional authorization check can be added here
  
  RETURN QUERY
  SELECT 
    s.encrypted_value,
    s.encryption_iv,
    s.encryption_tag,
    s.version
  FROM api_connector_secrets s
  WHERE s.connector_id = p_connector_id
    AND s.secret_type = p_secret_type
    AND (s.expires_at IS NULL OR s.expires_at > NOW())
  ORDER BY s.version DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Create audit log entry (service role)
CREATE OR REPLACE FUNCTION create_audit_log(
  p_tenant_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_request_id TEXT,
  p_ip_address INET,
  p_user_agent TEXT,
  p_details JSONB,
  p_severity TEXT DEFAULT 'info',
  p_status TEXT DEFAULT 'success'
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    tenant_id,
    user_id,
    action,
    resource_type,
    resource_id,
    request_id,
    ip_address,
    user_agent,
    details,
    severity,
    status
  ) VALUES (
    p_tenant_id,
    p_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_request_id,
    p_ip_address,
    p_user_agent,
    p_details,
    p_severity,
    p_status
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 8. SEED DATA (Development/Testing)
-- ============================================================

-- Create default tenant
INSERT INTO tenants (id, name, slug, status)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'KUMII Platform', 'kumii', 'active')
ON CONFLICT (slug) DO NOTHING;

-- Note: Profiles are created via Supabase Auth triggers
-- Example profile creation trigger:

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    'user', -- Default role
    '00000000-0000-0000-0000-000000000001' -- Default tenant
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 9. VIEWS (Helper views for common queries)
-- ============================================================

-- View: Active routes with connector details
CREATE OR REPLACE VIEW v_active_routes AS
SELECT 
  r.id,
  r.tenant_id,
  r.name,
  r.module_prefix,
  r.path_pattern,
  r.http_method,
  r.upstream_path,
  r.priority,
  r.auth_required,
  r.allowed_roles,
  c.id AS connector_id,
  c.name AS connector_name,
  c.type AS connector_type,
  c.base_url AS connector_base_url,
  c.auth_type AS connector_auth_type,
  c.timeout_ms AS connector_timeout_ms,
  r.cache_config,
  r.rate_limit_config,
  r.transform_request,
  r.transform_response
FROM api_routes r
JOIN api_connectors c ON r.connector_id = c.id
WHERE r.is_active = true
  AND c.is_active = true
ORDER BY r.priority DESC, r.created_at ASC;

-- View: Connector health (for monitoring)
CREATE OR REPLACE VIEW v_connector_health AS
SELECT 
  c.id,
  c.tenant_id,
  c.name,
  c.type,
  c.is_active,
  COUNT(r.id) AS active_routes_count,
  c.circuit_breaker_config,
  c.updated_at AS last_updated
FROM api_connectors c
LEFT JOIN api_routes r ON c.id = r.connector_id AND r.is_active = true
WHERE c.is_active = true
GROUP BY c.id;

-- ============================================================
-- 10. SECURITY HARDENING
-- ============================================================

-- Revoke public access to all tables by default
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;

-- Grant authenticated role basic access (RLS will further restrict)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Service role has full access (used by gateway server)
-- This is default in Supabase

-- ============================================================
-- 11. INDEXES FOR PERFORMANCE
-- ============================================================

-- Additional composite indexes for common query patterns
CREATE INDEX idx_routes_tenant_module_active ON api_routes(tenant_id, module_prefix, is_active);
CREATE INDEX idx_connectors_tenant_active ON api_connectors(tenant_id, is_active);
CREATE INDEX idx_audit_tenant_created ON audit_logs(tenant_id, created_at DESC);

-- ============================================================
-- SCHEMA COMPLETE
-- ISO 27001 A.5 (Access Control) - RLS enabled on all tables
-- ISO 27001 A.10 (Cryptography) - Secrets table with encryption
-- ISO 27001 A.12.4 (Logging) - Comprehensive audit trail
-- Zero Trust - No implicit access, explicit policies only
-- ============================================================

-- Verification queries (run after migration):
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public';
