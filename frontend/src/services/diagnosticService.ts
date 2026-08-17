import { http } from './api';
import type { Diagnostic } from '@/types';
import type { ApiResponse } from '@/types';

export const diagnosticService = {
  // 生成学习诊断（可指定科目，缺省全部）
  generate: (userId: string, subjectId?: string) => {
    return http.post<ApiResponse<Diagnostic[]>>('/diagnostics/generate', {
      userId,
      ...(subjectId ? { subjectId } : {}),
    });
  },

  // 获取每科最新诊断
  getDiagnostics: (userId: string) => {
    return http.get<ApiResponse<Diagnostic[]>>('/diagnostics', { params: { userId } });
  },
};
