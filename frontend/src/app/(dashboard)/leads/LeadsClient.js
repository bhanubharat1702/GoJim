'use client';
import { useState, useEffect, useRef } from 'react';
import { leadsApi, membersApi, plansApi, trainersApi, authApi } from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { PageHeader, SearchBar, Loader, Modal, Badge, EmptyState, Select, DatePicker, StatCard } from '@/components/UI';
import { useAuth } from '@/context/AuthContext';
import { cleanPhone, validatePhone } from '@/lib/utils';
import { Target, UserPlus, Phone, CheckCircle2, Calendar, Hash, Mail, Info, XCircle, Filter, SortDesc, MoreVertical, UserMinus, UserCheck, Edit3, Trash2, Eye, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Flame, Clock, AlertCircle, X, IndianRupee, Zap } from 'lucide-react';

const statusColors = { new: 'neutral', contacted: 'warning', interested: 'accent', trial: 'info', joined: 'success', lost: 'danger' };

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

export default function LeadsClient({ initialLeads, initialStats, initialPlans, initialTrainers }) {
  const { user, updateUser } = useAuth();
  const searchParams = useSearchParams();
  const filterParam = searchParams.get('filter') || '';
  const todayParam = searchParams.get('today') === 'true';
  const [filterTodayOnly, setFilterTodayOnly] = useState(todayParam);

  const [leads, setLeads] = useState(initialLeads || []);
  const [loading, setLoading] = useState(!initialLeads);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(filterParam);
  const [stats, setStats] = useState(initialStats || null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmState, setDeleteConfirmState] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', gender: 'male', source: 'walk-in', status: 'new', interestedPlan: 'undecided', planAmount: '', followUpDate: '', dob: '', notes: '' });
  const [phoneError, setPhoneError] = useState('');
  const [checkingPhone, setCheckingPhone] = useState(false);

  // Sorting and Filtering
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [sortBy, setSortBy] = useState('-createdAt');

  const previewId = searchParams.get('preview');

  // Dynamically fetch the latest user settings/slots on mount to ensure fresh synchronization
  useEffect(() => {
    authApi.getMe().then(res => {
      if (res.success && res.user && updateUser) {
        updateUser(res.user);
      }
    }).catch(err => console.error('Failed to sync timeSlots in leads page:', err));
  }, []);



  useEffect(() => {
    if (previewId) {
      const found = leads.find(l => l._id === previewId);
      if (found) {
        setSearch(found.name);
        setShowDetail(found);
        const newParams = new URLSearchParams(window.location.search);
        newParams.delete('preview');
        const cleanPath = window.location.pathname + (newParams.toString() ? '?' + newParams.toString() : '');
        window.history.replaceState(null, '', cleanPath);
      } else {
        leadsApi.getAll(`search=${previewId}`).then(res => {
          if (res.success && res.data.length > 0) {
            setSearch(res.data[0].name);
            setShowDetail(res.data[0]);
          }
          const newParams = new URLSearchParams(window.location.search);
          newParams.delete('preview');
          const cleanPath = window.location.pathname + (newParams.toString() ? '?' + newParams.toString() : '');
          window.history.replaceState(null, '', cleanPath);
        }).catch(err => console.error(err));
      }
    }
  }, [previewId, leads]);

  // Calendar Filtering States
  const [dateFilterType, setDateFilterType] = useState((filterParam === 'pending_followups' || filterParam === 'stale') ? 'all' : 'month'); // 'all' | 'year' | 'month' | 'date' | 'range'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString()); // '0' to '11'
  const [selectedDate, setSelectedDate] = useState(''); // 'YYYY-MM-DD'
  const [selectedRangeStart, setSelectedRangeStart] = useState(''); // 'YYYY-MM-DD'
  const [selectedRangeEnd, setSelectedRangeEnd] = useState(''); // 'YYYY-MM-DD'
  const [showDateFilterPopover, setShowDateFilterPopover] = useState(false);
  const clearStatusFilter = () => {
    setFilter('');
    setFilterTodayOnly(false);
    setDateFilterType('month');
    setSelectedMonth(new Date().getMonth().toString());
    setSelectedYear(new Date().getFullYear().toString());
  };

  const toggleStatusFilter = (target) => {
    if (filter === target) {
      clearStatusFilter();
    } else {
      setFilter(target);
      setFilterTodayOnly(false);
    }
  };
  const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Lead Conversion State
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [leadToConvert, setLeadToConvert] = useState(null);
  const [joinForm, setJoinForm] = useState({ plan: '', planAmount: '', dob: '', addPt: false, assignedTrainer: '', paymentMethod: 'cash', timeSlot: '' });
  const [selectedUpi, setSelectedUpi] = useState('');

  useEffect(() => {
    if (user?.upiId && !selectedUpi) {
      setSelectedUpi(user.upiId);
    }
  }, [user, selectedUpi]);
  const [showDetail, setShowDetail] = useState(null);
  const [enrichedDetail, setEnrichedDetail] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  useEffect(() => {
    if (showDetail) {
      setEnrichedDetail(showDetail);
      if (showDetail.status === 'joined') {
        membersApi.searchByPhone(showDetail.phone)
          .then(res => {
            if (res.success && res.data) {
              setEnrichedDetail(prev => ({
                ...prev,
                dob: res.data.dob || prev?.dob,
                planAmount: res.data.planAmount || prev?.planAmount,
                interestedPlan: res.data.plan || prev?.interestedPlan,
                assignedTrainer: res.data.assignedTrainer || prev?.assignedTrainer
              }));
            }
          })
          .catch(err => console.error("Error looking up member for details modal:", err));
      }
    } else {
      setEnrichedDetail(null);
    }
  }, [showDetail]);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [trialLead, setTrialLead] = useState(null);
  const [trialDate, setTrialDate] = useState('');

  const [plans, setPlans] = useState(initialPlans || []);
  const [trainers, setTrainers] = useState(initialTrainers || []);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [expandedLeadId, setExpandedLeadId] = useState(null);
  const menuRef = useRef(null);

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

  // Dynamic stats calculation matching current date filters and search
  const dynamicStats = (() => {
    const baseLeads = leads.filter(l => {
      if (dateFilterType === 'all') return true;
      if (!l.createdAt) return false;

      const leadDate = new Date(l.createdAt);

      if (dateFilterType === 'date') {
        if (!selectedDate) return true;
        const targetDate = parseLocalDate(selectedDate);
        return leadDate.getFullYear() === targetDate.getFullYear() &&
          leadDate.getMonth() === targetDate.getMonth() &&
          leadDate.getDate() === targetDate.getDate();
      }

      if (dateFilterType === 'month') {
        const targetMonth = parseInt(selectedMonth);
        const targetYear = parseInt(selectedYear);
        return leadDate.getFullYear() === targetYear &&
          leadDate.getMonth() === targetMonth;
      }

      if (dateFilterType === 'year') {
        const targetYear = parseInt(selectedYear);
        return leadDate.getFullYear() === targetYear;
      }

      if (dateFilterType === 'range') {
        const start = parseLocalDate(selectedRangeStart);
        if (start) start.setHours(0, 0, 0, 0);

        const end = parseLocalDate(selectedRangeEnd);
        if (end) end.setHours(23, 59, 59, 999);

        if (start && end) {
          return leadDate >= start && leadDate <= end;
        } else if (start) {
          return leadDate >= start;
        } else if (end) {
          return leadDate <= end;
        }
        return true;
      }

      return true;
    });

    const total = baseLeads.length;
    const joinedCount = baseLeads.filter(l => l.status === 'joined').length;
    const lostCount = baseLeads.filter(l => l.status === 'lost').length;
    const conversionRate = total > 0 ? Math.round((joinedCount / total) * 100) : 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const addedThisWeek = baseLeads.filter(l => new Date(l.createdAt) >= sevenDaysAgo).length;
    const lostThisWeek = baseLeads.filter(l => l.status === 'lost' && new Date(l.updatedAt || l.createdAt) >= sevenDaysAgo).length;

    // Top Source calculation
    const sourceCounts = {};
    baseLeads.forEach(l => {
      if (l.source) {
        sourceCounts[l.source] = (sourceCounts[l.source] || 0) + 1;
      }
    });
    let topSource = 'N/A';
    let topSourceCount = 0;
    Object.entries(sourceCounts).forEach(([source, count]) => {
      if (count > topSourceCount) {
        topSource = source;
        topSourceCount = count;
      }
    });

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = baseLeads.filter(l => new Date(l.createdAt) >= currentMonthStart).length;

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthCount = baseLeads.filter(l => {
      const d = new Date(l.createdAt);
      return d >= lastMonthStart && d <= lastMonthEnd;
    }).length;

    let growth = 0;
    if (lastMonthCount > 0) {
      growth = Math.round(((thisMonth - lastMonthCount) / lastMonthCount) * 100);
    } else if (thisMonth > 0) {
      growth = 100;
    }

    // Follow-ups Priority Calculations
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    const followUpsPending = baseLeads.filter(l => {
      if (!l.followUpDate) return false;
      return new Date(l.followUpDate) <= todayEnd && l.status !== 'joined' && l.status !== 'lost';
    }).length;

    const highPriority = baseLeads.filter(l => {
      return l.status === 'interested' || l.status === 'trial';
    }).length;

    const missedYesterday = baseLeads.filter(l => {
      if (!l.followUpDate) return false;
      return new Date(l.followUpDate) < todayStart && l.status === 'new';
    }).length;

    // Revenue Potential Card Calculations
    const potentialRevenue = baseLeads.reduce((sum, l) => {
      const allowedStatus = ['interested', 'trial', 'contacted'];
      if (allowedStatus.includes(l.status)) {
        return sum + (parseInt(l.planAmount) || 0);
      }
      return sum;
    }, 0);

    let potentialRevenueFormatted = '₹0';
    if (potentialRevenue >= 1000) {
      potentialRevenueFormatted = `₹${(potentialRevenue / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    } else {
      potentialRevenueFormatted = `₹${potentialRevenue}`;
    }

    const hotLeads = baseLeads.filter(l => l.status === 'interested' || l.status === 'trial').length;

    const planCounts = {};
    baseLeads.forEach(l => {
      if (l.interestedPlan && l.interestedPlan !== 'undecided') {
        planCounts[l.interestedPlan] = (planCounts[l.interestedPlan] || 0) + 1;
      }
    });

    let mostInterestedPlan = 'N/A';
    let maxCount = 0;
    Object.keys(planCounts).forEach(plan => {
      if (planCounts[plan] > maxCount) {
        maxCount = planCounts[plan];
        mostInterestedPlan = plan;
      }
    });

    const formattedMostInterestedPlan = mostInterestedPlan.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    return {
      total,
      joinedCount,
      lostCount,
      conversionRate,
      addedThisWeek,
      lostThisWeek,
      topSource,
      topSourceCount,
      thisMonth,
      growth,
      followUpsPending,
      highPriority,
      missedYesterday,
      potentialRevenueFormatted,
      hotLeads,
      formattedMostInterestedPlan
    };
  })();

  const filteredLeads = leads.filter(l => {
    if (filter === 'pending_followups') {
      if (!l.followUpDate || l.status === 'joined' || l.status === 'lost') return false;
      const fDate = new Date(l.followUpDate);
      if (filterTodayOnly) {
        const todayStr = new Date().toDateString();
        if (fDate.toDateString() !== todayStr) return false;
      } else {
        const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
        if (fDate > todayEnd) return false;
      }
    } else if (filter === 'stale') {
      if (l.status === 'joined' || l.status === 'lost') return false;
      const startOfCurrentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const createdAtDate = new Date(l.createdAt);
      if (createdAtDate >= startOfCurrentMonth) return false;
    } else if (filter && l.status !== filter) {
      return false;
    }

    // 2. Calendar Date Filter
    if (dateFilterType === 'all') return true;
    if (!l.createdAt) return false;

    const leadDate = new Date(l.createdAt);

    if (dateFilterType === 'date') {
      if (!selectedDate) return true;
      const targetDate = parseLocalDate(selectedDate);
      return leadDate.getFullYear() === targetDate.getFullYear() &&
        leadDate.getMonth() === targetDate.getMonth() &&
        leadDate.getDate() === targetDate.getDate();
    }

    if (dateFilterType === 'month') {
      const targetMonth = parseInt(selectedMonth);
      const targetYear = parseInt(selectedYear);
      return leadDate.getFullYear() === targetYear &&
        leadDate.getMonth() === targetMonth;
    }

    if (dateFilterType === 'year') {
      const targetYear = parseInt(selectedYear);
      return leadDate.getFullYear() === targetYear;
    }

    if (dateFilterType === 'range') {
      const start = parseLocalDate(selectedRangeStart);
      if (start) start.setHours(0, 0, 0, 0);

      const end = parseLocalDate(selectedRangeEnd);
      if (end) end.setHours(23, 59, 59, 999);

      if (start && end) {
        return leadDate >= start && leadDate <= end;
      } else if (start) {
        return leadDate >= start;
      } else if (end) {
        return leadDate <= end;
      }
      return true;
    }

    return true;
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
        setActiveMenu(null);
      }
      const dateContainer = document.getElementById('date-filter-container');
      if (dateContainer && !dateContainer.contains(event.target)) {
        setShowDateFilterPopover(false);
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

  const fetchLeads = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const [leadRes, planRes, statRes, trainerRes] = await Promise.all([
        leadsApi.getAll(`search=${search}&sort=${sortBy}&limit=1000`),
        plansApi.getAll(),
        leadsApi.getStats(),
        trainersApi.getAll('status=active')
      ]);
      if (leadRes.success) setLeads(leadRes.data);
      if (planRes.success) setPlans(planRes.data);
      if (statRes.success) setStats(statRes.data);
      if (trainerRes.success) setTrainers(trainerRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (initialLeads && initialLeads.length > 0) return;
    }
    fetchLeads();
  }, [search, sortBy]);

  useEffect(() => {
    if (!form.phone) {
      setPhoneError('');
      return;
    }

    if (form.phone.length < 10) {
      setPhoneError('');
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingPhone(true);
      try {
        const localDup = leads.find(l => l.phone === form.phone);
        if (localDup) {
          setPhoneError(`This phone number is already registered to a lead named "${localDup.name}"`);
          setCheckingPhone(false);
          return;
        }

        try {
          const res = await membersApi.searchByPhone(form.phone);
          if (res.success && res.data) {
            setPhoneError(`This phone number is already registered to a member named "${res.data.name}"`);
            setCheckingPhone(false);
            return;
          }
        } catch (memberErr) {
          // If 404/not found, not registered as member
        }

        const dbLeadRes = await leadsApi.getAll(`search=${form.phone}`);
        if (dbLeadRes.success && dbLeadRes.data && dbLeadRes.data.length > 0) {
          const matchedLead = dbLeadRes.data.find(l => l.phone === form.phone);
          if (matchedLead) {
            setPhoneError(`This phone number is already registered to a lead named "${matchedLead.name}"`);
            setCheckingPhone(false);
            return;
          }
        }

        setPhoneError('');
      } catch (err) {
        console.error('Error checking phone registration:', err);
      } finally {
        setCheckingPhone(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [form.phone, leads]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.phone || !form.phone.trim()) {
      alert('Phone number is required.');
      return;
    }
    if (!validatePhone(form.phone)) {
      alert('Phone number must be exactly 10 digits (no spaces, letters, or special characters).');
      return;
    }
    if (phoneError) {
      alert(phoneError);
      return;
    }
    if (!form.followUpDate) {
      alert("Follow-up date is required.");
      return;
    }
    setSaving(true);
    try {
      await leadsApi.create(form);
      setShowAdd(false);
      setForm({ name: '', phone: '', gender: 'male', source: 'walk-in', status: 'new', interestedPlan: 'undecided', planAmount: '', followUpDate: '', dob: '', notes: '' });
      setPhoneError('');
      fetchLeads(true);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id, status) => {
    try {
      await leadsApi.update(id, { status });
      fetchLeads(true);
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (id) => {
    if (!id) return;

    setDeleteConfirmState({
      id,
      title: 'Delete Lead',
      message: 'Are you sure you want to delete this lead? All contact information and status logs will be permanently removed.',
      onConfirm: async () => {
        setSaving(true);
        try {
          await leadsApi.delete(id);
          fetchLeads(true);
          setOpenMenuId(null);
          setActiveMenu(null);
        } catch (err) { alert(err.message); }
        finally { setSaving(false); }
      }
    });
  };

  const handlePtToggleInLeads = (checked) => {
    const selectedPlan = plans.find(p => p.name === joinForm.plan);
    if (selectedPlan) {
      let finalAmount = selectedPlan.discountedPrice;
      if (checked && (selectedPlan.hasPtPricing === true || selectedPlan.hasPtPricing === 'true')) {
        finalAmount += selectedPlan.ptDiscountedPrice;
      }
      setJoinForm(prev => ({
        ...prev,
        addPt: checked,
        planAmount: finalAmount
      }));
    }
  };

  const processJoin = async (lead, plan, planAmount) => {
    setSaving(true);
    try {
      const payload = {
        name: lead.name,
        phone: lead.phone,
        plan: plan,
        planAmount: parseInt(planAmount) || 0,
        gender: lead.gender || 'male',
        dob: joinForm.dob || lead.dob,
        joinDate: new Date().toISOString().split('T')[0],
        assignedTrainer: joinForm.addPt ? joinForm.assignedTrainer || null : null,
        paymentMethod: joinForm.paymentMethod === 'online_upi' ? 'upi' : (joinForm.paymentMethod || 'cash'),
        timeSlot: joinForm.timeSlot || ''
      };
      if (joinForm.paymentMethod === 'online_upi') {
        payload.upiId = selectedUpi || user?.upiId || '';
      }
      await membersApi.create(payload);

      // 2. Mark lead as joined and persist all conversion details in lead history
      await leadsApi.update(lead._id, {
        status: 'joined',
        dob: joinForm.dob || lead.dob,
        interestedPlan: plan,
        planAmount: parseInt(planAmount) || 0,
        assignedTrainer: joinForm.addPt ? joinForm.assignedTrainer || null : null
      });

      setShowJoinModal(false);
      setLeadToConvert(null);
      fetchLeads(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleJoinRequest = (lead) => {
    // Prompt conversion modal so that time slot selection can be made explicitly (mandatory)
    setLeadToConvert(lead);

    let initialPlan = lead.interestedPlan;
    let initialAmount = lead.planAmount;
    if (initialPlan === 'undecided' || !initialPlan) {
      initialPlan = plans[0]?.name || '';
      initialAmount = plans[0]?.discountedPrice || '';
    }

    setJoinForm({
      plan: initialPlan,
      planAmount: initialAmount,
      dob: lead.dob ? new Date(lead.dob).toISOString().split('T')[0] : '',
      addPt: false,
      assignedTrainer: '',
      paymentMethod: 'cash',
      timeSlot: ''
    });
    setShowJoinModal(true);
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
          <div className="flex flex-col leading-[0]">
            <ChevronUp size={10} className={`${isActive && !isDesc ? 'text-accent' : 'text-white/20'}`} />
            <ChevronDown size={10} className={`${isActive && isDesc ? 'text-accent' : 'text-white/20'}`} />
          </div>
        </div>
      </th>
    );
  };

  return (
    <div className="pb-2">
      <div className="bg-bg-card border border-white/5 rounded-xl shadow-2xl flex flex-col">
        {/* Header Section */}
        <div className="py-4 px-6 border-b border-white/5 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-text-primary tracking-tight">Leads</h1>
              <div className="flex items-center gap-2 text-[10px] font-black text-text-muted uppercase tracking-widest mt-1 opacity-70">

                Tracking <span className="text-white">{filteredLeads.length}</span> leads in pipeline
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
              <SearchBar value={search} onChange={setSearch} placeholder="Search leads..." />

              {filter && (
                <div className="flex items-center gap-1.5 px-3 py-2 bg-accent/5 border border-accent/20 rounded-xl text-[10px] font-black uppercase text-accent tracking-wider shadow-lg shadow-accent/5 animate-in fade-in zoom-in duration-200">
                  <span>Filter: {filter === 'stale' ? 'Last Month Pending' : filter.replace(/_/g, ' ')}</span>
                  <button onClick={clearStatusFilter} className="hover:text-white transition-colors cursor-pointer ml-0.5 font-bold">✕</button>
                </div>
              )}

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
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-black rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-lg shadow-accent/20 active:scale-95 whitespace-nowrap"
              >
                <UserPlus size={14} /> Add Lead
              </button>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              <StatCard
                icon={<Target size={14} className="text-accent" />}
                label="Total Leads"
                value={dynamicStats.total}
                onClick={clearStatusFilter}
                trend={
                  <div className="flex flex-col items-end gap-1 pb-[1px] whitespace-nowrap">
                    <span className={`text-[9px] font-black uppercase tracking-tight ${dynamicStats.growth >= 0 ? 'text-success' : 'text-danger'}`}>
                      {dynamicStats.addedThisWeek} added this week
                    </span>
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tight ${dynamicStats.growth >= 0 ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'}`}>
                      {dynamicStats.growth >= 0 ? <TrendingUp size={8} strokeWidth={3} /> : <TrendingDown size={8} strokeWidth={3} />}
                      <span>{dynamicStats.growth >= 0 ? '+' : ''}{dynamicStats.growth}% from last month</span>
                    </div>
                  </div>
                }
                size="xs"
                flyInDirection="right"
                className="!bg-white/[0.02] border-white/5"
              />

              <StatCard
                icon={<CheckCircle2 size={14} className="text-accent" />}
                label="Conversion Performance"
                value={dynamicStats.joinedCount}
                onClick={() => toggleStatusFilter('joined')}
                trend={
                  <div className="flex flex-col items-end gap-1 pb-[1px] whitespace-nowrap">
                    <span className="text-[9px] font-black uppercase tracking-tight text-success">
                      {dynamicStats.conversionRate}% conversion rate
                    </span>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tight bg-danger/10 text-danger border border-danger/20">
                      <span>{dynamicStats.lostThisWeek}&nbsp; Lost This Week</span>
                    </div>
                  </div>
                }
                size="xs"
                flyInDirection="bottom"
                className="!bg-white/[0.02] border-white/5"
              />

              <StatCard
                icon={<Phone size={14} className="text-accent" />}
                label="Follow-up Priority"
                value={`${dynamicStats.followUpsPending} Pending`}
                onClick={() => toggleStatusFilter('pending_followups')}
                trend={
                  <div className="flex flex-col items-end gap-1 pb-[1px] whitespace-nowrap">
                    <span className="text-[9px] font-black uppercase tracking-tight text-accent flex items-center gap-0.5">
                      {dynamicStats.highPriority} High Priority
                    </span>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tight bg-warning/10 text-warning border border-warning/20">
                      <Clock size={8} strokeWidth={3} />
                      <span>{dynamicStats.missedYesterday} Missed Yesterday</span>
                    </div>
                  </div>
                }
                size="xs"
                flyInDirection="top"
                className="!bg-white/[0.02] border-white/5"
              />

              <StatCard
                icon={<IndianRupee size={14} className="text-accent" />}
                label="Revenue Potential"
                value={dynamicStats.potentialRevenueFormatted}
                onClick={clearStatusFilter}
                trend={
                  <div className="flex flex-col items-end gap-1 pb-[1px] whitespace-nowrap">
                    <span className="text-[9px] font-black uppercase tracking-tight text-success">
                      {dynamicStats.hotLeads} Hot Leads
                    </span>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tight bg-accent/10 text-accent border border-accent/20">
                      <span>Most Interested: {dynamicStats.formattedMostInterestedPlan}</span>
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

        {loading ? null : leads.length === 0 ? (
          <EmptyState
            icon={<Target size={48} className="text-accent/50" />}
            title="No leads yet"
            description="Start adding leads to track conversions and grow your gym"
          />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block max-h-[292px] overflow-y-auto relative rounded-2xl border border-white/5">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#0a0a0a] z-10 border-b border-white/5 shadow-md">
                  <tr className="border-b border-white/5 bg-white/[0.01]">
                    <th className="px-8 py-2.5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] w-12">#</th>
                    <SortHeader label="Lead Details" sortKey="name" />
                    <SortHeader label="Contact" sortKey="phone" />
                    <SortHeader label="Added" sortKey="createdAt" />
                    <SortHeader label="Source" sortKey="source" />
                    <th className="px-6 py-2.5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Plan</th>
                    <SortHeader label="Follow-up" sortKey="followUpDate" />
                    <SortHeader label="Status" sortKey="status" />
                    <th className="px-6 py-2.5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-12 text-text-muted font-bold text-xs uppercase tracking-widest opacity-60">
                        No leads match the selected date filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((l, idx) => (
                      <tr key={l._id} onClick={() => setShowDetail(l)} className="group hover:bg-white/[0.02] transition-all cursor-pointer">
                        <td className="px-8 py-2.5">
                          <span className="text-[11px] font-black text-text-muted group-hover:text-accent transition-colors">{idx + 1}</span>
                        </td>
                        <td className="px-6 py-2.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] shadow-lg group-hover:scale-110 transition-transform border ${l.gender === 'female' ? 'bg-gradient-to-br from-pink-500/20 to-pink-500/5 text-pink-200 border-pink-500/10' :
                              l.gender === 'male' ? 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-blue-200 border-blue-500/10' :
                                'bg-gradient-to-br from-white/10 to-white/5 text-white border-white/5'
                              }`}>
                              {l.name[0]}
                            </div>
                            <p className={`text-xs font-black transition-colors ${l.gender === 'female' ? 'text-pink-200 group-hover:text-pink-100' :
                              l.gender === 'male' ? 'text-blue-200 group-hover:text-blue-100' :
                                'text-white group-hover:text-accent'
                              }`}>{l.name}</p>
                          </div>
                        </td>
                        <td className="px-6 py-2.5">
                          <p className="text-[11px] font-bold text-text-secondary leading-none">
                            {l.phone}
                          </p>
                        </td>
                        <td className="px-6 py-2.5">
                          <p className="text-[11px] font-bold text-text-secondary leading-none uppercase tracking-widest">
                            {new Date(l.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </p>
                        </td>
                        <td className="px-6 py-2.5">
                          <p className="text-[11px] font-bold text-text-secondary capitalize leading-none">
                            {l.source?.replace(/_/g, ' ')}
                          </p>
                        </td>
                        <td className="px-6 py-2.5">
                          <p className="text-[11px] font-bold text-text-secondary capitalize leading-none">
                            {l.interestedPlan}
                          </p>
                        </td>
                        <td className="px-6 py-2.5">
                          {l.followUpDate ? (
                            <p className="text-[11px] font-bold text-text-secondary leading-none uppercase tracking-widest">
                              {new Date(l.followUpDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                            </p>
                          ) : (
                            <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest italic">Not Set</span>
                          )}
                        </td>
                        <td className="px-6 py-2.5">
                          <Badge variant={statusColors[l.status]} size="sm">{l.status}</Badge>
                        </td>
                        <td className="px-6 py-2.5 text-right relative" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end">
                            <button
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const isLost = l.status === 'lost';
                                const isJoined = l.status === 'joined';
                                const hasTrial = !(l.trialTaken || l.status === 'trial');
                                const menuHeight = isJoined ? 38 : (isLost ? 76 : (hasTrial ? 170 : 136));
                                const showAbove = rect.bottom + menuHeight > window.innerHeight;
                                const y = showAbove ? rect.top - menuHeight - 8 : rect.bottom + 8;
                                const x = rect.right - 176;

                                if (openMenuId === l._id) {
                                  setOpenMenuId(null);
                                  setActiveMenu(null);
                                } else {
                                  setOpenMenuId(l._id);
                                  setActiveMenu({
                                    id: l._id,
                                    x,
                                    y,
                                    data: l
                                  });
                                }
                              }}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${openMenuId === l._id ? 'bg-accent text-black shadow-lg shadow-accent/20' : 'bg-white/5 text-text-muted hover:bg-white/10 hover:text-white'}`}
                            >
                              <MoreVertical size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Collapsible Cards View */}
            {filteredLeads.length === 0 ? (
              <div className="block md:hidden text-center py-12 text-text-muted font-bold text-xs uppercase tracking-widest opacity-60">
                No leads match the selected date filter.
              </div>
            ) : (
              <div className="block md:hidden space-y-3 max-h-[360px] overflow-y-auto pb-4 pr-1">
                {filteredLeads.map((l, idx) => {
                  const isExpanded = expandedLeadId === l._id;
                  const initials = l.name ? l.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'L';

                  return (
                    <div
                      key={l._id}
                      className={`border border-white/5 rounded-2xl transition-all ${
                        isExpanded ? 'bg-white/[0.03] shadow-lg' : 'bg-white/[0.01]'
                      }`}
                    >
                      {/* Card Header (Collapsed State) */}
                      <div
                        onClick={() => setExpandedLeadId(isExpanded ? null : l._id)}
                        className="p-4 flex items-center justify-between cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-[10px] shadow-lg border ${
                              l.gender === 'female'
                                ? 'bg-gradient-to-br from-pink-500/20 to-pink-500/5 text-pink-200 border-pink-500/10'
                                : l.gender === 'male'
                                ? 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-blue-200 border-blue-500/10'
                                : 'bg-gradient-to-br from-white/10 to-white/5 text-white border-white/5'
                            }`}
                          >
                            {initials}
                          </div>
                          <div>
                            <p
                              className={`text-xs font-black transition-colors ${
                                l.gender === 'female'
                                  ? 'text-pink-200'
                                  : l.gender === 'male'
                                  ? 'text-blue-200'
                                  : 'text-white'
                              }`}
                            >
                              {l.name}
                            </p>
                            <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider mt-0.5">
                              {l.interestedPlan || 'Undecided'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Badge variant={statusColors[l.status]} size="sm">
                            {l.status}
                          </Badge>
                          <button
                            onClick={() => setExpandedLeadId(isExpanded ? null : l._id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 text-text-muted hover:text-white"
                          >
                            {isExpanded ? <ChevronUp size={14} className="text-accent" /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Card Body (Expanded State) */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-white/5 space-y-3">
                          {/* Separator */}
                          <div className="h-px bg-white/5 w-full" />
                          
                          <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-[10px]">
                            <div>
                              <span className="text-text-muted font-bold block uppercase tracking-wider text-[8px] mb-0.5">Contact</span>
                              <a href={`tel:${l.phone}`} className="text-white font-extrabold hover:underline">
                                {l.phone}
                              </a>
                            </div>
                            <div>
                              <span className="text-text-muted font-bold block uppercase tracking-wider text-[8px] mb-0.5">Gender</span>
                              <span className="text-white font-extrabold capitalize">{l.gender}</span>
                            </div>
                            <div>
                              <span className="text-text-muted font-bold block uppercase tracking-wider text-[8px] mb-0.5">Added On</span>
                              <span className="text-white font-extrabold">
                                {new Date(l.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                            <div>
                              <span className="text-text-muted font-bold block uppercase tracking-wider text-[8px] mb-0.5">Source</span>
                              <span className="text-white font-extrabold capitalize">{l.source?.replace(/_/g, ' ')}</span>
                            </div>
                            {l.followUpDate && (
                              <div className="col-span-2">
                                <span className="text-text-muted font-bold block uppercase tracking-wider text-[8px] mb-0.5">Follow-Up Date</span>
                                <span className="text-white font-extrabold">
                                  {new Date(l.followUpDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Separator */}
                          <div className="h-px bg-white/5 w-full" />

                          {/* Action Toolbar */}
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => setShowDetail(l)}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-accent/15 text-accent hover:bg-accent hover:text-black border border-accent/20 transition-all cursor-pointer"
                            >
                              <Eye size={12} />
                              Details
                            </button>
                            {l.status !== 'joined' && (
                              <button
                                onClick={() => handleJoinRequest(l)}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-success/15 text-success hover:bg-success hover:text-white border border-success/20 transition-all cursor-pointer"
                              >
                                <UserCheck size={12} />
                                Convert
                              </button>
                            )}
                            {!(l.trialTaken || l.status === 'trial') && (
                              <button
                                onClick={() => {
                                  const threeDaysFromNow = new Date();
                                  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
                                  setTrialLead(l);
                                  setTrialDate(threeDaysFromNow.toISOString().split('T')[0]);
                                  setShowTrialModal(true);
                                }}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-info/15 text-info hover:bg-info hover:text-white border border-info/20 transition-all cursor-pointer"
                              >
                                <Clock size={12} />
                                Trial
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(l._id)}
                              className="w-9 h-7 flex items-center justify-center rounded-lg bg-danger/10 text-danger hover:bg-danger hover:text-white border border-danger/20 transition-all cursor-pointer"
                              title="Delete Lead"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <Modal 
        isOpen={showAdd} 
        onClose={() => { 
          setShowAdd(false); 
          setForm({ name: '', phone: '', gender: 'other', source: 'walk-in', status: 'new', interestedPlan: 'undecided', planAmount: '', followUpDate: '', dob: '', notes: '' }); 
          setPhoneError('');
          setCheckingPhone(false);
        }} 
        title="Add New Lead" 
        size="md" 
        overflowVisible={true}
        titleClassName="!text-[20px] !font-normal"
      >
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
                  className="!py-2 !px-3 !text-[11px] !font-normal !bg-white/[0.02] border border-white/5 !rounded-xl focus:border-accent/30 transition-all w-full text-white"
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
                  className={`!py-2 !px-3 !text-[11px] !font-normal !bg-white/[0.02] border !rounded-xl focus:border-accent/30 transition-all w-full text-white ${phoneError ? 'border-accent/50 focus:border-accent' : 'border-white/5'}`}
                />
                {checkingPhone ? (
                  <p className="text-[9px] text-text-muted/60 animate-pulse ml-1">Checking registration...</p>
                ) : phoneError ? (
                  <p className="text-[9px] text-accent font-bold ml-1 flex items-center gap-1">
                    <AlertCircle size={10} className="text-accent" /> {phoneError}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Gender Selection & Lead Source Grid */}
            <div className="grid grid-cols-2 gap-3">
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
              <div className="space-y-1">
                <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Lead Source</p>
                <Select
                  value={form.source}
                  searchable={false}
                  options={[
                    { label: 'Walk-in', value: 'walk-in' },
                    { label: 'Referral', value: 'referral' },
                    { label: 'Social Media', value: 'social_media' },
                    { label: 'Website', value: 'website' },
                    { label: 'Other', value: 'other' }
                  ]}
                  onChange={val => setForm({ ...form, source: val })}
                  className="add-member-select"
                />
              </div>
            </div>

            {/* Interested Plan */}
            <div className="space-y-1">
              <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Interested Plan</p>
              <Select
                value={form.interestedPlan}
                searchable={false}
                options={[
                  { label: 'Undecided', value: 'undecided', displayText: 'Undecided' },
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
                ]}
                onChange={val => {
                  const selectedPlan = plans.find(p => p.name === val);
                  setForm({ ...form, interestedPlan: val, planAmount: selectedPlan ? selectedPlan.discountedPrice : '' });
                }}
                className="add-member-select"
              />
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Date of Birth</p>
                <DatePicker 
                  value={form.dob} 
                  onChange={val => setForm({ ...form, dob: val })} 
                  placeholder="Select DOB" 
                  className="add-member-date-picker"
                />
              </div>
              <div className="space-y-1">
                <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Follow-up Date *</p>
                <DatePicker 
                  value={form.followUpDate} 
                  onChange={val => setForm({ ...form, followUpDate: val })} 
                  placeholder="Select Date"
                  align="right"
                  minDate={(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })()}
                  className="add-member-date-picker"
                />
              </div>
            </div>

            {/* Notes Field */}
            <div className="space-y-1">
              <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Notes</p>
              <textarea
                placeholder="Notes about conversation, goals, etc..."
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full bg-white/[0.02] border border-white/5 rounded-xl p-3 text-[11px] text-text-primary focus:outline-none focus:border-accent/30 transition-all placeholder:text-white/10 resize-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-2 pt-1.5">
            <button
              type="button"
              onClick={() => { 
                setShowAdd(false); 
                setForm({ name: '', phone: '', gender: 'other', source: 'walk-in', status: 'new', interestedPlan: 'undecided', planAmount: '', followUpDate: '', dob: '', notes: '' }); 
                setPhoneError('');
                setCheckingPhone(false);
              }}
              className="flex-1 py-2.5 !text-[14px] !font-normal tracking-wide rounded-xl transition-all duration-300 bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary active:bg-white/20 active:scale-95 border border-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !!phoneError || checkingPhone}
              className="flex-1 btn-primary !py-2.5 !text-[14px] !font-normal tracking-wide shadow-lg shadow-accent/15 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Processing...' : checkingPhone ? 'Validating Phone...' : phoneError ? 'Fix Phone Number' : 'Register Lead'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} title="Complete Member Conversion" overflowVisible={true} size="md" titleClassName="!text-[20px] !font-normal">
        <div className="space-y-4">
          {/* Extremely compact, premium single-row Profile Card utilizing horizontal space */}
          <div className="relative p-3 rounded-2xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/5 overflow-hidden shadow-inner flex items-center justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

            {/* Avatar & Name */}
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border shadow shadow-black/30
                ${leadToConvert?.gender === 'female' ? 'bg-gradient-to-br from-pink-500/20 to-pink-500/5 text-pink-200 border-pink-500/20 shadow-pink-500/5' :
                  leadToConvert?.gender === 'male' ? 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-blue-200 border-blue-500/20 shadow-blue-500/5' :
                    'bg-gradient-to-br from-accent/20 to-accent/5 text-accent border-accent/20 shadow-accent/5'}
              `}>
                {leadToConvert?.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex flex-col">
                <p className="text-xs font-black text-white leading-tight">{leadToConvert?.name}</p>
                <span className="text-[9px] font-bold text-text-muted capitalize mt-0.5">{leadToConvert?.gender || 'other'}</span>
              </div>
            </div>

            {/* Middle details - Phone */}
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center gap-1.5">
                <Phone size={10} className="text-accent animate-pulse" />
                <span className="text-[11px] font-black text-white tracking-wider">{leadToConvert?.phone}</span>
              </div>
            </div>

            {/* Right: Badge */}
            <Badge variant={statusColors[leadToConvert?.status || 'new']} size="sm" className="font-black uppercase tracking-widest text-[8px] px-2 py-0.5">
              {leadToConvert?.status}
            </Badge>
          </div>

          <div className="space-y-3">
            {/* Membership Plan Selection */}
            <div className="space-y-1">
              <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Select Membership Plan</p>
              <Select
                value={joinForm.plan}
                options={plans.map(p => ({
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
                }))}
                onChange={val => {
                  const selectedPlan = plans.find(p => p.name === val);
                  setJoinForm({ ...joinForm, plan: val, planAmount: selectedPlan ? selectedPlan.discountedPrice : '', addPt: false, assignedTrainer: '' });
                }}
                searchable={false}
                className="add-member-select"
              />
            </div>

            {/* PT Add-on Card */}
            {(() => {
              const selectedPlan = plans.find(p => p.name === joinForm.plan);
              if (selectedPlan && (selectedPlan.hasPtPricing === true || selectedPlan.hasPtPricing === 'true')) {
                return (
                  <div className={`p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between mt-2
                    ${joinForm.addPt
                      ? 'bg-gradient-to-br from-accent/10 to-accent/5 border-accent/30 shadow-[0_4px_20px_rgba(251,191,36,0.1)]'
                      : 'bg-white/[0.02] border-white/5 hover:border-white/10'}
                  `}>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Flame size={12} className={joinForm.addPt ? "text-accent" : "text-text-muted"} />
                        <p className="text-[11px] font-black text-white uppercase tracking-wider">Add Personal Training (PT)</p>
                      </div>
                      <p className="text-[9px] text-text-muted font-bold">Include PT Add-on for ₹{selectedPlan.ptDiscountedPrice} (Total: ₹{selectedPlan.discountedPrice + selectedPlan.ptDiscountedPrice})</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePtToggleInLeads(!joinForm.addPt)}
                      className={`relative inline-flex h-4.5 w-8.5 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out ${joinForm.addPt ? 'bg-accent' : 'bg-white/10'}`}
                    >
                      <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${joinForm.addPt ? 'translate-x-1.75' : '-translate-x-1.75'}`} />
                    </button>
                  </div>
                );
              }
              return null;
            })()}

            {/* PT Trainer Selection */}
            {joinForm.addPt && (
              <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300 mt-2">
                <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Assign PT Trainer *</p>
                {trainers.filter(t => t.status === 'active' && (t.trainerType === 'PT Trainer' || t.trainerType === 'PT + Trainer')).length === 0 ? (
                  <div className="p-3 rounded-xl bg-danger/5 border border-danger/10 text-danger flex items-start gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider">No PT trainers found</p>
                      <p className="text-[10px] text-text-secondary font-medium mt-0.5">Please add a PT trainer in the <a href="/trainers" className="text-accent hover:underline font-bold">Trainers page</a> first.</p>
                    </div>
                  </div>
                ) : trainers.filter(t => t.status === 'active' && (t.trainerType === 'PT Trainer' || t.trainerType === 'PT + Trainer') && isTrainerCompatible(t, joinForm.timeSlot, user?.timeSlots)).length === 0 ? (
                  <p className="text-[11px] text-[#ff6b6b] font-normal uppercase tracking-wide ml-1">
                    This attending slot has no Personal Trainer
                  </p>
                ) : (
                  <>
                    <Select
                      value={joinForm.assignedTrainer || ''}
                      options={[
                        { label: 'Select Trainer *', value: '' },
                        ...trainers
                          .filter(t => t.status === 'active' && (t.trainerType === 'PT Trainer' || t.trainerType === 'PT + Trainer') && isTrainerCompatible(t, joinForm.timeSlot, user?.timeSlots))
                          .map(t => ({ label: `${t.name} (${t.clientCount || 0} active clients)`, value: t._id }))
                      ]}
                      onChange={val => setJoinForm({ ...joinForm, assignedTrainer: val })}
                      searchable={false}
                      className="add-member-select"
                    />
                    {!joinForm.assignedTrainer && <p className="text-[11px] text-accent/70 font-normal uppercase animate-pulse ml-1">Required for PT Plans</p>}
                  </>
                )}
              </div>
            )}

            {/* Price, Payment Method, & DOB Grid */}
            <div className="grid grid-cols-3 gap-3 mt-2">
              <div className="space-y-1">
                <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Amount</p>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-[11px] font-normal text-text-muted">₹</span>
                  <input type="number"
                    placeholder="Amount"
                    value={joinForm.planAmount}
                    onChange={e => setJoinForm({ ...joinForm, planAmount: e.target.value })}
                    className="w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none !py-2 !pl-7 !pr-3 !text-[11px] !font-normal !bg-white/[0.02] border border-white/5 !rounded-xl focus:border-accent/30 transition-all text-white outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Pay Method</p>
                <Select
                  value={joinForm.paymentMethod || 'cash'}
                  options={[
                    { label: 'Cash', value: 'cash' },
                    { label: 'UPI / Online', value: 'online_upi' }
                  ]}
                  onChange={val => setJoinForm(prev => ({ ...prev, paymentMethod: val }))}
                  searchable={false}
                  className="add-member-select"
                />
              </div>

              <div className="space-y-1">
                <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Date of Birth</p>
                <DatePicker value={joinForm.dob} onChange={val => setJoinForm({ ...joinForm, dob: val })} placeholder="Capture DOB" align="right" className="add-member-date-picker" />
                {!joinForm.dob && <p className="text-[11px] text-accent/70 font-normal uppercase animate-pulse ml-1">Required</p>}
              </div>
            </div>

            {/* Gym Time Slot Selection */}
            {(() => {
              const activeSlots = (user?.timeSlots || []).filter(s => s.status === 'Active' || s.status === 'active' || !s.status);
              return (
                <div className="space-y-1 mt-2">
                  <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Gym Time Slot *</p>
                  {activeSlots.length === 0 ? (
                    <div className="p-3 rounded-xl bg-danger/5 border border-danger/10 text-danger flex items-start gap-2">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider">No time slots configured</p>
                        <p className="text-[10px] text-text-secondary font-medium mt-0.5">Please configure your dynamic slots in settings.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Select
                        value={joinForm.timeSlot || ''}
                        options={[
                          { label: 'Select Gym Time Slot *', value: '' },
                          ...activeSlots.map(s => ({ label: `${s.name} (${s.startTime} - ${s.endTime})`, value: s.name }))
                        ]}
                        onChange={val => {
                          const selectedTrainer = trainers.find(t => t._id === joinForm.assignedTrainer);
                          const isCompatible = !selectedTrainer || isTrainerCompatible(selectedTrainer, val, user?.timeSlots);
                          setJoinForm(prev => ({
                            ...prev,
                            timeSlot: val,
                            assignedTrainer: isCompatible ? prev.assignedTrainer : ''
                          }));
                        }}
                        searchable={false}
                        className="add-member-select"
                      />
                      {!joinForm.timeSlot && <p className="text-[11px] text-accent/70 font-normal uppercase animate-pulse ml-1">Required: Please select a gym slot</p>}
                    </>
                  )}
                </div>
              );
            })()}
          </div>

          {joinForm.paymentMethod === 'online_upi' && (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
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
                            `upi://pay?pa=${activeUpi}&pn=${encodeURIComponent(payeeName)}&am=${joinForm.planAmount || 0}&cu=INR`
                          )}`}
                          alt="UPI QR Code"
                          className="w-[150px] h-[150px] object-contain"
                        />
                        <div className="mt-3 text-center">
                          <p className="text-[14px] text-white font-extrabold uppercase tracking-wide">
                            ₹{parseFloat(joinForm.planAmount || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          <button
            onClick={() => {
              const activeSlots = (user?.timeSlots || []).filter(s => s.status === 'Active' || s.status === 'active' || !s.status);
              if (!joinForm.dob) return alert('Date of Birth is required to create a membership');
              if (activeSlots.length > 0 && !joinForm.timeSlot) return alert('Gym Time Slot is required to create a membership');
              if (joinForm.addPt && !joinForm.assignedTrainer) return alert('Please select a trainer for the Personal Training add-on.');
              processJoin(leadToConvert, joinForm.plan, joinForm.planAmount);
            }}
            disabled={saving || (joinForm.paymentMethod === 'online_upi' && !user?.upiId)}
            className="w-full py-2.5 !text-[14px] !font-normal tracking-wide btn-primary shadow-lg shadow-accent/15 hover:scale-[1.01] active:scale-95 transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '⏳ Converting...' : 'Approve & Create Member'}
          </button>
        </div>
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
                const onConfirm = deleteConfirmState?.onConfirm;
                setDeleteConfirmState(null);
                if (onConfirm) await onConfirm();
              }}
              className="flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 bg-danger/15 text-danger hover:bg-danger/25 active:scale-95 border border-danger/20"
            >
              Yes, Delete
            </button>
          </div>
        </div>
      </Modal>

      {openMenuId && activeMenu && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${activeMenu.y}px`,
            left: `${activeMenu.x}px`,
            zIndex: 9999
          }}
          className="w-44 bg-[#0d0d0d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150"
        >
          <div className="p-1 space-y-0.5">
            {activeMenu.data.status === 'joined' ? (
              <button
                onClick={() => { setShowDetail(activeMenu.data); setOpenMenuId(null); setActiveMenu(null); }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[10px] text-[10px] whitespace-nowrap font-black uppercase tracking-widest text-text-secondary hover:bg-accent/15 hover:text-accent transition-all text-left"
              >
                <div className="w-5 h-5 rounded-md bg-accent/10 flex items-center justify-center">
                  <Eye size={12} className="text-accent" />
                </div>
                Details
              </button>
            ) : activeMenu.data.status === 'lost' ? (
              <>
                <button
                  onClick={() => { setShowDetail(activeMenu.data); setOpenMenuId(null); setActiveMenu(null); }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[10px] text-[10px] whitespace-nowrap font-black uppercase tracking-widest text-text-secondary hover:bg-accent/15 hover:text-accent transition-all text-left"
                >
                  <div className="w-5 h-5 rounded-md bg-accent/10 flex items-center justify-center">
                    <Eye size={12} className="text-accent" />
                  </div>
                  Details
                </button>
                <div className="border-t border-white/5 my-1" />
                <button
                  onClick={() => { handleDelete(activeMenu.data._id); setOpenMenuId(null); setActiveMenu(null); }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[10px] text-[10px] whitespace-nowrap font-black uppercase tracking-widest text-text-secondary hover:bg-danger/15 hover:text-danger transition-all text-left"
                >
                  <div className="w-5 h-5 rounded-md bg-danger/10 flex items-center justify-center">
                    <Trash2 size={12} className="text-danger" />
                  </div>
                  Delete
                </button>
              </>
            ) : (
              <>
                {activeMenu.data.status !== 'joined' ? (
                  <button
                    onClick={() => { handleJoinRequest(activeMenu.data); setOpenMenuId(null); setActiveMenu(null); }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[10px] text-[10px] whitespace-nowrap font-black uppercase tracking-widest text-text-secondary hover:bg-success/15 hover:text-success transition-all text-left"
                  >
                    <div className="w-5 h-5 rounded-md bg-success/10 flex items-center justify-center">
                      <UserCheck size={12} className="text-success" />
                    </div>
                    Converted
                  </button>
                ) : (
                  <div className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[10px] text-[10px] whitespace-nowrap font-black uppercase tracking-widest text-text-muted bg-white/[0.02] border border-white/5 cursor-not-allowed">
                    <div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center">
                      <UserCheck size={12} className="text-text-muted" />
                    </div>
                    Converted
                  </div>
                )}

                {!(activeMenu.data.trialTaken || activeMenu.data.status === 'trial') && (
                  <button
                    onClick={() => {
                      const threeDaysFromNow = new Date();
                      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
                      setTrialLead(activeMenu.data);
                      setTrialDate(threeDaysFromNow.toISOString().split('T')[0]);
                      setShowTrialModal(true);
                      setOpenMenuId(null);
                      setActiveMenu(null);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-[10px] text-[10px] whitespace-nowrap font-black uppercase tracking-widest transition-all text-left
                      ${activeMenu.data.status === 'trial' ? 'bg-info/20 text-info border border-info/10' : 'text-text-secondary hover:bg-info/10 hover:text-info border border-transparent'}
                    `}
                  >
                    <div className="w-5 h-5 rounded-md bg-info/10 flex items-center justify-center">
                      <Clock size={12} className="text-info" />
                    </div>
                    Trial
                  </button>
                )}

                <button
                  onClick={() => { updateStatus(activeMenu.data._id, 'interested'); setOpenMenuId(null); setActiveMenu(null); }}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-[10px] text-[10px] whitespace-nowrap font-black uppercase tracking-widest transition-all text-left
                    ${activeMenu.data.status === 'interested' ? 'bg-accent/20 text-accent border border-accent/10' : 'text-text-secondary hover:bg-accent/10 hover:text-accent border border-transparent'}
                  `}
                >
                  <div className="w-5 h-5 rounded-md bg-accent/10 flex items-center justify-center">
                    <Flame size={12} className="text-accent" />
                  </div>
                  Interested
                </button>

                <button
                  onClick={() => { updateStatus(activeMenu.data._id, 'lost'); setOpenMenuId(null); setActiveMenu(null); }}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-[10px] text-[10px] whitespace-nowrap font-black uppercase tracking-widest transition-all text-left
                    ${activeMenu.data.status === 'lost' ? 'bg-danger/20 text-danger border border-danger/10' : 'text-text-secondary hover:bg-danger/10 hover:text-danger border border-transparent'}
                  `}
                >
                  <div className="w-5 h-5 rounded-md bg-danger/10 flex items-center justify-center">
                    <XCircle size={12} className="text-danger" />
                  </div>
                  Lost
                </button>

                <div className="border-t border-white/5 my-1" />

                <button
                  onClick={() => { handleDelete(activeMenu.data._id); setOpenMenuId(null); setActiveMenu(null); }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[10px] text-[10px] whitespace-nowrap font-black uppercase tracking-widest text-text-secondary hover:bg-danger/15 hover:text-danger transition-all text-left"
                >
                  <div className="w-5 h-5 rounded-md bg-danger/10 flex items-center justify-center">
                    <Trash2 size={12} className="text-danger" />
                  </div>
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {showDetail && (
        <Modal isOpen={!!showDetail} onClose={() => setShowDetail(null)} title="Lead Details" size="md">
          {(() => {
            const detail = enrichedDetail || showDetail;
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-white/5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shadow-lg border ${detail.gender === 'female' ? 'bg-gradient-to-br from-pink-500/20 to-pink-500/5 text-pink-200 border-pink-500/10' :
                    detail.gender === 'male' ? 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-blue-200 border-blue-500/10' :
                      'bg-gradient-to-br from-white/10 to-white/5 text-white border-white/5'
                    }`}>
                    {detail.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">
                      {detail.name} <span className="text-text-muted font-bold text-[11px] capitalize">({detail.gender || 'N/A'})</span>
                    </h3>
                    <span className="text-[9px] font-black text-accent uppercase tracking-widest leading-none">{detail.source?.replace(/_/g, ' ')}</span>
                  </div>
                </div>

                <div className="space-y-2.5 text-[11px]">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="font-bold text-text-muted uppercase tracking-wider">Phone</span>
                    <span className="font-extrabold text-white">{detail.phone}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="font-bold text-text-muted uppercase tracking-wider">Plan of Interest</span>
                    <span className="font-extrabold text-white capitalize">
                      {detail.interestedPlan}
                      {detail.planAmount > 0 && ` (₹${detail.planAmount})`}
                    </span>
                  </div>
                  {detail.assignedTrainer && (
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="font-bold text-text-muted uppercase tracking-wider">Assigned PT Trainer</span>
                      <span className="font-extrabold text-accent capitalize">
                        {(() => {
                          if (typeof detail.assignedTrainer === 'object' && detail.assignedTrainer?.name) {
                            return detail.assignedTrainer.name;
                          }
                          const matched = trainers.find(t => t._id === detail.assignedTrainer);
                          return matched ? matched.name : (detail.assignedTrainer.name || detail.assignedTrainer);
                        })()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="font-bold text-text-muted uppercase tracking-wider">Follow-up Date</span>
                    <span className="font-extrabold text-white uppercase tracking-wider">
                      {detail.followUpDate ? new Date(detail.followUpDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not Set'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="font-bold text-text-muted uppercase tracking-wider">Age</span>
                    <span className="font-extrabold text-white uppercase tracking-wider">
                      {(() => {
                        if (!detail.dob) return 'Not Set';
                        const diffMs = Date.now() - new Date(detail.dob).getTime();
                        const ageDt = new Date(diffMs);
                        const age = Math.abs(ageDt.getUTCFullYear() - 1970);
                        const formattedDob = new Date(detail.dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                        return `${age} Years (${formattedDob})`;
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="font-bold text-text-muted uppercase tracking-wider">Status</span>
                    <Badge variant={statusColors[detail.status]} size="sm">{detail.status}</Badge>
                  </div>
                  {detail.notes && (
                    <div className="pt-2">
                      <span className="font-bold text-text-muted uppercase tracking-wider block mb-1">Notes</span>
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-text-secondary leading-relaxed break-words font-medium">
                        {detail.notes}
                      </div>
                    </div>
                  )}

                  {/* Timeline History Section */}
                  <div className="pt-3 border-t border-white/5">
                    <span className="font-bold text-text-muted uppercase tracking-wider block mb-3 text-[9px] tracking-[0.15em]">Activity Timeline History</span>
                    <div className="relative pl-5 space-y-4">
                      {/* Vertical line connector */}
                      <div className="absolute left-[7px] top-1.5 bottom-1.5 w-0.5 bg-gradient-to-b from-accent/40 via-white/5 to-white/0" />

                      {/* Render timeline items */}
                      {(() => {
                        const history = [...(detail.statusHistory || [])];

                        // Fallback if history is empty
                        if (history.length === 0) {
                          history.push({ status: 'new', date: detail.createdAt });
                          if (detail.status !== 'new') {
                            history.push({ status: detail.status, date: detail.updatedAt || new Date() });
                          }
                        }

                        // Sort history by date ascending
                        history.sort((a, b) => new Date(a.date) - new Date(b.date));

                        return history.map((item, idx) => {
                          const color = statusColors[item.status] || 'neutral';
                          const formattedDate = new Date(item.date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          });

                          return (
                            <div key={idx} className="relative flex flex-col gap-0.5 animate-in fade-in slide-in-from-left-2 duration-300 text-left">
                              {/* Timeline dot */}
                              <div className={`absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full border-2 bg-[#0d0d0d] ${color === 'success' ? 'border-success shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                                  color === 'info' ? 'border-info shadow-[0_0_8px_rgba(6,182,212,0.5)]' :
                                    color === 'warning' ? 'border-warning shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                                      color === 'danger' ? 'border-danger shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                                        color === 'accent' ? 'border-accent shadow-[0_0_8px_rgba(234,179,8,0.5)]' :
                                          'border-neutral-500 shadow-[0_0_8px_rgba(115,115,115,0.5)]'
                                }`} />

                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-white capitalize">{item.status}</span>
                                <Badge variant={color} size="xs" className="scale-75 origin-left">{item.status}</Badge>
                              </div>
                              <span className="text-[9px] text-text-muted font-bold tracking-wide">{formattedDate}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => setShowDetail(null)}
                    className="w-full py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary active:bg-white/20 active:scale-95"
                  >
                    Close
                  </button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {showTrialModal && (
        <Modal
          isOpen={showTrialModal}
          onClose={() => setShowTrialModal(false)}
          title="Set Trial Period"
          size="sm"
          overflowVisible={true}
        >
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-info/20 to-info/5 flex items-center justify-center text-info font-black">
                <Clock size={20} className="text-info" />
              </div>
              <div>
                <p className="text-sm font-black text-white">{trialLead?.name}</p>
                <p className="text-xs text-text-muted">Starting Trial Period</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Trial End Date</p>
              <DatePicker
                value={trialDate}
                onChange={(val) => setTrialDate(val)}
                placeholder="Select End Date"
                minDate={(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })()}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowTrialModal(false)}
                className="flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await leadsApi.update(trialLead._id, { status: 'trial', followUpDate: trialDate });
                    fetchLeads(true);
                    setShowTrialModal(false);
                  } catch (err) {
                    alert(err.message);
                  }
                }}
                className="flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 bg-info text-black hover:bg-info/90 hover:shadow-lg hover:shadow-info/20 active:scale-95"
              >
                Start Trial
              </button>
            </div>
          </div>
        </Modal>
      )}


    </div>
  );
}
