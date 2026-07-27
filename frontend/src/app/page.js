'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { LineChart, Users, CalendarCheck, Search, ChevronDown, X, MessageSquare, Check, TrendingUp, Wallet } from 'lucide-react';
import Testimonials from '@/components/Testimonials';
import Pricing from '@/components/Pricing';

import Footer from '@/components/Footer';
import { Typewriter3D } from '@/components/Typewriter3D';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { superAdminApi } from '@/lib/api';

export default function LandingPage() {
  const containerRef = useRef(null);
  const progressVal = useMotionValue(0);
  const smoothProgress = useSpring(progressVal, {
    stiffness: 60,
    damping: 20,
    restDelta: 0.001
  });

  const card0X = useTransform(smoothProgress, [0.0, 0.08, 0.20, 0.25], ["100vw", "0vw", "0vw", "-100vw"]);
  const card0Opacity = useTransform(smoothProgress, [0.0, 0.08, 0.20, 0.25], [0, 1, 1, 0]);

  const card1X = useTransform(smoothProgress, [0.25, 0.33, 0.45, 0.50], ["100vw", "0vw", "0vw", "-100vw"]);
  const card1Opacity = useTransform(smoothProgress, [0.25, 0.33, 0.45, 0.50], [0, 1, 1, 0]);

  const card2X = useTransform(smoothProgress, [0.50, 0.58, 0.70, 0.75], ["100vw", "0vw", "0vw", "-100vw"]);
  const card2Opacity = useTransform(smoothProgress, [0.50, 0.58, 0.70, 0.75], [0, 1, 1, 0]);

  const card3X = useTransform(smoothProgress, [0.75, 0.83, 1.0], ["100vw", "0vw", "0vw"]);
  const card3Opacity = useTransform(smoothProgress, [0.75, 0.83, 1.0], [0, 1, 1]);

  const cardTransforms = [
    { x: card0X, opacity: card0Opacity },
    { x: card1X, opacity: card1Opacity },
    { x: card2X, opacity: card2Opacity },
    { x: card3X, opacity: card3Opacity }
  ];

  const containerRef2 = useRef(null);
  const progressVal2 = useMotionValue(0);
  const smoothProgress2 = useSpring(progressVal2, {
    stiffness: 60,
    damping: 20,
    restDelta: 0.001
  });

  const card0X2 = useTransform(smoothProgress2, [0.0, 0.08, 0.20, 0.25], ["100vw", "0vw", "0vw", "-100vw"]);
  const card0Opacity2 = useTransform(smoothProgress2, [0.0, 0.08, 0.20, 0.25], [0, 1, 1, 0]);

  const card1X2 = useTransform(smoothProgress2, [0.25, 0.33, 0.45, 0.50], ["100vw", "0vw", "0vw", "-100vw"]);
  const card1Opacity2 = useTransform(smoothProgress2, [0.25, 0.33, 0.45, 0.50], [0, 1, 1, 0]);

  const card2X2 = useTransform(smoothProgress2, [0.50, 0.58, 1.0], ["100vw", "0vw", "0vw"]);
  const card2Opacity2 = useTransform(smoothProgress2, [0.50, 0.58, 1.0], [0, 1, 1]);

  const cardTransforms2 = [
    { x: card0X2, opacity: card0Opacity2 },
    { x: card1X2, opacity: card1Opacity2 },
    { x: card2X2, opacity: card2Opacity2 }
  ];

  const [appName, setAppName] = useState('goJim');
  const [logo, setLogo] = useState('');
  const [logoBg, setLogoBg] = useState('');
  const [hasMounted, setHasMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Read from cache synchronously on client-side mount to prevent visual delay
    const cachedName = localStorage.getItem('gojim_public_app_name');
    if (cachedName) setAppName(cachedName);
    const cachedLogo = localStorage.getItem('gojim_public_logo');
    if (cachedLogo) setLogo(cachedLogo);
    const cachedLogoBg = localStorage.getItem('gojim_public_logo_bg');
    if (cachedLogoBg) setLogoBg(cachedLogoBg);
    setHasMounted(true);

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    superAdminApi.getPublicSettings()
      .then(res => {
        if (res.success) {
          if (res.data?.appName) {
            setAppName(res.data.appName);
            localStorage.setItem('gojim_public_app_name', res.data.appName);
          }
          if (res.data?.logo) {
            setLogo(res.data.logo);
            localStorage.setItem('gojim_public_logo', res.data.logo);
          } else {
            localStorage.removeItem('gojim_public_logo');
          }
          if (res.data?.logoBg) {
            setLogoBg(res.data.logoBg);
            localStorage.setItem('gojim_public_logo_bg', res.data.logoBg);
          } else {
            localStorage.removeItem('gojim_public_logo_bg');
          }
        }
      })
      .catch(() => { });

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    if (!isMobile) return;

    const handleScroll = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const totalScrollable = rect.height - windowHeight;
        if (totalScrollable > 0) {
          const scrolled = -rect.top;
          const progress = Math.max(0, Math.min(1, scrolled / totalScrollable));
          progressVal.set(progress);
        }
      }

      if (containerRef2.current) {
        const rect = containerRef2.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const totalScrollable = rect.height - windowHeight;
        if (totalScrollable > 0) {
          const scrolled = -rect.top;
          const progress = Math.max(0, Math.min(1, scrolled / totalScrollable));
          progressVal2.set(progress);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    // Call once initially
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [progressVal, progressVal2, isMobile]);

  const [selectedFeature, setSelectedFeature] = useState(null);

  const featureData = {
    whatsapp: {
      title: "WhatsApp Automation",
      subtitle: "Integrated Automated Alerts & Templates",
      icon: <MessageSquare size={20} className="text-black" />,
      description: "Automated WhatsApp alerts triggered on membership actions. Gym owners have complete control to edit templates and toggle all notifications.",
      points: [
        { title: "Renewal Alerts", desc: "Pings clients 3 days before their plan lapses with direct payment links." },
        { title: "Staff Slips", desc: "Automatically texts trainer summaries when payroll is disbursed." },
        { title: "Birthday Wishes", desc: "Sends custom greeting templates dynamically to members on their birthday." },
        { title: "Lead Outreach", desc: "Automated nudge follow-ups to inquiries and trials to boost conversions." }
      ]
    },
    runway: {
      title: "Gym Income & Expenses",
      subtitle: "Simple Monthly Cash Tracker",
      icon: <LineChart size={20} className="text-black" />,
      description: "Track monthly membership revenue, trainer salary payouts, and operational expenses in one screen.",
      points: [
        { title: "Cash Status", desc: "Instantly check if monthly income covers overhead costs." },
        { title: "Upcoming Renewals", desc: "List members who need to renew soon so you don't lose revenue." },
        { title: "Overhead Logs", desc: "Log rent, electricity, generator fuel, and machine repairs easily." },
        { title: "Cost Warnings", desc: "Get warned if monthly gym expenses exceed subscription revenue." }
      ]
    },
    troubleshooting: {
      title: "Remote Support & Debugging",
      subtitle: "Help Gym Staff Instantly",
      icon: <Search size={20} className="text-black" />,
      description: "Super admins can log into any gym dashboard securely to help set up memberships and fix mistakes without sharing passwords.",
      points: [
        { title: "Shared Screen Help", desc: "Log in as the gym owner to see exactly what they see on their screen." },
        { title: "One-Click Exit", desc: "Exit support mode instantly to return to your admin account." },
        { title: "Secure Logging", desc: "Automatically tracks support entry logs to ensure security." }
      ]
    }
  };

  const [activeSection, setActiveSection] = useState('home');
  const [showNavDemoBtn, setShowNavDemoBtn] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNavbarShrunk, setIsNavbarShrunk] = useState(false);
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

      // Temporarily disable native smooth scroll to avoid conflict with JS requestAnimationFrame steps
      const htmlEl = document.documentElement;
      const originalScrollBehavior = htmlEl.style.scrollBehavior;
      htmlEl.style.scrollBehavior = 'auto';

      const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - 100;
      const startPosition = window.pageYOffset;
      const distance = targetPosition - startPosition;
      const duration = 800; // Snappier duration for better user experience
      let start = null;

      const step = (timestamp) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);

        // Smooth Ease In Out Quad
        const easing = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        window.scrollTo(0, startPosition + distance * easing);

        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
          // Restore original scroll behavior once scrolling is complete
          htmlEl.style.scrollBehavior = originalScrollBehavior;
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

    const sections = ['home', 'features', 'why-us', 'pricing', 'testimonials'];
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

  useEffect(() => {
    let lastScrollY = window.pageYOffset;
    const handleScroll = () => {
      // Only apply scroll shrinking on mobile viewports
      if (window.innerWidth >= 768) {
        setIsNavbarShrunk(false);
        return;
      }
      const currentScrollY = window.pageYOffset;
      if (currentScrollY > 50) {
        if (currentScrollY > lastScrollY) {
          setIsNavbarShrunk(true);
        } else {
          setIsNavbarShrunk(false);
        }
      } else {
        setIsNavbarShrunk(false);
      }
      lastScrollY = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const navLinks = [
    { name: 'Home', href: '/#home', id: 'home' },
    { name: 'Features', href: '/#features', id: 'features' },
    { name: 'Why Us', href: '/#why-us', id: 'why-us' },
    { name: 'Pricing', href: '/#pricing', id: 'pricing' },
    { name: 'Testimonials', href: '/#testimonials', id: 'testimonials' },
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
      <nav className="fixed top-6 left-0 right-0 z-[10000] flex flex-col items-center px-4 pointer-events-none">
        {/* Desktop Unified Navbar Card */}
        <div className="hidden md:grid w-full max-w-6xl border border-white/10 rounded-2xl px-6 md:px-8 py-3 grid-cols-3 items-center shadow-2xl pointer-events-auto relative z-[10001]"
          style={{
            backgroundColor: 'rgba(22, 22, 23, 0.72)',
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
              className={`flex items-center gap-3 no-underline transition-all duration-350 ${hasMounted ? 'opacity-100' : 'opacity-0'}`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-base font-extrabold text-white shadow-inner overflow-hidden ${(!logoBg && !logo) ? 'bg-gradient-to-br from-accent to-accent-dark' : 'bg-transparent'}`}
                style={logoBg ? { background: logoBg, backgroundColor: logoBg } : undefined}
              >
                {logo ? (
                  <img src={logo} alt={appName} className="w-full h-full object-cover" />
                ) : (
                  (appName || 'goJim')[0]?.toUpperCase()
                )}
              </div>
              <span className="font-extrabold text-xl tracking-tight text-text-primary">{appName}</span>
            </Link>
          </div>

          {/* Links (Desktop) */}
          <div className="flex items-center justify-center gap-1 text-[13px] font-semibold col-span-1">
            {navLinks.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                scroll={false}
                onClick={(e) => scrollToSection(e, link.id)}
                className={`relative px-4 py-2 rounded-lg transition-all duration-300 no-underline z-10 whitespace-nowrap
                  ${activeSection === link.id
                    ? 'text-black font-extrabold'
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

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 md:gap-3">
            <Link href="/login" className="px-4 py-2 text-[13px] font-semibold text-gray-300 hover:text-white transition-colors no-underline">
              Login
            </Link>
            {showNavDemoBtn && (
              <Link
                href="/#pricing"
                scroll={false}
                onClick={(e) => scrollToSection(e, 'pricing')}
                className="px-5 py-2.5 bg-accent hover:bg-accent-light text-black text-[13px] font-extrabold rounded-xl transition-all shadow-lg shadow-accent/20 hover:shadow-accent/40 whitespace-nowrap no-underline"
              >
                Request a Demo
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Floating Capsule Pills */}
        <div className="flex md:hidden w-full justify-between items-center relative z-[10001]">
          {/* Logo Pill */}
          <div className={`pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] bg-zinc-800/80 backdrop-blur-xl saturate-[1.8] border border-white/10 rounded-full shadow-2xl flex items-center ${isNavbarShrunk ? 'py-1.5 px-4' : 'py-2.5 px-5'
            } ${isMobileMenuOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}>
            <Link
              href="/"
              scroll={false}
              onClick={(e) => {
                setIsMobileMenuOpen(false);
                scrollToSection(e, 'home');
              }}
              className={`flex items-center gap-3 no-underline transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${hasMounted ? 'opacity-100' : 'opacity-0'}`}
            >
              <div
                className={`rounded-lg flex items-center justify-center text-base font-extrabold text-white shadow-inner overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${(!logoBg && !logo) ? 'bg-gradient-to-br from-accent to-accent-dark' : 'bg-transparent'} ${isNavbarShrunk ? 'w-7 h-7' : 'w-8 h-8'
                  }`}
                style={logoBg ? { background: logoBg, backgroundColor: logoBg } : undefined}
              >
                {logo ? (
                  <img src={logo} alt={appName} className="w-full h-full object-cover" />
                ) : (
                  (appName || 'goJim')[0]?.toUpperCase()
                )}
              </div>
              <span className={`font-extrabold tracking-tight text-text-primary transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isNavbarShrunk ? 'text-lg' : 'text-xl'
                }`}>{appName}</span>
            </Link>
          </div>

          {/* Mobile Hamburger / Close Pill */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`pointer-events-auto flex items-center justify-center rounded-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] border focus:outline-none z-50 relative ${isNavbarShrunk ? 'w-10 h-10' : 'w-12 h-12'
              } ${isMobileMenuOpen
                ? 'bg-transparent border-transparent text-zinc-300'
                : 'bg-zinc-800/80 border-white/10 text-gray-400 hover:text-white backdrop-blur-xl saturate-[1.8] shadow-2xl'
              }`}
            aria-label="Toggle menu"
          >
            <div
              className="flex flex-col justify-center items-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] relative w-6 h-5 gap-[5px]"
              style={{ transform: isNavbarShrunk ? 'scale(0.83)' : 'scale(1)' }}
            >
              <div className={`w-5 h-[2px] bg-current rounded transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transform origin-center ${isMobileMenuOpen ? 'rotate-45 translate-y-[7px]' : ''
                }`} />
              <div className={`w-5 h-[2px] bg-current rounded transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isMobileMenuOpen ? 'opacity-0 scale-0' : ''
                }`} />
              <div className={`w-5 h-[2px] bg-current rounded transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transform origin-center ${isMobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''
                }`} />
            </div>
          </button>
        </div>

        {/* Full-Screen Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              key="mobile-menu-overlay"
              variants={{
                closed: {
                  clipPath: "circle(0px at calc(100% - 36px) 50px)"
                },
                open: {
                  clipPath: "circle(150% at calc(100% - 36px) 50px)",
                  transition: {
                    duration: 0.5,
                    ease: [0.76, 0, 0.24, 1]
                  }
                },
                exit: {
                  clipPath: "circle(0px at calc(100% - 36px) 50px)",
                  transition: {
                    delay: 0.45, // Wait for slide-outs to complete
                    duration: 0.5,
                    ease: [0.76, 0, 0.24, 1]
                  }
                }
              }}
              initial="closed"
              animate="open"
              exit="exit"
              className="fixed inset-0 z-[9999] bg-black/98 backdrop-blur-2xl md:hidden flex flex-col justify-between pt-24 px-8 pb-20"
            >

              <div className="flex flex-col gap-6 mt-8 mb-auto text-left pl-4 w-full">
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.id}
                    variants={{
                      closed: { x: 80, opacity: 0 },
                      open: {
                        x: 0,
                        opacity: 1,
                        transition: {
                          delay: 0.35 + i * 0.08,
                          duration: 0.45,
                          ease: [0.16, 1, 0.3, 1]
                        }
                      },
                      exit: {
                        x: 80,
                        opacity: 0,
                        transition: {
                          delay: (navLinks.length + 1 - i) * 0.05,
                          duration: 0.3,
                          ease: [0.76, 0, 0.24, 1]
                        }
                      }
                    }}
                    initial="closed"
                    animate="open"
                    exit="exit"
                  >
                    <Link
                      href={link.href}
                      scroll={false}
                      onClick={(e) => {
                        setIsMobileMenuOpen(false);
                        scrollToSection(e, link.id);
                      }}
                      className="no-underline group flex items-center gap-4 py-2"
                    >
                      <span className={`text-3xl font-black tracking-tight transition-colors duration-300 ${activeSection === link.id ? 'text-white' : 'text-zinc-600 group-hover:text-white'
                        }`}>
                        {link.name}
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Bottom Action Footer */}
              <div className="flex flex-col gap-4 w-full">
                <motion.div
                  variants={{
                    closed: { opacity: 0 },
                    open: { opacity: 1, transition: { delay: 0.2 } },
                    exit: { opacity: 0, transition: { duration: 0.2 } }
                  }}
                  initial="closed"
                  animate="open"
                  exit="exit"
                  className="h-[1px] w-full bg-white/10"
                />

                <motion.div
                  variants={{
                    closed: { x: 80, opacity: 0 },
                    open: {
                      x: 0,
                      opacity: 1,
                      transition: {
                        delay: 0.35 + navLinks.length * 0.08,
                        duration: 0.45,
                        ease: [0.16, 1, 0.3, 1]
                      }
                    },
                    exit: {
                      x: 80,
                      opacity: 0,
                      transition: {
                        delay: 0.05,
                        duration: 0.3,
                        ease: [0.76, 0, 0.24, 1]
                      }
                    }
                  }}
                  initial="closed"
                  animate="open"
                  exit="exit"
                  className="w-full"
                >
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full block py-4 rounded-xl text-center text-base font-bold text-gray-305 hover:text-white hover:bg-white/5 no-underline border border-white/10 bg-white/5 transition-all"
                  >
                    Login
                  </Link>
                </motion.div>

                <motion.div
                  variants={{
                    closed: { x: 80, opacity: 0 },
                    open: {
                      x: 0,
                      opacity: 1,
                      transition: {
                        delay: 0.35 + (navLinks.length + 1) * 0.08,
                        duration: 0.45,
                        ease: [0.16, 1, 0.3, 1]
                      }
                    },
                    exit: {
                      x: 80,
                      opacity: 0,
                      transition: {
                        delay: 0,
                        duration: 0.3,
                        ease: [0.76, 0, 0.24, 1]
                      }
                    }
                  }}
                  initial="closed"
                  animate="open"
                  exit="exit"
                  className="w-full"
                >
                  <Link
                    href="/#pricing"
                    scroll={false}
                    onClick={(e) => {
                      setIsMobileMenuOpen(false);
                      scrollToSection(e, 'pricing');
                    }}
                    className="w-full block py-4 rounded-xl text-center text-base font-black bg-accent hover:bg-accent-light text-black no-underline shadow-lg shadow-accent/20 active:scale-95 transition-all"
                  >
                    Request a Demo
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <header id="home" className="pt-48 px-4 flex flex-col items-center text-center w-full mx-auto relative z-10">

        {/* Subtle background glow */}
        <div className="absolute top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/5 blur-[120px] rounded-[100%] pointer-events-none" />

        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
            <span className="bg-gradient-to-br from-white via-white to-neutral-500 bg-clip-text text-transparent">
              Scale Your Gym<br />
              <Typewriter3D
                words={["Revenue Growth", "Member Retention", "Automated Alerts", "Trainer Payrolls", "Business Runway"]}
                className="text-accent"
              />
            </span>
          </h1>

          <p className="text-sm md:text-base text-neutral-400 mb-8 max-w-xl font-medium leading-relaxed">
            Focus on scaling, not spreadsheets.
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
      <section className="py-12 px-4 w-full relative z-10 border-t border-white/5 bg-[#030303]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <p className="text-[#888888] text-sm md:text-base max-w-2xl mx-auto leading-relaxed font-semibold">
              Designed in partnership with gym owners, club directors, and franchise operators to ensure zero revenue leakage and peak operational efficiency.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section - Conditional Render */}
      {isMobile ? (
        /* Mobile Sticky Scroll Slider Interaction */
        <section ref={containerRef} id="features" className="relative h-[300vh] w-full bg-bg-primary">
          <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden pt-28 pb-12 px-4 z-10">
            
            {/* Sticky Pinned Header */}
            <div className="text-center mb-8 max-w-2xl">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                <span className="bg-gradient-to-r from-white via-white to-neutral-500 bg-clip-text text-transparent">
                  Optimize Your Gym Operations
                </span>
              </h2>
              <p className="text-[#888888] text-[13px] md:text-sm leading-relaxed font-medium">
                Take full control of your gym operations with powerful tools for tracking revenue, managing members, scheduling classes, and more.
              </p>
            </div>

            {/* Card Viewport Slider */}
            <div className="relative w-full max-w-lg h-[350px] flex items-center justify-center overflow-hidden">
              {[
                {
                  title: "Income & Expenses",
                  desc: "Track monthly revenue, expenses, and upcoming renewals at a glance.",
                  icon: <TrendingUp size={24} className="text-black" strokeWidth={2.5} />,
                  bgColor: "bg-accent",
                  glowColor: "bg-accent"
                },
                {
                  title: "Retention Analytics",
                  desc: "Spot inactive members and stop churn before they leave.",
                  icon: <Users size={24} className="text-black" strokeWidth={2.5} />,
                  bgColor: "bg-[#fde047]",
                  glowColor: "bg-[#fde047]"
                },
                {
                  title: "PT & Scheduler",
                  desc: "Schedule coaching slots, trainer batches, and personal sessions.",
                  icon: <CalendarCheck size={24} className="text-black" strokeWidth={2.5} />,
                  bgColor: "bg-[#7dd3fc]",
                  glowColor: "bg-[#7dd3fc]"
                },
                {
                  title: "Automated Payouts",
                  desc: "Calculate trainer base salaries and PT commissions instantly.",
                  icon: <Wallet size={24} className="text-black" strokeWidth={2.5} />,
                  bgColor: "bg-[#fdba74]",
                  glowColor: "bg-[#fdba74]"
                }
              ].map((card, i) => (
                <motion.div
                  key={i}
                  style={{ x: cardTransforms[i].x, opacity: cardTransforms[i].opacity }}
                  className="absolute w-full max-w-md bg-neutral-900 border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-xl"
                >
                  <div className="relative mb-6">
                    <div className={`absolute inset-0 ${card.glowColor} blur-xl opacity-20 rounded-full mix-blend-screen`}></div>
                    <div className={`w-14 h-14 rounded-2xl ${card.bgColor} flex items-center justify-center relative z-10 shadow-lg`}>
                      {card.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 tracking-tight">{card.title}</h3>
                  <p className="text-[#888888] text-[13px] leading-relaxed max-w-sm">
                    {card.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        /* Desktop/Tablet Static Grid Layout */
        <section id="features" className="py-24 px-4 w-full relative z-10 bg-bg-primary">
          <div className="max-w-5xl mx-auto">
            {/* Desktop Section Header */}
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
                <span className="bg-gradient-to-r from-white via-white to-neutral-500 bg-clip-text text-transparent">
                  Optimize Your Gym Operations
                </span>
              </h2>
              <p className="text-[#888888] text-[13px] md:text-sm max-w-2xl mx-auto leading-relaxed font-medium">
                Take full control of your gym operations with powerful tools for tracking revenue, managing members, scheduling classes, and more.
              </p>
            </div>

            {/* Desktop Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  title: "Income & Expenses",
                  desc: "Track monthly revenue, expenses, and upcoming renewals at a glance.",
                  icon: <TrendingUp size={24} className="text-black" strokeWidth={2.5} />,
                  bgColor: "bg-accent",
                  glowColor: "bg-accent"
                },
                {
                  title: "Retention Analytics",
                  desc: "Spot inactive members and stop churn before they leave.",
                  icon: <Users size={24} className="text-black" strokeWidth={2.5} />,
                  bgColor: "bg-[#fde047]",
                  glowColor: "bg-[#fde047]"
                },
                {
                  title: "PT & Scheduler",
                  desc: "Schedule coaching slots, trainer batches, and personal sessions.",
                  icon: <CalendarCheck size={24} className="text-black" strokeWidth={2.5} />,
                  bgColor: "bg-[#7dd3fc]",
                  glowColor: "bg-[#7dd3fc]"
                },
                {
                  title: "Automated Payouts",
                  desc: "Calculate trainer base salaries and PT commissions instantly.",
                  icon: <Wallet size={24} className="text-black" strokeWidth={2.5} />,
                  bgColor: "bg-[#fdba74]",
                  glowColor: "bg-[#fdba74]"
                }
              ].map((card, i) => (
                <div
                  key={i}
                  className="bg-neutral-900 border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] hover:-translate-y-1 hover:bg-neutral-800/60 transition-all duration-300"
                >
                  <div className="relative mb-6">
                    <div className={`absolute inset-0 ${card.glowColor} blur-xl opacity-20 rounded-full mix-blend-screen`}></div>
                    <div className={`w-14 h-14 rounded-2xl ${card.bgColor} flex items-center justify-center relative z-10 shadow-lg`}>
                      {card.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 tracking-tight">{card.title}</h3>
                  <p className="text-[#888888] text-[13px] leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Boost Your Gym's Success Section - Conditional Render */}
      {isMobile ? (
        /* Mobile Sticky Scroll Slider Interaction */
        <section ref={containerRef2} className="relative h-[300vh] w-full bg-bg-primary">
          <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden pt-28 pb-12 px-4 z-10">
            
            {/* Sticky Pinned Header */}
            <div className="text-center mb-8 max-w-2xl">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                <span className="bg-gradient-to-r from-white via-white to-neutral-500 bg-clip-text text-transparent">
                  Engage & Recover Revenue Automatically
                </span>
              </h2>
              <p className="text-[#888888] text-[13px] md:text-sm leading-relaxed font-medium">
                Tools and features to keep your fitness business running smoothly and efficiently.
              </p>
            </div>

            {/* Card Viewport Slider */}
            <div className="relative w-full max-w-lg h-[410px] flex items-center justify-center overflow-hidden">
              {[
                {
                  id: "whatsapp",
                  title: "WhatsApp Automation",
                  desc: "Trigger direct welcome messages, payment alerts 3 days prior, and comeback nudges automatically.",
                  image: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=400&auto=format&fit=crop"
                },
                {
                  id: "runway",
                  title: "Income & Expenses",
                  desc: "Track gym revenues against operational costs with alerts when overheads exceed income.",
                  image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=400&auto=format&fit=crop"
                },
                {
                  id: "troubleshooting",
                  title: "Remote Support",
                  desc: "Allows support staff to log in and help configure your gym settings without password sharing.",
                  image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=400&auto=format&fit=crop"
                }
              ].map((card, i) => (
                <motion.div
                  key={i}
                  style={{ x: cardTransforms2[i].x, opacity: cardTransforms2[i].opacity }}
                  className="absolute w-full max-w-md bg-neutral-900 border border-white/10 rounded-2xl p-6 flex flex-col items-center text-center shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-xl"
                >
                  <div className="w-full aspect-[4/3] relative mb-5 rounded-lg overflow-hidden flex items-center justify-center bg-black/40">
                    <img src={card.image} alt={card.title} className="w-[110%] h-auto object-cover opacity-90 mix-blend-lighten" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 tracking-tight">{card.title}</h3>
                  <p className="text-[#888888] text-[13px] leading-relaxed mb-4 max-w-sm">
                    {card.desc}
                  </p>
                  <button
                    onClick={() => setSelectedFeature(card.id)}
                    className="inline-flex items-center gap-1.5 text-accent font-bold text-[13px] hover:text-accent-light transition-colors w-fit bg-transparent border-none p-0 cursor-pointer group"
                  >
                    Learn More
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform group-hover:translate-x-1"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        /* Desktop/Tablet Static Grid Layout */
        <section className="pb-24 px-4 w-full relative z-10 bg-bg-primary">
          <div className="max-w-[900px] mx-auto">
            {/* Desktop Section Header */}
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
                <span className="bg-gradient-to-r from-white via-white to-neutral-500 bg-clip-text text-transparent">
                  Engage & Recover Revenue Automatically
                </span>
              </h2>
              <p className="text-[#888888] text-[13px] md:text-sm max-w-2xl mx-auto font-medium">
                Tools and features to keep your fitness business running smoothly and efficiently.
              </p>
            </div>

            {/* Desktop Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  id: "whatsapp",
                  title: "WhatsApp Automation",
                  desc: "Trigger direct welcome messages, payment alerts 3 days prior, and comeback nudges automatically.",
                  image: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=400&auto=format&fit=crop"
                },
                {
                  id: "runway",
                  title: "Income & Expenses",
                  desc: "Track gym revenues against operational costs with alerts when overheads exceed income.",
                  image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=400&auto=format&fit=crop"
                },
                {
                  id: "troubleshooting",
                  title: "Remote Support",
                  desc: "Allows support staff to log in and help configure your gym settings without password sharing.",
                  image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=400&auto=format&fit=crop"
                }
              ].map((card, i) => (
                <div
                  key={i}
                  className="bg-neutral-900 border border-white/10 rounded-2xl p-5 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:bg-neutral-850 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)]"
                >
                  <div className="w-full aspect-[4/3] relative mb-5 rounded-lg overflow-hidden flex items-center justify-center bg-black/40">
                    <img src={card.image} alt={card.title} className="w-[110%] h-auto object-cover opacity-90 transition-opacity hover:opacity-100 mix-blend-lighten" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 tracking-tight">{card.title}</h3>
                  <p className="text-[#888888] text-[13px] leading-relaxed mb-5 flex-1">
                    {card.desc}
                  </p>
                  <button
                    onClick={() => setSelectedFeature(card.id)}
                    className="inline-flex items-center gap-1.5 text-accent font-bold text-[13px] hover:text-accent-light transition-colors w-fit bg-transparent border-none p-0 cursor-pointer group"
                  >
                    Learn More
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform group-hover:translate-x-1"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Growth & Revenue Impact Section */}
      <section id="growth" className="py-24 px-4 w-full relative z-10 bg-[#030303] border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              <span className="bg-gradient-to-r from-white via-white to-neutral-500 bg-clip-text text-transparent">
                Designed for Growth. Engineered for Results.
              </span>
            </h2>
            <p className="text-[#888888] text-[13px] md:text-sm max-w-3xl mx-auto font-medium">
              See the tangible impact of migrating your gym operations to a modern, automated B2B workspace.
            </p>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">

            {/* Metric 1 */}
            <div className="group bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl p-6 relative flex flex-col justify-between min-h-[220px] transition-all hover:border-[#2a2a2a] hover:-translate-y-1">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1 tracking-tight">WhatsApp Engagement</h3>
                  <p className="text-accent text-[13px] font-extrabold">98% Open Rate Alerts</p>
                </div>

              </div>
              <p className="text-[#888888] text-[13px] leading-relaxed mb-5">
                Replace ignored emails with direct WhatsApp messages. Members receive renewal alerts, welcome pings, and comeback nudges right on their phones.
              </p>
              <div className="flex gap-4 border-t border-white/5 pt-4">
                <div>
                  <div className="text-xl font-bold text-white">4.8x</div>
                  <div className="text-[#888888] text-[10px] font-medium">Higher Conversion</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-white">Zero</div>
                  <div className="text-[#888888] text-[10px] font-medium">Email Spam</div>
                </div>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="group bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl p-6 relative flex flex-col justify-between min-h-[220px] transition-all hover:border-[#2a2a2a] hover:-translate-y-1">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1 tracking-tight">Billing Leakage</h3>
                  <p className="text-accent text-[13px] font-extrabold">Auto Lockout Control</p>
                </div>

              </div>
              <p className="text-[#888888] text-[13px] leading-relaxed mb-5">
                Once a client's plan expires, the check-in system restricts gym access automatically. Stop letting unpaid training sessions drain your margins.
              </p>
              <div className="flex gap-4 border-t border-white/5 pt-4">
                <div>
                  <div className="text-xl font-bold text-white">100%</div>
                  <div className="text-[#888888] text-[10px] font-medium">Revenue Capture</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-white">Zero</div>
                  <div className="text-[#888888] text-[10px] font-medium">Manual Audits</div>
                </div>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="group bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl p-6 relative flex flex-col justify-between min-h-[220px] transition-all hover:border-[#2a2a2a] hover:-translate-y-1">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1 tracking-tight">Trainer Compensation</h3>
                  <p className="text-accent text-[13px] font-extrabold">Instant Payroll Splits</p>
                </div>

              </div>
              <p className="text-[#888888] text-[13px] leading-relaxed mb-5">
                Define base salaries and PT commission percentages. Payout reports are calculated automatically based on trainer schedules and active member logs.
              </p>
              <div className="flex gap-4 border-t border-white/5 pt-4">
                <div>
                  <div className="text-xl font-bold text-white">10x</div>
                  <div className="text-[#888888] text-[10px] font-medium">Faster Calculations</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-white">100%</div>
                  <div className="text-[#888888] text-[10px] font-medium">Transparency</div>
                </div>
              </div>
            </div>

          </div>

          {/* Call to Action Button */}
          <div className="text-center">
            <Link href="/signup" className="inline-block px-10 py-3.5 bg-accent text-black text-[15px] font-bold rounded-xl shadow-[0_0_20px_rgba(184,241,117,0.2)] hover:shadow-[0_0_30px_rgba(184,241,117,0.4)] hover:-translate-y-1 transition-all">
              Claim Your 14-Day Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* Why GoJim Section */}
      <section id="why-us" className="py-24 px-4 w-full relative z-10 bg-bg-primary border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              <span className="bg-gradient-to-r from-white via-white to-neutral-500 bg-clip-text text-transparent">
                Why {appName}? Why Not Other Software?
              </span>
            </h2>
            <p className="text-[#888888] text-[13px] md:text-sm max-w-3xl mx-auto font-medium">
              We built the software we wished we had. A comparison between legacy systems and our growth-first operating system.
            </p>
          </div>

          {/* Comparison Table Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Column 1: Legacy Software */}
            <div className="bg-[#0b0b0d] border border-white/5 rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 blur-2xl rounded-full" />
              <h3 className="text-xl font-bold text-zinc-400 mb-6 flex items-center gap-2">
                <span className="text-red-500 shrink-0"></span> Traditional Gym Software
              </h3>

              <ul className="space-y-5 text-sm">
                <li className="flex items-start gap-3">
                  <span className="text-red-500 shrink-0 mt-0.5"><X size={15} strokeWidth={3} /></span>
                  <div>
                    <strong className="text-zinc-300 block mb-0.5">Clunky & Slow Interfaces</strong>
                    <span className="text-zinc-500 text-[13px]">Takes 10+ clicks to perform simple member updates or check-ins.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500 shrink-0 mt-0.5"><X size={15} strokeWidth={3} /></span>
                  <div>
                    <strong className="text-zinc-300 block mb-0.5">Ignored Email Alerts</strong>
                    <span className="text-zinc-500 text-[13px]">Sends emails that land in spam folders or go unread, leading to high client churn.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500 shrink-0 mt-0.5"><X size={15} strokeWidth={3} /></span>
                  <div>
                    <strong className="text-zinc-300 block mb-0.5">Manual Commission Accounting</strong>
                    <span className="text-zinc-500 text-[13px]">Staff spends hours calculating trainer commissions manually in Excel sheets.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500 shrink-0 mt-0.5"><X size={15} strokeWidth={3} /></span>
                  <div>
                    <strong className="text-zinc-300 block mb-0.5">Revenue Leakages</strong>
                    <span className="text-zinc-500 text-[13px]">No automatic check-in blockages, allowing expired members to train for free.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500 shrink-0 mt-0.5"><X size={15} strokeWidth={3} /></span>
                  <div>
                    <strong className="text-zinc-300 block mb-0.5">No Tab Synchronization</strong>
                    <span className="text-zinc-500 text-[13px]">Opening the workspace in multiple tabs leads to state mismatches and bugs.</span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Column 2: GoJim */}
            <div className="bg-[#0b0b0d] border border-accent/20 rounded-2xl p-8 relative overflow-hidden shadow-2xl shadow-accent/5">
              <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 blur-2xl rounded-full" />
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="text-accent shrink-0"></span> {appName} Operating System
              </h3>

              <ul className="space-y-5 text-sm">
                <li className="flex items-start gap-3">
                  <span className="text-accent shrink-0 mt-0.5"><Check size={15} strokeWidth={3} /></span>
                  <div>
                    <strong className="text-white block mb-0.5">Lightning Fast UX</strong>
                    <span className="text-zinc-400 text-[13px]">Glassmorphism responsive UI with instant search, filters, and logs.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent shrink-0 mt-0.5"><Check size={15} strokeWidth={3} /></span>
                  <div>
                    <strong className="text-white block mb-0.5">98% Open-Rate WhatsApp alerts</strong>
                    <span className="text-zinc-400 text-[13px]">Taps into WhatsApp automation to send direct welcome and renewal messages.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent shrink-0 mt-0.5"><Check size={15} strokeWidth={3} /></span>
                  <div>
                    <strong className="text-white block mb-0.5">Automated Trainer Payrolls</strong>
                    <span className="text-zinc-400 text-[13px]">One-click payout reports built dynamically from PT salary configurations.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent shrink-0 mt-0.5"><Check size={15} strokeWidth={3} /></span>
                  <div>
                    <strong className="text-white block mb-0.5">Zero Leakage Billing Enforcement</strong>
                    <span className="text-zinc-400 text-[13px]">Automatically locks workspace access and check-ins the day plans expire.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent shrink-0 mt-0.5"><Check size={15} strokeWidth={3} /></span>
                  <div>
                    <strong className="text-zinc-400 block mb-0.5">Multi-Tab Session Sync</strong>
                    <span className="text-zinc-400 text-[13px]">Inactivity timers and manual logout events synchronize across tabs instantly.</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div id="pricing">
        <Pricing />
      </div>

      <div id="testimonials">
        <Testimonials appName={appName} />
      </div>

      {/* Feature Details Modal */}
      <AnimatePresence>
        {selectedFeature && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-lg bg-[#0e0e11] border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl text-left"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedFeature(null)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors bg-transparent border-none cursor-pointer p-1"
              >
                <X size={20} />
              </button>

              {/* Modal Icon & Header */}
              <div className="flex items-center gap-3.5 mb-6">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-black shadow-lg">
                  {featureData[selectedFeature].icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight leading-snug">{featureData[selectedFeature].title}</h3>
                  <p className="text-xs text-accent font-bold mt-0.5">{featureData[selectedFeature].subtitle}</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-zinc-400 text-xs md:text-sm leading-relaxed mb-6 font-medium">
                {featureData[selectedFeature].description}
              </p>

              {/* Bullet Points */}
              <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-3">Key Capabilities</h4>
              <ul className="space-y-4 mb-8">
                {featureData[selectedFeature].points.map((point, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-accent mt-0.5 font-bold">✓</span>
                    <div>
                      <strong className="text-white text-xs block mb-0.5">{point.title}</strong>
                      <span className="text-zinc-400 text-xs leading-relaxed font-medium">{point.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 border-t border-white/5 pt-5">
                <Link
                  href="/signup"
                  className="flex-1 text-center py-2.5 bg-accent hover:bg-accent-light text-black text-xs font-bold rounded-xl transition-colors no-underline"
                >
                  Try It Free
                </Link>
                <button
                  onClick={() => setSelectedFeature(null)}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl border border-white/5 cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />

    </div>
  );
}
