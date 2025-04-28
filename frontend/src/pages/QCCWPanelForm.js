import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Tabs, Tab, Spinner, InputGroup } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import '../styles/QCCWPanelData.css';

const QCCWPanelForm = () => {
  const { panelId } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!panelId;
  
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');
  
  // Form state
  const [formData, setFormData] = useState({
    fl_id: '',
    pan_id: '',
    ipa_cleaned: false,
    sealant_frame_enough: false,
    cavities_invert: '',
    qc_infill_affix: '',
    structural_sealant_records: '',
    lmr: '',
    edge_bead_attached: false,
    operable: false,
    card_checked: '',
    paint_damage: '',
    glass_scratched: '',
    cleaned_ready: '',
    crated: false,
    profile_photo: null,
    // JSON fields initialized as empty objects
    width_l: {},
    width_r: {},
    height_1: {},
    height_2: {},
    height_3: {},
    height_4: {},
    cavity_ro_height_total: {},
    cavity_diag_cw_pan_l: {},
    cavity_diag_cw_pan_r: {},
    left: {},
    middle: {},
    right: {},
    head: {},
    sill: {},
    trans_1: {},
    trans_2: {},
    trans_3: {},
    bracket_l: {},
    bracket_r: {},
    infill_fs_location: {},
    infills_1_type: {},
    infills_2_type: {},
    infills_3_type: {},
    infills_4_type: {},
    infills_right_1_type: {},
    infills_right_2_type: {},
    infills_right_3_type: {},
    infills_right_4_type: {},
    infills_1_color: {},
    infills_2_color: {},
    infills_3_color: {},
    infills_4_color: {},
    infills_right_1_color: {},
    infills_right_2_color: {},
    infills_right_3_color: {},
    infills_right_4_color: {},
    type_gz_factory: {},
    isa_type: {}
  });
  
  // Frame Cavities functionality has been removed as requested
  const [additionalPhotos, setAdditionalPhotos] = useState([]);
  const [newPhotos, setNewPhotos] = useState([]);
  const [deletePhotoIds, setDeletePhotoIds] = useState([]);
  const [validationMessages, setValidationMessages] = useState({});
  
  const [previewProfilePhoto, setPreviewProfilePhoto] = useState(null);
  const [productParts, setProductParts] = useState([]);
  const [transomParts, setTransomParts] = useState([]);
  const [bracketParts, setBracketParts] = useState([]);
  
  // Load product parts on component mount
  useEffect(() => {
    const fetchProductParts = async () => {
      try {
        const response = await api.productParts.getAll();
        const parts = response.data;
        
        console.log('Product parts from API:', parts[0]); // Log the first product part to see its structure
        
        setProductParts(parts);
        
        // Filter transom parts (D015, D016)
        const transomPartsList = parts.filter(part => 
          part.product_part_id?.startsWith('D015') || part.product_part_id?.startsWith('D016')
        );
        setTransomParts(transomPartsList);
        
        // Filter bracket parts (D06*)
        const bracketPartsList = parts.filter(part => 
          part.product_part_id?.startsWith('D06')
        );
        setBracketParts(bracketPartsList);
      } catch (err) {
        console.error('Error fetching product parts:', err);
      }
    };
    
    fetchProductParts();
  }, []);
  
  // Load panel data if in edit mode
  useEffect(() => {
    if (isEditMode) {
      const fetchPanelData = async () => {
        try {
          setLoading(true);
          const response = await api.qcCwPanelData.getById(panelId);
          const panelData = response.data;
          
          // Convert the panel data to form data
          const initialFormData = {
            fl_id: panelData.fl_id,
            pan_id: panelData.pan_id,
            ipa_cleaned: panelData.ipa_cleaned,
            sealant_frame_enough: panelData.sealant_frame_enough,
            cavities_invert: panelData.cavities_invert,
            qc_infill_affix: panelData.qc_infill_affix,
            structural_sealant_records: panelData.structural_sealant_records,
            lmr: panelData.lmr,
            edge_bead_attached: panelData.edge_bead_attached,
            operable: panelData.operable,
            card_checked: panelData.card_checked,
            paint_damage: panelData.paint_damage,
            glass_scratched: panelData.glass_scratched,
            cleaned_ready: panelData.cleaned_ready,
            crated: panelData.crated,
            profile_photo: null // Will be set if there's a photo
          };
          
          // Set preview for profile photo if it exists
          if (panelData.profile_photo) {
            setPreviewProfilePhoto(`data:image/jpeg;base64,${panelData.profile_photo}`);
          }
          
          // Process JSON fields
          const jsonFields = [
            'width_l', 'width_r', 'height_1', 'height_2', 'height_3', 'height_4',
            'cavity_ro_height_total', 'cavity_diag_cw_pan_l', 'cavity_diag_cw_pan_r',
            'left', 'middle', 'right', 'head', 'sill',
            'trans_1', 'trans_2', 'trans_3',
            'bracket_l', 'bracket_r',
            'infill_fs_location',
            'infills_1_type', 'infills_2_type', 'infills_3_type', 'infills_4_type',
            'infills_right_1_type', 'infills_right_2_type', 'infills_right_3_type', 'infills_right_4_type',
            'infills_1_color', 'infills_2_color', 'infills_3_color', 'infills_4_color',
            'infills_right_1_color', 'infills_right_2_color', 'infills_right_3_color', 'infills_right_4_color',
            'type_gz_factory', 'isa_type'
          ];
          
          // Copy JSON fields to form data
          jsonFields.forEach(field => {
            initialFormData[field] = panelData[field] || {};
          });
          
          // Set additional photos
          if (panelData.additional_photos) {
            setAdditionalPhotos(panelData.additional_photos);
          }
          
          setFormData(initialFormData);
          
          setError(null);
        } catch (err) {
          console.error('Error fetching panel data:', err);
          setError('Failed to load panel data. Please try again.');
        } finally {
          setLoading(false);
        }
      };
      
      fetchPanelData();
    }
  }, [panelId, isEditMode]);
  
  // Frame Cavities fetch functionality has been removed as requested
  
  // Handle form field changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle different input types
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData({
      ...formData,
      [name]: newValue
    });
  };
  
  // Handle JSON field changes
  const handleJsonFieldChange = (field, subField, value) => {
    setFormData({
      ...formData,
      [field]: {
        ...formData[field],
        [subField]: value
      }
    });
  };
  
  // Frame Cavities value handling has been removed as requested
  
  // Handle profile photo upload
  const handleProfilePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          profile_photo: reader.result
        });
        setPreviewProfilePhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Handle additional photo upload
  const handleAdditionalPhotoChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Process each file
    const filePromises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            photo: reader.result,
            photo_type: file.name.split('.')[0] // Use filename as photo type
          });
        };
        reader.readAsDataURL(file);
      });
    });
    
    // Add all new photos when ready
    Promise.all(filePromises).then(newPhotoArray => {
      setNewPhotos([...newPhotos, ...newPhotoArray]);
    });
  };
  
  // Handle removing a photo
  const handleRemovePhoto = (index, isNew) => {
    if (isNew) {
      // Remove from new photos
      const updatedNewPhotos = [...newPhotos];
      updatedNewPhotos.splice(index, 1);
      setNewPhotos(updatedNewPhotos);
    } else {
      // Mark existing photo for deletion
      const photoId = additionalPhotos[index].id;
      setDeletePhotoIds([...deletePhotoIds, photoId]);
      
      // Also remove from UI
      const updatedPhotos = [...additionalPhotos];
      updatedPhotos.splice(index, 1);
      setAdditionalPhotos(updatedPhotos);
    }
  };
  
  // Form validation
  const validateForm = () => {
    // Required fields
    if (!formData.fl_id || !formData.pan_id) {
      setError('FL ID and Panel ID are required.');
      setActiveTab('basic'); // Switch to basic tab where these fields are
      return false;
    }
    
    // Add more validation as needed
    
    return true;
  };
  
  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSaving(true);
      
      // Clean up data before submission - remove factory_floor values for empty components
      const cleanedFormData = { ...formData };
      
      // Clean Mullion components
      ['left', 'middle', 'right', 'head', 'sill'].forEach(position => {
        if (!cleanedFormData[position].GZ_office && cleanedFormData[position].factory_floor) {
          // If GZ office is empty but factory floor has a value, remove factory floor
          delete cleanedFormData[position].factory_floor;
        }
      });
      
      // Clean Transom components
      [1, 2, 3].forEach(num => {
        if (!cleanedFormData[`trans_${num}`].GZ_office && cleanedFormData[`trans_${num}`].factory_floor) {
          delete cleanedFormData[`trans_${num}`].factory_floor;
        }
      });
      
      // Clean Bracket components
      ['l', 'r'].forEach(position => {
        if (!cleanedFormData[`bracket_${position}`].GZ_office && cleanedFormData[`bracket_${position}`].factory_floor) {
          delete cleanedFormData[`bracket_${position}`].factory_floor;
        }
      });
      
      // Prepare data for submission 
      const submitData = {
        ...cleanedFormData
      };
      
      // Add new photos if any
      if (newPhotos.length > 0) {
        submitData.additional_photos = newPhotos;
      }
      
      // Add photo deletion list if in edit mode
      if (isEditMode && deletePhotoIds.length > 0) {
        submitData.delete_photos = deletePhotoIds;
      }
      
      let response;
      
      if (isEditMode) {
        // Update existing panel
        response = await api.qcCwPanelData.update(panelId, submitData);
      } else {
        // Create new panel
        response = await api.qcCwPanelData.create(submitData);
      }
      
      // Navigate to detail view
      navigate(`/qc-cw-panel-data/detail/${response.data.data.id}`);
    } catch (err) {
      console.error('Error saving panel data:', err);
      setError('Failed to save panel data. Please check your input and try again.');
      setSaving(false);
    }
  };
  
  const handleCancel = () => {
    if (isEditMode) {
      navigate(`/qc-cw-panel-data/detail/${panelId}`);
    } else {
      navigate('/qc-cw-panel-data');
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
  
  return (
    <Container fluid className="mt-4 mb-5">
      <Row className="mb-4">
        <Col>
          <h2>{isEditMode ? 'Edit Panel' : 'Add New Panel'}</h2>
          <p>{isEditMode ? 'Update panel details' : 'Create a new panel entry'}</p>
        </Col>
      </Row>
      
      {error && (
        <Row className="mb-4">
          <Col>
            <Alert variant="danger">{error}</Alert>
          </Col>
        </Row>
      )}
      
      <Form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <Card.Body>
            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
              className="mb-4"
            >
              {/* Basic Information Tab */}
              <Tab eventKey="basic" title="Basic Information">
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>FL ID<span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="fl_id"
                        value={formData.fl_id}
                        onChange={handleChange}
                        disabled={isEditMode} // Cannot change FL ID in edit mode
                        required
                      />
                      <Form.Text className="text-muted">
                        Floor ID for the panel. Cannot be changed after creation.
                      </Form.Text>
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Panel ID<span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="pan_id"
                        value={formData.pan_id}
                        onChange={handleChange}
                        required
                      />
                      <Form.Text className="text-muted">
                        Panel ID will be combined with FL ID to create panel name.
                      </Form.Text>
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Panel Name (Preview)</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.fl_id && formData.pan_id ? `c${formData.fl_id}.${formData.pan_id}` : ''}
                        disabled
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>LMR (Left/Middle/Right)</Form.Label>
                      <Form.Select
                        name="lmr"
                        value={formData.lmr}
                        onChange={handleChange}
                      >
                        <option value="">Select position</option>
                        <option value="L">L - Left</option>
                        <option value="M">M - Middle</option>
                        <option value="R">R - Right</option>
                      </Form.Select>
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Cavities Invert</Form.Label>
                      <Form.Control
                        type="number"
                        name="cavities_invert"
                        value={formData.cavities_invert}
                        onChange={handleChange}
                      />
                    </Form.Group>
                    
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Check
                            type="checkbox"
                            label="IPA Cleaned"
                            name="ipa_cleaned"
                            checked={formData.ipa_cleaned}
                            onChange={handleChange}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Check
                            type="checkbox"
                            label="Sealant Frame Enough"
                            name="sealant_frame_enough"
                            checked={formData.sealant_frame_enough}
                            onChange={handleChange}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-4">
                      <Form.Label>Profile Photo</Form.Label>
                      <div className="mb-3">
                        <Form.Control
                          type="file"
                          accept="image/*"
                          onChange={handleProfilePhotoChange}
                        />
                      </div>
                      
                      {previewProfilePhoto && (
                        <div className="profile-photo-preview text-center">
                          <img
                            src={previewProfilePhoto}
                            alt="Profile Preview"
                            className="img-fluid rounded"
                            style={{ maxHeight: "300px" }}
                          />
                          <Button 
                            variant="outline-danger" 
                            size="sm" 
                            className="mt-2"
                            onClick={() => {
                              setPreviewProfilePhoto(null);
                              setFormData({...formData, profile_photo: null});
                            }}
                          >
                            Remove Photo
                          </Button>
                        </div>
                      )}
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>QC Infill Affix</Form.Label>
                      <Form.Control
                        type="text"
                        name="qc_infill_affix"
                        value={formData.qc_infill_affix || ''}
                        onChange={handleChange}
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Structural Sealant Records</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        name="structural_sealant_records"
                        value={formData.structural_sealant_records || ''}
                        onChange={handleChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Tab>
              
              {/* Panel Measurements Tab */}
              <Tab eventKey="measurements" title="Panel Measurements">
                <Row className="mb-4">
                  <Col>
                    <h5>Width Measurements</h5>
                    <div className="field-set p-3 border rounded">
                      <Row className="mb-3">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Width Left - GZ Office</Form.Label>
                            <Form.Control
                              type="text"
                              value={formData.width_l.GZ_office || ''}
                              onChange={(e) => handleJsonFieldChange('width_l', 'GZ_office', e.target.value)}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Width Left - Factory Floor</Form.Label>
                            <Form.Check
                              type="checkbox"
                              label="Yes, measurement is correct / No, add sealant"
                              checked={formData.width_l.factory_floor === 'yes'}
                              onChange={(e) => handleJsonFieldChange('width_l', 'factory_floor', e.target.checked ? 'yes' : 'no, add sealant')}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      
                      <Row>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Width Right - GZ Office</Form.Label>
                            <Form.Control
                              type="text"
                              value={formData.width_r.GZ_office || ''}
                              onChange={(e) => handleJsonFieldChange('width_r', 'GZ_office', e.target.value)}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Width Right - Factory Floor</Form.Label>
                            <Form.Check
                              type="checkbox"
                              label="Yes, measurement is correct / No, add sealant"
                              checked={formData.width_r.factory_floor === 'yes'}
                              onChange={(e) => handleJsonFieldChange('width_r', 'factory_floor', e.target.checked ? 'yes' : 'no, add sealant')}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </div>
                  </Col>
                </Row>
                
                <Row className="mb-4">
                  <Col>
                    <h5>Height Measurements</h5>
                    <div className="field-set p-3 border rounded">
                      {[1, 2, 3, 4].map(num => (
                        <Row className="mb-3" key={`height-${num}`}>
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label>Height {num} - GZ Office</Form.Label>
                              <Form.Control
                                type="text"
                                value={formData[`height_${num}`].GZ_office || ''}
                                onChange={(e) => handleJsonFieldChange(`height_${num}`, 'GZ_office', e.target.value)}
                              />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label>Height {num} - Factory Floor</Form.Label>
                              <Form.Check
                                type="checkbox"
                                label="Yes, measurement is correct / No, needs adjustment"
                                checked={formData[`height_${num}`].factory_floor === 'yes'}
                                onChange={(e) => handleJsonFieldChange(`height_${num}`, 'factory_floor', e.target.checked ? 'yes' : 'no, needs adjustment')}
                              />
                            </Form.Group>
                          </Col>
                        </Row>
                      ))}
                    </div>
                  </Col>
                </Row>
                
                <Row>
                  <Col>
                    <h5>Cavity Measurements</h5>
                    <div className="field-set p-3 border rounded">
                      <Row className="mb-3">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Cavity RO Height Total (mm) - GZ Office</Form.Label>
                            <Form.Control
                              type="text"
                              value={formData.cavity_ro_height_total.GZ_office || ''}
                              onChange={(e) => handleJsonFieldChange('cavity_ro_height_total', 'GZ_office', e.target.value)}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Cavity RO Height Total (mm) - Factory Floor</Form.Label>
                            <Form.Control
                              type="number"
                              value={formData.cavity_ro_height_total.factory_floor || ''}
                              onChange={(e) => handleJsonFieldChange('cavity_ro_height_total', 'factory_floor', e.target.value)}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      
                      <Row className="mb-3">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Cavity Diagonal Left (mm) - GZ Office</Form.Label>
                            <Form.Control
                              type="text"
                              value={formData.cavity_diag_cw_pan_l.GZ_office || ''}
                              onChange={(e) => handleJsonFieldChange('cavity_diag_cw_pan_l', 'GZ_office', e.target.value)}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Cavity Diagonal Left (mm) - Factory Floor</Form.Label>
                            <Form.Control
                              type="number"
                              value={formData.cavity_diag_cw_pan_l.factory_floor || ''}
                              onChange={(e) => handleJsonFieldChange('cavity_diag_cw_pan_l', 'factory_floor', e.target.value)}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      
                      <Row>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Cavity Diagonal Right (mm) - GZ Office</Form.Label>
                            <Form.Control
                              type="text"
                              value={formData.cavity_diag_cw_pan_r.GZ_office || ''}
                              onChange={(e) => handleJsonFieldChange('cavity_diag_cw_pan_r', 'GZ_office', e.target.value)}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Cavity Diagonal Right (mm) - Factory Floor</Form.Label>
                            <Form.Control
                              type="number"
                              value={formData.cavity_diag_cw_pan_r.factory_floor || ''}
                              onChange={(e) => handleJsonFieldChange('cavity_diag_cw_pan_r', 'factory_floor', e.target.value)}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </div>
                  </Col>
                </Row>
              </Tab>
              
              {/* Components Tab */}
              <Tab eventKey="components" title="Components">
                <Row className="mb-4">
                  <Col>
                    <h5>Mullion Components</h5>
                    <div className="field-set p-3 border rounded">
                      <Alert variant="info" className="mb-3">
                        <small>GZ Office values should be selected from product parts in the database.</small>
                      </Alert>
                      
                      {productParts.length === 0 && (
                        <Alert variant="warning" className="mb-3">
                          <small>Loading product parts... If this persists, please check your connection or try refreshing the page.</small>
                        </Alert>
                      )}
                      
                      {['left', 'middle', 'right', 'head', 'sill'].map(position => (
                        <Row className="mb-3" key={`mullion-${position}`}>
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label>Mullion {position.charAt(0).toUpperCase() + position.slice(1)} - GZ Office (Product Part)</Form.Label>
                              <Form.Select
                                value={formData[position].GZ_office || ''}
                                onChange={(e) => handleJsonFieldChange(position, 'GZ_office', e.target.value)}
                              >
                                <option value="">Select a product part</option>
                                {productParts.map(part => (
                                  <option key={part.id} value={part.product_part_id}>
                                    {part.product_part_id} - {part.product_part_name}
                                  </option>
                                ))}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label>Mullion {position.charAt(0).toUpperCase() + position.slice(1)} - Factory Floor</Form.Label>
                              <Form.Check
                                type="checkbox"
                                label="Yes, correct / No, needs review"
                                checked={formData[position].factory_floor === 'yes'}
                                onChange={(e) => {
                                  // Only set a value if there's a GZ office selection
                                  if (formData[position].GZ_office) {
                                    handleJsonFieldChange(position, 'factory_floor', e.target.checked ? 'yes' : 'no, needs review');
                                  } else {
                                    // Alert the user they need to select a part first
                                    setValidationMessages(prev => ({
                                      ...prev,
                                      [`${position}_factory`]: "Please select a product part first"
                                    }));
                                  }
                                }}
                              />
                              {validationMessages[`${position}_factory`] && (
                                <Form.Text className="text-warning">
                                  {validationMessages[`${position}_factory`]}
                                </Form.Text>
                              )}
                            </Form.Group>
                          </Col>
                        </Row>
                      ))}
                    </div>
                  </Col>
                </Row>
                
                <Row className="mb-4">
                  <Col>
                    <h5>Transom Components</h5>
                    <div className="field-set p-3 border rounded">
                      <Alert variant="info" className="mb-3">
                        <small>Select transom components from the filtered list. Common transom parts start with 'D015' or 'D016'.</small>
                      </Alert>
                      
                      {transomParts.length === 0 && (
                        <Alert variant="warning" className="mb-3">
                          <small>Loading transom parts... If this persists, please check your connection or try refreshing the page.</small>
                        </Alert>
                      )}
                      
                      {[1, 2, 3].map(num => (
                        <Row className="mb-3" key={`transom-${num}`}>
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label>Transom {num} - GZ Office (Product Part)</Form.Label>
                              <Form.Select
                                value={formData[`trans_${num}`].GZ_office || ''}
                                onChange={(e) => handleJsonFieldChange(`trans_${num}`, 'GZ_office', e.target.value)}
                              >
                                <option value="">Select a transom part</option>
                                {transomParts.map(part => (
                                  <option key={part.id} value={part.product_part_id}>
                                    {part.product_part_id} - {part.product_part_name}
                                  </option>
                                ))}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label>Transom {num} - Factory Floor</Form.Label>
                              <Form.Check
                                type="checkbox"
                                label="Yes, correct / No, needs review"
                                checked={formData[`trans_${num}`].factory_floor === 'yes'}
                                onChange={(e) => {
                                  // Only set a value if there's a GZ office selection
                                  if (formData[`trans_${num}`].GZ_office) {
                                    handleJsonFieldChange(`trans_${num}`, 'factory_floor', e.target.checked ? 'yes' : 'no, needs review');
                                  } else {
                                    // Alert the user they need to select a part first
                                    setValidationMessages(prev => ({
                                      ...prev,
                                      [`trans_${num}_factory`]: "Please select a product part first"
                                    }));
                                  }
                                }}
                              />
                              {validationMessages[`trans_${num}_factory`] && (
                                <Form.Text className="text-warning">
                                  {validationMessages[`trans_${num}_factory`]}
                                </Form.Text>
                              )}
                            </Form.Group>
                          </Col>
                        </Row>
                      ))}
                    </div>
                  </Col>
                </Row>
                
                <Row>
                  <Col>
                    <h5>Bracket Components</h5>
                    <div className="field-set p-3 border rounded">
                      <Alert variant="info" className="mb-3">
                        <small>Select bracket components from the filtered list. Bracket parts typically start with 'D06'.</small>
                      </Alert>
                      
                      {bracketParts.length === 0 && (
                        <Alert variant="warning" className="mb-3">
                          <small>Loading bracket parts... If this persists, please check your connection or try refreshing the page.</small>
                        </Alert>
                      )}
                      
                      {['l', 'r'].map(position => (
                        <Row className="mb-3" key={`bracket-${position}`}>
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label>Bracket {position.toUpperCase()} - GZ Office (Product Part)</Form.Label>
                              <Form.Select
                                value={formData[`bracket_${position}`].GZ_office || ''}
                                onChange={(e) => handleJsonFieldChange(`bracket_${position}`, 'GZ_office', e.target.value)}
                              >
                                <option value="">Select a bracket part</option>
                                {bracketParts.map(part => (
                                  <option key={part.id} value={part.product_part_id}>
                                    {part.product_part_id} - {part.product_part_name}
                                  </option>
                                ))}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label>Bracket {position.toUpperCase()} - Factory Floor</Form.Label>
                              <Form.Check
                                type="checkbox"
                                label="Yes, correct / No, needs review"
                                checked={formData[`bracket_${position}`].factory_floor === 'yes'}
                                onChange={(e) => {
                                  // Only set a value if there's a GZ office selection
                                  if (formData[`bracket_${position}`].GZ_office) {
                                    handleJsonFieldChange(`bracket_${position}`, 'factory_floor', e.target.checked ? 'yes' : 'no, needs review');
                                  } else {
                                    // Alert the user they need to select a part first
                                    setValidationMessages(prev => ({
                                      ...prev,
                                      [`bracket_${position}_factory`]: "Please select a product part first"
                                    }));
                                  }
                                }}
                              />
                              {validationMessages[`bracket_${position}_factory`] && (
                                <Form.Text className="text-warning">
                                  {validationMessages[`bracket_${position}_factory`]}
                                </Form.Text>
                              )}
                            </Form.Group>
                          </Col>
                        </Row>
                      ))}
                    </div>
                  </Col>
                </Row>
              </Tab>
              
              {/* Infills Tab */}
              <Tab eventKey="infills" title="Infills">
                <Row className="mb-4">
                  <Col>
                    <h5>Infill Location</h5>
                    <div className="field-set p-3 border rounded">
                      <Row>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Infill FS Location - GZ Office</Form.Label>
                            <Form.Control
                              type="text"
                              value={formData.infill_fs_location.GZ_office || ''}
                              onChange={(e) => handleJsonFieldChange('infill_fs_location', 'GZ_office', e.target.value)}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Infill FS Location - Factory Floor</Form.Label>
                            <Form.Check
                              type="checkbox"
                              label="Yes, correct / No, incorrect"
                              checked={formData.infill_fs_location.factory_floor === 'yes'}
                              onChange={(e) => handleJsonFieldChange('infill_fs_location', 'factory_floor', e.target.checked ? 'yes' : 'no')}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </div>
                  </Col>
                </Row>
                
                <Row className="mb-4">
                  <Col>
                    <h5>Regular Infill Types</h5>
                    <div className="field-set p-3 border rounded">
                      {[1, 2, 3, 4].map(num => (
                        <Row className="mb-3" key={`infill-type-${num}`}>
                          <Col md={4}>
                            <Form.Group>
                              <Form.Label>Infill {num} Type - GZ Office</Form.Label>
                              <Form.Control
                                type="text"
                                value={formData[`infills_${num}_type`].GZ_office || ''}
                                onChange={(e) => handleJsonFieldChange(`infills_${num}_type`, 'GZ_office', e.target.value)}
                              />
                            </Form.Group>
                          </Col>
                          <Col md={4}>
                            <Form.Group>
                              <Form.Label>GZ Office 2</Form.Label>
                              <Form.Control
                                type="text"
                                value={formData[`infills_${num}_type`].GZ_office_2 || ''}
                                onChange={(e) => handleJsonFieldChange(`infills_${num}_type`, 'GZ_office_2', e.target.value)}
                              />
                            </Form.Group>
                          </Col>
                          <Col md={4}>
                            <Form.Group>
                              <Form.Label>Factory Floor</Form.Label>
                              <Form.Check
                                type="checkbox"
                                label="Yes, correct / No, incorrect" 
                                checked={formData[`infills_${num}_type`].factory_floor === 'yes'}
                                onChange={(e) => handleJsonFieldChange(`infills_${num}_type`, 'factory_floor', e.target.checked ? 'yes' : 'no, incorrect')}
                              />
                            </Form.Group>
                          </Col>
                        </Row>
                      ))}
                    </div>
                  </Col>
                </Row>
                
                <Row className="mb-4">
                  <Col>
                    <h5>Right Infill Types</h5>
                    <div className="field-set p-3 border rounded">
                      {[1, 2, 3, 4].map(num => (
                        <Row className="mb-3" key={`infill-right-type-${num}`}>
                          <Col md={4}>
                            <Form.Group>
                              <Form.Label>Right Infill {num} Type - GZ Office</Form.Label>
                              <Form.Control
                                type="text"
                                value={formData[`infills_right_${num}_type`].GZ_office || ''}
                                onChange={(e) => handleJsonFieldChange(`infills_right_${num}_type`, 'GZ_office', e.target.value)}
                              />
                            </Form.Group>
                          </Col>
                          <Col md={4}>
                            <Form.Group>
                              <Form.Label>GZ Office 2</Form.Label>
                              <Form.Control
                                type="text"
                                value={formData[`infills_right_${num}_type`].GZ_office_2 || ''}
                                onChange={(e) => handleJsonFieldChange(`infills_right_${num}_type`, 'GZ_office_2', e.target.value)}
                              />
                            </Form.Group>
                          </Col>
                          <Col md={4}>
                            <Form.Group>
                              <Form.Label>Factory Floor</Form.Label>
                              <Form.Check
                                type="checkbox"
                                label="Yes, correct / No, incorrect"
                                checked={formData[`infills_right_${num}_type`].factory_floor === 'yes'}
                                onChange={(e) => handleJsonFieldChange(`infills_right_${num}_type`, 'factory_floor', e.target.checked ? 'yes' : 'no, incorrect')}
                              />
                            </Form.Group>
                          </Col>
                        </Row>
                      ))}
                    </div>
                  </Col>
                </Row>
                
                <Row className="mb-4">
                  <Col>
                    <h5>Infill Colors</h5>
                    <div className="field-set p-3 border rounded">
                      <Row className="mb-4">
                        <Col md={6}>
                          <h6>Regular Infill Colors</h6>
                          {[1, 2, 3, 4].map(num => (
                            <Row className="mb-3" key={`infill-color-${num}`}>
                              <Col md={6}>
                                <Form.Group>
                                  <Form.Label>Infill {num} Color - GZ Office</Form.Label>
                                  <Form.Control
                                    type="text"
                                    value={formData[`infills_${num}_color`].GZ_office || ''}
                                    onChange={(e) => handleJsonFieldChange(`infills_${num}_color`, 'GZ_office', e.target.value)}
                                  />
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group>
                                  <Form.Label>Factory Floor</Form.Label>
                                  <Form.Check
                                    type="checkbox"
                                    label="Yes, correct / No, incorrect" 
                                    checked={formData[`infills_${num}_color`].factory_floor === 'yes'}
                                    onChange={(e) => handleJsonFieldChange(`infills_${num}_color`, 'factory_floor', e.target.checked ? 'yes' : 'no, incorrect')}
                                  />
                                </Form.Group>
                              </Col>
                            </Row>
                          ))}
                        </Col>
                        
                        <Col md={6}>
                          <h6>Right Infill Colors</h6>
                          {[1, 2, 3, 4].map(num => (
                            <Row className="mb-3" key={`infill-right-color-${num}`}>
                              <Col md={6}>
                                <Form.Group>
                                  <Form.Label>Right Infill {num} Color - GZ Office</Form.Label>
                                  <Form.Control
                                    type="text"
                                    value={formData[`infills_right_${num}_color`].GZ_office || ''}
                                    onChange={(e) => handleJsonFieldChange(`infills_right_${num}_color`, 'GZ_office', e.target.value)}
                                  />
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group>
                                  <Form.Label>Factory Floor</Form.Label>
                                  <Form.Check
                                    type="checkbox"
                                    label="Yes, correct / No, incorrect" 
                                    checked={formData[`infills_right_${num}_color`].factory_floor === 'yes'}
                                    onChange={(e) => handleJsonFieldChange(`infills_right_${num}_color`, 'factory_floor', e.target.checked ? 'yes' : 'no, incorrect')}
                                  />
                                </Form.Group>
                              </Col>
                            </Row>
                          ))}
                        </Col>
                      </Row>
                    </div>
                  </Col>
                </Row>
                
                <Row className="mb-4">
                  <Col>
                    <h5>Type GZ/Factory</h5>
                    <div className="field-set p-3 border rounded">
                      <Row>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Type GZ Office</Form.Label>
                            <Form.Control
                              type="text"
                              value={formData.type_gz_factory.GZ_office || ''}
                              onChange={(e) => handleJsonFieldChange('type_gz_factory', 'GZ_office', e.target.value)}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Type Factory</Form.Label>
                            <Form.Check
                              type="checkbox"
                              label="Yes, correct / No, incorrect" 
                              checked={formData.type_gz_factory.factory_floor === 'yes'}
                              onChange={(e) => handleJsonFieldChange('type_gz_factory', 'factory_floor', e.target.checked ? 'yes' : 'no, incorrect')}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </div>
                  </Col>
                </Row>
                
                <Row className="mb-4">
                  <Col>
                    <h5>ISA Type</h5>
                    <div className="field-set p-3 border rounded">
                      <Row>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>ISA Type - GZ Office</Form.Label>
                            <Form.Control
                              type="text"
                              value={formData.isa_type?.GZ_office || ''}
                              onChange={(e) => handleJsonFieldChange('isa_type', 'GZ_office', e.target.value)}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>ISA Type - Factory Floor</Form.Label>
                            <Form.Control
                              type="text"
                              value={formData.isa_type?.factory_floor || ''}
                              onChange={(e) => {
                                const newValue = e.target.value;
                                handleJsonFieldChange('isa_type', 'factory_floor', newValue);
                                
                                // Check if values differ and show warning
                                if (formData.isa_type?.GZ_office && newValue && formData.isa_type.GZ_office !== newValue) {
                                  setValidationMessages(prev => ({
                                    ...prev, 
                                    isa_type: "Are you sure the type you input is correct? notify office there may be an error."
                                  }));
                                } else {
                                  setValidationMessages(prev => {
                                    const newMessages = {...prev};
                                    delete newMessages.isa_type;
                                    return newMessages;
                                  });
                                }
                              }}
                            />
                            {validationMessages?.isa_type && (
                              <Form.Text className="text-danger">
                                {validationMessages.isa_type}
                              </Form.Text>
                            )}
                          </Form.Group>
                        </Col>
                      </Row>
                    </div>
                  </Col>
                </Row>
                
                <Row>
                  <Col>
                    <h5>QC Infill Affix</h5>
                    <div className="field-set p-3 border rounded">
                      <Form.Group>
                        <Form.Check
                          type="checkbox"
                          label="QC Infill Affix"
                          name="qc_infill_affix"
                          checked={formData.qc_infill_affix === 'yes'}
                          onChange={(e) => {
                            const newValue = e.target.checked ? 'yes' : 'no';
                            setFormData({ ...formData, qc_infill_affix: newValue });
                          }}
                        />
                      </Form.Group>
                    </div>
                  </Col>
                </Row>
              </Tab>
              
              {/* Frame Cavities Tab removed as requested */}
              
              {/* Final Checks Tab */}
              <Tab eventKey="checks" title="Final Checks">
                <Row>
                  <Col md={6}>
                    <div className="field-set p-3 border rounded mb-4">
                      <h5 className="mb-3">Quality Checks</h5>
                      
                      <Form.Group className="mb-3">
                        <Form.Check
                          type="checkbox"
                          label="Edge Bead Attached"
                          name="edge_bead_attached"
                          checked={formData.edge_bead_attached}
                          onChange={handleChange}
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Check
                          type="checkbox"
                          label="Operable"
                          name="operable"
                          checked={formData.operable}
                          onChange={handleChange}
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Check
                          type="checkbox"
                          label="Crated"
                          name="crated"
                          checked={formData.crated}
                          onChange={handleChange}
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Card Checked</Form.Label>
                        <Form.Select
                          name="card_checked"
                          value={formData.card_checked || ''}
                          onChange={handleChange}
                        >
                          <option value="">Select status</option>
                          <option value="pass">Pass</option>
                          <option value="no pass-rework">No Pass - Rework</option>
                          <option value="no pass-fix at jobsite">No Pass - Fix at jobsite</option>
                        </Form.Select>
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Paint Damage</Form.Label>
                        <Form.Select
                          name="paint_damage"
                          value={formData.paint_damage || ''}
                          onChange={handleChange}
                        >
                          <option value="">Select status</option>
                          <option value="pass">Pass</option>
                          <option value="no pass-rework">No Pass - Rework</option>
                          <option value="no pass-fix at jobsite">No Pass - Fix at jobsite</option>
                        </Form.Select>
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Glass Scratched</Form.Label>
                        <Form.Select
                          name="glass_scratched"
                          value={formData.glass_scratched || ''}
                          onChange={handleChange}
                        >
                          <option value="">Select status</option>
                          <option value="pass">Pass</option>
                          <option value="no pass-rework">No Pass - Rework</option>
                          <option value="no pass-fix at jobsite">No Pass - Fix at jobsite</option>
                        </Form.Select>
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Cleaned Ready</Form.Label>
                        <Form.Select
                          name="cleaned_ready"
                          value={formData.cleaned_ready || ''}
                          onChange={handleChange}
                        >
                          <option value="">Select status</option>
                          <option value="pass: cleaned">Pass: Cleaned</option>
                          <option value="ready to pack">Ready to pack</option>
                          <option value="not cleaned">Not cleaned</option>
                        </Form.Select>
                      </Form.Group>
                    </div>
                  </Col>
                  
                  <Col md={6}>
                    <div className="field-set p-3 border rounded mb-4">
                      <h5 className="mb-3">Additional Photos</h5>
                      
                      <Form.Group className="mb-4">
                        <Form.Label>Upload Photos</Form.Label>
                        <Form.Control
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleAdditionalPhotoChange}
                        />
                        <Form.Text className="text-muted">
                          Upload one or more photos. The filename will be used as the photo type.
                        </Form.Text>
                      </Form.Group>
                      
                      {/* Display existing photos */}
                      {additionalPhotos.length > 0 && (
                        <div className="mb-4">
                          <h6>Existing Photos</h6>
                          <Row>
                            {additionalPhotos.map((photo, index) => (
                              <Col xs={6} md={4} key={`existing-photo-${index}`} className="mb-3">
                                <Card>
                                  <Card.Img
                                    variant="top"
                                    src={`data:image/jpeg;base64,${photo.photo}`}
                                    style={{ height: '100px', objectFit: 'cover' }}
                                  />
                                  <Card.Body className="p-2">
                                    <small>{photo.photo_type || `Photo ${index + 1}`}</small>
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      className="mt-1 w-100"
                                      onClick={() => handleRemovePhoto(index, false)}
                                    >
                                      Remove
                                    </Button>
                                  </Card.Body>
                                </Card>
                              </Col>
                            ))}
                          </Row>
                        </div>
                      )}
                      
                      {/* Display new photos */}
                      {newPhotos.length > 0 && (
                        <div>
                          <h6>New Photos</h6>
                          <Row>
                            {newPhotos.map((photo, index) => (
                              <Col xs={6} md={4} key={`new-photo-${index}`} className="mb-3">
                                <Card>
                                  <Card.Img
                                    variant="top"
                                    src={photo.photo}
                                    style={{ height: '100px', objectFit: 'cover' }}
                                  />
                                  <Card.Body className="p-2">
                                    <small>{photo.photo_type || `New Photo ${index + 1}`}</small>
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      className="mt-1 w-100"
                                      onClick={() => handleRemovePhoto(index, true)}
                                    >
                                      Remove
                                    </Button>
                                  </Card.Body>
                                </Card>
                              </Col>
                            ))}
                          </Row>
                        </div>
                      )}
                    </div>
                  </Col>
                </Row>
              </Tab>
            </Tabs>
          </Card.Body>
        </Card>
        
        <div className="d-flex justify-content-between">
          <Button variant="secondary" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                Saving...
              </>
            ) : isEditMode ? 'Update Panel' : 'Create Panel'}
          </Button>
        </div>
      </Form>
    </Container>
  );
};

export default QCCWPanelForm;