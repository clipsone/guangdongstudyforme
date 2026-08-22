import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import type { ApiError } from '@/types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const status = error.response?.status || 500;
    const url: string = error.config?.url || '';
    // 登录过期/未登录：清除本地会话并回到登录页（登录/注册接口自身的 401 除外）
    if (status === 401 && !url.startsWith('/auth/')) {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    const apiError: ApiError = {
      error: {
        message: error.response?.data?.error?.message || (error.request ? '无法连接后端：请启动 backend（npm run dev）或检查 API 地址' : '请求失败'),
        status,
      },
    };
    return Promise.reject(apiError);
  }
);

export default api;

// 类型安全的 HTTP 助手：拦截器已返回 response.data（即 { data, meta } 响应体）
export const http = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    api.get(url, config) as unknown as Promise<T>,
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    api.post(url, data, config) as unknown as Promise<T>,
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    api.patch(url, data, config) as unknown as Promise<T>,
  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    api.delete(url, config) as unknown as Promise<T>,
};