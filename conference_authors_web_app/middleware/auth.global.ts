export default defineNuxtRouteMiddleware(async (to) => {
  // Only protect routes starting with /portal
  if (!to.path.startsWith('/portal')) return;

  const supabase = useSupabase();
  
  // Use getUser() as it re-validates the session with the server
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.warn('[Author Middleware] No valid user found, redirecting to login');
    return navigateTo('/login');
  }

  // Role check: Only 'author' can access Author Portal
  try {
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('[Author Middleware] Could not fetch user profile:', profileError);
      await supabase.auth.signOut();
      return navigateTo('/login');
    }

    if (profile.role !== 'author') {
      console.warn(`[Author Middleware] Unauthorized role access: ${profile.role} tried to access author portal`);
      
      // Clear session to prevent persistent unauthorized access
      await supabase.auth.signOut();
      
      // Redirect with an error message in query if possible, or just back to login
      return navigateTo('/login?error=unauthorized');
    }
  } catch (e) {
    console.error('[Author Middleware] Unexpected error during role validation:', e);
    await supabase.auth.signOut();
    return navigateTo('/login');
  }
});
