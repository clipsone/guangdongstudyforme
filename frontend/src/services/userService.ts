import { http } from './api';
import type { User } from '@/types';
import type { ApiResponse } from '@/types';

export const userService = {
  // 获取当前用户（单用户模式）
  getMe: () => {
    return http.get<ApiResponse<User>>('/user/me');
  },

  // 更新用户设置
  updateMe: (data: { targetScore?: number; examDate?: string }) => {
    return http.patch<ApiResponse<User>>('/user/me', data);
  },
};
