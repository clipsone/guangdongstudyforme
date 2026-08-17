import { http } from './api';
import type { KnowledgePoint } from '@/types';
import type { ApiResponse } from '@/types';

export const knowledgeService = {
  // 获取知识图谱
  getKnowledge: (subjectId?: string) => {
    return http.get<ApiResponse<KnowledgePoint[]>>('/knowledge', {
      params: { subjectId },
    });
  },

  // 获取单个考点详情
  getKnowledgeById: (id: string) => {
    return http.get<ApiResponse<KnowledgePoint>>(`/knowledge/${id}`);
  },

  // 更新知识点掌握度
  updateMastery: (id: string, mastery: number) => {
    return http.patch<ApiResponse<KnowledgePoint>>(`/knowledge/${id}/mastery`, { mastery });
  },
};