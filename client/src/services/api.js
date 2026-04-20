import axios from 'axios';
import { API_URL } from '../utils/constants';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses — clear token but let React auth flow handle redirect
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthRoute = error.config?.url?.includes('/auth/');
      if (!isAuthRoute) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  verifyEmail: (token) => api.get(`/auth/verify-email?token=${token}`),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getMe: () => api.get('/auth/me'),
};

// Posts API
export const postsAPI = {
  getFeed: (page = 1) => api.get(`/posts?page=${page}`),
  getPost: (id) => api.get(`/posts/${id}`),
  create: (data) => api.post('/posts', data),
  update: (id, data) => api.put(`/posts/${id}`, data),
  delete: (id) => api.delete(`/posts/${id}`),
  toggleLike: (id) => api.post(`/posts/${id}/like`),
  getComments: (id) => api.get(`/posts/${id}/comments`),
  addComment: (id, data) => api.post(`/posts/${id}/comments`, data),
  deleteComment: (id) => api.delete(`/posts/comments/${id}`),
};

// Study Groups API
export const groupsAPI = {
  getAll: (page = 1, search = '') => api.get(`/study-groups?page=${page}&search=${search}`),
  get: (id) => api.get(`/study-groups/${id}`),
  create: (data) => api.post('/study-groups', data),
  update: (id, data) => api.put(`/study-groups/${id}`, data),
  delete: (id) => api.delete(`/study-groups/${id}`),
  join: (id) => api.post(`/study-groups/${id}/join`),
  leave: (id) => api.post(`/study-groups/${id}/leave`),
  getPosts: (id, page = 1) => api.get(`/study-groups/${id}/posts?page=${page}`),
};

// Events API
export const eventsAPI = {
  getAll: (page = 1, upcoming = false) => api.get(`/events?page=${page}&upcoming=${upcoming}`),
  get: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  rsvp: (id, status) => api.post(`/events/${id}/rsvp`, { status }),
  getAttendees: (id) => api.get(`/events/${id}/attendees`),
};

// Lost & Found API
export const lostFoundAPI = {
  getAll: (page = 1, filters = {}) => {
    const params = new URLSearchParams({ page });
    if (filters.status) params.append('status', filters.status);
    if (filters.category) params.append('category', filters.category);
    if (filters.search) params.append('search', filters.search);
    return api.get(`/lost-found?${params}`);
  },
  get: (id) => api.get(`/lost-found/${id}`),
  create: (data) => api.post('/lost-found', data),
  update: (id, data) => api.put(`/lost-found/${id}`, data),
  delete: (id) => api.delete(`/lost-found/${id}`),
  resolve: (id) => api.post(`/lost-found/${id}/resolve`),
};

// Conversations / Messaging API
export const conversationsAPI = {
  getAll: () => api.get('/conversations'),
  create: (data) => api.post('/conversations', data),
  getMessages: (id, page = 1) => api.get(`/conversations/${id}/messages?page=${page}`),
  sendMessage: (id, content) => api.post(`/conversations/${id}/messages`, { content }),
};

// Users API
export const usersAPI = {
  get: (id) => api.get(`/users/${id}`),
  updateProfile: (data) => api.put('/users/profile', data),
  getPosts: (id, page = 1) => api.get(`/users/${id}/posts?page=${page}`),
  search: (q) => api.get(`/users/search?q=${q}`),
};

export default api;
