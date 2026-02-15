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
import { apiClient } from '../services/api';

interface ApiRoute {
  id: string;
  connector_id: string;
  name: string;
  module_prefix: string;
  path_pattern: string;
  http_method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';
  upstream_path: string;
  auth_required: boolean;
  allowed_roles: string[];
  priority: number;
  is_active: boolean;
  rate_limit_config?: {
    enabled: boolean;
    max_requests: number;
    window_seconds: number;
  };
  cache_config?: {
    enabled: boolean;
    ttl_seconds: number;
  };
  created_at: string;
  updated_at: string;
}

interface Connector {
  id: string;
  name: string;
  type: string;
  base_url: string;
}

interface RouteFormData {
  connector_id: string;
  name: string;
  module_prefix: string;
  path_pattern: string;
  http_method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';
  upstream_path: string;
  auth_required: boolean;
  allowed_roles: string[];
  priority: number;
  is_active: boolean;
  rate_limit_enabled: boolean;
  rate_limit_max_requests: number;
  rate_limit_window_seconds: number;
  cache_enabled: boolean;
  cache_ttl_seconds: number;
}

const MODULE_PREFIXES = [
  '/api/v1/market',
  '/api/v1/capital',
  '/api/v1/mentorship',
  '/api/v1/collaboration',
  '/api/v1/cms',
  '/api/v1/analytics',
];

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

const AVAILABLE_ROLES = ['user', 'staff', 'tenant_admin', 'platform_admin'];

export default function Routes() {
  const [routes, setRoutes] = useState<ApiRoute[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<ApiRoute | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState<RouteFormData>({
    connector_id: '',
    name: '',
    module_prefix: '/api/v1/market',
    path_pattern: '',
    http_method: 'GET',
    upstream_path: '',
    auth_required: true,
    allowed_roles: ['user', 'staff', 'tenant_admin', 'platform_admin'],
    priority: 100,
    is_active: true,
    rate_limit_enabled: true,
    rate_limit_max_requests: 100,
    rate_limit_window_seconds: 60,
    cache_enabled: false,
    cache_ttl_seconds: 60,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [routesRes, connectorsRes] = await Promise.all([
        apiClient.get('/admin/routes'),
        apiClient.get('/admin/connectors'),
      ]);
      setRoutes(routesRes.data.routes || []);
      setConnectors(connectorsRes.data.connectors || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleShowModal = (route?: ApiRoute) => {
    if (route) {
      setEditingRoute(route);
      setFormData({
        connector_id: route.connector_id,
        name: route.name,
        module_prefix: route.module_prefix,
        path_pattern: route.path_pattern,
        http_method: route.http_method,
        upstream_path: route.upstream_path,
        auth_required: route.auth_required,
        allowed_roles: route.allowed_roles,
        priority: route.priority,
        is_active: route.is_active,
        rate_limit_enabled: route.rate_limit_config?.enabled || false,
        rate_limit_max_requests: route.rate_limit_config?.max_requests || 100,
        rate_limit_window_seconds: route.rate_limit_config?.window_seconds || 60,
        cache_enabled: route.cache_config?.enabled || false,
        cache_ttl_seconds: route.cache_config?.ttl_seconds || 60,
      });
    } else {
      setEditingRoute(null);
      setFormData({
        connector_id: connectors[0]?.id || '',
        name: '',
        module_prefix: '/api/v1/market',
        path_pattern: '',
        http_method: 'GET',
        upstream_path: '',
        auth_required: true,
        allowed_roles: ['user', 'staff', 'tenant_admin', 'platform_admin'],
        priority: 100,
        is_active: true,
        rate_limit_enabled: true,
        rate_limit_max_requests: 100,
        rate_limit_window_seconds: 60,
        cache_enabled: false,
        cache_ttl_seconds: 60,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRoute(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        connector_id: formData.connector_id,
        name: formData.name,
        module_prefix: formData.module_prefix,
        path_pattern: formData.path_pattern,
        http_method: formData.http_method,
        upstream_path: formData.upstream_path,
        auth_required: formData.auth_required,
        allowed_roles: formData.allowed_roles,
        priority: formData.priority,
        is_active: formData.is_active,
        rate_limit_config: {
          enabled: formData.rate_limit_enabled,
          max_requests: formData.rate_limit_max_requests,
          window_seconds: formData.rate_limit_window_seconds,
        },
        cache_config: {
          enabled: formData.cache_enabled,
          ttl_seconds: formData.cache_ttl_seconds,
        },
      };

      if (editingRoute) {
        await apiClient.put(`/admin/routes/${editingRoute.id}`, payload);
      } else {
        await apiClient.post('/admin/routes', payload);
      }
      handleCloseModal();
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save route');
      console.error('Error saving route:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this route?')) return;

    try {
      await apiClient.delete(`/admin/routes/${id}`);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete route');
      console.error('Error deleting route:', err);
    }
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'primary',
      POST: 'success',
      PUT: 'warning',
      PATCH: 'info',
      DELETE: 'danger',
      OPTIONS: 'secondary',
    };
    return colors[method] || 'secondary';
  };

  const getConnectorName = (connectorId: string) => {
    const connector = connectors.find((c) => c.id === connectorId);
    return connector?.name || 'Unknown';
  };

  const getFilteredRoutes = () => {
    let filtered = routes;

    if (methodFilter !== 'all') {
      filtered = filtered.filter(route => route.http_method === methodFilter);
    }

    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter(route => route.is_active === isActive);
    }

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(route =>
        route.name.toLowerCase().includes(query) ||
        route.path_pattern.toLowerCase().includes(query) ||
        route.module_prefix.toLowerCase().includes(query) ||
        getConnectorName(route.connector_id).toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const toggleRoleSelection = (role: string) => {
    const currentRoles = formData.allowed_roles;
    if (currentRoles.includes(role)) {
      setFormData({ ...formData, allowed_roles: currentRoles.filter((r) => r !== role) });
    } else {
      setFormData({ ...formData, allowed_roles: [...currentRoles, role] });
    }
  };

  return (
    <Container className="page-container">
      <Row className="page-section">
        <Col>
          <div className="page-header">
            <div>
              <h1 className="page-title type-h1">
                <i className="bi bi-signpost-2 me-2"></i>
                API Routes
              </h1>
              <p className="page-subtitle type-subtitle">Configure routing rules and endpoint mappings</p>
            </div>
            <div className="page-stats">
              <span className="stat-chip">Total: {routes.length}</span>
              <span className="stat-chip secondary">Filtered: {getFilteredRoutes().length}</span>
            </div>
          </div>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {connectors.length === 0 && !loading && (
        <Alert variant="warning">
          <i className="bi bi-exclamation-triangle me-2"></i>
          You need to create at least one API Connector before adding routes.
        </Alert>
      )}

  <Row className="page-section">
        <Col>
          <Card className="data-card">
            <div className="action-bar">
              <div className="filters">
                <Form.Control
                  size="sm"
                  placeholder="Search routes or connectors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Form.Select
                  size="sm"
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                >
                  <option value="all">All Methods</option>
                  {HTTP_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </Form.Select>
                <Form.Select
                  size="sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Form.Select>
              </div>
              <div className="d-flex gap-2">
                <Button variant="outline-secondary" size="sm" onClick={fetchData}>
                  <i className="bi bi-arrow-repeat me-1"></i>
                  Refresh
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleShowModal()}
                  disabled={connectors.length === 0}
                >
                  <i className="bi bi-plus-circle me-1"></i>
                  Add Route
                </Button>
              </div>
            </div>
            <Card.Body className="table-card-body">
              {loading ? (
                <div className="empty-state">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                </div>
              ) : routes.length === 0 ? (
                <div className="empty-state">
                  <i className="bi bi-inbox display-1 text-muted"></i>
                  <h5 className="mt-3 text-muted">No routes found</h5>
                  <p className="text-muted">Create your first API route to start routing requests</p>
                  {connectors.length > 0 && (
                    <Button variant="primary" onClick={() => handleShowModal()}>
                      <i className="bi bi-plus-circle me-1"></i>
                      Add Route
                    </Button>
                  )}
                </div>
              ) : getFilteredRoutes().length === 0 ? (
                <div className="empty-state">
                  <i className="bi bi-search display-1 text-muted"></i>
                  <h5 className="mt-3 text-muted">No routes match</h5>
                  <p className="text-muted">Try adjusting your search or filters.</p>
                </div>
              ) : (
                <>
                  <div className="d-flex justify-content-between align-items-center px-4 pt-3 pb-2">
                    <div className="text-muted small">
                      Showing <strong>{getFilteredRoutes().length}</strong> routes
                    </div>
                  </div>
                  <div className="table-responsive">
                    <Table responsive hover className="data-table align-middle">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Method</th>
                      <th>Path</th>
                      <th>Connector</th>
                      <th>Auth</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredRoutes().map((route) => (
                      <tr key={route.id}>
                        <td>
                          <strong>{route.name}</strong>
                          <div className="small text-muted">{route.module_prefix}</div>
                        </td>
                        <td>
                          <Badge bg={getMethodColor(route.http_method)}>{route.http_method}</Badge>
                        </td>
                        <td>
                          <code className="text-muted small">{route.path_pattern}</code>
                        </td>
                        <td>{getConnectorName(route.connector_id)}</td>
                        <td>
                          {route.auth_required ? (
                            <Badge bg="warning">
                              <i className="bi bi-lock"></i> Required
                            </Badge>
                          ) : (
                            <Badge bg="secondary">
                              <i className="bi bi-unlock"></i> None
                            </Badge>
                          )}
                        </td>
                        <td>{route.priority}</td>
                        <td>
                          <Badge bg={route.is_active ? 'success' : 'secondary'}>
                            {route.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="text-end">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => handleShowModal(route)}
                          >
                            <i className="bi bi-pencil"></i>
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(route.id)}
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-signpost-2 me-2"></i>
            {editingRoute ? 'Edit Route' : 'Add New Route'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Route Name *</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., Get Product Details"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Connector *</Form.Label>
                  <Form.Select
                    value={formData.connector_id}
                    onChange={(e) => setFormData({ ...formData, connector_id: e.target.value })}
                    required
                  >
                    <option value="">Select a connector...</option>
                    {connectors.map((connector) => (
                      <option key={connector.id} value={connector.id}>
                        {connector.name} ({connector.type.toUpperCase()})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Module Prefix *</Form.Label>
                  <Form.Select
                    value={formData.module_prefix}
                    onChange={(e) => setFormData({ ...formData, module_prefix: e.target.value })}
                    required
                  >
                    {MODULE_PREFIXES.map((prefix) => (
                      <option key={prefix} value={prefix}>
                        {prefix}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>HTTP Method *</Form.Label>
                  <Form.Select
                    value={formData.http_method}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        http_method: e.target.value as RouteFormData['http_method'],
                      })
                    }
                    required
                  >
                    {HTTP_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label>Path Pattern *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="/products/:id"
                    value={formData.path_pattern}
                    onChange={(e) => setFormData({ ...formData, path_pattern: e.target.value })}
                    required
                  />
                  <Form.Text className="text-muted">Use :param for path parameters</Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Upstream Path *</Form.Label>
              <Form.Control
                type="text"
                placeholder="/api/products/{'{id}'}"
                value={formData.upstream_path}
                onChange={(e) => setFormData({ ...formData, upstream_path: e.target.value })}
                required
              />
              <Form.Text className="text-muted">
                Target path on the upstream API (use {'{param}'} for path parameters)
              </Form.Text>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Priority</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    max="1000"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  />
                  <Form.Text className="text-muted">Higher = higher priority (default: 100)</Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Check
                    type="switch"
                    id="route_is_active"
                    label="Active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="auth_required"
                label="Authentication Required"
                checked={formData.auth_required}
                onChange={(e) => setFormData({ ...formData, auth_required: e.target.checked })}
              />
            </Form.Group>

            {formData.auth_required && (
              <Form.Group className="mb-3">
                <Form.Label>Allowed Roles</Form.Label>
                {AVAILABLE_ROLES.map((role) => (
                  <Form.Check
                    key={role}
                    type="checkbox"
                    id={`role-${role}`}
                    label={role}
                    checked={formData.allowed_roles.includes(role)}
                    onChange={() => toggleRoleSelection(role)}
                  />
                ))}
              </Form.Group>
            )}

            <hr />

            <h6>Rate Limiting</h6>
            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="rate_limit_enabled"
                label="Enable Rate Limiting"
                checked={formData.rate_limit_enabled}
                onChange={(e) => setFormData({ ...formData, rate_limit_enabled: e.target.checked })}
              />
            </Form.Group>

            {formData.rate_limit_enabled && (
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Max Requests</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      value={formData.rate_limit_max_requests}
                      onChange={(e) =>
                        setFormData({ ...formData, rate_limit_max_requests: parseInt(e.target.value) })
                      }
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Window (seconds)</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      value={formData.rate_limit_window_seconds}
                      onChange={(e) =>
                        setFormData({ ...formData, rate_limit_window_seconds: parseInt(e.target.value) })
                      }
                    />
                  </Form.Group>
                </Col>
              </Row>
            )}

            <hr />

            <h6>Caching</h6>
            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="cache_enabled"
                label="Enable Response Caching"
                checked={formData.cache_enabled}
                onChange={(e) => setFormData({ ...formData, cache_enabled: e.target.checked })}
              />
            </Form.Group>

            {formData.cache_enabled && (
              <Form.Group className="mb-3">
                <Form.Label>Cache TTL (seconds)</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  value={formData.cache_ttl_seconds}
                  onChange={(e) => setFormData({ ...formData, cache_ttl_seconds: parseInt(e.target.value) })}
                />
              </Form.Group>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              <i className="bi bi-check-circle me-1"></i>
              {editingRoute ? 'Update Route' : 'Create Route'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}
