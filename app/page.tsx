'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">
      Loading tables...
    </div>
  );
}
