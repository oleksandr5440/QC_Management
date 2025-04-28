import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Table, Badge } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ProductPartDetail = () => {
  const [part, setPart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { partId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    const fetchPartDetails = async () => {
      try {
        setLoading(true);
        const response = await api.productParts.getById(partId);
        setPart(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching product part details:', err);
        setError('Failed to load product part details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (partId) {
      fetchPartDetails();
    }
  }, [partId]);

  const handleBack = () => {
    navigate('/product-parts');
  };

  const handleEdit = () => {
    navigate(`/product-parts/${partId}/edit`);
  };

  if (loading) {
    return (
      <Container className="py-4 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-4">
        <Alert variant="danger">{error}</Alert>
        <Button variant="secondary" onClick={handleBack}>
          Back to Product Parts
        </Button>
      </Container>
    );
  }

  if (!part) {
    return (
      <Container className="py-4">
        <Alert variant="warning">Product part not found.</Alert>
        <Button variant="secondary" onClick={handleBack}>
          Back to Product Parts
        </Button>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h1>{part.product_part_name}</h1>
          <p className="text-muted">Die # (PF): {part.product_part_id}</p>
        </Col>
        <Col xs="auto">
          <Button variant="secondary" onClick={handleBack} className="me-2">
            Back
          </Button>
          {/* {isAdmin && (
            <Button variant="primary" onClick={handleEdit}>
              Edit
            </Button>
          )} */}
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Part Information</h5>
            </Card.Header>
            <Card.Body>
              <Table borderless>
                <tbody>
                  <tr>
                    <th width="40%">Die # (PF)</th>
                    <td>{part.product_part_id}</td>
                  </tr>
                  <tr>
                    <th>Die Name</th>
                    <td>{part.product_part_name}</td>
                  </tr>
                  <tr>
                    <th>Die # (Vendor)</th>
                    <td>{part.product_part_vendor || '-'}</td>
                  </tr>
                  <tr>
                    <th>Type</th>
                    <td>{part.product_part_type || '-'}</td>
                  </tr>
                  <tr>
                    <th>Created</th>
                    <td>{new Date(part.created_at).toLocaleDateString()}</td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <h5 className="mb-0">Available Coating Colors</h5>
            </Card.Header>
            <Card.Body>
              {part.colors && part.colors.length > 0 ? (
                <div className="d-flex flex-wrap gap-2">
                  {part.colors.map(color => (
                    <Badge bg="secondary" key={color.id} className="fs-6 mb-2">
                      {color.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <Alert variant="light">No coating colors assigned to this part.</Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Profile Image</h5>
            </Card.Header>
            <Card.Body className="text-center">
              {part.image_data ? (
                <img 
                  src={`data:image/png;base64,${part.image_data}`} 
                  alt={part.product_part_name} 
                  className="img-fluid" 
                  style={{ maxHeight: '400px' }}
                />
              ) : (
                <Alert variant="light">No image available for this part.</Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ProductPartDetail;