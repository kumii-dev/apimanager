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
    <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
      <Container>
        <Navbar.Brand as={Link} to="/dashboard">
          🔐 KUMII API Gateway
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/dashboard">
              📊 Dashboard
            </Nav.Link>
            <Nav.Link as={Link} to="/connectors">
              🔌 Connectors
            </Nav.Link>
            <Nav.Link as={Link} to="/routes">
              🛣️ Routes
            </Nav.Link>
            <Nav.Link as={Link} to="/audit-logs">
              📋 Audit Logs
            </Nav.Link>
          </Nav>
          <Button variant="outline-light" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
