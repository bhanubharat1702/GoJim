import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import MembersClient from './MembersClient';

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const getCachedMembers = unstable_cache(
  async (token) => {
    try {
      const res = await fetch(`${baseUrl}/members?limit=1000`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.ok ? await res.json() : { success: false, data: [] };
    } catch (err) {
      console.error('getCachedMembers error:', err);
      return { success: false, data: [] };
    }
  },
  ['members-page-list'],
  { revalidate: 15, tags: ['members'] }
);

const getCachedStats = unstable_cache(
  async (token) => {
    try {
      const res = await fetch(`${baseUrl}/members/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.ok ? await res.json() : { success: false, data: null };
    } catch (err) {
      console.error('getCachedStats error:', err);
      return { success: false, data: null };
    }
  },
  ['members-page-stats'],
  { revalidate: 15, tags: ['members'] }
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
  ['members-page-trainers'],
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
  ['members-page-plans'],
  { revalidate: 15, tags: ['plans'] }
);

async function MembersServerRoster({ token }) {
  const [membersRes, statsRes, trainRes, planRes] = await Promise.all([
    getCachedMembers(token),
    getCachedStats(token),
    getCachedTrainers(token),
    getCachedPlans(token)
  ]);

  return (
    <MembersClient
      initialMembers={membersRes.success ? membersRes.data : []}
      initialStats={statsRes.success ? statsRes.data : null}
      initialTrainers={trainRes.success ? trainRes.data : []}
      initialPlans={planRes.success ? planRes.data : []}
    />
  );
}

export default async function MembersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('gojim_token')?.value;

  if (!token) {
    redirect('/login');
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px] text-white">Loading members...</div>}>
      <MembersServerRoster token={token} />
    </Suspense>
  );
}
