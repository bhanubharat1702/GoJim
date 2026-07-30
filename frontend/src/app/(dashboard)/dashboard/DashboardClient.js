'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { membersApi } from '@/lib/api';
import { StatCard, Badge } from '@/components/UI';
import {
  Activity, IndianRupee, Users, Clock, UserPlus,
  CreditCard, Target, UserCheck, Calendar,
  ChevronRight, ChevronLeft, Search, Filter, MoreHorizontal,
  Smartphone, Dumbbell, Zap, Coins, AlertCircle, Eye, X, ChevronDown, AlertTriangle
} from 'lucide-react';

// Dynamic Imports for Modals & Drawer to minimize JS bundle size and compilation blocking
const TrendDrawer = dynamic(() => import('./TrendDrawer'), { ssr: false });
const DashboardModals = dynamic(() => import('./DashboardModals'), { ssr: false });

export default function DashboardClient({
  stats,
  recentMembers,
  recentPayments,
  attendanceTrend,
  trainers,
  allMembers,
  allLeads,
  allAttendance,
  payments,
  expenses,
  incomeChartData,
  last6MonthsData,
  dailyProfitsThisMonth,
  gymInsights,
  todaysFollowupCount,
  expiringTodayCount,
  inactiveCount,
  initialTableMembers
}) {
  const [members, setMembers] = useState(initialTableMembers || []);
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, month: '', year: '', profit: 0, expense: 0 });
  const [showFollowupReminderModal, setShowFollowupReminderModal] = useState(false);
  const [showStatusUpdateModal, setShowStatusUpdateModal] = useState(false);
  const [showStaleLeadsModal, setShowStaleLeadsModal] = useState(false);
  
  // Static alerts placeholder state as per original design
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
  const [memberSearch, setMemberSearch] = useState('');
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState('');
  const [memberSort, setMemberSort] = useState('-joinDate');

  const openTrendDrawer = () => {
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
    return m.planExpiry ? new Date(m.planExpiry) : null;
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

  const handleCloseStatusUpdateModal = () => {
    setShowStatusUpdateModal(false);
    if (todaysFollowupCount > 0) {
      setTimeout(() => {
        setShowFollowupReminderModal(true);
      }, 300);
    }
  };

  // Notification Modal Trigger Timer
  useEffect(() => {
    const timer = setTimeout(() => {
      if (staleLeadsCount > 0 || unpaidPayroll.trainersCount > 0 || unpaidPayroll.staffCount > 0 || pendingClients.count > 0) {
        setShowStaleLeadsModal(true);
      } else if (expiringTodayCount > 0 || inactiveCount > 0) {
        setShowStatusUpdateModal(true);
      } else if (todaysFollowupCount > 0) {
        setShowFollowupReminderModal(true);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [staleLeadsCount, unpaidPayroll, pendingClients, expiringTodayCount, inactiveCount, todaysFollowupCount]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedMemberSearch(memberSearch), 400);
    return () => clearTimeout(timer);
  }, [memberSearch]);

  // Fetch search results on query or sort change
  useEffect(() => {
    let active = true;
    const fetchMembers = async () => {
      try {
        const res = await membersApi.getAll(`limit=5&sort=${memberSort}&search=${debouncedMemberSearch}`);
        if (res.success && active) setMembers(res.data);
      } catch (err) { console.error('Error fetching dashboard members:', err); }
    };
    fetchMembers();
    return () => {
      active = false;
    };
  }, [debouncedMemberSearch, memberSort]);

  // Insights Ticker Carousel
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

  const s = stats || {};
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

  // Chart Layout math
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
                {/* Visual slide pagination indicator dots */}
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

                  const isProfitableTrend = incomeChartData.trend === 'up';
                  const currentColor = isProfitableTrend ? '#b8f175' : '#f58220';
                  const currentShadowClass = isProfitableTrend
                    ? 'drop-shadow-[0_4px_10px_rgba(184,241,117,0.4)]'
                    : 'drop-shadow-[0_4px_10px_rgba(245,130,32,0.4)]';
                  const currentGlowShadow = isProfitableTrend
                    ? '0 2px 6px rgba(184, 241, 117, 0.6)'
                    : '0 2px 6px rgba(245, 130, 32, 0.6)';

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
                      <span className="text-danger font-black font-extrabold">-{formatted}</span>
                    ) : (
                      formatted
                    );
                  })()}
                  trend={(payments.length > 0 || expenses.length > 0) && s.profitTrendPercent !== undefined ? `${Math.abs(s.profitTrendPercent).toFixed(1)}%` : '0%'}
                  trendUp={s.profitTrendPercent >= 0}
                  subtitle="This month"
                  onClick={() => { }}
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

            {/* Revenue Analytics Chart */}
            <div className="col-span-12 lg:col-span-7 card bg-[#0d0d0d] border border-white/5 rounded-xl p-8 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black tracking-tighter">Income and Expenses</h2>
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
                        <div className="w-full h-full pb-1 flex items-end justify-center gap-[3px] sm:gap-[4px]">
                          <div
                            className="w-[10px] sm:w-[14px] bg-accent rounded-t-sm sm:rounded-t transition-all duration-700 hover:brightness-110 shadow-[0_0_10px_rgba(184,241,117,0.15)]"
                            style={{ height: `${incomeHeight}%` }}
                          />
                          <div
                            className="w-[10px] sm:w-[14px] bg-red-500 rounded-t-sm sm:rounded-t transition-all duration-700 hover:brightness-110"
                            style={{ height: `${expenseHeight}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mt-2 shrink-0">{item.month}</span>
                      </div>
                    );
                  })}
                </div>

                {tooltip.show && (
                  <div
                    className="absolute bg-[#0d0d0d]/90 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-white z-50 pointer-events-none flex flex-col whitespace-nowrap gap-1 shadow-2xl backdrop-blur-lg transition-all duration-75"
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

      {/* Slide-in Trend Drawer loaded dynamically */}
      <TrendDrawer
        isOpen={showTrendDrawer}
        onClose={closeTrendDrawer}
        incomeChartData={incomeChartData}
        last6MonthsData={last6MonthsData}
        dailyProfitsThisMonth={dailyProfitsThisMonth}
        currentMonth={currentMonth}
        prevMonthName={prevMonthName}
        currentDayOrdinal={currentDayOrdinal}
        formatCompactValue={formatCompactValue}
      />

      {/* Pop-up Modals loaded dynamically */}
      <DashboardModals
        showStatusUpdateModal={showStatusUpdateModal}
        setShowStatusUpdateModal={setShowStatusUpdateModal}
        showFollowupReminderModal={showFollowupReminderModal}
        setShowFollowupReminderModal={setShowFollowupReminderModal}
        showStaleLeadsModal={showStaleLeadsModal}
        setShowStaleLeadsModal={setShowStaleLeadsModal}
        expiringTodayCount={expiringTodayCount}
        inactiveCount={inactiveCount}
        todaysFollowupCount={todaysFollowupCount}
        staleLeadsCount={staleLeadsCount}
        unpaidPayroll={unpaidPayroll}
        pendingClients={pendingClients}
        handleCloseStatusUpdateModal={handleCloseStatusUpdateModal}
      />
    </div>
  );
}
