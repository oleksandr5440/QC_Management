import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Spinner, Alert, Modal, Form } from 'react-bootstrap';
import { formatDate } from '../utils/formatters';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const QCReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // State for batch items (only contains panels_glazed)
  const [batchItems, setBatchItems] = useState([
    {
      panels_glazed: ''  // Only panels_glazed is individual for each batch item
    }
  ]);
  
  // Common report info - contains all shared fields
  const [reportInfo, setReportInfo] = useState({
    report_id: '',
    date_glazed: '',    // Shared across all batch items
    time_glazed: '',    // Shared across all batch items
    strs_batch: {
      'Batch #': '',
      '# of 30': 0
    },
    catalyst_batch: {
      'Batch #': '',
      '# of 30': 0
    },
    primer_c: {
      'Lot #': ''
    }
  });
  
  const [uploadedImage, setUploadedImage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await api.qcReports.getAll();
      if (response.data && response.data.data) {
        setReports(response.data.data);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching QC reports:', err);
      setError('Failed to load QC reports. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Handle input change for common report info
  const handleReportInfoChange = (e) => {
    const { name, value } = e.target;
    setReportInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle input change for batch items
  const handleBatchItemChange = (index, field, subfield, value) => {
    const updatedItems = [...batchItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: {
        ...updatedItems[index][field],
        [subfield]: value
      }
    };
    setBatchItems(updatedItems);
  };

  // Add a new batch item
  const addBatchItem = () => {
    setBatchItems([...batchItems, {
      panels_glazed: ''  // Only panels_glazed is individual for each batch item
    }]);
  };

  // Remove a batch item
  const removeBatchItem = (index) => {
    if (batchItems.length > 1) {
      const updatedItems = [...batchItems];
      updatedItems.splice(index, 1);
      setBatchItems(updatedItems);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedImage({
        file: file,
        preview: reader.result,
        base64: reader.result
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    try {
      // Create an array of batch items, each with only panels_glazed
      const batchItemsData = batchItems.map(item => ({
        panels_glazed: item.panels_glazed
      }));
      
      // Prepare the report data with all shared fields from reportInfo
      const reportData = {
        report_id: reportInfo.report_id,
        date_glazed: reportInfo.date_glazed,
        time_glazed: reportInfo.time_glazed,
        strs_batch: reportInfo.strs_batch,
        catalyst_batch: reportInfo.catalyst_batch,
        primer_c: reportInfo.primer_c,
        // First item panels_glazed becomes the main report panels_glazed
        panels_glazed: batchItems[0].panels_glazed,
        // Store additional items separately with only their panels_glazed
        batch_items: batchItemsData.slice(1)
      };

      // Add image if uploaded (shared across all items)
      if (uploadedImage) {
        reportData.images = [uploadedImage.base64];
      }

      const response = await api.qcReports.create(reportData);
      if (response.data && response.data.status === 'success') {
        setShowAddModal(false);
        resetForm();
        fetchReports();
      }
    } catch (err) {
      console.error('Error creating QC report:', err);
      setError('Failed to create QC report. Please try again.');
    }
  };

  const resetForm = () => {
    setReportInfo({
      report_id: '',
      date_glazed: '',    // Shared across all batch items
      time_glazed: '',    // Shared across all batch items
      strs_batch: {
        'Batch #': '',
        '# of 30': 0
      },
      catalyst_batch: {
        'Batch #': '',
        '# of 30': 0
      },
      primer_c: {
        'Lot #': ''
      }
    });
    setBatchItems([{
      panels_glazed: ''  // Only panels_glazed is individual for each batch item
    }]);
    setUploadedImage(null);
  };

  const handleRowClick = (reportId) => {
    navigate(`/qc-reports/${reportId}`);
  };

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h1>QC Reports</h1>
          <p>View and manage quality control reports for sealant applications.</p>
        </Col>
        <Col xs="auto" className="d-flex gap-2">
          {/* <Button 
            variant="outline-secondary" 
            onClick={() => api.qcReports.exportExcel()}
            title="Export to Excel"
          >
            <i className="bi bi-file-earmark-excel me-1"></i> Export
          </Button> */}
          <Row className="mb-4">

            <Button variant="primary" onClick={() => setShowAddModal(true)}>
              <i className="bi bi-plus-circle me-1"></i> Add Report
            </Button>
          </Row>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      <Card>
        <Card.Body>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Date Glazed</th>
                <th>Batch Items Count</th>
                <th>Has Images</th>
                <th>Created By</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center">No reports found</td>
                </tr>
              ) : (
                reports.map(report => (
                  <tr key={report.id} onClick={() => handleRowClick(report.id)} style={{ cursor: 'pointer' }}>
                    <td>{report.report_id}</td>
                    <td>{report.date_glazed ? formatDate(report.date_glazed) : 'N/A'}</td>
                    <td>{(report.batch_items_count ? report.batch_items_count + 1: 1)}</td>
                    <td>{report.has_images ? 'Yes' : 'No'}</td>
                    <td>{report.created_by ? report.created_by.username : 'System'}</td>
                    <td>{formatDate(report.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Add Report Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add QC Report</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <h5 className="mb-3">Report Information</h5>
            <Row className="mb-3">
              <Col>
                <Form.Group>
                  <Form.Label>Report ID</Form.Label>
                  <Form.Control
                    type="text"
                    name="report_id"
                    value={reportInfo.report_id}
                    onChange={handleReportInfoChange}
                    placeholder="Enter report ID"
                    required
                  />
                  <Form.Text className="text-muted">
                    This ID will be shared across all batch items
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            
            <h6 className="mb-2">Glazing Information (Shared for all items)</h6>
            <Row className="mb-3">
              <Col>
                <Form.Group>
                  <Form.Label>Date Glazed</Form.Label>
                  <Form.Control
                    type="date"
                    name="date_glazed"
                    value={reportInfo.date_glazed || ''}
                    onChange={handleReportInfoChange}
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>Time Glazed</Form.Label>
                  <Form.Control
                    type="time"
                    name="time_glazed"
                    value={reportInfo.time_glazed || ''}
                    onChange={handleReportInfoChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row className="mb-3">
              <Col md={6}>
                <h6>StrS Batch</h6>
                <Row>
                  <Col>
                    <Form.Group className="mb-2">
                      <Form.Label>Batch #</Form.Label>
                      <Form.Control
                        type="text"
                        value={reportInfo.strs_batch['Batch #']}
                        onChange={(e) => {
                          setReportInfo({
                            ...reportInfo,
                            strs_batch: {
                              ...reportInfo.strs_batch,
                              'Batch #': e.target.value
                            }
                          });
                        }}
                        placeholder="Enter batch number"
                      />
                    </Form.Group>
                  </Col>
                  <Col>
                    <Form.Group className="mb-2">
                      <Form.Label># of 30</Form.Label>
                      <Form.Control
                        type="number"
                        value={reportInfo.strs_batch['# of 30']}
                        onChange={(e) => {
                          setReportInfo({
                            ...reportInfo,
                            strs_batch: {
                              ...reportInfo.strs_batch,
                              '# of 30': e.target.value
                            }
                          });
                        }}
                        placeholder="Enter quantity"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Col>
              
              <Col md={6}>
                <h6>Catalyst Batch</h6>
                <Row>
                  <Col>
                    <Form.Group className="mb-2">
                      <Form.Label>Batch #</Form.Label>
                      <Form.Control
                        type="text"
                        value={reportInfo.catalyst_batch['Batch #']}
                        onChange={(e) => {
                          setReportInfo({
                            ...reportInfo,
                            catalyst_batch: {
                              ...reportInfo.catalyst_batch,
                              'Batch #': e.target.value
                            }
                          });
                        }}
                        placeholder="Enter batch number"
                      />
                    </Form.Group>
                  </Col>
                  <Col>
                    <Form.Group className="mb-2">
                      <Form.Label># of 30</Form.Label>
                      <Form.Control
                        type="number"
                        value={reportInfo.catalyst_batch['# of 30']}
                        onChange={(e) => {
                          setReportInfo({
                            ...reportInfo,
                            catalyst_batch: {
                              ...reportInfo.catalyst_batch,
                              '# of 30': e.target.value
                            }
                          });
                        }}
                        placeholder="Enter quantity"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Col>
            </Row>
            
            <Row className="mb-3">
              <Col md={6}>
                <h6>Primer C</h6>
                <Form.Group>
                  <Form.Label>Lot #</Form.Label>
                  <Form.Control
                    type="text"
                    value={reportInfo.primer_c['Lot #']}
                    onChange={(e) => {
                      setReportInfo({
                        ...reportInfo,
                        primer_c: {
                          ...reportInfo.primer_c,
                          'Lot #': e.target.value
                        }
                      });
                    }}
                    placeholder="Enter lot number"
                  />
                </Form.Group>
              </Col>
            </Row>

            <h5 className="mt-4 mb-3">Batch Items</h5>
            
            {batchItems.map((item, index) => (
              <div key={index} className="batch-item p-3 mb-3 border rounded">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="m-0">Item {index + 1}</h6>
                  {batchItems.length > 1 && (
                    <Button 
                      variant="outline-danger" 
                      size="sm" 
                      onClick={() => removeBatchItem(index)}
                    >
                      <i className="bi bi-trash"></i> Remove
                    </Button>
                  )}
                </div>
                
                {/* Glazing Information for each batch item */}
                <h6 className="mb-2">Glazing Information</h6>
                <Row className="mb-3">
                  <Col>
                    <Form.Group>
                      <Form.Label>Panels Glazed</Form.Label>
                      <Form.Control
                        type="text"
                        value={item.panels_glazed || ''}
                        onChange={(e) => {
                          const updatedItems = [...batchItems];
                          updatedItems[index].panels_glazed = e.target.value;
                          setBatchItems(updatedItems);
                        }}
                        placeholder="Enter panels identifier (e.g., C06-154)"
                      />
                    </Form.Group>
                  </Col>
                </Row>


              </div>
            ))}
            
            <div className="d-flex justify-content-center mb-4">
              <Button variant="outline-primary" onClick={addBatchItem}>
                <i className="bi bi-plus-circle me-2"></i>Add Another Batch Item
              </Button>
            </div>

            <h5 className="mt-4 mb-3">Upload Image</h5>
            <Row className="mb-3">
              <Col>
                <Form.Group>
                  <Form.Label>Report Image</Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                  <Form.Text className="text-muted">
                    Upload a single image for all batch items in this report
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            {uploadedImage && (
              <Row className="mb-3">
                <Col xs={12} className="text-center">
                  <div className="preview-image-container">
                    <img
                      src={uploadedImage.preview}
                      alt="Preview"
                      style={{ maxWidth: '100%', maxHeight: '200px' }}
                    />
                  </div>
                </Col>
              </Row>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Save Report
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default QCReports;