import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import DashboardSkeleton from './DashboardSkeleton';
import DashboardClient from './DashboardClient';

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

// Cache helpers for Next.js Server Components
const getCachedDashboard = unstable_cache(
  async (token) => {
    try {
      const res = await fetch(`${baseUrl}/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.ok ? await res.json() : { success: false, data: {} };
    } catch (err) {
      console.error('getCachedDashboard error:', err);
      return { success: false, data: {} };
    }
  },
  ['dashboard-data'],
  { revalidate: 15, tags: ['dashboard'] }
);

const getCachedTrainers = unstable_cache(
  async (token) => {
    try {
      const res = await fetch(`${baseUrl}/trainers?limit=1000`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.ok ? await res.json() : { success: false, data: [] };
    } catch (err) {
      console.error('getCachedTrainers error:', err);
      return { success: false, data: [] };
    }
  },
  ['dashboard-trainers'],
  { revalidate: 15, tags: ['trainers'] }
);

const getCachedPayments = unstable_cache(
  async (startOfPrevMonthStr, token) => {
    try {
      const res = await fetch(`${baseUrl}/payments?status=paid&startDate=${startOfPrevMonthStr}&limit=500`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.ok ? await res.json() : { success: false, data: [] };
    } catch (err) {
      console.error('getCachedPayments error:', err);
      return { success: false, data: [] };
    }
  },
  ['dashboard-payments'],
  { revalidate: 15, tags: ['payments'] }
);

const getCachedExpenses = unstable_cache(
  async (startOfPrevMonthStr, token) => {
    try {
      const res = await fetch(`${baseUrl}/expenses?startDate=${startOfPrevMonthStr}&limit=500`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.ok ? await res.json() : { success: false, data: [] };
    } catch (err) {
      console.error('getCachedExpenses error:', err);
      return { success: false, data: [] };
    }
  },
  ['dashboard-expenses'],
  { revalidate: 15, tags: ['expenses'] }
);

const getCachedLeads = unstable_cache(
  async (token) => {
    try {
      const res = await fetch(`${baseUrl}/leads?limit=200`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.ok ? await res.json() : { success: false, data: [] };
    } catch (err) {
      console.error('getCachedLeads error:', err);
      return { success: false, data: [] };
    }
  },
  ['dashboard-leads'],
  { revalidate: 15, tags: ['leads'] }
);

const getCachedMembers = unstable_cache(
  async (token) => {
    try {
      const res = await fetch(`${baseUrl}/members?limit=500`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.ok ? await res.json() : { success: false, data: [] };
    } catch (err) {
      console.error('getCachedMembers error:', err);
      return { success: false, data: [] };
    }
  },
  ['dashboard-members'],
  { revalidate: 15, tags: ['members'] }
);

const getCachedAttendance = unstable_cache(
  async (thirtyDaysAgoStr, token) => {
    try {
      const res = await fetch(`${baseUrl}/attendance?startDate=${thirtyDaysAgoStr}&limit=500`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.ok ? await res.json() : { success: false, data: [] };
    } catch (err) {
      console.error('getCachedAttendance error:', err);
      return { success: false, data: [] };
    }
  },
  ['dashboard-attendance'],
  { revalidate: 15, tags: ['attendance'] }
);

const getCachedTableMembers = unstable_cache(
  async (token) => {
    try {
      const res = await fetch(`${baseUrl}/members?limit=5&sort=-joinDate`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.ok ? await res.json() : { success: false, data: [] };
    } catch (err) {
      console.error('getCachedTableMembers error:', err);
      return { success: false, data: [] };
    }
  },
  ['dashboard-table-members'],
  { revalidate: 15, tags: ['members'] }
);

// Heavy Data Calculation Helpers (Executed Server-Side)
function calculateIncomeChartData(payments, expenses) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const getDaysInMonth = (m, y) => new Date(y, m + 1, 0).getDate();
  const daysInPrevMonth = getDaysInMonth(prevMonth, prevMonthYear);

  const dailyIncomePrev = Array(daysInPrevMonth).fill(0);
  const dailyIncomeCurrent = Array(currentDay).fill(0);
  const dailyExpensePrev = Array(daysInPrevMonth).fill(0);
  const dailyExpenseCurrent = Array(currentDay).fill(0);

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
}

function calculateLast6MonthsData(payments, expenses) {
  const months = [];
  const now = new Date();
  const hasRealData = payments.length > 0 || expenses.length > 0;

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      monthIndex: d.getMonth(),
      monthName: d.toLocaleString('default', { month: 'short' }).toUpperCase(),
      year: d.getFullYear(),
      income: 0,
      expense: 0,
      profit: 0
    });
  }

  if (hasRealData) {
    const currentDay = now.getDate();

    payments.forEach(p => {
      if (p.status !== 'paid') return;
      const pDate = new Date(p.paymentDate || p.createdAt);
      if (isNaN(pDate.getTime())) return;
      if (pDate.getDate() > currentDay) return;

      const amount = p.amount || 0;
      months.forEach(m => {
        if (pDate.getMonth() === m.monthIndex && pDate.getFullYear() === m.year) {
          m.income += amount;
          m.profit += amount;
        }
      });
    });

    expenses.forEach(e => {
      const eDate = new Date(e.date || e.createdAt);
      if (isNaN(eDate.getTime())) return;
      if (eDate.getDate() > currentDay) return;

      const amount = e.amount || 0;
      months.forEach(m => {
        if (eDate.getMonth() === m.monthIndex && eDate.getFullYear() === m.year) {
          m.expense += amount;
          m.profit -= amount;
        }
      });
    });
  }

  return months;
}

function calculateDailyProfitsThisMonth(payments, expenses) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();
  const currentDay = now.getDate();
  
  const days = [];
  const hasRealData = payments.length > 0 || expenses.length > 0;

  for (let d = 1; d <= currentDay; d++) {
    days.push({
      dayNum: d,
      label: `${now.toLocaleString('default', { month: 'short' }).toUpperCase()} ${d}`,
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
}

function calculateGymInsights(incomeChartData, expenses, inactiveCount, expiringTodayCount, trainers, allMembers, allLeads, allAttendance) {
  const list = [];
  const now = new Date();
  
  // Welcome message is pre-seeded with placeholder name and updated client side with user name
  list.push({
    id: 'welcome',
    type: 'info',
    text: `Welcome back, Gym Owner! Have a great day managing your gym today.`
  });

  const isBrandNewGym = allMembers.length === 0 && trainers.length === 0 && expenses.length === 0 && allLeads.length === 0;
  if (isBrandNewGym) {
    return list;
  }

  const activeMembersCount = allMembers.filter(m => m.status === 'active').length;
  const ptTrainers = trainers.filter(t => t.trainerType === 'PT Trainer' || t.trainerType === 'PT + Trainer');
  const activeLeadsList = allLeads.filter(l => l.status !== 'joined' && l.status !== 'lost');

  if (allMembers.length === 0) {
    list.push({
      id: 'setup-members',
      type: 'target',
      text: `Setup Guide: You haven't registered any members yet. Click the "Add a Client" button below to add your first member.`
    });
  }

  if (trainers.length === 0) {
    list.push({
      id: 'setup-trainers',
      type: 'info',
      text: `Setup Guide: No staff registered. Go to the "Trainers" tab in the navigation menu to add your coaching team.`
    });
  }

  if (expenses.length === 0) {
    list.push({
      id: 'setup-expenses',
      type: 'warning',
      text: `Setup Guide: Start logging your operating expenses (rent, salaries, utility bills) in the "Expenses" tab to track net profits.`
    });
  }

  if (allLeads.length === 0) {
    list.push({
      id: 'setup-leads',
      type: 'target',
      text: `Setup Guide: You can track prospective gym inquiries in the "Leads" tab. Add them to set up follow-up reminders.`
    });
  }

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const highRiskMembers = allMembers.filter(m => {
    if (m.status !== 'active') return false;
    if (!m.lastAttendance) return true;
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

  const totalConvertedLeads = allLeads.filter(l => l.status === 'joined').length;
  const totalClosedLeads = allLeads.filter(l => l.status === 'joined' || l.status === 'lost').length;
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

  const activeMembers = allMembers.filter(m => m.status === 'active');
  const monthlyRecurringRevenue = activeMembers.reduce((sum, m) => sum + (m.planAmount || 0), 0);
  
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

  if (baselineExpenses > 0 && thisMonthExpenseSum > baselineExpenses && expenses.length > 0) {
    const excess = thisMonthExpenseSum - baselineExpenses;
    list.push({
      id: 'expense-prediction',
      type: 'warning',
      text: `Warning: This month's expenses (₹${thisMonthExpenseSum.toLocaleString()}) are ₹${Math.round(excess).toLocaleString()} higher than your usual monthly average. Double-check recent purchases.`
    });
  }

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
      
      const dayName = weekdays[checkIn.getDay()];
      weekdayCounts[dayName] = (weekdayCounts[dayName] || 0) + 1;
      
      const hour = checkIn.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    let maxDayCount = -1;
    Object.keys(weekdayCounts).forEach(day => {
      if (weekdayCounts[day] > maxDayCount) {
        maxDayCount = weekdayCounts[day];
        peakWeekday = day;
      }
    });
    
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

  if (expiringTodayCount > 0) {
    list.push({
      id: 'expiring',
      type: 'warning',
      text: `Reminder: ${expiringTodayCount} client memberships expire today. Call them to renew their memberships.`
    });
  }

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
}

// Sub-component executing async data fetching and server calculations
async function DashboardServerRoster({ token }) {
  const now = new Date();
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startOfPrevMonthStr = startOfPrevMonth.toISOString().split('T')[0];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  const [
    dashRes,
    trainRes,
    paymentsRes,
    expensesRes,
    leadsRes,
    membersRes,
    attendanceRes,
    tableMembersRes
  ] = await Promise.all([
    getCachedDashboard(token),
    getCachedTrainers(token),
    getCachedPayments(startOfPrevMonthStr, token),
    getCachedExpenses(startOfPrevMonthStr, token),
    getCachedLeads(token),
    getCachedMembers(token),
    getCachedAttendance(thirtyDaysAgoStr, token),
    getCachedTableMembers(token)
  ]);

  const data = dashRes.success ? dashRes.data : {};
  const stats = data.stats || {};
  const trainers = trainRes.success ? trainRes.data : [];
  const payments = paymentsRes.success ? paymentsRes.data : [];
  const expenses = expensesRes.success ? expensesRes.data : [];
  const allLeads = leadsRes.success ? leadsRes.data : [];
  const allMembers = membersRes.success ? membersRes.data : [];
  const allAttendance = attendanceRes.success ? attendanceRes.data : [];
  const initialTableMembers = tableMembersRes.success ? tableMembersRes.data : [];

  // Notifications criteria
  const expiringTodayCount = stats.expiringPlans || 0;
  const inactiveCount = stats.inactiveMembers || 0;

  const todayStr = new Date().toDateString();
  const todaysFollowupCount = allLeads.filter(l => {
    if (!l.followUpDate) return false;
    if (l.status === 'joined' || l.status === 'lost') return false;
    return new Date(l.followUpDate).toDateString() === todayStr;
  }).length;

  // Pre-calculate expensive items on the server
  const incomeChartData = calculateIncomeChartData(payments, expenses);
  const last6MonthsData = calculateLast6MonthsData(payments, expenses);
  const dailyProfitsThisMonth = calculateDailyProfitsThisMonth(payments, expenses);
  const gymInsights = calculateGymInsights(
    incomeChartData,
    expenses,
    inactiveCount,
    expiringTodayCount,
    trainers,
    allMembers,
    allLeads,
    allAttendance
  );

  return (
    <DashboardClient
      stats={stats}
      recentMembers={data.recentMembers || []}
      recentPayments={data.recentPayments || []}
      attendanceTrend={data.attendanceTrend || []}
      trainers={trainers}
      allMembers={allMembers}
      allLeads={allLeads}
      allAttendance={allAttendance}
      payments={payments}
      expenses={expenses}
      incomeChartData={incomeChartData}
      last6MonthsData={last6MonthsData}
      dailyProfitsThisMonth={dailyProfitsThisMonth}
      gymInsights={gymInsights}
      todaysFollowupCount={todaysFollowupCount}
      expiringTodayCount={expiringTodayCount}
      inactiveCount={inactiveCount}
      initialTableMembers={initialTableMembers}
    />
  );
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('gojim_token')?.value;

  if (!token) {
    redirect('/login');
  }

  return (
    <div className="pb-2">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardServerRoster token={token} />
      </Suspense>
    </div>
  );
}
