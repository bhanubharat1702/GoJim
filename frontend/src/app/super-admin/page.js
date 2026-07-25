'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { superAdminApi } from '@/lib/api';
import { cleanPhone, validatePhone } from '@/lib/utils';
import {
  Users, IndianRupee, ShieldAlert, Search, Power, Trash2, Edit2,
  Settings, CheckCircle, MessageCircle, AlertTriangle, XCircle, ArrowUpRight, Save, X,
  Building2, Calendar, Lock, PlusCircle, Radio, Activity, Eye, Sliders, Check, ExternalLink, RefreshCw,
  Bell, Gift, MoreHorizontal, Plus, Tags, RotateCcw, Edit3, ChevronDown, EyeOff
} from 'lucide-react';

const formatDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatTime = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
};

// SVG Line Chart Component
function SVGLineChart({ data, transactions = [], color = "#09090b", valuePrefix = "", id = "" }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!data || data.length === 0) return <div className="text-center text-xs py-8 text-zinc-400">No trend data available</div>;

  const width = 600;
  const height = 240;
  const paddingLeft = 45;
  const paddingRight = 35;
  const paddingTop = 45;
  const paddingBottom = 45;
  
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const values = data.map(d => d.value);
  const maxVal = Math.max(...values, 100);
  const minVal = 0;

  const getX = (index) => paddingLeft + (index / (data.length - 1)) * chartWidth;
  const getY = (val) => paddingTop + chartHeight - ((val - minVal) / (maxVal - minVal)) * chartHeight;

  // Generate smooth spline path
  const points = data.map((d, i) => ({ x: getX(i), y: getY(d.value) }));
  
  let linePath = "";
  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 2;
      const cp1y = p0.y;
      const cp2x = p0.x + (p1.x - p0.x) / 2;
      const cp2y = p1.y;
      linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
  }

  const fillPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
    : "";

  const activeIndex = hoveredIndex;
  const activeData = activeIndex !== null ? data[activeIndex] : null;
  const activeX = activeIndex !== null ? getX(activeIndex) : 0;
  const activeY = activeIndex !== null ? getY(activeData.value) : 0;

  const activeMonthTx = activeData
    ? (transactions || [])
        .filter(tx => {
          if (!tx.transactionDate) return false;
          const txDate = new Date(tx.transactionDate);
          
          // Parse activeData.label (e.g., "Jun 26" or "Jun 2026")
          const labelParts = activeData.label.split(/[\s,]+/);
          if (labelParts.length < 2) return false;
          
          const monthStr = labelParts[0].toLowerCase();
          const yearStr = labelParts[1];
          
          const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
          const monthIndex = months.findIndex(m => monthStr.startsWith(m));
          if (monthIndex === -1) return false;
          
          const txMonth = txDate.getMonth();
          const txYear = txDate.getFullYear();
          
          // Match year (support both 2-digit like "26" and 4-digit like "2026")
          const fullYearStr = txYear.toString();
          const matchesYear = fullYearStr === yearStr || fullYearStr.endsWith(yearStr);
          
          return txMonth === monthIndex && matchesYear;
        })
        .sort((a, b) => new Date(a.transactionDate) - new Date(b.transactionDate))
    : [];

  const formatTxDate = (dateInput) => {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day} ${months[d.getMonth()]}`;
  };

  const handleMouseMove = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * width;
    
    let closestIndex = 0;
    let minDiff = Infinity;
    for (let i = 0; i < data.length; i++) {
      const x = getX(i);
      const diff = Math.abs(x - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }
    setHoveredIndex(closestIndex);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  return (
    <div className="w-full relative">
      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        className="w-full h-auto overflow-visible select-none cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id={`chart-grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = paddingTop + ratio * chartHeight;
          const val = maxVal - ratio * (maxVal - minVal);
          return (
            <g key={i}>
              <line 
                x1={paddingLeft} 
                y1={y} 
                x2={width - paddingRight} 
                y2={y} 
                stroke="rgba(255, 255, 255, 0.08)" 
                strokeWidth="1.2" 
                strokeDasharray="3 3" 
              />
              <text 
                x={paddingLeft - 10} 
                y={y + 3} 
                fill="#71717a" 
                fontSize="9.5" 
                textAnchor="end" 
                className="font-bold"
              >
                {valuePrefix}{Math.round(val).toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* X Axis Labels */}
        {data.map((d, i) => (
          <text 
            key={i} 
            x={getX(i)} 
            y={height - paddingBottom + 20} 
            fill="#71717a" 
            fontSize="9.5" 
            textAnchor="middle" 
            className="font-bold"
          >
            {d.label}
          </text>
        ))}

        {/* Vertical active cursor line */}
        {activeIndex !== null && (
          <line 
            x1={activeX} 
            y1={paddingTop} 
            x2={activeX} 
            y2={paddingTop + chartHeight} 
            stroke="rgba(255, 255, 255, 0.15)" 
            strokeWidth="1.5" 
          />
        )}

        {/* Fill Path */}
        {fillPath && (
          <path d={fillPath} fill={`url(#chart-grad-${id})`} />
        )}

        {/* Smooth Curved Spline Line */}
        <path 
          d={linePath} 
          fill="none" 
          stroke={color} 
          strokeWidth="3.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />

        {/* Triple-ring active point marker */}
        {activeIndex !== null && (
          <g>
            <circle cx={activeX} cy={activeY} r="10" fill={color} />
            <circle cx={activeX} cy={activeY} r="6" fill="#121214" />
            <circle cx={activeX} cy={activeY} r="3" fill={color} />
          </g>
        )}
      </svg>

      {/* HTML Tooltip Overlay showing active month's transactions */}
      {activeIndex !== null && activeData && (
        <div 
          className="absolute z-50 bg-[#09090b] text-white text-xs font-medium py-3 px-4 rounded-xl shadow-xl border border-white/10 pointer-events-none min-w-[200px] transition-all duration-150 ease-out"
          style={{ 
            left: `${(activeX / 600) * 100}%`, 
            top: `${(activeY / 240) * 100}%`,
            transform: 'translate(-50%, -108%)' 
          }}
        >
          <div className="font-extrabold text-zinc-400 border-b border-white/5 pb-1.5 mb-1.5 flex justify-between gap-4">
            <span>{activeData.label}</span>
            <span className="text-[#8ccc5c]">₹{activeData.value.toLocaleString()}</span>
          </div>
          <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1">
            {activeMonthTx.length === 0 ? (
              <p className="text-[10px] text-zinc-500 italic">No transactions recorded</p>
            ) : (
              activeMonthTx.map((tx, idx) => (
                <div key={idx} className="flex justify-between items-center gap-3 text-[10px] border-b border-white/5 py-1 last:border-b-0">
                  <div className="flex flex-col min-w-0">
                    <span className="text-zinc-300 truncate max-w-[120px] font-bold" title={tx.gymName || 'N/A'}>
                      {tx.gymName || 'N/A'}
                    </span>
                    <span className="text-[8px] text-zinc-500 font-medium mt-0.5">
                      {formatTxDate(tx.transactionDate)}
                    </span>
                  </div>
                  <span className="font-bold text-[#8ccc5c]">
                    ₹{tx.amount.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SuperAdminDashboardContent() {
  const { user, logout, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Navigation tab state (dashboard, gyms, plans, settings)
  const [activeTab, setActiveTab] = useState('dashboard');

  // Sub-tab states
  const [plansTab, setPlansTab] = useState('plansList'); // plansList, subscriptions
  const [settingsTab, setSettingsTab] = useState('general'); // general, broadcasts, features, analytics, auditLogs
  const [categoriesTab, setCategoriesTab] = useState('equipment'); // equipment, expense, staff, specializations
  const [newEquipmentCat, setNewEquipmentCat] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('');
  const [newSpecialization, setNewSpecialization] = useState('');
  const [newExpenseCatName, setNewExpenseCatName] = useState('');
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState(null);
  const [newExpenseTitleName, setNewExpenseTitleName] = useState('');
  const [editingExpenseCatId, setEditingExpenseCatId] = useState(null);
  const [editingExpenseCatName, setEditingExpenseCatName] = useState('');

  // Data states
  const [stats, setStats] = useState(null);
  const [owners, setOwners] = useState([]);
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState({ list: [], summary: { activeSubs: 0, trialSubs: 0, expiredSubs: 0, mrr: 0 } });
  const [transactionsData, setTransactionsData] = useState({ list: [], summary: { totalCount: 0, totalRevenue: 0 } });
  const [settingsData, setSettingsData] = useState(null);
  const [trendFilter, setTrendFilter] = useState('monthly');
  const [isTrendDropdownOpen, setIsTrendDropdownOpen] = useState(false);
  const [isGymStatusDropdownOpen, setIsGymStatusDropdownOpen] = useState(false);
  const [isGymPlanDropdownOpen, setIsGymPlanDropdownOpen] = useState(false);
  const [isGymSubDropdownOpen, setIsGymSubDropdownOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filter States
  const [gymSearch, setGymSearch] = useState('');
  const [gymStatusFilter, setGymStatusFilter] = useState('');
  const [gymPlanFilter, setGymPlanFilter] = useState('');
  const [gymSubFilter, setGymSubFilter] = useState('');

  const [subSearch, setSubSearch] = useState('');
  const [subStatusFilter, setSubStatusFilter] = useState('');

  const [transactionSearch, setTransactionSearch] = useState('');
  const [transactionStatusFilter, setTransactionStatusFilter] = useState('');

  // Global Search Overlay States
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ pages: [], gyms: [], plans: [], subs: [], logs: [] });
  const searchInputRef = useRef(null);

  // Global Search Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Global Search Input Focus helper
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current.focus();
      }, 50);
    }
  }, [isSearchOpen]);

  // Selected Expense Category sync
  useEffect(() => {
    if (settingsData?.settings?.expenseCategories?.length > 0) {
      const expenseCats = settingsData.settings.expenseCategories;
      if (selectedExpenseCategory) {
        const updated = expenseCats.find(c => c._id === selectedExpenseCategory._id || c.name === selectedExpenseCategory.name);
        setSelectedExpenseCategory(updated || expenseCats[0]);
      } else {
        setSelectedExpenseCategory(expenseCats[0]);
      }
    } else {
      setSelectedExpenseCategory(null);
    }
  }, [settingsData]);

  // Global Search Logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ pages: [], gyms: [], plans: [], subs: [], logs: [] });
      return;
    }

    const query = searchQuery.toLowerCase().trim();

    // 1. Pages
    const superAdminPages = [
      { id: 'dashboard', label: 'Super Admin Dashboard', tab: 'dashboard' },
      { id: 'gyms', label: 'Gym Hub (Gym Owners & Logins)', tab: 'gyms' },
      { id: 'plans', label: 'Plans & Billing - Plans', tab: 'plans', plansTab: 'plansList' },
      { id: 'subscriptions', label: 'Plans & Billing - Active Subscriptions', tab: 'plans', plansTab: 'subscriptions' },
      { id: 'settings-general', label: 'Platform Settings - General Configuration', tab: 'settings', settingsTab: 'general' },
      { id: 'settings-broadcasts', label: 'Platform Settings - Broadcasts & Announcements', tab: 'settings', settingsTab: 'broadcasts' },
      { id: 'settings-features', label: 'Platform Settings - Global Feature Flags', tab: 'settings', settingsTab: 'features' },
      { id: 'settings-analytics', label: 'Platform Settings - Dynamic Analytics & Logs', tab: 'settings', settingsTab: 'analytics' },
      { id: 'settings-audit', label: 'Platform Settings - Security Audit Logs', tab: 'settings', settingsTab: 'auditLogs' }
    ];
    const matchedPages = superAdminPages.filter(p => p.label.toLowerCase().includes(query));

    // 2. Gyms
    const matchedGyms = (owners || []).filter(o =>
      (o.name || '').toLowerCase().includes(query) ||
      (o.gymName || '').toLowerCase().includes(query) ||
      (o.email || '').toLowerCase().includes(query) ||
      (o.phone || '').toLowerCase().includes(query)
    ).slice(0, 5);

    // 3. Subscription Plans
    const matchedPlans = (plans || []).filter(p =>
      (p.name || '').toLowerCase().includes(query) ||
      (p.description || '').toLowerCase().includes(query)
    ).slice(0, 5);

    // 4. Subscriptions
    const matchedSubs = (subscriptions.list || []).filter(sub =>
      (sub.name || '').toLowerCase().includes(query) ||
      (sub.gymName || '').toLowerCase().includes(query) ||
      (sub.email || '').toLowerCase().includes(query) ||
      (sub.subscriptionStatus || '').toLowerCase().includes(query)
    ).slice(0, 5);

    // 5. Audit Logs
    const matchedLogs = (settingsData?.auditLogs || []).filter(log =>
      (log.action || '').toLowerCase().includes(query) ||
      (log.performedBy || '').toLowerCase().includes(query) ||
      (log.affectedEntity || '').toLowerCase().includes(query) ||
      (log.details || '').toLowerCase().includes(query)
    ).slice(0, 5);

    setSearchResults({
      pages: matchedPages,
      gyms: matchedGyms,
      plans: matchedPlans,
      subs: matchedSubs,
      logs: matchedLogs
    });
  }, [searchQuery, owners, plans, subscriptions, settingsData]);

  // Modal States
  const [viewGymId, setViewGymId] = useState(null);
  const [gymDetails, setGymDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [createGymOpen, setCreateGymOpen] = useState(false);
  const [editGymOpen, setEditGymOpen] = useState(null);
  const [editWhatsappSectionOpen, setEditWhatsappSectionOpen] = useState(false);
  const [isAdminWhatsappUnlocked, setIsAdminWhatsappUnlocked] = useState(false);
  const [showAdminUnlockWarning, setShowAdminUnlockWarning] = useState(false);

  const [createPlanOpen, setCreatePlanOpen] = useState(false);
  const [editPlanOpen, setEditPlanOpen] = useState(null);

  const [extendTrialId, setExtendTrialId] = useState(null);
  const [extendDays, setExtendDays] = useState(7);

  const [changePlanId, setChangePlanId] = useState(null);
  const [changePlanForm, setChangePlanForm] = useState({ planId: '', billingCycle: 'monthly', status: 'Active' });

  const [changePasswordGym, setChangePasswordGym] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [showDetailsPassword, setShowDetailsPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [deleteOwnerId, setDeleteOwnerId] = useState(null);
  const [deletePlanId, setDeletePlanId] = useState(null);
  const [deleteBroadcastId, setDeleteBroadcastId] = useState(null);

  const [actionLoading, setActionLoading] = useState(false);

  const anyModalOpen = !!(
    viewGymId ||
    createGymOpen ||
    editGymOpen ||
    createPlanOpen ||
    editPlanOpen ||
    extendTrialId ||
    changePlanId ||
    changePasswordGym ||
    deleteOwnerId ||
    deletePlanId ||
    deleteBroadcastId
  );

  useEffect(() => {
    if (anyModalOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [anyModalOpen]);

  // Form States
  const [gymForm, setGymForm] = useState({ name: '', email: '', password: '', phone: '', gymName: '', subscriptionPlanId: '', subscriptionStatus: 'Trial', trialDays: '', billingCycle: 'monthly' });
  const [planForm, setPlanForm] = useState({ name: '', monthlyPrice: 0, yearlyPrice: 0, maxClients: 100, maxTrainers: 10, maxStaff: 10, trialDays: 14, description: '', features: ['Leads Module', 'Equipment Module', 'Attendance Module', 'Payments Module', 'Trainer Module', 'Staff Module'], status: 'Active' });
  const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '', targetAudience: 'All Gyms', specificPlanId: '', selectedGyms: [], intensity: 'Normal' });
  const [generalSettingsForm, setGeneralSettingsForm] = useState({ appName: '', supportEmail: '', supportPhone: '', defaultTrialDays: 14, maintenanceMode: false });
  const [featureFlagsForm, setFeatureFlagsForm] = useState({ leads: true, equipment: true, attendance: true, payments: true, trainer: true, staff: true });

  const fetchData = async () => {
    if (!user || user.role !== 'superadmin') {
      return;
    }
    try {
      setLoading(true);
      setError('');

      const tab = searchParams.get('tab') || 'dashboard';
      setActiveTab(tab);

      // Fetch base info
      const statsRes = await superAdminApi.getStats();
      if (statsRes.success) setStats(statsRes.data);

      const ownersRes = await superAdminApi.getOwners();
      if (ownersRes.success) setOwners(ownersRes.data);

      const plansRes = await superAdminApi.getPlans();
      if (plansRes.success) {
        setPlans(plansRes.data);
      }

      const subsRes = await superAdminApi.getSubscriptions();
      if (subsRes.success) setSubscriptions(subsRes.data);

      const transactionsRes = await superAdminApi.getTransactions();
      if (transactionsRes.success) setTransactionsData(transactionsRes.data);

      const settingsRes = await superAdminApi.getSettings();
      if (settingsRes.success) {
        setSettingsData(settingsRes.data);
        setGeneralSettingsForm({
          appName: settingsRes.data.settings?.appName || 'goJim',
          supportEmail: settingsRes.data.settings?.supportEmail || '',
          supportPhone: settingsRes.data.settings?.supportPhone || '',
          defaultTrialDays: settingsRes.data.settings?.defaultTrialDays || 14,
          maintenanceMode: settingsRes.data.settings?.maintenanceMode || false
        });
        setFeatureFlagsForm(settingsRes.data.settings?.featureFlags || { leads: true, equipment: true, attendance: true, payments: true, trainer: true, staff: true });
      }

    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load system configuration');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!authLoading && user?.role !== 'superadmin') {
      router.push('/dashboard');
    } else if (!authLoading && isAuthenticated && user?.role === 'superadmin') {
      fetchData();
    }
  }, [isAuthenticated, user, authLoading, router, searchParams]);

  // Sync tab helper
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    router.push(`/super-admin?tab=${tab}`);
  };

  // GYMS CRUD Handlers
  const handleCreateGym = async (e) => {
    e.preventDefault();
    if (!gymForm.phone || !gymForm.phone.trim()) {
      alert('Phone number is required.');
      return;
    }
    if (!validatePhone(gymForm.phone)) {
      alert('Phone number must be exactly 10 digits (no spaces, letters, or special characters).');
      return;
    }
    setActionLoading(true);
    try {
      const res = await superAdminApi.createOwner(gymForm);
      if (res.success) {
        setCreateGymOpen(false);
        setGymForm({ name: '', email: '', password: '', phone: '', gymName: '', subscriptionPlanId: '', subscriptionStatus: 'Trial', trialDays: '', billingCycle: 'monthly' });
        await fetchData();
      }
    } catch (err) {
      alert(err.message || 'Failed to create gym owner');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEditGym = (owner) => {
    setEditGymOpen(owner);
    setEditWhatsappSectionOpen(false);
    setIsAdminWhatsappUnlocked(false);
    setShowAdminUnlockWarning(false);
    setGymForm({
      name: owner.name || '',
      gymName: owner.gymName || '',
      phone: owner.phone || '',
      email: owner.email || '',
      whatsappConfig: owner.whatsappConfig || {
        phoneNumberId: '',
        accessToken: '',
        businessAccountId: '',
        isVerified: false,
        automations: {
          welcomeMessage: { enabled: true, templateText: "Hello {member_name}! Welcome to {gym_name}. We're excited to have you on board! Let's smash those fitness goals together! 🚀" },
          birthdayWish: { enabled: true, templateText: "Happy Birthday {member_name}! 🎂 Wishing you a fantastic day and a year full of strength and health from {gym_name}! 💪" },
          paymentReminder: { enabled: true, daysBefore: 3, templateText: "Hello {member_name}, this is a reminder from {gym_name} that your membership expires in {days_left} days ({expiry_date}). Renew now to keep training without interruptions! 💳" },
          comebackNudge: { enabled: true, daysInactive: 5, templateText: "Hey {member_name}! We missed you at {gym_name}. It's been {days_inactive} days since your last session. Let's get back on track! When are you coming in? 🏋️" }
        }
      }
    });
  };

  const handleSaveEditGym = async (e) => {
    e.preventDefault();
    if (!gymForm.phone || !gymForm.phone.trim()) {
      alert('Phone number is required.');
      return;
    }
    if (!validatePhone(gymForm.phone)) {
      alert('Phone number must be exactly 10 digits (no spaces, letters, or special characters).');
      return;
    }
    setActionLoading(true);
    try {
      const res = await superAdminApi.updateDetails(editGymOpen._id, {
        name: gymForm.name,
        gymName: gymForm.gymName,
        phone: gymForm.phone,
        email: gymForm.email,
        whatsappConfig: gymForm.whatsappConfig
      });
      if (res.success) {
        setEditGymOpen(null);
        setIsAdminWhatsappUnlocked(false);
        setShowAdminUnlockWarning(false);
        await fetchData();
      }
    } catch (err) {
      alert(err.message || 'Failed to update gym details');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const res = await superAdminApi.toggleStatus(id);
      if (res.success) {
        await fetchData();
      }
    } catch (err) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleDeleteGym = async () => {
    setActionLoading(true);
    try {
      const res = await superAdminApi.deleteOwner(deleteOwnerId);
      if (res.success) {
        setDeleteOwnerId(null);
        if (viewGymId === deleteOwnerId) setViewGymId(null);
        await fetchData();
      }
    } catch (err) {
      alert(err.message || 'Failed to purge tenant');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtendTrial = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await superAdminApi.extendTrial(extendTrialId, extendDays);
      if (res.success) {
        setExtendTrialId(null);
        await fetchData();
        if (viewGymId === extendTrialId) {
          handleViewGym(extendTrialId);
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to extend trial');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePlan = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await superAdminApi.changePlan(changePlanId, changePlanForm);
      if (res.success) {
        setChangePlanId(null);
        await fetchData();
        if (viewGymId === changePlanId) {
          handleViewGym(changePlanId);
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to change subscription plan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 5) {
      alert('Password must be at least 5 characters long.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await superAdminApi.changePassword(changePasswordGym._id, newPassword);
      if (res.success) {
        alert(`Password for ${changePasswordGym.gymName || changePasswordGym.name} updated successfully!`);
        setChangePasswordGym(null);
        setNewPassword('');
        await fetchData();
      }
    } catch (err) {
      alert(err.message || 'Failed to update password');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewGym = async (id) => {
    setViewGymId(id);
    setDetailsLoading(true);
    try {
      const res = await superAdminApi.getOwnerDetails(id);
      if (res.success) {
        setGymDetails(res.data);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load gym metrics');
    } finally {
      setDetailsLoading(false);
    }
  };

  // Impersonation Handler
  const handleImpersonate = async (id) => {
    try {
      const res = await superAdminApi.impersonate(id);
      if (res.success) {
        // Save current super admin session first
        localStorage.setItem('gojim_admin_token', localStorage.getItem('gojim_token'));
        localStorage.setItem('gojim_admin_user', localStorage.getItem('gojim_user'));

        // Write impersonator credentials
        localStorage.setItem('gojim_token', res.token);
        localStorage.setItem('gojim_user', JSON.stringify(res.user));

        // Redirect to gym dashboard
        window.location.href = '/dashboard';
      }
    } catch (err) {
      alert(err.message || 'Impersonation request denied');
    }
  };

  // Subscription Plans CRUD Handlers
  const handleCreatePlan = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await superAdminApi.createPlan(planForm);
      if (res.success) {
        setCreatePlanOpen(false);
        setPlanForm({ name: '', monthlyPrice: 0, yearlyPrice: 0, maxClients: 100, maxTrainers: 10, maxStaff: 10, trialDays: 14, description: '', features: ['Leads Module', 'Equipment Module', 'Attendance Module', 'Payments Module', 'Trainer Module', 'Staff Module'], status: 'Active' });
        await fetchData();
      }
    } catch (err) {
      alert(err.message || 'Failed to create plan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEditPlan = (plan) => {
    setEditPlanOpen(plan);
    setPlanForm({
      name: plan.name || '',
      monthlyPrice: plan.monthlyPrice || 0,
      yearlyPrice: plan.yearlyPrice || 0,
      maxClients: plan.maxClients || 100,
      maxTrainers: plan.maxTrainers || 10,
      maxStaff: plan.maxStaff || 10,
      trialDays: plan.trialDays ?? 14,
      description: plan.description || '',
      features: plan.features || [],
      status: plan.status || 'Active'
    });
  };

  const handleSaveEditPlan = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await superAdminApi.updatePlan(editPlanOpen._id, planForm);
      if (res.success) {
        setEditPlanOpen(null);
        setPlanForm({ name: '', monthlyPrice: 0, yearlyPrice: 0, maxClients: 100, maxTrainers: 10, maxStaff: 10, trialDays: 14, description: '', features: ['Leads Module', 'Equipment Module', 'Attendance Module', 'Payments Module', 'Trainer Module', 'Staff Module'], status: 'Active' });
        await fetchData();
      }
    } catch (err) {
      alert(err.message || 'Failed to update plan details');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePlan = async () => {
    setActionLoading(true);
    try {
      const res = await superAdminApi.deletePlan(deletePlanId);
      if (res.success) {
        setDeletePlanId(null);
        await fetchData();
      }
    } catch (err) {
      alert(err.message || 'Failed to delete plan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePlanStatus = async (plan) => {
    try {
      const res = await superAdminApi.updatePlan(plan._id, { status: plan.status === 'Active' ? 'Inactive' : 'Active' });
      if (res.success) await fetchData();
    } catch (err) {
      alert(err.message || 'Failed to update plan status');
    }
  };

  // Platform Settings Handlers
  const handleSaveGeneralSettings = async (e) => {
    e.preventDefault();
    if (!generalSettingsForm.supportPhone || !generalSettingsForm.supportPhone.trim()) {
      alert('Support contact number is required.');
      return;
    }
    if (!validatePhone(generalSettingsForm.supportPhone)) {
      alert('Support contact number must be exactly 10 digits (no spaces, letters, or special characters).');
      return;
    }
    setActionLoading(true);
    try {
      const res = await superAdminApi.updateSettings(generalSettingsForm);
      if (res.success) {
        alert('General settings updated successfully');
        await fetchData();
      }
    } catch (err) {
      alert(err.message || 'Failed to update platform settings');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveFeatureFlags = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await superAdminApi.updateFeatureFlags({ featureFlags: featureFlagsForm });
      if (res.success) {
        alert('Feature management configurations saved globally');
        await fetchData();
      }
    } catch (err) {
      alert(err.message || 'Failed to save feature flags');
    } finally {
      setActionLoading(false);
    }
  };

  // Category settings helpers
  const handleUpdateCategories = async (updatedFields) => {
    setActionLoading(true);
    try {
      const res = await superAdminApi.updateSettings(updatedFields);
      if (res.success) {
        await fetchData();
      }
    } catch (err) {
      alert(err.message || 'Failed to update categories');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetEquipmentCategories = async () => {
    if (confirm('Are you sure you want to reset equipment categories to defaults?')) {
      await handleUpdateCategories({ equipmentCategories: ['Cardio', 'Strength', 'Free Weights', 'Accessories'] });
    }
  };

  const handleAddEquipmentCategory = async (e) => {
    e.preventDefault();
    const val = newEquipmentCat.trim();
    if (!val) return;
    const current = settingsData?.settings?.equipmentCategories || ['Cardio', 'Strength', 'Free Weights', 'Accessories'];
    if (current.includes(val)) {
      alert('Category already exists!');
      return;
    }
    await handleUpdateCategories({ equipmentCategories: [...current, val] });
    setNewEquipmentCat('');
  };

  const handleDeleteEquipmentCategory = async (cat) => {
    const current = settingsData?.settings?.equipmentCategories || ['Cardio', 'Strength', 'Free Weights', 'Accessories'];
    if (current.length <= 1) {
      alert('Must have at least one category!');
      return;
    }
    if (confirm(`Are you sure you want to remove "${cat}"?`)) {
      await handleUpdateCategories({ equipmentCategories: current.filter(c => c !== cat) });
    }
  };

  const handleResetStaffRoles = async () => {
    if (confirm('Are you sure you want to reset staff roles to defaults?')) {
      await handleUpdateCategories({ staffRoles: ['Trainer', 'Manager', 'Staff', 'Admin'] });
    }
  };

  const handleAddStaffRole = async (e) => {
    e.preventDefault();
    const val = newStaffRole.trim();
    if (!val) return;
    const current = settingsData?.settings?.staffRoles || ['Trainer', 'Manager', 'Staff', 'Admin'];
    if (current.includes(val)) {
      alert('Role already exists!');
      return;
    }
    await handleUpdateCategories({ staffRoles: [...current, val] });
    setNewStaffRole('');
  };

  const handleDeleteStaffRole = async (role) => {
    const current = settingsData?.settings?.staffRoles || ['Trainer', 'Manager', 'Staff', 'Admin'];
    if (current.length <= 1) {
      alert('Must have at least one role!');
      return;
    }
    if (confirm(`Are you sure you want to remove "${role}"?`)) {
      await handleUpdateCategories({ staffRoles: current.filter(r => r !== role) });
    }
  };

  const handleResetSpecializations = async () => {
    if (confirm('Are you sure you want to reset specializations to defaults?')) {
      await handleUpdateCategories({ specializations: ['Weight Loss', 'Muscle Building', 'Cardio Training', 'Yoga', 'Zumba', 'CrossFit'] });
    }
  };

  const handleAddSpecialization = async (e) => {
    e.preventDefault();
    const val = newSpecialization.trim();
    if (!val) return;
    const current = settingsData?.settings?.specializations || ['Weight Loss', 'Muscle Building', 'Cardio Training', 'Yoga', 'Zumba', 'CrossFit'];
    if (current.includes(val)) {
      alert('Specialization already exists!');
      return;
    }
    await handleUpdateCategories({ specializations: [...current, val] });
    setNewSpecialization('');
  };

  const handleDeleteSpecialization = async (spec) => {
    const current = settingsData?.settings?.specializations || ['Weight Loss', 'Muscle Building', 'Cardio Training', 'Yoga', 'Zumba', 'CrossFit'];
    if (current.length <= 1) {
      alert('Must have at least one specialization!');
      return;
    }
    if (confirm(`Are you sure you want to remove "${spec}"?`)) {
      await handleUpdateCategories({ specializations: current.filter(s => s !== spec) });
    }
  };

  const handleResetExpenseCategories = async () => {
    if (confirm('Are you sure you want to reset expense categories to defaults?')) {
      const defaults = [
        { name: 'Rent', titles: ["Gym Rent", "Parking Rent", "Storage Rent", "Other"] },
        { name: 'Utilities', titles: ["Electricity Bill", "Water Bill", "Generator Fuel", "Other"] },
        { name: 'Maintenance', titles: ["Treadmill Repair", "Cable Replacement", "Machine Service", "AC Repair", "Other"] },
        { name: 'Marketing', titles: ["Instagram Ads", "Banner Printing", "Referral Campaign", "Other"] },
        { name: 'Cleaning', titles: ["Cleaning Supplies", "Sanitizer", "Washroom Supplies", "Other"] },
        { name: 'Internet', titles: ["WiFi Bill", "Software Subscription", "CCTV Subscription", "Other"] },
        { name: 'Equipment', titles: ["New Dumbbells", "Yoga Mats", "Resistance Bands", "Other"] },
        { name: 'Miscellaneous', titles: ["Furniture Repair", "Festival Decoration", "Office Supplies", "Other"] }
      ];
      await handleUpdateCategories({ expenseCategories: defaults });
    }
  };

  const handleCreateExpenseCategory = async (e) => {
    e.preventDefault();
    const nameTrimmed = newExpenseCatName.trim();
    if (!nameTrimmed) return;
    const current = settingsData?.settings?.expenseCategories || [];
    if (current.some(c => c.name.toLowerCase() === nameTrimmed.toLowerCase())) {
      alert('Category name already exists!');
      return;
    }
    const updated = [...current, { name: nameTrimmed, titles: ['Other'] }];
    await handleUpdateCategories({ expenseCategories: updated });
    setNewExpenseCatName('');
  };

  const handleUpdateExpenseCategoryName = async (catId) => {
    const nameTrimmed = editingExpenseCatName.trim();
    if (!nameTrimmed) return;
    const current = settingsData?.settings?.expenseCategories || [];
    if (current.some(c => c._id !== catId && c.name.toLowerCase() === nameTrimmed.toLowerCase())) {
      alert('Category name already exists!');
      return;
    }
    const updated = current.map(c => c._id === catId ? { ...c, name: nameTrimmed } : c);
    await handleUpdateCategories({ expenseCategories: updated });
    setEditingExpenseCatId(null);
  };

  const handleDeleteExpenseCategory = async (catId, name) => {
    if (confirm(`Are you sure you want to delete category "${name}"?`)) {
      const current = settingsData?.settings?.expenseCategories || [];
      const updated = current.filter(c => c._id !== catId);
      await handleUpdateCategories({ expenseCategories: updated });
    }
  };

  const handleAddExpenseTitle = async (e) => {
    e.preventDefault();
    if (!selectedExpenseCategory) return;
    const titleVal = newExpenseTitleName.trim();
    if (!titleVal) return;
    if (selectedExpenseCategory.titles.includes(titleVal)) {
      alert('Option already exists!');
      return;
    }
    const current = settingsData?.settings?.expenseCategories || [];
    const updated = current.map(c => {
      if (c._id === selectedExpenseCategory._id || c.name === selectedExpenseCategory.name) {
        return { ...c, titles: [...c.titles.filter(t => t !== 'Other'), titleVal, 'Other'] };
      }
      return c;
    });
    await handleUpdateCategories({ expenseCategories: updated });
    setNewExpenseTitleName('');
  };

  const handleDeleteExpenseTitle = async (titleVal) => {
    if (!selectedExpenseCategory) return;
    if (titleVal === 'Other') return;
    if (confirm(`Are you sure you want to remove "${titleVal}"?`)) {
      const current = settingsData?.settings?.expenseCategories || [];
      const updated = current.map(c => {
        if (c._id === selectedExpenseCategory._id || c.name === selectedExpenseCategory.name) {
          return { ...c, titles: c.titles.filter(t => t !== titleVal) };
        }
        return c;
      });
      await handleUpdateCategories({ expenseCategories: updated });
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await superAdminApi.sendBroadcast(broadcastForm);
      if (res.success) {
        alert('Platform announcement broadcasted successfully');
        setBroadcastForm({ title: '', message: '', targetAudience: 'All Gyms', specificPlanId: '', selectedGyms: [], intensity: 'Normal' });
        await fetchData();
      }
    } catch (err) {
      alert(err.message || 'Failed to send broadcast');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteBroadcast = (id) => {
    setDeleteBroadcastId(id);
  };

  const handleConfirmDeleteBroadcast = async () => {
    if (!deleteBroadcastId) return;
    setActionLoading(true);
    try {
      const res = await superAdminApi.deleteBroadcast(deleteBroadcastId);
      if (res.success) {
        alert('Broadcast deleted successfully');
        setDeleteBroadcastId(null);
        await fetchData();
      }
    } catch (err) {
      alert(err.message || 'Failed to delete broadcast');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendBroadcast = (b) => {
    setBroadcastForm({
      title: b.title || '',
      message: b.message || '',
      targetAudience: b.targetAudience || 'All Gyms',
      specificPlanId: '',
      selectedGyms: [],
      intensity: b.intensity || 'Normal'
    });
  };

  // Helper features check/uncheck for plan form
  const handleFeatureToggle = (feature) => {
    const currentFeatures = planForm.features;
    if (currentFeatures.includes(feature)) {
      setPlanForm({ ...planForm, features: currentFeatures.filter(f => f !== feature) });
    } else {
      setPlanForm({ ...planForm, features: [...currentFeatures, feature] });
    }
  };

  // Filter gym owners locally
  const filteredOwners = owners.filter(o => {
    const q = gymSearch.toLowerCase();
    const matchSearch =
      (o.name || '').toLowerCase().includes(q) ||
      (o.gymName || '').toLowerCase().includes(q) ||
      (o.email || '').toLowerCase().includes(q) ||
      (o.phone || '').toLowerCase().includes(q);

    const matchStatus = gymStatusFilter === '' ||
      (gymStatusFilter === 'Active' && o.isActive) ||
      (gymStatusFilter === 'Suspended' && !o.isActive);

    const matchPlan = gymPlanFilter === '' || o.subscriptionPlan?._id === gymPlanFilter;
    const matchSub = gymSubFilter === '' || o.subscriptionStatus === gymSubFilter;

    return matchSearch && matchStatus && matchPlan && matchSub;
  });

  // Filter subscriptions list
  const filteredSubs = (subscriptions.list || []).filter(sub => {
    const q = subSearch.toLowerCase();
    const matchSearch =
      (sub.name || '').toLowerCase().includes(q) ||
      (sub.gymName || '').toLowerCase().includes(q) ||
      (sub.email || '').toLowerCase().includes(q);

    const matchStatus = subStatusFilter === '' || sub.subscriptionStatus === subStatusFilter;

    return matchSearch && matchStatus;
  });

  // Filter transactions list
  const filteredTransactions = (transactionsData.list || []).filter(tx => {
    const q = transactionSearch.toLowerCase();
    const matchSearch =
      (tx.gymName || '').toLowerCase().includes(q) ||
      (tx.planName || '').toLowerCase().includes(q) ||
      (tx.razorpayPaymentId || '').toLowerCase().includes(q) ||
      (tx.razorpayOrderId || '').toLowerCase().includes(q) ||
      (tx.gymOwner?.name || '').toLowerCase().includes(q) ||
      (tx.gymOwner?.email || '').toLowerCase().includes(q);

    const matchStatus = transactionStatusFilter === '' || tx.status === transactionStatusFilter;

    return matchSearch && matchStatus;
  });

  const getFilteredTrendData = () => {
    const monthlyTrend = stats?.trends?.revenueTrend || [];
    if (trendFilter === 'monthly') {
      return monthlyTrend.slice(-3);
    }
    
    // Weekly Filter: split each of the last 3 months into 4 weeks with organic variance
    const last3Months = monthlyTrend.slice(-3);
    const weeklyData = [];
    
    last3Months.forEach((monthData) => {
      const parts = monthData.label.split(/[\s,]+/);
      const monthName = parts[0] || "Month";
      
      const monthlyVal = monthData.value || 0;
      const baseVal = Math.floor(monthlyVal / 4);
      
      const factors = [0.9, 1.05, 1.15, 0.9];
      let runningSum = 0;
      const weekVals = factors.map((f, idx) => {
        if (idx === 3) {
          return monthlyVal - runningSum;
        }
        const val = Math.floor(baseVal * f);
        runningSum += val;
        return val;
      });
      
      weekVals.forEach((val, wIdx) => {
        weeklyData.push({
          label: `${monthName} W${wIdx + 1}`,
          value: val
        });
      });
    });
    
    return weeklyData;
  };

  if (authLoading || initialLoading) {
    return (
      <div className="min-h-screen bg-[#070708] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-[3px] border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#e4e4e7] flex">
      {/* Solaris-style Left Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-[#09090b] flex flex-col p-5 shrink-0 h-screen sticky top-0">
        {/* Logo and Back Arrow */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/10 text-white font-extrabold text-lg">
              {(settingsData?.settings?.appName || 'goJim')[0]?.toUpperCase()}
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-white">
                {settingsData?.settings?.appName || 'goJim'}
              </span>
              <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-black">
                {settingsData?.settings?.appName || 'goJim'} Admin
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar Tabs */}
        <div className="space-y-1.5 flex-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <Sliders size={15} /> },
            { id: 'gyms', label: 'Gym Hub', icon: <Building2 size={15} />, count: owners.length },
            { id: 'plans', label: 'Plans & Billing', icon: <IndianRupee size={15} /> },
            { id: 'categories', label: 'Categories', icon: <Tags size={15} /> },
            { id: 'settings', label: 'Platform Settings', icon: <Settings size={15} /> }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-left text-xs font-bold transition-all cursor-pointer border
                ${activeTab === item.id
                  ? 'bg-white/10 text-white border-white/10 shadow-sm'
                  : 'bg-transparent text-zinc-400 border-transparent hover:bg-white/5 hover:text-white'}`}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.count !== undefined && (
                <span className="text-[9px] bg-white/10 text-white px-1.5 py-0.5 rounded font-black">{item.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Sidebar Footer with Logout Button */}
        <div className="mt-auto pt-6 border-t border-white/5">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-left text-xs font-bold transition-all cursor-pointer border border-red-500/10 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            title="Logout System Session"
          >
            <Power size={15} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#09090b] text-text-primary">
        {/* Top Header */}
        <nav className="border-b border-white/5 px-8 py-4 flex items-center justify-between bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-[60]">
          {/* Spacer */}
          <div />

          {/* Header Actions */}
          <div className="flex items-center gap-4.5">
            {/* Global Search Button */}
            <button
              onClick={() => {
                setIsSearchOpen(!isSearchOpen);
                if (!isSearchOpen) setSearchQuery('');
              }}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 outline-none ring-0 cursor-pointer ${isSearchOpen
                ? 'bg-accent text-black shadow-lg shadow-accent/20'
                : 'text-gray-400 hover:bg-white/5'
                }`}
              title="Search Platform Control"
            >
              <Search size={20} />
            </button>

            <button
              onClick={() => setCreateGymOpen(true)}
              className="w-11 h-11 rounded-full flex items-center justify-center transition-all focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 outline-none ring-0 cursor-pointer text-gray-400 hover:bg-white/5"
              title="Register Gym Owner"
            >
              <Plus size={20} />
            </button>

            <button
              className="w-11 h-11 rounded-full flex items-center justify-center transition-all focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 outline-none ring-0 cursor-pointer text-gray-400 hover:bg-white/5 relative"
              title="Announcements"
            >
              <Bell size={20} />
              <span className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-accent" />
            </button>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 p-8 overflow-y-auto space-y-8 max-w-7xl w-full mx-auto">
          {error && (
            <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs flex items-center gap-2">
              <ShieldAlert size={16} /> {error}
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 1: DASHBOARD VIEW                                */}
          {/* ==================================================== */}
          {activeTab === 'dashboard' && stats && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Heading Section */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-white tracking-tight">Welcome back, {user?.name ? user.name.split(' ')[0] : 'Admin'}!</h2>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                    {(settingsData?.settings?.appName || 'goJim')} platform diagnostics
                  </p>
                </div>
                <div className="flex gap-2.5">
                  <button
                    onClick={() => setCreateGymOpen(true)}
                    className="flex items-center gap-2 py-2 px-4 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-bold transition-all cursor-pointer"
                  >
                    <Plus size={14} /> Add Gym
                  </button>
                  <button
                    onClick={() => setCreatePlanOpen(true)}
                    className="flex items-center gap-2 py-2 px-4 rounded-lg border border-white/10 bg-[#121214] text-white hover:bg-white/5 text-xs font-bold transition-all cursor-pointer"
                  >
                    <PlusCircle size={14} /> Create Plan
                  </button>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { label: 'Active Gyms', val: stats.kpis?.activeGyms, desc: 'Active platform tenants', icon: <Building2 size={16} className="text-zinc-400" /> },
                  { label: 'Trial Gyms', val: stats.kpis?.trialGyms, desc: 'Evaluation accounts', icon: <Activity size={16} className="text-zinc-400" /> },
                  { label: 'Total Registered', val: stats.kpis?.totalGyms, desc: 'Registered Gym Owners', icon: <Users size={16} className="text-zinc-400" /> },
                  { label: 'Monthly Revenue', val: `₹${(stats.kpis?.monthlyRevenue || 0).toLocaleString()}`, desc: 'Aggregated platform MRR', icon: <IndianRupee size={16} className="text-zinc-400" /> }
                ].map((kpi, idx) => (
                  <div key={idx} className="bg-[#121214] border border-white/5 p-5 rounded-xl flex items-center justify-between group hover:border-white/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center">
                        {kpi.icon}
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{kpi.label}</span>
                        <span className="block text-xl font-extrabold text-white mt-0.5">{kpi.val}</span>
                      </div>
                    </div>
                    <button className="text-zinc-600 hover:text-zinc-400 transition-all">
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Sales Chart */}
                <div className="bg-[#121214] border border-white/5 p-6 rounded-2xl space-y-4 lg:col-span-3 shadow-sm text-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Revenue Trend</span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-extrabold text-zinc-100">₹{(stats.kpis?.monthlyRevenue || 0).toLocaleString()}</span>
                        <span className="text-[10px] font-black text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          5.3% ↑
                        </span>
                      </div>
                    </div>
                    <div className="relative w-24 !w-24">
                      <button
                        type="button"
                        onClick={() => setIsTrendDropdownOpen(!isTrendDropdownOpen)}
                        className="w-full flex items-center justify-between bg-bg-input border border-border hover:border-border-hover rounded-xl px-3 py-2.5 text-xs text-text-primary outline-none focus:border-accent transition-all cursor-pointer text-left font-medium animate-fade-in"
                      >
                        <span className="capitalize">{trendFilter}</span>
                        <ChevronDown size={14} className={`text-zinc-400 transition-transform duration-300 ${isTrendDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isTrendDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-[130]" onClick={() => setIsTrendDropdownOpen(false)} />
                          <div className="absolute top-full right-0 w-28 mt-1.5 z-[140] bg-bg-secondary border border-border rounded-xl shadow-2xl p-1 space-y-0.5 no-scrollbar dropdown-options-list animate-fade-in">
                            {[
                              { value: 'weekly', label: 'Weekly' },
                              { value: 'monthly', label: 'Monthly' }
                            ].map(opt => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  setTrendFilter(opt.value);
                                  setIsTrendDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-all hover:bg-white/5 hover:text-white cursor-pointer ${
                                  trendFilter === opt.value
                                    ? 'bg-white/10 text-white font-extrabold'
                                    : 'text-zinc-400 font-medium'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="pt-2">
                    <SVGLineChart 
                      data={getFilteredTrendData()} 
                      transactions={transactionsData.list}
                      color="#8ccc5c" 
                      valuePrefix="₹" 
                      id="revenue" 
                    />
                  </div>
                </div>

                {/* Recent Projects / Signups */}
                <div className="bg-[#121214] border border-white/5 p-6 rounded-xl space-y-4 lg:col-span-2 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">Recent Gym Signups</h3>
                    <button
                      onClick={() => handleTabChange('gyms')}
                      className="text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-wider transition-all cursor-pointer"
                    >
                      View all
                    </button>
                  </div>
                  <div className="overflow-x-auto flex-1 mt-4">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="text-zinc-500 border-b border-white/5 text-[9px] uppercase tracking-wider font-extrabold pb-2">
                          <th className="py-2.5">Gym Hub</th>
                          <th className="py-2.5">Owner</th>
                          <th className="py-2.5 text-center">Status</th>
                          <th className="py-2.5 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {stats.attentionRequired?.recentRegistrations?.slice(0, 5).map(owner => (
                          <tr key={owner._id} className="hover:bg-white/2 transition-all">
                            <td className="py-3 font-bold text-white flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-[10px]">
                                🏢
                              </div>
                              <span className="truncate max-w-[120px]" title={owner.gymName}>{owner.gymName}</span>
                            </td>
                            <td className="py-3 text-zinc-400 truncate max-w-[100px]" title={owner.name}>{owner.name}</td>
                            <td className="py-3 text-center">
                              <span className={`inline-flex items-center gap-1 text-[8px] font-black uppercase px-2 py-0.5 rounded border
                                ${owner.subscriptionStatus === 'Active' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                                  owner.subscriptionStatus === 'Trial' ? 'bg-zinc-500/10 border-zinc-500/20 text-zinc-300' :
                                    'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                {owner.subscriptionStatus === 'Active' ? '✓' : '•'} {owner.subscriptionStatus}
                              </span>
                            </td>
                            <td className="py-3 text-right text-zinc-500 text-[10px]">
                              {formatDate(owner.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Recent Platform Transactions */}
              <div className="bg-[#121214] border border-white/5 p-6 rounded-xl space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Recent Subscription Transactions</h3>
                  <button
                    onClick={() => {
                      setActiveTab('plans');
                      setPlansTab('transactions');
                    }}
                    className="text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-wider transition-all cursor-pointer"
                  >
                    View all transactions
                  </button>
                </div>
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-zinc-500 border-b border-white/5 text-[9px] uppercase tracking-wider font-extrabold pb-2">
                        <th className="py-2.5 pl-2">Gym / Owner</th>
                        <th className="py-2.5">Plan Tier</th>
                        <th className="py-2.5">Amount</th>
                        <th className="py-2.5">Payment Method</th>
                        <th className="py-2.5 text-center">Status</th>
                        <th className="py-2.5 text-right pr-2">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {stats.recentTransactions && stats.recentTransactions.length > 0 ? (
                        stats.recentTransactions.map(tx => (
                          <tr key={tx._id} className="hover:bg-white/2 transition-all">
                            <td className="py-3 pl-2">
                              <span className="block font-bold text-white">{tx.gymName}</span>
                              <span className="block text-[9.5px] text-zinc-500">{tx.gymOwner?.name || 'N/A'}</span>
                            </td>
                            <td className="py-3 font-semibold text-zinc-300">
                              {tx.planName} <span className="text-[9px] text-zinc-500 uppercase">({tx.billingCycle})</span>
                            </td>
                            <td className="py-3 font-bold text-[#b8f175]">₹{tx.amount.toLocaleString()}</td>
                            <td className="py-3 text-zinc-400 capitalize">{tx.paymentMethod}</td>
                            <td className="py-3 text-center">
                              <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase px-2 py-0.5 rounded border bg-green-500/10 border-green-500/20 text-green-400">
                                {tx.status}
                              </span>
                            </td>
                            <td className="py-3 text-right text-zinc-500 text-[10px] pr-2">
                              {formatDate(tx.transactionDate)} {formatTime(tx.transactionDate)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-zinc-600 italic">No transactions recorded yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Attention Required Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Attention Required Logs</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {stats.attentionRequired?.expiring7Days?.slice(0, 4).map(owner => (
                    <div key={owner._id} className="bg-[#121214] border border-white/5 p-4 rounded-xl flex items-center justify-between group hover:border-amber-500/20 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 text-xs">
                          ⚠️
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-white truncate max-w-[110px]" title={owner.gymName}>{owner.gymName}</span>
                          <span className="block text-[8px] font-black text-amber-500 uppercase tracking-widest mt-0.5">Expiring Soon</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewGym(owner._id)}
                        className="p-1 rounded bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:border-white/10 transition-all cursor-pointer"
                        title="Manage License"
                      >
                        <ArrowUpRight size={12} />
                      </button>
                    </div>
                  ))}

                  {stats.attentionRequired?.recentlySuspended?.slice(0, 4).map(owner => (
                    <div key={owner._id} className="bg-[#121214] border border-white/5 p-4 rounded-xl flex items-center justify-between group hover:border-red-500/20 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 text-xs">
                          🔒
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-white truncate max-w-[110px]" title={owner.gymName}>{owner.gymName}</span>
                          <span className="block text-[8px] font-black text-red-500 uppercase tracking-widest mt-0.5">Suspended</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewGym(owner._id)}
                        className="p-1 rounded bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:border-white/10 transition-all cursor-pointer"
                        title="Reactivate"
                      >
                        <ArrowUpRight size={12} />
                      </button>
                    </div>
                  ))}

                  {/* Pad with default empty states if no alerts to match 4 cards layout */}
                  {(!stats.attentionRequired?.expiring7Days?.length && !stats.attentionRequired?.recentlySuspended?.length) && (
                    <div className="col-span-4 bg-[#121214] border border-white/5 p-8 rounded-xl text-center text-xs text-zinc-500 italic">
                      All system tenants are in healthy active status. No urgent actions required.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 2: GYMS VIEW                                     */}
          {/* ==================================================== */}
          {activeTab === 'gyms' && (
            <div className="space-y-8 animate-in fade-in duration-300">

              {/* Toolbar & Filters */}
              <div className="bg-[#121214] border border-white/5 p-6 rounded-xl flex flex-col gap-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-extrabold text-white uppercase tracking-wider">Gym Owner Registry</h2>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Manage licenses, view live system logs, and impersonate owner accounts</p>
                  </div>
                  <button
                    onClick={() => setCreateGymOpen(true)}
                    className="flex items-center gap-2 py-2 px-4 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-bold transition-all cursor-pointer"
                  >
                    <Plus size={14} /> Create Gym Owner
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Search name / gym / email"
                      value={gymSearch || ''}
                      onChange={e => setGymSearch(e.target.value)}
                      className="w-full bg-[#18181b] border border-white/5 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:border-white/20 outline-none transition-all"
                    />
                  </div>

                  <div className="relative animate-fade-in">
                    <button
                      type="button"
                      onClick={() => setIsGymStatusDropdownOpen(!isGymStatusDropdownOpen)}
                      className="w-full flex items-center justify-between bg-bg-input border border-border hover:border-border-hover rounded-xl px-3 py-2.5 text-xs text-text-primary outline-none focus:border-accent transition-all cursor-pointer text-left font-medium"
                    >
                      <span>
                        {gymStatusFilter === '' ? 'All Account Status' : gymStatusFilter}
                      </span>
                      <ChevronDown size={14} className={`text-zinc-400 transition-transform duration-300 ${isGymStatusDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isGymStatusDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-[130]" onClick={() => setIsGymStatusDropdownOpen(false)} />
                        <div className="absolute top-full left-0 right-0 mt-1.5 z-[140] bg-bg-secondary border border-border rounded-xl shadow-2xl p-1 space-y-0.5 no-scrollbar dropdown-options-list">
                          {[
                            { value: '', label: 'All Account Status' },
                            { value: 'Active', label: 'Active' },
                            { value: 'Suspended', label: 'Suspended' }
                          ].map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setGymStatusFilter(opt.value);
                                setIsGymStatusDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-all hover:bg-white/5 hover:text-white cursor-pointer ${
                                gymStatusFilter === opt.value
                                  ? 'bg-white/10 text-white font-extrabold'
                                  : 'text-zinc-400 font-medium'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="relative animate-fade-in">
                    <button
                      type="button"
                      onClick={() => setIsGymPlanDropdownOpen(!isGymPlanDropdownOpen)}
                      className="w-full flex items-center justify-between bg-bg-input border border-border hover:border-border-hover rounded-xl px-3 py-2.5 text-xs text-text-primary outline-none focus:border-accent transition-all cursor-pointer text-left font-medium"
                    >
                      <span>
                        {gymPlanFilter === '' ? 'All Plans' : (plans.find(p => p._id === gymPlanFilter)?.name || 'All Plans')}
                      </span>
                      <ChevronDown size={14} className={`text-zinc-400 transition-transform duration-300 ${isGymPlanDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isGymPlanDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-[130]" onClick={() => setIsGymPlanDropdownOpen(false)} />
                        <div className="absolute top-full left-0 right-0 mt-1.5 z-[140] bg-bg-secondary border border-border rounded-xl shadow-2xl p-1 space-y-0.5 no-scrollbar dropdown-options-list">
                          <button
                            type="button"
                            onClick={() => {
                              setGymPlanFilter('');
                              setIsGymPlanDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-all hover:bg-white/5 hover:text-white cursor-pointer ${
                              gymPlanFilter === ''
                                ? 'bg-white/10 text-white font-extrabold'
                                : 'text-zinc-400 font-medium'
                            }`}
                          >
                            All Plans
                          </button>
                          {plans.map(p => (
                            <button
                              key={p._id}
                              type="button"
                              onClick={() => {
                                setGymPlanFilter(p._id);
                                setIsGymPlanDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-all hover:bg-white/5 hover:text-white cursor-pointer ${
                                gymPlanFilter === p._id
                                  ? 'bg-white/10 text-white font-extrabold'
                                  : 'text-zinc-400 font-medium'
                              }`}
                            >
                              {p.name}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="relative animate-fade-in">
                    <button
                      type="button"
                      onClick={() => setIsGymSubDropdownOpen(!isGymSubDropdownOpen)}
                      className="w-full flex items-center justify-between bg-bg-input border border-border hover:border-border-hover rounded-xl px-3 py-2.5 text-xs text-text-primary outline-none focus:border-accent transition-all cursor-pointer text-left font-medium"
                    >
                      <span>
                        {gymSubFilter === '' ? 'All Subscription Status' : gymSubFilter}
                      </span>
                      <ChevronDown size={14} className={`text-zinc-400 transition-transform duration-300 ${isGymSubDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isGymSubDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-[130]" onClick={() => setIsGymSubDropdownOpen(false)} />
                        <div className="absolute top-full left-0 right-0 mt-1.5 z-[140] bg-bg-secondary border border-border rounded-xl shadow-2xl p-1 space-y-0.5 no-scrollbar dropdown-options-list">
                          {[
                            { value: '', label: 'All Subscription Status' },
                            { value: 'Active', label: 'Active' },
                            { value: 'Trial', label: 'Trial' },
                            { value: 'Expired', label: 'Expired' },
                            { value: 'Suspended', label: 'Suspended' }
                          ].map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setGymSubFilter(opt.value);
                                setIsGymSubDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-all hover:bg-white/5 hover:text-white cursor-pointer ${
                                gymSubFilter === opt.value
                                  ? 'bg-white/10 text-white font-extrabold'
                                  : 'text-zinc-400 font-medium'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Gym Owners Registry Table */}
              <div className="bg-[#121214] border border-white/5 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-zinc-500 border-b border-white/5 text-[9px] uppercase tracking-wider font-extrabold bg-white/2">
                        <th className="py-3.5 pl-5">Gym</th>
                        <th className="py-3.5">Owner</th>
                        <th className="py-3.5">Contact</th>
                        <th className="py-3.5">Plan</th>
                        <th className="py-3.5 text-center">License Status</th>
                        <th className="py-3.5">Expiry Date</th>
                        <th className="py-3.5 pr-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredOwners.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center py-10 text-zinc-500 italic">
                            No gym owner records matched your search parameters.
                          </td>
                        </tr>
                      ) : (
                        filteredOwners.map((owner) => (
                          <tr 
                            key={owner._id} 
                            className="hover:bg-white/1 transition-all cursor-pointer"
                            onClick={() => handleViewGym(owner._id)}
                          >
                            <td className="py-4 pl-5">
                              <p className="font-bold text-white text-[13px]">{owner.gymName || 'N/A'}</p>
                            </td>
                            <td className="py-4 text-zinc-300 font-medium">{owner.name}</td>
                            <td className="py-4">
                              <p className="text-zinc-300">{owner.email}</p>
                              {owner.phone && <p className="text-[9px] text-zinc-500 mt-0.5">{owner.phone}</p>}
                              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-zinc-400 font-mono">
                                <span className="text-zinc-500">Pass:</span>
                                <span className="text-zinc-300">
                                  {visiblePasswords[owner._id] ? (owner.plainPassword || (owner.password && !owner.password.startsWith('$2') ? owner.password : '••••••••')) : '••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePasswordVisibility(owner._id);
                                  }}
                                  className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-0.5"
                                  title={visiblePasswords[owner._id] ? "Hide Password" : "Show Password"}
                                >
                                  {visiblePasswords[owner._id] ? <EyeOff size={11} /> : <Eye size={11} />}
                                </button>
                              </div>
                            </td>
                            <td className="py-4 font-bold text-zinc-300">
                              {owner.subscriptionPlan?.name || 'Silver Plan'}{owner.billingCycle === 'yearly' ? ' -Y' : ''}
                            </td>
                            <td className="py-4 text-center">
                              <span className={`inline-flex items-center gap-1.5 font-bold text-[9px] uppercase
                                ${owner.subscriptionStatus === 'Active' ? 'text-green-400' :
                                  owner.subscriptionStatus === 'Trial' ? 'text-zinc-300' :
                                    owner.subscriptionStatus === 'Expired' ? 'text-red-400' :
                                      'text-amber-400'}`}>
                                {owner.isLoggedIn && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                )}
                                {owner.subscriptionStatus}
                              </span>
                            </td>
                            <td className="py-4 text-[10px]">
                              {(() => {
                                let expiryDate = null;
                                if (owner.subscriptionStatus === 'Trial') {
                                  expiryDate = owner.subscriptionTrialEnds || (owner.createdAt ? new Date(new Date(owner.createdAt).getTime() + 14 * 24 * 60 * 60 * 1000) : null);
                                } else {
                                  expiryDate = owner.subscriptionEnd || (owner.createdAt ? new Date(new Date(owner.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000) : null);
                                }

                                if (!expiryDate) return <span className="text-zinc-500">N/A</span>;

                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const colorClass = 'text-white';
                                return <span className={colorClass}>{formatDate(expiryDate)}</span>;
                              })()}
                            </td>
                            <td className="py-4 pr-5 text-right">
                              <div className="inline-flex gap-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditGym(owner);
                                  }}
                                  className="p-1.5 rounded border border-white/5 bg-[#18181b] text-zinc-400 hover:text-white hover:border-white/10 transition-all cursor-pointer"
                                  title="Edit Owner Details"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setChangePasswordGym(owner);
                                    setNewPassword('');
                                    setShowNewPassword(false);
                                  }}
                                  className="p-1.5 rounded border border-white/5 bg-[#18181b] text-zinc-400 hover:text-white hover:border-white/10 transition-all cursor-pointer"
                                  title="Change Gym Password"
                                >
                                  <Lock size={12} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleStatus(owner._id);
                                  }}
                                  className={`p-1.5 rounded border transition-all cursor-pointer ${owner.isActive
                                    ? 'bg-red-500/5 border-red-500/10 text-red-400 hover:bg-red-500/15'
                                    : 'bg-green-500/5 border-green-500/10 text-green-400 hover:bg-green-500/15'
                                    }`}
                                  title={owner.isActive ? 'Suspend Gym License' : 'Reactivate Gym License'}
                                >
                                  <Power size={12} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleImpersonate(owner._id);
                                  }}
                                  className="p-1.5 rounded border border-white/5 bg-[#18181b] text-zinc-400 hover:text-white hover:border-white/10 transition-all cursor-pointer"
                                  title="Login As Gym (Impersonate)"
                                >
                                  <ExternalLink size={12} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteOwnerId(owner._id);
                                  }}
                                  className="p-1.5 rounded border border-red-500/10 bg-red-500/5 text-red-400 hover:bg-red-500/25 transition-all cursor-pointer"
                                  title="Delete Tenant Database"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 3: PLANS & BILLING                               */}
          {/* ==================================================== */}
          {activeTab === 'plans' && (
            <div className="space-y-8 animate-in fade-in duration-300">

              {/* Subtabs for Plans & Billing */}
              <div className="flex bg-[#121214] rounded-lg p-1 border border-white/5 self-start inline-flex">
                <button
                  onClick={() => setPlansTab('plansList')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${plansTab === 'plansList' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
                >
                  Plans
                </button>
                <button
                  onClick={() => setPlansTab('subscriptions')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${plansTab === 'subscriptions' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
                >
                  Subscriptions Registry
                </button>
                <button
                  onClick={() => setPlansTab('transactions')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${plansTab === 'transactions' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
                >
                  Transaction Logs
                </button>
              </div>

              {/* Tab 1: Subscription Plans Management */}
              {plansTab === 'plansList' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-base font-extrabold text-white uppercase tracking-wider">Subscription Tiers</h2>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Configure core billing levels, trial lengths, and resource thresholds</p>
                    </div>
                    <button
                      onClick={() => {
                        setPlanForm({ name: '', monthlyPrice: 0, yearlyPrice: 0, maxClients: 100, maxTrainers: 10, maxStaff: 10, trialDays: 14, description: '', features: ['Leads Module', 'Equipment Module', 'Attendance Module', 'Payments Module', 'Trainer Module', 'Staff Module'], status: 'Active' });
                        setCreatePlanOpen(true);
                      }}
                      className="flex items-center gap-2 py-2 px-4 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-bold transition-all cursor-pointer"
                    >
                      <Plus size={14} /> Create a plan
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.map(plan => (
                      <div key={plan._id} className={`bg-[#121214] border rounded-xl p-6 relative flex flex-col min-h-[380px] overflow-hidden ${plan.status === 'Active' ? 'border-white/5' : 'border-red-500/20 opacity-60'}`}>
                        <div className="mb-4">
                          <div className="flex justify-between items-start">
                            <h3 className="text-sm font-extrabold text-white">{plan.name}</h3>
                            <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border
                              ${plan.status === 'Active' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                              {plan.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-1 min-h-[30px]">{plan.description || 'No plan description provided.'}</p>
                        </div>

                        <div className="my-3 border-y border-white/5 py-4">
                          <p className="text-2xl font-extrabold text-white">
                            ₹{plan.monthlyPrice.toLocaleString()}
                            <span className="text-xs font-normal text-zinc-500"> / month</span>
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-1 font-medium">
                            ₹{plan.yearlyPrice.toLocaleString()} / year billing cycle
                          </p>
                        </div>

                        <div className="space-y-2.5 my-3 flex-1 text-xs">
                          <p className="text-zinc-400 flex justify-between font-medium">
                            <span>Max Clients Limit:</span>
                            <span className="text-white font-bold">{plan.maxClients}</span>
                          </p>
                          <p className="text-zinc-400 flex justify-between font-medium">
                            <span>Max Trainers Limit:</span>
                            <span className="text-white font-bold">{plan.maxTrainers}</span>
                          </p>
                          <p className="text-zinc-400 flex justify-between font-medium">
                            <span>Max Staff Limit:</span>
                            <span className="text-white font-bold">{plan.maxStaff}</span>
                          </p>
                          <p className="text-zinc-400 flex justify-between font-medium">
                            <span>Standard Trial Period:</span>
                            <span className="text-[#b8f175] font-bold">{plan.trialDays} Days</span>
                          </p>

                          <div className="pt-3">
                            <span className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-500">Enabled Features</span>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {plan.features?.map((f, idx) => (
                                <span key={idx} className="bg-[#18181b] border border-white/5 text-zinc-300 text-[8px] font-bold px-2 py-0.5 rounded">
                                  {f}
                                </span>
                              )) || <span className="text-zinc-500 italic text-[10px]">No features linked</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-6 pt-4 border-t border-white/5">
                          <button
                            onClick={() => handleOpenEditPlan(plan)}
                            className="flex-1 py-2 rounded-lg bg-[#18181b] border border-white/5 hover:bg-white/5 text-xs font-bold text-white transition-all cursor-pointer"
                          >
                            Edit Config
                          </button>
                          <button
                            onClick={() => handleTogglePlanStatus(plan)}
                            className={`px-3 py-2 rounded-lg border transition-all cursor-pointer ${plan.status === 'Active' ? 'bg-red-500/5 border-red-500/10 text-red-400 hover:bg-red-500/15' : 'bg-green-500/5 border-green-500/10 text-green-400 hover:bg-green-500/15'}`}
                          >
                            <Power size={13} />
                          </button>
                          <button
                            onClick={() => setDeletePlanId(plan._id)}
                            className="px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/10 text-red-400 hover:bg-red-500/25 transition-all cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 2: Subscriptions Registry & Metrics */}
              {plansTab === 'subscriptions' && subscriptions && (
                <div className="space-y-6">

                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Active Subs', val: subscriptions.summary?.activeSubs, desc: 'Paying tenants', color: 'border-white/5 text-white bg-[#121214]' },
                      { label: 'Trial Subs', val: subscriptions.summary?.trialSubs, desc: 'Free trial users', color: 'border-white/5 text-white bg-[#121214]' },
                      { label: 'Expired Subs', val: subscriptions.summary?.expiredSubs, desc: 'Lapsed access', color: 'border-white/5 text-white bg-[#121214]' },
                      { label: 'Recurring Revenue', val: `₹${(subscriptions.summary?.mrr || 0).toLocaleString()}`, desc: 'Aggregated monthly', color: 'border-white/5 text-[#b8f175] bg-[#121214]' }
                    ].map((card, idx) => (
                      <div key={idx} className={`border p-4.5 rounded-xl ${card.color}`}>
                        <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mb-1">{card.label}</p>
                        <p className="text-xl font-extrabold text-white">{card.val}</p>
                        <p className="text-[9px] text-zinc-500 mt-1 font-medium">{card.desc}</p>
                      </div>
                    ))}
                  </div>

                  {/* Subscriptions registry list */}
                  <div className="bg-[#121214] border border-white/5 p-6 rounded-xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <h3 className="text-xs font-black text-white uppercase tracking-wider">Gym Subscription Registry</h3>
                      <div className="flex gap-2">
                        <div className="relative">
                          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                          <input
                            type="text"
                            placeholder="Filter by gym name..."
                            value={subSearch || ''}
                            onChange={e => setSubSearch(e.target.value)}
                            className="bg-[#18181b] border border-white/5 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-white/20 outline-none"
                          />
                        </div>
                        <select
                          value={subStatusFilter || ''}
                          onChange={e => setSubStatusFilter(e.target.value)}
                          className="bg-bg-input border border-border hover:border-border-hover rounded-xl px-3 py-2.5 text-xs text-text-primary outline-none focus:border-accent transition-all cursor-pointer"
                        >
                          <option value="" className="bg-bg-secondary text-text-primary">All Status</option>
                          <option value="Active" className="bg-bg-secondary text-text-primary">Active</option>
                          <option value="Trial" className="bg-bg-secondary text-text-primary">Trial</option>
                          <option value="Expired" className="bg-bg-secondary text-text-primary">Expired</option>
                          <option value="Suspended" className="bg-bg-secondary text-text-primary">Suspended</option>
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="text-zinc-500 border-b border-white/5 text-[9px] uppercase tracking-wider font-extrabold bg-white/2">
                            <th className="py-3.5 pl-4">Gym Details</th>
                            <th className="py-3.5">Plan Tier</th>
                            <th className="py-3.5">Subscription Start</th>
                            <th className="py-3.5">Subscription Expiry</th>
                            <th className="py-3.5 text-center">Status</th>
                            <th className="py-3.5">Renewal Amount</th>
                            <th className="py-3.5 pr-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredSubs.length === 0 ? (
                            <tr>
                              <td colSpan="7" className="text-center py-8 text-zinc-500 italic">No subscriptions matched features.</td>
                            </tr>
                          ) : (
                            filteredSubs.map(sub => (
                              <tr key={sub._id} className="hover:bg-white/1">
                                <td className="py-3.5 pl-4 font-bold text-white">{sub.gymName}</td>
                                <td className="py-3.5 text-[#b8f175] font-bold">{sub.subscriptionPlan?.name || 'Silver Plan'}{sub.billingCycle === 'yearly' ? ' -Y' : ''}</td>
                                <td className="py-3.5 text-zinc-400">{formatDate(sub.subscriptionStart)}</td>
                                <td className="py-3.5 text-zinc-400">{formatDate(sub.subscriptionEnd)}</td>
                                <td className="py-3.5 text-center">
                                  <span className={`px-2.5 py-0.5 rounded text-[8px] font-bold uppercase border
                                    ${sub.subscriptionStatus === 'Active' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                                      sub.subscriptionStatus === 'Trial' ? 'bg-zinc-500/15 border-zinc-500/25 text-zinc-300' :
                                        'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                    {sub.subscriptionStatus}
                                  </span>
                                </td>
                                <td className="py-3.5 text-white font-extrabold">₹{(sub.subscriptionAmount || 0).toLocaleString()}</td>
                                <td className="py-3.5 pr-4 text-right">
                                  <div className="inline-flex gap-1.5">
                                    <button
                                      onClick={() => {
                                        setChangePlanId(sub._id);
                                        setChangePlanForm({ planId: sub.subscriptionPlan?._id || plans[0]?._id, billingCycle: sub.billingCycle || 'monthly', status: sub.subscriptionStatus });
                                      }}
                                      className="py-1.5 px-3 rounded border border-white/5 bg-[#18181b] text-[10px] font-bold text-white hover:text-[#b8f175] hover:border-white/10 transition-all cursor-pointer"
                                    >
                                      Change Plan
                                    </button>
                                    <button
                                      onClick={() => {
                                        setExtendTrialId(sub._id);
                                        setExtendDays(7);
                                      }}
                                      className="py-1.5 px-3 rounded border border-white/5 bg-[#18181b] text-[10px] font-bold text-white hover:text-[#b8f175] hover:border-white/10 transition-all cursor-pointer"
                                    >
                                      Extend Trial
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* Tab 3: Transaction Logs */}
              {plansTab === 'transactions' && transactionsData && (
                <div className="space-y-6">

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border p-4.5 rounded-xl border-white/5 text-white bg-[#121214]">
                      <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Total Transactions</p>
                      <p className="text-xl font-extrabold text-white">{transactionsData.summary?.totalCount || 0}</p>
                      <p className="text-[9px] text-zinc-500 mt-1 font-medium">All recorded renewals</p>
                    </div>
                    <div className="border p-4.5 rounded-xl border-white/5 text-[#b8f175] bg-[#121214]">
                      <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Cumulative Platform Revenue</p>
                      <p className="text-xl font-extrabold text-[#b8f175]">₹{(transactionsData.summary?.totalRevenue || 0).toLocaleString()}</p>
                      <p className="text-[9px] text-zinc-500 mt-1 font-medium">Gross software subscriptions revenue</p>
                    </div>
                  </div>

                  {/* Transactions table list */}
                  <div className="bg-[#121214] border border-white/5 p-6 rounded-xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <h3 className="text-xs font-black text-white uppercase tracking-wider">Platform Transactions Registry</h3>
                      <div className="flex gap-2">
                        <div className="relative">
                          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                          <input
                            type="text"
                            placeholder="Search by gym name, plan..."
                            value={transactionSearch || ''}
                            onChange={e => setTransactionSearch(e.target.value)}
                            className="bg-[#18181b] border border-white/5 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-white/20 outline-none"
                          />
                        </div>
                        <select
                          value={transactionStatusFilter || ''}
                          onChange={e => setTransactionStatusFilter(e.target.value)}
                          className="bg-bg-input border border-border hover:border-border-hover rounded-xl px-3 py-2.5 text-xs text-text-primary outline-none focus:border-accent transition-all cursor-pointer"
                        >
                          <option value="" className="bg-bg-secondary text-text-primary">All Status</option>
                          <option value="success" className="bg-bg-secondary text-text-primary">Success</option>
                          <option value="failed" className="bg-bg-secondary text-text-primary">Failed</option>
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="text-zinc-500 border-b border-white/5 text-[9px] uppercase tracking-wider font-extrabold bg-white/2">
                            <th className="py-3.5 pl-4">Gym & Owner</th>
                            <th className="py-3.5">Plan Tier</th>
                            <th className="py-3.5">Amount</th>
                            <th className="py-3.5">Payment Method</th>
                            <th className="py-3.5">Razorpay Order & Payment ID</th>
                            <th className="py-3.5 text-center">Status</th>
                            <th className="py-3.5 pr-4 text-right">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredTransactions.length === 0 ? (
                            <tr>
                              <td colSpan="7" className="text-center py-8 text-zinc-500 italic">No transactions found.</td>
                            </tr>
                          ) : (
                            filteredTransactions.map(tx => (
                              <tr key={tx._id} className="hover:bg-white/1">
                                <td className="py-3.5 pl-4">
                                  <span className="block font-bold text-white">{tx.gymName}</span>
                                  <span className="block text-[9.5px] text-zinc-500">{tx.gymOwner?.name || 'N/A'} ({tx.gymOwner?.email || 'N/A'})</span>
                                </td>
                                <td className="py-3.5 text-zinc-300 font-bold">
                                  {tx.planName} <span className="text-[9px] text-zinc-500 uppercase">({tx.billingCycle})</span>
                                </td>
                                <td className="py-3.5 text-[#b8f175] font-extrabold">₹{tx.amount.toLocaleString()}</td>
                                <td className="py-3.5 text-zinc-400 capitalize">{tx.paymentMethod}</td>
                                <td className="py-3.5 text-zinc-400 font-mono text-[10px]">
                                  {tx.razorpayPaymentId ? (
                                    <>
                                      <span className="block text-zinc-500">Pay: {tx.razorpayPaymentId}</span>
                                      <span className="block text-zinc-500">Ord: {tx.razorpayOrderId}</span>
                                    </>
                                  ) : 'N/A'}
                                </td>
                                <td className="py-3.5 text-center">
                                  <span className="px-2.5 py-0.5 rounded text-[8px] font-bold uppercase border bg-green-500/10 border-green-500/20 text-green-400">
                                    {tx.status}
                                  </span>
                                </td>
                                <td className="py-3.5 pr-4 text-right text-zinc-500">
                                  {formatDate(tx.transactionDate)} {formatTime(tx.transactionDate)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 4: PLATFORM SETTINGS                             */}
          {/* ==================================================== */}
          {activeTab === 'settings' && settingsData && (
            <div className="space-y-8 animate-in fade-in duration-300">

              {/* Settings Sub-navigation Tabs */}
              <div className="flex bg-[#121214] rounded-lg p-1 border border-white/5 overflow-x-auto">
                {[
                  { id: 'general', label: 'General Configuration' },
                  { id: 'broadcasts', label: 'Broadcasts Hub' },
                  { id: 'features', label: 'Feature Flags' },
                  { id: 'analytics', label: 'Dynamic Analytics' },
                  { id: 'auditLogs', label: 'Platform Audit Logs' }
                ].map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setSettingsTab(sub.id)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${settingsTab === sub.id ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>

              {/* Subtab 1: General Settings */}
              {settingsTab === 'general' && (
                <div className="bg-[#121214] border border-white/5 p-6 rounded-xl">
                  <h2 className="text-xs font-black text-white uppercase tracking-wider mb-6">General System Configuration</h2>
                  <form onSubmit={handleSaveGeneralSettings} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Application Name</label>
                        <input
                          type="text"
                          value={generalSettingsForm.appName || ''}
                          onChange={e => setGeneralSettingsForm({ ...generalSettingsForm, appName: e.target.value })}
                          className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Default Trial Days</label>
                        <input
                          type="number"
                          value={generalSettingsForm.defaultTrialDays || 14}
                          onChange={e => setGeneralSettingsForm({ ...generalSettingsForm, defaultTrialDays: Number(e.target.value) })}
                          className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Support Inbound Email</label>
                        <input
                          type="email"
                          value={generalSettingsForm.supportEmail || ''}
                          onChange={e => setGeneralSettingsForm({ ...generalSettingsForm, supportEmail: e.target.value })}
                          className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Support Contact Number</label>
                        <input
                          type="text"
                          pattern="[0-9]{10}"
                          maxLength={10}
                          onInvalid={e => e.target.setCustomValidity('Support contact number must be exactly 10 digits (no spaces, letters, or special characters).')}
                          onInput={e => e.target.setCustomValidity('')}
                          value={generalSettingsForm.supportPhone || ''}
                          onChange={e => setGeneralSettingsForm({ ...generalSettingsForm, supportPhone: cleanPhone(e.target.value) })}
                          className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-[#18181b] p-4 rounded-xl border border-white/5 mt-4">
                      <input
                        type="checkbox"
                        id="maintenanceMode"
                        checked={!!generalSettingsForm.maintenanceMode}
                        onChange={e => setGeneralSettingsForm({ ...generalSettingsForm, maintenanceMode: e.target.checked })}
                        className="rounded accent-white"
                      />
                      <div>
                        <label htmlFor="maintenanceMode" className="text-xs font-bold text-white uppercase tracking-wider cursor-pointer">Enable Platform Maintenance Mode</label>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Locks out operational dashboards for owners, trainers, and staff temporarily</p>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="flex items-center gap-2 py-2 px-4 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-bold transition-all cursor-pointer mt-4"
                    >
                      <Save size={14} /> {actionLoading ? 'Saving config...' : 'Save Configuration'}
                    </button>
                  </form>
                </div>
              )}

              {/* Subtab 2: Broadcasts Hub */}
              {settingsTab === 'broadcasts' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                  {/* Send announcement */}
                  <div className="bg-[#121214] border border-white/5 p-6 rounded-xl lg:col-span-1 h-fit">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider mb-5 flex items-center gap-2">
                      <Radio size={14} className="text-[#b8f175]" /> Dispatch Broadcast
                    </h3>
                    <form onSubmit={handleSendBroadcast} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Announcement Title</label>
                        <input
                          type="text"
                          value={broadcastForm.title || ''}
                          onChange={e => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                          className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none"
                          placeholder="Announcing v1.1 Kernel Updates..."
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Broadcasting message</label>
                        <textarea
                          rows="4"
                          value={broadcastForm.message || ''}
                          onChange={e => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                          className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none resize-none"
                          placeholder="We are upgrading systems this Sunday at 02:00 AM..."
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Target Audience</label>
                        <select
                          value={broadcastForm.targetAudience || 'All Gyms'}
                          onChange={e => setBroadcastForm({ ...broadcastForm, targetAudience: e.target.value })}
                          className="w-full bg-bg-input border border-border hover:border-border-hover rounded-xl px-3 py-2.5 text-xs text-text-primary outline-none focus:border-accent transition-all cursor-pointer"
                        >
                          <option value="All Gyms" className="bg-bg-secondary text-text-primary">All Gyms</option>
                          <option value="Specific Plan" className="bg-bg-secondary text-text-primary">Specific Subscription Tier</option>
                          <option value="Selected Gyms" className="bg-bg-secondary text-text-primary">Manual Gym Selection</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Broadcast Intensity</label>
                        <select
                          value={broadcastForm.intensity || 'Normal'}
                          onChange={e => setBroadcastForm({ ...broadcastForm, intensity: e.target.value })}
                          className="w-full bg-bg-input border border-border hover:border-border-hover rounded-xl px-3 py-2.5 text-xs text-text-primary outline-none focus:border-accent transition-all cursor-pointer"
                        >
                          <option value="Normal" className="bg-bg-secondary text-text-primary">Normal</option>
                          <option value="Warning" className="bg-bg-secondary text-text-primary">Warning</option>
                          <option value="Danger" className="bg-bg-secondary text-text-primary">Danger</option>
                        </select>
                      </div>

                      {(broadcastForm.targetAudience || 'All Gyms') === 'Specific Plan' && (
                        <div className="space-y-1.5">
                          <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Select Plan</label>
                          <select
                            value={broadcastForm.specificPlanId || ''}
                            onChange={e => setBroadcastForm({ ...broadcastForm, specificPlanId: e.target.value })}
                            className="w-full bg-bg-input border border-border hover:border-border-hover rounded-xl px-3 py-2.5 text-xs text-text-primary outline-none focus:border-accent transition-all cursor-pointer"
                            required
                          >
                            <option value="" className="bg-bg-secondary text-text-primary">Select Tier...</option>
                            {plans.map(p => (
                              <option key={p._id} value={p._id} className="bg-bg-secondary text-text-primary">{p.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {broadcastForm.targetAudience === 'Selected Gyms' && (
                        <div className="space-y-1.5">
                          <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Select Gyms (Recipients)</label>
                          <div className="bg-[#18181b] border border-white/5 rounded-lg p-3 max-h-[160px] overflow-y-auto space-y-2">
                            {owners.map(o => (
                              <div key={o._id} className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  id={`chk-br-${o._id}`}
                                  checked={broadcastForm.selectedGyms.includes(o._id)}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setBroadcastForm({ ...broadcastForm, selectedGyms: [...broadcastForm.selectedGyms, o._id] });
                                    } else {
                                      setBroadcastForm({ ...broadcastForm, selectedGyms: broadcastForm.selectedGyms.filter(id => id !== o._id) });
                                    }
                                  }}
                                  className="accent-white rounded"
                                />
                                <label htmlFor={`chk-br-${o._id}`} className="text-xs text-zinc-400 truncate cursor-pointer">{o.gymName}</label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="w-full py-2 text-xs font-bold rounded-lg bg-white text-black hover:bg-zinc-200 transition-all cursor-pointer"
                      >
                        {actionLoading ? 'Sending Announcement...' : 'Send Broadcast'}
                      </button>
                    </form>
                  </div>

                  {/* Broadcast history */}
                  <div className="bg-[#121214] border border-white/5 p-6 rounded-xl lg:col-span-2 space-y-4">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">Broadcast History</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="text-zinc-500 border-b border-white/5 text-[9px] uppercase tracking-wider font-extrabold bg-white/2">
                            <th className="py-3.5 pl-3">Announcement Title</th>
                            <th className="py-3.5">Date Sent</th>
                            <th className="py-3.5">Recipients Count</th>
                            <th className="py-3.5">Status</th>
                            <th className="py-3.5 pr-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {settingsData.broadcasts?.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="text-center py-8 text-zinc-500 italic">No broadcasts sent.</td>
                            </tr>
                          ) : (
                            settingsData.broadcasts?.map(b => (
                              <tr key={b._id} className="hover:bg-white/1">
                                <td className="py-3.5 pl-3 font-bold text-white max-w-[200px] truncate" title={b.message}>
                                  <p>{b.title}</p>
                                  <p className="text-[8px] font-normal text-zinc-500 truncate max-w-[220px]">{b.message}</p>
                                </td>
                                <td className="py-3.5 text-zinc-400 text-[10px]">{new Date(b.sentDate).toLocaleString()}</td>
                                <td className="py-3.5 text-zinc-500">{b.recipients?.length} Recipient(s)</td>
                                <td className="py-3.5 space-x-1.5">
                                  <span className="bg-green-500/10 text-green-400 font-bold border border-green-500/20 text-[9px] px-2.5 py-0.5 rounded">
                                    {b.status}
                                  </span>
                                  <span className={`font-bold border text-[9px] px-2.5 py-0.5 rounded ${b.intensity === 'Danger' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                    b.intensity === 'Warning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                      'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                    }`}>
                                    {b.intensity || 'Normal'}
                                  </span>
                                </td>
                                <td className="py-3.5 pr-3 text-right space-x-2">
                                  <button
                                    onClick={() => handleResendBroadcast(b)}
                                    className="text-amber-400 hover:text-amber-300 font-bold text-[10px] transition-colors cursor-pointer"
                                    title="Reuse details to resend broadcast"
                                  >
                                    Resend
                                  </button>
                                  <button
                                    onClick={() => handleDeleteBroadcast(b._id)}
                                    className="text-red-500 hover:text-red-400 font-bold text-[10px] transition-colors cursor-pointer"
                                    title="Delete from history"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* Subtab 3: Feature Flags Management */}
              {settingsTab === 'features' && (
                <div className="bg-[#121214] border border-white/5 p-6 rounded-xl">
                  <div className="mb-6">
                    <h2 className="text-xs font-black text-white uppercase tracking-wider">Global Feature Flags</h2>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Toggle platform features globally across all tenant instances</p>
                  </div>

                  <form onSubmit={handleSaveFeatureFlags} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { key: 'leads', label: 'Leads & Marketing Module', desc: 'Allows gyms to capture inquiries' },
                        { key: 'equipment', label: 'Equipment Inventory Register', desc: 'Manage machines and treadmill health' },
                        { key: 'attendance', label: 'Daily Attendance Tracker', desc: 'Enable staff/client attendance' },
                        { key: 'payments', label: 'Invoicing & Payments Module', desc: 'Track fee receipts & payroll' },
                        { key: 'trainer', label: 'Trainer Allocations & PT Settings', desc: 'Manage coaches & PT compensations' },
                        { key: 'staff', label: 'Employee Staff Registry', desc: 'Manage manager roles and system logs' }
                      ].map((flag) => (
                        <div key={flag.key} className="p-4 bg-[#18181b] border border-white/5 rounded-lg flex items-start gap-3.5">
                          <input
                            type="checkbox"
                            id={`flag-${flag.key}`}
                            checked={featureFlagsForm[flag.key]}
                            onChange={e => setFeatureFlagsForm({ ...featureFlagsForm, [flag.key]: e.target.checked })}
                            className="mt-1 accent-white rounded"
                          />
                          <div>
                            <label htmlFor={`flag-${flag.key}`} className="text-xs font-bold text-white uppercase tracking-wider cursor-pointer">{flag.label}</label>
                            <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">{flag.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="flex items-center gap-2 py-2 px-4 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-bold transition-all cursor-pointer mt-4"
                    >
                      <Save size={14} /> {actionLoading ? 'Saving Feature Flags...' : 'Save Global Feature Flags'}
                    </button>
                  </form>
                </div>
              )}

              {/* Subtab 4: Analytics */}
              {settingsTab === 'analytics' && settingsData.analytics && (
                <div className="space-y-6">

                  {/* Analytic Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="bg-[#121214] border border-white/5 p-5 rounded-xl">
                      <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Aggregate Platform Logins</p>
                      <p className="text-2xl font-extrabold text-white">{settingsData.analytics?.totalLogins.toLocaleString()}</p>
                      <p className="text-[9px] text-zinc-500 mt-1 font-medium">Sum of login counts across all gym owners</p>
                    </div>

                    <div className="bg-[#121214] border border-white/5 p-5 rounded-xl">
                      <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Average Daily Active Gyms</p>
                      <p className="text-2xl font-extrabold text-[#b8f175]">{settingsData.analytics?.averageDailyActiveGyms}</p>
                      <p className="text-[9px] text-zinc-500 mt-1 font-medium">Owners active on dashboard in past 24 hours</p>
                    </div>

                    <div className="bg-[#121214] border border-white/5 p-5 rounded-xl">
                      <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Overall Usage Density</p>
                      <p className="text-2xl font-extrabold text-green-400">High Density</p>
                      <p className="text-[9px] text-zinc-500 mt-1 font-medium">Calculated on total active client database records</p>
                    </div>
                  </div>

                  {/* Feature usage progress */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#121214] border border-white/5 p-5 rounded-xl space-y-4">
                      <h3 className="text-xs font-black text-white uppercase tracking-wider">Feature Usage Density</h3>
                      <div className="space-y-3.5">
                        {settingsData.analytics?.mostUsedFeatures?.map((feat, idx) => {
                          const maxCount = Math.max(...settingsData.analytics.mostUsedFeatures.map(f => f.count), 1);
                          const percentage = Math.round((feat.count / maxCount) * 100);
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-xs font-medium">
                                <span className="text-zinc-400">{feat.name}</span>
                                <span className="text-white font-bold">{feat.count} records</span>
                              </div>
                              <div className="w-full h-1.5 bg-[#18181b] rounded-full overflow-hidden">
                                <div className="h-full bg-[#b8f175]" style={{ width: `${percentage}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-[#121214] border border-white/5 p-5 rounded-xl space-y-4">
                      <h3 className="text-xs font-black text-white uppercase tracking-wider">Top Active Gym Instances</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="text-zinc-500 border-b border-white/5 text-[9px] uppercase tracking-wider font-extrabold bg-white/2">
                              <th className="py-2.5 pl-3">Gym Name</th>
                              <th className="py-2.5">Subscription Tier</th>
                              <th className="py-2.5 text-right pr-3">Login Sessions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {settingsData.analytics?.topActiveGyms?.map(gym => (
                              <tr key={gym._id} className="hover:bg-white/1">
                                <td className="py-3 pl-3 font-bold text-white">{gym.gymName}</td>
                                <td className="py-3 text-zinc-400">{gym.subscriptionPlan?.name || 'Silver Plan'}{gym.billingCycle === 'yearly' ? ' -Y' : ''}</td>
                                <td className="py-3 text-right pr-3 font-bold text-[#b8f175]">{gym.loginCount || 0}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* Subtab 5: Audit Logs */}
              {settingsTab === 'auditLogs' && (
                <div className="bg-[#121214] border border-white/5 p-6 rounded-xl space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">Platform Security & Audit Logs</h3>
                    <span className="text-[9px] text-zinc-500 uppercase font-bold">Showing last 100 entries</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="text-zinc-500 border-b border-white/5 text-[9px] uppercase tracking-wider font-extrabold bg-white/2">
                          <th className="py-3.5 pl-3">Action / Action Item</th>
                          <th className="py-3.5">Performed By</th>
                          <th className="py-3.5">Affected Gym/Entity</th>
                          <th className="py-3.5">Date & Time</th>
                          <th className="py-3.5 pr-3 text-right">Log Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {settingsData.auditLogs?.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="text-center py-8 text-zinc-500 italic">No audit records found.</td>
                          </tr>
                        ) : (
                          settingsData.auditLogs?.map(log => (
                            <tr key={log._id} className="hover:bg-white/1">
                              <td className="py-3.5 pl-3 font-bold text-white text-[11px]">{log.action}</td>
                              <td className="py-3.5 text-zinc-400">{log.performedBy}</td>
                              <td className="py-3.5 text-[#b8f175] font-semibold">{log.affectedEntity}</td>
                              <td className="py-3.5 text-zinc-500 text-[10px]">
                                <div>{formatDate(log.date)}</div>
                                <div className="text-[9px] text-zinc-600 mt-0.5">{formatTime(log.date)}</div>
                              </td>
                              <td className="py-3.5 pr-3 text-right text-[10px] text-zinc-500 italic max-w-[240px] truncate" title={log.details}>
                                {log.details || 'No details'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 5: CATEGORIES MANAGEMENT                         */}
          {/* ==================================================== */}
          {activeTab === 'categories' && settingsData && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Categories Sub-navigation Tabs */}
              <div className="flex bg-[#121214] rounded-lg p-1 border border-white/5 overflow-x-auto">
                {[
                  { id: 'equipment', label: 'Equipment Categories' },
                  { id: 'expense', label: 'Expense Categories' },
                  { id: 'staff', label: 'Staff Roles' },
                  { id: 'specializations', label: 'Specializations' }
                ].map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setCategoriesTab(sub.id)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${categoriesTab === sub.id ? 'bg-white text-black font-black' : 'text-zinc-500 hover:text-white'}`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>

              {/* Subtab 1: Equipment Categories */}
              {categoriesTab === 'equipment' && (
                <div className="bg-[#121214] border border-white/5 p-6 rounded-xl space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div>
                      <h2 className="text-xs font-black text-white uppercase tracking-wider">Equipment Categories</h2>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Configure default category dropdown choices for gym equipment listing.</p>
                    </div>
                    <button
                      onClick={handleResetEquipmentCategories}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all cursor-pointer"
                    >
                      <RotateCcw size={12} /> Reset to Defaults
                    </button>
                  </div>

                  <div className="max-w-xl space-y-6">
                    <form onSubmit={handleAddEquipmentCategory} className="flex gap-2">
                      <input
                        placeholder="Add new category (e.g. Cardio, Strength)..."
                        className="flex-1 bg-[#18181b] border border-white/5 focus:border-white/20 p-2.5 text-xs outline-none text-white rounded-lg transition-all"
                        value={newEquipmentCat}
                        onChange={e => setNewEquipmentCat(e.target.value)}
                      />
                      <button
                        type="submit"
                        className="bg-white hover:bg-zinc-200 text-black px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Add Category
                      </button>
                    </form>

                    <div className="space-y-3">
                      <p className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-wider">Active Categories</p>
                      <div className="bg-[#18181b] rounded-lg border border-white/5 divide-y divide-white/5">
                        {(settingsData.settings?.equipmentCategories || ['Cardio', 'Strength', 'Free Weights', 'Accessories']).map((cat, idx) => (
                          <div key={idx} className="flex items-center justify-between px-4 py-3 text-xs text-white">
                            <span>{cat}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteEquipmentCategory(cat)}
                              className="text-red-500 hover:text-red-400 p-1 rounded transition-colors cursor-pointer"
                              title="Remove Category"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Subtab 2: Expense Categories & Titles */}
              {categoriesTab === 'expense' && (
                <div className="bg-[#121214] border border-white/5 p-6 rounded-xl space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div>
                      <h2 className="text-xs font-black text-white uppercase tracking-wider">Expense Categories & Titles</h2>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Configure default category dropdown choices and sub-titles for gym expenses.</p>
                    </div>
                    <button
                      onClick={handleResetExpenseCategories}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all cursor-pointer"
                    >
                      <RotateCcw size={12} /> Reset to Defaults
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Left Panel: Expense Categories list */}
                    <div className="lg:col-span-2 space-y-4">
                      <form onSubmit={handleCreateExpenseCategory} className="flex gap-2">
                        <input
                          placeholder="New Category..."
                          className="flex-1 bg-[#18181b] border border-white/5 focus:border-white/20 p-2.5 text-xs outline-none text-white rounded-lg transition-all"
                          value={newExpenseCatName}
                          onChange={e => setNewExpenseCatName(e.target.value)}
                        />
                        <button
                          type="submit"
                          className="bg-white hover:bg-zinc-200 text-black px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0"
                        >
                          Create
                        </button>
                      </form>

                      <div className="bg-[#18181b] rounded-lg border border-white/5 overflow-hidden max-h-[400px] overflow-y-auto divide-y divide-white/5">
                        {(settingsData.settings?.expenseCategories || []).length === 0 ? (
                          <div className="p-4 text-xs text-center text-zinc-500">No expense categories.</div>
                        ) : (
                          (settingsData.settings?.expenseCategories || []).map((cat) => (
                            <div
                              key={cat._id || cat.name}
                              onClick={() => setSelectedExpenseCategory(cat)}
                              className={`flex items-center justify-between p-3.5 cursor-pointer text-xs transition-colors ${selectedExpenseCategory?.name === cat.name ? 'bg-white/5 text-white border-l-2 border-white' : 'text-zinc-400 hover:bg-white/2'}`}
                            >
                              <div className="flex-1 min-w-0 pr-2">
                                {editingExpenseCatId === cat._id ? (
                                  <input
                                    className="w-full bg-[#121214] border border-white/10 p-1 text-xs text-white rounded"
                                    value={editingExpenseCatName}
                                    onChange={e => setEditingExpenseCatName(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleUpdateExpenseCategoryName(cat._id);
                                      if (e.key === 'Escape') setEditingExpenseCatId(null);
                                    }}
                                    autoFocus
                                    onClick={e => e.stopPropagation()}
                                  />
                                ) : (
                                  <span className="font-semibold truncate block">{cat.name}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                                {editingExpenseCatId === cat._id ? (
                                  <button
                                    onClick={() => handleUpdateExpenseCategoryName(cat._id)}
                                    className="text-white hover:text-zinc-300 p-1 rounded"
                                  >
                                    <Check size={13} />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setEditingExpenseCatId(cat._id);
                                      setEditingExpenseCatName(cat.name);
                                    }}
                                    className="text-zinc-400 hover:text-white p-1 rounded"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteExpenseCategory(cat._id, cat.name)}
                                  className="text-red-500 hover:text-red-400 p-1 rounded"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Right Panel: Sub-titles for the selected category */}
                    <div className="lg:col-span-3 space-y-4">
                      {selectedExpenseCategory ? (
                        <div className="bg-[#18181b] p-5 rounded-lg border border-white/5 space-y-4">
                          <div>
                            <h4 className="text-white text-xs font-bold">Sub-titles for "{selectedExpenseCategory.name}"</h4>
                            <p className="text-[10px] text-zinc-500 mt-0.5">Define pre-filled names or tags when logging expenses under this category.</p>
                          </div>

                          <form onSubmit={handleAddExpenseTitle} className="flex gap-2">
                            <input
                              placeholder="Add sub-title (e.g. WiFi Bill, Rent, Repairs)..."
                              className="flex-1 bg-[#121214] border border-white/5 focus:border-white/20 p-2.5 text-xs outline-none text-white rounded-lg transition-all"
                              value={newExpenseTitleName}
                              onChange={e => setNewExpenseTitleName(e.target.value)}
                            />
                            <button
                              type="submit"
                              className="bg-white hover:bg-zinc-200 text-black px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0"
                            >
                              Add Option
                            </button>
                          </form>

                          <div className="space-y-2">
                            <p className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-wider">Active Sub-options</p>
                            <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto p-1">
                              {selectedExpenseCategory.titles?.map((title, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-1.5 bg-[#121214] border border-white/5 text-xs text-zinc-300 pl-3 pr-2 py-1.5 rounded-lg"
                                >
                                  <span>{title}</span>
                                  {title !== 'Other' && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteExpenseTitle(title)}
                                      className="text-zinc-500 hover:text-red-400 p-0.5 rounded transition-colors cursor-pointer"
                                    >
                                      <X size={12} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-[#18181b] p-8 rounded-lg border border-white/5 text-center text-zinc-500 text-xs">
                          Select or create an expense category to configure sub-titles.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Subtab 3: Staff Roles */}
              {categoriesTab === 'staff' && (
                <div className="bg-[#121214] border border-white/5 p-6 rounded-xl space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div>
                      <h2 className="text-xs font-black text-white uppercase tracking-wider">Staff Roles</h2>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Configure default category dropdown choices for staff roles.</p>
                    </div>
                    <button
                      onClick={handleResetStaffRoles}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all cursor-pointer"
                    >
                      <RotateCcw size={12} /> Reset to Defaults
                    </button>
                  </div>

                  <div className="max-w-xl space-y-6">
                    <form onSubmit={handleAddStaffRole} className="flex gap-2">
                      <input
                        placeholder="Add new role (e.g. Receptionist, Housekeeping)..."
                        className="flex-1 bg-[#18181b] border border-white/5 focus:border-white/20 p-2.5 text-xs outline-none text-white rounded-lg transition-all"
                        value={newStaffRole}
                        onChange={e => setNewStaffRole(e.target.value)}
                      />
                      <button
                        type="submit"
                        className="bg-white hover:bg-zinc-200 text-black px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Add Role
                      </button>
                    </form>

                    <div className="space-y-3">
                      <p className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-wider">Active Staff Roles</p>
                      <div className="bg-[#18181b] rounded-lg border border-white/5 divide-y divide-white/5">
                        {(settingsData.settings?.staffRoles || ['Trainer', 'Manager', 'Staff', 'Admin']).map((role, idx) => (
                          <div key={idx} className="flex items-center justify-between px-4 py-3 text-xs text-white">
                            <span>{role}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteStaffRole(role)}
                              className="text-red-500 hover:text-red-400 p-1 rounded transition-colors cursor-pointer"
                              title="Remove Role"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Subtab 4: Specializations */}
              {categoriesTab === 'specializations' && (
                <div className="bg-[#121214] border border-white/5 p-6 rounded-xl space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div>
                      <h2 className="text-xs font-black text-white uppercase tracking-wider">Specializations</h2>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Configure default category dropdown choices for trainer specialties.</p>
                    </div>
                    <button
                      onClick={handleResetSpecializations}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all cursor-pointer"
                    >
                      <RotateCcw size={12} /> Reset to Defaults
                    </button>
                  </div>

                  <div className="max-w-xl space-y-6">
                    <form onSubmit={handleAddSpecialization} className="flex gap-2">
                      <input
                        placeholder="Add new specialization (e.g. CrossFit, Nutrition)..."
                        className="flex-1 bg-[#18181b] border border-white/5 focus:border-white/20 p-2.5 text-xs outline-none text-white rounded-lg transition-all"
                        value={newSpecialization}
                        onChange={e => setNewSpecialization(e.target.value)}
                      />
                      <button
                        type="submit"
                        className="bg-white hover:bg-zinc-200 text-black px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Add Specialization
                      </button>
                    </form>

                    <div className="space-y-3">
                      <p className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-wider">Active Specializations</p>
                      <div className="bg-[#18181b] rounded-lg border border-white/5 divide-y divide-white/5">
                        {(settingsData.settings?.specializations || ['Weight Loss', 'Muscle Building', 'Cardio Training', 'Yoga', 'Zumba', 'CrossFit']).map((spec, idx) => (
                          <div key={idx} className="flex items-center justify-between px-4 py-3 text-xs text-white">
                            <span>{spec}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteSpecialization(spec)}
                              className="text-red-500 hover:text-red-400 p-1 rounded transition-colors cursor-pointer"
                              title="Remove Specialization"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* ==================================================== */}
      {/* GYM DETAILS OVERLAY/MODAL                            */}
      {/* ==================================================== */}
      {viewGymId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-2xl w-full border border-white/10 bg-[#0c0c0e]/95 backdrop-blur-2xl rounded-2xl relative overflow-hidden flex flex-col max-h-[90vh] shadow-[0_0_50px_-12px_rgba(184,241,117,0.15)] animate-in zoom-in-95 duration-200">

            {/* Header Glowing Accent */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#b8f175]/40 to-transparent" />
            <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-[#b8f175]/3 blur-[80px] rounded-full pointer-events-none" />

            {/* Modal Header */}
            <div className="p-5 border-b border-white/5 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#b8f175]/10 flex items-center justify-center border border-[#b8f175]/25">
                  <Building2 size={16} className="text-[#b8f175]" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                    {gymDetails?.gymInfo?.gymName || 'Gym Terminal'}
                  </h3>
                  <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                    Terminal Registry Summary
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewGymId(null)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer border border-white/5"
              >
                <X size={14} />
              </button>
            </div>

            {detailsLoading || !gymDetails ? (
              <div className="flex-1 flex flex-col items-center justify-center py-24 gap-3 bg-[#0c0c0e]/30">
                <div className="relative">
                  <div className="w-8 h-8 border-2 border-[#b8f175]/10 border-t-[#b8f175] rounded-full animate-spin" />
                  <div className="absolute inset-0 bg-[#b8f175]/20 blur-md rounded-full pointer-events-none animate-pulse" />
                </div>
                <p className="text-[9px] text-zinc-500 font-black uppercase tracking-wider animate-pulse">Syncing Tenant Sub-collections...</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-5 space-y-5 pr-4 custom-scrollbar">

                {/* 2 Column Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                  {/* Left Column: Info & Subscription */}
                  <div className="space-y-4">

                    {/* Gym Information Panel */}
                    <div className="bg-[#121214] p-4.5 rounded-xl border border-white/5 space-y-3 relative group hover:border-white/10 transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-500">Owner Contact</span>
                        <span className="text-[8px] font-bold text-zinc-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                          ID: {gymDetails.gymInfo._id.substring(18)}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-500 font-medium">Gym Name</span>
                          <span className="text-white font-semibold">{gymDetails.gymInfo.gymName}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-500 font-medium">Owner Name</span>
                          <span className="text-white font-semibold">{gymDetails.gymInfo.name}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-500 font-medium">Email</span>
                          <span className="text-zinc-300 font-semibold select-all hover:text-white transition-colors">{gymDetails.gymInfo.email}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-500 font-medium">Phone</span>
                          <span className="text-white font-semibold">{gymDetails.gymInfo.phone || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Subscription Details Panel */}
                    <div className="bg-[#121214] p-4.5 rounded-xl border border-white/5 space-y-3 relative group hover:border-[#b8f175]/10 transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-500">Subscription Status</span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase border
                          ${gymDetails.gymInfo.subscriptionStatus === 'Active'
                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                            : gymDetails.gymInfo.subscriptionStatus === 'Trial'
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                              : 'bg-red-500/10 border-red-500/20 text-red-400'
                          }`}
                        >
                          <span className={`w-1 h-1 rounded-full ${gymDetails.gymInfo.subscriptionStatus === 'Active'
                            ? 'bg-green-400 animate-ping'
                            : gymDetails.gymInfo.subscriptionStatus === 'Trial'
                              ? 'bg-amber-400 animate-pulse'
                              : 'bg-red-400'
                            }`} />
                          {gymDetails.gymInfo.subscriptionStatus}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-500 font-medium">Current Plan</span>
                          <span className="text-[#b8f175] font-extrabold flex items-center gap-1.5">
                            {gymDetails.gymInfo.subscriptionPlan?.name || 'Silver Plan'}
                            {gymDetails.gymInfo.billingCycle === 'yearly' && (
                              <span className="text-[7.5px] bg-[#b8f175]/15 border border-[#b8f175]/25 px-1 py-0.2 rounded font-black text-[#b8f175] uppercase tracking-wider">
                                Yearly
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-500 font-medium">Pricing Amount</span>
                          <span className="text-white font-extrabold">₹{(gymDetails.gymInfo.subscriptionAmount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-500 font-medium">Start Date</span>
                          <span className="text-zinc-300 font-semibold">{formatDate(gymDetails.gymInfo.subscriptionStart)}</span>
                        </div>
                        {gymDetails.gymInfo.subscriptionStatus === 'Trial' && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-500 font-medium">Trial Expiry</span>
                            <span className="text-zinc-300 font-semibold">{formatDate(gymDetails.gymInfo.subscriptionTrialEnds)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-500 font-medium">Expiry Date</span>
                          <span className="text-zinc-300 font-semibold">
                            {formatDate(gymDetails.gymInfo.subscriptionEnd)}
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Resource Gauges & Utilization */}
                  <div className="space-y-4">

                    {/* Capacity & Storage Utilization */}
                    <div className="bg-[#121214] p-4.5 rounded-xl border border-white/5 space-y-4 relative group hover:border-white/10 transition-all duration-300">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-500 block">Resource Gauges</span>

                      <div className="space-y-3.5">
                        {/* Clients ProgressBar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-zinc-400 font-medium">Clients Capacity</span>
                            <span className="text-white font-bold">
                              {gymDetails.metrics.totalClients} <span className="text-zinc-600 font-normal">/ {gymDetails.gymInfo.subscriptionPlan?.maxClients || 100}</span>
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-white/5 p-0.5">
                            <div
                              className="h-full bg-gradient-to-r from-[#b8f175]/60 to-[#b8f175] rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, ((gymDetails.metrics.totalClients || 0) / (gymDetails.gymInfo.subscriptionPlan?.maxClients || 100)) * 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Trainers ProgressBar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-zinc-400 font-medium">Trainers Limit</span>
                            <span className="text-white font-bold">
                              {gymDetails.metrics.totalTrainers} <span className="text-zinc-600 font-normal">/ {gymDetails.gymInfo.subscriptionPlan?.maxTrainers || 10}</span>
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-white/5 p-0.5">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500/60 to-blue-400 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, ((gymDetails.metrics.totalTrainers || 0) / (gymDetails.gymInfo.subscriptionPlan?.maxTrainers || 10)) * 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Staff ProgressBar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-zinc-400 font-medium">Staff Members</span>
                            <span className="text-white font-bold">
                              {gymDetails.metrics.totalStaff} <span className="text-zinc-600 font-normal">/ {gymDetails.gymInfo.subscriptionPlan?.maxStaff || 10}</span>
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-white/5 p-0.5">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500/60 to-purple-400 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, ((gymDetails.metrics.totalStaff || 0) / (gymDetails.gymInfo.subscriptionPlan?.maxStaff || 10)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Additional operational details */}
                    <div className="bg-[#121214] p-4.5 rounded-xl border border-white/5 space-y-2.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-500 font-medium">Active Members</span>
                        <span className="text-[#b8f175] font-extrabold bg-[#b8f175]/10 px-2 py-0.5 rounded border border-[#b8f175]/15">{gymDetails.metrics.totalActiveMembers}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-500 font-medium">Storage Allocation</span>
                        <span className="text-white font-bold">{gymDetails.metrics.storageUsage}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-500 font-medium">Last Login/Activity</span>
                        <span className="text-white font-semibold">{formatDate(gymDetails.metrics.lastActivity)}</span>
                      </div>
                    </div>

                  </div>

                </div>

                {/* Audit Logs and Transaction History Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Audit Logs: Vertical Timeline */}
                  <div className="bg-[#121214] p-4.5 rounded-xl border border-white/5 space-y-3.5">
                    <div className="flex items-center gap-2">
                      <Activity size={12} className="text-[#b8f175]" />
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-500">Live Tenant Activity Logs</span>
                    </div>

                    {gymDetails.auditLogs?.length === 0 ? (
                      <p className="text-xs text-zinc-600 italic pl-1">No operational logs recorded yet.</p>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {gymDetails.auditLogs.map((log) => (
                          <div key={log._id} className="p-3 bg-[#18181b] border border-white/5 rounded-xl text-xs flex justify-between items-center hover:bg-white/[0.02] transition-all">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-white font-extrabold uppercase text-[10px] tracking-wide bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                  {log.action}
                                </span>
                                {log.affectedEntity && (
                                  <span className="text-zinc-500 font-bold text-[9px] uppercase tracking-wider">
                                    {log.affectedEntity}
                                  </span>
                                )}
                                {log.performedBy && (
                                  <span className="text-zinc-500 text-[10px]">
                                    by <span className="text-zinc-400 font-semibold">{log.performedBy}</span>
                                  </span>
                                )}
                              </div>
                              {log.details && (
                                <p className="text-[11px] text-zinc-400 leading-relaxed pl-0.5">
                                  {log.details}
                                </p>
                              )}
                            </div>
                            <div className="text-right shrink-0 ml-4 pl-3 border-l border-white/5">
                              <div className="text-[10px] font-bold text-zinc-400">{formatDate(log.date)}</div>
                              <div className="text-[9px] text-zinc-500 mt-0.5">{formatTime(log.date)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Transaction History: Table list */}
                  <div className="bg-[#121214] p-4.5 rounded-xl border border-white/5 space-y-3.5">
                    <div className="flex items-center gap-2">
                      <IndianRupee size={12} className="text-[#b8f175]" />
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-500">Transaction History</span>
                    </div>

                    {!gymDetails.transactions || gymDetails.transactions.length === 0 ? (
                      <p className="text-xs text-zinc-600 italic pl-1">No transaction history recorded yet.</p>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {gymDetails.transactions.map((tx) => (
                          <div key={tx._id} className="p-3 bg-[#18181b] border border-white/5 rounded-xl text-xs flex justify-between items-center hover:bg-white/[0.02] transition-all">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-white font-extrabold uppercase text-[10px] tracking-wide bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                  {tx.planName}
                                </span>
                                <span className="text-zinc-500 font-bold text-[9px] uppercase tracking-wider">
                                  {tx.billingCycle}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#b8f175] font-black pl-0.5">
                                ₹{tx.amount.toLocaleString()} <span className="text-[9px] text-zinc-500 font-normal">via {tx.paymentMethod}</span>
                              </p>
                              {tx.razorpayPaymentId && (
                                <p className="text-[9px] text-zinc-600 font-mono pl-0.5">
                                  Pay ID: {tx.razorpayPaymentId}
                                </p>
                              )}
                            </div>
                            <div className="text-right shrink-0 ml-4 pl-3 border-l border-white/5">
                              <div className="text-[10px] font-bold text-zinc-400">{formatDate(tx.transactionDate)}</div>
                              <div className="text-[9px] text-zinc-500 mt-0.5">{formatTime(tx.transactionDate)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>


              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: CREATE GYM OWNER                              */}
      {/* ==================================================== */}
      {createGymOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-md w-full max-h-[90vh] overflow-y-auto p-6 border border-white/5 bg-[#121214] rounded-xl relative custom-scrollbar">
            <button
              onClick={() => setCreateGymOpen(false)}
              className="absolute right-4 top-4 text-zinc-500 hover:text-white transition-all cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-sm font-extrabold text-white mb-1 flex items-center gap-2 uppercase tracking-wider">
              <PlusCircle className="text-[#b8f175]" size={18} /> Register Gym Owner
            </h3>
            <p className="text-[9px] text-zinc-500 mb-6 uppercase tracking-wider">Initialize a new tenant account securely</p>

            <form onSubmit={handleCreateGym} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Gym Name</label>
                <input
                  type="text"
                  value={gymForm.gymName || ''}
                  onChange={e => setGymForm({ ...gymForm, gymName: e.target.value })}
                  className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none"
                  placeholder="Iron Fist Gym"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Owner Name</label>
                <input
                  type="text"
                  value={gymForm.name || ''}
                  onChange={e => setGymForm({ ...gymForm, name: e.target.value })}
                  className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Email</label>
                  <input
                    type="email"
                    value={gymForm.email || ''}
                    onChange={e => setGymForm({ ...gymForm, email: e.target.value })}
                    className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none"
                    placeholder="john@example.com"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Password</label>
                  <input
                    type="password"
                    value={gymForm.password || ''}
                    onChange={e => setGymForm({ ...gymForm, password: e.target.value })}
                    className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none"
                    placeholder="•••••"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Phone</label>
                  <input
                    type="text"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    onInvalid={e => e.target.setCustomValidity('Phone number must be exactly 10 digits (no spaces, letters, or special characters).')}
                    onInput={e => e.target.setCustomValidity('')}
                    value={gymForm.phone || ''}
                    onChange={e => setGymForm({ ...gymForm, phone: cleanPhone(e.target.value) })}
                    className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none"
                    placeholder="Phone Number (10 digits)"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Plan</label>
                  <select
                    value={gymForm.subscriptionPlanId || ''}
                    onChange={e => {
                      const val = e.target.value;
                      const selectedPlan = plans.find(p => p._id === val);
                      setGymForm(prev => ({
                        ...prev,
                        subscriptionPlanId: val,
                        trialDays: selectedPlan ? (selectedPlan.trialDays ?? 14) : ''
                      }));
                    }}
                    className="w-full bg-bg-input border border-border hover:border-border-hover rounded-xl px-3 py-2.5 text-xs text-text-primary outline-none focus:border-accent transition-all cursor-pointer"
                    required
                  >
                    <option value="" disabled className="bg-bg-secondary text-text-primary">Select Plan</option>
                    {plans.map(p => (
                      <option key={p._id} value={p._id} className="bg-bg-secondary text-text-primary">{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {gymForm.subscriptionPlanId && (
                <div className="p-3 bg-white/5 border border-white/5 rounded-lg space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-[#b8f175] font-black">Plan Details</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-zinc-500 block">Price</span>
                      <span className="text-white font-bold">
                        ₹{gymForm.billingCycle === 'yearly'
                          ? plans.find(p => p._id === gymForm.subscriptionPlanId)?.yearlyPrice?.toLocaleString()
                          : plans.find(p => p._id === gymForm.subscriptionPlanId)?.monthlyPrice?.toLocaleString()}
                        <span className="text-zinc-500 font-normal"> / {gymForm.billingCycle}</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Max Clients</span>
                      <span className="text-white font-bold">{plans.find(p => p._id === gymForm.subscriptionPlanId)?.maxClients || 0}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Max Trainers / Staff</span>
                      <span className="text-white font-bold">
                        {plans.find(p => p._id === gymForm.subscriptionPlanId)?.maxTrainers || 0} / {plans.find(p => p._id === gymForm.subscriptionPlanId)?.maxStaff || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Default Trial</span>
                      <span className="text-white font-bold">{plans.find(p => p._id === gymForm.subscriptionPlanId)?.trialDays || 0} Days</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Billing Interval</label>
                  <select
                    value={gymForm.billingCycle || 'monthly'}
                    onChange={e => setGymForm({ ...gymForm, billingCycle: e.target.value })}
                    className="w-full bg-bg-input border border-border hover:border-border-hover rounded-xl px-3 py-2.5 text-xs text-text-primary outline-none focus:border-accent transition-all cursor-pointer"
                    required
                  >
                    <option value="monthly" className="bg-bg-secondary text-text-primary">Monthly</option>
                    <option value="yearly" className="bg-bg-secondary text-text-primary">Yearly</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Initial Status</label>
                  <select
                    value={gymForm.subscriptionStatus || 'Trial'}
                    onChange={e => setGymForm({ ...gymForm, subscriptionStatus: e.target.value })}
                    className="w-full bg-bg-input border border-border hover:border-border-hover rounded-xl px-3 py-2.5 text-xs text-text-primary outline-none focus:border-accent transition-all cursor-pointer"
                  >
                    <option value="Trial" className="bg-bg-secondary text-text-primary">Free Trial</option>
                    <option value="Active" className="bg-bg-secondary text-text-primary">Active Paying</option>
                  </select>
                </div>

                {(gymForm.subscriptionStatus || 'Trial') === 'Trial' ? (
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Trial Days</label>
                    <input
                      type="number"
                      value={gymForm.trialDays ?? ''}
                      onChange={e => setGymForm({ ...gymForm, trialDays: Number(e.target.value) })}
                      className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none"
                      required
                    />
                  </div>
                ) : (
                  <div />
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setCreateGymOpen(false)}
                  className="flex-1 py-2 text-xs font-bold rounded-lg bg-[#18181b] border border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2 text-xs font-bold rounded-lg bg-white text-black hover:bg-zinc-200 transition-all cursor-pointer"
                >
                  {actionLoading ? 'Initializing...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: EDIT GYM OWNER                                */}
      {/* ==================================================== */}
      {editGymOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-md w-full max-h-[90vh] overflow-y-auto p-6 border border-white/5 bg-[#121214] rounded-xl relative scrollbar-thin">
            <button
              onClick={() => {
                setEditGymOpen(null);
                setIsAdminWhatsappUnlocked(false);
                setShowAdminUnlockWarning(false);
              }}
              className="absolute right-4 top-4 text-zinc-500 hover:text-white transition-all cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-sm font-extrabold text-white mb-1 flex items-center gap-2 uppercase tracking-wider">
              <Edit2 className="text-[#b8f175]" size={18} /> Edit Gym Owner Config
            </h3>
            <p className="text-[9px] text-zinc-500 mb-6 uppercase tracking-wider">Update tenant database profile fields</p>

            <form onSubmit={handleSaveEditGym} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Gym Name</label>
                <input
                  type="text"
                  value={gymForm.gymName || ''}
                  onChange={e => setGymForm({ ...gymForm, gymName: e.target.value })}
                  className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Owner Name</label>
                <input
                  type="text"
                  value={gymForm.name || ''}
                  onChange={e => setGymForm({ ...gymForm, name: e.target.value })}
                  className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Email</label>
                  <input
                    type="email"
                    value={gymForm.email || ''}
                    onChange={e => setGymForm({ ...gymForm, email: e.target.value })}
                    className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Phone</label>
                  <input
                    type="text"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    onInvalid={e => e.target.setCustomValidity('Phone number must be exactly 10 digits (no spaces, letters, or special characters).')}
                    onInput={e => e.target.setCustomValidity('')}
                    value={gymForm.phone || ''}
                    onChange={e => setGymForm({ ...gymForm, phone: cleanPhone(e.target.value) })}
                    className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none"
                  />
                </div>
              </div>

              {/* Subscription & Access Control Sections */}
              <div className="pt-4 border-t border-white/5 space-y-4 mt-4">
                
                {/* Cluster 1: Plan & Trial */}
                <div className="space-y-1.5">
                  <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Plan & Trial Management</span>
                  <div className="grid grid-cols-3 gap-2 bg-white/2 p-2 rounded-lg border border-white/5">
                    <button
                      type="button"
                      onClick={() => {
                        setChangePlanId(editGymOpen._id);
                        setChangePlanForm({ 
                          planId: editGymOpen.subscriptionPlan?._id || editGymOpen.subscriptionPlan || plans[0]?._id, 
                          billingCycle: editGymOpen.billingCycle || 'monthly', 
                          status: editGymOpen.subscriptionStatus 
                        });
                        setEditGymOpen(null);
                      }}
                      className="py-2 px-2 bg-[#18181b] border border-white/5 hover:border-white/10 hover:bg-[#1f1f23] text-[9.5px] text-zinc-300 hover:text-white font-extrabold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                    >
                      <Sliders size={11} className="text-zinc-400" /> Plan details
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setExtendTrialId(editGymOpen._id);
                        setExtendDays(7);
                        setEditGymOpen(null);
                      }}
                      className="py-2 px-2 bg-[#18181b] border border-white/5 hover:border-white/10 hover:bg-[#1f1f23] text-[9.5px] text-zinc-300 hover:text-white font-extrabold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                    >
                      <Calendar size={11} className="text-zinc-400" /> Extend Trial
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setChangePasswordGym(editGymOpen);
                        setNewPassword('');
                        setShowNewPassword(false);
                        setEditGymOpen(null);
                      }}
                      className="py-2 px-2 bg-[#18181b] border border-white/5 hover:border-white/10 hover:bg-[#1f1f23] text-[9.5px] text-zinc-300 hover:text-white font-extrabold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                    >
                      <Lock size={11} className="text-zinc-400" /> Reset Pass
                    </button>
                  </div>
                </div>



              </div>

              {/* WhatsApp Business API Accordion Section */}
              <div className="pt-4 border-t border-white/5 space-y-2 mt-4">
                <button
                  type="button"
                  onClick={() => setEditWhatsappSectionOpen(!editWhatsappSectionOpen)}
                  className="w-full py-2 px-3 bg-[#18181b] border border-white/5 hover:border-white/10 text-[10px] font-extrabold uppercase tracking-wider rounded-lg text-zinc-300 hover:text-white flex items-center justify-between transition-all"
                >
                  <span className="flex items-center gap-1.5">
                    <MessageCircle size={12} className="text-[#b8f175]" /> WhatsApp Business API
                  </span>
                  <span>{editWhatsappSectionOpen ? 'Hide' : 'Configure'}</span>
                </button>

                {editWhatsappSectionOpen && (
                  <div className="space-y-4 p-3 bg-white/2 rounded-lg border border-white/5 animate-in fade-in duration-200">
                    {/* Warning / Unlock Override Card */}
                    {!isAdminWhatsappUnlocked ? (
                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-lg flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Lock size={14} className="text-yellow-500 shrink-0 animate-pulse" />
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-white">API Credentials Locked</p>
                            <p className="text-[9px] text-zinc-400 mt-0.5">To prevent accidental disruption of automated messages to the owner's members, editing is restricted.</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAdminUnlockWarning(true)}
                          className="px-2.5 py-1 bg-yellow-500 hover:bg-yellow-600 text-black text-[9px] font-black uppercase tracking-wider rounded transition-all active:scale-95 cursor-pointer shrink-0"
                        >
                          Unlock
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 bg-[#b8f175]/10 border border-[#b8f175]/20 text-[#b8f175] rounded-lg flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle size={14} className="text-[#b8f175] shrink-0" />
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide">API Editing Enabled</p>
                            <p className="text-[9px] text-zinc-400 mt-0.5">You can now modify the Phone Number ID, Access Token, and Business Account ID below.</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAdminWhatsappUnlocked(false)}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white text-[9px] font-black uppercase tracking-wider rounded transition-all active:scale-95 cursor-pointer shrink-0"
                        >
                          Lock
                        </button>
                      </div>
                    )}

                    {showAdminUnlockWarning && !isAdminWhatsappUnlocked && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg space-y-3 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5 animate-bounce" />
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-white">CRITICAL WARNING: API Override Action Required</p>
                            <p className="text-[9px] text-zinc-400 leading-relaxed">
                              Modifying these API settings will immediately affect how GoJim delivers automated WhatsApp messages (Welcome Messages, Birthday Wishes, Reminders, and Comeback Nudges) to the owner's members. 
                            </p>
                            <p className="text-[9px] text-red-400/90 font-bold leading-relaxed">
                              If you enter incorrect values, ALL automated message notifications will fail silently and their customers will not receive any updates.
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowAdminUnlockWarning(false)}
                            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white text-[9px] font-black uppercase tracking-wider rounded transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAdminWhatsappUnlocked(true);
                              setShowAdminUnlockWarning(false);
                            }}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase tracking-wider rounded transition-all shadow-md active:scale-95 cursor-pointer"
                          >
                            Yes, Override
                          </button>
                        </div>
                      </div>
                    )}

                    {/* API Credentials */}
                    <div className="space-y-3">
                      <p className="text-[9px] uppercase tracking-widest text-[#b8f175] font-bold">API Credentials</p>
                      
                      <div className="space-y-1">
                        <label className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">Phone Number ID</label>
                        <input
                          type="text"
                          value={gymForm.whatsappConfig?.phoneNumberId || ''}
                          disabled={!isAdminWhatsappUnlocked}
                          onChange={e => setGymForm({
                            ...gymForm,
                            whatsappConfig: {
                              ...(gymForm.whatsappConfig || {}),
                              phoneNumberId: e.target.value
                            }
                          })}
                          className="w-full bg-[#18181b] disabled:bg-[#18181b]/40 disabled:text-gray-500 disabled:cursor-not-allowed border border-white/5 rounded px-2.5 py-1.5 text-xs text-white focus:border-white/20 outline-none"
                          placeholder="e.g. 109482901847120"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">Access Token</label>
                        <input
                          type="text"
                          value={gymForm.whatsappConfig?.accessToken || ''}
                          disabled={!isAdminWhatsappUnlocked}
                          onChange={e => setGymForm({
                            ...gymForm,
                            whatsappConfig: {
                              ...(gymForm.whatsappConfig || {}),
                              accessToken: e.target.value
                            }
                          })}
                          className="w-full bg-[#18181b] disabled:bg-[#18181b]/40 disabled:text-gray-500 disabled:cursor-not-allowed border border-white/5 rounded px-2.5 py-1.5 text-xs text-white focus:border-white/20 outline-none"
                          placeholder="EAAB..."
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">Business Account ID</label>
                        <input
                          type="text"
                          value={gymForm.whatsappConfig?.businessAccountId || ''}
                          disabled={!isAdminWhatsappUnlocked}
                          onChange={e => setGymForm({
                            ...gymForm,
                            whatsappConfig: {
                              ...(gymForm.whatsappConfig || {}),
                              businessAccountId: e.target.value
                            }
                          })}
                          className="w-full bg-[#18181b] disabled:bg-[#18181b]/40 disabled:text-gray-500 disabled:cursor-not-allowed border border-white/5 rounded px-2.5 py-1.5 text-xs text-white focus:border-white/20 outline-none"
                          placeholder="e.g. 102948291048294"
                        />
                      </div>

                      <div className="flex items-center justify-between py-1 border-t border-white/5 mt-2">
                        <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Is Verified</span>
                        <label className={`relative inline-flex items-center ${!isAdminWhatsappUnlocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} select-none`}>
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            disabled={!isAdminWhatsappUnlocked}
                            checked={gymForm.whatsappConfig?.isVerified || false}
                            onChange={e => setGymForm({
                              ...gymForm,
                              whatsappConfig: {
                                ...(gymForm.whatsappConfig || {}),
                                isVerified: e.target.checked
                              }
                            })}
                          />
                          <div className="w-8 h-4.5 bg-[#18181b] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#b8f175] peer-checked:after:bg-black peer-checked:after:border-black"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setEditGymOpen(null);
                    setIsAdminWhatsappUnlocked(false);
                    setShowAdminUnlockWarning(false);
                  }}
                  className="flex-1 py-2 text-xs font-bold rounded-lg bg-[#18181b] border border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2 text-xs font-bold rounded-lg bg-white text-black hover:bg-zinc-200 transition-all cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : 'Save Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: EXTEND TRIAL                                  */}
      {/* ==================================================== */}
      {extendTrialId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-sm w-full p-6 border border-white/5 bg-[#121214] rounded-xl relative">
            <h3 className="text-xs font-black text-white mb-2 flex items-center gap-2 uppercase tracking-wider">
              Extend Trial License
            </h3>
            <p className="text-[10px] text-zinc-500 mb-4 leading-relaxed">
              Add days to the free trial license period for this gym owner.
            </p>

            <form onSubmit={handleExtendTrial} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Extend By (Days)</label>
                <input
                  type="number"
                  value={extendDays || ''}
                  onChange={e => setExtendDays(Number(e.target.value))}
                  className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none"
                  min="1"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setExtendTrialId(null)}
                  className="flex-1 py-2 text-xs font-bold rounded-lg bg-[#18181b] border border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2 text-xs font-bold rounded-lg bg-white text-black hover:bg-zinc-200 transition-all cursor-pointer"
                >
                  {actionLoading ? 'Extending...' : 'Extend Period'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: CHANGE PLAN                                   */}
      {/* ==================================================== */}
      {changePlanId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-sm w-full max-h-[90vh] overflow-y-auto p-6 border border-white/5 bg-[#121214] rounded-xl relative custom-scrollbar">
            <h3 className="text-xs font-black text-white mb-2 flex items-center gap-2 uppercase tracking-wider">
              Modify Plan Subscription
            </h3>
            <p className="text-[10px] text-zinc-500 mb-4 leading-relaxed">
              Upgrade or downgrade the billing subscription configuration.
            </p>

            <form onSubmit={handleChangePlan} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Subscription Plan</label>
                <select
                  value={changePlanForm.planId || ''}
                  onChange={e => setChangePlanForm({ ...changePlanForm, planId: e.target.value })}
                  className="w-full bg-bg-input border border-border hover:border-border-hover rounded-xl px-3 py-2.5 text-xs text-text-primary outline-none focus:border-accent transition-all cursor-pointer"
                >
                  {plans.map(p => (
                    <option key={p._id} value={p._id} className="bg-bg-secondary text-text-primary">{p.name}</option>
                  ))}
                </select>
              </div>

              {changePlanForm.planId && (
                <div className="p-3 bg-white/5 border border-white/5 rounded-lg space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-[#b8f175] font-black">Plan Details</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-zinc-500 block">Price</span>
                      <span className="text-white font-bold">
                        ₹{changePlanForm.billingCycle === 'yearly'
                          ? plans.find(p => p._id === changePlanForm.planId)?.yearlyPrice?.toLocaleString()
                          : plans.find(p => p._id === changePlanForm.planId)?.monthlyPrice?.toLocaleString()}
                        <span className="text-zinc-500 font-normal"> / {changePlanForm.billingCycle}</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Max Clients</span>
                      <span className="text-white font-bold">{plans.find(p => p._id === changePlanForm.planId)?.maxClients || 0}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Max Trainers / Staff</span>
                      <span className="text-white font-bold">
                        {plans.find(p => p._id === changePlanForm.planId)?.maxTrainers || 0} / {plans.find(p => p._id === changePlanForm.planId)?.maxStaff || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Default Trial</span>
                      <span className="text-white font-bold">{plans.find(p => p._id === changePlanForm.planId)?.trialDays || 0} Days</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Billing Interval</label>
                <select
                  value={changePlanForm.billingCycle || 'monthly'}
                  onChange={e => setChangePlanForm({ ...changePlanForm, billingCycle: e.target.value })}
                  className="w-full bg-bg-input border border-border hover:border-border-hover rounded-xl px-3 py-2.5 text-xs text-text-primary outline-none focus:border-accent transition-all cursor-pointer"
                >
                  <option value="monthly" className="bg-bg-secondary text-text-primary">Monthly Cycle</option>
                  <option value="yearly" className="bg-bg-secondary text-text-primary">Yearly Cycle</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Subscription Status</label>
                <select
                  value={changePlanForm.status || 'Active'}
                  onChange={e => setChangePlanForm({ ...changePlanForm, status: e.target.value })}
                  className="w-full bg-bg-input border border-border hover:border-border-hover rounded-xl px-3 py-2.5 text-xs text-text-primary outline-none focus:border-accent transition-all cursor-pointer"
                >
                  <option value="Active" className="bg-bg-secondary text-text-primary">Active Paying</option>
                  <option value="Trial" className="bg-bg-secondary text-text-primary">Free Trial</option>
                  <option value="Expired" className="bg-bg-secondary text-text-primary">Expired</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setChangePlanId(null)}
                  className="flex-1 py-2 text-xs font-bold rounded-lg bg-[#18181b] border border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2 text-xs font-bold rounded-lg bg-white text-black hover:bg-zinc-200 transition-all cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : 'Apply Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: CHANGE GYM OWNER PASSWORD                     */}
      {/* ==================================================== */}
      {changePasswordGym && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-sm w-full p-6 border border-white/5 bg-[#121214] rounded-xl relative">
            <button
              onClick={() => {
                setChangePasswordGym(null);
                setNewPassword('');
                setShowNewPassword(false);
              }}
              className="absolute right-4 top-4 text-zinc-500 hover:text-white transition-all cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-xs font-black text-white mb-1 flex items-center gap-2 uppercase tracking-wider">
              <Lock className="text-[#b8f175]" size={16} /> Change Gym Password
            </h3>
            <p className="text-[10px] text-zinc-500 mb-4 leading-relaxed">
              Update password for <span className="text-white font-bold">{changePasswordGym.gymName || changePasswordGym.name}</span> ({changePasswordGym.email})
            </p>

            <div className="p-3 bg-white/5 border border-white/5 rounded-lg mb-3 flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-medium">Current Password</span>
              <div className="flex items-center gap-1.5 font-mono text-zinc-200 font-bold">
                <span>
                  {visiblePasswords[changePasswordGym._id]
                    ? (changePasswordGym.plainPassword || (changePasswordGym.password && !changePasswordGym.password.startsWith('$2') ? changePasswordGym.password : '••••••••'))
                    : '••••••••'}
                </span>
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility(changePasswordGym._id)}
                  className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-0.5 ml-1"
                  title={visiblePasswords[changePasswordGym._id] ? 'Hide Password' : 'Show Password'}
                >
                  {visiblePasswords[changePasswordGym._id] ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min 5 characters"
                    className="w-full bg-[#18181b] border border-white/5 rounded-lg pl-3 pr-10 py-2 text-xs text-white focus:border-white/20 outline-none"
                    minLength={5}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <Eye size={14} />
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setChangePasswordGym(null);
                    setNewPassword('');
                    setShowNewPassword(false);
                  }}
                  className="flex-1 py-2 text-xs font-bold rounded-lg bg-[#18181b] border border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2 text-xs font-bold rounded-lg bg-white text-black hover:bg-zinc-200 transition-all cursor-pointer"
                >
                  {actionLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: DELETE GYM OWNER (PURGE TENANT)               */}
      {/* ==================================================== */}
      {deleteOwnerId && (() => {
        const targetOwner = owners.find(o => o._id === deleteOwnerId);
        const targetOwnerName = targetOwner ? targetOwner.name : 'Owner';
        const targetGymName = targetOwner ? targetOwner.gymName : 'this gym';
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="max-w-sm w-full p-6 border border-red-500/20 bg-[#121214] rounded-xl relative">
              <h3 className="text-xs font-black text-white mb-2 flex items-center gap-2 uppercase tracking-wider">
                <AlertTriangle className="text-red-500" /> Delete Gym & All Data?
              </h3>
              <p className="text-[10px] text-zinc-400 leading-relaxed mb-6">
                Warning: This will <span className="text-red-400 font-bold">delete everything forever</span>! It will permanently delete the owner user <strong className="text-white">{targetOwnerName}</strong> and all clients, trainers, staff, payments, attendance, and logs for <strong className="text-white">{targetGymName}</strong>. You cannot undo this.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteOwnerId(null)}
                  className="flex-1 py-2 text-xs font-bold rounded-lg bg-[#18181b] border border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  Keep Active
                </button>
                <button
                  onClick={handleDeleteGym}
                  disabled={actionLoading}
                  className="flex-1 py-2 text-xs font-bold rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                >
                  {actionLoading ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ==================================================== */}
      {/* MODAL: DELETE BROADCAST ANNOUNCEMENT                  */}
      {/* ==================================================== */}
      {deleteBroadcastId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-sm w-full p-6 border border-red-500/20 bg-[#121214] rounded-xl relative">
            <h3 className="text-xs font-black text-white mb-2 flex items-center gap-2 uppercase tracking-wider">
              <AlertTriangle className="text-red-500" /> Delete Broadcast Announcement?
            </h3>
            <p className="text-[10px] text-zinc-400 leading-relaxed mb-6">
              Are you sure you want to delete this broadcast announcement? This action will permanently remove it from the platform broadcast history.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteBroadcastId(null)}
                className="flex-1 py-2 text-xs font-bold rounded-lg bg-[#18181b] border border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteBroadcast}
                disabled={actionLoading}
                className="flex-1 py-2 text-xs font-bold rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
              >
                {actionLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: CREATE SUBSCRIPTION PLAN                      */}
      {/* ==================================================== */}
      {createPlanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-md w-full p-6 border border-white/5 bg-[#121214] rounded-xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <button
              onClick={() => setCreatePlanOpen(false)}
              className="absolute right-4 top-4 text-zinc-500 hover:text-white transition-all cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-sm font-extrabold text-white mb-1 flex items-center gap-2 uppercase tracking-wider">
              <PlusCircle className="text-[#b8f175]" size={18} /> Create Subscription Plan
            </h3>
            <p className="text-[9px] text-zinc-500 mb-5 uppercase tracking-wider">Configure feature packages and threshold limits</p>

            <form onSubmit={handleCreatePlan} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Plan Name</label>
                <input
                  type="text"
                  value={planForm.name || ''}
                  onChange={e => setPlanForm({ ...planForm, name: e.target.value })}
                  className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none"
                  placeholder="Platinum Elite Plan"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Monthly Price (₹)</label>
                  <input
                    type="number"
                    value={planForm.monthlyPrice ?? ''}
                    onChange={e => setPlanForm({ ...planForm, monthlyPrice: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Yearly Price (₹)</label>
                  <input
                    type="number"
                    value={planForm.yearlyPrice ?? ''}
                    onChange={e => setPlanForm({ ...planForm, yearlyPrice: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Max Clients</label>
                  <input
                    type="number"
                    value={planForm.maxClients ?? ''}
                    onChange={e => setPlanForm({ ...planForm, maxClients: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Max Trainers</label>
                  <input
                    type="number"
                    value={planForm.maxTrainers ?? ''}
                    onChange={e => setPlanForm({ ...planForm, maxTrainers: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Max Staff</label>
                  <input
                    type="number"
                    value={planForm.maxStaff ?? ''}
                    onChange={e => setPlanForm({ ...planForm, maxStaff: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Trial Period (Days)</label>
                  <input
                    type="number"
                    value={planForm.trialDays ?? ''}
                    onChange={e => setPlanForm({ ...planForm, trialDays: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Initial Status</label>
                  <select
                    value={planForm.status || 'Active'}
                    onChange={e => setPlanForm({ ...planForm, status: e.target.value })}
                    className="w-full bg-bg-input border border-border hover:border-border-hover rounded-xl px-3 py-2.5 text-xs text-text-primary outline-none focus:border-accent transition-all cursor-pointer"
                  >
                    <option value="Active" className="bg-bg-secondary text-text-primary">Active</option>
                    <option value="Inactive" className="bg-bg-secondary text-text-primary">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Description</label>
                <textarea
                  rows="2"
                  value={planForm.description || ''}
                  onChange={e => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none resize-none"
                  placeholder="Enter tier packaging pitch..."
                />
              </div>

              {/* Feature selections list */}
              <div className="space-y-2">
                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Package Core Features Availability</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {['Leads Module', 'Equipment Module', 'Attendance Module', 'Payments Module', 'Trainer Module', 'Staff Module'].map(feat => {
                    const isChecked = planForm.features.includes(feat);
                    return (
                      <label
                        key={feat}
                        className={`flex items-center gap-2 py-1.5 px-2.5 rounded-lg border transition-all duration-200 cursor-pointer select-none ${isChecked
                          ? 'bg-white/10 border-white/30 text-white'
                          : 'bg-[#18181b]/50 border-white/5 text-zinc-500 hover:border-white/10 hover:bg-[#18181b]'
                          }`}
                      >
                        <input
                          type="checkbox"
                          id={`feat-${feat}`}
                          checked={isChecked}
                          onChange={() => handleFeatureToggle(feat)}
                          className="w-3.5 h-3.5 rounded border-white/10 text-white focus:ring-white bg-transparent accent-white cursor-pointer shrink-0"
                        />
                        <span className={`!text-[9.5px] !font-bold tracking-wider uppercase ${isChecked ? 'text-white' : 'text-zinc-400'}`}>
                          {feat}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreatePlanOpen(false)}
                  className="flex-1 py-2 text-xs font-bold rounded-lg bg-[#18181b] border border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2 text-xs font-bold rounded-lg bg-white text-black hover:bg-zinc-200 transition-all cursor-pointer"
                >
                  {actionLoading ? 'Creating Plan...' : 'Create plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: EDIT SUBSCRIPTION PLAN                        */}
      {/* ==================================================== */}
      {editPlanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-md w-full p-6 border border-white/5 bg-[#121214] rounded-xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <button
              onClick={() => setEditPlanOpen(null)}
              className="absolute right-4 top-4 text-zinc-500 hover:text-white transition-all cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-sm font-extrabold text-white mb-1 flex items-center gap-2 uppercase tracking-wider">
              <Edit2 className="text-[#b8f175]" size={18} /> Edit Subscription Plan
            </h3>
            <p className="text-[9px] text-zinc-500 mb-5 uppercase tracking-wider">Update packages rates and client limits</p>

            <form onSubmit={handleSaveEditPlan} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Plan Name</label>
                <input
                  type="text"
                  value={planForm.name || ''}
                  onChange={e => setPlanForm({ ...planForm, name: e.target.value })}
                  className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Monthly Price (₹)</label>
                  <input
                    type="number"
                    value={planForm.monthlyPrice ?? ''}
                    onChange={e => setPlanForm({ ...planForm, monthlyPrice: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Yearly Price (₹)</label>
                  <input
                    type="number"
                    value={planForm.yearlyPrice ?? ''}
                    onChange={e => setPlanForm({ ...planForm, yearlyPrice: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Max Clients</label>
                  <input
                    type="number"
                    value={planForm.maxClients ?? ''}
                    onChange={e => setPlanForm({ ...planForm, maxClients: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Max Trainers</label>
                  <input
                    type="number"
                    value={planForm.maxTrainers ?? ''}
                    onChange={e => setPlanForm({ ...planForm, maxTrainers: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Max Staff</label>
                  <input
                    type="number"
                    value={planForm.maxStaff ?? ''}
                    onChange={e => setPlanForm({ ...planForm, maxStaff: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Trial Period (Days)</label>
                  <input
                    type="number"
                    value={planForm.trialDays ?? ''}
                    onChange={e => setPlanForm({ ...planForm, trialDays: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Status</label>
                  <select
                    value={planForm.status || 'Active'}
                    onChange={e => setPlanForm({ ...planForm, status: e.target.value })}
                    className="w-full bg-bg-input border border-border hover:border-border-hover rounded-xl px-3 py-2.5 text-xs text-text-primary outline-none focus:border-accent transition-all cursor-pointer"
                  >
                    <option value="Active" className="bg-bg-secondary text-text-primary">Active</option>
                    <option value="Inactive" className="bg-bg-secondary text-text-primary">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Description</label>
                <textarea
                  rows="2"
                  value={planForm.description || ''}
                  onChange={e => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-white/20 outline-none resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Package Core Features Availability</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {['Leads Module', 'Equipment Module', 'Attendance Module', 'Payments Module', 'Trainer Module', 'Staff Module'].map(feat => {
                    const isChecked = planForm.features.includes(feat);
                    return (
                      <label
                        key={feat}
                        className={`flex items-center gap-2 py-1.5 px-2.5 rounded-lg border transition-all duration-200 cursor-pointer select-none ${isChecked
                          ? 'bg-white/10 border-white/30 text-white'
                          : 'bg-[#18181b]/50 border-white/5 text-zinc-500 hover:border-white/10 hover:bg-[#18181b]'
                          }`}
                      >
                        <input
                          type="checkbox"
                          id={`edit-feat-${feat}`}
                          checked={isChecked}
                          onChange={() => handleFeatureToggle(feat)}
                          className="w-3.5 h-3.5 rounded border-white/10 text-white focus:ring-white bg-transparent accent-white cursor-pointer shrink-0"
                        />
                        <span className={`!text-[9.5px] !font-bold tracking-wider uppercase ${isChecked ? 'text-white' : 'text-zinc-400'}`}>
                          {feat}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditPlanOpen(null)}
                  className="flex-1 py-2 text-xs font-bold rounded-lg bg-[#18181b] border border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2 text-xs font-bold rounded-lg bg-white text-black hover:bg-zinc-200 transition-all cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: DELETE SUBSCRIPTION PLAN                      */}
      {/* ==================================================== */}
      {deletePlanId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-sm w-full p-6 border border-red-500/20 bg-[#121214] rounded-xl relative">
            <h3 className="text-xs font-black text-white mb-2 flex items-center gap-2 uppercase tracking-wider">
              <AlertTriangle className="text-red-500" /> Delete Plan?
            </h3>
            <p className="text-[10px] text-zinc-400 leading-relaxed mb-6">
              Are you sure you want to permanently delete this subscription plan? Gym owners will no longer be able to select it.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeletePlanId(null)}
                className="flex-1 py-2 text-xs font-bold rounded-lg bg-[#18181b] border border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                Keep Plan
              </button>
              <button
                onClick={handleDeletePlan}
                disabled={actionLoading}
                className="flex-1 py-2 text-xs font-bold rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer shadow-lg"
              >
                {actionLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop blur overlay with opacity fade transition */}
      <div
        onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
        className={`fixed inset-0 top-[77px] bg-black/60 backdrop-blur-md z-[50] transition-opacity duration-500 ease-in-out ${isSearchOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
      />

      {/* Dropdown container with smooth slide-down transition and solid black background */}
      <div className={`fixed left-0 right-0 bg-black z-[55] pt-10 pb-8 px-6 lg:px-24 shadow-2xl transition-all duration-500 ease-in-out ${isSearchOpen
        ? 'top-[77px] opacity-100 translate-y-0 pointer-events-auto'
        : '-top-[600px] opacity-0 -translate-y-12 pointer-events-none'
        }`}>
        <div className="max-w-4xl mx-auto flex flex-col max-h-[50vh]">

          {/* Search input inside the dropdown itself */}
          <div className="w-full flex items-center gap-3 pb-4 mb-4 border-b border-white/10">
            <Search size={22} className="text-[#86868b] shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search Super Admin Portal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-none ring-0 border-0 outline-0 shadow-none text-[#e8e8ed] text-lg lg:text-xl font-normal placeholder-[#86868b]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-[#86868b] hover:text-white transition-colors cursor-pointer bg-transparent border-none">
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
                    { label: 'Platform Dashboard Overview', tab: 'dashboard' },
                    { label: 'Gym Owner Accounts Registry', tab: 'gyms' },
                    { label: 'Manage Subscription Tiers', tab: 'plans', plansTab: 'plansList' },
                    { label: 'Configure Global System Settings', tab: 'settings', settingsTab: 'general' }
                  ].map((link) => (
                    <button
                      key={link.label}
                      onClick={() => {
                        setActiveTab(link.tab);
                        if (link.plansTab) setPlansTab(link.plansTab);
                        if (link.settingsTab) setSettingsTab(link.settingsTab);
                        setIsSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="group flex items-center py-1.5 no-underline text-left bg-transparent border-none cursor-pointer w-full"
                    >
                      <span className="text-sm font-semibold text-[#86868b] group-hover:text-white transition-colors mr-2">→</span>
                      <span className="text-[13px] font-medium text-[#c1c1c7] group-hover:text-white transition-colors">
                        {link.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-1">
                {searchResults.pages.length === 0 && searchResults.gyms.length === 0 && searchResults.plans.length === 0 && searchResults.subs.length === 0 && searchResults.logs.length === 0 ? (
                  <div className="text-center py-8 space-y-1.5 animate-in fade-in duration-300">
                    <AlertTriangle size={22} className="text-[#86868b] mx-auto" />
                    <p className="text-sm font-medium text-white">No results found</p>
                    <p className="text-xs text-[#86868b]">No match found for &quot;{searchQuery}&quot;. Check the spelling and try again.</p>
                  </div>
                ) : (
                  <div className="space-y-4 divide-y divide-white/5 animate-in fade-in duration-300">
                    {searchResults.pages.length > 0 && (
                      <div className="space-y-2 pt-3 first:pt-0">
                        <p className="text-[10px] font-normal tracking-wide text-[#86868b] uppercase">Pages & Shortcuts ({searchResults.pages.length})</p>
                        <div className="flex flex-col gap-1">
                          {searchResults.pages.map(p => (
                            <button
                              key={p.id}
                              onClick={() => {
                                setActiveTab(p.tab);
                                if (p.plansTab) setPlansTab(p.plansTab);
                                if (p.settingsTab) setSettingsTab(p.settingsTab);
                                setIsSearchOpen(false);
                                setSearchQuery('');
                              }}
                              className="group flex items-center py-1.5 no-underline text-left bg-transparent border-none cursor-pointer w-full animate-in fade-in duration-200"
                            >
                              <span className="text-sm font-semibold text-[#86868b] group-hover:text-white transition-colors mr-2">→</span>
                              <span className="text-[13px] font-medium text-[#c1c1c7] group-hover:text-white transition-colors">
                                {p.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResults.gyms.length > 0 && (
                      <div className="space-y-2 pt-3 first:pt-0">
                        <p className="text-[10px] font-normal tracking-wide text-[#86868b] uppercase">Gym Owners ({searchResults.gyms.length})</p>
                        <div className="flex flex-col gap-1">
                          {searchResults.gyms.map(g => (
                            <button
                              key={g._id}
                              onClick={() => {
                                setActiveTab('gyms');
                                setGymSearch(g.gymName || g.name || '');
                                setIsSearchOpen(false);
                                setSearchQuery('');
                              }}
                              className="group flex items-center justify-between py-1.5 no-underline text-left bg-transparent border-none cursor-pointer w-full animate-in fade-in duration-200"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-sm font-semibold text-[#86868b] group-hover:text-white transition-colors mr-2">→</span>
                                <div>
                                  <span className="text-[13px] font-medium text-[#c1c1c7] group-hover:text-white transition-colors">
                                    {g.gymName}
                                  </span>
                                  <span className="text-[10px] text-[#86868b] ml-2">
                                    ({g.name} • {g.email})
                                  </span>
                                </div>
                              </div>
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border ${g.subscriptionStatus === 'Active'
                                ? 'bg-success/10 border-success/20 text-success'
                                : 'bg-danger/10 border-danger/20 text-danger'
                                }`}>
                                {g.subscriptionStatus}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResults.plans.length > 0 && (
                      <div className="space-y-2 pt-3 first:pt-0">
                        <p className="text-[10px] font-normal tracking-wide text-[#86868b] uppercase">Subscription Plans ({searchResults.plans.length})</p>
                        <div className="flex flex-col gap-1">
                          {searchResults.plans.map(p => (
                            <button
                              key={p._id}
                              onClick={() => {
                                setActiveTab('plans');
                                setPlansTab('plansList');
                                setIsSearchOpen(false);
                                setSearchQuery('');
                              }}
                              className="group flex items-center justify-between py-1.5 no-underline text-left bg-transparent border-none cursor-pointer w-full animate-in fade-in duration-200"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-sm font-semibold text-[#86868b] group-hover:text-white transition-colors mr-2">→</span>
                                <div>
                                  <span className="text-[13px] font-medium text-[#c1c1c7] group-hover:text-white transition-colors">
                                    {p.name}
                                  </span>
                                  <span className="text-[10px] text-[#86868b] ml-2">
                                    (Monthly: ₹{p.monthlyPrice} / Yearly: ₹{p.yearlyPrice})
                                  </span>
                                </div>
                              </div>
                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-zinc-500/10 border border-zinc-500/20 text-zinc-300 uppercase tracking-widest">
                                {p.status || 'Active'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResults.subs.length > 0 && (
                      <div className="space-y-2 pt-3 first:pt-0">
                        <p className="text-[10px] font-normal tracking-wide text-[#86868b] uppercase">Active Subscriptions ({searchResults.subs.length})</p>
                        <div className="flex flex-col gap-1">
                          {searchResults.subs.map(s => (
                            <button
                              key={s._id}
                              onClick={() => {
                                setActiveTab('plans');
                                setPlansTab('subscriptions');
                                setSubSearch(s.gymName || '');
                                setIsSearchOpen(false);
                                setSearchQuery('');
                              }}
                              className="group flex items-center justify-between py-1.5 no-underline text-left bg-transparent border-none cursor-pointer w-full animate-in fade-in duration-200"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-sm font-semibold text-[#86868b] group-hover:text-white transition-colors mr-2">→</span>
                                <div>
                                  <span className="text-[13px] font-medium text-[#c1c1c7] group-hover:text-white transition-colors">
                                    {s.gymName}
                                  </span>
                                  <span className="text-[10px] text-[#86868b] ml-2">
                                    (Owner: {s.name} • Plan: {s.subscriptionPlan?.name}{s.billingCycle === 'yearly' ? ' -Y' : ''})
                                  </span>
                                </div>
                              </div>
                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-success/10 border border-success/20 text-success uppercase tracking-widest font-bold">
                                {s.subscriptionStatus}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResults.logs.length > 0 && (
                      <div className="space-y-2 pt-3 first:pt-0">
                        <p className="text-[10px] font-normal tracking-wide text-[#86868b] uppercase">Security Audit Logs ({searchResults.logs.length})</p>
                        <div className="flex flex-col gap-1">
                          {searchResults.logs.map((l, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setActiveTab('settings');
                                setSettingsTab('auditLogs');
                                setIsSearchOpen(false);
                                setSearchQuery('');
                              }}
                              className="group flex items-center justify-between py-1.5 no-underline text-left bg-transparent border-none cursor-pointer w-full animate-in fade-in duration-200"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-sm font-semibold text-[#86868b] group-hover:text-white transition-colors mr-2">→</span>
                                <div>
                                  <span className="text-[13px] font-medium text-[#c1c1c7] group-hover:text-white transition-colors">
                                    {l.action}
                                  </span>
                                  <span className="text-[10px] text-[#86868b] ml-2">
                                    ({l.details})
                                  </span>
                                </div>
                              </div>
                              <span className="text-[8px] font-black px-1.5 py-0.5 text-zinc-500 uppercase tracking-widest">
                                {l.performedBy}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}

export default function SuperAdminDashboard() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-[#0c0c0e] items-center justify-center">
        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SuperAdminDashboardContent />
    </Suspense>
  );
}
