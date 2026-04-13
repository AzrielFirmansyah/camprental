const API_URL = '/api';

export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const isFormData = options.body instanceof FormData;
  
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${endpoint}`, { 
    ...options, 
    headers: { ...headers, ...options.headers }
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'An error occurred', status: response.status, url: response.url }));
    console.error(`[API Error] ${endpoint}:`, error);
    throw new Error(error.error || `Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

export const uploadImage = async (endpoint: string, file: File, additionalData: Record<string, string> = {}) => {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('image', file);
  Object.entries(additionalData).forEach(([key, value]) => {
    formData.append(key, value);
  });

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'An error occurred', status: response.status }));
    console.error(`[API Error] ${endpoint}:`, error);
    throw new Error(error.error || `Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
};
