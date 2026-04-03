import api from './axiosClient';

export const itemsApi = {
  getAll:    ()   => api.get('/api/items').then(r => r.data),
  getActive: ()   => api.get('/api/items/active').then(r => r.data),
  getById:   (id) => api.get(`/api/items/${id}`).then(r => r.data),
};

export const bidsApi = {
  place: (itemId, amount) =>
    api.post('/api/bids', { itemId, amount }).then(r => r.data),
};
