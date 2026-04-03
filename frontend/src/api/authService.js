import { authApi, tokenStore } from './axiosClient';

export const authService = {
  async register(data) {
    const res = await authApi.post('/api/auth/register', data);
    tokenStore.set(res.data.accessToken);
    return res.data;
  },

  async login(credentials) {
    const res = await authApi.post('/api/auth/login', credentials);
    tokenStore.set(res.data.accessToken);
    return res.data;
  },

  async logout() {
    try {
      await authApi.post('/api/auth/logout');
    } finally {
      tokenStore.clear();
    }
  },

  async refresh() {
    const res = await authApi.post('/api/auth/refresh');
    tokenStore.set(res.data.accessToken);
    return res.data;
  },
};
