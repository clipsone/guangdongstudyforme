import { http } from './api';
import type { WrongQuestion } from '@/types';
import type { ApiResponse } from '@/types';

export const wrongQuestionService = {
  // 获取错题本
  getWrongQuestions: (params?: {
    userId?: string;
    knowledgePointId?: string;
    mastered?: boolean;
    limit?: number;
  }) => {
    return http.get<ApiResponse<WrongQuestion[]>>('/wrong-questions', { params });
  },

  // 错题重练提交
  reviewWrongQuestion: (id: string, isCorrect: boolean) => {
    return http.post<ApiResponse<WrongQuestion>>(`/wrong-questions/${id}/review`, {
      isCorrect,
    });
  },

  // 批量错题重练
  batchReviewWrongQuestions: (userId: string, questionIds: string[]) => {
    return http.post<ApiResponse<WrongQuestion[]>>('/wrong-questions/batch-review', {
      userId,
      questionIds,
    });
  },
};