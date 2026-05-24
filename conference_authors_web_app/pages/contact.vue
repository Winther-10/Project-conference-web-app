<script setup>
definePageMeta({ layout: 'default' });
import { Phone, Mail, MapPin, Clock, MessageCircle, Send, CheckCircle } from 'lucide-vue-next';
import { ref } from 'vue';

const name = ref('');
const email = ref('');
const message = ref('');
const sent = ref(false);
const isSending = ref(false);

const handleSend = async () => {
  if (!name.value || !email.value || !message.value) return;
  isSending.value = true;
  
  try {
    await $fetch('/api/contact', {
      method: 'POST',
      body: {
        name: name.value,
        email: email.value,
        message: message.value
      }
    });

    sent.value = true;
    setTimeout(() => { 
      sent.value = false; 
      name.value = ''; 
      email.value = ''; 
      message.value = ''; 
    }, 4000);
  } catch (error) {
    console.error('Email error:', error);
    alert('เกิดข้อผิดพลาดในการส่งข้อความ โปรดลองใหม่อีกครั้ง');
  } finally {
    isSending.value = false;
  }
};

const contacts = [
  { icon: Phone, label: 'เบอร์โทรศัพท์', value: '044-123-4567', sub: 'จันทร์–ศุกร์ 08:30–16:30', color: 'purple' },
  { icon: Mail, label: 'อีเมล', value: 'bricc@bru.ac.th', sub: 'ตอบภายใน 24 ชั่วโมง', color: 'indigo' },
  { icon: MapPin, label: 'สถานที่ตั้ง', value: 'อาคาร 24 ชั้น 2', sub: 'มรภ.บุรีรัมย์ ต.บุรีรัมย์', color: 'fuchsia' },
  { icon: Clock, label: 'เวลาทำการ', value: 'จ.–ศ. 08:30–16:30', sub: 'ปิดวันหยุดนักขัตฤกษ์', color: 'amber' },
];

const colorMap = {
  purple: 'bg-purple-100 text-purple-600 border-purple-200',
  indigo: 'bg-indigo-100 text-indigo-600 border-indigo-200',
  fuchsia: 'bg-fuchsia-100 text-fuchsia-600 border-fuchsia-200',
  amber: 'bg-amber-100 text-amber-600 border-amber-200',
};
</script>

<template>
  <div class="flex-1 bg-gradient-to-b from-purple-50 to-white overflow-hidden">

    <!-- Animated blobs -->
    <div class="fixed top-[-100px] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-purple-200/25 rounded-full blur-[100px] animate-[pulse_8s_ease-in-out_infinite] pointer-events-none z-0"></div>
    <div class="fixed bottom-[-80px] right-[-100px] w-[350px] h-[350px] bg-indigo-200/20 rounded-full blur-[80px] animate-[pulse_10s_ease-in-out_infinite_reverse] pointer-events-none z-0"></div>

    <div class="relative z-10 max-w-5xl mx-auto px-6 py-12">

      <!-- Header -->
      <div class="text-center mb-12">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100 border border-purple-200 text-[11px] font-black uppercase tracking-widest text-purple-600 mb-4">
          <MessageCircle class="w-3.5 h-3.5" />
          Contact Us
        </div>
        <h1 class="text-4xl font-black text-purple-950 tracking-tight mb-3">ติดต่อเรา</h1>
        <p class="text-[16px] font-semibold text-purple-700/60 max-w-lg mx-auto leading-relaxed">
          หากท่านมีข้อสงสัยหรือต้องการความช่วยเหลือ สามารถติดต่อทีมงานได้ตามช่องทางด้านล่างนี้
        </p>
      </div>

      <!-- Contact Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div
          v-for="c in contacts"
          :key="c.label"
          class="group rounded-[24px] bg-white/80 backdrop-blur-xl border border-purple-100 p-6 text-center hover:border-purple-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-100/50 transition-all duration-300 cursor-default"
        >
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 border group-hover:scale-110 transition-transform" :class="colorMap[c.color]">
            <component :is="c.icon" class="w-5 h-5" />
          </div>
          <div class="text-[12px] font-black text-purple-950 mb-1">{{ c.label }}</div>
          <div class="text-[13px] font-black text-purple-700 mb-1">{{ c.value }}</div>
          <div class="text-[11px] font-semibold text-purple-400">{{ c.sub }}</div>
        </div>
      </div>

      <!-- Main Content: Form + Map -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- Contact Form -->
        <div class="rounded-[28px] bg-white/80 backdrop-blur-xl border border-purple-100 p-8 shadow-sm">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
              <Send class="w-4 h-4" />
            </div>
            <div>
              <div class="text-[15px] font-black text-purple-950">ส่งข้อความหาเรา</div>
              <div class="text-[12px] font-semibold text-purple-500">เราจะตอบกลับภายใน 24 ชั่วโมง</div>
            </div>
          </div>

          <!-- Success state -->
          <div v-if="sent" class="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center">
            <CheckCircle class="w-10 h-10 text-emerald-500 mx-auto mb-3 animate-bounce" />
            <div class="text-[15px] font-black text-emerald-800 mb-1">ส่งข้อความสำเร็จ!</div>
            <div class="text-[13px] font-semibold text-emerald-600">ทีมงานจะติดต่อกลับภายใน 24 ชั่วโมง</div>
          </div>

          <form v-else @submit.prevent="handleSend" class="space-y-4">
            <div>
              <label class="text-[12px] font-black text-purple-800 uppercase tracking-wide block mb-1.5">ชื่อ - นามสกุล</label>
              <input
                v-model="name"
                type="text"
                placeholder="ดร. สมชาย ใจดี"
                class="w-full h-12 px-4 rounded-2xl bg-purple-50/50 border border-purple-200 text-[14px] font-semibold text-purple-900 placeholder-purple-300 focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100/50 transition-all"
                required
              />
            </div>
            <div>
              <label class="text-[12px] font-black text-purple-800 uppercase tracking-wide block mb-1.5">อีเมล</label>
              <input
                v-model="email"
                type="email"
                placeholder="your@email.com"
                class="w-full h-12 px-4 rounded-2xl bg-purple-50/50 border border-purple-200 text-[14px] font-semibold text-purple-900 placeholder-purple-300 focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100/50 transition-all"
                required
              />
            </div>
            <div>
              <label class="text-[12px] font-black text-purple-800 uppercase tracking-wide block mb-1.5">ข้อความ</label>
              <textarea
                v-model="message"
                rows="4"
                placeholder="กรุณาระบุข้อสงสัยหรือรายละเอียดที่ต้องการสอบถาม..."
                class="w-full px-4 py-3 rounded-2xl bg-purple-50/50 border border-purple-200 text-[14px] font-semibold text-purple-900 placeholder-purple-300 focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100/50 transition-all resize-none"
                required
              ></textarea>
            </div>
            <button
              type="submit"
              :disabled="isSending"
              class="w-full h-12 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-[14px] hover:shadow-[0_8px_30px_rgba(147,51,234,0.3)] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              <Send v-if="!isSending" class="w-4 h-4" />
              <svg v-else class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isSending ? 'กำลังส่ง...' : 'ส่งข้อความ' }}
            </button>
          </form>
        </div>

        <!-- Map -->
        <div class="rounded-[28px] bg-white/80 backdrop-blur-xl border border-purple-100 overflow-hidden shadow-sm">
          <div class="p-6 border-b border-purple-100 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
              <MapPin class="w-4 h-4" />
            </div>
            <div>
              <div class="text-[15px] font-black text-purple-950">ตำแหน่งที่ตั้ง</div>
              <div class="text-[12px] font-semibold text-purple-500">มหาวิทยาลัยราชภัฏบุรีรัมย์</div>
            </div>
          </div>
          <div class="h-[400px]">
            <iframe
              title="BRICC Contact Map"
              class="w-full h-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src="https://www.google.com/maps?q=Buriram+Rajabhat+University&output=embed"
            />
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
