// composables/useAuth.ts — Author App
let globalInitPromise: Promise<void> | null = null;

export const useAuth = () => {
  const supabase = useSupabase();
  const router = useRouter();

  const currentUser = useState<any>('auth_user', () => null);
  const userProfile = useState<any>('auth_profile', () => null);
  const isLoading = useState<boolean>('auth_loading', () => true);
  const isAuthenticated = computed(() => !!currentUser.value);

  const init = () => {
    if (globalInitPromise) return globalInitPromise;
    
    globalInitPromise = (async () => {
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
            
            // CRITICAL FIX: Only fetch and overwrite profile if we don't have it yet!
            // When switching Chrome tabs, Supabase fires TOKEN_REFRESHED. 
            // If we blindly overwrite userProfile.value, it triggers Vue's watch() in every component,
            // which causes all components to simultaneously set isLoading = true and fetch data,
            // deadlocking the Supabase client.
            if (!userProfile.value || userProfile.value.user_id !== session.user.id) {
              const { data: profile } = await supabase
                .from('users')
                .select('*')
                .eq('user_id', session.user.id)
                .single();
              userProfile.value = profile;
            }
          }
        });
      })();
      return globalInitPromise;
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
    return data;
  };

  const verifyOtp = async (email: string, otp: string, metadata: Record<string, any> = {}) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'signup'
    });
    if (error) throw error;

    if (data.session?.user) {
      const user = data.session.user;
      currentUser.value = user;

      const profilePayload: Record<string, any> = {
        user_id: user.id,
        email,
        role: 'author',
        password_hash: '[supabase-auth]',
        created_at: new Date().toISOString(),
      };
      if (Object.keys(metadata).length > 0) {
        Object.assign(profilePayload, {
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
        });
      }

      const { error: upsertError } = await supabase
        .from('users')
        .upsert(profilePayload, { onConflict: 'user_id' });

      if (upsertError) console.error('[verifyOtp] Profile upsert error:', upsertError);

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', user.id)
        .single();
      userProfile.value = profile;
    }
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    currentUser.value = null;
    userProfile.value = null;
    globalInitPromise = null;
    router.push('/login');
  };

  return { currentUser, userProfile, isLoading, isAuthenticated, init, signIn, signUp, verifyOtp, signOut };
};
