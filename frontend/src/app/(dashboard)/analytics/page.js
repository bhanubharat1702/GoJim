'use client';
import { useState, useEffect } from 'react';
import { analyticsApi } from '@/lib/api';
import {
  Compass, Clock, Calendar, Users, IndianRupee, AlertCircle, ShieldAlert,
  TrendingUp, Activity, Award, UserCheck, Flame, CircleDot, Sparkles, BarChart2
} from 'lucide-react';

export default function AnalyticsPage() {
  const [filter, setFilter] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hoveredCell, setHoveredCell] = useState(null);
  const [hoveredTrend, setHoveredTrend] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      let params = `filter=${filter}`;
      if (filter === 'custom' && startDate && endDate) {
        params += `&startDate=${startDate}&endDate=${endDate}`;
      }
      const res = await analyticsApi.getVisuals(params);
      if (res.success) {
        setData(res.data);
        setError('');
      } else {
        setError(res.message || 'Failed to load visual analytics');
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

  // Safe data extraction with fallbacks
  const heatmap = data?.heatmap || [];
  const slotPercentages = data?.slotPercentages || { morning: 0, afternoon: 0, evening: 0, night: 0 };
  const attendanceTrend = data?.attendanceTrend || [];
  const peakDaysAnalysis = data?.peakDaysAnalysis || { data: [], highestDay: '-', lowestDay: '-' };
  const capacityUtilization = data?.capacityUtilization || { currentUtilization: 0, peakUtilization: 0, avgUtilization: 0, status: 'Low', capacity: 100 };
  const revenueForecast = data?.revenueForecast || { next7Days: { upcomingRenewals: 0, pendingCollections: 0, expectedRevenue: 0 }, next30Days: { upcomingRenewals: 0, pendingCollections: 0, expectedRevenue: 0 } };
  const atRiskGroups = data?.atRiskGroups || { days7: 0, days14: 0, days30: 0, days60: 0 };
  const planPerformance = data?.planPerformance || { data: [], bestPlan: '-' };
  const trainerDemand = data?.trainerDemand || { data: [], mostDemandedTrainer: '-' };

  // 1. Calculate Heatmap Max Count for Color Scaling
  let heatmapMax = 1;
  heatmap.forEach(day => {
    day.hours.forEach(hourObj => {
      if (hourObj.count > heatmapMax) heatmapMax = hourObj.count;
    });
  });

  // 2. Line Chart SVG calculations
  const trendMax = Math.max(...attendanceTrend.map(x => x.count), 5);
  const trendSvgWidth = 600;
  const trendSvgHeight = 160;
  const trendPoints = attendanceTrend.map((t, idx) => {
    const x = attendanceTrend.length > 1 ? (idx / (attendanceTrend.length - 1)) * trendSvgWidth : 0;
    const y = trendSvgHeight - (t.count / trendMax) * (trendSvgHeight - 20) - 10;
    return { x, y, date: t.date, count: t.count };
  });

  const trendLinePath = trendPoints.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const trendAreaPath = trendPoints.length > 0 
    ? `${trendLinePath} L ${trendPoints[trendPoints.length - 1].x} ${trendSvgHeight} L ${trendPoints[0].x} ${trendSvgHeight} Z`
    : '';

  // 3. Donut Chart segment stroke dash calculation
  const donutRadius = 50;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const donutSegments = [
    { label: 'Morning', value: slotPercentages.morning, color: '#b8f175' },
    { label: 'Afternoon', value: slotPercentages.afternoon, color: '#6366f1' },
    { label: 'Evening', value: slotPercentages.evening, color: '#ec4899' },
    { label: 'Night', value: slotPercentages.night, color: '#3b82f6' }
  ];

  let currentOffset = 0;

  return (
    <div className="text-white pb-12 space-y-8">
      {/* Top Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight">Business Intelligence & Analytics</h1>
          <p className="text-xs text-text-muted font-bold uppercase tracking-widest mt-1 opacity-70 flex items-center gap-1.5">
            <Compass size={13} className="text-accent" />
            Visual statistics, heatmaps, forecasts and resource utilization
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
          <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Compiling database visuals...</p>
        </div>
      ) : error ? (
        <div className="bg-danger/5 border border-danger/10 p-6 rounded-2xl flex items-center gap-4 text-danger">
          <AlertCircle size={24} />
          <div>
            <h4 className="text-sm font-bold">Failed to load Visual Analytics</h4>
            <p className="text-xs opacity-80 mt-1">{error}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">

          {/* SECTION 1: ATTENDANCE HEATMAP */}
          <div className="col-span-12 card bg-[#0d0d0f] border-white/5 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight">Attendance Hourly Heatmap</h2>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">Identify peak rush periods and slot utilization</p>
            </div>
            
            {/* Heatmap Grid */}
            <div className="mt-6 overflow-x-auto relative">
              <div className="min-w-[700px] space-y-1">
                {/* Hours Header Row */}
                <div className="flex items-center">
                  <div className="w-20 text-[9px] font-black text-text-muted uppercase tracking-wider">Day</div>
                  <div className="flex-1 flex justify-between">
                    {Array.from({ length: 18 }).map((_, i) => {
                      const h = i + 5;
                      const ampm = h >= 12 ? 'PM' : 'AM';
                      const displayH = h % 12 === 0 ? 12 : h % 12;
                      return (
                        <div key={h} className="w-8 text-center text-[8px] font-black text-text-muted uppercase">
                          {displayH} {ampm}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Weekday Rows */}
                {heatmap.map((dayRow) => (
                  <div key={dayRow.day} className="flex items-center">
                    <div className="w-20 text-[10px] font-bold text-text-secondary">{dayRow.day}</div>
                    <div className="flex-1 flex justify-between">
                      {dayRow.hours.map((hourObj) => {
                        const intensity = hourObj.count > 0 ? Math.max(0.1, hourObj.count / heatmapMax) : 0;
                        const cellStyle = hourObj.count > 0 
                          ? { backgroundColor: '#b8f175', opacity: intensity }
                          : { backgroundColor: 'transparent' };
                        
                        return (
                          <div
                            key={hourObj.hour}
                            onMouseEnter={(e) => setHoveredCell({
                              day: dayRow.day,
                              hour: hourObj.hour,
                              formattedHour: hourObj.formattedHour,
                              count: hourObj.count,
                              x: e.currentTarget.offsetLeft,
                              y: e.currentTarget.offsetTop
                            })}
                            onMouseLeave={() => setHoveredCell(null)}
                            className={`w-8 h-8 rounded border transition-all cursor-pointer relative ${hourObj.count > 0 ? 'border-accent/10 shadow-[0_0_10px_rgba(184,241,117,0.05)]' : 'border-white/[0.03] hover:border-white/10'}`}
                            style={cellStyle}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Heatmap Tooltip */}
              {hoveredCell && (
                <div 
                  className="absolute bg-[#0f0f11] border border-white/10 p-2.5 rounded-xl shadow-2xl pointer-events-none text-[9px] font-bold text-white z-20 flex flex-col gap-1 backdrop-blur-md transition-all duration-75"
                  style={{ left: `${hoveredCell.x}px`, top: `${hoveredCell.y - 50}px` }}
                >
                  <span className="text-accent border-b border-white/5 pb-0.5">{hoveredCell.day} @ {hoveredCell.formattedHour}</span>
                  <span>Check-ins: {hoveredCell.count}</span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: ATTENDANCE TREND */}
          <div className="col-span-12 lg:col-span-8 card bg-[#0d0d0f] border-white/5 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight">Attendance Trend</h2>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">Daily visit frequency over the filtered duration</p>
            </div>

            <div className="mt-6 relative h-44 flex items-end">
              {attendanceTrend.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-xs text-text-muted">No attendance data found in this range.</div>
              ) : (
                <>
                  {/* SVG graph */}
                  <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${trendSvgWidth} ${trendSvgHeight}`} preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#b8f175" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#b8f175" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Gridlines */}
                    <line x1="0" y1="10" x2={trendSvgWidth} y2="10" stroke="rgba(255,255,255,0.03)" strokeDasharray="3" />
                    <line x1="0" y1={trendSvgHeight / 2} x2={trendSvgWidth} y2={trendSvgHeight / 2} stroke="rgba(255,255,255,0.03)" strokeDasharray="3" />
                    <line x1="0" y1={trendSvgHeight - 10} x2={trendSvgWidth} y2={trendSvgHeight - 10} stroke="rgba(255,255,255,0.03)" strokeDasharray="3" />

                    {/* Area path */}
                    {trendAreaPath && <path d={trendAreaPath} fill="url(#trendGrad)" />}

                    {/* Line path */}
                    {trendLinePath && <path d={trendLinePath} fill="none" stroke="#b8f175" strokeWidth="2.5" />}

                    {/* Interactive Points */}
                    {trendPoints.map((pt, idx) => (
                      <circle
                        key={idx}
                        cx={pt.x}
                        cy={pt.y}
                        r="4"
                        fill="#0d0d0f"
                        stroke="#b8f175"
                        strokeWidth="2"
                        className="cursor-pointer hover:r-6 hover:fill-accent transition-all"
                        onMouseEnter={(e) => setHoveredTrend({
                          date: new Date(pt.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
                          count: pt.count,
                          x: pt.x,
                          y: pt.y
                        })}
                        onMouseLeave={() => setHoveredTrend(null)}
                      />
                    ))}
                  </svg>

                  {/* Trend Tooltip */}
                  {hoveredTrend && (
                    <div 
                      className="absolute bg-[#0f0f11] border border-white/10 px-2 py-1 rounded-xl text-[9px] font-bold text-white shadow-2xl z-30 pointer-events-none flex flex-col gap-0.5"
                      style={{ 
                        left: `${(hoveredTrend.x / trendSvgWidth) * 100}%`, 
                        bottom: `${(trendSvgHeight - hoveredTrend.y) + 10}px`,
                        transform: 'translateX(-50%)'
                      }}
                    >
                      <span className="text-accent">{hoveredTrend.date}</span>
                      <span>Visits: {hoveredTrend.count}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* SECTION 3: TIME SLOT DISTRIBUTION */}
          <div className="col-span-12 lg:col-span-4 card bg-[#0d0d0f] border-white/5 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight">Time Slot Distribution</h2>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">Check-ins grouped by operational blocks</p>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center gap-6">
              {/* Donut SVG */}
              <div className="relative w-28 h-28 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r={donutRadius} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="10" />
                  {donutSegments.map((segment) => {
                    const value = segment.value || 0;
                    if (value === 0) return null;
                    const strokeDash = (value / 100) * donutCircumference;
                    const strokeOffset = donutCircumference - strokeDash + currentOffset;
                    currentOffset -= strokeDash;
                    
                    return (
                      <circle
                        key={segment.label}
                        cx="60"
                        cy="60"
                        r={donutRadius}
                        fill="none"
                        stroke={segment.color}
                        strokeWidth="10"
                        strokeDasharray={donutCircumference}
                        strokeDashoffset={strokeOffset}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                    );
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-black text-white">4</span>
                  <span className="text-[8px] text-text-muted font-bold uppercase tracking-widest">Slots</span>
                </div>
              </div>

              {/* Legends & percentages */}
              <div className="flex-1 w-full space-y-2">
                {donutSegments.map((seg) => (
                  <div key={seg.label} className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                      <span className="text-text-secondary">{seg.label}</span>
                    </div>
                    <span className="text-white">{seg.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 4: PEAK DAYS ANALYSIS */}
          <div className="col-span-12 lg:col-span-6 card bg-[#0d0d0f] border-white/5 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight">Peak Days Analysis</h2>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">Average daily attendance count with highlighting</p>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              {/* Highlight Badges */}
              <div className="flex gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-success/5 border border-success/10 rounded-xl">
                  <Flame size={12} className="text-success" />
                  <span className="text-[9px] font-black text-text-muted uppercase">Highest:</span>
                  <span className="text-xs font-black text-success">{peakDaysAnalysis.highestDay}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-danger/5 border border-danger/10 rounded-xl">
                  <CircleDot size={12} className="text-danger" />
                  <span className="text-[9px] font-black text-text-muted uppercase">Lowest:</span>
                  <span className="text-xs font-black text-danger">{peakDaysAnalysis.lowestDay}</span>
                </div>
              </div>

              {/* Columns Bar Chart */}
              <div className="h-36 flex items-end justify-between pt-6 border-b border-white/5 pb-1 gap-2">
                {peakDaysAnalysis.data.map((d) => {
                  const maxAvg = Math.max(...peakDaysAnalysis.data.map(x => x.avg), 1);
                  const heightPercent = (d.avg / maxAvg) * 100;
                  const isHighest = d.day === peakDaysAnalysis.highestDay;
                  const isLowest = d.day === peakDaysAnalysis.lowestDay;

                  let barColor = 'bg-white/10 hover:bg-white/15';
                  if (isHighest) barColor = 'bg-accent shadow-[0_0_15px_rgba(184,241,117,0.15)]';
                  else if (isLowest) barColor = 'bg-danger/60';

                  return (
                    <div key={d.day} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                      <span className="text-[8px] font-black text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">{d.avg}</span>
                      <div className="w-full relative">
                        <div 
                          className={`w-full rounded-t transition-all duration-700 ${barColor}`} 
                          style={{ height: `${Math.max(5, heightPercent)}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-bold text-text-muted uppercase truncate max-w-full">{d.day.substring(0, 3)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 5: CAPACITY UTILIZATION */}
          <div className="col-span-12 lg:col-span-6 card bg-[#0d0d0f] border-white/5 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight">Capacity Utilization</h2>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">Physical gym capacity vs check-in peaks</p>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center gap-6">
              {/* Radial Gauge */}
              <div className="relative w-28 h-28 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="6" />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="40" 
                    fill="none" 
                    stroke="#b8f175" 
                    strokeWidth="6" 
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - capacityUtilization.peakUtilization / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 shadow-[0_0_15px_rgba(184,241,117,0.1)]"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-white">{capacityUtilization.peakUtilization}%</span>
                  <span className="text-[7px] text-text-muted font-bold uppercase tracking-widest">Peak Utilized</span>
                </div>
              </div>

              {/* Progress and status details */}
              <div className="flex-1 w-full space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">System Status</span>
                  <span className={`px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-wider ${
                    capacityUtilization.status === 'Critical' ? 'bg-danger/15 text-danger border border-danger/25' :
                    capacityUtilization.status === 'High' ? 'bg-warning/15 text-warning border border-warning/25' :
                    'bg-success/15 text-success border border-success/25'
                  }`}>
                    {capacityUtilization.status} Load
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-white/[0.02] border border-white/5 rounded-xl">
                    <span className="text-xs font-black text-white">{capacityUtilization.currentUtilization}%</span>
                    <p className="text-[7px] text-text-muted font-bold uppercase tracking-widest mt-0.5">Current</p>
                  </div>
                  <div className="p-2 bg-white/[0.02] border border-white/5 rounded-xl">
                    <span className="text-xs font-black text-white">{capacityUtilization.avgUtilization}%</span>
                    <p className="text-[7px] text-text-muted font-bold uppercase tracking-widest mt-0.5">Average</p>
                  </div>
                  <div className="p-2 bg-white/[0.02] border border-white/5 rounded-xl">
                    <span className="text-xs font-black text-white">{capacityUtilization.capacity}</span>
                    <p className="text-[7px] text-text-muted font-bold uppercase tracking-widest mt-0.5">Capacity</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 6: REVENUE FORECAST ANALYSIS */}
          <div className="col-span-12 lg:col-span-7 card bg-[#0d0d0f] border-white/5 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight">Revenue Forecast Analysis</h2>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">Comparison of short-term and monthly projection components</p>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
              {/* Next 7 Days */}
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-xs font-black text-white">Next 7 Days</span>
                  <span className="text-xs font-black text-accent">₹{revenueForecast.next7Days.expectedRevenue.toLocaleString()}</span>
                </div>
                <div className="space-y-2 text-[10px] font-bold">
                  <div className="flex justify-between text-text-secondary">
                    <span>Upcoming Renewals</span>
                    <span>₹{revenueForecast.next7Days.upcomingRenewals.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Pending Collections</span>
                    <span>₹{revenueForecast.next7Days.pendingCollections.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Next 30 Days */}
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-xs font-black text-white">Next 30 Days</span>
                  <span className="text-xs font-black text-accent">₹{revenueForecast.next30Days.expectedRevenue.toLocaleString()}</span>
                </div>
                <div className="space-y-2 text-[10px] font-bold">
                  <div className="flex justify-between text-text-secondary">
                    <span>Upcoming Renewals</span>
                    <span>₹{revenueForecast.next30Days.upcomingRenewals.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Pending Collections</span>
                    <span>₹{revenueForecast.next30Days.pendingCollections.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 7: AT-RISK MEMBERS ANALYSIS */}
          <div className="col-span-12 lg:col-span-5 card bg-[#0d0d0f] border-white/5 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight">At-Risk Members Analysis</h2>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">Active member counts grouped by last check-in age</p>
            </div>

            <div className="mt-6 space-y-3">
              {[
                { label: 'Not Visited For 7+ Days', count: atRiskGroups.days7, color: 'bg-indigo-500' },
                { label: 'Not Visited For 14+ Days', count: atRiskGroups.days14, color: 'bg-warning' },
                { label: 'Not Visited For 30+ Days', count: atRiskGroups.days30, color: 'bg-orange-500' },
                { label: 'Not Visited For 60+ Days', count: atRiskGroups.days60, color: 'bg-danger' },
              ].map((group) => {
                const totalRisk = (atRiskGroups.days7 + atRiskGroups.days14 + atRiskGroups.days30 + atRiskGroups.days60) || 1;
                const widthPercent = (group.count / totalRisk) * 100;
                
                return (
                  <div key={group.label} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-text-secondary">{group.label}</span>
                      <span className="text-white font-black">{group.count} members</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${group.color}`} style={{ width: `${widthPercent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 8: PLAN PERFORMANCE */}
          <div className="col-span-12 lg:col-span-6 card bg-[#0d0d0f] border-white/5 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-black tracking-tight">Plan Performance</h2>
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">Sales volume metrics per membership tier</p>
              </div>
              <div className="px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-xl text-center shrink-0">
                <p className="text-[7px] text-accent font-black uppercase tracking-widest">Best Performer</p>
                <p className="text-xs font-black text-white capitalize mt-0.5">{planPerformance.bestPlan}</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {planPerformance.data.length === 0 ? (
                <div className="text-center py-6 text-xs text-text-muted">No plan purchases found in range.</div>
              ) : (
                planPerformance.data.map((plan) => {
                  const maxSales = Math.max(...planPerformance.data.map(x => x.sales), 1);
                  const widthPercent = (plan.sales / maxSales) * 100;

                  return (
                    <div key={plan.name} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-text-secondary capitalize">{plan.name} Plan</span>
                        <span className="text-white">{plan.sales} Sold</span>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${widthPercent}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* SECTION 9: TRAINER DEMAND ANALYSIS */}
          <div className="col-span-12 lg:col-span-6 card bg-[#0d0d0f] border-white/5 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-black tracking-tight">Trainer Demand Analysis</h2>
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">Assigned PT clients and completed workout sessions</p>
              </div>
              <div className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-center shrink-0">
                <p className="text-[7px] text-indigo-400 font-black uppercase tracking-widest">Most Demanded</p>
                <p className="text-xs font-black text-white capitalize mt-0.5">{trainerDemand.mostDemandedTrainer}</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {trainerDemand.data.length === 0 ? (
                <div className="text-center py-6 text-xs text-text-muted">No trainer assignments found.</div>
              ) : (
                trainerDemand.data.map((trainer) => {
                  const maxClients = Math.max(...trainerDemand.data.map(x => x.ptClients), 1);
                  const maxSessions = Math.max(...trainerDemand.data.map(x => x.completedSessions), 1);
                  
                  const clientsPercent = (trainer.ptClients / maxClients) * 100;
                  const sessionsPercent = (trainer.completedSessions / maxSessions) * 100;

                  return (
                    <div key={trainer.id} className="space-y-2 border-b border-white/[0.02] pb-2 last:border-0 last:pb-0">
                      <div className="flex justify-between text-[11px] font-black text-white">
                        <span>{trainer.name}</span>
                      </div>
                      
                      <div className="space-y-1">
                        {/* PT Clients */}
                        <div className="flex items-center justify-between text-[8px] font-bold text-text-secondary uppercase">
                          <span>PT Clients ({trainer.ptClients})</span>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-accent rounded-full transition-all duration-700" style={{ width: `${clientsPercent}%` }} />
                        </div>

                        {/* Completed Sessions */}
                        <div className="flex items-center justify-between text-[8px] font-bold text-text-secondary uppercase pt-1">
                          <span>Completed Sessions ({trainer.completedSessions})</span>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full transition-all duration-700" style={{ width: `${sessionsPercent}%` }} />
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
    </div>
  );
}
