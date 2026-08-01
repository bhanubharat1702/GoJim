import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import StaffClient from './StaffClient';

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const getCachedStaff = unstable_cache(
  async (token) => {
    try {
      const res = await fetch(`${baseUrl}/staff?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.ok ? await res.json() : { success: false, data: [] };
    } catch (err) {
      console.error('getCachedStaff error:', err);
      return { success: false, data: [] };
    }
  },
  ['staff-page-list'],
  { revalidate: 15, tags: ['staff'] }
);

const getCachedExpenses = unstable_cache(
  async (token) => {
    try {
      const res = await fetch(`${baseUrl}/expenses?category=Salary&limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.ok ? await res.json() : { success: false, data: [] };
    } catch (err) {
      console.error('getCachedExpenses error:', err);
      return { success: false, data: [] };
    }
  },
  ['staff-page-expenses'],
  { revalidate: 15, tags: ['expenses'] }
);

async function StaffServerRoster({ token }) {
  const [staffRes, expensesRes] = await Promise.all([
    getCachedStaff(token),
    getCachedExpenses(token)
  ]);

  return (
    <StaffClient
      initialStaff={staffRes.success ? staffRes.data : []}
      initialExpenses={expensesRes.success ? expensesRes.data : []}
    />
  );
}

export default async function StaffPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('gojim_token')?.value;

  if (!token) {
    redirect('/login');
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px] text-white">Loading staff...</div>}>
      <StaffServerRoster token={token} />
    </Suspense>
  );
}
