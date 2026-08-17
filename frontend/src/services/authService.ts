import { http } from './api';
import type { ApiResponse } from '@/types';

export interface AuthUser {
  id: string;
  username: string;
  email: string | null;
  targetScore: number;
  examDate: string;
  createdAt: string;
}

export interface AuthResult {
  token: string;
  user: AuthUser;
}

export const authService = {
  login: (username: string, password: string) => {
    return http.post<ApiResponse<AuthResult>>('/auth/login', { username, password });
  },
  register: (username: string, password: string) => {
    return http.post<ApiResponse<AuthResult>>('/auth/register', { username, password });
  },
  logout: () => {
    return http.post<ApiResponse<{ success: boolean }>>('/auth/logout');
  },
  changePassword: (oldPassword: string, newPassword: string) => {
    return http.post<ApiResponse<{ success: boolean }>>('/auth/change-password', { oldPassword, newPassword });
  },
};

// 本地会话工具
export const authStorage = {
  getToken: () => localStorage.getItem('token'),
  setSession: (token: string, userId: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userId);
  },
  clear: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
  },
  isLoggedIn: () => !!localStorage.getItem('token'),
};
