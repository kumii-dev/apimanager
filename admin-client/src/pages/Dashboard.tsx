import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

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
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h1>📊 Dashboard</h1>
            <Button variant="outline-danger" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <h5>👤 Welcome, {user?.email}</h5>
              <p className="text-muted mb-0">
                You're logged into the KUMII API Gateway Admin Console
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={4} className="mb-3">
          <Card className="h-100">
            <Card.Body>
              <h5>🔌 API Connectors</h5>
              <p className="text-muted">Manage external API connections</p>
              <Button 
                variant="primary" 
                size="sm"
                onClick={() => navigate('/connectors')}
              >
                View Connectors
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4} className="mb-3">
          <Card className="h-100">
            <Card.Body>
              <h5>🛣️ API Routes</h5>
              <p className="text-muted">Configure routing and endpoints</p>
              <Button 
                variant="primary" 
                size="sm"
                onClick={() => navigate('/routes')}
              >
                View Routes
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4} className="mb-3">
          <Card className="h-100">
            <Card.Body>
              <h5>📋 Audit Logs</h5>
              <p className="text-muted">Review system activity logs</p>
              <Button 
                variant="primary" 
                size="sm"
                onClick={() => navigate('/audit-logs')}
              >
                View Logs
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col>
          <Card bg="light">
            <Card.Body>
              <h5>🚀 Quick Start</h5>
              <ol>
                <li>Configure your API connectors to connect to external services</li>
                <li>Set up routes to define how requests are proxied</li>
                <li>Monitor system activity through audit logs</li>
              </ol>
              <p className="text-muted mb-0">
                <strong>Note:</strong> All endpoints are currently stubs and will be implemented next.
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
