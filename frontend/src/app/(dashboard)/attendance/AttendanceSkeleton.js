import React from 'react';

export default function AttendanceSkeleton() {
  return (
    <div className="pb-2 animate-pulse">
      <div className="bg-[#121214]/40 border border-white/5 rounded-xl shadow-2xl flex flex-col p-6 space-y-6">
        
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-2 w-full md:w-1/3">
            <div className="h-8 bg-white/10 rounded-lg w-3/4"></div>
            <div className="h-4 bg-white/5 rounded-md w-1/2"></div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="h-10 bg-white/10 rounded-xl w-48"></div>
            <div className="h-10 bg-white/10 rounded-xl w-32"></div>
          </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
              <div className="h-3 bg-white/10 rounded w-1/2"></div>
              <div className="h-6 bg-white/15 rounded w-1/3 mt-2"></div>
            </div>
          ))}
        </div>

        {/* Roster Table Skeleton */}
        <div className="space-y-3 pt-4">
          <div className="h-10 bg-white/10 rounded-lg w-full"></div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between py-3 px-4 border-b border-white/5">
              <div className="flex items-center gap-3 w-1/3">
                <div className="w-8 h-8 rounded-full bg-white/10"></div>
                <div className="h-4 bg-white/10 rounded w-2/3"></div>
              </div>
              <div className="h-4 bg-white/5 rounded w-20"></div>
              <div className="h-4 bg-white/5 rounded w-24"></div>
              <div className="flex gap-2 w-48 justify-end">
                <div className="h-8 bg-white/10 rounded-lg w-20"></div>
                <div className="h-8 bg-white/10 rounded-lg w-20"></div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
