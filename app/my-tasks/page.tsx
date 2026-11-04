'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MyTasksRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="py-20 text-center text-xs text-muted-foreground animate-pulse">
      Redirecting to factory tables...
    </div>
  );
}
