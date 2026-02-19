import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ColorGame from './color-game';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Color Match",
};

export const dynamic = 'force-dynamic';

export default async function ColorMatchPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <ColorGame userId={user.id} />;
}
