import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import TrainersClient from './TrainersClient';

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

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
  ['trainers-page-list'],
  { revalidate: 15, tags: ['trainers'] }
);

const getCachedPlans = unstable_cache(
  async (token) => {
    try {
      const res = await fetch(`${baseUrl}/plans?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.ok ? await res.json() : { success: false, data: [] };
    } catch (err) {
      console.error('getCachedPlans error:', err);
      return { success: false, data: [] };
    }
  },
  ['trainers-page-plans'],
  { revalidate: 15, tags: ['plans'] }
);

const getCachedPaidSalaries = unstable_cache(
  async (token) => {
    try {
      const res = await fetch(`${baseUrl}/expenses?category=Salary&limit=200`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.ok ? await res.json() : { success: false, data: [] };
    } catch (err) {
      console.error('getCachedPaidSalaries error:', err);
      return { success: false, data: [] };
    }
  },
  ['trainers-page-salaries'],
  { revalidate: 15, tags: ['expenses'] }
);

async function TrainersServerRoster({ token }) {
  const [trainersRes, plansRes, salariesRes] = await Promise.all([
    getCachedTrainers(token),
    getCachedPlans(token),
    getCachedPaidSalaries(token)
  ]);

  return (
    <TrainersClient
      initialTrainers={trainersRes.success ? trainersRes.data : []}
      initialPlans={plansRes.success ? plansRes.data : []}
      initialPaidSalaries={salariesRes.success ? salariesRes.data : []}
    />
  );
}

export default async function TrainersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('gojim_token')?.value;

  if (!token) {
    redirect('/login');
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px] text-white">Loading trainers...</div>}>
      <TrainersServerRoster token={token} />
    </Suspense>
  );
}
