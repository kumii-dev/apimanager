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

const AIGovernance: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<GovernanceDashboardStats | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
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
