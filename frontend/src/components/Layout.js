import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarVisible, setSidebarVisible] = useState(window.innerWidth >= 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Close sidebar automatically on mobile when navigating
  useEffect(() => {
    if (isMobile) {
      setSidebarVisible(false);
    }
  }, [location.pathname, isMobile]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // Auto-show sidebar on desktop, auto-hide on mobile
      if (!mobile && !sidebarVisible) {
        setSidebarVisible(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarVisible]);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* Header/Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark sticky-top">
        <div className="container-fluid">
          <button 
            className="navbar-toggler me-2 d-md-none" 
            type="button" 
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <i className="bi bi-list"></i>
          </button>
          
          <a className="navbar-brand text-truncate" href="/">QC Management System</a>
          
          <button 
            className="navbar-toggler" 
            type="button" 
            data-bs-toggle="collapse" 
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <i className="bi bi-three-dots-vertical"></i>
          </button>
          
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              {currentUser && (
                <li className="nav-item dropdown">
                  <a 
                    className="nav-link dropdown-toggle" 
                    href="#" 
                    id="navbarDropdown" 
                    role="button" 
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    <i className="bi bi-person-circle me-1"></i>
                    <span className="d-none d-sm-inline">{currentUser.username}</span>
                  </a>
                  <ul className="dropdown-menu dropdown-menu-end shadow" aria-labelledby="navbarDropdown">
                    <li>
                      <a className="dropdown-item d-flex align-items-center" href="/profile">
                        <i className="bi bi-person me-2"></i>
                        Profile
                      </a>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <a className="dropdown-item d-flex align-items-center" href="#" onClick={handleLogout}>
                        <i className="bi bi-box-arrow-right me-2"></i>
                        Logout
                      </a>
                    </li>
                  </ul>
                </li>
              )}
            </ul>
          </div>
        </div>
      </nav>

      <div className="container-fluid flex-grow-1 d-flex p-0">
        {/* Mobile Sidebar Overlay */}
        {isMobile && sidebarVisible && (
          <div 
            className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50" 
            style={{ zIndex: 1040 }}
            onClick={toggleSidebar}
          ></div>
        )}
        
        {/* Sidebar */}
        <div 
          className={`sidebar d-flex flex-column p-3 text-white ${sidebarVisible ? 'd-flex' : 'd-none'}`} 
          style={{ 
            width: '250px', 
            zIndex: 1045,
            position: isMobile ? 'fixed' : 'relative',
            height: isMobile ? '100vh' : 'auto',
            top: isMobile ? '0' : 'auto',
            left: isMobile ? '0' : 'auto',
            transition: 'all 0.3s ease-in-out'
          }}
        >
          {isMobile && (
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="m-0">Menu</h5>
              <button 
                type="button" 
                className="btn-close btn-close-white" 
                aria-label="Close menu"
                onClick={toggleSidebar}
              ></button>
            </div>
          )}
          
          <ul className="nav nav-pills flex-column mb-auto">
            <li className="nav-item">
              <NavLink 
                to="/" 
                className={({ isActive }) => `sidebar-link d-flex align-items-center px-2 py-2 rounded ${isActive ? 'active' : ''}`} 
                end
                onClick={() => isMobile && setSidebarVisible(false)}
              >
                <i className="bi bi-speedometer2 me-2"></i>
                Dashboard
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink 
                to="/products" 
                className={({ isActive }) => `sidebar-link d-flex align-items-center px-2 py-2 rounded ${isActive ? 'active' : ''}`}
                onClick={() => isMobile && setSidebarVisible(false)}
              >
                <i className="bi bi-box-seam me-2"></i>
                Products
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink 
                to="/qc-sessions" 
                className={({ isActive }) => `sidebar-link d-flex align-items-center px-2 py-2 rounded ${isActive ? 'active' : ''}`}
                onClick={() => isMobile && setSidebarVisible(false)}
              >
                <i className="bi bi-clipboard-check me-2"></i>
                Quality Control
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink 
                to="/inventory" 
                className={({ isActive }) => `sidebar-link d-flex align-items-center px-2 py-2 rounded ${isActive ? 'active' : ''}`}
                onClick={() => isMobile && setSidebarVisible(false)}
              >
                <i className="bi bi-boxes me-2"></i>
                Inventory
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink 
                to="/reports" 
                className={({ isActive }) => `sidebar-link d-flex align-items-center px-2 py-2 rounded ${isActive ? 'active' : ''}`}
                onClick={() => isMobile && setSidebarVisible(false)}
              >
                <i className="bi bi-file-earmark-bar-graph me-2"></i>
                Reports
              </NavLink>
            </li>
          </ul>
          
          {isMobile && (
            <div className="mt-auto pt-3 border-top">
              <div className="d-flex align-items-center">
                <i className="bi bi-person-circle fs-4 me-2"></i>
                <div>
                  <div className="fw-bold">{currentUser?.username}</div>
                  <small className="text-muted">{currentUser?.role}</small>
                </div>
              </div>
              <button
                className="btn btn-outline-light mt-3 w-100"
                onClick={handleLogout}
              >
                <i className="bi bi-box-arrow-right me-2"></i>
                Logout
              </button>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div 
          className="main-content flex-grow-1 bg-light"
          style={{
            padding: isMobile ? '1rem' : '1.5rem',
            transition: 'all 0.3s ease-in-out',
            overflowX: 'hidden'
          }}
        >
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;
