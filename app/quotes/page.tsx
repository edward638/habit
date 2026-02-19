import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import QuotesManager from './quotes-manager';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Quotes",
};

export const dynamic = 'force-dynamic';

export default async function QuotesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <QuotesManager userId={user.id} />;
}
