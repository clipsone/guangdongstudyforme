// 用户相关
export interface User {
  id: string;
  username: string;
  email: string;
  targetScore: number;
  examDate: string;
  createdAt: string;
}

// 科目相关
export interface Subject {
  id: string;
  name: string;
  code: string;
  description: string;
}

// 章节相关
export interface Chapter {
  id: string;
  subjectId: string;
  name: string;
  code: string;
  order: number;
  description: string;
  subject: Subject;
}

// 知识点相关
export interface KnowledgePoint {
  id: string;
  chapterId: string;
  code: string;
  name: string;
  level: number; // 1=章节 2=考点 3=子考点
  parentId: string | null;
  frequency: number;
  difficulty: number;
  status: 'pending' | 'learning' | 'mastered';
  mark: 'new' | 'deleted' | 'none';
  prerequisites: string[];
  mastery: number;
  chapter: Chapter;
  parent?: KnowledgePoint;
  children?: KnowledgePoint[];
}

// 题目相关
export interface Question {
  id: string;
  subjectId: string;
  type: 'choice' | 'fill' | 'essay' | 'composite';
  section?: string;
  stem: string;
  options?: any;
  answer: string;
  solution: any;
  difficulty: number;
  source?: string;
  year?: number;
  status: 'active' | 'archived';
  subject: Subject;
  questionKnowledge: QuestionKnowledge[];
}

export interface QuestionKnowledge {
  questionId: string;
  knowledgePoint: KnowledgePoint;
}

// 练习记录相关
export interface ExerciseRecord {
  id: string;
  userId: string;
  subjectId: string;
  startTime: string;
  endTime: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  status: 'in_progress' | 'completed';
  aiSummary?: string;
  createdAt: string;
  subject: Subject;
  exerciseQuestions: ExerciseQuestion[];
}

export interface ExerciseQuestion {
  id: string;
  questionId: string;
  userAnswer?: string;
  isCorrect?: boolean;
  wrongReason?: string;
  timeSpent?: number;
  question: Question;
}

// 错题相关
export interface WrongQuestion {
  id: string;
  userId: string;
  questionId: string;
  wrongCount: number;
  reviewCount: number;
  mastered: boolean;
  lastWrongAt: string;
  question: Question;
}

// 背诵相关
export interface RecitationItem {
  id: string;
  subjectId: string;
  category: 'essay' | 'vocabulary' | 'formula';
  content: string;
  title?: string;
  phonetic?: string;
  partOfSpeech?: string;
  meaning?: string;
  example?: string;
  order: number;
  subject: Subject;
}

export interface RecitationRecord {
  id: string;
  userId: string;
  itemId: string;
  stage: number;
  reviewed: boolean;
  nextReviewAt: string;
  item: RecitationItem;
}

// 每日任务相关
export interface StudyTask {
  id: string;
  userId: string;
  type: 'knowledge' | 'exercise' | 'recitation' | 'exam' | 'review';
  targetId?: string;
  title: string;
  description?: string;
  targetCount?: number;
  completed: boolean;
  completedAt?: string;
  dueDate: string;
}

// 统计相关
export interface DashboardStats {
  totalExercises: number;
  recentExercises: ExerciseRecord[];
  wrongQuestionCount: number;
  recentSessions: StudySession[];
  subjectStats: SubjectStats[];
  totalExams?: number;
  avgExamScore?: number;
  todayStudySeconds?: number;
}

export interface SubjectStats {
  id: string;
  name: string;
  code: string;
  mastery: number;
}

export interface StudySession {
  id: string;
  userId: string;
  taskId?: string;
  subjectId: string;
  duration: number;
  startedAt: string;
  endedAt: string;
}

// AI相关
export interface AIExplanation {
  explanation: string;
  keyPoints: string[];
  examples: string[];
  relatedTopics: string[];
}

export interface AISolution {
  isCorrect: boolean;
  explanation: string;
  stepByStep: string[];
  tips: string;
  relatedKnowledge: string[];
}

export interface AIEssayReview {
  score: number;
  comment: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

// API响应类型
export interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface ApiError {
  error: {
    message: string;
    status: number;
  };
}
// 模考相关
export interface ExamTemplateSection {
  name?: string;
  type: string;
  count: number;
  scorePer: number;
  available?: number | null;
}

export interface ExamTemplateCoverage {
  name: string;
  type: string;
  need: number;
  available: number | null;
}

export interface ExamTemplate {
  id: string;
  subjectId: string;
  name: string;
  description: string;
  config: { sections: ExamTemplateSection[] };
  totalScore: number;
  duration: number;
  subject: Subject;
  coverage?: ExamTemplateCoverage[];
}

export interface ExamQuestion {
  id: string;
  examId: string;
  questionId: string;
  userAnswer?: string;
  score?: number;
  isCorrect?: boolean;
  question: Question;
}

export interface Exam {
  id: string;
  userId: string;
  templateId: string;
  score?: number;
  rank?: number;
  startTime: string;
  endTime?: string;
  status: 'in_progress' | 'completed';
  createdAt: string;
  template: ExamTemplate;
  questions: ExamQuestion[];
  missingSections?: string[];
}

// 成就相关
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

// 学习诊断
export interface DiagnosticPoint {
  code: string;
  name: string;
  mastery: number;
}

export interface Diagnostic {
  id: string;
  subjectId: string;
  subjectName: string;
  diagnosis: {
    summary: string;
    metrics: {
      exerciseCount: number;
      exerciseAccuracy: number;
      examCount: number;
      examAvgAccuracy: number | null;
      avgMastery: number;
      pendingWrong: number;
      recitationItems: number;
    };
    weak: DiagnosticPoint[];
    strong: DiagnosticPoint[];
  };
  suggestions: string[];
  createdAt: string;
}

// 每周学习报告
export interface WeeklyReport {
  id: string;
  weekNumber: number;
  year: number;
  totalTime: number;
  exerciseCount: number;
  accuracy: number;
  highlights: string[];
  improvements: string[];
  createdAt: string;
}

// 资料库
export interface Resource {
  id: string;
  name: string;
  type: string;
  url: string;
  description?: string;
  subjectId?: string;
  createdAt: string;
}

// 作文
export interface Essay {
  id: string;
  subjectId: string;
  title: string;
  content: string;
  type: string;
  createdAt: string;
  reviews: EssayReview[];
}

export interface EssayReview {
  id: string;
  essayId: string;
  score: number;
  comment: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  reviewedAt: string;
}
