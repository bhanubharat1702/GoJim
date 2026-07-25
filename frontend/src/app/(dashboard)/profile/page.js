'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUI } from '@/context/UIContext';

export default function ProfilePage() {
  const router = useRouter();
  const { openProfile } = useUI();

  useEffect(() => {
    // Open the modal and redirect to dashboard
    openProfile();
    router.replace('/dashboard');
  }, [openProfile, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
    </div>
  );
}
