import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Nav, Tab } from 'react-bootstrap';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
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

  return (
    <Container fluid className="mt-4 px-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <h1 className="mb-1">Admin Dashboard</h1>
          <p className="text-muted">Manage connectors, routes, and platform activities</p>
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
            <Row className="mb-4">
              <Col lg={3} md={6} className="mb-3">
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="text-muted small mb-1">Total Connectors</div>
                        <h2 className="mb-0">0</h2>
                      </div>
                      <i className="bi bi-plug fs-3 text-primary"></i>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={3} md={6} className="mb-3">
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="text-muted small mb-1">Active Routes</div>
                        <h2 className="mb-0">0</h2>
                      </div>
                      <i className="bi bi-signpost-2 fs-3 text-success"></i>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={3} md={6} className="mb-3">
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="text-muted small mb-1">Total Requests</div>
                        <h2 className="mb-0">0</h2>
                      </div>
                      <i className="bi bi-graph-up fs-3 text-info"></i>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={3} md={6} className="mb-3">
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="text-muted small mb-1">System Health</div>
                        <h2 className="mb-0 text-success">Healthy</h2>
                      </div>
                      <i className="bi bi-activity fs-3 text-success"></i>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Quick Actions */}
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <h5 className="mb-3">Quick Actions</h5>
                <p className="text-muted small mb-4">Common administrative tasks</p>
                
                <Row className="g-3">
                  <Col md={4}>
                    <Button 
                      variant="secondary"
                      className="w-100 py-3 d-flex flex-column align-items-center justify-content-center"
                      style={{ backgroundColor: '#7d8471', borderColor: '#7d8471', minHeight: '100px' }}
                      onClick={() => navigate('/connectors')}
                    >
                      <i className="bi bi-plug fs-4 mb-2"></i>
                      <span>Review Connectors</span>
                    </Button>
                  </Col>
                  <Col md={4}>
                    <Button 
                      variant="secondary"
                      className="w-100 py-3 d-flex flex-column align-items-center justify-content-center"
                      style={{ backgroundColor: '#7d8471', borderColor: '#7d8471', minHeight: '100px' }}
                      onClick={() => navigate('/routes')}
                    >
                      <i className="bi bi-signpost-2 fs-4 mb-2"></i>
                      <span>Manage Routes</span>
                    </Button>
                  </Col>
                  <Col md={4}>
                    <Button 
                      variant="secondary"
                      className="w-100 py-3 d-flex flex-column align-items-center justify-content-center"
                      style={{ backgroundColor: '#7d8471', borderColor: '#7d8471', minHeight: '100px' }}
                      onClick={() => navigate('/audit-logs')}
                    >
                      <i className="bi bi-shield-check fs-4 mb-2"></i>
                      <span>Security & Monitoring</span>
                    </Button>
                  </Col>
                  <Col md={4}>
                    <Button 
                      variant="secondary"
                      className="w-100 py-3 d-flex flex-column align-items-center justify-content-center"
                      style={{ backgroundColor: '#7d8471', borderColor: '#7d8471', minHeight: '100px' }}
                      onClick={() => navigate('/connectors')}
                    >
                      <i className="bi bi-graph-up-arrow fs-4 mb-2"></i>
                      <span>API Performance</span>
                    </Button>
                  </Col>
                  <Col md={4}>
                    <Button 
                      variant="secondary"
                      className="w-100 py-3 d-flex flex-column align-items-center justify-content-center"
                      style={{ backgroundColor: '#7d8471', borderColor: '#7d8471', minHeight: '100px' }}
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
                      style={{ minHeight: '100px' }}
                      onClick={() => navigate('/routes')}
                    >
                      <i className="bi bi-file-earmark-text fs-4 mb-2"></i>
                      <span>Configuration Stats</span>
                    </Button>
                  </Col>
                  <Col md={4}>
                    <Button 
                      variant="secondary"
                      className="w-100 py-3 d-flex flex-column align-items-center justify-content-center"
                      style={{ backgroundColor: '#7d8471', borderColor: '#7d8471', minHeight: '100px' }}
                      onClick={() => navigate('/audit-logs')}
                    >
                      <i className="bi bi-file-earmark-check fs-4 mb-2"></i>
                      <span>Compliance Review</span>
                    </Button>
                  </Col>
                  <Col md={4}>
                    <Button 
                      variant="secondary"
                      className="w-100 py-3 d-flex flex-column align-items-center justify-content-center"
                      style={{ backgroundColor: '#7d8471', borderColor: '#7d8471', minHeight: '100px' }}
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
