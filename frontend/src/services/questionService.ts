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
};