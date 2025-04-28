import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './SimpleNav.css';

const SimpleNav = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, logout } = useAuth();

  // Close menu when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scrolling when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [menuOpen]);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMenuOpen(false);
  };

  return (
    <div className="simple-nav">
      <div className="navbar">
        <div className="logo">QC Management System</div>
        <div className="nav-actions">
          {isAuthenticated && (
            <span className="user-info d-none d-md-inline-block me-3">
              <i className="bi bi-person-circle me-1"></i>
              {currentUser?.username || 'User'}
            </span>
          )}
          <button className="menu-toggle" onClick={toggleMenu}>
            <i className="bi bi-list"></i> Menu
          </button>
        </div>
      </div>
      
      {/* Backdrop/overlay */}
      {menuOpen && <div className="overlay" onClick={toggleMenu}></div>}
      
      {/* Menu */}
      {menuOpen && (
        <div className="menu">
          <div className="menu-header">
            <h4>Navigation</h4>
            <button className="close-btn" onClick={toggleMenu}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
          {isAuthenticated && (
            <div className="user-profile-section">
              <div className="user-avatar">
                <i className="bi bi-person-circle"></i>
              </div>
              <div className="user-details">
                <div className="user-name">{currentUser?.username || 'User'}</div>
                <div className="user-role">{currentUser?.is_admin ? 'Administrator' : 'QC Staff'}</div>
              </div>
            </div>
          )}
          <ul className="menu-items">
            <li>
              <Link to="/home" onClick={toggleMenu}>
                <i className="bi bi-house"></i> Home
              </Link>
            </li>
            {/* <li>
              <Link to="/products" onClick={toggleMenu}>
                <i className="bi bi-box-seam"></i> Products
              </Link>
            </li> */}
            {/* <li>
              <Link to="/qc-sessions" onClick={toggleMenu}>
                <i className="bi bi-clipboard-check"></i> QC Sessions
              </Link>
            </li> */}
            {/* <li>
              <Link to="/inventory" onClick={toggleMenu}>
                <i className="bi bi-boxes"></i> Inventory
              </Link>
            </li> */}
            <li>
              <Link to="/product-parts" onClick={toggleMenu}>
                <i className="bi bi-tools"></i> Product Parts
              </Link>
            </li>
            <li>
              <Link to="/coating-colors" onClick={toggleMenu}>
                <i className="bi bi-palette"></i> Coating Colors
              </Link>
            </li>
            <li>
              <Link to="/qc-reports" onClick={toggleMenu}>
                <i className="bi bi-clipboard-data"></i> QC Reports
              </Link>
            </li>
            <li>
              <Link to="/qc-cw-panel-data" onClick={toggleMenu}>
                <i className="bi bi-grid-3x3"></i> CW Panel Data
              </Link>
            </li>
            {/* <li>
              <Link to="/reports" onClick={toggleMenu}>
                <i className="bi bi-file-earmark-bar-graph"></i> Reports
              </Link>
            </li> */}
            {isAuthenticated ? (
              <li>
                <button className="logout-button" onClick={handleLogout}>
                  <i className="bi bi-box-arrow-right"></i> Logout
                </button>
              </li>
            ) : (
              <li>
                <Link to="/login" onClick={toggleMenu}>
                  <i className="bi bi-person-circle"></i> Login
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SimpleNav;