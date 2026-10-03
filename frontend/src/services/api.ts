import * as SecureStore from 'expo-secure-store';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.0.2.2:5000/api';
const TOKEN_KEY = 'spendsnap.jwt';

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  age?: number;
  gender?: string;
  bio?: string;
  avatar?: string;
  budgets: { category: string; monthlyLimit: number }[];
};

export type ApiReceipt = {
  _id: string;
  storeName: string;
  receiptDate: string;
  total: number;
  currency: string;
  items: { name: string; price: number; category: string; subcategory?: string }[];
};

export type ApiAnalytics = {
  period: { type: string; startDate: string; endDate: string };
  summary: { totalSpent: number; numberOfReceipts: number; averageReceiptValue: number };
  categoryBreakdown: { category: string; amount: number; percentage: number }[];
  spendingTrend: { currentPeriod: number; previousPeriod: number; difference: number; percentageChange: number; direction: string };
};

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = body?.error;
    const exception = new Error(error?.message || 'Request failed') as Error & { code?: string; fields?: Record<string, string> };
    exception.code = error?.code;
    exception.fields = error?.fields;
    throw exception;
  }
  return body.data as T;
}

export const api = {
  getToken: () => SecureStore.getItemAsync(TOKEN_KEY),
  saveToken: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  clearToken: () => SecureStore.deleteItemAsync(TOKEN_KEY),
  login: (email: string, password: string) => request<{ user: ApiUser; token: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string) => request<{ user: ApiUser; token: string }>('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  me: (token: string) => request<{ user: ApiUser }>('/auth/me', {}, token),
  logout: (token: string) => request('/auth/logout', { method: 'POST' }, token),
  receipts: (token: string) => request<{ receipts: ApiReceipt[] }>('/receipts', {}, token),
  deleteReceipt: (token: string, id: string) => request<{ receipt: { id: string } }>(`/receipts/${id}`, { method: 'DELETE' }, token),
  analytics: (token: string, period = 'MONTHLY') => request<ApiAnalytics>(`/analytics?period=${period}`, {}, token),
  recommendations: (token: string, period = 'MONTHLY') => request<{ recommendations: unknown[] }>(`/recommendations?period=${period}`, {}, token),
  updateBudgets: (token: string, budgets: { category: string; monthlyLimit: number }[]) => request<{ budgets: ApiUser['budgets'] }>('/users/me/budgets', { method: 'PUT', body: JSON.stringify({ budgets }) }, token),
  uploadReceipt: (token: string, asset: { uri: string; mimeType?: string; fileName?: string | null }) => {
    return new Promise<{ receipt: ApiReceipt }>((resolve, reject) => {
      const uri = asset.uri;
      const extension = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = asset.fileName || uri.split('/').pop() || `receipt.${extension}`;
      let mimeType = asset.mimeType;
      if (!mimeType) {
        if (extension === 'jpg' || extension === 'jpeg') mimeType = 'image/jpeg';
        else if (extension === 'png') mimeType = 'image/png';
        else if (extension === 'webp') mimeType = 'image/webp';
        else if (extension === 'heic') mimeType = 'image/heic';
        else mimeType = 'image/jpeg';
      }

      const form = new FormData();
      form.append('image', { uri, name: fileName, type: mimeType } as any);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/receipts`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      
      xhr.onload = () => {
        try {
          const body = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(body.data);
          } else {
            reject(new Error(body?.error?.message || 'Request failed'));
          }
        } catch {
          reject(new Error('Failed to parse response'));
        }
      };
      
      xhr.onerror = () => reject(new Error('Network request failed'));
      xhr.send(form);
    });
  },
};
