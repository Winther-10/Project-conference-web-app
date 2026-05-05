<script setup>
import {
  ArrowLeft,
  ChevronDown,
  FileText,
  Paperclip,
  User
} from 'lucide-vue-next';

const route = useRoute();
const paperId = computed(() => String(route.params.id || ''));

const papers = useState('papers', () => []);
const reviewers = useState('reviewers', () => []);

const paper = computed(() => papers.value.find((p) => p.id === paperId.value) || null);

const reviewerByIdMap = computed(() => new Map(reviewers.value.map((r) => [r.id, r])));

const reviewerById = (id) => reviewerByIdMap.value.get(id) || null;

const formatDateTh = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const decisionLabel = (d) => {
  if (!d) return 'ยังไม่สรุปผล';
  if (d === 'accept') return 'ยอมรับ';
  if (d === 'minor') return 'แก้เล็กน้อย';
  if (d === 'major') return 'แก้มาก';
  if (d === 'reject') return 'ปฏิเสธ';
  return String(d);
};

const decisionClass = (d) => {
  if (!d) return 'bg-slate-50 text-slate-700 border-slate-200';
  if (d === 'accept') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (d === 'minor') return 'bg-sky-50 text-sky-800 border-sky-200';
  if (d === 'major') return 'bg-amber-50 text-amber-800 border-amber-200';
  if (d === 'reject') return 'bg-rose-50 text-rose-800 border-rose-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
};

const statusLabel = (s) => {
  if (s === 'done') return 'ประเมินแล้ว';
  if (s === 'pending') return 'รอประเมิน';
  if (s === 'assigned') return 'มอบหมายแล้ว';
  return String(s || '');
};

const statusClass = (s) => {
  if (s === 'done') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (s === 'pending') return 'bg-amber-50 text-amber-800 border-amber-200';
  if (s === 'assigned') return 'bg-indigo-50 text-indigo-800 border-indigo-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
};

const reviewerCommentsOpen = ref(false);

const topRightStatusLabel = computed(() => {
  if (!paper.value) return '';
  if (paper.value.paperStatus === 'accepted') return 'ยอมรับแล้ว';
  if (paper.value.paperStatus === 'rejected') return 'ปฏิเสธแล้ว';
  if (paper.value.paperStatus === 'revision') return 'รอผู้แต่งแก้ไข';
  if (paper.value.paperStatus === 'reviewing') return 'กำลังประเมิน';
  return 'รอประเมิน';
});

const topRightStatusClass = computed(() => {
  if (!paper.value) return 'bg-slate-200 text-slate-700';
  if (paper.value.paperStatus === 'accepted') return 'bg-emerald-600 text-white';
  if (paper.value.paperStatus === 'rejected') return 'bg-rose-600 text-white';
  if (paper.value.paperStatus === 'revision') return 'bg-violet-600 text-white';
  if (paper.value.paperStatus === 'reviewing') return 'bg-slate-700 text-white';
  return 'bg-amber-600 text-white';
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 font-['Kanit'] text-slate-800">
    <div class="max-w-5xl mx-auto px-6 py-8">
      <div class="flex items-center justify-between gap-4 mb-6">
        <NuxtLink
          to="/papers"
          class="inline-flex items-center gap-2 text-xs font-black text-slate-700 hover:text-slate-900"
        >
          <ArrowLeft class="w-4 h-4" />
          กลับไปหน้าจัดการบทความ
        </NuxtLink>

        <div v-if="paper" class="h-10 px-5 rounded-full inline-flex items-center justify-center text-xs font-black" :class="topRightStatusClass">
          {{ topRightStatusLabel }}
        </div>
      </div>

      <div v-if="!paper" class="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <div class="text-sm font-black text-slate-800">ไม่พบบทความ</div>
        <div class="text-xs text-slate-500 font-semibold mt-1">รหัส: {{ paperId }}</div>
      </div>

      <div v-else class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="px-8 py-6">
          <div class="text-[11px] text-slate-500 font-black">รหัสบทความ: {{ paper.id }}</div>
          <div class="text-2xl font-black text-slate-900 mt-2">{{ paper.title }}</div>
          <div class="text-xs text-slate-600 font-semibold mt-2">ชื่อบทความภาษาอังกฤษ: -</div>
        </div>

        <div class="h-px bg-slate-200"></div>

        <div class="px-8 py-6 space-y-6">
          <div>
            <div class="text-sm font-black text-slate-800 mb-2">บทคัดย่อ</div>
            <div class="text-xs font-semibold text-slate-700 leading-relaxed">
              {{ paper.abstract || '-' }}
            </div>
          </div>

          <div>
            <div class="text-sm font-black text-slate-800 mb-2">กลุ่มบทความ</div>
            <div class="text-xs font-semibold text-slate-700">{{ paper.category || '-' }}</div>
          </div>

          <div>
            <div class="text-sm font-black text-slate-800 mb-3">ผู้ส่งบทความ (Corresponding Author)</div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                <User class="w-5 h-5 text-slate-600" />
              </div>
              <div class="min-w-0">
                <div class="text-xs font-black text-slate-800 truncate">{{ paper.author }}</div>
                <div class="text-[11px] text-slate-600 font-semibold truncate">{{ paper.correspondingEmail || '-' }}</div>
              </div>
            </div>
          </div>

          <div>
            <div class="text-sm font-black text-slate-800 mb-3">ผู้ร่วมเขียน</div>
            <div class="space-y-2">
              <div
                v-for="(a, idx) in (paper.coAuthors || [])"
                :key="idx"
                class="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3"
              >
                <div class="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center">
                  <User class="w-5 h-5 text-slate-600" />
                </div>
                <div class="min-w-0">
                  <div class="text-xs font-black text-slate-800 truncate">{{ a.name }}</div>
                  <div class="text-[11px] text-slate-600 font-semibold truncate">{{ a.email }}</div>
                </div>
              </div>
              <div v-if="(paper.coAuthors || []).length === 0" class="text-xs font-semibold text-slate-500">-</div>
            </div>
          </div>

          <div>
            <div class="text-sm font-black text-slate-800 mb-3">ไฟล์ต้นฉบับ</div>
            <div class="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between gap-4">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                  <FileText class="w-5 h-5 text-slate-700" />
                </div>
                <div class="min-w-0">
                  <div class="text-xs font-black text-slate-800 truncate">{{ paper.file?.name || '-' }}</div>
                  <div class="text-[11px] text-slate-500 font-semibold">ขนาดไฟล์: {{ paper.file?.size || '-' }}</div>
                </div>
              </div>
              <button type="button" class="h-9 px-4 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 inline-flex items-center gap-2">
                <Paperclip class="w-4 h-4" />
                ดาวน์โหลด
              </button>
            </div>
          </div>

          <div>
            <div class="text-xl font-black text-slate-900 mb-4">กระบวนการประเมิน</div>

            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div class="text-sm font-black text-slate-800">ผู้ทรงคุณวุฒิที่ได้รับมอบหมาย ({{ (paper.assignments || []).length }}/{{ paper.reviewersTotal || 0 }})</div>
              <div class="mt-3 space-y-2">
                <div
                  v-for="a in (paper.assignments || [])"
                  :key="a.reviewerId"
                  class="flex items-center justify-between gap-3"
                >
                  <div class="text-xs font-black text-slate-700">
                    {{ reviewerById(a.reviewerId)?.name || a.reviewerId }}
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="inline-flex items-center justify-center px-2.5 py-1 rounded-full border text-[10px] font-black" :class="statusClass(a.status)">
                      {{ statusLabel(a.status) }}
                    </span>
                    <span class="inline-flex items-center justify-center px-2.5 py-1 rounded-full border text-[10px] font-black" :class="decisionClass(a.decision)">
                      {{ decisionLabel(a.decision) }}
                    </span>
                  </div>
                </div>

                <div v-if="(paper.assignments || []).length === 0" class="text-xs font-semibold text-slate-500">ยังไม่มี reviewer ที่ได้รับมอบหมาย</div>
              </div>

              <div class="h-px bg-slate-200 my-5"></div>

              <div class="text-sm font-black text-slate-800 mb-3">ผลการประเมิน (สำหรับ Admin)</div>
              <button
                type="button"
                class="w-full h-12 rounded-xl bg-white border border-slate-200 px-4 text-left flex items-center justify-between"
                @click="reviewerCommentsOpen = !reviewerCommentsOpen"
              >
                <div class="text-xs font-black text-slate-700">แสดงความคิดเห็น Reviewer</div>
                <ChevronDown class="w-4 h-4 text-slate-500 transition-transform" :class="reviewerCommentsOpen ? 'rotate-180' : ''" />
              </button>

              <div v-if="reviewerCommentsOpen" class="mt-3 rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <div v-for="a in (paper.assignments || [])" :key="a.reviewerId" class="rounded-2xl border border-slate-200 bg-white p-4">
                  <div class="text-xs font-black text-slate-800">{{ reviewerById(a.reviewerId)?.name || a.reviewerId }}</div>
                  <div class="text-[11px] text-slate-500 font-semibold mt-1">{{ a.comment || '-' }}</div>
                </div>
                <div v-if="(paper.assignments || []).length === 0" class="text-xs font-semibold text-slate-500">-</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
