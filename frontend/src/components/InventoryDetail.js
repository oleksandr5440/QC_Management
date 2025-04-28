import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';

const InventoryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  // Determine which type of detail to show based on URL path or query param
  const [detailType, setDetailType] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isNewItem, setIsNewItem] = useState(false);
  const [error, setError] = useState('');
  
  // Form state for different entity types
  const [warehouseData, setWarehouseData] = useState({
    name: '',
    location: ''
  });
  
  const [partTypeData, setPartTypeData] = useState({
    name: ''
  });
  
  const [partSubtypeData, setPartSubtypeData] = useState({
    part_type_id: '',
    name: ''
  });
  
  const [inventorySnapshotData, setInventorySnapshotData] = useState({
    part_subtype_id: '',
    warehouse_id: '',
    quantity: 0,
    snapshot_date: new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
  });
  
  const [partShipmentData, setPartShipmentData] = useState({
    part_subtype_id: '',
    warehouse_id: '',
    quantity: 0,
    vendor: ''
  });
  
  const [containerData, setContainerData] = useState({
    description: '',
    capacity: ''
  });
  
  // Parse the entity type from URL path
  useEffect(() => {
    const path = location.pathname;
    const queryParams = new URLSearchParams(location.search);
    
    if (path.includes('/inventory/')) {
      if (queryParams.get('type')) {
        setDetailType(queryParams.get('type'));
      } else if (id === 'new') {
        setIsNewItem(true);
        setDetailType(queryParams.get('type') || 'warehouse');
      } else {
        // Try to determine type from ID (this is a simplification)
        setDetailType('warehouse'); // Default, would need to determine somehow in a real app
      }
    }
  }, [location, id]);
  
  // Fetch data based on entity type and ID
  const fetchWarehouse = useQuery(
    ['warehouse', id],
    () => api.inventory.getWarehouseById(id).then(res => res.data),
    {
      enabled: !isNewItem && detailType === 'warehouse' && !!id,
      onSuccess: (data) => {
        setWarehouseData(data);
      },
      onError: (err) => {
        setError(`Error loading warehouse: ${err.message}`);
      }
    }
  );
  
  const fetchPartType = useQuery(
    ['partType', id],
    () => api.inventory.getPartTypeById(id).then(res => res.data),
    {
      enabled: !isNewItem && detailType === 'partType' && !!id,
      onSuccess: (data) => {
        setPartTypeData(data);
      },
      onError: (err) => {
        setError(`Error loading part type: ${err.message}`);
      }
    }
  );
  
  const fetchPartSubtype = useQuery(
    ['partSubtype', id],
    () => api.inventory.getPartSubtypeById(id).then(res => res.data),
    {
      enabled: !isNewItem && detailType === 'partSubtype' && !!id,
      onSuccess: (data) => {
        setPartSubtypeData(data);
      },
      onError: (err) => {
        setError(`Error loading part subtype: ${err.message}`);
      }
    }
  );
  
  const fetchInventorySnapshot = useQuery(
    ['inventorySnapshot', id],
    () => api.inventory.getInventorySnapshotById(id).then(res => res.data),
    {
      enabled: !isNewItem && detailType === 'inventory' && !!id,
      onSuccess: (data) => {
        setInventorySnapshotData({
          ...data,
          snapshot_date: new Date(data.snapshot_date).toISOString().split('T')[0]
        });
      },
      onError: (err) => {
        setError(`Error loading inventory snapshot: ${err.message}`);
      }
    }
  );
  
  const fetchPartShipment = useQuery(
    ['partShipment', id],
    () => api.inventory.getPartShipmentById(id).then(res => res.data),
    {
      enabled: !isNewItem && detailType === 'shipment' && !!id,
      onSuccess: (data) => {
        setPartShipmentData(data);
      },
      onError: (err) => {
        setError(`Error loading part shipment: ${err.message}`);
      }
    }
  );
  
  const fetchContainer = useQuery(
    ['container', id],
    () => api.inventory.getContainerById(id).then(res => res.data),
    {
      enabled: !isNewItem && detailType === 'container' && !!id,
      onSuccess: (data) => {
        setContainerData(data);
      },
      onError: (err) => {
        setError(`Error loading container: ${err.message}`);
      }
    }
  );
  
  // Fetch related data for dropdowns
  const { data: warehouses } = useQuery(
    'warehouses',
    () => api.inventory.getWarehouses().then(res => res.data),
    {
      enabled: detailType === 'inventory' || detailType === 'shipment'
    }
  );
  
  const { data: partTypes } = useQuery(
    'partTypes',
    () => api.inventory.getPartTypes().then(res => res.data),
    {
      enabled: detailType === 'partSubtype'
    }
  );
  
  const { data: partSubtypes } = useQuery(
    'partSubtypes',
    () => api.inventory.getPartSubtypes().then(res => res.data),
    {
      enabled: detailType === 'inventory' || detailType === 'shipment'
    }
  );
  
  // Mutations
  const createWarehouse = useMutation(
    (data) => api.inventory.createWarehouse(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('warehouses');
        navigate('/inventory');
      },
      onError: (err) => {
        setError(`Failed to create warehouse: ${err.response?.data?.detail || err.message}`);
      }
    }
  );
  
  const updateWarehouse = useMutation(
    ({ id, data }) => api.inventory.updateWarehouse(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['warehouse', id]);
        queryClient.invalidateQueries('warehouses');
        setIsEditing(false);
      },
      onError: (err) => {
        setError(`Failed to update warehouse: ${err.response?.data?.detail || err.message}`);
      }
    }
  );
  
  const createPartType = useMutation(
    (data) => api.inventory.createPartType(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('partTypes');
        navigate('/inventory');
      },
      onError: (err) => {
        setError(`Failed to create part type: ${err.response?.data?.detail || err.message}`);
      }
    }
  );
  
  const updatePartType = useMutation(
    ({ id, data }) => api.inventory.updatePartType(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['partType', id]);
        queryClient.invalidateQueries('partTypes');
        setIsEditing(false);
      },
      onError: (err) => {
        setError(`Failed to update part type: ${err.response?.data?.detail || err.message}`);
      }
    }
  );
  
  const createPartSubtype = useMutation(
    (data) => api.inventory.createPartSubtype(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('partSubtypes');
        navigate('/inventory');
      },
      onError: (err) => {
        setError(`Failed to create part subtype: ${err.response?.data?.detail || err.message}`);
      }
    }
  );
  
  const updatePartSubtype = useMutation(
    ({ id, data }) => api.inventory.updatePartSubtype(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['partSubtype', id]);
        queryClient.invalidateQueries('partSubtypes');
        setIsEditing(false);
      },
      onError: (err) => {
        setError(`Failed to update part subtype: ${err.response?.data?.detail || err.message}`);
      }
    }
  );
  
  const createInventorySnapshot = useMutation(
    (data) => api.inventory.createInventorySnapshot(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('inventorySnapshots');
        navigate('/inventory');
      },
      onError: (err) => {
        setError(`Failed to create inventory snapshot: ${err.response?.data?.detail || err.message}`);
      }
    }
  );
  
  const updateInventorySnapshot = useMutation(
    ({ id, data }) => api.inventory.updateInventorySnapshot(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['inventorySnapshot', id]);
        queryClient.invalidateQueries('inventorySnapshots');
        setIsEditing(false);
      },
      onError: (err) => {
        setError(`Failed to update inventory snapshot: ${err.response?.data?.detail || err.message}`);
      }
    }
  );
  
  const createPartShipment = useMutation(
    (data) => api.inventory.createPartShipment(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('partShipments');
        navigate('/inventory');
      },
      onError: (err) => {
        setError(`Failed to create part shipment: ${err.response?.data?.detail || err.message}`);
      }
    }
  );
  
  const updatePartShipment = useMutation(
    ({ id, data }) => api.inventory.updatePartShipment(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['partShipment', id]);
        queryClient.invalidateQueries('partShipments');
        setIsEditing(false);
      },
      onError: (err) => {
        setError(`Failed to update part shipment: ${err.response?.data?.detail || err.message}`);
      }
    }
  );
  
  const createContainer = useMutation(
    (data) => api.inventory.createContainer(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('containers');
        navigate('/inventory');
      },
      onError: (err) => {
        setError(`Failed to create container: ${err.response?.data?.detail || err.message}`);
      }
    }
  );
  
  const updateContainer = useMutation(
    ({ id, data }) => api.inventory.updateContainer(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['container', id]);
        queryClient.invalidateQueries('containers');
        setIsEditing(false);
      },
      onError: (err) => {
        setError(`Failed to update container: ${err.response?.data?.detail || err.message}`);
      }
    }
  );
  
  // Delete mutations
  const deleteWarehouse = useMutation(
    (id) => api.inventory.deleteWarehouse(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('warehouses');
        navigate('/inventory');
      },
      onError: (err) => {
        setError(`Failed to delete warehouse: ${err.response?.data?.detail || err.message}`);
      }
    }
  );
  
  const deletePartType = useMutation(
    (id) => api.inventory.deletePartType(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('partTypes');
        navigate('/inventory');
      },
      onError: (err) => {
        setError(`Failed to delete part type: ${err.response?.data?.detail || err.message}`);
      }
    }
  );
  
  const deletePartSubtype = useMutation(
    (id) => api.inventory.deletePartSubtype(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('partSubtypes');
        navigate('/inventory');
      },
      onError: (err) => {
        setError(`Failed to delete part subtype: ${err.response?.data?.detail || err.message}`);
      }
    }
  );
  
  const deleteInventorySnapshot = useMutation(
    (id) => api.inventory.deleteInventorySnapshot(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('inventorySnapshots');
        navigate('/inventory');
      },
      onError: (err) => {
        setError(`Failed to delete inventory snapshot: ${err.response?.data?.detail || err.message}`);
      }
    }
  );
  
  const deletePartShipment = useMutation(
    (id) => api.inventory.deletePartShipment(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('partShipments');
        navigate('/inventory');
      },
      onError: (err) => {
        setError(`Failed to delete part shipment: ${err.response?.data?.detail || err.message}`);
      }
    }
  );
  
  const deleteContainer = useMutation(
    (id) => api.inventory.deleteContainer(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('containers');
        navigate('/inventory');
      },
      onError: (err) => {
        setError(`Failed to delete container: ${err.response?.data?.detail || err.message}`);
      }
    }
  );
  
  // Handle input change for different entity types
  const handleWarehouseInputChange = (e) => {
    const { name, value } = e.target;
    setWarehouseData({
      ...warehouseData,
      [name]: value
    });
  };
  
  const handlePartTypeInputChange = (e) => {
    const { name, value } = e.target;
    setPartTypeData({
      ...partTypeData,
      [name]: value
    });
  };
  
  const handlePartSubtypeInputChange = (e) => {
    const { name, value } = e.target;
    setPartSubtypeData({
      ...partSubtypeData,
      [name]: value
    });
  };
  
  const handleInventorySnapshotInputChange = (e) => {
    const { name, value } = e.target;
    setInventorySnapshotData({
      ...inventorySnapshotData,
      [name]: value
    });
  };
  
  const handlePartShipmentInputChange = (e) => {
    const { name, value } = e.target;
    setPartShipmentData({
      ...partShipmentData,
      [name]: value
    });
  };
  
  const handleContainerInputChange = (e) => {
    const { name, value } = e.target;
    setContainerData({
      ...containerData,
      [name]: value
    });
  };
  
  // Form submission handlers
  const handleWarehouseSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (isNewItem) {
      createWarehouse.mutate(warehouseData);
    } else {
      updateWarehouse.mutate({ id, data: warehouseData });
    }
  };
  
  const handlePartTypeSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (isNewItem) {
      createPartType.mutate(partTypeData);
    } else {
      updatePartType.mutate({ id, data: partTypeData });
    }
  };
  
  const handlePartSubtypeSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (isNewItem) {
      createPartSubtype.mutate(partSubtypeData);
    } else {
      updatePartSubtype.mutate({ id, data: partSubtypeData });
    }
  };
  
  const handleInventorySnapshotSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (isNewItem) {
      createInventorySnapshot.mutate(inventorySnapshotData);
    } else {
      updateInventorySnapshot.mutate({ id, data: inventorySnapshotData });
    }
  };
  
  const handlePartShipmentSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (isNewItem) {
      createPartShipment.mutate(partShipmentData);
    } else {
      updatePartShipment.mutate({ id, data: partShipmentData });
    }
  };
  
  const handleContainerSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (isNewItem) {
      createContainer.mutate(containerData);
    } else {
      updateContainer.mutate({ id, data: containerData });
    }
  };
  
  // Delete handlers
  const handleDeleteWarehouse = () => {
    if (window.confirm('Are you sure you want to delete this warehouse? This action cannot be undone.')) {
      deleteWarehouse.mutate(id);
    }
  };
  
  const handleDeletePartType = () => {
    if (window.confirm('Are you sure you want to delete this part type? This action cannot be undone.')) {
      deletePartType.mutate(id);
    }
  };
  
  const handleDeletePartSubtype = () => {
    if (window.confirm('Are you sure you want to delete this part subtype? This action cannot be undone.')) {
      deletePartSubtype.mutate(id);
    }
  };
  
  const handleDeleteInventorySnapshot = () => {
    if (window.confirm('Are you sure you want to delete this inventory snapshot? This action cannot be undone.')) {
      deleteInventorySnapshot.mutate(id);
    }
  };
  
  const handleDeletePartShipment = () => {
    if (window.confirm('Are you sure you want to delete this part shipment? This action cannot be undone.')) {
      deletePartShipment.mutate(id);
    }
  };
  
  const handleDeleteContainer = () => {
    if (window.confirm('Are you sure you want to delete this container? This action cannot be undone.')) {
      deleteContainer.mutate(id);
    }
  };
  
  // Check loading states
  const isLoading = 
    (!isNewItem && detailType === 'warehouse' && fetchWarehouse.isLoading) ||
    (!isNewItem && detailType === 'partType' && fetchPartType.isLoading) ||
    (!isNewItem && detailType === 'partSubtype' && fetchPartSubtype.isLoading) ||
    (!isNewItem && detailType === 'inventory' && fetchInventorySnapshot.isLoading) ||
    (!isNewItem && detailType === 'shipment' && fetchPartShipment.isLoading) ||
    (!isNewItem && detailType === 'container' && fetchContainer.isLoading);
  
  // Get title based on entity type and mode
  const getTitle = () => {
    const action = isNewItem ? 'Create New' : isEditing ? 'Edit' : 'View';
    
    switch (detailType) {
      case 'warehouse':
        return `${action} Warehouse${!isNewItem ? `: ${warehouseData.name}` : ''}`;
      case 'partType':
        return `${action} Part Type${!isNewItem ? `: ${partTypeData.name}` : ''}`;
      case 'partSubtype':
        return `${action} Part Subtype${!isNewItem ? `: ${partSubtypeData.name}` : ''}`;
      case 'inventory':
        return `${action} Inventory Snapshot${!isNewItem ? ` #${id}` : ''}`;
      case 'shipment':
        return `${action} Part Shipment${!isNewItem ? ` #${id}` : ''}`;
      case 'container':
        return `${action} Container${!isNewItem ? ` #${id}` : ''}`;
      default:
        return 'Inventory Detail';
    }
  };
  
  // If we need to show a placeholder because detail type is not determined yet
  if (!detailType && !isNewItem) {
    return (
      <div className="text-center my-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading...</p>
      </div>
    );
  }

  return (
    <div className="inventory-detail">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>{getTitle()}</h1>
        
        {!isNewItem && !isEditing && (
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
              onClick={() => {
                switch (detailType) {
                  case 'warehouse':
                    handleDeleteWarehouse();
                    break;
                  case 'partType':
                    handleDeletePartType();
                    break;
                  case 'partSubtype':
                    handleDeletePartSubtype();
                    break;
                  case 'inventory':
                    handleDeleteInventorySnapshot();
                    break;
                  case 'shipment':
                    handleDeletePartShipment();
                    break;
                  case 'container':
                    handleDeleteContainer();
                    break;
                  default:
                    break;
                }
              }}
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
      
      {isLoading ? (
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading details...</p>
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            {/* Warehouse Form */}
            {detailType === 'warehouse' && (isEditing || isNewItem) ? (
              <form onSubmit={handleWarehouseSubmit}>
                <div className="mb-3">
                  <label htmlFor="name" className="form-label">Warehouse Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    id="name" 
                    name="name"
                    value={warehouseData.name}
                    onChange={handleWarehouseInputChange}
                    required
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="location" className="form-label">Location</label>
                  <textarea 
                    className="form-control" 
                    id="location" 
                    name="location"
                    value={warehouseData.location || ''}
                    onChange={handleWarehouseInputChange}
                    rows="3"
                  />
                </div>
                
                <div className="d-flex justify-content-end mt-4">
                  {!isNewItem && (
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
                    disabled={createWarehouse.isLoading || updateWarehouse.isLoading}
                  >
                    {(createWarehouse.isLoading || updateWarehouse.isLoading) ? (
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
            ) : detailType === 'warehouse' ? (
              <div>
                <div className="mb-3">
                  <h6>Warehouse ID</h6>
                  <p>{warehouseData.warehouse_id}</p>
                </div>
                
                <div className="mb-3">
                  <h6>Name</h6>
                  <p>{warehouseData.name}</p>
                </div>
                
                <div className="mb-3">
                  <h6>Location</h6>
                  <p>{warehouseData.location || 'Not specified'}</p>
                </div>
              </div>
            ) : null}
            
            {/* Part Type Form */}
            {detailType === 'partType' && (isEditing || isNewItem) ? (
              <form onSubmit={handlePartTypeSubmit}>
                <div className="mb-3">
                  <label htmlFor="name" className="form-label">Part Type Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    id="name" 
                    name="name"
                    value={partTypeData.name}
                    onChange={handlePartTypeInputChange}
                    required
                  />
                </div>
                
                <div className="d-flex justify-content-end mt-4">
                  {!isNewItem && (
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
                    disabled={createPartType.isLoading || updatePartType.isLoading}
                  >
                    {(createPartType.isLoading || updatePartType.isLoading) ? (
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
            ) : detailType === 'partType' ? (
              <div>
                <div className="mb-3">
                  <h6>Part Type ID</h6>
                  <p>{partTypeData.part_type_id}</p>
                </div>
                
                <div className="mb-3">
                  <h6>Name</h6>
                  <p>{partTypeData.name}</p>
                </div>
              </div>
            ) : null}
            
            {/* Part Subtype Form */}
            {detailType === 'partSubtype' && (isEditing || isNewItem) ? (
              <form onSubmit={handlePartSubtypeSubmit}>
                <div className="mb-3">
                  <label htmlFor="part_type_id" className="form-label">Part Type</label>
                  <select 
                    className="form-select" 
                    id="part_type_id" 
                    name="part_type_id"
                    value={partSubtypeData.part_type_id}
                    onChange={handlePartSubtypeInputChange}
                    required
                  >
                    <option value="">Select Part Type</option>
                    {partTypes?.map(type => (
                      <option key={type.part_type_id} value={type.part_type_id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-3">
                  <label htmlFor="name" className="form-label">Part Subtype Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    id="name" 
                    name="name"
                    value={partSubtypeData.name}
                    onChange={handlePartSubtypeInputChange}
                    required
                  />
                </div>
                
                <div className="d-flex justify-content-end mt-4">
                  {!isNewItem && (
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
                    disabled={createPartSubtype.isLoading || updatePartSubtype.isLoading}
                  >
                    {(createPartSubtype.isLoading || updatePartSubtype.isLoading) ? (
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
            ) : detailType === 'partSubtype' ? (
              <div>
                <div className="mb-3">
                  <h6>Part Subtype ID</h6>
                  <p>{partSubtypeData.part_subtype_id}</p>
                </div>
                
                <div className="mb-3">
                  <h6>Part Type</h6>
                  <p>{partTypes?.find(t => t.part_type_id === partSubtypeData.part_type_id)?.name || partSubtypeData.part_type_id}</p>
                </div>
                
                <div className="mb-3">
                  <h6>Name</h6>
                  <p>{partSubtypeData.name}</p>
                </div>
              </div>
            ) : null}
            
            {/* Inventory Snapshot Form */}
            {detailType === 'inventory' && (isEditing || isNewItem) ? (
              <form onSubmit={handleInventorySnapshotSubmit}>
                <div className="mb-3">
                  <label htmlFor="part_subtype_id" className="form-label">Part</label>
                  <select 
                    className="form-select" 
                    id="part_subtype_id" 
                    name="part_subtype_id"
                    value={inventorySnapshotData.part_subtype_id}
                    onChange={handleInventorySnapshotInputChange}
                    required
                  >
                    <option value="">Select Part</option>
                    {partSubtypes?.map(subtype => (
                      <option key={subtype.part_subtype_id} value={subtype.part_subtype_id}>
                        {subtype.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-3">
                  <label htmlFor="warehouse_id" className="form-label">Warehouse</label>
                  <select 
                    className="form-select" 
                    id="warehouse_id" 
                    name="warehouse_id"
                    value={inventorySnapshotData.warehouse_id}
                    onChange={handleInventorySnapshotInputChange}
                    required
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses?.map(warehouse => (
                      <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                        {warehouse.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-3">
                  <label htmlFor="quantity" className="form-label">Quantity</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    id="quantity" 
                    name="quantity"
                    value={inventorySnapshotData.quantity}
                    onChange={handleInventorySnapshotInputChange}
                    min="0"
                    required
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="snapshot_date" className="form-label">Date</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    id="snapshot_date" 
                    name="snapshot_date"
                    value={inventorySnapshotData.snapshot_date}
                    onChange={handleInventorySnapshotInputChange}
                    required
                  />
                </div>
                
                <div className="d-flex justify-content-end mt-4">
                  {!isNewItem && (
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
                    disabled={createInventorySnapshot.isLoading || updateInventorySnapshot.isLoading}
                  >
                    {(createInventorySnapshot.isLoading || updateInventorySnapshot.isLoading) ? (
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
            ) : detailType === 'inventory' ? (
              <div>
                <div className="mb-3">
                  <h6>Inventory Snapshot ID</h6>
                  <p>{inventorySnapshotData.snapshot_id}</p>
                </div>
                
                <div className="mb-3">
                  <h6>Part</h6>
                  <p>{partSubtypes?.find(p => p.part_subtype_id === inventorySnapshotData.part_subtype_id)?.name || `Part #${inventorySnapshotData.part_subtype_id}`}</p>
                </div>
                
                <div className="mb-3">
                  <h6>Warehouse</h6>
                  <p>{warehouses?.find(w => w.warehouse_id === inventorySnapshotData.warehouse_id)?.name || `Warehouse #${inventorySnapshotData.warehouse_id}`}</p>
                </div>
                
                <div className="mb-3">
                  <h6>Quantity</h6>
                  <p>{inventorySnapshotData.quantity}</p>
                </div>
                
                <div className="mb-3">
                  <h6>Snapshot Date</h6>
                  <p>{new Date(inventorySnapshotData.snapshot_date).toLocaleDateString()}</p>
                </div>
              </div>
            ) : null}
            
            {/* Part Shipment Form */}
            {detailType === 'shipment' && (isEditing || isNewItem) ? (
              <form onSubmit={handlePartShipmentSubmit}>
                <div className="mb-3">
                  <label htmlFor="part_subtype_id" className="form-label">Part</label>
                  <select 
                    className="form-select" 
                    id="part_subtype_id" 
                    name="part_subtype_id"
                    value={partShipmentData.part_subtype_id}
                    onChange={handlePartShipmentInputChange}
                    required
                  >
                    <option value="">Select Part</option>
                    {partSubtypes?.map(subtype => (
                      <option key={subtype.part_subtype_id} value={subtype.part_subtype_id}>
                        {subtype.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-3">
                  <label htmlFor="warehouse_id" className="form-label">Warehouse</label>
                  <select 
                    className="form-select" 
                    id="warehouse_id" 
                    name="warehouse_id"
                    value={partShipmentData.warehouse_id}
                    onChange={handlePartShipmentInputChange}
                    required
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses?.map(warehouse => (
                      <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                        {warehouse.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-3">
                  <label htmlFor="quantity" className="form-label">Quantity</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    id="quantity" 
                    name="quantity"
                    value={partShipmentData.quantity}
                    onChange={handlePartShipmentInputChange}
                    min="1"
                    required
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="vendor" className="form-label">Vendor</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    id="vendor" 
                    name="vendor"
                    value={partShipmentData.vendor || ''}
                    onChange={handlePartShipmentInputChange}
                  />
                </div>
                
                <div className="d-flex justify-content-end mt-4">
                  {!isNewItem && (
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
                    disabled={createPartShipment.isLoading || updatePartShipment.isLoading}
                  >
                    {(createPartShipment.isLoading || updatePartShipment.isLoading) ? (
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
            ) : detailType === 'shipment' ? (
              <div>
                <div className="mb-3">
                  <h6>Shipment ID</h6>
                  <p>{partShipmentData.shipment_id}</p>
                </div>
                
                <div className="mb-3">
                  <h6>Part</h6>
                  <p>{partSubtypes?.find(p => p.part_subtype_id === partShipmentData.part_subtype_id)?.name || `Part #${partShipmentData.part_subtype_id}`}</p>
                </div>
                
                <div className="mb-3">
                  <h6>Warehouse</h6>
                  <p>{warehouses?.find(w => w.warehouse_id === partShipmentData.warehouse_id)?.name || `Warehouse #${partShipmentData.warehouse_id}`}</p>
                </div>
                
                <div className="mb-3">
                  <h6>Quantity</h6>
                  <p>{partShipmentData.quantity}</p>
                </div>
                
                <div className="mb-3">
                  <h6>Received Date</h6>
                  <p>{new Date(partShipmentData.received_at).toLocaleString()}</p>
                </div>
                
                <div className="mb-3">
                  <h6>Vendor</h6>
                  <p>{partShipmentData.vendor || 'Not specified'}</p>
                </div>
              </div>
            ) : null}
            
            {/* Container Form */}
            {detailType === 'container' && (isEditing || isNewItem) ? (
              <form onSubmit={handleContainerSubmit}>
                <div className="mb-3">
                  <label htmlFor="description" className="form-label">Description</label>
                  <textarea 
                    className="form-control" 
                    id="description" 
                    name="description"
                    value={containerData.description || ''}
                    onChange={handleContainerInputChange}
                    rows="3"
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="capacity" className="form-label">Capacity</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    id="capacity" 
                    name="capacity"
                    value={containerData.capacity || ''}
                    onChange={handleContainerInputChange}
                    min="1"
                  />
                </div>
                
                <div className="d-flex justify-content-end mt-4">
                  {!isNewItem && (
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
                    disabled={createContainer.isLoading || updateContainer.isLoading}
                  >
                    {(createContainer.isLoading || updateContainer.isLoading) ? (
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
            ) : detailType === 'container' ? (
              <div>
                <div className="mb-3">
                  <h6>Container ID</h6>
                  <p>{containerData.container_id}</p>
                </div>
                
                <div className="mb-3">
                  <h6>Description</h6>
                  <p>{containerData.description || 'Not specified'}</p>
                </div>
                
                <div className="mb-3">
                  <h6>Capacity</h6>
                  <p>{containerData.capacity || 'Not specified'}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
      
      <div className="mt-4">
        <Link to="/inventory" className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left me-2"></i>
          Back to Inventory
        </Link>
      </div>
    </div>
  );
};

export default InventoryDetail;
