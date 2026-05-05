// composables/useSupabase.ts
// Admin App — Supabase composable
import { createClient } from '@supabase/supabase-js';

let _client: ReturnType<typeof createClient> | null = null;

export const useSupabase = () => {
  if (!_client) {
    const config = useRuntimeConfig();
    _client = createClient(
      config.public.supabaseUrl as string,
      config.public.supabaseAnonKey as string
    );
  }
  return _client;
};
