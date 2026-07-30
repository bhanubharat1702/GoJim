import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import AnalyticsClient from './AnalyticsClient';

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const getCachedVisuals = unstable_cache(
  async (token) => {
    try {
      const res = await fetch(`${baseUrl}/analytics/visuals?filter=month`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.ok ? await res.json() : { success: false, data: null };
    } catch (err) {
      console.error('getCachedVisuals error:', err);
      return { success: false, data: null };
    }
  },
  ['analytics-visuals'],
  { revalidate: 15, tags: ['analytics'] }
);

async function AnalyticsServerRoster({ token }) {
  const visualsRes = await getCachedVisuals(token);

  return (
    <AnalyticsClient
      initialVisuals={visualsRes.success ? visualsRes.data : null}
    />
  );
}

export default async function AnalyticsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('gojim_token')?.value;

  if (!token) {
    redirect('/login');
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px] text-white">Loading visual analytics...</div>}>
      <AnalyticsServerRoster token={token} />
    </Suspense>
  );
}
