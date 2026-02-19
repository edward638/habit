import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ArtCoach from './art-coach';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Art Coach",
};

export const dynamic = 'force-dynamic';

export default async function ArtCoachPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <ArtCoach userId={user.id} />;
}
