import { http } from './api';
import type { Achievement } from '@/types';
import type { ApiResponse } from '@/types';

export const achievementService = {
  // 获取成就列表（含解锁状态）
  getAchievements: (userId: string) => {
    return http.get<ApiResponse<Achievement[]>>('/achievements', {
      params: { userId },
    });
  },
};
