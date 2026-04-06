'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function KeysRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/admin/connections'); }, [router]);
  return null;
}
