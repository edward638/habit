import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AmexPoints from './amex-points';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Amex Points',
};

export const dynamic = 'force-dynamic';

export default async function AmexPointsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <AmexPoints userId={user.id} />;
}
