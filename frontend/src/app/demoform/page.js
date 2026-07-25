'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { superAdminApi } from '@/lib/api';
import { cleanPhone, validatePhone } from '@/lib/utils';

export default function DemoFormPage() {
  const [appName, setAppName] = useState('goJim');

  useEffect(() => {
    superAdminApi.getPublicSettings()
      .then(res => {
        if (res.success && res.data?.appName) {
          setAppName(res.data.appName);
        }
      })
      .catch(() => {});
  }, []);

  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [touched, setTouched] = useState({ name: false, phone: false, email: false });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(4);
  const router = useRouter();

  // Handle live countdown when success is true
  useEffect(() => {
    if (success && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [success, countdown]);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);


  const getBorderColor = (field) => {
    if (!touched[field]) return 'border-white/10';

    const value = form[field].trim();
    if (field === 'name') {
      return value ? 'border-green-500/50' : 'border-red-500/50';
    }
    if (field === 'email') {
      return value && validateEmail(value) ? 'border-green-500/50' : 'border-red-500/50';
    }
    if (field === 'phone') {
      return value && validatePhone(value) ? 'border-green-500/50' : 'border-red-500/50';
    }
    return 'border-white/5';
  };

  const navLinks = [
    { name: 'Home', href: '/#home', id: 'home' },
    { name: 'Features', href: '/#features', id: 'features' },
    { name: 'Pricing', href: '/#pricing', id: 'pricing' },
    { name: 'Testimonials', href: '/#testimonials', id: 'testimonials' },
    { name: 'Facilities', href: '/#facilities', id: 'facilities' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Mark all as touched on submit
    setTouched({ name: true, phone: true, email: true });

    // Basic Validations
    if (!form.name.trim()) return setError('Name is required');
    if (!form.email.trim()) return setError('Email is required');
    if (!validateEmail(form.email)) return setError('Invalid email format');
    if (!form.phone.trim()) return setError('Phone number is required');
    if (!validatePhone(form.phone)) return setError('Invalid phone number (must be exactly 10 digits)');

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSuccess(true);
      setTimeout(() => router.push('/'), 4000);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
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
            <Link href="/login" className="hidden sm:inline-block px-4 py-2 text-[13px] font-semibold text-gray-300 hover:text-white transition-all duration-300">
              Login
            </Link>
            <Link
              href="/login"
              className="px-5 py-2.5 bg-accent hover:bg-accent-light text-black text-[13px] font-extrabold rounded-xl transition-all shadow-lg shadow-accent/20 hover:shadow-accent/40 hover:scale-[1.02] active:scale-95"
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
          <div className="text-center mb-8">
            <h2 className="text-4xl font-black tracking-tight mb-3">
              <span className="bg-gradient-to-br from-white via-white to-neutral-500 bg-clip-text text-transparent">
                Start Your Journey
              </span>
            </h2>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.15em] leading-relaxed">Claim your free pass and join the community today.</p>
          </div>

          {success ? (
            <div className="text-center py-10">
              <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-accent/10">
                <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-2">Request Sent!</h3>
              <p className="text-text-muted text-sm">We'll get back to you within 24 hours.</p>
              <p className="text-accent text-[10px] mt-8 uppercase font-bold tracking-widest opacity-60">Redirecting to home in {countdown}s...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <input
                  type="text"
                  placeholder="Full Name"
                  className={`bg-black/40 border transition-all !py-4 ${getBorderColor('name')} focus:border-accent`}
                  value={form.name}
                  onChange={e => {
                    setForm({ ...form, name: e.target.value });
                    setTouched({ ...touched, name: true });
                  }}
                  onBlur={() => setTouched({ ...touched, name: true })}
                />

                <input
                  type="email"
                  placeholder="Email Address"
                  className={`bg-black/40 border transition-all !py-4 ${getBorderColor('email')} focus:border-accent`}
                  value={form.email}
                  onChange={e => {
                    setForm({ ...form, email: e.target.value });
                    setTouched({ ...touched, email: true });
                  }}
                  onBlur={() => setTouched({ ...touched, email: true })}
                />

                <input
                  type="tel"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  onInvalid={e => e.target.setCustomValidity('Phone number must be exactly 10 digits (no spaces, letters, or special characters).')}
                  onInput={e => e.target.setCustomValidity('')}
                  placeholder="Phone Number"
                  className={`bg-black/40 border transition-all !py-4 ${getBorderColor('phone')} focus:border-accent`}
                  value={form.phone}
                  onChange={e => {
                    setForm({ ...form, phone: cleanPhone(e.target.value) });
                    setTouched({ ...touched, phone: true });
                  }}
                  onBlur={() => setTouched({ ...touched, phone: true })}
                />

                <textarea
                  placeholder="Your Message"
                  className="bg-black/40 border border-white/10 focus:border-accent transition-all min-h-[120px] resize-none !py-4"
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-accent hover:bg-accent-light text-black text-sm font-black rounded-xl transition-all shadow-lg shadow-accent/20 hover:shadow-accent/40 hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span>SUBMITTING...</span>
                  ) : (
                    'SUBMIT REQUEST →'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
