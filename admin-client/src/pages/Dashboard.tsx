import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Nav, Tab, Alert, Spinner, Badge } from 'react-bootstrap';
import { supabase } from '../services/supabase';
import { auditLogsApi } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface AuditLog {
  id: string;
  action: string;
  resource_type: string;
  status: 'success' | 'failure' | 'pending';
  severity: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  created_at: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditCritical, setAuditCritical] = useState(0);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
  }, []);

  useEffect(() => {
    const fetchAuditSummary = async () => {
      try {
        setAuditLoading(true);
        setAuditError(null);

        const response = await auditLogsApi.list({ page: 1, pageSize: 5 });
        const logs = response.data.logs || [];
        setAuditLogs(logs);
        setAuditTotal(response.data.total || logs.length || 0);

        const criticalCount = logs.filter((log: AuditLog) => log.severity === 'critical').length;
        setAuditCritical(criticalCount);
      } catch (err: any) {
        setAuditError(err.response?.data?.message || 'Failed to fetch audit logs');
      } finally {
        setAuditLoading(false);
      }
    };

    fetchAuditSummary();
  }, []);

  if (loading) {
    return (
      <Container className="mt-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Container>
    );
  }

  const requestBars = [35, 60, 45, 80, 55, 70, 62];
  const latencyBars = [25, 40, 30, 52, 38, 46, 34];

  return (
    <Container fluid className="page-container px-4">
      <Row className="page-section">
        <Col>
          <Card className="dashboard-hero">
            <Card.Body className="d-flex flex-column flex-lg-row justify-content-between gap-3">
              <div>
                <h1 className="type-display">Admin Command Center</h1>
                <p className="type-subtitle">Monitor API health, manage integrations, and keep governance aligned.</p>
              </div>
              <div className="d-flex gap-2 align-items-center">
                <Button variant="primary" onClick={() => navigate('/connectors')}>
                  <i className="bi bi-plug me-2"></i>
                  Review Connectors
                </Button>
                <Button variant="outline-secondary" onClick={() => navigate('/audit-logs')}>
                  <i className="bi bi-shield-check me-2"></i>
                  Security Logs
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tabs Navigation */}
      <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'overview')}>
        <Nav variant="pills" className="mb-4 bg-light p-2 rounded">
          <Nav.Item>
            <Nav.Link eventKey="overview" className="d-flex align-items-center">
              <i className="bi bi-bar-chart me-2"></i>
              Overview
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="connectors" className="d-flex align-items-center">
              <i className="bi bi-plug me-2"></i>
              Connectors
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="routes" className="d-flex align-items-center">
              <i className="bi bi-signpost-2 me-2"></i>
              Routes
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="users" className="d-flex align-items-center">
              <i className="bi bi-people me-2"></i>
              Users
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="audit" className="d-flex align-items-center">
              <i className="bi bi-clipboard-data me-2"></i>
              Audit Logs
            </Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="overview">
            {/* Stats Cards */}
            <Row className="page-section">
              <Col lg={3} md={6} className="mb-3">
                <Card className="kpi-card h-100">
                  <Card.Body>
                    <div className="d-flex justify-content-between">
                      <div>
                        <div className="kpi-label">Total Connectors</div>
                        <div className="kpi-value">0</div>
                        <div className="kpi-meta">Across all environments</div>
                      </div>
                      <div className="kpi-icon">
                        <i className="bi bi-plug"></i>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={3} md={6} className="mb-3">
                <Card className="kpi-card h-100">
                  <Card.Body>
                    <div className="d-flex justify-content-between">
                      <div>
                        <div className="kpi-label">Active Routes</div>
                        <div className="kpi-value">0</div>
                        <div className="kpi-meta">Mapped endpoints</div>
                      </div>
                      <div className="kpi-icon">
                        <i className="bi bi-signpost-2"></i>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={3} md={6} className="mb-3">
                <Card className="kpi-card h-100">
                  <Card.Body>
                    <div className="d-flex justify-content-between">
                      <div>
                        <div className="kpi-label">Requests (7d)</div>
                        <div className="kpi-value">{auditTotal}</div>
                        <div className="kpi-meta">Rolling volume</div>
                      </div>
                      <div className="kpi-icon">
                        <i className="bi bi-graph-up"></i>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={3} md={6} className="mb-3">
                <Card className="kpi-card h-100">
                  <Card.Body>
                    <div className="d-flex justify-content-between">
                      <div>
                        <div className="kpi-label">System Health</div>
                        <div className={`kpi-value ${auditCritical > 0 ? 'text-danger' : 'text-success'}`}>
                          {auditCritical > 0 ? 'At Risk' : 'Healthy'}
                        </div>
                        <div className="kpi-meta">
                          {auditCritical > 0 ? `${auditCritical} critical alerts` : 'All services stable'}
                        </div>
                      </div>
                      <div className="kpi-icon">
                        <i className="bi bi-activity"></i>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Row className="page-section g-3">
              <Col lg={6}>
                <Card className="chart-card">
                  <Card.Body>
                    <div className="chart-header">
                      <div>
                        <div className="chart-title">Request Volume</div>
                        <div className="chart-subtitle">Last 7 days</div>
                      </div>
                      <div className="chart-metric">0 req</div>
                    </div>
                    <div className="mini-chart">
                      {requestBars.map((height, index) => (
                        <span key={index} style={{ height: `${height}%` }} />
                      ))}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={6}>
                <Card className="chart-card">
                  <Card.Body>
                    <div className="chart-header">
                      <div>
                        <div className="chart-title">Latency Overview</div>
                        <div className="chart-subtitle">Average response time</div>
                      </div>
                      <div className="chart-metric">0 ms</div>
                    </div>
                    <div className="mini-chart">
                      {latencyBars.map((height, index) => (
                        <span key={index} style={{ height: `${height}%` }} />
                      ))}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Row className="page-section">
              <Col lg={12}>
                <Card className="chart-card">
                  <Card.Body>
                    <div className="chart-header">
                      <div>
                        <div className="chart-title">Recent Audit Activity</div>
                        <div className="chart-subtitle">Latest security and governance events</div>
                      </div>
                      <Button variant="outline-secondary" size="sm" onClick={() => navigate('/audit-logs')}>
                        View all logs
                      </Button>
                    </div>

                    {auditLoading && (
                      <div className="text-center py-4">
                        <Spinner animation="border" variant="primary" size="sm" />
                      </div>
                    )}

                    {auditError && !auditLoading && (
                      <Alert variant="danger" className="mt-3">
                        {auditError}
                      </Alert>
                    )}

                    {!auditLoading && !auditError && auditLogs.length === 0 && (
                      <div className="text-muted mt-3">No audit activity yet.</div>
                    )}

                    {!auditLoading && !auditError && auditLogs.length > 0 && (
                      <div className="mt-3">
                        {auditLogs.map((log) => (
                          <div key={log.id} className="d-flex justify-content-between align-items-center border-bottom py-2">
                            <div>
                              <div className="fw-semibold">{log.action}</div>
                              <div className="text-muted small">
                                {log.resource_type} • {new Date(log.created_at).toLocaleString()}
                              </div>
                            </div>
                            <div className="d-flex gap-2">
                              <Badge bg={log.status === 'success' ? 'success' : log.status === 'failure' ? 'danger' : 'warning'}>
                                {log.status}
                              </Badge>
                              <Badge bg={log.severity === 'critical' ? 'dark' : log.severity === 'error' ? 'danger' : log.severity === 'warn' ? 'warning' : 'info'}>
                                {log.severity}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Quick Actions */}
            <Card>
              <Card.Body>
                <h5 className="type-h3 mb-3">Quick Actions</h5>
                <p className="type-caption mb-4">Common administrative tasks</p>
                
                <Row className="g-3 quick-actions-grid">
                  <Col md={4}>
                    <Button 
                      variant="light"
                      className="w-100 py-3 d-flex flex-column align-items-center justify-content-center"
                      style={{ minHeight: '110px' }}
                      onClick={() => navigate('/connectors')}
                    >
                      <i className="bi bi-plug fs-4 mb-2"></i>
                      <span>Review Connectors</span>
                    </Button>
                  </Col>
                  <Col md={4}>
                    <Button 
                      variant="light"
                      className="w-100 py-3 d-flex flex-column align-items-center justify-content-center"
                      style={{ minHeight: '110px' }}
                      onClick={() => navigate('/routes')}
                    >
                      <i className="bi bi-signpost-2 fs-4 mb-2"></i>
                      <span>Manage Routes</span>
                    </Button>
                  </Col>
                  <Col md={4}>
                    <Button 
                      variant="light"
                      className="w-100 py-3 d-flex flex-column align-items-center justify-content-center"
                      style={{ minHeight: '110px' }}
                      onClick={() => navigate('/audit-logs')}
                    >
                      <i className="bi bi-shield-check fs-4 mb-2"></i>
                      <span>Security & Monitoring</span>
                    </Button>
                  </Col>
                  <Col md={4}>
                    <Button 
                      variant="light"
                      className="w-100 py-3 d-flex flex-column align-items-center justify-content-center"
                      style={{ minHeight: '110px' }}
                      onClick={() => navigate('/connectors')}
                    >
                      <i className="bi bi-graph-up-arrow fs-4 mb-2"></i>
                      <span>API Performance</span>
                    </Button>
                  </Col>
                  <Col md={4}>
                    <Button 
                      variant="light"
                      className="w-100 py-3 d-flex flex-column align-items-center justify-content-center"
                      style={{ minHeight: '110px' }}
                      onClick={() => navigate('/audit-logs')}
                    >
                      <i className="bi bi-activity fs-4 mb-2"></i>
                      <span>System Performance</span>
                    </Button>
                  </Col>
                  <Col md={4}>
                    <Button 
                      variant="light"
                      className="w-100 py-3 d-flex flex-column align-items-center justify-content-center border"
                      style={{ minHeight: '110px' }}
                      onClick={() => navigate('/routes')}
                    >
                      <i className="bi bi-file-earmark-text fs-4 mb-2"></i>
                      <span>Configuration Stats</span>
                    </Button>
                  </Col>
                  <Col md={4}>
                    <Button 
                      variant="light"
                      className="w-100 py-3 d-flex flex-column align-items-center justify-content-center"
                      style={{ minHeight: '110px' }}
                      onClick={() => navigate('/audit-logs')}
                    >
                      <i className="bi bi-file-earmark-check fs-4 mb-2"></i>
                      <span>Compliance Review</span>
                    </Button>
                  </Col>
                  <Col md={4}>
                    <Button 
                      variant="light"
                      className="w-100 py-3 d-flex flex-column align-items-center justify-content-center"
                      style={{ minHeight: '110px' }}
                      onClick={() => navigate('/connectors')}
                    >
                      <i className="bi bi-arrow-repeat fs-4 mb-2"></i>
                      <span>Integration Health</span>
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Tab.Pane>

          <Tab.Pane eventKey="connectors">
            <Card className="border-0 shadow-sm">
              <Card.Body className="text-center py-5">
                <i className="bi bi-plug display-1 text-muted mb-3"></i>
                <h4>API Connectors</h4>
                <p className="text-muted mb-4">Manage external API connections and configurations</p>
                <Button variant="primary" onClick={() => navigate('/connectors')}>
                  <i className="bi bi-plus-circle me-2"></i>
                  Go to Connectors
                </Button>
              </Card.Body>
            </Card>
          </Tab.Pane>

          <Tab.Pane eventKey="routes">
            <Card className="border-0 shadow-sm">
              <Card.Body className="text-center py-5">
                <i className="bi bi-signpost-2 display-1 text-muted mb-3"></i>
                <h4>API Routes</h4>
                <p className="text-muted mb-4">Configure routing rules and endpoint mappings</p>
                <Button variant="primary" onClick={() => navigate('/routes')}>
                  <i className="bi bi-plus-circle me-2"></i>
                  Go to Routes
                </Button>
              </Card.Body>
            </Card>
          </Tab.Pane>

          <Tab.Pane eventKey="users">
            <Card className="border-0 shadow-sm">
              <Card.Body className="text-center py-5">
                <i className="bi bi-people display-1 text-muted mb-3"></i>
                <h4>User Management</h4>
                <p className="text-muted mb-4">Manage user accounts and permissions</p>
                <p className="text-muted">
                  <small>Currently logged in as: <strong>{user?.email}</strong></small>
                </p>
              </Card.Body>
            </Card>
          </Tab.Pane>

          <Tab.Pane eventKey="audit">
            <Card className="border-0 shadow-sm">
              <Card.Body className="text-center py-5">
                <i className="bi bi-clipboard-data display-1 text-muted mb-3"></i>
                <h4>Audit Logs</h4>
                <p className="text-muted mb-4">Review system activity and security events</p>
                <Button variant="primary" onClick={() => navigate('/audit-logs')}>
                  <i className="bi bi-eye me-2"></i>
                  View Audit Logs
                </Button>
              </Card.Body>
            </Card>
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </Container>
  );
}
