import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import AttendanceClient from './AttendanceClient';
import AttendanceSkeleton from './AttendanceSkeleton';

// Cache function for the roster (people)
const getCachedPeople = unstable_cache(
  async (role, token) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
    let endpoint = '';
    
    if (role === 'clients') {
      endpoint = '/members?limit=50&page=1&excludeInactive=true';
    } else if (role === 'trainers') {
      endpoint = '/trainers?limit=50&page=1';
    } else if (role === 'staff') {
      endpoint = '/staff?limit=50&page=1';
    }

    try {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch roster for role: ${role}`);
      }

      const json = await res.json();
      
      if (json && json.success) {
        // Filter out inactive / exited / deactivated roster on the server
        const activeOrExpired = json.data.filter(p => {
          const statusVal = (p.status || '').toLowerCase();
          const membershipStatusVal = (p.membershipStatus || '').toLowerCase();
          
          const isInactive =
            statusVal.includes('inact') || membershipStatusVal.includes('inact') ||
            statusVal.includes('deact') || membershipStatusVal.includes('deact') ||
            statusVal.includes('exit')  || membershipStatusVal.includes('exit');

          if (isInactive) return false;

          return statusVal === 'active' || statusVal === 'expired';
        });
        return activeOrExpired;
      }
      return [];
    } catch (err) {
      console.error('getCachedPeople error:', err);
      return [];
    }
  },
  ['attendance-roster-people'],
  { revalidate: 30, tags: ['roster'] }
);

// Cache function for the attendance records of a specific date
const getCachedAttendance = unstable_cache(
  async (date, token) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
    try {
      const res = await fetch(`${baseUrl}/attendance?startDate=${date}&endDate=${date}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch attendance for date: ${date}`);
      }

      const json = await res.json();
      return json.success ? json.data : [];
    } catch (err) {
      console.error('getCachedAttendance error:', err);
      return [];
    }
  },
  ['attendance-roster-records'],
  { revalidate: 10, tags: ['attendance'] }
);

async function AttendanceRoster({ role, date, token }) {
  const [people, attendance] = await Promise.all([
    getCachedPeople(role, token),
    getCachedAttendance(date, token)
  ]);

  return (
    <AttendanceClient
      key={`${role}-${date}`}
      initialPeople={people}
      initialAttendance={attendance}
      role={role}
      date={date}
    />
  );
}

export default async function AttendancePage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const role = resolvedSearchParams.role || 'clients';
  
  const getLocalYYYYMMDD = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const date = resolvedSearchParams.date || getLocalYYYYMMDD();
  
  const cookieStore = await cookies();
  const token = cookieStore.get('gojim_token')?.value;

  if (!token) {
    redirect('/');
  }

  return (
    <div className="pb-2">
      <Suspense fallback={<AttendanceSkeleton />}>
        <AttendanceRoster role={role} date={date} token={token} />
      </Suspense>
    </div>
  );
}
