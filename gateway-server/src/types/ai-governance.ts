/**
 * TypeScript Types for AI Governance System
 * Aligned with NIST AI RMF and database schema
 */

// ============================================================================
// Monitoring Metrics
// ============================================================================

export type MetricType =
  | 'accuracy'
  | 'precision'
  | 'recall'
  | 'f1_score'
  | 'bias_score'
  | 'fairness_score'
  | 'demographic_parity'
  | 'equal_opportunity'
  | 'calibration'
  | 'latency'
  | 'throughput'
  | 'error_rate';

export type MetricCategory = 'performance' | 'fairness' | 'reliability' | 'efficiency';

export interface AIMonitoringMetric {
  id: string;
  tenant_id: string;
  connector_id: string;
  metric_type: MetricType;
  metric_category: MetricCategory;
  metric_value: number;
  threshold_min?: number;
  threshold_max?: number;
  is_within_threshold: boolean;
  demographic_group?: string;
  comparison_group?: string;
  model_version?: string;
  data_sample_size?: number;
  confidence_interval?: number;
  measured_at: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMetricRequest {
  connector_id: string;
  metric_type: MetricType;
  metric_category: MetricCategory;
  metric_value: number;
  threshold_min?: number;
  threshold_max?: number;
  demographic_group?: string;
  comparison_group?: string;
  model_version?: string;
  data_sample_size?: number;
  confidence_interval?: number;
  notes?: string;
}

// ============================================================================
// Risk Assessments
// ============================================================================

export type AssessmentStatus = 'draft' | 'in_review' | 'approved' | 'rejected' | 'archived';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type HarmType =
  | 'discrimination'
  | 'privacy_violation'
  | 'safety_risk'
  | 'security_risk'
  | 'misinformation'
  | 'economic_harm'
  | 'psychological_harm'
  | 'environmental_harm';

export interface AIRiskAssessment {
  id: string;
  tenant_id: string;
  connector_id: string;
  assessment_version: string;
  assessment_date: string;
  assessor_id?: string;
  status: AssessmentStatus;
  overall_risk_score?: number;
  impact_score?: number;
  likelihood_score?: number;
  govern_score?: number;
  map_score?: number;
  measure_score?: number;
  manage_score?: number;
  affected_populations?: string[];
  harm_types?: HarmType[];
  risk_description?: string;
  impact_analysis?: string;
  likelihood_rationale?: string;
  mitigation_measures?: string[];
  residual_risk_level?: RiskLevel;
  mitigation_effectiveness?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  approval_notes?: string;
  next_review_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAssessmentRequest {
  connector_id: string;
  assessment_version: string;
  assessment_date?: string;
  status: AssessmentStatus;
  overall_risk_score?: number;
  impact_score?: number;
  likelihood_score?: number;
  govern_score?: number;
  map_score?: number;
  measure_score?: number;
  manage_score?: number;
  affected_populations?: string[];
  harm_types?: HarmType[];
  risk_description?: string;
  impact_analysis?: string;
  likelihood_rationale?: string;
  mitigation_measures?: string[];
  residual_risk_level?: RiskLevel;
  mitigation_effectiveness?: string;
  next_review_date?: string;
}

// ============================================================================
// Incidents
// ============================================================================

export type IncidentType =
  | 'bias_detected'
  | 'fairness_violation'
  | 'performance_degradation'
  | 'security_breach'
  | 'privacy_leak'
  | 'safety_incident'
  | 'incorrect_prediction'
  | 'system_failure'
  | 'other';

export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'closed' | 'false_alarm';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AIIncident {
  id: string;
  tenant_id: string;
  connector_id: string;
  incident_type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description: string;
  detected_at: string;
  detected_by?: string;
  users_affected?: number;
  data_records_affected?: number;
  financial_impact?: number;
  harm_caused?: string[];
  root_cause?: string;
  resolution_steps?: string;
  resolved_at?: string;
  resolved_by?: string;
  preventive_measures?: string[];
  related_assessment_id?: string;
  related_incident_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateIncidentRequest {
  connector_id: string;
  incident_type: IncidentType;
  severity: IncidentSeverity;
  title: string;
  description: string;
  detected_by?: string;
  users_affected?: number;
  data_records_affected?: number;
  financial_impact?: number;
  harm_caused?: string[];
}

// ============================================================================
// Compliance Reports
// ============================================================================

export type ReportType =
  | 'full_nist_rmf'
  | 'govern_only'
  | 'map_only'
  | 'measure_only'
  | 'manage_only'
  | 'connector_specific'
  | 'tenant_wide'
  | 'custom';

export type ReportFormat = 'pdf' | 'html' | 'json' | 'markdown';
export type ApprovalStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

export interface AIComplianceReport {
  id: string;
  tenant_id: string;
  report_type: ReportType;
  scope_connector_ids?: string[];
  report_title: string;
  report_period_start: string;
  report_period_end: string;
  generated_at: string;
  generated_by?: string;
  overall_compliance_score?: number;
  nist_categories_assessed?: string[];
  compliant_categories?: string[];
  non_compliant_categories?: string[];
  executive_summary?: string;
  findings?: any;
  recommendations?: any;
  metrics_summary?: any;
  incidents_summary?: any;
  report_file_url?: string;
  report_format?: ReportFormat;
  reviewed_by?: string;
  reviewed_at?: string;
  approval_status?: ApprovalStatus;
  created_at: string;
  updated_at: string;
}

export interface GenerateReportRequest {
  report_type: ReportType;
  scope_connector_ids?: string[];
  report_title: string;
  report_period_start: string;
  report_period_end: string;
  report_format?: ReportFormat;
}

// ============================================================================
// Model Versions
// ============================================================================

export type ModelStatus = 'development' | 'testing' | 'staging' | 'production' | 'deprecated' | 'retired';

export interface AIModelVersion {
  id: string;
  tenant_id: string;
  connector_id: string;
  version_number: string;
  version_name?: string;
  model_type?: string;
  model_architecture?: string;
  status: ModelStatus;
  deployed_at?: string;
  deployed_by?: string;
  deprecated_at?: string;
  training_dataset_name?: string;
  training_dataset_size?: number;
  training_start_date?: string;
  training_end_date?: string;
  training_duration_hours?: number;
  baseline_accuracy?: number;
  baseline_precision?: number;
  baseline_recall?: number;
  baseline_f1_score?: number;
  baseline_bias_score?: number;
  model_file_url?: string;
  config_file_url?: string;
  documentation_url?: string;
  parent_version_id?: string;
  change_description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateModelVersionRequest {
  connector_id: string;
  version_number: string;
  version_name?: string;
  model_type?: string;
  model_architecture?: string;
  status: ModelStatus;
  training_dataset_name?: string;
  training_dataset_size?: number;
  training_start_date?: string;
  training_end_date?: string;
  baseline_accuracy?: number;
  baseline_precision?: number;
  baseline_recall?: number;
  baseline_f1_score?: number;
  baseline_bias_score?: number;
  parent_version_id?: string;
  change_description?: string;
}

// ============================================================================
// Fairness Tests
// ============================================================================

export type FairnessTestType =
  | 'demographic_parity'
  | 'equal_opportunity'
  | 'equalized_odds'
  | 'predictive_parity'
  | 'calibration'
  | 'individual_fairness'
  | 'group_fairness'
  | 'custom';

export interface AIFairnessTest {
  id: string;
  tenant_id: string;
  connector_id: string;
  model_version_id?: string;
  test_name: string;
  test_type: FairnessTestType;
  test_date: string;
  tested_by?: string;
  protected_attributes: string[];
  overall_fairness_score?: number;
  passed: boolean;
  failure_reason?: string;
  group_results?: any;
  disparity_metrics?: any;
  p_value?: number;
  confidence_level?: number;
  sample_size?: number;
  remediation_required: boolean;
  recommendations?: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateFairnessTestRequest {
  connector_id: string;
  model_version_id?: string;
  test_name: string;
  test_type: FairnessTestType;
  protected_attributes: string[];
  overall_fairness_score?: number;
  passed: boolean;
  failure_reason?: string;
  group_results?: any;
  disparity_metrics?: any;
  p_value?: number;
  confidence_level?: number;
  sample_size?: number;
  remediation_required?: boolean;
  recommendations?: string[];
}

// ============================================================================
// Dashboard Aggregations
// ============================================================================

export interface GovernanceDashboardStats {
  total_ai_systems: number;
  critical_risk_count: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  
  active_incidents: number;
  incidents_last_30_days: number;
  critical_incidents: number;
  
  pending_assessments: number;
  overdue_reviews: number;
  
  average_fairness_score: number;
  systems_below_fairness_threshold: number;
  
  compliance_score: number;
  compliant_systems: number;
  non_compliant_systems: number;
  
  recent_metrics: AIMonitoringMetric[];
  recent_incidents: AIIncident[];
  recent_assessments: AIRiskAssessment[];
}

export interface ConnectorGovernanceDetail {
  connector: {
    id: string;
    name: string;
    type: string;
    is_ai_system: boolean;
    ai_risk_level?: RiskLevel;
    nist_categories?: string[];
  };
  latest_assessment?: AIRiskAssessment;
  latest_metrics: AIMonitoringMetric[];
  active_incidents: AIIncident[];
  model_versions: AIModelVersion[];
  fairness_tests: AIFairnessTest[];
  compliance_status: {
    score: number;
    compliant: boolean;
    issues: string[];
  };
}

// ============================================================================
// API Response Types
// ============================================================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
