import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';

const ProductDetail = ({ isNew = false }) => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Form state
  const [productData, setProductData] = useState({
    product_number: '',
    status: 'pending',
    warehouse_id: null
  });
  
  const [isEditing, setIsEditing] = useState(isNew);
  const [error, setError] = useState('');
  
  // Fetch product data if editing existing product
  const { data: product, isLoading: productLoading, isError: productError } = useQuery(
    ['product', productId],
    () => api.products.getById(productId).then(res => res.data),
    {
      enabled: !isNew && !!productId,
      onSuccess: (data) => {
        setProductData(data);
      }
    }
  );
  
  // Fetch QC sessions for this product
  const { data: qcSessions, isLoading: qcLoading } = useQuery(
    ['productQCSessions', productId],
    () => api.products.getQCSessions(productId).then(res => res.data),
    {
      enabled: !isNew && !!productId
    }
  );
  
  // Fetch shipments for this product
  const { data: shipments, isLoading: shipmentsLoading } = useQuery(
    ['productShipments', productId],
    () => api.products.getShipments(productId).then(res => res.data),
    {
      enabled: !isNew && !!productId
    }
  );
  
  // Fetch warehouses for dropdown
  const { data: warehouses } = useQuery('warehouses', () => 
    api.inventory.getWarehouses().then(res => res.data)
  );
  
  // Fetch containers for shipping form
  const { data: containers } = useQuery('containers', () => 
    api.inventory.getContainers().then(res => res.data)
  );
  
  // Mutations
  const createProduct = useMutation(
    (data) => api.products.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('products');
        navigate('/products');
      },
      onError: (err) => {
        setError(`Failed to create product: ${err.response?.data?.detail || err.message}`);
      }
    }
  );
  
  const updateProduct = useMutation(
    ({ id, data }) => api.products.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['product', productId]);
        queryClient.invalidateQueries('products');
        setIsEditing(false);
      },
      onError: (err) => {
        setError(`Failed to update product: ${err.response?.data?.detail || err.message}`);
      }
    }
  );
  
  const deleteProduct = useMutation(
    (id) => api.products.delete(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('products');
        navigate('/products');
      },
      onError: (err) => {
        setError(`Failed to delete product: ${err.response?.data?.detail || err.message}`);
      }
    }
  );
  
  const shipProduct = useMutation(
    ({ id, data }) => api.products.shipProduct(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['product', productId]);
        queryClient.invalidateQueries(['productShipments', productId]);
        queryClient.invalidateQueries('products');
      },
      onError: (err) => {
        setError(`Failed to ship product: ${err.response?.data?.detail || err.message}`);
      }
    }
  );
  
  // State for shipping form
  const [shippingData, setShippingData] = useState({
    container_id: '',
    destination: ''
  });
  
  // Handle input change for product form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Handle warehouse_id as null when empty
    if (name === 'warehouse_id' && value === '') {
      setProductData({
        ...productData,
        warehouse_id: null
      });
    } else {
      setProductData({
        ...productData,
        [name]: value
      });
    }
  };
  
  // Handle input change for shipping form
  const handleShippingInputChange = (e) => {
    const { name, value } = e.target;
    setShippingData({
      ...shippingData,
      [name]: value
    });
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (isNew) {
      createProduct.mutate(productData);
    } else {
      updateProduct.mutate({ id: productId, data: productData });
    }
  };
  
  // Handle delete confirmation
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      deleteProduct.mutate(productId);
    }
  };
  
  // Handle shipping form submission
  const handleShipProduct = (e) => {
    e.preventDefault();
    setError('');
    
    shipProduct.mutate({ 
      id: productId, 
      data: {
        ...shippingData,
        container_id: shippingData.container_id || null
      }
    });
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
  
  // Loading state
  if (!isNew && productLoading) {
    return (
      <div className="text-center my-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading product details...</p>
      </div>
    );
  }
  
  // Error state
  if (!isNew && productError) {
    return (
      <div className="alert alert-danger" role="alert">
        Error loading product details. The product may not exist or has been deleted.
        <div className="mt-3">
          <Link to="/products" className="btn btn-primary">Back to Products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="product-detail">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>{isNew ? 'Create New Product' : `Product: ${productData.product_number}`}</h1>
        
        {!isNew && !isEditing && (
          <div>
            <button
              className="btn btn-outline-primary me-2"
              onClick={() => setIsEditing(true)}
            >
              <i className="bi bi-pencil me-2"></i>
              Edit
            </button>
            <button
              className="btn btn-outline-danger"
              onClick={handleDelete}
            >
              <i className="bi bi-trash me-2"></i>
              Delete
            </button>
          </div>
        )}
      </div>
      
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      
      <div className="row">
        <div className="col-lg-6">
          {/* Product Details Card */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Product Details</h5>
            </div>
            <div className="card-body">
              {isEditing ? (
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="product_number" className="form-label">Product Number</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      id="product_number" 
                      name="product_number"
                      value={productData.product_number}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="status" className="form-label">Status</label>
                    <select 
                      className="form-select" 
                      id="status" 
                      name="status"
                      value={productData.status}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="pending">Pending</option>
                      <option value="qc_passed">QC Passed</option>
                      <option value="shipped">Shipped</option>
                      <option value="complete">Complete</option>
                    </select>
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="warehouse_id" className="form-label">Warehouse</label>
                    <select 
                      className="form-select" 
                      id="warehouse_id" 
                      name="warehouse_id"
                      value={productData.warehouse_id || ''}
                      onChange={handleInputChange}
                    >
                      <option value="">None</option>
                      {warehouses?.map(warehouse => (
                        <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                          {warehouse.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="d-flex justify-content-end mt-4">
                    {!isNew && (
                      <button
                        type="button"
                        className="btn btn-outline-secondary me-2"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={createProduct.isLoading || updateProduct.isLoading}
                    >
                      {(createProduct.isLoading || updateProduct.isLoading) ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Saving...
                        </>
                      ) : (
                        <>Save</>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="mb-3">
                    <h6>Product ID</h6>
                    <p>{productData.product_id}</p>
                  </div>
                  
                  <div className="mb-3">
                    <h6>Product Number</h6>
                    <p>{productData.product_number}</p>
                  </div>
                  
                  <div className="mb-3">
                    <h6>Status</h6>
                    <p>{formatStatus(productData.status)}</p>
                  </div>
                  
                  <div className="mb-3">
                    <h6>Creation Date</h6>
                    <p>{new Date(productData.created_at).toLocaleString()}</p>
                  </div>
                  
                  <div className="mb-3">
                    <h6>Warehouse</h6>
                    <p>
                      {productData.warehouse_id ? (
                        warehouses?.find(w => w.warehouse_id === productData.warehouse_id)?.name || `Warehouse #${productData.warehouse_id}`
                      ) : (
                        'Not assigned'
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Shipping Section - Only visible if product status is 'qc_passed' */}
          {!isNew && productData.status === 'qc_passed' && (
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">Ship Product</h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleShipProduct}>
                  <div className="mb-3">
                    <label htmlFor="container_id" className="form-label">Container</label>
                    <select 
                      className="form-select" 
                      id="container_id" 
                      name="container_id"
                      value={shippingData.container_id}
                      onChange={handleShippingInputChange}
                    >
                      <option value="">Select Container</option>
                      {containers?.map(container => (
                        <option key={container.container_id} value={container.container_id}>
                          Container #{container.container_id} {container.description ? ` - ${container.description}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="destination" className="form-label">Destination</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      id="destination" 
                      name="destination"
                      value={shippingData.destination}
                      onChange={handleShippingInputChange}
                      placeholder="Enter destination"
                    />
                  </div>
                  
                  <div className="d-grid">
                    <button
                      type="submit"
                      className="btn btn-success"
                      disabled={shipProduct.isLoading}
                    >
                      {shipProduct.isLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Processing...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-truck me-2"></i>
                          Ship Product
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
        
        <div className="col-lg-6">
          {/* QC Sessions Card */}
          {!isNew && (
            <div className="card mb-4">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">QC Sessions</h5>
                {productData.status === 'pending' && (
                  <Link to={`/qc/new/${productId}`} className="btn btn-sm btn-primary">
                    <i className="bi bi-plus-circle me-2"></i>
                    New QC Session
                  </Link>
                )}
              </div>
              <div className="card-body">
                {qcLoading ? (
                  <div className="text-center my-3">
                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading QC sessions...</p>
                  </div>
                ) : qcSessions?.length > 0 ? (
                  <div className="list-group">
                    {qcSessions.map(session => (
                      <Link 
                        key={session.qc_id} 
                        to={`/qc/${session.qc_id}`} 
                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                      >
                        <div>
                          <div className="fw-bold">QC Session #{session.qc_id}</div>
                          <small>
                            <i className="bi bi-person me-1"></i>
                            Inspector: {session.inspector || 'Not specified'}
                          </small>
                          <div>
                            <small className="text-muted">
                              {new Date(session.performed_at).toLocaleString()}
                            </small>
                          </div>
                        </div>
                        <i className="bi bi-chevron-right"></i>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <i className="bi bi-clipboard-x text-muted" style={{ fontSize: '2rem' }}></i>
                    <p className="mt-2 mb-0">No QC sessions found</p>
                    {productData.status === 'pending' && (
                      <Link to={`/qc/new/${productId}`} className="btn btn-sm btn-outline-primary mt-3">
                        <i className="bi bi-plus-circle me-2"></i>
                        Create QC Session
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Shipment History Card */}
          {!isNew && (
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">Shipment History</h5>
              </div>
              <div className="card-body">
                {shipmentsLoading ? (
                  <div className="text-center my-3">
                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading shipment history...</p>
                  </div>
                ) : shipments?.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Shipment ID</th>
                          <th>Container</th>
                          <th>Destination</th>
                          <th>Ship Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shipments.map(shipment => (
                          <tr key={shipment.shipment_id}>
                            <td>{shipment.shipment_id}</td>
                            <td>
                              {shipment.container_id 
                                ? `Container #${shipment.container_id}` 
                                : 'N/A'}
                            </td>
                            <td>{shipment.destination || 'N/A'}</td>
                            <td>{new Date(shipment.shipped_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <i className="bi bi-truck text-muted" style={{ fontSize: '2rem' }}></i>
                    <p className="mt-2 mb-0">No shipment history available</p>
                    {productData.status === 'qc_passed' && (
                      <p className="text-muted mt-2">
                        This product has passed QC and is ready to be shipped.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-4">
        <Link to="/products" className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left me-2"></i>
          Back to Products
        </Link>
      </div>
    </div>
  );
};

export default ProductDetail;
