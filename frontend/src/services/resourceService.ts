import { http } from './api';
import type { Resource } from '@/types';
import type { ApiResponse } from '@/types';

export const resourceService = {
  // 资料列表
  getResources: (params?: { subjectId?: string; type?: string }) => {
    return http.get<ApiResponse<Resource[]>>('/resources', { params });
  },

  // 新增资料
  create: (data: { name: string; type: string; url: string; description?: string; subjectId?: string }) => {
    return http.post<ApiResponse<Resource>>('/resources', data);
  },

  // 删除
  remove: (id: string) => {
    return http.delete<ApiResponse<{ id: string; deleted: boolean }>>(`/resources/${id}`);
  },
};
