'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/UI';
import { CreditCard, Bell, MessageSquare, UserCheck, ChevronRight, Settings } from 'lucide-react';
import { superAdminApi } from '@/lib/api';

export default function MorePage() {
  const { user, logout } = useAuth();
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

  const menuItems = [
    { href: '/payments', icon: <CreditCard size={24} className="text-accent" />, label: 'Payments', desc: 'Track revenue & payments' },
    { href: '/alerts', icon: <Bell size={24} className="text-warning" />, label: 'Alerts', desc: 'Dropout & payment alerts' },
    { href: '/whatsapp', icon: <MessageSquare size={24} className="text-success" />, label: 'WhatsApp', desc: 'Message automation' },
    { href: '/attendance', icon: <UserCheck size={24} className="text-info" />, label: 'Attendance', desc: 'Check-in & tracking' },
  ];

  return (
    <div>
      <PageHeader title="More" subtitle="Settings & tools" />

      {/* Profile Card */}
      <div className="card !p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-accent/15 flex items-center justify-center text-accent font-bold text-2xl">
            {user?.name?.[0] || 'U'}
          </div>
          <div>
            <h2 className="text-lg font-bold">{user?.name}</h2>
            <p className="text-sm text-text-muted">{user?.email}</p>
            <span className="badge badge-accent mt-1 capitalize">{user?.role}</span>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="space-y-2 mb-6">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href}
            className="card !p-4 flex items-center gap-4 no-underline hover:!border-accent/30 transition-all">
            <span className="text-2xl">{item.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-text-primary">{item.label}</p>
              <p className="text-xs text-text-muted">{item.desc}</p>
            </div>
            <span className="text-text-muted"><ChevronRight size={20} /></span>
          </Link>
        ))}
      </div>

      {/* App Info */}
      <div className="card !p-6 mb-4">
        <h3 className="text-sm font-semibold mb-3">About {appName}</h3>
        <div className="space-y-2 text-sm text-text-muted">
          <p>Version 1.0.0</p>
          <p>Gym Management Platform</p>
          <p>Built with ❤️ for gym owners</p>
        </div>
      </div>

      <button onClick={logout}
        className="btn-danger w-full !py-3.5 cursor-pointer">
        ← Sign Out
      </button>
    </div>
  );
}
