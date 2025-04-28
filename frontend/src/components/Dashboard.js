import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import api from '../services/api';
import Chart from 'chart.js/auto';

const Dashboard = () => {
  // Stats for dashboard
  const [stats, setStats] = useState({
    products: 0,
    qcSessions: 0,
    partsInventory: 0,
    pendingQC: 0
  });
  
  // QC Chart reference
  const qcChartRef = React.useRef(null);
  const qcChartInstance = React.useRef(null);
  
  // Inventory Chart reference
  const inventoryChartRef = React.useRef(null);
  const inventoryChartInstance = React.useRef(null);

  // Fetch products
  const { data: products } = useQuery('products', () => 
    api.products.getAll().then(res => res.data)
  );

  // Fetch QC sessions
  const { data: qcSessions } = useQuery('qcSessions', () => 
    api.qc.getSessions().then(res => res.data)
  );

  // Fetch inventory snapshots
  const { data: inventorySnapshots } = useQuery('inventorySnapshots', () => 
    api.inventory.getInventorySnapshots().then(res => res.data)
  );
  
  // Fetch recent part shipments
  const { data: recentShipments } = useQuery('recentShipments', () => 
    api.inventory.getPartShipments({ limit: 5 }).then(res => res.data)
  );

  // Calculate stats when data is available
  useEffect(() => {
    if (products && qcSessions && inventorySnapshots) {
      const pendingQC = products.filter(p => p.status === 'pending').length;
      
      // Calculate total inventory by summing up the latest snapshot for each part
      const totalInventory = inventorySnapshots.reduce((sum, snapshot) => sum + snapshot.quantity, 0);
      
      setStats({
        products: products.length,
        qcSessions: qcSessions.length,
        partsInventory: totalInventory,
        pendingQC
      });
    }
  }, [products, qcSessions, inventorySnapshots]);

  // Create QC Status Chart
  useEffect(() => {
    if (products && qcChartRef.current) {
      // Destroy previous chart if it exists
      if (qcChartInstance.current) {
        qcChartInstance.current.destroy();
      }
      
      const statusCounts = {
        pending: 0,
        qc_passed: 0,
        shipped: 0,
        complete: 0
      };
      
      products.forEach(product => {
        statusCounts[product.status]++;
      });
      
      const ctx = qcChartRef.current.getContext('2d');
      qcChartInstance.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Pending', 'QC Passed', 'Shipped', 'Complete'],
          datasets: [{
            data: [
              statusCounts.pending,
              statusCounts.qc_passed,
              statusCounts.shipped,
              statusCounts.complete
            ],
            backgroundColor: [
              '#6c757d',
              '#198754',
              '#0d6efd',
              '#6f42c1'
            ]
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'bottom'
            },
            title: {
              display: true,
              text: 'Product Status Distribution'
            }
          }
        }
      });
    }
  }, [products]);

  // Create Inventory Chart
  useEffect(() => {
    if (inventorySnapshots && inventoryChartRef.current) {
      // Destroy previous chart if it exists
      if (inventoryChartInstance.current) {
        inventoryChartInstance.current.destroy();
      }
      
      // Group by part subtype and sum quantities
      const partInventory = {};
      inventorySnapshots.forEach(snapshot => {
        if (!partInventory[snapshot.part_subtype_id]) {
          partInventory[snapshot.part_subtype_id] = 0;
        }
        partInventory[snapshot.part_subtype_id] += snapshot.quantity;
      });
      
      // Get top 5 part subtypes by quantity
      const partIds = Object.keys(partInventory);
      const partQuantities = Object.values(partInventory);
      
      const ctx = inventoryChartRef.current.getContext('2d');
      inventoryChartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: partIds.map(id => `Part #${id}`),
          datasets: [{
            label: 'Quantity in Stock',
            data: partQuantities,
            backgroundColor: '#0d6efd'
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: false
            },
            title: {
              display: true,
              text: 'Inventory Levels by Part Type'
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Quantity'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Part Type'
              }
            }
          }
        }
      });
    }
  }, [inventorySnapshots]);

  return (
    <div className="dashboard">
      <h1 className="mb-4">Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div className="card stat-card products h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h5 className="card-title">Products</h5>
                  <h2 className="card-text">{stats.products}</h2>
                </div>
                <div className="text-primary">
                  <i className="bi bi-box-seam" style={{ fontSize: '2rem' }}></i>
                </div>
              </div>
              <Link to="/products" className="btn btn-sm btn-outline-primary mt-2">View Details</Link>
            </div>
          </div>
        </div>
        
        <div className="col-md-3 mb-3">
          <div className="card stat-card qc h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h5 className="card-title">QC Sessions</h5>
                  <h2 className="card-text">{stats.qcSessions}</h2>
                </div>
                <div className="text-success">
                  <i className="bi bi-clipboard-check" style={{ fontSize: '2rem' }}></i>
                </div>
              </div>
              <Link to="/qc" className="btn btn-sm btn-outline-success mt-2">View Details</Link>
            </div>
          </div>
        </div>
        
        <div className="col-md-3 mb-3">
          <div className="card stat-card inventory h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h5 className="card-title">Parts Inventory</h5>
                  <h2 className="card-text">{stats.partsInventory}</h2>
                </div>
                <div className="text-danger">
                  <i className="bi bi-archive" style={{ fontSize: '2rem' }}></i>
                </div>
              </div>
              <Link to="/inventory" className="btn btn-sm btn-outline-danger mt-2">View Details</Link>
            </div>
          </div>
        </div>
        
        <div className="col-md-3 mb-3">
          <div className="card stat-card shipping h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h5 className="card-title">Pending QC</h5>
                  <h2 className="card-text">{stats.pendingQC}</h2>
                </div>
                <div className="text-purple">
                  <i className="bi bi-hourglass-split" style={{ fontSize: '2rem' }}></i>
                </div>
              </div>
              <Link to="/products?status=pending" className="btn btn-sm btn-outline-secondary mt-2">View Details</Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Charts */}
      <div className="row mb-4">
        <div className="col-md-6 mb-3">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">Product Status</h5>
              <div className="chart-container" style={{ position: 'relative', height: '300px' }}>
                <canvas ref={qcChartRef}></canvas>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-6 mb-3">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">Inventory Levels</h5>
              <div className="chart-container" style={{ position: 'relative', height: '300px' }}>
                <canvas ref={inventoryChartRef}></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent Shipments */}
      <div className="row mb-4">
        <div className="col-md-12">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title mb-0">Recent Part Shipments</h5>
                <Link to="/inventory" className="btn btn-sm btn-outline-primary">View All</Link>
              </div>
              
              {recentShipments && recentShipments.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Part Subtype</th>
                        <th>Warehouse</th>
                        <th>Quantity</th>
                        <th>Received Date</th>
                        <th>Vendor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentShipments.map(shipment => (
                        <tr key={shipment.shipment_id}>
                          <td>{shipment.shipment_id}</td>
                          <td>Part #{shipment.part_subtype_id}</td>
                          <td>Warehouse #{shipment.warehouse_id}</td>
                          <td>{shipment.quantity}</td>
                          <td>{new Date(shipment.received_at).toLocaleDateString()}</td>
                          <td>{shipment.vendor || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="bi bi-inbox text-muted" style={{ fontSize: '2rem' }}></i>
                  <p className="text-muted mt-2">No recent shipments available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
