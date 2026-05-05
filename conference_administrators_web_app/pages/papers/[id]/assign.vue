<script setup>
import { computed } from 'vue';
import { ArrowLeft, ClipboardCheck, UserCheck } from 'lucide-vue-next';

const route = useRoute();
const paperId = computed(() => String(route.params.id || ''));

const papers = useState('papers', () => []);
const reviewers = useState('reviewers', () => []);

const paper = computed(() => papers.value.find((p) => p.id === paperId.value) || null);

const reviewerById = (id) => reviewers.value.find((r) => r.id === id) || null;

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
</script>

<template>
  <div class="min-h-screen bg-slate-50 font-['Kanit'] text-slate-800">
    <div class="max-w-4xl mx-auto px-6 py-8">
      <div class="flex items-center justify-between gap-4 mb-6">
        <NuxtLink
          :to="paper ? `/papers/${paper.id}` : '/'"
          class="h-10 px-4 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
        >
          <ArrowLeft class="w-4 h-4" />
          กลับ
        </NuxtLink>

        <div class="flex items-center gap-2 text-sm font-black text-slate-800">
          <ClipboardCheck class="w-5 h-5" />
          จับคู่ (Assign)
        </div>
      </div>

      <div v-if="!paper" class="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <div class="text-sm font-black text-slate-800">ไม่พบบทความ</div>
        <div class="text-xs text-slate-500 font-semibold mt-1">รหัส: {{ paperId }}</div>
      </div>

      <div v-else class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div class="px-6 py-5 border-b border-slate-200 bg-slate-50">
          <div class="text-[11px] font-black text-slate-500">รหัสบทความ: {{ paper.id }}</div>
          <div class="text-lg font-black text-slate-900 mt-1">{{ paper.title }}</div>
        </div>

        <div class="p-6 space-y-5">
          <div class="rounded-2xl border border-slate-200 bg-white p-5">
            <div class="flex items-center gap-2 mb-3">
              <UserCheck class="w-5 h-5 text-indigo-600" />
              <div class="text-sm font-black text-slate-800">ผลการจับคู่ผู้ประเมิน (Assignment Result)</div>
            </div>

            <div v-if="(paper.assignments || []).length === 0" class="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div class="text-xs font-black text-amber-900">ยังไม่มีผู้ประเมินที่ถูกจับคู่</div>
              <div class="text-[11px] font-semibold text-amber-800 mt-1">หน้านี้เป็นหน้าสรุปผลการจับคู่ (Demo)</div>
            </div>

            <div v-else class="space-y-2">
              <div
                v-for="a in (paper.assignments || [])"
                :key="a.reviewerId"
                class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div class="min-w-0">
                  <div class="text-xs font-black text-slate-800 truncate">{{ reviewerById(a.reviewerId)?.name || a.reviewerId }}</div>
                  <div class="text-[11px] font-semibold text-slate-500 truncate">{{ reviewerById(a.reviewerId)?.email || '-' }}</div>
                </div>
                <span class="inline-flex items-center justify-center px-2.5 py-1 rounded-full border text-[10px] font-black" :class="statusClass(a.status)">
                  {{ statusLabel(a.status) }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2">
            <NuxtLink
              :to="`/papers/${paper.id}`"
              class="h-10 px-4 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-700 hover:bg-slate-50"
            >
              ดูรายละเอียดบทความ
            </NuxtLink>
            <NuxtLink
              to="/"
              class="h-10 px-4 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800"
            >
              กลับหน้า Dashboard
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
