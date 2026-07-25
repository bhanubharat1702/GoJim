'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { superAdminApi, authApi } from '@/lib/api';
import Link from 'next/link';
import { Mail, Lock, Phone, KeyRound, Eye, EyeOff, X } from 'lucide-react';

export default function LoginPage() {
  const [appName, setAppName] = useState('goJim');
  const [isMaintenance, setIsMaintenance] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedError = localStorage.getItem('gojim_login_error');
      if (savedError) {
        setError(savedError);
        localStorage.removeItem('gojim_login_error');
      }
    }

    superAdminApi.getPublicSettings()
      .then(res => {
        if (res.success) {
          if (res.data?.appName) {
            setAppName(res.data.appName);
          }
          if (res.data?.maintenanceMode) {
            setIsMaintenance(true);
            setError('system under maintainence please try after sometime');
          }
        }
      })
      .catch(() => {});
  }, []);

  const [showSessionModal, setShowSessionModal] = useState(false);
  const [forgotStep, setForgotStep] = useState('login'); // login, phone, reset
  const [resetToken, setResetToken] = useState('');
  const [form, setForm] = useState({ email: '', password: '', phone: '', otp: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const { user, login, logout, isAuthenticated } = useAuth();
  const router = useRouter();

  // Check URL parameters for password reset token
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const step = urlParams.get('step');
      const token = urlParams.get('token');
      if (step === 'reset' && token) {
        setForgotStep('reset');
        setResetToken(token);
        // Clean query parameters from URL without reload
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, []);

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'superadmin') {
        router.push('/super-admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, user, router]);

  // Security enhancement: Auto-hide password after 2 seconds
  useEffect(() => {
    if (showPassword) {
      const hideTimer = setTimeout(() => {
        setShowPassword(false);
      }, 2000);
      return () => clearTimeout(hideTimer);
    }
  }, [showPassword]);

  // Auto-hide error message after 7 seconds
  useEffect(() => {
    if (error && !isMaintenance) {
      const errorTimer = setTimeout(() => {
        setError('');
      }, 7000);
      return () => clearTimeout(errorTimer);
    }
  }, [error, isMaintenance]);

  // Reset attempted submit and error when step changes
  useEffect(() => {
    setAttemptedSubmit(false);
    setError('');
  }, [forgotStep]);

  const navLinks = [
    { name: 'Home', href: '/#home', id: 'home' },
    { name: 'Features', href: '/#features', id: 'features' },
    { name: 'Pricing', href: '/#pricing', id: 'pricing' },
    { name: 'Testimonials', href: '/#testimonials', id: 'testimonials' },
    { name: 'Facilities', href: '/#facilities', id: 'facilities' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    setError('');

    if (forgotStep === 'login') {
      if (!form.email.trim() || !form.password.trim()) {
        return setError('Please enter both email/phone number and password.');
      }
    }

    setLoading(true);
    try {
      if (forgotStep === 'login') {
        const result = await login(form.email, form.password);
        if (result?.requiresConfirmation) {
          setShowSessionModal(true);
        } else if (result?.success) {
          if (result.user?.role === 'superadmin') {
            router.push('/super-admin');
          } else {
            sessionStorage.setItem('just_logged_in', 'true');
            router.push('/dashboard');
          }
        }
      } else if (forgotStep === 'phone') {
        if (!form.email) throw new Error('Email address is required');
        const res = await authApi.forgotPassword({ email: form.email });
        if (res.success) {
          setError(res.message || 'Password reset link sent to your email successfully.');
          setForm({ ...form, email: '' });
        }
      } else if (forgotStep === 'reset') {
        if (form.newPassword !== form.confirmPassword) throw new Error('Passwords do not match');
        if (form.newPassword.length < 6) throw new Error('Password must be at least 6 characters');
        
        const res = await authApi.resetPassword(resetToken, { password: form.newPassword });
        if (res.success) {
          setForgotStep('login');
          setError('Password reset successfully! Please log in.');
          setForm({ ...form, newPassword: '', confirmPassword: '' });
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderForm = () => {
    if (isAuthenticated) {
      return (
        <div className="text-center py-12 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin mb-6" />
          <h3 className="text-xl font-bold text-white mb-2">Redirecting...</h3>
          <p className="text-xs text-text-muted">Taking you to your dashboard</p>
        </div>
      );
    }

    if (forgotStep === 'login') {
      return (
        <div className="space-y-4">
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted transition-colors group-focus-within:text-accent" />
            <input
              type="text"
              placeholder="Email or Phone Number"
              className={`bg-black/40 pl-12 pr-12 transition-all w-full ${
                attemptedSubmit && !form.email.trim()
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-white/5 focus:border-accent'
              }`}
              value={form.email}
              onChange={e => {
                setForm({ ...form, email: e.target.value });
                setError('');
              }}
              required
            />
          </div>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted transition-colors group-focus-within:text-accent" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              className={`bg-black/40 pl-12 pr-12 transition-all w-full ${
                attemptedSubmit && !form.password.trim()
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-white/5 focus:border-accent'
              }`}
              value={form.password}
              onChange={e => {
                setForm({ ...form, password: e.target.value });
                setError('');
              }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(p => !p)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-accent transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex justify-end mt-1 px-1">
            <button
              type="button"
              onClick={() => setForgotStep('phone')}
              className="text-[10px] text-text-muted hover:text-accent font-bold uppercase tracking-tighter"
            >
              Forgot Password?
            </button>
          </div>
        </div>
      );
    }

    if (forgotStep === 'phone') {
      return (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-white">Reset Password</h3>
            <p className="text-xs text-gray-500 mt-1">Enter your registered email address</p>
          </div>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted transition-colors group-focus-within:text-accent" />
            <input
              type="email"
              placeholder="Email Address"
              className={`bg-black/40 pl-12 transition-all w-full ${
                attemptedSubmit && !form.email.trim()
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-white/5 focus:border-accent'
              }`}
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <button
            type="button"
            onClick={() => setForgotStep('login')}
            className="text-[10px] text-text-muted hover:text-text-primary font-bold uppercase tracking-widest w-full text-center"
          >
            ← Back to Login
          </button>
        </div>
      );
    }

    if (forgotStep === 'reset') {
      return (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-white">New Password</h3>
            <p className="text-xs text-gray-500 mt-1">Create a secure password</p>
          </div>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted transition-colors group-focus-within:text-accent" />
            <input
              type="password"
              placeholder="New Password"
              className={`bg-black/40 pl-12 transition-all w-full ${
                attemptedSubmit && !form.newPassword.trim()
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-white/5 focus:border-accent'
              }`}
              value={form.newPassword}
              onChange={e => setForm({ ...form, newPassword: e.target.value })}
              required
              minLength={6}
            />
          </div>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted transition-colors group-focus-within:text-accent" />
            <input
              type="password"
              placeholder="Confirm Password"
              className={`bg-black/40 pl-12 transition-all w-full ${
                attemptedSubmit && !form.confirmPassword.trim()
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-white/5 focus:border-accent'
              }`}
              value={form.confirmPassword}
              onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
              required
              minLength={6}
            />
          </div>
        </div>
      );
    }
  };

  const getButtonText = () => {
    if (loading) return 'PROCESSING...';
    if (forgotStep === 'login') return 'LOG IN →';
    if (forgotStep === 'phone') return 'SEND RESET LINK →';
    if (forgotStep === 'reset') return 'RESET PASSWORD →';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-primary">

      {/* Floating Navbar */}
      <nav className="fixed top-6 left-0 right-0 z-[999] flex justify-center px-4">
        <div
          className="w-full max-w-5xl border border-white/10 rounded-2xl px-6 md:px-8 py-3 flex items-center justify-between shadow-2xl"
          style={{
            backgroundColor: 'rgba(22, 22, 23, 0.72)',
            backdropFilter: 'saturate(180%) blur(20px)',
            WebkitBackdropFilter: 'saturate(180%) blur(20px)'
          }}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 no-underline">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-base shadow-inner">
              💪
            </div>
            <span className="font-extrabold text-xl tracking-tight text-text-primary">{appName}</span>
          </Link>

          {/* Links (Desktop) */}
          <div className="hidden md:flex items-center gap-1 text-[13px] font-semibold">
            {navLinks.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                className="px-4 py-2 rounded-lg transition-all duration-300 text-gray-400 hover:text-white hover:bg-white/5"
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-block px-4 py-2 text-[13px] font-semibold transition-all duration-300 rounded-lg text-accent bg-accent/10"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2.5 text-[13px] font-extrabold rounded-xl transition-all shadow-2xl hover:scale-[1.02] active:scale-95 bg-accent text-black shadow-lg shadow-accent/20 hover:shadow-accent/40"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/3 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 mt-20">
        <div className="card !p-8 border-white/5 bg-bg-card/80 backdrop-blur-xl">
          {!isAuthenticated && forgotStep === 'login' && (
            <div className="flex gap-2 mb-8 bg-black/40 rounded-2xl p-1.5 border border-white/5">
              <div className="flex-1 py-3 text-center rounded-xl text-[13px] font-bold bg-accent text-black shadow-lg shadow-accent/30 cursor-pointer">
                Log In
              </div>
              <Link href="/signup" className="flex-1 py-3 text-center rounded-xl text-[13px] font-bold transition-all duration-300 cursor-pointer text-text-muted hover:text-text-primary hover:bg-white/5">
                Sign Up
              </Link>
            </div>
          )}

          {error && (
            <div className={`mb-6 p-4 rounded-xl border text-xs font-medium relative flex items-center justify-between gap-4 ${error.includes('successfully') ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
              <span className="flex-1">{error}</span>
              <button
                type="button"
                onClick={() => setError('')}
                className="text-text-muted hover:text-white transition-colors p-1 rounded hover:bg-white/5 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {renderForm()}

            {!isAuthenticated && (
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-accent hover:bg-accent-light text-black text-sm font-black rounded-xl transition-all shadow-lg shadow-accent/20 hover:shadow-accent/40 hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {getButtonText()}
              </button>
            )}
          </form>

        </div>
      </div>

      {/* Active Session Confirmation Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-bg-card border border-white/10 p-6 rounded-2xl max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xl mx-auto">
              ⚠️
            </div>
            <h3 className="text-lg font-bold text-white">Active Session Detected</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              You are already logged in on another device. Would you like to log out the other device and continue logging in here?
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSessionModal(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowSessionModal(false);
                  setLoading(true);
                  try {
                    const res = await login(form.email, form.password, true);
                    if (res?.success) {
                      if (res.user?.role === 'superadmin') {
                        router.push('/super-admin');
                      } else {
                        sessionStorage.setItem('just_logged_in', 'true');
                        router.push('/dashboard');
                      }
                    }
                  } catch (err) {
                    setError(err.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-accent text-black text-xs font-black shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Continue & Log In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
