import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PuzzleClient from './puzzle-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Puzzle',
};

export const dynamic = 'force-dynamic';

export default async function PuzzlePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return <PuzzleClient userId={user.id} />;
}
