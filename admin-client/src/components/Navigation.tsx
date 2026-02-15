import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

export default function Navigation() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
  <Navbar bg="dark" variant="dark" expand="lg" className="app-navbar mb-4">
      <Container>
        <Navbar.Brand as={Link} to="/dashboard">
          <i className="bi bi-shield-lock me-2"></i>
          KUMII API Gateway
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/dashboard">
              <i className="bi bi-speedometer2 me-1"></i>
              Dashboard
            </Nav.Link>
            <Nav.Link as={Link} to="/connectors">
              <i className="bi bi-plug me-1"></i>
              Connectors
            </Nav.Link>
            <Nav.Link as={Link} to="/routes">
              <i className="bi bi-signpost-2 me-1"></i>
              Routes
            </Nav.Link>
            <Nav.Link as={Link} to="/ai-governance">
              🛡️ AI Governance
            </Nav.Link>
            <Nav.Link as={Link} to="/audit-logs">
              <i className="bi bi-clipboard-data me-1"></i>
              Audit Logs
            </Nav.Link>
          </Nav>
          <Button variant="outline-light" size="sm" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right me-1"></i>
            Logout
          </Button>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
