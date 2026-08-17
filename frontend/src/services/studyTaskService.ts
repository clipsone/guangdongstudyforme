import { http } from './api';
import type { StudyTask } from '@/types';
import type { ApiResponse } from '@/types';

export const studyTaskService = {
  // 获取每日任务
  getStudyTasks: (userId?: string, date?: string) => {
    return http.get<ApiResponse<StudyTask[]>>('/study-tasks', {
      params: { userId, date },
    });
  },

  // 创建学习任务
  createStudyTask: (data: {
    userId: string;
    type: string;
    targetId?: string;
    title: string;
    description?: string;
    targetCount?: number;
    dueDate: string;
  }) => {
    return http.post<ApiResponse<StudyTask>>('/study-tasks', data);
  },

  // 完成任务打卡
  completeStudyTask: (id: string) => {
    return http.post<ApiResponse<StudyTask>>(`/study-tasks/${id}/complete`);
  },
};