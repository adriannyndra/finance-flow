'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, User } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        // Check if username already exists
        const { data: existingUser } = await supabase
          .from('ff_user')
          .select('id')
          .eq('username', username)
          .maybeSingle();

        if (existingUser) {
          throw new Error('Username sudah digunakan');
        }

        // Register new user
        const { data: newUser, error: regError } = await supabase
          .from('ff_user')
          .insert([{ username, password }])
          .select()
          .single();

        if (regError) throw regError;
        
        // Auto login after register
        document.cookie = `user_session=${newUser.id}; path=/; max-age=3600`;
        window.location.href = '/dashboard';
      } else {
        // Login logic
        const { data, error: queryError } = await supabase
          .from('ff_user')
          .select('*')
          .eq('username', username)
          .eq('password', password)
          .maybeSingle();
        
        if (queryError) throw queryError;

        if (!data) {
          throw new Error('Username atau password salah');
        }

        document.cookie = `user_session=${data.id}; path=/; max-age=3600`;
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
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
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">
            {isRegister ? 'Buat akun baru' : 'Login cak'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
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
                {isRegister ? 'Sedang Mendaftar...' : 'Sedang Masuk...'}
              </>
            ) : (
              isRegister ? 'Daftar' : 'Masuk'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-sm text-emerald-600 hover:text-emerald-500 font-medium"
          >
            {isRegister ? 'Sudah punya akun? Login' : 'Belum punya akun? Daftar'}
          </button>
        </div>
      </div>
    </div>
  );
}
