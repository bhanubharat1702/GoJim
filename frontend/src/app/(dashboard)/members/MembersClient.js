'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useInView } from 'react-intersection-observer';
import { membersApi, paymentsApi, whatsappApi, trainersApi, plansApi, attendanceApi, authApi } from '@/lib/api';
import { PageHeader, SearchBar, Loader, Modal, Badge, EmptyState, DatePicker, Select, StatCard } from '@/components/UI';
import { cleanPhone, validatePhone } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import {
  Users, Calendar, UserPlus, Banknote, Zap, Search,
  CreditCard, Landmark, Filter, Activity,
  Tag, RefreshCw, SortDesc, User, Edit3, Eye, Dumbbell, MessageCircle, Trash2,
  UserCheck, UserMinus, UserX, TrendingUp, TrendingDown,
  ChevronUp, ChevronDown, ChevronsUpDown, MoreVertical, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, AlertCircle, X, Check
} from 'lucide-react';

const isTrainerCompatible = (trainer, memberTimeSlotName, timeSlots) => {
  if (!memberTimeSlotName) return true; // If no slot chosen, all are compatible
  if (!trainer) return false;

  // Named slot match
  if (trainer.timeSlot && trainer.timeSlot !== 'custom') {
    return trainer.timeSlot === memberTimeSlotName;
  }

  // Custom working hours range inclusion check
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const memberSlot = (timeSlots || []).find(s => s.name === memberTimeSlotName && (s.status === 'Active' || s.status === 'active' || !s.status));
  if (!memberSlot) return true; // Default fallback if slot config is missing

  const mStart = timeToMinutes(memberSlot.startTime);
  const mEnd = timeToMinutes(memberSlot.endTime);
  const tStart = timeToMinutes(trainer.shiftStart || '06:00');
  const tEnd = timeToMinutes(trainer.shiftEnd || '22:00');

  if (tEnd >= tStart) {
    return mStart >= tStart && mEnd <= tEnd;
  } else {
    // Crosses midnight
    return (mStart >= tStart && (mEnd <= tEnd || mEnd > mStart)) || (mStart <= tEnd && mEnd <= tEnd);
  }
};

const getInitials = (name) => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
};

export default function MembersClient({ initialMembers, initialStats, initialTrainers, initialPlans }) {
  const { user, updateUser } = useAuth();
  const searchParams = useSearchParams();
  const [members, setMembers] = useState(initialMembers || []);
  const [stats, setStats] = useState(initialStats || null);
  const [trainers, setTrainers] = useState(initialTrainers || []);
  const [loading, setLoading] = useState(!initialMembers);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [sortBy, setSortBy] = useState('-createdAt');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: initialMembers ? initialMembers.length : 0 });
  const [plans, setPlans] = useState(initialPlans || []);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [showTimeSlotError, setShowTimeSlotError] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(null);
  const [activeFilterCategory, setActiveFilterCategory] = useState(null);
  const [showDetail, setShowDetail] = useState(null);
  const [expandedMemberId, setExpandedMemberId] = useState(null);
  const [staticDataLoaded, setStaticDataLoaded] = useState(!!initialMembers);
  const [showPayment, setShowPayment] = useState(null);
  const [deleteConfirmState, setDeleteConfirmState] = useState(null);
  const [deletePayments, setDeletePayments] = useState(false);
  const [upgradeConfirmState, setUpgradeConfirmState] = useState(null);
  const [upgradePaymentMethod, setUpgradePaymentMethod] = useState('cash');
  const [form, setForm] = useState({
    name: '', phone: '', gender: 'male', dob: '',
    joinDate: new Date().toISOString().split('T')[0],
    photo: '',
    plan: '',
    planAmount: '',
    addPt: false,
    assignedTrainer: '',
    timeSlot: ''
  });

  // Date Filter States
  const [dateFilterType, setDateFilterType] = useState('all'); // 'all' | 'year' | 'month' | 'date' | 'range'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString()); // '0' to '11'
  const [selectedDate, setSelectedDate] = useState(''); // 'YYYY-MM-DD'
  const [selectedRangeStart, setSelectedRangeStart] = useState(''); // 'YYYY-MM-DD'
  const [selectedRangeEnd, setSelectedRangeEnd] = useState(''); // 'YYYY-MM-DD'
  const [showDateFilterPopover, setShowDateFilterPopover] = useState(false);
  // Status Filter State
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'paid' | 'due_soon' | 'expiring_today' | 'expired' | 'joined_today' | 'inactive'
  const [showStatusFilterPopover, setShowStatusFilterPopover] = useState(false);

  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const scrollContainerRef = useRef(null);

  const updateScrollArrows = () => {
    const el = scrollContainerRef.current;
    if (el) {
      setShowLeftArrow(el.scrollLeft > 0);
      setShowRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      updateScrollArrows();
    }, 300);
    window.addEventListener('resize', updateScrollArrows);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateScrollArrows);
    };
  }, [members, statusFilter]);

  const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const STATUS_FILTER_OPTIONS = [
    { value: 'all', label: 'All Members', color: 'text-text-muted' },
    { value: 'paid', label: 'Paid', color: 'text-success' },
    { value: 'due_soon', label: 'Due Soon', color: 'text-warning' },
    { value: 'expiring_today', label: 'Expiring Today', color: 'text-amber-400' },
    { value: 'expired', label: 'Expired', color: 'text-danger' },
    { value: 'joined_today', label: 'Joined Today', color: 'text-info' },
    { value: 'inactive', label: 'Inactive', color: 'text-text-muted' },
  ];

  const getStatusFilterLabel = () => STATUS_FILTER_OPTIONS.find(o => o.value === statusFilter)?.label || 'All Members';

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

  // Returns payment-verified expiry: null means no payment exists → treat as expired.
  const getEffectiveExpiry = (m) => {
    return m.planExpiry ? new Date(m.planExpiry) : null;
  };

  const getCategorizedStatus = (m) => {
    if (m.status === 'inactive') {
      return 'inactive';
    }

    const now = new Date();
    const effectiveExpiry = getEffectiveExpiry(m);

    if (!effectiveExpiry) {
      // No payment on record — treat as expired before 30 days (Inactive)
      return 'inactive';
    }

    const isExpired = effectiveExpiry < now;
    if (isExpired) {
      const diffTime = Math.abs(now - effectiveExpiry);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 30) {
        return 'expired';
      } else {
        return 'inactive';
      }
    }

    // Not expired
    const diffTime = Math.abs(effectiveExpiry - now);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) {
      return 'due_soon';
    }

    return 'active';
  };

  const getMemberStatus = (m) => {
    const cat = getCategorizedStatus(m);
    if (cat === 'active') return { text: 'Active', color: 'text-success' };
    if (cat === 'due_soon') return { text: 'Expiring Soon', color: 'text-warning' };
    if (cat === 'expired') return { text: 'Expired', color: 'text-danger' };
    return { text: 'Inactive', color: 'text-text-muted' };
  };

  const getTabCounts = useMemo(() => {
    let all = 0, active = 0, inactive = 0, due_soon = 0, expired = 0;
    members.forEach(m => {
      all++;
      const cat = getCategorizedStatus(m);
      if (cat === 'active') active++;
      else if (cat === 'due_soon') due_soon++;
      else if (cat === 'expired') expired++;
      else if (cat === 'inactive') inactive++;
    });
    return { all, active, inactive, expiring: due_soon, expired };
  }, [members]);

  const getTabValues = (tabName) => {
    switch (tabName) {
      case 'active':
        return { statusFilter: 'paid', filter: 'active' };
      case 'inactive':
        return { statusFilter: 'inactive', filter: 'inactive' };
      case 'due_soon':
        return { statusFilter: 'due_soon', filter: 'expiring' };
      case 'expired':
        return { statusFilter: 'expired', filter: 'expired' };
      default:
        return { statusFilter: 'all', filter: 'all' };
    }
  };

  const filteredMembers = useMemo(() => {
    const now = new Date();
    return members.filter(m => {
      // --- Status Filter (payment-verified) ---
      if (statusFilter !== 'all') {
        const catStatus = getCategorizedStatus(m);
        if (statusFilter === 'inactive' && catStatus !== 'inactive') return false;
        if (statusFilter === 'expired' && catStatus !== 'expired') return false;
        if (statusFilter === 'due_soon' && catStatus !== 'due_soon') return false;
        if (statusFilter === 'paid' && catStatus !== 'active') return false;
        
        // Handle other custom filters if they exist (expiring_today, joined_today)
        if (statusFilter === 'expiring_today') {
          const effectiveExpiry = getEffectiveExpiry(m);
          const isExpiringToday = m.status !== 'inactive' && effectiveExpiry && effectiveExpiry.toDateString() === now.toDateString();
          if (!isExpiringToday) return false;
        }
        if (statusFilter === 'joined_today') {
          const joinDate = m.joinDate ? new Date(m.joinDate) : (m.createdAt ? new Date(m.createdAt) : null);
          const isJoinedToday = joinDate && joinDate.toDateString() === now.toDateString() && m.status !== 'inactive';
          if (!isJoinedToday) return false;
        }
      }

      // --- Date Filter ---
      if (dateFilterType === 'all') return true;
      const memberDate = m.joinDate ? new Date(m.joinDate) : (m.createdAt ? new Date(m.createdAt) : null);
      if (!memberDate) return false;

      if (dateFilterType === 'date') {
        if (!selectedDate) return true;
        const targetDate = parseLocalDate(selectedDate);
        return memberDate.getFullYear() === targetDate.getFullYear() &&
          memberDate.getMonth() === targetDate.getMonth() &&
          memberDate.getDate() === targetDate.getDate();
      }

      if (dateFilterType === 'month') {
        const targetMonth = parseInt(selectedMonth);
        const targetYear = parseInt(selectedYear);
        return memberDate.getFullYear() === targetYear &&
          memberDate.getMonth() === targetMonth;
      }

      if (dateFilterType === 'year') {
        const targetYear = parseInt(selectedYear);
        return memberDate.getFullYear() === targetYear;
      }

      if (dateFilterType === 'range') {
        const start = parseLocalDate(selectedRangeStart);
        if (start) start.setHours(0, 0, 0, 0);

        const end = parseLocalDate(selectedRangeEnd);
        if (end) end.setHours(23, 59, 59, 999);

        if (start && end) {
          return memberDate >= start && memberDate <= end;
        } else if (start) {
          return memberDate >= start;
        } else if (end) {
          return memberDate <= end;
        }
        return true;
      }

      return true;
    });
  }, [members, statusFilter, dateFilterType, selectedDate, selectedMonth, selectedYear, selectedRangeStart, selectedRangeEnd]);

  const formatTimeToAMPM = (timeStr) => {
    if (!timeStr) return '';
    const [hoursStr, minutesStr] = timeStr.split(':');
    let hours = parseInt(hoursStr);
    const minutes = minutesStr;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const shiftOptions = useMemo(() => {
    const slots = (user?.timeSlots || []).filter(s => s.status === 'Active' || s.status === 'active' || !s.status);
    return slots.map(s => ({
      label: `${s.name} (${formatTimeToAMPM(s.startTime)} - ${formatTimeToAMPM(s.endTime)})`,
      value: s.name
    }));
  }, [user?.timeSlots]);
  const [payForm, setPayForm] = useState({ amount: '', plan: 'monthly', paymentMethod: 'cash', payFromCurrentDate: false, addPt: false, assignedTrainer: '' });
  const [selectedUpi, setSelectedUpi] = useState('');

  useEffect(() => {
    if (user?.upiId && !selectedUpi) {
      setSelectedUpi(user.upiId);
    }
  }, [user, selectedUpi]);
  const [saving, setSaving] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [subViewLoading, setSubViewLoading] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [activeSubView, setActiveSubView] = useState(null); // null | 'payments' | 'attendance'
  const [historyMonth, setHistoryMonth] = useState(new Date());

  useEffect(() => {
    if (!showDetail) {
      setActiveSubView(null);
      setPaymentHistory([]);
      setAttendanceHistory([]);
      return;
    }
    setHistoryMonth(new Date());

    const fetchSubData = async () => {
      setSubViewLoading(true);
      try {
        const [payRes, attRes] = await Promise.all([
          paymentsApi.getMemberPayments(showDetail._id).catch(() => ({ data: [] })),
          attendanceApi.getAll(`memberId=${showDetail._id}`).catch(() => ({ data: [] }))
        ]);
        setPaymentHistory(payRes.data || payRes || []);
        setAttendanceHistory(attRes.data || attRes || []);
      } catch (err) {
        console.error("Error fetching sub-data:", err);
      } finally {
        setSubViewLoading(false);
      }
    };
    fetchSubData();
  }, [showDetail]);

  const [originalMember, setOriginalMember] = useState(null);
  const [upgradeInfo, setUpgradeInfo] = useState(null);
  const [limitReachedState, setLimitReachedState] = useState(null);
  const dobRef = useRef(null);
  const menuRef = useRef(null);

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

  const planOptions = [
    { label: 'Select a plan', value: '', displayText: 'Select a plan' },
    ...plans.map(p => ({
      label: (
        <div className="flex items-center justify-between w-full pr-1.5 py-0.5">
          <div className="flex flex-col text-left">
            <span className="font-extrabold text-[12px] text-white uppercase tracking-wider">{p.name}</span>
            <span className="text-[10px] text-text-muted mt-0.5 font-medium">{p.durationMonths ? p.durationMonths * 30 : (p.duration || '30')} Days Validity</span>
          </div>
          <div className="flex flex-col items-end text-right">
            <span className="text-[12.5px] font-black text-accent">₹{Number(p.discountedPrice).toLocaleString('en-IN')}</span>
            {(p.hasPtPricing === true || p.hasPtPricing === 'true') && <span className="text-[8px] text-info font-black uppercase tracking-widest mt-0.5">PT Available</span>}
          </div>
        </div>
      ),
      value: p.name,
      displayText: p.name,
      searchText: p.name
    }))
  ];

  const paymentMethodOptions = [
    { label: 'Cash', value: 'cash', icon: <Banknote size={16} /> },
    { label: 'UPI', value: 'upi', icon: <Zap size={16} /> },
  ];

  const trainerOptions = [
    { label: 'No Trainer', value: '' },
    ...trainers.map(t => ({
      label: `${t.name} (${t.clientCount || 0} active clients)`,
      value: t._id,
      disabled: t.status === 'inactive'
    }))
  ];

  const calculateAge = (dob) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const getPlanDuration = (planName) => {
    const name = planName.toLowerCase();
    const planObj = plans.find(p => p.name === planName);
    if (planObj?.duration) return parseInt(planObj.duration);

    if (name.includes('year')) return 12;
    if (name.includes('quarter') || name.includes('3 month')) return 3;
    if (name.includes('6 month')) return 6;
    const monthMatch = name.match(/(\d+)\s*month/);
    if (monthMatch) return parseInt(monthMatch[1]);
    return 1; // default 1 month
  };

  const calculateExpiry = (months) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
  };

  const handleDobChange = (e) => {
    const dob = e.target.value;
    const age = calculateAge(dob);
    setForm({ ...form, dob, age });
  };

  const handlePtToggle = (checked) => {
    const selectedPlan = plans.find(p => p.name === form.plan);
    if (selectedPlan) {
      let finalAmount = selectedPlan.discountedPrice;
      if (checked && (selectedPlan.hasPtPricing === true || selectedPlan.hasPtPricing === 'true')) {
        finalAmount += selectedPlan.ptDiscountedPrice;
      }
      setForm(prev => ({
        ...prev,
        addPt: checked,
        planAmount: finalAmount
      }));
    }
  };


  useEffect(() => {
    if (searchParams.get('action') === 'add') setShowAdd(true);
    const f = searchParams.get('filter');
    if (f) {
      setFilter(f);
      if (f === 'inactive') setStatusFilter('inactive');
      else if (f === 'expiring') setStatusFilter('due_soon');
      else if (f === 'expiring_today') setStatusFilter('expiring_today');
      else if (f === 'expired') setStatusFilter('expired');
      else setStatusFilter('all');
    }
  }, [searchParams]);

  const previewId = searchParams.get('preview');

  useEffect(() => {
    if (previewId) {
      const found = members.find(m => m._id === previewId);
      if (found) {
        setShowDetail(found);
        const newParams = new URLSearchParams(window.location.search);
        newParams.delete('preview');
        const cleanPath = window.location.pathname + (newParams.toString() ? '?' + newParams.toString() : '');
        window.history.replaceState(null, '', cleanPath);
      } else {
        membersApi.getAll(`search=${previewId}`).then(res => {
          if (res.success && res.data.length > 0) {
            setShowDetail(res.data[0]);
          }
          const newParams = new URLSearchParams(window.location.search);
          newParams.delete('preview');
          const cleanPath = window.location.pathname + (newParams.toString() ? '?' + newParams.toString() : '');
          window.history.replaceState(null, '', cleanPath);
        }).catch(err => console.error(err));
      }
    }
  }, [previewId, members]);

  // Infinite Scroll Hook
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  });

  useEffect(() => {
    if (inView && pagination.page < pagination.pages && !loading && !loadingMore) {
      fetchMembers(true);
    }
  }, [inView, pagination.page, pagination.pages, loading, loadingMore]);

  const fetchMembers = async (isLoadMore = false, isSilent = false, refreshStatic = false) => {
    try {
      if (isLoadMore) setLoadingMore(true);
      else if (!isSilent) setLoading(true);

      const shouldFetchStatic = !staticDataLoaded || refreshStatic;

      let res;
      const currentPage = isLoadMore ? pagination.page + 1 : 1;
      const query = `search=${debouncedSearch}&plan=${planFilter}&gender=${genderFilter}&sort=${sortBy}&page=${currentPage}&limit=50`;

      const [membersRes, statsRes, trainRes, planRes] = await Promise.all([
        membersApi.getAll(query),
        !isLoadMore ? membersApi.getStats() : Promise.resolve({ success: false }),
        (!isLoadMore && shouldFetchStatic) ? trainersApi.getAll('status=active') : Promise.resolve({ success: false }),
        (!isLoadMore && shouldFetchStatic) ? plansApi.getAll() : Promise.resolve({ success: false })
      ]);

      if (membersRes.success) {
        if (isLoadMore) setMembers(prev => [...prev, ...membersRes.data]);
        else setMembers(membersRes.data);
        
        setPagination({
          page: membersRes.page || currentPage,
          pages: membersRes.pages || 1,
          total: membersRes.total || (isLoadMore ? pagination.total : membersRes.data.length)
        });
      }

      if (statsRes.success) setStats(statsRes.data);
      if (shouldFetchStatic && trainRes.success) setTrainers(trainRes.data);
      if (shouldFetchStatic && planRes.success) setPlans(planRes.data);

      if (shouldFetchStatic && membersRes.success) {
        setStaticDataLoaded(true);
      }

    } catch (err) { console.error(err); }
    finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);
  const initialDeps = useRef(JSON.stringify([planFilter, genderFilter, debouncedSearch, sortBy]));
  useEffect(() => {
    const currentDeps = JSON.stringify([planFilter, genderFilter, debouncedSearch, sortBy]);
    if (currentDeps === initialDeps.current) return;
    
    fetchMembers();
  }, [planFilter, genderFilter, debouncedSearch, sortBy]);

  useEffect(() => {
    const handleSettingsUpdate = () => {
      fetchMembers(false, true, true);
    };
    window.addEventListener('gymSettingsUpdated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('gymSettingsUpdated', handleSettingsUpdate);
    };
  }, []);



  const handleConfirmUpgrade = async () => {
    setSaving(true);
    try {
      const newExpiryDate = new Date();
      newExpiryDate.setMonth(newExpiryDate.getMonth() + 1);
      const planExpiryStr = newExpiryDate.toISOString().split('T')[0];

      const payload = {
        name: form.name,
        phone: form.phone,
        gender: form.gender,
        dob: form.dob || null,
        joinDate: form.joinDate,
        photo: form.photo || '',
        plan: form.plan,
        planAmount: parseInt(form.planAmount) || 0,
        assignedTrainer: form.addPt ? form.assignedTrainer || null : null,
        timeSlot: form.timeSlot || '',
        planExpiry: planExpiryStr,
        status: 'active'
      };

      await membersApi.update(isEditing, payload);

      try {
        const diffAmount = (parseInt(form.planAmount) || 0) - (parseInt(originalMember?.planAmount) || 0);
        if (diffAmount > 0) {
          const payPayload = {
            memberId: isEditing,
            amount: diffAmount,
            plan: form.plan,
            paymentMethod: upgradePaymentMethod,
            newExpiry: newExpiryDate.toISOString(),
            notes: `Upgrade payment collected (Normal -> PT / Higher Plan)`,
            isPtPayment: true
          };
          if (upgradePaymentMethod === 'upi') {
            payPayload.upiId = selectedUpi || user?.upiId || '';
          }
          await paymentsApi.create(payPayload);
        }
      } catch (payErr) {
        console.error("Error recording upgrade payment income:", payErr);
      }

      setShowAdd(false);
      setIsEditing(null);
      setOriginalMember(null);
      setUpgradeConfirmState(null);
      setUpgradePaymentMethod('cash');
      setShowTimeSlotError(false);
      setForm({
        name: '', phone: '', gender: 'male', dob: '',
        joinDate: new Date().toISOString().split('T')[0],
        photo: '',
        plan: '',
        planAmount: '',
        addPt: false,
        assignedTrainer: '',
        timeSlot: ''
      });
      fetchMembers(false, true, true);
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('limit')) {
        setLimitReachedState({
          title: 'Plan Limit Reached',
          message: err.message
        });
      } else {
        alert(err.message);
      }
    }
    finally { setSaving(false); }
  };

  const handleAdd = async (e) => {
    if (e) e.preventDefault();
    if (!form.phone || !form.phone.trim()) {
      alert('Phone number is required.');
      return;
    }
    if (!validatePhone(form.phone)) {
      alert('Phone number must be exactly 10 digits (no spaces, letters, or special characters).');
      return;
    }
    if (!form.plan) {
      alert('Please select a membership plan.');
      return;
    }
    const activeSlots = (user?.timeSlots || []).filter(s => s.status === 'Active' || s.status === 'active' || !s.status);
    const hasSlots = activeSlots.length > 0;
    if (hasSlots && !form.timeSlot) {
      setShowTimeSlotError(true);
      alert('Please select an active attending time slot for the member.');
      return;
    }
    if (form.addPt && !form.assignedTrainer) {
      alert('Please select an active trainer for the Personal Training add-on.');
      return;
    }

    if (isEditing && originalMember) {
      const newAmount = parseInt(form.planAmount) || 0;
      const oldAmount = parseInt(originalMember.planAmount) || 0;
      const diffAmount = newAmount - oldAmount;

      if (diffAmount > 0) {
        setUpgradeConfirmState({
          title: 'Collect Remaining Balance',
          message: `Member already paid ₹${oldAmount.toLocaleString()} for the normal plan. To apply the Personal Training (PT) add-on, please collect the remaining balance of ₹${diffAmount.toLocaleString()} from the client.`,
          oldAmount,
          newAmount,
          diffAmount
        });
        return;
      }
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        gender: form.gender,
        dob: form.dob || null,
        joinDate: form.joinDate,
        photo: form.photo || '',
        plan: form.plan,
        planAmount: parseInt(form.planAmount) || 0,
        assignedTrainer: form.addPt ? form.assignedTrainer || null : null,
        timeSlot: form.timeSlot || ''
      };

      if (isEditing) {
        await membersApi.update(isEditing, payload);
      } else {
        await membersApi.create(payload);
      }
      setShowAdd(false);
      setIsEditing(null);
      setOriginalMember(null);
      setShowTimeSlotError(false);
      setForm({
        name: '', phone: '', gender: 'male', dob: '',
        joinDate: new Date().toISOString().split('T')[0],
        photo: '',
        plan: '',
        planAmount: '',
        addPt: false,
        assignedTrainer: '',
        timeSlot: ''
      });
      fetchMembers(false, true, true);
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('limit')) {
        setLimitReachedState({
          title: 'Plan Limit Reached',
          message: err.message
        });
      } else {
        alert(err.message);
      }
    }
    finally { setSaving(false); }
  };

  const handleToggleStatus = async (id) => {
    try {
      await membersApi.toggleStatus(id);
      fetchMembers(false, true, true);
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (id) => {
    const targetId = id || isEditing;
    if (!targetId) return;

    setDeletePayments(false);
    setDeleteConfirmState({
      id: targetId,
      title: 'Delete Member',
      message: 'Are you sure you want to delete this member? All profile data will be removed.'
    });
  };

  const handlePaymentPtToggle = (checked) => {
    const selectedPlan = plans.find(p => p.name === payForm.plan);
    if (selectedPlan) {
      let finalAmount = selectedPlan.discountedPrice;
      if (checked && (selectedPlan.hasPtPricing === true || selectedPlan.hasPtPricing === 'true')) {
        finalAmount += selectedPlan.ptDiscountedPrice;
      }
      setPayForm(prev => ({
        ...prev,
        addPt: checked,
        amount: String(finalAmount)
      }));
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (payForm.addPt && !payForm.assignedTrainer) {
      alert('Please select a trainer for the Personal Training assignment.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        memberId: showPayment._id,
        ...payForm,
        amount: parseInt(payForm.amount),
        notes: payForm.addPt ? `Plan Renewal with PT Add-on` : `Plan Renewal`,
        isPtPayment: payForm.addPt || false
      };
      if (payForm.paymentMethod === 'upi') {
        payload.upiId = selectedUpi || user?.upiId || '';
      }
      await paymentsApi.create(payload);

      // If PT is chosen and a trainer is selected, also update the member's trainer assignment!
      if (payForm.addPt && payForm.assignedTrainer) {
        await membersApi.update(showPayment._id, { assignedTrainer: payForm.assignedTrainer });
      }

      setShowPayment(null);
      fetchMembers(false, true, true);
      // Fetch the updated member details to refresh the detail modal cards automatically
      const res = await membersApi.getOne(showPayment._id);
      if (res.success) {
        setShowDetail(res.data);
      }
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleWhatsApp = async (member, templateId) => {
    try {
      await whatsappApi.sendTemplate({
        phone: member.phone,
        templateId,
        variables: {
          name: member.name,
          expiry: member.planExpiry ? new Date(member.planExpiry).toLocaleDateString('en-GB') : 'N/A',
          plan: member.plan || 'monthly',
          discount: '10',
          validity: '7 days',
          gymName: user?.gymName || 'our gym'
        }
      });
      alert('Message sent successfully!');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAssignTrainer = async (memberId, trainerId) => {
    try {
      await membersApi.update(memberId, { assignedTrainer: trainerId || null });
      setShowDetail(prev => ({ ...prev, assignedTrainer: trainers.find(t => t._id === trainerId) || null }));
    fetchMembers(false, true, true);
    } catch (err) {
      alert(err.message);
    }
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

  const statusBadge = (m) => {
    const now = new Date();
    if (m.status === 'inactive') {
      return <Badge variant="secondary" size="sm">Inactive</Badge>;
    }

    const effectiveExpiry = getEffectiveExpiry(m);
    const joinDate = new Date(m.joinDate || m.createdAt);
    const isJoinedToday = joinDate.toDateString() === now.toDateString();

    // No payment on record — show expired regardless of stored planExpiry
    if (!effectiveExpiry) {
      return <Badge variant="danger" size="sm">No Payment</Badge>;
    }

    if (isJoinedToday) {
      return <Badge variant="info" size="sm">Joined Today</Badge>;
    }

    const isExpired = effectiveExpiry < now;
    const diffTime = Math.abs(now - effectiveExpiry);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (isExpired) {
      return <Badge variant="danger" size="sm">Expired {diffDays === 0 ? 'Today' : `${diffDays} days ago`}</Badge>;
    }

    if (diffDays <= 3) {
      return <Badge variant="warning" size="sm">Expiring</Badge>;
    }

    return <Badge variant="success" size="sm">Paid</Badge>;
  };

  return (
    <div className="pb-2">
      {/* Main Bundle Card */}
      <div className="bg-bg-card border border-white/5 rounded-xl shadow-2xl flex flex-col">

        {/* Top Header & Stats Row */}
        <div className="py-4 px-6 border-b border-white/5 space-y-4">
          {/* Desktop & Laptop Header */}
          <div className="hidden md:flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-text-primary tracking-tight">Clients</h1>
              <div className="flex items-center gap-2 text-[10px] font-black text-text-muted uppercase tracking-widest mt-1 opacity-70">

                Listing <span className="text-white">{filteredMembers.length}</span> total entries
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-center md:justify-end">
              <SearchBar value={search} onChange={setSearch} placeholder="Search members..." />

              {/* Status Filter Dropdown */}
              <div className="relative" id="status-filter-container">
                <button
                  onClick={() => { setShowStatusFilterPopover(!showStatusFilterPopover); setShowDateFilterPopover(false); }}
                  className={`flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${statusFilter !== 'all' ? 'border-accent/40 bg-accent/5 text-accent shadow-lg shadow-accent/5' : ''
                    }`}
                >
                  <Filter size={14} className={statusFilter !== 'all' ? 'text-accent' : 'text-text-muted'} />
                  <span>{getStatusFilterLabel()}</span>
                  {statusFilter !== 'all' ? (
                    <X
                      size={12}
                      className="ml-1 hover:text-white transition-colors cursor-pointer text-text-muted"
                      onClick={(e) => { e.stopPropagation(); setStatusFilter('all'); setFilter('all'); setShowStatusFilterPopover(false); }}
                    />
                  ) : (
                    <ChevronDown size={12} className="text-text-muted opacity-60 ml-1" />
                  )}
                </button>

                {showStatusFilterPopover && (
                  <>
                    <div className="fixed inset-0 z-[110]" onClick={() => setShowStatusFilterPopover(false)} />
                    <div className="absolute left-0 mt-2 z-[120] bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-white/10 rounded-2xl p-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl w-52 space-y-1">
                      <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] px-2 pb-1">Filter by Status</p>
                      {STATUS_FILTER_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setStatusFilter(opt.value);
                            setFilter(opt.value === 'due_soon' ? 'expiring' : opt.value);
                            setShowStatusFilterPopover(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all text-left ${statusFilter === opt.value
                            ? 'bg-accent/10 text-accent border border-accent/20'
                            : 'text-text-secondary hover:bg-white/5 hover:text-white'
                            }`}
                        >
                          <span>{opt.label}</span>
                          {statusFilter === opt.value && <Check size={12} className="text-accent" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Calendar Filter Dropdown Button */}
              <div className="relative" id="date-filter-container">
                <button
                  onClick={() => { setShowDateFilterPopover(!showDateFilterPopover); setShowStatusFilterPopover(false); }}
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
                onClick={() => {
                  if (user?.subscriptionPlan && stats && stats.totalMembers >= user.subscriptionPlan.maxClients) {
                    setLimitReachedState({
                      title: 'Plan Limit Reached',
                      message: `You have reached your plan limit of ${user.subscriptionPlan.maxClients} clients. Please upgrade your software subscription to add more clients.`
                    });
                  } else {
                    setShowAdd(true);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-black rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-lg shadow-accent/20 active:scale-95 whitespace-nowrap"
              >
                <UserPlus size={14} /> Add Client
              </button>
            </div>
          </div>

          {/* Mobile View Header & Filters (Layout matching user screenshot, using system colors) */}
          <div className="block md:hidden space-y-4">
            {/* Title & Info */}
            <div className="px-2 flex items-center justify-between">
              <h1 className="text-2xl font-black text-text-primary tracking-tight">Clients</h1>
              <div className="text-[10px] font-black text-text-secondary bg-white/5 border border-white/10 px-3 py-1 rounded-xl uppercase tracking-wider">
                Total Clients: <span className="text-white font-black">{stats?.totalMembers || 0}</span>
              </div>
            </div>

            {/* Mobile View Tabs (Underlined, inline tabs with scroll arrows) */}
            <div className="relative px-2 border-b border-white/5">
              {showLeftArrow && (
                <button
                  type="button"
                  onClick={() => {
                    scrollContainerRef.current.scrollBy({ left: -100, behavior: 'smooth' });
                  }}
                  className="absolute left-0 top-0 bottom-0 z-10 w-10 flex items-center justify-start pl-2 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent text-text-muted hover:text-white transition-all cursor-pointer border-none outline-none"
                >
                  <ChevronLeft size={16} />
                </button>
              )}
              {showRightArrow && (
                <button
                  type="button"
                  onClick={() => {
                    scrollContainerRef.current.scrollBy({ left: 100, behavior: 'smooth' });
                  }}
                  className="absolute right-0 top-0 bottom-0 z-10 w-10 flex items-center justify-end pr-2 bg-gradient-to-l from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent text-text-muted hover:text-white transition-all cursor-pointer border-none outline-none"
                >
                  <ChevronRight size={16} />
                </button>
              )}

              <div
                ref={scrollContainerRef}
                onScroll={updateScrollArrows}
                className="flex overflow-x-auto no-scrollbar gap-5 pt-1 text-[11px] font-black uppercase tracking-wider scroll-smooth"
              >
                {['all', 'active', 'inactive', 'due_soon', 'expired'].map(tabVal => {
                  const isActive = (tabVal === 'all' && statusFilter === 'all') ||
                                   (tabVal === 'active' && statusFilter === 'paid') ||
                                   (tabVal === 'inactive' && statusFilter === 'inactive') ||
                                   (tabVal === 'due_soon' && statusFilter === 'due_soon') ||
                                   (tabVal === 'expired' && statusFilter === 'expired');
                  
                  const label = tabVal === 'all' ? 'All'
                              : tabVal === 'active' ? 'Active'
                              : tabVal === 'inactive' ? 'Inactive'
                              : tabVal === 'due_soon' ? 'Expiring Soon'
                              : 'Expired';
                              
                  const count = tabVal === 'all' ? getTabCounts.all
                              : tabVal === 'active' ? getTabCounts.active
                              : tabVal === 'inactive' ? getTabCounts.inactive
                              : tabVal === 'due_soon' ? getTabCounts.expiring
                              : getTabCounts.expired;

                  return (
                    <button
                      key={tabVal}
                      type="button"
                      onClick={() => {
                        const vals = getTabValues(tabVal);
                        setStatusFilter(vals.statusFilter);
                        setFilter(vals.filter);
                      }}
                      className={`pb-2.5 relative cursor-pointer font-black transition-all border-none bg-transparent outline-none whitespace-nowrap ${
                        isActive ? 'text-accent' : 'text-text-muted hover:text-white'
                      }`}
                    >
                      <span>{label}</span>
                      <span className="ml-1 opacity-60 text-[9px] font-bold">{count}</span>
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>


            {/* Inline Filter Buttons */}
            <div className="flex flex-wrap gap-2 px-2 pb-1 relative z-[60]">
              {/* Date Filter Button */}
              <div className="relative" id="mobile-date-filter-container">
                <button
                  type="button"
                  onClick={() => { setShowDateFilterPopover(!showDateFilterPopover); setShowStatusFilterPopover(false); }}
                  className={`flex items-center gap-1.5 px-3 py-2 bg-white/[0.02] border border-white/5 hover:bg-white/10 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${dateFilterType !== 'all' ? 'border-accent/40 bg-accent/5 text-accent' : ''}`}
                >
                  <Calendar size={12} className={dateFilterType !== 'all' ? 'text-accent' : 'text-text-muted'} />
                  <span>{getDateFilterLabel()}</span>
                  <ChevronDown size={10} className="text-text-muted opacity-60" />
                </button>
                {showDateFilterPopover && (
                  <>
                    <div className="fixed inset-0 z-[110]" onClick={() => setShowDateFilterPopover(false)} />
                    <div className="absolute left-0 mt-2 z-[120] bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-white/10 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl w-72 space-y-3">
                      <div>
                        <h4 className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] mb-1.5">Filter By Date</h4>
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

                      {dateFilterType === 'date' && (
                        <div className="space-y-1 animate-in fade-in duration-200">
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
                        <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-200">
                          <div className="space-y-1">
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
                          <div className="space-y-1">
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
                        <div className="space-y-1 animate-in fade-in duration-200">
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
                        <div className="space-y-2 animate-in fade-in duration-200">
                          <div className="space-y-1">
                            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Start Date</p>
                            <DatePicker
                              value={selectedRangeStart}
                              onChange={setSelectedRangeStart}
                              placeholder="From Date"
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-1">
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
                          type="button"
                          onClick={() => {
                            setDateFilterType('all');
                            setShowDateFilterPopover(false);
                          }}
                          className="flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-xl bg-white/5 text-text-muted hover:bg-white/10 hover:text-white transition-all text-center"
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDateFilterPopover(false)}
                          className="flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-xl bg-accent text-black hover:bg-accent-hover transition-all text-center"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Status Filter Button */}
              <div className="relative" id="mobile-status-filter-container">
                <button
                  type="button"
                  onClick={() => { setShowStatusFilterPopover(!showStatusFilterPopover); setShowDateFilterPopover(false); }}
                  className={`flex items-center gap-1.5 px-3 py-2 bg-white/[0.02] border border-white/5 hover:bg-white/10 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${statusFilter !== 'all' ? 'border-accent/40 bg-accent/5 text-accent' : ''}`}
                >
                  <Filter size={12} className={statusFilter !== 'all' ? 'text-accent' : 'text-text-muted'} />
                  <span>{getStatusFilterLabel()}</span>
                  <ChevronDown size={10} className="text-text-muted opacity-60" />
                </button>
                {showStatusFilterPopover && (
                  <>
                    <div className="fixed inset-0 z-[110]" onClick={() => setShowStatusFilterPopover(false)} />
                    <div className="absolute left-0 mt-2 z-[120] bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-white/10 rounded-2xl p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl w-48 space-y-1">
                      <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] px-2 pb-1">Filter by Status</p>
                      {STATUS_FILTER_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setStatusFilter(opt.value);
                            setFilter(opt.value === 'due_soon' ? 'expiring' : opt.value);
                            setShowStatusFilterPopover(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-left ${statusFilter === opt.value
                            ? 'bg-accent/10 text-accent border border-accent/20'
                            : 'text-text-secondary hover:bg-white/5 hover:text-white'
                            }`}
                        >
                          <span>{opt.label}</span>
                          {statusFilter === opt.value && <Check size={10} className="text-accent" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Stats Bar (Compact) */}
          {stats && (
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-5">
              <StatCard
                icon={<Users size={14} className="text-accent" />}
                label="Total Clients"
                value={stats.totalMembers}
                onClick={() => { setFilter('all'); setStatusFilter('all'); setPlanFilter('all'); setGenderFilter('all'); setSearch(''); }}
                trend={
                  <div className="flex flex-col items-end gap-1 pb-[1px] whitespace-nowrap">
                    <span className={`text-[9px] font-black uppercase tracking-tight ${stats.growth >= 0 ? 'text-success' : 'text-danger'}`}>
                      +{stats.newThisMonth} joined this month
                    </span>
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tight ${stats.growth >= 0 ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'}`}>
                      {stats.growth >= 0 ? <TrendingUp size={8} strokeWidth={3} /> : <TrendingDown size={8} strokeWidth={3} />}
                      <span>{Math.abs(stats.growth)}% Growth</span>
                    </div>
                  </div>
                }
                size="xs"
                flyInDirection="right"
                className="!bg-white/[0.02] border-white/5"
              />

              <StatCard
                icon={<Calendar size={14} className="text-accent" />}
                label="Expiring Soon"
                value={stats.expiringSoon}
                onClick={() => { setFilter('expiring'); setStatusFilter('due_soon'); setPlanFilter('all'); setGenderFilter('all'); setSearch(''); }}
                trend={
                  <div className="flex flex-col items-end gap-1 pb-[1px] whitespace-nowrap">
                    <span className="text-[9px] font-black uppercase tracking-tight text-danger">
                      {stats.expiredMembers} Overdue
                    </span>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tight bg-success/10 text-success border border-success/20">
                      <TrendingUp size={8} strokeWidth={3} />
                      <span>{stats.renewedToday} Renewed</span>
                    </div>
                  </div>
                }
                size="xs"
                flyInDirection="bottom"
                className="!bg-white/[0.02] border-white/5"
              />

              <StatCard
                icon={<Activity size={14} className="text-accent" />}
                label="Most Popular Plan"
                value={stats.popularPlan}
                onClick={() => { setPlanFilter(stats.popularPlan && stats.popularPlan !== 'N/A' ? stats.popularPlan : 'all'); setFilter('all'); setStatusFilter('all'); setGenderFilter('all'); setSearch(''); }}
                trend={
                  <div className="flex flex-col items-end gap-1 pb-[1px] whitespace-nowrap">
                    <span className="text-[9px] font-black uppercase tracking-tight text-info">
                      {stats.popularPlanPercentage}% Members
                    </span>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tight bg-warning/10 text-warning border border-warning/20">
                      <Zap size={8} strokeWidth={3} />
                      <span className="capitalize">{stats.highestRevenuePlan} Top Revenue</span>
                    </div>
                  </div>
                }
                size="xs"
                flyInDirection="top"
                className="!bg-white/[0.02] border-white/5"
              />

              <StatCard
                icon={<Banknote size={14} className="text-accent" />}
                label="Expected Renewals"
                value={`₹${(stats.expectedRevenue || 0).toLocaleString('en-IN')}`}
                onClick={() => { setFilter('expiring'); setStatusFilter('due_soon'); setPlanFilter('all'); setGenderFilter('all'); setSearch(''); }}
                trend={
                  <div className="flex flex-col items-end gap-1 pb-[1px] whitespace-nowrap">
                    <span className="text-[9px] font-black uppercase tracking-tight text-danger">
                      ₹{(stats.pendingRevenue || 0).toLocaleString('en-IN')} Pending
                    </span>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tight bg-info/10 text-info border border-info/20">
                      <Calendar size={8} strokeWidth={3} />
                      <span>{stats.dueThisWeek} expiring this week</span>
                    </div>
                  </div>
                }
                size="xs"
                flyInDirection="left"
                className="!bg-white/[0.02] border-white/5"
              />
            </div>
          )}


        </div>



        {loading ? null : members.length === 0 ? (
          <EmptyState icon={<Users size={48} className="text-text-muted opacity-50" />} title="No members found" description="Add your first member to get started" />
        ) : (
          <>
            {/* Desktop and Laptop View: Table Layout */}
            <div className="hidden md:block max-h-[292px] overflow-y-auto relative rounded-2xl border border-white/5">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#0a0a0a] z-10 border-b border-white/5 shadow-md">
                  <tr className="bg-white/[0.02]">
                    <th className="px-8 py-3 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] w-12">#</th>
                    <SortHeader label="Member" sortKey="name" />
                    <SortHeader label="Contact" sortKey="phone" />
                    <SortHeader label="Join Date" sortKey="joinDate" />
                    <SortHeader label="Coach" sortKey="assignedTrainer" />
                    <SortHeader label="Plan Info" sortKey="plan" />
                    <SortHeader label="Amount" sortKey="planAmount" />
                    <SortHeader label="Expiry Status" sortKey="planExpiry" />
                    <th className="px-6 py-3 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredMembers.map((m, idx) => {
                    const toggleOn = m.status === 'active';
                    const isGray = !toggleOn;

                    return (
                      <tr
                        key={m._id}
                        onClick={() => setShowDetail(m)}
                        className={`group transition-all cursor-pointer border-b border-white/5 ${isGray ? 'bg-white/[0.01]' : 'hover:bg-white/[0.02]'}`}
                      >
                        <td className={`px-8 py-2.5 ${isGray ? 'opacity-50 grayscale-[0.8]' : ''}`}>
                          <span className="text-[11px] font-black text-text-muted group-hover:text-accent transition-colors">{idx + 1}</span>
                        </td>
                        <td className={`px-6 py-2.5 ${isGray ? 'opacity-50 grayscale-[0.8]' : ''}`}>
                          <div className="flex items-center gap-3">
                            {m.photo ? (
                              <img src={m.photo} alt={m.name} className="w-8 h-8 rounded-full object-cover shadow-lg group-hover:scale-110 transition-transform border border-white/10" />
                            ) : (
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] shadow-lg group-hover:scale-110 transition-transform ${m.gender === 'female' ? 'bg-gradient-to-br from-pink-500/20 to-pink-500/5 text-pink-200 border border-pink-500/10' :
                                m.gender === 'male' ? 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-blue-200 border border-blue-500/10' :
                                  'bg-gradient-to-br from-white/10 to-white/5 text-white border-white/5'
                                }`}>
                                {m.name[0]}
                              </div>
                            )}
                            <p className={`text-xs font-black transition-colors ${m.gender === 'female' ? 'text-pink-200 group-hover:text-pink-100' :
                              m.gender === 'male' ? 'text-blue-200 group-hover:text-blue-100' :
                                'text-white group-hover:text-accent'
                              }`}>{m.name}</p>
                          </div>
                        </td>
                        <td className={`px-6 py-2.5 ${isGray ? 'opacity-50 grayscale-[0.8]' : ''}`}>
                          <p className="text-[11px] font-bold text-text-secondary leading-none">{m.phone}</p>
                        </td>
                        <td className={`px-6 py-2.5 ${isGray ? 'opacity-50 grayscale-[0.8]' : ''}`}>
                          <p className="text-[11px] font-black text-white/80">
                            {m.joinDate ? new Date(m.joinDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                          </p>
                        </td>
                        <td className={`px-6 py-2.5 ${isGray ? 'opacity-50 grayscale-[0.8]' : ''}`}>
                          {m.assignedTrainer ? (
                            <div className={`transition-colors ${m.assignedTrainer.gender === 'female' ? 'text-pink-300' :
                              m.assignedTrainer.gender === 'male' ? 'text-blue-300' :
                                'text-accent'
                              }`}>
                              <span className="text-[10px] font-black uppercase tracking-tighter">{m.assignedTrainer.name || 'Assigned'}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-black text-text-muted uppercase tracking-tighter italic">Unassigned</span>
                          )}
                        </td>
                        <td className={`px-6 py-2.5 ${isGray ? 'opacity-50 grayscale-[0.8]' : ''}`}>
                          <div className="flex items-center text-[10px] font-black uppercase tracking-widest">
                            {(() => {
                              const hasPt = m.assignedTrainer || (m.plan || '').toLowerCase().includes('pt');
                              const basePlan = m.plan.replace(/\s*\+\s*pt/gi, '');
                              return (
                                <p className="text-zinc-200">
                                  {basePlan}
                                  {hasPt && (
                                    <span className="text-accent font-black ml-1.5">+ PT</span>
                                  )}
                                </p>
                              );
                            })()}
                          </div>
                        </td>
                        <td className={`px-6 py-2.5 ${isGray ? 'opacity-50 grayscale-[0.8]' : ''}`}>
                          <p className="text-xs font-black text-white">₹{Number(m.planAmount).toLocaleString()}</p>
                        </td>
                        <td className={`px-6 py-2.5 ${isGray ? 'opacity-50 grayscale-[0.8]' : ''}`}>
                          <div className="flex items-center gap-3">
                            <div>{statusBadge(m)}</div>
                            <p className="text-[9px] text-text-muted font-black uppercase tracking-tighter">
                              {(() => {
                                const expiry = new Date(m.planExpiry);
                                const isExpired = expiry < new Date();
                                const diffDays = Math.abs(Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24)));
                                const isWarning = !isExpired && diffDays <= 3;

                                return (
                                  <>
                                    {isExpired ? null : diffDays <= 3 ? (
                                      <>Will expire in <span className="text-warning font-black">{diffDays} days</span></>
                                    ) : (
                                      <>Expires on <span className="text-text-secondary">{expiry.toLocaleDateString('en-GB')}</span></>
                                    )}
                                  </>
                                );
                              })()}
                            </p>
                          </div>
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

                                if (openMenuId === m._id) {
                                  setOpenMenuId(null);
                                  setActiveMenu(null);
                                } else {
                                  setOpenMenuId(m._id);
                                  setActiveMenu({
                                    id: m._id,
                                    x,
                                    y,
                                    data: m
                                  });
                                }
                              }}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${openMenuId === m._id ? 'bg-accent text-black shadow-lg shadow-accent/20' : 'bg-white/5 text-text-muted hover:bg-white/10 hover:text-white'}`}
                            >
                              <MoreVertical size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View: Card List Layout (Redesigned to match layout image) */}
            <div className="block md:hidden space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {filteredMembers.map((m, idx) => {
                const isExpanded = expandedMemberId === m._id;
                const toggleOn = m.status === 'active';
                const isGray = !toggleOn;

                return (
                  <div
                    key={m._id}
                    className={`card !p-0 flex flex-col transition-all border border-white/5 bg-[#0f0f11] rounded-[20px] shadow-lg ${
                      isGray ? 'opacity-65 grayscale-[0.3]' : ''
                    }`}
                  >
                    {/* Collapsed Header (Matches Image 1) */}
                    <div
                      onClick={() => setExpandedMemberId(isExpanded ? null : m._id)}
                      className="flex items-center justify-between p-4 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar Squircle */}
                        {m.photo ? (
                          <img
                            src={m.photo}
                            alt={m.name}
                            className="w-10 h-10 rounded-[12px] object-cover border border-white/10 shadow-md shrink-0"
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-[12px] flex items-center justify-center font-black text-xs text-black bg-accent shadow-md shrink-0"
                          >
                            {getInitials(m.name)}
                          </div>
                        )}

                        {/* Name & Plan Details */}
                        <div className="flex flex-col min-w-0">
                          <span className="text-[14px] font-black text-white tracking-tight leading-tight truncate">
                            {m.name}
                          </span>
                          <span className="text-[11px] font-bold text-text-secondary mt-1 leading-none truncate">
                            {m.plan}
                            {m.timeSlot ? ` (${m.timeSlot})` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {/* Amount & Status */}
                        <div className="flex flex-col items-end">
                          <span className="text-[14px] font-black text-white tracking-tight leading-tight">
                            ₹{Number(m.planAmount || 0).toLocaleString('en-IN')}
                          </span>
                          {(() => {
                            const statusInfo = getMemberStatus(m);
                            return (
                              <span className={`text-[11px] font-black mt-1 leading-none uppercase tracking-wide ${statusInfo.color}`}>
                                {statusInfo.text}
                              </span>
                            );
                          })()}
                        </div>

                        {/* Chevron Icon */}
                        <div className="text-text-secondary">
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content (Matches Image 2) */}
                    {isExpanded && (
                      <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                        {/* Horizontal separator */}
                        <div className="h-px bg-white/5 mx-4" />

                        {/* 3-Column Info Grid */}
                        <div className="grid grid-cols-3 gap-y-4 gap-x-2 px-4 py-4.5">
                          {/* Row 1 */}
                          <div>
                            <p className="text-[12px] font-black text-white leading-tight">
                              {m.joinDate
                                ? new Date(m.joinDate).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })
                                : 'N/A'}
                            </p>
                            <p className="text-[8px] font-black text-text-muted uppercase tracking-[0.15em] mt-1 leading-none">
                              JOINED
                            </p>
                          </div>
                          <div>
                            <p className="text-[12px] font-black text-white leading-tight">
                              {m.planExpiry
                                ? new Date(m.planExpiry).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })
                                : 'N/A'}
                            </p>
                            <p className="text-[8px] font-black text-text-muted uppercase tracking-[0.15em] mt-1 leading-none">
                              EXPIRES
                            </p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-black text-white leading-tight truncate" title={m.assignedTrainer ? m.assignedTrainer.name : 'Unassigned'}>
                              {m.assignedTrainer ? m.assignedTrainer.name : 'Unassigned'}
                            </p>
                            <p className="text-[8px] font-black text-text-muted uppercase tracking-[0.15em] mt-1 leading-none">
                              COACH
                            </p>
                          </div>

                          {/* Row 2 */}
                          <div>
                            <p className="text-[12px] font-black text-white leading-tight capitalize">
                              {m.gender || 'N/A'}
                            </p>
                            <p className="text-[8px] font-black text-text-muted uppercase tracking-[0.15em] mt-1 leading-none">
                              GENDER
                            </p>
                          </div>
                          <div>
                            <p className="text-[12px] font-black text-white leading-tight">
                              {m.phone ? `+91 ${m.phone.slice(0, 5)} ${m.phone.slice(5)}` : 'N/A'}
                            </p>
                            <p className="text-[8px] font-black text-text-muted uppercase tracking-[0.15em] mt-1 leading-none">
                              CONTACT
                            </p>
                          </div>
                          <div>
                            <p className="text-[12px] font-black text-white leading-tight">
                              {m.dob
                                ? new Date(m.dob).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })
                                : 'N/A'}
                            </p>
                            <p className="text-[8px] font-black text-text-muted uppercase tracking-[0.15em] mt-1 leading-none">
                              DOB
                            </p>
                          </div>
                        </div>

                        {/* Horizontal separator */}
                        <div className="h-px bg-white/5 mx-4" />

                        {/* Bottom Toolbar Icons */}
                        <div className="flex items-center justify-around py-3 px-4 text-accent">
                          {/* Attendance Icon */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDetail(m);
                              setActiveSubView('attendance');
                            }}
                            className="p-2 rounded-xl bg-accent/5 hover:bg-accent/10 text-accent border border-accent/10 transition-all active:scale-90"
                            title="Attendance History"
                          >
                            <Calendar size={18} />
                          </button>

                          {/* Payment Icon */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowPayment(m);
                              setPayForm({ amount: String(m.planAmount || 0), plan: m.plan || 'monthly', paymentMethod: 'cash', payFromCurrentDate: false, addPt: false, assignedTrainer: '' });
                            }}
                            className="p-2 rounded-xl bg-accent/5 hover:bg-accent/10 text-accent border border-accent/10 transition-all active:scale-90"
                            title="Record Payment"
                          >
                            <CreditCard size={18} />
                          </button>

                          {/* WhatsApp Icon */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowWhatsAppModal(m);
                            }}
                            className="p-2 rounded-xl bg-accent/5 hover:bg-accent/10 text-accent border border-accent/10 transition-all active:scale-90"
                            title="Send WhatsApp Alert"
                          >
                            <MessageCircle size={18} />
                          </button>

                          {/* Edit Icon */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const formattedMember = {
                                name: m.name,
                                phone: m.phone,
                                gender: m.gender || 'male',
                                dob: m.dob ? new Date(m.dob).toISOString().split('T')[0] : '',
                                joinDate: m.joinDate ? new Date(m.joinDate).toISOString().split('T')[0] : '',
                                photo: m.photo || '',
                                plan: m.plan || 'monthly',
                                planAmount: m.planAmount || '1500',
                                addPt: m.assignedTrainer ? true : false,
                                assignedTrainer: m.assignedTrainer?._id || m.assignedTrainer || '',
                                timeSlot: m.timeSlot || ''
                              };
                              setForm(formattedMember);
                              setShowAdd(true);
                              setIsEditing(m._id);
                              setOriginalMember(m);
                            }}
                            className="p-2 rounded-xl bg-accent/5 hover:bg-accent/10 text-accent border border-accent/10 transition-all active:scale-90"
                            title="Edit Profile"
                          >
                            <Edit3 size={18} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Infinite Scroll Trigger */}
            {pagination.page < pagination.pages && (
              <div ref={loadMoreRef} className="py-6 flex justify-center w-full">
                <Loader size="sm" />
              </div>
            )}

            {/* Mobile View: Floating Action Button (FAB) matching user screenshot (uses system accent color) */}
            <button
              type="button"
              onClick={() => {
                if (user?.subscriptionPlan && stats && stats.totalMembers >= user.subscriptionPlan.maxClients) {
                  setLimitReachedState({
                    title: 'Plan Limit Reached',
                    message: `You have reached your plan limit of ${user.subscriptionPlan.maxClients} clients. Please upgrade your software subscription to add more clients.`
                  });
                } else {
                  setShowAdd(true);
                }
              }}
              className="md:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full bg-accent hover:bg-accent-hover text-black flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-white/10 z-[50] transition-all active:scale-95 cursor-pointer"
            >
              <UserPlus size={22} />
            </button>
          </>
        )}
      </div>

      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); setIsEditing(null); setShowTimeSlotError(false); setForm({ name: '', phone: '', gender: 'male', dob: '', joinDate: new Date().toISOString().split('T')[0], photo: '', plan: '', planAmount: '', addPt: false, assignedTrainer: '', timeSlot: '' }); }} title={isEditing ? 'Update Member Profile' : 'Add New Member'} size="md" overflowVisible={true} titleClassName="!text-[20px] !font-normal">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="space-y-3">
            {/* Full Name & Phone Number Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Full Name *</p>
                <input
                  placeholder="Full Name"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                  className="!py-2 !px-3 !text-[11px] !font-normal !bg-white/[0.02] border border-white/5 !rounded-xl focus:border-accent/30 transition-all w-full"
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
                  className="!py-2 !px-3 !text-[11px] !font-normal !bg-white/[0.02] border border-white/5 !rounded-xl focus:border-accent/30 transition-all w-full"
                />
              </div>
            </div>

            {/* Gender Selection & Attending Time Slot Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Gender Selection */}
              <div className="space-y-1">
                <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Gender</p>
                <div className="flex gap-1.5">
                  {['male', 'female'].map(g => {
                    const isActive = form.gender === g;
                    let activeClasses = '';
                    if (isActive) {
                      if (g === 'female') {
                        activeClasses = 'bg-pink-500/20 border-pink-500/30 text-pink-200 shadow-[0_2px_10px_rgba(236,72,153,0.1)]';
                      } else if (g === 'male') {
                        activeClasses = 'bg-blue-500/20 border-blue-500/30 text-blue-200 shadow-[0_2px_10px_rgba(59,130,246,0.15)]';
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

              {/* Attending Time Slot */}
              {shiftOptions.length > 1 ? (
                <div className="space-y-1">
                  <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Attending Time Slot *</p>
                  <Select
                    value={form.timeSlot || ''}
                    placeholder="Select Time Slot"
                    searchable={false}
                    options={shiftOptions}
                    onChange={(val) => {
                      const selectedTrainer = trainers.find(t => t._id === form.assignedTrainer);
                      const isCompatible = !selectedTrainer || isTrainerCompatible(selectedTrainer, val, user?.timeSlots);
                      setForm(prev => ({
                        ...prev,
                        timeSlot: val,
                        assignedTrainer: isCompatible ? prev.assignedTrainer : ''
                      }));
                      if (val) setShowTimeSlotError(false);
                    }}
                    className="add-member-select"
                  />
                  {showTimeSlotError && !form.timeSlot && <p className="text-[11px] text-accent/70 font-normal uppercase animate-pulse ml-1">Required: Please select a gym slot</p>}
                </div>
              ) : (
                <div />
              )}
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Joining Date</p>
                <DatePicker
                  value={form.joinDate}
                  onChange={(val) => setForm({ ...form, joinDate: val })}
                  placeholder="Joining Date"
                  className="add-member-date-picker"
                />
              </div>
              <div className="space-y-1">
                <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Date of Birth</p>
                <DatePicker
                  value={form.dob}
                  onChange={(val) => handleDobChange({ target: { value: val } })}
                  placeholder="Select DOB"
                  align="right"
                  className="add-member-date-picker"
                />
              </div>
            </div>

            {/* Plan details Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Plan *</p>
                <Select
                  value={form.plan}
                  searchable={false}
                  options={planOptions}
                  onChange={(val) => {
                    const selectedPlan = plans.find(p => p.name === val);
                    const newAmount = selectedPlan ? selectedPlan.discountedPrice : form.planAmount;
                    setForm({ ...form, plan: val, planAmount: newAmount, addPt: false, assignedTrainer: '' });
                  }}
                  className="add-member-select"
                />
              </div>
              <div className="space-y-1">
                <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Amount ₹ *</p>
                <input placeholder="Amount ₹"
                  type="number"
                  value={form.planAmount}
                  onChange={e => setForm({ ...form, planAmount: e.target.value })}
                  required
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none !py-2 !px-3 !text-[11px] !font-normal !bg-white/[0.02] border border-white/5 !rounded-xl focus:border-accent/30 transition-all w-full"
                />
              </div>
            </div>

            {/* PT add-on Toggle */}
            {(() => {
              const selectedPlan = plans.find(p => p.name === form.plan);
              if (selectedPlan && (selectedPlan.hasPtPricing === true || selectedPlan.hasPtPricing === 'true')) {
                return (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-accent/5 border border-accent/10 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-[12px] font-normal text-accent uppercase tracking-wider leading-none">Personal Training (PT) Add-on</p>
                      <p className="text-[11px] text-text-muted mt-1.5 font-normal leading-none">Include PT for +₹{selectedPlan.ptDiscountedPrice} (Total: ₹{selectedPlan.discountedPrice + selectedPlan.ptDiscountedPrice})</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePtToggle(!form.addPt)}
                      className={`relative inline-flex h-4.5 w-8.5 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out ${form.addPt ? 'bg-accent' : 'bg-white/10'}`}
                    >
                      <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${form.addPt ? 'translate-x-1.75' : '-translate-x-1.75'}`} />
                    </button>
                  </div>
                );
              }
              return null;
            })()}

            {form.addPt && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 mt-2">
                <div className="space-y-1.5">
                  <p className="text-[12px] uppercase tracking-[0.2em] text-text-muted font-normal ml-1">Assign PT Trainer *</p>
                  {trainers.filter(t => t.status === 'active' && (t.trainerType === 'PT Trainer' || t.trainerType === 'PT + Trainer')).length === 0 ? (
                    <div className="p-3 rounded-xl bg-danger/5 border border-danger/10 text-danger flex items-start gap-2">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider">No PT trainers found</p>
                        <p className="text-[10px] text-text-secondary font-medium mt-0.5">Please add a PT trainer in the <a href="/trainers" className="text-accent hover:underline font-bold">Trainers page</a> first.</p>
                      </div>
                    </div>
                  ) : trainers.filter(t => t.status === 'active' && (t.trainerType === 'PT Trainer' || t.trainerType === 'PT + Trainer') && isTrainerCompatible(t, form.timeSlot, user?.timeSlots)).length === 0 ? (
                    <p className="text-[11px] text-[#ff6b6b] font-normal uppercase tracking-wide ml-1">
                      This attending slot has no Personal Trainer
                    </p>
                  ) : (
                    <>
                      <Select
                        value={form.assignedTrainer || ''}
                        searchable={false}
                        options={[
                          { label: 'Select Trainer', value: '' },
                          ...trainers
                            .filter(t => t.status === 'active' && (t.trainerType === 'PT Trainer' || t.trainerType === 'PT + Trainer') && isTrainerCompatible(t, form.timeSlot, user?.timeSlots))
                            .map(t => ({ label: `${t.name} (${t.clientCount || 0} active clients)`, value: t._id }))
                        ]}
                        onChange={(val) => setForm({ ...form, assignedTrainer: val })}
                        className="add-member-select"
                      />
                      {!form.assignedTrainer && <p className="text-[11px] text-accent/70 font-normal uppercase animate-pulse ml-1">Required for PT Plans</p>}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Photo URL */}
            <div className="space-y-1">
              <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Photo URL (optional)</p>
              <input
                placeholder="https://example.com/photo.jpg"
                value={form.photo || ''}
                onChange={e => setForm({ ...form, photo: e.target.value })}
                className="!py-2 !px-3 !text-[11px] !font-normal !bg-white/[0.02] border border-white/5 !rounded-xl focus:border-accent/30 transition-all w-full"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-2 pt-1.5">
            <button
              type="button"
              onClick={() => { setShowAdd(false); setIsEditing(null); setShowTimeSlotError(false); setForm({ name: '', phone: '', gender: 'male', dob: '', joinDate: new Date().toISOString().split('T')[0], photo: '', plan: '', planAmount: '', addPt: false, assignedTrainer: '', timeSlot: '' }); }}
              className="flex-1 py-2.5 !text-[14px] !font-normal tracking-wide rounded-xl transition-all duration-300 bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary active:bg-white/20 active:scale-95 border border-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 btn-primary !py-2.5 !text-[14px] !font-normal tracking-wide shadow-lg shadow-accent/15 hover:scale-[1.01] active:scale-95 transition-all"
            >
              {saving ? 'Processing...' : (isEditing ? 'Update Member' : 'Add Member')}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!showDetail}
        onClose={() => setShowDetail(null)}
        title={
          activeSubView === 'payments' ? "Payment History" :
            activeSubView === 'attendance' ? "Attendance / Visits" :
              "Member Profile"
        }
        onBack={activeSubView ? () => setActiveSubView(null) : null}
        size="md"
      >
        {showDetail && (
          <div className="overflow-hidden relative w-full">
            {activeSubView === null && (
              /* View 1: Main Member Profile */
              <div className="space-y-2 py-0 px-1 animate-in fade-in duration-200">
                {/* Header Info */}
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-4">
                    {showDetail.photo ? (
                      <img src={showDetail.photo} alt={showDetail.name} className="w-14 h-14 rounded-2xl object-cover border border-white/10 shadow-2xl" />
                    ) : (
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-2xl ${showDetail.gender === 'female' ? 'bg-gradient-to-br from-pink-500/20 to-pink-500/5 text-pink-200 border border-pink-500/10' :
                        'bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-blue-200 border border-blue-500/10'
                        }`}>
                        {showDetail.name[0]}
                      </div>
                    )}
                    <div>
                      <h3 className="text-[15px] font-black text-white leading-tight">
                        {showDetail.name} <span className="text-text-muted font-bold text-[12px] capitalize">({showDetail.gender || 'N/A'})</span>
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-bold text-text-muted">{showDetail.phone}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={showDetail.status === 'active' ? 'success' : 'secondary'} size="sm" className="font-black uppercase tracking-wider text-[9px] px-2.5 py-1 border border-white/5">
                      {showDetail.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                {/* Membership Plan Details Card */}
                {(() => {
                  const latestPayment = paymentHistory && paymentHistory.length > 0
                    ? [...paymentHistory].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
                    : null;
                  const expiryDate = latestPayment ? latestPayment.newExpiry : showDetail.planExpiry;
                  const expiryDateObj = new Date(expiryDate);
                  const isExpired = expiryDateObj < new Date();
                  const diffTime = Math.abs(new Date() - expiryDateObj);
                  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                  const daysRemainingText = isExpired
                    ? `Expired ${diffDays === 0 ? 'Today' : `${diffDays} days ago`}`
                    : `${diffDays} days remaining`;

                  // Check if it is a Personal Training plan
                  const isPtPlan = !!showDetail.assignedTrainer || (showDetail.plan || '').toLowerCase().includes('pt') || !!showDetail.addPt;
                  const planTypeText = isPtPlan ? 'PT Plan' : 'Non-PT Plan';

                  // Calculate specific price if member plan includes PT
                  const getSpecificPricing = (member) => {
                    const total = member.planAmount || member.renewalAmount || 0;
                    if (!total) return '₹0';

                    const matchedPlan = plans.find(p => p.name.toLowerCase() === (member.plan || '').toLowerCase());
                    if (matchedPlan) {
                      const base = matchedPlan.discountedPrice || 0;
                      const pt = matchedPlan.ptDiscountedPrice || 0;
                      if (base + pt === total) {
                        return `₹${base} + ₹${pt}(PT)`;
                      }
                    }

                    if (isPtPlan) {
                      const base = Math.floor(total / 2);
                      const pt = total - base;
                      return `₹${base} + ₹${pt}(PT)`;
                    }

                    return `₹${total.toLocaleString()}`;
                  };

                  const pricingDisplay = getSpecificPricing(showDetail);

                  return (
                    <div className="relative overflow-hidden p-4 rounded-2xl border bg-white/[0.02] border-white/5 shadow-inner">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-muted leading-none">Membership Plan</p>
                          <h4 className="text-sm font-black text-white uppercase tracking-wider mt-1">
                            {showDetail.plan}
                            {showDetail.assignedTrainer && !(showDetail.plan || '').toLowerCase().includes('pt') && ' + PT'}
                          </h4>
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
                            {expiryDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
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

                {/* Details Container Box */}
                {(() => {
                  const presentRecords = attendanceHistory.filter(a => a.status === 'present');
                  const totalVisits = presentRecords.length;

                  // Parse Age based on dob and include formatted DOB
                  const getAgeAndDob = (dob) => {
                    if (!dob) return 'N/A';
                    const diffMs = Date.now() - new Date(dob).getTime();
                    const ageDt = new Date(diffMs);
                    const age = Math.abs(ageDt.getUTCFullYear() - 1970);
                    const formattedDob = new Date(dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                    return `${age} Years (${formattedDob})`;
                  };

                  return (
                    <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 space-y-3">
                      <div className="flex items-center justify-between py-1 border-b border-white/5">
                        <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Age</span>
                        <span className="text-[11px] font-black text-white">{getAgeAndDob(showDetail.dob)}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-white/5">
                        <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Preferred Slot</span>
                        <span className="text-[11px] font-black text-white uppercase">{showDetail.timeSlot || 'Any Time'}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-white/5">
                        <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Enrolled Since</span>
                        <span className="text-[11px] font-black text-white">
                          {showDetail.joinDate ? new Date(showDetail.joinDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-white/5">
                        <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Trainer / Coach</span>
                        <span className="text-[11px] font-black text-accent uppercase">
                          {showDetail.assignedTrainer?.name || showDetail.assignedTrainer || 'None'}
                        </span>
                      </div>

                      {/* Interactive Payments Row */}
                      <div
                        onClick={() => setActiveSubView('payments')}
                        className="flex items-center justify-between py-1 border-b border-white/5 hover:text-accent cursor-pointer group transition-all"
                      >
                        <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider group-hover:text-accent">Payment History</span>
                        <span className="text-[10px] font-black text-white px-2 py-0.5 bg-white/5 group-hover:bg-accent/15 group-hover:text-accent border border-white/5 rounded-md transition-all">
                          Click to View →
                        </span>
                      </div>

                      {/* Interactive Visits/Attendance Row */}
                      <div
                        onClick={() => setActiveSubView('attendance')}
                        className="flex items-center justify-between py-1 hover:text-accent cursor-pointer group transition-all"
                      >
                        <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider group-hover:text-accent">Visits & Attendance</span>
                        <span className="text-[10px] font-black text-white px-2 py-0.5 bg-white/5 group-hover:bg-accent/15 group-hover:text-accent border border-white/5 rounded-md transition-all">
                          {totalVisits} Sessions →
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Quick Action Footer */}
                {(() => {
                  const effExpiry = getEffectiveExpiry(showDetail);
                  const hasNoPayment = !effExpiry;
                  const isAlreadyPaid = !hasNoPayment && showDetail.status === 'active' && effExpiry && effExpiry > new Date();
                  return (
                    <div className="flex gap-2 pt-1">
                      <button
                        disabled={isAlreadyPaid}
                        onClick={() => {
                          setShowDetail(null);
                          setShowPayment(showDetail);
                          setPayForm({ amount: String(showDetail.planAmount || 0), plan: showDetail.plan || 'monthly', paymentMethod: 'cash', payFromCurrentDate: false, addPt: false, assignedTrainer: '' });
                        }}
                        className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] flex-1 transition-all active:scale-[0.98] ${isAlreadyPaid
                          ? 'bg-white/5 text-text-muted border border-white/5 opacity-50 cursor-not-allowed'
                          : 'bg-accent hover:bg-accent-hover text-black shadow-lg shadow-accent/15'
                          }`}
                      >
                        <Banknote size={13} />
                        {isAlreadyPaid ? 'Paid' : 'Renew Plan'}
                      </button>
                      <button
                        onClick={() => setShowWhatsAppModal(showDetail)}
                        className="flex items-center justify-center gap-1.5 bg-[#25d366]/10 hover:bg-[#25d366]/20 text-[#25d366] py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] border border-[#25d366]/20 flex-1 transition-all active:scale-[0.98]"
                      >
                        <MessageCircle size={13} /> Send Alert
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

            {activeSubView === 'payments' && (
              /* View 2: Payment History */
              <div className="space-y-4 py-1 pr-0.5 animate-in fade-in duration-200">
                {subViewLoading ? (
                  <div className="py-12 flex justify-center"><Loader /></div>
                ) : (
                  <div className="space-y-4">
                    {/* List of Past Payments */}
                    <h4 className="text-[12px] font-black text-white uppercase tracking-wider">Past Receipts ({paymentHistory.length})</h4>

                    <div className="bg-white/[0.01] border border-white/5 rounded-2xl overflow-hidden max-h-[280px] overflow-y-auto no-scrollbar">
                      {/* Desktop Table View */}
                      <table className="hidden md:table w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-white/[0.02] border-b border-white/5">
                            <th className="px-4 py-3 text-[11px] font-black text-text-muted uppercase tracking-wider">Plan</th>
                            <th className="px-4 py-3 text-[11px] font-black text-text-muted uppercase tracking-wider">Amount</th>
                            <th className="px-4 py-3 text-[11px] font-black text-text-muted uppercase tracking-wider">Paid On</th>
                            <th className="px-4 py-3 text-[11px] font-black text-text-muted uppercase tracking-wider">Expiry</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {paymentHistory.length === 0 ? (
                            <tr>
                              <td colSpan="4" className="text-center py-8 text-text-muted font-bold text-[11px] uppercase tracking-widest opacity-60">
                                No receipts found.
                              </td>
                            </tr>
                          ) : (
                            paymentHistory.map((p) => {
                              const isPtPayment = p.isPtPayment || (p.notes && (p.notes.toLowerCase().includes('pt') || p.notes.toLowerCase().includes('personal')));
                              const badgeText = (p.notes || '').toLowerCase().includes('upgrade') ? 'PT' : 'Training + PT';
                              const shouldDisplayNote = p.notes && !p.notes.toLowerCase().startsWith('initial membership payment');
                              const isCancelled = p.status === 'cancelled';
                              return (
                                <tr key={p._id || p.createdAt} className={`hover:bg-white/[0.02] transition-colors ${isCancelled ? 'opacity-40' : ''}`}>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`text-[12px] font-black uppercase tracking-wider ${isCancelled ? 'line-through text-text-muted' : 'text-white'}`}>{p.plan}</span>
                                        {isPtPayment && (
                                          <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${isCancelled ? 'text-danger bg-danger/10 border border-danger/20 line-through' : 'text-accent bg-accent/15 border border-accent/30'}`}>
                                            {badgeText}
                                          </span>
                                        )}
                                        {isCancelled && (
                                          <span className="text-[8px] font-black uppercase tracking-wider text-danger bg-danger/15 border border-danger/30 px-1.5 py-0.5 rounded-md">
                                            CANCELLED
                                          </span>
                                        )}
                                      </div>
                                      {shouldDisplayNote && (
                                        <span className="text-[9px] text-text-muted font-medium italic max-w-[200px] truncate" title={p.notes}>
                                          {p.notes}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className={`px-4 py-3 text-[12px] font-black ${isCancelled ? 'text-text-muted line-through' : 'text-success'}`}>₹{p.amount?.toLocaleString()}</td>
                                  <td className={`px-4 py-3 text-[12px] font-bold ${isCancelled ? 'text-text-muted line-through' : 'text-text-secondary'}`}>
                                    {new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                  </td>
                                  <td className={`px-4 py-3 text-[12px] font-black ${isCancelled ? 'text-text-muted line-through' : 'text-white'}`}>
                                    {new Date(p.newExpiry).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>

                      {/* Mobile List View */}
                      <div className="block md:hidden divide-y divide-white/5">
                        {paymentHistory.length === 0 ? (
                          <div className="text-center py-8 text-text-muted font-bold text-[11px] uppercase tracking-widest opacity-60">
                            No receipts found.
                          </div>
                        ) : (
                          paymentHistory.map((p) => {
                            const isPtPayment = p.isPtPayment || (p.notes && (p.notes.toLowerCase().includes('pt') || p.notes.toLowerCase().includes('personal')));
                            const badgeText = (p.notes || '').toLowerCase().includes('upgrade') ? 'PT' : 'Training + PT';
                            const shouldDisplayNote = p.notes && !p.notes.toLowerCase().startsWith('initial membership payment');
                            const isCancelled = p.status === 'cancelled';
                            return (
                              <div key={p._id || p.createdAt} className={`p-4 flex flex-col gap-2 ${isCancelled ? 'opacity-40' : ''}`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={`text-[12px] font-black uppercase tracking-wider ${isCancelled ? 'line-through text-text-muted' : 'text-white'}`}>{p.plan}</span>
                                      {isPtPayment && (
                                        <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${isCancelled ? 'text-danger bg-danger/10 border border-danger/20 line-through' : 'text-accent bg-accent/15 border border-accent/30'}`}>
                                          {badgeText}
                                        </span>
                                      )}
                                      {isCancelled && (
                                        <span className="text-[8px] font-black uppercase tracking-wider text-danger bg-danger/15 border border-danger/30 px-1.5 py-0.5 rounded-md">
                                          CANCELLED
                                        </span>
                                      )}
                                    </div>
                                    {shouldDisplayNote && (
                                      <span className="text-[9px] text-text-muted font-medium italic max-w-[200px] truncate" title={p.notes}>
                                        {p.notes}
                                      </span>
                                    )}
                                  </div>
                                  <span className={`text-[12px] font-black ${isCancelled ? 'text-text-muted line-through' : 'text-success'}`}>₹{p.amount?.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between text-[11px] pt-1">
                                  <div className="text-text-muted">
                                    Paid On: <span className={`font-bold ${isCancelled ? 'line-through' : 'text-text-secondary'}`}>{new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                                  </div>
                                  <div className="text-text-muted">
                                    Expiry: <span className={`font-black ${isCancelled ? 'line-through' : 'text-white'}`}>{new Date(p.newExpiry).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setActiveSubView(null)}
                  className="w-full py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary active:bg-white/20 active:scale-95 border border-white/5"
                >
                  Back to Profile
                </button>
              </div>
            )}

            {activeSubView === 'attendance' && (
              /* View 3: Attendance History (Monthly Calendar Preview) */
              <div className="space-y-3 py-1 pr-0.5 animate-in fade-in duration-200">
                {subViewLoading ? (
                  <div className="py-12 flex justify-center"><Loader /></div>
                ) : (
                  (() => {
                    const year = historyMonth.getFullYear();
                    const month = historyMonth.getMonth();
                    const firstDayIndex = new Date(year, month, 1).getDay();
                    const totalDays = new Date(year, month + 1, 0).getDate();
                    const daysGrid = [];
                    for (let i = 0; i < firstDayIndex; i++) daysGrid.push(null);
                    for (let d = 1; d <= totalDays; d++) daysGrid.push(d);

                    const todayStr = new Date().toISOString().split('T')[0];
                    const joinDateVal = showDetail.joinDate || showDetail.createdAt;
                    const joinDateStr = joinDateVal ? new Date(joinDateVal).toISOString().split('T')[0] : '1970-01-01';

                    let totalPresents = 0;
                    let totalAbsents = 0;
                    for (let d = 1; d <= totalDays; d++) {
                      const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                      if (dayStr > todayStr) continue;

                      const matched = attendanceHistory.find(r => r.date === dayStr);
                      if (matched?.status === 'present') {
                        totalPresents++;
                      } else if (matched?.status === 'absent') {
                        totalAbsents++;
                      } else if (dayStr >= joinDateStr) {
                        // Do not automatically count today as absent since the day is still ongoing
                        if (dayStr === todayStr) continue;
                        totalAbsents++;
                      }
                    }

                    return (
                      <div className="space-y-4">
                        {/* Month Selector */}
                        <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl p-1.5">
                          <button
                            type="button"
                            onClick={() => setHistoryMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                            className="px-2 py-0.5 text-[10px] font-black rounded hover:bg-white/5 text-text-muted hover:text-white transition-all"
                          >
                            &larr;
                          </button>
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">
                            {historyMonth.toLocaleDateString('en', { month: 'short', year: 'numeric' })}
                          </span>
                          <button
                            type="button"
                            onClick={() => setHistoryMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                            className="px-2 py-0.5 text-[10px] font-black rounded hover:bg-white/5 text-text-muted hover:text-white transition-all"
                          >
                            &rarr;
                          </button>
                        </div>

                        {/* Calendar Grid */}
                        <div className="space-y-3">
                          <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black text-text-muted uppercase tracking-wider">
                            <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                          </div>

                          <div className="grid grid-cols-7 gap-1 justify-items-center">
                            {daysGrid.map((day, idx) => {
                              if (day === null) {
                                return <div key={`empty-${idx}`} className="w-8 h-8" />;
                              }

                              const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                              const matched = attendanceHistory.find(r => r.date === dayStr);

                              const isJoined = dayStr >= joinDateStr;
                              const isPastOrToday = dayStr <= todayStr;

                              let tileClass = "w-8 h-8 rounded-lg flex flex-col items-center justify-center text-[10px] font-black transition-all border ";

                              if (matched?.status === 'present') {
                                tileClass += "bg-success/20 border-success/35 text-success shadow-[0_0_10px_rgba(34,197,94,0.1)]";
                              } else if (matched?.status === 'absent' || (isJoined && dayStr < todayStr && !matched)) {
                                tileClass += "bg-danger/20 border-danger/35 text-danger shadow-[0_0_10px_rgba(239,68,68,0.1)]";
                              } else if (isJoined && dayStr === todayStr && !matched) {
                                tileClass += "bg-amber-500/15 border-amber-500/35 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.15)] animate-pulse";
                              } else {
                                const isDayFuture = dayStr > todayStr;
                                if (isDayFuture) {
                                  tileClass += "bg-white/[0.01] border-dashed border-white/5 text-text-muted/40 opacity-40";
                                } else {
                                  tileClass += "bg-white/[0.02] border-white/5 text-text-muted/30 cursor-default";
                                }
                              }

                              return (
                                <div key={`day-${day}`} className={tileClass}>
                                  <span>{day}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Totals Summary Footer */}
                        <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[9px] font-black uppercase tracking-wider">
                          <div className="flex items-center gap-1.5 text-success">
                            <span className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                            <span>Present: <span className="text-white font-extrabold">{totalPresents} days</span></span>
                          </div>
                          <div className="flex items-center gap-1.5 text-danger">
                            <span className="w-1.5 h-1.5 rounded-full bg-danger shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                            <span>Absent: <span className="text-white font-extrabold">{totalAbsents} days</span></span>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
                <button
                  type="button"
                  onClick={() => setActiveSubView(null)}
                  className="w-full py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary active:bg-white/20 active:scale-95 border border-white/5"
                >
                  Back to Profile
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={!!showPayment} onClose={() => setShowPayment(null)} title={`Payment - ${showPayment?.name || ''}`} size="sm">
        <form onSubmit={handlePayment} className="space-y-5">
          {/* Plan Selector */}
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black ml-1">Plan</p>
            <Select
              value={payForm.plan}
              searchable={false}
              options={planOptions}
              onChange={(val) => {
                const selectedPlan = plans.find(p => p.name === val);
                setPayForm({
                  ...payForm,
                  plan: val,
                  amount: selectedPlan ? selectedPlan.discountedPrice : payForm.amount,
                  addPt: false,
                  assignedTrainer: ''
                });
              }}
            />
          </div>

          {/* PT Toggle (if PT is available for the selected plan) */}
          {(() => {
            const selectedPlan = plans.find(p => p.name === payForm.plan);
            if (selectedPlan && (selectedPlan.hasPtPricing === true || selectedPlan.hasPtPricing === 'true')) {
              return (
                <div className="flex items-center justify-between p-3 rounded-xl bg-accent/5 border border-accent/10 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-[11px] font-black text-accent uppercase tracking-wider leading-none">Personal Training (PT) Add-on</p>
                    <p className="text-[9px] text-text-muted mt-1.5 font-bold leading-normal">
                      Include PT for +₹{selectedPlan.ptDiscountedPrice} (Total: ₹{(selectedPlan.discountedPrice + selectedPlan.ptDiscountedPrice).toLocaleString()})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePaymentPtToggle(!payForm.addPt)}
                    style={{
                      width: '36px',
                      height: '20px',
                      minWidth: '36px',
                      minHeight: '20px',
                      maxWidth: '36px',
                      maxHeight: '20px',
                      borderRadius: '9999px',
                      position: 'relative',
                      display: 'inline-flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                      border: 'none',
                      backgroundColor: payForm.addPt ? '#22c55e' : 'rgba(255, 255, 255, 0.1)',
                      transition: 'background-color 0.2s ease-in-out'
                    }}
                  >
                    <span
                      style={{
                        width: '16px',
                        height: '16px',
                        minWidth: '16px',
                        minHeight: '16px',
                        maxWidth: '16px',
                        maxHeight: '16px',
                        borderRadius: '50%',
                        backgroundColor: '#ffffff',
                        display: 'inline-block',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
                        transition: 'transform 0.2s ease-in-out',
                        transform: payForm.addPt ? 'translateX(18px)' : 'translateX(2px)'
                      }}
                    />
                  </button>
                </div>
              );
            }
            return null;
          })()}

          {/* Trainer Selector (if PT is selected) */}
          {payForm.addPt && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black ml-1">Assign Coach / Trainer *</p>
              <Select
                value={payForm.assignedTrainer || ''}
                searchable={false}
                options={[
                  { label: 'Select Trainer', value: '' },
                  ...trainers
                    .filter(t => t.status === 'active' && (t.trainerType === 'PT Trainer' || t.trainerType === 'PT + Trainer') && isTrainerCompatible(t, showPayment?.timeSlot, user?.timeSlots))
                    .map(t => ({ label: `${t.name} (${t.clientCount || 0} active clients)`, value: t._id }))
                ]}
                onChange={(val) => setPayForm({ ...payForm, assignedTrainer: val })}
              />
              {!payForm.assignedTrainer && <p className="text-[9px] text-accent/70 font-bold uppercase animate-pulse ml-1">Required: Select a trainer to link PT</p>}
            </div>
          )}

          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black ml-1">Payment Method</p>
            <Select value={payForm.paymentMethod} options={paymentMethodOptions} onChange={(val) => setPayForm({ ...payForm, paymentMethod: val })} />
          </div>

          {/* Pay from Current Date Checkbox */}
          <div className="flex items-center justify-between py-1.5 px-1">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-[11px] font-black text-white uppercase tracking-wider leading-none">Pay from Current Date</p>
              <p className="text-[9px] text-text-muted mt-1.5 font-bold leading-normal">
                {payForm.payFromCurrentDate
                  ? "Membership validity starts from TODAY (system current date)."
                  : "Membership validity chains continuously from the existing expiry date."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPayForm(prev => ({ ...prev, payFromCurrentDate: !prev.payFromCurrentDate }))}
              style={{
                width: '18px',
                height: '18px',
                minWidth: '18px',
                minHeight: '18px',
                maxWidth: '18px',
                maxHeight: '18px',
                borderRadius: '4px',
                border: payForm.payFromCurrentDate ? '2px solid #22c55e' : '2px solid rgba(255, 255, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: payForm.payFromCurrentDate ? '#22c55e' : 'transparent',
                cursor: 'pointer',
                flexShrink: 0,
                padding: 0,
                transition: 'all 0.15s ease-in-out'
              }}
            >
              {payForm.payFromCurrentDate && (
                <svg
                  width="10"
                  height="8"
                  viewBox="0 0 10 8"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1 4L3.5 6.5L9 1"
                    stroke="#000000"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>

          {/* Dynamic Financial Summary Box */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-bold text-text-muted">Selected Plan:</span>
              <span className="font-black text-white uppercase tracking-wider">{payForm.plan}</span>
            </div>
            {payForm.addPt && (
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-bold text-text-muted">PT Add-on:</span>
                <span className="font-black text-accent">Included</span>
              </div>
            )}
            <div className="h-px bg-white/5" />
            <div className="flex justify-between items-center text-[12px] bg-accent/5 p-2.5 rounded-xl border border-accent/10">
              <span className="font-black text-accent uppercase tracking-wider">Total Collection:</span>
              <span className="font-black text-accent text-sm">₹{Number(payForm.amount || 0).toLocaleString()}</span>
            </div>
          </div>

          {payForm.paymentMethod === 'upi' && (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                  <Zap size={16} />
                </div>
                <div>
                  <h4 className="text-white text-[12px] font-bold uppercase tracking-wider">UPI QR Code Payment</h4>
                  <p className="text-[10px] text-gray-500">Scan code to pay owner directly</p>
                </div>
              </div>

              {!user?.upiId ? (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] rounded-xl flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>No owner UPI ID configured. Please add one in <strong>Settings</strong>.</span>
                </div>
              ) : (
                <>
                  {user.upiIds && user.upiIds.length > 1 && (
                    <div className="space-y-1">
                      <p className="text-[11px] uppercase tracking-wider text-text-muted font-normal ml-1">Receive UPI ID</p>
                      <Select
                        value={selectedUpi || user.upiId}
                        options={user.upiIds.map(item => ({
                          label: `${item.upiId} (${item.payeeName}) ${item.isDefault ? '[Default]' : ''}`,
                          value: item.upiId
                        }))}
                        onChange={val => setSelectedUpi(val)}
                        searchable={false}
                        className="add-member-select"
                      />
                    </div>
                  )}

                  {(() => {
                    const activeUpi = selectedUpi || user.upiId;
                    const selectedUpiItem = (user.upiIds || []).find(item => item.upiId === activeUpi);
                    const payeeName = selectedUpiItem ? selectedUpiItem.payeeName : (user.gymName || user.name);
                    return (
                      <div className="flex flex-col items-center justify-center p-3 bg-[#111111] rounded-xl shadow-inner border border-white/5">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=ffffff&bgcolor=111111&margin=0&data=${encodeURIComponent(
                            `upi://pay?pa=${activeUpi}&pn=${encodeURIComponent(payeeName)}&am=${payForm.amount || 0}&cu=INR`
                          )}`}
                          alt="UPI QR Code"
                          className="w-[150px] h-[150px] object-contain"
                        />
                        <div className="mt-3 text-center">
                          <p className="text-[14px] text-white font-extrabold uppercase tracking-wide">
                            ₹{parseFloat(payForm.amount || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {showPayment?.planExpiry && (new Date(showPayment.joinDate || showPayment.createdAt).toDateString() !== new Date().toDateString()) && (
            payForm.payFromCurrentDate ? (
              <div className="p-4 rounded-2xl border flex flex-col gap-1 bg-success/10 border-success/20 text-success">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider">
                  ⚡ Reset Starting Date
                </div>
                <p className="text-[12px] font-bold opacity-90">
                  New billing cycle starts today: <span className="underline">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </p>
                <p className="text-[10px] font-medium opacity-70 mt-1">
                  This ignores historical expiry dates and starts the validity period cleanly from today.
                </p>
              </div>
            ) : (
              <div className={`p-4 rounded-2xl border flex flex-col gap-1 ${new Date(showPayment.planExpiry) > new Date() ? 'bg-info/10 border-info/20 text-info' : 'bg-warning/10 border-warning/20 text-warning'}`}>
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider">
                  {new Date(showPayment.planExpiry) > new Date() ? (
                    <>💡 Active Plan Info</>
                  ) : (
                    <>⚠️ Expired Plan Info</>
                  )}
                </div>
                <p className="text-[12px] font-bold opacity-90">
                  Current expiry: <span className="underline">{new Date(showPayment.planExpiry).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </p>
                <p className="text-[10px] font-medium opacity-70 mt-1">
                  {new Date(showPayment.planExpiry) > new Date()
                    ? "Chaining this payment will extend the membership from the current expiry date."
                    : "This payment will cover the pending period starting from the previous expiry."}
                </p>
              </div>
            )
          )}
          <button
            type="submit"
            disabled={saving || (payForm.paymentMethod === 'upi' && !user?.upiId)}
            className="btn-primary w-full !py-4 shadow-xl shadow-accent/20 active:scale-[0.98] transition-all"
          >
            {saving ? 'Processing...' : 'Confirm Payment'}
          </button>
        </form>
      </Modal>

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
              <p className="text-[11px] font-black text-white uppercase tracking-wider leading-none">Delete Payment History Too</p>
              <p className="text-[9px] text-text-muted mt-1.5 font-bold leading-normal">
                If checked, all payment history and receipts of this client will be permanently deleted from the database.
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
                  setSaving(true);
                  try {
                    await membersApi.delete(targetId, deletePayments);
                    setShowAdd(false);
                    setIsEditing(null);
                    fetchMembers(false, true, true);
                  } catch (err) { alert(err.message); }
                  finally { setSaving(false); }
                }
              }}
              className="flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 bg-danger/15 text-danger hover:bg-danger/25 active:scale-95 border border-danger/20"
            >
              Yes, Delete
            </button>
          </div>
        </div>
      </Modal>

      {upgradeConfirmState && (
        <Modal
        isOpen={!!upgradeConfirmState}
        onClose={() => { setUpgradeConfirmState(null); setUpgradePaymentMethod('cash'); }}
          title={upgradeConfirmState.title}
          size="sm"
        >
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center shrink-0 text-accent">
                <Banknote size={24} />
              </div>
              <div className="space-y-1 flex-1">
                <h4 className="text-[13px] font-black text-white uppercase tracking-wider">Plan Upgrade Detected</h4>
                <p className="text-[11px] font-bold text-text-secondary leading-relaxed">
                  {upgradeConfirmState.message}
                </p>
              </div>
            </div>

            {/* Financial Details Card */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-bold text-text-muted">Already Paid (Normal):</span>
                <span className="font-black text-white">₹{upgradeConfirmState.oldAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-bold text-text-muted">New Plan Total (with PT):</span>
                <span className="font-black text-white">₹{upgradeConfirmState.newAmount.toLocaleString()}</span>
              </div>
              <div className="h-px bg-white/5" />
              <div className="flex justify-between items-center text-[12px] bg-accent/5 p-2 rounded-xl border border-accent/10">
                <span className="font-black text-accent uppercase tracking-wider">Collect Difference:</span>
                <span className="font-black text-accent text-sm">₹{upgradeConfirmState.diffAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black ml-1">Payment Method</p>
              <Select
                value={upgradePaymentMethod}
                searchable={false}
                options={[
                  { label: 'Cash', value: 'cash' },
                  { label: 'UPI', value: 'upi' }
                ]}
                onChange={(val) => setUpgradePaymentMethod(val)}
              />
            </div>

            {upgradePaymentMethod === 'upi' && (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                    <Zap size={16} />
                  </div>
                  <div>
                    <h4 className="text-white text-[12px] font-bold uppercase tracking-wider">UPI QR Code Payment</h4>
                    <p className="text-[10px] text-gray-500">Scan code to pay owner directly</p>
                  </div>
                </div>

                {!user?.upiId ? (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] rounded-xl flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>No owner UPI ID configured. Please add one in <strong>Settings</strong>.</span>
                  </div>
                ) : (
                  <>
                    {user.upiIds && user.upiIds.length > 1 && (
                      <div className="space-y-1">
                        <p className="text-[11px] uppercase tracking-wider text-text-muted font-normal ml-1">Receive UPI ID</p>
                        <Select
                          value={selectedUpi || user.upiId}
                          options={user.upiIds.map(item => ({
                            label: `${item.upiId} (${item.payeeName}) ${item.isDefault ? '[Default]' : ''}`,
                            value: item.upiId
                          }))}
                          onChange={val => setSelectedUpi(val)}
                          searchable={false}
                          className="add-member-select"
                        />
                      </div>
                    )}

                    {(() => {
                      const activeUpi = selectedUpi || user.upiId;
                      const selectedUpiItem = (user.upiIds || []).find(item => item.upiId === activeUpi);
                      const payeeName = selectedUpiItem ? selectedUpiItem.payeeName : (user.gymName || user.name);
                      return (
                        <div className="flex flex-col items-center justify-center p-3 bg-[#111111] rounded-xl shadow-inner border border-white/5">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=ffffff&bgcolor=111111&margin=0&data=${encodeURIComponent(
                              `upi://pay?pa=${activeUpi}&pn=${encodeURIComponent(payeeName)}&am=${upgradeConfirmState.diffAmount || 0}&cu=INR`
                            )}`}
                            alt="UPI QR Code"
                            className="w-[150px] h-[150px] object-contain"
                          />
                          <div className="mt-3 text-center">
                            <p className="text-[14px] text-white font-extrabold uppercase tracking-wide">
                              ₹{parseFloat(upgradeConfirmState.diffAmount || 0).toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setUpgradeConfirmState(null)}
                className="flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all bg-white/5 text-text-muted hover:bg-white/10 hover:text-white"
              >
                Go Back
              </button>
              <button
                onClick={handleConfirmUpgrade}
                disabled={saving}
                className="flex-[2] py-3 text-xs font-black uppercase tracking-wider bg-accent text-black rounded-xl hover:bg-accent-hover shadow-lg shadow-accent/20 transition-all"
              >
                {saving ? 'Processing...' : 'Collect & Update'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {limitReachedState && (
        <Modal
          isOpen={!!limitReachedState}
          onClose={() => setLimitReachedState(null)}
          title={limitReachedState.title}
          size="sm"
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
            {/* Pay Button */}
            {(() => {
              const m = activeMenu.data;
              const effExpiry = getEffectiveExpiry(m);
              const hasNoPayment = !effExpiry;
              const isDisabled = hasNoPayment ? false : (m.status === 'inactive' || (m.status === 'active' && effExpiry > new Date()));

              return (
                <button
                  disabled={isDisabled}
                  onClick={() => {
                    setShowPayment(m);
                    setPayForm({ amount: String(m.planAmount || 0), plan: m.plan || 'monthly', paymentMethod: 'cash', payFromCurrentDate: false, addPt: false, assignedTrainer: '' });
                    setOpenMenuId(null);
                    setActiveMenu(null);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${isDisabled
                    ? 'opacity-30 cursor-not-allowed bg-transparent text-text-muted text-left'
                    : 'hover:bg-accent/10 hover:text-accent text-text-secondary text-left'
                    }`}
                  title={isDisabled ? (m.status === 'inactive' ? 'Member is Inactive' : 'Already Paid') : 'Record Payment'}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isDisabled ? 'bg-white/5' : 'bg-accent/10'}`}>
                    <Banknote size={14} />
                  </div>
                  <span>
                    {isDisabled ? (m.status === 'inactive' ? 'Inactive' : 'Paid') : 'Pay'}
                  </span>
                </button>
              );
            })()}

            {/* Edit Button */}
            <button
              onClick={() => {
                const m = activeMenu.data;
                const formattedMember = {
                  name: m.name,
                  phone: m.phone,
                  gender: m.gender || 'male',
                  dob: m.dob ? new Date(m.dob).toISOString().split('T')[0] : '',
                  joinDate: m.joinDate ? new Date(m.joinDate).toISOString().split('T')[0] : '',
                  photo: m.photo || '',
                  plan: m.plan || 'monthly',
                  planAmount: m.planAmount || '1500',
                  addPt: m.assignedTrainer ? true : false,
                  assignedTrainer: m.assignedTrainer?._id || m.assignedTrainer || '',
                  timeSlot: m.timeSlot || ''
                };
                setForm(formattedMember);
                setShowAdd(true);
                setIsEditing(m._id); setOriginalMember(m);
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

            {/* View Button */}
            <button
              onClick={() => { setShowDetail(activeMenu.data); setOpenMenuId(null); setActiveMenu(null); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-text-secondary hover:bg-white/10 hover:text-white transition-all text-left"
            >
              <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center">
                <Eye size={14} />
              </div>
              View Details
            </button>

            <div className="h-px bg-white/5 mx-2 my-1" />

            {/* Toggle Status Button */}
            <button
              onClick={() => { handleToggleStatus(activeMenu.data._id); setOpenMenuId(null); setActiveMenu(null); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all text-left ${activeMenu.data.status === 'active'
                ? 'hover:bg-danger/10 hover:text-danger text-text-secondary'
                : 'hover:bg-success/10 hover:text-success text-text-secondary'
                }`}
            >
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${activeMenu.data.status === 'active' ? 'bg-danger/10' : 'bg-success/10'}`}>
                {activeMenu.data.status === 'active' ? <UserMinus size={14} /> : <UserCheck size={14} />}
              </div>
              {activeMenu.data.status === 'active' ? 'Deactivate' : 'Activate'}
            </button>

            <div className="h-px bg-white/5 mx-2 my-1" />

            {/* Delete Member Button */}
            <button
              onClick={() => { handleDelete(activeMenu.data._id); setOpenMenuId(null); setActiveMenu(null); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-text-secondary hover:bg-danger/10 hover:text-danger transition-all text-left"
            >
              <div className="w-6 h-6 rounded-lg bg-danger/10 flex items-center justify-center text-danger">
                <Trash2 size={14} />
              </div>
              Delete Member
            </button>
          </div>
        </div>
      )}
      {showWhatsAppModal && (
        <Modal
          isOpen={!!showWhatsAppModal}
          onClose={() => setShowWhatsAppModal(null)}
          title="Select WhatsApp Alert Template"
          size="sm"
        >
          <div className="space-y-2 p-1">
            <p className="text-[11px] text-text-muted mb-4 uppercase tracking-wider font-bold">
              Choose a template to send to {showWhatsAppModal.name}:
            </p>
            {[
              { id: 'payment_reminder', name: 'Payment Reminder', desc: 'Membership expiry nudge' },
              { id: 'comeback_message', name: 'Comeback Message', desc: 'We miss you at the gym' },
              { id: 'offer_message', name: 'Special Offer', desc: 'Promotional renewal discount' },
              { id: 'welcome_message', name: 'Welcome Message', desc: 'Welcome onboarding message' },
              { id: 'attendance_reminder', name: 'Attendance Reminder', desc: 'Friendly nudge to visit today' },
              { id: 'birthday_wish', name: 'Birthday Wish', desc: 'Birthday wishes card' }
            ].map(tpl => (
              <button
                key={tpl.id}
                onClick={async () => {
                  const member = showWhatsAppModal;
                  setShowWhatsAppModal(null);
                  await handleWhatsApp(member, tpl.id);
                }}
                className="w-full text-left px-4 py-3.5 hover:bg-white/5 border border-white/5 bg-white/[0.02] rounded-xl flex flex-col gap-1 transition-all active:scale-[0.99]"
              >
                <span className="text-xs font-black text-white">{tpl.name}</span>
                <span className="text-[10px] text-text-secondary">{tpl.desc}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
