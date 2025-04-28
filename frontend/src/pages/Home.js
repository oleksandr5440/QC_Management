import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../services/api';
import SimpleNav from '../components/SimpleNav';
import { useAuth } from '../context/AuthContext';

import 'bootstrap-icons/font/bootstrap-icons.css';

const Home = () => {
  const [homeData, setHomeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const response = await fetch('/api/home');
        if (!response.ok) {
          throw new Error('Failed to fetch home data');
        }
        const data = await response.json();
        setHomeData(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching home data:', err);
        setError('Error loading home page data. Please try again later.');
        setLoading(false);
        
        // If API fails, use fallback data
        setHomeData({
          title: "QC Management System",
          description: "A comprehensive Quality Control management system for warehouse inventory and logistics operations.",
          features: [
            {
              name: "QC Reports",
              description: "Create and manage quality control reports with batch entries and image upload capabilities.",
              icon: "clipboard-check"
            },
            {
              name: "Product Parts",
              description: "Manage product parts with detailed information including coating colors.",
              icon: "box"
            },
            {
              name: "Coating Colors",
              description: "Track and manage coating colors used in manufacturing.",
              icon: "palette"
            },
            {
              name: "Panel Data",
              description: "Track and manage CW Panel data with complex measurements.",
              icon: "table"
            }
            // },
            // {
            //   name: "Data Export",
            //   description: "Export data to Excel for reporting and analysis.",
            //   icon: "file-excel"
            // }
          ],
          version: "1.0.0"
        });
      }
    };

    fetchHomeData();
  }, []);

  const renderFeatureCard = (feature, index) => (
    <Col md={6} lg={4} className="mb-4" key={index}>
      <Card className="h-100 shadow-sm">
        <Card.Body className="d-flex flex-column">
          <div className="text-center mb-3">
            <i className={`bi bi-${feature.icon} fs-1 text-primary`}></i>
          </div>
          <Card.Title className="text-center">{feature.name}</Card.Title>
          <Card.Text className="flex-grow-1">{feature.description}</Card.Text>
          {isAuthenticated && (
            <div className="mt-3 text-center">
              <Button 
                as={Link} 
                to={getFeatureLink(feature.name)} 
                variant="outline-primary"
              >
                View {feature.name}
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>
    </Col>
  );

  const getFeatureLink = (featureName) => {
    switch (featureName) {
      case 'QC Reports':
        return '/qc-reports';
      case 'Product Parts':
        return '/product-parts';
      case 'Coating Colors':
        return '/coating-colors';
      case 'Panel Data':
        return '/qc-cw-panel-data';
      default:
        return '/';
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <SimpleNav />
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="p-0">
      <SimpleNav />
      
      <div className="bg-primary text-white py-5 mb-5">
        <Container>
          <Row className="justify-content-center">
            <Col md={10} lg={8} className="text-center">
              <h1 className="display-4 fw-bold">{homeData?.title}</h1>
              <p className="lead">{homeData?.description}</p>
              {!isAuthenticated && (
                <div className="mt-4">
                  <Button as={Link} to="/login" variant="light" className="me-2">Login</Button>
                </div>
              )}
            </Col>
          </Row>
        </Container>
      </div>

      <Container className="py-5">
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <h2 className="text-center mb-5">Key Features</h2>
        <Row>
          {homeData?.features?.map(renderFeatureCard)}
        </Row>

        <div className="mt-5 pt-4 border-top text-center">
          <p className="text-muted">
            QC Management System v{homeData?.version} | Last updated: {homeData?.last_updated || new Date().toISOString().split('T')[0]}
          </p>
        </div>
      </Container>
    </Container>
  );
};

export default Home;