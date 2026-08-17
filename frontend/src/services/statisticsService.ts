import { http } from './api';
import type { DashboardStats } from '@/types';
import type { ApiResponse } from '@/types';

export interface ProgressPoint {
  date: string;
  accuracy: number;
}

export interface RadarPoint {
  subject: string;
  mastery: number;
  accuracy: number;
  duration: number;
  stability?: number;
  pace?: number;
}

export const statisticsService = {
  // 获取仪表盘统计数据
  getDashboardStats: (userId: string) => {
    return http.get<ApiResponse<DashboardStats>>('/statistics/dashboard', {
      params: { userId },
    });
  },

  // 获取进步曲线数据
  getProgressData: (userId: string, days?: number) => {
    return http.get<ApiResponse<ProgressPoint[]>>('/statistics/progress', {
      params: { userId, days },
    });
  },

  // 获取雷达图数据
  getRadarData: (userId: string) => {
    return http.get<ApiResponse<RadarPoint[]>>('/statistics/radar', {
      params: { userId },
    });
  },

  // 获取掌握度历史（快照趋势）
  getMasteryHistory: (userId: string, days = 90) => {
    return http.get<ApiResponse<Array<{ date: string; mastery: number }>>>('/statistics/mastery-history', {
      params: { userId, days },
    });
  },
};
