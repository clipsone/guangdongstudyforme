import { useEffect, useState } from 'react';
import { userService } from '@/services/userService';
import type { User } from '@/types';

// 单用户模式：获取当前用户（并缓存 id，供各页面使用）
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    userService.getMe()
      .then((res) => {
        if (!alive) return;
        setUser(res.data);
        localStorage.setItem('userId', res.data.id);
      })
      .catch(() => {
        // 后端不可用时回退占位符
        if (alive) setUser(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, []);

  return { user, loading, userId: user?.id || localStorage.getItem('userId') || '' };
}
