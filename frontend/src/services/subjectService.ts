import { http } from './api';
import type { Subject } from '@/types';
import type { ApiResponse } from '@/types';

export const subjectService = {
  // 获取科目列表
  getSubjects: () => {
    return http.get<ApiResponse<Subject[]>>('/subjects');
  },
};
