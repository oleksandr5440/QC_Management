import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Table, Badge, Spinner, Modal, Tabs, Tab } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import '../styles/QCCWPanelData.css';

const QCCWPanelDetail = () => {
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState(null);
  const [error, setError] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const navigate = useNavigate();
  const { panelId } = useParams();

  useEffect(() => {
    const fetchPanelData = async () => {
      try {
        setLoading(true);
        const response = await api.qcCwPanelData.getById(panelId);
        setPanel(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching panel data:', err);
        setError('Failed to load panel data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (panelId) {
      fetchPanelData();
    }
  }, [panelId]);

  const handleImageClick = (imageData) => {
    setCurrentImage(imageData);
    setShowImageModal(true);
  };

  const handleEdit = () => {
    navigate(`/qc-cw-panel-data/edit/${panelId}`);
  };

  const handleBackToList = () => {
    if (panel && panel.fl_id) {
      navigate(`/qc-cw-panel-data/${panel.fl_id}`);
    } else {
      navigate('/qc-cw-panel-data');
    }
  };

  // Helper function to render boolean values
  const renderBoolean = (value) => {
    return value ? (
      <Badge bg="success">Yes</Badge>
    ) : (
      <Badge bg="danger">No</Badge>
    );
  };

  // Helper function to render JSON fields
  const renderJsonField = (jsonData) => {
    if (!jsonData) return <span>-</span>;
    
    if (jsonData.GZ_office !== undefined) {
      return (
        <div>
          <div><strong>GZ Office:</strong> {jsonData.GZ_office || '-'}</div>
          {jsonData.factory_floor !== undefined && (
            <div><strong>Factory Floor:</strong> {jsonData.factory_floor || '-'}</div>
          )}
          {jsonData.factory_offer !== undefined && (
            <div><strong>Factory Offer:</strong> {jsonData.factory_offer || '-'}</div>
          )}
        </div>
      );
    } else {
      return <pre>{JSON.stringify(jsonData, null, 2)}</pre>;
    }
  };

  if (loading) {
    return (
      <Container className="mt-4 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">{error}</Alert>
        <Button variant="secondary" onClick={handleBackToList}>
          Back to List
        </Button>
      </Container>
    );
  }

  if (!panel) {
    return (
      <Container className="mt-4">
        <Alert variant="warning">No panel data found.</Alert>
        <Button variant="secondary" onClick={handleBackToList}>
          Back to List
        </Button>
      </Container>
    );
  }

  return (
    <Container fluid className="mt-4 mb-5">
      <Row className="mb-4">
        <Col>
          <Button variant="secondary" onClick={handleBackToList} className="me-2">
            Back to List
          </Button>
          <Button variant="primary" onClick={handleEdit}>
            Edit Panel
          </Button>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <h2>
            Panel Detail: {panel.pan_name}
            <Badge bg="info" className="ms-2">FL ID: {panel.fl_id}</Badge>
          </h2>
        </Col>
      </Row>

      <Tabs defaultActiveKey="basic" id="panel-details-tabs" className="mb-4">
        <Tab eventKey="basic" title="Basic Information">
          <Card className="mb-4">
            <Card.Header as="h5">Panel Details</Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <div className="data-row">
                    <div className="data-label">FL ID:</div>
                    <div className="data-value">{panel.fl_id}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Panel ID:</div>
                    <div className="data-value">{panel.pan_id}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Panel Name:</div>
                    <div className="data-value">{panel.pan_name}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">IPA Cleaned:</div>
                    <div className="data-value">{renderBoolean(panel.ipa_cleaned)}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Sealant Frame Enough:</div>
                    <div className="data-value">{renderBoolean(panel.sealant_frame_enough)}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Cavities Invert:</div>
                    <div className="data-value">{panel.cavities_invert || '-'}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">LMR:</div>
                    <div className="data-value">{panel.lmr || '-'}</div>
                  </div>
                </Col>
                <Col md={6}>
                  {panel.profile_photo && (
                    <div className="panel-image-container text-center">
                      <img
                        src={`data:image/jpeg;base64,${panel.profile_photo}`}
                        alt="Panel Profile"
                        className="panel-image"
                        onClick={() => handleImageClick(panel.profile_photo)}
                      />
                      <p className="mt-2 text-center">Panel Profile Photo</p>
                    </div>
                  )}
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="measurements" title="Panel Measurements">
          <Card className="mb-4">
            <Card.Header as="h5">Panel Measurements</Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <h6>Width</h6>
                  <div className="data-row">
                    <div className="data-label">Width Left:</div>
                    <div className="data-value">{renderJsonField(panel.width_l)}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Width Right:</div>
                    <div className="data-value">{renderJsonField(panel.width_r)}</div>
                  </div>
                </Col>
                <Col md={6}>
                  <h6>Height</h6>
                  <div className="data-row">
                    <div className="data-label">Height 1:</div>
                    <div className="data-value">{renderJsonField(panel.height_1)}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Height 2:</div>
                    <div className="data-value">{renderJsonField(panel.height_2)}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Height 3:</div>
                    <div className="data-value">{renderJsonField(panel.height_3)}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Height 4:</div>
                    <div className="data-value">{renderJsonField(panel.height_4)}</div>
                  </div>
                </Col>
              </Row>

              <hr />

              <h6>Cavity Measurements</h6>
              <Row>
                <Col md={6}>
                  <div className="data-row">
                    <div className="data-label">Cavity RO Height Total:</div>
                    <div className="data-value">{renderJsonField(panel.cavity_ro_height_total)}</div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="data-row">
                    <div className="data-label">Cavity Diag CW Pan Left:</div>
                    <div className="data-value">{renderJsonField(panel.cavity_diag_cw_pan_l)}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Cavity Diag CW Pan Right:</div>
                    <div className="data-value">{renderJsonField(panel.cavity_diag_cw_pan_r)}</div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="components" title="Components">
          <Card className="mb-4">
            <Card.Header as="h5">Mullion Components</Card.Header>
            <Card.Body>
              <Row>
                <Col md={4}>
                  <div className="data-row">
                    <div className="data-label">Left:</div>
                    <div className="data-value">{renderJsonField(panel.left)}</div>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="data-row">
                    <div className="data-label">Middle:</div>
                    <div className="data-value">{renderJsonField(panel.middle)}</div>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="data-row">
                    <div className="data-label">Right:</div>
                    <div className="data-value">{renderJsonField(panel.right)}</div>
                  </div>
                </Col>
              </Row>
              <Row className="mt-3">
                <Col md={6}>
                  <div className="data-row">
                    <div className="data-label">Head:</div>
                    <div className="data-value">{renderJsonField(panel.head)}</div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="data-row">
                    <div className="data-label">Sill:</div>
                    <div className="data-value">{renderJsonField(panel.sill)}</div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Card className="mb-4">
            <Card.Header as="h5">Transom Components</Card.Header>
            <Card.Body>
              <Row>
                <Col md={4}>
                  <div className="data-row">
                    <div className="data-label">Transom 1:</div>
                    <div className="data-value">{renderJsonField(panel.trans_1)}</div>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="data-row">
                    <div className="data-label">Transom 2:</div>
                    <div className="data-value">{renderJsonField(panel.trans_2)}</div>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="data-row">
                    <div className="data-label">Transom 3:</div>
                    <div className="data-value">{renderJsonField(panel.trans_3)}</div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Card className="mb-4">
            <Card.Header as="h5">Bracket Components</Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <div className="data-row">
                    <div className="data-label">Bracket Left:</div>
                    <div className="data-value">{renderJsonField(panel.bracket_l)}</div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="data-row">
                    <div className="data-label">Bracket Right:</div>
                    <div className="data-value">{renderJsonField(panel.bracket_r)}</div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="infills" title="Infills">
          <Card className="mb-4">
            <Card.Header as="h5">Infill Information</Card.Header>
            <Card.Body>
              <div className="data-row">
                <div className="data-label">Infill FS Location:</div>
                <div className="data-value">{renderJsonField(panel.infill_fs_location)}</div>
              </div>
              
              <hr/>
              
              <h6>Infill Types</h6>
              <Row>
                <Col md={6}>
                  <div className="data-row">
                    <div className="data-label">Infills 1 Type:</div>
                    <div className="data-value">{renderJsonField(panel.infills_1_type)}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Infills 2 Type:</div>
                    <div className="data-value">{renderJsonField(panel.infills_2_type)}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Infills 3 Type:</div>
                    <div className="data-value">{renderJsonField(panel.infills_3_type)}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Infills 4 Type:</div>
                    <div className="data-value">{renderJsonField(panel.infills_4_type)}</div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="data-row">
                    <div className="data-label">Infills Right 1 Type:</div>
                    <div className="data-value">{renderJsonField(panel.infills_right_1_type)}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Infills Right 2 Type:</div>
                    <div className="data-value">{renderJsonField(panel.infills_right_2_type)}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Infills Right 3 Type:</div>
                    <div className="data-value">{renderJsonField(panel.infills_right_3_type)}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Infills Right 4 Type:</div>
                    <div className="data-value">{renderJsonField(panel.infills_right_4_type)}</div>
                  </div>
                </Col>
              </Row>
              
              <hr/>
              
              <h6>Infill Colors</h6>
              <Row>
                <Col md={6}>
                  <div className="data-row">
                    <div className="data-label">Infills 1 Color:</div>
                    <div className="data-value">{renderJsonField(panel.infills_1_color)}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Infills 2 Color:</div>
                    <div className="data-value">{renderJsonField(panel.infills_2_color)}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Infills 3 Color:</div>
                    <div className="data-value">{renderJsonField(panel.infills_3_color)}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Infills 4 Color:</div>
                    <div className="data-value">{renderJsonField(panel.infills_4_color)}</div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="data-row">
                    <div className="data-label">Infills Right 1 Color:</div>
                    <div className="data-value">{renderJsonField(panel.infills_right_1_color)}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Infills Right 2 Color:</div>
                    <div className="data-value">{renderJsonField(panel.infills_right_2_color)}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Infills Right 3 Color:</div>
                    <div className="data-value">{renderJsonField(panel.infills_right_3_color)}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Infills Right 4 Color:</div>
                    <div className="data-value">{renderJsonField(panel.infills_right_4_color)}</div>
                  </div>
                </Col>
              </Row>
              
              <hr/>
              
              <div className="data-row">
                <div className="data-label">QC Infill Affix:</div>
                <div className="data-value">{panel.qc_infill_affix || '-'}</div>
              </div>
              <div className="data-row">
                <div className="data-label">Type GZ Factory:</div>
                <div className="data-value">{renderJsonField(panel.type_gz_factory)}</div>
              </div>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="checks" title="Final Checks">
          <Card className="mb-4">
            <Card.Header as="h5">Final Quality Checks</Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <div className="data-row">
                    <div className="data-label">Edge Bead Attached:</div>
                    <div className="data-value">{renderBoolean(panel.edge_bead_attached)}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Operable:</div>
                    <div className="data-value">{renderBoolean(panel.operable)}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Card Checked:</div>
                    <div className="data-value">
                      {panel.card_checked ? (
                        <Badge bg={
                          panel.card_checked.includes('pass') 
                            ? 'success' 
                            : panel.card_checked.includes('rework')
                              ? 'warning'
                              : 'danger'
                        }>
                          {panel.card_checked}
                        </Badge>
                      ) : '-'}
                    </div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Paint Damage:</div>
                    <div className="data-value">{panel.paint_damage || '-'}</div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="data-row">
                    <div className="data-label">Glass Scratched:</div>
                    <div className="data-value">{panel.glass_scratched || '-'}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Cleaned Ready:</div>
                    <div className="data-value">
                      {panel.cleaned_ready ? (
                        <Badge bg={
                          panel.cleaned_ready.includes('pass') || panel.cleaned_ready.includes('ready')
                            ? 'success' 
                            : 'warning'
                        }>
                          {panel.cleaned_ready}
                        </Badge>
                      ) : '-'}
                    </div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Crated:</div>
                    <div className="data-value">{renderBoolean(panel.crated)}</div>
                  </div>
                  <div className="data-row">
                    <div className="data-label">Structural Sealant Records:</div>
                    <div className="data-value">{panel.structural_sealant_records || '-'}</div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="attributes" title="Frame Cavities">
          <Card className="mb-4">
            <Card.Header as="h5">Frame Cavities Values</Card.Header>
            <Card.Body>
              {panel.frame_cavities_values && panel.frame_cavities_values.length > 0 ? (
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>Attribute</th>
                      <th>Value</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {panel.frame_cavities_values.map((value, index) => (
                      <tr key={index}>
                        <td>{value.attribute_name}</td>
                        <td>{value.value || '-'}</td>
                        <td>
                          {value.attribute_type && JSON.stringify(value.attribute_type)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p>No frame cavities values available.</p>
              )}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="photos" title="Additional Photos">
          <Card className="mb-4">
            <Card.Header as="h5">Additional Photos</Card.Header>
            <Card.Body>
              {panel.additional_photos && panel.additional_photos.length > 0 ? (
                <Row>
                  {panel.additional_photos.map((photo, index) => (
                    <Col key={index} md={4} className="mb-4">
                      <Card>
                        <Card.Img
                          variant="top"
                          src={`data:image/jpeg;base64,${photo.photo}`}
                          alt={`Photo ${index + 1}`}
                          onClick={() => handleImageClick(photo.photo)}
                          style={{ cursor: 'pointer', height: '200px', objectFit: 'cover' }}
                        />
                        <Card.Body>
                          <Card.Title>{photo.photo_type || `Photo ${index + 1}`}</Card.Title>
                          <small>{new Date(photo.created_at).toLocaleString()}</small>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              ) : (
                <p>No additional photos available.</p>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Image Modal */}
      <Modal
        show={showImageModal}
        onHide={() => setShowImageModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Image View</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {currentImage && (
            <img
              src={`data:image/jpeg;base64,${currentImage}`}
              alt="Panel Detail"
              style={{ maxWidth: '100%', maxHeight: '70vh' }}
            />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowImageModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default QCCWPanelDetail;