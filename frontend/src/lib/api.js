const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

class ApiClient {
  constructor() {
    this.baseUrl = API_URL;
  }

  getToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gojim_token');
    }
    return null;
  }

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, config);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 && endpoint !== '/auth/login' && typeof window !== 'undefined') {
          localStorage.removeItem('gojim_token');
          if (data && data.message) {
            localStorage.setItem('gojim_login_error', data.message);
          }
          window.location.href = '/login';
        }
        throw new Error(data.message || 'API request failed');
      }
      return data;
    } catch (error) {
      if (!options.silent) {
        console.error(`API Error [${endpoint}]:`, error.message);
      }
      throw error;
    }
  }

  get(endpoint, options = {}) { return this.request(endpoint, options); }
  post(endpoint, body, options = {}) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(body), ...options }); }
  put(endpoint, body) { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }); }
  patch(endpoint, body = {}) { return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(body) }); }
  delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }
}

const api = new ApiClient();

export const authApi = {
  login: (data) => api.post('/auth/login', data, { silent: true }),
  logout: () => api.post('/auth/logout', {}),
  register: (data) => api.post('/auth/register', data),
  getMe: (options = {}) => api.get('/auth/me', options),
  updateProfile: (data) => api.put('/auth/profile', data),
  updatePassword: (data) => api.put('/auth/update-password', data),
  sendOtp: (payload) => api.post('/auth/send-otp', payload),
  verifyOtp: (payload) => api.post('/auth/verify-otp', payload),
  subscribePlan: (data) => api.put('/auth/subscribe-plan', data),
  verifyOwnerSubscriptionRazorpay: (data) => api.post('/auth/razorpay/verify-owner', data),
  testExpireSubscription: () => api.post('/auth/test/expire-subscription', {}),
  getLatestBroadcast: (options = {}) => api.get('/auth/broadcast/latest', options),
  verifyUpi: (data) => api.post('/auth/verify-upi', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (token, data) => api.post(`/auth/reset-password/${token}`, data),
};

// Dashboard
export const dashboardApi = {
  get: () => api.get('/dashboard'),
};

// Members
export const membersApi = {
  getAll: (params = '') => api.get(`/members?${params}`),
  getOne: (id) => api.get(`/members/${id}`),
  create: (data) => api.post('/members', data),
  update: (id, data) => api.put(`/members/${id}`, data),
  delete: (id, deletePayments = false) => api.delete(`/members/${id}${deletePayments ? '?deletePayments=true' : ''}`),
  getInactive: (params = '') => api.get(`/members/inactive?${params}`),
  getExpiring: (params = '') => api.get(`/members/expiring?${params}`),
  searchByPhone: (phone, options = { silent: true }) => api.get(`/members/search/${phone}`, options),
  getStats: () => api.get('/members/stats'),
  getExpectedRenewals: () => api.get('/members/expected-renewals'),
  toggleStatus: (id) => api.patch(`/members/${id}/toggle-status`),
};

// Attendance
export const attendanceApi = {
  checkIn: (data) => api.post('/attendance/checkin', data),
  checkOut: (data) => api.post('/attendance/checkout', data),
  markAbsent: (data) => api.request('/attendance/absent', { method: 'DELETE', body: JSON.stringify(data) }),
  unmark: (data) => api.request('/attendance/unmark', { method: 'DELETE', body: JSON.stringify(data) }),
  getToday: () => api.get('/attendance/today'),
  getStats: () => api.get('/attendance/stats'),
  getAll: (params = '') => api.get(`/attendance?${params}`),
};

// Payments
export const paymentsApi = {
  create: (data) => api.post('/payments', data),
  getAll: (params = '') => api.get(`/payments?${params}`),
  getStats: () => api.get('/payments/stats'),
  getMemberPayments: (memberId) => api.get(`/payments/member/${memberId}`),
  delete: (id) => api.delete(`/payments/${id}`),
  createRazorpayOrder: (data) => api.post('/payments/razorpay/order', data),
  verifyRazorpayPayment: (data) => api.post('/payments/razorpay/verify', data),
};

// Leads
export const leadsApi = {
  getAll: (params = '') => api.get(`/leads?${params}`),
  getOne: (id) => api.get(`/leads/${id}`),
  create: (data) => api.post('/leads', data),
  update: (id, data) => api.put(`/leads/${id}`, data),
  delete: (id) => api.delete(`/leads/${id}`),
  getFollowUps: () => api.get('/leads/followups'),
  getStats: () => api.get('/leads/stats'),
};

// Alerts
export const alertsApi = {
  getAll: (params = '') => api.get(`/alerts?${params}`, { silent: true }),
  getCounts: () => api.get('/alerts/counts', { silent: true }),
  generate: () => api.post('/alerts/generate', {}, { silent: true }),
  markRead: (id) => api.put(`/alerts/${id}/read`, {}),
  dismiss: (id) => api.put(`/alerts/${id}/dismiss`, {}),
};

// WhatsApp
export const whatsappApi = {
  sendTemplate: (data) => api.post('/whatsapp/send', data),
  sendCustom: (data) => api.post('/whatsapp/send-custom', data),
  getTemplates: () => api.get('/whatsapp/templates'),
  getLog: () => api.get('/whatsapp/log'),
};

// Trainers
export const trainersApi = {
  getAll: (params = '') => api.get(`/trainers?${params}`),
  create: (data) => api.post('/trainers', data),
  update: (id, data) => api.put(`/trainers/${id}`, data),
  delete: (id, deletePayments = false) => api.delete(`/trainers/${id}${deletePayments ? '?deletePayments=true' : ''}`),
  toggleStatus: (id) => api.patch(`/trainers/${id}/toggle-status`),
};

// Staff
export const staffApi = {
  getAll: (params = '') => api.get(`/staff?${params}`),
  create: (data) => api.post('/staff', data),
  update: (id, data) => api.put(`/staff/${id}`, data),
  delete: (id) => api.delete(`/staff/${id}`),
  toggleStatus: (id) => api.patch(`/staff/${id}/toggle-status`),
};

// Expenses
export const expensesApi = {
  getAll: (params = '') => api.get(`/expenses?${params}`),
  create: (data) => api.post('/expenses', data),
  delete: (id) => api.delete(`/expenses/${id}`),
  getStats: () => api.get('/expenses/stats'),
};

// Expense Categories
export const expenseCategoriesApi = {
  getAll: () => api.get('/expense-categories'),
  create: (data) => api.post('/expense-categories', data),
  update: (id, data) => api.put(`/expense-categories/${id}`, data),
  delete: (id) => api.delete(`/expense-categories/${id}`),
  reset: () => api.post('/expense-categories/reset'),
};

// Plans
export const plansApi = {
  getAll: () => api.get('/plans'),
  create: (data) => api.post('/plans', data),
  update: (id, data) => api.put(`/plans/${id}`, data),
  delete: (id) => api.delete(`/plans/${id}`),
};

// Equipment
export const equipmentApi = {
  getAll: (params = '') => api.get(`/equipment?${params}`),
  getOne: (id) => api.get(`/equipment/${id}`),
  create: (data) => api.post('/equipment', data),
  update: (id, data) => api.put(`/equipment/${id}`, data),
  delete: (id) => api.delete(`/equipment/${id}`),
  updateStatus: (id, status) => api.patch(`/equipment/${id}/status`, { status }),
};

// Super Admin
export const superAdminApi = {
  getStats: () => api.get('/super-admin/stats'),
  getOwners: (params = '') => api.get(`/super-admin/owners?${params}`),
  createOwner: (data) => api.post('/super-admin/owners', data),
  getOwnerDetails: (id) => api.get(`/super-admin/owners/${id}`),
  updateDetails: (id, data) => api.put(`/super-admin/owners/${id}/details`, data),
  changePassword: (id, password) => api.put(`/super-admin/owners/${id}/password`, { password }),
  toggleStatus: (id) => api.put(`/super-admin/owners/${id}/status`, {}),
  extendTrial: (id, days) => api.put(`/super-admin/owners/${id}/trial`, { days }),
  changePlan: (id, data) => api.put(`/super-admin/owners/${id}/plan`, data),
  deleteOwner: (id) => api.delete(`/super-admin/owners/${id}`),
  impersonate: (id) => api.post(`/super-admin/owners/${id}/impersonate`, {}),
  getPlans: () => api.get('/super-admin/plans'),
  getPublicPlans: () => api.get('/super-admin/plans/public'),
  createPlan: (data) => api.post('/super-admin/plans', data),
  updatePlan: (id, data) => api.put(`/super-admin/plans/${id}`, data),
  deletePlan: (id) => api.delete(`/super-admin/plans/${id}`),
  getSubscriptions: (params = '') => api.get(`/super-admin/subscriptions?${params}`),
  getTransactions: (params = '') => api.get(`/super-admin/transactions?${params}`),
  getSettings: () => api.get('/super-admin/settings'),
  getPublicSettings: (options = { silent: true }) => api.get('/super-admin/settings/public', options),
  updateSettings: (data) => api.put('/super-admin/settings', data),
  updateFeatureFlags: (data) => api.put('/super-admin/settings/features', data),
  sendBroadcast: (data) => api.post('/super-admin/broadcasts', data),
  deleteBroadcast: (id) => api.delete(`/super-admin/broadcasts/${id}`),
};

export const analyticsApi = {
  getDashboard1: (params = '') => api.get(`/analytics/dashboard1?${params}`),
  getVisuals: (params = '') => api.get(`/analytics/visuals?${params}`),
};

export default api;
