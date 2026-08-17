import { http } from './api';
import type { AIExplanation, AISolution, AIEssayReview, Question, ExamTemplate } from '@/types';
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

  // AI出题（扩充题库）
  generateQuestions: (data: { subjectId: string; knowledgePointId?: string; section?: string; type?: string; count?: number }) => {
    return http.post<ApiResponse<{ questions: Question[]; count: number }>>('/ai/generate-questions', data);
  },

  // 导入历年真题（粘贴文本 → AI 解析入库并生成真题卷）
  importRealExam: (data: { subjectId: string; year?: string; paperName?: string; text: string }) => {
    return http.post<ApiResponse<{ template: ExamTemplate; imported: number }>>('/ai/import-real-exam', data);
  },
};