import React from 'react';

export default function DashboardSkeleton() {
  return (
    <div className="text-white pb-10 animate-pulse">
      <div className="grid grid-cols-12 gap-8">
        
        {/* Left Section Skeleton */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          {/* Insights Ticker Skeleton */}
          <div className="border border-white/5 bg-white/[0.01] p-4 rounded-2xl h-[105px] flex flex-col justify-between">
            <div className="h-3 bg-white/10 rounded w-1/3"></div>
            <div className="h-4 bg-white/10 rounded w-5/6 mt-2"></div>
            <div className="h-3 bg-white/5 rounded w-1/2 mt-1"></div>
          </div>

          {/* Action Buttons Skeleton */}
          <div className="space-y-3">
            <div className="h-10 bg-white/10 rounded-xl w-full"></div>
            <div className="h-10 bg-white/10 rounded-xl w-full"></div>
          </div>

          {/* Spend Comparison Card Skeleton */}
          <div className="border border-white/5 bg-white/[0.01] p-5 rounded-2xl h-[240px] flex flex-col justify-between">
            <div className="h-3 bg-white/10 rounded w-2/3"></div>
            <div className="h-6 bg-white/15 rounded w-1/3 mt-2"></div>
            <div className="h-28 bg-white/5 rounded-xl w-full mt-4"></div>
          </div>
        </div>

        {/* Right Section Skeleton */}
        <div className="col-span-12 lg:col-span-9 space-y-8">
          <div className="grid grid-cols-12 gap-6">
            
            {/* Stat Cards 2x2 Grid Skeleton */}
            <div className="col-span-12 lg:col-span-5 grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 bg-white/[0.01] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                  <div className="h-3 bg-white/10 rounded w-1/2"></div>
                  <div className="h-6 bg-white/15 rounded w-2/3 mt-2"></div>
                  <div className="h-3 bg-white/5 rounded w-1/3 mt-1"></div>
                </div>
              ))}
            </div>

            {/* Income & Expense Chart Skeleton */}
            <div className="col-span-12 lg:col-span-7 border border-white/5 bg-white/[0.01] rounded-xl p-8 flex flex-col justify-between h-[240px]">
              <div className="flex justify-between items-center mb-4">
                <div className="h-4 bg-white/10 rounded w-1/3"></div>
                <div className="flex gap-2">
                  <div className="h-3 bg-white/10 rounded w-12"></div>
                  <div className="h-3 bg-white/10 rounded w-12"></div>
                </div>
              </div>
              <div className="h-36 bg-white/5 rounded-xl w-full"></div>
            </div>
          </div>

          {/* Members Table Skeleton */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="h-6 bg-white/10 rounded w-1/4"></div>
              <div className="h-8 bg-white/10 rounded w-48"></div>
            </div>
            <div className="bg-white/[0.01] border border-white/5 rounded-xl p-6 space-y-4">
              <div className="h-8 bg-white/10 rounded w-full mb-4"></div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex justify-between items-center border-b border-white/5 pb-3">
                  <div className="h-4 bg-white/10 rounded w-1/4"></div>
                  <div className="h-4 bg-white/5 rounded w-16"></div>
                  <div className="h-4 bg-white/5 rounded w-10"></div>
                  <div className="h-6 bg-white/10 rounded w-16"></div>
                  <div className="h-4 bg-white/5 rounded w-24"></div>
                  <div className="h-4 bg-white/5 rounded w-20"></div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
