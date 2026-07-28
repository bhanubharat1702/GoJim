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
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
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

  const openNotificationDrawer = () => {
    setShowNotificationDrawer(true);
    setTimeout(() => {
      setIsNotificationDrawerOpen(true);
    }, 20);
  };

  const closeNotificationDrawer = () => {
    setIsNotificationDrawerOpen(false);
    setTimeout(() => {
      setShowNotificationDrawer(false);
    }, 300);
  };

  useEffect(() => {
    if (isNotificationDrawerOpen) {
      document.body.classList.add('notification-drawer-active');
    } else {
      document.body.classList.remove('notification-drawer-active');
    }
    return () => {
      document.body.classList.remove('notification-drawer-active');
    };
  }, [isNotificationDrawerOpen]);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expandedClusters, setExpandedClusters] = useState({});

  const dropdownRef = useRef(null);
  const subMenuRef = useRef(null);
  const searchInputRef = useRef(null);
  const notificationDropdownRef = useRef(null);
  const mobileDropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      // 1. Fetch existing notifications immediately for instant page render
      const res = await alertsApi.getAll('limit=50');
      if (res.success) {
        setNotifications(res.data);
        const unread = res.data.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      }

      // 2. Fire background alert generation asynchronously without blocking
      alertsApi.generate()
        .then(() => alertsApi.getAll('limit=50'))
        .then(freshRes => {
          if (freshRes && freshRes.success) {
            setNotifications(freshRes.data);
            const unread = freshRes.data.filter(n => !n.isRead).length;
            setUnreadCount(unread);
          }
        })
        .catch(() => { });
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        console.warn("Background notification sync: Backend server offline or unreachable.");
      } else {
        console.error("Error fetching notifications:", err);
      }
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000);
    return () => clearInterval(interval);
  }, []);

  const getClusteredNotifications = (rawAlerts) => {
    const groups = {
      dropout: [],
      payment_due: [],
      lead_followup: [],
      birthday: [],
      payment_overdue: [],
      unpaid_salary: [],
      trainer_conflict: [],
      milestone: [],
      other: []
    };

    rawAlerts.forEach(alert => {
      if (groups[alert.type] !== undefined) {
        groups[alert.type].push(alert);
      } else {
        groups.other.push(alert);
      }
    });

    const clustered = [];

    // 1. Process Dropout Risks
    if (groups.dropout.length > 0) {
      if (groups.dropout.length >= 2) {
        const count = groups.dropout.length;
        const names = groups.dropout.map(a => a.title.replace('Dropout Risk: ', '')).slice(0, 3).join(', ');
        const extraCount = count > 3 ? ` and ${count - 3} other(s)` : '';
        clustered.push({
          _id: 'cluster_dropout',
          isCluster: true,
          type: 'dropout',
          priority: 'high',
          title: `${count} Members Inactive (Dropout Risks)`,
          message: `Members: ${names}${extraCount} haven't attended the gym for over 5 days.`,
          actionUrl: '/members?filter=inactive',
          createdAt: groups.dropout[0].createdAt,
          isRead: groups.dropout.every(a => a.isRead),
          alertIds: groups.dropout.map(a => a._id)
        });
      } else {
        clustered.push(...groups.dropout);
      }
    }

    // 2. Process Payments Due
    if (groups.payment_due.length > 0) {
      if (groups.payment_due.length >= 2) {
        const count = groups.payment_due.length;
        const names = groups.payment_due.map(a => a.title.replace('Plan Expiring: ', '')).slice(0, 3).join(', ');
        const extraCount = count > 3 ? ` and ${count - 3} other(s)` : '';
        clustered.push({
          _id: 'cluster_payment_due',
          isCluster: true,
          type: 'payment_due',
          priority: 'critical',
          title: `${count} Plan Renewals Pending`,
          message: `Expiring dues for: ${names}${extraCount}. Renew subscription profiles.`,
          actionUrl: '/members?filter=expiring',
          createdAt: groups.payment_due[0].createdAt,
          isRead: groups.payment_due.every(a => a.isRead),
          alertIds: groups.payment_due.map(a => a._id)
        });
      } else {
        clustered.push(...groups.payment_due);
      }
    }

    // 3. Process Lead Follow-ups
    if (groups.lead_followup.length > 0) {
      if (groups.lead_followup.length >= 2) {
        const count = groups.lead_followup.length;
        const names = groups.lead_followup.map(a => a.title.replace('Follow Up: ', '')).slice(0, 3).join(', ');
        const extraCount = count > 3 ? ` and ${count - 3} other(s)` : '';
        clustered.push({
          _id: 'cluster_lead_followup',
          isCluster: true,
          type: 'lead_followup',
          priority: 'medium',
          title: `${count} Inquiries Follow-Up Today`,
          message: `Schedule calls with: ${names}${extraCount}.`,
          actionUrl: '/leads',
          createdAt: groups.lead_followup[0].createdAt,
          isRead: groups.lead_followup.every(a => a.isRead),
          alertIds: groups.lead_followup.map(a => a._id)
        });
      } else {
        clustered.push(...groups.lead_followup);
      }
    }

    // 4. Process Birthdays
    if (groups.birthday.length > 0) {
      if (groups.birthday.length >= 2) {
        const count = groups.birthday.length;
        const names = groups.birthday.map(a => a.title.replace('Birthday Today: ', '')).slice(0, 3).join(', ');
        const extraCount = count > 3 ? ` and ${count - 3} other(s)` : '';
        clustered.push({
          _id: 'cluster_birthday',
          isCluster: true,
          type: 'birthday',
          priority: 'medium',
          title: `${count} Birthdays Today`,
          message: `Wish them: ${names}${extraCount}! 🎂`,
          actionUrl: '/members',
          createdAt: groups.birthday[0].createdAt,
          isRead: groups.birthday.every(a => a.isRead),
          alertIds: groups.birthday.map(a => a._id)
        });
      } else {
        clustered.push(...groups.birthday);
      }
    }

    // 5. Process Payments Overdue
    if (groups.payment_overdue.length > 0) {
      if (groups.payment_overdue.length >= 2) {
        const count = groups.payment_overdue.length;
        const names = groups.payment_overdue.map(a => a.title.replace('Membership Expired: ', '')).slice(0, 3).join(', ');
        const extraCount = count > 3 ? ` and ${count - 3} other(s)` : '';
        clustered.push({
          _id: 'cluster_payment_overdue',
          isCluster: true,
          type: 'payment_overdue',
          priority: 'critical',
          title: `${count} Memberships Expired`,
          message: `Outstanding renewals for: ${names}${extraCount}. Contact them for payments.`,
          actionUrl: '/members',
          createdAt: groups.payment_overdue[0].createdAt,
          isRead: groups.payment_overdue.every(a => a.isRead),
          alertIds: groups.payment_overdue.map(a => a._id)
        });
      } else {
        clustered.push(...groups.payment_overdue);
      }
    }

    // 6. Process Unpaid Salaries
    if (groups.unpaid_salary.length > 0) {
      if (groups.unpaid_salary.length >= 2) {
        const count = groups.unpaid_salary.length;
        const names = groups.unpaid_salary.map(a => a.title.replace('Unpaid Salary: ', '')).slice(0, 3).join(', ');
        const extraCount = count > 3 ? ` and ${count - 3} other(s)` : '';
        clustered.push({
          _id: 'cluster_unpaid_salary',
          isCluster: true,
          type: 'unpaid_salary',
          priority: 'high',
          title: `${count} Unpaid Salaries Pending`,
          message: `Salaries are pending for: ${names}${extraCount}.`,
          actionUrl: '/staff',
          createdAt: groups.unpaid_salary[0].createdAt,
          isRead: groups.unpaid_salary.every(a => a.isRead),
          alertIds: groups.unpaid_salary.map(a => a._id)
        });
      } else {
        clustered.push(...groups.unpaid_salary);
      }
    }

    // 7. Process Trainer Conflicts
    if (groups.trainer_conflict.length > 0) {
      if (groups.trainer_conflict.length >= 2) {
        const count = groups.trainer_conflict.length;
        const names = groups.trainer_conflict.map(a => a.title.replace('Trainer Shift Conflict: ', '').replace('Trainer Overbooked: ', '')).slice(0, 3).join(', ');
        const extraCount = count > 3 ? ` and ${count - 3} other(s)` : '';
        clustered.push({
          _id: 'cluster_trainer_conflict',
          isCluster: true,
          type: 'trainer_conflict',
          priority: 'high',
          title: `${count} Trainer Scheduling Conflicts`,
          message: `Scheduling issues for: ${names}${extraCount}.`,
          actionUrl: '/trainers',
          createdAt: groups.trainer_conflict[0].createdAt,
          isRead: groups.trainer_conflict.every(a => a.isRead),
          alertIds: groups.trainer_conflict.map(a => a._id)
        });
      } else {
        clustered.push(...groups.trainer_conflict);
      }
    }

    // 8. Process Milestones
    if (groups.milestone.length > 0) {
      if (groups.milestone.length >= 2) {
        const count = groups.milestone.length;
        const names = groups.milestone.map(a => a.title.replace('Attendance Milestone: ', '')).slice(0, 3).join(', ');
        const extraCount = count > 3 ? ` and ${count - 3} other(s)` : '';
        clustered.push({
          _id: 'cluster_milestone',
          isCluster: true,
          type: 'milestone',
          priority: 'medium',
          title: `${count} Member Milestones Hitted`,
          message: `Workout milestones reached by: ${names}${extraCount}. 🏆`,
          actionUrl: '/members',
          createdAt: groups.milestone[0].createdAt,
          isRead: groups.milestone.every(a => a.isRead),
          alertIds: groups.milestone.map(a => a._id)
        });
      } else {
        clustered.push(...groups.milestone);
      }
    }

    clustered.push(...groups.other);
    return clustered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  const handleDismissAlert = async (e, alert) => {
    e.stopPropagation();
    try {
      if (alert.isCluster) {
        await Promise.all(alert.alertIds.map(id => alertsApi.dismiss(id)));
        setNotifications(prev => prev.filter(n => !alert.alertIds.includes(n._id)));
        setUnreadCount(prev => Math.max(0, prev - alert.alertIds.length));
      } else {
        await alertsApi.dismiss(alert._id);
        setNotifications(prev => prev.filter(n => n._id !== alert._id));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Error dismissing alert:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const unreadAlerts = notifications.filter(n => !n.isRead);
      await Promise.all(unreadAlerts.map(n => alertsApi.markRead(n._id)));
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

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
        setSearchQuery('');
        if (showNotificationDrawer) {
          closeNotificationDrawer();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showNotificationDrawer]);

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

              <div className="relative">
                <button
                  onClick={() => {
                    openNotificationDrawer();
                    setIsDropdownOpen(false);
                  }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all focus:outline-none relative cursor-pointer ${
                    showNotificationDrawer ? 'text-black bg-white' : 'text-gray-400 hover:text-white bg-white/5 border border-white/10'
                  }`}
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 px-1 py-0.5 text-[8px] font-black bg-accent text-black rounded-full border border-black min-w-[14px] h-3.5 flex items-center justify-center leading-none">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>
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
            <Link href="/dashboard" className="flex items-center gap-2.5 no-underline group">
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
                      <Link href={item.href} className="text-inherit no-underline">
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
                          <Link key={sub.href} href={sub.href}
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
              <div className="relative">
                <button
                  onClick={() => {
                    openNotificationDrawer();
                    setIsDropdownOpen(false);
                  }}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all focus:outline-none relative ${showNotificationDrawer
                    ? 'text-[#212121] shadow-lg shadow-white/10'
                    : 'text-[#a2a2a2] hover:text-white'
                    }`}
                  style={{ backgroundColor: showNotificationDrawer ? '#ababab' : '#1f1f1f' }}
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 px-1 py-0.5 text-[8px] font-black bg-accent text-black rounded-full border border-black min-w-[14px] h-3.5 flex items-center justify-center leading-none">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>
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

      {/* Slide-in Notification Drawer */}
      {showNotificationDrawer && (
        <div className="fixed inset-0 z-[9999] flex justify-end">
          {/* Backdrop overlay */}
          <div
            className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${isNotificationDrawerOpen ? 'opacity-100' : 'opacity-0'
              }`}
            onClick={closeNotificationDrawer}
          />

          {/* Drawer content panel */}
          <div
            className={`relative w-full max-w-md bg-[#0a0a0a] border-l border-white/5 h-full p-6 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out transform ${isNotificationDrawerOpen ? 'translate-x-0' : 'translate-x-full'
              } overflow-y-auto`}
          >
            <div className="space-y-8 flex-1 flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">Alerts & Notifications</h3>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold mt-1">
                    {unreadCount === 0 ? 'All caught up' : `${unreadCount} unread action items`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      setNotifications([]);
                      setUnreadCount(0);
                      await fetchNotifications();
                    }}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors cursor-pointer"
                    title="Refresh alerts"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button
                    onClick={closeNotificationDrawer}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 py-2 pr-1 my-4">
                {(() => {
                  const clustered = getClusteredNotifications(notifications);
                  if (clustered.length === 0) {
                    return (
                      <div className="py-24 px-4 text-center flex flex-col items-center justify-center h-full">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-text-muted mb-4 shadow-inner">
                          <Bell size={20} />
                        </div>
                        <p className="text-sm font-black text-white tracking-tight">Your gym is running smoothly!</p>
                        <p className="text-xs text-text-muted mt-1.5 max-w-[200px] mx-auto leading-relaxed">No pending alerts today.</p>
                      </div>
                    );
                  }
                  return clustered.map((n) => {
                    let iconClass = 'text-blue-400';
                    if (n.priority === 'critical') {
                      iconClass = 'text-danger';
                    } else if (n.priority === 'high') {
                      iconClass = 'text-warning';
                    } else if (n.type === 'birthday') {
                      iconClass = 'text-pink-400';
                    } else if (n.type === 'milestone') {
                      iconClass = 'text-teal-400';
                    }

                    return (
                      <div key={n._id} className="space-y-1.5">
                        <div
                          onClick={() => {
                            if (n.isCluster) {
                              setExpandedClusters(prev => ({
                                ...prev,
                                [n._id]: !prev[n._id]
                              }));
                            } else {
                              let targetUrl = n.actionUrl;
                              if (targetUrl) {
                                if (targetUrl.startsWith('/members/') && targetUrl.length > 9) {
                                  const memberId = targetUrl.replace('/members/', '');
                                  targetUrl = `/members?preview=${memberId}`;
                                } else if (n.type === 'lead_followup' && n.relatedLead) {
                                  targetUrl = `/leads?preview=${n.relatedLead}`;
                                }
                                window.location.href = targetUrl;
                              }
                            }
                          }}
                          className={`px-4 py-3.5 hover:bg-white/5 bg-white/[0.02] transition-all border border-white/5 rounded-xl cursor-pointer flex gap-3.5 group relative`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {n.type === 'dropout' ? (
                              <Users size={16} className={iconClass} />
                            ) : n.type === 'payment_due' ? (
                              <CreditCard size={16} className={iconClass} />
                            ) : n.type === 'birthday' ? (
                              <Gift size={16} className="text-pink-400" />
                            ) : n.type === 'payment_overdue' ? (
                              <AlertCircle size={16} className="text-danger animate-pulse" />
                            ) : n.type === 'unpaid_salary' ? (
                              <Coins size={16} className="text-warning" />
                            ) : n.type === 'trainer_conflict' ? (
                              <Dumbbell size={16} className="text-warning" />
                            ) : n.type === 'milestone' ? (
                              <Award size={16} className="text-teal-400" />
                            ) : (
                              <AlertCircle size={16} className={iconClass} />
                            )}
                          </div>

                          <div className="flex-1 min-w-0 pr-14">
                            <p className="text-xs font-black text-white group-hover:text-accent transition-colors truncate">
                              {n.title}
                            </p>
                            <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                              {n.message}
                            </p>
                            <p className="text-[9px] text-text-muted mt-1.5 uppercase font-bold tracking-wider">
                              {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>

                          {n.isCluster && (
                            <div className="absolute right-10 top-3.5 w-6 h-6 rounded-full flex items-center justify-center bg-white/5 text-text-muted group-hover:text-white transition-all">
                              {expandedClusters[n._id] ? <ChevronUp size={12} strokeWidth={3} /> : <ChevronDown size={12} strokeWidth={3} />}
                            </div>
                          )}

                          <button
                            onClick={(e) => handleDismissAlert(e, n)}
                            className="absolute right-2.5 top-3.5 w-6 h-6 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-all opacity-80 md:opacity-0 group-hover:opacity-100 shadow-md"
                            title="Dismiss alert"
                          >
                            <X size={10} className="stroke-[2.5]" />
                          </button>
                        </div>

                        {n.isCluster && expandedClusters[n._id] && (
                          <div className="pl-4 border-l border-white/5 ml-3 space-y-1.5 mt-1.5 animate-in slide-in-from-top-2 duration-200">
                            {(() => {
                              const subNotifications = notifications.filter(item => item.type === n.type);
                              return subNotifications.map(sub => {
                                let subIconClass = 'text-blue-400';
                                if (sub.priority === 'critical') {
                                  subIconClass = 'text-danger';
                                } else if (sub.priority === 'high') {
                                  subIconClass = 'text-warning';
                                } else if (sub.type === 'birthday') {
                                  subIconClass = 'text-pink-400';
                                } else if (sub.type === 'milestone') {
                                  subIconClass = 'text-teal-400';
                                }

                                return (
                                  <div
                                    key={sub._id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      let targetUrl = sub.actionUrl;
                                      if (targetUrl) {
                                        if (targetUrl.startsWith('/members/') && targetUrl.length > 9) {
                                          const memberId = targetUrl.replace('/members/', '');
                                          targetUrl = `/members?preview=${memberId}`;
                                        } else if (sub.type === 'lead_followup' && sub.relatedLead) {
                                          targetUrl = `/leads?preview=${sub.relatedLead}`;
                                        }
                                        window.location.href = targetUrl;
                                      }
                                    }}
                                    className={`px-3 py-2.5 hover:bg-white/5 bg-white/[0.01] transition-all border border-white/5 rounded-lg cursor-pointer flex gap-3 group/sub relative`}
                                  >
                                    <div className="mt-0.5 shrink-0">
                                      {sub.type === 'dropout' ? (
                                        <Users size={12} className={subIconClass} />
                                      ) : sub.type === 'payment_due' ? (
                                        <CreditCard size={12} className={subIconClass} />
                                      ) : sub.type === 'birthday' ? (
                                        <Gift size={12} className="text-pink-400" />
                                      ) : sub.type === 'payment_overdue' ? (
                                        <AlertCircle size={12} className="text-danger" />
                                      ) : sub.type === 'unpaid_salary' ? (
                                        <Coins size={12} className="text-warning" />
                                      ) : sub.type === 'trainer_conflict' ? (
                                        <Dumbbell size={12} className="text-warning" />
                                      ) : sub.type === 'milestone' ? (
                                        <Award size={12} className="text-teal-400" />
                                      ) : (
                                        <AlertCircle size={12} className={subIconClass} />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0 pr-6">
                                      <p className="text-[11px] font-black text-white group-hover/sub:text-accent transition-colors truncate">
                                        {sub.title}
                                      </p>
                                      <p className="text-[10px] text-text-secondary mt-0.5 leading-normal">
                                        {sub.message}
                                      </p>
                                      <p className="text-[8px] text-text-muted mt-1 uppercase font-bold tracking-wider">
                                        {new Date(sub.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDismissAlert(e, sub);
                                      }}
                                      className="absolute right-2 top-2.5 w-5 h-5 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-all opacity-80 md:opacity-0 group-hover/sub:opacity-100 shadow"
                                      title="Dismiss alert"
                                    >
                                      <X size={8} className="stroke-[2.5]" />
                                    </button>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Bottom Actions */}
              {unreadCount > 0 && (
                <div className="pt-4 border-t border-white/5 flex flex-col gap-2 shrink-0">
                  <button
                    onClick={handleMarkAllRead}
                    className="w-full py-2.5 bg-accent hover:bg-accent-hover text-black font-black rounded-xl text-xs tracking-wider uppercase transition-all shadow-md active:scale-95 text-center"
                  >
                    Mark All Read
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
