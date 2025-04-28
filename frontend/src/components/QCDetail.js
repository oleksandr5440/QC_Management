import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';

const QCDetail = ({ isNew = false }) => {
  const { qcId, productId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Form state
  const [qcData, setQcData] = useState({
    product_id: productId || '',
    inspector: ''
  });
  
  // State for attribute values
  const [attributeValues, setAttributeValues] = useState([]);
  
  // State for selected attribute to add
  const [selectedAttribute, setSelectedAttribute] = useState('');
  const [attributeValue, setAttributeValue] = useState({
    value_numeric: '',
    value_text: '',
    lookup_id: '',
    photo_url: ''
  });
  
  // State for errors
  const [error, setError] = useState('');
  
  // State for edit mode
  const [isEditing, setIsEditing] = useState(isNew);
  
  // Fetch QC session if not new
  const { data: qcSession, isLoading: qcLoading, isError: qcError } = useQuery(
    ['qcSession', qcId],
    () => api.qc.getSessionById(qcId).then(res => res.data),
    {
      enabled: !isNew && !!qcId,
      onSuccess: (data) => {
        setQcData({
          product_id: data.product_id,
          inspector: data.inspector || ''
        });
      }
    }
  );
  
  // Fetch product if new session
  const { data: product } = useQuery(
    ['product', productId],
    () => api.products.getById(productId).then(res => res.data),
    {
      enabled: isNew && !!productId
    }
  );
  
  // Fetch products for dropdown
  const { data: products } = useQuery('products', () => 
    api.products.getAll().then(res => res.data)
  );
  
  // Fetch QC attributes
  const { data: qcAttributes } = useQuery('qcAttributes', () => 
    api.qc.getAttributes().then(res => res.data)
  );
  
  // Fetch attribute values for this QC session
  const { data: qcAttributeValues, refetch: refetchAttributeValues } = useQuery(
    ['qcAttributeValues', qcId],
    () => api.qc.getAttributeValues(qcId).then(res => res.data),
    {
      enabled: !isNew && !!qcId,
      onSuccess: (data) => {
        setAttributeValues(data);
      }
    }
  );
  
  // Fetch lookup values
  const { data: lookupTypes } = useQuery('lookupTypes', () => 
    api.lookups.getTypes().then(res => res.data)
  );
  
  const [lookupValues, setLookupValues] = useState({});
  
  // Fetch lookup values for each lookup type
  useEffect(() => {
    if (lookupTypes) {
      lookupTypes.forEach(type => {
        api.lookups.getValues({ lookup_type_id: type.lookup_type_id })
          .then(res => {
            setLookupValues(prev => ({
              ...prev,
              [type.lookup_type_id]: res.data
            }));
          })
          .catch(err => console.error(`Error fetching lookup values for type ${type.name}:`, err));
      });
    }
  }, [lookupTypes]);
  
  // Mutations
  const createQCSession = useMutation(
    (data) => api.qc.createSession(data),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries('qcSessions');
        // Navigate to the created QC session
        navigate(`/qc/${response.data.qc_id}`);
      },
      onError: (err) => {
        setError(`Failed to create QC session: ${err.response?.data?.detail || err.message}`);
      }
    }
  );
  
  const updateQCSession = useMutation(
    ({ id, data }) => api.qc.updateSession(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['qcSession', qcId]);
        queryClient.invalidateQueries('qcSessions');
        setIsEditing(false);
      },
      onError: (err) => {
        setError(`Failed to update QC session: ${err.response?.data?.detail || err.message}`);
      }
    }
  );
  
  const deleteQCSession = useMutation(
    (id) => api.qc.deleteSession(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('qcSessions');
        navigate('/qc');
      },
      onError: (err) => {
        setError(`Failed to delete QC session: ${err.response?.data?.detail || err.message}`);
      }
    }
  );
  
  const createAttributeValue = useMutation(
    ({ qcId, data }) => api.qc.createAttributeValue(qcId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['qcAttributeValues', qcId]);
        
        // Reset form
        setSelectedAttribute('');
        setAttributeValue({
          value_numeric: '',
          value_text: '',
          lookup_id: '',
          photo_url: ''
        });
        
        // Refetch attribute values
        refetchAttributeValues();
      },
      onError: (err) => {
        setError(`Failed to add attribute value: ${err.response?.data?.detail || err.message}`);
      }
    }
  );
  
  const updateAttributeValue = useMutation(
    ({ qcId, attributeId, data }) => api.qc.updateAttributeValue(qcId, attributeId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['qcAttributeValues', qcId]);
        refetchAttributeValues();
      },
      onError: (err) => {
        setError(`Failed to update attribute value: ${err.response?.data?.detail || err.message}`);
      }
    }
  );
  
  const deleteAttributeValue = useMutation(
    ({ qcId, attributeId }) => api.qc.deleteAttributeValue(qcId, attributeId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['qcAttributeValues', qcId]);
        refetchAttributeValues();
      },
      onError: (err) => {
        setError(`Failed to delete attribute value: ${err.response?.data?.detail || err.message}`);
      }
    }
  );
  
  // Update product when status is changed to qc_passed
  const updateProductStatus = useMutation(
    ({ id, data }) => api.products.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['product', qcData.product_id]);
        queryClient.invalidateQueries('products');
      },
      onError: (err) => {
        setError(`Failed to update product status: ${err.response?.data?.detail || err.message}`);
      }
    }
  );
  
  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setQcData({
      ...qcData,
      [name]: value
    });
  };
  
  // Handle attribute value input change
  const handleAttributeValueChange = (e) => {
    const { name, value } = e.target;
    setAttributeValue({
      ...attributeValue,
      [name]: value
    });
  };
  
  // Handle attribute selection
  const handleAttributeSelection = (e) => {
    setSelectedAttribute(e.target.value);
    
    // Reset attribute value fields
    setAttributeValue({
      value_numeric: '',
      value_text: '',
      lookup_id: '',
      photo_url: ''
    });
  };
  
  // Submit QC session form
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (isNew) {
      createQCSession.mutate(qcData);
    } else {
      updateQCSession.mutate({ id: qcId, data: qcData });
    }
  };
  
  // Submit attribute value form
  const handleAddAttributeValue = (e) => {
    e.preventDefault();
    setError('');
    
    if (!selectedAttribute) {
      setError('Please select an attribute to add');
      return;
    }
    
    const selectedAttributeObj = qcAttributes?.find(attr => attr.attribute_id.toString() === selectedAttribute);
    
    if (!selectedAttributeObj) {
      setError('Invalid attribute selected');
      return;
    }
    
    // Validate based on data type
    switch (selectedAttributeObj.data_type) {
      case 'numeric':
        if (!attributeValue.value_numeric) {
          setError('Please enter a numeric value');
          return;
        }
        break;
      case 'text':
        if (!attributeValue.value_text) {
          setError('Please enter a text value');
          return;
        }
        break;
      case 'lookup':
        if (!attributeValue.lookup_id) {
          setError('Please select a lookup value');
          return;
        }
        break;
      case 'photo':
        if (!attributeValue.photo_url) {
          setError('Please enter a photo URL');
          return;
        }
        break;
      default:
        break;
    }
    
    // Create the attribute value
    createAttributeValue.mutate({
      qcId,
      data: {
        attribute_id: parseInt(selectedAttribute),
        ...attributeValue
      }
    });
  };
  
  // Handle delete attribute value
  const handleDeleteAttributeValue = (attributeId) => {
    if (window.confirm('Are you sure you want to delete this attribute value? This action cannot be undone.')) {
      deleteAttributeValue.mutate({ qcId, attributeId });
    }
  };
  
  // Handle delete QC session
  const handleDeleteQCSession = () => {
    if (window.confirm('Are you sure you want to delete this QC session? This action cannot be undone.')) {
      deleteQCSession.mutate(qcId);
    }
  };
  
  // Handle mark QC as passed
  const handleMarkAsPassed = () => {
    if (window.confirm('Are you sure you want to mark this product as QC passed? This will update the product status.')) {
      updateProductStatus.mutate({
        id: qcData.product_id,
        data: { status: 'qc_passed' }
      });
    }
  };
  
  // Find attribute by ID
  const findAttributeById = (attributeId) => {
    return qcAttributes?.find(attr => attr.attribute_id === attributeId);
  };
  
  // Find lookup value by ID
  const findLookupById = (lookupId) => {
    if (!lookupId) return null;
    
    // Search through all lookup values
    for (const typeId in lookupValues) {
      const found = lookupValues[typeId]?.find(lookup => lookup.lookup_id === lookupId);
      if (found) return found;
    }
    return null;
  };
  
  // Loading state
  if (!isNew && qcLoading) {
    return (
      <div className="text-center my-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading QC session details...</p>
      </div>
    );
  }
  
  // Error state
  if (!isNew && qcError) {
    return (
      <div className="alert alert-danger" role="alert">
        Error loading QC session details. The session may not exist or has been deleted.
        <div className="mt-3">
          <Link to="/qc" className="btn btn-primary">Back to QC Sessions</Link>
        </div>
      </div>
    );
  }
  
  // Find product object
  const currentProduct = products?.find(p => p.product_id.toString() === qcData.product_id.toString());

  return (
    <div className="qc-detail">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>{isNew ? 'Create New QC Session' : `QC Session #${qcId}`}</h1>
        
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
              onClick={handleDeleteQCSession}
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
          {/* QC Session Details Card */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">QC Session Details</h5>
            </div>
            <div className="card-body">
              {isEditing || isNew ? (
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="product_id" className="form-label">Product</label>
                    <select 
                      className="form-select" 
                      id="product_id" 
                      name="product_id"
                      value={qcData.product_id}
                      onChange={handleInputChange}
                      required
                      disabled={isNew && !!productId} // Disable if productId is provided in URL
                    >
                      <option value="">Select Product</option>
                      {products?.map(product => (
                        <option key={product.product_id} value={product.product_id}>
                          {product.product_number}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="inspector" className="form-label">Inspector</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      id="inspector" 
                      name="inspector"
                      value={qcData.inspector}
                      onChange={handleInputChange}
                      placeholder="Enter inspector name"
                    />
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
                      disabled={createQCSession.isLoading || updateQCSession.isLoading}
                    >
                      {(createQCSession.isLoading || updateQCSession.isLoading) ? (
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
                    <h6>QC Session ID</h6>
                    <p>{qcSession?.qc_id}</p>
                  </div>
                  
                  <div className="mb-3">
                    <h6>Product</h6>
                    <p>
                      <Link to={`/products/${qcSession?.product_id}`}>
                        {currentProduct?.product_number || `Product #${qcSession?.product_id}`}
                      </Link>
                    </p>
                  </div>
                  
                  <div className="mb-3">
                    <h6>Inspector</h6>
                    <p>{qcSession?.inspector || 'Not specified'}</p>
                  </div>
                  
                  <div className="mb-3">
                    <h6>Date Performed</h6>
                    <p>{new Date(qcSession?.performed_at).toLocaleString()}</p>
                  </div>
                  
                  {/* Only show "Mark as Passed" button if product status is pending */}
                  {currentProduct?.status === 'pending' && (
                    <div className="mt-4">
                      <button
                        className="btn btn-success"
                        onClick={handleMarkAsPassed}
                        disabled={updateProductStatus.isLoading}
                      >
                        {updateProductStatus.isLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Processing...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check-circle me-2"></i>
                            Mark QC as Passed
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* QC Attributes Section - Only visible for existing QC sessions */}
        {!isNew && (
          <div className="col-lg-6">
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">QC Attributes</h5>
              </div>
              <div className="card-body">
                {/* Add New Attribute Form */}
                <form onSubmit={handleAddAttributeValue} className="mb-4">
                  <h6 className="mb-3">Add New Attribute Value</h6>
                  
                  <div className="mb-3">
                    <label htmlFor="attributeId" className="form-label">Attribute</label>
                    <select 
                      className="form-select" 
                      id="attributeId"
                      value={selectedAttribute}
                      onChange={handleAttributeSelection}
                      required
                    >
                      <option value="">Select Attribute</option>
                      {qcAttributes?.map(attr => {
                        // Check if this attribute already has a value
                        const hasValue = attributeValues?.some(val => val.attribute_id === attr.attribute_id);
                        if (hasValue) return null; // Skip attributes that already have values
                        
                        return (
                          <option key={attr.attribute_id} value={attr.attribute_id}>
                            {attr.name}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  
                  {/* Show appropriate input based on selected attribute type */}
                  {selectedAttribute && (
                    <div className="mb-3">
                      {(() => {
                        const attr = qcAttributes?.find(a => a.attribute_id.toString() === selectedAttribute);
                        
                        if (!attr) return null;
                        
                        switch (attr.data_type) {
                          case 'numeric':
                            return (
                              <>
                                <label htmlFor="value_numeric" className="form-label">
                                  Numeric Value
                                </label>
                                <input 
                                  type="number" 
                                  step="0.001"
                                  className="form-control" 
                                  id="value_numeric" 
                                  name="value_numeric"
                                  value={attributeValue.value_numeric}
                                  onChange={handleAttributeValueChange}
                                  required
                                />
                              </>
                            );
                          case 'text':
                            return (
                              <>
                                <label htmlFor="value_text" className="form-label">
                                  Text Value
                                </label>
                                <textarea 
                                  className="form-control" 
                                  id="value_text" 
                                  name="value_text"
                                  value={attributeValue.value_text}
                                  onChange={handleAttributeValueChange}
                                  required
                                />
                              </>
                            );
                          case 'lookup':
                            // Find the appropriate lookup type for this attribute
                            // This is a simplification - would need to determine the correct lookup type
                            // based on attribute name or configuration
                            const lookupTypesArray = lookupTypes || [];
                            return (
                              <>
                                <label htmlFor="lookup_id" className="form-label">
                                  Select Value
                                </label>
                                <select 
                                  className="form-select" 
                                  id="lookup_id" 
                                  name="lookup_id"
                                  value={attributeValue.lookup_id}
                                  onChange={handleAttributeValueChange}
                                  required
                                >
                                  <option value="">Select Value</option>
                                  {lookupTypesArray.map(type => (
                                    <optgroup key={type.lookup_type_id} label={type.name}>
                                      {lookupValues[type.lookup_type_id]?.map(lookup => (
                                        <option key={lookup.lookup_id} value={lookup.lookup_id}>
                                          {lookup.label}
                                        </option>
                                      ))}
                                    </optgroup>
                                  ))}
                                </select>
                              </>
                            );
                          case 'photo':
                            return (
                              <>
                                <label htmlFor="photo_url" className="form-label">
                                  Photo URL
                                </label>
                                <input 
                                  type="text" 
                                  className="form-control" 
                                  id="photo_url" 
                                  name="photo_url"
                                  value={attributeValue.photo_url}
                                  onChange={handleAttributeValueChange}
                                  placeholder="Enter URL to photo"
                                  required
                                />
                              </>
                            );
                          default:
                            return null;
                        }
                      })()}
                    </div>
                  )}
                  
                  <div className="d-grid">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={!selectedAttribute || createAttributeValue.isLoading}
                    >
                      {createAttributeValue.isLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Adding...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-plus-circle me-2"></i>
                          Add Attribute Value
                        </>
                      )}
                    </button>
                  </div>
                </form>
                
                {/* List of Existing Attribute Values */}
                <h6 className="mb-3">Current Attribute Values</h6>
                
                {attributeValues?.length > 0 ? (
                  <div className="list-group">
                    {attributeValues.map(value => {
                      const attribute = findAttributeById(value.attribute_id);
                      
                      if (!attribute) return null;
                      
                      return (
                        <div key={value.attribute_id} className="list-group-item list-group-item-action">
                          <div className="d-flex justify-content-between align-items-center">
                            <h6 className="mb-1">{attribute.name}</h6>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDeleteAttributeValue(value.attribute_id)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                          <div className="mb-1">
                            {(() => {
                              switch (attribute.data_type) {
                                case 'numeric':
                                  return <p className="mb-0">Value: {value.value_numeric}</p>;
                                case 'text':
                                  return <p className="mb-0">{value.value_text}</p>;
                                case 'lookup':
                                  const lookup = findLookupById(value.lookup_id);
                                  return <p className="mb-0">Selected: {lookup?.label || 'Unknown'}</p>;
                                case 'photo':
                                  return (
                                    <div>
                                      <a href={value.photo_url} target="_blank" rel="noopener noreferrer">
                                        <div className="thumbnail-container mt-2">
                                          <img src={value.photo_url} alt="QC attribute" />
                                        </div>
                                      </a>
                                    </div>
                                  );
                                default:
                                  return <p className="mb-0">Unknown data type</p>;
                              }
                            })()}
                          </div>
                          <small className="text-muted">
                            Type: {attribute.data_type}
                          </small>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <i className="bi bi-card-list text-muted" style={{ fontSize: '2rem' }}></i>
                    <p className="mt-2 mb-0">No attribute values added yet</p>
                    <p className="text-muted">
                      Use the form above to add attribute values for this QC session.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4">
        <Link to="/qc" className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left me-2"></i>
          Back to QC Sessions
        </Link>
      </div>
    </div>
  );
};

export default QCDetail;
