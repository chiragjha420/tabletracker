'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/user-context';

export default function HomePage() {
  const router = useRouter();
  const { currentUser } = useUser();

  useEffect(() => {
    if (currentUser.role === 'SUPERVISOR') {
      router.replace('/my-tasks');
    } else {
      router.replace('/dashboard');
    }
  }, [currentUser, router]);

  return (
    <div className="py-20 text-center text-sm text-muted-foreground">
      Loading workspace...
    </div>
  );
}
