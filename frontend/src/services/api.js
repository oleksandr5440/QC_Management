import axios from 'axios';
import { getToken, logout } from '../utils/auth';

// Create Axios instance with base URL
const api = axios.create({
  // For Replit development environment - use relative URL for API calls
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Logout on auth error
      logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication API calls
const auth = {
  login: (username, password) => {
    // Use the correct login endpoint with proper path that matches the backend
    return api.post('/auth/token', { username, password });
  },
  register: (userData) => api.post('/auth/register', userData),
  getCurrentUser: () => api.get('/auth/users/me'),
};

// Product API calls
const products = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  getQCSessions: (id, params) => api.get(`/products/${id}/qc-sessions`, { params }),
  getShipments: (id, params) => api.get(`/products/${id}/shipments`, { params }),
  shipProduct: (id, data) => api.post(`/products/${id}/ship`, data),
};

// QC API calls
const qc = {
  getSessions: (params) => api.get('/qc/sessions', { params }),
  getSessionById: (id) => api.get(`/qc/sessions/${id}`),
  createSession: (data) => api.post('/qc/sessions', data),
  updateSession: (id, data) => api.put(`/qc/sessions/${id}`, data),
  deleteSession: (id) => api.delete(`/qc/sessions/${id}`),
  
  getAttributes: (params) => api.get('/qc/attributes', { params }),
  getAttributeById: (id) => api.get(`/qc/attributes/${id}`),
  createAttribute: (data) => api.post('/qc/attributes', data),
  updateAttribute: (id, data) => api.put(`/qc/attributes/${id}`, data),
  deleteAttribute: (id) => api.delete(`/qc/attributes/${id}`),
  
  getAttributeValues: (qcId) => api.get(`/qc/sessions/${qcId}/values`),
  createAttributeValue: (qcId, data) => api.post(`/qc/sessions/${qcId}/values`, data),
  updateAttributeValue: (qcId, attributeId, data) => 
    api.put(`/qc/sessions/${qcId}/values/${attributeId}`, data),
  deleteAttributeValue: (qcId, attributeId) => 
    api.delete(`/qc/sessions/${qcId}/values/${attributeId}`),
  
  getPhotos: (qcId) => api.get(`/qc/sessions/${qcId}/photos`),
  createPhoto: (qcId, data) => api.post(`/qc/sessions/${qcId}/photos`, data),
  updatePhoto: (photoId, data) => api.put(`/qc/photos/${photoId}`, data),
  deletePhoto: (photoId) => api.delete(`/qc/photos/${photoId}`),
};

// Inventory API calls
const inventory = {
  // Warehouses
  getWarehouses: (params) => api.get('/inventory/warehouses', { params }),
  getWarehouseById: (id) => api.get(`/inventory/warehouses/${id}`),
  createWarehouse: (data) => api.post('/inventory/warehouses', data),
  updateWarehouse: (id, data) => api.put(`/inventory/warehouses/${id}`, data),
  deleteWarehouse: (id) => api.delete(`/inventory/warehouses/${id}`),
  
  // Part Types
  getPartTypes: (params) => api.get('/inventory/part-types', { params }),
  getPartTypeById: (id) => api.get(`/inventory/part-types/${id}`),
  createPartType: (data) => api.post('/inventory/part-types', data),
  updatePartType: (id, data) => api.put(`/inventory/part-types/${id}`, data),
  deletePartType: (id) => api.delete(`/inventory/part-types/${id}`),
  
  // Part Subtypes
  getPartSubtypes: (params) => api.get('/inventory/part-subtypes', { params }),
  getPartSubtypeById: (id) => api.get(`/inventory/part-subtypes/${id}`),
  createPartSubtype: (data) => api.post('/inventory/part-subtypes', data),
  updatePartSubtype: (id, data) => api.put(`/inventory/part-subtypes/${id}`, data),
  deletePartSubtype: (id) => api.delete(`/inventory/part-subtypes/${id}`),
  
  // Inventory Snapshots
  getInventorySnapshots: (params) => api.get('/inventory/inventory-snapshots', { params }),
  getInventorySnapshotById: (id) => api.get(`/inventory/inventory-snapshots/${id}`),
  createInventorySnapshot: (data) => api.post('/inventory/inventory-snapshots', data),
  updateInventorySnapshot: (id, data) => api.put(`/inventory/inventory-snapshots/${id}`, data),
  deleteInventorySnapshot: (id) => api.delete(`/inventory/inventory-snapshots/${id}`),
  
  // Part Shipments
  getPartShipments: (params) => api.get('/inventory/part-shipments', { params }),
  getPartShipmentById: (id) => api.get(`/inventory/part-shipments/${id}`),
  createPartShipment: (data) => api.post('/inventory/part-shipments', data),
  updatePartShipment: (id, data) => api.put(`/inventory/part-shipments/${id}`, data),
  deletePartShipment: (id) => api.delete(`/inventory/part-shipments/${id}`),
  
  // Containers
  getContainers: (params) => api.get('/inventory/containers', { params }),
  getContainerById: (id) => api.get(`/inventory/containers/${id}`),
  createContainer: (data) => api.post('/inventory/containers', data),
  updateContainer: (id, data) => api.put(`/inventory/containers/${id}`, data),
  deleteContainer: (id) => api.delete(`/inventory/containers/${id}`),
};

// Lookup API calls
const lookups = {
  getTypes: (params) => api.get('/lookups/types', { params }),
  getTypeById: (id) => api.get(`/lookups/types/${id}`),
  createType: (data) => api.post('/lookups/types', data),
  deleteType: (id) => api.delete(`/lookups/types/${id}`),
  
  getValues: (params) => api.get('/lookups/values', { params }),
  getValueById: (id) => api.get(`/lookups/values/${id}`),
  createValue: (data) => api.post('/lookups/values', data),
  deleteValue: (id) => api.delete(`/lookups/values/${id}`),
};

// Product Parts API calls
const productParts = {
  getAll: (params) => api.get('/product-parts', { params }),
  getById: (id) => api.get(`/product-parts/${id}`),
  getImage: (id) => api.get(`/product-parts/${id}/image`, { responseType: 'blob' }),
  create: (data) => api.post('/product-parts', data),
  update: (id, data) => api.put(`/product-parts/${id}`, data),
  delete: (id) => api.delete(`/product-parts/${id}`),
  exportExcel: () => {
    // Create a direct download link with proper headers
    const downloadUrl = '/api/product-parts/export-excel';
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', 'Product_Parts.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};

// Coating Colors API calls
const coatingColors = {
  getAll: (params) => api.get('/coating-colors', { params }),
  getById: (id) => api.get(`/coating-colors/${id}`),
  create: (data) => api.post('/coating-colors', data),
  update: (id, data) => api.put(`/coating-colors/${id}`, data),
  delete: (id) => api.delete(`/coating-colors/${id}`),
  exportExcel: () => {
    // Create a direct download link with proper headers
    const downloadUrl = '/api/coating-colors/export-excel';
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', 'Coating_Colors.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};

// QC Reports API calls
const qcReports = {
  getAll: (params) => api.get('/qc-reports', { params }),
  getById: (id) => api.get(`/qc-reports/${id}`),
  create: (data) => api.post('/qc-reports', data),
  update: (id, data) => api.put(`/qc-reports/${id}`, data),
  delete: (id) => api.delete(`/qc-reports/${id}`),
  exportExcel: () => {
    // Create a direct download link with proper headers
    const downloadUrl = '/api/qc-reports/export-excel';
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', 'QC_Reports.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};

// QC CW Panel Data API calls
const qcCwPanelData = {
  getAll: (params) => api.get('/qc-cw-panel-data', { params }),
  getById: (id) => api.get(`/qc-cw-panel-data/${id}`),
  getByFlId: (flId) => api.get(`/qc-cw-panel-data/fl/${flId}`),
  create: (data) => api.post('/qc-cw-panel-data', data),
  update: (id, data) => api.put(`/qc-cw-panel-data/${id}`, data),
  delete: (id) => api.delete(`/qc-cw-panel-data/${id}`),
  exportExcel: () => {
    // Create a direct download link with proper headers
    const downloadUrl = '/api/qc/cw-panel-data/export-excel';
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', 'QC_CW_Panel_Data.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
  
  // Frame Cavities API
  getFrameCavitiesAttributes: (flId) => api.get(`/frame-cavities-attributes/${flId}`),
  createFrameCavitiesAttribute: (data) => api.post('/frame-cavities-attributes', data),
  updateFrameCavitiesAttribute: (id, data) => api.put(`/frame-cavities-attributes/${id}`, data),
  deleteFrameCavitiesAttribute: (id) => api.delete(`/frame-cavities-attributes/${id}`),
  
  // Frame Cavities Values
  getFrameCavitiesValues: (panelId) => api.get(`/frame-cavities-values/${panelId}`),
  createFrameCavitiesValue: (data) => api.post('/frame-cavities-values', data),
  updateFrameCavitiesValue: (id, data) => api.put(`/frame-cavities-values/${id}`, data),
  deleteFrameCavitiesValue: (id) => api.delete(`/frame-cavities-values/${id}`),
};

export default {
  auth,
  products,
  qc,
  inventory,
  lookups,
  productParts,
  coatingColors,
  qcReports,
  qcCwPanelData,
};
