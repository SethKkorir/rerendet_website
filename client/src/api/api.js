// api/api.js - COMPLETE FIXED VERSION
import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true
});

// Request interceptor to add token
API.interceptors.request.use(
  (config) => {
    const authData = localStorage.getItem('auth');
    const token = authData ? JSON.parse(authData).token : null;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth');
      if (window.location.pathname.startsWith('/admin')) {
        window.location.href = '/admin/login';
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

// ---- User Profile & Orders ----
export const getCurrentUser = () => API.get('/auth/me');
export const updateProfile = (payload) => API.put('/auth/profile', payload);
export const changePassword = (payload) => API.put('/auth/change-password', payload);
export const deleteAccount = () => API.delete('/auth/profile');
export const getMyOrders = (params) => API.get('/orders/my', { params });
export const getCart = () => API.get('/auth/cart');
export const syncCart = (payload) => API.post('/auth/cart', payload);

// ---- Admin Routes ----
export const getDashboardStats = (params) => API.get('/admin/dashboard/stats', { params });
export const getSalesAnalytics = (params) => API.get('/admin/analytics/sales', { params });
export const getAdminUsers = (params) => API.get('/admin/users', { params });
export const updateUserRole = (id, role) => API.put(`/admin/users/${id}/role`, { role });
export const deleteUser = (id) => API.delete(`/admin/users/${id}`);
export const getAdminOrders = (params) => API.get('/admin/orders', { params });
export const getAdminProducts = (params) => API.get('/admin/products', { params });
export const getAdminOrderDetail = (id) => API.get(`/admin/orders/${id}`);
export const updateOrderStatus = (id, payload) => API.put(`/admin/orders/${id}/status`, payload);
export const createProduct = (payload) => API.post('/admin/products', payload);
export const updateProduct = (id, payload) => API.put(`/admin/products/${id}`, payload);
export const deleteProduct = (id) => API.delete(`/admin/products/${id}`);

// ---- Profile ----
export const getProfile = () => API.get('/auth/me'); // Using /me instead of /profile for get

// ---- Orders / Checkout ----
export const createOrder = (payload) => API.post('/orders', payload);
export const getOrderById = (orderId) => API.get(`/orders/${orderId}`);

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

export default API;