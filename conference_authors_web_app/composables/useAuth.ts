// composables/useAuth.ts — Author App
export const useAuth = () => {
  const supabase = useSupabase();
  const router = useRouter();

  const currentUser = useState<any>('auth_user', () => null);
  const userProfile = useState<any>('auth_profile', () => null);
  const isLoading = useState<boolean>('auth_loading', () => true);
  const isAuthenticated = computed(() => !!currentUser.value);

  const init = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        currentUser.value = session.user;
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        userProfile.value = profile;
      }
    } catch (e) {
      console.error('Auth init error:', e);
    } finally {
      isLoading.value = false;
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        currentUser.value = null;
        userProfile.value = null;
      } else if (session?.user) {
        currentUser.value = session.user;
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        userProfile.value = profile;
      }
    });
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    currentUser.value = data.user;

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', data.user.id)
      .single();
    userProfile.value = profile;

    return data;
  };

  const signUp = async (email: string, password: string, metadata: Record<string, any> = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });
    if (error) throw error;

    // Create user profile
    if (data.user) {
      await supabase.from('users').upsert({
        user_id: data.user.id,
        email,
        role: 'author',
        title: metadata.title || null,
        title_en: metadata.title_en || null,
        first_name_th: metadata.first_name_th || null,
        last_name_th: metadata.last_name_th || null,
        first_name_en: metadata.first_name_en || null,
        last_name_en: metadata.last_name_en || null,
        institution: metadata.institution || null,
        phone: metadata.phone || null,
        academic_position: metadata.academic_position || null,
        province: metadata.province || null,
        created_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    }

    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    currentUser.value = null;
    userProfile.value = null;
    router.push('/login');
  };

  return { currentUser, userProfile, isLoading, isAuthenticated, init, signIn, signUp, signOut };
};
