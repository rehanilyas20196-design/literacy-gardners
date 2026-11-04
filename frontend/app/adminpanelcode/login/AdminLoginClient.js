'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Reveal from '@/components/Reveal';

export default function AdminLoginClient() {
  const router = useRouter();
  const [form, setForm] = useState({ username: 'admin', password: 'admin' });
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setState('sending');
    setError('');
    try {
      const result = await api.login({
        email: form.username,
        password: form.password,
      });
      if (result.user && result.user.role !== 'admin') {
        api.logout();
        setError('Access denied — admin account required.');
        setState('idle');
        return;
      }
      router.push('/adminpanelcode');
    } catch (err) {
      setState('error');
      setError(err.message || 'Login failed');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <Reveal className="w-full md:w-[440px] p-6">
        <div className="card p-8 md:p-12 mx-auto">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-primary text-white rounded-full grid place-items-center font-bold text-lg mx-auto mb-4">
              L
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-ink">
              Admin Login
            </h2>
            <p className="text-ink/60 mt-2">
              Literacy Gardeners — Publishing House Administration
            </p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div className="field">
              <label htmlFor="admin-username" className="block text-sm font-medium mb-2">
                Username
              </label>
              <input
                id="admin-username"
                type="text"
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="field">
              <label htmlFor="admin-password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            {error && (
              <p className="text-sm text-error bg-red-50 px-4 py-2 rounded-lg border border-red-100">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={state === 'sending'}
              className="w-full rounded-lg bg-ink text-white text-sm font-medium py-3.5 hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {state === 'sending' ? 'Signing in…' : 'Sign In'}
            </button>
            <p className="text-xs text-ink/45 text-center font-mono mt-4">
              Default: admin / admin
            </p>
          </form>

          <div className="mt-8 text-center border-t border-border pt-6">
            <Link
              href="/"
              className="text-sm text-ink/60 hover:text-primary transition-colors"
            >
              ← Back to website
            </Link>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
