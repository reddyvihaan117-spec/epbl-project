import axios from "axios";

const API_BASE = "http://localhost:5000/api";

const getToken = () => localStorage.getItem("token") || "";

const authHeaders = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

export const authApi = {
  login: (payload) => axios.post(`${API_BASE}/auth/login`, payload),
  register: (payload) => axios.post(`${API_BASE}/auth/register`, payload),
  me: () => axios.get(`${API_BASE}/auth/me`, authHeaders()),
};

export const transactionApi = {
  list: (params) => axios.get(`${API_BASE}/transactions`, { ...authHeaders(), params }),
  create: (payload) => axios.post(`${API_BASE}/transactions`, payload, authHeaders()),
  update: (id, payload) => axios.put(`${API_BASE}/transactions/${id}`, payload, authHeaders()),
  delete: (id) => axios.delete(`${API_BASE}/transactions/${id}`, authHeaders()),
  categories: () => axios.get(`${API_BASE}/transactions/categories`, authHeaders()),
  uploadCsv: (file) => {
    const data = new FormData();
    data.append("file", file);
    return axios.post(`${API_BASE}/transactions/upload-csv`, data, { ...authHeaders(), headers: { ...authHeaders().headers, "Content-Type": "multipart/form-data" } });
  },
};

export const analyticsApi = {
  dashboard: () => axios.get(`${API_BASE}/analytics/dashboard`, authHeaders()),
  charts: () => axios.get(`${API_BASE}/analytics/charts`, authHeaders()),
  monthlyReport: () => axios.get(`${API_BASE}/analytics/reports/monthly`, authHeaders()),
  yearlyReport: () => axios.get(`${API_BASE}/analytics/reports/yearly`, authHeaders()),
  exportCsv: () => axios.get(`${API_BASE}/analytics/reports/export-csv`, { ...authHeaders(), responseType: "blob" }),
  downloadPdf: () => axios.get(`${API_BASE}/analytics/reports/download-pdf`, { ...authHeaders(), responseType: "blob" }),
};

export const aiApi = {
  forecast: () => axios.get(`${API_BASE}/ai/forecast`, authHeaders()),
  anomalies: () => axios.get(`${API_BASE}/ai/anomalies`, authHeaders()),
  recommendations: () => axios.get(`${API_BASE}/ai/recommendations`, authHeaders()),
  classify: (payload) => axios.post(`${API_BASE}/ai/classify`, payload, authHeaders()),
};

export const adminApi = {
  users: () => axios.get(`${API_BASE}/admin/users`, authHeaders()),
  stats: () => axios.get(`${API_BASE}/admin/stats`, authHeaders()),
};

export const budgetApi = {
  list: () => axios.get(`${API_BASE}/budgets`, authHeaders()),
  save: (payload, id) => (id ? axios.put(`${API_BASE}/budgets/${id}`, payload, authHeaders()) : axios.post(`${API_BASE}/budgets`, payload, authHeaders())),
  delete: (id) => axios.delete(`${API_BASE}/budgets/${id}`, authHeaders()),
};
