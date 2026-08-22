/** 距离考试天数（默认 2027-01-10，⚠️ 以官方公布为准） */
export function daysUntil(dateStr?: string): number {
  const target = dateStr ? new Date(dateStr) : new Date('2027-01-10');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((target.getTime() - today.getTime()) / 86400000));
}

/** 格式化日期 YYYY-MM-DD */
export function fmtDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 掌握状态中文 */
export function statusLabel(s: string): string {
  return { pending: '未学', learning: '学习中', mastered: '已掌握' }[s] || s;
}

/** 状态颜色（Tailwind class） */
export function statusColor(s: string): string {
  return {
    pending: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    learning: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    mastered: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  }[s] || 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
}

/** 出题频次标签 */
export function freqLabel(f: number): string {
  if (f >= 8) return '高频 🔥';
  if (f >= 4) return '中频 ⚡';
  return '低频 🌱';
}

/** 题目类型中文 */
export function questionTypeLabel(t: string): string {
  return { choice: '单项/多项选择题', fill: '名词解释/简答题', essay: '案例分析/法律文书题', composite: '综合题' }[t] || t;
}

/** 艾宾浩斯阶段标签 */
export const STAGE_LABEL: Record<number, string> = { 1: '第1天', 2: '第2天', 4: '第4天', 7: '第7天', 15: '第15天' };
