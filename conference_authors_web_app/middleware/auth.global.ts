export default defineNuxtRouteMiddleware(async (to) => {
  // Only protect routes starting with /portal
  if (!to.path.startsWith('/portal')) return;

  // SSR: skip — let client handle it (prevents bouncing OAuth hash tokens)
  if (process.server) return;

  const { init, currentUser, userProfile } = useAuth();

  // SMART INIT:
  // - If already authenticated (e.g. navigating between portal pages or switching tabs)
  //   → read from memory instantly, ZERO network call, no freeze
  // - If currentUser is null (e.g. fresh Google OAuth callback arriving at a portal route)
  //   → await init() once so getSession() finishes before we check
  if (!currentUser.value) {
    await init();
  }

  if (!currentUser.value) {
    return navigateTo('/login');
  }

  if (userProfile.value && userProfile.value.role !== 'author') {
    return navigateTo('/login?error=unauthorized');
  }

  if (!userProfile.value && to.path !== '/portal/complete-profile') {
    return navigateTo('/portal/complete-profile');
  }
});
