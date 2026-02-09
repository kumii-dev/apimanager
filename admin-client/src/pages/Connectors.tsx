import { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Table,
  Badge,
  Modal,
  Form,
  Alert,
  Spinner,
} from 'react-bootstrap';
import axios from 'axios';
import { supabase } from '../services/supabase';

interface Connector {
  id: string;
  name: string;
  type: 'rest' | 'graphql' | 'soap' | 'custom';
  base_url: string;
  auth_type: 'none' | 'api_key' | 'bearer' | 'basic' | 'oauth2' | 'custom';
  timeout_ms: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ConnectorFormData {
  name: string;
  type: 'rest' | 'graphql' | 'soap' | 'custom';
  base_url: string;
  auth_type: 'none' | 'api_key' | 'bearer' | 'basic' | 'oauth2' | 'custom';
  timeout_ms: number;
  is_active: boolean;
  // Auth credentials
  api_key?: string;
  api_key_header?: string;
  bearer_token?: string;
  basic_username?: string;
  basic_password?: string;
  oauth_client_id?: string;
  oauth_client_secret?: string;
}

// Use relative URL in production (Vercel), localhost in development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (window.location.hostname === 'localhost' ? 'http://localhost:3000' : '');

export default function Connectors() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingConnector, setEditingConnector] = useState<Connector | null>(null);
  const [formData, setFormData] = useState<ConnectorFormData>({
    name: '',
    type: 'rest',
    base_url: '',
    auth_type: 'none',
    timeout_ms: 30000,
    is_active: true,
    api_key_header: 'X-API-Key',
  });

  useEffect(() => {
    fetchConnectors();
  }, []);

  const fetchConnectors = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }
      
      const response = await axios.get(`${API_BASE_URL}/admin/connectors`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      setConnectors(response.data.connectors || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch connectors');
      console.error('Error fetching connectors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleShowModal = (connector?: Connector) => {
    if (connector) {
      setEditingConnector(connector);
      setFormData({
        name: connector.name,
        type: connector.type,
        base_url: connector.base_url,
        auth_type: connector.auth_type,
        timeout_ms: connector.timeout_ms,
        is_active: connector.is_active,
      });
    } else {
      setEditingConnector(null);
      setFormData({
        name: '',
        type: 'rest',
        base_url: '',
        auth_type: 'none',
        timeout_ms: 30000,
        is_active: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingConnector(null);
    setFormData({
      name: '',
      type: 'rest',
      base_url: '',
      auth_type: 'none',
      timeout_ms: 30000,
      is_active: true,
      api_key_header: 'X-API-Key',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      
      console.log('Submitting connector data:', formData);
      
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }
      
      // Prepare the payload
      const payload = {
        name: formData.name,
        type: formData.type,
        base_url: formData.base_url,
        auth_type: formData.auth_type,
        timeout_ms: formData.timeout_ms,
        is_active: formData.is_active,
        // Add auth credentials if present
        ...(formData.api_key && { api_key: formData.api_key }),
        ...(formData.api_key_header && { api_key_header: formData.api_key_header }),
        ...(formData.bearer_token && { bearer_token: formData.bearer_token }),
        ...(formData.basic_username && { basic_username: formData.basic_username }),
        ...(formData.basic_password && { basic_password: formData.basic_password }),
        ...(formData.oauth_client_id && { oauth_client_id: formData.oauth_client_id }),
        ...(formData.oauth_client_secret && { oauth_client_secret: formData.oauth_client_secret }),
      };
      
      console.log('Sending payload:', payload);
      console.log('API_BASE_URL:', API_BASE_URL);
      console.log('Full URL:', `${API_BASE_URL}/admin/connectors`);
      console.log('Has auth token:', !!session.access_token);
      
      const axiosConfig = {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      };
      
      console.log('Axios config:', axiosConfig);
      
      if (editingConnector) {
        console.log('Updating connector:', editingConnector.id);
        const response = await axios.put(`${API_BASE_URL}/admin/connectors/${editingConnector.id}`, payload, axiosConfig);
        console.log('Update response:', response.data);
      } else {
        console.log('Creating new connector...');
        const response = await axios.post(`${API_BASE_URL}/admin/connectors`, payload, axiosConfig);
        console.log('Create response:', response.data);
      }
      
      handleCloseModal();
      await fetchConnectors();
    } catch (err: any) {
      console.error('Full error object:', err);
      console.error('Error response:', err.response);
      console.error('Error request:', err.request);
      console.error('Error message:', err.message);
      console.error('Error config:', err.config);
      
      let errorMessage = 'Failed to save connector';
      if (err.response) {
        // Server responded with error
        errorMessage = err.response.data?.message || err.response.data?.error || `Server error: ${err.response.status}`;
      } else if (err.request) {
        // Request made but no response
        errorMessage = 'No response from server - check network connection and backend';
      } else {
        // Error setting up request
        errorMessage = err.message || 'Failed to save connector';
      }
      
      setError(errorMessage);
      alert(`Error: ${errorMessage}\n\nCheck browser console for details`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this connector?')) return;

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }
      
      await axios.delete(`${API_BASE_URL}/admin/connectors/${id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      fetchConnectors();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete connector');
      console.error('Error deleting connector:', err);
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      rest: 'primary',
      graphql: 'success',
      soap: 'warning',
      custom: 'secondary',
    };
    return colors[type] || 'secondary';
  };

  const getAuthTypeLabel = (authType: string) => {
    const labels: Record<string, string> = {
      none: 'None',
      api_key: 'API Key',
      bearer: 'Bearer Token',
      basic: 'Basic Auth',
      oauth2: 'OAuth 2.0',
      custom: 'Custom',
    };
    return labels[authType] || authType;
  };

  return (
    <Container className="mt-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1>
                <i className="bi bi-plug me-2"></i>
                API Connectors
              </h1>
              <p className="text-muted">Manage external API connections and configurations</p>
            </div>
            <Button variant="primary" onClick={() => handleShowModal()}>
              <i className="bi bi-plus-circle me-1"></i>
              Add Connector
            </Button>
          </div>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Row>
        <Col>
          <Card>
            <Card.Body>
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                </div>
              ) : connectors.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-inbox display-1 text-muted"></i>
                  <h5 className="mt-3 text-muted">No connectors found</h5>
                  <p className="text-muted">Create your first API connector to get started</p>
                  <Button variant="primary" onClick={() => handleShowModal()}>
                    <i className="bi bi-plus-circle me-1"></i>
                    Add Connector
                  </Button>
                </div>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Base URL</th>
                      <th>Auth Type</th>
                      <th>Timeout</th>
                      <th>Status</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {connectors.map((connector) => (
                      <tr key={connector.id}>
                        <td>
                          <strong>{connector.name}</strong>
                        </td>
                        <td>
                          <Badge bg={getTypeColor(connector.type)}>
                            {connector.type.toUpperCase()}
                          </Badge>
                        </td>
                        <td>
                          <code className="text-muted small">{connector.base_url}</code>
                        </td>
                        <td>{getAuthTypeLabel(connector.auth_type)}</td>
                        <td>{connector.timeout_ms}ms</td>
                        <td>
                          <Badge bg={connector.is_active ? 'success' : 'secondary'}>
                            {connector.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="text-end">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => handleShowModal(connector)}
                          >
                            <i className="bi bi-pencil"></i>
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(connector.id)}
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-plug me-2"></i>
            {editingConnector ? 'Edit Connector' : 'Add New Connector'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
                {error}
              </Alert>
            )}
            
            <Form.Group className="mb-3">
              <Form.Label>Name *</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., Shopify API"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Form.Text className="text-muted">
                A descriptive name for this API connector
              </Form.Text>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Type *</Form.Label>
                  <Form.Select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as ConnectorFormData['type'],
                      })
                    }
                    required
                  >
                    <option value="rest">REST API</option>
                    <option value="graphql">GraphQL</option>
                    <option value="soap">SOAP</option>
                    <option value="custom">Custom</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Authentication Type *</Form.Label>
                  <Form.Select
                    value={formData.auth_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        auth_type: e.target.value as ConnectorFormData['auth_type'],
                      })
                    }
                    required
                  >
                    <option value="none">None</option>
                    <option value="api_key">API Key</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="basic">Basic Auth</option>
                    <option value="oauth2">OAuth 2.0</option>
                    <option value="custom">Custom</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Base URL *</Form.Label>
              <Form.Control
                type="url"
                placeholder="https://api.example.com"
                value={formData.base_url}
                onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                required
              />
              <Form.Text className="text-muted">
                The base URL for all API requests to this connector
              </Form.Text>
            </Form.Group>

            {/* Conditional Authentication Fields */}
            {formData.auth_type === 'api_key' && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>API Key *</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Enter your API key"
                    value={formData.api_key || ''}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    required
                  />
                  <Form.Text className="text-muted">
                    Your API key will be encrypted and stored securely
                  </Form.Text>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>API Key Header Name</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="X-API-Key"
                    value={formData.api_key_header || 'X-API-Key'}
                    onChange={(e) => setFormData({ ...formData, api_key_header: e.target.value })}
                  />
                  <Form.Text className="text-muted">
                    The header name where the API key should be sent (default: X-API-Key)
                  </Form.Text>
                </Form.Group>
              </>
            )}

            {formData.auth_type === 'bearer' && (
              <Form.Group className="mb-3">
                <Form.Label>Bearer Token *</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Enter your bearer token"
                  value={formData.bearer_token || ''}
                  onChange={(e) => setFormData({ ...formData, bearer_token: e.target.value })}
                  required
                />
                <Form.Text className="text-muted">
                  Token will be sent as "Authorization: Bearer [token]"
                </Form.Text>
              </Form.Group>
            )}

            {formData.auth_type === 'basic' && (
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Username *</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter username"
                      value={formData.basic_username || ''}
                      onChange={(e) => setFormData({ ...formData, basic_username: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Password *</Form.Label>
                    <Form.Control
                      type="password"
                      placeholder="Enter password"
                      value={formData.basic_password || ''}
                      onChange={(e) => setFormData({ ...formData, basic_password: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
            )}

            {formData.auth_type === 'oauth2' && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>OAuth Client ID *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter OAuth client ID"
                    value={formData.oauth_client_id || ''}
                    onChange={(e) => setFormData({ ...formData, oauth_client_id: e.target.value })}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>OAuth Client Secret *</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Enter OAuth client secret"
                    value={formData.oauth_client_secret || ''}
                    onChange={(e) => setFormData({ ...formData, oauth_client_secret: e.target.value })}
                    required
                  />
                  <Form.Text className="text-muted">
                    OAuth 2.0 credentials will be encrypted and stored securely
                  </Form.Text>
                </Form.Group>
              </>
            )}

            {formData.auth_type === 'custom' && (
              <Alert variant="info">
                <i className="bi bi-info-circle me-2"></i>
                Custom authentication will require manual header configuration after creation.
              </Alert>
            )}

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Timeout (ms) *</Form.Label>
                  <Form.Control
                    type="number"
                    min="1000"
                    max="300000"
                    step="1000"
                    value={formData.timeout_ms}
                    onChange={(e) =>
                      setFormData({ ...formData, timeout_ms: parseInt(e.target.value) })
                    }
                    required
                  />
                  <Form.Text className="text-muted">Request timeout in milliseconds</Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Check
                    type="switch"
                    id="is_active"
                    label="Active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <Form.Text className="text-muted">
                    Inactive connectors won't be used for routing
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {editingConnector ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle me-1"></i>
                  {editingConnector ? 'Update Connector' : 'Create Connector'}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}
