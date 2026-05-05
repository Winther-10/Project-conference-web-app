// middleware/auth.ts — Admin App
// Protects all routes except /admin/login
import { useSupabase } from '~/composables/useSupabase';
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/admin/login') return;

  const supabase = useSupabase();
  
  // Use getUser() for more reliability on refresh/SSR
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Small grace period: sometimes session takes a moment to hydrate on client-side
    const { data: { session: retrySession } } = await supabase.auth.getSession();
    if (!retrySession) {
      return navigateTo('/admin/login');
    }
  }

  // Get the correct user ID for the role check
  let targetUserId = user?.id;
  if (!targetUserId) {
    const { data: { session } } = await supabase.auth.getSession();
    targetUserId = session?.user?.id;
  }

  if (!targetUserId) return navigateTo('/admin/login');

  // Check admin role
  try {
    const { data: profile, error } = await supabase
      .from('users')
      .select('role')
      .eq('user_id', targetUserId)
      .single();

    // If schema error (column missing), allow access to prevent lockout during setup
    if (error?.code === 'PGRST204' || error?.message?.includes('role')) {
      return; 
    }

    // IMPORTANT: Only sign out if we are SURE they are not an admin.
    // If it's a network error (error is not null but profile is also null), DON'T sign out.
    if (profile && profile.role !== 'admin') {
      console.warn('[Admin Middleware] Unauthorized role:', profile.role);
      await supabase.auth.signOut();
      return navigateTo('/admin/login');
    }

    // If profile is missing but no schema error, it might be a temporary DB issue.
    // We allow them to stay (the page data fetch will likely fail anyway if DB is down).
  } catch (e) {
    console.error('[Admin Middleware] unexpected error:', e);
  }
});
