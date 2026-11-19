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

// Singleton guard to ensure wake-up ping triggers only once on application initialization
let wakeUpTriggered = false;

/**
 * Lightweight, non-blocking backend wake-up ping.
 * Triggers Render instance spin-up from cold sleep without blocking page loads or login.
 */
export function wakeUpBackend() {
  if (wakeUpTriggered) return;
  wakeUpTriggered = true;

  try {
    const baseUrl = getApiBaseUrl();
    const healthUrl = baseUrl.endsWith('/api') ? `${baseUrl}/health` : `${baseUrl}/api/health`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 65000); // 65s wake-up window

    fetch(healthUrl, {
      method: 'GET',
      credentials: 'include',
      signal: controller.signal,
    })
      .then((res) => {
        clearTimeout(timeoutId);
        if (res.ok) {
          console.debug('[VISARTECH API] Production backend is online and responsive.');
        }
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        console.debug('[VISARTECH API] Background wake-up request captured:', err.message);
      });
  } catch {
    // Non-blocking; failsafe
  }
}

// Auto-trigger background wake-up once in browser environment
if (typeof window !== 'undefined') {
  wakeUpBackend();
}

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
  // Default timeout 60 seconds to accommodate Render free-tier cold starts (30-50s)
  const timeoutMs = options.timeout || 60000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      credentials: 'include', // Ensure HttpOnly cookies are transported across cross-origin domains
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
    const isTimeout = err.name === 'AbortError';
    return {
      success: false,
      isOffline: true,
      isTimeout,
      isNetworkError: !isTimeout,
      message: isTimeout
        ? 'API request timed out. Server may be waking up from sleep mode.'
        : 'Backend API is unreachable. Please verify network connectivity.',
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
