import { http } from './api';
import type { Question } from '@/types';
import type { ApiResponse } from '@/types';

export const questionService = {
  // 获取题目列表
  getQuestions: (params?: {
    subjectId?: string;
    type?: string;
    difficulty?: number;
    knowledgePointId?: string;
    limit?: number;
    offset?: number;
  }) => {
    return http.get<ApiResponse<Question[]>>('/questions', { params });
  },

  // 获取单个题目详情
  getQuestionById: (id: string) => {
    return http.get<ApiResponse<Question>>(`/questions/${id}`);
  },

  // 提交题目纠错反馈（AI 生成题答案可能有误）
  submitFeedback: (id: string, reason: string) => {
    return http.post<ApiResponse<{ ok: boolean }>>(`/questions/${id}/feedback`, { reason });
  },
};
