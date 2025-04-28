import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <Container className="py-5 text-center">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <div className="mb-4">
            <span style={{ fontSize: '8rem', lineHeight: '1' }} className="text-secondary">
              404
            </span>
          </div>
          <h1 className="mb-4">Page Not Found</h1>
          <p className="mb-5 text-secondary fs-5">
            The page you are looking for doesn't exist or has been moved.
          </p>
          <div>
            <Button as={Link} to="/" variant="primary" size="lg">
              Go to Homepage
            </Button>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default NotFound;