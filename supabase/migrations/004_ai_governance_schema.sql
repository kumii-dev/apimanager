-- Migration: AI Governance Schema (Full NIST AI RMF Implementation)
-- Date: 2026-02-14
-- Description: Comprehensive schema for AI governance, monitoring, and compliance

-- ============================================================================
-- TABLE: ai_monitoring_metrics
-- Purpose: Store real-time AI model performance and fairness metrics
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_monitoring_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connector_id UUID NOT NULL REFERENCES api_connectors(id) ON DELETE CASCADE,
  
  -- Metric identification
  metric_type TEXT NOT NULL CHECK (metric_type IN (
    'accuracy', 'precision', 'recall', 'f1_score',
    'bias_score', 'fairness_score', 'demographic_parity',
    'equal_opportunity', 'calibration',
    'latency', 'throughput', 'error_rate'
  )),
  metric_category TEXT NOT NULL CHECK (metric_category IN (
    'performance', 'fairness', 'reliability', 'efficiency'
  )),
  
  -- Metric values
  metric_value NUMERIC NOT NULL,
  threshold_min NUMERIC,
  threshold_max NUMERIC,
  is_within_threshold BOOLEAN GENERATED ALWAYS AS (
    (threshold_min IS NULL OR metric_value >= threshold_min) AND
    (threshold_max IS NULL OR metric_value <= threshold_max)
  ) STORED,
  
  -- Demographic breakdown (for fairness metrics)
  demographic_group TEXT,
  comparison_group TEXT,
  
  -- Context
  model_version TEXT,
  data_sample_size INTEGER,
  confidence_interval NUMERIC,
  
  -- Metadata
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for monitoring queries
CREATE INDEX idx_monitoring_connector ON ai_monitoring_metrics(connector_id, measured_at DESC);
CREATE INDEX idx_monitoring_tenant ON ai_monitoring_metrics(tenant_id, measured_at DESC);
CREATE INDEX idx_monitoring_type ON ai_monitoring_metrics(metric_type, measured_at DESC);
CREATE INDEX idx_monitoring_threshold_violations ON ai_monitoring_metrics(connector_id, is_within_threshold) WHERE is_within_threshold = false;

COMMENT ON TABLE ai_monitoring_metrics IS 'Real-time AI model performance and fairness metrics';
COMMENT ON COLUMN ai_monitoring_metrics.is_within_threshold IS 'Auto-calculated: true if metric is within acceptable thresholds';

-- ============================================================================
-- TABLE: ai_risk_assessments
-- Purpose: Detailed risk assessments and impact analysis
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_risk_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connector_id UUID NOT NULL REFERENCES api_connectors(id) ON DELETE CASCADE,
  
  -- Assessment metadata
  assessment_version TEXT NOT NULL,
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  assessor_id UUID REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('draft', 'in_review', 'approved', 'rejected', 'archived')),
  
  -- Risk scoring (NIST AI RMF aligned)
  overall_risk_score NUMERIC CHECK (overall_risk_score >= 0 AND overall_risk_score <= 100),
  impact_score NUMERIC CHECK (impact_score >= 0 AND impact_score <= 10),
  likelihood_score NUMERIC CHECK (likelihood_score >= 0 AND likelihood_score <= 10),
  
  -- NIST AI RMF Categories Assessment
  govern_score NUMERIC CHECK (govern_score >= 0 AND govern_score <= 100),
  map_score NUMERIC CHECK (map_score >= 0 AND map_score <= 100),
  measure_score NUMERIC CHECK (measure_score >= 0 AND measure_score <= 100),
  manage_score NUMERIC CHECK (manage_score >= 0 AND manage_score <= 100),
  
  -- Impact areas
  affected_populations TEXT[],
  harm_types TEXT[] CHECK (harm_types <@ ARRAY[
    'discrimination', 'privacy_violation', 'safety_risk',
    'security_risk', 'misinformation', 'economic_harm',
    'psychological_harm', 'environmental_harm'
  ]),
  
  -- Risk description
  risk_description TEXT,
  impact_analysis TEXT,
  likelihood_rationale TEXT,
  
  -- Mitigation
  mitigation_measures TEXT[],
  residual_risk_level TEXT CHECK (residual_risk_level IN ('low', 'medium', 'high', 'critical')),
  mitigation_effectiveness TEXT,
  
  -- Review and approval
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  approval_notes TEXT,
  next_review_date DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_risk_assessments_connector ON ai_risk_assessments(connector_id, assessment_date DESC);
CREATE INDEX idx_risk_assessments_tenant ON ai_risk_assessments(tenant_id, assessment_date DESC);
CREATE INDEX idx_risk_assessments_status ON ai_risk_assessments(status, assessment_date DESC);

COMMENT ON TABLE ai_risk_assessments IS 'Detailed AI risk assessments aligned with NIST AI RMF';

-- ============================================================================
-- TABLE: ai_incidents
-- Purpose: Track AI system incidents, failures, and adverse events
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connector_id UUID NOT NULL REFERENCES api_connectors(id) ON DELETE CASCADE,
  
  -- Incident classification
  incident_type TEXT NOT NULL CHECK (incident_type IN (
    'bias_detected', 'fairness_violation', 'performance_degradation',
    'security_breach', 'privacy_leak', 'safety_incident',
    'incorrect_prediction', 'system_failure', 'other'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL CHECK (status IN ('open', 'investigating', 'resolved', 'closed', 'false_alarm')),
  
  -- Incident details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  detected_by TEXT, -- 'automated' or user name
  
  -- Impact
  users_affected INTEGER,
  data_records_affected INTEGER,
  financial_impact NUMERIC,
  harm_caused TEXT[],
  
  -- Resolution
  root_cause TEXT,
  resolution_steps TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  preventive_measures TEXT[],
  
  -- Related data
  related_assessment_id UUID REFERENCES ai_risk_assessments(id),
  related_incident_ids UUID[],
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_incidents_connector ON ai_incidents(connector_id, detected_at DESC);
CREATE INDEX idx_incidents_tenant ON ai_incidents(tenant_id, detected_at DESC);
CREATE INDEX idx_incidents_severity ON ai_incidents(severity, status, detected_at DESC);
CREATE INDEX idx_incidents_status ON ai_incidents(status, detected_at DESC);

COMMENT ON TABLE ai_incidents IS 'Track AI system incidents and adverse events';

-- ============================================================================
-- TABLE: ai_compliance_reports
-- Purpose: Generate and store NIST AI RMF compliance reports
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_compliance_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Report scope
  report_type TEXT NOT NULL CHECK (report_type IN (
    'full_nist_rmf', 'govern_only', 'map_only', 'measure_only', 'manage_only',
    'connector_specific', 'tenant_wide', 'custom'
  )),
  scope_connector_ids UUID[],
  
  -- Report metadata
  report_title TEXT NOT NULL,
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by UUID REFERENCES users(id),
  
  -- Compliance status
  overall_compliance_score NUMERIC CHECK (overall_compliance_score >= 0 AND overall_compliance_score <= 100),
  nist_categories_assessed TEXT[],
  compliant_categories TEXT[],
  non_compliant_categories TEXT[],
  
  -- Report content (stored as JSON for flexibility)
  executive_summary TEXT,
  findings JSONB, -- Structured findings data
  recommendations JSONB, -- Action items and recommendations
  metrics_summary JSONB, -- Aggregated metrics
  incidents_summary JSONB, -- Incident statistics
  
  -- Report file
  report_file_url TEXT,
  report_format TEXT CHECK (report_format IN ('pdf', 'html', 'json', 'markdown')),
  
  -- Review and approval
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  approval_status TEXT CHECK (approval_status IN ('draft', 'pending_review', 'approved', 'rejected')),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_compliance_reports_tenant ON ai_compliance_reports(tenant_id, generated_at DESC);
CREATE INDEX idx_compliance_reports_period ON ai_compliance_reports(report_period_start, report_period_end);
CREATE INDEX idx_compliance_reports_status ON ai_compliance_reports(approval_status, generated_at DESC);

COMMENT ON TABLE ai_compliance_reports IS 'NIST AI RMF compliance reports and documentation';

-- ============================================================================
-- TABLE: ai_model_versions
-- Purpose: Track AI model versions, deployments, and lineage
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_model_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connector_id UUID NOT NULL REFERENCES api_connectors(id) ON DELETE CASCADE,
  
  -- Version information
  version_number TEXT NOT NULL,
  version_name TEXT,
  model_type TEXT, -- e.g., 'classification', 'regression', 'generative', 'recommendation'
  model_architecture TEXT, -- e.g., 'transformer', 'cnn', 'random_forest'
  
  -- Deployment status
  status TEXT NOT NULL CHECK (status IN ('development', 'testing', 'staging', 'production', 'deprecated', 'retired')),
  deployed_at TIMESTAMPTZ,
  deployed_by UUID REFERENCES users(id),
  deprecated_at TIMESTAMPTZ,
  
  -- Training information
  training_dataset_name TEXT,
  training_dataset_size INTEGER,
  training_start_date DATE,
  training_end_date DATE,
  training_duration_hours NUMERIC,
  
  -- Performance metrics (baseline)
  baseline_accuracy NUMERIC,
  baseline_precision NUMERIC,
  baseline_recall NUMERIC,
  baseline_f1_score NUMERIC,
  baseline_bias_score NUMERIC,
  
  -- Model artifacts
  model_file_url TEXT,
  config_file_url TEXT,
  documentation_url TEXT,
  
  -- Lineage
  parent_version_id UUID REFERENCES ai_model_versions(id),
  change_description TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(connector_id, version_number)
);

CREATE INDEX idx_model_versions_connector ON ai_model_versions(connector_id, deployed_at DESC);
CREATE INDEX idx_model_versions_status ON ai_model_versions(status, deployed_at DESC);

COMMENT ON TABLE ai_model_versions IS 'Track AI model versions and deployment history';

-- ============================================================================
-- TABLE: ai_fairness_tests
-- Purpose: Record results of fairness testing and bias audits
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_fairness_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connector_id UUID NOT NULL REFERENCES api_connectors(id) ON DELETE CASCADE,
  model_version_id UUID REFERENCES ai_model_versions(id),
  
  -- Test metadata
  test_name TEXT NOT NULL,
  test_type TEXT NOT NULL CHECK (test_type IN (
    'demographic_parity', 'equal_opportunity', 'equalized_odds',
    'predictive_parity', 'calibration', 'individual_fairness',
    'group_fairness', 'custom'
  )),
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  tested_by UUID REFERENCES users(id),
  
  -- Protected attributes tested
  protected_attributes TEXT[] NOT NULL, -- e.g., ['race', 'gender', 'age']
  
  -- Test results
  overall_fairness_score NUMERIC CHECK (overall_fairness_score >= 0 AND overall_fairness_score <= 100),
  passed BOOLEAN NOT NULL,
  failure_reason TEXT,
  
  -- Detailed results per group
  group_results JSONB, -- { "group_name": { "metric": value, ... }, ... }
  disparity_metrics JSONB, -- Calculated disparities between groups
  
  -- Statistical significance
  p_value NUMERIC,
  confidence_level NUMERIC,
  sample_size INTEGER,
  
  -- Recommendations
  remediation_required BOOLEAN DEFAULT false,
  recommendations TEXT[],
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fairness_tests_connector ON ai_fairness_tests(connector_id, test_date DESC);
CREATE INDEX idx_fairness_tests_passed ON ai_fairness_tests(passed, test_date DESC);

COMMENT ON TABLE ai_fairness_tests IS 'Record fairness testing and bias audit results';

-- ============================================================================
-- RLS Policies (Row Level Security)
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE ai_monitoring_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_compliance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_fairness_tests ENABLE ROW LEVEL SECURITY;

-- Policies for ai_monitoring_metrics
CREATE POLICY tenant_isolation_monitoring ON ai_monitoring_metrics
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Policies for ai_risk_assessments
CREATE POLICY tenant_isolation_assessments ON ai_risk_assessments
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Policies for ai_incidents
CREATE POLICY tenant_isolation_incidents ON ai_incidents
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Policies for ai_compliance_reports
CREATE POLICY tenant_isolation_compliance ON ai_compliance_reports
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Policies for ai_model_versions
CREATE POLICY tenant_isolation_models ON ai_model_versions
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Policies for ai_fairness_tests
CREATE POLICY tenant_isolation_fairness ON ai_fairness_tests
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ============================================================================
-- Triggers for updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_monitoring_metrics_updated_at BEFORE UPDATE ON ai_monitoring_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_assessments_updated_at BEFORE UPDATE ON ai_risk_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON ai_incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_reports_updated_at BEFORE UPDATE ON ai_compliance_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_model_versions_updated_at BEFORE UPDATE ON ai_model_versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fairness_tests_updated_at BEFORE UPDATE ON ai_fairness_tests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Sample data for testing (optional - commented out)
-- ============================================================================

/*
-- Sample monitoring metric
INSERT INTO ai_monitoring_metrics (tenant_id, connector_id, metric_type, metric_category, metric_value, threshold_min, threshold_max, demographic_group)
SELECT 
  t.id as tenant_id,
  c.id as connector_id,
  'fairness_score' as metric_type,
  'fairness' as metric_category,
  0.85 as metric_value,
  0.80 as threshold_min,
  NULL as threshold_max,
  'all_groups' as demographic_group
FROM tenants t, api_connectors c 
WHERE c.is_ai_system = true 
LIMIT 1;
*/
