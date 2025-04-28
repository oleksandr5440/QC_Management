import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const CoatingColors = () => {
  const [colors, setColors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedColor, setSelectedColor] = useState(null);
  const [colorName, setColorName] = useState('');
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  // Fetch coating colors on component mount
  useEffect(() => {
    const fetchColors = async () => {
      try {
        setLoading(true);
        const response = await api.coatingColors.getAll();
        setColors(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching coating colors:', err);
        setError('Failed to load coating colors. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchColors();
  }, []);

  const handleAddModalOpen = () => {
    setColorName('');
    setShowAddModal(true);
  };

  const handleEditModalOpen = (color) => {
    setSelectedColor(color);
    setColorName(color.coating_color_name);
    setShowEditModal(true);
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedColor(null);
  };

  const handleAddColor = async (e) => {
    e.preventDefault();
    if (!colorName.trim()) {
      setError('Color name is required');
      return;
    }

    try {
      setLoading(true);
      const response = await api.coatingColors.create({ coating_color_name: colorName });
      
      // Add the new color to the list
      setColors([...colors, response.data]);
      setShowAddModal(false);
      setError(null);
    } catch (err) {
      console.error('Error creating coating color:', err);
      setError(err.response?.data?.error || 'Failed to create coating color');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateColor = async (e) => {
    e.preventDefault();
    if (!colorName.trim()) {
      setError('Color name is required');
      return;
    }

    try {
      setLoading(true);
      await api.coatingColors.update(selectedColor.id, { coating_color_name: colorName });
      
      // Update the color in the list
      const updatedColors = colors.map(color => {
        if (color.id === selectedColor.id) {
          return { ...color, coating_color_name: colorName };
        }
        return color;
      });
      
      setColors(updatedColors);
      setShowEditModal(false);
      setError(null);
    } catch (err) {
      console.error('Error updating coating color:', err);
      setError(err.response?.data?.error || 'Failed to update coating color');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteColor = async (colorId) => {
    if (!window.confirm('Are you sure you want to delete this coating color? This action cannot be undone and may affect product parts that use this color.')) {
      return;
    }

    try {
      setLoading(true);
      await api.coatingColors.delete(colorId);
      
      // Remove the color from the list
      setColors(colors.filter(color => color.id !== colorId));
      setError(null);
    } catch (err) {
      console.error('Error deleting coating color:', err);
      setError(err.response?.data?.error || 'Failed to delete coating color');
    } finally {
      setLoading(false);
    }
  };

  if (loading && colors.length === 0) {
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
          <h1>Coating Colors</h1>
          <p className="text-muted">Manage available coating colors for aluminum extrusions</p>
        </Col>
        <Col xs="auto" className="d-flex gap-2">
          {/* <Button 
            variant="outline-secondary" 
            onClick={() => api.coatingColors.exportExcel()}
            title="Export to Excel"
          >
            <i className="bi bi-file-earmark-excel me-1"></i> Export
          </Button> */}
          <Row className="mb-4">

          {isAdmin && (
            <Button variant="primary" onClick={handleAddModalOpen}>
              <i className="bi bi-plus-lg me-1"></i> Add New Color
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
                <th width="70%">Color Name</th>
                <th width="30%">Actions</th>
              </tr>
            </thead>
            <tbody>
              {colors.length === 0 ? (
                <tr>
                  <td colSpan="2" className="text-center">No coating colors found.</td>
                </tr>
              ) : (
                colors.map(color => (
                  <tr key={color.id}>
                    <td>{color.coating_color_name}</td>
                    <td>
                      {isAdmin && (
                        <>
                          <Button 
                            variant="outline-secondary" 
                            size="sm" 
                            className="me-2"
                            onClick={() => handleEditModalOpen(color)}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => handleDeleteColor(color.id)}
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

      {/* Add Color Modal */}
      <Modal show={showAddModal} onHide={handleModalClose}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Coating Color</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAddColor}>
            <Form.Group className="mb-3">
              <Form.Label>Color Name *</Form.Label>
              <Form.Control
                type="text"
                value={colorName}
                onChange={(e) => setColorName(e.target.value)}
                placeholder="e.g. Bronze, Black, Silver"
                required
              />
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

      {/* Edit Color Modal */}
      <Modal show={showEditModal} onHide={handleModalClose}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Coating Color</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedColor && (
            <Form onSubmit={handleUpdateColor}>
              <Form.Group className="mb-3">
                <Form.Label>Color Name *</Form.Label>
                <Form.Control
                  type="text"
                  value={colorName}
                  onChange={(e) => setColorName(e.target.value)}
                  required
                />
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

export default CoatingColors;