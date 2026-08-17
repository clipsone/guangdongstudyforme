import { http } from './api';
import type { ExerciseRecord, Question } from '@/types';
import type { ApiResponse } from '@/types';

export interface NewAchievement {
  name: string;
  icon: string;
}

export const exerciseService = {
  // 创建练习记录（返回 AI 小结 + 新解锁成就）
  createExercise: (data: {
    userId: string;
    subjectId: string;
    questions: Array<{
      id: string;
      userAnswer: string;
      isCorrect: boolean;
      wrongReason?: string;
      timeSpent?: number;
    }>;
  }) => {
    return http.post<ApiResponse<ExerciseRecord> & { newAchievements?: NewAchievement[] }>('/exercises', data);
  },

  // 智能组卷（薄弱考点加权）
  generatePaper: (data: {
    userId: string;
    subjectId: string;
    count: number;
    difficulty?: string;
    knowledgeIds?: string[];
  }) => {
    return http.post<ApiResponse<{ questions: Question[] }>>('/exercises/generate', data);
  },

  // 获取练习历史
  getExercises: (params?: {
    userId?: string;
    subjectId?: string;
    limit?: number;
  }) => {
    return http.get<ApiResponse<ExerciseRecord[]>>('/exercises', { params });
  },

  // 获取练习详情
  getExerciseById: (id: string) => {
    return http.get<ApiResponse<ExerciseRecord>>(`/exercises/${id}`);
  },
};