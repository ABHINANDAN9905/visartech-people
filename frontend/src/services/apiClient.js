/**
 * VISARTECH People — Centralized Backend API Client
 * Connects frontend services to the Express & MongoDB Atlas backend.
 * Falls back gracefully to offline demo persistence when the backend is unreachable.
 */

export function getApiBaseUrl() {
  const envUrl = import.meta.env?.VITE_API_URL || import.meta.env?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    const cleanUrl = envUrl.trim().replace(/\/+$/, '');
    return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
  }
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const protocol = window.location.protocol || 'http:';
    const hostname = window.location.hostname;
    // For local development or LAN testing
    if (hostname === 'localhost' || hostname === '127.0.0.1' || /^172\.|^192\.168\.|^10\./.test(hostname)) {
      return `${protocol}//${hostname}:5000/api`;
    }
  }
  return 'http://localhost:5000/api';
}

export const API_BASE_URL = getApiBaseUrl();
const TOKEN_KEY = 'visartech_people_auth_token';

export function getStoredToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function setStoredToken(token) {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (err) {
    console.error('Error saving auth token:', err);
  }
}

export async function apiFetch(endpoint, options = {}) {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const token = getStoredToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 10000);

  try {
    const response = await fetch(url, {
      credentials: 'include', // Ensure HttpOnly cookies are transported across localhost origins
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.message || `Request failed with status ${response.status}`;
      return {
        success: false,
        status: response.status,
        message: errorMsg,
        data,
      };
    }

    return {
      success: true,
      status: response.status,
      ...data,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      success: false,
      isOffline: true,
      message: err.name === 'AbortError' ? 'API request timed out' : 'Backend API is unreachable',
      error: err.message,
    };
  }
}

export const api = {
  get: (endpoint, options = {}) => apiFetch(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options = {}) =>
    apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body), ...options }),
  put: (endpoint, body, options = {}) =>
    apiFetch(endpoint, { method: 'PUT', body: JSON.stringify(body), ...options }),
  patch: (endpoint, body, options = {}) =>
    apiFetch(endpoint, { method: 'PATCH', body: JSON.stringify(body), ...options }),
  delete: (endpoint, options = {}) => apiFetch(endpoint, { method: 'DELETE', ...options }),
};

export default api;
