'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUI } from '@/context/UIContext';

export default function SettingsPage() {
  const router = useRouter();
  const { openSettings } = useUI();

  useEffect(() => {
    // Open the modal and redirect to dashboard to prevent empty page flicker
    openSettings();
    router.replace('/dashboard');
  }, [openSettings, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
    </div>
  );
}
