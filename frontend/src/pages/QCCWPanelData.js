import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, InputGroup, Badge, Spinner } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import '../styles/QCCWPanelData.css';

const QCCWPanelData = () => {
  const [loading, setLoading] = useState(true);
  const [panels, setPanels] = useState([]);
  const [filteredPanels, setFilteredPanels] = useState([]);
  const [searchFlId, setSearchFlId] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { flId } = useParams();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let response;
        
        if (flId) {
          // If we have a flId parameter, fetch panels for that specific fl_id
          response = await api.qcCwPanelData.getByFlId(flId);
          setSearchFlId(flId);
        } else {
          // Otherwise, fetch all panels
          response = await api.qcCwPanelData.getAll();
        }
        
        const data = response.data;
        setPanels(data);
        setFilteredPanels(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching QC CW Panel Data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [flId]);

  useEffect(() => {
    // Filter panels when searchFlId changes
    if (searchFlId) {
      const filtered = panels.filter(panel => 
        panel.fl_id.toLowerCase().includes(searchFlId.toLowerCase())
      );
      setFilteredPanels(filtered);
    } else {
      setFilteredPanels(panels);
    }
  }, [searchFlId, panels]);

  const handleSearch = (e) => {
    e.preventDefault();
    // Update URL with search parameter
    if (searchFlId) {
      navigate(`/qc-cw-panel-data/${searchFlId}`);
    } else {
      navigate('/qc-cw-panel-data');
    }
  };

  const handleViewDetails = (panelId) => {
    navigate(`/qc-cw-panel-data/detail/${panelId}`);
  };

  const handleAddNew = () => {
    navigate('/qc-cw-panel-data/create');
  };
  
  // Export functionality moved to API service

  return (
    <Container fluid className="mt-4 mb-5">
      <Row className="mb-4">
        <Col>
          <h2>QC CW Panel Data</h2>
          <p>
            Manage quality control data for curtain wall panels. View, add, and update panel details.
          </p>
        </Col>
        <Col xs="auto" className="d-flex align-items-start">
          {/* <Button 
            variant="outline-secondary" 
            onClick={() => api.qcCwPanelData.exportExcel()}
            title="Export to Excel"
            className="me-2"
          >
            <i className="bi bi-file-earmark-excel me-1"></i> Export to Excel
          </Button> */}
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={6}>
          <Form onSubmit={handleSearch}>
            <InputGroup>
              <Form.Control
                placeholder="Search by FL ID"
                value={searchFlId}
                onChange={(e) => setSearchFlId(e.target.value)}
              />
              <Button variant="primary" type="submit">
                Search
              </Button>
              <Button variant="outline-secondary" onClick={() => {
                setSearchFlId('');
                navigate('/qc-cw-panel-data');
              }}>
                Clear
              </Button>
            </InputGroup>
          </Form>
        </Col>
        <Col md={6} className="text-end">
          <Button variant="success" onClick={handleAddNew}>
            <i className="bi bi-plus-lg me-1"></i> Add New Panel
          </Button>
        </Col>
      </Row>

      {error && (
        <Row className="mb-4">
          <Col>
            <div className="alert alert-danger">{error}</div>
          </Col>
        </Row>
      )}

      <Row>
        <Col>
          <Card>
            <Card.Body>
              {loading ? (
                <div className="text-center p-4">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                </div>
              ) : filteredPanels.length === 0 ? (
                <div className="text-center p-4">
                  <p className="mb-0">No panels found. Try a different search or add a new panel.</p>
                </div>
              ) : (
                <Table responsive hover className="align-middle">
                  <thead>
                    <tr>
                      <th>FL ID</th>
                      <th>Panel ID</th>
                      <th>Panel Name</th>
                      <th>QC Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPanels.map((panel) => (
                      <tr key={panel.id}>
                        <td>{panel.fl_id}</td>
                        <td>{panel.pan_id}</td>
                        <td>{panel.pan_name}</td>
                        <td>
                          {panel.ipa_cleaned && panel.sealant_frame_enough ? (
                            <Badge bg="success">Complete</Badge>
                          ) : (
                            <Badge bg="warning" text="dark">In Progress</Badge>
                          )}
                        </td>
                        <td>{new Date(panel.created_at).toLocaleString()}</td>
                        <td>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleViewDetails(panel.id)}
                          >
                            View Details
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
    </Container>
  );
};

export default QCCWPanelData;