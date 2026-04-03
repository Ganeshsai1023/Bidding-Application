import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

// ── Primary API client (sends Access Token in header) ─────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Required to send/receive HttpOnly refresh cookie
});

// ── Auth client (no interceptors — avoids infinite refresh loops) ─────────────
export const authApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// ── Token storage (in-memory only — never localStorage for access tokens) ─────
let accessToken = null;
let isRefreshing = false;
let failedQueue = [];

export const tokenStore = {
  set: (token) => { accessToken = token; },
  get: () => accessToken,
  clear: () => { accessToken = null; },
};

const processQueue = (error) => {
  failedQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve(accessToken);
  });
  failedQueue = [];
};

// ── Request interceptor: attach access token ──────────────────────────────────
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: silent refresh on 401 ───────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request until the refresh completes
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((newToken) => {
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Call refresh endpoint — browser automatically sends HttpOnly cookie
      const { data } = await authApi.post('/api/auth/refresh');
      tokenStore.set(data.accessToken);
      processQueue(null);

      originalRequest.headers['Authorization'] = `Bearer ${data.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);
      tokenStore.clear();
      // Redirect to login — refresh token is expired/revoked
      window.dispatchEvent(new CustomEvent('auth:session-expired'));
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
