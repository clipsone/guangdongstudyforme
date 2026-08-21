import { http } from './api';

export interface AdminStats {
  users: number;
  questions: number;
  pendingFeedbacks: number;
  exams: number;
  exercises: number;
  bySubject: { name: string; count: number }[];
}

export interface AdminUser {
  id: string;
  username: string;
  role: string;
  targetScore: number;
  createdAt: string;
  _count: { exerciseRecords: number; examRecords: number };
}

export interface AdminQuestion {
  id: string;
  subjectId: string;
  type: string;
  section: string | null;
  stem: string;
  options: string[] | null;
  answer: string;
  difficulty: number;
  status: string;
  source: string;
  solution?: { analysis?: string };
  analysis?: string;
  subject?: { name: string };
}

export interface AdminFeedback {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  question?: AdminQuestion & { stem: string };
}

export interface AdminCoverage {
  name: string;
  type: string;
  countPerExam: number;
  have: number;
}

export const adminService = {
  getStats: () => http.get<{ data: AdminStats }>('/admin/stats').then((r) => r.data),
  syncLawCurriculum: () => http.post<{ data: { chapters: number; knowledgePoints: number; questions: number; examTemplates: number } }>('/admin/law-curriculum/sync').then((r) => r.data),
  getCoverage: (subjectId: string) =>
    http.get<{ data: AdminCoverage[] }>('/admin/coverage', { params: { subjectId } }).then((r) => r.data),
  getQuestions: (params?: { subjectId?: string; section?: string; status?: string; page?: number; pageSize?: number }) =>
    http.get<{ data: { total: number; list: AdminQuestion[] } }>('/admin/questions', { params }).then((r) => r.data),
  updateQuestion: (id: string, data: Partial<AdminQuestion>) =>
    http.patch<{ data: AdminQuestion }>(`/admin/questions/${id}`, data).then((r) => r.data),
  archiveQuestion: (id: string) => http.delete<{ data: { ok: boolean } }>(`/admin/questions/${id}`).then((r) => r.data),
  getFeedbacks: (status?: string) =>
    http.get<{ data: AdminFeedback[] }>('/admin/feedbacks', { params: { status } }).then((r) => r.data),
  resolveFeedback: (id: string, status: 'fixed' | 'ignored') =>
    http.patch<{ data: AdminFeedback }>(`/admin/feedbacks/${id}`, { status }).then((r) => r.data),
  getUsers: () => http.get<{ data: AdminUser[] }>('/admin/users').then((r) => r.data),
  setUserRole: (id: string, role: 'admin' | 'user') =>
    http.patch<{ data: AdminUser }>(`/admin/users/${id}/role`, { role }).then((r) => r.data),
  deleteUser: (id: string) => http.delete<{ data: { ok: boolean } }>(`/admin/users/${id}`).then((r) => r.data),
};
