'use client';
import { useState, useEffect } from 'react';
import { analyticsApi } from '@/lib/api';
import { 
  TrendingUp, TrendingDown, Clock, Activity, Zap, 
  Calendar, Users, IndianRupee, AlertCircle, ShieldAlert,
  ArrowUpRight, ArrowDownRight, Compass, Settings, CheckCircle2, X
} from 'lucide-react';

export default function Dashboard1() {
  const [filter, setFilter] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      let params = `filter=${filter}`;
      if (filter === 'custom' && startDate && endDate) {
        params += `&startDate=${startDate}&endDate=${endDate}`;
      }
      const res = await analyticsApi.getDashboard1(params);
      if (res.success) {
        setData(res.data);
        setError('');
      } else {
        setError(res.message || 'Failed to load executive summary');
      }
    } catch (err) {
      console.error(err);
      setError('Connection to analytics API failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (filter !== 'custom' || (startDate && endDate)) {
      fetchAnalytics();
    }
  }, [filter, startDate, endDate]);

  const handleCustomFilterSubmit = (e) => {
    e.preventDefault();
    if (startDate && endDate) {
      fetchAnalytics();
    }
  };

  const p = data?.predictions || {};
  const w = data?.weeklySummary || {};
  const recs = data?.recommendations || [];

  return (
    <div className="text-white pb-12 space-y-8">
      {/* Top Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight">Executive Summary</h1>
          <p className="text-xs text-text-muted font-bold uppercase tracking-widest mt-1 opacity-70 flex items-center gap-1.5">
            <Compass size={13} className="text-accent" />
            Daily & weekly predictions, forecasts and recommendations
          </p>
        </div>

        {/* Dynamic Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="bg-[#0f0f11] p-1 rounded-2xl border border-white/5 flex gap-1 self-start">
            {[
              { label: 'Today', value: 'today' },
              { label: 'This Week', value: 'week' },
              { label: 'This Month', value: 'month' },
              { label: 'Last Month', value: 'last_month' },
              { label: 'Custom Range', value: 'custom' },
            ].map(item => (
              <button
                key={item.value}
                onClick={() => setFilter(item.value)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${filter === item.value ? 'bg-accent text-black shadow-lg shadow-accent/20' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {filter === 'custom' && (
            <form onSubmit={handleCustomFilterSubmit} className="flex items-center gap-2 bg-[#0f0f11] p-2 border border-white/5 rounded-2xl animate-in fade-in slide-in-from-right-3 duration-200">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-xl px-2 py-1 text-[10px] font-black text-white outline-none focus:border-accent/40"
              />
              <span className="text-[10px] text-text-muted uppercase font-bold">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-xl px-2 py-1 text-[10px] font-black text-white outline-none focus:border-accent/40"
              />
            </form>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Aggregating gym metrics...</p>
        </div>
      ) : error ? (
        <div className="bg-danger/5 border border-danger/10 p-6 rounded-2xl flex items-center gap-4 text-danger">
          <AlertCircle size={24} />
          <div>
            <h4 className="text-sm font-bold">Failed to load Business Intelligence</h4>
            <p className="text-xs opacity-80 mt-1">{error}</p>
          </div>
        </div>
      ) : (
        <>
          {/* TODAY'S PREDICTIONS CARDS */}
          <div className="space-y-4">
            <h2 className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">Today's Predictions & Forecasts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* CARD 1: Peak Time Today */}
              <div className="relative group bg-[#0d0d0f] border border-white/5 rounded-2xl p-6 transition-all hover:border-accent/30 overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 p-3 text-white/5 group-hover:text-accent/10 transition-colors">
                  <Activity size={80} strokeWidth={1} />
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-accent uppercase tracking-widest mb-4">
                  <Clock size={12} />
                  <span>Peak Time Today</span>
                </div>
                <h3 className="text-xl font-black text-white tracking-tight">{p.peakTime?.range || '-'}</h3>
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-1">Expected visitors</p>
                <div className="text-2xl font-black text-white mt-2 flex items-baseline gap-1">
                  {p.peakTime?.expectedVisitors !== undefined && p.peakTime?.expectedVisitors !== null ? p.peakTime.expectedVisitors : '-'}
                  <span className="text-[10px] text-text-muted font-normal">members / hour</span>
                </div>
              </div>

              {/* CARD 2: Quiet Time Today */}
              <div className="relative group bg-[#0d0d0f] border border-white/5 rounded-2xl p-6 transition-all hover:border-accent/30 overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 p-3 text-white/5 group-hover:text-accent/10 transition-colors">
                  <Zap size={80} strokeWidth={1} />
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-4">
                  <Activity size={12} />
                  <span>Quiet Time Today</span>
                </div>
                <h3 className="text-xl font-black text-white tracking-tight">{p.quietTime?.range || '-'}</h3>
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-1">Expected visitors</p>
                <div className="text-2xl font-black text-white mt-2 flex items-baseline gap-1">
                  {p.quietTime?.expectedVisitors !== undefined && p.quietTime?.expectedVisitors !== null ? p.quietTime.expectedVisitors : '-'}
                  <span className="text-[10px] text-text-muted font-normal">members / hour</span>
                </div>
              </div>

              {/* CARD 3: Revenue Forecast */}
              <div className="relative group bg-[#0d0d0f] border border-white/5 rounded-2xl p-6 transition-all hover:border-accent/30 overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 p-3 text-white/5 group-hover:text-accent/10 transition-colors">
                  <IndianRupee size={80} strokeWidth={1} />
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-4">
                  <IndianRupee size={12} />
                  <span>Revenue Forecast</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-black text-white">
                      {p.revenueForecast?.thisWeek !== undefined && p.revenueForecast?.thisWeek !== null ? `₹${p.revenueForecast.thisWeek.toLocaleString()}` : '₹-'}
                    </span>
                    <p className="text-[8px] text-text-muted font-bold uppercase tracking-widest">Expected this week</p>
                  </div>
                  <div>
                    <span className="text-sm font-black text-white">
                      {p.revenueForecast?.thisMonth !== undefined && p.revenueForecast?.thisMonth !== null ? `₹${p.revenueForecast.thisMonth.toLocaleString()}` : '₹-'}
                    </span>
                    <p className="text-[8px] text-text-muted font-bold uppercase tracking-widest">Expected this month</p>
                  </div>
                </div>
              </div>

              {/* CARD 4: At-Risk Members */}
              <div className="relative group bg-[#0d0d0f] border border-white/5 rounded-2xl p-6 transition-all hover:border-accent/30 overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 p-3 text-white/5 group-hover:text-red-500/10 transition-colors">
                  <Users size={80} strokeWidth={1} />
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-red-400 uppercase tracking-widest mb-4">
                  <ShieldAlert size={12} />
                  <span>At-Risk Members</span>
                </div>
                <h3 className="text-3xl font-black text-red-500 tracking-tight">
                  {p.atRisk?.count !== undefined && p.atRisk?.count !== null ? p.atRisk.count : '-'}
                </h3>
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-1">Inactive &gt;= 14 Days</p>
                <p className="text-[9px] text-[#86868b] mt-3">Action required: nudge with comeback rewards.</p>
              </div>
            </div>
          </div>

          {/* WEEKLY SUMMARY SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-1 lg:col-span-2 bg-[#0d0d0f] border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
              <h2 className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">Summary Comparison Panel</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Attendance Growth */}
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Attendance Change</p>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-black text-white">
                      {w.attendanceGrowth !== undefined && w.attendanceGrowth !== null 
                        ? `${w.attendanceGrowth > 0 ? '+' : ''}${parseFloat(w.attendanceGrowth).toFixed(1)}%` 
                        : '-'}
                    </span>
                    {w.attendanceGrowth !== undefined && w.attendanceGrowth !== null && (
                      <div className={`p-1.5 rounded-lg ${w.attendanceGrowth >= 0 ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
                        {w.attendanceGrowth >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      </div>
                    )}
                  </div>
                  <p className="text-[9px] text-text-muted">Compared to previous period of same length</p>
                </div>

                {/* Revenue Growth */}
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Revenue Change</p>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-black text-white">
                      {w.revenueGrowth !== undefined && w.revenueGrowth !== null 
                        ? `${w.revenueGrowth > 0 ? '+' : ''}${parseFloat(w.revenueGrowth).toFixed(1)}%` 
                        : '-'}
                    </span>
                    {w.revenueGrowth !== undefined && w.revenueGrowth !== null && (
                      <div className={`p-1.5 rounded-lg ${w.revenueGrowth >= 0 ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
                        {w.revenueGrowth >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      </div>
                    )}
                  </div>
                  <p className="text-[9px] text-text-muted">Compared to previous period of same length</p>
                </div>
              </div>

              {/* Peak Day, Quiet Day & Popular Plan */}
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="text-center">
                  <p className="text-[8px] text-text-muted font-bold uppercase tracking-widest">Peak Attendance Day</p>
                  <p className="text-sm font-black text-accent mt-1">{w.peakDay || '-'}</p>
                </div>
                <div className="text-center border-x border-white/5">
                  <p className="text-[8px] text-text-muted font-bold uppercase tracking-widest">Quiet Attendance Day</p>
                  <p className="text-sm font-black text-indigo-400 mt-1">{w.quietDay || '-'}</p>
                </div>
                <div className="text-center">
                  <p className="text-[8px] text-text-muted font-bold uppercase tracking-widest">Most Popular Plan</p>
                  <p className="text-sm font-black text-white mt-1 capitalize">{w.mostPopularPlan || '-'}</p>
                </div>
              </div>
            </div>

            {/* QUICK STATS SIDEBAR */}
            <div className="bg-gradient-to-br from-[#121215] to-[#0a0a0b] border border-white/5 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden shadow-xl">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/5 rounded-full blur-3xl" />
              <div>
                <h3 className="text-lg font-black tracking-tight leading-tight">Insight Generator</h3>
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-1">Real-time analytical recommendations</p>
                
                <div className="mt-6 space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs shrink-0 text-accent font-bold">⚡</div>
                    <div>
                      <p className="text-xs font-bold text-white">Peak Hour Range</p>
                      <p className="text-[10px] text-text-muted leading-relaxed mt-0.5">
                        Expect up to {p.peakTime?.expectedVisitors !== undefined && p.peakTime?.expectedVisitors !== null ? p.peakTime.expectedVisitors : '-'} members between {p.peakTime?.range || '-'}.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs shrink-0 text-indigo-400 font-bold">🌙</div>
                    <div>
                      <p className="text-xs font-bold text-white">Quiet Hour Savings</p>
                      <p className="text-[10px] text-text-muted leading-relaxed mt-0.5">
                        Only {p.quietTime?.expectedVisitors !== undefined && p.quietTime?.expectedVisitors !== null ? p.quietTime.expectedVisitors : '-'} visitors typical during {p.quietTime?.range || '-'}.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-white/5 flex items-center justify-between text-[9px] font-bold text-text-muted uppercase tracking-wider">
                <span>Calculations Updated</span>
                <span className="text-white">Just Now</span>
              </div>
            </div>
          </div>

          {/* BUSINESS RECOMMENDATIONS */}
          <div className="space-y-4">
            <h2 className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">Actionable Business Recommendations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recs.map((rec, i) => {
                let statusColor = 'border-l-indigo-500 bg-indigo-500/5';
                let icon = <Compass className="text-indigo-400 shrink-0" size={18} />;

                if (rec.severity === 'danger') {
                  statusColor = 'border-l-danger bg-danger/5';
                  icon = <AlertCircle className="text-danger shrink-0" size={18} />;
                } else if (rec.severity === 'warning') {
                  statusColor = 'border-l-warning bg-warning/5';
                  icon = <ShieldAlert className="text-warning shrink-0" size={18} />;
                } else if (rec.severity === 'success') {
                  statusColor = 'border-l-success bg-success/5';
                  icon = <CheckCircle2 className="text-success shrink-0" size={18} />;
                }

                return (
                  <div 
                    key={i} 
                    className={`px-5 py-4 border-l-2 rounded-r-2xl transition-all duration-300 flex gap-4 ${statusColor}`}
                  >
                    <div className="mt-0.5">{icon}</div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">{rec.title}</h4>
                      <p className="text-[11px] text-text-secondary leading-relaxed">{rec.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
