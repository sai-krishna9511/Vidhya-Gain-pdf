import React, { useState } from 'react';
import { X, Lock, Key, ShieldAlert } from 'lucide-react';

interface AdminLoginModalProps {
  onClose: () => void;
  onSuccess: (token: string, user: any) => void;
  onError: (message: string) => void;
}

export default function AdminLoginModal({ onClose, onSuccess, onError }: AdminLoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    // FRONTEND BYPASS: Stops it from asking Netlify for the backend
    if (email === 'saikrishnakondamudhi@gmail.com' && (password === 'Saikrishna@99511' || password === 'saikrishna@99511')) {
        onSuccess('fake-frontend-token-123', { 
            id: 'admin-1', 
            email: 'saikrishnakondamudhi@gmail.com', 
            role: 'admin' 
        });
        onClose();
        setLoading(false);
        return;
    }

    setError('Invalid admin credentials.');
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden relative animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="p-6 space-y-5">
          <div className="text-center flex flex-col items-center">
            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-3">
              <Lock size={22} className="text-indigo-600 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Administrator Portal</h3>
            <p className="text-xs text-slate-500 mt-1">
              Restricted system administrator access only. Unauthorized access is strictly logged.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <ShieldAlert size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Admin Email
              </label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter admin email"
                required
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-800 rounded-xl p-3 text-xs outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Security Password
              </label>
              <div className="relative">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-800 rounded-xl p-3 text-xs outline-none transition-all pr-10"
                />
                <Key size={14} className="absolute right-3 top-3.5 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md shadow-indigo-100 disabled:opacity-50 cursor-pointer uppercase tracking-wider"
            >
              {loading ? 'Authenticating...' : 'Secure Authorization Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}