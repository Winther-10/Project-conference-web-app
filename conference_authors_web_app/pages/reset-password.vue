<script setup>
definePageMeta({ layout: false });
import { ref, computed, onMounted } from 'vue';
import { Eye, EyeOff, Lock, KeyRound, CheckCircle2, XCircle, Shield, MoveRight, CheckCircle, Sparkles } from 'lucide-vue-next';
import { useSupabase } from '~/composables/useSupabase';

const supabase = useSupabase();
const router = useRouter();

const password = ref('');
const confirm = ref('');
const showPw = ref(false);
const showConfirm = ref(false);
const isLoading = ref(false);
const isReady = ref(false);
const toast = ref(null);

const showToast = (message, tone = 'ok') => {
  toast.value = { message, tone };
  setTimeout(() => { toast.value = null; }, 4000);
};

// Password strength criteria — same as register & settings
const pwCriteria = computed(() => {
  const val = password.value;
  const hasLen = val.length >= 8;
  const hasUpper = /[A-Z]/.test(val);
  const hasLower = /[a-z]/.test(val);
  const hasNum = /\d/.test(val);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(val);
  const noSequence = !/(.)\1{2,}/.test(val) && !/(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(val);
  return [
    { label: 'ความยาวอย่างน้อย 8 ตัวอักษร', ok: hasLen },
    { label: 'มีตัวพิมพ์ใหญ่ (A-Z)', ok: hasUpper },
    { label: 'มีตัวพิมพ์เล็ก (a-z)', ok: hasLower },
    { label: 'มีตัวเลข (0-9)', ok: hasNum },
    { label: 'มีอักขระพิเศษ (!@#$...)', ok: hasSpecial },
    { label: 'ไม่มีการเรียงลำดับตัวอักษร/ตัวเลข', ok: noSequence }
  ];
});
const strengthScore = computed(() => pwCriteria.value.filter(c => c.ok).length);
const strengthPercent = computed(() => Math.round((strengthScore.value / 6) * 100));
const strengthColor = computed(() => {
  if (strengthScore.value <= 2) return 'bg-rose-500';
  if (strengthScore.value <= 4) return 'bg-amber-400';
  return 'bg-emerald-500';
});

onMounted(async () => {
  // Wait for Supabase to pick up the recovery tokens from URL
  await new Promise(r => setTimeout(r, 1000));
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    isReady.value = true;
  } else {
    // Also listen for auth event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        isReady.value = true;
        subscription.unsubscribe();
      }
    });
    // Timeout
    setTimeout(() => {
      if (!isReady.value) {
        subscription.unsubscribe();
        showToast('ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุ กำลังกลับหน้าล็อกอิน...', 'err');
        setTimeout(() => navigateTo('/login', { replace: true }), 2500);
      }
    }, 10000);
  }
});

const handleResetPassword = async () => {
  if (strengthScore.value < 4) {
    showToast('รหัสผ่านยังไม่ปลอดภัยเพียงพอ กรุณาทำตามคำแนะนำ', 'err');
    return;
  }
  if (password.value !== confirm.value) {
    showToast('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน', 'err');
    return;
  }
  isLoading.value = true;
  try {
    const { error } = await supabase.auth.updateUser({ password: password.value });
    if (error) throw error;
    showToast('เปลี่ยนรหัสผ่านสำเร็จ! กำลังพาไปหน้าเข้าสู่ระบบ...', 'ok');
    setTimeout(() => router.push('/login'), 2000);
  } catch (err) {
    showToast(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่', 'err');
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center px-6 py-12 font-sans">
    <!-- Toast -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-4"
    >
      <div
        v-if="toast"
        :class="[
          'fixed top-6 left-1/2 -translate-x-1/2 z-[100] h-12 px-5 rounded-2xl border text-[13px] font-black inline-flex items-center gap-2 max-w-md shadow-lg',
          toast.tone === 'err' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        ]"
      >
        <component :is="toast.tone === 'err' ? Sparkles : CheckCircle" class="w-4 h-4" />
        {{ toast.message }}
      </div>
    </Transition>

    <div class="w-full max-w-md">
      <div class="rounded-[32px] bg-white border border-purple-100 shadow-sm p-8 md:p-10">
        <!-- Icon -->
        <div class="flex justify-center mb-6">
          <div class="w-14 h-14 rounded-[20px] bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center shadow-sm">
            <Shield class="w-7 h-7 text-purple-600" />
          </div>
        </div>

        <h1 class="text-2xl font-black text-purple-950 tracking-tight text-center">ตั้งรหัสผ่านใหม่</h1>
        <p class="mt-2 text-[14px] font-semibold text-purple-700/60 text-center">กรุณากรอกรหัสผ่านใหม่ที่ต้องการ</p>

        <!-- Loading state -->
        <div v-if="!isReady" class="mt-8 text-center py-8">
          <div class="w-8 h-8 mx-auto border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <p class="mt-4 text-sm font-semibold text-slate-500">กำลังตรวจสอบลิงก์...</p>
        </div>

        <!-- Form -->
        <form v-else @submit.prevent="handleResetPassword" class="mt-8 space-y-5">
          <!-- New Password -->
          <div>
            <label class="text-[12px] font-black text-purple-800 block uppercase tracking-wide mb-2">รหัสผ่านใหม่</label>
            <div class="relative">
              <input
                v-model="password"
                :type="showPw ? 'text' : 'password'"
                class="w-full h-12 px-4 pl-12 pr-12 rounded-[20px] bg-purple-50/50 border border-purple-100 text-[14px] font-semibold text-slate-900 placeholder-purple-300 focus:outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100/50 transition-all"
                placeholder="*******************"
              />
              <Lock class="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-purple-300" />
              <button type="button" @click="showPw = !showPw" class="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-white border border-purple-100 flex items-center justify-center hover:bg-purple-50 transition-colors shadow-sm">
                <EyeOff v-if="showPw" class="w-[14px] h-[14px] text-purple-400" />
                <Eye v-else class="w-[14px] h-[14px] text-purple-400" />
              </button>
            </div>
          </div>

          <!-- Strength Meter -->
          <div v-if="password" class="space-y-3">
            <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500" :class="strengthColor" :style="{ width: strengthPercent + '%' }"></div>
            </div>
            <div class="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <div v-for="c in pwCriteria" :key="c.label" class="flex items-center gap-1.5">
                <CheckCircle2 v-if="c.ok" class="w-3 h-3 text-emerald-500 shrink-0" />
                <XCircle v-else class="w-3 h-3 text-slate-300 shrink-0" />
                <span class="text-[11px] font-semibold" :class="c.ok ? 'text-emerald-600' : 'text-slate-400'">{{ c.label }}</span>
              </div>
            </div>
          </div>

          <!-- Confirm Password -->
          <div>
            <label class="text-[12px] font-black text-purple-800 block uppercase tracking-wide mb-2">ยืนยันรหัสผ่านใหม่</label>
            <div class="relative">
              <input
                v-model="confirm"
                :type="showConfirm ? 'text' : 'password'"
                class="w-full h-12 px-4 pl-12 pr-12 rounded-[20px] bg-purple-50/50 border border-purple-100 text-[14px] font-semibold text-slate-900 placeholder-purple-300 focus:outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100/50 transition-all"
                placeholder="*******************"
              />
              <Lock class="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-purple-300" />
              <button type="button" @click="showConfirm = !showConfirm" class="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-white border border-purple-100 flex items-center justify-center hover:bg-purple-50 transition-colors shadow-sm">
                <EyeOff v-if="showConfirm" class="w-[14px] h-[14px] text-purple-400" />
                <Eye v-else class="w-[14px] h-[14px] text-purple-400" />
              </button>
            </div>
            <div v-if="confirm && confirm !== password" class="mt-2 text-[11px] font-bold text-rose-500 flex items-center gap-1">
              <XCircle class="w-3 h-3" /> รหัสผ่านไม่ตรงกัน
            </div>
          </div>

          <button
            type="submit"
            :disabled="isLoading || strengthScore < 4 || password !== confirm"
            :class="[
              'h-14 w-full rounded-[24px] text-[15px] font-black inline-flex items-center justify-center gap-2 transition-all duration-300 shadow-md',
              (!isLoading && strengthScore >= 4 && password === confirm) ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-purple-300/40 hover:-translate-y-0.5' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            ]"
          >
            {{ isLoading ? 'กำลังเปลี่ยนรหัสผ่าน...' : 'ยืนยันรหัสผ่านใหม่' }}
            <MoveRight v-if="!isLoading" class="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
