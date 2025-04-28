import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from 'react-query';
import api from '../services/api';

const ProductList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  // State for filters
  const [statusFilter, setStatusFilter] = useState(queryParams.get('status') || '');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Fetch products with filters
  const { data: products, isLoading, isError, refetch } = useQuery(
    ['products', statusFilter, warehouseFilter, searchTerm, currentPage],
    () => api.products.getAll({
      status: statusFilter || undefined,
      warehouse_id: warehouseFilter || undefined,
      search: searchTerm || undefined,
      skip: (currentPage - 1) * itemsPerPage,
      limit: itemsPerPage
    }).then(res => res.data),
    {
      keepPreviousData: true
    }
  );
  
  // Fetch warehouses for filter dropdown
  const { data: warehouses } = useQuery('warehouses', () => 
    api.inventory.getWarehouses().then(res => res.data)
  );
  
  // Handle filter change
  const handleFilterChange = () => {
    setCurrentPage(1);
    
    // Update URL with status filter if present
    if (statusFilter) {
      navigate(`/products?status=${statusFilter}`);
    } else {
      navigate('/products');
    }
    
    refetch();
  };
  
  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    refetch();
  };
  
  // Reset filters
  const resetFilters = () => {
    setStatusFilter('');
    setWarehouseFilter('');
    setSearchTerm('');
    setCurrentPage(1);
    navigate('/products');
  };
  
  // Format status for display with badge
  const formatStatus = (status) => {
    let badgeClass = '';
    
    switch (status) {
      case 'pending':
        badgeClass = 'bg-secondary';
        break;
      case 'qc_passed':
        badgeClass = 'bg-success';
        break;
      case 'shipped':
        badgeClass = 'bg-primary';
        break;
      case 'complete':
        badgeClass = 'bg-purple';
        break;
      default:
        badgeClass = 'bg-secondary';
    }
    
    return (
      <span className={`badge ${badgeClass}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };
  
  // Pagination controls
  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };
  
  const handleNextPage = () => {
    if (products?.length === itemsPerPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  return (
    <div className="product-list">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Products</h1>
        <Link to="/products/new" className="btn btn-primary">
          <i className="bi bi-plus-circle me-2"></i>
          Add New Product
        </Link>
      </div>
      
      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3">Filters</h5>
          <div className="row g-3">
            <div className="col-md-3">
              <label htmlFor="statusFilter" className="form-label">Status</label>
              <select 
                id="statusFilter" 
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="qc_passed">QC Passed</option>
                <option value="shipped">Shipped</option>
                <option value="complete">Complete</option>
              </select>
            </div>
            
            <div className="col-md-3">
              <label htmlFor="warehouseFilter" className="form-label">Warehouse</label>
              <select 
                id="warehouseFilter" 
                className="form-select"
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
              >
                <option value="">All Warehouses</option>
                {warehouses?.map(warehouse => (
                  <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="col-md-4">
              <label htmlFor="searchTerm" className="form-label">Search</label>
              <form onSubmit={handleSearch}>
                <div className="input-group">
                  <input 
                    type="text" 
                    id="searchTerm" 
                    className="form-control" 
                    placeholder="Search product number..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button type="submit" className="btn btn-outline-primary">
                    <i className="bi bi-search"></i>
                  </button>
                </div>
              </form>
            </div>
            
            <div className="col-md-2 d-flex align-items-end">
              <div className="d-grid gap-2 w-100">
                <button 
                  className="btn btn-primary" 
                  onClick={handleFilterChange}
                >
                  Apply Filters
                </button>
                <button 
                  className="btn btn-outline-secondary" 
                  onClick={resetFilters}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Products Table */}
      <div className="card">
        <div className="card-body">
          {isLoading ? (
            <div className="text-center my-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading products...</p>
            </div>
          ) : isError ? (
            <div className="alert alert-danger" role="alert">
              Error loading products. Please try again.
            </div>
          ) : products?.length > 0 ? (
            <>
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Product Number</th>
                      <th>Status</th>
                      <th>Created Date</th>
                      <th>Warehouse</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(product => (
                      <tr key={product.product_id}>
                        <td>{product.product_id}</td>
                        <td>{product.product_number}</td>
                        <td>{formatStatus(product.status)}</td>
                        <td>{new Date(product.created_at).toLocaleDateString()}</td>
                        <td>{product.warehouse_id || 'Not Assigned'}</td>
                        <td>
                          <Link 
                            to={`/products/${product.product_id}`}
                            className="btn btn-sm btn-outline-primary me-2"
                          >
                            <i className="bi bi-eye"></i>
                          </Link>
                          
                          {product.status === 'pending' && (
                            <Link 
                              to={`/qc/new/${product.product_id}`}
                              className="btn btn-sm btn-outline-success"
                              title="Create QC Session"
                            >
                              <i className="bi bi-clipboard-plus"></i>
                            </Link>
                          )}
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
                    {products.length < itemsPerPage && ' (end of results)'}
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
                    disabled={products.length < itemsPerPage}
                  >
                    Next <i className="bi bi-chevron-right"></i>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-5">
              <div className="mb-3">
                <i className="bi bi-inbox fs-1 text-muted"></i>
              </div>
              <h5>No Products Found</h5>
              <p className="text-muted">
                No products match your current filters. Try adjusting your filters or add a new product.
              </p>
              <Link to="/products/new" className="btn btn-primary mt-2">
                <i className="bi bi-plus-circle me-2"></i>
                Add New Product
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductList;
