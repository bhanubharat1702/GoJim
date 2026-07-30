'use client';
import { useState, useEffect } from 'react';
import { expensesApi, expenseCategoriesApi } from '@/lib/api';
import { PageHeader, Modal, StatCard, Select, Loader, DatePicker, SearchBar, EmptyState } from '@/components/UI';
import {
  Banknote, CreditCard, Landmark,
  IndianRupee, Calendar, BarChart3,
  Plus, Zap, Trash2, ArrowDownCircle,
  ChevronUp, ChevronDown, ChevronsUpDown, Activity, X,
  Wrench, PieChart, Check, XCircle
} from 'lucide-react';

export default function ExpensesTab() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category: 'Rent',
    titleSelect: 'Gym Rent',
    customTitle: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    month: new Date().toLocaleString('en-US', { month: 'long' }),
    paymentMethod: 'cash',
    note: ''
  });
  const [sortConfig, setSortConfig] = useState({ key: 'default', direction: 'desc' });
  const [toasts, setToasts] = useState([]);
  const [deleteConfirmState, setDeleteConfirmState] = useState(null);
  const [expandedExpenseId, setExpandedExpenseId] = useState(null);

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Interactive Stat Card & Month-Year Combined Dropdown Filtering State
  const [expenseFilter, setExpenseFilter] = useState('all'); // 'all' | 'today'

  // Calendar Date Filter States matching the Clients page
  const [dateFilterType, setDateFilterType] = useState('month'); // 'all' | 'year' | 'month' | 'date' | 'range'
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

  const fetchData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const [expRes, statRes, catRes] = await Promise.all([
        expensesApi.getAll('limit=1000'),
        expensesApi.getStats(),
        expenseCategoriesApi.getAll()
      ]);
      if (expRes.success) {
        setExpenses(expRes.data.filter(e => e.category !== 'Salary'));
      }
      if (statRes.success) setStats(statRes.data);
      if (catRes.success) {
        setCategories(catRes.data);
        setCategoriesLoaded(true);
        // If form.category isn't set or is set to a non-existent category, reset it
        const currentCat = catRes.data.find(c => c.name === form.category);
        if (!currentCat && catRes.data.length > 0) {
          setForm(prev => ({
            ...prev,
            category: catRes.data[0].name,
            titleSelect: catRes.data[0].titles[0] || 'Other'
          }));
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const mainTitle = form.titleSelect === 'Other' ? form.customTitle : form.titleSelect;
      const finalTitle = `${mainTitle} (${form.month}) [${form.category}]${form.note ? ` - Note: ${form.note}` : ''}`;

      await expensesApi.create({
        title: finalTitle,
        category: form.category || 'Other',
        amount: parseInt(form.amount),
        paymentMethod: form.paymentMethod,
        date: form.date
      });

      setShowAdd(false);
      const defaultCat = categories[0]?.name || 'Rent';
      const defaultTitle = categories[0]?.titles?.[0] || 'Gym Rent';
      setForm({
        category: defaultCat,
        titleSelect: defaultTitle,
        customTitle: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        month: new Date().toLocaleString('en-US', { month: 'long' }),
        paymentMethod: 'cash',
        note: ''
      });
      await fetchData(true);
      showToast('💵 Expense recorded successfully!', 'success');
    } catch (err) { showToast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleOpenAdd = async () => {
    try {
      const res = await expenseCategoriesApi.getAll();
      let currentCategories = categories;
      if (res.success) {
        setCategories(res.data);
        currentCategories = res.data;
      }
      const defaultCat = currentCategories[0]?.name || 'Rent';
      const defaultTitle = currentCategories[0]?.titles?.[0] || 'Gym Rent';
      setForm({
        category: defaultCat,
        titleSelect: defaultTitle,
        customTitle: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        month: new Date().toLocaleString('en-US', { month: 'long' }),
        paymentMethod: 'cash',
        note: ''
      });
    } catch (err) {
      console.error(err);
    }
    setShowAdd(true);
  };

  const handleDelete = (id) => {
    setDeleteConfirmState({
      id,
      title: 'Delete Expense',
      message: 'Are you sure you want to delete this expense? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await expensesApi.delete(id);
          fetchData(true);
          showToast('🗑️ Expense deleted successfully!', 'success');
        } catch (err) { showToast(err.message, 'error'); }
      }
    });
  };

  const handleCategoryChange = (catName) => {
    const matched = categories.find(c => c.name === catName);
    const defaultTitle = matched && matched.titles.length > 0 ? matched.titles[0] : 'Other';
    setForm(prev => ({
      ...prev,
      category: catName,
      titleSelect: defaultTitle,
      customTitle: ''
    }));
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

  const methodIcon = {
    cash: <Banknote size={14} />,
    upi: <Zap size={14} />,
    card: <CreditCard size={14} />,
    bank_transfer: <Landmark size={14} />
  };

  const sortedExpenses = [...expenses].sort((a, b) => {
    const { key, direction } = sortConfig;
    const sortKey = key === 'default' ? 'date' : key;
    const sortDir = key === 'default' ? 'desc' : direction;
    let valA = a[sortKey];
    let valB = b[sortKey];

    if (sortKey === 'date') {
      valA = new Date(a.date);
      valB = new Date(b.date);
    }

    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // Apply Interactive Filters based on active Stat Card / Dropdown selection
  const filteredExpenses = sortedExpenses.filter(e => {
    if (search) {
      const q = search.toLowerCase();
      const title = (e.title || '').toLowerCase();
      const category = (e.category || '').toLowerCase();
      const paymentMethod = (e.paymentMethod || '').toLowerCase();
      const note = (e.note || '').toLowerCase();
      if (!title.includes(q) && !category.includes(q) && !paymentMethod.includes(q) && !note.includes(q)) {
        return false;
      }
    }

    if (expenseFilter !== 'all') {
      if (!e.date) return false;

      // Parse the stored date components in a timezone-safe manner
      const datePart = e.date.substring(0, 10);
      const [yearStr, monthStr, dayStr] = datePart.split('-');
      const expenseYear = parseInt(yearStr);
      const expenseMonth = parseInt(monthStr) - 1; // Convert 1-12 to 0-11

      const today = new Date();

      if (expenseFilter === 'today') {
        const todayYear = today.getFullYear();
        const todayMonth = today.getMonth();
        const todayDay = today.getDate();
        if (!(expenseYear === todayYear && expenseMonth === todayMonth && parseInt(dayStr) === todayDay)) return false;
      }
    }

    return isDateMatched(e.date);
  });

  const getCategoryFromTitle = (title, fallbackCategory) => {
    if (!title) return fallbackCategory || '-';
    const match = title.match(/\[([^\]]+)\]/);
    return match ? match[1] : (fallbackCategory || '-');
  };

  // Calculate fully dynamic live stats from current datasets
  const dynamicStats = (() => {
    const totalAmount = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();

    const todayAmount = expenses
      .filter(e => {
        if (!e.date) return false;
        const datePart = e.date.substring(0, 10);
        const [yearStr, monthStr, dayStr] = datePart.split('-');
        return parseInt(yearStr) === todayYear && (parseInt(monthStr) - 1) === todayMonth && parseInt(dayStr) === todayDay;
      })
      .reduce((acc, curr) => acc + curr.amount, 0);

    // Determine which month to show based on filter
    let activeMonth = today.getMonth();
    let activeYear = today.getFullYear();
    if (dateFilterType === 'month') {
      activeMonth = parseInt(selectedMonth);
      activeYear = parseInt(selectedYear);
    } else if (dateFilterType === 'year') {
      activeYear = parseInt(selectedYear);
    }
    let activeMonthLabel;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    activeMonthLabel = `${monthNames[activeMonth]} ${activeYear}`;

    const monthlyTotal = expenses
      .filter(e => {
        if (!e.date) return false;
        const datePart = e.date.substring(0, 10);
        const [yearStr, monthStr] = datePart.split('-');
        return (parseInt(monthStr) - 1) === activeMonth && parseInt(yearStr) === activeYear;
      })
      .reduce((acc, curr) => acc + curr.amount, 0);

    // Previous month calculation (relative to the active/selected month)
    const prevMonthDate = new Date(activeYear, activeMonth - 1, 1);
    const prevMonth = prevMonthDate.getMonth();
    const prevYear = prevMonthDate.getFullYear();
    const previousMonthTotal = expenses
      .filter(e => {
        if (!e.date) return false;
        const datePart = e.date.substring(0, 10);
        const [yearStr, monthStr] = datePart.split('-');
        return (parseInt(monthStr) - 1) === prevMonth && parseInt(yearStr) === prevYear;
      })
      .reduce((acc, curr) => acc + curr.amount, 0);

    // Percentage change
    let monthlyChangePercent = 0;
    let monthlyChangeUp = false;
    if (previousMonthTotal > 0) {
      monthlyChangePercent = Math.round(((monthlyTotal - previousMonthTotal) / previousMonthTotal) * 100);
      monthlyChangeUp = monthlyChangePercent > 0;
    }

    // Active month expenses for category breakdown
    const activeMonthExpenses = expenses.filter(e => {
      if (!e.date) return false;
      const datePart = e.date.substring(0, 10);
      const [yearStr, monthStr] = datePart.split('-');
      return (parseInt(monthStr) - 1) === activeMonth && parseInt(yearStr) === activeYear;
    });

    // Top spending category
    const categoryTotals = {};
    activeMonthExpenses.forEach(e => {
      const cat = getCategoryFromTitle(e.title, e.category) || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + e.amount;
    });
    let topCategory = '-';
    let topCategoryAmount = 0;
    let topCategoryPercent = 0;
    Object.entries(categoryTotals).forEach(([cat, amount]) => {
      if (amount > topCategoryAmount) {
        topCategory = cat;
        topCategoryAmount = amount;
      }
    });
    if (monthlyTotal > 0) {
      topCategoryPercent = Math.round((topCategoryAmount / monthlyTotal) * 100);
    }

    // Maintenance expense for active month
    const maintenanceTotal = activeMonthExpenses
      .filter(e => getCategoryFromTitle(e.title, e.category) === 'Maintenance')
      .reduce((acc, curr) => acc + curr.amount, 0);
    const maintenancePercent = monthlyTotal > 0 ? Math.round((maintenanceTotal / monthlyTotal) * 100) : 0;

    // Previous month maintenance for comparison
    const prevMonthExpenses = expenses.filter(e => {
      if (!e.date) return false;
      const datePart = e.date.substring(0, 10);
      const [yearStr, monthStr] = datePart.split('-');
      return (parseInt(monthStr) - 1) === prevMonth && parseInt(yearStr) === prevYear;
    });
    const prevMaintenanceTotal = prevMonthExpenses
      .filter(e => getCategoryFromTitle(e.title, e.category) === 'Maintenance')
      .reduce((acc, curr) => acc + curr.amount, 0);
    let maintenanceChangePercent = 0;
    let maintenanceChangeUp = false;
    if (prevMaintenanceTotal > 0) {
      maintenanceChangePercent = Math.round(((maintenanceTotal - prevMaintenanceTotal) / prevMaintenanceTotal) * 100);
      maintenanceChangeUp = maintenanceChangePercent > 0;
    }

    return {
      filteredTotal: totalAmount,
      filteredCount: filteredExpenses.length,
      todayTotal: todayAmount,
      monthlyTotal: monthlyTotal,
      monthlyLabel: activeMonthLabel,
      previousMonthTotal: previousMonthTotal,
      monthlyChangePercent: monthlyChangePercent,
      monthlyChangeUp: monthlyChangeUp,
      topCategory: topCategory,
      topCategoryAmount: topCategoryAmount,
      topCategoryPercent: topCategoryPercent,
      maintenanceTotal: maintenanceTotal,
      maintenancePercent: maintenancePercent,
      prevMaintenanceTotal: prevMaintenanceTotal,
      maintenanceChangePercent: maintenanceChangePercent,
      maintenanceChangeUp: maintenanceChangeUp
    };
  })();

  // Helpers to parse title patterns saved in standard formatted values
  const getExpenseLabel = (title) => {
    if (!title) return '';
    const index = title.indexOf('(');
    if (index !== -1) {
      return title.substring(0, index).trim();
    }
    return title;
  };

  const getMonthFromTitle = (title) => {
    if (!title) return '-';
    const match = title.match(/\(([^)]+)\)/);
    return match ? match[1] : '-';
  };

  const getNoteFromTitle = (title) => {
    if (!title) return '';
    const index = title.indexOf(' - Note: ');
    if (index !== -1) {
      return title.substring(index + 9).trim();
    }
    return '';
  };



  const getFormattedDate = (dateStr) => {
    if (!dateStr) return '-';
    const datePart = dateStr.substring(0, 10);
    const [yearStr, monthStr, dayStr] = datePart.split('-');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const y = parseInt(yearStr);
    const m = parseInt(monthStr) - 1;
    const d = parseInt(dayStr);
    return `${String(d).padStart(2, '0')} ${months[m]} ${y}`;
  };

  if (loading) return <div className="p-20 flex justify-center"><Loader /></div>;

  const monthYearOptions = (() => {
    const options = [{ label: 'All Months', value: '' }];
    const now = new Date();

    // Generate options for 18 months going backward
    for (let i = 0; i < 18; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const value = `${d.getMonth()}_${d.getFullYear()}`;
      options.push({ label, value });
    }
    return options;
  })();

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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmState}
        onClose={() => setDeleteConfirmState(null)}
        title={deleteConfirmState?.title || "Confirm Action"}
        size="sm"
      >
        <div className="space-y-6">
          <p className="text-xs font-bold text-text-muted leading-relaxed uppercase tracking-wider">
            {deleteConfirmState?.message}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteConfirmState(null)}
              className="flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl bg-white/5 text-text-muted hover:bg-white/10 hover:text-white transition-all active:scale-95 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                const onConfirm = deleteConfirmState?.onConfirm;
                setDeleteConfirmState(null);
                if (onConfirm) await onConfirm();
              }}
              className="flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl bg-danger hover:bg-danger-hover text-white transition-all active:scale-95 cursor-pointer"
            >
              Yes, Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Main Bundle Card */}
      <div className="bg-bg-card border border-white/5 rounded-xl shadow-2xl flex flex-col">

        {/* Top Header & Stats Row */}
        <div className="py-4 px-6 border-b border-white/5 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-text-primary tracking-tight">Expenses</h1>
              <div className="flex items-center gap-2 text-[10px] font-black text-text-muted uppercase tracking-widest mt-1 opacity-70">
                <Activity size={12} className="text-accent" />
                Track outgoing payments & operational costs
              </div>
            </div>

            {/* Calendar next to Record Expense */}
            <div className="flex items-center gap-3">
              <SearchBar value={search} onChange={setSearch} placeholder="Search expenses..." />
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
                          type="button"
                          onClick={() => {
                            setDateFilterType('all');
                            setShowDateFilterPopover(false);
                          }}
                          className="flex-1 py-2 text-[9px] font-black uppercase tracking-wider rounded-xl bg-white/5 text-text-muted hover:bg-white/10 hover:text-white transition-all text-center cursor-pointer"
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDateFilterPopover(false)}
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
                onClick={handleOpenAdd}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-black rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-lg shadow-accent/20 active:scale-95 whitespace-nowrap cursor-pointer"
              >
                <Plus size={14} /> Record Expense
              </button>
            </div>
          </div>

          {/* Dynamic Interactive Stats Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Monthly Expenses Total */}
            <StatCard
              icon={<IndianRupee />}
              label={dynamicStats.monthlyLabel}
              value={`₹${dynamicStats.monthlyTotal.toLocaleString()}`}
              trend={dynamicStats.previousMonthTotal > 0 ? `${dynamicStats.monthlyChangeUp ? '↑' : '↓'} ${Math.abs(dynamicStats.monthlyChangePercent)}%` : null}
              trendUp={dynamicStats.monthlyChangeUp}
              subtitle={dynamicStats.previousMonthTotal > 0 ? `vs ₹${dynamicStats.previousMonthTotal.toLocaleString()} prev month` : null}
              size="xs"
              flyInDirection="right"
              className="border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300"
            />

            {/* Card 2: Top Spending Category */}
            <StatCard
              icon={<PieChart />}
              label="Top Category"
              value={dynamicStats.topCategory}
              trend={dynamicStats.topCategoryPercent > 0 ? `${dynamicStats.topCategoryPercent}% of total` : null}
              trendUp={dynamicStats.topCategoryPercent > 50}
              subtitle={dynamicStats.topCategoryAmount > 0 ? `₹${dynamicStats.topCategoryAmount.toLocaleString()} this month` : 'No expenses yet'}
              size="xs"
              flyInDirection="bottom"
              className="border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300"
            />

            {/* Card 3: Maintenance Expenses */}
            <StatCard
              icon={<Wrench />}
              label="Maintenance"
              value={`₹${dynamicStats.maintenanceTotal.toLocaleString()}`}
              trend={dynamicStats.prevMaintenanceTotal > 0 ? `${dynamicStats.maintenanceChangeUp ? '↑' : '↓'} ${Math.abs(dynamicStats.maintenanceChangePercent)}%` : (dynamicStats.maintenancePercent > 0 ? `${dynamicStats.maintenancePercent}% of total` : null)}
              trendUp={dynamicStats.maintenanceChangeUp}
              subtitle={dynamicStats.prevMaintenanceTotal > 0 ? `vs ₹${dynamicStats.prevMaintenanceTotal.toLocaleString()} prev · ${dynamicStats.maintenancePercent}% of total` : (dynamicStats.maintenancePercent > 0 ? `${dynamicStats.maintenancePercent}% of all expenses` : null)}
              size="xs"
              flyInDirection="top"
              className="border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300"
            />

            {/* Card 4: Today's Expenses */}
            <StatCard
              icon={<Calendar />}
              label="Today"
              value={`₹${dynamicStats.todayTotal.toLocaleString()}`}
              trend="Today's total"
              trendUp={true}
              size="xs"
              flyInDirection="left"
              className={`cursor-pointer transition-all duration-300 ${expenseFilter === 'today'
                ? 'border-warning/40 bg-warning/15 shadow-[0_0_15px_rgba(234,179,8,0.15)] text-warning'
                : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              onClick={() => {
                setDateFilterType('all');
                setExpenseFilter(expenseFilter === 'today' ? 'all' : 'today');
              }}
            />
          </div>
        </div>

        {/* Content Listing Area */}
        {filteredExpenses.length === 0 ? (
          <EmptyState
            icon={<CreditCard size={48} className="text-text-muted opacity-50" />}
            title="No expenses found"
            description="Try adjusting your filters or record a new expense to get started."
          />
        ) : (
          <>
            <div className="hidden md:block max-h-[292px] overflow-y-auto relative rounded-2xl border border-white/5">
            <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#0a0a0a] z-10 border-b border-white/5 shadow-md">
              <tr className="bg-white/[0.02]">
                <th className="px-8 py-2.5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] w-12">#</th>
                <SortHeader label="Expenses" sortKey="title" />
                <th className="px-6 py-2.5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Expense Category</th>
                <th className="px-6 py-2.5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Expense Month</th>
                <SortHeader label="Paid On" sortKey="date" />
                <SortHeader label="Amount Paid" sortKey="amount" />
                <SortHeader label="Payment Method" sortKey="paymentMethod" />
                <th className="px-6 py-2.5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredExpenses.map((e, idx) => {
                  const expenseLabel = getExpenseLabel(e.title);
                  const expenseMonth = getMonthFromTitle(e.title);
                  const expenseNote = getNoteFromTitle(e.title);
                  const expenseCategory = getCategoryFromTitle(e.title, e.category);
                  const formattedDate = getFormattedDate(e.date);

                  return (
                    <tr key={e._id} className="hover:bg-white/[0.02] transition-all group border-b border-white/5">
                      <td className="px-8 py-2.5 text-[11px] font-black text-text-muted">{idx + 1}</td>
                      {/* Expenses */}
                      <td className="px-6 py-2.5">
                        <div>
                          <span className="text-xs font-black text-white">{expenseLabel}</span>
                          {expenseNote && (
                            <p className="text-[10px] text-text-muted font-medium mt-0.5">{expenseNote}</p>
                          )}
                        </div>
                      </td>
                      {/* Expense Category */}
                      <td className="px-6 py-2.5">
                        <span className="text-[9px] font-black text-text-muted uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/5">
                          {expenseCategory}
                        </span>
                      </td>
                      {/* Expense Month */}
                      <td className="px-6 py-2.5">
                        <span className="text-[11px] font-black text-white uppercase tracking-wider">
                          {expenseMonth}
                        </span>
                      </td>
                      {/* Paid On */}
                      <td className="px-6 py-2.5 text-xs font-bold text-text-secondary">
                        {formattedDate}
                      </td>
                      {/* Amount Paid */}
                      <td className="px-6 py-2.5">
                        <span className="text-xs font-black text-danger">₹{e.amount.toLocaleString()}</span>
                      </td>
                      {/* Payment Method */}
                      <td className="px-6 py-2.5">
                        <div className="flex items-center gap-2 text-text-muted group-hover:text-white transition-colors">
                          {methodIcon[e.paymentMethod]}
                          <span className="text-[10px] font-black uppercase tracking-tighter">{e.paymentMethod.replace('_', ' ')}</span>
                        </div>
                      </td>
                      {/* Action */}
                      <td className="px-6 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(event) => { event.stopPropagation(); handleDelete(e._id); }}
                            className="w-7 h-7 rounded-lg bg-danger/10 text-danger flex items-center justify-center hover:bg-danger hover:text-white transition-all cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Collapsible Cards View */}
          {filteredExpenses.length === 0 ? (
            <div className="block md:hidden text-center py-12 text-text-muted font-bold text-xs uppercase tracking-widest opacity-60">
              No expenses match the selected filters.
            </div>
          ) : (
            <div className="block md:hidden space-y-3 max-h-[360px] overflow-y-auto pb-4 pr-1">
              {filteredExpenses.map((e, idx) => {
                const isExpanded = expandedExpenseId === e._id;
                const initials = e.title ? e.title.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'E';
                const formattedDate = new Date(e.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

                return (
                  <div
                    key={e._id}
                    className={`border border-white/5 rounded-2xl transition-all ${
                      isExpanded ? 'bg-white/[0.03] shadow-lg' : 'bg-white/[0.01]'
                    }`}
                  >
                    {/* Card Header (Collapsed State) */}
                    <div
                      onClick={() => setExpandedExpenseId(isExpanded ? null : e._id)}
                      className="p-4 flex items-center justify-between cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-[10px] shadow-lg border bg-gradient-to-br from-white/10 to-white/5 text-white border-white/5">
                          {initials}
                        </div>
                        <div>
                          <p className="text-xs font-black text-white">{e.title}</p>
                          <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider mt-0.5">
                            {e.category} • {e.month || 'Expense'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs font-black text-danger">
                          ₹{e.amount?.toLocaleString()}
                        </span>
                        <button
                          onClick={() => setExpandedExpenseId(isExpanded ? null : e._id)}
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
                            <span className="text-text-muted font-bold block uppercase tracking-wider text-[8px] mb-0.5">Payment Method</span>
                            <span className="text-white font-extrabold uppercase">
                              {e.paymentMethod || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-text-muted font-bold block uppercase tracking-wider text-[8px] mb-0.5">Spent On</span>
                            <span className="text-white font-extrabold">{formattedDate}</span>
                          </div>
                          {e.note && (
                            <div className="col-span-2">
                              <span className="text-text-muted font-bold block uppercase tracking-wider text-[8px] mb-0.5">Note</span>
                              <span className="text-white font-extrabold block max-w-full truncate">{e.note}</span>
                            </div>
                          )}
                        </div>

                        {/* Separator */}
                        <div className="h-px bg-white/5 w-full" />

                        {/* Action Toolbar */}
                        <div className="flex items-center justify-end pt-1">
                          <button
                            onClick={() => handleDelete(e._id)}
                            className="w-9 h-7 flex items-center justify-center rounded-lg bg-danger/10 text-danger hover:bg-danger hover:text-white border border-danger/20 transition-all cursor-pointer"
                            title="Delete"
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

      {/* Record Expense Modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => {
          setShowAdd(false);
          setForm({
            category: 'Rent',
            titleSelect: 'Gym Rent',
            customTitle: '',
            amount: '',
            date: new Date().toISOString().split('T')[0],
            month: new Date().toLocaleString('en-US', { month: 'long' }),
            paymentMethod: 'cash',
            note: ''
          });
        }}
        title="Record New Expense"
        size="md"
      >
        <form onSubmit={handleAdd} className="space-y-6">
          <div className="space-y-4">

            {/* 1. Category Dropdown Selection */}
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black ml-1">Expense Category *</p>
              <Select
                value={form.category}
                searchable={false}
                options={categories.map(cat => ({
                  label: cat.name,
                  value: cat.name
                }))}
                onChange={val => handleCategoryChange(val)}
                className="w-full !h-10"
              />
            </div>

            {/* 1b. Dynamic Title Dropdown Selection */}
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black ml-1">Expense Title *</p>
              <Select
                value={form.titleSelect}
                searchable={false}
                options={(() => {
                  const matched = categories.find(c => c.name === form.category);
                  const titles = matched ? matched.titles : [];
                  const list = titles.includes('Other') ? titles : [...titles, 'Other'];
                  return list.map(t => ({ label: t, value: t }));
                })()}
                onChange={val => setForm({ ...form, titleSelect: val })}
                className="w-full !h-10"
              />
            </div>

            {/* 1c. Custom Expense Title Input (shown only if 'Other' is selected) */}
            {form.titleSelect === 'Other' && (
              <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black ml-1">Custom Expense Title *</p>
                <input
                  placeholder="e.g. Gym Rent, WiFi Bill, AC Repair, washing supplies"
                  type="text"
                  value={form.customTitle}
                  onChange={e => setForm({ ...form, customTitle: e.target.value })}
                  required
                  className="w-full !h-10 !py-2.5 !text-[15px] !bg-bg-card/40 border border-white/5 !rounded-xl text-white outline-none focus:border-accent/50 px-4 transition-all"
                />
              </div>
            )}

            {/* 2. Amount and Date Paid On Inputs (2-column grid layout) */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black ml-1">Amount ₹ *</p>
                <input placeholder="Amount ₹"
                  type="number"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  required
                  className="w-full !h-8  !text-[15px] !bg-bg-card/40 border border-white/5 !rounded-xl text-white outline-none focus:border-accent/50 px-4 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black ml-1">Paid On *</p>
                <DatePicker
                  value={form.date}
                  onChange={val => setForm({ ...form, date: val })}
                  placeholder="Select Date"
                  className="w-full !h-10"
                />
              </div>
            </div>

            {/* 3 & 4. Expense Month & Kind of Payment (2-column layout) */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="h-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black ml-1 h-5">Expense Month</p>
                <Select
                  value={form.month}
                  searchable={false}
                  options={[
                    { label: 'January', value: 'January' },
                    { label: 'February', value: 'February' },
                    { label: 'March', value: 'March' },
                    { label: 'April', value: 'April' },
                    { label: 'May', value: 'May' },
                    { label: 'June', value: 'June' },
                    { label: 'July', value: 'July' },
                    { label: 'August', value: 'August' },
                    { label: 'September', value: 'September' },
                    { label: 'October', value: 'October' },
                    { label: 'November', value: 'November' },
                    { label: 'December', value: 'December' }
                  ]}
                  onChange={val => setForm({ ...form, month: val })}
                  className="w-full !h-10"
                />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black ml-1">Payment Method</p>
                <Select
                  value={form.paymentMethod}
                  searchable={false}
                  options={[
                    { label: 'Cash', value: 'cash', icon: <Banknote size={16} /> },
                    { label: 'UPI', value: 'upi', icon: <Zap size={16} /> }
                  ]}
                  onChange={val => setForm({ ...form, paymentMethod: val })}
                  className="w-full !h-10"
                />
              </div>
            </div>

            {/* 5. Optional Note */}
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black ml-1">Optional Note</p>
              <input
                placeholder="Add any extra details or reference..."
                type="text"
                value={form.note}
                onChange={e => setForm({ ...form, note: e.target.value })}
                className="w-full !py-2.5 !text-[15px] !bg-bg-card/40 border border-white/5 !rounded-xl text-white outline-none focus:border-accent/50 px-4 transition-all"
              />
            </div>
          </div>

          {/* Action buttons mirroring member addition cancel/add ratio */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowAdd(false);
                setForm({
                  category: 'Rent',
                  titleSelect: 'Gym Rent',
                  customTitle: '',
                  amount: '',
                  date: new Date().toISOString().split('T')[0],
                  month: new Date().toLocaleString('en-US', { month: 'long' }),
                  paymentMethod: 'cash',
                  note: ''
                });
              }}
              className="flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary active:bg-white/20 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[2] btn-primary !py-3 !text-sm font-black uppercase tracking-widest shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              {saving ? 'Processing...' : 'Record Expense'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
