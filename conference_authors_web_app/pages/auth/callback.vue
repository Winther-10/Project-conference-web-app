<script setup>
definePageMeta({ layout: false });
import { ref, onMounted } from 'vue';
import { Loader2 } from 'lucide-vue-next';
import { useSupabase } from '~/composables/useSupabase';

const supabase = useSupabase();
const status = ref('กำลังตรวจสอบบัญชี...');

onMounted(async () => {
  let handled = false;

  const handleSession = async (session) => {
    if (handled) return;
    handled = true;

    // Check if user has a complete profile in public.users
    const { data: profile } = await supabase
      .from('users')
      .select('first_name_th, phone, institution')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (profile?.first_name_th && profile?.phone && profile?.institution) {
      status.value = 'พบข้อมูลบัญชี กำลังเข้าสู่ระบบ...';
      setTimeout(() => navigateTo('/portal/dashboard', { replace: true }), 800);
    } else {
      status.value = 'กรุณากรอกข้อมูลเพิ่มเติม...';
      setTimeout(() => navigateTo('/portal/complete-profile', { replace: true }), 800);
    }
  };

  // Listen for auth state change (triggered when Supabase processes OAuth tokens)
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session) {
      subscription.unsubscribe();
      await handleSession(session);
    }
  });

  // Also check if session already exists
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    subscription.unsubscribe();
    await handleSession(session);
  }

  // Timeout fallback — redirect to login after 15s
  setTimeout(() => {
    if (!handled) {
      subscription.unsubscribe();
      status.value = 'ไม่พบข้อมูลการเข้าสู่ระบบ กำลังกลับหน้าล็อกอิน...';
      setTimeout(() => navigateTo('/login', { replace: true }), 1500);
    }
  }, 15000);
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex flex-col items-center justify-center font-sans">
    <div class="flex flex-col items-center gap-6">
      <div class="w-16 h-16 rounded-[24px] bg-white border border-purple-100 flex items-center justify-center shadow-sm">
        <Loader2 class="w-8 h-8 text-purple-500 animate-spin" />
      </div>
      <p class="text-lg font-black text-purple-900">{{ status }}</p>
      <p class="text-sm font-semibold text-purple-400">กรุณารอสักครู่...</p>
    </div>
  </div>
</template>
