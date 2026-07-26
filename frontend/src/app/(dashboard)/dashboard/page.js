'use client';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { dashboardApi, alertsApi, trainersApi, membersApi, leadsApi, paymentsApi, expensesApi, attendanceApi, staffApi, plansApi } from '@/lib/api';
import { StatCard, Badge, Modal } from '@/components/UI';
import Link from 'next/link';
import {
  Activity, IndianRupee, Users, Clock, UserPlus,
  CreditCard, Target, UserCheck, Calendar,
  ChevronRight, ChevronLeft, Search, Filter, MoreHorizontal,
  Smartphone, Dumbbell, Zap, Coins, AlertCircle, Eye, X, ChevronDown, AlertTriangle
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [trainers, setTrainers] = useState([]);
  const [members, setMembers] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [allLeads, setAllLeads] = useState([]);
  const [allAttendance, setAllAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, month: '', year: '', profit: 0, expense: 0 });
  const [showFollowupReminderModal, setShowFollowupReminderModal] = useState(false);
  const [showStatusUpdateModal, setShowStatusUpdateModal] = useState(false);
  const [showStaleLeadsModal, setShowStaleLeadsModal] = useState(false);
  const [staleLeadsCount, setStaleLeadsCount] = useState(0);
  const [pendingClients, setPendingClients] = useState({ count: 0, amount: 0 });
  const [unpaidPayroll, setUnpaidPayroll] = useState({
    trainersCount: 0,
    trainersAmount: 0,
    staffCount: 0,
    staffAmount: 0
  });
  const [showTrendDrawer, setShowTrendDrawer] = useState(false);
  const [isTrendDrawerOpen, setIsTrendDrawerOpen] = useState(false);
  const [drawerFilter, setDrawerFilter] = useState('this-month-vs-last');
  const [selected6MonthIdx, setSelected6MonthIdx] = useState(5);
  const [showDrawerFilterOptions, setShowDrawerFilterOptions] = useState(false);
  const [todaysFollowupCount, setTodaysFollowupCount] = useState(0);
  const [expiringTodayCount, setExpiringTodayCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [paymentMap, setPaymentMap] = useState({});
  const [memberSearch, setMemberSearch] = useState('');
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState('');
  const [memberSort, setMemberSort] = useState('-joinDate');

  const openTrendDrawer = () => {
    setDrawerFilter('this-month-vs-last');
    setSelected6MonthIdx(5);
    setShowTrendDrawer(true);
    setTimeout(() => {
      setIsTrendDrawerOpen(true);
    }, 20);
  };

  const closeTrendDrawer = () => {
    setIsTrendDrawerOpen(false);
    setTimeout(() => {
      setShowTrendDrawer(false);
    }, 300);
  };

  useEffect(() => {
    if (isTrendDrawerOpen) {
      document.body.classList.add('trend-drawer-active');
    } else {
      document.body.classList.remove('trend-drawer-active');
    }
    return () => {
      document.body.classList.remove('trend-drawer-active');
    };
  }, [isTrendDrawerOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showTrendDrawer) {
          closeTrendDrawer();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showTrendDrawer]);

  const formatCompactValue = (val) => {
    const isNeg = val < 0;
    const absVal = Math.round(Math.abs(val));
    let formatted = '';
    if (absVal >= 1000000) {
      formatted = `${(absVal / 1000000).toFixed(1)}m`;
    } else if (absVal >= 1000) {
      formatted = `${(absVal / 1000).toFixed(1)}k`;
    } else {
      formatted = `${absVal}`;
    }
    return isNeg ? `-₹${formatted}` : `₹${formatted}`;
  };

  const getEffectiveExpiry = (m) => {
    const key = m._id?.toString();
    const latestPayment = paymentMap[key];
    if (!latestPayment) return null;
    return latestPayment.newExpiry ? new Date(latestPayment.newExpiry) : (m.planExpiry ? new Date(m.planExpiry) : null);
  };

  const getStatusInfo = (m) => {
    const now = new Date();
    if (m.status === 'inactive') {
      return { text: 'Inactive', className: 'bg-white/5 text-text-muted border border-white/10' };
    }

    const effectiveExpiry = getEffectiveExpiry(m);
    if (!effectiveExpiry) {
      return { text: 'No Payment', className: 'bg-red-500/10 text-red-400 border border-red-500/20' };
    }

    const isExpired = effectiveExpiry < now;
    const diffTime = Math.abs(now - effectiveExpiry);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (isExpired) {
      return {
        text: `Expired ${diffDays === 0 ? 'Today' : `${diffDays}d ago`}`,
        className: 'bg-red-500/10 text-red-400 border border-red-500/20'
      };
    }

    if (diffDays <= 3) {
      return { text: 'Expiring', className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' };
    }

    return { text: 'Paid', className: 'bg-accent/10 text-accent border border-accent/20' };
  };

  const fetchData = async () => {
    try {
      const [dashRes, trainRes, paymentsRes, expensesRes, leadsRes, membersRes, attendanceRes] = await Promise.all([
        dashboardApi.get(),
        trainersApi.getAll(),
        paymentsApi.getAll('status=paid&limit=1000'),
        expensesApi.getAll('limit=1000').catch(() => ({ success: false, data: [] })),
        leadsApi.getAll('limit=1000').catch(() => ({ success: false, data: [] })),
        membersApi.getAll('limit=1000').catch(() => ({ success: false, data: [] })),
        attendanceApi.getAll('limit=2000').catch(() => ({ success: false, data: [] }))
      ]);

      if (dashRes.success) {
        setData(dashRes.data);
        const s = dashRes.data.stats || {};
        setInactiveCount(s.inactiveMembers || 0);
        setExpiringTodayCount(s.expiringPlans || 0);
      }
      if (trainRes.success) setTrainers(trainRes.data);
      if (expensesRes?.success && expensesRes.data) setExpenses(expensesRes.data);
      if (membersRes?.success && membersRes.data) setAllMembers(membersRes.data);
      if (attendanceRes?.success && attendanceRes.data) setAllAttendance(attendanceRes.data);
      
      if (paymentsRes?.success && paymentsRes.data) {
        setPayments(paymentsRes.data);
        const map = {};
        paymentsRes.data.forEach(p => {
          const mid = p.member?._id || p.member;
          if (!mid) return;
          const key = mid.toString();
          const pDate = new Date(p.paymentDate || p.createdAt);
          if (!map[key] || pDate > new Date(map[key].paymentDate || map[key].createdAt)) {
            map[key] = p;
          }
        });
        setPaymentMap(map);
      }

      if (leadsRes?.success && leadsRes.data) {
        setAllLeads(leadsRes.data);
        const todayStr = new Date().toDateString();
        const leadsCount = leadsRes.data.filter(l => {
          if (!l.followUpDate) return false;
          if (l.status === 'joined' || l.status === 'lost') return false;
          const fDate = new Date(l.followUpDate);
          return fDate.toDateString() === todayStr;
        }).length;
        setTodaysFollowupCount(leadsCount);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };
  const handleCloseStatusUpdateModal = () => {
    setShowStatusUpdateModal(false);
    if (todaysFollowupCount > 0) {
      setTimeout(() => {
        setShowFollowupReminderModal(true);
      }, 300);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedMemberSearch(memberSearch), 400);
    return () => clearTimeout(timer);
  }, [memberSearch]);

  const fetchMembers = async () => {
    try {
      const res = await membersApi.getAll(`limit=5&sort=${memberSort}&search=${debouncedMemberSearch}`);
      if (res.success) setMembers(res.data);
    } catch (err) { console.error('Error fetching dashboard members:', err); }
  };

  useEffect(() => {
    fetchMembers();
  }, [debouncedMemberSearch, memberSort]);

  useEffect(() => {
    if (loading) return;

    const justLoggedIn = sessionStorage.getItem('just_logged_in');
    if (justLoggedIn === 'true') {
      const timer = setTimeout(async () => {
        try {
          const [leadsRes, membersRes, staffRes, trainersRes, expensesRes, plansRes] = await Promise.all([
            leadsApi.getAll('limit=1000'),
            membersApi.getAll('limit=1000'),
            staffApi.getAll().catch(() => ({ success: false, data: [] })),
            trainersApi.getAll().catch(() => ({ success: false, data: [] })),
            expensesApi.getAll('limit=1000').catch(() => ({ success: false, data: [] })),
            plansApi.getAll().catch(() => ({ success: false, data: [] }))
          ]);

          if (leadsRes.success && membersRes.success) {
            const today = new Date();
            const todayStr = today.toDateString();

            // 1. Leads follow-up count
            const leadsCount = leadsRes.data.filter(l => {
              if (!l.followUpDate) return false;
              if (l.status === 'joined' || l.status === 'lost') return false;
              const fDate = new Date(l.followUpDate);
              return fDate.toDateString() === todayStr;
            }).length;

            // 2. Expiring plans today
            const expiringCount = membersRes.data.filter(m => {
              if (!m.planExpiry) return false;
              if (m.status === 'inactive') return false;
              const expDate = new Date(m.planExpiry);
              return expDate.toDateString() === todayStr;
            }).length;

            // 3. Inactive members count
            const inactCount = membersRes.data.filter(m => m.status === 'inactive').length;

            // 4. Stale leads (created in previous calendar month or older, not converted/lost)
            const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const staleLeadsList = leadsRes.data.filter(l => {
              if (l.status === 'joined' || l.status === 'lost') return false;
              const createdAtDate = new Date(l.createdAt);
              return createdAtDate < startOfCurrentMonth;
            });

            // 5. Unpaid Staff/Trainers from previous calendar month
            const prevMonthDate = new Date();
            prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
            const prevMonthIdx = prevMonthDate.getMonth();
            const prevMonthYear = prevMonthDate.getFullYear();

            // Filter expenses logged in the previous month
            const prevMonthExpenses = (expensesRes.data || []).filter(e => {
              const eDate = new Date(e.date || e.createdAt);
              return !isNaN(eDate.getTime()) && eDate.getMonth() === prevMonthIdx && eDate.getFullYear() === prevMonthYear;
            });

            let unpaidStaffCount = 0;
            let unpaidStaffAmount = 0;
            let unpaidTrainersCount = 0;
            let unpaidTrainersAmount = 0;

            const activeStaff = (staffRes.data || []).filter(s => s.status === 'active');
            const activeTrainers = (trainersRes.data || []).filter(t => t.status === 'active');
            const fetchedPlans = plansRes.data || [];

            activeStaff.forEach(s => {
              const nameLower = s.name.toLowerCase();
              const hasExpense = prevMonthExpenses.some(e => {
                const titleLower = e.title.toLowerCase();
                const isSalaryCategory = (e.category || '').toLowerCase().includes('salary');
                const isSalaryTitle = titleLower.includes('salary');
                return (isSalaryCategory || isSalaryTitle) && titleLower.includes(nameLower);
              });
              if (!hasExpense) {
                unpaidStaffCount++;
                unpaidStaffAmount += s.salary || 0;
              }
            });

            activeTrainers.forEach(t => {
              const nameLower = t.name.toLowerCase();
              const hasExpense = prevMonthExpenses.some(e => {
                const titleLower = e.title.toLowerCase();
                const isSalaryCategory = (e.category || '').toLowerCase().includes('salary');
                const isSalaryTitle = titleLower.includes('salary');
                return (isSalaryCategory || isSalaryTitle) && titleLower.includes(nameLower);
              });
              if (!hasExpense) {
                // Calculate monthly PT commission
                let trainerCommission = 0;
                const activeMembers = (t.assignedMembers || []).filter(m => {
                  if (!m.planExpiry) return false;
                  return new Date(m.planExpiry) >= today;
                });

                if (t.commission && t.commission > 0 && activeMembers.length > 0) {
                  trainerCommission = activeMembers.reduce((sum, m) => {
                    let planMonths = 1;
                    let ptAmount = 0;
                    const matchedPlan = fetchedPlans.find(p => p.name === m.plan);
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
                    return sum + ((ptAmount * (t.commission / 100)) / planMonths);
                  }, 0);
                  trainerCommission = Math.round(trainerCommission);
                }

                const totalSalary = (t.salary || 0) + trainerCommission;
                unpaidTrainersCount++;
                unpaidTrainersAmount += totalSalary;
              }
            });

            // 6. Pending client payments from previous calendar month
            let pendingMembersCount = 0;
            let pendingMembersAmount = 0;

            (membersRes.data || []).forEach(m => {
              if (!m.planExpiry) return;
              const expDate = new Date(m.planExpiry);
              if (!isNaN(expDate.getTime()) && expDate.getMonth() === prevMonthIdx && expDate.getFullYear() === prevMonthYear) {
                pendingMembersCount++;
                pendingMembersAmount += m.planAmount || m.renewalAmount || 0;
              }
            });

            setTodaysFollowupCount(leadsCount);
            setExpiringTodayCount(expiringCount);
            setInactiveCount(inactCount);
            setStaleLeadsCount(staleLeadsList.length);
            setPendingClients({ count: pendingMembersCount, amount: pendingMembersAmount });
            setUnpaidPayroll({
              trainersCount: unpaidTrainersCount,
              trainersAmount: unpaidTrainersAmount,
              staffCount: unpaidStaffCount,
              staffAmount: unpaidStaffAmount
            });

            if (staleLeadsList.length > 0 || unpaidTrainersCount > 0 || unpaidStaffCount > 0 || pendingMembersCount > 0) {
              setShowStaleLeadsModal(true);
            } else if (expiringCount > 0 || inactCount > 0) {
              setShowStatusUpdateModal(true);
            } else if (leadsCount > 0) {
              setShowFollowupReminderModal(true);
            }
          }
        } catch (err) { console.error('Error fetching dashboard alerts:', err); }
        sessionStorage.removeItem('just_logged_in');
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [loading]);

  useEffect(() => {
    const handleSettingsUpdate = () => {
      fetchData();
    };
    window.addEventListener('gymSettingsUpdated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('gymSettingsUpdated', handleSettingsUpdate);
    };
  }, []);

  const incomeChartData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();

    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const getDaysInMonth = (m, y) => new Date(y, m + 1, 0).getDate();
    const daysInPrevMonth = getDaysInMonth(prevMonth, prevMonthYear);

    // Allocate daily income and daily expenses
    const dailyIncomePrev = Array(daysInPrevMonth).fill(0);
    const dailyIncomeCurrent = Array(currentDay).fill(0);
    const dailyExpensePrev = Array(daysInPrevMonth).fill(0);
    const dailyExpenseCurrent = Array(currentDay).fill(0);

    // 1. Process Income
    payments.forEach(p => {
      if (p.status !== 'paid') return;
      const pDate = new Date(p.paymentDate || p.createdAt);
      const year = pDate.getFullYear();
      const month = pDate.getMonth();
      const date = pDate.getDate();

      if (year === currentYear && month === currentMonth) {
        if (date <= currentDay) {
          dailyIncomeCurrent[date - 1] += p.amount;
        }
      } else if (year === prevMonthYear && month === prevMonth) {
        if (date <= daysInPrevMonth) {
          dailyIncomePrev[date - 1] += p.amount;
        }
      }
    });

    // 2. Process Expenses
    expenses.forEach(e => {
      const eDate = new Date(e.date || e.createdAt);
      if (isNaN(eDate.getTime())) return;
      const year = eDate.getFullYear();
      const month = eDate.getMonth();
      const date = eDate.getDate();

      if (year === currentYear && month === currentMonth) {
        if (date <= currentDay) {
          dailyExpenseCurrent[date - 1] += e.amount;
        }
      } else if (year === prevMonthYear && month === prevMonth) {
        if (date <= daysInPrevMonth) {
          dailyExpensePrev[date - 1] += e.amount;
        }
      }
    });

    // 3. Compute Cumulative Net Profit (Non-decreasing, monotonic growth curves)
    let cumPrev = [];
    let prevSum = 0;
    for (let i = 0; i < daysInPrevMonth; i++) {
      prevSum += (dailyIncomePrev[i] - dailyExpensePrev[i]);
      const lastVal = cumPrev.length > 0 ? cumPrev[cumPrev.length - 1] : 0;
      cumPrev.push(Math.max(lastVal, prevSum));
    }

    let cumCurrent = [];
    let currSum = 0;
    for (let i = 0; i < currentDay; i++) {
      currSum += (dailyIncomeCurrent[i] - dailyExpenseCurrent[i]);
      const lastVal = cumCurrent.length > 0 ? cumCurrent[cumCurrent.length - 1] : 0;
      cumCurrent.push(Math.max(lastVal, currSum));
    }

    const hasRealData = payments.length > 0 || expenses.length > 0;
    const finalPrev = [0, ...cumPrev];
    const finalCurrent = [0, ...cumCurrent];

    const currTotal = finalCurrent[finalCurrent.length - 1] || 0;
    const prevDayMatchIndex = Math.min(finalCurrent.length - 1, finalPrev.length - 1);
    const prevTotalAtSameDay = finalPrev[prevDayMatchIndex] || 0;
    const diff = currTotal - prevTotalAtSameDay;
    let trend = 'flat';
    if (diff > 0) trend = 'up';
    else if (diff < 0) trend = 'down';

    const displayMonthDate = new Date(currentYear, currentMonth, 1);
    const displayPrevMonthDate = new Date(prevMonthYear, prevMonth, 1);

    return {
      prevMonthPoints: finalPrev,
      currentMonthPoints: finalCurrent,
      diff: Math.abs(diff),
      trend,
      currentTotal: currTotal,
      daysInPrevMonth,
      prevLabel: displayMonthDate.toLocaleString('default', { month: 'short' }).toUpperCase(),
      prevPrevLabel: displayPrevMonthDate.toLocaleString('default', { month: 'short' }).toUpperCase()
    };
  }, [payments, expenses]);

  const last6MonthsData = useMemo(() => {
    const months = [];
    const now = new Date();
    
    const hasRealData = payments.length > 0 || expenses.length > 0;

    // Get last 6 months including current
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        date: d,
        monthName: d.toLocaleString('default', { month: 'short' }).toUpperCase(),
        year: d.getFullYear(),
        income: 0,
        expense: 0,
        profit: 0
      });
    }

    if (hasRealData) {
      const currentDay = now.getDate();

      // Accumulate payments
      payments.forEach(p => {
        if (p.status !== 'paid') return;
        const pDate = new Date(p.paymentDate || p.createdAt);
        if (isNaN(pDate.getTime())) return;
        
        // ONLY compare up to the current day of the month!
        if (pDate.getDate() > currentDay) return;

        const amount = p.amount || 0;
        months.forEach(m => {
          if (pDate.getMonth() === m.date.getMonth() && pDate.getFullYear() === m.year) {
            m.income += amount;
            m.profit += amount;
          }
        });
      });

      // Subtract expenses
      expenses.forEach(e => {
        const eDate = new Date(e.date || e.createdAt);
        if (isNaN(eDate.getTime())) return;
        
        // ONLY compare up to the current day of the month!
        if (eDate.getDate() > currentDay) return;

        const amount = e.amount || 0;
        months.forEach(m => {
          if (eDate.getMonth() === m.date.getMonth() && eDate.getFullYear() === m.year) {
            m.expense += amount;
            m.profit -= amount;
          }
        });
      });
    }

    return months;
  }, [payments, expenses]);

  const dailyProfitsThisMonth = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth();
    const currentDay = now.getDate();
    
    const days = [];
    const hasRealData = payments.length > 0 || expenses.length > 0;

    for (let d = 1; d <= currentDay; d++) {
      days.push({
        dayNum: d,
        label: `${new Date().toLocaleString('default', { month: 'short' }).toUpperCase()} ${d}`,
        profit: 0
      });
    }

    if (hasRealData) {
      payments.forEach(p => {
        if (p.status !== 'paid') return;
        const pDate = new Date(p.paymentDate || p.createdAt);
        if (isNaN(pDate.getTime())) return;
        if (pDate.getMonth() === currentMonthIdx && pDate.getFullYear() === currentYear) {
          const d = pDate.getDate();
          if (d >= 1 && d <= currentDay) {
            days[d - 1].profit += (p.amount || 0);
          }
        }
      });

      expenses.forEach(e => {
        const eDate = new Date(e.date || e.createdAt);
        if (isNaN(eDate.getTime())) return;
        if (eDate.getMonth() === currentMonthIdx && eDate.getFullYear() === currentYear) {
          const d = eDate.getDate();
          if (d >= 1 && d <= currentDay) {
            days[d - 1].profit -= (e.amount || 0);
          }
        }
      });
    }

    return days;
  }, [payments, expenses]);

  const gymInsights = useMemo(() => {
    const list = [];
    const now = new Date();
    
    // Helper: format owner name
    const formatName = (str) => {
      if (!str) return "";
      return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    };
    const ownerName = formatName(user?.name) || "Gym Owner";
    
    // 1. Welcome Message
    list.push({
      id: 'welcome',
      type: 'info',
      text: `Welcome back, ${ownerName}! Have a great day managing your gym today.`
    });

    const isBrandNewGym = allMembers.length === 0 && trainers.length === 0 && expenses.length === 0 && allLeads.length === 0;
    if (isBrandNewGym) {
      return list;
    }

    const activeMembersCount = allMembers.filter(m => m.status === 'active').length;
    const ptTrainers = trainers.filter(t => t.trainerType === 'PT Trainer' || t.trainerType === 'PT + Trainer');
    const activeLeadsList = allLeads.filter(l => l.status !== 'joined' && l.status !== 'lost');

    // === FRESH GYM SETUP CHECKS ===
    // If the gym has no members, show a setup guide
    if (allMembers.length === 0) {
      list.push({
        id: 'setup-members',
        type: 'target',
        text: `Setup Guide: You haven't registered any members yet. Click the "Add a Client" button below to add your first member.`
      });
    }

    // If the gym has no trainers
    if (trainers.length === 0) {
      list.push({
        id: 'setup-trainers',
        type: 'info',
        text: `Setup Guide: No staff registered. Go to the "Trainers" tab in the navigation menu to add your coaching team.`
      });
    }

    // If the gym has no expenses
    if (expenses.length === 0) {
      list.push({
        id: 'setup-expenses',
        type: 'warning',
        text: `Setup Guide: Start logging your operating expenses (rent, salaries, utility bills) in the "Expenses" tab to track net profits.`
      });
    }

    // If the gym has no leads
    if (allLeads.length === 0) {
      list.push({
        id: 'setup-leads',
        type: 'target',
        text: `Setup Guide: You can track prospective gym inquiries in the "Leads" tab. Add them to set up follow-up reminders.`
      });
    }

    // === ADVANCED OPERATIONAL PREDICTIONS (Only if data exists) ===
    // 2. Churn Risk Analytics & Revenue Risk Predictor
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const highRiskMembers = allMembers.filter(m => {
      if (m.status !== 'active') return false;
      if (!m.lastAttendance) return true; // Never scanned is highest risk
      const lastAtt = new Date(m.lastAttendance);
      return lastAtt <= fourteenDaysAgo;
    });

    if (activeMembersCount > 0 && highRiskMembers.length > 0) {
      const lostRevenueRisk = highRiskMembers.reduce((sum, m) => sum + (m.planAmount || 0), 0);
      list.push({
        id: 'churn-prediction',
        type: 'danger',
        text: `Retention Alert: ${highRiskMembers.length} active members haven't visited in over 2 weeks. Reaching out to them can help save up to ₹${lostRevenueRisk.toLocaleString()} in monthly fees.`
      });
    }

    // 3. Sales Pipeline & Dynamic Conversion Forecast
    const totalConvertedLeads = allLeads.filter(l => l.status === 'joined').length;
    const totalClosedLeads = allLeads.filter(l => l.status === 'joined' || l.status === 'lost').length;
    // Dynamic gym-specific conversion factor (fallback to 30%)
    const conversionRate = totalClosedLeads > 0 ? (totalConvertedLeads / totalClosedLeads) : 0.3;
    const activeLeadsCount = activeLeadsList.length;

    if (activeLeadsCount > 0) {
      const avgMembershipAmount = allMembers.length > 0
        ? allMembers.reduce((sum, m) => sum + (m.planAmount || 0), 0) / allMembers.length
        : 2500;
      const potentialSales = activeLeadsCount * avgMembershipAmount * conversionRate;
      list.push({
        id: 'conversion-prediction',
        type: 'target',
        text: `Sales Opportunity: You have ${activeLeadsCount} active inquiries. Based on your sales history, converting them could bring in around ₹${Math.round(potentialSales).toLocaleString()} in new payments.`
      });
    }

    // 4. Financial Runway & Cashflow Deficit/Surplus Predictor (Next Month)
    // Baseline MRR
    const activeMembers = allMembers.filter(m => m.status === 'active');
    const monthlyRecurringRevenue = activeMembers.reduce((sum, m) => sum + (m.planAmount || 0), 0);
    
    // Baseline monthly expenses
    const currMonthIdx = now.getMonth();
    const currYear = now.getFullYear();
    const thisMonthExpenses = expenses.filter(e => {
      const eDate = new Date(e.date || e.createdAt);
      return !isNaN(eDate.getTime()) && eDate.getMonth() === currMonthIdx && eDate.getFullYear() === currYear;
    });
    const thisMonthExpenseSum = thisMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const historicalExpenses = expenses.filter(e => {
      const eDate = new Date(e.date || e.createdAt);
      return !isNaN(eDate.getTime()) && (eDate.getMonth() !== currMonthIdx || eDate.getFullYear() !== currYear);
    });
    const monthlyGroups = {};
    historicalExpenses.forEach(e => {
      const eDate = new Date(e.date || e.createdAt);
      const key = `${eDate.getFullYear()}-${eDate.getMonth()}`;
      monthlyGroups[key] = (monthlyGroups[key] || 0) + (e.amount || 0);
    });
    const historicalMonthsCount = Object.keys(monthlyGroups).length;
    const baselineExpenses = historicalMonthsCount > 0
      ? Object.values(monthlyGroups).reduce((sum, val) => sum + val, 0) / historicalMonthsCount
      : thisMonthExpenseSum || 5000;

    if (monthlyRecurringRevenue > 0) {
      if (monthlyRecurringRevenue > baselineExpenses) {
        const surplus = monthlyRecurringRevenue - baselineExpenses;
        list.push({
          id: 'financial-runway',
          type: 'target',
          text: `Money Check: Your regular monthly membership fees bring in ₹${Math.round(monthlyRecurringRevenue).toLocaleString()}, which is ₹${Math.round(surplus).toLocaleString()} more than your average monthly expenses. You are in a safe zone!`
        });
      } else {
        const deficit = baselineExpenses - monthlyRecurringRevenue;
        const avgMembershipAmount = allMembers.length > 0
          ? allMembers.reduce((sum, m) => sum + (m.planAmount || 0), 0) / allMembers.length
          : 2500;
        const requiredSalesCount = Math.ceil(deficit / avgMembershipAmount);
        list.push({
          id: 'financial-runway',
          type: 'warning',
          text: `Alert: Your monthly membership fees (₹${Math.round(monthlyRecurringRevenue).toLocaleString()}) are lower than your average monthly expenses (₹${Math.round(baselineExpenses).toLocaleString()}) by ₹${Math.round(deficit).toLocaleString()}. Try to get at least ${requiredSalesCount} new member(s) to cover the costs.`
        });
      }
    }

    // 5. Operating Cost baseline overspend
    if (baselineExpenses > 0 && thisMonthExpenseSum > baselineExpenses && expenses.length > 0) {
      const excess = thisMonthExpenseSum - baselineExpenses;
      list.push({
        id: 'expense-prediction',
        type: 'warning',
        text: `Warning: This month's expenses (₹${thisMonthExpenseSum.toLocaleString()}) are ₹${Math.round(excess).toLocaleString()} higher than your usual monthly average. Double-check recent purchases.`
      });
    }

    // 6. Day-of-Week & Peak Hour Attendance Rush Predictor based on real check-in logs
    let peakWeekday = '';
    let peakHourStr = '';
    
    if (allAttendance && allAttendance.length > 0) {
      const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const weekdayCounts = {};
      const hourCounts = {};
      
      allAttendance.forEach(att => {
        if (!att.checkInTime) return;
        const checkIn = new Date(att.checkInTime);
        if (isNaN(checkIn.getTime())) return;
        
        // Day of week
        const dayName = weekdays[checkIn.getDay()];
        weekdayCounts[dayName] = (weekdayCounts[dayName] || 0) + 1;
        
        // Hour
        const hour = checkIn.getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      
      // Find peak weekday
      let maxDayCount = -1;
      Object.keys(weekdayCounts).forEach(day => {
        if (weekdayCounts[day] > maxDayCount) {
          maxDayCount = weekdayCounts[day];
          peakWeekday = day;
        }
      });
      
      // Find peak hour
      let maxHourCount = -1;
      let peakHour = -1;
      Object.keys(hourCounts).forEach(h => {
        const hourNum = parseInt(h);
        if (hourCounts[hourNum] > maxHourCount) {
          maxHourCount = hourCounts[hourNum];
          peakHour = hourNum;
        }
      });
      
      if (peakHour !== -1) {
        const ampm = peakHour >= 12 ? 'PM' : 'AM';
        const displayHour = peakHour % 12 || 12;
        peakHourStr = `${displayHour}:00 ${ampm}`;
      }
    }

    if (peakWeekday && peakHourStr) {
      list.push({
        id: 'attendance-prediction',
        type: 'info',
        text: `Tip: Check-in records show that ${peakWeekday}s are your busiest days, with peak check-ins happening around ${peakHourStr}. Ask your floor trainers to be active then.`
      });
    } else {
      // Fallback if no logs exist yet
      const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDayOfWeek = weekdays[now.getDay()];
      if (currentDayOfWeek === 'Monday' || currentDayOfWeek === 'Tuesday') {
        list.push({
          id: 'attendance-prediction',
          type: 'info',
          text: `Tip: ${currentDayOfWeek}s are usually the busiest days. Ask your trainers to be on the floor during peak hours (6 PM - 9 PM) to help members.`
        });
      } else {
        list.push({
          id: 'attendance-prediction',
          type: 'info',
          text: `Tip: Weekend attendance is usually lower. Run a quick weekend workout challenge to get members to visit!`
        });
      }
    }

    // 7. General Profit Leakage alert
    if (incomeChartData && incomeChartData.trend === 'down' && expenses.length > 0) {
      if (thisMonthExpenses.length > 0) {
        const sortedExp = [...thisMonthExpenses].sort((a, b) => (b.amount || 0) - (a.amount || 0));
        const topExp = sortedExp[0];
        list.push({
          id: 'leakage',
          type: 'warning',
          text: `Alert: Profits are down by ₹${incomeChartData.diff.toLocaleString()} compared to last month. Notice: Your biggest expense this month is "${topExp.title}" (₹${topExp.amount.toLocaleString()}).`
        });
      } else {
        list.push({
          id: 'leakage-general',
          type: 'warning',
          text: `Alert: Profits are down by ₹${incomeChartData.diff.toLocaleString()} compared to last month. Take a look at your operational spending.`
        });
      }
    }

    // 8. Retention Warning (Expired/Expiring Today)
    if (expiringTodayCount > 0) {
      list.push({
        id: 'expiring',
        type: 'warning',
        text: `Reminder: ${expiringTodayCount} client memberships expire today. Call them to renew their memberships.`
      });
    }

    // 9. Operational PT Staff Optimization Check (Only if trainers exist)
    if (ptTrainers.length > 0) {
      const assignedTrainerIds = new Set(
        allMembers
          .map(m => m.assignedTrainer?._id || m.assignedTrainer)
          .filter(Boolean)
          .map(id => id.toString())
      );
      const unassignedPTCount = ptTrainers.filter(t => {
        const idStr = (t._id || t.id)?.toString();
        return !assignedTrainerIds.has(idStr);
      }).length;

      if (unassignedPTCount > 0) {
        list.push({
          id: 'weakness-trainers',
          type: 'info',
          text: `Staff Check: ${unassignedPTCount} personal trainer(s) currently have no clients assigned. Assign them clients to utilize their shifts.`
        });
      }
    }

    return list;
  }, [user, incomeChartData, expenses, inactiveCount, expiringTodayCount, trainers, data, allMembers, allLeads, allAttendance]);

  const [insightIndex, setInsightIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  const triggerSlideChange = (nextIndex) => {
    setIsFading(true);
    setTimeout(() => {
      setInsightIndex(nextIndex);
      setIsFading(false);
    }, 200);
  };

  useEffect(() => {
    if (gymInsights.length <= 1) {
      setInsightIndex(0);
      return;
    }
    const timer = setInterval(() => {
      const nextIndex = (insightIndex + 1) % gymInsights.length;
      triggerSlideChange(nextIndex);
    }, 7000);
    return () => clearInterval(timer);
  }, [gymInsights.length, insightIndex]);

  useEffect(() => {
    if (insightIndex >= gymInsights.length) {
      setInsightIndex(0);
    }
  }, [gymInsights.length, insightIndex]);

  if (loading) return null;

  const s = data?.stats || {};
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const prevMonthName = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toLocaleString('default', { month: 'long' });
  const currentDayOrdinal = (() => {
    const day = new Date().getDate();
    const j = day % 10, k = day % 100;
    if (j === 1 && k !== 11) return day + "st";
    if (j === 2 && k !== 12) return day + "nd";
    if (j === 3 && k !== 13) return day + "rd";
    return day + "th";
  })();
  const todayDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const todayTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Calculate chart variables
  const trendData = s.revenueTrend || [];
  const allValues = trendData.map(x => [
    x.revenue || 0,
    x.expense || 0
  ]).flat();
  const maxVal = Math.max(...allValues.map(Math.abs), 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
  const roundedMax = Math.ceil(maxVal / (magnitude / 2 || 1)) * (magnitude / 2 || 1);

  const minY = 0;
  const maxY = roundedMax;
  const rangeY = maxY - minY;

  const getPercent = (v) => ((v - minY) / rangeY) * 100;

  return (
    <div className="text-white pb-10">
      <div className="grid grid-cols-12 gap-8">

        {/* Left Section: Action Buttons + UPI Spends Trend Chart */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          {/* Smart Gym Insights Ticker */}
          {gymInsights.length > 0 && (() => {
            const insight = gymInsights[insightIndex];
            if (!insight) return null;

            const styles = {
              info: { dot: 'bg-accent', border: 'border-accent/10 bg-accent/2', text: 'text-accent' },
              warning: { dot: 'bg-amber-500', border: 'border-amber-500/10 bg-amber-500/2', text: 'text-amber-400' },
              danger: { dot: 'bg-red-500', border: 'border-red-500/10 bg-red-500/2', text: 'text-rose-400' },
              target: { dot: 'bg-sky-400', border: 'border-sky-400/10 bg-sky-400/2', text: 'text-sky-300' }
            }[insight.type] || { dot: 'bg-zinc-400', border: 'border-white/5 bg-white/1', text: 'text-zinc-300' };

            return (
              <div 
                className={`border ${styles.border} p-4 rounded-2xl relative overflow-hidden select-none transition-all duration-300`}
                style={{ minHeight: '105px' }}
              >
                <div className={`transition-opacity duration-200 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
                  <div className="flex items-start h-full pb-3">
                    <div className="space-y-1 pr-6">
                      <span className={`text-[11px] font-black uppercase tracking-wider block ${styles.text}`}>
                        {insight.type === 'info' ? 'Gym Insight' : insight.type === 'warning' ? 'Leakage Alert' : insight.type === 'danger' ? 'Retention Warning' : 'Growth Target'}
                      </span>
                      <p className="text-[13px] font-bold text-zinc-300 leading-normal">
                        {insight.text}
                      </p>
                    </div>
                  </div>
                </div>
                {/* Visual slide pagination indicator dots at bottom-right */}
                {gymInsights.length > 1 && (
                  <div className="absolute bottom-2.5 right-3.5 flex gap-1">
                    {gymInsights.map((_, i) => (
                      <span 
                        key={i}
                        onClick={() => triggerSlideChange(i)}
                        className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all ${
                          i === insightIndex ? 'bg-white w-2.5' : 'bg-white/10 hover:bg-white/30'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="space-y-3">
            <Link href="/members?action=add" className="w-full bg-accent hover:bg-accent-hover text-black font-black py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_10px_30px_rgba(184,241,117,0.2)] no-underline">
              <UserPlus size={20} strokeWidth={3} /> Add a Client
            </Link>
            <Link href="/attendance" className="w-full bg-[#1a1a1a] hover:bg-[#222] text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/5 no-underline">
              <Calendar size={20} /> Mark Attendance
            </Link>
          </div>

          <div
            onClick={openTrendDrawer}
            className="card bg-[#0d0d0d] hover:bg-[#222] border border-white/5 p-5 rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.3)] relative overflow-hidden group block cursor-pointer select-none"
          >
            <div className="space-y-3">
              {/* Title */}
              <p className="text-[10px] font-black text-text-muted uppercase tracking-wider select-none leading-none">
                {currentMonth} vs {prevMonthName} Profit (Till {currentDayOrdinal} {currentMonth})
              </p>

              <div className="flex items-center justify-between">
                {/* Trend Info Label */}
                <div className={`flex items-center gap-1.5 text-base font-black select-none ${
                    incomeChartData.trend === 'up' ? 'text-accent' :
                    incomeChartData.trend === 'down' ? 'text-danger' :
                    'text-text-muted'
                  }`}>
                  {incomeChartData.trend === 'up' && <span>↑</span>}
                  {incomeChartData.trend === 'down' && <span>↓</span>}
                  <span>₹{incomeChartData.diff.toLocaleString()}</span>
                  <ChevronRight size={14} strokeWidth={3} className="text-text-muted ml-0.5" />
                </div>

                {/* Legends */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 select-none">
                    <span className="w-2.5 h-2.5 rounded-full bg-white/20"></span>
                    <span className="text-[9px] font-bold text-text-muted">{incomeChartData.prevPrevLabel}</span>
                  </div>
                  <div className="flex items-center gap-1.5 select-none">
                    <span className={`w-2.5 h-2.5 rounded-full ${incomeChartData.trend === 'up' ? 'bg-[#b8f175]' : 'bg-[#f58220]'}`}></span>
                    <span className="text-[9px] font-bold text-text-muted">{incomeChartData.prevLabel}</span>
                  </div>
                </div>
              </div>

              {/* SVG Chart Area */}
              <div className="relative w-full h-[150px] mt-4 flex items-end">
                {(() => {
                  const width = 260;
                  const height = 130;
                  const padding = 10;
                  const totalDays = incomeChartData.daysInPrevMonth;

                  // Dynamic stroke color: green (#b8f175) if current month profit > previous month, orange (#f58220) if less or equal
                  const isProfitableTrend = incomeChartData.trend === 'up';
                  const currentColor = isProfitableTrend ? '#b8f175' : '#f58220';
                  const currentShadowClass = isProfitableTrend
                    ? 'drop-shadow-[0_4px_10px_rgba(184,241,117,0.4)]'
                    : 'drop-shadow-[0_4px_10px_rgba(245,130,32,0.4)]';
                  const currentGlowShadow = isProfitableTrend
                    ? '0 2px 6px rgba(184, 241, 117, 0.6)'
                    : '0 2px 6px rgba(245, 130, 32, 0.6)';

                  // Min and Max Y for scale dynamically based on combined points
                  const allPoints = [...incomeChartData.prevMonthPoints, ...incomeChartData.currentMonthPoints];
                  const yMin = Math.min(...allPoints) * 0.95;
                  const yMax = Math.max(...allPoints) * 1.05;
                  const yRange = yMax - yMin || 1;
                  const xMax = totalDays - 1;

                  const getCoords = (pts) => {
                    return pts.map((val, idx) => {
                      const x = padding + (idx / xMax) * (width - 2 * padding);
                      const y = height - padding - ((val - yMin) / yRange) * (height - 2 * padding);
                      return { x, y };
                    });
                  };

                  const prevCoords = getCoords(incomeChartData.prevMonthPoints);
                  const currentCoords = getCoords(incomeChartData.currentMonthPoints);

                  const getSmoothPath = (pts) => {
                    if (pts.length === 0) return '';
                    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

                    let d = `M ${pts[0].x} ${pts[0].y}`;
                    for (let i = 0; i < pts.length - 1; i++) {
                      const curr = pts[i];
                      const next = pts[i + 1];
                      const cp1x = curr.x + (next.x - curr.x) / 2;
                      const cp1y = curr.y;
                      const cp2x = curr.x + (next.x - curr.x) / 2;
                      const cp2y = next.y;
                      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
                    }
                    return d;
                  };

                  const prevLine = getSmoothPath(prevCoords);
                  const currentLine = getSmoothPath(currentCoords);

                  const prevArea = prevCoords.length > 0 ? `${prevLine} L ${prevCoords[prevCoords.length - 1].x} ${height} L ${prevCoords[0].x} ${height} Z` : '';

                  return (
                    <div className="relative w-full h-full">
                      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
                        <defs>
                          <linearGradient id="greyAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgba(255, 255, 255, 0)" />
                            <stop offset="100%" stopColor="rgba(255, 255, 255, 0.05)" />
                          </linearGradient>
                        </defs>

                        {/* Previous Month (Grey) Area & Line */}
                        {prevArea && <path d={prevArea} fill="url(#greyAreaGrad)" />}
                        {prevLine && (
                          <path
                            d={prevLine}
                            fill="none"
                            stroke="rgba(255, 255, 255, 0.15)"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        )}

                        {/* Current Month Line ONLY (Dynamic Green if > Prev Month, Orange if <= Prev Month) */}
                        {currentLine && (
                          <path
                            d={currentLine}
                            fill="none"
                            stroke={currentColor}
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            className={currentShadowClass}
                          />
                        )}
                      </svg>

                      {/* Current Month Indicator Dot */}
                      {currentCoords.length > 0 && (() => {
                        const last = currentCoords[currentCoords.length - 1];
                        const leftPct = (last.x / width) * 100;
                        const topPct = (last.y / height) * 100;
                        return (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${leftPct}%`,
                              top: `${topPct}%`,
                              width: '11px',
                              height: '11px',
                              borderRadius: '50%',
                              backgroundColor: currentColor,
                              transform: 'translate(-50%, -50%)',
                              pointerEvents: 'none',
                              boxShadow: currentGlowShadow
                            }}
                          />
                        );
                      })()}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Slide-in Trend Drawer */}
        {showTrendDrawer && (
          <div className="fixed inset-0 z-[9999] flex justify-end">
            {/* Backdrop overlay */}
            <div
              className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${isTrendDrawerOpen ? 'opacity-100' : 'opacity-0'
                }`}
              onClick={closeTrendDrawer}
            />

            {/* Drawer content panel */}
            <div
              className={`relative w-full max-w-md bg-[#0a0a0a] border-l border-white/5 h-full p-6 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out transform ${isTrendDrawerOpen ? 'translate-x-0' : 'translate-x-full'
                } overflow-y-auto`}
            >
              <div className="space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight">Profit trend</h3>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold mt-1">
                      Profit Comparison till {currentDayOrdinal} {currentMonth}
                    </p>
                  </div>
                  <button
                    onClick={closeTrendDrawer}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Chart Comparison Panel */}
                <div className="bg-[#111] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                  {/* Top Selector dropdown */}
                  <div className="flex justify-between items-center mb-10">
                    <span className="text-xs text-text-muted font-bold">Comparison Mode</span>
                    <button
                      onClick={() => setShowDrawerFilterOptions(true)}
                      className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-[11px] font-black text-white flex items-center gap-1.5 select-none hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      {drawerFilter === 'this-month-vs-last' ? 'This month vs last' :
                       drawerFilter === 'last-6-months' ? 'Last 6 months' : 'Daily profit'}
                      <ChevronDown size={12} strokeWidth={3} />
                    </button>
                  </div>

                  {/* Bars Container */}
                  {drawerFilter === 'this-month-vs-last' && (() => {
                    const trend = incomeChartData.trend;
                    const diff = incomeChartData.diff || 0;
                    const currTotal = incomeChartData.currentTotal || 0;
                    const prevVal = trend === 'up' ? (currTotal - diff) : (trend === 'down' ? (currTotal + diff) : currTotal);
                    const currVal = currTotal;
                    const currentDay = new Date().getDate();

                    const drawerMax = Math.max(prevVal, currVal, 1);
                    const leftH = prevVal === 0 ? 0 : (prevVal / drawerMax) * 110 + 20;
                    const rightH = currVal === 0 ? 0 : (currVal / drawerMax) * 110 + 20;

                    return (
                      <div className="h-[200px] relative flex items-end justify-around px-4 pb-2">
                        {/* Dashed Line & Badge */}
                        <div
                          className="absolute border-t border-dashed border-white/20"
                          style={{ left: '25%', right: '25%', bottom: `${Math.min(leftH, rightH) + 32}px`, zIndex: 1 }}
                        />
                        <div
                          className="absolute left-1/2 -translate-x-1/2 bg-[#d46a13] text-white text-[11px] font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1"
                          style={{ bottom: `${Math.min(leftH, rightH) + 20}px`, zIndex: 2 }}
                        >
                          {trend === 'up' ? '↑ ' : trend === 'down' ? '↓ ' : ''}{formatCompactValue(diff)}
                        </div>

                        {/* Left Bar (Previous Month) */}
                        <div className="flex flex-col items-center relative" style={{ zIndex: 3 }}>
                          <div className="relative">
                            {/* Vertical Pin/Line */}
                            <div
                              className="absolute w-px bg-white/10"
                              style={{ bottom: '100%', height: '20px', left: '50%', transform: 'translateX(-50%)' }}
                            />
                            {/* Tooltip */}
                            <div
                              className="absolute bg-zinc-800 text-white text-[10px] font-black px-2.5 py-1 rounded-md shadow-md whitespace-nowrap animate-in slide-in-from-bottom duration-300"
                              style={{ bottom: 'calc(100% + 20px)', left: '50%', transform: 'translateX(-50%)' }}
                            >
                              {formatCompactValue(prevVal)}
                              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-zinc-800" />
                            </div>
                            {/* Bar */}
                            <div
                              className="w-6 bg-white/10 rounded-t-sm transition-all duration-500"
                              style={{ height: `${leftH}px` }}
                            />
                          </div>
                          <span className="text-[10px] font-black text-text-muted uppercase tracking-wider mt-3 select-none">
                            {incomeChartData.prevPrevLabel} 1 - {currentDay}
                          </span>
                        </div>

                        {/* Right Bar (Current Month) */}
                        <div className="flex flex-col items-center relative" style={{ zIndex: 3 }}>
                          <div className="relative">
                            {/* Vertical Pin/Line */}
                            <div
                              className="absolute w-px bg-white/10"
                              style={{ bottom: '100%', height: '20px', left: '50%', transform: 'translateX(-50%)' }}
                            />
                            {/* Tooltip */}
                            <div
                              className="absolute bg-[#1a0a2a] border border-accent/10 text-white text-[10px] font-black px-2.5 py-1 rounded-md shadow-md whitespace-nowrap animate-in slide-in-from-bottom duration-300"
                              style={{ bottom: 'calc(100% + 20px)', left: '50%', transform: 'translateX(-50%)' }}
                            >
                              {formatCompactValue(currVal)}
                              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-[#1a0a2a]" />
                            </div>
                            {/* Bar */}
                            <div
                              className="w-6 bg-white/30 rounded-t-sm transition-all duration-500"
                              style={{ height: `${rightH}px` }}
                            />
                          </div>
                          <span className="text-[10px] font-black text-text-primary uppercase tracking-wider mt-3 select-none">
                            {incomeChartData.prevLabel} 1 - {currentDay}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {drawerFilter === 'last-6-months' && (() => {
                    const maxVal = Math.max(...last6MonthsData.map(m => Math.abs(m.profit)), 1);
                    const selectedMonthObj = last6MonthsData[selected6MonthIdx];
                    const selectedBarHeight = selectedMonthObj ? (selectedMonthObj.profit === 0 ? 0 : (Math.abs(selectedMonthObj.profit) / maxVal) * 110 + 20) : 0;
                    return (
                      <div className="space-y-6">
                        <div className="h-[200px] relative flex items-end justify-around px-2 pb-2">
                          {/* Comparator dashed line for selected candle */}
                          <div
                            className="absolute border-t border-dashed border-accent/30 pointer-events-none transition-all duration-300"
                            style={{ left: '5%', right: '5%', bottom: `${selectedBarHeight + 32}px`, zIndex: 1 }}
                          />
                          {last6MonthsData.map((m, idx) => {
                            const val = m.profit;
                            const barHeight = val === 0 ? 0 : (Math.abs(val) / maxVal) * 110 + 20;
                            const isSelected = idx === selected6MonthIdx;
                            
                            return (
                              <div
                                key={idx}
                                onClick={() => setSelected6MonthIdx(idx)}
                                className="flex flex-col items-center relative cursor-pointer group"
                                style={{ zIndex: 3 }}
                              >
                                <div className="relative">
                                  {/* Vertical Pin/Line */}
                                  <div
                                    className={`absolute w-px transition-colors duration-300 ${
                                      isSelected ? 'bg-accent' : 'bg-white/10 group-hover:bg-white/25'
                                    }`}
                                    style={{ bottom: '100%', height: '20px', left: '50%', transform: 'translateX(-50%)' }}
                                  />
                                  {/* Tooltip */}
                                  <div
                                    className={`absolute text-[10px] font-black px-2 py-1 rounded-md shadow-md whitespace-nowrap transition-all duration-300 ${
                                      isSelected 
                                        ? 'bg-accent text-black scale-105 shadow-accent/20' 
                                        : 'bg-zinc-800 text-zinc-400 group-hover:text-white'
                                    }`}
                                    style={{ bottom: 'calc(100% + 20px)', left: '50%', transform: 'translateX(-50%)' }}
                                  >
                                    {formatCompactValue(val)}
                                    <div className={`absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] transition-colors duration-300 ${
                                      isSelected ? 'border-t-accent' : 'border-t-zinc-800'
                                    }`} />
                                  </div>
                                  {/* Bar */}
                                  <div
                                    className={`w-6 rounded-t-sm transition-all duration-300 ${
                                      isSelected 
                                        ? 'bg-accent shadow-[0_0_12px_rgba(245,130,32,0.4)]' 
                                        : 'bg-white/10 group-hover:bg-white/20'
                                    }`}
                                    style={{ height: `${barHeight}px` }}
                                  />
                                </div>
                                <span className={`text-[9px] uppercase tracking-wider mt-3 select-none transition-all duration-300 ${
                                  isSelected ? 'text-accent font-black' : 'text-text-muted font-bold group-hover:text-white'
                                }`}>
                                  {m.monthName}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Selected Month Details Info Card */}
                        {(() => {
                          const selMonth = last6MonthsData[selected6MonthIdx];
                          if (!selMonth) return null;
                          return (
                            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-4 animate-fade-in select-none">
                              <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                                <span className="text-[11px] font-black text-white uppercase tracking-wider">
                                  {selMonth.monthName} {selMonth.year} Performance
                                </span>
                                <span className="text-[9px] text-text-muted font-bold">
                                  (1st - {new Date().getDate()} comparison period)
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3 text-center">
                                  <p className="text-[9px] text-text-secondary font-black uppercase tracking-wider">Income</p>
                                  <p className="text-sm font-black text-green-400 mt-1">₹{Math.round(selMonth.income || 0).toLocaleString()}</p>
                                </div>
                                <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3 text-center">
                                  <p className="text-[9px] text-text-secondary font-black uppercase tracking-wider">Expenses</p>
                                  <p className="text-sm font-black text-red-400 mt-1">₹{Math.round(selMonth.expense || 0).toLocaleString()}</p>
                                </div>
                                <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3 text-center">
                                  <p className="text-[9px] text-text-secondary font-black uppercase tracking-wider">Net Profit</p>
                                  <p className="text-sm font-black text-accent mt-1">₹{Math.round(selMonth.profit || 0).toLocaleString()}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}

                  {drawerFilter === 'daily-spends' && (() => {
                    const maxVal = Math.max(...dailyProfitsThisMonth.map(d => Math.abs(d.profit)), 1);
                    return (
                      <div className="h-[200px] relative flex items-end justify-start gap-5 overflow-x-auto no-scrollbar px-3 pb-2 pt-12">
                        {dailyProfitsThisMonth.map((d, idx) => {
                          const val = d.profit;
                          const barHeight = val === 0 ? 0 : (Math.abs(val) / maxVal) * 90 + 20;
                          const isToday = idx === dailyProfitsThisMonth.length - 1;
                          
                          return (
                            <div key={idx} className="flex flex-col items-center shrink-0 relative" style={{ zIndex: 3 }}>
                              <div className="relative">
                                {/* Vertical Pin/Line */}
                                <div
                                  className="absolute w-px bg-white/10"
                                  style={{ bottom: '100%', height: '20px', left: '50%', transform: 'translateX(-50%)' }}
                                />
                                {/* Tooltip */}
                                <div
                                  className={`absolute text-[9px] font-black px-2 py-0.5 rounded shadow-md whitespace-nowrap ${
                                    isToday 
                                      ? 'bg-[#1a0a2a] border border-accent/10 text-white' 
                                      : 'bg-zinc-800 text-white'
                                  }`}
                                  style={{ bottom: 'calc(100% + 20px)', left: '50%', transform: 'translateX(-50%)' }}
                                >
                                  {formatCompactValue(val)}
                                  <div className={`absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] ${
                                    isToday ? 'border-t-[#1a0a2a]' : 'border-t-zinc-800'
                                  }`} />
                                </div>
                                {/* Bar */}
                                <div
                                  className={`w-6 rounded-t-sm transition-all duration-500 ${
                                    isToday ? 'bg-white/30' : 'bg-white/10'
                                  }`}
                                  style={{ height: `${barHeight}px` }}
                                />
                              </div>
                              <span className="text-[8px] font-black text-text-muted uppercase tracking-wider mt-3 select-none">
                                {d.dayNum}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Bottom Banner */}
              {(() => {
                const trend = incomeChartData.trend;
                return (
                  <div className="mt-8 flex gap-3 text-text-muted select-none relative pb-4">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 text-[#f58220] mt-0.5">
                      <Coins size={16} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-white uppercase tracking-wider">Profit Performance</p>
                      <p className="text-[11px] font-medium text-text-secondary leading-relaxed">
                        {drawerFilter === 'this-month-vs-last' ? (
                          trend === 'up'
                            ? `You've earned higher in ${currentMonth} compared to the same period in ${prevMonthName}.`
                            : trend === 'down'
                              ? `You've earned lower in ${currentMonth} compared to the same period in ${prevMonthName}.`
                              : `Your earnings are identical to the same period in ${prevMonthName}.`
                        ) : drawerFilter === 'last-6-months' ? (() => {
                          const selMonth = last6MonthsData[selected6MonthIdx];
                          if (!selMonth) return '';
                          if (selected6MonthIdx > 0) {
                            const prevMonth = last6MonthsData[selected6MonthIdx - 1];
                            const diff = selMonth.profit - prevMonth.profit;
                            if (diff > 0) {
                              return `Your net profit in ${selMonth.monthName} has increased by ₹${Math.round(diff).toLocaleString()} compared to ${prevMonth.monthName} (same period).`;
                            } else if (diff < 0) {
                              return `Your net profit in ${selMonth.monthName} has decreased by ₹${Math.round(Math.abs(diff)).toLocaleString()} compared to ${prevMonth.monthName} (same period).`;
                            } else {
                              return `Your net profit in ${selMonth.monthName} is identical to your performance in ${prevMonth.monthName}.`;
                            }
                          } else {
                            return `Your net profit in ${selMonth.monthName} is ₹${Math.round(selMonth.profit).toLocaleString()} for this period.`;
                          }
                        })() : (
                          `Showing daily net profits day-by-day for the month of ${currentMonth}.`
                        )}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Filter Selection Panel Overlay */}
              {showDrawerFilterOptions && (
                <div className="absolute inset-0 bg-[#0a0a0a]/95 backdrop-blur-md z-[60] p-6 flex flex-col justify-between animate-in fade-in duration-200">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center pb-4 border-b border-white/5">
                      <h4 className="text-sm font-black text-white uppercase tracking-wider">Select Filter</h4>
                      <button
                        onClick={() => setShowDrawerFilterOptions(false)}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Options List */}
                    <div className="space-y-4">
                      {[
                        {
                          id: 'this-month-vs-last',
                          title: 'This month vs last',
                          subtitle: `Profit so far vs same time last ${prevMonthName.toLowerCase()}`
                        },
                        {
                          id: 'last-6-months',
                          title: 'Last 6 months',
                          subtitle: 'Total monthly profit for the last 6 months'
                        },
                        {
                          id: 'daily-spends',
                          title: 'Daily profit',
                          subtitle: 'Profit made everyday so far this month'
                        }
                      ].map(opt => (
                        <div
                          key={opt.id}
                          onClick={() => {
                            setDrawerFilter(opt.id);
                            setShowDrawerFilterOptions(false);
                          }}
                          className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/2 hover:bg-white/5 cursor-pointer transition-all select-none"
                        >
                          <div className="space-y-1">
                            <p className="text-xs font-black text-white">{opt.title}</p>
                            <p className="text-[10px] text-text-muted font-medium">{opt.subtitle}</p>
                          </div>
                          <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ml-4"
                            style={{
                              borderColor: drawerFilter === opt.id ? '#f58220' : 'rgba(255,255,255,0.1)'
                            }}
                          >
                            {drawerFilter === opt.id && (
                              <div className="w-2.5 h-2.5 rounded-full bg-[#f58220]" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <style dangerouslySetInnerHTML={{
          __html: `
          body.trend-drawer-active nav.fixed,
          body.trend-drawer-active div.fixed:not(.z-\\[9999\\]) {
            transform: translateY(-160px) !important;
            transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          body nav.fixed,
          body div.fixed:not(.z-\\[9999\\]) {
            transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
        `}} />

        {/* Right Section: Main Content */}
        <div className="col-span-12 lg:col-span-9 space-y-8">

          <div className="grid grid-cols-12 gap-6">
            {/* Stat Cards 2x2 Grid */}
            <div className="col-span-12 lg:col-span-5 grid grid-cols-2 gap-4">
              <Link href="/payments" className="block no-underline">
                <StatCard
                  icon={<Coins size={18} />}
                  label="Net Profit"
                  value={(() => {
                    if (!s.monthlyProfit) return '₹0';
                    const isNeg = s.monthlyProfit < 0;
                    const absVal = Math.abs(s.monthlyProfit);
                    const formatted = absVal >= 1000 ? `₹${(absVal / 1000).toFixed(1)}k` : `₹${absVal}`;
                    return isNeg ? (
                      <span className="text-danger font-black">-{formatted}</span>
                    ) : (
                      formatted
                    );
                  })()}
                  trend={(payments.length > 0 || expenses.length > 0) && s.profitTrendPercent !== undefined ? `${Math.abs(s.profitTrendPercent).toFixed(1)}%` : '0%'}
                  trendUp={s.profitTrendPercent >= 0}
                  subtitle="This month"
                  onClick={() => { }} // Placeholder to trigger cursor-pointer style
                />
              </Link>
              <Link href="/payments" className="block no-underline">
                <StatCard
                  icon={<AlertCircle size={18} />}
                  label="Revenue at Risk"
                  value={(() => {
                    if (!s.revenueAtRisk) return '₹0';
                    return s.revenueAtRisk >= 1000 ? `₹${(s.revenueAtRisk / 1000).toFixed(1)}k` : `₹${s.revenueAtRisk}`;
                  })()}
                  trend={(allMembers.length > 0 || payments.length > 0) && s.riskTrendPercent !== undefined ? `${Math.abs(s.riskTrendPercent).toFixed(1)}%` : '0%'}
                  trendUp={s.riskTrendPercent <= 0}
                  color="danger"
                  subtitle="7-day risk"
                  onClick={() => { }}
                />
              </Link>
              <Link href="/attendance" className="block no-underline">
                <StatCard
                  icon={<Clock size={18} />}
                  label="Visited"
                  value={s.todayAttendance || 0}
                  trend={allAttendance.length > 0 && s.attendanceTrendPercent !== undefined ? `${Math.abs(s.attendanceTrendPercent).toFixed(1)}%` : '0%'}
                  trendUp={s.attendanceTrendPercent >= 0}
                  color="warning"
                  subtitle="Than yesterday"
                  onClick={() => { }}
                />
              </Link>
              <Link href="/trainers" className="block no-underline">
                <StatCard
                  icon={<UserCheck size={18} />}
                  label="Trainer"
                  value={trainers.length || 0}
                  trend={trainers.length > 0 && s.trainersTrendPercent !== undefined ? `${Math.abs(s.trainersTrendPercent).toFixed(1)}%` : '0%'}
                  trendUp={s.trainersTrendPercent >= 0}
                  color="success"
                  subtitle="This month"
                  onClick={() => { }}
                />
              </Link>
            </div>

            {/* Revenue Analytics Chart (Income and Expenses) */}
            <div className="col-span-12 lg:col-span-7 card bg-[#0d0d0d] border-white/5 rounded-xl p-8 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black tracking-tighter">Income and Expenses</h2>
                {/* Legend */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                    <span className="w-2.5 h-2.5 rounded bg-accent" />
                    <span>Income</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                    <span className="w-2.5 h-2.5 rounded bg-red-500" />
                    <span>Expense</span>
                  </div>
                </div>
              </div>

              {/* Chart Area with Gridlines */}
              <div className="relative flex-1 flex h-48 mt-4">
                {/* Y-Axis Labels & Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pr-2">
                  {[5, 4, 3, 2, 1, 0].map((val, idx) => (
                    <div key={idx} className="w-full flex items-center justify-between">
                      <span className="text-[9px] font-bold text-text-muted w-8 text-left uppercase tracking-tighter">
                        {(() => {
                          const currentVal = minY + (rangeY / 5) * val;
                          const isNeg = currentVal < 0;
                          const absVal = Math.abs(currentVal);
                          const formatted = absVal >= 1000 ? `${(absVal / 1000).toFixed(0)}k` : `${absVal.toFixed(0)}`;
                          return isNeg ? `-₹${formatted}` : `₹${formatted}`;
                        })()}
                      </span>
                      <div className="flex-1 border-b border-white/[0.03] border-dashed" />
                    </div>
                  ))}
                </div>

                {/* Bars Area */}
                <div className="pl-10 w-full h-full flex items-end justify-between gap-4 z-10 relative">
                  {trendData.map((item, i) => {
                    const revVal = item.revenue || 0;
                    const expVal = item.expense || 0;

                    const incomeHeight = (revVal / rangeY) * 100;
                    const expenseHeight = (expVal / rangeY) * 100;

                    return (
                      <div
                        key={item.month}
                        className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                        onMouseEnter={() => setTooltip(prev => ({ ...prev, show: true }))}
                        onMouseMove={(e) => {
                          const parentRect = e.currentTarget.closest('.relative.flex-1.flex.h-48').getBoundingClientRect();
                          const relativeX = e.clientX - parentRect.left;
                          const isNearRightEdge = relativeX > parentRect.width - 150;
                          const x = isNearRightEdge ? relativeX - 145 : relativeX + 12;
                          const y = e.clientY - parentRect.top - 40;
                          setTooltip({
                            show: true,
                            x,
                            y,
                            month: item.month,
                            year: item.year || new Date().getFullYear(),
                            profit: revVal,
                            expense: expVal
                          });
                        }}
                        onMouseLeave={() => setTooltip(prev => ({ ...prev, show: false }))}
                      >
                        {/* Side-by-side Columns Container */}
                        <div className="w-full h-full pb-1 flex items-end justify-center gap-[3px] sm:gap-[4px]">
                          {/* Income Bar (left, green) */}
                          <div
                            className="w-[10px] sm:w-[14px] bg-accent rounded-t-sm sm:rounded-t transition-all duration-700 hover:brightness-110 shadow-[0_0_10px_rgba(184,241,117,0.15)]"
                            style={{
                              height: `${incomeHeight}%`
                            }}
                          />

                          {/* Expense Bar (right, red) */}
                          <div
                            className="w-[10px] sm:w-[14px] bg-red-500 rounded-t-sm sm:rounded-t transition-all duration-700 hover:brightness-110"
                            style={{
                              height: `${expenseHeight}%`
                            }}
                          />
                        </div>

                        {/* Month label */}
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mt-2 shrink-0">{item.month}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Global Tooltip next to cursor */}
                {tooltip.show && (
                  <div
                    className="absolute bg-[#0d0d0d]/30 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-white z-50 pointer-events-none flex flex-col whitespace-nowrap gap-1 shadow-2xl backdrop-blur-lg transition-all duration-75"
                    style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
                  >
                    <span className="text-[10px] font-black text-white/95 border-b border-white/10 pb-1 mb-0.5 uppercase tracking-wider">
                      {tooltip.month} {tooltip.year}
                    </span>
                    <span className="text-accent">Income: ₹{tooltip.profit.toLocaleString()}</span>
                    <span className="text-danger">Expense: ₹{tooltip.expense.toLocaleString()}</span>
                    <span className={tooltip.profit - tooltip.expense < 0 ? "text-danger" : "text-indigo-400"}>Profit: {tooltip.profit - tooltip.expense < 0 ? '-' : ''}₹{Math.abs(tooltip.profit - tooltip.expense).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>



          {/* Members Table */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-xl font-black tracking-tighter">All Members</h2>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="relative flex-1 sm:flex-none">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search"
                    value={memberSearch || ''}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="bg-[#0d0d0d] border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs w-full sm:w-48 focus:border-accent/50 outline-none transition-all"
                  />
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-text-muted uppercase tracking-widest">
                  Sort by: <span
                    className="text-white flex items-center gap-1 cursor-pointer hover:text-accent transition-colors"
                    onClick={() => setMemberSort(memberSort === '-joinDate' ? 'planExpiry' : '-joinDate')}
                  >
                    {memberSort === '-joinDate' ? 'Newest Joined' : 'Expired Soon'} <Filter size={10} />
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#0d0d0d] border border-white/5 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-6 py-5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Member Name</th>
                    <th className="px-6 py-5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Expired Date</th>
                    <th className="px-6 py-5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Age</th>
                    <th className="px-6 py-5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Status</th>
                    <th className="px-6 py-5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Tel</th>
                    <th className="px-6 py-5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Last Visited</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {members.map((m, i) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-all group">
                      <td className="px-6 py-4">
                        <div>
                          <p className={`text-sm font-black transition-colors ${m.gender === 'female' ? 'text-pink-200 group-hover:text-pink-100' :
                            m.gender === 'male' ? 'text-blue-200 group-hover:text-blue-100' :
                            'text-zinc-200 group-hover:text-white'
                          }`}>
                            {m.name}
                          </p>
                          <p className="text-[10px] text-text-muted font-bold">{m.email || 'no-email@gym.com'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-text-secondary">
                        {(() => {
                          const effExpiry = getEffectiveExpiry(m);
                          return effExpiry ? effExpiry.toLocaleDateString('en-GB') : 'N/A';
                        })()}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-text-secondary">
                        {m.age ? `${m.age} Yrs` : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const info = getStatusInfo(m);
                          return (
                            <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider ${info.className}`}>
                              {info.text}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-text-secondary">{m.phone}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-text-muted">
                            {m.lastAttendance ? new Date(m.lastAttendance).toLocaleDateString('en-GB') : 'Never'}
                          </span>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/5 rounded-lg text-text-muted">
                            <MoreHorizontal size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              <div className="border-t border-white/5 p-4 flex justify-center bg-[#0d0d0d]">
                <Link href="/members" className="text-xs font-black text-white hover:text-accent uppercase tracking-widest hover:underline no-underline flex items-center gap-1.5 transition-all hover:gap-2">
                  View All Members <ChevronRight size={14} strokeWidth={3} />
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>

      {showStatusUpdateModal && (expiringTodayCount > 0 || inactiveCount > 0) && (
        <Modal
          isOpen={showStatusUpdateModal}
          onClose={handleCloseStatusUpdateModal}
          title="Daily Status Update"
          size="sm"
        >
          <div className="space-y-6 text-center py-2 px-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shadow-lg shadow-accent/5 animate-pulse">
              <Users size={28} strokeWidth={2.5} />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-white tracking-tight">Members Overview</h3>
              <p className="text-xs text-text-muted uppercase tracking-widest font-black">Today's Quick Insights</p>
            </div>

            <div className="space-y-3 mt-4 text-left">
              {/* Expiring Plans Row */}
              <Link
                href="/members?filter=expiring_today"
                onClick={handleCloseStatusUpdateModal}
                className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-4 hover:bg-white/[0.06] hover:border-amber-500/30 transition-all cursor-pointer no-underline block"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${expiringTodayCount > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-white/5 text-text-muted border-white/10'}`}>
                    <AlertCircle size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Plan Expirations</h4>
                    <p className="text-[10px] text-text-muted font-bold mt-0.5 font-normal normal-case">
                      {expiringTodayCount > 0 ? expiringTodayCount + " plans require renewal today" : 'No plans expiring today'}
                    </p>
                  </div>
                </div>
                <span className={`text-[13px] font-black px-2.5 py-0.5 rounded-lg border ${expiringTodayCount > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-white/5 text-text-muted border-white/10'}`}>
                  {expiringTodayCount}
                </span>
              </Link>

              {/* Inactive Members Row */}
              <Link
                href="/members?filter=expired"
                onClick={handleCloseStatusUpdateModal}
                className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-4 hover:bg-white/[0.06] hover:border-red-500/30 transition-all cursor-pointer no-underline block"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${inactiveCount > 0 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-white/5 text-text-muted border-white/10'}`}>
                    <Zap size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Inactive Members</h4>
                    <p className="text-[10px] text-text-muted font-bold mt-0.5 font-normal normal-case">
                      {inactiveCount > 0 ? inactiveCount + " members currently inactive" : 'All members active'}
                    </p>
                  </div>
                </div>
                <span className={`text-[13px] font-black px-2.5 py-0.5 rounded-lg border ${inactiveCount > 0 ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-white/5 text-text-muted border-white/10'}`}>
                  {inactiveCount}
                </span>
              </Link>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleCloseStatusUpdateModal}
                className="flex-1 py-3 text-xs font-extrabold uppercase tracking-widest rounded-xl transition-all duration-300 bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary active:scale-95 cursor-pointer"
              >
                Dismiss
              </button>
              <Link
                href="/members"
                onClick={handleCloseStatusUpdateModal}
                className="flex-1 py-3 text-xs font-extrabold uppercase tracking-widest rounded-xl transition-all duration-300 bg-accent text-black hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/20 active:scale-95 cursor-pointer text-center no-underline"
              >
                View Members
              </Link>
            </div>
          </div>
        </Modal>
      )}

      {showFollowupReminderModal && todaysFollowupCount > 0 && (
        <Modal
          isOpen={showFollowupReminderModal}
          onClose={() => setShowFollowupReminderModal(false)}
          title="Daily Follow-Up Reminder"
          size="sm"
        >
          <div className="space-y-6 text-center py-2 px-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shadow-lg shadow-accent/5 animate-pulse">
              <Calendar size={28} strokeWidth={2.5} />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-white tracking-tight">Today's Agenda</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                You have <span className="text-white font-black text-base px-1">{todaysFollowupCount}</span> lead{todaysFollowupCount > 1 ? 's' : ''} scheduled for follow-up today.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowFollowupReminderModal(false)}
                className="flex-1 py-3 text-xs font-extrabold uppercase tracking-widest rounded-xl transition-all duration-300 bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary active:scale-95 cursor-pointer"
              >
                Dismiss
              </button>
              <Link
                href="/leads?filter=pending_followups&today=true"
                onClick={() => setShowFollowupReminderModal(false)}
                className="flex-1 py-3 text-xs font-extrabold uppercase tracking-widest rounded-xl transition-all duration-300 bg-accent text-black hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/20 active:scale-95 cursor-pointer text-center no-underline"
              >
                Update the Leads
              </Link>
            </div>
          </div>
        </Modal>
      )}

      {showStaleLeadsModal && (staleLeadsCount > 0 || unpaidPayroll.trainersCount > 0 || unpaidPayroll.staffCount > 0 || pendingClients.count > 0) && (
        <Modal
          isOpen={showStaleLeadsModal}
          onClose={() => setShowStaleLeadsModal(false)}
          title="Previous Month Pending Tasks"
          size="xl"
        >
          <div className="py-2 px-6">
            {(() => {
              const colsCount = (staleLeadsCount > 0 ? 1 : 0) + 
                                (pendingClients.count > 0 ? 1 : 0) + 
                                (unpaidPayroll.trainersCount > 0 || unpaidPayroll.staffCount > 0 ? 1 : 0);
              return (
                <div className={`grid grid-cols-1 ${colsCount === 3 ? 'md:grid-cols-3' : colsCount === 2 ? 'md:grid-cols-2' : ''} gap-4 text-left`}>
                  {staleLeadsCount > 0 && (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between h-full min-h-[160px]">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider whitespace-nowrap">Leads Status</span>
                          <Badge variant="warning" size="sm" className="font-bold border border-amber-500/10 shrink-0">{staleLeadsCount} Pending</Badge>
                        </div>
                        <p className="text-[11px] text-text-secondary leading-relaxed normal-case">
                          You have {staleLeadsCount} leads from the previous month whose statuses are not updated.
                        </p>
                      </div>
                      <Link
                        href="/leads?filter=stale"
                        onClick={() => setShowStaleLeadsModal(false)}
                        className="w-full bg-accent hover:bg-accent-hover text-black font-black py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all text-[10px] uppercase tracking-wider no-underline text-center mt-4"
                      >
                        View Pending Leads
                      </Link>
                    </div>
                  )}

                  {pendingClients.count > 0 && (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between h-full min-h-[160px]">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider whitespace-nowrap">Client Payments</span>
                          <Badge variant="success" size="sm" className="font-bold border border-emerald-500/10 shrink-0">{pendingClients.count} Pending</Badge>
                        </div>
                        <p className="text-[11px] text-text-secondary leading-relaxed normal-case">
                          You have {pendingClients.count} clients whose membership expired in the previous month and are pending renewal (Total Value: ₹{pendingClients.amount.toLocaleString()}).
                        </p>
                      </div>
                      <Link
                        href="/members?filter=expired"
                        onClick={() => setShowStaleLeadsModal(false)}
                        className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-black py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all text-[10px] uppercase tracking-wider no-underline text-center mt-4"
                      >
                        View Expired Members
                      </Link>
                    </div>
                  )}

                  {(unpaidPayroll.trainersCount > 0 || unpaidPayroll.staffCount > 0) && (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between h-full min-h-[160px]">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider whitespace-nowrap">Salary Payments</span>
                          <Badge variant="danger" size="sm" className="font-bold border border-red-500/10">
                            {unpaidPayroll.trainersCount + unpaidPayroll.staffCount} Unpaid
                          </Badge>
                        </div>
                        <div className="text-[11px] text-text-secondary space-y-1.5 normal-case leading-relaxed">
                          <p>You have unpaid salaries from the previous month:</p>
                          <ul className="list-disc pl-4 space-y-1 text-[11px]">
                            {unpaidPayroll.trainersCount > 0 && (
                              <li>
                                Trainers: <span className="text-white font-bold">{unpaidPayroll.trainersCount}</span> unpaid (Total: ₹{unpaidPayroll.trainersAmount.toLocaleString()})
                              </li>
                            )}
                            {unpaidPayroll.staffCount > 0 && (
                              <li>
                                Staff: <span className="text-white font-bold">{unpaidPayroll.staffCount}</span> unpaid (Total: ₹{unpaidPayroll.staffAmount.toLocaleString()})
                              </li>
                            )}
                          </ul>
                          <p className="pt-1 text-[10px] text-text-muted font-bold">
                            Total Outstanding: ₹{(unpaidPayroll.trainersAmount + unpaidPayroll.staffAmount).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Link
                          href="/trainers"
                          onClick={() => setShowStaleLeadsModal(false)}
                          className="flex-1 bg-accent hover:bg-accent-hover text-black font-black py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all text-[10px] uppercase tracking-wider no-underline text-center"
                        >
                          Pay Trainers
                        </Link>
                        <Link
                          href="/staff"
                          onClick={() => setShowStaleLeadsModal(false)}
                          className="flex-1 bg-[#f58220] hover:bg-[#d46a13] text-white font-black py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all text-[10px] uppercase tracking-wider no-underline text-center"
                        >
                          Pay Staff
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </Modal>
      )}
    </div>
  );
}
