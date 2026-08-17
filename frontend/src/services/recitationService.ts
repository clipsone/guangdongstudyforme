import { http } from './api';
import type { RecitationItem, RecitationRecord } from '@/types';
import type { ApiResponse } from '@/types';

export const recitationService = {
  // 获取背诵项目
  getRecitationItems: (params?: {
    subjectId?: string;
    category?: string;
    limit?: number;
  }) => {
    return http.get<ApiResponse<RecitationItem[]>>('/recitation/items', { params });
  },

  // 提交背诵记录
  createRecitationRecord: (data: {
    userId: string;
    itemId: string;
    reviewed: boolean;
    mastered?: boolean;
  }) => {
    return http.post<ApiResponse<RecitationRecord> & { newAchievements?: Array<{ name: string }> }>('/recitation/records', data);
  },

  // 获取今日待复习背诵项目
  getTodayRecitation: (userId: string) => {
    return http.get<ApiResponse<RecitationRecord[]>>('/recitation/today', {
      params: { userId },
    });
  },

  // 获取我的全部背诵记录（复习进度）
  getMyRecords: (userId: string) => {
    return http.get<ApiResponse<RecitationRecord[]>>('/recitation/records', {
      params: { userId },
    });
  },
};