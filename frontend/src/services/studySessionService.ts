import { http } from './api';
import type { ApiResponse } from '@/types';

export const studySessionService = {
  // 记录学习时长（秒）
  record: (data: { userId: string; subjectId: string; duration: number; taskId?: string }) => {
    return http.post<ApiResponse<{ id: string; duration: number }>>('/study-sessions', data);
  },

  // 查询学习时长
  getSessions: (userId: string, days?: number) => {
    return http.get<ApiResponse<{ totalSeconds: number; sessions: Array<{ id: string; duration: number; subjectId: string; startedAt: string }> }>>(
      '/study-sessions',
      { params: { userId, ...(days ? { days } : {}) } }
    );
  },
};
