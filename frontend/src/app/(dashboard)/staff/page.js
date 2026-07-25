'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { staffApi, expensesApi, authApi, whatsappApi } from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { Modal, Input, Loader, Badge, EmptyState, SearchBar, Select, DatePicker, StatCard } from '@/components/UI';
import { cleanPhone, validatePhone } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import {
  UserPlus, Calendar, Trash2, Edit3,
  Check, Phone, Mail, Eye, Users, Search,
  Filter, RefreshCw, Tag, Activity,
  ToggleLeft, ToggleRight, Banknote, Shield,
  UserCheck, IndianRupee, ChevronDown, MoreVertical,
  ChevronUp, ChevronsUpDown, UserMinus, XCircle, AlertCircle, X,
  Zap, CreditCard, Landmark
} from 'lucide-react';

const ROLES = ['Receptionist', 'Cleaner', 'Manager', 'Accountant', 'Helper', 'Other'];

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

export default function StaffPage() {
  const { user, updateUser } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  const rolesList = useMemo(() => {
    const custom = user?.staffRoles && user.staffRoles.length > 0 ? user.staffRoles : ['Trainer', 'Manager', 'Staff', 'Admin'];
    const filtered = custom.filter(r => r !== 'Other');
    return [...filtered, 'Other'];
  }, [user?.staffRoles]);

  // Dynamically fetch the latest user settings/slots on mount to ensure fresh synchronization
  useEffect(() => {
    authApi.getMe().then(res => {
      if (res.success && res.user && updateUser) {
        updateUser(res.user);
      }
    }).catch(err => console.error('Failed to sync timeSlots in staff page:', err));
  }, []);
  const [deleteConfirmState, setDeleteConfirmState] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [viewingStaff, setViewingStaff] = useState(null);
  const [limitReachedState, setLimitReachedState] = useState(null);

  // Salary Payout Custom States
  const [toasts, setToasts] = useState([]);
  const [payoutStaff, setPayoutStaff] = useState(null);
  const [saving, setSaving] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ amount: '', paymentMethod: 'cash', date: '', notes: '' });
  const [salaryExpenses, setSalaryExpenses] = useState([]);

  const isStaffPaidThisMonth = (staffMember) => {
    if (!staffMember) return false;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return salaryExpenses.some(e => {
      if (e.category !== 'Salary') return false;
      const hasName = e.title.toLowerCase().includes(staffMember.name.toLowerCase());
      if (!hasName) return false;

      const expDate = new Date(e.date);
      return expDate.getFullYear() === currentYear && expDate.getMonth() === currentMonth;
    });
  };

  const getLastPaymentInfo = (staffMember) => {
    if (!staffMember || !salaryExpenses || salaryExpenses.length === 0) return 'No payment recorded';

    // Filter salary expenses for this staff member and sort by date descending
    const staffPayments = salaryExpenses
      .filter(e => e.category === 'Salary' && e.title.toLowerCase().includes(staffMember.name.toLowerCase()))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (staffPayments.length === 0) return 'No payment recorded';

    const lastPayment = staffPayments[0];
    const formattedDate = new Date(lastPayment.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${formattedDate} (₹${lastPayment.amount.toLocaleString()})`;
  };

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const handlePayoutSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // 1. Fetch existing salary payments to check for duplicates in the proposed calendar month
      const resExp = await expensesApi.getAll('category=Salary&limit=1000');
      if (resExp.success && resExp.data) {
        const payoutDateObj = new Date(payoutForm.date || new Date().toISOString().split('T')[0]);
        const targetYear = payoutDateObj.getFullYear();
        const targetMonth = payoutDateObj.getMonth();

        const duplicatePayment = resExp.data.find(e => {
          if (e.category !== 'Salary') return false;
          // Matches format 'Salary: [Name]' or 'Staff Salary - [Name]...' or title containing their name
          const hasName = e.title.toLowerCase().includes(payoutStaff.name.toLowerCase());
          if (!hasName) return false;

          const expDate = new Date(e.date);
          return expDate.getFullYear() === targetYear && expDate.getMonth() === targetMonth;
        });

        if (duplicatePayment) {
          const formattedLastDate = new Date(duplicatePayment.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
          throw new Error(`Salary already paid to ${payoutStaff.name} for ${payoutDateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' })} (Paid on ${formattedLastDate}). Next payment can only be made in the following month.`);
        }
      }

      // 2. Format the title dynamically to store staff member reference cleanly
      const currentMonth = new Date(payoutForm.date).toLocaleString('en-US', { month: 'long' });
      const finalTitle = `Staff Salary - ${payoutStaff.name} (${currentMonth}) [Salary]${payoutForm.notes ? ` - Note: ${payoutForm.notes}` : ''}`;

      await expensesApi.create({
        title: finalTitle,
        category: 'Salary',
        amount: parseInt(payoutForm.amount) || 0,
        paymentMethod: payoutForm.paymentMethod || 'cash',
        date: payoutForm.date || new Date().toISOString().split('T')[0]
      });

      // Send WhatsApp notification
      const automations = user?.whatsappConfig?.automations;
      const isPayoutAlertEnabled = automations?.salaryPayout?.enabled ?? true;

      if (isPayoutAlertEnabled && payoutStaff.phone) {
        try {
          const currentMonth = new Date(payoutForm.date).toLocaleString('en-US', { month: 'long', year: 'numeric' });
          const details = `- Total Paid: ₹${payoutForm.amount}\n- Payment Method: ${payoutForm.paymentMethod || 'cash'}${payoutForm.notes ? `\n- Notes: ${payoutForm.notes}` : ''}`;
          
          const defaultTemplate = "Hello {staff_name}!\n\nYour salary for {month} has been paid successfully!\n\nPayment Details:\n{payment_details}\n\nThank you for your dedication and hard work! 💪\n- {gym_name}";
          const templateText = automations?.salaryPayout?.templateText || defaultTemplate;
          
          const msg = templateText
            .replace(/{staff_name}/g, payoutStaff.name)
            .replace(/{month}/g, currentMonth)
            .replace(/{payment_details}/g, details)
            .replace(/{gym_name}/g, user?.gymName || 'Gym Management');
            
          await whatsappApi.sendCustom({
            phone: payoutStaff.phone,
            message: msg
          });
        } catch (whatsappErr) {
          console.error('Failed to send WhatsApp notification:', whatsappErr.message);
        }
      }

      setPayoutStaff(null);
      fetchStaff();
      showToast('Salary payout recorded successfully in Salaries Page!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

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

  const filteredStaff = useMemo(() => {
    return staff.filter(s => {
      if (dateFilterType === 'all') return true;
      const staffDate = s.joinDate ? new Date(s.joinDate) : (s.createdAt ? new Date(s.createdAt) : null);
      if (!staffDate) return false;

      if (dateFilterType === 'date') {
        if (!selectedDate) return true;
        const targetDate = new Date(selectedDate);
        return staffDate.getFullYear() === targetDate.getFullYear() &&
          staffDate.getMonth() === targetDate.getMonth() &&
          staffDate.getDate() === targetDate.getDate();
      }

      if (dateFilterType === 'month') {
        const targetMonth = parseInt(selectedMonth);
        const targetYear = parseInt(selectedYear);
        return staffDate.getFullYear() === targetYear &&
          staffDate.getMonth() === targetMonth;
      }

      if (dateFilterType === 'year') {
        const targetYear = parseInt(selectedYear);
        return staffDate.getFullYear() === targetYear;
      }

      if (dateFilterType === 'range') {
        const start = selectedRangeStart ? new Date(selectedRangeStart) : null;
        if (start) start.setHours(0, 0, 0, 0);

        const end = selectedRangeEnd ? new Date(selectedRangeEnd) : null;
        if (end) end.setHours(23, 59, 59, 999);

        if (start && end) {
          return staffDate >= start && staffDate <= end;
        } else if (start) {
          return staffDate >= start;
        } else if (end) {
          return staffDate <= end;
        }
        return true;
      }

      return true;
    });
  }, [staff, dateFilterType, selectedDate, selectedMonth, selectedYear, selectedRangeStart, selectedRangeEnd]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [form, setForm] = useState({
    name: '',
    gender: 'male',
    role: 'Trainer',
    customRole: '',
    phone: '',
    salary: '',
    shiftStart: '09:00',
    shiftEnd: '18:00',
    joinDate: new Date().toISOString().split('T')[0],
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

  const searchParams = useSearchParams();
  const previewId = searchParams.get('preview');

  useEffect(() => {
    if (previewId) {
      const found = staff.find(s => s._id === previewId);
      if (found) {
        setViewingStaff(found);
        const newParams = new URLSearchParams(window.location.search);
        newParams.delete('preview');
        const cleanPath = window.location.pathname + (newParams.toString() ? '?' + newParams.toString() : '');
        window.history.replaceState(null, '', cleanPath);
      } else {
        staffApi.getAll(`search=${previewId}`).then(res => {
          if (res.success && res.data.length > 0) {
            setViewingStaff(res.data[0]);
          }
          const newParams = new URLSearchParams(window.location.search);
          newParams.delete('preview');
          const cleanPath = window.location.pathname + (newParams.toString() ? '?' + newParams.toString() : '');
          window.history.replaceState(null, '', cleanPath);
        }).catch(err => console.error(err));
      }
    }
  }, [previewId, staff]);

  const [sortBy, setSortBy] = useState('-createdAt');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
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

  const fetchStaff = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const query = `search=${debouncedSearch}&role=${filterRole}&sort=${sortBy}&limit=1000`;
      const [res, expRes] = await Promise.all([
        staffApi.getAll(query),
        expensesApi.getAll('category=Salary&limit=1000')
      ]);
      if (res.success) setStaff(res.data);
      if (expRes.success) setSalaryExpenses(expRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchStaff();
  }, [debouncedSearch, filterRole, sortBy]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.phone || !form.phone.trim()) {
      alert('Phone number is required.');
      return;
    }
    if (!validatePhone(form.phone)) {
      alert('Phone number must be exactly 10 digits (no spaces, letters, or special characters).');
      return;
    }
    try {
      const payload = { ...form };
      if (payload.role === 'Other') {
        payload.role = payload.customRole;
      }
      if (editingStaff) {
        await staffApi.update(editingStaff._id, payload);
      } else {
        await staffApi.create(payload);
      }
      setShowModal(false);
      resetForm();
      fetchStaff();
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
  };

  const resetForm = () => {
    const slots = (user?.timeSlots || []).filter(s => s.status === 'Active' || s.status === 'active' || !s.status);
    const defaultSlot = slots[0];

    setForm({
      name: '',
      gender: 'male',
      role: rolesList[0] || 'Trainer',
      customRole: '',
      phone: '',
      salary: '',
      shiftStart: defaultSlot ? defaultSlot.startTime : '09:00',
      shiftEnd: defaultSlot ? defaultSlot.endTime : '18:00',
      joinDate: new Date().toISOString().split('T')[0],
      timeSlot: defaultSlot ? defaultSlot.name : ''
    });
    setEditingStaff(null);
  };

  const handleDelete = (id) => {
    setDeleteConfirmState({
      title: "Delete Staff Member",
      message: "Are you sure you want to delete this staff member? All their associated payroll, shift, and work log details will be permanently removed from the records.",
      onConfirm: async () => {
        try {
          await staffApi.delete(id);
          fetchStaff();
          alert('Staff member deleted successfully!');
        } catch (err) {
          alert(err.message);
        }
      }
    });
  };

  const handleToggleStatus = async (id) => {
    try {
      await staffApi.toggleStatus(id);
      fetchStaff();
    } catch (err) { alert(err.message); }
  };

  const openEditModal = (s) => {
    setEditingStaff(s);
    const isCustomRole = !rolesList.includes(s.role) && s.role !== 'Other';
    setForm({
      name: s.name,
      gender: s.gender || 'other',
      role: isCustomRole ? 'Other' : s.role,
      customRole: isCustomRole ? s.role : '',
      phone: s.phone || '',
      salary: s.salary || '',
      shiftStart: s.shiftStart || '09:00',
      shiftEnd: s.shiftEnd || '18:00',
      joinDate: s.joinDate ? new Date(s.joinDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      timeSlot: s.timeSlot || ''
    });
    setShowModal(true);
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
      <th className={`px-6 py-3 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] cursor-pointer hover:text-white transition-colors group ${className}`} onClick={() => handleSort(sortKey)}>
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
      <div className="bg-bg-card border border-white/5 rounded-xl shadow-2xl flex flex-col relative">

        {/* Top Header & Stats Row */}
        <div className="py-4 px-6 border-b border-white/5 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-text-primary tracking-tight">Staff</h1>
              <div className="flex items-center gap-2 text-[10px] font-black text-text-muted uppercase tracking-widest mt-1 opacity-70">

                Managing <span className="text-white">{filteredStaff.length}</span> team members
              </div>
            </div>
            <div className="flex items-center gap-3">
              <SearchBar value={search} onChange={setSearch} placeholder="Search staff..." />

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
                onClick={() => { resetForm(); setShowModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-black rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-lg shadow-accent/20 active:scale-95 whitespace-nowrap"
              >
                <UserPlus size={14} /> Add Staff
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard icon={<Users />} label="Total Staff" value={staff.length} trend={`${staff.length} Registered`} trendUp={true} size="xs" flyInDirection="right" className="!bg-white/[0.02] border-white/5" />
            <StatCard icon={<UserCheck />} label="Active" value={staff.filter(s => s.status === 'active').length} trend="Active status" trendUp={true} size="xs" flyInDirection="bottom" className="!bg-white/[0.02] border-white/5" />
            <StatCard icon={<Shield />} label="Roles" value={new Set(staff.map(s => s.role)).size} trend="Distinct roles" trendUp={true} size="xs" flyInDirection="top" className="!bg-white/[0.02] border-white/5" />
            <StatCard icon={<IndianRupee />} label="Payroll" value={`₹${staff.filter(s => s.status === 'active').reduce((acc, s) => acc + (s.salary || 0), 0).toLocaleString()}`} trend="Monthly payout" trendUp={true} size="xs" flyInDirection="left" className="!bg-white/[0.02] border-white/5" />
          </div>
        </div>

        {loading ? null : staff.length === 0 ? (
          <EmptyState icon={<Shield size={48} className="text-text-muted opacity-50" />} title="No staff members found" description="Try adjusting your filters or search" />
        ) : (
          <div className="max-h-[292px] overflow-y-auto relative rounded-2xl border border-white/5">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0a0a0a] z-10 border-b border-white/5 shadow-md">
                <tr className="bg-white/[0.02]">
                  <th className="px-8 py-3.5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] w-16">#</th>
                  <SortHeader label="Staff Member" sortKey="name" />
                  <SortHeader label="Role" sortKey="role" />
                  <SortHeader label="Contact Info" sortKey="phone" />
                  <SortHeader label="Shift" sortKey="shiftStart" />
                  <SortHeader label="Salary Details" sortKey="salary" />
                  <th className="px-6 py-3.5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Salary Status</th>
                  <th className="px-6 py-3.5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredStaff.map((s, idx) => {
                  const toggleOn = s.status === 'active';
                  const isGray = !toggleOn;

                  return (
                    <tr key={s._id} onClick={() => setViewingStaff(s)} className={`group transition-all border-b border-white/5 cursor-pointer ${isGray ? 'bg-white/[0.01]' : 'hover:bg-white/[0.02]'}`}>
                      <td className={`px-8 py-2.5 ${isGray ? 'opacity-50 grayscale-[0.8]' : ''}`}>
                        <span className="text-[11px] font-black text-text-muted group-hover:text-accent transition-colors">{idx + 1}</span>
                      </td>
                      <td className={`px-6 py-2.5 ${isGray ? 'opacity-50 grayscale-[0.8]' : ''}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] shadow-lg group-hover:scale-110 transition-transform border ${s.gender === 'female' ? 'bg-gradient-to-br from-pink-500/20 to-pink-500/5 text-pink-200 border-pink-500/10' :
                            s.gender === 'male' ? 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-blue-200 border-blue-500/10' :
                              'bg-gradient-to-br from-white/10 to-white/5 text-white border-white/5'
                            }`}>
                            {s.name[0]}
                          </div>
                          <p className={`text-xs font-black transition-colors ${s.gender === 'female' ? 'text-pink-200 group-hover:text-pink-100' :
                            s.gender === 'male' ? 'text-blue-200 group-hover:text-blue-100' :
                              'text-white group-hover:text-accent'
                            }`}>{s.name}</p>
                        </div>
                      </td>
                      <td className={`px-6 py-2.5 ${isGray ? 'opacity-50 grayscale-[0.8]' : ''}`}>
                        <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">{s.role}</span>
                      </td>
                      <td className={`px-6 py-2.5 ${isGray ? 'opacity-50 grayscale-[0.8]' : ''}`}>
                        <p className="text-[11px] font-bold text-text-secondary leading-none">{s.phone || 'N/A'}</p>
                      </td>
                      <td className={`px-6 py-2.5 ${isGray ? 'opacity-50 grayscale-[0.8]' : ''}`}>
                        <div className="text-warning">
                          <span className="text-[10px] font-black uppercase tracking-tighter italic">
                            {s.timeSlot && s.timeSlot !== 'custom' ? `${s.timeSlot} (${formatTime12(s.shiftStart)} - ${formatTime12(s.shiftEnd)})` : `${formatTime12(s.shiftStart || '09:00')} - ${formatTime12(s.shiftEnd || '18:00')}`}
                          </span>
                        </div>
                      </td>
                      <td className={`px-6 py-2.5 ${isGray ? 'opacity-50 grayscale-[0.8]' : ''}`}>
                        <p className="text-[11px] font-bold text-white leading-none mb-1">₹{s.salary.toLocaleString()}</p>
                        <p className="text-[9px] text-text-muted font-bold tracking-tight uppercase">Joined {new Date(s.joinDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      </td>
                      <td className={`px-6 py-2.5 ${isGray ? 'opacity-50 grayscale-[0.8]' : ''}`}>
                        {(() => {
                          const isPaid = isStaffPaidThisMonth(s);
                          return (
                            <Badge variant={isPaid ? 'success' : 'warning'} size="sm" className="font-black uppercase tracking-wider text-[8px] px-2 py-0.5 border border-white/5">
                              {isPaid ? 'Paid' : 'Pending'}
                            </Badge>
                          );
                        })()}
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

                              if (openMenuId === s._id) {
                                setOpenMenuId(null);
                                setActiveMenu(null);
                              } else {
                                setOpenMenuId(s._id);
                                setActiveMenu({
                                  id: s._id,
                                  x,
                                  y,
                                  data: s
                                });
                              }
                            }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${openMenuId === s._id ? 'bg-accent text-black shadow-lg shadow-accent/20' : 'bg-white/5 text-text-muted hover:bg-white/10 hover:text-white'}`}
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
        )}
      </div>

      {viewingStaff && (
        <Modal isOpen={!!viewingStaff} onClose={() => setViewingStaff(null)} title="Staff Details" size="md" className="!rounded-2xl lg:!rounded-2xl !rounded-t-2xl">
          {(() => {
            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5 w-full">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shadow-lg border ${viewingStaff.gender === 'female' ? 'bg-gradient-to-br from-pink-500/20 to-pink-500/5 text-pink-200 border-pink-500/10' :
                      viewingStaff.gender === 'male' ? 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-blue-200 border-blue-500/10' :
                        'bg-gradient-to-br from-white/10 to-white/5 text-white border-white/5'
                      }`}>
                      {viewingStaff.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                        <span>{viewingStaff.name}</span>
                        <span className="text-text-muted font-bold text-[11px] capitalize">({viewingStaff.gender || 'N/A'})</span>
                      </h3>
                      <span className="text-[9px] font-black text-accent uppercase tracking-widest leading-none">{viewingStaff.role}</span>
                    </div>
                  </div>
                  <Badge variant={viewingStaff.status === 'inactive' ? 'danger' : 'success'} size="xs" className="font-black uppercase text-[8px] tracking-wider py-0.5 px-1.5 border border-white/5 leading-none shrink-0">
                    {viewingStaff.status === 'inactive' ? 'Inactive' : 'Active'}
                  </Badge>
                </div>

                <div className="space-y-2.5 text-[11px]">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="font-bold text-text-muted uppercase tracking-wider">Phone</span>
                    <span className="font-extrabold text-white">{viewingStaff.phone || 'N/A'}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="font-bold text-text-muted uppercase tracking-wider">Monthly Salary</span>
                    <span className="font-extrabold text-success">₹{(viewingStaff.salary || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="font-bold text-text-muted uppercase tracking-wider">Last Payment</span>
                    <span className="font-extrabold text-white">{getLastPaymentInfo(viewingStaff)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="font-bold text-text-muted uppercase tracking-wider">Shift Schedule</span>
                    <span className="font-extrabold text-white uppercase text-right">
                      {viewingStaff.timeSlot && viewingStaff.timeSlot !== 'custom' ? `${viewingStaff.timeSlot} (${formatTime12(viewingStaff.shiftStart)} - ${formatTime12(viewingStaff.shiftEnd)})` : `${formatTime12(viewingStaff.shiftStart || '09:00')} - ${formatTime12(viewingStaff.shiftEnd || '18:00')}`}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="font-bold text-text-muted uppercase tracking-wider">Joining Date</span>
                    <span className="font-extrabold text-white uppercase tracking-wider">
                      {viewingStaff.joinDate ? new Date(viewingStaff.joinDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not Set'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { openEditModal(viewingStaff); setViewingStaff(null); }}
                    className="flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 bg-accent text-black hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/20 active:scale-95"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingStaff(null)}
                    className="flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary active:bg-white/20 active:scale-95"
                  >
                    Close
                  </button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingStaff ? 'Update Staff Profile' : 'Add New Staff Member'}
        size="md"
        overflowVisible={true}
        titleClassName="!text-[20px] !font-normal"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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

            {/* Staff Role & Monthly Salary Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Staff Role *</p>
                <Select
                  value={form.role}
                  options={rolesList.map(r => ({ label: r, value: r }))}
                  onChange={(val) => setForm({ ...form, role: val })}
                  searchable={false}
                  className="add-member-select"
                />
              </div>
              <div className="space-y-1">
                <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Monthly Salary (₹)</p>
                <input type="number"
                  placeholder="Salary ₹"
                  value={form.salary}
                  onChange={e => setForm({ ...form, salary: e.target.value })}
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none !py-2 !px-3 !text-[11px] !font-normal !bg-white/[0.02] border border-white/5 !rounded-xl focus:border-accent/30 transition-all w-full"
                />
              </div>
            </div>

            {/* Custom Role Title */}
            {form.role === 'Other' && (
              <div className="space-y-1 animate-in fade-in duration-200">
                <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Custom Role Title *</p>
                <input
                  placeholder="Enter custom role"
                  value={form.customRole}
                  onChange={e => setForm({ ...form, customRole: e.target.value })}
                  required={form.role === 'Other'}
                  className="!py-2 !px-3 !text-[11px] !font-normal !bg-white/[0.02] border border-white/5 !rounded-xl focus:border-accent/30 transition-all w-full"
                />
              </div>
            )}

            {/* Joining Date & Gender Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Joining Date</p>
                <DatePicker
                  value={form.joinDate}
                  onChange={(val) => setForm({ ...form, joinDate: val })}
                  placeholder="Joining Date"
                />
              </div>
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
                        <input type="radio" name="gender" value={g} checked={form.gender === g} onChange={e => setForm({ ...form, gender: e.target.value })} className="hidden" />
                        {g}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Working Shift & Custom Shift Grid */}
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Working Shift</p>
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
          </div>

          {/* Footer Actions */}
          <div className="flex gap-2 pt-1.5">
            <button
              type="button"
              onClick={() => { setShowModal(false); resetForm(); }}
              className="flex-1 py-2.5 !text-[14px] !font-normal tracking-wide rounded-xl transition-all duration-300 bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary active:bg-white/20 active:scale-95 border border-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary !py-2.5 !text-[14px] !font-normal tracking-wide shadow-lg shadow-accent/15 hover:scale-[1.01] active:scale-95 transition-all"
            >
              {editingStaff ? 'Update Staff' : 'Add Staff'}
            </button>
          </div>
        </form>
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
          className="w-48 bg-[#0d0d0d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150"
        >
          <div className="p-2 space-y-1">
            {(() => {
              const isPaid = isStaffPaidThisMonth(activeMenu.data);
              return (
                <button
                  disabled={isPaid}
                  onClick={() => {
                    const s = activeMenu.data;
                    setOpenMenuId(null);
                    setActiveMenu(null);
                    setPayoutStaff(s);
                    setPayoutForm({
                      amount: s.salary || 0,
                      paymentMethod: 'cash',
                      date: new Date().toISOString().split('T')[0],
                      notes: `Monthly salary for staff member ${s.name}`
                    });
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all text-left ${
                    isPaid 
                      ? 'opacity-40 cursor-not-allowed text-text-muted hover:bg-transparent' 
                      : 'text-text-secondary hover:bg-accent/10 hover:text-accent'
                  }`}
                  title={isPaid ? "Salary already paid for this calendar month" : "Record salary payment"}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isPaid ? 'bg-white/5 text-text-muted' : 'bg-accent/10 text-accent'}`}>
                    <Banknote size={14} />
                  </div>
                  <span>{isPaid ? 'Paid for Month' : 'Pay Salary'}</span>
                </button>
              );
            })()}

            <button
              onClick={() => {
                const s = activeMenu.data;
                openEditModal(s);
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

            <button
              onClick={() => {
                setViewingStaff(activeMenu.data);
                setOpenMenuId(null);
                setActiveMenu(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-text-secondary hover:bg-white/10 hover:text-white transition-all text-left"
            >
              <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center">
                <Eye size={14} />
              </div>
              View Details
            </button>

            <div className="h-px bg-white/5 mx-2 my-1" />

            <button
              onClick={() => {
                handleToggleStatus(activeMenu.data._id);
                setOpenMenuId(null);
                setActiveMenu(null);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all text-left ${activeMenu.data.status !== 'inactive'
                ? 'hover:bg-warning/10 hover:text-warning text-text-secondary'
                : 'hover:bg-success/10 hover:text-success text-text-secondary'
                }`}
            >
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${activeMenu.data.status !== 'inactive' ? 'bg-warning/10' : 'bg-success/10'}`}>
                {activeMenu.data.status !== 'inactive' ? <UserMinus size={14} /> : <UserCheck size={14} />}
              </div>
              {activeMenu.data.status !== 'inactive' ? 'Deactivate' : 'Activate'}
            </button>

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
              Delete Staff
            </button>
          </div>
        </div>
      )}

      {/* Delete/Action Confirmation Modal */}
      {/* Dynamic Salary Payout Modal */}
      {payoutStaff && (
        <Modal
          isOpen={!!payoutStaff}
          onClose={() => setPayoutStaff(null)}
          title={`Pay Salary - ${payoutStaff.name}`}
          size="md"
          overflowVisible={true}
          className="!rounded-2xl lg:!rounded-2xl !rounded-t-2xl"
        >
          <form onSubmit={handlePayoutSubmit} className="space-y-6">
            {/* Staff Summary card */}
            <div className="relative p-4 rounded-2xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/10 overflow-hidden shadow-inner flex items-center justify-between">
              <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border shadow shadow-black/30 bg-gradient-to-br from-accent/20 to-accent/5 text-accent border-accent/20 shadow-accent/5`}>
                  {payoutStaff.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <p className="text-xs font-black text-white leading-tight">{payoutStaff.name}</p>
                  <span className="text-[9px] font-bold text-text-muted capitalize mt-0.5">{payoutStaff.role}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-text-muted uppercase tracking-wider">Base Salary</p>
                <span className="text-xs font-black text-white">₹{(payoutStaff.salary || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Paid Amount */}
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black ml-1">Salary Amount (₹) *</p>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs font-black text-text-muted">₹</span>
                  <input
                    type="number"
                    placeholder="Enter Paid Amount"
                    value={payoutForm.amount}
                    onChange={e => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                    required
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-full !py-2.5 !pl-7 !pr-3 !text-[15px] !bg-bg-card/40 border border-white/5 !rounded-xl text-white outline-none focus:border-accent/50 transition-all font-extrabold"
                  />
                </div>
              </div>

              {/* Payment Method & Date (2 columns) */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black ml-1">Payment Method</p>
                  <Select
                    value={payoutForm.paymentMethod}
                    searchable={false}
                    options={[
                      {label: 'Cash', value: 'cash', icon: <Banknote size={16} />},
                      {label: 'UPI', value: 'upi', icon: <Zap size={16} />}
                    ]}
                    onChange={val => setPayoutForm({ ...payoutForm, paymentMethod: val })}
                    className="w-full !h-10"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black ml-1">Paid On *</p>
                  <DatePicker
                    value={payoutForm.date}
                    onChange={val => setPayoutForm({ ...payoutForm, date: val })}
                    placeholder="Select Date"
                    className="w-full !h-10"
                  />
                </div>
              </div>

              {/* Notes / Remarks */}
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black ml-1">Notes / Remarks</p>
                <textarea
                  placeholder="e.g. Monthly salary payout, festival bonus included, etc."
                  value={payoutForm.notes}
                  onChange={e => setPayoutForm({ ...payoutForm, notes: e.target.value })}
                  className="w-full h-20 !py-2.5 !text-[13px] !bg-bg-card/40 border border-white/5 !rounded-xl text-white outline-none focus:border-accent/50 px-4 transition-all resize-none font-bold"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPayoutStaff(null)}
                className="flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary active:bg-white/20 active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-[2] py-3 text-xs font-black uppercase tracking-[0.15em] rounded-xl transition-all duration-300 bg-success hover:bg-success-hover text-black hover:shadow-lg hover:shadow-success/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                {saving ? '⏳ Paying...' : `Confirm Pay: ₹${Number(payoutForm.amount || 0).toLocaleString()}`}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <Modal
        isOpen={!!deleteConfirmState}
        onClose={() => setDeleteConfirmState(null)}
        title={deleteConfirmState?.title || "Confirm Action"}
        size="sm"
        className="!rounded-2xl lg:!rounded-2xl !rounded-t-2xl"
      >
        <div className="space-y-6">
          <div className={`flex items-start gap-3.5 p-4 rounded-2xl ${deleteConfirmState?.isSuccess ? 'bg-success/5 border border-success/10 text-success' : 'bg-danger/5 border border-danger/10 text-danger'
            }`}>
            {deleteConfirmState?.isSuccess ? <Check size={20} className="shrink-0 mt-0.5" /> : <AlertCircle size={20} className="shrink-0 mt-0.5" />}
            <div>
              <h4 className="text-[12px] font-black uppercase tracking-wider">{deleteConfirmState?.isSuccess ? 'Action Approved' : 'Warning: Permanent Action'}</h4>
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
              className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 border ${deleteConfirmState?.isSuccess
                  ? 'bg-success/15 text-success hover:bg-success/25 border-success/20'
                  : 'bg-danger/15 text-danger hover:bg-danger/25 border-danger/20'
                }`}
            >
              {deleteConfirmState?.confirmText || 'Yes, Action'}
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
