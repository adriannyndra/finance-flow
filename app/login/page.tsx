'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, Mail } from 'lucide-react'; // Swapped User for Mail

export default function LoginPage() {
  const [email, setEmail] = useState(''); // Changed from username
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null); // For success messages
  const router = useRouter();
  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError(null);
      setMessage(null);

      try {
        if (isRegister) {
          const { data, error: regError } = await supabase.auth.signUp({
            email: email,
            password: password,
          });

          if (regError) throw new Error(regError.message); 
          
          if (data.user) {
            document.cookie = `user_session=${data.user.id}; path=/; max-age=31536000; SameSite=Lax`;
          }
          
          // Note: If you turned Email Confirmations back ON, tell them to check their email here.
          window.location.href = '/dashboard';
          
        } else {
          const { data, error: loginError } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
          });
          
          if (loginError) throw new Error('Email atau password salah');
          
          if (data.user) {
            document.cookie = `user_session=${data.user.id}; path=/; max-age=31536000; SameSite=Lax`;
          }
          
          window.location.href = '/dashboard';
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Masukkan email Anda di atas, lalu klik Lupa Password.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setMessage(null);

    // This tells Supabase to send an email with a link that points to your new page
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Link reset password telah dikirim ke email Anda!');
    }
    setLoading(false);
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
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="email@domain.com"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Password
              </label>
              {!isRegister && (
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-xs text-emerald-600 hover:text-emerald-500 font-medium"
                >
                  Lupa Password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="password"
                required={!isRegister && message ? false : true} // Don't require pass if they just want a reset link
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Minimal 6 karakter"
                minLength={6}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-sm">
              {error}
            </div>
          )}
          {message && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm">
              {message}
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
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
              setMessage(null);
            }}
            className="text-sm text-emerald-600 hover:text-emerald-500 font-medium"
          >
            {isRegister ? 'Sudah punya akun? Login' : 'Belum punya akun? Daftar'}
          </button>
        </div>
      </div>
    </div>
  );
}