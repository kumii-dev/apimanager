import { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Badge,
  Form,
  Alert,
  Spinner,
  InputGroup,
  Button,
  Modal,
  Pagination,
} from 'react-bootstrap';
import { auditLogsApi } from '../services/api';

interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  request_id?: string;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, any>;
  severity: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  status: 'success' | 'failure' | 'pending';
  created_at: string;
}

interface AuditLogFilters {
  action?: string;
  resource_type?: string;
  severity?: string;
  status?: string;
  search?: string;
  page: number;
  pageSize: number;
}

const SEVERITY_LEVELS = ['debug', 'info', 'warn', 'error', 'critical'];
const STATUS_VALUES = ['success', 'failure', 'pending'];
const RESOURCE_TYPES = [
  'connector',
  'route',
  'secret',
  'user',
  'auth',
  'tenant',
  'config',
  'system',
];

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [totalLogs, setTotalLogs] = useState(0);
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    pageSize: 50,
  });

  useEffect(() => {
    fetchLogs();
  }, [filters.page, filters.pageSize]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = {
        page: filters.page,
        pageSize: filters.pageSize,
      };
      
      if (filters.action) params.action = filters.action;
      if (filters.resource_type) params.resource_type = filters.resource_type;
      if (filters.severity) params.severity = filters.severity;
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;

      const response = await auditLogsApi.list(params);
      setLogs(response.data.logs || []);
      setTotalLogs(response.data.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch audit logs');
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof AuditLogFilters, value: any) => {
    setFilters({ ...filters, [key]: value, page: 1 });
  };

  const handleApplyFilters = () => {
    fetchLogs();
  };

  const handleClearFilters = () => {
    setFilters({
      page: 1,
      pageSize: 50,
    });
    setTimeout(() => fetchLogs(), 100);
  };

  const handleShowDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  const handleCloseDetails = () => {
    setSelectedLog(null);
    setShowDetailsModal(false);
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      debug: 'secondary',
      info: 'info',
      warn: 'warning',
      error: 'danger',
      critical: 'dark',
    };
    return colors[severity] || 'secondary';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      success: 'success',
      failure: 'danger',
      pending: 'warning',
    };
    return colors[status] || 'secondary';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatAction = (action: string) => {
    return action.split('.').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' › ');
  };

  const totalPages = Math.ceil(totalLogs / filters.pageSize);

  const renderPagination = () => {
    const items = [];
    const maxVisible = 5;
    
    let startPage = Math.max(1, filters.page - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    items.push(
      <Pagination.First
        key="first"
        onClick={() => setFilters({ ...filters, page: 1 })}
        disabled={filters.page === 1}
      />
    );
    
    items.push(
      <Pagination.Prev
        key="prev"
        onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
        disabled={filters.page === 1}
      />
    );

    if (startPage > 1) {
      items.push(<Pagination.Ellipsis key="ellipsis-start" disabled />);
    }

    for (let page = startPage; page <= endPage; page++) {
      items.push(
        <Pagination.Item
          key={page}
          active={page === filters.page}
          onClick={() => setFilters({ ...filters, page })}
        >
          {page}
        </Pagination.Item>
      );
    }

    if (endPage < totalPages) {
      items.push(<Pagination.Ellipsis key="ellipsis-end" disabled />);
    }

    items.push(
      <Pagination.Next
        key="next"
        onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
        disabled={filters.page === totalPages}
      />
    );
    
    items.push(
      <Pagination.Last
        key="last"
        onClick={() => setFilters({ ...filters, page: totalPages })}
        disabled={filters.page === totalPages}
      />
    );

    return <Pagination>{items}</Pagination>;
  };

  return (
    <Container className="page-container">
      <Row className="page-section">
        <Col>
          <div className="page-header">
            <div>
              <h1 className="page-title type-h1">
                <i className="bi bi-clipboard-data me-2"></i>
                Audit Logs
              </h1>
              <p className="page-subtitle type-subtitle">
                Security and activity monitoring (ISO 27001 A.12.4 compliant)
              </p>
            </div>
            <div className="page-stats">
              <span className="stat-chip">
                Total: {totalLogs.toLocaleString()}
              </span>
              <span className="stat-chip secondary">
                Page {filters.page} of {totalPages}
              </span>
            </div>
          </div>
        </Col>
      </Row>

      {/* Filters */}
  <Row className="page-section">
        <Col>
          <Card className="filter-card">
            <Card.Body>
              <Row className="g-3">
                <Col md={3}>
                  <Form.Group>
                    <Form.Label className="small">Resource Type</Form.Label>
                    <Form.Select
                      size="sm"
                      value={filters.resource_type || ''}
                      onChange={(e) => handleFilterChange('resource_type', e.target.value || undefined)}
                    >
                      <option value="">All Types</option>
                      {RESOURCE_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label className="small">Severity</Form.Label>
                    <Form.Select
                      size="sm"
                      value={filters.severity || ''}
                      onChange={(e) => handleFilterChange('severity', e.target.value || undefined)}
                    >
                      <option value="">All Levels</option>
                      {SEVERITY_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label className="small">Status</Form.Label>
                    <Form.Select
                      size="sm"
                      value={filters.status || ''}
                      onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                    >
                      <option value="">All Status</option>
                      {STATUS_VALUES.map((status) => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label className="small">Search</Form.Label>
                    <InputGroup size="sm">
                      <Form.Control
                        type="text"
                        placeholder="Search action, IP..."
                        value={filters.search || ''}
                        onChange={(e) => handleFilterChange('search', e.target.value || undefined)}
                        onKeyPress={(e) => e.key === 'Enter' && handleApplyFilters()}
                      />
                      <Button variant="outline-secondary" onClick={handleApplyFilters}>
                        <i className="bi bi-search"></i>
                      </Button>
                    </InputGroup>
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label className="small">&nbsp;</Form.Label>
                    <div className="d-grid gap-2">
                      <Button variant="outline-secondary" size="sm" onClick={handleClearFilters}>
                        <i className="bi bi-x-circle me-1"></i>
                        Clear
                      </Button>
                    </div>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Logs Table */}
  <Row className="page-section">
        <Col>
          <Card className="data-card">
            <Card.Body>
              {loading ? (
                <div className="empty-state">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                </div>
              ) : logs.length === 0 ? (
                <div className="empty-state">
                  <i className="bi bi-inbox display-1 text-muted"></i>
                  <h5 className="mt-3 text-muted">No audit logs found</h5>
                  <p className="text-muted">
                    {filters.search || filters.resource_type || filters.severity || filters.status
                      ? 'Try adjusting your filters'
                      : 'Audit logs will appear here as system activity occurs'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <Table responsive hover size="sm" className="data-table align-middle">
                      <thead>
                        <tr>
                          <th style={{ width: '180px' }}>Timestamp</th>
                          <th>Action</th>
                          <th>Resource</th>
                          <th>Severity</th>
                          <th>Status</th>
                          <th>IP Address</th>
                          <th className="text-end">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr key={log.id}>
                            <td className="small text-muted">
                              {formatTimestamp(log.created_at)}
                            </td>
                            <td>
                              <code className="small">{formatAction(log.action)}</code>
                            </td>
                            <td>
                              <Badge bg="light" text="dark" className="small">
                                {log.resource_type}
                              </Badge>
                              {log.resource_id && (
                                <div className="small text-muted">
                                  {log.resource_id.substring(0, 8)}...
                                </div>
                              )}
                            </td>
                            <td>
                              <Badge bg={getSeverityColor(log.severity)}>
                                {log.severity}
                              </Badge>
                            </td>
                            <td>
                              <Badge bg={getStatusColor(log.status)}>
                                {log.status === 'success' && <i className="bi bi-check-circle me-1"></i>}
                                {log.status === 'failure' && <i className="bi bi-x-circle me-1"></i>}
                                {log.status === 'pending' && <i className="bi bi-clock me-1"></i>}
                                {log.status}
                              </Badge>
                            </td>
                            <td className="small text-muted">{log.ip_address || '-'}</td>
                            <td className="text-end">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handleShowDetails(log)}
                              >
                                <i className="bi bi-eye"></i>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center px-4 py-3 border-top">
                      <div className="text-muted small">
                        Showing {(filters.page - 1) * filters.pageSize + 1} to{' '}
                        {Math.min(filters.page * filters.pageSize, totalLogs)} of{' '}
                        {totalLogs.toLocaleString()} logs
                      </div>
                      {renderPagination()}
                      <Form.Select
                        size="sm"
                        style={{ width: 'auto' }}
                        value={filters.pageSize}
                        onChange={(e) =>
                          setFilters({ ...filters, pageSize: parseInt(e.target.value), page: 1 })
                        }
                      >
                        <option value="25">25 per page</option>
                        <option value="50">50 per page</option>
                        <option value="100">100 per page</option>
                      </Form.Select>
                    </div>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Details Modal */}
      <Modal show={showDetailsModal} onHide={handleCloseDetails} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-info-circle me-2"></i>
            Audit Log Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedLog && (
            <>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Log ID:</strong>
                  <div className="text-muted small">{selectedLog.id}</div>
                </Col>
                <Col md={6}>
                  <strong>Timestamp:</strong>
                  <div className="text-muted">{formatTimestamp(selectedLog.created_at)}</div>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <strong>Action:</strong>
                  <div>
                    <code>{formatAction(selectedLog.action)}</code>
                  </div>
                </Col>
                <Col md={6}>
                  <strong>Resource Type:</strong>
                  <div>
                    <Badge bg="light" text="dark">
                      {selectedLog.resource_type}
                    </Badge>
                  </div>
                </Col>
              </Row>

              {selectedLog.resource_id && (
                <Row className="mb-3">
                  <Col>
                    <strong>Resource ID:</strong>
                    <div className="text-muted small font-monospace">{selectedLog.resource_id}</div>
                  </Col>
                </Row>
              )}

              <Row className="mb-3">
                <Col md={4}>
                  <strong>Severity:</strong>
                  <div>
                    <Badge bg={getSeverityColor(selectedLog.severity)}>
                      {selectedLog.severity}
                    </Badge>
                  </div>
                </Col>
                <Col md={4}>
                  <strong>Status:</strong>
                  <div>
                    <Badge bg={getStatusColor(selectedLog.status)}>{selectedLog.status}</Badge>
                  </div>
                </Col>
                <Col md={4}>
                  <strong>Request ID:</strong>
                  <div className="text-muted small">{selectedLog.request_id || '-'}</div>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <strong>IP Address:</strong>
                  <div className="text-muted">{selectedLog.ip_address || '-'}</div>
                </Col>
                <Col md={6}>
                  <strong>User ID:</strong>
                  <div className="text-muted small">{selectedLog.user_id || '-'}</div>
                </Col>
              </Row>

              {selectedLog.user_agent && (
                <Row className="mb-3">
                  <Col>
                    <strong>User Agent:</strong>
                    <div className="text-muted small">{selectedLog.user_agent}</div>
                  </Col>
                </Row>
              )}

              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <Row>
                  <Col>
                    <strong>Additional Details:</strong>
                    <pre className="bg-light p-3 rounded mt-2 small" style={{ maxHeight: '300px', overflow: 'auto' }}>
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </Col>
                </Row>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDetails}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
