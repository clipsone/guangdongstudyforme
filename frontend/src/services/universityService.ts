import { http } from './api';
export const universityService = {
  workspace: () => http.get<any>('/university/workspace'),
  createSchedule: (data: any) => http.post<any>('/university/schedules', data),
  deleteSchedule: (id: string) => http.delete<any>('/university/schedules/' + id),
  createCourse: (data: any) => http.post<any>('/university/courses', data),
  updateCourse: (id: string, data: any) => http.patch<any>('/university/courses/' + id, data),
  deleteCourse: (id: string) => http.delete<any>('/university/courses/' + id),
  createAssignment: (data: any) => http.post<any>('/university/assignments', data),
  updateAssignment: (id: string, data: any) => http.patch<any>('/university/assignments/' + id, data),
  deleteAssignment: (id: string) => http.delete<any>('/university/assignments/' + id),
  createPlan: (data: any) => http.post<any>('/university/plans', data),
  updatePlan: (id: string, data: any) => http.patch<any>('/university/plans/' + id, data),
  deletePlan: (id: string) => http.delete<any>('/university/plans/' + id),
  deleteFile: (id: string) => http.delete<any>('/university/files/' + id),
  uploadFile: (file: File, category = 'course-material', courseId?: string) => { const data = new FormData(); data.append('file', file); data.append('category', category); if (courseId) data.append('courseId', courseId); return http.post<any>('/university/files/upload', data, { timeout: 60000 }); },
};
