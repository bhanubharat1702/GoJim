import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import LeadsClient from './LeadsClient';

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const getCachedLeads = unstable_cache(
  async (token) => {
    try {
      const res = await fetch(`${baseUrl}/leads?limit=1000`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.ok ? await res.json() : { success: false, data: [] };
    } catch (err) {
      console.error('getCachedLeads error:', err);
      return { success: false, data: [] };
    }
  },
  ['leads-page-list'],
  { revalidate: 15, tags: ['leads'] }
);

const getCachedStats = unstable_cache(
  async (token) => {
    try {
      const res = await fetch(`${baseUrl}/leads/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.ok ? await res.json() : { success: false, data: null };
    } catch (err) {
      console.error('getCachedStats error:', err);
      return { success: false, data: null };
    }
  },
  ['leads-page-stats'],
  { revalidate: 15, tags: ['leads'] }
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
  ['leads-page-plans'],
  { revalidate: 15, tags: ['plans'] }
);

const getCachedTrainers = unstable_cache(
  async (token) => {
    try {
      const res = await fetch(`${baseUrl}/trainers?status=active&limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.ok ? await res.json() : { success: false, data: [] };
    } catch (err) {
      console.error('getCachedTrainers error:', err);
      return { success: false, data: [] };
    }
  },
  ['leads-page-trainers'],
  { revalidate: 15, tags: ['trainers'] }
);

async function LeadsServerRoster({ token }) {
  const [leadsRes, statsRes, plansRes, trainersRes] = await Promise.all([
    getCachedLeads(token),
    getCachedStats(token),
    getCachedPlans(token),
    getCachedTrainers(token)
  ]);

  return (
    <LeadsClient
      initialLeads={leadsRes.success ? leadsRes.data : []}
      initialStats={statsRes.success ? statsRes.data : null}
      initialPlans={plansRes.success ? plansRes.data : []}
      initialTrainers={trainersRes.success ? trainersRes.data : []}
    />
  );
}

export default async function LeadsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('gojim_token')?.value;

  if (!token) {
    redirect('/login');
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px] text-white">Loading leads...</div>}>
      <LeadsServerRoster token={token} />
    </Suspense>
  );
}
