import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ProductParts = () => {
  const [productParts, setProductParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [colors, setColors] = useState([]);
  const [formData, setFormData] = useState({
    product_part_id: '',
    product_part_name: '',
    product_part_vendor: '',
    product_part_type: '',
    image_data: '',
    color_ids: []
  });
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  // Fetch product parts on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [partsResponse, colorsResponse] = await Promise.all([
          api.productParts.getAll(),
          api.coatingColors.getAll()
        ]);
        setProductParts(partsResponse.data);
        setColors(colorsResponse.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load product parts. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddModalOpen = () => {
    setFormData({
      product_part_id: '',
      product_part_name: '',
      product_part_vendor: '',
      product_part_type: '',
      image_data: '',
      color_ids: []
    });
    setShowAddModal(true);
  };

  const handleEditModalOpen = (part) => {
    // Get the part's colors
    const partColors = part.colors ? part.colors.map(color => color.id) : [];
    
    setSelectedPart(part);
    setFormData({
      product_part_id: part.product_part_id,
      product_part_name: part.product_part_name,
      product_part_vendor: part.product_part_vendor || '',
      product_part_type: part.product_part_type || '',
      image_data: '',  // Don't prefill image data, it would be too large
      color_ids: partColors
    });
    setShowEditModal(true);
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedPart(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleColorChange = (e) => {
    const colorId = parseInt(e.target.value);
    const isChecked = e.target.checked;
    
    if (isChecked) {
      setFormData({
        ...formData,
        color_ids: [...formData.color_ids, colorId]
      });
    } else {
      setFormData({
        ...formData,
        color_ids: formData.color_ids.filter(id => id !== colorId)
      });
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({
        ...formData,
        image_data: reader.result
      });
    };
    reader.readAsDataURL(file);
  };

  const handleAddPart = async (e) => {
    e.preventDefault();
    if (!formData.product_part_id || !formData.product_part_name) {
      setError('Die Number (PF) and Die Name are required');
      return;
    }

    try {
      setLoading(true);
      const response = await api.productParts.create(formData);
      
      // Add the new part to the list
      const newPart = {
        ...response.data,
        id: response.data.id,
        colors: formData.color_ids.map(colorId => {
          const color = colors.find(c => c.id === colorId);
          return { id: colorId, name: color ? color.coating_color_name : '' };
        })
      };
      
      setProductParts([...productParts, newPart]);
      setShowAddModal(false);
      setError(null);
    } catch (err) {
      console.error('Error creating product part:', err);
      setError(err.response?.data?.error || 'Failed to create product part');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePart = async (e) => {
    e.preventDefault();
    if (!formData.product_part_name) {
      setError('Die Name is required');
      return;
    }

    try {
      setLoading(true);
      await api.productParts.update(selectedPart.id, {
        product_part_name: formData.product_part_name,
        product_part_vendor: formData.product_part_vendor,
        product_part_type: formData.product_part_type,
        image_data: formData.image_data || undefined,
        color_ids: formData.color_ids
      });
      
      // Update the part in the list
      const updatedParts = productParts.map(part => {
        if (part.id === selectedPart.id) {
          return {
            ...part,
            product_part_name: formData.product_part_name,
            product_part_vendor: formData.product_part_vendor,
            product_part_type: formData.product_part_type,
            has_image: part.has_image || !!formData.image_data,
            colors: formData.color_ids.map(colorId => {
              const color = colors.find(c => c.id === colorId);
              return { id: colorId, name: color ? color.coating_color_name : '' };
            })
          };
        }
        return part;
      });
      
      setProductParts(updatedParts);
      setShowEditModal(false);
      setError(null);
    } catch (err) {
      console.error('Error updating product part:', err);
      setError(err.response?.data?.error || 'Failed to update product part');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePart = async (partId) => {
    if (!window.confirm('Are you sure you want to delete this part? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await api.productParts.delete(partId);
      
      // Remove the part from the list
      setProductParts(productParts.filter(part => part.id !== partId));
      setError(null);
    } catch (err) {
      console.error('Error deleting product part:', err);
      setError(err.response?.data?.error || 'Failed to delete product part');
    } finally {
      setLoading(false);
    }
  };

  const viewPartDetails = (partId) => {
    navigate(`/product-parts/${partId}`);
  };

  if (loading && productParts.length === 0) {
    return (
      <Container className="py-4 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h1>Product Parts</h1>
          <p className="text-muted">Manage aluminum extrusion dies and their coating colors</p>
        </Col>
        <Col xs="auto" className="d-flex gap-2">
          {/* <Button 
            variant="outline-secondary" 
            onClick={() => api.productParts.exportExcel()}
            title="Export to Excel"
          >
            <i className="bi bi-file-earmark-excel me-1"></i> Export
          </Button> */}
          <Row className="mb-4">

            {isAdmin && (
              <Button variant="primary" onClick={handleAddModalOpen}>
                <i className="bi bi-plus-lg me-1"></i> Add New Part
              </Button>
            )}
          </Row>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}

      <Card>
        <Card.Body>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Die # (PF)</th>
                <th>Die Name</th>
                <th>Die # (Vendor)</th>
                <th>Type</th>
                <th>Available Colors</th>
                <th>Has Image</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {productParts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center">No product parts found.</td>
                </tr>
              ) : (
                productParts.map(part => (
                  <tr key={part.id}>
                    <td>{part.product_part_id}</td>
                    <td>{part.product_part_name}</td>
                    <td>{part.product_part_vendor || '-'}</td>
                    <td>{part.product_part_type || '-'}</td>
                    <td>
                      {part.colors && part.colors.length > 0 
                        ? part.colors.map(color => color.name).join(', ')
                        : 'None'}
                    </td>
                    <td>{part.has_image ? 'Yes' : 'No'}</td>
                    <td>
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        className="me-2"
                        onClick={() => viewPartDetails(part.id)}
                      >
                        View
                      </Button>
                      {isAdmin && (
                        <>
                          <Button 
                            variant="outline-secondary" 
                            size="sm" 
                            className="me-2"
                            onClick={() => handleEditModalOpen(part)}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => handleDeletePart(part.id)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Add Part Modal */}
      <Modal show={showAddModal} onHide={handleModalClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add New Product Part</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAddPart}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Die # (PF) *</Form.Label>
                  <Form.Control
                    type="text"
                    name="product_part_id"
                    value={formData.product_part_id}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Die Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="product_part_name"
                    value={formData.product_part_name}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Die # (Vendor)</Form.Label>
                  <Form.Control
                    type="text"
                    name="product_part_vendor"
                    value={formData.product_part_vendor}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Type (e.g. Mullion)</Form.Label>
                  <Form.Control
                    type="text"
                    name="product_part_type"
                    value={formData.product_part_type}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Profile Image</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
              <Form.Text className="text-muted">
                Upload an image of the part profile (optional)
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Available Coating Colors</Form.Label>
              <div className="d-flex flex-wrap">
                {colors.map(color => (
                  <Form.Check
                    key={color.id}
                    type="checkbox"
                    id={`color-${color.id}`}
                    label={color.coating_color_name}
                    value={color.id}
                    checked={formData.color_ids.includes(color.id)}
                    onChange={handleColorChange}
                    className="me-3 mb-2"
                  />
                ))}
              </div>
            </Form.Group>
            <div className="text-end">
              <Button variant="secondary" onClick={handleModalClose} className="me-2">
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? <Spinner size="sm" animation="border" /> : 'Save'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Edit Part Modal */}
      <Modal show={showEditModal} onHide={handleModalClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Product Part</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPart && (
            <Form onSubmit={handleUpdatePart}>
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>Die # (PF)</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.product_part_id}
                      disabled
                    />
                    <Form.Text className="text-muted">
                      Die number cannot be changed after creation
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Die Name *</Form.Label>
                    <Form.Control
                      type="text"
                      name="product_part_name"
                      value={formData.product_part_name}
                      onChange={handleInputChange}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Die # (Vendor)</Form.Label>
                    <Form.Control
                      type="text"
                      name="product_part_vendor"
                      value={formData.product_part_vendor}
                      onChange={handleInputChange}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>Type (e.g. Mullion)</Form.Label>
                    <Form.Control
                      type="text"
                      name="product_part_type"
                      value={formData.product_part_type}
                      onChange={handleInputChange}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3">
                <Form.Label>Update Profile Image</Form.Label>
                <Form.Control
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                <Form.Text className="text-muted">
                  {selectedPart.has_image 
                    ? 'Upload a new image to replace the existing one (optional)'
                    : 'Upload an image of the part profile (optional)'}
                </Form.Text>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Available Coating Colors</Form.Label>
                <div className="d-flex flex-wrap">
                  {colors.map(color => (
                    <Form.Check
                      key={color.id}
                      type="checkbox"
                      id={`edit-color-${color.id}`}
                      label={color.coating_color_name}
                      value={color.id}
                      checked={formData.color_ids.includes(color.id)}
                      onChange={handleColorChange}
                      className="me-3 mb-2"
                    />
                  ))}
                </div>
              </Form.Group>
              <div className="text-end">
                <Button variant="secondary" onClick={handleModalClose} className="me-2">
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? <Spinner size="sm" animation="border" /> : 'Update'}
                </Button>
              </div>
            </Form>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default ProductParts;