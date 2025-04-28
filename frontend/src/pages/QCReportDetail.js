import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Alert, Form, Table, Image, Badge, Accordion } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { formatDate } from '../utils/formatters';

const QCReportDetail = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedReport, setEditedReport] = useState(null);
  const [batchItems, setBatchItems] = useState([]);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagesToDelete, setImagesToDelete] = useState([]);

  useEffect(() => {
    fetchReportDetails();
  }, [reportId]);

  const fetchReportDetails = async () => {
    setLoading(true);
    try {
      const response = await api.qcReports.getById(reportId);
      if (response.data && response.data.data) {
        const reportData = response.data.data;
        setReport(reportData);
        
        // Set up batch items array
        const items = [];
        // First item is the main report panels_glazed value
        items.push({
          panels_glazed: reportData.panels_glazed || ''
        });
        
        // Add any additional batch items with just panels_glazed
        if (reportData.batch_items && Array.isArray(reportData.batch_items)) {
          // Make sure each batch item only has panels_glazed property
          const cleanBatchItems = reportData.batch_items.map(item => ({
            panels_glazed: item.panels_glazed || ''
          }));
          items.push(...cleanBatchItems);
        }
        
        setBatchItems(items);
        
        // Initialize edited report with current data (without batch items)
        const { batch_items, ...mainReport } = reportData;
        setEditedReport(mainReport);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching QC report details:', err);
      setError('Failed to load QC report details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e, jsonField = null, jsonSubField = null) => {
    const { name, value } = e.target;
    
    if (jsonField) {
      // Handle JSON fields (strs_batch, catalyst_batch, primer_c)
      setEditedReport(prev => ({
        ...prev,
        [jsonField]: {
          ...prev[jsonField],
          [jsonSubField]: value
        }
      }));
    } else {
      // Handle regular fields
      setEditedReport(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleBatchItemChange = (index, field, value) => {
    const updatedItems = [...batchItems];
    
    // For batch items, we're only updating the panels_glazed field directly
    updatedItems[index][field] = value;
    setBatchItems(updatedItems);
    
    // If it's the first item, also update the main report data
    if (index === 0 && field === 'panels_glazed') {
      setEditedReport(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const addBatchItem = () => {
    // Only add panels_glazed as an individual property for each batch item
    // Other properties are shared across all batch items
    setBatchItems([...batchItems, {
      panels_glazed: ''
    }]);
  };

  const removeBatchItem = (index) => {
    // Prevent removing the first item (main panels_glazed)
    if (index === 0) return;
    
    // Make sure we always have at least one batch item
    if (batchItems.length <= 1) return;
    
    const updatedItems = [...batchItems];
    updatedItems.splice(index, 1);
    setBatchItems(updatedItems);
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

  const handleDeleteImage = (imageId) => {
    setImagesToDelete(prev => [...prev, imageId]);
  };

  const handleSaveChanges = async () => {
    try {
      // Prepare the report data
      const reportData = { ...editedReport };
      
      // The first batch item becomes the main panels_glazed value
      if (batchItems.length > 0) {
        reportData.panels_glazed = batchItems[0].panels_glazed;
      }
      
      // The rest are stored as batch_items with just panels_glazed property
      if (batchItems.length > 1) {
        reportData.batch_items = batchItems.slice(1).map(item => ({
          panels_glazed: item.panels_glazed
        }));
      } else {
        // Ensure empty batch_items array if there are no additional items
        reportData.batch_items = [];
      }
      
      // Add new images if uploaded
      if (uploadedImage) {
        reportData.new_images = [uploadedImage.base64];
      }
      
      // Add images to delete if any
      if (imagesToDelete.length > 0) {
        reportData.delete_images = imagesToDelete;
      }
      
      const response = await api.qcReports.update(reportId, reportData);
      if (response.data && response.data.status === 'success') {
        // Reset state and fetch updated data
        setEditMode(false);
        setUploadedImage(null);
        setImagesToDelete([]);
        fetchReportDetails();
      }
    } catch (err) {
      console.error('Error updating QC report:', err);
      setError('Failed to update QC report. Please try again.');
    }
  };

  const handleDeleteReport = async () => {
    if (window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      try {
        const response = await api.qcReports.delete(reportId);
        if (response.data && response.data.status === 'success') {
          navigate('/qc-reports');
        }
      } catch (err) {
        console.error('Error deleting QC report:', err);
        setError('Failed to delete QC report. Please try again.');
      }
    }
  };

  const toggleEditMode = () => {
    if (editMode) {
      // Discard changes and reset
      const { batch_items, ...mainReport } = report;
      setEditedReport(mainReport);
      
      // Reset batch items
      const items = [];
      // First item is the main report panels_glazed value
      items.push({
        panels_glazed: report.panels_glazed || ''
      });
      
      // Add any additional batch items with just panels_glazed
      if (batch_items && Array.isArray(batch_items)) {
        // Make sure each batch item only has panels_glazed property
        const cleanBatchItems = batch_items.map(item => ({
          panels_glazed: item.panels_glazed || ''
        }));
        items.push(...cleanBatchItems);
      }
      
      setBatchItems(items);
      setUploadedImage(null);
      setImagesToDelete([]);
    }
    setEditMode(!editMode);
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

  if (!report) {
    return (
      <Container className="py-4">
        <Alert variant="danger">
          Report not found or has been deleted.
        </Alert>
        <Button variant="primary" onClick={() => navigate('/qc-reports')}>
          Back to Reports
        </Button>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <Button variant="outline-secondary" onClick={() => navigate('/qc-reports')}>
            <i className="bi bi-arrow-left me-2"></i>Back to Reports
          </Button>
        </Col>
        <Col xs="auto">
          <Button variant={editMode ? "outline-secondary" : "outline-primary"} className="me-2" onClick={toggleEditMode}>
            {editMode ? (
              <>
                <i className="bi bi-x-circle me-2"></i>Cancel
              </>
            ) : (
              <>
                <i className="bi bi-pencil me-2"></i>Edit
              </>
            )}
          </Button>
          {editMode ? (
            <Button variant="primary" onClick={handleSaveChanges}>
              <i className="bi bi-save me-2"></i>Save Changes
            </Button>
          ) : (
            <Button variant="danger" onClick={handleDeleteReport}>
              <i className="bi bi-trash me-2"></i>Delete
            </Button>
          )}
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      <Card className="mb-4">
        <Card.Header as="h5">
          QC Report: {report.report_id}
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <h6>Basic Information</h6>
              {editMode ? (
                <Form>
                  <Form.Group className="mb-3">
                    <Form.Label>Report ID</Form.Label>
                    <Form.Control
                      type="text"
                      name="report_id"
                      value={editedReport.report_id}
                      onChange={handleInputChange}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Batch Items Count</Form.Label>
                    <Form.Control
                      type="text"
                      value={batchItems.length}
                      disabled
                    />
                    <Form.Text className="text-muted">
                      Use the "Batch Items" section below to add or remove items.
                    </Form.Text>
                  </Form.Group>
                  <Row>
                    <Col>
                      <Form.Group className="mb-3">
                        <Form.Label>Date Glazed</Form.Label>
                        <Form.Control
                          type="date"
                          name="date_glazed"
                          value={editedReport.date_glazed ? editedReport.date_glazed.split('T')[0] : ''}
                          onChange={handleInputChange}
                        />
                      </Form.Group>
                    </Col>
                    <Col>
                      <Form.Group className="mb-3">
                        <Form.Label>Time Glazed</Form.Label>
                        <Form.Control
                          type="time"
                          name="time_glazed"
                          value={editedReport.time_glazed ? editedReport.time_glazed.split(':').slice(0, 2).join(':') : ''}
                          onChange={handleInputChange}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Form>
              ) : (
                <Table borderless>
                  <tbody>
                    <tr>
                      <td><strong>Report ID:</strong></td>
                      <td>{report.report_id}</td>
                    </tr>
                    <tr>
                      <td><strong>Batch Items Count:</strong></td>
                      <td>{(report.batch_items ? report.batch_items.length + 1 : 1)}</td>
                    </tr>
                    <tr>
                      <td><strong>Date Glazed:</strong></td>
                      <td>{report.date_glazed ? formatDate(report.date_glazed) : 'N/A'}</td>
                    </tr>
                    <tr>
                      <td><strong>Time Glazed:</strong></td>
                      <td>{report.time_glazed || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td><strong>Created At:</strong></td>
                      <td>{formatDate(report.created_at)}</td>
                    </tr>
                    <tr>
                      <td><strong>Created By:</strong></td>
                      <td>{report.created_by ? report.created_by.username : 'System'}</td>
                    </tr>
                  </tbody>
                </Table>
              )}
            </Col>
            <Col md={6}>
              {/* Display primary batch item */}
              <h6>Primary Batch Information</h6>
              {editMode ? (
                <Form>
                  <h6 className="mt-3">StrS Batch</h6>
                  <Row>
                    <Col>
                      <Form.Group className="mb-3">
                        <Form.Label>Batch #</Form.Label>
                        <Form.Control
                          type="text"
                          value={batchItems[0]?.strs_batch?.['Batch #'] || ''}
                          onChange={(e) => handleBatchItemChange(0, 'strs_batch', 'Batch #', e.target.value)}
                        />
                      </Form.Group>
                    </Col>
                    <Col>
                      <Form.Group className="mb-3">
                        <Form.Label># of 30</Form.Label>
                        <Form.Control
                          type="number"
                          value={batchItems[0]?.strs_batch?.['# of 30'] || 0}
                          onChange={(e) => handleBatchItemChange(0, 'strs_batch', '# of 30', e.target.value)}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <h6 className="mt-3">Catalyst Batch</h6>
                  <Row>
                    <Col>
                      <Form.Group className="mb-3">
                        <Form.Label>Batch #</Form.Label>
                        <Form.Control
                          type="text"
                          value={batchItems[0]?.catalyst_batch?.['Batch #'] || ''}
                          onChange={(e) => handleBatchItemChange(0, 'catalyst_batch', 'Batch #', e.target.value)}
                        />
                      </Form.Group>
                    </Col>
                    <Col>
                      <Form.Group className="mb-3">
                        <Form.Label># of 30</Form.Label>
                        <Form.Control
                          type="number"
                          value={batchItems[0]?.catalyst_batch?.['# of 30'] || 0}
                          onChange={(e) => handleBatchItemChange(0, 'catalyst_batch', '# of 30', e.target.value)}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <h6 className="mt-3">Primer C</h6>
                  <Form.Group className="mb-3">
                    <Form.Label>Lot #</Form.Label>
                    <Form.Control
                      type="text"
                      value={batchItems[0]?.primer_c?.['Lot #'] || ''}
                      onChange={(e) => handleBatchItemChange(0, 'primer_c', 'Lot #', e.target.value)}
                    />
                  </Form.Group>
                </Form>
              ) : (
                <>
                  <h6 className="mt-3">StrS Batch</h6>
                  <Table borderless>
                    <tbody>
                      <tr>
                        <td><strong>Batch #:</strong></td>
                        <td>{report.strs_batch && report.strs_batch['Batch #'] ? report.strs_batch['Batch #'] : 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong># of 30:</strong></td>
                        <td>{report.strs_batch && report.strs_batch['# of 30'] ? report.strs_batch['# of 30'] : 'N/A'}</td>
                      </tr>
                    </tbody>
                  </Table>

                  <h6 className="mt-3">Catalyst Batch</h6>
                  <Table borderless>
                    <tbody>
                      <tr>
                        <td><strong>Batch #:</strong></td>
                        <td>{report.catalyst_batch && report.catalyst_batch['Batch #'] ? report.catalyst_batch['Batch #'] : 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong># of 30:</strong></td>
                        <td>{report.catalyst_batch && report.catalyst_batch['# of 30'] ? report.catalyst_batch['# of 30'] : 'N/A'}</td>
                      </tr>
                    </tbody>
                  </Table>

                  <h6 className="mt-3">Primer C</h6>
                  <Table borderless>
                    <tbody>
                      <tr>
                        <td><strong>Lot #:</strong></td>
                        <td>{report.primer_c && report.primer_c['Lot #'] ? report.primer_c['Lot #'] : 'N/A'}</td>
                      </tr>
                    </tbody>
                  </Table>
                </>
              )}
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Batch Items */}
      <Card className="mb-4">
        <Card.Header as="h5">
          Batch Items
          {editMode && (
            <Button 
              variant="outline-primary" 
              size="sm" 
              className="float-end"
              onClick={addBatchItem}
            >
              <i className="bi bi-plus-circle me-2"></i>Add Item
            </Button>
          )}
        </Card.Header>
        <Card.Body>
          {editMode ? (
            <>
              {batchItems.map((item, index) => (
                <div key={index} className="batch-item p-3 mb-3 border rounded">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="m-0">Batch Item {index + 1}</h6>
                    {index > 0 && (
                      <Button 
                        variant="outline-danger" 
                        size="sm" 
                        onClick={() => removeBatchItem(index)}
                      >
                        <i className="bi bi-trash"></i> Remove
                      </Button>
                    )}
                  </div>
                  
                  <Row className="mb-3">
                    <Col>
                      <Form.Group className="mb-2">
                        <Form.Label>Panels Glazed</Form.Label>
                        <Form.Control
                          type="text"
                          value={item.panels_glazed || ''}
                          onChange={(e) => handleBatchItemChange(index, 'panels_glazed', e.target.value)}
                          placeholder="Enter panels identifier (e.g., C06-154)"
                        />
                      </Form.Group>
                      <small className="text-muted">
                        Note: Other fields like batch numbers, dates, and times are shared across all items in this report.
                      </small>
                    </Col>
                  </Row>
                </div>
              ))}
            </>
          ) : (
            <Accordion>
              {batchItems.map((item, index) => (
                <Accordion.Item key={index} eventKey={String(index)}>
                  <Accordion.Header>Batch Item {index + 1}</Accordion.Header>
                  <Accordion.Body>
                    <Row>
                      <Col>
                        <h6>Panels Glazed</h6>
                        <p>{item.panels_glazed || 'N/A'}</p>
                        <div className="mt-3">
                          <small className="text-muted">
                            Note: This batch item shares the same batch numbers, date, time, and image 
                            as the main report item. Only the panels glazed identifier is unique.
                          </small>
                        </div>
                      </Col>
                    </Row>
                  </Accordion.Body>
                </Accordion.Item>
              ))}
            </Accordion>
          )}
        </Card.Body>
      </Card>

      {/* Images */}
      <Card>
        <Card.Header as="h5">
          Attached Images
          {editMode && (
            <Form.Group className="mt-3">
              <Form.Label>Upload New Image</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />
              <Form.Text className="text-muted">
                Upload a new image to attach to this report
              </Form.Text>
            </Form.Group>
          )}
        </Card.Header>
        <Card.Body>
          {uploadedImage && (
            <div className="mb-4">
              <h6>New Image Preview</h6>
              <div className="image-preview" style={{ maxWidth: '300px', margin: '0 auto' }}>
                <Image src={uploadedImage.preview} fluid thumbnail />
              </div>
            </div>
          )}

          <Row>
            {report.images && report.images.length > 0 ? (
              report.images.map((image) => (
                <Col md={4} key={image.id} className="mb-4">
                  <div className="position-relative">
                    {editMode && imagesToDelete.includes(image.id) ? (
                      <div className="text-center p-5 bg-light">
                        <Badge bg="danger" className="mb-2">Marked for Deletion</Badge>
                        <br />
                        <Button 
                          variant="outline-secondary" 
                          size="sm"
                          onClick={() => setImagesToDelete(prev => prev.filter(id => id !== image.id))}
                        >
                          Restore
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Image 
                          src={`data:image/jpeg;base64,${image.image_data}`} 
                          fluid 
                          thumbnail
                        />
                        {editMode && (
                          <Button 
                            variant="danger" 
                            size="sm" 
                            className="position-absolute top-0 end-0 m-2"
                            onClick={() => handleDeleteImage(image.id)}
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </Col>
              ))
            ) : (
              <Col>
                <p className="text-center">No images attached to this report</p>
              </Col>
            )}
          </Row>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default QCReportDetail;