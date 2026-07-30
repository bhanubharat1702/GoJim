import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import WhatsAppClient from './WhatsAppClient';

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const getCachedTemplates = unstable_cache(
  async (token) => {
    try {
      const res = await fetch(`${baseUrl}/whatsapp/templates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.ok ? await res.json() : { success: false, data: [] };
    } catch (err) {
      console.error('getCachedTemplates error:', err);
      return { success: false, data: [] };
    }
  },
  ['whatsapp-templates'],
  { revalidate: 15, tags: ['whatsapp'] }
);

const getCachedLog = unstable_cache(
  async (token) => {
    try {
      const res = await fetch(`${baseUrl}/whatsapp/log`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.ok ? await res.json() : { success: false, data: [] };
    } catch (err) {
      console.error('getCachedLog error:', err);
      return { success: false, data: [] };
    }
  },
  ['whatsapp-log'],
  { revalidate: 15, tags: ['whatsapp'] }
);

async function WhatsAppServerRoster({ token }) {
  const [templatesRes, logRes] = await Promise.all([
    getCachedTemplates(token),
    getCachedLog(token)
  ]);

  return (
    <WhatsAppClient
      initialTemplates={templatesRes.success ? templatesRes.data : []}
      initialLog={logRes.success ? logRes.data : []}
    />
  );
}

export default async function WhatsAppPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('gojim_token')?.value;

  if (!token) {
    redirect('/login');
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px] text-white">Loading WhatsApp templates...</div>}>
      <WhatsAppServerRoster token={token} />
    </Suspense>
  );
}
