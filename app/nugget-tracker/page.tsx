import { createClient } from '@/lib/supabase/server';
import NuggetTracker from './nugget-tracker';

export const dynamic = 'force-dynamic';

export default async function NuggetTrackerPage() {
  const supabase = await createClient();

  // Get current user (if logged in)
  const { data: { user } } = await supabase.auth.getUser();

  // Check if user is an editor
  let isEditor = false;
  if (user) {
    const { data } = await supabase
      .from('nugget_editors')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    isEditor = data !== null;
  }

  return (
    <NuggetTracker
      userId={user?.id ?? null}
      userEmail={user?.email ?? null}
      isEditor={isEditor}
    />
  );
}
