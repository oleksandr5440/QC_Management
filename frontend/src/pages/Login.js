import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Button, Card, Alert, Container, Row, Col } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      setLoading(true);
      
      const { username, password } = formData;
      await login(username, password);
      
      navigate('/home');
    } catch (err) {
      console.error('Login error:', err);
      
      // Handle error messages from Flask backend
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to log in. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-4 px-3 px-md-4">
      <Row className="justify-content-center">
        <Col xs={12} sm={10} md={8} lg={6}>
          <div className="text-center mb-4 d-block d-md-none">
            <i className="bi bi-clipboard-check text-primary" style={{ fontSize: '3rem' }}></i>
            <h1 className="fs-2 mt-2">QC Management System</h1>
          </div>
          <Card className="auth-container shadow-sm rounded-3 border-0">
            <Card.Body className="p-3 p-sm-4">
              <h2 className="text-center mb-4">Welcome Back</h2>
              
              {error && <Alert variant="danger" className="py-2 px-3">{error}</Alert>}
              
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="username">
                  <Form.Label className="fw-medium">Username</Form.Label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <i className="bi bi-person text-muted"></i>
                    </span>
                    <Form.Control
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      required
                      autoComplete="username"
                      className="border-start-0 ps-0"
                      placeholder="Enter your username"
                      style={{ fontSize: '16px' }} // Prevents iOS zoom on input focus
                    />
                  </div>
                </Form.Group>

                <Form.Group className="mb-4" controlId="password">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <Form.Label className="fw-medium mb-0">Password</Form.Label>
                    <Link to="/forgot-password" className="text-decoration-none small">Forgot password?</Link>
                  </div>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <i className="bi bi-lock text-muted"></i>
                    </span>
                    <Form.Control
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      autoComplete="new-password"
                      className="border-start-0 ps-0"
                      placeholder="Enter your password"
                      style={{ fontSize: '16px' }} // Prevents iOS zoom on input focus
                    />
                  </div>
                </Form.Group>

                <Button 
                  variant="primary" 
                  type="submit" 
                  className="w-100 py-2 mt-2" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      <span>Logging in...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-box-arrow-in-right me-2"></i>
                      Login
                    </>
                  )}
                </Button>
              </Form>
              
              <div className="text-center mt-4">
                <p className="mb-0">Don't have an account? <Link to="/register" className="text-decoration-none fw-medium">Register</Link></p>
              </div>
            </Card.Body>
          </Card>
          
          {/* Mobile-friendly tips */}
          <div className="mt-4 text-center d-block d-md-none">
            <p className="text-muted small">
              <i className="bi bi-info-circle me-1"></i>
              For best experience in the field, add this app to your home screen
            </p>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;