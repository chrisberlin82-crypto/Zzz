import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor: Token hinzufuegen
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vente_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Token-Refresh bei 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 &&
        error.response?.data?.code === 'TOKEN_EXPIRED' &&
        !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('vente_refresh_token');
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });

        localStorage.setItem('vente_token', data.token);
        localStorage.setItem('vente_refresh_token', data.refreshToken);

        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('vente_token');
        localStorage.removeItem('vente_refresh_token');
        localStorage.removeItem('vente_user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // 402 = Abo erforderlich -> zur Abo-Seite weiterleiten
    if (error.response?.status === 402 &&
        error.response?.data?.code === 'SUBSCRIPTION_REQUIRED' &&
        !window.location.pathname.includes('/subscription')) {
      window.location.href = '/subscription';
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data)
};

// Kunden
export const customerAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getOne: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`)
};

// Vertraege
export const contractAPI = {
  getAll: (params) => api.get('/contracts', { params }),
  getOne: (id) => api.get(`/contracts/${id}`),
  create: (data) => api.post('/contracts', data),
  update: (id, data) => api.put(`/contracts/${id}`, data),
  delete: (id) => api.delete(`/contracts/${id}`),
  getPipeline: () => api.get('/contracts/pipeline')
};

// Produkte
export const productAPI = {
  getAll: (params) => api.get('/products', { params }),
  getOne: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`)
};

// Ausgaben / EUeR
export const expenseAPI = {
  getAll: (params) => api.get('/expenses', { params }),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
  getCategories: () => api.get('/expenses/categories'),
  export: (params) => api.get('/expenses/export', { params, responseType: 'blob' }),
  uploadReceipt: (id, formData) => api.post(`/expenses/${id}/receipt`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

// Adresslisten
export const addressAPI = {
  getAll: () => api.get('/address-lists'),
  getAddresses: (id, params) => api.get(`/address-lists/${id}/addresses`, { params }),
  import: (formData) => api.post('/address-lists/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getMapData: (id) => api.get(`/address-lists/${id}/map-data`),
  geocode: (id) => api.post(`/address-lists/${id}/geocode`),
  updateAddress: (listId, addrId, data) =>
    api.put(`/address-lists/${listId}/addresses/${addrId}`, data),
  delete: (id) => api.delete(`/address-lists/${id}`)
};

// Signaturen
export const signatureAPI = {
  create: (contractId, data) => api.post(`/signatures/contract/${contractId}`, data),
  getOne: (id) => api.get(`/signatures/${id}`),
  getImage: (id) => api.get(`/signatures/${id}/image`),
  verify: (id) => api.get(`/signatures/${id}/verify`)
};

// Dashboard
export const dashboardAPI = {
  get: (params) => api.get('/dashboard', { params })
};

// Benutzer
export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getOne: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  updateLocation: (data) => api.put('/users/location', data),
  getTeamLocations: () => api.get('/users/locations'),
  getSignedLocations: () => api.get('/users/signed-locations')
};

// Gebiete / Territories
export const territoryAPI = {
  // Verfuegbare PLZ aus Adresslisten
  getAvailablePLZ: () => api.get('/territories/available-plz'),
  // Admin: Alle Gebietszuweisungen
  getAll: (params) => api.get('/territories', { params }),
  create: (data) => api.post('/territories', data),
  update: (id, data) => api.put(`/territories/${id}`, data),
  delete: (id) => api.delete(`/territories/${id}`),
  // Standortleiter/Teamleiter: Meine Gebietszuweisungen
  getMyAssignments: () => api.get('/territories/my-assignments'),
  getAddresses: (id) => api.get(`/territories/${id}/addresses`),
  // Vertriebler zuweisen
  assignSalesperson: (data) => api.post('/territories/salesperson', data),
  updateSalesperson: (id, data) => api.put(`/territories/salesperson/${id}`, data),
  deleteSalesperson: (id) => api.delete(`/territories/salesperson/${id}`),
  // Vertriebler: Mein Gebiet
  getMyTerritory: () => api.get('/territories/my-territory'),
  // Territory Runs
  getRuns: (params) => api.get('/territories/runs', { params }),
  getRun: (runId) => api.get(`/territories/runs/${runId}`),
  createRun: (data) => api.post('/territories/runs', data),
  assignRun: (runId, data) => api.post(`/territories/runs/${runId}/assign`, data || {}),
  activateRun: (runId) => api.post(`/territories/runs/${runId}/activate`),
  deleteRun: (runId) => api.delete(`/territories/runs/${runId}`),
  getMyActiveRun: () => api.get('/territories/runs/my-active')
};

// Energiedienstleister
export const energyProviderAPI = {
  getProviders: () => api.get('/energy-providers'),
  tariffLookup: (data) => api.post('/energy-providers/tariff-lookup', data),
  logIframeActivity: (data) => api.post('/energy-providers/iframe-activity', data),
  getIframeActivities: (params) => api.get('/energy-providers/iframe-activities', { params })
};

// Subscription / Abo
export const subscriptionAPI = {
  getStatus: () => api.get('/subscription/status'),
  getPrices: () => api.get('/subscription/prices'),
  createCheckout: (data) => api.post('/subscription/create-checkout', data),
  createPortal: () => api.post('/subscription/portal'),
  createAddonCheckout: (data) => api.post('/subscription/create-addon-checkout', data),
  getAddonStatus: () => api.get('/subscription/addon-status'),
  startAddonTrial: (data) => api.post('/subscription/addon-trial', data)
};

// Health
export const healthAPI = {
  check: () => api.get('/health')
};

export default api;
