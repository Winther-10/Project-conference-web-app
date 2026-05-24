<script setup>
definePageMeta({ layout: false });
import { ref } from 'vue';
import { Mail, ArrowLeft, KeyRound, CheckCircle, Sparkles, Send } from 'lucide-vue-next';
import { useSupabase } from '~/composables/useSupabase';

const supabase = useSupabase();
const email = ref('');
const isLoading = ref(false);
const isSent = ref(false);
const toast = ref(null);

const showToast = (message, tone = 'ok') => {
  toast.value = { message, tone };
  setTimeout(() => { toast.value = null; }, 4000);
};

const handleReset = async () => {
  if (!email.value.trim()) {
    showToast('กรุณากรอกอีเมล', 'err');
    return;
  }
  isLoading.value = true;
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.value.trim(), {
      redirectTo: window.location.origin + '/reset-password'
    });
    if (error) throw error;
    isSent.value = true;
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
      <!-- Back to Login -->
      <NuxtLink to="/login" class="inline-flex items-center gap-2 text-[13px] font-bold text-purple-500 hover:text-purple-700 transition-colors mb-8">
        <ArrowLeft class="w-4 h-4" />
        กลับไปหน้าเข้าสู่ระบบ
      </NuxtLink>

      <div class="rounded-[32px] bg-white border border-purple-100 shadow-sm p-8 md:p-10">
        <!-- Icon -->
        <div class="flex justify-center mb-6">
          <div class="w-14 h-14 rounded-[20px] bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center shadow-sm">
            <KeyRound class="w-7 h-7 text-purple-600" />
          </div>
        </div>

        <!-- Before Sent -->
        <div v-if="!isSent">
          <h1 class="text-2xl font-black text-purple-950 tracking-tight text-center">ลืมรหัสผ่าน?</h1>
          <p class="mt-2 text-[14px] font-semibold text-purple-700/60 text-center leading-relaxed">
            กรอกอีเมลที่ใช้ลงทะเบียน เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้ท่าน
          </p>

          <form @submit.prevent="handleReset" class="mt-8 space-y-5">
            <div>
              <label class="text-[12px] font-black text-purple-800 block uppercase tracking-wide mb-2">อีเมล (Email)</label>
              <div class="relative">
                <input
                  v-model="email"
                  type="email"
                  class="w-full h-12 px-4 pl-12 rounded-[20px] bg-purple-50/50 border border-purple-100 text-[14px] font-semibold text-slate-900 placeholder-purple-300 focus:outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100/50 transition-all"
                  placeholder="your@email.com"
                  required
                />
                <Mail class="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-purple-300" />
              </div>
            </div>

            <button
              type="submit"
              :disabled="isLoading || !email.trim()"
              :class="[
                'h-14 w-full rounded-[24px] text-[15px] font-black inline-flex items-center justify-center gap-2 transition-all duration-300 shadow-md',
                (!isLoading && email.trim()) ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-purple-300/40 hover:-translate-y-0.5' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              ]"
            >
              <Send v-if="!isLoading" class="w-4 h-4" />
              {{ isLoading ? 'กำลังส่ง...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน' }}
            </button>
          </form>
        </div>

        <!-- After Sent (Success State) -->
        <div v-else class="text-center">
          <div class="flex justify-center mb-4">
            <div class="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle class="w-7 h-7 text-emerald-600" />
            </div>
          </div>
          <h2 class="text-xl font-black text-slate-900">ส่งลิงก์เรียบร้อยแล้ว!</h2>
          <p class="mt-3 text-[14px] font-semibold text-slate-500 leading-relaxed">
            เราได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปยัง<br/>
            <span class="font-black text-purple-600">{{ email }}</span><br/>
            กรุณาตรวจสอบกล่องจดหมาย (Inbox) หรือโฟลเดอร์สแปม
          </p>
          <button
            @click="isSent = false; email = ''"
            class="mt-6 h-11 px-6 rounded-2xl bg-white border border-slate-200 text-slate-700 text-[13px] font-black hover:bg-slate-50 transition-colors"
          >
            ส่งอีกครั้ง
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
