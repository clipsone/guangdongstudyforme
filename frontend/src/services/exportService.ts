import { http } from './api';
import type { ApiResponse } from '@/types';

export const exportService = {
  // 导出全部学习数据
  exportAll: (userId: string) => {
    return http.get<ApiResponse<any>>('/export', { params: { userId } });
  },
};
