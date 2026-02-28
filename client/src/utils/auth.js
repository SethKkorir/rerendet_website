// src/utils/auth.js — SECURE VERSION
// Token is stored in MEMORY via tokenStore, NOT localStorage.
// This file is kept for legacy compatibility but delegates to tokenStore.
import { tokenStore } from '../api/api';

class AuthTokenManager {
  // Clear auth state (memory + any stale localStorage)
  clearAllStorage() {
    try {
      tokenStore.clear();
      localStorage.removeItem('auth');
      localStorage.removeItem('lastActivity');
      sessionStorage.clear();
      console.log('✅ All auth state cleared');
    } catch (error) {
      console.error('❌ Error clearing auth state:', error);
    }
  }

  // Store token in MEMORY only
  setToken(token) {
    try {
      tokenStore.set(token);
      console.log('✅ Token stored in memory (XSS-safe)');
    } catch (error) {
      console.error('❌ Error storing token:', error);
    }
  }

  // Get token from memory
  getToken() {
    try {
      return tokenStore.get();
    } catch (error) {
      console.error('❌ Error getting token:', error);
      return null;
    }
  }

  // Remove token from memory
  removeToken() {
    try {
      tokenStore.clear();
      console.log('✅ Token removed from memory');
    } catch (error) {
      console.error('❌ Error removing token:', error);
    }
  }

  // Redirect to login
  redirectToLogin() {
    if (window.location.pathname !== '/login' && !window.location.pathname.includes('/auth')) {
      console.log('🔐 Redirecting to login...');
      window.location.href = '/login';
    }
  }

  // Check if user is authenticated (has in-memory token)
  isAuthenticated() {
    return !!tokenStore.get();
  }
}

const authTokenManager = new AuthTokenManager();
export default authTokenManager;