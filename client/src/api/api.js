// api/api.js — SECURE VERSION
// Access token is stored in MEMORY only (never localStorage).
// Refresh token lives in an HttpOnly Secure cookie (invisible to JS).
// On 401, we auto-call /auth/refresh to silently get a new access token.
import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true  // Needed so the HttpOnly refresh cookie is sent
});

// ── In-Memory Token Store ─────────────────────────────────────────────────────
// Token lives ONLY in JS memory — invisible to XSS and browser DevTools storage
let _accessToken = null;
let _refreshPromise = null; // Prevents multiple concurrent refresh calls

export const tokenStore = {
  get: () => _accessToken,
  set: (t) => { _accessToken = t; },
  clear: () => { _accessToken = null; },
};

// ── Request Interceptor — attach access token from memory ─────────────────────
API.interceptors.request.use(
  (config) => {
    const token = tokenStore.get();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor — auto-refresh on 401 ───────────────────────────────
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // If 401 and we haven't already retried this request
    if (error.response?.status === 401 && !original._retried) {
      original._retried = true;

      try {
        // Only one refresh call at a time — share the promise
        if (!_refreshPromise) {
          _refreshPromise = axios.post(
            `${process.env.REACT_APP_API_URL || '/api'}/auth/refresh`,
            {},
            { withCredentials: true }
          ).finally(() => { _refreshPromise = null; });
        }

        const { data } = await _refreshPromise;

        if (data?.data?.token) {
          tokenStore.set(data.data.token);
          original.headers.Authorization = `Bearer ${data.data.token}`;
          return API(original); // Retry original request with new token
        }
      } catch (refreshError) {
        // Refresh failed — user must log in again
        tokenStore.clear();
        // Clear any stale localStorage auth key if it exists
        localStorage.removeItem('auth');
        if (window.location.pathname.startsWith('/admin')) {
          window.location.href = '/admin/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ---- Auth ----
export const login = (payload) => API.post('/auth/customer/login', payload);
export const loginAdmin = (payload) => API.post('/auth/admin/login', payload);
export const googleLogin = (payload) => API.post('/auth/google', payload);
export const register = (payload) => API.post('/auth/customer/register', payload);
export const logout = () => API.post('/auth/logout');
export const verifyEmail = (payload) => API.post('/auth/verify-email', payload);
export const resendVerification = (payload) => API.post('/auth/resend-verification', payload);
export const checkEmail = (params) => API.get('/auth/check-email', { params });
export const forgotPassword = (payload) => API.post('/auth/forgot-password', payload);
export const resetPassword = (payload) => API.post('/auth/reset-password', payload);
export const verifyPassword = (payload) => API.post('/auth/verify-password', payload);

// ---- User Profile & Orders ----
export const getCurrentUser = () => API.get('/auth/me');
export const updateProfile = (payload) => API.put('/auth/profile', payload);
export const changePassword = (payload) => API.put('/auth/change-password', payload);
export const deleteAccount = (payload) => API.delete('/auth/profile', { data: payload });
export const getMyOrders = (params) => API.get('/orders/my', { params });
export const getCart = () => API.get('/auth/cart');
export const syncCart = (payload) => API.post('/auth/cart', payload);

// ---- Admin Routes ----
export const getDashboardStats = (params) => API.get('/admin/dashboard/stats', { params });
export const getSalesAnalytics = (params) => API.get('/admin/analytics/sales', { params });
export const getActivityLogs = (params) => API.get('/admin/logs', { params });
export const getAdminUsers = (params) => API.get('/admin/users', { params });
export const updateUserRole = (id, role) => API.put(`/admin/users/${id}/role`, { role });
export const deleteUser = (id) => API.delete(`/admin/users/${id}`);
export const resetUserSecurity = (id, type) => API.patch(`/admin/users/${id}/security-reset`, { type });
export const getAdminOrders = (params) => API.get('/admin/orders', { params });
export const getAdminProducts = (params) => API.get('/admin/products', { params });
export const getAdminOrderDetail = (id) => API.get(`/admin/orders/${id}`);
export const updateOrderStatus = (id, payload) => API.put(`/admin/orders/${id}/status`, payload);
export const createProduct = (payload) => API.post('/admin/products', payload);
export const updateProduct = (id, payload) => API.put(`/admin/products/${id}`, payload);
export const deleteProduct = (id) => API.delete(`/admin/products/${id}`);
export const updateProductStock = (id, payload) => API.patch(`/admin/products/${id}/stock`, payload);
export const unlockUserAccount = (id) => API.put(`/auth/admin/unlock/${id}`);

// ---- Profile ----
export const getProfile = () => API.get('/auth/me');

// ---- Orders / Checkout ----
export const createOrder = (payload) => API.post('/orders', payload);
export const getOrderById = (orderId) => API.get(`/orders/${orderId}`);
export const logAbandonedCheckout = (payload) => API.post('/orders/abandoned', payload);
export const getAbandonedCheckouts = () => API.get('/orders/abandoned');

// ---- Payments ----
export const processMpesaPayment = (payload) => API.post('/payments/mpesa', payload);
export const processCardPayment = (payload) => API.post('/payments/card', payload);
export const processCashOnDelivery = (payload) => API.post('/payments/cash-on-delivery', payload);

// ---- Settings ----
export const getPublicSettings = () => API.get('/settings/public');
export const getSettings = () => API.get('/admin/settings');
export const updateSettings = (payload) => API.put('/admin/settings', payload);
export const uploadLogo = (formData) => API.post('/admin/settings/upload/logo', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

// ---- Products ----
export const fetchProducts = (params) => API.get('/products', { params });
export const getProductById = (id) => API.get(`/products/${id}`);

// ---- Extended Reports ----
export const getAbandonedCartsReport = () => API.get('/admin/reports/abandoned-carts');
export const getPaymentsReport = () => API.get('/admin/reports/payments');
export const getCustomersReport = () => API.get('/admin/reports/customers');
export const getInventoryReport = () => API.get('/admin/reports/inventory');
export const getCouponsReport = () => API.get('/admin/reports/coupons');

// ---- CSV Exports ----
export const exportOrdersCSV = (params) => API.get('/admin/export/orders', { params, responseType: 'blob' });
export const exportCustomersCSV = () => API.get('/admin/export/customers', { responseType: 'blob' });

export default API;
