import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-dark text-light py-4 mt-auto">
      <Container>
        <Row>
          <Col md={6} className="mb-3 mb-md-0">
            <h5>QC Management System</h5>
            <p className="mb-0 text-secondary">
              A comprehensive system for tracking quality control processes, inventory, and product shipping.
            </p>
          </Col>
          <Col md={3} className="mb-3 mb-md-0">
            <h6>Quick Links</h6>
            <ul className="list-unstyled">
              <li><a href="/home" className="text-secondary">Home</a></li>
              <li><a href="/products" className="text-secondary">Products</a></li>
              <li><a href="/qc-sessions" className="text-secondary">QC Sessions</a></li>
              <li><a href="/inventory" className="text-secondary">Inventory</a></li>
            </ul>
          </Col>
          <Col md={3}>
            <h6>Support</h6>
            <ul className="list-unstyled">
              <li><a href="/help" className="text-secondary">Help Center</a></li>
              <li><a href="/contact" className="text-secondary">Contact</a></li>
            </ul>
          </Col>
        </Row>
        <Row className="mt-3">
          <Col className="text-center text-secondary border-top pt-3">
            <small>&copy; {currentYear} QC Management System. All rights reserved.</small>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;