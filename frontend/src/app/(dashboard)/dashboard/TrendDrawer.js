'use client';

import React, { useState } from 'react';
import { X, Coins, ChevronDown } from 'lucide-react';

export default function TrendDrawer({
  isOpen,
  onClose,
  incomeChartData,
  last6MonthsData,
  dailyProfitsThisMonth,
  currentMonth,
  prevMonthName,
  currentDayOrdinal,
  formatCompactValue
}) {
  const [drawerFilter, setDrawerFilter] = useState('this-month-vs-last');
  const [selected6MonthIdx, setSelected6MonthIdx] = useState(5);
  const [showDrawerFilterOptions, setShowDrawerFilterOptions] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end">
      {/* Backdrop overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out opacity-100"
        onClick={onClose}
      />

      {/* Drawer content panel */}
      <div
        className="relative w-full max-w-md bg-[#0a0a0a] border-l border-white/5 h-full p-6 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out transform translate-x-0 overflow-y-auto"
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
              onClick={onClose}
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
                        className="absolute bg-[#1a0a2a] border border-[#b8f175]/10 text-white text-[10px] font-black px-2.5 py-1 rounded-md shadow-md whitespace-nowrap animate-in slide-in-from-bottom duration-300"
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

            {/* Last 6 Months Comparison */}
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

            {/* Daily Spends */}
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
                                ? 'bg-[#1a0a2a] border border-[#b8f175]/10 text-white' 
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
  );
}
