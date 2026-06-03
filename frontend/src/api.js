import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject mock token and current active subject ID
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  const activeSubjectId = localStorage.getItem('active_subject_id');
  if (activeSubjectId) {
    config.headers['X-Subject-Id'] = activeSubjectId;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  getLoginLogs: () => api.get('/auth/login-logs'),
};

export const subjectAPI = {
  list: () => api.get('/subjects'),
  create: (subject_name, year, semester) => api.post('/subjects', { subject_name, year, semester }),
  delete: (subject_id) => api.delete(`/subjects/${subject_id}`),
  setActive: (subject_id) => api.post('/subjects/active', { subject_id }),
  getActive: () => api.get('/subjects/active'),
  getOverallAnalysis: () => api.get('/subjects/overall-analysis'),
  runPhase1: (formData) => api.post('/subjects/auto-pipeline/phase1', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    }
  }),
  runPhase2: (file) => {
    const formData = new FormData();
    formData.append('marks_file', file);
    return api.post('/subjects/auto-pipeline/phase2', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
  }
};

export const courseAPI = {
  setup: (formData) => api.post('/setup', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    }
  }),
  setupDepartment: (formData) => api.post('/department/setup', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    }
  }),
  getState: () => api.get('/state'),
  resetState: () => api.post('/state/reset'),
};

export const coAPI = {
  generate: (num_cos) => api.post('/cos/generate', { num_cos }),
  update: (cos) => api.put('/cos/update', { cos }),
  regenerate: (feedback, num_cos) => api.post('/cos/regenerate', { feedback, num_cos }),
  approve: () => api.post('/cos/approve'),
};

export const poAPI = {
  getDefaults: () => api.post('/pos/default'),
  loadCustom: (pos) => api.post('/pos/load', { pos }),
};

export const mappingAPI = {
  getMappings: () => api.get('/mappings'),
  generate: () => api.post('/mappings/generate'),
  update: (mappings) => api.put('/mappings/update', { mappings }),
  recalculate: () => api.post('/mappings/recalculate'),
  lock: () => api.post('/mappings/lock'),
  unlock: () => api.post('/mappings/unlock'),
  generatePI: () => api.post('/mappings/pi/generate'),
  updatePI: (mappings) => api.put('/mappings/pi/update', { mappings }),
  suggestPIMapping: (co_id, pi_id) => api.post('/mappings/pi/suggest', { co_id, pi_id }),
};

export const philosophyAPI = {
  get: () => api.get('/philosophy'),
  generate: () => api.post('/philosophy/generate'),
};

export const attainmentAPI = {
  uploadMarks: (file, coTargets, assessmentType) => {
    const formData = new FormData();
    formData.append('marks_file', file);
    formData.append('assessment_type', assessmentType);
    if (coTargets) {
      formData.append('co_targets', JSON.stringify(coTargets));
    }
    return api.post('/attainment/upload-marks', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
  },
  getAttainment: () => api.get('/attainment'),
  generateRecommendations: () => api.post('/recommendations/generate'),
  saveManualInput: (attainments, coTargets) => api.post('/attainment/manual-input', { attainments, co_targets: coTargets }),
  clearAttainment: () => api.post('/attainment/clear'),
};

export const reportAPI = {
  downloadExcel: () => api.get('/report/excel', { responseType: 'blob' }),
  downloadPDF: () => api.get('/report/pdf', { responseType: 'blob' }),
  downloadAnalysisPDF: () => api.get('/analysis/pdf', { responseType: 'blob' }),
};

export const assignmentAPI = {
  generate: (payload) => api.post('/assignment/generate', payload),
  get: () => api.get('/assignment'),
  downloadPDF: () => api.get('/assignment/pdf', { responseType: 'blob' }),
};

export const errorAPI = {
  log: (message, stack, componentStack) => api.post('/log-error', { message, stack, componentStack }),
};


export const aiAPI = {
  chat: (message, history) => api.post('/chat', { message, history }),
  suggestMapping: (co_id, po_id) => api.post('/recommendations/suggest-mapping', { co_id, po_id }),
};

export default api;
