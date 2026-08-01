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

const getCachedTableMembers = unstable_cache(
  async (token) => {
    try {
      const res = await fetch(`${baseUrl}/members?limit=5&sort=-joinDate`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.ok ? await res.json() : { success: false, data: [] };
    } catch (err) {
      return { success: false, data: [] };
    }
  },
  ['dashboard-table-members'],
  { revalidate: 60, tags: ['members'] }
);

const getCachedTodayLeads = unstable_cache(
  async (token) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`${baseUrl}/leads?limit=50&followUpDate=${today}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.ok ? await res.json() : { success: false, data: [] };
    } catch (err) {
      return { success: false, data: [] };
    }
  },
  ['dashboard-today-leads'],
  { revalidate: 60, tags: ['leads'] }
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

function calculateGymInsights(incomeChartData, expenses, stats) {
  const list = [];
  const now = new Date();
  
  // Welcome message is pre-seeded with placeholder name and updated client side with user name
  list.push({
    id: 'welcome',
    type: 'info',
    text: `Welcome back, Gym Owner! Have a great day managing your gym today.`
  });

  const isBrandNewGym = (stats.totalMembers === 0 && stats.totalTrainers === 0 && expenses.length === 0 && stats.totalLeads === 0);
  if (isBrandNewGym) {
    return list;
  }

  if (stats.totalMembers === 0) {
    list.push({
      id: 'setup-members',
      type: 'target',
      text: `Setup Guide: You haven't registered any members yet. Click the "Add a Client" button below to add your first member.`
    });
  }

  if (stats.totalTrainers === 0) {
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

  if (stats.inactiveMembers > 0) {
    list.push({
      id: 'churn-prediction',
      type: 'danger',
      text: `Retention Alert: ${stats.inactiveMembers} active members haven't visited in over 2 weeks. Reaching out to them can help save your recurring revenue.`
    });
  }

  const activeLeadsCount = stats.totalLeads || 0; // approximation if we don't have exact active leads
  if (activeLeadsCount > 0) {
    list.push({
      id: 'conversion-prediction',
      type: 'target',
      text: `Sales Opportunity: Keep following up with your active leads to boost this month's revenue.`
    });
  }

  const monthlyRecurringRevenue = stats.monthlyRevenue || 0;
  
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
      list.push({
        id: 'financial-runway',
        type: 'warning',
        text: `Alert: Your monthly membership fees (₹${Math.round(monthlyRecurringRevenue).toLocaleString()}) are lower than your average monthly expenses (₹${Math.round(baselineExpenses).toLocaleString()}) by ₹${Math.round(deficit).toLocaleString()}.`
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
    tableMembersRes
  ] = await Promise.all([
    getCachedDashboard(token),
    getCachedTrainers(token),
    getCachedPayments(startOfPrevMonthStr, token),
    getCachedExpenses(startOfPrevMonthStr, token),
    getCachedTodayLeads(token),
    getCachedTableMembers(token)
  ]);

  const data = dashRes.success ? dashRes.data : {};
  const stats = data.stats || {};
  const trainers = trainRes.success ? trainRes.data : [];
  const payments = paymentsRes.success ? paymentsRes.data : [];
  const expenses = expensesRes.success ? expensesRes.data : [];
  const todayLeads = leadsRes.success ? leadsRes.data : [];
  const initialTableMembers = tableMembersRes.success ? tableMembersRes.data : [];

  // Notifications criteria
  const expiringTodayCount = stats.expiringPlans || 0;
  const inactiveCount = stats.inactiveMembers || 0;

  const todaysFollowupCount = todayLeads.length;

  // Pre-calculate expensive items on the server
  const incomeChartData = calculateIncomeChartData(payments, expenses);
  const last6MonthsData = calculateLast6MonthsData(payments, expenses);
  const dailyProfitsThisMonth = calculateDailyProfitsThisMonth(payments, expenses);
  const gymInsights = calculateGymInsights(
    incomeChartData,
    expenses,
    stats
  );

  return (
    <DashboardClient
      stats={stats}
      recentMembers={data.recentMembers || []}
      recentPayments={data.recentPayments || []}
      attendanceTrend={data.attendanceTrend || []}
      trainers={[]}
      allMembers={[]}
      allLeads={[]}
      allAttendance={[]}
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
