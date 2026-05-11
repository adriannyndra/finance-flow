'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { LogOut, Loader2, Lock, Mail, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [emailMessage, setEmailMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setCurrentEmail(user.email);
        setNewEmail(user.email);
      }
    }
    getUser();
  }, [supabase]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Password berhasil diubah!' });
      setNewPassword('');
      
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmail === currentEmail) return;
    
    setEmailLoading(true);
    setEmailMessage(null);

    try {
      // Supabase will send a verification link to the new email 
      // AND a change confirmation to the old email by default settings.
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) throw error;

      setEmailMessage({ 
        type: 'success', 
        text: 'Permintaan perubahan email berhasil! Silakan cek kotak masuk email lama AND email baru Anda untuk konfirmasi.' 
      });
      
    } catch (err: any) {
      setEmailMessage({ type: 'error', text: err.message });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Clear the user_session cookie
    document.cookie = 'user_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    router.push('/login');
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Settings</h2>
        <p className="text-zinc-500 dark:text-zinc-400">Manage your account and preferences</p>
      </div>

      {/* Email Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 overflow-hidden">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Mail className="w-5 h-5 text-emerald-600" />
            Alamat Email
          </h3>
          <p className="text-sm text-zinc-500 mt-1">Ganti alamat email akun Anda.</p>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleEmailChange} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Email Baru</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="email@baru.com"
                required
              />
            </div>

            {emailMessage && (
              <div className={`p-4 rounded-lg text-sm border flex gap-2 ${
                emailMessage.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                  : 'bg-rose-50 border-rose-200 text-rose-600'
              }`}>
                {emailMessage.type === 'success' && <AlertCircle className="w-5 h-5 shrink-0" />}
                {emailMessage.text}
              </div>
            )}

            <button
              type="submit"
              disabled={emailLoading || newEmail === currentEmail}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {emailLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Memproses...
                </>
              ) : (
                'Update Email'
              )}
            </button>
            <p className="text-[11px] text-zinc-500 italic">
              * Tautan verifikasi akan dikirim ke email lama dan email baru untuk mengonfirmasi perubahan.
            </p>
          </form>
        </div>
      </div>

      {/* Password Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 overflow-hidden">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-600" />
            Keamanan Akun
          </h3>
          <p className="text-sm text-zinc-500 mt-1">Ganti password Anda secara berkala untuk menjaga keamanan akun.</p>
        </div>
        
        <div className="p-6">
          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Password Baru</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Minimal 6 karakter"
                required
                minLength={6}
              />
            </div>

            {message && (
              <div className={`p-4 rounded-lg text-sm border ${
                message.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                  : 'bg-rose-50 border-rose-200 text-rose-600'
              }`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Password Baru'
              )}
            </button>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 overflow-hidden">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            Sesi
          </h3>
          <p className="text-sm text-zinc-500 mt-1">Keluar dari akun Anda.</p>
        </div>
        <div className="p-6">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-rose-600 font-bold hover:text-rose-500 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout dari Aplikasi
          </button>
        </div>
      </div>
    </div>
  );
}