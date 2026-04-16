'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ResetPasswordRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token') || '';
    router.replace(`/auth/reset-password?token=${token}`);
  }, [router, searchParams]);

  return (
    <div style={{
      color: '#64748b',
      padding: 40,
      textAlign: 'center',
      fontSize: '14px',
    }}>
      Redirecting...
    </div>
  );
}
