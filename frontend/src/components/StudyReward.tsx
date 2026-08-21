import { useEffect } from 'react';
import { Sparkles, Star } from 'lucide-react';

interface StudyRewardProps {
  open: boolean;
  title: string;
  message?: string;
  icon?: string;
  onClose: () => void;
}

export function StudyReward({ open, title, message, icon = '🌟', onClose }: StudyRewardProps) {
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(onClose, 3200);
    return () => window.clearTimeout(timer);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="reward-overlay" role="status" aria-live="polite" onClick={onClose}>
      <div className="reward-burst reward-burst-a">✦</div>
      <div className="reward-burst reward-burst-b">✦</div>
      <div className="reward-burst reward-burst-c">✦</div>
      <div className="reward-card" onClick={(event) => event.stopPropagation()}>
        <div className="reward-icon">{icon}</div>
        <div className="mb-2 flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-[0.2em] text-primary">
          <Sparkles size={14} /> 学习进度 +1
        </div>
        <h2 className="text-2xl font-black text-ink dark:text-white">{title}</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-300">{message || '你没有偷懒，今天的自己又进步了一点！'}</p>
        <div className="mt-4 flex items-center justify-center gap-2 text-accent">
          <Star size={16} fill="currentColor" />
          <span className="text-xs font-bold">继续保持这个节奏</span>
          <Star size={16} fill="currentColor" />
        </div>
        <button className="btn-primary mt-5 w-full" onClick={onClose}>继续学习</button>
      </div>
    </div>
  );
}
