'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Users, CalendarCheck, Search, ChevronDown } from 'lucide-react';
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
    const element = document.getElementById(id);
    if (element) {
      e.preventDefault();
      const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - 100;
      const startPosition = window.pageYOffset;
      const distance = targetPosition - startPosition;
      const duration = 1200;
      let start = null;

      const step = (timestamp) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        
        // Ease In Out Cubic
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
      rootMargin: '0px 0px -80% 0px',
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

    const sections = ['home', 'features', 'pricing', 'testimonials', 'facilities'];
    sections.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    // Observer for Hero Demo Button visibility
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
    { name: 'Features', href: '/#features', id: 'features' },
    { name: 'Pricing', href: '/#pricing', id: 'pricing' },
    { name: 'Testimonials', href: '/#testimonials', id: 'testimonials' },
    { name: 'Facilities', href: '/#facilities', id: 'facilities' },
  ];

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin mb-6" />
        <h3 className="text-xl font-bold text-white mb-2">Redirecting...</h3>
        <p className="text-xs text-text-muted">Taking you to your dashboard</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary selection:bg-accent selection:text-black font-sans">

      {/* Floating Navbar */}
      <nav className="fixed top-6 left-0 right-0 z-[999] flex justify-center px-4">
        <div className="w-full max-w-6xl border border-white/10 rounded-2xl px-6 md:px-8 py-3 grid grid-cols-3 items-center shadow-2xl"
          style={{
            backgroundColor: 'rgba(22, 22, 23, 0.72)',
            backdropFilter: 'saturate(180%) blur(20px)',
            WebkitBackdropFilter: 'saturate(180%) blur(20px)'
          }}
        >

          {/* Logo - Left Col */}
          <div className="flex justify-start">
            <Link 
              href="/" 
              scroll={false}
              onClick={(e) => scrollToSection(e, 'home')} 
              className="flex items-center gap-3 no-underline"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-base shadow-inner">
                💪
              </div>
              <span className="font-extrabold text-xl tracking-tight text-text-primary">{appName}</span>
            </Link>
          </div>

          {/* Links (Desktop) - Center Col */}
          <div className="hidden md:flex items-center justify-center gap-1 text-[13px] font-semibold">
            {navLinks.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                scroll={false}
                onClick={(e) => scrollToSection(e, link.id)}
                className={`relative px-4 py-2 rounded-lg transition-all duration-300 no-underline z-10
                  ${activeSection === link.id
                    ? 'text-black'
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

          {/* Actions - Right Col */}
          <div className="flex items-center justify-end gap-3">
            <div>
              <Link href="/login" className="hidden sm:inline-block px-4 py-2 text-[13px] font-semibold text-gray-300 hover:text-white transition-colors">
                Login
              </Link>
            </div>
              {showNavDemoBtn && (
                <div>
                  <Link 
                    href="/#pricing" 
                    scroll={false}
                    onClick={(e) => scrollToSection(e, 'pricing')}
                    className="px-5 py-2.5 bg-accent hover:bg-accent-light text-black text-[13px] font-extrabold rounded-xl transition-all shadow-lg shadow-accent/20 hover:shadow-accent/40 hover:scale-[1.02] active:scale-95 whitespace-nowrap no-underline"
                  >
                    Request a Demo
                  </Link>
                </div>
              )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header id="home" className="pt-48 px-4 flex flex-col items-center text-center w-full mx-auto relative z-10">

        {/* Subtle background glow */}
        <div className="absolute top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/5 blur-[120px] rounded-[100%] pointer-events-none" />

        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
            <span className="bg-gradient-to-br from-white via-white to-neutral-500 bg-clip-text text-transparent">
              Simplify Your<br />
              <Typewriter3D

                //words={["Fitness Business", "Gym Operations", "Client Management", "Membership System", "Training Programs", "Fitness Services"]}
                words={["Way to Greatness", "Path to Power", "Daily Hustle", "Growth Story", "Quest for Strength", "Journey to Results"]}
                className="text-accent"
              />
            </span>
          </h1>

          <p className="text-base md:text-lg text-neutral-400 mb-8 max-w-xl font-medium">
            Stop waiting for the perfect moment and join the community that turns your ambition into an undeniable reality.
          </p>

          <div className="mb-20">
            <Link 
              id="hero-demo-btn" 
              href="/#pricing" 
              scroll={false}
              onClick={(e) => scrollToSection(e, 'pricing')}
              className="inline-block px-6 py-3.5 bg-accent hover:bg-accent-light hover:-translate-y-1 text-black text-base font-bold rounded-xl transition-all shadow-lg shadow-accent/20 hover:shadow-accent/40 no-underline"
            >
              Request a Demo
            </Link>
          </div>
        </div>

        {/* Dashboard Preview Image */}
        <div className="w-full max-w-6xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-accent/10 bg-transparent">
            <img
              src="/dashboard-preview.png"
              alt={`${appName} Dashboard Preview`}
              className="w-full h-auto object-cover"
            />

            {/* Fade out gradient at the bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-bg-primary to-transparent pointer-events-none" />
          </div>
        </div>
      </header>

      {/* Trusted By Section */}
      <section className="pb-24 px-4 w-full relative z-10 border-t border-white/5 bg-[#030303]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[#888888] text-sm md:text-base max-w-3xl mx-auto leading-relaxed font-medium">
              Trusted by the world's leading gyms and fitness centers. From boutique studios<br className="hidden md:block" />
              to large fitness franchises, we power the most successful fitness businesses
            </p>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-60 pb-15">
            {/* 1. Osbond Gym */}
            <div className="flex items-center gap-2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M5 22v-5l-1-4a7 7 0 0 1 16 0l-1 4v5" /><path d="M8 12l-2-2 1-3" /></svg>
              <div className="font-black italic leading-[1.1] tracking-tighter text-xl uppercase">Osbond<br /><span className="text-xs">Gym Lite</span></div>
            </div>

            {/* 2. LA Fitness (Variant) */}
            <div className="font-black italic text-2xl tracking-tighter flex flex-col items-center leading-none uppercase">
              <svg width="30" height="8" viewBox="0 0 30 8" fill="currentColor" className="ml-6 mb-1"><path d="M0 8l15-8h15l-15 8z" /></svg>
              <div className="flex items-center"><span className="text-3xl mr-1">LA</span>|FITNESS</div>
            </div>

            {/* 3. 24 Hour Fitness */}
            <div className="font-black italic text-3xl tracking-tight flex items-center gap-1 uppercase">
              <div className="flex flex-col items-center leading-none text-xl"><span className="text-3xl leading-none">24</span><span className="text-[10px]">HOUR</span></div>
              FITNESS<span className="text-[10px] align-top ml-0.5">®</span>
            </div>

            {/* 4. Muscle & Fitness */}
            <div className="font-black italic text-2xl leading-[0.9] text-center tracking-tighter uppercase flex items-center">
              <span className="text-4xl mr-1">&amp;</span>
              <div className="text-left">Muscle<br />Fitness</div>
            </div>

            {/* 5. LA Fitness */}
            <div className="font-black italic text-3xl tracking-tighter flex items-center uppercase">
              <span className="text-4xl mr-1">LA</span>FITNESS<span className="text-[10px] align-super">®</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="py-24 px-4 w-full relative z-10 bg-bg-primary">
        <div className="max-w-5xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-white via-white to-neutral-500 bg-clip-text text-transparent">
                Optimize Your Gym Operations
              </span>
            </h2>
            <p className="text-[#888888] text-[13px] md:text-sm max-w-2xl mx-auto leading-relaxed font-medium">
              Take full control of your gym operations with powerful tools for tracking<br className="hidden md:block" />
              revenue, managing members, scheduling classes, and more.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

            {/* Card 1: Track Revenue */}
            <div className="bg-bg-card border border-white/5 rounded-xl p-6 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1 hover:bg-bg-card-hover">
              <div className="relative mb-5">
                <div className="absolute inset-0 bg-accent blur-lg opacity-25 rounded-full mix-blend-screen"></div>
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center relative z-10 shadow-lg">
                  <LineChart size={20} className="text-black" strokeWidth={2.5} />
                </div>
              </div>
              <h3 className="text-[17px] font-bold text-white mb-2 tracking-tight">Track Revenue</h3>
              <p className="text-[#888888] text-[13px] leading-relaxed">
                Monitor gym earnings with clear, easy-to-read analytics.
              </p>
            </div>

            {/* Card 2: Manage Members */}
            <div className="bg-bg-card border border-white/5 rounded-xl p-6 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1 hover:bg-bg-card-hover">
              <div className="relative mb-5">
                <div className="absolute inset-0 bg-[#fde047] blur-lg opacity-20 rounded-full mix-blend-screen"></div>
                <div className="w-10 h-10 rounded-xl bg-[#fde047] flex items-center justify-center relative z-10 shadow-lg">
                  <Users size={20} className="text-black" strokeWidth={2.5} />
                </div>
              </div>
              <h3 className="text-[17px] font-bold text-white mb-2 tracking-tight">Manage Members</h3>
              <p className="text-[#888888] text-[13px] leading-relaxed">
                Keep track of member activity, subscriptions, and renewals.
              </p>
            </div>

            {/* Card 3: Class Scheduling */}
            <div className="bg-bg-card border border-white/5 rounded-xl p-6 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1 hover:bg-bg-card-hover">
              <div className="relative mb-5">
                <div className="absolute inset-0 bg-[#7dd3fc] blur-lg opacity-20 rounded-full mix-blend-screen"></div>
                <div className="w-10 h-10 rounded-xl bg-[#7dd3fc] flex items-center justify-center relative z-10 shadow-lg">
                  <CalendarCheck size={20} className="text-black" strokeWidth={2.5} />
                </div>
              </div>
              <h3 className="text-[17px] font-bold text-white mb-2 tracking-tight">Class Scheduling</h3>
              <p className="text-[#888888] text-[13px] leading-relaxed">
                Organize and manage class schedules with ease.
              </p>
            </div>

            {/* Card 4: Trainer Management */}
            <div className="bg-bg-card border border-white/5 rounded-xl p-6 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1 hover:bg-bg-card-hover">
              <div className="relative mb-5">
                <div className="absolute inset-0 bg-[#fdba74] blur-lg opacity-20 rounded-full mix-blend-screen"></div>
                <div className="w-10 h-10 rounded-xl bg-[#fdba74] flex items-center justify-center relative z-10 shadow-lg">
                  <Search size={20} className="text-black" strokeWidth={2.5} />
                </div>
              </div>
              <h3 className="text-[17px] font-bold text-white mb-2 tracking-tight">Trainer Management</h3>
              <p className="text-[#888888] text-[13px] leading-relaxed">
                Easily assign and track personal trainers and their sessions.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Boost Your Gym's Success Section */}
      <section className="pb-24 px-4 w-full relative z-10 bg-bg-primary">
        <div className="max-w-[900px] mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-white via-white to-neutral-500 bg-clip-text text-transparent">
                Boost Your Gym&apos;s Success
              </span>
            </h2>
            <p className="text-[#888888] text-[13px] md:text-sm max-w-2xl mx-auto font-medium">
              Tools and features to keep your fitness business running smoothly and efficiently.
            </p>
          </div>

          {/* Feature Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Card 1: Member Status */}
            <div className="bg-bg-card border border-[#1a1a1a] rounded-xl p-5 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:border-[#2a2a2a]">
              {/* Image Container */}
              <div className="w-full aspect-[4/3] relative mb-5 rounded-lg overflow-hidden flex items-center justify-center">
                <img src="/feature-members.png" alt="Member Status" className="w-[110%] h-auto object-cover opacity-90 transition-opacity hover:opacity-100 mix-blend-lighten" />
              </div>

              <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Member Status</h3>
              <p className="text-[#888888] text-[13px] leading-relaxed mb-5 flex-1">
                Easily manage member information, track expiration dates, and keep their status up to date.
              </p>

              <Link href="/login" className="inline-flex items-center gap-1.5 text-accent font-bold text-[13px] hover:text-accent-light transition-colors w-fit group">
                Learn More
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform group-hover:translate-x-1"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </Link>
            </div>

            {/* Card 2: Trainer Hub */}
            <div className="bg-bg-card border border-[#1a1a1a] rounded-xl p-5 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:border-[#2a2a2a]">
              {/* Image Container */}
              <div className="w-full aspect-[4/3] relative mb-5 rounded-lg overflow-hidden flex items-center justify-center">
                <img src="/feature-trainer.png" alt="Trainer Hub" className="w-[110%] h-auto object-cover opacity-90 transition-opacity hover:opacity-100 mix-blend-lighten" />
              </div>

              <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Trainer Hub</h3>
              <p className="text-[#888888] text-[13px] leading-relaxed mb-5 flex-1">
                Manage trainers, track performance, and streamline communication.
              </p>

              <Link href="/login" className="inline-flex items-center gap-1.5 text-accent font-bold text-[13px] hover:text-accent-light transition-colors w-fit group">
                Learn More
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform group-hover:translate-x-1"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </Link>
            </div>

            {/* Card 3: Income Tracker */}
            <div className="bg-bg-card border border-[#1a1a1a] rounded-xl p-5 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:border-[#2a2a2a]">
              {/* Image Container */}
              <div className="w-full aspect-[4/3] relative mb-5 rounded-lg overflow-hidden flex items-center justify-center">
                <img src="/feature-income.png" alt="Income Tracker" className="w-[110%] h-auto object-cover opacity-90 transition-opacity hover:opacity-100 mix-blend-lighten" />
              </div>

              <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Income Tracker</h3>
              <p className="text-[#888888] text-[13px] leading-relaxed mb-5 flex-1">
                Track your gym&apos;s revenue trends in real time to make informed financial decisions.
              </p>

              <Link href="/login" className="inline-flex items-center gap-1.5 text-accent font-bold text-[13px] hover:text-accent-light transition-colors w-fit group">
                Learn More
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform group-hover:translate-x-1"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* Find a Trainers Section */}
      <section className="py-24 px-4 w-full relative z-10 bg-[#030303] border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              <span className="bg-gradient-to-r from-white via-white to-neutral-500 bg-clip-text text-transparent">
                Find a Trainers
              </span>
            </h2>
            <p className="text-[#888888] text-[13px] md:text-sm max-w-3xl mx-auto font-medium">
              Our certified trainers are here to guide you, offering expertise and motivation to help you achieve your fitness goals.
            </p>
          </div>

          {/* Trainers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">

            {/* Trainer 1 */}
            <div className="group bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl p-5 relative flex flex-col justify-between min-h-[180px] transition-all hover:border-[#2a2a2a] hover:-translate-y-1">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1 tracking-tight">King Zarips</h3>
                  <p className="text-[#888888] text-[13px] font-medium">Calisthenic</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#1a1a1a] group-hover:bg-accent flex items-center justify-center text-[#888888] group-hover:text-black transition-colors group-hover:shadow-lg shadow-accent/30">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 19L19 5M19 5v10M19 5H9" /></svg>
                </div>
              </div>
              <div className="flex gap-8 mb-5">
                <div>
                  <div className="text-xl font-bold text-white flex items-center gap-0.5">3<span className="text-[#ef4444] text-sm">+</span></div>
                  <div className="text-[#888888] text-[11px] font-medium mt-0.5">Clients</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-white flex items-center gap-0.5">2<span className="text-[#22c55e] text-sm">+</span></div>
                  <div className="text-[#888888] text-[11px] font-medium mt-0.5">Years</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-md bg-[#151515] text-[#888888] text-[10px] font-semibold border border-[#222]">Motivation</span>
                <span className="px-2.5 py-1 rounded-md bg-[#151515] text-[#888888] text-[10px] font-semibold border border-[#222]">Mentality</span>
                <span className="px-2.5 py-1 rounded-md bg-[#151515] text-[#888888] text-[10px] font-semibold border border-[#222]">+3</span>
              </div>
            </div>

            {/* Trainer 2 */}
            <div className="group bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl p-5 relative flex flex-col justify-between min-h-[180px] transition-all hover:border-[#2a2a2a] hover:-translate-y-1">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1 tracking-tight">Lerry Rops</h3>
                  <p className="text-[#888888] text-[13px] font-medium">Strength Trainer</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#1a1a1a] group-hover:bg-accent flex items-center justify-center text-[#888888] group-hover:text-black transition-colors group-hover:shadow-lg shadow-accent/30">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 19L19 5M19 5v10M19 5H9" /></svg>
                </div>
              </div>
              <div className="flex gap-8 mb-5">
                <div>
                  <div className="text-xl font-bold text-white flex items-center gap-0.5">2<span className="text-[#ef4444] text-sm">+</span></div>
                  <div className="text-[#888888] text-[11px] font-medium mt-0.5">Clients</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-white flex items-center gap-0.5">1<span className="text-[#22c55e] text-sm">+</span></div>
                  <div className="text-[#888888] text-[11px] font-medium mt-0.5">Years</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-md bg-[#151515] text-[#888888] text-[10px] font-semibold border border-[#222]">Weight</span>
                <span className="px-2.5 py-1 rounded-md bg-[#151515] text-[#888888] text-[10px] font-semibold border border-[#222]">Power</span>
                <span className="px-2.5 py-1 rounded-md bg-[#151515] text-[#888888] text-[10px] font-semibold border border-[#222]">+2</span>
              </div>
            </div>

            {/* Trainer 3 */}
            <div className="group bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl p-5 relative flex flex-col justify-between min-h-[180px] transition-all hover:border-[#2a2a2a] hover:-translate-y-1">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1 tracking-tight">Doez Pon</h3>
                  <p className="text-[#888888] text-[13px] font-medium">Endurance Trainer</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#1a1a1a] group-hover:bg-accent flex items-center justify-center text-[#888888] group-hover:text-black transition-colors group-hover:shadow-lg shadow-accent/30">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 19L19 5M19 5v10M19 5H9" /></svg>
                </div>
              </div>
              <div className="flex gap-8 mb-5">
                <div>
                  <div className="text-xl font-bold text-white flex items-center gap-0.5">5<span className="text-[#ef4444] text-sm">+</span></div>
                  <div className="text-[#888888] text-[11px] font-medium mt-0.5">Clients</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-white flex items-center gap-0.5">4<span className="text-[#22c55e] text-sm">+</span></div>
                  <div className="text-[#888888] text-[11px] font-medium mt-0.5">Years</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-md bg-[#151515] text-[#888888] text-[10px] font-semibold border border-[#222]">Military</span>
                <span className="px-2.5 py-1 rounded-md bg-[#151515] text-[#888888] text-[10px] font-semibold border border-[#222]">Endurance</span>
                <span className="px-2.5 py-1 rounded-md bg-[#151515] text-[#888888] text-[10px] font-semibold border border-[#222]">+5</span>
              </div>
            </div>

            {/* Trainer 4 */}
            <div className="group bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl p-5 relative flex flex-col justify-between min-h-[180px] transition-all hover:border-[#2a2a2a] hover:-translate-y-1">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1 tracking-tight">Max Strong</h3>
                  <p className="text-[#888888] text-[13px] font-medium">Bodybuilding Coach</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#1a1a1a] group-hover:bg-accent flex items-center justify-center text-[#888888] group-hover:text-black transition-colors group-hover:shadow-lg shadow-accent/30">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 19L19 5M19 5v10M19 5H9" /></svg>
                </div>
              </div>
              <div className="flex gap-8 mb-5">
                <div>
                  <div className="text-xl font-bold text-white flex items-center gap-0.5">6<span className="text-[#ef4444] text-sm">+</span></div>
                  <div className="text-[#888888] text-[11px] font-medium mt-0.5">Clients</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-white flex items-center gap-0.5">4<span className="text-[#22c55e] text-sm">+</span></div>
                  <div className="text-[#888888] text-[11px] font-medium mt-0.5">Years</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-md bg-[#151515] text-[#888888] text-[10px] font-semibold border border-[#222]">Muscle Gain</span>
                <span className="px-2.5 py-1 rounded-md bg-[#151515] text-[#888888] text-[10px] font-semibold border border-[#222]">Mindset</span>
                <span className="px-2.5 py-1 rounded-md bg-[#151515] text-[#888888] text-[10px] font-semibold border border-[#222]">+2</span>
              </div>
            </div>

            {/* Trainer 5 */}
            <div className="group bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl p-5 relative flex flex-col justify-between min-h-[180px] transition-all hover:border-[#2a2a2a] hover:-translate-y-1">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1 tracking-tight">John Matui</h3>
                  <p className="text-[#888888] text-[13px] font-medium">Swimmer Coach</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#1a1a1a] group-hover:bg-accent flex items-center justify-center text-[#888888] group-hover:text-black transition-colors group-hover:shadow-lg shadow-accent/30">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 19L19 5M19 5v10M19 5H9" /></svg>
                </div>
              </div>
              <div className="flex gap-8 mb-5">
                <div>
                  <div className="text-xl font-bold text-white flex items-center gap-0.5">12<span className="text-[#ef4444] text-sm">+</span></div>
                  <div className="text-[#888888] text-[11px] font-medium mt-0.5">Clients</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-white flex items-center gap-0.5">6<span className="text-[#22c55e] text-sm">+</span></div>
                  <div className="text-[#888888] text-[11px] font-medium mt-0.5">Years</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-md bg-[#151515] text-[#888888] text-[10px] font-semibold border border-[#222]">Agility</span>
                <span className="px-2.5 py-1 rounded-md bg-[#151515] text-[#888888] text-[10px] font-semibold border border-[#222]">Heart-rate</span>
                <span className="px-2.5 py-1 rounded-md bg-[#151515] text-[#888888] text-[10px] font-semibold border border-[#222]">+4</span>
              </div>
            </div>

            {/* Trainer 6 */}
            <div className="group bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl p-5 relative flex flex-col justify-between min-h-[180px] transition-all hover:border-[#2a2a2a] hover:-translate-y-1">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1 tracking-tight">Jake Flex</h3>
                  <p className="text-[#888888] text-[13px] font-medium">Muaythai Coach</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#1a1a1a] group-hover:bg-accent flex items-center justify-center text-[#888888] group-hover:text-black transition-colors group-hover:shadow-lg shadow-accent/30">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 19L19 5M19 5v10M19 5H9" /></svg>
                </div>
              </div>
              <div className="flex gap-8 mb-5">
                <div>
                  <div className="text-xl font-bold text-white flex items-center gap-0.5">10<span className="text-[#ef4444] text-sm">+</span></div>
                  <div className="text-[#888888] text-[11px] font-medium mt-0.5">Clients</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-white flex items-center gap-0.5">4<span className="text-[#22c55e] text-sm">+</span></div>
                  <div className="text-[#888888] text-[11px] font-medium mt-0.5">Years</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-md bg-[#151515] text-[#888888] text-[10px] font-semibold border border-[#222]">Self-defense</span>
                <span className="px-2.5 py-1 rounded-md bg-[#151515] text-[#888888] text-[10px] font-semibold border border-[#222]">Fighting</span>
                <span className="px-2.5 py-1 rounded-md bg-[#151515] text-[#888888] text-[10px] font-semibold border border-[#222]">+3</span>
              </div>
            </div>

          </div>

          {/* View More Button */}
          <div className="text-center">
            <Link href="/login" className="inline-block px-10 py-3.5 bg-accent text-black text-[15px] font-bold rounded-xl shadow-[0_0_20px_rgba(184,241,117,0.2)] hover:shadow-[0_0_30px_rgba(184,241,117,0.4)] hover:-translate-y-1 transition-all">
              View More
            </Link>
          </div>
        </div>
      </section>

      {/* Workout Categories Section */}
      <section className="py-24 px-4 w-full relative z-10 bg-bg-primary border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              <span className="bg-gradient-to-r from-white via-white to-neutral-500 bg-clip-text text-transparent">
                Workout Categories
              </span>
            </h2>
            <p className="text-[#888888] text-[13px] md:text-sm max-w-3xl mx-auto font-medium">
              Find workouts tailored to your fitness goals. Choose a category and get started today!
            </p>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* 1. Boxing */}
            <div className="flex items-center gap-4 bg-bg-card border border-[#1a1a1a] rounded-2xl p-3 pr-6 hover:bg-bg-card-hover transition-colors cursor-pointer group hover:border-[#2a2a2a]">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-accent shadow-[0_0_15px_rgba(184,241,117,0.2)] group-hover:scale-105 transition-transform">🥊</div>
              <div>
                <h3 className="text-white font-bold text-[15px] mb-0.5 tracking-tight">Boxing</h3>
                <p className="text-[#888888] text-[12px] font-medium">12 Trainers</p>
              </div>
            </div>

            {/* 2. Yoga */}
            <div className="flex items-center gap-4 bg-bg-card border border-[#1a1a1a] rounded-2xl p-3 pr-6 hover:bg-bg-card-hover transition-colors cursor-pointer group hover:border-[#2a2a2a]">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-[#fde047] shadow-[0_0_15px_rgba(253,224,71,0.2)] group-hover:scale-105 transition-transform">🧘‍♀️</div>
              <div>
                <h3 className="text-white font-bold text-[15px] mb-0.5 tracking-tight">Yoga</h3>
                <p className="text-[#888888] text-[12px] font-medium">16 Trainers</p>
              </div>
            </div>

            {/* 3. Cardio */}
            <div className="flex items-center gap-4 bg-bg-card border border-[#1a1a1a] rounded-2xl p-3 pr-6 hover:bg-bg-card-hover transition-colors cursor-pointer group hover:border-[#2a2a2a]">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-[#7dd3fc] shadow-[0_0_15px_rgba(125,211,252,0.2)] group-hover:scale-105 transition-transform">🏃‍♂️</div>
              <div>
                <h3 className="text-white font-bold text-[15px] mb-0.5 tracking-tight">Cardio</h3>
                <p className="text-[#888888] text-[12px] font-medium">11 Trainers</p>
              </div>
            </div>

            {/* 4. Strength Training */}
            <div className="flex items-center gap-4 bg-bg-card border border-[#1a1a1a] rounded-2xl p-3 pr-6 hover:bg-bg-card-hover transition-colors cursor-pointer group hover:border-[#2a2a2a]">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-[#fdba74] shadow-[0_0_15px_rgba(253,186,116,0.2)] group-hover:scale-105 transition-transform">🏋️‍♂️</div>
              <div>
                <h3 className="text-white font-bold text-[15px] mb-0.5 tracking-tight">Strength Training</h3>
                <p className="text-[#888888] text-[12px] font-medium">10 Trainers</p>
              </div>
            </div>

            {/* 5. Pilates */}
            <div className="flex items-center gap-4 bg-bg-card border border-[#1a1a1a] rounded-2xl p-3 pr-6 hover:bg-bg-card-hover transition-colors cursor-pointer group hover:border-[#2a2a2a]">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-[#fbcfe8] shadow-[0_0_15px_rgba(251,207,232,0.2)] group-hover:scale-105 transition-transform">🧘</div>
              <div>
                <h3 className="text-white font-bold text-[15px] mb-0.5 tracking-tight">Pilates</h3>
                <p className="text-[#888888] text-[12px] font-medium">7 Trainers</p>
              </div>
            </div>

            {/* 6. CrossFit */}
            <div className="flex items-center gap-4 bg-bg-card border border-[#1a1a1a] rounded-2xl p-3 pr-6 hover:bg-bg-card-hover transition-colors cursor-pointer group hover:border-[#2a2a2a]">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-[#67e8f9] shadow-[0_0_15px_rgba(103,232,249,0.2)] group-hover:scale-105 transition-transform">🔥</div>
              <div>
                <h3 className="text-white font-bold text-[15px] mb-0.5 tracking-tight">CrossFit</h3>
                <p className="text-[#888888] text-[12px] font-medium">3 Trainers</p>
              </div>
            </div>

            {/* 7. Cycling */}
            <div className="flex items-center gap-4 bg-bg-card border border-[#1a1a1a] rounded-2xl p-3 pr-6 hover:bg-bg-card-hover transition-colors cursor-pointer group hover:border-[#2a2a2a]">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-[#ffedd5] shadow-[0_0_15px_rgba(255,237,213,0.2)] group-hover:scale-105 transition-transform">🚴</div>
              <div>
                <h3 className="text-white font-bold text-[15px] mb-0.5 tracking-tight">Cycling</h3>
                <p className="text-[#888888] text-[12px] font-medium">2 Trainers</p>
              </div>
            </div>

            {/* 8. Martial Arts */}
            <div className="flex items-center gap-4 bg-bg-card border border-[#1a1a1a] rounded-2xl p-3 pr-6 hover:bg-bg-card-hover transition-colors cursor-pointer group hover:border-[#2a2a2a]">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-[#d8b4fe] shadow-[0_0_15px_rgba(216,180,254,0.2)] group-hover:scale-105 transition-transform">🥋</div>
              <div>
                <h3 className="text-white font-bold text-[15px] mb-0.5 tracking-tight">Martial Arts</h3>
                <p className="text-[#888888] text-[12px] font-medium">5 Trainers</p>
              </div>
            </div>

            {/* 9. Running */}
            <div className="flex items-center gap-4 bg-bg-card border border-[#1a1a1a] rounded-2xl p-3 pr-6 hover:bg-bg-card-hover transition-colors cursor-pointer group hover:border-[#2a2a2a]">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-[#bbf7d0] shadow-[0_0_15px_rgba(187,247,208,0.2)] group-hover:scale-105 transition-transform">👟</div>
              <div>
                <h3 className="text-white font-bold text-[15px] mb-0.5 tracking-tight">Running</h3>
                <p className="text-[#888888] text-[12px] font-medium">9 Trainers</p>
              </div>
            </div>

            {/* 10. Zumba */}
            <div className="flex items-center gap-4 bg-bg-card border border-[#1a1a1a] rounded-2xl p-3 pr-6 hover:bg-bg-card-hover transition-colors cursor-pointer group hover:border-[#2a2a2a]">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-[#fca5a5] shadow-[0_0_15px_rgba(252,165,165,0.2)] group-hover:scale-105 transition-transform">💃</div>
              <div>
                <h3 className="text-white font-bold text-[15px] mb-0.5 tracking-tight">Zumba</h3>
                <p className="text-[#888888] text-[12px] font-medium">3 Trainers</p>
              </div>
            </div>

            {/* 11. Stretching */}
            <div className="flex items-center gap-4 bg-bg-card border border-[#1a1a1a] rounded-2xl p-3 pr-6 hover:bg-bg-card-hover transition-colors cursor-pointer group hover:border-[#2a2a2a]">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-[#bae6fd] shadow-[0_0_15px_rgba(186,230,253,0.2)] group-hover:scale-105 transition-transform">🤸‍♀️</div>
              <div>
                <h3 className="text-white font-bold text-[15px] mb-0.5 tracking-tight">Stretching</h3>
                <p className="text-[#888888] text-[12px] font-medium">13 Trainers</p>
              </div>
            </div>

            {/* 12. Swimming */}
            <div className="flex items-center gap-4 bg-bg-card border border-[#1a1a1a] rounded-2xl p-3 pr-6 hover:bg-bg-card-hover transition-colors cursor-pointer group hover:border-[#2a2a2a]">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-[#fef08a] shadow-[0_0_15px_rgba(254,240,138,0.2)] group-hover:scale-105 transition-transform">🏊‍♂️</div>
              <div>
                <h3 className="text-white font-bold text-[15px] mb-0.5 tracking-tight">Swimming</h3>
                <p className="text-[#888888] text-[12px] font-medium">10 Trainers</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div id="pricing">
        <Pricing />
      </div>

      <div id="testimonials">
        <Testimonials />
      </div>

      <div id="facilities">
        <ImageCollage />
      </div>

      <Footer />

    </div>
  );
}
