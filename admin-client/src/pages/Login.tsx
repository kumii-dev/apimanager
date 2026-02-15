import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { supabase } from '../services/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        setMessage('Login successful! Redirecting...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        // Provide helpful error messages for common issues
        if (error.message.includes('Anonymous sign-ins are disabled')) {
          throw new Error(
            'Sign-ups are currently disabled. Please contact your administrator to enable email authentication in Supabase (Authentication → Providers → Email).'
          );
        }
        throw error;
      }

      if (data.user) {
        if (data.user.identities && data.user.identities.length === 0) {
          setMessage('This email is already registered. Please use the Sign In button instead.');
        } else {
          setMessage('Account created! Please check your email to verify your account.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="auth-shell">
      <Card style={{ maxWidth: '420px', width: '100%' }}>
        <Card.Body>
          <h2 className="text-center mb-4 type-h2">
            <i className="bi bi-shield-lock"></i> KUMII API Gateway
          </h2>
          <h5 className="text-center type-subtitle mb-4">Admin Console</h5>

          {error && <Alert variant="danger">{error}</Alert>}
          {message && <Alert variant="success">{message}</Alert>}

          <Form onSubmit={handleLogin}>
            <Form.Group className="mb-3" controlId="email">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="password">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </Form.Group>

            <div className="d-grid gap-2">
              <Button 
                variant="primary" 
                type="submit" 
                disabled={loading}
                size="lg"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>

              <Button 
                variant="outline-secondary" 
                onClick={handleSignUp}
                disabled={loading}
                type="button"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </div>
          </Form>

          <div className="text-center mt-3">
            <small className="text-muted">
              Secure authentication powered by Supabase
            </small>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}
