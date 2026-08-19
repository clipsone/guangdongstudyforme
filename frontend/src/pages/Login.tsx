import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GraduationCap, Loader2 } from 'lucide-react';
import { authService, authStorage } from '@/services/authService';
import type { ApiError } from '@/types';

type Mode = 'login' | 'register';

export default function Login() {
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('请输入用户名和密码');
      return;
    }
    if (mode === 'register') {
      if (password.length < 6) {
        setError('密码至少 6 位');
        return;
      }
      if (password !== confirm) {
        setError('两次输入的密码不一致');
        return;
      }
    }
    setLoading(true);
    try {
      const res =
        mode === 'login'
          ? await authService.login(username.trim(), password)
          : await authService.register(username.trim(), password);
      const { token, user } = res.data;
      authStorage.setSession(token, user.id);
      navigate(from, { replace: true });
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.error?.message || '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center border-2 border-ink bg-accent">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">学习平台</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {mode === 'login' ? '登录后继续你的复习计划' : '注册一个专属账号，数据完全隔离'}
          </p>
        </div>

        <div className="card p-6">
          {/* 模式切换 */}
          <div className="mb-6 grid grid-cols-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError('');
                }}
                className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                  mode === m
                    ? 'bg-white text-primary shadow dark:bg-gray-700 dark:text-primary-light'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {m === 'login' ? '登录' : '注册'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">用户名</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="你的用户名"
                autoComplete="username"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? '至少 6 位' : '你的密码'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            {mode === 'register' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">确认密码</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="再输入一次密码"
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> 处理中…
                </>
              ) : mode === 'login' ? (
                '登 录'
              ) : (
                '注册并登录'
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
            {mode === 'login' ? '还没有账号？' : '已有账号？'}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
              }}
              className="ml-1 font-medium text-primary hover:underline"
            >
              {mode === 'login' ? '立即注册' : '去登录'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
