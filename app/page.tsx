import { createClient } from '@/lib/supabase/server';
import HabitTracker from './habit-tracker';
import Landing from './landing';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <Landing />;
  }

  return (
    <HabitTracker
      userEmail={user.email ?? null}
      userId={user.id}
    />
  );
}
