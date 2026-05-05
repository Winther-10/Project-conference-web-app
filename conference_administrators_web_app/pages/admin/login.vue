<script setup lang="ts">
definePageMeta({ layout: false });

import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSupabase } from '~/composables/useSupabase';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, AlertCircle, ArrowRight, Cpu, Database, Activity } from 'lucide-vue-next';

const router = useRouter();
const supabase = useSupabase();

const form = ref({ email: '', password: '', remember: false });
const submitting = ref(false);
const errorMessage = ref('');
const pwVisible = ref(false);

const canSubmit = computed(() => form.value.email.trim() && form.value.password.length >= 6);

const onSubmit = async () => {
  if (!canSubmit.value || submitting.value) return;
  submitting.value = true;
  errorMessage.value = '';

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.value.email.trim().toLowerCase(),
      password: form.value.password,
    });

    if (error) {
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage.value = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
      } else {
        errorMessage.value = `เกิดข้อผิดพลาด: ${error.message}`;
      }
      return;
    }

    // Verify admin role
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('user_id', data.user.id)
      .single();

    // Handle case where 'role' column doesn't exist yet (migration not run)
    if (profileError?.code === 'PGRST204' || profileError?.message?.includes('role')) {
      await supabase.auth.signOut();
      errorMessage.value = '⚠️ ยังไม่ได้รัน SQL Migration — กรุณาเปิด Supabase SQL Editor แล้วรันไฟล์ supabase-migration.sql ก่อน';
      return;
    }

    // Handle case where user profile doesn't exist yet
    if (profileError?.code === 'PGRST116') {
      await supabase.auth.signOut();
      errorMessage.value = 'ไม่พบข้อมูลผู้ใช้ในฐานข้อมูล กรุณารัน SQL Migration ก่อน';
      return;
    }

    if (profileError) {
      await supabase.auth.signOut();
      errorMessage.value = `เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์: ${profileError.message}`;
      return;
    }

    if (!profile || profile.role !== 'admin') {
      await supabase.auth.signOut();
      errorMessage.value = 'บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ กรุณาติดต่อผู้รับผิดชอบ';
      return;
    }

    await router.push('/');
  } catch (e) {
    errorMessage.value = e?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่';
  } finally {
    submitting.value = false;
  }
};

const conferenceName = ref('BRICC Festival');

onMounted(async () => {
  try {
    const { data } = await supabase.from('system_settings').select('config_json').single();
    if (data?.config_json?.conference?.name) {
      conferenceName.value = data.config_json.conference.name;
    }
  } catch (err) {}
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 font-['Sarabun'] relative overflow-hidden">
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute -top-24 -left-20 w-[34rem] h-[34rem] rounded-full bg-purple-200/45 blur-3xl animate-blob" />
      <div class="absolute -bottom-24 right-0 w-[30rem] h-[30rem] rounded-full bg-indigo-200/45 blur-3xl animate-blob animation-delay-2000" />
    </div>

    <div class="relative z-10 min-h-screen px-4 py-10 md:py-14">
      <div class="mx-auto w-full max-w-7xl">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <!-- Left -->
          <section class="animate-fade-in">
            <div class="flex items-center gap-4 mb-12">
              <img src="~/assets/bru-web-logo-en.png" alt="BRU Logo" class="h-12 w-auto object-contain" />
              <div>
                <p class="text-[20px] font-black text-purple-900 leading-tight">{{ conferenceName }}</p>
                <p class="text-[11px] text-purple-700 font-black tracking-widest uppercase font-en mt-1">Admin Portal Control</p>
              </div>
            </div>

            <h1 class="text-4xl md:text-6xl font-black text-purple-900 leading-[1.02] tracking-tight">
              ศูนย์ควบคุมผู้ดูแลระบบ
            </h1>
            <p class="mt-6 text-[17px] text-purple-800/80 max-w-xl leading-relaxed">
              เข้าสู่ระบบเพื่อจัดการบทความ ตารางนำเสนอ สิทธิ์การใช้งาน และติดตามสถานะของระบบแบบ Real-time
            </p>

            <div class="mt-10 max-w-xl rounded-3xl bg-white/75 border border-purple-100 shadow-soft p-7 backdrop-blur-sm">
              <p class="font-black text-purple-900 text-[15px] font-en uppercase tracking-wide">System Snapshot</p>
              <div class="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="rounded-2xl border border-purple-100 bg-purple-50/60 p-4">
                  <div class="flex items-center justify-between">
                    <Cpu class="h-4 w-4 text-purple-700" />
                    <span class="text-[11px] font-black text-purple-700 font-en">CORE</span>
                  </div>
                  <p class="mt-2 text-[13px] font-bold text-purple-900">Admin Console</p>
                </div>
                <div class="rounded-2xl border border-purple-100 bg-purple-50/60 p-4">
                  <div class="flex items-center justify-between">
                    <Database class="h-4 w-4 text-purple-700" />
                    <span class="text-[11px] font-black text-purple-700 font-en">DATA</span>
                  </div>
                  <p class="mt-2 text-[13px] font-bold text-purple-900">Supabase Live</p>
                </div>
                <div class="rounded-2xl border border-purple-100 bg-purple-50/60 p-4">
                  <div class="flex items-center justify-between">
                    <Activity class="h-4 w-4 text-purple-700" />
                    <span class="text-[11px] font-black text-purple-700 font-en">STATUS</span>
                  </div>
                  <p class="mt-2 text-[13px] font-bold text-purple-900">Monitoring</p>
                </div>
              </div>
            </div>
          </section>

          <!-- Right -->
          <section class="animate-fade-in">
            <div class="mx-auto max-w-md">
              <div class="flex items-center gap-2 mb-4">
                <div class="h-8 w-8 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center">
                  <ShieldCheck class="h-4 w-4 text-purple-700" />
                </div>
                <div>
                  <p class="text-4xl font-black text-purple-900">Admin Sign In</p>
                  <p class="text-[14px] text-purple-700/80">เข้าสู่ระบบสำหรับผู้ดูแลระบบเท่านั้น</p>
                </div>
              </div>

              <div class="rounded-[30px] border border-purple-100 bg-white/80 shadow-soft backdrop-blur-sm p-7">
                <form class="space-y-5" @submit.prevent="onSubmit">
                  <div>
                    <label class="block text-[12px] font-black text-purple-800 uppercase tracking-wide font-en">Email</label>
                    <div class="relative mt-2">
                      <Mail class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300" />
                      <input
                        v-model="form.email"
                        type="email"
                        autocomplete="username"
                        class="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-purple-100 text-purple-900 text-[15px] placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-300 transition-all font-en"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label class="block text-[12px] font-black text-purple-800 uppercase tracking-wide font-en">Password</label>
                    <div class="relative mt-2">
                      <Lock class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300" />
                      <input
                        v-model="form.password"
                        :type="pwVisible ? 'text' : 'password'"
                        autocomplete="current-password"
                        class="w-full pl-11 pr-12 py-3 rounded-2xl bg-white border border-purple-100 text-purple-900 text-[15px] placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-300 transition-all font-en"
                        placeholder="****************"
                      />
                      <button
                        type="button"
                        class="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl bg-purple-50 hover:bg-purple-100 inline-flex items-center justify-center transition-colors text-purple-500"
                        @click="pwVisible = !pwVisible"
                      >
                        <Eye v-if="!pwVisible" class="w-4 h-4" />
                        <EyeOff v-else class="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div v-if="errorMessage" class="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100 animate-fade-in">
                    <AlertCircle class="w-4 h-4 text-rose-500 shrink-0" />
                    <span class="text-[13px] font-semibold text-rose-700">{{ errorMessage }}</span>
                  </div>

                  <button
                    type="submit"
                    class="w-full h-12 rounded-2xl text-[15px] font-black inline-flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden group/btn"
                    :class="canSubmit && !submitting
                      ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white hover:from-purple-800 hover:to-indigo-800 shadow-lg shadow-purple-900/20'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'"
                    :disabled="!canSubmit || submitting"
                  >
                    <span v-if="submitting" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <ShieldCheck v-else class="w-4 h-4" />
                    {{ submitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบผู้ดูแล (Sign In)' }}
                    <ArrowRight v-if="!submitting" class="w-4 h-4" />
                  </button>
                </form>
              </div>

              <div class="mt-8 text-center">
                <p class="text-[13px] text-purple-700/80">
                  บัญชีผู้ดูแลระบบจะถูกสร้างโดยผู้รับผิดชอบระบบเท่านั้น
                </p>
                <p class="text-[12px] text-purple-500 mt-2">
                  ต้องการความช่วยเหลือ?
                  <a href="mailto:support@icsci.bru.ac.th" class="font-black text-purple-700 hover:text-purple-900 transition-colors">ติดต่อสอบถาม</a>
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>
