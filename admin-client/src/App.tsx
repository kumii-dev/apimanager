/**
 * Main App Component
 * Security-first React application
 */

import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { supabase } from './services/supabase';
import { Session } from '@supabase/supabase-js';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Connectors from './pages/Connectors';
import RoutesPage from './pages/Routes';
import AuditLogs from './pages/AuditLogs';
import AIGovernance from './pages/AIGovernance';
import Navigation from './components/Navigation';

// Styles
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

/**
 * Protected Route Component
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode; session: Session | null }> = ({ 
  children, 
  session 
}) => {
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

/**
 * Main App Component
 */
function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if environment variables are set
  const hasEnvVars = import.meta.env.VITE_SUPABASE_URL && 
                     import.meta.env.VITE_SUPABASE_ANON_KEY;

  useEffect(() => {
    if (!hasEnvVars) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [hasEnvVars]);

  // Show setup message if env vars are missing
  if (!hasEnvVars) {
    return (
      <Container className="mt-5">
        <div className="alert alert-warning" role="alert">
          <h4 className="alert-heading">⚙️ Configuration Required</h4>
          <p>Welcome to KUMII API Gateway Admin Console!</p>
          <hr />
          <p className="mb-0">
            <strong>Next Steps:</strong><br />
            1. Go to your Vercel dashboard<br />
            2. Navigate to Project Settings → Environment Variables<br />
            3. Add the following variables:<br />
            <code>VITE_SUPABASE_URL</code><br />
            <code>VITE_SUPABASE_ANON_KEY</code><br />
            <code>VITE_API_BASE_URL</code><br />
            4. Redeploy the application
          </p>
        </div>
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">✅ Deployment Successful</h5>
            <p className="card-text">
              The application has been deployed successfully. Once you add the environment 
              variables and redeploy, you'll have full access to the admin console.
            </p>
          </div>
        </div>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </Container>
    );
  }

  return (
    <BrowserRouter>
      {session && <Navigation />}
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={session ? <Navigate to="/dashboard" replace /> : <Login />} 
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute session={session}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/connectors"
          element={
            <ProtectedRoute session={session}>
              <Connectors />
            </ProtectedRoute>
          }
        />
        <Route
          path="/routes"
          element={
            <ProtectedRoute session={session}>
              <RoutesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute session={session}>
              <AuditLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai-governance"
          element={
            <ProtectedRoute session={session}>
              <AIGovernance />
            </ProtectedRoute>
          }
        />

        {/* Default Route */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
