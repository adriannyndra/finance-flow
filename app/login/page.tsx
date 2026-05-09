'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, User } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('--- Login Attempt Details ---');
      console.log('Username:', username);
      // Avoid logging password but check if it's empty
      console.log('Password provided:', password ? 'YES' : 'NO');
      
      const { data, error: queryError, count, status, statusText } = await supabase
        .from('ff_user')
        .select('*', { count: 'exact' })
        .eq('username', username)
        .eq('password', password);

      console.log('Response Status:', status, statusText);
      console.log('Response Data:', data);
      console.log('Response Count:', count);
      
      if (queryError) {
        console.error('Supabase Query Error Object:', JSON.stringify(queryError, null, 2));
        throw new Error(`Database error: ${queryError.message} (${queryError.code})`);
      }

      if (!data || data.length === 0) {
        console.warn('Login failed: No matching user found. This could be incorrect credentials OR RLS blocking the read.');
        throw new Error('Username atau password salah');
      }

      const user = data[0];
      console.log('Login SUCCESS for user ID:', user.id);

      // Set manual session cookie with broader compatibility for local network IPs
      document.cookie = `user_session=${user.id}; path=/; max-age=3600`;
      
      // Use window.location for a harder redirect to ensure cookies are picked up on network IPs
      window.location.href = '/dashboard';
    } catch (err: any) {
      console.error('Caught Exception:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">FinanceFlow</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">Login cak</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Username"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Password"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sedang Masuk...
              </>
            ) : (
              'Masuk'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
