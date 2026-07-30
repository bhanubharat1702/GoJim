import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import AlertsClient from './AlertsClient';

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
  ['alerts-members'],
  { revalidate: 15, tags: ['members'] }
);

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
  ['alerts-leads'],
  { revalidate: 15, tags: ['leads'] }
);

async function AlertsServerRoster({ token }) {
  const [membersRes, leadsRes] = await Promise.all([
    getCachedMembers(token),
    getCachedLeads(token)
  ]);

  return (
    <AlertsClient
      initialMembers={membersRes.success ? membersRes.data : []}
      initialLeads={leadsRes.success ? leadsRes.data : []}
    />
  );
}

export default async function AlertsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('gojim_token')?.value;

  if (!token) {
    redirect('/login');
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px] text-white">Loading notification center...</div>}>
      <AlertsServerRoster token={token} />
    </Suspense>
  );
}
