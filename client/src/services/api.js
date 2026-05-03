import axios from 'axios';
import { API_URL } from '../utils/constants';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthRoute = error.config?.url?.includes('/auth/');
      if (!isAuthRoute) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Notify AuthContext to clear user state and redirect to login
        window.dispatchEvent(new Event('auth:expired'));
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  registerUser: (data) => api.post('/auth/register-user', data),   // Coordination only
  login: (data) => api.post('/auth/login', data),
  verifyEmail: (token) => api.get(`/auth/verify-email?token=${token}`),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getMe: () => api.get('/auth/me'),
};

// ─── Posts ───────────────────────────────────────────────────────────────────
export const postsAPI = {
  getFeed: (page = 1, type = null) => {
    const params = new URLSearchParams({ page });
    if (type && type !== 'ALL') params.set('type', type);
    return api.get(`/posts?${params}`);
  },
  getPost: (id) => api.get(`/posts/${id}`),
  create: (data) => api.post('/posts', data),
  update: (id, data) => api.put(`/posts/${id}`, data),
  delete: (id) => api.delete(`/posts/${id}`),
  toggleLike: (id) => api.post(`/posts/${id}/like`),
  getComments: (id) => api.get(`/posts/${id}/comments`),
  addComment: (id, data) => api.post(`/posts/${id}/comments`, data),
  deleteComment: (id) => api.delete(`/posts/comments/${id}`),
};

// ─── Semester Groups ──────────────────────────────────────────────────────────
export const groupsAPI = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.page)       qs.set('page', params.page);
    if (params.search)     qs.set('search', params.search);
    if (params.department) qs.set('department', params.department);
    if (params.semester)   qs.set('semester', params.semester);
    return api.get(`/semester-groups?${qs}`);
  },
  get: (id) => api.get(`/semester-groups/${id}`),
  create: (data) => api.post('/semester-groups', data),
  update: (id, data) => api.put(`/semester-groups/${id}`, data),
  delete: (id) => api.delete(`/semester-groups/${id}`),
  join: (id) => api.post(`/semester-groups/${id}/join`),
  leave: (id) => api.delete(`/semester-groups/${id}/leave`),
  getPosts: (id, page = 1) => api.get(`/semester-groups/${id}/posts?page=${page}`),
};

// ─── Announcements ────────────────────────────────────────────────────────────
export const announcementsAPI = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', params.page);
    if (params.type) qs.set('type', params.type);
    return api.get(`/announcements?${qs}`);
  },
  get: (id) => api.get(`/announcements/${id}`),
  create: (data) => api.post('/announcements', data),
  update: (id, data) => api.put(`/announcements/${id}`, data),
  delete: (id) => api.delete(`/announcements/${id}`),
};

// ─── Events ───────────────────────────────────────────────────────────────────
export const eventsAPI = {
  getAll: (page = 1, upcoming = false, filters = {}) => {
    const params = new URLSearchParams({ page, upcoming });
    if (filters.search) params.set('search', filters.search);
    return api.get(`/events?${params}`);
  },
  get: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  rsvp: (id, status) => api.post(`/events/${id}/rsvp`, { status }),
  getAttendees: (id) => api.get(`/events/${id}/attendees`),
};

// ─── Lost & Found ─────────────────────────────────────────────────────────────
export const lostFoundAPI = {
  getAll: (page = 1, filters = {}) => {
    const params = new URLSearchParams({ page });
    if (filters.status)   params.append('status',   filters.status);
    if (filters.type)     params.append('type',     filters.type);
    if (filters.category) params.append('category', filters.category);
    if (filters.search)   params.append('search',   filters.search);
    return api.get(`/lost-found?${params}`);
  },
  get: (id) => api.get(`/lost-found/${id}`),
  create: (data) => api.post('/lost-found', data),
  update: (id, data) => api.put(`/lost-found/${id}`, data),
  delete: (id) => api.delete(`/lost-found/${id}`),
  resolve: (id) => api.post(`/lost-found/${id}/resolve`),
};

// ─── Conversations / Messaging ────────────────────────────────────────────────
export const conversationsAPI = {
  getAll: () => api.get('/conversations'),
  create: (data) => api.post('/conversations', data),
  getMessages: (id, page = 1) => api.get(`/conversations/${id}/messages?page=${page}`),
  sendMessage: (id, content) => api.post(`/conversations/${id}/messages`, { content }),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersAPI = {
  get: (id) => api.get(`/users/${id}`),
  updateProfile: (data) => api.put('/users/profile', data),
  getPosts: (id, page = 1) => api.get(`/users/${id}/posts?page=${page}`),
  search: (q) => api.get(`/users/search?q=${encodeURIComponent(q)}`),
  // System Admin
  listAll: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.page)       qs.set('page', params.page);
    if (params.role)       qs.set('role', params.role);
    if (params.department) qs.set('department', params.department);
    if (params.search)     qs.set('search', params.search);
    return api.get(`/users?${qs}`);
  },
  block: (id) => api.post(`/users/${id}/block`),
  unblock: (id) => api.post(`/users/${id}/unblock`),
};

// ─── System Admin ─────────────────────────────────────────────────────────────
export const adminAPI = {
  getStats:   () => api.get('/admin/stats'),
  getContent: () => api.get('/admin/content'),
  // User control
  deleteUser:     (id)         => api.delete(`/admin/users/${id}`),
  updateUserRole: (id, role)   => api.put(`/admin/users/${id}/role`, { role }),
  blockUser:      (id)         => api.post(`/admin/users/${id}/block`),
  unblockUser:    (id)         => api.post(`/admin/users/${id}/unblock`),
  // Content moderation
  deletePost:         (id) => api.delete(`/admin/posts/${id}`),
  deleteAnnouncement: (id) => api.delete(`/admin/announcements/${id}`),
  deleteEvent:        (id) => api.delete(`/admin/events/${id}`),
  // Group management
  getGroups: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.page)       qs.set('page',       params.page);
    if (params.search)     qs.set('search',     params.search);
    if (params.department) qs.set('department', params.department);
    if (params.semester)   qs.set('semester',   params.semester);
    return api.get(`/admin/groups?${qs}`);
  },
  deleteGroup: (id) => api.delete(`/admin/groups/${id}`),
};

export default api;
