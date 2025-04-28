import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Button, Card, Alert, Container, Row, Col } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'inspector',
    department: 'qc'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const validateForm = () => {
    // Check if passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    // Check password length
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    
    // Check email format (basic validation)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      
      const { username, email, password, role, department } = formData;
      await register({ username, email, password, role, department });
      
      navigate('/login');
    } catch (err) {
      console.error('Registration error:', err);
      setError('Failed to create an account. The username or email may already be in use.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-4 px-3 px-md-4">
      <Row className="justify-content-center">
        <Col xs={12} sm={10} md={8} lg={6}>
          <div className="text-center mb-4 d-block d-md-none">
            <i className="bi bi-person-plus-fill text-primary" style={{ fontSize: '2.5rem' }}></i>
            <h1 className="fs-2 mt-2">Create Account</h1>
          </div>
          
          <Card className="auth-container shadow-sm rounded-3 border-0">
            <Card.Body className="p-3 p-sm-4">
              <h2 className="text-center mb-4 d-none d-md-block">Create Account</h2>
              
              {error && (
                <Alert variant="danger" className="py-2 px-3 mb-4">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error}
                </Alert>
              )}
              
              <Form onSubmit={handleSubmit} className="register-form">
                <Row>
                  <Col xs={12} md={6}>
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
                          placeholder="Choose a username"
                          style={{ fontSize: '16px' }}
                        />
                      </div>
                    </Form.Group>
                  </Col>
                  
                  <Col xs={12} md={6}>
                    <Form.Group className="mb-3" controlId="email">
                      <Form.Label className="fw-medium">Email</Form.Label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">
                          <i className="bi bi-envelope text-muted"></i>
                        </span>
                        <Form.Control
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          autoComplete="email"
                          className="border-start-0 ps-0"
                          placeholder="Your email address"
                          style={{ fontSize: '16px' }}
                        />
                      </div>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col xs={12} md={6}>
                    <Form.Group className="mb-3" controlId="password">
                      <Form.Label className="fw-medium">Password</Form.Label>
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
                          placeholder="Choose a password"
                          style={{ fontSize: '16px' }}
                        />
                      </div>
                      <Form.Text className="text-muted small">
                        <i className="bi bi-info-circle-fill me-1"></i>
                        Password must be at least 8 characters long.
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  
                  <Col xs={12} md={6}>
                    <Form.Group className="mb-3" controlId="confirmPassword">
                      <Form.Label className="fw-medium">Confirm Password</Form.Label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">
                          <i className="bi bi-lock-fill text-muted"></i>
                        </span>
                        <Form.Control
                          type="password"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          required
                          autoComplete="new-password"
                          className="border-start-0 ps-0"
                          placeholder="Confirm your password"
                          style={{ fontSize: '16px' }}
                        />
                      </div>
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="mt-1">
                  <Col xs={12} md={6}>
                    <Form.Group className="mb-3" controlId="role">
                      <Form.Label className="fw-medium">Role</Form.Label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">
                          <i className="bi bi-briefcase text-muted"></i>
                        </span>
                        <Form.Select
                          name="role"
                          value={formData.role}
                          onChange={handleChange}
                          className="border-start-0 ps-0"
                          style={{ fontSize: '16px' }}
                        >
                          <option value="inspector">Inspector</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Administrator</option>
                        </Form.Select>
                      </div>
                    </Form.Group>
                  </Col>
                  
                  <Col xs={12} md={6}>
                    <Form.Group className="mb-3" controlId="department">
                      <Form.Label className="fw-medium">Department</Form.Label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">
                          <i className="bi bi-building text-muted"></i>
                        </span>
                        <Form.Select
                          name="department"
                          value={formData.department}
                          onChange={handleChange}
                          className="border-start-0 ps-0"
                          style={{ fontSize: '16px' }}
                        >
                          <option value="qc">Quality Control</option>
                          <option value="warehouse">Warehouse</option>
                          <option value="production">Production</option>
                          <option value="engineering">Engineering</option>
                        </Form.Select>
                      </div>
                    </Form.Group>
                  </Col>
                </Row>

                <Button 
                  variant="primary" 
                  type="submit" 
                  className="w-100 py-2 mt-3" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-person-plus me-2"></i>
                      Create Account
                    </>
                  )}
                </Button>
              </Form>
              
              <div className="text-center mt-4">
                <p className="mb-0">Already have an account? <Link to="/login" className="text-decoration-none fw-medium">Login</Link></p>
              </div>
            </Card.Body>
          </Card>
          
          {/* Mobile-friendly tips */}
          <div className="mt-3 text-center d-block d-md-none">
            <p className="text-muted small">
              <i className="bi bi-shield-check me-1"></i>
              Your information is securely encrypted
            </p>
          </div>
        </Col>
      </Row>
      
      {/* Mobile-specific styles */}
      <style>
        {`
          @media (max-width: 767.98px) {
            .register-form .form-label {
              margin-bottom: 0.25rem;
            }
            
            .register-form .form-group {
              margin-bottom: 1rem;
            }
            
            /* Ensure proper spacing on small screens */
            .register-form .row + .row {
              margin-top: 0 !important;
            }
          }
        `}
      </style>
    </Container>
  );
};

export default Register;