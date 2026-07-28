'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { superAdminApi, authApi } from '@/lib/api';
import Link from 'next/link';
import { Mail, Lock, Phone, KeyRound, Eye, EyeOff, X, ArrowLeft } from 'lucide-react';

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
  const [forceLogout, setForceLogout] = useState(false);
  const [forgotStep, setForgotStep] = useState('login'); // login, phone, reset
  const [resetToken, setResetToken] = useState('');
  const [form, setForm] = useState({ email: '', password: '', phone: '', otp: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const { user, login, logout, isAuthenticated } = useAuth();
  const router = useRouter();

  const handleNavigation = (targetUrl) => {
    setIsExiting(true);
    setTimeout(() => {
      router.push(targetUrl);
    }, 350);
  };

  // Intercept native browser back button / swipe back on mobile
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.pushState(null, null, window.location.href);
      const handlePopState = () => {
        window.history.pushState(null, null, window.location.href);
        if (forgotStep !== 'login') {
          setForgotStep('login');
        } else {
          handleNavigation('/');
        }
      };
      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [forgotStep]);

  // Check URL parameters for password reset token
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const step = urlParams.get('step');
      const token = urlParams.get('token');
      if (step === 'reset' && token) {
        setForgotStep('reset');
        setResetToken(token);
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

  // Security enhancement: Auto-hide password after 2.5 seconds
  useEffect(() => {
    if (showPassword) {
      const hideTimer = setTimeout(() => {
        setShowPassword(false);
      }, 2500);
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

  const renderErrorContent = (errText, isMobile = false) => {
    const isUnregistered = errText.toLowerCase().includes('is not registered with us') || 
                           errText.toLowerCase().includes('no user with that email');
    if (isUnregistered) {
      return (
        <span className="flex-1 leading-relaxed">
          mail is not registered with us.{' '}
          <button
            type="button"
            onClick={() => {
              setError('');
              if (isMobile) {
                handleNavigation('/signup');
              } else {
                router.push('/signup');
              }
            }}
            className="text-accent underline font-bold cursor-pointer bg-transparent border-none p-0 inline-block hover:text-accent-light"
          >
            Sign Up
          </button>
        </span>
      );
    }
    return <span className="flex-1 leading-relaxed">{errText}</span>;
  };

  const navLinks = [
    { name: 'Home', href: '/#home', id: 'home' },
    { name: 'Features', href: '/#features', id: 'features' },
    { name: 'Pricing', href: '/#pricing', id: 'pricing' },
    { name: 'Testimonials', href: '/#testimonials', id: 'testimonials' },
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
          setTimeout(() => {
            setForgotStep('login');
          }, 4000);
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
        <div className="text-center py-8 sm:py-12 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin mb-4" />
          <h3 className="text-lg sm:text-xl font-bold text-white mb-1">Redirecting...</h3>
          <p className="text-xs text-text-muted">Taking you to your gym dashboard</p>
        </div>
      );
    }

    if (forgotStep === 'login') {
      return (
        <div className="space-y-3.5 sm:space-y-4">
          <div className="relative group">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted transition-colors group-focus-within:text-accent" />
            <input
              type="text"
              placeholder="Email or Phone Number"
              className={`bg-black/50 text-sm sm:text-base pl-11 pr-4 py-3 sm:py-3.5 rounded-xl border transition-all w-full focus:outline-none ${
                attemptedSubmit && !form.email.trim()
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-white/10 focus:border-accent'
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
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted transition-colors group-focus-within:text-accent" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              className={`bg-black/50 text-sm sm:text-base pl-11 pr-11 py-3 sm:py-3.5 rounded-xl border transition-all w-full focus:outline-none ${
                attemptedSubmit && !form.password.trim()
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-white/10 focus:border-accent'
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
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-accent transition-colors p-1"
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex justify-end pt-0.5 px-0.5">
            <button
              type="button"
              onClick={() => setForgotStep('phone')}
              className="text-[11px] sm:text-[12px] text-text-muted hover:text-accent font-bold uppercase tracking-wider transition-colors"
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
          <div className="text-center mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-bold text-white">Reset Password</h3>
            <p className="text-xs text-gray-400 mt-1">Enter your registered email address to get reset password link</p>
          </div>
          <div className="relative group">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted transition-colors group-focus-within:text-accent" />
            <input
              type="email"
              placeholder="Email Address"
              className={`bg-black/50 text-sm sm:text-base pl-11 pr-4 py-3 sm:py-3.5 rounded-xl border transition-all w-full focus:outline-none ${
                attemptedSubmit && !form.email.trim()
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-white/10 focus:border-accent'
              }`}
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <button
            type="button"
            onClick={() => setForgotStep('login')}
            className="text-xs text-text-muted hover:text-text-primary font-bold uppercase tracking-widest w-full text-center py-2 flex items-center justify-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
          </button>
        </div>
      );
    }

    if (forgotStep === 'reset') {
      return (
        <div className="space-y-3.5 sm:space-y-4">
          <div className="text-center mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-bold text-white">New Password</h3>
            <p className="text-xs text-gray-400 mt-1">Create a secure password</p>
          </div>
          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted transition-colors group-focus-within:text-accent" />
            <input
              type="password"
              placeholder="New Password"
              className={`bg-black/50 text-sm sm:text-base pl-11 pr-4 py-3 sm:py-3.5 rounded-xl border transition-all w-full focus:outline-none ${
                attemptedSubmit && !form.newPassword.trim()
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-white/10 focus:border-accent'
              }`}
              value={form.newPassword}
              onChange={e => setForm({ ...form, newPassword: e.target.value })}
              required
              minLength={6}
            />
          </div>
          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted transition-colors group-focus-within:text-accent" />
            <input
              type="password"
              placeholder="Confirm Password"
              className={`bg-black/50 text-sm sm:text-base pl-11 pr-4 py-3 sm:py-3.5 rounded-xl border transition-all w-full focus:outline-none ${
                attemptedSubmit && !form.confirmPassword.trim()
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-white/10 focus:border-accent'
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

  const getButtonTextMobile = () => {
    if (loading) return 'PROCESSING...';
    if (forgotStep === 'login') return 'LOGIN →';
    if (forgotStep === 'phone') return 'SEND RESET LINK →';
    if (forgotStep === 'reset') return 'RESET PASSWORD →';
  };

  const renderFormMobile = () => {
    if (forgotStep === 'login') {
      return (
        <div className="space-y-3.5 sm:space-y-4">
          <div className={`flex items-center gap-3 bg-black border rounded-2xl md:rounded-xl px-4 py-3 md:py-3.5 transition-all w-full focus-within:border-accent ${
            attemptedSubmit && !form.email.trim()
              ? 'border-red-500/50'
              : 'border-neutral-200 dark:border-zinc-800'
          }`}>
            <Mail className="w-5 h-5 text-accent md:text-text-muted shrink-0" />
            <div className="flex-1 flex flex-col min-w-0">
              <span className="md:hidden text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5 leading-none">Email Address</span>
              <input
                type="text"
                placeholder=""
                className="bg-transparent text-white text-base outline-none border-none p-0 w-full font-normal leading-normal placeholder-transparent"
                value={form.email}
                onChange={e => {
                  setForm({ ...form, email: e.target.value });
                  setError('');
                }}
                required
              />
            </div>
          </div>
          <div className={`flex items-center gap-3 bg-black border rounded-2xl md:rounded-xl px-4 py-3 md:py-3.5 transition-all w-full relative focus-within:border-accent ${
            attemptedSubmit && !form.password.trim()
              ? 'border-red-500/50'
              : 'border-neutral-200 dark:border-zinc-800'
          }`}>
            <Lock className="w-5 h-5 text-accent md:text-text-muted shrink-0" />
            <div className="flex-1 flex flex-col min-w-0 pr-8">
              <span className="md:hidden text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5 leading-none">Password</span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder=""
                className="bg-transparent text-white text-base outline-none border-none p-0 w-full font-normal leading-normal placeholder-transparent"
                value={form.password}
                onChange={e => {
                  setForm({ ...form, password: e.target.value });
                  setError('');
                }}
                required
              />
            </div>
            <button
              type="button"
              onClick={() => setShowPassword(p => !p)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 md:text-text-muted hover:text-accent transition-colors p-1"
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center justify-between pt-0.5 px-0.5 text-xs sm:text-sm">
            <label className="flex items-center gap-2.5 cursor-pointer select-none text-neutral-500 dark:text-zinc-400 font-bold">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-all bg-black ${
                rememberMe ? 'border-accent text-accent' : 'border-neutral-400 dark:border-zinc-600'
              }`}>
                {rememberMe && (
                  <span className="text-accent text-[10px] font-black leading-none mt-[-1px]">✓</span>
                )}
              </div>
              Remember me
            </label>
            <button
              type="button"
              onClick={() => setForgotStep('phone')}
              className="text-accent md:text-text-muted hover:text-accent font-bold uppercase tracking-wider transition-colors"
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
          <div className={`flex items-center gap-3 bg-black border rounded-2xl md:rounded-xl px-4 py-3 md:py-3.5 transition-all w-full focus-within:border-accent ${
            attemptedSubmit && !form.email.trim()
              ? 'border-red-500/50'
              : 'border-neutral-200 dark:border-zinc-800'
          }`}>
            <Mail className="w-5 h-5 text-accent md:text-text-muted shrink-0" />
            <div className="flex-1 flex flex-col min-w-0">
              <span className="md:hidden text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5 leading-none">Email Address</span>
              <input
                type="email"
                placeholder=""
                className="bg-transparent text-white text-base outline-none border-none p-0 w-full font-normal leading-normal placeholder-transparent"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          </div>
        </div>
      );
    }

    if (forgotStep === 'reset') {
      return (
        <div className="space-y-3.5 sm:space-y-4">
          <div className={`flex items-center gap-3 bg-black border rounded-2xl md:rounded-xl px-4 py-3 md:py-3.5 transition-all w-full focus-within:border-accent ${
            attemptedSubmit && !form.newPassword.trim()
              ? 'border-red-500/50'
              : 'border-neutral-200 dark:border-zinc-800'
          }`}>
            <Lock className="w-5 h-5 text-accent md:text-text-muted shrink-0" />
            <div className="flex-1 flex flex-col min-w-0">
              <span className="md:hidden text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5 leading-none">New Password</span>
              <input
                type="password"
                placeholder=""
                className="bg-transparent text-white text-base outline-none border-none p-0 w-full font-normal leading-normal placeholder-transparent"
                value={form.newPassword}
                onChange={e => setForm({ ...form, newPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>
          </div>
          <div className={`flex items-center gap-3 bg-black border rounded-2xl md:rounded-xl px-4 py-3 md:py-3.5 transition-all w-full focus-within:border-accent ${
            attemptedSubmit && !form.confirmPassword.trim()
              ? 'border-red-500/50'
              : 'border-neutral-200 dark:border-zinc-800'
          }`}>
            <Lock className="w-5 h-5 text-accent md:text-text-muted shrink-0" />
            <div className="flex-1 flex flex-col min-w-0">
              <span className="md:hidden text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5 leading-none">Confirm Password</span>
              <input
                type="password"
                placeholder=""
                className="bg-transparent text-white text-base outline-none border-none p-0 w-full font-normal leading-normal placeholder-transparent"
                value={form.confirmPassword}
                onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <>
      {/* Laptop & Desktop Mode (Exactly as it was originally) */}
      <div className="hidden md:block">
        <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-bg-primary overflow-x-hidden">
          {/* Floating Navbar */}
          <nav className="fixed top-3 sm:top-6 left-0 right-0 z-[999] flex justify-center px-3 sm:px-4">
            <div
              className="w-full max-w-5xl border border-white/10 rounded-2xl px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 flex items-center justify-between shadow-2xl"
              style={{
                backgroundColor: 'rgba(22, 22, 23, 0.85)',
                backdropFilter: 'saturate(180%) blur(20px)',
                WebkitBackdropFilter: 'saturate(180%) blur(20px)'
              }}
            >
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2.5 no-underline shrink-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-base shadow-inner">
                  💪
                </div>
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-text-primary">{appName}</span>
              </Link>

              {/* Links (Desktop) */}
              <div className="hidden md:flex items-center gap-1 text-[13px] font-semibold">
                {navLinks.map((link) => (
                  <Link
                    key={link.id}
                    href={link.href}
                    className="px-3.5 py-2 rounded-lg transition-all duration-300 text-gray-400 hover:text-white hover:bg-white/5"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href="/signup"
                  className="px-4 py-2 text-xs sm:text-[13px] font-black rounded-xl transition-all bg-accent text-black shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-95 no-underline"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          </nav>

          {/* Background decoration */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 -left-32 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/3 rounded-full blur-3xl" />
          </div>

          <div className="w-full max-w-md relative z-10 mt-16 sm:mt-20">
            <div className="card !p-5 sm:!p-8 border-white/10 bg-bg-card/90 backdrop-blur-xl rounded-2xl shadow-2xl">
              {!isAuthenticated && forgotStep === 'login' && (
                <div className="flex gap-1.5 mb-6 sm:mb-8 bg-black/50 rounded-xl p-1 border border-white/5">
                  <div className="flex-1 py-2.5 sm:py-3 text-center rounded-lg text-xs sm:text-[13px] font-black bg-accent text-black shadow-md shadow-accent/30 cursor-pointer">
                    Log In
                  </div>
                  <Link href="/signup" className="flex-1 py-2.5 sm:py-3 text-center rounded-lg text-xs sm:text-[13px] font-bold transition-all cursor-pointer text-text-muted hover:text-text-primary hover:bg-white/5 no-underline">
                    Sign Up
                  </Link>
                </div>
              )}

              {error && (
                <div className={`mb-5 p-3.5 sm:p-4 rounded-xl border text-xs font-medium relative flex items-center justify-between gap-3 ${error.includes('successfully') ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                  {renderErrorContent(error, false)}
                  <button
                    type="button"
                    onClick={() => setError('')}
                    className="text-text-muted hover:text-white transition-colors p-1 rounded hover:bg-white/5 shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {renderForm()}

                {!isAuthenticated && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 sm:py-4 bg-accent hover:bg-accent-light text-black text-xs sm:text-sm font-black rounded-xl transition-all shadow-lg shadow-accent/20 hover:shadow-accent/40 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2 min-h-[48px]"
                  >
                    {getButtonText()}
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-only View */}
      <div className="md:hidden min-h-screen flex flex-col bg-black overflow-x-hidden">
        {/* Mobile-only Header (Second Image) */}
        <div className="w-full px-6 pt-12 pb-8 flex flex-col gap-6 bg-black">
          <div>
            <button
              onClick={() => {
                if (forgotStep !== 'login') {
                  setForgotStep('login');
                } else {
                  handleNavigation('/');
                }
              }}
              className="w-10 h-10 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer"
            >
              <ArrowLeft size={20} />
            </button>
          </div>
          <div className={`space-y-2 ${isExiting ? 'animate-slide-right-out-custom' : 'animate-slide-right-custom'}`}>
            <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight transition-all duration-300">
              {forgotStep === 'login'
                ? 'Go ahead and sign in'
                : forgotStep === 'phone'
                  ? 'Reset your password'
                  : 'Set new password'}
            </h1>
            <p className="text-sm text-neutral-400 font-medium transition-all duration-300">
              {forgotStep === 'login'
                ? 'Sign in to enjoy the best managing experience'
                : forgotStep === 'phone'
                  ? 'Enter your registered email address to get reset password link'
                  : 'Create a secure and strong password for your account'}
            </p>
          </div>
        </div>

        <div className="w-full flex-1 flex flex-col">
          <div className={`card bg-white dark:bg-zinc-900 text-neutral-900 dark:text-white rounded-t-[36px] p-6 shadow-2xl flex-1 flex flex-col justify-between ${isExiting ? 'animate-slide-down-custom' : 'animate-slide-up-custom'}`}>
            <div>
              {!isAuthenticated && forgotStep === 'login' && (
                <div className="flex gap-1.5 mb-6 bg-neutral-100 dark:bg-zinc-800 rounded-full p-1 border border-neutral-200/50 dark:border-zinc-700">
                  <div className="flex-1 py-2.5 sm:py-3 text-center rounded-full text-xs sm:text-[13px] font-black bg-black text-white cursor-pointer">
                    Login
                  </div>
                  <button
                    onClick={() => handleNavigation('/signup')}
                    className="flex-1 py-2.5 sm:py-3 text-center rounded-full text-xs sm:text-[13px] font-bold transition-all cursor-pointer text-neutral-400 dark:text-zinc-500 hover:text-neutral-600 dark:hover:text-zinc-300 hover:bg-neutral-200/55 dark:hover:bg-zinc-800/50 bg-transparent border-none outline-none no-underline"
                  >
                    Sign Up
                  </button>
                </div>
              )}

              {error && (
                <div className={`mb-5 p-3.5 sm:p-4 rounded-xl border text-xs font-medium relative flex items-center justify-between gap-3 ${error.includes('successfully') ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                  {renderErrorContent(error, true)}
                  <button
                    type="button"
                    onClick={() => setError('')}
                    className="text-neutral-400 dark:text-zinc-500 hover:text-accent transition-colors p-1 rounded shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {renderFormMobile()}

                {!isAuthenticated && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-accent hover:bg-accent-light text-black text-xs sm:text-sm font-black rounded-full transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2 min-h-[48px]"
                  >
                    {getButtonTextMobile()}
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Active Session Confirmation Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-bg-card border border-white/10 p-6 rounded-2xl max-w-sm sm:max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xl mx-auto">
              ⚠️
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">Active Session Detected</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              You are already logged in on another device. Would you like to log out the other device and continue logging in here?
            </p>
            
            <div className="flex justify-center py-2">
              <label className="flex items-center gap-2.5 cursor-pointer select-none text-neutral-500 dark:text-zinc-400 font-bold justify-center">
                <input
                  type="checkbox"
                  checked={forceLogout}
                  onChange={e => setForceLogout(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-all bg-black ${
                  forceLogout ? 'border-accent text-accent' : 'border-neutral-400 dark:border-zinc-600'
                }`}>
                  {forceLogout && (
                    <span className="text-accent text-[10px] font-black leading-none mt-[-1px]">✓</span>
                  )}
                </div>
                <span className="text-xs text-neutral-300 font-bold">Log out from all other devices</span>
              </label>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowSessionModal(false)}
                className="flex-1 py-3 px-3 rounded-xl border border-white/10 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await login(form.email, form.password, forceLogout, true);
                    if (res?.success) {
                      setShowSessionModal(false);
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
                className={`flex-1 py-3 px-3 rounded-xl text-xs font-black shadow-lg transition-all active:scale-95 ${
                  loading
                    ? 'bg-neutral-800 text-neutral-500 shadow-none cursor-not-allowed border border-white/5'
                    : 'bg-accent text-black shadow-lg shadow-accent/20 hover:scale-[1.02]'
                }`}
              >
                {loading ? 'Logging in...' : 'Continue & Log In'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
