import React, { useState } from 'react';
import { X, Mail, Lock, ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';
import { User } from '../types';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (token: string, user: User) => void;
  onError: (msg: string) => void;
}

export default function AuthModal({ onClose, onSuccess, onError }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      onError('Please fill in all details.');
      return;
    }

    setLoading(true);
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      onSuccess(data.token, data.user);
      onClose();
    } catch (err: any) {
      onError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (quickEmail: string, quickPass: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: quickEmail, password: quickPass }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      onSuccess(data.token, data.user);
      onClose();
    } catch (err: any) {
      onError(err.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-150 animate-scale-up relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="p-6 space-y-5">
          <div className="text-center">
            <h3 className="text-xl font-extrabold text-slate-800">
              {isLogin ? 'Welcome Back' : 'Create Free Account'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {isLogin ? 'Log in to track your documents and active subscriptions.' : 'Sign up to unlock 3 free daily tool credits.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="name@company.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium text-slate-700"
                />
                <Mail size={14} className="absolute left-3 top-3.5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium text-slate-700"
                />
                <Lock size={14} className="absolute left-3 top-3.5 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-100 flex items-center justify-center space-x-1"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? 'Log In' : 'Sign Up'}</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Quick Login Section */}
          {isLogin && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="block text-[10px] font-bold text-slate-400 uppercase text-center tracking-wider">Demo Sandbox Accounts</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleQuickLogin('user@vidhyagain.com', 'user123')}
                  className="p-2 border border-slate-200 hover:border-indigo-300 rounded-xl bg-slate-50/50 hover:bg-indigo-50/20 text-slate-600 hover:text-indigo-700 transition-colors flex flex-col items-center justify-center"
                >
                  <span className="text-[10px] font-bold">Free User</span>
                  <span className="text-[8px] font-normal opacity-70 mt-0.5">1 limit/day</span>
                </button>

                <button
                  onClick={() => handleQuickLogin('pro@vidhyagain.com', 'pro123')}
                  className="p-2 border border-indigo-200 hover:border-indigo-300 rounded-xl bg-indigo-50/20 hover:bg-indigo-50/35 text-indigo-700 transition-colors flex flex-col items-center justify-center"
                >
                  <span className="text-[10px] font-extrabold text-indigo-850">Pro User</span>
                  <span className="text-[8px] font-normal opacity-80 mt-0.5">Unlimited</span>
                </button>
              </div>
            </div>
          )}

          <div className="text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              {isLogin ? "Don't have an account? Sign up free" : 'Already have an account? Log in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
