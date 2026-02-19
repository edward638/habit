import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import TftDashboard from '../tft-dashboard';
import NavBar from '../nav-bar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "TFT Analytics",
};

export const dynamic = 'force-dynamic';

export default async function TftPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen p-4">
      <header className="max-w-4xl mx-auto mb-6">
        <NavBar />
      </header>
      <main className="max-w-4xl mx-auto">
        <TftDashboard />
      </main>
    </div>
  );
}
