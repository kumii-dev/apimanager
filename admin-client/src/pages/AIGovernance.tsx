import React, { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Row, Spinner, Tab, Tabs } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';

// Types
interface GovernanceDashboardStats {
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
  recent_metrics: RecentMetric[];
  recent_incidents: RecentIncident[];
  recent_assessments: RecentAssessment[];
}

interface RecentMetric {
  id: string;
  connector_name: string;
  metric_type: string;
  metric_value: number;
  is_within_threshold: boolean;
  measured_at: string;
}

interface RecentIncident {
  id: string;
  connector_name: string;
  title: string;
  severity: string;
  status: string;
  detected_at: string;
}

interface RecentAssessment {
  id: string;
  connector_name: string;
  overall_risk_score: number;
  status: string;
  assessment_date: string;
}

interface GovernanceInsights {
  tracking_summary: string;
  risk_highlights: string[];
  recommendations: string[];
  trend_metrics: { label: string; value: number }[];
  incident_trend: { label: string; value: number }[];
  severity_trend: { label: string; critical: number; high: number; medium: number; low: number }[];
  generated_at: string;
  source: 'openai' | 'heuristic';
}

const AIGovernance: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<GovernanceDashboardStats | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [insights, setInsights] = useState<GovernanceInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
    fetchInsights();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/admin/governance/dashboard');
      if (response.data.success) {
        setStats(response.data.data);
      } else {
        throw new Error(response.data.error || 'Failed to fetch dashboard data');
      }
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    try {
      setInsightsLoading(true);
      setInsightsError(null);
      const response = await apiClient.get('/admin/governance/insights');
      if (response.data.success) {
        setInsights(response.data.data);
      } else {
        throw new Error(response.data.error || 'Failed to fetch insights');
      }
    } catch (err: any) {
      console.error('Insights fetch error:', err);
      setInsightsError(err.response?.data?.error || err.message || 'Failed to load insights');
    } finally {
      setInsightsLoading(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: { [key: string]: string } = {
      critical: 'danger',
      high: 'warning',
      medium: 'info',
      low: 'secondary',
    };
    return <Badge bg={variants[severity] || 'secondary'}>{severity.toUpperCase()}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: string } = {
      open: 'danger',
      investigating: 'warning',
      resolved: 'success',
      closed: 'secondary',
      draft: 'secondary',
      in_review: 'info',
      approved: 'success',
      rejected: 'danger',
    };
    return <Badge bg={variants[status] || 'secondary'}>{status.replace('_', ' ').toUpperCase()}</Badge>;
  };

  const getRiskColor = (score: number) => {
    if (score >= 75) return 'danger';
    if (score >= 50) return 'warning';
    if (score >= 25) return 'info';
    return 'success';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Loading AI Governance Dashboard...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Dashboard</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={fetchDashboardData}>
            Retry
          </Button>
        </Alert>
      </Container>
    );
  }

  if (!stats) {
    return (
      <Container className="mt-4">
        <Alert variant="info">No governance data available</Alert>
      </Container>
    );
  }

  const trendMax = insights?.trend_metrics.length
    ? Math.max(...insights.trend_metrics.map((point) => point.value), 1)
    : 1;
  const incidentTrendMax = insights?.incident_trend.length
    ? Math.max(...insights.incident_trend.map((point) => point.value), 1)
    : 1;
  const severityTrendMax = insights?.severity_trend.length
    ? Math.max(
        ...insights.severity_trend.map((point) => point.critical + point.high + point.medium + point.low),
        1
      )
    : 1;

  const handleExportTrends = (format: 'json' | 'csv') => {
    if (!insights) return;

    const exportData = insights.trend_metrics.map((metric, idx) => {
      const incident = insights.incident_trend[idx];
      const severity = insights.severity_trend[idx];
      return {
        date: metric.label,
        metrics_count: metric.value,
        incidents_count: incident?.value ?? 0,
        critical: severity?.critical ?? 0,
        high: severity?.high ?? 0,
        medium: severity?.medium ?? 0,
        low: severity?.low ?? 0,
      };
    });

    let blob: Blob;
    let filename: string;

    if (format === 'json') {
      blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      filename = 'ai-governance-trends.json';
    } else {
      const header = 'date,metrics_count,incidents_count,critical,high,medium,low';
      const rows = exportData
        .map((row) => `${row.date},${row.metrics_count},${row.incidents_count},${row.critical},${row.high},${row.medium},${row.low}`)
        .join('\n');
      blob = new Blob([`${header}\n${rows}`], { type: 'text/csv' });
      filename = 'ai-governance-trends.csv';
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Container fluid className="page-container px-4">
      {/* Header */}
      <div className="page-header page-section">
        <div>
          <h2 className="page-title type-h1">🛡️ AI Governance Dashboard</h2>
          <p className="page-subtitle type-subtitle">NIST AI RMF Compliance & Monitoring</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Button variant="outline-primary" size="sm" onClick={() => navigate('/ai-governance/assessments')}>
            📋 Risk Assessments
          </Button>
          <Button variant="outline-danger" size="sm" onClick={() => navigate('/ai-governance/incidents')}>
            ⚠️ Incidents
          </Button>
          <Button variant="outline-success" size="sm" onClick={() => navigate('/ai-governance/monitoring')}>
            📊 Monitoring
          </Button>
        </div>
      </div>

  <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'overview')} className="page-section">
        {/* OVERVIEW TAB */}
        <Tab eventKey="overview" title="📈 Overview">
          <Row className="page-section">
            <Col lg={12}>
              <Card className="chart-card">
                <Card.Body>
                  <div className="chart-header">
                    <div>
                      <div className="chart-title">AI Governance Tracking</div>
                      <div className="chart-subtitle">Automated risk summary and highlights</div>
                    </div>
                    <div className="d-flex gap-2">
                      <Button variant="outline-secondary" size="sm" onClick={fetchInsights}>
                        Refresh
                      </Button>
                      <Button variant="outline-primary" size="sm" onClick={() => handleExportTrends('json')}>
                        Export JSON
                      </Button>
                      <Button variant="outline-primary" size="sm" onClick={() => handleExportTrends('csv')}>
                        Export CSV
                      </Button>
                    </div>
                  </div>

                  {insightsLoading && (
                    <div className="text-center py-4">
                      <Spinner animation="border" variant="primary" size="sm" />
                    </div>
                  )}

                  {insightsError && !insightsLoading && (
                    <Alert variant="danger" className="mt-3">
                      {insightsError}
                    </Alert>
                  )}

                  {!insightsLoading && !insightsError && insights && (
                    <div className="mt-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="fw-semibold">Tracking Summary</div>
                        <Badge bg={insights.source === 'openai' ? 'primary' : 'secondary'}>
                          {insights.source === 'openai' ? 'AI' : 'Heuristic'}
                        </Badge>
                      </div>
                      <p className="text-muted mb-3">{insights.tracking_summary}</p>
                      <div className="fw-semibold mb-2">Risk Highlights</div>
                      <ul className="mb-0">
                        {insights.risk_highlights.map((highlight, idx) => (
                          <li key={idx} className="text-muted">{highlight}</li>
                        ))}
                      </ul>
                      <div className="fw-semibold mb-2">Actionable Recommendations</div>
                      <ul className="mb-0">
                        {insights.recommendations.map((rec, idx) => (
                          <li key={idx} className="text-muted">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
          <Row className="page-section">
            <Col md={6}>
              <Card className="chart-card h-100">
                <Card.Body>
                  <div className="chart-header">
                    <div>
                      <div className="chart-title">Monitoring Trend</div>
                      <div className="chart-subtitle">Metrics logged (last 7 days)</div>
                    </div>
                  </div>
                  {insightsLoading && (
                    <div className="text-center py-4">
                      <Spinner animation="border" variant="primary" size="sm" />
                    </div>
                  )}
                  {!insightsLoading && !insightsError && insights && (
                    <>
                      <div className="mini-chart mt-3">
                        {insights.trend_metrics.map((point, idx) => (
                          <span key={idx} style={{ height: `${Math.round((point.value / trendMax) * 100)}%` }} />
                        ))}
                      </div>
                      <div className="d-flex justify-content-between text-muted small mt-3">
                        {insights.trend_metrics.map((point, idx) => (
                          <span key={idx}>{point.label}</span>
                        ))}
                      </div>
                    </>
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="chart-card h-100">
                <Card.Body>
                  <div className="chart-header">
                    <div>
                      <div className="chart-title">Incident Trend</div>
                      <div className="chart-subtitle">Incidents logged (last 7 days)</div>
                    </div>
                  </div>
                  {insightsLoading && (
                    <div className="text-center py-4">
                      <Spinner animation="border" variant="primary" size="sm" />
                    </div>
                  )}
                  {!insightsLoading && !insightsError && insights && (
                    <>
                      <div className="mini-chart mt-3">
                        {insights.incident_trend.map((point, idx) => (
                          <span key={idx} style={{ height: `${Math.round((point.value / incidentTrendMax) * 100)}%` }} />
                        ))}
                      </div>
                      <div className="d-flex justify-content-between text-muted small mt-3">
                        {insights.incident_trend.map((point, idx) => (
                          <span key={idx}>{point.label}</span>
                        ))}
                      </div>
                    </>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
          <Row className="page-section">
            <Col md={12}>
              <Card className="chart-card">
                <Card.Body>
                  <div className="chart-header">
                    <div>
                      <div className="chart-title">Stacked Severity Trend</div>
                      <div className="chart-subtitle">Critical, High, Medium, Low (7 days)</div>
                    </div>
                  </div>
                  {insightsLoading && (
                    <div className="text-center py-4">
                      <Spinner animation="border" variant="primary" size="sm" />
                    </div>
                  )}
                  {!insightsLoading && !insightsError && insights && (
                    <>
                      <div className="d-flex align-items-end gap-2 mt-3" style={{ height: '120px' }}>
                        {insights.severity_trend.map((point, idx) => {
                          const total = point.critical + point.high + point.medium + point.low;
                          const safeTotal = total || 1;
                          const scale = total > 0 ? total / severityTrendMax : 0;
                          return (
                            <div key={idx} className="d-flex flex-column-reverse" style={{ width: '100%', height: '100%' }}>
                              <div style={{ height: `${Math.round(scale * 100)}%`, display: 'flex', flexDirection: 'column-reverse' }}>
                                <span style={{ height: `${(point.critical / safeTotal) * 100}%`, backgroundColor: '#1f1f1f' }} />
                                <span style={{ height: `${(point.high / safeTotal) * 100}%`, backgroundColor: '#ffb020' }} />
                                <span style={{ height: `${(point.medium / safeTotal) * 100}%`, backgroundColor: '#4da3ff' }} />
                                <span style={{ height: `${(point.low / safeTotal) * 100}%`, backgroundColor: '#5ad06a' }} />
                              </div>
                              <div className="text-muted small text-center mt-1">{point.label}</div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="d-flex justify-content-end gap-3 text-muted small mt-3">
                        <span>Critical</span>
                        <span>High</span>
                        <span>Medium</span>
                        <span>Low</span>
                      </div>
                    </>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
          {/* Key Metrics Row */}
          <Row className="page-section">
            <Col md={3}>
              <Card className="text-center border-primary">
                <Card.Body>
                  <h6 className="text-muted mb-2">Total AI Systems</h6>
                  <h2 className="mb-0 text-primary">{stats.total_ai_systems}</h2>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center border-danger">
                <Card.Body>
                  <h6 className="text-muted mb-2">Active Incidents</h6>
                  <h2 className="mb-0 text-danger">{stats.active_incidents}</h2>
                  <small className="text-muted">{stats.critical_incidents} critical</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center border-warning">
                <Card.Body>
                  <h6 className="text-muted mb-2">Pending Assessments</h6>
                  <h2 className="mb-0 text-warning">{stats.pending_assessments}</h2>
                  <small className="text-muted">{stats.overdue_reviews} overdue</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center border-success">
                <Card.Body>
                  <h6 className="text-muted mb-2">Avg Fairness Score</h6>
                  <h2 className="mb-0 text-success">{(stats.average_fairness_score * 100).toFixed(1)}%</h2>
                  <small className="text-muted">{stats.systems_below_fairness_threshold} below threshold</small>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Risk Distribution */}
          <Row className="page-section">
            <Col md={6}>
              <Card>
                <Card.Header className="bg-light">
                  <h5 className="mb-0">🎯 Risk Distribution</h5>
                </Card.Header>
                <Card.Body>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span>Critical Risk</span>
                      <Badge bg="danger">{stats.critical_risk_count}</Badge>
                    </div>
                    <div className="progress mb-2" style={{ height: '10px' }}>
                      <div
                        className="progress-bar bg-danger"
                        style={{ width: `${(stats.critical_risk_count / stats.total_ai_systems) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span>High Risk</span>
                      <Badge bg="warning">{stats.high_risk_count}</Badge>
                    </div>
                    <div className="progress mb-2" style={{ height: '10px' }}>
                      <div
                        className="progress-bar bg-warning"
                        style={{ width: `${(stats.high_risk_count / stats.total_ai_systems) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span>Medium Risk</span>
                      <Badge bg="info">{stats.medium_risk_count}</Badge>
                    </div>
                    <div className="progress mb-2" style={{ height: '10px' }}>
                      <div
                        className="progress-bar bg-info"
                        style={{ width: `${(stats.medium_risk_count / stats.total_ai_systems) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="d-flex justify-content-between mb-1">
                      <span>Low Risk</span>
                      <Badge bg="success">{stats.low_risk_count}</Badge>
                    </div>
                    <div className="progress" style={{ height: '10px' }}>
                      <div
                        className="progress-bar bg-success"
                        style={{ width: `${(stats.low_risk_count / stats.total_ai_systems) * 100}%` }}
                      />
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <Card>
                <Card.Header className="bg-light">
                  <h5 className="mb-0">📊 Incident Trends (30 Days)</h5>
                </Card.Header>
                <Card.Body>
                  <div className="text-center py-4">
                    <h1 className="display-4 text-primary">{stats.incidents_last_30_days}</h1>
                    <p className="text-muted mb-0">Total Incidents Reported</p>
                    <div className="mt-3">
                      <Badge bg="danger" className="me-2">
                        {stats.critical_incidents} Critical
                      </Badge>
                      <Badge bg="success">{stats.active_incidents} Active</Badge>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        {/* RECENT METRICS TAB */}
        <Tab eventKey="metrics" title="📏 Recent Metrics">
          <Card>
            <Card.Header className="bg-light">
              <h5 className="mb-0">Latest Monitoring Metrics</h5>
            </Card.Header>
            <Card.Body>
              {stats.recent_metrics.length === 0 ? (
                <Alert variant="info">No metrics recorded yet</Alert>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Connector</th>
                        <th>Metric Type</th>
                        <th>Value</th>
                        <th>Status</th>
                        <th>Measured At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recent_metrics.map((metric) => (
                        <tr key={metric.id}>
                          <td>
                            <strong>{metric.connector_name}</strong>
                          </td>
                          <td>
                            <Badge bg="secondary">{metric.metric_type.replace('_', ' ')}</Badge>
                          </td>
                          <td>
                            <code>{metric.metric_value.toFixed(4)}</code>
                          </td>
                          <td>
                            {metric.is_within_threshold ? (
                              <Badge bg="success">✓ Within Threshold</Badge>
                            ) : (
                              <Badge bg="danger">⚠ Violation</Badge>
                            )}
                          </td>
                          <td className="text-muted">{formatDate(metric.measured_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>

        {/* RECENT INCIDENTS TAB */}
        <Tab eventKey="incidents" title="⚠️ Recent Incidents">
          <Card>
            <Card.Header className="bg-light d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Latest AI Incidents</h5>
              <Button variant="danger" size="sm" onClick={() => navigate('/ai-governance/incidents/new')}>
                + Report Incident
              </Button>
            </Card.Header>
            <Card.Body>
              {stats.recent_incidents.length === 0 ? (
                <Alert variant="success">
                  <strong>✓ No incidents reported</strong> - All systems operating normally
                </Alert>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Connector</th>
                        <th>Incident</th>
                        <th>Severity</th>
                        <th>Status</th>
                        <th>Detected At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recent_incidents.map((incident) => (
                        <tr key={incident.id}>
                          <td>
                            <strong>{incident.connector_name}</strong>
                          </td>
                          <td>{incident.title}</td>
                          <td>{getSeverityBadge(incident.severity)}</td>
                          <td>{getStatusBadge(incident.status)}</td>
                          <td className="text-muted">{formatDate(incident.detected_at)}</td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => navigate(`/ai-governance/incidents/${incident.id}`)}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>

        {/* RECENT ASSESSMENTS TAB */}
        <Tab eventKey="assessments" title="📋 Recent Assessments">
          <Card>
            <Card.Header className="bg-light d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Latest Risk Assessments</h5>
              <Button variant="primary" size="sm" onClick={() => navigate('/ai-governance/assessments/new')}>
                + New Assessment
              </Button>
            </Card.Header>
            <Card.Body>
              {stats.recent_assessments.length === 0 ? (
                <Alert variant="warning">No risk assessments conducted yet. Create one to start tracking AI risks.</Alert>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Connector</th>
                        <th>Risk Score</th>
                        <th>Risk Level</th>
                        <th>Status</th>
                        <th>Assessment Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recent_assessments.map((assessment) => (
                        <tr key={assessment.id}>
                          <td>
                            <strong>{assessment.connector_name}</strong>
                          </td>
                          <td>
                            <code>{assessment.overall_risk_score}/100</code>
                          </td>
                          <td>
                            <Badge bg={getRiskColor(assessment.overall_risk_score)}>
                              {assessment.overall_risk_score >= 75
                                ? 'CRITICAL'
                                : assessment.overall_risk_score >= 50
                                ? 'HIGH'
                                : assessment.overall_risk_score >= 25
                                ? 'MEDIUM'
                                : 'LOW'}
                            </Badge>
                          </td>
                          <td>{getStatusBadge(assessment.status)}</td>
                          <td className="text-muted">{formatDate(assessment.assessment_date)}</td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => navigate(`/ai-governance/assessments/${assessment.id}`)}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>

        {/* COMPLIANCE TAB */}
        <Tab eventKey="compliance" title="✓ Compliance">
          <Row>
            <Col md={6}>
              <Card className="mb-4">
                <Card.Header className="bg-light">
                  <h5 className="mb-0">🎯 Overall Compliance Score</h5>
                </Card.Header>
                <Card.Body className="text-center">
                  <div className="py-4">
                    <h1 className="display-1 text-primary">{stats.compliance_score}%</h1>
                    <p className="text-muted mb-0">NIST AI RMF Compliance</p>
                  </div>
                  <div className="progress mb-3" style={{ height: '20px' }}>
                    <div className="progress-bar bg-primary" style={{ width: `${stats.compliance_score}%` }}>
                      {stats.compliance_score}%
                    </div>
                  </div>
                  <div className="d-flex justify-content-around">
                    <div>
                      <h4 className="text-success">{stats.compliant_systems}</h4>
                      <small className="text-muted">Compliant Systems</small>
                    </div>
                    <div>
                      <h4 className="text-danger">{stats.non_compliant_systems}</h4>
                      <small className="text-muted">Non-Compliant</small>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <Card>
                <Card.Header className="bg-light">
                  <h5 className="mb-0">📄 Compliance Reports</h5>
                </Card.Header>
                <Card.Body>
                  <Alert variant="info" className="mb-3">
                    <strong>Generate compliance reports</strong> to document NIST AI RMF adherence and audit readiness.
                  </Alert>
                  <div className="d-grid gap-2">
                    <Button variant="outline-primary" onClick={() => navigate('/ai-governance/reports')}>
                      📊 View All Reports
                    </Button>
                    <Button variant="primary" onClick={() => navigate('/ai-governance/reports/new')}>
                      + Generate New Report
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
      </Tabs>

      {/* Quick Actions */}
      <Card className="mt-4 border-0 bg-light">
        <Card.Body>
          <h6 className="mb-3">⚡ Quick Actions</h6>
          <Row>
            <Col md={3}>
              <Button
                variant="outline-primary"
                className="w-100 mb-2"
                onClick={() => navigate('/ai-governance/monitoring')}
              >
                📊 Record Metric
              </Button>
            </Col>
            <Col md={3}>
              <Button
                variant="outline-danger"
                className="w-100 mb-2"
                onClick={() => navigate('/ai-governance/incidents/new')}
              >
                ⚠️ Report Incident
              </Button>
            </Col>
            <Col md={3}>
              <Button
                variant="outline-warning"
                className="w-100 mb-2"
                onClick={() => navigate('/ai-governance/assessments/new')}
              >
                📋 Create Assessment
              </Button>
            </Col>
            <Col md={3}>
              <Button
                variant="outline-success"
                className="w-100 mb-2"
                onClick={() => navigate('/ai-governance/fairness-tests/new')}
              >
                🧪 Run Fairness Test
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default AIGovernance;
