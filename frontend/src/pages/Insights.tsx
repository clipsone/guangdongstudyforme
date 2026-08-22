import { useEffect, useState } from 'react';
import { Activity, CalendarClock, LineChart, RefreshCw, Target, TrendingUp } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { diagnosticService } from '@/services/diagnosticService';
import { weeklyReportService } from '@/services/weeklyReportService';
import { statisticsService } from '@/services/statisticsService';
import { LineTrendChart } from '@/components/Charts';
import { fmtDate } from '@/utils/date';
import type { Diagnostic, WeeklyReport } from '@/types';

type Tab = 'diagnose' | 'report' | 'history';

export default function Insights() {
  const { userId } = useUser();
  const [tab, setTab] = useState<Tab>('diagnose');
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [history, setHistory] = useState<Array<{ date: string; mastery: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const [d, r, h] = await Promise.all([
        diagnosticService.getDiagnostics(userId),
        weeklyReportService.getReports(userId),
        statisticsService.getMasteryHistory(userId, 90),
      ]);
      setDiagnostics(d.data);
      setReports(r.data);
      setHistory(h.data);
    } catch (e: any) {
      setError(e?.error?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [userId]);

  const runDiagnostic = async () => {
    if (!userId) return;
    setGenerating(true);
    try {
      const res = await diagnosticService.generate(userId);
      setDiagnostics(res.data);
      setTab('diagnose');
    } catch (e: any) {
      setError(e?.error?.message || '诊断生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const runReport = async () => {
    if (!userId) return;
    setGenerating(true);
    try {
      const res = await weeklyReportService.generate(userId);
      setReports([res.data, ...reports]);
      setTab('report');
    } catch (e: any) {
      setError(e?.error?.message || '周报生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const tabs: Array<[Tab, string]> = [
    ['diagnose', '🔍 学习诊断'],
    ['report', '📊 每周报告'],
    ['history', '📈 掌握度趋势'],
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">🧠 数据洞察</h2>
        <div className="flex gap-2">
          <button className="btn-outline text-sm" disabled={generating} onClick={runDiagnostic}>
            <Activity size={14} /> {generating ? '生成中…' : '重新诊断'}
          </button>
          <button className="btn-outline text-sm" disabled={generating} onClick={runReport}>
            <CalendarClock size={14} /> 生成周报
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-error/10 p-3 text-sm text-error">{error}</div>}

      <div className="grid grid-cols-3 gap-2">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-lg border px-2 py-2.5 text-xs font-medium sm:text-sm ${
              tab === key ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500 dark:border-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">加载中…</div>
      ) : tab === 'diagnose' ? (
        <div className="space-y-4">
          {diagnostics.length === 0 ? (
            <div className="card p-10 text-center">
              <Activity size={40} className="mx-auto mb-3 text-gray-300" />
              <div className="mb-4 text-sm text-gray-500">还没有诊断报告，点击右上角「重新诊断」生成</div>
              <button className="btn-primary" onClick={runDiagnostic} disabled={generating}>
                <Activity size={15} /> 生成学习诊断
              </button>
            </div>
          ) : (
            diagnostics.map((d) => (
              <div key={d.id} className="card space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <div className="font-bold">{d.subjectName}诊断</div>
                  <span className="text-xs text-gray-400">{fmtDate(d.createdAt)}</span>
                </div>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{d.diagnosis.summary}</p>
                <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                  <Metric label="练习正确率" value={`${d.diagnosis.metrics.exerciseAccuracy}%`} />
                  <Metric label="掌握度" value={`${d.diagnosis.metrics.avgMastery}%`} />
                  <Metric label="模考" value={d.diagnosis.metrics.examCount ? `${d.diagnosis.metrics.examAvgAccuracy}%` : '未参加'} />
                  <Metric label="待消化错题" value={`${d.diagnosis.metrics.pendingWrong} 题`} />
                </div>
                {d.diagnosis.weak.length > 0 && (
                  <div>
                    <div className="mb-1 text-xs font-semibold text-error">薄弱考点</div>
                    <div className="flex flex-wrap gap-1.5">
                      {d.diagnosis.weak.map((w) => (
                        <span key={w.code} className="chip bg-error/10 text-error">{w.name} {w.mastery}%</span>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <div className="mb-1 text-xs font-semibold text-gray-500">建议</div>
                  <ul className="space-y-1">
                    {d.suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                        <Target size={13} className="mt-0.5 shrink-0 text-primary" /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))
          )}
        </div>
      ) : tab === 'report' ? (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="card p-10 text-center">
              <CalendarClock size={40} className="mx-auto mb-3 text-gray-300" />
              <div className="mb-4 text-sm text-gray-500">还没有周报，点击右上角「生成周报」</div>
              <button className="btn-primary" onClick={runReport} disabled={generating}>
                <CalendarClock size={15} /> 生成本周报告
              </button>
            </div>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-bold">📊 {r.year} 年第 {r.weekNumber} 周学习报告</div>
                  <span className="text-xs text-gray-400">{fmtDate(r.createdAt)}</span>
                </div>
                <div className="mb-4 grid grid-cols-3 gap-2 text-center">
                  <Metric label="练习量" value={`${r.exerciseCount} 题`} />
                  <Metric label="正确率" value={`${r.accuracy}%`} />
                  <Metric label="学习时长" value={`${Math.round(r.totalTime / 60)} min`} />
                </div>
                <div className="mb-3 space-y-1">
                  {r.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                      <TrendingUp size={13} className="mt-0.5 shrink-0 text-primary" /> {h}
                    </div>
                  ))}
                </div>
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                  <div className="mb-1 text-xs font-semibold text-gray-500">下周建议</div>
                  {r.improvements.map((s, i) => (
                    <div key={i} className="text-sm text-gray-600 dark:text-gray-300">• {s}</div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-1.5 font-semibold">
            <LineChart size={16} className="text-primary" /> 三科平均掌握度趋势
          </div>
          {history.length >= 2 ? (
            <LineTrendChart data={history.map((p) => p.mastery)} labels={history.map((p) => p.date.slice(5))} name="掌握度" />
          ) : (
            <div className="py-12 text-center text-sm text-gray-400">
              {history.length === 1
                ? `当前平均掌握度 ${history[0].mastery}%。多做练习后每周会自动记录快照，形成趋势曲线。`
                : '暂无掌握度数据，先去练习几组题吧'}
            </div>
          )}
          <div className="mt-3 text-xs text-gray-400">
            <RefreshCw size={11} className="mr-1 inline" /> 快照每周自动记录一次（练习/模考后更新）
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-900">
      <div className="text-sm font-bold text-primary">{value}</div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  );
}
