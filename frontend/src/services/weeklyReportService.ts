import { http } from './api';
import type { WeeklyReport } from '@/types';
import type { ApiResponse } from '@/types';

export const weeklyReportService = {
  // 生成最新周报
  generate: (userId: string) => {
    return http.post<ApiResponse<WeeklyReport>>('/weekly-reports/generate', { userId });
  },

  // 历史周报
  getReports: (userId: string) => {
    return http.get<ApiResponse<WeeklyReport[]>>('/weekly-reports', { params: { userId } });
  },
};
