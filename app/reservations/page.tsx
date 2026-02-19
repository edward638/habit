import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ReservationsTracker from './reservations-tracker';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Reservations",
};

export const dynamic = 'force-dynamic';

export default async function ReservationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <ReservationsTracker
      userId={user.id}
      userEmail={user.email ?? null}
    />
  );
}
