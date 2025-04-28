import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Navbar, Container } from 'react-bootstrap';
import './Navigation.css';

const Navigation = () => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu when navigating to a new page
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Helper function to check if a link is active
  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/' ? 'active' : '';
    }
    return location.pathname.startsWith(path) ? 'active' : '';
  };

  // Toggle menu open/closed
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <div className="navigation-wrapper">
      <Navbar bg="dark" variant="dark" sticky="top" className="mb-3">
        <Container fluid>
          <Navbar.Brand as={Link} to="/">QC Management System</Navbar.Brand>
          <button
            className="navbar-toggler"
            type="button"
            onClick={toggleMenu}
            aria-controls="navbarContent"
            aria-expanded={menuOpen}
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
        </Container>
      </Navbar>
      
      {/* Navigation menu with manual show/hide */}
      <div className={`collapse navbar-collapse bg-dark ${menuOpen ? 'show' : ''}`} id="navbarContent">
        <div className="p-3">
          <ul className="nav flex-column">
            <li className="nav-item">
              <Link to="/" className={`nav-link text-white ${isActive('/')}`}>
                <i className="bi bi-speedometer2 me-2"></i> Dashboard
              </Link>
            </li>
            {/* <li className="nav-item">
              <Link to="/products" className={`nav-link text-white ${isActive('/products')}`}>
                <i className="bi bi-box-seam me-2"></i> Products
              </Link>
            </li> */}
            {/* <li className="nav-item">
              <Link to="/qc-sessions" className={`nav-link text-white ${isActive('/qc-sessions')}`}>
                <i className="bi bi-clipboard-check me-2"></i> QC Sessions
              </Link>
            </li> */}
            {/* <li className="nav-item">
              <Link to="/inventory" className={`nav-link text-white ${isActive('/inventory')}`}>
                <i className="bi bi-boxes me-2"></i> Inventory
              </Link>
            </li> */}
            {/* <li className="nav-item">
              <Link to="/reports" className={`nav-link text-white ${isActive('/reports')}`}>
                <i className="bi bi-file-earmark-bar-graph me-2"></i> Reports
              </Link>
            </li> */}
            <li className="nav-item">
              <Link to="/login" className={`nav-link text-white ${isActive('/login')}`}>
                <i className="bi bi-box-arrow-in-right me-2"></i> Login/Profile
              </Link>
            </li>
          </ul>
        </div>
      </div>
      
      {/* Dark overlay when menu is open on mobile */}
      {menuOpen && (
        <div 
          className="position-fixed top-0 left-0 w-100 h-100 bg-dark" 
          style={{ opacity: 0.5, zIndex: 1030 }}
          onClick={toggleMenu}
        />
      )}
    </div>
  );
};

export default Navigation;