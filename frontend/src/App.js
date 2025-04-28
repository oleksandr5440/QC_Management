import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { useAuth } from './context/AuthContext';

// Layout Components
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import SimpleNav from './components/SimpleNav';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ProductParts from './pages/ProductParts';
import ProductPartDetail from './pages/ProductPartDetail';
import CoatingColors from './pages/CoatingColors';
import QCReports from './pages/QCReports';
import QCReportDetail from './pages/QCReportDetail';
import QCCWPanelData from './pages/QCCWPanelData';
import QCCWPanelDetail from './pages/QCCWPanelDetail';
import QCCWPanelForm from './pages/QCCWPanelForm';
import NotFound from './pages/NotFound';

// Protected Route Component
import ProtectedRoute from './components/ProtectedRoute';

// Styles
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles/responsive.css';

function App() {
  const { isAuthenticated, loading } = useAuth();
  // Track if user is on mobile - moved before any conditional returns
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Monitor window size
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Add body class for mobile-specific styling
  useEffect(() => {
    if (isMobile) {
      document.body.classList.add('mobile-view');
    } else {
      document.body.classList.remove('mobile-view');
    }
    
    // Add viewport meta tag for better mobile experience
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.name = 'viewport';
      document.head.appendChild(viewportMeta);
    }
    viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    
    return () => {
      document.body.classList.remove('mobile-view');
    };
  }, [isMobile]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={
            <div className="d-flex flex-column min-vh-100">
              <Header />
              <Container className="flex-grow-1 py-4">
                {!isAuthenticated ? <Login /> : <Navigate to="/home" />}
              </Container>
              <Footer />
            </div>
          } 
        />
        <Route 
          path="/register" 
          element={
            <div className="d-flex flex-column min-vh-100">
              <Header />
              <Container className="flex-grow-1 py-4">
                {!isAuthenticated ? <Register /> : <Navigate to="/home" />}
              </Container>
              <Footer />
            </div>
          } 
        />
        
        {/* Main authenticated routes */}
        <Route path="/" element={<ProtectedRoute />}>
          <Route path="/home" element={<Home />} />
          <Route path="*" element={
            <div className="d-flex flex-column min-vh-100">
              <SimpleNav />
              
              <Container className="flex-grow-1 py-2 py-md-4">
                <Routes>
                  <Route path="/" element={<Navigate to="/home" />} />
                  
                  
                  
                  
                  {/* Product Parts routes */}
                  <Route path="/product-parts" element={<ProductParts />} />
                  <Route path="/product-parts/:partId" element={<ProductPartDetail />} />
                  
                  {/* Coating Colors routes */}
                  <Route path="/coating-colors" element={<CoatingColors />} />
                  
                  {/* QC Reports routes */}
                  <Route path="/qc-reports" element={<QCReports />} />
                  <Route path="/qc-reports/:reportId" element={<QCReportDetail />} />
                  
                  {/* QC CW Panel Data routes */}
                  <Route path="/qc-cw-panel-data" element={<QCCWPanelData />} />
                  <Route path="/qc-cw-panel-data/:flId" element={<QCCWPanelData />} />
                  <Route path="/qc-cw-panel-data/detail/:panelId" element={<QCCWPanelDetail />} />
                  <Route path="/qc-cw-panel-data/create" element={<QCCWPanelForm />} />
                  <Route path="/qc-cw-panel-data/edit/:panelId" element={<QCCWPanelForm />} />
                </Routes>
              </Container>
            </div>
          } />
        </Route>
        
        {/* 404 Route */}
        <Route 
          path="*" 
          element={
            <div className="d-flex flex-column min-vh-100">
              <Header />
              <Container className="flex-grow-1 py-4">
                <NotFound />
              </Container>
              <Footer />
            </div>
          } 
        />
      </Routes>
    </div>
  );
}

export default App;