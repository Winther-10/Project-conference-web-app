// composables/useAdminAuth.ts
// Admin App — Authentication composable

export const useAdminAuth = () => {
  const supabase = useSupabase();
  const router = useRouter();

  const currentUser = useState<any>('admin_user', () => null);
  const isLoading = useState<boolean>('admin_auth_loading', () => true);

  const init = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Verify admin role
        const { data: profile, error } = await supabase
          .from('users')
          .select('role, first_name_th, last_name_th, email')
          .eq('user_id', session.user.id)
          .single();

        // If role column doesn't exist yet, still allow access during setup
        if (error?.code === 'PGRST204' || error?.message?.includes('role')) {
          console.warn('[AdminAuth] role column not found — run supabase-migration.sql');
          currentUser.value = { ...session.user };
        } else if (profile?.role === 'admin') {
          currentUser.value = { ...session.user, ...profile };
        } else {
          await supabase.auth.signOut();
          currentUser.value = null;
        }
      }
    } catch (e) {
      console.error('[AdminAuth] init error:', e);
    } finally {
      isLoading.value = false;
    }

    // Listen to auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        currentUser.value = null;
        router.push('/admin/login');
      }
    });
  };

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Check admin role
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role, first_name_th, last_name_th')
      .eq('user_id', data.user.id)
      .single();

    // Role column missing — migration not run yet
    if (profileError?.code === 'PGRST204' || profileError?.message?.includes('role')) {
      throw new Error('⚠️ กรุณารัน supabase-migration.sql ใน Supabase SQL Editor ก่อนใช้งาน');
    }

    if (profileError?.code === 'PGRST116') {
      await supabase.auth.signOut();
      throw new Error('ไม่พบข้อมูลผู้ใช้ในฐานข้อมูล กรุณาสร้างบัญชีก่อน');
    }

    if (profileError) {
      await supabase.auth.signOut();
      throw new Error(`เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์: ${profileError.message}`);
    }

    if (!profile || profile.role !== 'admin') {
      await supabase.auth.signOut();
      throw new Error('บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ');
    }

    currentUser.value = { ...data.user, ...profile };
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    currentUser.value = null;
    router.push('/admin/login');
  };

  return { currentUser, isLoading, init, login, logout };
};
