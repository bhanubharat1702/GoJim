'use client';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, Bell, Menu, User, LogOut, ChevronDown, ChevronUp, Settings, ChevronRight, AlertCircle, X, Users, CreditCard, RefreshCw, Gift, Coins, Dumbbell, Award } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '@/context/UIContext';
import { useState, useRef, useEffect } from 'react';
import { membersApi, leadsApi, trainersApi, staffApi, alertsApi, superAdminApi } from '@/lib/api';

const pagesList = [
  { href: '/dashboard', label: 'Dashboard', keywords: ['dashboard', 'home', 'main', 'overview', 'stats', 'analytics'] },
  { href: '/dashboard1', label: 'Executive Summary (BI Dashboard)', keywords: ['dashboard1', 'summary', 'executive', 'bi', 'business intelligence', 'predictions', 'forecasts'] },
  { href: '/analytics', label: 'Visual Analytics & Heatmaps', keywords: ['analytics', 'charts', 'graphs', 'heatmap', 'trends', 'utilization'] },
  { href: '/members?filter=clients', label: 'Clients / Members List', keywords: ['members', 'clients', 'active', 'expired', 'customer', 'people', 'subscription'] },
  { href: '/leads', label: 'Leads & Inquiries', keywords: ['leads', 'inquiries', 'prospective', 'followups', 'marketing', 'sales'] },
  { href: '/trainers', label: 'Trainers Management', keywords: ['trainers', 'coach', 'coaches', 'instructors', 'personal training'] },
  { href: '/staff', label: 'Staff Management', keywords: ['staff', 'employees', 'admin', 'reception', 'users'] },
  { href: '/attendance?role=clients', label: 'Client Daily Attendance', keywords: ['attendance', 'checkin', 'checkout', 'client attendance', 'daily attendance', 'active ratio'] },
  { href: '/attendance?role=trainers', label: 'Trainer Attendance Tracker', keywords: ['trainer attendance', 'coach attendance', 'instructor attendance'] },
  { href: '/attendance?role=staff', label: 'Staff Attendance Tracker', keywords: ['staff attendance', 'employee attendance', 'admin attendance'] },
  { href: '/payments?tab=incomes', label: 'Client Fee Payments', keywords: ['payments', 'client payments', 'ledger', 'billing', 'invoices', 'fees', 'receipts'] },
  { href: '/payments?tab=expenses&category=salaries', label: 'Salaries & Wages', keywords: ['salaries', 'wages', 'trainer salary', 'staff salary', 'payroll'] },
  { href: '/payments?tab=expenses', label: 'Operating Expenses Tracker', keywords: ['expenses', 'bills', 'rent', 'utilities', 'outflows', 'purchases'] },
  { href: '/operations/equipment', label: 'Operations: Gym Equipment Register', keywords: ['equipment', 'treadmill', 'dumbbell', 'maintenance', 'repairs', 'machines'] },
  { href: '/alerts', label: 'System Notifications & Dropout Risks', keywords: ['alerts', 'dropouts', 'warnings', 'notifications', 'expiring'] },
];

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  {
    href: '/analytics',
    label: 'BI & Analytics',
    subItems: [
      { href: '/dashboard1', label: 'Executive Summary' },
      { href: '/analytics', label: 'Visual Analytics' }
    ]
  },
  {
    href: '/members',
    label: 'Members',
    subItems: [
      { href: '/members?filter=clients', label: 'Clients' },
      { href: '/leads', label: 'Leads' },
      { href: '/trainers', label: 'Trainers' },
      { href: '/staff', label: 'Staff' }
    ]
  },
  {
    href: '/attendance',
    label: 'Attendance',
    subItems: [
      { href: '/attendance?role=clients', label: 'Clients' },
      { href: '/attendance?role=trainers', label: 'Trainers' },
      { href: '/attendance?role=staff', label: 'Staff' }
    ]
  },
  {
    href: '/payments',
    label: 'Payments',
    subItems: [
      { href: '/payments?tab=incomes', label: 'Client Payments' },
      { href: '/payments?tab=expenses&category=salaries', label: 'Salaries' },
      { href: '/payments?tab=expenses', label: 'Expenses' }
    ]
  },
  {
    href: '/operations',
    label: 'Operations',
    subItems: [
      { href: '/operations/equipment', label: 'Equipment' },
      { href: '/alerts', label: 'Alerts' }
    ]
  }
];

export default function TopNav({ broadcast, setBroadcast }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const { openSettings, openProfile } = useUI();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [appName, setAppName] = useState('goJim');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const visibleNavItems = isMobile
    ? navItems.filter(item => item.label !== 'BI & Analytics')
    : navItems;


  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsImpersonating(!!localStorage.getItem('gojim_admin_token'));
    }
    superAdminApi.getPublicSettings()
      .then(res => {
        if (res.success && res.data?.appName) {
          setAppName(res.data.appName);
        }
      })
      .catch(() => { });
  }, []);

  const handleExitImpersonation = () => {
    const adminToken = localStorage.getItem('gojim_admin_token');
    const adminUser = localStorage.getItem('gojim_admin_user');
    if (adminToken && adminUser) {
      localStorage.setItem('gojim_token', adminToken);
      localStorage.setItem('gojim_user', adminUser);
      localStorage.removeItem('gojim_admin_token');
      localStorage.removeItem('gojim_admin_user');

      // Log audit
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'}/super-admin/audit-logs/impersonation-exit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ownerId: user?._id || user?.id })
      }).catch(() => { });

      window.location.href = '/super-admin?tab=gyms';
    }
  };
  const [openSubMenu, setOpenSubMenu] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ members: [], leads: [], trainers: [], staff: [], pages: [] });
  const [isSearching, setIsSearching] = useState(false);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileAccordion, setMobileAccordion] = useState(null);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setOpenSubMenu(null);
  }, [pathname, searchParams]);

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



  const dropdownRef = useRef(null);
  const subMenuRef = useRef(null);
  const searchInputRef = useRef(null);
  const notificationDropdownRef = useRef(null);
  const mobileDropdownRef = useRef(null);



  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current.focus();
      }, 50);
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ members: [], leads: [], trainers: [], staff: [], pages: [] });
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const query = searchQuery.trim().toLowerCase();

        // Match pages list locally for instant feedback
        const filteredPagesList = isMobile
          ? pagesList.filter(p => p.href !== '/dashboard1' && p.href !== '/analytics')
          : pagesList;
        const matchedPages = filteredPagesList.filter(p =>
          p.label.toLowerCase().includes(query) ||
          p.keywords.some(k => k.includes(query))
        ).slice(0, 4);

        // Fetch database results for the current logged-in gym context
        const [memRes, leadRes, trainerRes, staffRes] = await Promise.all([
          membersApi.getAll(`search=${searchQuery}`),
          leadsApi.getAll(`search=${searchQuery}`),
          trainersApi.getAll(`search=${searchQuery}`),
          staffApi.getAll(`search=${searchQuery}`).catch(() => ({ success: false, data: [] }))
        ]);

        setSearchResults({
          pages: matchedPages,
          members: memRes.success ? memRes.data.slice(0, 5) : [],
          leads: leadRes.success ? leadRes.data.slice(0, 5) : [],
          trainers: trainerRes.success ? trainerRes.data.slice(0, 5) : [],
          staff: staffRes.success ? staffRes.data.slice(0, 5) : []
        });
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedOutsideDropdown = !dropdownRef.current || !dropdownRef.current.contains(event.target);
      const clickedOutsideMobileDropdown = !mobileDropdownRef.current || !mobileDropdownRef.current.contains(event.target);
      if (clickedOutsideDropdown && clickedOutsideMobileDropdown) {
        setIsDropdownOpen(false);
      }
      if (subMenuRef.current && !subMenuRef.current.contains(event.target)) {
        setOpenSubMenu(null);
      }
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    // Failsafe: Ensure modal-open is removed if no modals are present
    const interval = setInterval(() => {
      const modals = document.querySelectorAll('.modal-instance');
      if (modals.length === 0 && document.body.classList.contains('modal-open')) {
        document.body.classList.remove('modal-open');
      }
    }, 500);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      clearInterval(interval);
    };
  }, []);

  const impersonatedByAdminBannerHeight = (user?.isBeingImpersonated && !isImpersonating) ? 40 : 0;
  const impersonateBannerHeight = isImpersonating ? 40 : 0;
  const broadcastBannerHeight = broadcast ? 40 : 0;
  const totalBannerHeight = impersonatedByAdminBannerHeight + impersonateBannerHeight + broadcastBannerHeight;

  return (
    <>
      {user?.isBeingImpersonated && !isImpersonating && (
        <div className="fixed top-0 left-0 right-0 h-[40px] bg-red-600 text-white text-[11px] px-4 md:px-8 flex items-center justify-between z-[70] border-b border-red-700 shadow-lg animate-pulse select-none">
          <div className="flex items-center gap-2 font-black uppercase tracking-wider">
            <AlertCircle size={14} className="stroke-[2.5]" />
            <span>Your account is being impersonated by the Admin. Please wait, we will remind you when the impersonation is done.</span>
          </div>
          <span className="text-[9px] bg-black/30 px-2 py-0.5 rounded font-black tracking-widest uppercase">
            Read Only Mode
          </span>
        </div>
      )}

      {isImpersonating && (
        <div
          className="fixed top-0 left-0 right-0 h-[40px] bg-amber-500 text-black text-[11px] px-4 md:px-8 flex items-center justify-between z-[70] border-b border-amber-600 shadow-lg select-none"
          style={{ top: `${impersonatedByAdminBannerHeight}px` }}
        >
          <div className="flex items-center gap-2 font-black uppercase tracking-wider">
            <AlertCircle size={14} className="stroke-[2.5]" />
            <span>You are currently viewing this gym as Super Admin</span>
          </div>
          <button
            onClick={handleExitImpersonation}
            className="bg-black hover:bg-black/80 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Return To Super Admin
          </button>
        </div>
      )}

      {broadcast && (
        <div
          className={`fixed left-0 right-0 h-[40px] text-[11px] px-4 md:px-8 flex items-center justify-between z-[70] border-b shadow-lg select-none ${broadcast.intensity === 'Danger' ? 'bg-red-600 text-white border-red-700' :
              broadcast.intensity === 'Warning' ? 'bg-amber-500 text-black border-amber-600' :
                'bg-blue-600 text-white border-blue-700'
            }`}
          style={{ top: `${impersonatedByAdminBannerHeight + impersonateBannerHeight}px` }}
        >
          <div className="flex items-center gap-2 font-black uppercase tracking-wider flex-1 overflow-hidden">
            <AlertCircle size={14} className="stroke-[2.5] shrink-0" />
            <div className="flex-1 overflow-hidden relative h-[16px] flex items-center">
              <div className="whitespace-nowrap inline-block animate-marquee-broadcast">
                <span className="font-black mr-2 uppercase">{broadcast.title}:</span>
                <span>{broadcast.message}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.setItem(`dismissed_broadcast_${broadcast._id}`, 'true');
              setBroadcast(null);
            }}
            className="bg-black hover:bg-black/80 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer shrink-0 ml-4 z-[75]"
          >
            Dismiss
          </button>
          <style>{`
            @keyframes marqueeBroadcast {
              0% { transform: translateX(100vw); }
              100% { transform: translateX(-100%); }
            }
            .animate-marquee-broadcast {
              animation: marqueeBroadcast 25s linear infinite;
            }
          `}</style>
        </div>
      )}

      <nav
        className="fixed left-0 right-0 z-[10000] flex justify-center transition-all duration-300 bg-bg-card/30 backdrop-blur-xl border-b border-white/5 px-6 py-4 md:pt-3.5 md:pb-2 md:px-3 sm:md:px-4 lg:md:pt-5 lg:md:pb-2.5 lg:md:px-8 md:bg-black md:backdrop-blur-none md:border-b-0 md:shadow-lg"
        style={{ top: `${totalBannerHeight}px` }}
      >
        {/* Mobile View Navbar (Avatar on left, Search/Notification/More on right) */}
        <div className="w-full flex md:hidden items-center justify-between relative z-[10001]">
          <div className={`relative transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} ref={mobileDropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center focus:outline-none cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-black font-black text-sm overflow-hidden shadow-xl border border-white/10">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  user?.name?.[0]?.toUpperCase() || 'A'
                )}
              </div>
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-3 w-64 bg-bg-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-3xl p-1.5 z-[100]">
                <div className="px-4 py-3.5 border-b border-white/5 mb-1.5">
                  <p className="text-sm font-black text-text-primary uppercase tracking-tighter truncate">{user?.name || 'Admin User'}</p>
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5 truncate">{user?.email || `admin@${appName.toLowerCase().replace(/\s+/g, '')}.com`}</p>
                </div>

                <button
                  onClick={() => { setIsDropdownOpen(false); openSettings(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-bold text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-xl border-none cursor-pointer"
                >
                  <Settings size={18} className="text-accent" /> Settings
                </button>

                {!isImpersonating && (
                  <>
                    <div className="h-px bg-white/5 my-1.5 mx-2" />

                    <button
                      onClick={() => { setIsDropdownOpen(false); logout(); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-black text-red-500 hover:bg-red-500/10 rounded-xl border-none cursor-pointer"
                    >
                      <LogOut size={18} /> Logout
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <div className={`flex items-center gap-2.5 transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              <button
                onClick={() => {
                  setIsSearchOpen(!isSearchOpen);
                  if (!isSearchOpen) setSearchQuery('');
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all focus:outline-none cursor-pointer ${
                  isSearchOpen ? 'text-black bg-white' : 'text-gray-400 hover:text-white bg-white/5 border border-white/10'
                }`}
              >
                <Search size={18} />
              </button>


            </div>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`pointer-events-auto flex items-center justify-center rounded-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] border focus:outline-none z-[10002] relative w-10 h-10 cursor-pointer ${
                isMobileMenuOpen
                  ? 'bg-transparent border-transparent text-zinc-300'
                  : 'bg-zinc-800/80 border-white/10 text-gray-400 hover:text-white backdrop-blur-xl saturate-[1.8] shadow-2xl'
              }`}
              aria-label="Toggle menu"
            >
              <div className="flex flex-col justify-center items-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] relative w-6 h-5 gap-[5px]">
                <div className={`w-5 h-[2px] bg-white rounded transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transform origin-center ${
                  isMobileMenuOpen ? 'rotate-45 translate-y-[7px]' : ''
                }`} />
                <div className={`w-5 h-[2px] bg-white rounded transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isMobileMenuOpen ? 'opacity-0 scale-0' : ''
                }`} />
                <div className={`w-5 h-[2px] bg-white rounded transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transform origin-center ${
                  isMobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''
                }`} />
              </div>
            </button>
          </div>
        </div>

        {/* Desktop View Navbar (Identical to original desktop layout) */}
        <div className="hidden md:flex w-full max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link prefetch={false} href="/dashboard" className="flex items-center gap-2.5 no-underline group">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-base sm:text-lg shadow-lg">
                💪
              </div>
              <span className="font-black text-xl sm:text-2xl tracking-tighter text-white">{appName}</span>
            </Link>
          </div>

          <div className="flex rounded-full p-1 items-center gap-1 shadow-2xl backdrop-blur-md" style={{ backgroundColor: '#1f1f1f' }} ref={subMenuRef}>
            {visibleNavItems.map((item) => {
              const isActive = pathname === item.href ||
                pathname === `${item.href}/` ||
                (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`)) ||
                (item.subItems?.some(sub => {
                  const subPath = sub.href.split('?')[0];
                  return pathname === subPath || (subPath !== '/' && pathname.startsWith(subPath + '/'));
                }));
              const hasSub = !!item.subItems;
              const isSubOpen = openSubMenu === item.label;

              return (
                <div key={item.href} className="relative group">
                  <div
                    onClick={() => hasSub && setOpenSubMenu(isSubOpen ? null : item.label)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold transition-all cursor-pointer no-underline
                      ${isActive
                        ? 'text-[#212121] bg-white shadow-lg shadow-white/10'
                        : 'text-[#a2a2a2] hover:text-[#ffffff] hover:bg-white/5'
                      }`}
                  >
                    {hasSub ? (
                      <>
                        <span>{item.label}</span>
                        <ChevronDown size={14} className={`transition-transform duration-300 ${isSubOpen ? 'rotate-180' : ''}`} />
                      </>
                    ) : (
                      <Link prefetch={false} href={item.href} className="text-inherit no-underline">
                        {item.label}
                      </Link>
                    )}
                  </div>

                  {hasSub && (
                    <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-3 flex-col bg-bg-card border border-white/10 rounded-2xl p-2 shadow-2xl min-w-[140px] z-[70] backdrop-blur-3xl
                      ${isSubOpen ? 'flex' : 'hidden group-hover:flex'}`}>
                      <div className="absolute -top-3 left-0 right-0 h-3 bg-transparent" />

                      {item.subItems.map((sub) => {
                        const isSubActive = (() => {
                          const [path, queryStr] = sub.href.split('?');
                          if (pathname !== path) return false;
                          if (!queryStr) return true;
                          const params = new URLSearchParams(queryStr);
                          for (const [key, val] of params.entries()) {
                            if (searchParams.get(key) !== val) return false;
                          }
                          if (sub.label === 'Expenses' && searchParams.get('category') === 'salaries') {
                            return false;
                          }
                          return true;
                        })();
                        return (
                          <Link prefetch={false} key={sub.href} href={sub.href}
                            onClick={() => setOpenSubMenu(null)}
                            className={`px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all no-underline whitespace-nowrap
                              ${isSubActive
                                ? 'text-[#212121] bg-white shadow-sm'
                                : 'text-[#a2a2a2] hover:text-text-primary hover:bg-white/5'}`}
                          >
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => {
                  setIsSearchOpen(!isSearchOpen);
                  if (!isSearchOpen) setSearchQuery('');
                }}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all focus:outline-none ${isSearchOpen
                  ? 'text-[#212121] shadow-lg shadow-white/10'
                  : 'text-[#a2a2a2] hover:text-white'
                  }`}
                style={{ backgroundColor: isSearchOpen ? '#ababab' : '#1f1f1f' }}
              >
                <Search size={18} />
              </button>

            </div>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 group p-1 rounded-full hover:bg-white/5 focus:outline-none bg-white/2"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-accent flex items-center justify-center text-black font-black text-xs sm:text-sm overflow-hidden shadow-xl">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    user?.name?.[0]?.toUpperCase() || 'A'
                  )}
                </div>
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full right-0 mt-3 w-64 bg-bg-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-3xl p-1.5 z-[100]">
                  <div className="px-4 py-3.5 border-b border-white/5 mb-1.5">
                    <p className="text-sm font-black text-text-primary uppercase tracking-tighter truncate">{user?.name || 'Admin User'}</p>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5 truncate">{user?.email || `admin@${appName.toLowerCase().replace(/\s+/g, '')}.com`}</p>
                  </div>

                  <button
                    onClick={() => { setIsDropdownOpen(false); openSettings(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-bold text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-xl border-none cursor-pointer"
                  >
                    <Settings size={18} className="text-accent" /> Settings
                  </button>

                  {!isImpersonating && (
                    <>
                      <div className="h-px bg-white/5 my-1.5 mx-2" />

                      <button
                        onClick={() => { setIsDropdownOpen(false); logout(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-black text-red-500 hover:bg-red-500/10 rounded-xl border-none cursor-pointer"
                      >
                        <LogOut size={18} /> Logout
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Drawer Overlay */}
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
                  delay: 0.2, // Wait for slide-outs
                  duration: 0.5,
                  ease: [0.76, 0, 0.24, 1]
                }
              }
            }}
            initial="closed"
            animate="open"
            exit="exit"
            className="fixed inset-0 z-[9999] bg-black/98 backdrop-blur-2xl md:hidden flex flex-col justify-between pt-24 px-8 pb-20 pointer-events-auto overflow-y-auto"
          >
            <div className="flex flex-col gap-6 mt-8 mb-auto text-left pl-4 w-full">
              {visibleNavItems.map((item, i) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`)) ||
                  (item.subItems?.some(sub => pathname === sub.href.split('?')[0]));
                const hasSub = !!item.subItems;
                const isAccordionOpen = mobileAccordion === item.label;

                if (!hasSub) {
                  return (
                    <motion.div
                      key={item.href}
                      variants={{
                        closed: { x: 80, opacity: 0 },
                        open: {
                          x: 0,
                          opacity: 1,
                          transition: {
                            delay: 0.2 + i * 0.05,
                            duration: 0.4,
                            ease: [0.16, 1, 0.3, 1]
                          }
                        },
                        exit: {
                          x: 80,
                          opacity: 0,
                          transition: {
                            delay: (visibleNavItems.length - i) * 0.03,
                            duration: 0.25,
                            ease: [0.76, 0, 0.24, 1]
                          }
                        }
                      }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="no-underline group flex items-center gap-4 py-2 cursor-pointer"
                      >
                        <span className={`text-3xl font-black tracking-tight transition-colors duration-300 ${
                          isActive ? 'text-white' : 'text-zinc-600 group-hover:text-white'
                        }`}>
                          {item.label}
                        </span>
                      </Link>
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={item.label}
                    variants={{
                      closed: { x: 80, opacity: 0 },
                      open: {
                        x: 0,
                        opacity: 1,
                        transition: {
                          delay: 0.2 + i * 0.05,
                          duration: 0.4,
                          ease: [0.16, 1, 0.3, 1]
                        }
                      },
                      exit: {
                        x: 80,
                        opacity: 0,
                        transition: {
                          delay: (visibleNavItems.length - i) * 0.03,
                          duration: 0.25,
                          ease: [0.76, 0, 0.24, 1]
                        }
                      }
                    }}
                    className="flex flex-col gap-3"
                  >
                    <button
                      onClick={() => setMobileAccordion(isAccordionOpen ? null : item.label)}
                      className="w-full flex items-center justify-between py-2 text-left bg-transparent border-none focus:outline-none cursor-pointer"
                    >
                      <span className={`text-3xl font-black tracking-tight transition-colors duration-300 ${
                        isActive ? 'text-white' : 'text-zinc-600 hover:text-white'
                      }`}>
                        {item.label}
                      </span>
                      <ChevronDown size={24} className={`transition-transform duration-300 ${
                        isAccordionOpen ? 'rotate-180 text-white' : 'text-zinc-600'
                      }`} />
                    </button>

                    {isAccordionOpen && (
                      <div className="flex flex-col gap-4 pl-4 border-l border-white/10 py-2">
                        {item.subItems.map((sub) => {
                          const [subPath] = sub.href.split('?');
                          const isSubActive = pathname === subPath;
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="no-underline group flex items-center py-1 cursor-pointer"
                            >
                              <span className={`text-xl font-bold tracking-tight transition-colors duration-300 ${
                                isSubActive ? 'text-white' : 'text-zinc-600 hover:text-white'
                              }`}>
                                {sub.label}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop blur overlay with opacity fade transition */}
      <div
        onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
        className={`fixed inset-0 top-[52px] lg:top-[60px] bg-black/60 backdrop-blur-md z-[50] transition-opacity duration-500 ease-in-out ${isSearchOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
      />

      {/* Dropdown container with smooth slide-down transition and nav-bar-matching solid black background */}
      <div className={`fixed left-0 right-0 bg-black z-[55] pt-10 pb-8 px-6 lg:px-24 shadow-2xl transition-all duration-500 ease-in-out ${isSearchOpen
        ? 'top-[52px] lg:top-[60px] opacity-100 translate-y-0 pointer-events-auto'
        : '-top-[600px] opacity-0 -translate-y-12 pointer-events-none'
        }`}>
        <div className="max-w-4xl mx-auto flex flex-col max-h-[50vh]">

          {/* Search input inside the dropdown itself */}
          <div className="w-full flex items-center gap-3 pb-4 mb-4">
            <Search size={22} className="text-[#86868b] shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={`Search ${appName}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-none ring-0 border-0 outline-0 shadow-none text-[#e8e8ed] text-lg lg:text-xl font-normal placeholder-[#86868b]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-[#86868b] hover:text-white transition-colors">
                <X size={18} />
              </button>
            )}
          </div>

          {/* Scrollable Results Container */}
          <div className="overflow-y-auto pr-1 flex-1">
            {!searchQuery.trim() ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 py-1">
                <p className="text-[11px] font-normal tracking-wide text-[#86868b] uppercase">Quick Links</p>
                <div className="flex flex-col gap-1">
                  {[
                    { href: '/members', label: 'Find a Member' },
                    { href: '/leads', label: 'Convert Leads' },
                    { href: '/attendance', label: 'Track Daily Attendance' },
                    { href: '/payments', label: 'Record Fee Payments' }
                  ].map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                      className="group flex items-center py-1.5 no-underline text-left"
                    >
                      <span className="text-sm font-semibold text-[#86868b] group-hover:text-white transition-colors mr-2">→</span>
                      <span className="text-[13px] font-medium text-[#c1c1c7] group-hover:text-white transition-colors">
                        {link.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-1">
                {isSearching ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] font-medium text-[#86868b]">Searching database...</p>
                  </div>
                ) : (
                  <>
                    {searchResults.pages.length === 0 && searchResults.members.length === 0 && searchResults.leads.length === 0 && searchResults.trainers.length === 0 && searchResults.staff.length === 0 ? (
                      <div className="text-center py-8 space-y-1.5 animate-in fade-in duration-300">
                        <AlertCircle size={22} className="text-[#86868b] mx-auto" />
                        <p className="text-sm font-medium text-white">No results found</p>
                        <p className="text-xs text-[#86868b]">No match found for "{searchQuery}". Check the spelling and try again.</p>
                      </div>
                    ) : (
                      <div className="space-y-4 divide-y divide-white/5 animate-in fade-in duration-300">
                        {searchResults.pages.length > 0 && (
                          <div className="space-y-2 pt-3 first:pt-0">
                            <p className="text-[10px] font-normal tracking-wide text-[#86868b] uppercase">Navigation / Pages Shortcuts ({searchResults.pages.length})</p>
                            <div className="flex flex-col gap-1">
                              {searchResults.pages.map(p => (
                                <Link
                                  key={p.href}
                                  href={p.href}
                                  onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                                  className="group flex items-center py-1.5 no-underline text-left animate-in fade-in duration-200"
                                >
                                  <span className="text-sm font-semibold text-[#86868b] group-hover:text-white transition-colors mr-2">→</span>
                                  <span className="text-[13px] font-medium text-[#c1c1c7] group-hover:text-white transition-colors">
                                    {p.label}
                                  </span>
                                  <span className="text-[10px] text-[#86868b] ml-3 italic">
                                    (Go to page)
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {searchResults.members.length > 0 && (
                          <div className="space-y-2 pt-3 first:pt-0">
                            <p className="text-[10px] font-normal tracking-wide text-[#86868b] uppercase">Members ({searchResults.members.length})</p>
                            <div className="flex flex-col gap-1">
                              {searchResults.members.map(m => (
                                <Link
                                  key={m._id}
                                  href={`/members?preview=${m._id}`}
                                  onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                                  className="group flex items-center justify-between py-1.5 no-underline text-left animate-in fade-in duration-200"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span className="text-sm font-semibold text-[#86868b] group-hover:text-white transition-colors mr-2">→</span>
                                    <div>
                                      <span className="text-[13px] font-medium text-[#c1c1c7] group-hover:text-white transition-colors">
                                        {m.name}
                                      </span>
                                      <span className="text-[10px] text-[#86868b] ml-2">
                                        ({m.phone} • Plan: {m.plan})
                                      </span>
                                    </div>
                                  </div>
                                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border ${m.status === 'active'
                                    ? 'bg-success/10 border-success/20 text-success'
                                    : 'bg-danger/10 border-danger/20 text-danger'
                                    }`}>
                                    {m.status}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {searchResults.leads.length > 0 && (
                          <div className="space-y-2 pt-3 first:pt-0">
                            <p className="text-[10px] font-normal tracking-wide text-[#86868b] uppercase">Leads ({searchResults.leads.length})</p>
                            <div className="flex flex-col gap-1">
                              {searchResults.leads.map(l => (
                                <Link
                                  key={l._id}
                                  href={`/leads?preview=${l._id}`}
                                  onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                                  className="group flex items-center justify-between py-1.5 no-underline text-left animate-in fade-in duration-200"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span className="text-sm font-semibold text-[#86868b] group-hover:text-white transition-colors mr-2">→</span>
                                    <div>
                                      <span className="text-[13px] font-medium text-[#c1c1c7] group-hover:text-white transition-colors">
                                        {l.name}
                                      </span>
                                      <span className="text-[10px] text-[#86868b] ml-2">
                                        ({l.phone} • Source: {l.source})
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-warning/10 border border-warning/20 text-warning uppercase tracking-widest">
                                    {l.status}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {searchResults.trainers.length > 0 && (
                          <div className="space-y-2 pt-3 first:pt-0">
                            <p className="text-[10px] font-normal tracking-wide text-[#86868b] uppercase">Trainers ({searchResults.trainers.length})</p>
                            <div className="flex flex-col gap-1">
                              {searchResults.trainers.map(t => (
                                <Link
                                  key={t._id}
                                  href={`/trainers?preview=${t._id}`}
                                  onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                                  className="group flex items-center justify-between py-1.5 no-underline text-left animate-in fade-in duration-200"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span className="text-sm font-semibold text-[#86868b] group-hover:text-white transition-colors mr-2">→</span>
                                    <div>
                                      <span className="text-[13px] font-medium text-[#c1c1c7] group-hover:text-white transition-colors">
                                        {t.name}
                                      </span>
                                      <span className="text-[10px] text-[#86868b] ml-2">
                                        ({t.phone} • Speciality: {t.specialties?.join(', ')})
                                      </span>
                                    </div>
                                  </div>
                                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border ${t.status !== 'inactive'
                                    ? 'bg-success/10 border-success/20 text-success'
                                    : 'bg-danger/10 border-danger/20 text-danger'
                                    }`}>
                                    {t.status || 'active'}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {searchResults.staff.length > 0 && (
                          <div className="space-y-2 pt-3 first:pt-0">
                            <p className="text-[10px] font-normal tracking-wide text-[#86868b] uppercase">Staff ({searchResults.staff.length})</p>
                            <div className="flex flex-col gap-1">
                              {searchResults.staff.map(s => (
                                <Link
                                  key={s._id}
                                  href={`/staff?preview=${s._id}`}
                                  onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                                  className="group flex items-center justify-between py-1.5 no-underline text-left animate-in fade-in duration-200"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span className="text-sm font-semibold text-[#86868b] group-hover:text-white transition-colors mr-2">→</span>
                                    <div>
                                      <span className="text-[13px] font-medium text-[#c1c1c7] group-hover:text-white transition-colors">
                                        {s.name}
                                      </span>
                                      <span className="text-[10px] text-[#86868b] ml-2">
                                        ({s.phone} • Role: {s.role})
                                      </span>
                                    </div>
                                  </div>
                                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border ${s.status === 'active'
                                    ? 'bg-success/10 border-success/20 text-success'
                                    : 'bg-danger/10 border-danger/20 text-danger'
                                    }`}>
                                    {s.status}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

        </div>
      </div>


    </>
  );
}
