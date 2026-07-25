'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { trainersApi, membersApi, whatsappApi, expensesApi, plansApi, authApi } from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { Modal, Input, Loader, Badge, EmptyState, SearchBar, Select, DatePicker, StatCard } from '@/components/UI';
import { cleanPhone, validatePhone } from '@/lib/utils';
import {
  UserPlus, Dumbbell, Calendar, Trash2, Edit3,
  Check, Phone, Mail, Eye, Users, Search,
  Filter, SortDesc, RefreshCw, Tag, Activity, Award,
  ToggleLeft, ToggleRight, Banknote, MessageCircle, UserCheck, IndianRupee,
  ChevronUp, ChevronDown, ChevronsUpDown, MoreVertical, TrendingUp, TrendingDown,
  UserMinus, XCircle, AlertCircle, X, Zap, CreditCard, Landmark
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';

const SPECIALTIES = ['Powerlifter', 'Zumba', 'Weightlifter', 'Yoga', 'Crossfit', 'Cardio', 'Bodybuilding'];

const parseTime24 = (timeStr) => {
  if (!timeStr) return { hour: 12, minute: '00', period: 'AM' };
  const [hStr, mStr] = timeStr.split(':');
  let hour = parseInt(hStr, 10);
  const minute = mStr || '00';
  let period = 'AM';
  if (hour >= 12) {
    period = 'PM';
    if (hour > 12) hour -= 12;
  }
  if (hour === 0) hour = 12;
  return { hour, minute, period };
};

const formatTime24 = (hour, minute, period) => {
  let h = parseInt(hour, 10);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${h.toString().padStart(2, '0')}:${minute.padStart(2, '0')}`;
};

const formatTime12 = (time24) => {
  if (!time24) return '-';
  const { hour, minute, period } = parseTime24(time24);
  return `${hour}:${minute} ${period}`;
};

export default function TrainersPage() {
  const { user, updateUser } = useAuth();
  const [trainers, setTrainers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState(null);
  const [limitReachedState, setLimitReachedState] = useState(null);

  // Date Filter States
  const [dateFilterType, setDateFilterType] = useState('all'); // 'all' | 'year' | 'month' | 'date' | 'range'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString()); // '0' to '11'
  const [selectedDate, setSelectedDate] = useState(''); // 'YYYY-MM-DD'
  const [selectedRangeStart, setSelectedRangeStart] = useState(''); // 'YYYY-MM-DD'
  const [selectedRangeEnd, setSelectedRangeEnd] = useState(''); // 'YYYY-MM-DD'
  const [showDateFilterPopover, setShowDateFilterPopover] = useState(false);

  const getDateFilterLabel = () => {
    if (dateFilterType === 'all') return 'All Time';
    if (dateFilterType === 'date') {
      if (!selectedDate) return 'Select Date';
      const d = new Date(selectedDate);
      return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    if (dateFilterType === 'month') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[parseInt(selectedMonth)]} ${selectedYear}`;
    }
    if (dateFilterType === 'year') {
      return selectedYear;
    }
    if (dateFilterType === 'range') {
      if (!selectedRangeStart && !selectedRangeEnd) return 'Select Range';
      const startStr = selectedRangeStart ? new Date(selectedRangeStart).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }) : '...';
      const endStr = selectedRangeEnd ? new Date(selectedRangeEnd).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }) : '...';
      return `${startStr} - ${endStr}`;
    }
    return 'All Time';
  };

  const filteredTrainers = useMemo(() => {
    return trainers.filter(t => {
      if (dateFilterType === 'all') return true;
      const trainerDate = t.joinDate ? new Date(t.joinDate) : (t.createdAt ? new Date(t.createdAt) : null);
      if (!trainerDate) return false;

      if (dateFilterType === 'date') {
        if (!selectedDate) return true;
        const targetDate = new Date(selectedDate);
        return trainerDate.getFullYear() === targetDate.getFullYear() &&
          trainerDate.getMonth() === targetDate.getMonth() &&
          trainerDate.getDate() === targetDate.getDate();
      }

      if (dateFilterType === 'month') {
        const targetMonth = parseInt(selectedMonth);
        const targetYear = parseInt(selectedYear);
        return trainerDate.getFullYear() === targetYear &&
          trainerDate.getMonth() === targetMonth;
      }

      if (dateFilterType === 'year') {
        const targetYear = parseInt(selectedYear);
        return trainerDate.getFullYear() === targetYear;
      }

      if (dateFilterType === 'range') {
        const start = selectedRangeStart ? new Date(selectedRangeStart) : null;
        if (start) start.setHours(0, 0, 0, 0);

        const end = selectedRangeEnd ? new Date(selectedRangeEnd) : null;
        if (end) end.setHours(23, 59, 59, 999);

        if (start && end) {
          return trainerDate >= start && trainerDate <= end;
        } else if (start) {
          return trainerDate >= start;
        } else if (end) {
          return trainerDate <= end;
        }
        return true;
      }

      return true;
    });
  }, [trainers, dateFilterType, selectedDate, selectedMonth, selectedYear, selectedRangeStart, selectedRangeEnd]);
  const [viewingTrainer, setViewingTrainer] = useState(null);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [salaryTrainer, setSalaryTrainer] = useState(null);
  const [salaryForm, setSalaryForm] = useState({
    fixed: 0,
    commission: '',
    note: '',
    paymentMethod: 'cash'
  });
  const [viewingClients, setViewingClients] = useState(null);
  const [viewingSpecialties, setViewingSpecialties] = useState(null);
  const [viewingMember, setViewingMember] = useState(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('-createdAt');
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [activeFilterCategory, setActiveFilterCategory] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const menuRef = useRef(null);
  const [toasts, setToasts] = useState([]);
  const [deleteConfirmState, setDeleteConfirmState] = useState(null);
  const [deletePayments, setDeletePayments] = useState(false);

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
        setActiveMenu(null);
      }
    };
    const handleScroll = () => {
      setOpenMenuId(null);
      setActiveMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);
  const searchParams = useSearchParams();
  const previewId = searchParams.get('preview');

  useEffect(() => {
    if (previewId) {
      const found = trainers.find(t => t._id === previewId);
      if (found) {
        setViewingTrainer(found);
        const newParams = new URLSearchParams(window.location.search);
        newParams.delete('preview');
        const cleanPath = window.location.pathname + (newParams.toString() ? '?' + newParams.toString() : '');
        window.history.replaceState(null, '', cleanPath);
      } else {
        trainersApi.getAll(`search=${previewId}`).then(res => {
          if (res.success && res.data.length > 0) {
            setViewingTrainer(res.data[0]);
          }
          const newParams = new URLSearchParams(window.location.search);
          newParams.delete('preview');
          const cleanPath = window.location.pathname + (newParams.toString() ? '?' + newParams.toString() : '');
          window.history.replaceState(null, '', cleanPath);
        }).catch(err => console.error(err));
      }
    }
  }, [previewId, trainers]);

  const [form, setForm] = useState({
    name: '',
    specialties: [],
    experienceYears: '',
    phone: '',
    gender: 'male',
    trainerType: 'Normal Trainer',
    shiftStart: '06:00',
    shiftEnd: '22:00',
    joinDate: new Date().toISOString().split('T')[0],
    salary: '',
    commission: '',
    timeSlot: ''
  });

  const shiftOptions = useMemo(() => {
    const slots = (user?.timeSlots || []).filter(s => s.status === 'Active' || s.status === 'active' || !s.status);
    const options = slots.map(s => ({
      label: `${s.name} (${formatTime12(s.startTime)} - ${formatTime12(s.endTime)})`,
      value: s.name
    }));
    options.push({ label: 'Custom Working Hours...', value: 'custom' });
    return options;
  }, [user?.timeSlots]);

  const currentShiftVal = useMemo(() => {
    if (form.timeSlot) return form.timeSlot;
    const slots = (user?.timeSlots || []).filter(s => s.status === 'Active' || s.status === 'active' || !s.status);
    const matchedSlot = slots.find(s => s.startTime === form.shiftStart && s.endTime === form.shiftEnd);
    return matchedSlot ? matchedSlot.name : 'custom';
  }, [user?.timeSlots, form.timeSlot, form.shiftStart, form.shiftEnd]);

  const fetchTrainers = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const query = `search=${debouncedSearch}&specialty=${filter}&sort=${sortBy}&limit=1000`;
      const res = await trainersApi.getAll(query);
      if (res.success) setTrainers(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchPlans = async () => {
    try {
      const res = await plansApi.getAll();
      if (res.success) setPlans(res.data);
    } catch (err) { console.error(err); }
  };

  const [paidSalaries, setPaidSalaries] = useState([]);

  const fetchPaidSalaries = async () => {
    try {
      const res = await expensesApi.getAll('category=Salary&limit=200');
      if (res.success) setPaidSalaries(res.data);
    } catch (err) { console.error('Error fetching paid salaries:', err); }
  };

  const isTrainerPaidThisMonth = (trainerName) => {
    if (!trainerName) return false;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return paidSalaries.some(exp => {
      if (exp.category !== 'Salary') return false;
      const expDate = new Date(exp.date);
      if (expDate.getMonth() !== currentMonth || expDate.getFullYear() !== currentYear) return false;
      return exp.title && exp.title.toLowerCase().includes(trainerName.toLowerCase());
    });
  };

  // Dynamically fetch the latest user settings/slots on mount to ensure fresh synchronization
  useEffect(() => {
    authApi.getMe().then(res => {
      if (res.success && res.user && updateUser) {
        updateUser(res.user);
      }
    }).catch(err => console.error('Failed to sync timeSlots in trainers page:', err));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchTrainers();
    fetchPlans();
    fetchPaidSalaries();
  }, [debouncedSearch, filter, sortBy]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.phone || !form.phone.trim()) {
      showToast('Phone number is required.', 'error');
      return;
    }
    if (!validatePhone(form.phone)) {
      showToast('Phone number must be exactly 10 digits (no spaces, letters, or special characters).', 'error');
      return;
    }
    try {
      const data = { ...form };
      if (data.timeSlot === 'custom') {
        data.timeSlot = '';
      }
      if (form.experienceYears) {
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - parseInt(form.experienceYears));
        data.experienceStartDate = startDate;
      }

      const compSettings = user?.trainerCompensation || {
        normal: { baseSalary: 12000, commission: 0 },
        ptOnly: { baseSalary: 0, commission: 50 },
        ptAndTrainer: { baseSalary: 10000, commission: 40 }
      };

      if (!user?.trainerCompensation?.allowCustomStructure) {
        if (form.trainerType === 'Normal Trainer') {
          data.salary = compSettings.normal.baseSalary;
          data.commission = compSettings.normal.commission;
        } else if (form.trainerType === 'PT Trainer') {
          data.salary = compSettings.ptOnly.baseSalary;
          data.commission = compSettings.ptOnly.commission;
        } else if (form.trainerType === 'PT + Trainer') {
          data.salary = compSettings.ptAndTrainer.baseSalary;
          data.commission = compSettings.ptAndTrainer.commission;
        }
      } else {
        data.salary = Number(data.salary) || 0;
        data.commission = Number(data.commission) || 0;
      }

      if (editingTrainer) {
        await trainersApi.update(editingTrainer._id, data);
      } else {
        await trainersApi.create(data);
      }
      setShowModal(false);
      setForm({ name: '', specialties: [], experienceYears: '', phone: '', gender: 'male', trainerType: user?.trainerCompensation?.normal?.isActive !== false ? 'Normal Trainer' : user?.trainerCompensation?.ptOnly?.isActive !== false ? 'PT Trainer' : 'PT + Trainer', shiftStart: '06:00', shiftEnd: '22:00', joinDate: new Date().toISOString().split('T')[0], salary: '', commission: '', timeSlot: '' });
      setEditingTrainer(null);
      fetchTrainers(true);
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('limit')) {
        setLimitReachedState({
          title: 'Plan Limit Reached',
          message: err.message
        });
      } else {
        showToast(err.message, 'error');
      }
    }
  };

  const handleDelete = (id) => {
    setDeletePayments(false);
    setDeleteConfirmState({
      id,
      title: "Delete Trainer",
      message: "Are you sure you want to delete this trainer? All their profile details will be permanently removed."
    });
  };

  const handleToggleStatus = async (id) => {
    try {
      await trainersApi.toggleStatus(id);
      fetchTrainers(true);
    } catch (err) { showToast(err.message, 'error'); }
  };

  const toggleSpecialty = (s) => {
    setForm(prev => ({
      ...prev,
      specialties: prev.specialties.includes(s)
        ? prev.specialties.filter(x => x !== s)
        : [...prev.specialties, s]
    }));
  };

  const calculateExperience = (startDate) => {
    if (!startDate) return 0;
    const start = new Date(startDate);
    const now = new Date();
    let years = now.getFullYear() - start.getFullYear();
    const m = now.getMonth() - start.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < start.getDate())) {
      years--;
    }
    return Math.max(0, years);
  };

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortBy(`-${key}`);
    } else if (sortBy === `-${key}`) {
      setSortBy('-createdAt');
    } else {
      setSortBy(key);
    }
  };

  const SortHeader = ({ label, sortKey, className = "" }) => {
    const isActive = sortBy === sortKey || sortBy === `-${sortKey}`;
    const isDesc = sortBy === `-${sortKey}`;

    return (
      <th
        className={`px-6 py-3 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] cursor-pointer hover:text-white transition-colors group ${className}`}
        onClick={() => handleSort(sortKey)}
      >
        <div className="flex items-center gap-1.5">
          {label}
          <div className={`transition-all ${isActive ? 'text-accent opacity-100' : 'opacity-30 group-hover:opacity-60'}`}>
            {isActive ? (
              isDesc ? <ChevronDown size={12} strokeWidth={3} /> : <ChevronUp size={12} strokeWidth={3} />
            ) : (
              <ChevronsUpDown size={12} strokeWidth={3} />
            )}
          </div>
        </div>
      </th>
    );
  };

  const memberStatusBadge = (m) => {
    const now = new Date();
    const expiry = new Date(m.planExpiry);
    const isExpired = expiry < now;
    if (isExpired) return <Badge variant="danger" size="xs">Expired</Badge>;
    const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) return <Badge variant="warning" size="xs">Expires in {diffDays}d</Badge>;
    return <Badge variant="success" size="xs">Active</Badge>;
  };

  // Dynamic PT Business Strength Calculations for Card 2, 3, & 4
  const ptStats = useMemo(() => {
    const today = new Date();
    const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    const next30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const next7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    let activeClients = 0;
    let currentRevenue = 0;
    let lastMonthRevenue = 0;

    let expiringCount = 0;
    let renewalValue = 0;
    let expiringThisWeek = 0;

    let totalTrainerPayout = 0;
    let topEarnerName = 'None';
    let topEarnerAmount = 0;

    trainers.forEach(t => {
      if (t.status === 'inactive') return; // Skip inactive/deactivated trainers

      // 1. Process assigned members for revenue and expiry
      if (t.assignedMembers) {
        t.assignedMembers.forEach(m => {
          if (!m.planExpiry) return;
          const expiry = new Date(m.planExpiry);
          const isActive = expiry >= today;

          // Count active PT clients
          if (isActive) {
            activeClients++;
          }

          // Get monthly distributed plan value
          let planMonths = 1;
          const matchedPlan = plans.find(p => p.name === m.plan);
          if (matchedPlan) {
            planMonths = matchedPlan.durationMonths || 1;
          } else if (m.joinDate) {
            const diffDays = Math.ceil(Math.abs(expiry - new Date(m.joinDate)) / (1000 * 60 * 60 * 24));
            planMonths = Math.max(1, Math.round(diffDays / 30));
          }
          const monthlyVal = (m.planAmount || 0) / planMonths;

          // Sum active PT package monthly values
          if (isActive) {
            currentRevenue += monthlyVal;
          }

          // Sum last month PT package monthly values
          if (m.joinDate) {
            const join = new Date(m.joinDate);
            const wasActiveLastMonth = join <= lastMonthDate && expiry >= lastMonthDate;
            if (wasActiveLastMonth) {
              lastMonthRevenue += monthlyVal;
            }
          }

          // Active plans nearing expiry (within 30 days)
          if (expiry >= today && expiry <= next30Days) {
            expiringCount++;
            renewalValue += (m.planAmount || 0);

            // Expiring this week (within 7 days)
            if (expiry <= next7Days) {
              expiringThisWeek++;
            }
          }
        });
      }

      // 2. Calculate monthly PT commissions and base salary for payout
      let trainerCommission = 0;
      if (t.commission && t.commission > 0 && t.assignedMembers) {
        trainerCommission = t.assignedMembers.reduce((sum, m) => {
          if (!m.planExpiry) return sum;
          const expiry = new Date(m.planExpiry);
          if (expiry < today) return sum; // Only count active plans!

          let planMonths = 1;
          let ptAmount = 0;
          const matchedPlan = plans.find(p => p.name === m.plan);
          if (matchedPlan) {
            planMonths = matchedPlan.durationMonths || 1;
            if (matchedPlan.hasPtPricing) {
              ptAmount = matchedPlan.ptDiscountedPrice || matchedPlan.ptActualPrice || 0;
            }
          } else if (m.joinDate && m.planExpiry) {
            const diffDays = Math.ceil(Math.abs(new Date(m.planExpiry) - new Date(m.joinDate)) / (1000 * 60 * 60 * 24));
            planMonths = Math.max(1, Math.round(diffDays / 30));
          }
          return sum + (((ptAmount) * (t.commission / 100)) / planMonths);
        }, 0);
      }

      const trainerTotalPayout = (t.salary || 0) + Math.round(trainerCommission);
      totalTrainerPayout += trainerTotalPayout;

      if (trainerTotalPayout > topEarnerAmount) {
        topEarnerAmount = trainerTotalPayout;
        topEarnerName = t.name;
      }
    });

    let growth = 0;
    if (lastMonthRevenue > 0) {
      growth = Math.round(((currentRevenue - lastMonthRevenue) / lastMonthRevenue) * 100);
    } else if (currentRevenue > 0) {
      growth = 100;
    }

    const formatLakhOrK = (val) => {
      if (val >= 100000) {
        return `₹${(val / 100000).toFixed(1).replace('\.0', '')}L`;
      }
      if (val >= 1000) {
        return `₹${(val / 1000).toFixed(1).replace('\.0', '')}k`;
      }
      return `₹${Math.round(val).toLocaleString()}`;
    };

    return {
      activeClients,
      revenueFormatted: formatLakhOrK(currentRevenue),
      growth,
      expiringCount,
      renewalValueFormatted: formatLakhOrK(renewalValue),
      expiringThisWeek,
      trainerPayoutFormatted: formatLakhOrK(totalTrainerPayout),
      topEarnerName,
      topEarnerAmountFormatted: formatLakhOrK(topEarnerAmount)
    };
  }, [trainers, plans]);

  return (
    <div className="pb-2 relative">
      {/* Toast Notifications */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between min-w-[320px] w-auto max-w-[500px] p-3.5 rounded-2xl shadow-2xl font-bold uppercase tracking-wider text-[10px] bg-[#0d0d0d]/90 backdrop-blur-md text-white border transition-all duration-300 transform scale-100 ${toast.type === 'success' ? 'border-success/30 text-success' :
              toast.type === 'warning' ? 'border-yellow-500/30 text-yellow-500' :
                'border-danger/30 text-danger'
              }`}
          >
            <div className="flex items-center gap-2.5 flex-1">
              {toast.type === 'success' && <Check size={14} className="shrink-0 text-success" />}
              {toast.type === 'warning' && <Activity size={14} className="shrink-0 text-yellow-500" />}
              {toast.type === 'error' && <XCircle size={14} className="shrink-0 text-danger" />}
              <span>{toast.message}</span>
            </div>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer ml-4 shrink-0 text-white">
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Main Bundle Card */}
      <div className="bg-bg-card border border-white/5 rounded-xl shadow-2xl flex flex-col">

        {/* Top Header & Stats Row */}
        <div className="py-4 px-6 border-b border-white/5 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-text-primary tracking-tight">Trainers</h1>
              <div className="flex items-center gap-2 text-[10px] font-black text-text-muted uppercase tracking-widest mt-1 opacity-70">

                Listing <span className="text-white">{filteredTrainers.length}</span> expert coaches
              </div>
            </div>
            <div className="flex items-center gap-3">
              <SearchBar value={search} onChange={setSearch} placeholder="Search trainers..." />

              {/* Calendar Filter Dropdown Button */}
              <div className="relative" id="date-filter-container">
                <button
                  onClick={() => setShowDateFilterPopover(!showDateFilterPopover)}
                  className={`flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${dateFilterType !== 'all' ? 'border-accent/40 bg-accent/5 text-accent shadow-lg shadow-accent/5' : ''}`}
                >
                  <Calendar size={14} className={dateFilterType !== 'all' ? 'text-accent' : 'text-text-muted'} />
                  <span>{getDateFilterLabel()}</span>
                  {dateFilterType !== 'all' ? (
                    <X
                      size={12}
                      className="ml-1 hover:text-white transition-colors cursor-pointer text-text-muted"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDateFilterType('all');
                        setShowDateFilterPopover(false);
                      }}
                    />
                  ) : (
                    <ChevronDown size={12} className="text-text-muted opacity-60 group-hover:opacity-100 transition-opacity ml-1" />
                  )}
                </button>

                {showDateFilterPopover && (
                  <>
                    <div className="fixed inset-0 z-[110]" onClick={() => setShowDateFilterPopover(false)} />
                    <div className="absolute right-0 mt-2 z-[120] bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-white/10 rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl w-80 space-y-4">
                      <div>
                        <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2">Filter By Date</h4>
                        <Select
                          value={dateFilterType}
                          searchable={false}
                          options={[
                            { label: 'All Time', value: 'all' },
                            { label: 'Specific Date', value: 'date' },
                            { label: 'Specific Month', value: 'month' },
                            { label: 'Complete Year', value: 'year' },
                            { label: 'Custom Range', value: 'range' },
                          ]}
                          onChange={(val) => setDateFilterType(val)}
                        />
                      </div>

                      {/* Dynamic fields based on selection */}
                      {dateFilterType === 'date' && (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                          <p className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Select Date</p>
                          <DatePicker
                            value={selectedDate}
                            onChange={setSelectedDate}
                            placeholder="Pick a Date"
                            className="w-full"
                          />
                        </div>
                      )}

                      {dateFilterType === 'month' && (
                        <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="space-y-1.5">
                            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Month</p>
                            <Select
                              value={selectedMonth}
                              searchable={false}
                              options={[
                                { label: 'January', value: '0' },
                                { label: 'February', value: '1' },
                                { label: 'March', value: '2' },
                                { label: 'April', value: '3' },
                                { label: 'May', value: '4' },
                                { label: 'June', value: '5' },
                                { label: 'July', value: '6' },
                                { label: 'August', value: '7' },
                                { label: 'September', value: '8' },
                                { label: 'October', value: '9' },
                                { label: 'November', value: '10' },
                                { label: 'December', value: '11' }
                              ]}
                              onChange={setSelectedMonth}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Year</p>
                            <Select
                              value={selectedYear}
                              searchable={false}
                              options={Array.from({ length: 5 }, (_, i) => {
                                const y = (new Date().getFullYear() - 2 + i).toString();
                                return { label: y, value: y };
                              })}
                              onChange={setSelectedYear}
                            />
                          </div>
                        </div>
                      )}

                      {dateFilterType === 'year' && (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                          <p className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Select Year</p>
                          <Select
                            value={selectedYear}
                            searchable={false}
                            options={Array.from({ length: 5 }, (_, i) => {
                              const y = (new Date().getFullYear() - 2 + i).toString();
                              return { label: y, value: y };
                            })}
                            onChange={setSelectedYear}
                          />
                        </div>
                      )}

                      {dateFilterType === 'range' && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="space-y-1.5">
                            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Start Date</p>
                            <DatePicker
                              value={selectedRangeStart}
                              onChange={setSelectedRangeStart}
                              placeholder="From Date"
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">End Date</p>
                            <DatePicker
                              value={selectedRangeEnd}
                              onChange={setSelectedRangeEnd}
                              placeholder="To Date"
                              className="w-full"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2 border-t border-white/5">
                        <button
                          onClick={() => {
                            setDateFilterType('all');
                            setShowDateFilterPopover(false);
                          }}
                          className="flex-1 py-2 text-[9px] font-black uppercase tracking-wider rounded-xl bg-white/5 text-text-muted hover:bg-white/10 hover:text-white transition-all text-center"
                        >
                          Reset
                        </button>
                        <button
                          onClick={() => setShowDateFilterPopover(false)}
                          className="flex-1 py-2 text-[9px] font-black uppercase tracking-wider rounded-xl bg-accent text-black hover:bg-accent-hover transition-all text-center"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => { setForm({ name: '', specialties: [], experienceYears: '', phone: '', gender: 'other', trainerType: user?.trainerCompensation?.normal?.isActive !== false ? 'Normal Trainer' : user?.trainerCompensation?.ptOnly?.isActive !== false ? 'PT Trainer' : 'PT + Trainer', shiftStart: '06:00', shiftEnd: '22:00', joinDate: new Date().toISOString().split('T')[0], salary: '', commission: '', timeSlot: '' }); setShowModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-black rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-lg shadow-accent/20 active:scale-95 whitespace-nowrap"
              >
                <UserPlus size={14} /> Add Trainer
              </button>
            </div>
          </div>

          {/* Stats Bar (Compact) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              icon={<Dumbbell size={14} className="text-accent" />}
              label="Total Trainers"
              value={trainers.length}
              onClick={() => { setFilter('all'); setSortBy('-createdAt'); setSearch(''); }}
              trend={
                <div className="flex flex-col items-end gap-1 pb-[1px] whitespace-nowrap">
                  <span className="text-[9px] font-black uppercase tracking-tight text-success">
                    {trainers.filter(t => t.status !== 'inactive').length} Active Coaches
                  </span>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tight bg-accent/10 text-accent border border-accent/20">
                    <span>{trainers.filter(t => (t.trainerType === 'PT Trainer' || t.trainerType === 'PT + Trainer') && t.status !== 'inactive').length} PT Specialists</span>
                  </div>
                </div>
              }
              size="xs"
              flyInDirection="right"
              className="!bg-white/[0.02] border-white/5"
            />

            <StatCard
              icon={<Users size={14} className="text-accent" />}
              label="Active PT Clients"
              value={ptStats.activeClients}
              onClick={() => { setSortBy('-clientCount'); setFilter('all'); setSearch(''); }}
              trend={
                <div className="flex flex-col items-end gap-1 pb-[1px] whitespace-nowrap">
                  <span className="text-[9px] font-black uppercase tracking-tight text-accent">
                    {(ptStats.activeClients / (trainers.filter(t => (t.trainerType === 'PT Trainer' || t.trainerType === 'PT + Trainer') && t.status !== 'inactive').length || 1)).toFixed(1)} avg clients/coach
                  </span>
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tight ${ptStats.growth >= 0 ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'}`}>
                    {ptStats.growth >= 0 ? <TrendingUp size={8} strokeWidth={3} /> : <TrendingDown size={8} strokeWidth={3} />}
                    <span>{ptStats.growth >= 0 ? '+' : ''}{ptStats.growth}% Growth</span>
                  </div>
                </div>
              }
              size="xs"
              flyInDirection="bottom"
              className="!bg-white/[0.02] border-white/5"
            />

            <StatCard
              icon={<Calendar size={14} className="text-accent" />}
              label="PT Plans Expiring"
              value={ptStats.expiringCount}
              onClick={() => { setSortBy('-clientCount'); setFilter('all'); setSearch(''); }}
              trend={
                <div className="flex flex-col items-end gap-1 pb-[1px] whitespace-nowrap">
                  <span className="text-[9px] font-black uppercase tracking-tight text-danger">
                    {ptStats.renewalValueFormatted} Renewal Value
                  </span>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tight bg-warning/10 text-warning border border-warning/20">
                    <TrendingUp size={8} strokeWidth={3} />
                    <span>{ptStats.expiringThisWeek} Expiring This Week</span>
                  </div>
                </div>
              }
              size="xs"
              flyInDirection="top"
              className="!bg-white/[0.02] border-white/5"
            />

            <StatCard
              icon={<Banknote size={14} className="text-accent" />}
              label="PT Revenue"
              value={ptStats.revenueFormatted}
              onClick={() => { setSortBy('-salary'); setFilter('all'); setSearch(''); }}
              trend={
                <div className="flex flex-col items-end gap-1 pb-[1px] whitespace-nowrap">
                  <span className="text-[9px] font-black uppercase tracking-tight text-info">
                    {ptStats.trainerPayoutFormatted} Payouts
                  </span>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tight bg-info/10 text-info border border-info/20">
                    <IndianRupee size={8} strokeWidth={3} />
                    <span>Top: {ptStats.topEarnerName}</span>
                  </div>
                </div>
              }
              size="xs"
              flyInDirection="left"
              className="!bg-white/[0.02] border-white/5"
            />
          </div>
        </div>

        {/* Trainers Table */}
        {loading ? null : trainers.length === 0 ? (
          <EmptyState icon={<Dumbbell size={48} className="text-text-muted opacity-50" />} title="No trainers found" description="Try adjusting your filters or search" />
        ) : (
          <div className="max-h-[292px] overflow-y-auto relative rounded-2xl border border-white/5">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0a0a0a] z-10 border-b border-white/5 shadow-md">
                <tr className="bg-white/[0.02]">
                  <th className="px-5 py-2 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] w-12 text-center">#</th>
                  <SortHeader label="Trainer" sortKey="name" />
                  <th className="px-4 py-2 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Specialist</th>
                  <th className="px-4 py-2 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Contact</th>
                  <SortHeader label="Working Hours" sortKey="shiftStart" />
                  <SortHeader label="Compensation" sortKey="salary" />
                  <th className="px-4 py-2 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Salary Status</th>
                  <SortHeader label="Clients" sortKey="clientCount" />
                  <th className="px-4 py-2 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTrainers.map((t, idx) => {
                  const toggleOn = t.status !== 'inactive';
                  const isGray = !toggleOn;

                  return (
                    <tr
                      key={t._id}
                      onClick={() => setViewingTrainer(t)}
                      className={`group transition-all cursor-pointer border-b border-white/5 ${isGray ? 'bg-white/[0.01]' : 'hover:bg-white/[0.02]'}`}
                    >
                      <td className={`px-5 py-2 text-center ${isGray ? 'opacity-50 grayscale-[0.8]' : ''}`}>
                        <span className="text-[10px] font-black text-text-muted group-hover:text-accent transition-colors">{idx + 1}</span>
                      </td>
                      <td className={`px-6 py-2.5 ${isGray ? 'opacity-50 grayscale-[0.8]' : ''}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] shadow-lg group-hover:scale-110 transition-transform ${t.gender === 'female' ? 'bg-gradient-to-br from-pink-500/20 to-pink-500/5 text-pink-200 border border-pink-500/10' :
                            t.gender === 'male' ? 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-blue-200 border border-blue-500/10' :
                              'bg-gradient-to-br from-white/10 to-white/5 text-white border-white/5'
                            }`}>
                            {t.name[0]}
                          </div>
                          <div>
                            <p className={`text-xs font-black transition-colors ${t.gender === 'female' ? 'text-pink-200 group-hover:text-pink-100' :
                              t.gender === 'male' ? 'text-blue-200 group-hover:text-blue-100' :
                                'text-white group-hover:text-accent'
                              }`}>{t.name}</p>
                            <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider mt-0.5">
                              {calculateExperience(t.experienceStartDate)}Y Exp
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className={`px-4 py-2 ${isGray ? 'opacity-50 grayscale-[0.8]' : ''}`}>
                        <p className="text-[10px] font-semibold text-text-secondary line-clamp-1">
                          {t.specialties.length > 1 ? t.specialties[0] + " +" + (t.specialties.length - 1) : t.specialties[0] || '-'}
                        </p>
                      </td>
                      <td className={`px-4 py-2 ${isGray ? 'opacity-50 grayscale-[0.8]' : ''}`}>
                        <p className="text-[11px] font-bold text-text-secondary leading-none">{t.phone || '-'}</p>
                      </td>
                      <td className={`px-4 py-2 ${isGray ? 'opacity-50 grayscale-[0.8]' : ''}`}>
                        <div className="flex flex-col">
                          <p className="text-[11px] font-bold text-text-secondary leading-none uppercase">
                            {formatTime12(t.shiftStart || '06:00')} - {formatTime12(t.shiftEnd || '22:00')}
                          </p>
                          {t.timeSlot && t.timeSlot !== 'custom' && (
                            <p className="text-[8px] font-black text-text-muted uppercase tracking-wider mt-0.5">
                              {t.timeSlot}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className={`px-6 py-2.5 ${isGray ? 'opacity-50 grayscale-[0.8]' : ''}`}>
                        <div className="flex flex-col">
                          <p className="text-xs font-black text-white">₹{(t.salary || 0).toLocaleString()}</p>
                          {t.commission > 0 && <p className="text-[10px] font-bold text-accent">+{t.commission}% PT</p>}
                        </div>
                      </td>
                      <td className={`px-6 py-2.5 ${isGray ? 'opacity-50 grayscale-[0.8]' : ''}`}>
                        {isTrainerPaidThisMonth(t.name) ? (
                          <span className="text-[10px] font-black text-success uppercase tracking-widest">Paid</span>
                        ) : (
                          <span className="text-[10px] font-black text-danger uppercase tracking-widest">Unpaid</span>
                        )}
                      </td>
                      <td className={`px-6 py-2.5 ${isGray ? 'opacity-50 grayscale-[0.8]' : ''}`}>
                        {t.trainerType === 'Normal Trainer' ? (
                          <div 
                            className="text-text-muted text-xs font-bold cursor-default w-fit"
                            title="No clients for normal trainer"
                          >
                            -
                          </div>
                        ) : (
                          <div
                            onClick={(e) => { e.stopPropagation(); if ((t.clientCount || 0) > 0) setViewingClients(t); }}
                            className={`flex items-center gap-1.5 transition-all ${(t.clientCount || 0) > 0 ? 'hover:text-accent cursor-pointer' : 'opacity-40 cursor-default'}`}
                          >
                            <Users size={12} className={(t.clientCount || 0) > 0 ? 'text-accent' : 'text-text-muted'} />
                            <span className={`text-xs font-black ${(t.clientCount || 0) > 0 ? 'text-white' : 'text-text-muted'}`}>{t.clientCount || 0}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-2.5 text-right relative" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end">
                          <button
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              // Determine whether to show above or below based on screen height
                              const showAbove = rect.bottom + 260 > window.innerHeight;
                              const y = showAbove ? rect.top - 260 : rect.bottom + 8;
                              const x = rect.right - 192; // 192px is w-48

                              if (openMenuId === t._id) {
                                setOpenMenuId(null);
                                setActiveMenu(null);
                              } else {
                                setOpenMenuId(t._id);
                                setActiveMenu({
                                  id: t._id,
                                  x,
                                  y,
                                  data: t
                                });
                              }
                            }}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${openMenuId === t._id ? 'bg-accent text-black shadow-lg shadow-accent/20' : 'bg-white/5 text-text-muted hover:bg-white/10 hover:text-white'}`}
                          >
                            <MoreVertical size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewingTrainer && (
        <Modal isOpen={!!viewingTrainer} onClose={() => { setViewingTrainer(null); setShowPaymentHistory(false); }} title={showPaymentHistory ? "Payment History - " + viewingTrainer.name : "Trainer Profile"} size="md">
          {viewingTrainer && (
            <div className="space-y-4">
              {showPaymentHistory ? (
                <div className="space-y-4">
                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                    {(() => {
                      const payments = paidSalaries.filter(exp => {
                        if (exp.category !== 'Salary') return false;
                        return exp.title && exp.title.toLowerCase().includes(viewingTrainer.name.toLowerCase());
                      }).sort((a, b) => new Date(b.date) - new Date(a.date));

                      if (payments.length === 0) {
                        return (
                          <div className="py-8 text-center text-text-muted text-xs font-bold uppercase tracking-widest opacity-60">
                            No salary payments recorded.
                          </div>
                        );
                      }

                      return payments.map((p) => (
                        <div key={p._id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-xs font-black text-white">{p.title}</p>
                            <p className="text-[10px] text-text-muted mt-1 font-bold">
                              {new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              {p.notes && " • " + p.notes}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-black text-accent">₹{(p.amount || 0).toLocaleString()}</p>
                            <p className="text-[9px] font-black text-text-muted uppercase tracking-wider mt-0.5">{p.paymentMethod || 'cash'}</p>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>

                  <div className="h-px bg-white/5 mx-2" />

                  <button
                    onClick={() => setShowPaymentHistory(false)}
                    className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white px-6 py-3.5 rounded-xl font-black uppercase tracking-widest text-[11px] border border-white/5 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    ← Back to Profile
                  </button>
                </div>
              ) : (
                <>
                  {/* Header / Primary Info */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-2xl ${viewingTrainer.gender === 'female' ? 'bg-gradient-to-br from-pink-500/20 to-pink-500/5 text-pink-200 border border-pink-500/10' :
                        viewingTrainer.gender === 'male' ? 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-blue-200 border border-blue-500/10' :
                          'bg-gradient-to-br from-white/10 to-white/5 text-white border-white/5'
                        }`}>
                        {viewingTrainer.name[0]}
                      </div>
                      <div>
                        <h3 className="text-[15px] font-black text-white leading-tight">{viewingTrainer.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-bold text-text-muted">{viewingTrainer.phone}</span>
                          <div className="w-1 h-1 rounded-full bg-white/10" />
                          <span className="text-[11px] font-bold text-text-muted uppercase tracking-tighter italic">{viewingTrainer.gender}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${viewingTrainer.status === 'inactive' ? 'bg-danger/10 text-danger border border-danger/20' : 'bg-success/10 text-success border border-success/20'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${viewingTrainer.status === 'inactive' ? 'bg-danger' : 'bg-success'}`} />
                        {viewingTrainer.status === 'inactive' ? 'Inactive' : 'Active'}
                      </div>
                      <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mt-1">Status</p>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col items-center text-center">
                      <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Experience</p>
                      <p className="text-[12px] font-black text-accent uppercase">{calculateExperience(viewingTrainer.experienceStartDate)} Years</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col items-center text-center">
                      <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Pay ({viewingTrainer.trainerType})</p>
                      <p className="text-[12px] font-black text-white">₹{(viewingTrainer.salary || 0).toLocaleString()} {viewingTrainer.commission > 0 && <span className="text-accent ml-1">+{viewingTrainer.commission}% PT</span>}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col items-center text-center">
                      <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Clients</p>
                      <p className="text-[12px] font-black text-success">{viewingTrainer.clientCount || 0}</p>
                    </div>
                  </div>

                  {/* Shift & Info */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 space-y-3">
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Shift Schedule</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-text-secondary">Working Hours</span>
                        <span className="text-[11px] font-black text-white italic uppercase">{viewingTrainer.timeSlot && viewingTrainer.timeSlot !== 'custom' ? `${viewingTrainer.timeSlot} (${formatTime12(viewingTrainer.shiftStart)} - ${formatTime12(viewingTrainer.shiftEnd)})` : `${formatTime12(viewingTrainer.shiftStart || '06:00')} - ${formatTime12(viewingTrainer.shiftEnd || '22:00')}`}</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 space-y-3">
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Joining Details</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-text-secondary">Joined On</span>
                        <span className="text-[11px] font-black text-white italic">
                          {viewingTrainer.joinDate ? new Date(viewingTrainer.joinDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Specialties */}
                  <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3">Specializations</p>
                    <div className="flex flex-wrap gap-1.5">
                      {viewingTrainer.specialties.map(s => (
                        <span key={s} className="px-2.5 py-1 rounded-lg bg-accent/10 text-accent text-[10px] font-black uppercase tracking-wider border border-accent/20">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-white/5 mx-2" />

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setForm({ ...viewingTrainer, experienceYears: calculateExperience(viewingTrainer.experienceStartDate), salary: viewingTrainer.salary || '', shiftStart: viewingTrainer.shiftStart || '06:00', shiftEnd: viewingTrainer.shiftEnd || '22:00', joinDate: viewingTrainer.joinDate ? new Date(viewingTrainer.joinDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], timeSlot: viewingTrainer.timeSlot || '' });
                        setEditingTrainer(viewingTrainer);
                        setViewingTrainer(null);
                        setShowModal(true);
                      }}
                      className="flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-black px-6 py-3.5 rounded-xl font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-accent/10 flex-1 transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <Edit3 size={16} /> Edit Profile
                    </button>
                    <button
                      onClick={() => setShowPaymentHistory(true)}
                      className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white px-6 py-3.5 rounded-xl font-black uppercase tracking-widest text-[11px] flex-1 border border-white/5 transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <Banknote size={16} /> Payments
                    </button>
                    <button
                      onClick={() => setViewingTrainer(null)}
                      className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white px-6 py-3.5 rounded-xl font-black uppercase tracking-widest text-[11px] flex-1 border border-white/5 transition-all active:scale-[0.98] cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* Clients List Modal */}
      {/* Combined Trainer Clients & Member Detail Modal */}
      {viewingClients && (
        <Modal
          isOpen={!!viewingClients}
          title={viewingMember ? "Member Profile" : `${viewingClients.name}'s Members`}
          onBack={viewingMember ? () => setViewingMember(null) : null}
          onClose={() => { setViewingClients(null); setViewingMember(null); }}
          size="md"
        >
          <div className="overflow-hidden relative">
            <div
              className="flex transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1)"
              style={{ transform: viewingMember ? 'translateX(-100%)' : 'translateX(0)' }}
            >
              {/* View 1: Assigned Members List */}
              <div className="min-w-full space-y-4 py-2">
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-2">
                  <p className="text-[11px] font-black text-text-muted uppercase tracking-widest">
                    Assigned Members ({viewingClients.clientCount})
                  </p>
                </div>

                <div className="space-y-2 max-h-[450px] overflow-y-auto no-scrollbar pr-1">
                  {(viewingClients.assignedMembers || []).map((m, idx) => {
                    const now = new Date();
                    const expiry = new Date(m.planExpiry);
                    const isExpired = expiry < now;
                    const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
                    const isExpiring = !isExpired && diffDays <= 3;

                    return (
                      <div
                        key={m._id}
                        onClick={() => setViewingMember(m)}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-accent/30 transition-all group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-[11px] border border-white/5 group-hover:scale-110 transition-transform ${m.gender === 'female' ? 'bg-pink-500/10 text-pink-200' : 'bg-blue-500/10 text-blue-200'}`}>
                            {m.name[0]}
                          </div>
                          <div>
                            <p className="text-xs font-black text-white">{m.name}</p>
                            <p className="text-[10px] text-text-muted font-bold">{m.phone}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-text-muted uppercase px-2 py-0.5 bg-white/5 rounded-md border border-white/5">{m.plan}</span>
                          {memberStatusBadge(m)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button onClick={() => setViewingClients(null)} className="w-full bg-white/5 hover:bg-white/10 text-white py-3.5 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all">Close</button>
              </div>

              {/* View 2: Member Profile Detail */}
              <div className="min-w-full space-y-2 py-0 px-1">
                {viewingMember && (
                  <div className="space-y-2.5">
                    {/* Header Info */}
                    <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.02] border border-white/5">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-2xl ${viewingMember.gender === 'female' ? 'bg-gradient-to-br from-pink-500/20 to-pink-500/5 text-pink-200 border border-pink-500/10' :
                          'bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-blue-200 border border-blue-500/10'
                          }`}>
                          {viewingMember.name[0]}
                        </div>
                        <div>
                          <h3 className="text-[15px] font-black text-white leading-tight">
                            {viewingMember.name} <span className="text-text-muted font-bold text-[12px] capitalize">({viewingMember.gender || 'N/A'})</span>
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] font-bold text-text-muted">{viewingMember.phone}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={viewingMember.status === 'active' ? 'success' : 'secondary'} size="sm" className="font-black uppercase tracking-wider text-[9px] px-2.5 py-1 border border-white/5">
                          {viewingMember.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>

                    {/* Membership Plan Details Card */}
                    {(() => {
                      const now = new Date();
                      const expiry = new Date(viewingMember.planExpiry);
                      const isExpired = expiry < now;
                      const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
                      const daysRemainingText = isExpired
                        ? `Expired ${Math.abs(diffDays)} days ago`
                        : `${diffDays} days remaining`;

                      // Check if it is a Personal Training plan
                      const isPtPlan = !!viewingMember.assignedTrainer || (viewingMember.plan || '').toLowerCase().includes('pt') || !!viewingMember.addPt || true;
                      const planTypeText = isPtPlan ? 'PT Plan' : 'Non-PT Plan';

                      // Calculate specific price if member plan includes PT
                      const getSpecificPricing = (member) => {
                        const total = member.planAmount || member.renewalAmount || 0;
                        if (!total) return '₹0';

                        // Look up plan matching member plan name in the plans state array
                        const matchedPlan = plans.find(p => p.name.toLowerCase() === (member.plan || '').toLowerCase());
                        if (matchedPlan) {
                          const base = matchedPlan.discountedPrice || 0;
                          const pt = matchedPlan.ptDiscountedPrice || 0;
                          if (base + pt === total) {
                            return `₹${base} + ₹${pt}(PT)`;
                          }
                        }

                        // Fallback: If it is a PT Plan, split 50/50
                        if (isPtPlan) {
                          const base = Math.floor(total / 2);
                          const pt = total - base;
                          return `₹${base} + ₹${pt}(PT)`;
                        }

                        return `₹${total.toLocaleString()}`;
                      };

                      const pricingDisplay = getSpecificPricing(viewingMember);

                      return (
                        <div className="relative overflow-hidden p-4 rounded-2xl border bg-white/[0.02] border-white/5 shadow-inner">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-muted leading-none">Membership Plan</p>
                              <h4 className="text-sm font-black text-white uppercase tracking-wider mt-1">{viewingMember.plan}</h4>
                              <p className={`text-[9px] font-black mt-1.5 uppercase tracking-[0.15em] ${isPtPlan ? 'text-accent' : 'text-text-muted'
                                }`}>
                                {planTypeText}
                              </p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${isExpired ? 'bg-danger/20 text-danger border-danger/10' : 'bg-success/20 text-success border-success/10'
                              }`}>
                              {isExpired ? 'Unpaid' : 'Paid'}
                            </span>
                          </div>

                          <div className="grid grid-cols-12 gap-2 pt-3 border-t border-white/5">
                            <div className="col-span-4">
                              <p className="text-[8px] font-black uppercase tracking-widest text-text-muted">Price</p>
                              <span className="text-[9.5px] font-black text-white mt-1 block whitespace-nowrap" title={pricingDisplay}>
                                {pricingDisplay}
                              </span>
                            </div>
                            <div className="col-span-4">
                              <p className="text-[8px] font-black uppercase tracking-widest text-text-muted">Expires On</p>
                              <span className="text-[9.5px] font-black text-white mt-1 block whitespace-nowrap">
                                {new Date(viewingMember.planExpiry).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                            <div className="col-span-4">
                              <p className="text-[8px] font-black uppercase tracking-widest text-text-muted">Validity</p>
                              <span className={`text-[9.5px] font-black mt-1 block uppercase whitespace-nowrap ${isExpired ? 'text-danger' : 'text-success'
                                }`}>
                                {daysRemainingText}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Details */}
                    <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 space-y-3">
                      <div className="flex items-center justify-between py-1 border-b border-white/5">
                        <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Age</span>
                        <span className="text-[11px] font-black text-white">
                          {(() => {
                            const dob = viewingMember.dob;
                            if (!dob) return viewingMember.age ? `${viewingMember.age} Years` : 'N/A';
                            const diffMs = Date.now() - new Date(dob).getTime();
                            const ageDt = new Date(diffMs);
                            const age = Math.abs(ageDt.getUTCFullYear() - 1970);
                            const formattedDob = new Date(dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                            return `${age} Years (${formattedDob})`;
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-white/5">
                        <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Preferred Slot</span>
                        <span className="text-[11px] font-black text-white uppercase">{viewingMember.timeSlot || 'Any Time'}</span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-white/5">
                        <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Enrolled Since</span>
                        <span className="text-[11px] font-black text-white">{new Date(viewingMember.joinDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Total Attendance</span>
                        <span className="text-[11px] font-black text-white">{viewingMember.totalAttendance || 0} Sessions</span>
                      </div>

                      {viewingMember.notes && (
                        <div className="pt-3 border-t border-white/5">
                          <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Trainer Notes</p>
                          <p className="text-[11px] text-text-secondary leading-relaxed italic">"${viewingMember.notes}"</p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        whatsappApi.sendTemplate({
                          phone: viewingMember.phone, templateId: 'payment_reminder',
                          variables: { name: viewingMember.name, expiry: new Date(viewingMember.planExpiry).toLocaleDateString(), plan: viewingMember.plan }
                        }).then(() => showToast('✅ Message sent!', 'success')).catch(err => showToast(err.message, 'error'));
                      }}
                      className="w-full flex items-center justify-center gap-1.5 bg-[#25d366]/10 hover:bg-[#25d366]/20 text-[#25d366] py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] border border-[#25d366]/20 transition-all active:scale-95"
                    >
                      <MessageCircle size={13} /> Send Alert
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {showModal && (
        <Modal
          isOpen={showModal}
          title={editingTrainer ? 'Update Trainer Profile' : 'Add New Trainer'}
          onClose={() => { setShowModal(false); setEditingTrainer(null); }}
          size="md"
          overflowVisible={true}
          titleClassName="!text-[20px] !font-normal"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              {/* Name & Phone Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Full Name *</p>
                  <input
                    placeholder="Full Name"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                    className="!py-2 !px-3 !text-[11px] !font-normal bg-white/[0.02] border border-white/5 rounded-xl text-white focus:border-accent/30 transition-all outline-none w-full"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Phone Number *</p>
                  <input
                    type="text"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    onInvalid={e => e.target.setCustomValidity('Phone number must be exactly 10 digits (no spaces, letters, or special characters).')}
                    onInput={e => e.target.setCustomValidity('')}
                    placeholder="Phone Number"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: cleanPhone(e.target.value) })}
                    required
                    className="!py-2 !px-3 !text-[11px] !font-normal bg-white/[0.02] border border-white/5 rounded-xl text-white focus:border-accent/30 transition-all outline-none w-full"
                  />
                </div>
              </div>

              {/* Gender Selection */}
              <div className="space-y-1">
                <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Gender *</p>
                <div className="flex gap-2">
                  {['male', 'female'].map(g => {
                    const isActive = form.gender === g;
                    let activeClasses = '';
                    if (isActive) {
                      if (g === 'female') {
                        activeClasses = 'bg-pink-500/20 border-pink-500/30 text-pink-200 shadow-[0_4px_20px_rgba(236,72,153,0.15)]';
                      } else if (g === 'male') {
                        activeClasses = 'bg-blue-500/20 border-blue-500/30 text-blue-200 shadow-[0_4px_20px_rgba(59,130,246,0.15)]';
                      } else {
                        activeClasses = 'bg-white/10 border-white/20 text-white shadow-[0_4px_20px_rgba(255,255,255,0.05)]';
                      }
                    } else {
                      activeClasses = 'bg-white/[0.01] border-white/5 text-text-muted hover:border-white/10 hover:text-text-secondary';
                    }

                    return (
                      <label key={g} className={`flex-1 flex items-center justify-center py-1.5 rounded-lg border transition-all cursor-pointer capitalize text-[11px] font-normal tracking-wide ${activeClasses}`}>
                        <input type="radio" name="gender" value={g} checked={isActive} onChange={e => setForm({ ...form, gender: e.target.value })} className="hidden" />
                        {g}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Joining Date & Experience */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Joining Date</p>
                  <DatePicker
                    value={form.joinDate}
                    onChange={(val) => setForm({ ...form, joinDate: val })}
                    placeholder="Joining Date"
                    className="add-member-select"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Experience (Years) *</p>
                  <input placeholder="Years"
                    type="number"
                    value={form.experienceYears}
                    onChange={e => setForm({ ...form, experienceYears: e.target.value })}
                    required
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none !py-2 !px-3 !text-[11px] !font-normal bg-white/[0.02] border border-white/5 rounded-xl text-white focus:border-accent/30 transition-all outline-none w-full"
                  />
                </div>
              </div>

              {/* Trainer Type Selection */}
              <div className="space-y-1">
                <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Trainer Type *</p>
                <Select
                  value={form.trainerType}
                  onChange={(val) => setForm({ ...form, trainerType: val })}
                  searchable={false}
                  options={[
                    ...(user?.trainerCompensation?.normal?.isActive !== false ? [{ label: 'Normal Trainer', value: 'Normal Trainer' }] : []),
                    ...(user?.trainerCompensation?.ptOnly?.isActive !== false ? [{ label: 'PT Trainer', value: 'PT Trainer' }] : []),
                    ...(user?.trainerCompensation?.ptAndTrainer?.isActive !== false ? [{ label: 'PT + Trainer', value: 'PT + Trainer' }] : [])
                  ]}
                  className="add-member-select"
                />
              </div>

              {/* Custom compensation structure if allowed */}
              {user?.trainerCompensation?.allowCustomStructure && (
                <div className="grid grid-cols-2 gap-3 bg-white/[0.01] p-3 rounded-xl border border-accent/20 border-dashed">
                  <div className="space-y-1">
                    <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1 flex items-center justify-between">
                      <span>Base Salary (₹)</span>
                      <span className="text-accent text-[8px] font-black uppercase tracking-widest bg-accent/10 px-1.5 py-0.5 rounded-md">Custom</span>
                    </p>
                    <input type="number"
                      value={form.salary}
                      onChange={e => setForm({ ...form, salary: e.target.value })}
                      disabled={form.trainerType === 'PT Trainer'}
                      className="!py-2 !px-3 !text-[11px] !font-normal bg-white/[0.02] border border-white/5 rounded-xl text-white focus:border-accent/30 transition-all outline-none w-full disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder={form.trainerType === 'PT Trainer' ? 'N/A' : 'Salary'}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1 flex items-center justify-between">
                      <span>PT Commission (%)</span>
                      <span className="text-accent text-[8px] font-black uppercase tracking-widest bg-accent/10 px-1.5 py-0.5 rounded-md">Custom</span>
                    </p>
                    <input type="number"
                      min="0" max="100"
                      value={form.commission}
                      onChange={e => setForm({ ...form, commission: e.target.value })}
                      disabled={form.trainerType === 'Normal Trainer'}
                      className="!py-2 !px-3 !text-[11px] !font-normal bg-white/[0.02] border border-white/5 rounded-xl text-white focus:border-accent/30 transition-all outline-none w-full disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder={form.trainerType === 'Normal Trainer' ? 'N/A' : '%'}
                    />
                  </div>
                </div>
              )}

              {/* Working Shift */}
              <div className="space-y-2">
                <div className="space-y-1">
                  <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Working Shift *</p>
                  <Select
                    value={currentShiftVal}
                    searchable={false}
                    options={shiftOptions}
                    onChange={(val) => {
                      if (val === 'custom') {
                        setForm(prev => ({ ...prev, timeSlot: 'custom' }));
                      } else {
                        const slots = (user?.timeSlots || []).filter(s => s.status === 'Active' || s.status === 'active' || !s.status);
                        const selectedSlot = slots.find(s => s.name === val);
                        if (selectedSlot) {
                          setForm(prev => ({
                            ...prev,
                            timeSlot: selectedSlot.name,
                            shiftStart: selectedSlot.startTime,
                            shiftEnd: selectedSlot.endTime
                          }));
                        }
                      }
                    }}
                    className="add-member-select"
                  />
                </div>

                {currentShiftVal === 'custom' && (
                  <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
                    <div className="space-y-1">
                      <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Entry Time</p>
                      <div className="flex items-center gap-1.5">
                        <select
                          className="flex-1 !py-2 !px-2.5 !text-[11px] !font-normal bg-white/[0.02] border border-white/5 rounded-xl text-white focus:border-accent/30 transition-all outline-none w-full cursor-pointer"
                          value={parseTime24(form.shiftStart).hour}
                          onChange={e => {
                            const { minute, period } = parseTime24(form.shiftStart);
                            const newTime = formatTime24(e.target.value, minute, period);
                            setForm({ ...form, shiftStart: newTime });
                          }}
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                            <option key={h} value={h} className="bg-[#1e1e1e]">{h}</option>
                          ))}
                        </select>
                        <span className="text-gray-400 font-bold text-sm">:</span>
                        <select
                          className="flex-1 !py-2 !px-2.5 !text-[11px] !font-normal bg-white/[0.02] border border-white/5 rounded-xl text-white focus:border-accent/30 transition-all outline-none w-full cursor-pointer"
                          value={parseTime24(form.shiftStart).minute}
                          onChange={e => {
                            const { hour, period } = parseTime24(form.shiftStart);
                            const newTime = formatTime24(hour, e.target.value, period);
                            setForm({ ...form, shiftStart: newTime });
                          }}
                        >
                          {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => (
                            <option key={m} value={m} className="bg-[#1e1e1e]">{m}</option>
                          ))}
                        </select>
                        <select
                          className="!py-2 !px-2.5 !text-[11px] !font-normal bg-white/[0.02] border border-white/5 rounded-xl text-white focus:border-accent/30 transition-all outline-none w-[65px] cursor-pointer"
                          value={parseTime24(form.shiftStart).period}
                          onChange={e => {
                            const { hour, minute } = parseTime24(form.shiftStart);
                            const newTime = formatTime24(hour, minute, e.target.value);
                            setForm({ ...form, shiftStart: newTime });
                          }}
                        >
                          <option value="AM" className="bg-[#1e1e1e]">AM</option>
                          <option value="PM" className="bg-[#1e1e1e]">PM</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Exit Time</p>
                      <div className="flex items-center gap-1.5">
                        <select
                          className="flex-1 !py-2 !px-2.5 !text-[11px] !font-normal bg-white/[0.02] border border-white/5 rounded-xl text-white focus:border-accent/30 transition-all outline-none w-full cursor-pointer"
                          value={parseTime24(form.shiftEnd).hour}
                          onChange={e => {
                            const { minute, period } = parseTime24(form.shiftEnd);
                            const newTime = formatTime24(e.target.value, minute, period);
                            setForm({ ...form, shiftEnd: newTime });
                          }}
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                            <option key={h} value={h} className="bg-[#1e1e1e]">{h}</option>
                          ))}
                        </select>
                        <span className="text-gray-400 font-bold text-sm">:</span>
                        <select
                          className="flex-1 !py-2 !px-2.5 !text-[11px] !font-normal bg-white/[0.02] border border-white/5 rounded-xl text-white focus:border-accent/30 transition-all outline-none w-full cursor-pointer"
                          value={parseTime24(form.shiftEnd).minute}
                          onChange={e => {
                            const { hour, period } = parseTime24(form.shiftEnd);
                            const newTime = formatTime24(hour, e.target.value, period);
                            setForm({ ...form, shiftEnd: newTime });
                          }}
                        >
                          {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => (
                            <option key={m} value={m} className="bg-[#1e1e1e]">{m}</option>
                          ))}
                        </select>
                        <select
                          className="!py-2 !px-2.5 !text-[11px] !font-normal bg-white/[0.02] border border-white/5 rounded-xl text-white focus:border-accent/30 transition-all outline-none w-[65px] cursor-pointer"
                          value={parseTime24(form.shiftEnd).period}
                          onChange={e => {
                            const { hour, minute } = parseTime24(form.shiftEnd);
                            const newTime = formatTime24(hour, minute, e.target.value);
                            setForm({ ...form, shiftEnd: newTime });
                          }}
                        >
                          <option value="AM" className="bg-[#1e1e1e]">AM</option>
                          <option value="PM" className="bg-[#1e1e1e]">PM</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Specialties / Specializations */}
              <div className="space-y-2">
                <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">What he trains / Specializations</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(user?.specializations && user.specializations.length > 0 ? user.specializations : SPECIALTIES).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSpecialty(s)}
                      className={`flex items-center justify-between py-1.5 px-3 rounded-lg border transition-all text-[11px] font-normal tracking-wide capitalize
                        ${form.specialties.includes(s)
                          ? 'bg-accent/10 border-accent/30 text-accent shadow-[0_2px_10px_rgba(184,241,117,0.1)]'
                          : 'bg-white/[0.01] border-white/5 text-text-muted hover:border-white/10 hover:text-text-secondary'}`}
                    >
                      <span>{s}</span>
                      {form.specialties.includes(s) && <Check size={12} className="text-accent" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1.5">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 !text-[14px] !font-normal tracking-wide rounded-xl transition-all duration-300 bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary active:bg-white/20 active:scale-95 border border-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 btn-primary !py-2.5 !text-[14px] !font-normal tracking-wide shadow-lg shadow-accent/15 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
              >
                {editingTrainer ? 'Update Trainer' : 'Add Trainer'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {openMenuId && activeMenu && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${activeMenu.y}px`,
            left: `${activeMenu.x}px`,
            zIndex: 9999
          }}
          className="w-48 bg-[#0d0d0d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150"
        >
          <div className="p-2 space-y-1">
            <button
              onClick={() => { setViewingTrainer(activeMenu.data); setOpenMenuId(null); setActiveMenu(null); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-text-secondary hover:bg-white/10 hover:text-white transition-all text-left"
            >
              <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center">
                <Eye size={14} />
              </div>
              View Details
            </button>

            <button
              onClick={() => {
                const t = activeMenu.data;
                setSalaryTrainer(t);
                const now = new Date();

                // Determine fixed salary: use settings if custom structure not allowed
                let fixedSalary = t.salary || 0;
                if (!user?.trainerCompensation?.allowCustomStructure) {
                  const compSettings = user?.trainerCompensation || {
                    normal: { baseSalary: 12000, commission: 0 },
                    ptOnly: { baseSalary: 0, commission: 50 },
                    ptAndTrainer: { baseSalary: 10000, commission: 40 }
                  };
                  if (t.trainerType === 'Normal Trainer') fixedSalary = compSettings.normal?.baseSalary ?? fixedSalary;
                  else if (t.trainerType === 'PT Trainer') fixedSalary = compSettings.ptOnly?.baseSalary ?? fixedSalary;
                  else if (t.trainerType === 'PT + Trainer') fixedSalary = compSettings.ptAndTrainer?.baseSalary ?? fixedSalary;
                }

                // Calculate commission only from ACTIVE (non-expired) clients
                let totalCommission = 0;
                const activeMembers = (t.assignedMembers || []).filter(m => {
                  if (!m.planExpiry) return false;
                  return new Date(m.planExpiry) >= now;
                });

                if (t.commission && t.commission > 0 && activeMembers.length > 0) {
                  totalCommission = activeMembers.reduce((sum, m) => {
                    let planMonths = 1;
                    let ptAmount = 0;
                    const matchedPlan = plans.find(p => p.name === m.plan);
                    if (matchedPlan) {
                      planMonths = matchedPlan.durationMonths || 1;
                      // Use specific PT price if available, else fall back to full plan amount
                      if (matchedPlan.hasPtPricing && matchedPlan.ptDiscountedPrice > 0) {
                        ptAmount = matchedPlan.ptDiscountedPrice;
                      } else {
                        ptAmount = m.planAmount || 0;
                      }
                    } else {
                      // No matching plan in DB — use member's stored planAmount directly
                      ptAmount = m.planAmount || 0;
                      if (m.joinDate && m.planExpiry) {
                        const diffDays = Math.ceil(Math.abs(new Date(m.planExpiry) - new Date(m.joinDate)) / (1000 * 60 * 60 * 24));
                        planMonths = Math.max(1, Math.round(diffDays / 30));
                      }
                    }
                    return sum + ((ptAmount * (t.commission / 100)) / planMonths);
                  }, 0);
                  totalCommission = Math.round(totalCommission);
                }

                const totalClients = (t.assignedMembers || []).length;
                const activeCount = activeMembers.length;
                const noteText = t.commission > 0
                  ? `${t.commission}% PT commission from ${activeCount} active client${activeCount !== 1 ? 's' : ''} (${totalClients} total assigned).`
                  : 'No commission — fixed salary trainer.';

                setSalaryForm({
                  fixed: fixedSalary,
                  commission: totalCommission || '',
                  note: noteText,
                  paymentMethod: 'cash'
                });
                setOpenMenuId(null);
                setActiveMenu(null);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all text-left ${isTrainerPaidThisMonth(activeMenu.data.name)
                ? 'opacity-40 cursor-not-allowed text-success bg-success/5'
                : 'text-text-secondary hover:bg-accent/10 hover:text-accent'
                }`}
              disabled={isTrainerPaidThisMonth(activeMenu.data.name)}
            >
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isTrainerPaidThisMonth(activeMenu.data.name) ? 'bg-success/20 text-success' : 'bg-accent/10 text-accent'}`}>
                {isTrainerPaidThisMonth(activeMenu.data.name) ? <Check size={14} /> : <Banknote size={14} />}
              </div>
              {isTrainerPaidThisMonth(activeMenu.data.name) ? 'Salary Paid' : 'Pay Salary'}
            </button>

            <button
              onClick={() => {
                const t = activeMenu.data;
                setEditingTrainer(t);
                setForm({ ...t, experienceYears: calculateExperience(t.experienceStartDate), trainerType: t.trainerType || 'Normal Trainer', shiftStart: t.shiftStart || '06:00', shiftEnd: t.shiftEnd || '22:00', joinDate: t.joinDate ? new Date(t.joinDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], timeSlot: t.timeSlot || '' });
                setShowModal(true);
                setOpenMenuId(null);
                setActiveMenu(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-text-secondary hover:bg-info/10 hover:text-info transition-all text-left"
            >
              <div className="w-6 h-6 rounded-lg bg-info/10 flex items-center justify-center">
                <Edit3 size={14} />
              </div>
              Edit Profile
            </button>

            <div className="h-px bg-white/5 mx-2 my-1" />

            <button
              onClick={() => {
                handleToggleStatus(activeMenu.data._id);
                setOpenMenuId(null);
                setActiveMenu(null);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeMenu.data.status !== 'inactive'
                ? 'hover:bg-warning/10 hover:text-warning text-text-secondary'
                : 'hover:bg-success/10 hover:text-success text-text-secondary'
                }`}
            >
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${activeMenu.data.status !== 'inactive' ? 'bg-warning/10' : 'bg-success/10'}`}>
                {activeMenu.data.status !== 'inactive' ? <UserMinus size={14} /> : <UserCheck size={14} />}
              </div>
              {activeMenu.data.status !== 'inactive' ? 'Deactivate' : 'Activate'}
            </button>

            <div className="h-px bg-white/5 mx-2 my-1" />

            <button
              onClick={() => {
                handleDelete(activeMenu.data._id);
                setOpenMenuId(null);
                setActiveMenu(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-text-secondary hover:bg-danger/10 hover:text-danger transition-all text-left"
            >
              <div className="w-6 h-6 rounded-lg bg-danger/10 flex items-center justify-center text-danger">
                <Trash2 size={14} />
              </div>
              Delete Trainer
            </button>
          </div>
        </div>
      )}

      {salaryTrainer && (
        <Modal isOpen={!!salaryTrainer} onClose={() => setSalaryTrainer(null)} title="Pay Trainer Salary" size="md">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const fixed = parseFloat(salaryForm.fixed) || 0;
                const comm = salaryTrainer.trainerType === 'Normal Trainer' ? 0 : (parseFloat(salaryForm.commission) || 0);
                const total = fixed + comm;
                const payMethod = salaryForm.paymentMethod || 'cash';
                await expensesApi.create({
                  title: `Trainer Salary (${new Date().toLocaleString('en-US', { month: 'long' })}) [Salary] - Note: ${salaryTrainer.name}`,
                  amount: total,
                  category: 'Salary',
                  date: new Date().toISOString().split('T')[0],
                  paymentMethod: payMethod,
                  notes: salaryTrainer.trainerType === 'Normal Trainer'
                    ? `Fixed Salary: ₹${fixed}. ${salaryForm.note}`
                    : `Fixed: ₹${fixed} + Commission: ₹${comm}. ${salaryForm.note}`
                });
                
                // Send WhatsApp notification
                const automations = user?.whatsappConfig?.automations;
                const isPayoutAlertEnabled = automations?.salaryPayout?.enabled ?? true; // fallback to true if not defined
                
                if ((automations?.salaryPayout?.enabled ?? true) && salaryTrainer.phone) {
                  try {
                    const currentMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
                    const details = salaryTrainer.trainerType === 'Normal Trainer'
                      ? `- Salary Paid: ₹${fixed}\n- Payment Method: ${payMethod}${salaryForm.note ? `\n- Notes: ${salaryForm.note}` : ''}`
                      : `- Fixed Salary: ₹${fixed}\n- Commission: ₹${comm}\n- Total Amount: ₹${total}\n- Payment Method: ${payMethod}${salaryForm.note ? `\n- Notes: ${salaryForm.note}` : ''}`;
                      
                    const defaultTemplate = "Hello {staff_name}!\n\nYour salary for {month} has been paid successfully!\n\nPayment Details:\n{payment_details}\n\nThank you for your dedication and hard work! 💪\n- {gym_name}";
                    const templateText = automations?.salaryPayout?.templateText || defaultTemplate;
                    
                    const msg = templateText
                      .replace(/{staff_name}/g, salaryTrainer.name)
                      .replace(/{month}/g, currentMonth)
                      .replace(/{payment_details}/g, details)
                      .replace(/{gym_name}/g, user?.gymName || 'Gym Management');
                      
                    await whatsappApi.sendCustom({
                      phone: salaryTrainer.phone,
                      message: msg
                    });
                  } catch (whatsappErr) {
                    console.error('Failed to send WhatsApp notification:', whatsappErr.message);
                  }
                }

                showToast('Salary payment recorded in Salaries Page!', 'success');
                setSalaryTrainer(null);
                fetchPaidSalaries();
              } catch (err) {
                showToast(err.message, 'error');
              }
            }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${salaryTrainer.gender === 'female' ? 'bg-pink-500/10 text-pink-200' : 'bg-blue-500/10 text-blue-200'
                  }`}>
                  {salaryTrainer.name[0]}
                </div>
                <div>
                  <p className="text-sm font-black text-white">{salaryTrainer.name}</p>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-0.5">Trainer Payroll ({salaryTrainer.trainerType})</p>
                </div>
              </div>

              <div className={salaryTrainer.trainerType === 'Normal Trainer' ? "grid grid-cols-1" : "grid grid-cols-2 gap-3"}>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black ml-1">Fixed Salary ₹</p>
                  <input type="number"
                    value={salaryForm.fixed}
                    onChange={(e) => setSalaryForm({ ...salaryForm, fixed: e.target.value })}
                    required
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-full !h-10 !text-[15px] !bg-bg-card/40 border border-white/5 !rounded-xl text-white outline-none focus:border-accent/50 px-4 transition-all"
                  />
                </div>
                {salaryTrainer.trainerType !== 'Normal Trainer' && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black ml-1">Commission ₹ (Optional)</p>
                    <input type="number"
                      value={salaryForm.commission}
                      onChange={(e) => setSalaryForm({ ...salaryForm, commission: e.target.value })}
                      placeholder="0"
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-full !h-10 !text-[15px] !bg-bg-card/40 border border-white/5 !rounded-xl text-white outline-none focus:border-accent/50 px-4 transition-all"
                    />
                  </div>
                )}
              </div>

              {salaryTrainer.commission > 0 && salaryTrainer.assignedMembers?.length > 0 && (() => {
                const now = new Date();
                const activeMembers = salaryTrainer.assignedMembers.filter(m => m.planExpiry && new Date(m.planExpiry) >= now);
                const expiredMembers = salaryTrainer.assignedMembers.filter(m => !m.planExpiry || new Date(m.planExpiry) < now);
                return (
                  <div className="bg-bg-card/40 border border-white/5 rounded-xl p-3 max-h-52 overflow-y-auto no-scrollbar space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black">
                        Active Clients ({activeMembers.length}/{salaryTrainer.assignedMembers.length})
                      </p>
                      <span className="text-[9px] font-black text-accent bg-accent/10 border border-accent/20 px-1.5 py-0.5 rounded-md">
                        {salaryTrainer.commission}% commission
                      </span>
                    </div>

                    {activeMembers.map(m => {
                      let planMonths = 1;
                      let ptAmount = 0;
                      const matchedPlan = plans.find(p => p.name === m.plan);
                      if (matchedPlan) {
                        planMonths = matchedPlan.durationMonths || 1;
                        if (matchedPlan.hasPtPricing && matchedPlan.ptDiscountedPrice > 0) {
                          ptAmount = matchedPlan.ptDiscountedPrice;
                        } else {
                          ptAmount = m.planAmount || 0;
                        }
                      } else {
                        ptAmount = m.planAmount || 0;
                        if (m.joinDate && m.planExpiry) {
                          const diffDays = Math.ceil(Math.abs(new Date(m.planExpiry) - new Date(m.joinDate)) / (1000 * 60 * 60 * 24));
                          planMonths = Math.max(1, Math.round(diffDays / 30));
                        }
                      }
                      const commPerMonth = Math.round((ptAmount * (salaryTrainer.commission / 100)) / planMonths);
                      const expiryDate = new Date(m.planExpiry).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

                      return (
                        <div key={m._id} className="flex justify-between items-center bg-success/5 border border-success/10 p-2 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-[10px] font-black">{m.name[0]}</div>
                            <div>
                              <span className="text-xs font-bold text-white block">{m.name}</span>
                              <span className="text-[8px] text-text-muted">Expires: {expiryDate}</span>
                            </div>
                          </div>
                          <div className="text-right flex flex-col">
                            <span className="text-xs font-black text-accent">+₹{commPerMonth.toLocaleString()} <span className="text-[9px] text-text-muted">/mo</span></span>
                            <span className="text-[9px] text-text-muted font-bold">₹{ptAmount.toLocaleString()} × {salaryTrainer.commission}% ÷ {planMonths}mo</span>
                          </div>
                        </div>
                      );
                    })}

                    {expiredMembers.length > 0 && (
                      <div className="pt-1.5 border-t border-white/5">
                        <p className="text-[9px] uppercase tracking-wider text-danger/60 font-black mb-1.5">Expired — Not Counted ({expiredMembers.length})</p>
                        {expiredMembers.map(m => (
                          <div key={m._id} className="flex items-center gap-2 p-1.5 rounded-lg opacity-40">
                            <div className="w-5 h-5 rounded bg-white/5 flex items-center justify-center text-[9px] font-black">{m.name[0]}</div>
                            <span className="text-[10px] font-bold text-white line-through">{m.name}</span>
                            <span className="text-[8px] text-danger ml-auto">Plan expired</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="p-3 rounded-xl bg-accent/5 border border-accent/10 flex items-center justify-between">
                <span className="text-[11px] font-black text-accent uppercase tracking-widest">Total Payout</span>
                <span className="text-lg font-black text-white">₹{((parseFloat(salaryForm.fixed) || 0) + (parseFloat(salaryForm.commission) || 0)).toLocaleString()}</span>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black ml-1">Payment Method</p>
                <Select
                  value={salaryForm.paymentMethod || 'cash'}
                  searchable={false}
                  options={[
                    { label: 'Cash', value: 'cash', icon: <Banknote size={16} /> },
                    { label: 'UPI', value: 'upi', icon: <Zap size={16} /> }
                  ]}
                  onChange={val => setSalaryForm({ ...salaryForm, paymentMethod: val })}
                  className="w-full !h-10"
                />
              </div>

              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black ml-1">Notes (Optional)</p>
                <input
                  type="text"
                  value={salaryForm.note}
                  onChange={(e) => setSalaryForm({ ...salaryForm, note: e.target.value })}
                  placeholder="E.g. Bonus included, deduction for leave..."
                  className="w-full !py-2.5 !text-[15px] !bg-bg-card/40 border border-white/5 !rounded-xl text-white outline-none focus:border-accent/50 px-4 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSalaryTrainer(null)}
                className="flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary active:bg-white/20 active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-[2] btn-primary !py-3 !text-sm font-black uppercase tracking-widest shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Pay Salary
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmState}
        onClose={() => setDeleteConfirmState(null)}
        title={deleteConfirmState?.title || "Confirm Action"}
        size="sm"
      >
        <div className="space-y-6">
          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-danger/5 border border-danger/10 text-danger">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div>
              <h4 className="text-[12px] font-black uppercase tracking-wider">Warning: Permanent Action</h4>
              <p className="text-[12px] text-text-secondary font-medium mt-1 leading-relaxed">
                {deleteConfirmState?.message}
              </p>
            </div>
          </div>

          {/* Checkbox to delete payments also */}
          <div className="flex items-center justify-between py-2 px-3 bg-white/[0.02] border border-white/5 rounded-2xl">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-[11px] font-black text-white uppercase tracking-wider leading-none">Delete Salary History Too</p>
              <p className="text-[9px] text-text-muted mt-1.5 font-bold leading-normal">
                If checked, all salary and payout history of this trainer will be permanently deleted from the database.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDeletePayments(prev => !prev)}
              style={{
                width: '18px',
                height: '18px',
                minWidth: '18px',
                minHeight: '18px',
                maxWidth: '18px',
                maxHeight: '18px',
                borderRadius: '4px',
                border: deletePayments ? '2px solid #ef4444' : '2px solid rgba(255, 255, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: deletePayments ? '#ef4444' : 'transparent',
                cursor: 'pointer',
                flexShrink: 0,
                padding: 0,
                transition: 'all 0.15s ease-in-out'
              }}
            >
              {deletePayments && (
                <svg
                  width="10"
                  height="8"
                  viewBox="0 0 10 8"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1 4L3.5 6.5L9 1"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDeleteConfirmState(null)}
              className="flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary active:bg-white/20 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                const targetId = deleteConfirmState?.id;
                setDeleteConfirmState(null);
                if (targetId) {
                  try {
                    await trainersApi.delete(targetId, deletePayments);
                    fetchTrainers(true);
                    showToast("Trainer deleted successfully", "success");
                  } catch (err) {
                    showToast(err.message, "error");
                  }
                }
              }}
              className="flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 bg-danger/15 text-danger hover:bg-danger/25 active:scale-95 border border-danger/20"
            >
              Yes, Delete
            </button>
          </div>
        </div>
      </Modal>

      {limitReachedState && (
        <Modal
          isOpen={!!limitReachedState}
          onClose={() => setLimitReachedState(null)}
          title={limitReachedState.title}
          size="sm"
          className="!rounded-2xl lg:!rounded-2xl !rounded-t-2xl"
        >
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-500">
                <AlertCircle size={24} />
              </div>
              <div className="space-y-1 flex-1">
                <h4 className="text-[13px] font-black text-white uppercase tracking-wider">Plan Limit Reached</h4>
                <p className="text-[11px] font-bold text-text-secondary leading-relaxed">
                  {limitReachedState.message}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setLimitReachedState(null)}
                className="flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all bg-white/5 text-text-muted hover:bg-white/10 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
