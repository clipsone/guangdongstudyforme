import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'zh-CN' | 'en-US';
type Dictionary = Record<string, string>;
const dictionaries: Record<Language, Dictionary> = {
  'zh-CN': { home: '首页', learn: '学习', law: '法学知识库', practice: '练习', micro: '微学习', exam: '模考', wrong: '错题', recitation: '背诵', ai: 'AI 助手', profile: '我的', workspace: '工作台', courses: '课程', universityExam: '模拟考试', resources: '资料', analytics: '学习分析', admin: '管理后台', springBrand: '春考精准冲刺', universityBrand: '大学法学学习助手', language: 'English', switchTheme: '切换主题' },
  'en-US': { home: 'Home', learn: 'Learn', law: 'Law Library', practice: 'Practice', micro: 'Micro Learn', exam: 'Mock Exam', wrong: 'Mistakes', recitation: 'Recall', ai: 'AI Assistant', profile: 'Profile', workspace: 'Workspace', courses: 'Courses', universityExam: 'Mock Exams', resources: 'Materials', analytics: 'Analytics', admin: 'Admin', springBrand: 'Spring Exam Sprint', universityBrand: 'Undergraduate Law', language: '中文', switchTheme: 'Toggle theme' },
};
interface LanguageContextValue { language: Language; setLanguage: (language: Language) => void; toggleLanguage: () => void; t: (key: string) => string; }
const LanguageContext = createContext<LanguageContextValue | null>(null);
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => localStorage.getItem('language') === 'en-US' ? 'en-US' : 'zh-CN');
  useEffect(() => { localStorage.setItem('language', language); document.documentElement.lang = language; }, [language]);
  const value = useMemo(() => ({ language, setLanguage, toggleLanguage: () => setLanguage((prev) => prev === 'zh-CN' ? 'en-US' : 'zh-CN'), t: (key: string) => dictionaries[language][key] || dictionaries['zh-CN'][key] || key }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function useLanguage() { const context = useContext(LanguageContext); if (!context) throw new Error('useLanguage must be used within LanguageProvider'); return context; }
