/**
 * AI Governance Routes
 * NIST AI RMF compliance, monitoring, and risk management endpoints
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { config } from '../config';
import { createClient } from '@supabase/supabase-js';
import type {
  CreateMetricRequest,
  CreateAssessmentRequest,
  CreateIncidentRequest,
  CreateFairnessTestRequest,
  GovernanceDashboardStats,
  ConnectorGovernanceDetail,
} from '../types/ai-governance';

const router = Router();

// Helper to get Supabase client (serverless-safe)
const getSupabaseClient = () => {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

// All routes require authentication
router.use(authMiddleware());

// ============================================================================
// Dashboard - Overview Statistics
// ============================================================================

router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient();
    const tenantId = req.user?.tenantId;
    
    // Get AI systems count by risk level
    const { data: connectors, error: connectorsError } = await supabase
      .from('api_connectors')
      .select('id, ai_risk_level')
      .eq('tenant_id', tenantId)
      .eq('is_ai_system', true);
    
    if (connectorsError) throw connectorsError;
    
    const riskCounts = {
      critical: connectors?.filter(c => c.ai_risk_level === 'critical').length || 0,
      high: connectors?.filter(c => c.ai_risk_level === 'high').length || 0,
      medium: connectors?.filter(c => c.ai_risk_level === 'medium').length || 0,
      low: connectors?.filter(c => c.ai_risk_level === 'low').length || 0,
    };
    
    // Get incidents statistics
    const { data: incidents, error: incidentsError } = await supabase
      .from('ai_incidents')
      .select('id, severity, status, detected_at')
      .eq('tenant_id', tenantId);
    
    if (incidentsError) throw incidentsError;
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const incidentStats = {
      active: incidents?.filter(i => i.status === 'open' || i.status === 'investigating').length || 0,
      last_30_days: incidents?.filter(i => new Date(i.detected_at) >= thirtyDaysAgo).length || 0,
      critical: incidents?.filter(i => i.severity === 'critical').length || 0,
    };
    
    // Get assessments statistics
    const { data: assessments, error: assessmentsError } = await supabase
      .from('ai_risk_assessments')
      .select('id, status, next_review_date')
      .eq('tenant_id', tenantId);
    
    if (assessmentsError) throw assessmentsError;
    
    const assessmentStats = {
      pending: assessments?.filter(a => a.status === 'draft' || a.status === 'in_review').length || 0,
      overdue: assessments?.filter(a => a.next_review_date && new Date(a.next_review_date) < now).length || 0,
    };
    
    // Get recent fairness metrics
    const { data: metrics, error: metricsError } = await supabase
      .from('ai_monitoring_metrics')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('metric_type', 'fairness_score')
      .order('measured_at', { ascending: false })
      .limit(10);
    
    if (metricsError) throw metricsError;
    
    const avgFairnessScore = metrics && metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.metric_value, 0) / metrics.length
      : 0;
    
    const belowThreshold = metrics?.filter(m => !m.is_within_threshold).length || 0;
    
    // Get recent incidents
    const { data: recentIncidents, error: recentIncidentsError } = await supabase
      .from('ai_incidents')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('detected_at', { ascending: false })
      .limit(5);
    
    if (recentIncidentsError) throw recentIncidentsError;
    
    // Get recent assessments
    const { data: recentAssessments, error: recentAssessmentsError } = await supabase
      .from('ai_risk_assessments')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('assessment_date', { ascending: false })
      .limit(5);
    
    if (recentAssessmentsError) throw recentAssessmentsError;
    
    const dashboardStats: GovernanceDashboardStats = {
      total_ai_systems: connectors?.length || 0,
      critical_risk_count: riskCounts.critical,
      high_risk_count: riskCounts.high,
      medium_risk_count: riskCounts.medium,
      low_risk_count: riskCounts.low,
      
      active_incidents: incidentStats.active,
      incidents_last_30_days: incidentStats.last_30_days,
      critical_incidents: incidentStats.critical,
      
      pending_assessments: assessmentStats.pending,
      overdue_reviews: assessmentStats.overdue,
      
      average_fairness_score: avgFairnessScore,
      systems_below_fairness_threshold: belowThreshold,
      
      compliance_score: 0, // TODO: Calculate based on compliance reports
      compliant_systems: 0,
      non_compliant_systems: 0,
      
      recent_metrics: metrics || [],
      recent_incidents: recentIncidents || [],
      recent_assessments: recentAssessments || [],
    };
    
    res.json({
      success: true,
      data: dashboardStats,
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch dashboard data',
    });
  }
});

// ============================================================================
// AI Governance Insights (tracking support)
// ============================================================================

router.get('/insights', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient();
    const tenantId = req.user?.tenantId;

    const { data: recentMetrics, error: metricsError } = await supabase
      .from('ai_monitoring_metrics')
      .select('metric_type, metric_value, is_within_threshold, measured_at')
      .eq('tenant_id', tenantId)
      .order('measured_at', { ascending: false })
      .limit(20);

    if (metricsError) throw metricsError;

    const { data: recentIncidents, error: incidentsError } = await supabase
      .from('ai_incidents')
      .select('title, severity, status, detected_at')
      .eq('tenant_id', tenantId)
      .order('detected_at', { ascending: false })
      .limit(10);

    if (incidentsError) throw incidentsError;

    const metrics = recentMetrics || [];
    const incidents = recentIncidents || [];

    const belowThreshold = metrics.filter(m => !m.is_within_threshold).length;
    const criticalIncidents = incidents.filter(i => i.severity === 'critical').length;
    const openIncidents = incidents.filter(i => i.status === 'open' || i.status === 'investigating').length;

    const today = new Date();
    const days = Array.from({ length: 7 }, (_, idx) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - idx));
      return date;
    });

    const trendMetrics = days.map((date) => {
      const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const value = metrics.filter(m => {
        const measured = new Date(m.measured_at);
        return measured.toDateString() === date.toDateString();
      }).length;
      return { label, value };
    });

    const incidentTrend = days.map((date) => {
      const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const value = incidents.filter(i => {
        const detected = new Date(i.detected_at);
        return detected.toDateString() === date.toDateString();
      }).length;
      return { label, value };
    });

    const recommendations = [
      belowThreshold > 0
        ? `Review ${belowThreshold} metrics outside threshold and adjust monitoring baselines.`
        : 'Maintain current monitoring baselines and continue regular reviews.',
      openIncidents > 0
        ? `Prioritize remediation for ${openIncidents} open incidents and validate fixes.`
        : 'No open incidents—schedule proactive controls testing this week.',
      criticalIncidents > 0
        ? `Escalate ${criticalIncidents} critical incidents to governance leadership.`
        : 'No critical incidents—focus on preventive fairness checks.',
    ];

    const fallbackSummary = {
      tracking_summary: `Tracking ${metrics.length} recent metrics and ${incidents.length} incidents. ${belowThreshold} metrics are outside thresholds with ${openIncidents} open incidents (${criticalIncidents} critical).`,
      risk_highlights: [
        belowThreshold > 0 ? `${belowThreshold} metrics outside threshold` : 'All metrics within threshold',
        openIncidents > 0 ? `${openIncidents} active incidents` : 'No active incidents',
        criticalIncidents > 0 ? `${criticalIncidents} critical incidents` : 'No critical incidents',
      ],
      recommendations,
      trend_metrics: trendMetrics,
      incident_trend: incidentTrend,
      generated_at: new Date().toISOString(),
      source: 'heuristic',
    };

    if (!config.ai.openaiApiKey) {
      return res.json({ success: true, data: fallbackSummary });
    }

  const prompt = `You are an AI governance analyst. Summarize the current monitoring state and provide concise risk highlights and actionable recommendations.\n\nRecent Metrics: ${JSON.stringify(metrics)}\nRecent Incidents: ${JSON.stringify(incidents)}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.ai.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Return a JSON object with fields: tracking_summary (string), risk_highlights (array of strings), and recommendations (array of strings).' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      console.warn('OpenAI insights request failed:', await response.text());
      return res.json({ success: true, data: fallbackSummary });
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    let parsed: any = null;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = null;
    }

    const insights = parsed && parsed.tracking_summary
      ? {
          tracking_summary: parsed.tracking_summary,
          risk_highlights: Array.isArray(parsed.risk_highlights) ? parsed.risk_highlights : fallbackSummary.risk_highlights,
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : fallbackSummary.recommendations,
          trend_metrics: trendMetrics,
          incident_trend: incidentTrend,
          generated_at: new Date().toISOString(),
          source: 'openai',
        }
      : fallbackSummary;

    return res.json({ success: true, data: insights });
  } catch (error: any) {
    console.error('Insights error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate insights',
    });
  }
});

// ============================================================================
// Monitoring Metrics
// ============================================================================

router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient();
    const tenantId = req.user?.tenantId;
    const { connector_id, metric_type, start_date, end_date } = req.query;
    
    let query = supabase
      .from('ai_monitoring_metrics')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('measured_at', { ascending: false });
    
    if (connector_id) {
      query = query.eq('connector_id', connector_id as string);
    }
    
    if (metric_type) {
      query = query.eq('metric_type', metric_type as string);
    }
    
    if (start_date) {
      query = query.gte('measured_at', start_date as string);
    }
    
    if (end_date) {
      query = query.lte('measured_at', end_date as string);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    console.error('Metrics fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch metrics',
    });
  }
});

router.post('/metrics', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient();
    const tenantId = req.user?.tenantId;
    const metricData: CreateMetricRequest = req.body;
    
    const { data, error } = await supabase
      .from('ai_monitoring_metrics')
      .insert([
        {
          tenant_id: tenantId,
          ...metricData,
        },
      ])
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json({
      success: true,
      data,
      message: 'Metric recorded successfully',
    });
  } catch (error: any) {
    console.error('Metric creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to record metric',
    });
  }
});

// ============================================================================
// Risk Assessments
// ============================================================================

router.get('/assessments', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient();
    const tenantId = req.user?.tenantId;
    const { connector_id, status } = req.query;
    
    let query = supabase
      .from('ai_risk_assessments')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('assessment_date', { ascending: false });
    
    if (connector_id) {
      query = query.eq('connector_id', connector_id as string);
    }
    
    if (status) {
      query = query.eq('status', status as string);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    console.error('Assessments fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch assessments',
    });
  }
});

router.post('/assessments', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient();
    const tenantId = req.user?.tenantId;
    const assessorId = req.user?.id;
    const assessmentData: CreateAssessmentRequest = req.body;
    
    const { data, error } = await supabase
      .from('ai_risk_assessments')
      .insert([
        {
          tenant_id: tenantId,
          assessor_id: assessorId,
          ...assessmentData,
        },
      ])
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json({
      success: true,
      data,
      message: 'Risk assessment created successfully',
    });
  } catch (error: any) {
    console.error('Assessment creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create assessment',
    });
  }
});

router.put('/assessments/:id', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient();
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('ai_risk_assessments')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      data,
      message: 'Assessment updated successfully',
    });
  } catch (error: any) {
    console.error('Assessment update error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update assessment',
    });
  }
});

// ============================================================================
// Incidents
// ============================================================================

router.get('/incidents', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient();
    const tenantId = req.user?.tenantId;
    const { connector_id, status, severity } = req.query;
    
    let query = supabase
      .from('ai_incidents')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('detected_at', { ascending: false });
    
    if (connector_id) {
      query = query.eq('connector_id', connector_id as string);
    }
    
    if (status) {
      query = query.eq('status', status as string);
    }
    
    if (severity) {
      query = query.eq('severity', severity as string);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    console.error('Incidents fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch incidents',
    });
  }
});

router.post('/incidents', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient();
    const tenantId = req.user?.tenantId;
    const incidentData: CreateIncidentRequest = req.body;
    
    const { data, error } = await supabase
      .from('ai_incidents')
      .insert([
        {
          tenant_id: tenantId,
          status: 'open',
          ...incidentData,
        },
      ])
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json({
      success: true,
      data,
      message: 'Incident recorded successfully',
    });
  } catch (error: any) {
    console.error('Incident creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to record incident',
    });
  }
});

router.put('/incidents/:id', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient();
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('ai_incidents')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      data,
      message: 'Incident updated successfully',
    });
  } catch (error: any) {
    console.error('Incident update error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update incident',
    });
  }
});

// ============================================================================
// Fairness Tests
// ============================================================================

router.get('/fairness-tests', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient();
    const tenantId = req.user?.tenantId;
    const { connector_id } = req.query;
    
    let query = supabase
      .from('ai_fairness_tests')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('test_date', { ascending: false });
    
    if (connector_id) {
      query = query.eq('connector_id', connector_id as string);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    console.error('Fairness tests fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch fairness tests',
    });
  }
});

router.post('/fairness-tests', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient();
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const testData: CreateFairnessTestRequest = req.body;
    
    const { data, error } = await supabase
      .from('ai_fairness_tests')
      .insert([
        {
          tenant_id: tenantId,
          tested_by: userId,
          ...testData,
        },
      ])
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json({
      success: true,
      data,
      message: 'Fairness test recorded successfully',
    });
  } catch (error: any) {
    console.error('Fairness test creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to record fairness test',
    });
  }
});

// ============================================================================
// Connector Governance Detail
// ============================================================================

router.get('/connectors/:connectorId/governance', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient();
    const tenantId = req.user?.tenantId;
    const { connectorId } = req.params;
    
    // Get connector info
    const { data: connector, error: connectorError } = await supabase
      .from('api_connectors')
      .select('id, name, type, is_ai_system, ai_risk_level, nist_categories')
      .eq('id', connectorId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (connectorError) throw connectorError;
    
    // Get latest assessment
    const { data: latestAssessment } = await supabase
      .from('ai_risk_assessments')
      .select('*')
      .eq('connector_id', connectorId)
      .eq('tenant_id', tenantId)
      .order('assessment_date', { ascending: false })
      .limit(1)
      .single();
    
    // Get latest metrics
    const { data: latestMetrics } = await supabase
      .from('ai_monitoring_metrics')
      .select('*')
      .eq('connector_id', connectorId)
      .eq('tenant_id', tenantId)
      .order('measured_at', { ascending: false })
      .limit(10);
    
    // Get active incidents
    const { data: activeIncidents } = await supabase
      .from('ai_incidents')
      .select('*')
      .eq('connector_id', connectorId)
      .eq('tenant_id', tenantId)
      .in('status', ['open', 'investigating'])
      .order('detected_at', { ascending: false });
    
    // Get model versions
    const { data: modelVersions } = await supabase
      .from('ai_model_versions')
      .select('*')
      .eq('connector_id', connectorId)
      .eq('tenant_id', tenantId)
      .order('deployed_at', { ascending: false });
    
    // Get fairness tests
    const { data: fairnessTests } = await supabase
      .from('ai_fairness_tests')
      .select('*')
      .eq('connector_id', connectorId)
      .eq('tenant_id', tenantId)
      .order('test_date', { ascending: false })
      .limit(5);
    
    const detail: ConnectorGovernanceDetail = {
      connector,
      latest_assessment: latestAssessment || undefined,
      latest_metrics: latestMetrics || [],
      active_incidents: activeIncidents || [],
      model_versions: modelVersions || [],
      fairness_tests: fairnessTests || [],
      compliance_status: {
        score: 0, // TODO: Calculate
        compliant: true, // TODO: Calculate
        issues: [],
      },
    };
    
    res.json({
      success: true,
      data: detail,
    });
  } catch (error: any) {
    console.error('Connector governance detail error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch connector governance details',
    });
  }
});

export { router as aiGovernanceRoutes };
