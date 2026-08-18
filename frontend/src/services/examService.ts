import { http } from './api';
import type { Exam, ExamTemplate } from '@/types';
import type { ApiResponse } from '@/types';

export const examService = {
  // 模考模板列表
  getTemplates: () => {
    return http.get<ApiResponse<ExamTemplate[]>>('/exams/templates');
  },

  // 创建模考（抽题）
  createExam: (data: { userId: string; templateId: string }) => {
    return http.post<ApiResponse<Exam>>('/exams', data);
  },

  // 模考历史
  getExams: (userId: string) => {
    return http.get<ApiResponse<Exam[]>>('/exams', { params: { userId } });
  },

  // 模考详情
  getExamById: (id: string) => {
    return http.get<ApiResponse<Exam>>(`/exams/${id}`);
  },

  // 交卷（判分+掌握度更新较重，放宽超时到 60s）
  submitExam: (id: string, answers: Array<{ questionId: string; userAnswer: string }>) => {
    return http.post<ApiResponse<Exam> & { summary?: { total: number; correct: number; accuracy: number }; newAchievements?: Array<{ name: string; icon: string }> }>(
      `/exams/${id}/submit`,
      { answers },
      { timeout: 60000 }
    );
  },
};
