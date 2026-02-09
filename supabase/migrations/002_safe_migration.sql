-- ============================================================
-- SAFE MIGRATION - Only creates missing objects
-- Checks for existence before creating
-- ============================================================

-- Enable required extensions (safe - IF NOT EXISTS)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Drop and recreate indexes (safe approach)
-- ============================================================

-- Tenants indexes
DROP INDEX IF EXISTS idx_tenants_slug;
DROP INDEX IF EXISTS idx_tenants_status;
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- Profiles indexes
DROP INDEX IF EXISTS idx_profiles_tenant_id;
DROP INDEX IF EXISTS idx_profiles_role;
DROP INDEX IF EXISTS idx_profiles_email;
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- API Connectors indexes
DROP INDEX IF EXISTS idx_connectors_tenant_id;
DROP INDEX IF EXISTS idx_connectors_type;
DROP INDEX IF EXISTS idx_connectors_is_active;
DROP INDEX IF EXISTS idx_connectors_created_by;
CREATE INDEX IF NOT EXISTS idx_connectors_tenant_id ON api_connectors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_connectors_type ON api_connectors(type);
CREATE INDEX IF NOT EXISTS idx_connectors_is_active ON api_connectors(is_active);
CREATE INDEX IF NOT EXISTS idx_connectors_created_by ON api_connectors(created_by);

-- API Connector Secrets indexes
DROP INDEX IF EXISTS idx_secrets_connector_id;
DROP INDEX IF EXISTS idx_secrets_version;
CREATE INDEX IF NOT EXISTS idx_secrets_connector_id ON api_connector_secrets(connector_id);
CREATE INDEX IF NOT EXISTS idx_secrets_version ON api_connector_secrets(connector_id, version DESC);

-- API Routes indexes
DROP INDEX IF EXISTS idx_routes_tenant_id;
DROP INDEX IF EXISTS idx_routes_connector_id;
DROP INDEX IF EXISTS idx_routes_module_prefix;
DROP INDEX IF EXISTS idx_routes_is_active;
DROP INDEX IF EXISTS idx_routes_priority;
DROP INDEX IF EXISTS idx_routes_path_pattern;
CREATE INDEX IF NOT EXISTS idx_routes_tenant_id ON api_routes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_routes_connector_id ON api_routes(connector_id);
CREATE INDEX IF NOT EXISTS idx_routes_module_prefix ON api_routes(module_prefix);
CREATE INDEX IF NOT EXISTS idx_routes_is_active ON api_routes(is_active);
CREATE INDEX IF NOT EXISTS idx_routes_priority ON api_routes(priority DESC);
CREATE INDEX IF NOT EXISTS idx_routes_path_pattern ON api_routes(path_pattern);

-- Audit Logs indexes
DROP INDEX IF EXISTS idx_audit_logs_tenant_id;
DROP INDEX IF EXISTS idx_audit_logs_user_id;
DROP INDEX IF EXISTS idx_audit_logs_action;
DROP INDEX IF EXISTS idx_audit_logs_resource_type;
DROP INDEX IF EXISTS idx_audit_logs_request_id;
DROP INDEX IF EXISTS idx_audit_logs_created_at;
DROP INDEX IF EXISTS idx_audit_logs_severity;
DROP INDEX IF EXISTS idx_audit_logs_status;
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);

-- Composite indexes
DROP INDEX IF EXISTS idx_routes_tenant_module_active;
DROP INDEX IF EXISTS idx_connectors_tenant_active;
DROP INDEX IF EXISTS idx_audit_tenant_created;
CREATE INDEX IF NOT EXISTS idx_routes_tenant_module_active ON api_routes(tenant_id, module_prefix, is_active);
CREATE INDEX IF NOT EXISTS idx_connectors_tenant_active ON api_connectors(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_created ON audit_logs(tenant_id, created_at DESC);

-- ============================================================
-- Enable RLS (safe - no error if already enabled)
-- ============================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_connector_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Create RLS Policies (with DROP IF EXISTS)
-- ============================================================

-- Tenants Policies
DROP POLICY IF EXISTS "platform_admins_all_tenants" ON tenants;
CREATE POLICY "platform_admins_all_tenants"
  ON tenants
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE role = 'platform_admin'
    )
  );

DROP POLICY IF EXISTS "tenant_admins_own_tenant" ON tenants;
CREATE POLICY "tenant_admins_own_tenant"
  ON tenants
  FOR SELECT
  USING (
    id IN (
      SELECT tenant_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('tenant_admin', 'staff')
    )
  );

-- Profiles Policies
DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
CREATE POLICY "users_read_own_profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "platform_admins_all_profiles" ON profiles;
CREATE POLICY "platform_admins_all_profiles"
  ON profiles
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE role = 'platform_admin'
    )
  );

DROP POLICY IF EXISTS "tenant_admins_own_tenant_profiles" ON profiles;
CREATE POLICY "tenant_admins_own_tenant_profiles"
  ON profiles
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles
      WHERE id = auth.uid()
      AND role = 'tenant_admin'
    )
  );

-- API Connectors Policies
DROP POLICY IF EXISTS "platform_admins_all_connectors" ON api_connectors;
CREATE POLICY "platform_admins_all_connectors"
  ON api_connectors
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE role = 'platform_admin'
    )
  );

DROP POLICY IF EXISTS "tenant_admins_own_tenant_connectors" ON api_connectors;
CREATE POLICY "tenant_admins_own_tenant_connectors"
  ON api_connectors
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('tenant_admin', 'staff')
    )
  );

-- API Connector Secrets Policies
DROP POLICY IF EXISTS "service_role_only_secrets" ON api_connector_secrets;
CREATE POLICY "service_role_only_secrets"
  ON api_connector_secrets
  FOR ALL
  USING (FALSE); -- Service role only

-- API Routes Policies
DROP POLICY IF EXISTS "platform_admins_all_routes" ON api_routes;
CREATE POLICY "platform_admins_all_routes"
  ON api_routes
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE role = 'platform_admin'
    )
  );

DROP POLICY IF EXISTS "tenant_admins_own_tenant_routes" ON api_routes;
CREATE POLICY "tenant_admins_own_tenant_routes"
  ON api_routes
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('tenant_admin', 'staff')
    )
  );

-- Audit Logs Policies
DROP POLICY IF EXISTS "platform_admins_all_audit_logs" ON audit_logs;
CREATE POLICY "platform_admins_all_audit_logs"
  ON audit_logs
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE role = 'platform_admin'
    )
  );

DROP POLICY IF EXISTS "tenant_admins_own_tenant_audit_logs" ON audit_logs;
CREATE POLICY "tenant_admins_own_tenant_audit_logs"
  ON audit_logs
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('tenant_admin', 'staff')
    )
  );

-- ============================================================
-- Functions (with CREATE OR REPLACE)
-- ============================================================

-- Update updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply triggers (drop first to avoid duplicates)
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_connectors_updated_at ON api_connectors;
CREATE TRIGGER update_connectors_updated_at
  BEFORE UPDATE ON api_connectors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_secrets_updated_at ON api_connector_secrets;
CREATE TRIGGER update_secrets_updated_at
  BEFORE UPDATE ON api_connector_secrets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_routes_updated_at ON api_routes;
CREATE TRIGGER update_routes_updated_at
  BEFORE UPDATE ON api_routes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Get connector secret function
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

-- Create audit log function
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
    tenant_id, user_id, action, resource_type, resource_id,
    request_id, ip_address, user_agent, details, severity, status
  ) VALUES (
    p_tenant_id, p_user_id, p_action, p_resource_type, p_resource_id,
    p_request_id, p_ip_address, p_user_agent, p_details, p_severity, p_status
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Handle new user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    'user',
    '00000000-0000-0000-0000-000000000001'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Views (with CREATE OR REPLACE)
-- ============================================================

CREATE OR REPLACE VIEW v_active_routes AS
SELECT 
  r.id, r.tenant_id, r.name, r.module_prefix, r.path_pattern,
  r.http_method, r.upstream_path, r.priority, r.auth_required, r.allowed_roles,
  c.id AS connector_id, c.name AS connector_name, c.type AS connector_type,
  c.base_url AS connector_base_url, c.auth_type AS connector_auth_type,
  c.timeout_ms AS connector_timeout_ms, r.cache_config, r.rate_limit_config,
  r.transform_request, r.transform_response
FROM api_routes r
JOIN api_connectors c ON r.connector_id = c.id
WHERE r.is_active = true AND c.is_active = true
ORDER BY r.priority DESC, r.created_at ASC;

CREATE OR REPLACE VIEW v_connector_health AS
SELECT 
  c.id, c.tenant_id, c.name, c.type, c.is_active,
  COUNT(r.id) AS active_routes_count,
  c.circuit_breaker_config, c.updated_at AS last_updated
FROM api_connectors c
LEFT JOIN api_routes r ON c.id = r.connector_id AND r.is_active = true
WHERE c.is_active = true
GROUP BY c.id;

-- ============================================================
-- Seed data
-- ============================================================

INSERT INTO tenants (id, name, slug, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'KUMII Platform', 'kumii', 'active')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Grant permissions
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

SELECT 'Migration completed successfully!' AS status;
