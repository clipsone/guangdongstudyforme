import { http } from './api';
import type { Essay } from '@/types';
import type { ApiResponse } from '@/types';

export const essayService = {
  // 保存作文（自动 AI 批改落库）
  create: (data: { userId: string; subjectId: string; title?: string; content: string; type?: string }) => {
    return http.post<ApiResponse<{ essay: Essay; review: Essay['reviews'][0] }>>('/essays', data);
  },

  // 我的作文
  getEssays: (userId: string) => {
    return http.get<ApiResponse<Essay[]>>('/essays', { params: { userId } });
  },

  // 删除
  remove: (id: string) => {
    return http.delete<ApiResponse<{ id: string; deleted: boolean }>>(`/essays/${id}`);
  },
};
