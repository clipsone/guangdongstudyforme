import { http } from './api';
import type { AIExplanation, AISolution, AIEssayReview } from '@/types';
import type { ApiResponse } from '@/types';

export const aiService = {
  // AI知识点讲解
  explainKnowledge: (knowledgePointId: string) => {
    return http.post<ApiResponse<AIExplanation>>('/ai/explain', {
      knowledgePointId,
    });
  },

  // AI解题助手
  solveQuestion: (questionId: string, userAnswer: string) => {
    return http.post<ApiResponse<AISolution>>('/ai/tutor', {
      questionId,
      userAnswer,
    });
  },

  // AI作文批改
  reviewEssay: (essayContent: string) => {
    return http.post<ApiResponse<AIEssayReview>>('/ai/essay-review', {
      essayContent,
    });
  },

  // AI聊天历史
  getChatHistory: (userId: string) => {
    return http.get<ApiResponse<Array<{ role: string; content: string; createdAt: string }>>>('/ai/chat/history', {
      params: { userId },
    });
  },

  // AI自由问答
  chat: (question: string, userId?: string) => {
    return http.post<ApiResponse<{ answer: string }>>('/ai/chat', {
      question,
      userId,
    });
  },
};