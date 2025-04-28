import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import api from '../services/api';

const InventoryList = () => {
  const navigate = useNavigate();
  
  // State for navigation and filters
  const [activeTab, setActiveTab] = useState('warehouses');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [partTypeFilter, setPartTypeFilter] = useState('');
  const [partSubtypeFilter, setPartSubtypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Fetch warehouses
  const { 
    data: warehouses, 
    isLoading: warehousesLoading,
    isError: warehousesError 
  } = useQuery(
    ['warehouses'],
    () => api.inventory.getWarehouses().then(res => res.data)
  );
  
  // Fetch part types
  const { 
    data: partTypes, 
    isLoading: partTypesLoading,
    isError: partTypesError 
  } = useQuery(
    ['partTypes'],
    () => api.inventory.getPartTypes().then(res => res.data)
  );
  
  // Fetch part subtypes with filtering
  const { 
    data: partSubtypes, 
    isLoading: partSubtypesLoading,
    isError: partSubtypesError 
  } = useQuery(
    ['partSubtypes', partTypeFilter],
    () => api.inventory.getPartSubtypes({
      part_type_id: partTypeFilter || undefined
    }).then(res => res.data),
    {
      enabled: activeTab === 'partSubtypes'
    }
  );
  
  // Fetch inventory snapshots with filtering
  const { 
    data: inventorySnapshots, 
    isLoading: inventorySnapshotsLoading,
    isError: inventorySnapshotsError 
  } = useQuery(
    ['inventorySnapshots', warehouseFilter, partSubtypeFilter, currentPage],
    () => api.inventory.getInventorySnapshots({
      warehouse_id: warehouseFilter || undefined,
      part_subtype_id: partSubtypeFilter || undefined,
      skip: (currentPage - 1) * itemsPerPage,
      limit: itemsPerPage
    }).then(res => res.data),
    {
      enabled: activeTab === 'inventory'
    }
  );
  
  // Fetch part shipments with filtering
  const { 
    data: partShipments, 
    isLoading: partShipmentsLoading,
    isError: partShipmentsError 
  } = useQuery(
    ['partShipments', warehouseFilter, partSubtypeFilter, currentPage],
    () => api.inventory.getPartShipments({
      warehouse_id: warehouseFilter || undefined,
      part_subtype_id: partSubtypeFilter || undefined,
      skip: (currentPage - 1) * itemsPerPage,
      limit: itemsPerPage
    }).then(res => res.data),
    {
      enabled: activeTab === 'shipments'
    }
  );
  
  // Fetch containers
  const { 
    data: containers, 
    isLoading: containersLoading,
    isError: containersError 
  } = useQuery(
    ['containers', currentPage],
    () => api.inventory.getContainers({
      skip: (currentPage - 1) * itemsPerPage,
      limit: itemsPerPage
    }).then(res => res.data),
    {
      enabled: activeTab === 'containers'
    }
  );
  
  // Apply filters and reset page
  const handleApplyFilters = () => {
    setCurrentPage(1);
  };
  
  // Reset filters
  const handleResetFilters = () => {
    setWarehouseFilter('');
    setPartTypeFilter('');
    setPartSubtypeFilter('');
    setSearchTerm('');
    setCurrentPage(1);
  };
  
  // Pagination handlers
  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };
  
  const handleNextPage = () => {
    setCurrentPage(prev => prev + 1);
  };
  
  // Function to check if there are more pages
  const hasMorePages = () => {
    switch (activeTab) {
      case 'inventory':
        return inventorySnapshots && inventorySnapshots.length === itemsPerPage;
      case 'shipments':
        return partShipments && partShipments.length === itemsPerPage;
      case 'containers':
        return containers && containers.length === itemsPerPage;
      default:
        return false;
    }
  };

  return (
    <div className="inventory-management">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Inventory Management</h1>
        
        <div className="dropdown">
          <button 
            className="btn btn-primary dropdown-toggle" 
            type="button" 
            data-bs-toggle="dropdown" 
            aria-expanded="false"
          >
            <i className="bi bi-plus-circle me-2"></i>
            Add New
          </button>
          <ul className="dropdown-menu dropdown-menu-end">
            <li>
              <a 
                className="dropdown-item" 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  // Navigate to new warehouse form
                  setActiveTab('warehouses');
                  // You would navigate to a form in a real implementation
                  // For now, we'll just show a placeholder alert
                  alert('Add Warehouse form would be shown here');
                }}
              >
                <i className="bi bi-building me-2"></i>
                Warehouse
              </a>
            </li>
            <li>
              <a 
                className="dropdown-item" 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('partTypes');
                  alert('Add Part Type form would be shown here');
                }}
              >
                <i className="bi bi-box me-2"></i>
                Part Type
              </a>
            </li>
            <li>
              <a 
                className="dropdown-item" 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('partSubtypes');
                  alert('Add Part Subtype form would be shown here');
                }}
              >
                <i className="bi bi-boxes me-2"></i>
                Part Subtype
              </a>
            </li>
            <li>
              <a 
                className="dropdown-item" 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('inventory');
                  alert('Add Inventory Snapshot form would be shown here');
                }}
              >
                <i className="bi bi-clipboard-data me-2"></i>
                Inventory Snapshot
              </a>
            </li>
            <li>
              <a 
                className="dropdown-item" 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('shipments');
                  alert('Add Part Shipment form would be shown here');
                }}
              >
                <i className="bi bi-truck me-2"></i>
                Part Shipment
              </a>
            </li>
            <li>
              <a 
                className="dropdown-item" 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('containers');
                  alert('Add Container form would be shown here');
                }}
              >
                <i className="bi bi-box-seam me-2"></i>
                Container
              </a>
            </li>
          </ul>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'warehouses' ? 'active' : ''}`}
            onClick={() => setActiveTab('warehouses')}
          >
            <i className="bi bi-building me-2"></i>
            Warehouses
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'partTypes' ? 'active' : ''}`}
            onClick={() => setActiveTab('partTypes')}
          >
            <i className="bi bi-box me-2"></i>
            Part Types
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'partSubtypes' ? 'active' : ''}`}
            onClick={() => setActiveTab('partSubtypes')}
          >
            <i className="bi bi-boxes me-2"></i>
            Part Subtypes
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <i className="bi bi-clipboard-data me-2"></i>
            Inventory
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'shipments' ? 'active' : ''}`}
            onClick={() => setActiveTab('shipments')}
          >
            <i className="bi bi-truck me-2"></i>
            Shipments
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'containers' ? 'active' : ''}`}
            onClick={() => setActiveTab('containers')}
          >
            <i className="bi bi-box-seam me-2"></i>
            Containers
          </button>
        </li>
      </ul>
      
      {/* Filters - Only show for inventory and shipments tabs */}
      {(activeTab === 'inventory' || activeTab === 'shipments' || activeTab === 'partSubtypes') && (
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title mb-3">Filters</h5>
            <div className="row g-3">
              {(activeTab === 'inventory' || activeTab === 'shipments') && (
                <>
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
                </>
              )}
              
              {(activeTab === 'partSubtypes' || activeTab === 'inventory' || activeTab === 'shipments') && (
                <div className="col-md-3">
                  <label htmlFor="partTypeFilter" className="form-label">Part Type</label>
                  <select 
                    id="partTypeFilter" 
                    className="form-select"
                    value={partTypeFilter}
                    onChange={(e) => {
                      setPartTypeFilter(e.target.value);
                      setPartSubtypeFilter(''); // Reset subtype when type changes
                    }}
                  >
                    <option value="">All Part Types</option>
                    {partTypes?.map(type => (
                      <option key={type.part_type_id} value={type.part_type_id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {(activeTab === 'inventory' || activeTab === 'shipments') && (
                <div className="col-md-3">
                  <label htmlFor="partSubtypeFilter" className="form-label">Part Subtype</label>
                  <select 
                    id="partSubtypeFilter" 
                    className="form-select"
                    value={partSubtypeFilter}
                    onChange={(e) => setPartSubtypeFilter(e.target.value)}
                    disabled={!partTypeFilter} // Disable if no part type selected
                  >
                    <option value="">All Subtypes</option>
                    {partSubtypes?.filter(subtype => 
                      !partTypeFilter || subtype.part_type_id.toString() === partTypeFilter
                    ).map(subtype => (
                      <option key={subtype.part_subtype_id} value={subtype.part_subtype_id}>
                        {subtype.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className={`col-md-${activeTab === 'partSubtypes' ? '3' : '3'}`}>
                <div className="d-grid h-100 align-items-end">
                  <div className="mt-4">
                    <button 
                      className="btn btn-primary w-100" 
                      onClick={handleApplyFilters}
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="col-md-3">
                <div className="d-grid h-100 align-items-end">
                  <div className="mt-4">
                    <button 
                      className="btn btn-outline-secondary w-100" 
                      onClick={handleResetFilters}
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Content for each tab */}
      <div className="card">
        <div className="card-body">
          {/* Warehouses Tab */}
          {activeTab === 'warehouses' && (
            <>
              {warehousesLoading ? (
                <div className="text-center my-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2">Loading warehouses...</p>
                </div>
              ) : warehousesError ? (
                <div className="alert alert-danger" role="alert">
                  Error loading warehouses. Please try again.
                </div>
              ) : warehouses?.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Location</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {warehouses.map(warehouse => (
                        <tr key={warehouse.warehouse_id}>
                          <td>{warehouse.warehouse_id}</td>
                          <td>{warehouse.name}</td>
                          <td>{warehouse.location || 'N/A'}</td>
                          <td>
                            <button 
                              className="btn btn-sm btn-outline-primary me-2"
                              onClick={() => alert(`View Warehouse ${warehouse.name}`)}
                            >
                              <i className="bi bi-eye"></i>
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-secondary me-2"
                              onClick={() => alert(`Edit Warehouse ${warehouse.name}`)}
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => alert(`Delete Warehouse ${warehouse.name}`)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-5">
                  <div className="mb-3">
                    <i className="bi bi-building fs-1 text-muted"></i>
                  </div>
                  <h5>No Warehouses Found</h5>
                  <p className="text-muted">
                    No warehouses have been added yet. Add a new warehouse to get started.
                  </p>
                  <button
                    className="btn btn-primary mt-2"
                    onClick={() => alert('Add Warehouse form would be shown here')}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Add New Warehouse
                  </button>
                </div>
              )}
            </>
          )}
          
          {/* Part Types Tab */}
          {activeTab === 'partTypes' && (
            <>
              {partTypesLoading ? (
                <div className="text-center my-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2">Loading part types...</p>
                </div>
              ) : partTypesError ? (
                <div className="alert alert-danger" role="alert">
                  Error loading part types. Please try again.
                </div>
              ) : partTypes?.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partTypes.map(type => (
                        <tr key={type.part_type_id}>
                          <td>{type.part_type_id}</td>
                          <td>{type.name}</td>
                          <td>
                            <button 
                              className="btn btn-sm btn-outline-primary me-2"
                              onClick={() => {
                                // Set filter and go to subtypes tab
                                setPartTypeFilter(type.part_type_id.toString());
                                setActiveTab('partSubtypes');
                              }}
                            >
                              <i className="bi bi-eye"></i> View Subtypes
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-secondary me-2"
                              onClick={() => alert(`Edit Part Type ${type.name}`)}
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => alert(`Delete Part Type ${type.name}`)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-5">
                  <div className="mb-3">
                    <i className="bi bi-box fs-1 text-muted"></i>
                  </div>
                  <h5>No Part Types Found</h5>
                  <p className="text-muted">
                    No part types have been added yet. Add a new part type to get started.
                  </p>
                  <button
                    className="btn btn-primary mt-2"
                    onClick={() => alert('Add Part Type form would be shown here')}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Add New Part Type
                  </button>
                </div>
              )}
            </>
          )}
          
          {/* Part Subtypes Tab */}
          {activeTab === 'partSubtypes' && (
            <>
              {partSubtypesLoading ? (
                <div className="text-center my-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2">Loading part subtypes...</p>
                </div>
              ) : partSubtypesError ? (
                <div className="alert alert-danger" role="alert">
                  Error loading part subtypes. Please try again.
                </div>
              ) : partSubtypes?.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Part Type</th>
                        <th>Name</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partSubtypes.filter(subtype => 
                        !partTypeFilter || subtype.part_type_id.toString() === partTypeFilter
                      ).map(subtype => (
                        <tr key={subtype.part_subtype_id}>
                          <td>{subtype.part_subtype_id}</td>
                          <td>{partTypes?.find(t => t.part_type_id === subtype.part_type_id)?.name || subtype.part_type_id}</td>
                          <td>{subtype.name}</td>
                          <td>
                            <button 
                              className="btn btn-sm btn-outline-primary me-2"
                              onClick={() => {
                                // Set filters and go to inventory tab
                                setPartSubtypeFilter(subtype.part_subtype_id.toString());
                                setActiveTab('inventory');
                              }}
                            >
                              <i className="bi bi-clipboard-data"></i> View Inventory
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-secondary me-2"
                              onClick={() => alert(`Edit Part Subtype ${subtype.name}`)}
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => alert(`Delete Part Subtype ${subtype.name}`)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-5">
                  <div className="mb-3">
                    <i className="bi bi-boxes fs-1 text-muted"></i>
                  </div>
                  <h5>No Part Subtypes Found</h5>
                  <p className="text-muted">
                    {partTypeFilter 
                      ? `No part subtypes found for the selected part type.` 
                      : `No part subtypes have been added yet. Add a new part subtype to get started.`}
                  </p>
                  <button
                    className="btn btn-primary mt-2"
                    onClick={() => alert('Add Part Subtype form would be shown here')}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Add New Part Subtype
                  </button>
                </div>
              )}
            </>
          )}
          
          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <>
              {inventorySnapshotsLoading ? (
                <div className="text-center my-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2">Loading inventory data...</p>
                </div>
              ) : inventorySnapshotsError ? (
                <div className="alert alert-danger" role="alert">
                  Error loading inventory data. Please try again.
                </div>
              ) : inventorySnapshots?.length > 0 ? (
                <>
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Warehouse</th>
                          <th>Part</th>
                          <th>Quantity</th>
                          <th>Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventorySnapshots.map(snapshot => (
                          <tr key={snapshot.snapshot_id}>
                            <td>{snapshot.snapshot_id}</td>
                            <td>{warehouses?.find(w => w.warehouse_id === snapshot.warehouse_id)?.name || `Warehouse #${snapshot.warehouse_id}`}</td>
                            <td>{partSubtypes?.find(p => p.part_subtype_id === snapshot.part_subtype_id)?.name || `Part #${snapshot.part_subtype_id}`}</td>
                            <td>{snapshot.quantity}</td>
                            <td>{new Date(snapshot.snapshot_date).toLocaleDateString()}</td>
                            <td>
                              <button 
                                className="btn btn-sm btn-outline-secondary me-2"
                                onClick={() => alert(`Edit Inventory Snapshot #${snapshot.snapshot_id}`)}
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button 
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => alert(`Delete Inventory Snapshot #${snapshot.snapshot_id}`)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
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
                        {!hasMorePages() && ' (end of results)'}
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
                        disabled={!hasMorePages()}
                      >
                        Next <i className="bi bi-chevron-right"></i>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-5">
                  <div className="mb-3">
                    <i className="bi bi-clipboard-data fs-1 text-muted"></i>
                  </div>
                  <h5>No Inventory Data Found</h5>
                  <p className="text-muted">
                    {(warehouseFilter || partSubtypeFilter) 
                      ? `No inventory data matches your current filters. Try adjusting your filters.` 
                      : `No inventory data has been added yet. Add a new inventory snapshot to get started.`}
                  </p>
                  <button
                    className="btn btn-primary mt-2"
                    onClick={() => alert('Add Inventory Snapshot form would be shown here')}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Add New Inventory Snapshot
                  </button>
                </div>
              )}
            </>
          )}
          
          {/* Shipments Tab */}
          {activeTab === 'shipments' && (
            <>
              {partShipmentsLoading ? (
                <div className="text-center my-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2">Loading shipment data...</p>
                </div>
              ) : partShipmentsError ? (
                <div className="alert alert-danger" role="alert">
                  Error loading shipment data. Please try again.
                </div>
              ) : partShipments?.length > 0 ? (
                <>
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Warehouse</th>
                          <th>Part</th>
                          <th>Quantity</th>
                          <th>Received Date</th>
                          <th>Vendor</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {partShipments.map(shipment => (
                          <tr key={shipment.shipment_id}>
                            <td>{shipment.shipment_id}</td>
                            <td>{warehouses?.find(w => w.warehouse_id === shipment.warehouse_id)?.name || `Warehouse #${shipment.warehouse_id}`}</td>
                            <td>{partSubtypes?.find(p => p.part_subtype_id === shipment.part_subtype_id)?.name || `Part #${shipment.part_subtype_id}`}</td>
                            <td>{shipment.quantity}</td>
                            <td>{new Date(shipment.received_at).toLocaleString()}</td>
                            <td>{shipment.vendor || 'N/A'}</td>
                            <td>
                              <button 
                                className="btn btn-sm btn-outline-secondary me-2"
                                onClick={() => alert(`Edit Part Shipment #${shipment.shipment_id}`)}
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button 
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => alert(`Delete Part Shipment #${shipment.shipment_id}`)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
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
                        {!hasMorePages() && ' (end of results)'}
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
                        disabled={!hasMorePages()}
                      >
                        Next <i className="bi bi-chevron-right"></i>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-5">
                  <div className="mb-3">
                    <i className="bi bi-truck fs-1 text-muted"></i>
                  </div>
                  <h5>No Shipment Data Found</h5>
                  <p className="text-muted">
                    {(warehouseFilter || partSubtypeFilter) 
                      ? `No shipment data matches your current filters. Try adjusting your filters.` 
                      : `No shipment data has been added yet. Add a new part shipment to get started.`}
                  </p>
                  <button
                    className="btn btn-primary mt-2"
                    onClick={() => alert('Add Part Shipment form would be shown here')}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Add New Part Shipment
                  </button>
                </div>
              )}
            </>
          )}
          
          {/* Containers Tab */}
          {activeTab === 'containers' && (
            <>
              {containersLoading ? (
                <div className="text-center my-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2">Loading containers...</p>
                </div>
              ) : containersError ? (
                <div className="alert alert-danger" role="alert">
                  Error loading containers. Please try again.
                </div>
              ) : containers?.length > 0 ? (
                <>
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Description</th>
                          <th>Capacity</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {containers.map(container => (
                          <tr key={container.container_id}>
                            <td>{container.container_id}</td>
                            <td>{container.description || 'N/A'}</td>
                            <td>{container.capacity || 'N/A'}</td>
                            <td>
                              <button 
                                className="btn btn-sm btn-outline-primary me-2"
                                onClick={() => alert(`View Container #${container.container_id}`)}
                              >
                                <i className="bi bi-eye"></i>
                              </button>
                              <button 
                                className="btn btn-sm btn-outline-secondary me-2"
                                onClick={() => alert(`Edit Container #${container.container_id}`)}
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button 
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => alert(`Delete Container #${container.container_id}`)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
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
                        {!hasMorePages() && ' (end of results)'}
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
                        disabled={!hasMorePages()}
                      >
                        Next <i className="bi bi-chevron-right"></i>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-5">
                  <div className="mb-3">
                    <i className="bi bi-box-seam fs-1 text-muted"></i>
                  </div>
                  <h5>No Containers Found</h5>
                  <p className="text-muted">
                    No containers have been added yet. Add a new container to get started.
                  </p>
                  <button
                    className="btn btn-primary mt-2"
                    onClick={() => alert('Add Container form would be shown here')}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Add New Container
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryList;
