<script setup>
import { ArrowLeft, Mail, Send } from 'lucide-vue-next';

const route = useRoute();
const paperId = computed(() => String(route.params.id || ''));

const papers = useState('papers', () => []);
const paper = computed(() => papers.value.find((p) => p.id === paperId.value) || null);

const to = computed(() => paper.value?.correspondingEmail || '');

const subject = ref('');
const message = ref('');

const sent = ref(false);

const sendMessage = () => {
  sent.value = true;
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 font-['Kanit'] text-slate-800">
    <div class="max-w-3xl mx-auto px-6 py-8">
      <div class="flex items-center justify-between gap-4 mb-6">
        <NuxtLink
          :to="paper ? `/papers/${paper.id}` : '/papers'"
          class="h-10 px-4 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
        >
          <ArrowLeft class="w-4 h-4" />
          กลับ
        </NuxtLink>

        <div class="flex items-center gap-2 text-sm font-black text-slate-800">
          <Mail class="w-5 h-5" />
          ติดต่อผู้ส่งบทความ
        </div>
      </div>

      <div v-if="!paper" class="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <div class="text-sm font-black text-slate-800">ไม่พบบทความ</div>
        <div class="text-xs text-slate-500 font-semibold mt-1">รหัส: {{ paperId }}</div>
      </div>

      <div v-else class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div class="text-xs font-black text-slate-600">บทความ</div>
        <div class="text-lg font-black text-slate-900 mt-1">{{ paper.title }}</div>
        <div class="text-[11px] text-slate-500 font-semibold mt-1">รหัส: {{ paper.id }}</div>

        <div v-if="sent" class="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div class="text-xs font-black text-emerald-900">ส่งข้อความแล้ว (Mock)</div>
          <div class="text-[11px] text-emerald-800 font-semibold mt-1">ระบบตัวอย่าง: ยังไม่เชื่อม backend/email</div>
        </div>

        <div class="mt-5 space-y-3">
          <div>
            <label class="block text-[11px] font-black text-slate-600 mb-1">ถึง (To)</label>
            <input
              :value="to"
              type="text"
              readonly
              class="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
            />
          </div>

          <div>
            <label class="block text-[11px] font-black text-slate-600 mb-1">หัวเรื่อง (Subject)</label>
            <input
              v-model="subject"
              type="text"
              placeholder="เช่น ขอข้อมูลเพิ่มเติม / แจ้งแก้ไข"
              class="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>

          <div>
            <label class="block text-[11px] font-black text-slate-600 mb-1">ข้อความ (Message)</label>
            <textarea
              v-model="message"
              rows="7"
              placeholder="พิมพ์ข้อความถึงผู้ส่งบทความ..."
              class="w-full px-3 py-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            ></textarea>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <NuxtLink
              :to="`/papers/${paper.id}`"
              class="h-10 px-4 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-700 hover:bg-slate-50"
            >
              ยกเลิก
            </NuxtLink>
            <button
              type="button"
              class="h-10 px-4 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 inline-flex items-center gap-2"
              @click="sendMessage"
            >
              <Send class="w-4 h-4" />
              ส่งข้อความ
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
