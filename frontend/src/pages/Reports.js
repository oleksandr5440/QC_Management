import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Button, Form, Alert, Tab, Tabs } from 'react-bootstrap';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import api from '../services/api';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Reports = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('thisMonth');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        const response = await api.products.getAll();
        
        // Try to get dashboard data
        let dashboardResponse;
        try {
          dashboardResponse = await fetch('/api/dashboard-data');
          if (dashboardResponse.ok) {
            const dashData = await dashboardResponse.json();
            setDashboardData(dashData);
          }
        } catch (dashErr) {
          console.error('Error fetching dashboard data:', dashErr);
          // Fallback to constructing dashboard data from products if available
          if (response.data) {
            const productsByStatus = {
              pending: 0,
              qc_passed: 0,
              shipped: 0,
              complete: 0
            };
            
            response.data.forEach(product => {
              if (product.status) {
                productsByStatus[product.status] = (productsByStatus[product.status] || 0) + 1;
              }
            });
            
            setDashboardData({
              panelCounts: {
                pending: productsByStatus.pending || 0,
                passed: productsByStatus.qc_passed || 0,
                shipped: productsByStatus.shipped || 0,
                complete: productsByStatus.complete || 0
              }
            });
          }
        }
        
        setError('');
      } catch (err) {
        console.error('Error fetching report data:', err);
        setError('Failed to load report data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [dateRange, customStartDate, customEndDate]);

  const handleDateRangeChange = (e) => {
    setDateRange(e.target.value);
  };

  const handleCustomDateChange = (e) => {
    if (e.target.name === 'startDate') {
      setCustomStartDate(e.target.value);
    } else if (e.target.name === 'endDate') {
      setCustomEndDate(e.target.value);
    }
  };

  const productStatusChart = {
    labels: ['Pending QC', 'Passed QC', 'Shipped', 'Complete'],
    datasets: [
      {
        label: 'Products by Status',
        data: dashboardData ? [
          dashboardData.panelCounts?.pending || 0,
          dashboardData.panelCounts?.passed || 0,
          dashboardData.panelCounts?.shipped || 0,
          dashboardData.panelCounts?.complete || 0
        ] : [0, 0, 0, 0],
        backgroundColor: [
          'rgba(255, 193, 7, 0.7)',
          'rgba(40, 167, 69, 0.7)',
          'rgba(23, 162, 184, 0.7)',
          'rgba(108, 117, 125, 0.7)'
        ],
        borderColor: [
          'rgba(255, 193, 7, 1)',
          'rgba(40, 167, 69, 1)',
          'rgba(23, 162, 184, 1)',
          'rgba(108, 117, 125, 1)'
        ],
        borderWidth: 1,
      },
    ],
  };

  const inventoryTrendsChart = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Extrusions',
        data: [120, 132, 87, 94, 102, 110],
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
      },
      {
        label: 'Infills',
        data: [85, 72, 92, 110, 95, 88],
        borderColor: 'rgba(153, 102, 255, 1)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        tension: 0.1,
      },
      {
        label: 'Sealants',
        data: [45, 55, 65, 59, 80, 81],
        borderColor: 'rgba(255, 159, 64, 1)',
        backgroundColor: 'rgba(255, 159, 64, 0.2)',
        tension: 0.1,
      },
    ],
  };

  const qcPassFailRateChart = {
    labels: ['Passed', 'Failed'],
    datasets: [
      {
        label: 'QC Pass/Fail Rate',
        data: dashboardData ? [
          dashboardData.panelCounts?.passed || 0,
          dashboardData.failed_qc || 0
        ] : [0, 0],
        backgroundColor: [
          'rgba(40, 167, 69, 0.7)',
          'rgba(220, 53, 69, 0.7)'
        ],
        borderColor: [
          'rgba(40, 167, 69, 1)',
          'rgba(220, 53, 69, 1)'
        ],
        borderWidth: 1,
      },
    ],
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "300px" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Reports & Analytics</h1>
        <Button variant="outline-primary">
          <i className="bi bi-download me-2"></i> Export Reports
        </Button>
      </div>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={6} lg={4}>
              <Form.Group className="mb-3">
                <Form.Label>Date Range</Form.Label>
                <Form.Select 
                  value={dateRange}
                  onChange={handleDateRangeChange}
                >
                  <option value="today">Today</option>
                  <option value="thisWeek">This Week</option>
                  <option value="thisMonth">This Month</option>
                  <option value="lastMonth">Last Month</option>
                  <option value="thisQuarter">This Quarter</option>
                  <option value="thisYear">This Year</option>
                  <option value="custom">Custom Range</option>
                </Form.Select>
              </Form.Group>
            </Col>
            
            {dateRange === 'custom' && (
              <>
                <Col md={6} lg={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Start Date</Form.Label>
                    <Form.Control
                      type="date"
                      name="startDate"
                      value={customStartDate}
                      onChange={handleCustomDateChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={6} lg={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>End Date</Form.Label>
                    <Form.Control
                      type="date"
                      name="endDate"
                      value={customEndDate}
                      onChange={handleCustomDateChange}
                    />
                  </Form.Group>
                </Col>
              </>
            )}
          </Row>
          
          <div className="d-flex justify-content-end">
            <Button variant="primary">
              <i className="bi bi-graph-up me-2"></i> Generate Reports
            </Button>
          </div>
        </Card.Body>
      </Card>
      
      <Tabs defaultActiveKey="overview" className="mb-3">
        <Tab eventKey="overview" title="Overview">
          <Row>
            <Col lg={8}>
              <Card className="mb-4">
                <Card.Header>
                  <h5 className="mb-0">Product Status Distribution</h5>
                </Card.Header>
                <Card.Body>
                  <div style={{ height: '300px' }}>
                    <Bar 
                      data={productStatusChart} 
                      options={{
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              precision: 0
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
            <Col lg={4}>
              <Card className="mb-4">
                <Card.Header>
                  <h5 className="mb-0">QC Pass/Fail Rate</h5>
                </Card.Header>
                <Card.Body>
                  <div style={{ height: '300px' }}>
                    <Pie 
                      data={qcPassFailRateChart}
                      options={{
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom'
                          }
                        }
                      }}
                    />
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          <Card>
            <Card.Header>
              <h5 className="mb-0">Inventory Trends</h5>
            </Card.Header>
            <Card.Body>
              <div style={{ height: '300px' }}>
                <Line 
                  data={inventoryTrendsChart}
                  options={{
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true
                      }
                    }
                  }}
                />
              </div>
            </Card.Body>
          </Card>
        </Tab>
        
        <Tab eventKey="qc" title="QC Analysis">
          <Card>
            <Card.Header>
              <h5 className="mb-0">QC Detailed Analysis</h5>
            </Card.Header>
            <Card.Body>
              <div className="text-center py-4">
                <p className="text-muted">Detailed QC analysis report is in development</p>
                <Button variant="outline-primary">Request Report</Button>
              </div>
            </Card.Body>
          </Card>
        </Tab>
        
        <Tab eventKey="inventory" title="Inventory Reports">
          <Card>
            <Card.Header>
              <h5 className="mb-0">Inventory Analysis</h5>
            </Card.Header>
            <Card.Body>
              <div className="text-center py-4">
                <p className="text-muted">Detailed inventory analysis report is in development</p>
                <Button variant="outline-primary">Request Report</Button>
              </div>
            </Card.Body>
          </Card>
        </Tab>
        
        <Tab eventKey="custom" title="Custom Reports">
          <Card>
            <Card.Header>
              <h5 className="mb-0">Build Custom Report</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Report Type</Form.Label>
                    <Form.Select>
                      <option value="">Select Report Type</option>
                      <option value="productStatus">Product Status</option>
                      <option value="qcResults">QC Results</option>
                      <option value="inventoryLevels">Inventory Levels</option>
                      <option value="shipments">Shipments</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Chart Type</Form.Label>
                    <Form.Select>
                      <option value="bar">Bar Chart</option>
                      <option value="line">Line Chart</option>
                      <option value="pie">Pie Chart</option>
                      <option value="table">Data Table</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>Data Fields</Form.Label>
                    <div className="border p-3 rounded">
                      <Form.Check
                        type="checkbox"
                        id="field-product"
                        label="Product Information"
                        className="mb-2"
                      />
                      <Form.Check
                        type="checkbox"
                        id="field-qc"
                        label="QC Results"
                        className="mb-2"
                      />
                      <Form.Check
                        type="checkbox"
                        id="field-inventory"
                        label="Inventory Levels"
                        className="mb-2"
                      />
                      <Form.Check
                        type="checkbox"
                        id="field-dates"
                        label="Dates"
                        className="mb-2"
                      />
                      <Form.Check
                        type="checkbox"
                        id="field-inspector"
                        label="Inspector Information"
                      />
                    </div>
                  </Form.Group>
                </Col>
              </Row>
              
              <div className="d-flex justify-content-end">
                <Button variant="primary">
                  <i className="bi bi-graph-up me-2"></i> Generate Custom Report
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default Reports;