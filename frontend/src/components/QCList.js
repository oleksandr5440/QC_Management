import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import api from '../services/api';

const QCList = () => {
  // State for filters
  const [productId, setProductId] = useState('');
  const [inspector, setInspector] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [appliedFilters, setAppliedFilters] = useState({});
  const itemsPerPage = 10;
  
  // Apply filters
  const handleApplyFilters = () => {
    const filters = {
      product_id: productId || undefined,
      inspector: inspector || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined
    };
    
    setAppliedFilters(filters);
    setCurrentPage(1);
  };
  
  // Reset filters
  const handleResetFilters = () => {
    setProductId('');
    setInspector('');
    setStartDate('');
    setEndDate('');
    setAppliedFilters({});
    setCurrentPage(1);
  };
  
  // Fetch QC Sessions with filters
  const { data: qcSessions, isLoading, isError, refetch } = useQuery(
    ['qcSessions', appliedFilters, currentPage],
    () => api.qc.getSessions({
      ...appliedFilters,
      skip: (currentPage - 1) * itemsPerPage,
      limit: itemsPerPage
    }).then(res => res.data),
    {
      keepPreviousData: true
    }
  );
  
  // Fetch products for filter dropdown
  const { data: products } = useQuery('products', () => 
    api.products.getAll({ limit: 100 }).then(res => res.data)
  );
  
  // Pagination
  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };
  
  const handleNextPage = () => {
    if (qcSessions?.length === itemsPerPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  return (
    <div className="qc-list">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Quality Control Sessions</h1>
      </div>
      
      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3">Filters</h5>
          <div className="row g-3">
            <div className="col-md-3">
              <label htmlFor="productId" className="form-label">Product</label>
              <select 
                id="productId" 
                className="form-select"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              >
                <option value="">All Products</option>
                {products?.map(product => (
                  <option key={product.product_id} value={product.product_id}>
                    {product.product_number}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="col-md-3">
              <label htmlFor="inspector" className="form-label">Inspector</label>
              <input 
                type="text" 
                id="inspector" 
                className="form-control" 
                placeholder="Inspector name..." 
                value={inspector}
                onChange={(e) => setInspector(e.target.value)}
              />
            </div>
            
            <div className="col-md-2">
              <label htmlFor="startDate" className="form-label">Start Date</label>
              <input 
                type="date" 
                id="startDate" 
                className="form-control" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div className="col-md-2">
              <label htmlFor="endDate" className="form-label">End Date</label>
              <input 
                type="date" 
                id="endDate" 
                className="form-control" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            
            <div className="col-md-2 d-flex align-items-end">
              <div className="d-grid gap-2 w-100">
                <button 
                  className="btn btn-primary" 
                  onClick={handleApplyFilters}
                >
                  Apply Filters
                </button>
                <button 
                  className="btn btn-outline-secondary" 
                  onClick={handleResetFilters}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* QC Sessions Table */}
      <div className="card">
        <div className="card-body">
          {isLoading ? (
            <div className="text-center my-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading QC sessions...</p>
            </div>
          ) : isError ? (
            <div className="alert alert-danger" role="alert">
              Error loading QC sessions. Please try again.
            </div>
          ) : qcSessions?.length > 0 ? (
            <>
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>QC ID</th>
                      <th>Product</th>
                      <th>Inspector</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qcSessions.map(session => (
                      <tr key={session.qc_id}>
                        <td>{session.qc_id}</td>
                        <td>
                          <Link to={`/products/${session.product_id}`}>
                            Product #{session.product_id}
                          </Link>
                        </td>
                        <td>{session.inspector || 'Not specified'}</td>
                        <td>{new Date(session.performed_at).toLocaleString()}</td>
                        <td>
                          <Link 
                            to={`/qc/${session.qc_id}`}
                            className="btn btn-sm btn-outline-primary"
                          >
                            <i className="bi bi-eye"></i> View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              <div className="d-flex justify-content-between align-items-center mt-3">
                <div>
                  <p className="text-muted mb-0">
                    Page {currentPage} 
                    {qcSessions.length < itemsPerPage && ' (end of results)'}
                  </p>
                </div>
                <div>
                  <button 
                    className="btn btn-sm btn-outline-primary me-2" 
                    onClick={handlePrevPage} 
                    disabled={currentPage === 1}
                  >
                    <i className="bi bi-chevron-left"></i> Previous
                  </button>
                  <button 
                    className="btn btn-sm btn-outline-primary" 
                    onClick={handleNextPage} 
                    disabled={qcSessions.length < itemsPerPage}
                  >
                    Next <i className="bi bi-chevron-right"></i>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-5">
              <div className="mb-3">
                <i className="bi bi-clipboard-x fs-1 text-muted"></i>
              </div>
              <h5>No QC Sessions Found</h5>
              <p className="text-muted">
                No QC sessions match your current filters. Try adjusting your filters or go to Products to create a new QC session.
              </p>
              <Link to="/products" className="btn btn-primary mt-2">
                <i className="bi bi-box-seam me-2"></i>
                View Products
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QCList;
