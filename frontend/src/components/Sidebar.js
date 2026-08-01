'use client';
import { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useUI } from '@/context/UIContext';
import { superAdminApi } from '@/lib/api';
import { LayoutDashboard, Users, UserCheck, Target, MoreHorizontal, CreditCard, Bell, MessageSquare, LogOut, Dumbbell, ChevronDown, Settings, Sliders } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { 
    href: '/members', 
    label: 'Members', 
    icon: <Users size={20} />,
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
    icon: <UserCheck size={20} />,
    subItems: [
      { href: '/attendance?role=clients', label: 'Clients' },
      { href: '/attendance?role=trainers', label: 'Trainers' },
      { href: '/attendance?role=staff', label: 'Staff' }
    ]
  },
  { 
    href: '/payments', 
    label: 'Payments', 
    icon: <CreditCard size={20} />,
    subItems: [
      { href: '/payments?tab=incomes', label: 'Client Payments' },
      { href: '/payments?tab=expenses&category=salaries', label: 'Salaries' },
      { href: '/payments?tab=expenses', label: 'Expenses' }
    ]
  },
  {
    href: '/operations',
    label: 'Operations',
    icon: <Sliders size={20} />,
    subItems: [
      { href: '/operations/equipment', label: 'Equipment' },
      { href: '/alerts', label: 'Alerts' }
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const { openSettings } = useUI();
  const [openMenus, setOpenMenus] = useState({});
  const [appName, setAppName] = useState('goJim');
  const [isImpersonating, setIsImpersonating] = useState(false);

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
      .catch(() => {});
  }, []);

  const toggleMenu = (label) => {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[280px] h-screen fixed left-0 top-0 border-r border-border/50 z-50 shadow-[4px_0_24px_rgba(0,0,0,0.2)]" style={{ backgroundColor: '#1f1f1f' }}>
        {/* Logo */}
        <div className="p-8 border-b border-border/50">
          <Link href="/dashboard" className="flex items-center gap-4 no-underline group">
            <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-black font-bold text-xl shadow-lg shadow-accent/30 group-hover:scale-105 transition-transform">
              {(appName || 'goJim')[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-lg font-bold text-text-primary">{appName}</h1>
              <p className="text-xs text-text-muted">Gym Management</p>
            </div>
          </Link>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
                            pathname.startsWith(item.href + '/') ||
                            (item.subItems?.some(sub => {
                              const subPath = sub.href.split('?')[0];
                              return pathname === subPath || (subPath !== '/' && pathname.startsWith(subPath + '/'));
                            }));
            const isOpen = openMenus[item.label] || (item.subItems?.some(sub => pathname === sub.href.split('?')[0]) && openMenus[item.label] !== false);
            const hasSub = !!item.subItems;

            return (
              <div key={item.label} className="flex flex-col group">
                <div 
                  onClick={() => hasSub && toggleMenu(item.label)}
                  className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[15px] font-medium transition-all cursor-pointer
                    ${isActive
                      ? 'bg-white text-[#212121] shadow-inner font-bold'
                      : 'text-[#a2a2a2] hover:bg-bg-card hover:text-text-primary'
                    }`}
                >
                  <span className={`flex items-center justify-center ${isActive ? 'text-[#ffffff]' : 'text-inherit'}`}>
                    {item.icon}
                  </span>
                  {hasSub ? (
                    <div className="flex-1 flex items-center justify-between">
                      <span>{item.label}</span>
                      <ChevronDown size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                  ) : (
                    <Link href={item.href} prefetch={false} className="flex-1 no-underline text-inherit">
                      {item.label}
                    </Link>
                  )}
                </div>

                {/* Sub-items Accordion */}
                {hasSub && (
                  <div className={`flex-col gap-1 pt-1 ml-9 border-l border-border/30 pl-4 ${isOpen ? 'flex' : 'hidden group-hover:flex'}`}>
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
                        <Link key={sub.href} href={sub.href} prefetch={false}
                          className={`px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all no-underline
                            ${isSubActive 
                              ? 'bg-white text-[#212121] shadow-inner font-bold' 
                              : 'text-[#a2a2a2] hover:bg-bg-card hover:text-text-primary'}`}
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

          {/* Settings Button */}
          <button 
            onClick={openSettings}
            className="flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[15px] font-medium transition-all text-[#a2a2a2] hover:bg-bg-card hover:text-text-primary border-none cursor-pointer text-left bg-transparent"
          >
            <Settings size={20} />
            <span className="flex-1">Gym Settings</span>
          </button>
        </nav>

        {/* User Section */}
        <div className="p-6 border-t border-border/50 bg-bg-secondary/30">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-lg shadow-inner">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-text-primary truncate">{user?.name}</p>
              <p className="text-[13px] text-text-muted capitalize">{user?.role}</p>
            </div>
          </div>
          {!isImpersonating && (
            <button onClick={logout} className="w-full flex items-center gap-3 px-5 py-3 text-[14px] font-medium text-[#a2a2a2] hover:text-danger rounded-xl hover:bg-danger/10 transition-all cursor-pointer border-none bg-transparent">
              <LogOut size={18} /> Sign Out
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-border z-50 safe-area-bottom" style={{ backgroundColor: '#1f1f1f' }}>
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href}
                className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all no-underline min-w-[56px]
                  ${isActive ? 'bg-white text-[#212121]' : 'text-[#a2a2a2]'}`}
              >
                <span className={`text-xl ${isActive ? 'text-[#ffffff]' : 'text-inherit'}`}>{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
          {/* Mobile Settings */}
          <button 
            onClick={openSettings}
            className="flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all text-[#a2a2a2] border-none bg-transparent"
          >
            <Settings size={20} />
            <span className="text-[10px] font-medium">Gym Settings</span>
          </button>
        </div>
      </nav>
    </>
  );
}
