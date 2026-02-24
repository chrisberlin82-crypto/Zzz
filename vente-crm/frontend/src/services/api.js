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
  export: (params) => api.get('/expenses/export', { params, responseType: 'blob' })
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

// Health
export const healthAPI = {
  check: () => api.get('/health')
};

export default api;
