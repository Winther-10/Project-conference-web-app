<script setup>
definePageMeta({ layout: false });
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Eye, EyeOff, Lock, Mail, MoveRight, CalendarDays, MapPin, Sparkles, LogIn, FileText, CheckCircle } from 'lucide-vue-next';
import { useAuth } from '~/composables/useAuth';
import { useSupabase } from '~/composables/useSupabase';

const router = useRouter();
const { signIn } = useAuth();
const supabase = useSupabase();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const isLoading = ref(false);
const toast = ref(null);

const conferenceSettings = ref({});

onMounted(async () => {
  try {
    const { data } = await supabase.from('system_settings').select('config_json').eq('id', 1).maybeSingle();
    if (data?.config_json?.conference) {
      conferenceSettings.value = data.config_json.conference;
    }
  } catch (err) {}
});

// Format ISO date → Thai short date string
const enMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return `${d.getDate()} ${enMonths[d.getMonth()]} ${d.getFullYear()}`;
  } catch { return iso; }
};

const brandFacts = computed(() => [
  {
    label: conferenceSettings.value.dates?.conferenceDate
      ? formatDate(conferenceSettings.value.dates.conferenceDate)
      : '—',
    icon: CalendarDays,
    color: 'bg-purple-100 text-purple-600 border-purple-200/50'
  },
  {
    label: conferenceSettings.value.venue || '—',
    icon: MapPin,
    color: 'bg-fuchsia-100 text-fuchsia-600 border-fuchsia-200/50'
  },
  {
    label: conferenceSettings.value.theme || 'Innovations for Sustainable Future',
    icon: Sparkles,
    color: 'bg-indigo-100 text-indigo-600 border-indigo-200/50'
  }
]);

const showToast = (message, tone = 'ok') => {
  toast.value = { message, tone };
  window.setTimeout(() => { toast.value = null; }, 3000);
};

const canLogin = computed(() => email.value.trim().length > 0 && password.value.length > 0);

const handleLogin = async () => {
  if (!canLogin.value || isLoading.value) return;
  isLoading.value = true;
  
  try {
    const { user, error } = await signIn(email.value.trim(), password.value);
    if (error) throw error;
    
    // Role validation during login
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.role !== 'author') {
      await supabase.auth.signOut();
      throw new Error('บัญชีนี้ไม่มีสิทธิ์เข้าใช้งาน Author Portal (เฉพาะผู้ส่งบทความเท่านั้น)');
    }

    showToast('เข้าสู่ระบบสำเร็จ กำลังพาท่านไปหน้าหลัก...', 'ok');
    setTimeout(() => {
      router.push('/portal/dashboard');
    }, 1500);
  } catch (error) {
    showToast(error.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'err');
  } finally {
    isLoading.value = false;
  }
};

const handleGoogleLogin = async () => {
  isLoading.value = true;
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/portal/complete-profile'
      }
    });
    if (error) throw error;
  } catch (err) {
    showToast('เข้าสู่ระบบด้วย Google ไม่สำเร็จ', 'err');
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="h-screen w-full bg-white overflow-hidden font-sans">
    <div class="h-full grid grid-cols-1 lg:grid-cols-2">
      <!-- Left Side - Visual -->
      <div class="relative overflow-hidden bg-gradient-to-br from-purple-100 via-fuchsia-50 to-indigo-100 text-slate-800 hidden lg:flex flex-col border-r border-purple-100">
        <!-- Animated background blobs -->
        <div class="absolute -top-32 -left-32 w-[450px] h-[450px] bg-purple-300/25 rounded-full blur-[80px] animate-[pulse_7s_ease-in-out_infinite]"></div>
        <div class="absolute bottom-[-100px] right-[-80px] w-[350px] h-[350px] bg-fuchsia-300/20 rounded-full blur-[60px] animate-[pulse_9s_ease-in-out_infinite_reverse]"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] bg-indigo-200/20 rounded-full blur-[50px] animate-[pulse_5s_ease-in-out_infinite]"></div>

        <div class="relative h-full px-12 py-16 flex flex-col z-10">
          <div class="flex items-center gap-4">
            <img src="~/assets/bru-web-logo-en.png" alt="BRU Logo" class="h-10 w-auto object-contain" />
            <div>
              <div class="text-[19px] font-black leading-tight tracking-tight text-purple-900">{{ conferenceSettings.name || 'BRICC Festival' }}</div>
              <div class="text-[11px] font-black text-purple-500 mt-1 uppercase tracking-widest">AUTHOR PORTAL</div>
            </div>
          </div>

          <div class="mt-16 max-w-md">
            <div class="text-4xl md:text-5xl font-black leading-tight tracking-tight text-purple-950">Welcome back,<br/>Sign in to continue</div>
            <div class="mt-4 text-[15px] font-semibold text-purple-700/80 leading-relaxed">เข้าสู่ระบบเพื่อจัดการบทความ ตารางนำเสนอ และติดตามสถานะแบบ Real-time ในที่เดียว</div>

            <div class="mt-10 rounded-[28px] bg-white/60 backdrop-blur-xl border border-white shadow-sm p-8">
              <div class="text-[14px] font-black text-purple-900 tracking-wide">Conference Highlights</div>
              <div class="mt-6 space-y-5">
                <div v-for="f in brandFacts" :key="f.label" class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border transition-all hover:scale-110" :class="f.color">
                    <component :is="f.icon" class="w-5 h-5" />
                  </div>
                  <div class="text-[14px] font-bold text-purple-800/80">{{ f.label }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-auto pt-10 text-[11px] font-black text-purple-400 tracking-widest uppercase">Secure access for conference authors</div>
        </div>
      </div>

      <!-- Right Side - Form -->
      <div class="bg-purple-50/30 flex items-center justify-center px-6 py-12 md:px-12 overflow-y-auto custom-scrollbar">
        <div class="w-full max-w-md">
          <!-- Mobile Header -->
          <div class="lg:hidden mb-10 flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-200 to-indigo-200 text-purple-700 flex items-center justify-center font-black text-[12px] shadow-sm border border-purple-200">BR</div>
            <div>
              <div class="text-[19px] font-black text-slate-900 tracking-tight">Sign In</div>
              <div class="text-[12px] font-bold text-slate-500 mt-0.5">{{ conferenceSettings.name || 'BRICC Festival' }}</div>
            </div>
          </div>

          <div
            v-if="toast"
            :class="[
              'mb-6 h-12 px-5 rounded-2xl border text-[13px] font-black inline-flex items-center transition-all w-full fixed top-6 left-1/2 -translate-x-1/2 z-[100] max-w-md shadow-lg',
              toast.tone === 'err' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            ]"
          >
            <component :is="toast.tone === 'err' ? Sparkles : CheckCircle" class="w-4 h-4 mr-2" />
            {{ toast.message }}
          </div>

          <div class="mt-6 flex items-center gap-4 mb-8">
            <div class="w-12 h-12 rounded-[20px] bg-white border border-purple-100 flex items-center justify-center shadow-sm">
              <LogIn class="w-[22px] h-[22px] text-purple-600" />
            </div>
            <div>
              <div class="text-3xl font-black text-purple-950 tracking-tight">ยินดีต้อนรับกลับ</div>
              <div class="text-[15px] font-semibold text-purple-700/60 mt-1">เข้าสู่ระบบเพื่อจัดการบทความของคุณ</div>
            </div>
          </div>

          <form @submit.prevent="handleLogin" class="space-y-6">
            <div class="rounded-[32px] bg-white border border-purple-100 p-8 shadow-sm space-y-6">
              <div>
                <label class="text-[12px] font-black text-purple-800 block uppercase tracking-wide mb-2">อีเมล (Email)</label>
                <div class="relative">
                  <input
                    v-model="email"
                    type="email"
                    class="w-full h-12 px-4 pl-12 rounded-[20px] bg-purple-50/50 border border-purple-100 text-[14px] font-semibold text-slate-900 placeholder-purple-300 focus:outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100/50 transition-all"
                    placeholder="your@email.com"
                    autocomplete="username"
                    required
                  />
                  <Mail class="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-purple-300" />
                </div>
              </div>

              <div>
                <label class="text-[12px] font-black text-purple-800 block uppercase tracking-wide mb-2">รหัสผ่าน (Password)</label>
                <div class="relative">
                  <input
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    class="w-full h-12 px-4 pl-12 pr-12 rounded-[20px] bg-purple-50/50 border border-purple-100 text-[14px] font-semibold text-slate-900 placeholder-purple-300 focus:outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100/50 transition-all"
                    placeholder="*******************"
                    autocomplete="current-password"
                    required
                  />
                  <Lock class="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-purple-300" />
                  <button
                    type="button"
                    @click="showPassword = !showPassword"
                    class="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-white border border-purple-100 flex items-center justify-center hover:bg-purple-50 transition-colors shadow-sm"
                  >
                    <EyeOff v-if="showPassword" class="w-[14px] h-[14px] text-purple-400" />
                    <Eye v-else class="w-[14px] h-[14px] text-purple-400" />
                  </button>
                </div>
                <div class="mt-3 text-right">
                  <NuxtLink to="/forgot-password" class="text-[12px] font-bold text-purple-500 hover:text-purple-700 transition-colors">ลืมรหัสผ่าน?</NuxtLink>
                </div>
              </div>

              <button
                type="submit"
                :disabled="!canLogin || isLoading"
                :class="[
                  'h-14 w-full rounded-[24px] text-[15px] font-black inline-flex items-center justify-center gap-2 transition-all duration-300 shadow-md mt-2',
                  (canLogin && !isLoading) ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-purple-300/40 hover:-translate-y-0.5' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                ]"
              >
                {{ isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ (Sign In)' }}
                <MoveRight v-if="!isLoading" class="w-5 h-5" />
              </button>

              <div class="relative mt-6 mb-2">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-purple-100"></div>
                </div>
                <div class="relative flex justify-center text-[12px]">
                  <span class="bg-white px-3 text-purple-400 font-bold uppercase">หรือเข้าสู่ระบบด้วย</span>
                </div>
              </div>

              <button
                type="button"
                @click="handleGoogleLogin"
                :disabled="isLoading"
                class="h-14 w-full rounded-[24px] border-2 border-purple-100 bg-white hover:bg-purple-50 hover:border-purple-200 text-slate-700 font-black text-[15px] inline-flex items-center justify-center gap-3 transition-all duration-300 disabled:opacity-50"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.79 15.72 17.57V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
                  <path d="M12 23C14.97 23 17.46 22.02 19.28 20.34L15.72 17.57C14.73 18.23 13.48 18.63 12 18.63C9.14 18.63 6.72 16.7 5.84 14.12H2.18V16.96C3.99 20.56 7.7 23 12 23Z" fill="#34A853"/>
                  <path d="M5.84 14.12C5.61 13.46 5.48 12.75 5.48 12C5.48 11.25 5.61 10.54 5.84 9.88V7.04H2.18C1.43 8.55 1 10.22 1 12C1 13.78 1.43 15.45 2.18 16.96L5.84 14.12Z" fill="#FBBC05"/>
                  <path d="M12 5.38C13.62 5.38 15.06 5.93 16.2 7.02L19.35 3.87C17.45 2.09 14.97 1 12 1C7.7 1 3.99 3.44 2.18 7.04L5.84 9.88C6.72 7.3 9.14 5.38 12 5.38Z" fill="#EA4335"/>
                </svg>
                Google
              </button>
            </div>

            <div class="pt-2 flex flex-col gap-3 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div class="text-[14px] font-bold text-purple-900/60">
                ยังไม่มีบัญชีใช่ไหม?
                <NuxtLink to="/register" class="font-black text-purple-600 hover:text-purple-500 ml-1.5 underline decoration-2 underline-offset-4 decoration-purple-600/30 hover:decoration-purple-500">
                  ลงทะเบียนที่นี่
                </NuxtLink>
              </div>

              <div class="text-[13px] font-semibold text-purple-400">
                ต้องการความช่วยเหลือ?
                <NuxtLink to="/contact" class="font-bold text-purple-600 hover:text-purple-500 ml-1.5">
                  ติดต่อสอบถาม
                </NuxtLink>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}

/* Animations */
.animate-in {
  animation: animate-in 0.5s ease-out backwards;
}
@keyframes animate-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
