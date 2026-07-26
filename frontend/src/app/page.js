'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LineChart, Users, CalendarCheck, Search, ChevronDown, 
  MessageSquare, ShieldCheck, CheckCircle2, ArrowRight, 
  Clock, Wallet, TrendingUp, Zap, Award, Sparkles, Check, 
  Building2, Calculator, Bell, UserPlus, FileSpreadsheet, Lock,
  Menu, X
} from 'lucide-react';
import Testimonials from '@/components/Testimonials';
import Pricing from '@/components/Pricing';
import ImageCollage from '@/components/ImageCollage';
import Footer from '@/components/Footer';
import { Typewriter3D } from '@/components/Typewriter3D';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { superAdminApi } from '@/lib/api';

export default function LandingPage() {
  const [appName, setAppName] = useState('goJim');
  const [memberCount, setMemberCount] = useState(150);
  const [avgMonthlyFee, setAvgMonthlyFee] = useState(1500);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    superAdminApi.getPublicSettings()
      .then(res => {
        if (res.success && res.data?.appName) {
          setAppName(res.data.appName);
        }
      })
      .catch(() => {});
  }, []);

  const [activeSection, setActiveSection] = useState('home');
  const [showNavDemoBtn, setShowNavDemoBtn] = useState(false);
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const scrollToSection = (e, id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      e.preventDefault();
      const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - 90;
      const startPosition = window.pageYOffset;
      const distance = targetPosition - startPosition;
      const duration = 1000;
      let start = null;

      const step = (timestamp) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        
        const easing = progress < 0.5 
          ? 4 * progress * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        
        window.scrollTo(0, startPosition + distance * easing);
        
        if (progress < 1) {
          window.requestAnimationFrame(step);
        }
      };

      window.requestAnimationFrame(step);
      window.history.pushState(null, '', `#${id}`);
    }
  };

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -75% 0px',
      threshold: 0
    };

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    const sections = ['home', 'why-us', 'features', 'roi-calculator', 'comparison', 'pricing', 'testimonials', 'facilities'];
    sections.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    const demoBtnObserver = new IntersectionObserver(
      ([entry]) => {
        setShowNavDemoBtn(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    const demoBtn = document.getElementById('hero-demo-btn');
    if (demoBtn) demoBtnObserver.observe(demoBtn);

    return () => {
      observer.disconnect();
      if (demoBtn) demoBtnObserver.unobserve(demoBtn);
    };
  }, []);

  const navLinks = [
    { name: 'Home', href: '/#home', id: 'home' },
    { name: 'Why Us', href: '/#why-us', id: 'why-us' },
    { name: 'Features', href: '/#features', id: 'features' },
    { name: 'ROI Calculator', href: '/#roi-calculator', id: 'roi-calculator' },
    { name: 'Pricing', href: '/#pricing', id: 'pricing' },
    { name: 'Testimonials', href: '/#testimonials', id: 'testimonials' },
  ];

  // ROI Calculations for Gym Owners
  const monthlyRevenue = memberCount * avgMonthlyFee;
  const recoveredLosses = Math.round(monthlyRevenue * 0.18);
  const hoursSavedPerMonth = Math.round(memberCount * 0.12);

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin mb-6" />
        <h3 className="text-xl font-bold text-white mb-2 text-center">Redirecting to Dashboard...</h3>
        <p className="text-xs text-text-muted text-center">Loading your gym control center</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary selection:bg-accent selection:text-black font-sans overflow-x-hidden">

      {/* Floating Header & Mobile Navigation Navbar */}
      <nav className="fixed top-3 sm:top-6 left-0 right-0 z-[999] flex justify-center px-3 sm:px-4">
        <div 
          className="w-full max-w-6xl border border-white/10 rounded-2xl px-4 sm:px-6 md:px-8 py-3 flex items-center justify-between md:grid md:grid-cols-3 shadow-2xl transition-all"
          style={{
            backgroundColor: 'rgba(18, 18, 20, 0.85)',
            backdropFilter: 'saturate(180%) blur(20px)',
            WebkitBackdropFilter: 'saturate(180%) blur(20px)'
          }}
        >

          {/* Logo */}
          <div className="flex justify-start">
            <Link 
              href="/" 
              scroll={false}
              onClick={(e) => scrollToSection(e, 'home')} 
              className="flex items-center gap-2.5 no-underline group"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-base sm:text-lg shadow-inner group-hover:scale-105 transition-transform shrink-0">
                💪
              </div>
              <span className="font-black text-lg sm:text-xl tracking-tight text-text-primary">{appName}</span>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center justify-center gap-1 text-[13px] font-semibold">
            {navLinks.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                scroll={false}
                onClick={(e) => scrollToSection(e, link.id)}
                className={`relative px-3 py-1.5 rounded-lg transition-all duration-300 no-underline z-10 whitespace-nowrap
                  ${activeSection === link.id
                    ? 'text-black font-bold'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                {activeSection === link.id && (
                  <div
                    className="absolute inset-0 bg-accent rounded-lg shadow-lg shadow-accent/30"
                    style={{ zIndex: -1 }}
                  />
                )}
                {link.name}
              </Link>
            ))}
          </div>

          {/* Actions & Mobile Hamburger Button */}
          <div className="flex items-center justify-end gap-2 sm:gap-3">
            <Link href="/login" className="hidden sm:inline-block px-3.5 py-2 text-[13px] font-bold text-gray-300 hover:text-white transition-colors">
              Log In
            </Link>

            <Link 
              href="/signup" 
              className="hidden sm:inline-block px-4 py-2 bg-accent hover:bg-accent-light text-black text-[13px] font-black rounded-xl transition-all shadow-md shadow-accent/20 hover:scale-[1.02] active:scale-95 whitespace-nowrap no-underline"
            >
              Start Trial
            </Link>

            {/* Mobile Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={20} className="text-accent" /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Drawer Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-3 top-20 z-[998] md:hidden bg-bg-card/95 border border-white/10 rounded-2xl p-5 backdrop-blur-2xl shadow-2xl flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.id}
                  href={link.href}
                  scroll={false}
                  onClick={(e) => scrollToSection(e, link.id)}
                  className={`px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between no-underline
                    ${activeSection === link.id
                      ? 'bg-accent text-black font-extrabold'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`}
                >
                  <span>{link.name}</span>
                  <ArrowRight size={16} className={activeSection === link.id ? 'text-black' : 'text-gray-500'} />
                </Link>
              ))}
            </div>

            <div className="h-[1px] w-full bg-white/10 my-1" />

            <div className="flex flex-col gap-2 pt-1">
              <Link 
                href="/signup" 
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3.5 bg-accent text-black font-black text-center text-sm rounded-xl shadow-lg shadow-accent/20 no-underline"
              >
                Start 14-Day Free Trial
              </Link>
              <Link 
                href="/login" 
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 bg-white/5 border border-white/10 text-white font-bold text-center text-sm rounded-xl no-underline"
              >
                Log In to Gym Dashboard
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <header id="home" className="pt-28 sm:pt-40 md:pt-48 px-4 flex flex-col items-center text-center w-full mx-auto relative z-10">

        {/* Background glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[320px] sm:w-[600px] h-[250px] sm:h-[350px] bg-accent/10 blur-[100px] sm:blur-[140px] rounded-[100%] pointer-events-none" />

        <div className="max-w-4xl mx-auto flex flex-col items-center">
          
          {/* Mobile Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-accent/30 bg-accent/10 text-accent text-[11px] sm:text-xs font-extrabold uppercase tracking-wider mb-6 shadow-inner max-w-full">
            <Sparkles size={14} className="text-accent animate-pulse shrink-0" />
            <span className="truncate">Built For Gym Owners &amp; Fitness Centers</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-5 leading-[1.15] sm:leading-[1.1]">
            <span className="bg-gradient-to-br from-white via-white to-neutral-400 bg-clip-text text-transparent">
              Automate Gym Operations.<br />
              <Typewriter3D
                words={[
                  "Maximize Monthly Revenue",
                  "Stop Unpaid Gym Visits",
                  "Auto Remind via WhatsApp",
                  "Track Live Daily Profit",
                  "Manage Staff & Payroll",
                  "Scale Your Gym Business"
                ]}
                className="text-accent"
              />
            </span>
          </h1>

          <p className="text-sm sm:text-lg md:text-xl text-neutral-300 mb-8 max-w-2xl font-medium leading-relaxed px-2">
            The all-in-one cloud OS that turns messy paper registers and missed member fees into a <span className="text-white font-bold underline decoration-accent decoration-2 underline-offset-4">100% automated, profitable gym machine</span>.
          </p>

          {/* Hero Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12 sm:mb-16 w-full max-w-md px-2">
            <Link 
              id="hero-demo-btn" 
              href="/signup" 
              className="w-full sm:w-auto px-7 py-3.5 sm:py-4 bg-accent hover:bg-accent-light text-black text-sm sm:text-base font-black rounded-xl transition-all shadow-xl shadow-accent/25 hover:shadow-accent/40 active:scale-95 no-underline flex items-center justify-center gap-2 min-h-[48px]"
            >
              <span>Start 14-Day Free Trial</span>
              <ArrowRight size={18} strokeWidth={3} />
            </Link>
            <Link 
              href="/#pricing" 
              scroll={false}
              onClick={(e) => scrollToSection(e, 'pricing')}
              className="w-full sm:w-auto px-6 py-3.5 sm:py-4 bg-white/5 hover:bg-white/10 text-white text-sm sm:text-base font-bold rounded-xl transition-all border border-white/10 no-underline min-h-[48px] flex items-center justify-center"
            >
              View Subscription Plans
            </Link>
          </div>

          {/* Social Proof Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 w-full max-w-4xl p-4 sm:p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl mb-12 sm:mb-16">
            <div className="flex flex-col items-center p-1.5 sm:p-2">
              <span className="text-xl sm:text-3xl font-black text-accent">100%</span>
              <span className="text-[11px] sm:text-xs text-neutral-400 font-medium mt-0.5 text-center">Auto Reminders</span>
            </div>
            <div className="flex flex-col items-center p-1.5 sm:p-2 border-l border-white/5">
              <span className="text-xl sm:text-3xl font-black text-accent">+35%</span>
              <span className="text-[11px] sm:text-xs text-neutral-400 font-medium mt-0.5 text-center">Renewal Rate</span>
            </div>
            <div className="flex flex-col items-center p-1.5 sm:p-2 border-t md:border-t-0 md:border-l border-white/5">
              <span className="text-xl sm:text-3xl font-black text-accent">15+ Hrs</span>
              <span className="text-[11px] sm:text-xs text-neutral-400 font-medium mt-0.5 text-center">Saved / Week</span>
            </div>
            <div className="flex flex-col items-center p-1.5 sm:p-2 border-t md:border-t-0 border-l border-white/5">
              <span className="text-xl sm:text-3xl font-black text-accent">₹0</span>
              <span className="text-[11px] sm:text-xs text-neutral-400 font-medium mt-0.5 text-center">Hidden Fees</span>
            </div>
          </div>

        </div>

        {/* Live App Showcase Preview Frame */}
        <div className="w-full max-w-6xl mx-auto px-1 sm:px-0">
          <div className="relative rounded-xl sm:rounded-2xl p-1.5 sm:p-2 bg-gradient-to-b from-white/15 to-white/5 border border-white/15 shadow-2xl shadow-accent/15">
            <div className="relative rounded-lg sm:rounded-xl overflow-hidden bg-bg-card">
              <img
                src="/dashboard-preview.png"
                alt={`${appName} Gym Management Dashboard`}
                className="w-full h-auto object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 h-24 sm:h-40 bg-gradient-to-t from-bg-primary via-bg-primary/80 to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      </header>

      {/* Trusted By Gyms Section */}
      <section className="py-12 sm:py-20 px-4 w-full relative z-10 border-t border-white/5 bg-[#030303]">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-neutral-400 text-[11px] sm:text-xs md:text-sm font-extrabold uppercase tracking-widest mb-8">
            Trusted By 500+ Gyms &amp; Fitness Clubs Nationwide
          </p>

          <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-12 opacity-80">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-accent text-black font-black flex items-center justify-center text-xs">O</div>
              <div className="font-black italic text-base sm:text-xl uppercase tracking-tighter text-white">Osbond<span className="text-accent text-[10px] block -mt-1">Fitness</span></div>
            </div>

            <div className="font-black italic text-lg sm:text-2xl tracking-tighter flex items-center text-white">
              <span className="text-accent text-xl sm:text-3xl mr-1">LA</span>FITNESS
            </div>

            <div className="font-black italic text-lg sm:text-2xl tracking-tight flex items-center gap-1 text-white">
              <span className="text-accent text-xl sm:text-3xl">24</span><span className="text-[10px] sm:text-xs">HR GYM</span>
            </div>

            <div className="font-black italic text-base sm:text-xl text-white tracking-tighter uppercase flex items-center">
              GOLD&apos;S <span className="text-accent ml-1">CLUB</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Why Gym Owners Need GoJim */}
      <section id="why-us" className="py-16 sm:py-24 px-4 w-full relative z-10 bg-bg-primary border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-3">
              Solving Real Gym Problems
            </div>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3 sm:mb-4">
              Why 90% of Gyms Switch to <span className="text-accent">{appName}</span>
            </h2>
            <p className="text-neutral-400 text-xs sm:text-sm md:text-base max-w-2xl mx-auto font-medium leading-relaxed">
              Running a gym shouldn&apos;t mean spending hours chasing pending fees or losing track of member renewals.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            
            {/* Pillar 1 */}
            <div className="bg-bg-card border border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col hover:border-accent/30 transition-all">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-4 sm:mb-6">
                <Bell size={22} strokeWidth={2.5} />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">Zero Unpaid Gym Visits</h3>
              <p className="text-neutral-400 text-xs leading-relaxed">
                Automated WhatsApp reminders sent 3 days before expiry, ensuring 100% on-time fee collection.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="bg-bg-card border border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col hover:border-accent/30 transition-all">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#fde047]/10 border border-[#fde047]/20 flex items-center justify-center text-[#fde047] mb-4 sm:mb-6">
                <Wallet size={22} strokeWidth={2.5} />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">Real-Time P&amp;L Ledger</h3>
              <p className="text-neutral-400 text-xs leading-relaxed">
                Track daily income, recurring membership payouts, and expense categories with live charts.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="bg-bg-card border border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col hover:border-accent/30 transition-all">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#7dd3fc]/10 border border-[#7dd3fc]/20 flex items-center justify-center text-[#7dd3fc] mb-4 sm:mb-6">
                <MessageSquare size={22} strokeWidth={2.5} />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">Automated Lead CRM</h3>
              <p className="text-neutral-400 text-xs leading-relaxed">
                Auto-text walk-in inquiries with trial offers and send comeback nudges to inactive members.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="bg-bg-card border border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col hover:border-accent/30 transition-all">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#fdba74]/10 border border-[#fdba74]/20 flex items-center justify-center text-[#fdba74] mb-4 sm:mb-6">
                <Lock size={22} strokeWidth={2.5} />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">Multi-Session Security</h3>
              <p className="text-neutral-400 text-xs leading-relaxed">
                Single active login enforcement prevents staff password sharing and protects your gym records.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Complete Gym Management Modules Section */}
      <section id="features" className="py-16 sm:py-24 px-4 w-full relative z-10 bg-[#030303] border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3 sm:mb-4">
              Everything Your Gym Needs to <span className="text-accent">Thrive</span>
            </h2>
            <p className="text-neutral-400 text-xs sm:text-sm md:text-base max-w-2xl mx-auto font-medium">
              Built ground-up with every feature required by gym owners, reception staff, and trainers.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">

            {/* Module 1 */}
            <div className="bg-bg-card border border-white/5 rounded-2xl p-5 sm:p-6 flex flex-col justify-between hover:border-white/15 transition-all">
              <div>
                <div className="w-9 h-9 rounded-lg bg-accent text-black font-extrabold flex items-center justify-center mb-4">
                  <Users size={18} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Member Lifecycle Management</h3>
                <p className="text-neutral-400 text-xs leading-relaxed mb-5">
                  Log personal details, emergency contacts, subscription dates, active status badges, and attendance.
                </p>
              </div>
              <ul className="flex flex-col gap-2 border-t border-white/5 pt-4 text-xs text-neutral-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-accent shrink-0" /> Active / Expired Membership badges
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-accent shrink-0" /> Fast search by name or phone
                </li>
              </ul>
            </div>

            {/* Module 2 */}
            <div className="bg-bg-card border border-white/5 rounded-2xl p-5 sm:p-6 flex flex-col justify-between hover:border-white/15 transition-all">
              <div>
                <div className="w-9 h-9 rounded-lg bg-emerald-400 text-black font-extrabold flex items-center justify-center mb-4">
                  <MessageSquare size={18} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Automated WhatsApp Engine</h3>
                <p className="text-neutral-400 text-xs leading-relaxed mb-5">
                  Set templates for 3-day expiry alerts, welcome notes, birthday wishes, and 5-day inactive nudges.
                </p>
              </div>
              <ul className="flex flex-col gap-2 border-t border-white/5 pt-4 text-xs text-neutral-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-accent shrink-0" /> 1-Click WhatsApp messaging
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-accent shrink-0" /> Automated daily background scheduler
                </li>
              </ul>
            </div>

            {/* Module 3 */}
            <div className="bg-bg-card border border-white/5 rounded-2xl p-5 sm:p-6 flex flex-col justify-between hover:border-white/15 transition-all">
              <div>
                <div className="w-9 h-9 rounded-lg bg-amber-400 text-black font-extrabold flex items-center justify-center mb-4">
                  <LineChart size={18} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Revenue &amp; Expense Ledger</h3>
                <p className="text-neutral-400 text-xs leading-relaxed mb-5">
                  Track recurring membership income, equipment repairs, utility bills, and net monthly profits.
                </p>
              </div>
              <ul className="flex flex-col gap-2 border-t border-white/5 pt-4 text-xs text-neutral-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-accent shrink-0" /> Categorized expense ledger
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-accent shrink-0" /> Razorpay online subscription support
                </li>
              </ul>
            </div>

            {/* Module 4 */}
            <div className="bg-bg-card border border-white/5 rounded-2xl p-5 sm:p-6 flex flex-col justify-between hover:border-white/15 transition-all">
              <div>
                <div className="w-9 h-9 rounded-lg bg-sky-400 text-black font-extrabold flex items-center justify-center mb-4">
                  <Award size={18} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Trainer &amp; Staff Payroll</h3>
                <p className="text-neutral-400 text-xs leading-relaxed mb-5">
                  Assign personal trainers to members, monitor personal training (PT) sessions, and compute monthly salary &amp; bonus payouts automatically.
                </p>
              </div>
              <ul className="flex flex-col gap-2 border-t border-white/5 pt-4 text-xs text-neutral-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-accent shrink-0" /> Dedicated trainer profiles &amp; rosters
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-accent shrink-0" /> Staff role permissions
                </li>
              </ul>
            </div>

            {/* Module 5 */}
            <div className="bg-bg-card border border-white/5 rounded-2xl p-5 sm:p-6 flex flex-col justify-between hover:border-white/15 transition-all">
              <div>
                <div className="w-9 h-9 rounded-lg bg-purple-400 text-black font-extrabold flex items-center justify-center mb-4">
                  <UserPlus size={18} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Lead Conversion Funnel</h3>
                <p className="text-neutral-400 text-xs leading-relaxed mb-5">
                  Capture prospective gym walk-ins, track follow-up statuses, and convert leads into paid members.
                </p>
              </div>
              <ul className="flex flex-col gap-2 border-t border-white/5 pt-4 text-xs text-neutral-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-accent shrink-0" /> Free 1-day pass nudges
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-accent shrink-0" /> Lead status pipeline
                </li>
              </ul>
            </div>

            {/* Module 6 */}
            <div className="bg-bg-card border border-white/5 rounded-2xl p-5 sm:p-6 flex flex-col justify-between hover:border-white/15 transition-all">
              <div>
                <div className="w-9 h-9 rounded-lg bg-rose-400 text-black font-extrabold flex items-center justify-center mb-4">
                  <CalendarCheck size={18} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Check-ins &amp; Attendance</h3>
                <p className="text-neutral-400 text-xs leading-relaxed mb-5">
                  Quick 1-click daily attendance logging for members and trainers to monitor peak gym rush hours.
                </p>
              </div>
              <ul className="flex flex-col gap-2 border-t border-white/5 pt-4 text-xs text-neutral-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-accent shrink-0" /> Daily check-in timestamps
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-accent shrink-0" /> Attendance percentage alerts
                </li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* Interactive Gym Owner ROI Calculator */}
      <section id="roi-calculator" className="py-16 sm:py-24 px-4 w-full relative z-10 bg-bg-primary border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-3">
              <Calculator size={14} /> Interactive ROI Estimator
            </div>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
              Calculate Money Saved With <span className="text-accent">{appName}</span>
            </h2>
            <p className="text-neutral-400 text-xs sm:text-sm max-w-xl mx-auto font-medium">
              Adjust your gym&apos;s current stats below to see how much leaked revenue you can recover every single month.
            </p>
          </div>

          <div className="bg-bg-card border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-12 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 items-center">
            
            {/* Sliders */}
            <div className="lg:col-span-7 flex flex-col gap-6 sm:gap-8">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs sm:text-sm font-bold text-white">Active Gym Members</label>
                  <span className="text-base sm:text-xl font-black text-accent">{memberCount} Members</span>
                </div>
                <input 
                  type="range" 
                  min="30" 
                  max="1000" 
                  step="10"
                  value={memberCount} 
                  onChange={(e) => setMemberCount(Number(e.target.value))}
                  className="w-full h-2.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-accent"
                />
                <div className="flex justify-between text-[10px] sm:text-[11px] text-neutral-500 mt-1">
                  <span>30 Members</span>
                  <span>1,000 Members</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs sm:text-sm font-bold text-white">Average Monthly Fee Per Member</label>
                  <span className="text-base sm:text-xl font-black text-accent">₹{avgMonthlyFee.toLocaleString()} / mo</span>
                </div>
                <input 
                  type="range" 
                  min="500" 
                  max="10000" 
                  step="250"
                  value={avgMonthlyFee} 
                  onChange={(e) => setAvgMonthlyFee(Number(e.target.value))}
                  className="w-full h-2.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-accent"
                />
                <div className="flex justify-between text-[10px] sm:text-[11px] text-neutral-500 mt-1">
                  <span>₹500</span>
                  <span>₹10,000</span>
                </div>
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] sm:text-xs text-neutral-400">
                💡 <strong className="text-white">Did you know?</strong> Average gym owners lose ~15-20% of monthly revenue due to forgotten expiry dates. GoJim auto WhatsApp reminders recover these funds instantly.
              </div>
            </div>

            {/* Results */}
            <div className="lg:col-span-5 bg-gradient-to-br from-accent/15 via-accent/5 to-transparent border border-accent/30 rounded-2xl p-6 sm:p-8 flex flex-col justify-between text-center relative overflow-hidden">
              <div className="mb-5 sm:mb-6">
                <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-widest text-neutral-400 block mb-2">Estimated Monthly Recovered Revenue</span>
                <div className="text-3xl sm:text-4xl md:text-5xl font-black text-accent mb-2">
                  +₹{recoveredLosses.toLocaleString()}
                </div>
                <span className="text-[11px] sm:text-xs text-neutral-300 font-medium block">Extra revenue collected every month</span>
              </div>

              <div className="pt-5 border-t border-white/10 flex flex-col gap-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400">Admin Hours Saved:</span>
                  <span className="font-extrabold text-white">~{hoursSavedPerMonth} Hours / Mo</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400">Total Monthly Revenue:</span>
                  <span className="font-extrabold text-white">₹{monthlyRevenue.toLocaleString()}</span>
                </div>
              </div>

              <Link 
                href="/signup" 
                className="mt-6 sm:mt-8 w-full py-3.5 bg-accent hover:bg-accent-light text-black text-xs sm:text-sm font-black rounded-xl transition-all shadow-lg shadow-accent/20 no-underline text-center flex items-center justify-center min-h-[44px]"
              >
                Claim Your 14-Day Free Trial
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* Comparison Section: GoJim vs Paper Registers */}
      <section className="py-16 sm:py-24 px-4 w-full relative z-10 bg-[#030303] border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
              Manual Registers vs <span className="text-accent">{appName}</span>
            </h2>
            <p className="text-neutral-400 text-xs sm:text-sm max-w-xl mx-auto font-medium">
              Stop relying on paper notebooks or messy Excel sheets. Upgrade to modern automation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">

            {/* Old Way */}
            <div className="bg-red-500/[0.03] border border-red-500/20 rounded-2xl p-6 sm:p-8 flex flex-col">
              <h3 className="text-lg sm:text-xl font-bold text-red-400 mb-5 flex items-center gap-2">
                ❌ Traditional Manual Management
              </h3>
              <ul className="flex flex-col gap-3.5 text-xs text-neutral-400">
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold shrink-0">✕</span>
                  <span>Writing down member entry times in paper notebooks.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold shrink-0">✕</span>
                  <span>Forgetting when members&apos; plans expire, allowing free workouts.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold shrink-0">✕</span>
                  <span>Calling members manually one-by-one to ask for payment renewal.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold shrink-0">✕</span>
                  <span>No clear idea of monthly net profit after paying staff &amp; electric bills.</span>
                </li>
              </ul>
            </div>

            {/* GoJim Way */}
            <div className="bg-accent/[0.05] border border-accent/30 rounded-2xl p-6 sm:p-8 flex flex-col relative">
              <div className="absolute top-4 right-4 text-[9px] bg-accent text-black font-black uppercase px-2 py-0.5 rounded">Recommended</div>
              <h3 className="text-lg sm:text-xl font-bold text-accent mb-5 flex items-center gap-2">
                ⚡ The {appName} Automated Way
              </h3>
              <ul className="flex flex-col gap-3.5 text-xs text-neutral-200">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-accent shrink-0 mt-0.5" />
                  <span>1-Click digital attendance logging with instant status check.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-accent shrink-0 mt-0.5" />
                  <span>Automated active/expired badges prevent unauthorized gym access.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-accent shrink-0 mt-0.5" />
                  <span>Automated WhatsApp reminders sent 3 days before plan expiry.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-accent shrink-0 mt-0.5" />
                  <span>Real-time profit &amp; loss ledger with category expense analytics.</span>
                </li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* Pricing Section Component */}
      <div id="pricing">
        <Pricing />
      </div>

      {/* Testimonials Component */}
      <div id="testimonials">
        <Testimonials />
      </div>

      {/* Facilities / Image Gallery Component */}
      <div id="facilities">
        <ImageCollage />
      </div>

      {/* Final Call to Action Banner */}
      <section className="py-14 sm:py-20 px-4 w-full relative z-10 bg-gradient-to-b from-bg-primary to-[#050505] border-t border-white/5 text-center">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-accent/15 via-accent/5 to-transparent border border-accent/30 rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-16 relative overflow-hidden">
          <div className="relative z-10 flex flex-col items-center">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white mb-3 sm:mb-4 tracking-tight">
              Ready to Upgrade Your Gym Today?
            </h2>
            <p className="text-neutral-300 text-xs sm:text-sm md:text-base max-w-xl mb-6 sm:mb-8 font-medium">
              Join hundreds of gym owners who streamlined their operations, automated renewals, and grew their monthly revenue with {appName}.
            </p>
            <Link 
              href="/signup" 
              className="w-full sm:w-auto px-7 py-3.5 sm:py-4 bg-accent hover:bg-accent-light text-black text-xs sm:text-base font-black rounded-xl transition-all shadow-xl shadow-accent/30 hover:scale-105 active:scale-95 no-underline flex items-center justify-center gap-2 min-h-[48px]"
            >
              <span>Get Started Free (No Credit Card Required)</span>
              <ArrowRight size={18} strokeWidth={3} />
            </Link>
          </div>
        </div>
      </section>

      <Footer />

    </div>
  );
}
