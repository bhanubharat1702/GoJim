'use client';
import { useState, useEffect , useRef} from 'react';
import { useInView } from 'react-intersection-observer';
import { paymentsApi, membersApi, plansApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Modal, StatCard, Select, Badge, Loader, DatePicker, SearchBar, EmptyState } from '@/components/UI';
import {
  Banknote, Smartphone, CreditCard, Landmark,
  IndianRupee, Calendar, BarChart3, Clock,
  Plus, Zap, User, ArrowRight, AlertCircle, LogOut,
  ChevronUp, ChevronDown, ChevronsUpDown, Activity, UserX, X,
  CheckCircle, ChevronLeft, ChevronRight, Filter, Check,
  Trash2, UserMinus
} from 'lucide-react';

export default function IncomesTab() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState(null);
  const [memberStats, setMemberStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [members, setMembers] = useState([]);
  const [pendingMembers, setPendingMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [saving, setSaving] = useState(false);
  const [cancelPaymentId, setCancelPaymentId] = useState(null);
  const [cancelPtMemberId, setCancelPtMemberId] = useState(null);
  const [form, setForm] = useState({ memberId: '', amount: '', plan: 'monthly', paymentMethod: 'cash' });
  const [sortConfig, setSortConfig] = useState({ key: 'default', direction: 'desc' });
  const [selectedUpi, setSelectedUpi] = useState('');
  const [expandedIncomeId, setExpandedIncomeId] = useState(null);

  useEffect(() => {
    if (user?.upiId && !selectedUpi) {
      setSelectedUpi(user.upiId);
    }
  }, [user, selectedUpi]);

  // Interactive Stat Card & Calendar Filtering State
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all' | 'today' | 'month' | 'pending' | 'inactive'

  // Calendar Date Filter States matching the Clients page
  const [dateFilterType, setDateFilterType] = useState('month'); // 'all' | 'year' | 'month' | 'date' | 'range'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString()); // '0' to '11'
  const [selectedDate, setSelectedDate] = useState(''); // 'YYYY-MM-DD'
  const [selectedRangeStart, setSelectedRangeStart] = useState(''); // 'YYYY-MM-DD'
  const [selectedRangeEnd, setSelectedRangeEnd] = useState(''); // 'YYYY-MM-DD'
  const [showDateFilterPopover, setShowDateFilterPopover] = useState(false);

  // Status Filter for dues, due soon, etc.
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'paid' | 'pending' | 'dues' | 'due_soon'
  const [showStatusFilterPopover, setShowStatusFilterPopover] = useState(false);

  const STATUS_FILTER_OPTIONS = [
    { value: 'all', label: 'All', color: 'text-text-muted' },
    { value: 'paid', label: 'Paid', color: 'text-success' },
    { value: 'dues', label: 'Expired', color: 'text-danger' },
    { value: 'due_soon', label: 'Due Soon', color: 'text-warning' },
  ];

  const getStatusFilterLabel = () => STATUS_FILTER_OPTIONS.find(o => o.value === statusFilter)?.label || 'All';

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

  const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const isDateMatched = (itemDate) => {
    if (dateFilterType === 'all') return true;
    if (!itemDate) return false;
    const d = new Date(itemDate);

    if (dateFilterType === 'date') {
      if (!selectedDate) return true;
      const targetDate = parseLocalDate(selectedDate);
      return d.getFullYear() === targetDate.getFullYear() &&
        d.getMonth() === targetDate.getMonth() &&
        d.getDate() === targetDate.getDate();
    }

    if (dateFilterType === 'month') {
      const targetMonth = parseInt(selectedMonth);
      const targetYear = parseInt(selectedYear);
      return d.getFullYear() === targetYear &&
        d.getMonth() === targetMonth;
    }

    if (dateFilterType === 'year') {
      const targetYear = parseInt(selectedYear);
      return d.getFullYear() === targetYear;
    }

    if (dateFilterType === 'range') {
      const start = parseLocalDate(selectedRangeStart);
      if (start) start.setHours(0, 0, 0, 0);

      const end = parseLocalDate(selectedRangeEnd);
      if (end) end.setHours(23, 59, 59, 999);

      if (start && end) {
        return d >= start && d <= end;
      } else if (start) {
        return d >= start;
      } else if (end) {
        return d <= end;
      }
      return true;
    }

    return true;
  };

  const formatSafeDate = (dateStr, fallback = 'N/A') => {
    if (!dateStr) return fallback;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Member Payment History & Month-by-month calendar states
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberPayments, setMemberPayments] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Infinite Scroll Hook
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  });

  useEffect(() => {
    if (inView && hasMore && !loading && !loadingMore) {
      fetchData(true);
    }
  }, [inView, hasMore, loading, loadingMore]);

  const fetchData = async (isLoadMore = false) => {
    try {
      if (isLoadMore) setLoadingMore(true);
      
      const currentPage = isLoadMore ? page + 1 : 1;

      const [payRes, statRes, pendingRes, memRes, planRes, memStatsRes] = await Promise.all([
        paymentsApi.getAll(`limit=50&page=${currentPage}`),
        !isLoadMore ? paymentsApi.getStats() : Promise.resolve({ success: false }),
        !isLoadMore ? membersApi.getExpiring() : Promise.resolve({ success: false }),
        !isLoadMore ? membersApi.getAll('limit=200') : Promise.resolve({ success: false }),
        !isLoadMore ? plansApi.getAll() : Promise.resolve({ success: false }),
        !isLoadMore ? membersApi.getStats() : Promise.resolve({ success: false })
      ]);

      if (payRes.success) {
        if (isLoadMore) {
          setPayments(prev => [...prev, ...payRes.data]);
        } else {
          setPayments(payRes.data);
        }
        setHasMore(payRes.page < payRes.pages);
        setPage(payRes.page || currentPage);
      }
      if (statRes.success) setStats(statRes.data);
      if (pendingRes.success) setPendingMembers(pendingRes.data);
      if (memRes.success) setMembers(memRes.data);
      if (planRes.success) setPlans(planRes.data);
      if (memStatsRes.success) setMemberStats(memStatsRes.data);
    } catch (err) { console.error(err); }
    finally { 
      setLoading(false); 
      setLoadingMore(false);
    }
  };

  const handleCancelPayment = async () => {
    setSaving(true);
    try {
      await paymentsApi.delete(cancelPaymentId);
      setCancelPaymentId(null);
      await fetchData();
    } catch (err) {
      alert(err.message || 'Failed to cancel payment');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelPt = async () => {
    setSaving(true);
    try {
      await membersApi.update(cancelPtMemberId, { assignedTrainer: null });
      setCancelPtMemberId(null);
      await fetchData();
    } catch (err) {
      alert(err.message || 'Failed to cancel PT');
    } finally {
      setSaving(false);
    }
  };

  const hasFetched = useRef(false);
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchData();
  }, []);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (form.paymentMethod === 'razorpay') {
        const orderRes = await paymentsApi.createRazorpayOrder({ amount: parseInt(form.amount) });
        if (!orderRes.success) {
          throw new Error('Failed to initiate Razorpay order');
        }

        const loaded = await loadRazorpayScript();
        if (!loaded || orderRes.order.isMock) {
          console.log('⚠️ [Razorpay Simulator] Performing simulated demo payment checkout.');
          setTimeout(async () => {
            try {
              setSaving(true);
              const verifyRes = await paymentsApi.verifyRazorpayPayment({
                razorpay_order_id: orderRes.order.id,
                razorpay_payment_id: `mock_pay_${Date.now()}`,
                razorpay_signature: 'mock_signature',
                memberId: form.memberId,
                amount: parseInt(form.amount),
                plan: form.plan,
                notes: form.notes || '',
                isPtPayment: form.isPtPayment || false
              });
              
              if (verifyRes.success) {
                alert('Payment verified & recorded successfully (Demo Payment)!');
                setShowAdd(false);
                setForm({ memberId: '', amount: '', plan: plans[0]?.name || 'monthly', paymentMethod: 'cash' });
                await fetchData();
              }
            } catch (err) {
              alert('Payment verification failed: ' + err.message);
            } finally {
              setSaving(false);
            }
          }, 1500);
          return;
        }

        const memberObj = members.find(m => m._id === form.memberId);
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_GoJimTestKey123',
          amount: orderRes.order.amount,
          currency: orderRes.order.currency,
          name: 'GoJim Gym Subscription',
          description: `Payment for plan ${form.plan}`,
          order_id: orderRes.order.id,
          handler: async function (response) {
            try {
              setSaving(true);
              const verifyRes = await paymentsApi.verifyRazorpayPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                memberId: form.memberId,
                amount: parseInt(form.amount),
                plan: form.plan,
                notes: form.notes || '',
                isPtPayment: form.isPtPayment || false
              });
              
              if (verifyRes.success) {
                alert('Payment verified & recorded successfully!');
                setShowAdd(false);
                setForm({ memberId: '', amount: '', plan: plans[0]?.name || 'monthly', paymentMethod: 'cash' });
                await fetchData();
              }
            } catch (err) {
              alert('Payment verification failed: ' + err.message);
            } finally {
              setSaving(false);
            }
          },
          prefill: {
            name: memberObj?.name || '',
            contact: memberObj?.phone || '',
          },
          theme: {
            color: '#10B981'
          }
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
        setSaving(false);
      } else {
        const payload = { ...form, amount: parseInt(form.amount) };
        if (form.paymentMethod === 'upi') {
          payload.upiId = selectedUpi || user?.upiId || '';
        }
        await paymentsApi.create(payload);
        setShowAdd(false);
        setForm({ memberId: '', amount: '', plan: plans[0]?.name || 'monthly', paymentMethod: 'cash' });
        await fetchData();
      }
    } catch (err) {
      alert(err.message);
      setSaving(false);
    }
  };

  const handleSort = (key) => {
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        setSortConfig({ key, direction: 'desc' });
      } else {
        setSortConfig({ key: 'default', direction: 'desc' });
      }
    } else {
      setSortConfig({ key, direction: 'asc' });
    }
  };

  const handleMemberClick = async (member) => {
    if (!member) return;
    const freshMember = members.find(m => m._id === member._id) || member;
    setSelectedMember(freshMember);
    setLoadingHistory(true);
    setCalendarYear(new Date().getFullYear());
    try {
      const res = await paymentsApi.getMemberPayments(member._id);
      if (res.success) {
        setMemberPayments(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Helper to determine months count based on plan name
  const getPlanMonths = (planName) => {
    const name = planName?.toLowerCase() || '';
    if (name.includes('year') || name.includes('12')) return 12;
    if (name.includes('half') || name.includes('6')) return 6;
    if (name.includes('quarter') || name.includes('3')) return 3;
    return 1;
  };

  // Check the coverage status of a specific month/year
  const getMonthStatus = (year, monthIdx) => {
    if (!selectedMember) return 'not-joined';

    const firstDay = new Date(year, monthIdx, 1);
    const lastDay = new Date(year, monthIdx + 1, 0);
    const now = new Date();

    const join = selectedMember.joinDate ? new Date(selectedMember.joinDate) : null;
    if (join && lastDay < new Date(join.getFullYear(), join.getMonth(), 1)) {
      return 'not-joined';
    }

    // Check overlap with active/paid coverage periods in history
    const isCovered = memberPayments.some(p => {
      const expiry = new Date(p.newExpiry || p.paymentDate);
      const duration = getPlanMonths(p.plan);
      const start = new Date(expiry);
      start.setMonth(start.getMonth() - duration);

      return start <= lastDay && expiry >= firstDay;
    });

    if (isCovered) return 'paid';

    // Future months
    if (firstDay > now) return 'future';

    // Past but uncovered
    return 'unpaid';
  };

  const SortHeader = ({ label, sortKey, className = "" }) => {
    const isActive = sortConfig.key === sortKey;
    const isDesc = sortConfig.direction === 'desc';

    return (
      <th
        className={`px-6 py-2.5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] cursor-pointer hover:text-white transition-colors group ${className}`}
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

  if (loading) return <div className="p-20 flex justify-center"><Loader /></div>;

  const combinedData = [
    ...payments.map(p => ({
      ...p,
      type: p.status === 'cancelled' ? 'cancelled' : 'paid',
      memberName: p.member?.name || '',
      sortDate: new Date(p.paymentDate || p.createdAt)
    })),
    ...pendingMembers.map(m => ({
      _id: `pending-${m._id}`,
      member: m,
      memberName: m.name || '',
      plan: m.plan,
      amount: m.planAmount,
      paymentDate: null,
      lastPaymentDate: m.lastPaymentDate,
      newExpiry: m.planExpiry,
      paymentMethod: 'pending',
      type: 'pending',
      sortDate: new Date(m.planExpiry)
    }))
  ];

  // Apply Interactive Filters based on active Stat Card / Calendar selection
  const filteredCombinedData = combinedData.filter(item => {
    if (search) {
      const q = search.toLowerCase();
      const memberName = (item.memberName || '').toLowerCase();
      const phone = (item.member?.phone || '').toLowerCase();
      const plan = (item.plan || '').toLowerCase();
      const paymentMethod = (item.paymentMethod || '').toLowerCase();
      if (!memberName.includes(q) && !phone.includes(q) && !plan.includes(q) && !paymentMethod.includes(q)) {
        return false;
      }
    }

    if (paymentFilter !== 'all') {
      const today = new Date();
      const itemDate = new Date(item.paymentDate || item.createdAt);

      if (paymentFilter === 'today') {
        if (item.type !== 'paid') return false;
        if (itemDate.toDateString() !== today.toDateString()) return false;
      } else if (paymentFilter === 'month') {
        if (item.type !== 'paid') return false;
        if (itemDate.getMonth() !== today.getMonth() || itemDate.getFullYear() !== today.getFullYear()) return false;
      } else if (paymentFilter === 'pending') {
        if (item.type !== 'pending') return false;
      } else if (paymentFilter === 'inactive') {
        if (item.member?.status !== 'inactive') return false;
      }
    }

    if (statusFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (statusFilter === 'paid') {
        if (item.type !== 'paid') return false;
      } else if (statusFilter === 'pending') {
        if (item.type !== 'pending') return false;
      } else if (statusFilter === 'dues') {
        if (item.type !== 'pending') return false;
        const expiry = new Date(item.newExpiry || item.sortDate);
        expiry.setHours(0, 0, 0, 0);
        if (expiry >= today) return false;
      } else if (statusFilter === 'due_soon') {
        if (item.type !== 'pending') return false;
        const expiry = new Date(item.newExpiry || item.sortDate);
        expiry.setHours(0, 0, 0, 0);
        if (expiry < today) return false;
      }
    }

    return isDateMatched(item.sortDate || item.paymentDate || item.createdAt);
  }).sort((a, b) => {
    const { key, direction } = sortConfig;
    const sortKey = key === 'default' ? 'sortDate' : key;
    const sortDir = key === 'default' ? 'desc' : direction;
    let valA = a[sortKey];
    let valB = b[sortKey];

    if (sortKey === 'memberName') {
      valA = (a.memberName || '').toLowerCase();
      valB = (b.memberName || '').toLowerCase();
    } else if (sortKey === 'sortDate' || sortKey === 'newExpiry') {
      valA = valA ? new Date(valA).getTime() : 0;
      valB = valB ? new Date(valB).getTime() : 0;
    }

    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const methodIcon = {
    cash: <Banknote size={14} />,
    upi: <Zap size={14} />,
    card: <CreditCard size={14} />,
    bank_transfer: <Landmark size={14} />,
    razorpay: <Smartphone size={14} className="text-accent" />,
    pending: <AlertCircle size={14} className="text-warning" />
  };

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="pb-10">
      {/* Main Bundle Card */}
      <div className="bg-bg-card border border-white/5 rounded-xl shadow-2xl flex flex-col">

        {/* Top Header & Stats Row */}
        <div className="py-4 px-6 border-b border-white/5 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-text-primary tracking-tight">Client Payments</h1>
              <div className="flex items-center gap-2 text-[10px] font-black text-text-muted uppercase tracking-widest mt-1 opacity-70">
                {/* <Activity size={12} className="text-accent" /> */}
                Live feed of all transactions and pending renewals
              </div>
            </div>

            {/* Calendar next to Record Payment */}
            <div className="flex items-center gap-3">
              <SearchBar value={search} onChange={setSearch} placeholder="Search payments..." />

              {/* Status Filter Dropdown */}
              <div className="relative" id="status-filter-container">
                <button
                  type="button"
                  onClick={() => { setShowStatusFilterPopover(!showStatusFilterPopover); setShowDateFilterPopover(false); }}
                  className={`flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${statusFilter !== 'all' ? 'border-accent/40 bg-accent/5 text-accent shadow-lg shadow-accent/5' : ''}`}
                >
                  <Filter size={14} className={statusFilter !== 'all' ? 'text-accent' : 'text-text-muted'} />
                  <span>{getStatusFilterLabel()}</span>
                  {statusFilter !== 'all' ? (
                    <X
                      size={12}
                      className="ml-1 hover:text-white transition-colors cursor-pointer text-text-muted"
                      onClick={(e) => { e.stopPropagation(); setStatusFilter('all'); setPaymentFilter('all'); setShowStatusFilterPopover(false); }}
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
                          type="button"
                          onClick={() => {
                            setStatusFilter(opt.value);
                            setPaymentFilter('all');
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
                  type="button"
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
                        setPaymentFilter('all');
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
                          onChange={(val) => {
                            setDateFilterType(val);
                            setPaymentFilter('all');
                          }}
                        />
                      </div>

                      {/* Dynamic fields based on selection */}
                      {dateFilterType === 'date' && (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                          <p className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Select Date</p>
                          <DatePicker
                            value={selectedDate}
                            onChange={(val) => {
                              setSelectedDate(val);
                              setPaymentFilter('all');
                            }}
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
                              onChange={(val) => {
                                setSelectedMonth(val);
                                setPaymentFilter('all');
                              }}
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
                              onChange={(val) => {
                                setSelectedYear(val);
                                setPaymentFilter('all');
                              }}
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
                            onChange={(val) => {
                              setSelectedYear(val);
                              setPaymentFilter('all');
                            }}
                          />
                        </div>
                      )}

                      {dateFilterType === 'range' && (
                        <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="space-y-1.5">
                            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Start Date</p>
                            <DatePicker
                              value={selectedRangeStart}
                              onChange={(val) => {
                                setSelectedRangeStart(val);
                                setPaymentFilter('all');
                              }}
                              placeholder="From Date"
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">End Date</p>
                            <DatePicker
                              value={selectedRangeEnd}
                              onChange={(val) => {
                                setSelectedRangeEnd(val);
                                setPaymentFilter('all');
                              }}
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
                            setPaymentFilter('all');
                            setShowDateFilterPopover(false);
                          }}
                          className="flex-1 py-2 text-[9px] font-black uppercase tracking-wider rounded-xl bg-white/5 text-text-muted hover:bg-white/10 hover:text-white transition-all text-center cursor-pointer"
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentFilter('all');
                            setShowDateFilterPopover(false);
                          }}
                          className="flex-1 py-2 text-[9px] font-black uppercase tracking-wider rounded-xl bg-accent text-black hover:bg-accent-hover transition-all text-center cursor-pointer"
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
                className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-black rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-lg shadow-accent/20 active:scale-95 whitespace-nowrap cursor-pointer"
              >
                <Plus size={14} /> Record Payment
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <StatCard
                icon={<IndianRupee />}
                label="Today's Collection"
                value={`₹${stats.todayIncome.toLocaleString()}`}
                trend="Today's total"
                trendUp={true}
                size="xs"
                flyInDirection="right"
                className={`cursor-pointer transition-all duration-300 ${paymentFilter === 'today'
                  ? 'border-success/40 bg-success/15 shadow-[0_0_15px_rgba(34,197,94,0.15)] text-success'
                  : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
                onClick={() => {
                  setDateFilterType('all');
                  setStatusFilter('all');
                  setPaymentFilter(paymentFilter === 'today' ? 'all' : 'today');
                }}
              />
              <StatCard
                icon={<BarChart3 />}
                label="This Month"
                value={`₹${stats.monthlyIncome.toLocaleString()}`}
                trend="Current month"
                trendUp={true}
                size="xs"
                flyInDirection="bottom"
                className={`cursor-pointer transition-all duration-300 ${paymentFilter === 'month'
                  ? 'border-success/40 bg-success/15 shadow-[0_0_15px_rgba(34,197,94,0.15)] text-success'
                  : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
                onClick={() => {
                  setDateFilterType('all');
                  setStatusFilter('all');
                  setPaymentFilter(paymentFilter === 'month' ? 'all' : 'month');
                }}
              />
              <StatCard
                icon={<Clock />}
                label="Pending"
                value={pendingMembers.length}
                trend="Dues pending"
                trendUp={false}
                size="xs"
                flyInDirection="top"
                className={`cursor-pointer transition-all duration-300 ${paymentFilter === 'pending'
                  ? 'border-warning/40 bg-warning/15 shadow-[0_0_15px_rgba(234,179,8,0.15)] text-warning'
                  : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
                onClick={() => {
                  setDateFilterType('all');
                  setStatusFilter('all');
                  setPaymentFilter(paymentFilter === 'pending' ? 'all' : 'pending');
                }}
              />
              <StatCard
                icon={<UserX />}
                label="Inactive Members"
                value={memberStats?.inactiveMembers || 0}
                trend="Expired plans"
                trendUp={false}
                size="xs"
                flyInDirection="left"
                className={`cursor-pointer transition-all duration-300 ${paymentFilter === 'inactive'
                  ? 'border-danger/40 bg-danger/15 shadow-[0_0_15px_rgba(239,68,68,0.15)] text-danger'
                  : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
                onClick={() => {
                  setDateFilterType('all');
                  setStatusFilter('all');
                  setPaymentFilter(paymentFilter === 'inactive' ? 'all' : 'inactive');
                }}
              />
              <StatCard
                icon={<IndianRupee />}
                label="Total Revenue"
                value={`₹${stats.totalIncome.toLocaleString()}`}
                trend="All-time earnings"
                trendUp={true}
                size="xs"
                flyInDirection="right"
                className={`cursor-pointer transition-all duration-300 ${paymentFilter === 'all'
                  ? 'border-accent/40 bg-accent/15 shadow-[0_0_15px_rgba(255,255,255,0.05)] text-accent'
                  : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
                onClick={() => {
                  setDateFilterType('all');
                  setStatusFilter('all');
                  setPaymentFilter('all');
                }}
              />
            </div>
          )}
        </div>

        {/* Content Listing Area */}
        {filteredCombinedData.length === 0 ? (
          <EmptyState
            icon={<Banknote size={48} className="text-text-muted opacity-50" />}
            title="No transactions found"
            description="Try adjusting your filters or record a new payment to get started."
          />
        ) : (
          <>
            <div className="hidden md:block max-h-[292px] overflow-y-auto relative rounded-2xl border border-white/5">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0a0a0a] z-10 border-b border-white/5 shadow-md">
                <tr className="bg-white/[0.02]">
                  <th className="px-8 py-2.5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] w-12">#</th>
                  <SortHeader label="Member" sortKey="memberName" />
                  <SortHeader label="Plan Info" sortKey="plan" />
                  <SortHeader label="Amount" sortKey="amount" />
                  <SortHeader label="Paid On" sortKey="sortDate" />
                  <SortHeader label="Validity" sortKey="newExpiry" />
                  <SortHeader label="Method" sortKey="paymentMethod" />
                  <th className="px-6 py-2.5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] text-right pr-8">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCombinedData.map((item, idx) => {
                  const isPending = item.type === 'pending';
                  const isCancelled = item.status === 'cancelled';
                  const m = item.member;
                  const isExpired = isPending && m?.planExpiry && new Date(m.planExpiry) < new Date();
                  const isInactive = m?.status === 'inactive';
                  const isFemale = m?.gender === 'female';
                  const isMale = m?.gender === 'male';

                  return (
                    <tr
                      key={item._id}
                      onClick={() => handleMemberClick(m)}
                      className={`transition-all group border-b border-white/5 cursor-pointer ${isInactive ? 'opacity-40 grayscale pointer-events-none select-none' : ''} ${isCancelled ? 'opacity-50 hover:bg-white/[0.01]' : 'hover:bg-white/[0.02]'}`}
                    >
                      <td className="px-8 py-2.5 text-[11px] font-black text-text-muted">{idx + 1}</td>
                      <td className="px-6 py-2.5">
                        <div className="flex items-center gap-3">
                          {isPending ? (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] shadow-lg ${isExpired ? 'bg-danger/20 text-danger border border-danger/10' : 'bg-warning/20 text-warning border border-warning/10'}`}>
                              <AlertCircle size={14} />
                            </div>
                          ) : (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] shadow-lg group-hover:scale-110 transition-transform ${isFemale ? 'bg-gradient-to-br from-pink-500/20 to-pink-500/5 text-pink-200 border border-pink-500/10' :
                              isMale ? 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-blue-200 border border-blue-500/10' :
                                'bg-gradient-to-br from-white/10 to-white/5 text-white border-white/5'
                              }`}>
                              {m?.name?.[0] || 'M'}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className={`text-xs font-black transition-colors ${isPending ? 'text-white' :
                                isFemale ? 'text-pink-200 group-hover:text-pink-100' :
                                  isMale ? 'text-blue-200 group-hover:text-blue-100' :
                                    'text-white group-hover:text-accent'
                                }`}>{m?.name || 'Deleted Member'}</p>
                              {isPending && <Badge variant={isExpired ? 'danger' : 'warning'} size="sm">{isExpired ? 'Expired' : 'Due'}</Badge>}
                              {!isPending && m?.status === 'exited' && (
                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-[9px] font-black text-text-muted uppercase tracking-tighter">
                                  <LogOut size={10} className="text-danger" /> Exited
                                </div>
                              )}
                            </div>
                            <p className={`text-[10px] font-bold ${isPending ? 'text-text-muted' : 'text-text-muted/60'}`}>{m?.phone || 'No Phone'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-2.5">
                        {(() => {
                          const isPtPayment = item.isPtPayment || (item.notes && (item.notes.toLowerCase().includes('pt') || item.notes.toLowerCase().includes('personal')));
                          const badgeText = (item.notes || '').toLowerCase().includes('upgrade') ? 'PT' : 'Training + PT';
                          const shouldDisplayNote = item.notes && !item.notes.toLowerCase().startsWith('initial membership payment');
                          return (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${isCancelled ? 'bg-danger/10 text-danger border-danger/20 line-through' : isPending ? 'text-text-secondary bg-white/5 border-white/5' : 'text-white bg-white/5 border-white/5'}`}>{item.plan}</span>
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
                                <span className="text-[9px] text-text-muted font-medium italic max-w-[200px] truncate" title={item.notes}>
                                  {item.notes}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-2.5">
                        <span className={`text-xs font-black ${isCancelled ? 'text-text-muted line-through' : isPending ? 'text-white/50' : 'text-success'}`}>₹{item.amount?.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-2.5 text-xs font-bold text-text-secondary">
                        {isPending ? (
                          <span className={`text-[10px] font-black ${isExpired ? 'text-danger' : 'text-warning'}`}>
                            {item.lastPaymentDate ? formatSafeDate(item.lastPaymentDate) : 'No payments'}
                          </span>
                        ) : (
                          <span className={isCancelled ? 'line-through text-text-muted' : ''}>
                            {formatSafeDate(item.paymentDate)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-text-muted">{isCancelled ? 'Cancelled:' : isPending ? 'Expiry:' : 'Expires:'}</span>
                          <span className={`text-xs font-black ${isCancelled ? 'text-text-muted line-through' : isPending ? (isExpired ? 'text-danger' : 'text-warning') : 'text-white'}`}>
                            {formatSafeDate(item.newExpiry)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-2.5">
                        {isPending ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setForm({ ...form, memberId: m._id, amount: m.planAmount, plan: m.plan });
                              setShowAdd(true);
                            }}
                            className="text-[9px] font-black text-accent border border-accent/30 px-3 py-1.5 rounded-lg hover:bg-accent hover:text-black transition-all cursor-pointer"
                          >
                            PAY NOW
                          </button>
                        ) : isCancelled ? (
                          <div className="flex items-center gap-2 text-danger/70 transition-colors">
                            <span className="text-[10px] font-black uppercase tracking-tighter">CANCELLED</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-text-muted group-hover:text-white transition-colors">
                            {methodIcon[item.paymentMethod]}
                            <span className="text-[10px] font-black uppercase tracking-tighter">{item.paymentMethod.replace('_', ' ')}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-2.5 text-right pr-8 relative" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {m?.assignedTrainer && (
                            <button
                              type="button"
                              onClick={() => setCancelPtMemberId(m._id)}
                              title="Cancel PT (Unassign Coach)"
                              className="w-7 h-7 rounded-lg bg-warning/10 text-warning hover:bg-warning/20 border border-warning/10 hover:border-warning/20 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                            >
                              <UserMinus size={13} />
                            </button>
                          )}
                          {!isPending && !isCancelled && (
                            <button
                              type="button"
                              onClick={() => setCancelPaymentId(item._id)}
                              title="Cancel Payment (Revert Plan)"
                              className="w-7 h-7 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 border border-danger/10 hover:border-danger/20 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Collapsible Cards View */}
          {filteredCombinedData.length === 0 ? (
            <div className="block md:hidden text-center py-12 text-text-muted font-bold text-xs uppercase tracking-widest opacity-60">
              No transactions match the selected filters.
            </div>
          ) : (
            <div className="block md:hidden space-y-3 max-h-[360px] overflow-y-auto pb-4 pr-1">
              {filteredCombinedData.map((item, idx) => {
                const isExpanded = expandedIncomeId === item._id;
                const isPending = item.type === 'pending';
                const isCancelled = item.status === 'cancelled';
                const m = item.member;
                const isExpired = isPending && m?.planExpiry && new Date(m.planExpiry) < new Date();
                const initials = m?.name ? m.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'M';
                
                const isPtPayment = item.isPtPayment || (item.notes && (item.notes.toLowerCase().includes('pt') || item.notes.toLowerCase().includes('personal')));
                const badgeText = (item.notes || '').toLowerCase().includes('upgrade') ? 'PT' : 'Training + PT';

                return (
                  <div
                    key={item._id}
                    className={`border border-white/5 rounded-2xl transition-all ${
                      isExpanded ? 'bg-white/[0.03] shadow-lg' : 'bg-white/[0.01]'
                    }`}
                  >
                    {/* Card Header (Collapsed State) */}
                    <div
                      onClick={() => handleMemberClick(m)}
                      className="p-4 flex items-center justify-between cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        {isPending ? (
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-[10px] shadow-lg ${isExpired ? 'bg-danger/20 text-danger border border-danger/10' : 'bg-warning/20 text-warning border border-warning/10'}`}>
                            <AlertCircle size={14} />
                          </div>
                        ) : (
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-[10px] shadow-lg border ${
                              m?.gender === 'female'
                                ? 'bg-gradient-to-br from-pink-500/20 to-pink-500/5 text-pink-200 border-pink-500/10'
                                : m?.gender === 'male'
                                ? 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-blue-200 border-blue-500/10'
                                : 'bg-gradient-to-br from-white/10 to-white/5 text-white border-white/5'
                            }`}
                          >
                            {initials}
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-black text-white flex items-center gap-1.5">
                            <span>{m?.name || 'Deleted Member'}</span>
                            {isPending && (
                              <Badge variant={isExpired ? 'danger' : 'warning'} size="sm">
                                {isExpired ? 'Expired' : 'Due'}
                              </Badge>
                            )}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${isCancelled ? 'bg-danger/10 text-danger border-danger/20 line-through' : 'text-text-secondary bg-white/5 border-white/5'}`}>{item.plan}</span>
                            {isPtPayment && (
                              <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${isCancelled ? 'text-danger bg-danger/10 border border-danger/20 line-through' : 'text-accent bg-accent/15 border border-accent/30'}`}>
                                {badgeText}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <span className={`text-xs font-black ${isCancelled ? 'text-text-muted line-through' : isPending ? 'text-white/50' : 'text-success'}`}>
                          ₹{item.amount?.toLocaleString()}
                        </span>
                        <button
                          onClick={() => setExpandedIncomeId(isExpanded ? null : item._id)}
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
                            <a href={`tel:${m?.phone}`} className="text-white font-extrabold hover:underline">
                              {m?.phone || 'N/A'}
                            </a>
                          </div>
                          <div>
                            <span className="text-text-muted font-bold block uppercase tracking-wider text-[8px] mb-0.5">Payment Method</span>
                            <div className="flex items-center gap-1.5 text-white font-extrabold uppercase">
                              {methodIcon[item.paymentMethod]}
                              <span>{item.paymentMethod?.replace('_', ' ') || 'N/A'}</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-text-muted font-bold block uppercase tracking-wider text-[8px] mb-0.5">Paid On</span>
                            <span className="text-white font-extrabold">
                              {isPending ? (
                                <span className={isExpired ? 'text-danger' : 'text-warning'}>
                                  {item.lastPaymentDate ? formatSafeDate(item.lastPaymentDate) : 'No payments'}
                                </span>
                              ) : (
                                <span className={isCancelled ? 'line-through text-text-muted' : ''}>
                                  {formatSafeDate(item.paymentDate)}
                                </span>
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-text-muted font-bold block uppercase tracking-wider text-[8px] mb-0.5">Validity/Expiry</span>
                            <span className={`font-extrabold ${isCancelled ? 'text-text-muted line-through' : isPending ? (isExpired ? 'text-danger' : 'text-warning') : 'text-white'}`}>
                              {formatSafeDate(item.newExpiry)}
                            </span>
                          </div>
                          {item.notes && (
                            <div className="col-span-2">
                              <span className="text-text-muted font-bold block uppercase tracking-wider text-[8px] mb-0.5">Notes</span>
                              <span className="text-white font-extrabold italic block max-w-full truncate">{item.notes}</span>
                            </div>
                          )}
                        </div>

                        {/* Separator */}
                        <div className="h-px bg-white/5 w-full" />

                        {/* Action Toolbar */}
                        <div className="flex items-center gap-2 pt-1">
                          {isPending ? (
                            <button
                              onClick={() => {
                                setForm({ ...form, memberId: m._id, amount: m.planAmount, plan: m.plan });
                                setShowAdd(true);
                              }}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-accent/15 text-accent hover:bg-accent hover:text-black border border-accent/20 transition-all cursor-pointer"
                            >
                              <CreditCard size={12} />
                              Pay Now
                            </button>
                          ) : (
                            <span className="text-[9px] text-text-muted font-extrabold uppercase italic">No pending dues</span>
                          )}
                          
                          {m?.assignedTrainer && (
                            <button
                              type="button"
                              onClick={() => setCancelPtMemberId(m._id)}
                              className="w-9 h-7 flex items-center justify-center rounded-lg bg-warning/10 text-warning hover:bg-warning hover:text-white border border-warning/20 transition-all cursor-pointer"
                              title="Cancel PT (Unassign Coach)"
                            >
                              <UserMinus size={12} />
                            </button>
                          )}
                          {!isPending && !isCancelled && (
                            <button
                              type="button"
                              onClick={() => setCancelPaymentId(item._id)}
                              className="w-9 h-7 flex items-center justify-center rounded-lg bg-danger/10 text-danger hover:bg-danger hover:text-white border border-danger/20 transition-all cursor-pointer"
                              title="Cancel Payment (Revert Plan)"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Infinite Scroll Trigger */}
            {hasMore && (
              <div ref={loadMoreRef} className="py-6 flex justify-center w-full">
                <Loader size="sm" />
              </div>
            )}
          )}
          </>
        )}
      </div>

      {/* Record Payment Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Record New Payment" titleClassName="!text-[20px] !font-normal">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Select Member</p>
              <Select
                value={form.memberId}
                options={members.map(m => ({ label: `${m.name} (${m.phone})`, value: m._id }))}
                onChange={val => {
                  const member = members.find(m => m._id === val);
                  setForm({
                    ...form,
                    memberId: val,
                    plan: member?.plan || form.plan,
                    amount: member?.planAmount || form.amount
                  });
                }}
                placeholder="Search member..."
                className="add-member-select"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Plan</p>
                <Select
                  value={form.plan}
                  options={plans.map(p => ({ label: p.name, value: p.name }))}
                  onChange={val => {
                    const selectedPlan = plans.find(p => p.name === val);
                    setForm({ ...form, plan: val, amount: selectedPlan ? selectedPlan.discountedPrice : form.amount });
                  }}
                  className="add-member-select"
                />
              </div>
              <div className="space-y-1">
                <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Amount ₹</p>
                <input placeholder="Amount ₹"
                  type="number"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  required
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none !py-2 !px-3 !text-[11px] !font-normal !bg-white/[0.02] border border-white/5 !rounded-xl focus:border-accent/30 transition-all outline-none text-white w-full"
                />
              </div>
            </div>

            {form.memberId && members.find(m => m._id === form.memberId)?.planExpiry && new Date(members.find(m => m._id === form.memberId).planExpiry) > new Date() && (
              <div className="p-3.5 rounded-xl bg-danger/5 border border-danger/10 text-danger text-[11px] font-bold flex items-center gap-3">
                <AlertCircle size={16} className="shrink-0" />
                <span>This member already has an active {members.find(m => m._id === form.memberId).plan} plan expiring on {formatSafeDate(members.find(m => m._id === form.memberId).planExpiry)}. Payment blocked until expiry.</span>
              </div>
            )}

            <div className="space-y-1">
              <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Payment Method</p>
              <Select
                value={form.paymentMethod}
                options={[
                  { label: 'Cash', value: 'cash', icon: <Banknote size={16} /> },
                  { label: 'UPI', value: 'upi', icon: <Zap size={16} /> },
                  { label: 'Card', value: 'card', icon: <CreditCard size={16} /> },
                  { label: 'Bank Transfer', value: 'bank_transfer', icon: <Landmark size={16} /> },
                  { label: 'Razorpay (Online)', value: 'razorpay', icon: <Smartphone size={16} /> }
                ]}
                onChange={val => setForm({ ...form, paymentMethod: val })}
                className="add-member-select"
              />
            </div>

            {form.paymentMethod === 'upi' && (
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
                              `upi://pay?pa=${activeUpi}&pn=${encodeURIComponent(payeeName)}&am=${form.amount || 0}&cu=INR`
                            )}`}
                            alt="UPI QR Code"
                            className="w-[150px] h-[150px] object-contain"
                          />
                          <div className="mt-3 text-center">
                            <p className="text-[14px] text-white font-extrabold uppercase tracking-wide">
                              ₹{parseFloat(form.amount || 0).toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={saving || (form.paymentMethod === 'upi' && !user?.upiId) || (form.memberId && members.find(m => m._id === form.memberId)?.planExpiry && new Date(members.find(m => m._id === form.memberId).planExpiry) > new Date())}
            className="w-full py-2.5 !text-[14px] !font-normal tracking-wide btn-primary shadow-lg shadow-accent/15 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Processing...' : 'Confirm Payment'}
          </button>
        </form>
      </Modal>

      {/* Member Payment History & Year Calendar Popup */}
      <Modal
        isOpen={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        title={`Payment History: ${selectedMember?.name}`}
        size="lg"
      >
        {loadingHistory ? (
          <div className="p-12 flex justify-center"><Loader /></div>
        ) : (
          <div className="space-y-8">

            {/* Top Member Card summary */}
            {selectedMember && (
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex flex-col md:flex-row justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-xl shadow-2xl ${selectedMember.gender === 'female' ? 'bg-gradient-to-br from-pink-500/20 to-pink-500/5 text-pink-200 border border-pink-500/10' :
                    selectedMember.gender === 'male' ? 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-blue-200 border border-blue-500/10' :
                      'bg-gradient-to-br from-white/10 to-white/5 text-white border border-white/5'
                    }`}>
                    {selectedMember.name?.[0] || 'M'}
                  </div>
                  <div>
                    <h3 className={`text-lg font-black ${selectedMember.gender === 'female' ? 'text-pink-200' :
                      selectedMember.gender === 'male' ? 'text-blue-200' : 'text-white'
                      }`}>{selectedMember.name}</h3>
                    <p className="text-xs text-text-muted font-bold mt-0.5">{selectedMember.phone}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={selectedMember.status === 'active' ? 'success' : selectedMember.status === 'expired' ? 'danger' : 'warning'} size="sm">
                        {selectedMember.status}
                      </Badge>
                      <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Joined: {formatSafeDate(selectedMember.joinDate)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-center text-left md:text-right border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6 min-w-[200px]">
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Active Plan</p>
                  <p className="text-base font-black text-white mt-1 uppercase tracking-tight">{selectedMember.plan || 'No Active Plan'}</p>
                  <p className="text-[11px] font-black text-accent mt-1">
                    Expires: {formatSafeDate(selectedMember.planExpiry)}
                  </p>
                </div>
              </div>
            )}

            {/* List of Past Payments */}
            <div className="space-y-4">
              <h4 className="text-sm font-black text-white uppercase tracking-wider">Past Receipts ({memberPayments.length})</h4>

              <div className="bg-white/[0.01] border border-white/5 rounded-2xl overflow-hidden max-h-60 overflow-y-auto no-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.02]">
                      <th className="px-6 py-2.5 text-[9px] font-black text-text-muted uppercase tracking-[0.2em]">Plan</th>
                      <th className="px-6 py-2.5 text-[9px] font-black text-text-muted uppercase tracking-[0.2em]">Amount</th>
                      <th className="px-6 py-2.5 text-[9px] font-black text-text-muted uppercase tracking-[0.2em]">Paid On</th>
                      <th className="px-6 py-2.5 text-[9px] font-black text-text-muted uppercase tracking-[0.2em]">Coverage Expiry</th>
                      <th className="px-6 py-2.5 text-[9px] font-black text-text-muted uppercase tracking-[0.2em]">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {memberPayments.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-8 text-text-muted font-bold text-xs uppercase tracking-widest opacity-60">
                          No payment receipts found.
                        </td>
                      </tr>
                    ) : (
                      memberPayments.map((p) => {
                        const isPtPayment = p.isPtPayment || (p.notes && (p.notes.toLowerCase().includes('pt') || p.notes.toLowerCase().includes('personal')));
                        const badgeText = (p.notes || '').toLowerCase().includes('upgrade') ? 'PT' : 'Training + PT';
                        const shouldDisplayNote = p.notes && !p.notes.toLowerCase().startsWith('initial membership payment');
                        const isCancelled = p.status === 'cancelled';
                        return (
                          <tr key={p._id} className={`hover:bg-white/[0.02] transition-colors ${isCancelled ? 'opacity-40' : ''}`}>
                            <td className="px-6 py-2">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-xs font-black uppercase tracking-wider ${isCancelled ? 'line-through text-text-muted' : 'text-white'}`}>{p.plan}</span>
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
                            <td className={`px-6 py-2 text-xs font-black ${isCancelled ? 'text-text-muted line-through' : 'text-success'}`}>₹{p.amount?.toLocaleString()}</td>
                            <td className={`px-6 py-2 text-xs font-bold ${isCancelled ? 'text-text-muted line-through' : 'text-text-secondary'}`}>
                              {formatSafeDate(p.paymentDate || p.createdAt)}
                            </td>
                            <td className={`px-6 py-2 text-xs font-black ${isCancelled ? 'text-text-muted line-through' : 'text-white'}`}>
                              {formatSafeDate(p.newExpiry)}
                            </td>
                            <td className="px-6 py-2">
                              {isCancelled ? (
                                <div className="flex items-center gap-1.5 text-danger/70 text-[10px] font-black">
                                  <span>CANCELLED</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-text-muted text-[10px] font-bold">
                                  {methodIcon[p.paymentMethod]}
                                  <span className="capitalize">{p.paymentMethod?.replace('_', ' ')}</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </Modal>
      {/* Cancel Payment Confirmation Modal */}
      <Modal
        isOpen={!!cancelPaymentId}
        onClose={() => setCancelPaymentId(null)}
        title="Cancel Payment"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm font-medium text-text-secondary leading-relaxed">
            Are you sure you want to cancel this payment transaction? This will permanently delete the record and revert the member's plan and expiry details to the previous payment state.
          </p>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCancelPaymentId(null)}
              className="flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary cursor-pointer"
            >
              No, Keep
            </button>
            <button
              type="button"
              onClick={handleCancelPayment}
              disabled={saving}
              className="flex-[2] py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all bg-danger text-white hover:bg-danger-hover shadow-lg shadow-danger/20 cursor-pointer"
            >
              {saving ? 'Cancelling...' : 'Yes, Cancel Payment'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Cancel PT Confirmation Modal */}
      <Modal
        isOpen={!!cancelPtMemberId}
        onClose={() => setCancelPtMemberId(null)}
        title="Cancel Personal Training"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm font-medium text-text-secondary leading-relaxed">
            Are you sure you want to cancel the Personal Training assignment for this client? This will unassign the coach/trainer from the member.
          </p>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCancelPtMemberId(null)}
              className="flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary cursor-pointer"
            >
              No, Keep
            </button>
            <button
              type="button"
              onClick={handleCancelPt}
              disabled={saving}
              className="flex-[2] py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all bg-warning text-black hover:bg-warning-hover shadow-lg shadow-warning/20 cursor-pointer"
            >
              {saving ? 'Cancelling...' : 'Yes, Cancel PT'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
