import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="container text-center py-5">
      <h1 className="display-1">404</h1>
      <div className="mb-4">
        <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '5rem' }}></i>
      </div>
      <h2 className="mb-4">Page Not Found</h2>
      <p className="lead mb-5">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to="/" className="btn btn-primary px-4">
        Back to Dashboard
      </Link>
    </div>
  );
};

export default NotFound;
