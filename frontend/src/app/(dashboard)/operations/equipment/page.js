import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import EquipmentClient from './EquipmentClient';

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const getCachedEquipment = unstable_cache(
  async (token) => {
    try {
      const res = await fetch(`${baseUrl}/equipment?limit=1000`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.ok ? await res.json() : { success: false, data: [] };
    } catch (err) {
      console.error('getCachedEquipment error:', err);
      return { success: false, data: [] };
    }
  },
  ['equipment-page-list'],
  { revalidate: 15, tags: ['equipment'] }
);

async function EquipmentServerRoster({ token }) {
  const equipmentRes = await getCachedEquipment(token);

  return (
    <EquipmentClient
      initialEquipment={equipmentRes.success ? equipmentRes.data : []}
    />
  );
}

export default async function EquipmentPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('gojim_token')?.value;

  if (!token) {
    redirect('/login');
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px] text-white">Loading equipment...</div>}>
      <EquipmentServerRoster token={token} />
    </Suspense>
  );
}
