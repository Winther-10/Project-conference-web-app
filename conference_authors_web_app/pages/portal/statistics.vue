<script setup>
definePageMeta({ layout: 'portal' });
import { ref, computed, onMounted } from 'vue';
import { ChevronDown, Download, Info, CheckCircle2, XCircle, TrendingUp, Users, FileText, Mic, BarChart2 } from 'lucide-vue-next';
import { useSupabase } from '~/composables/useSupabase';

const supabase = useSupabase();

const currentYear = String(new Date().getFullYear());
const year = ref(currentYear);
const dataByYear = ref({});
const availableYears = ref([currentYear]);
const isLoading = ref(true);

onMounted(async () => {
  await fetchStatistics();
});

const fetchStatistics = async () => {
  isLoading.value = true;
  try {
    // Try to fetch historical statistics from a dedicated table if it exists
    const { data, error } = await supabase.from('conference_statistics').select('*');
    
    const statsMap = {};
    if (data && data.length > 0) {
      data.forEach(row => {
        statsMap[row.year.toString()] = {
          yearLabel: `${row.year}`,
          participants: { value: row.participants_count || 0, delta: row.participants_delta || 0 },
          papers: { value: row.papers_count || 0, note: row.papers_note || '' },
          speakers: { value: row.speakers_count || 0 },
          acceptance: { accepted: row.accepted_rate || 0, rejected: 100 - (row.accepted_rate || 0) },
          tracks: row.tracks_data || [], // e.g. [{id: 'cs', label: 'CS', value: 50}]
          satisfaction: row.satisfaction_score || 0
        };
      });
    }

    // Try to aggregate current year from actual tables if not in conference_statistics
    if (!statsMap[currentYear]) {
      // Aggregate data from current year
      const { count: papersCount } = await supabase.from('papers').select('*', { count: 'exact', head: true });
      const { count: acceptedCount } = await supabase.from('papers').select('*', { count: 'exact', head: true }).in('status', ['accepted', 'published']);
      const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true });

      const acceptanceRate = papersCount > 0 ? Math.round((acceptedCount / papersCount) * 100) : 0;
      
      const { data: papersData } = await supabase.from('papers').select('track');
      let trackCounts = {};
      if (papersData) {
        papersData.forEach(p => {
          const t = p.track || 'General';
          trackCounts[t] = (trackCounts[t] || 0) + 1;
        });
      }
      const trackArr = Object.keys(trackCounts).map((k, i) => ({ id: `t${i}`, label: k, value: trackCounts[k] })).sort((a,b) => b.value - a.value);

      statsMap[currentYear] = {
        yearLabel: `${currentYear} (ปีปัจจุบัน)`,
        participants: { value: usersCount || 0, delta: 0 },
        papers: { value: papersCount || 0, note: 'รอสรุปรายสถาบัน' },
        speakers: { value: 0 }, // Would need speakers table
        acceptance: { accepted: acceptanceRate, rejected: 100 - acceptanceRate },
        tracks: trackArr.length > 0 ? trackArr : [{ id: 'cs', label: 'CS & AI', value: papersCount || 0 }],
        satisfaction: 0
      };
    }

    dataByYear.value = statsMap;
    availableYears.value = Object.keys(statsMap).sort((a, b) => b.localeCompare(a));
    if (!availableYears.value.includes(year.value) && availableYears.value.length > 0) {
      year.value = availableYears.value[0];
    }
  } catch (err) {
    console.error(err);
  } finally {
    isLoading.value = false;
  }
};

const currentData = computed(() => {
  return dataByYear.value[year.value] || {
    yearLabel: year.value,
    participants: { value: 0, delta: 0 },
    papers: { value: 0, note: '' },
    speakers: { value: 0 },
    acceptance: { accepted: 0, rejected: 0 },
    tracks: [],
    satisfaction: 0
  };
});

const maxTrack = computed(() => {
  return Math.max(...(currentData.value.tracks || []).map((t) => t.value), 1);
});

const downloadBlob = (filename, mime, content) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
</script>

<template>
  <div class="flex-1 overflow-y-auto px-6 pt-8 pb-32 custom-scrollbar animate-in fade-in duration-300 bg-[#F1F5F9]">
    <div class="max-w-7xl mx-auto w-full">
      <header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-7">
        <div class="min-w-0">
          <div class="text-2xl font-black text-slate-900 truncate flex items-center gap-2"><BarChart2 class="w-6 h-6 text-purple-600" /> สถิติการประชุมย้อนหลัง (Conference Statistics)</div>
          <div class="mt-1 text-sm font-semibold text-slate-500 truncate">ข้อมูลสถิติเพื่อยืนยันคุณภาพและความสำเร็จของงานประชุม</div>
        </div>

        <div class="flex items-center gap-3">
          <div class="text-xs font-black text-slate-500">เลือกดูข้อมูลปี:</div>
          <div class="relative">
            <select
              v-model="year"
              class="h-11 pl-4 pr-10 rounded-2xl bg-white border border-slate-200 text-sm font-black text-slate-800 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 appearance-none"
            >
              <option v-for="y in availableYears" :key="y" :value="y">
                {{ dataByYear[y]?.yearLabel || y }}
              </option>
            </select>
            <ChevronDown class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          </div>
        </div>
      </header>

      <div v-if="isLoading" class="p-12 text-center bg-white rounded-3xl border border-slate-200">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <div class="mt-4 text-sm font-bold text-slate-500">กำลังประมวลผลข้อมูลสถิติ...</div>
      </div>
      
      <div v-else>
        <section class="space-y-4">
          <div class="text-lg font-black text-slate-900 flex items-center gap-2"><TrendingUp class="w-5 h-5 text-indigo-500" /> ภาพรวมความสำเร็จ (Key Metrics)</div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="rounded-3xl bg-white border border-slate-200 p-5">
              <div class="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><Users class="w-3.5 h-3.5" /> Participants</div>
              <div class="mt-2 flex items-end justify-between gap-3">
                <div class="text-3xl font-black text-slate-900">{{ currentData.participants.value }}</div>
                <div v-if="currentData.participants.delta > 0" class="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1">
                  <TrendingUp class="w-3 h-3" /> +{{ currentData.participants.delta }}%
                </div>
              </div>
              <div class="mt-2 text-xs font-semibold text-slate-500">จำนวนผู้เข้าร่วมงาน</div>
            </div>

            <div class="rounded-3xl bg-white border border-slate-200 p-5">
              <div class="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><FileText class="w-3.5 h-3.5" /> Papers</div>
              <div class="mt-2 text-3xl font-black text-slate-900">{{ currentData.papers.value }}</div>
              <div class="mt-2 text-xs font-semibold text-slate-500">{{ currentData.papers.note || 'จำนวนบทความทั้งหมด' }}</div>
            </div>

            <div class="rounded-3xl bg-white border border-slate-200 p-5">
              <div class="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><Mic class="w-3.5 h-3.5" /> Speakers</div>
              <div class="mt-2 text-3xl font-black text-slate-900">{{ currentData.speakers.value }}</div>
              <div class="mt-2 text-xs font-semibold text-slate-500">จำนวนวิทยากร</div>
            </div>
          </div>
        </section>

        <div class="mt-6 h-px bg-slate-200" />

        <section class="mt-6 space-y-4">
          <div class="text-lg font-black text-slate-900 flex items-center gap-2"><BarChart2 class="w-5 h-5 text-purple-500" /> การวิเคราะห์ข้อมูล (Data Analysis)</div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div class="rounded-3xl bg-white border border-slate-200 p-5">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="text-sm font-black text-slate-900">1. อัตราการตอบรับ (Rate)</div>
                  <div class="mt-1 text-xs font-semibold text-slate-500">มาตรฐานการคัดกรองเข้มข้น</div>
                </div>
                <div class="inline-flex items-center gap-2 text-[11px] font-black text-slate-500">
                  <Info class="w-4 h-4" />
                  Hover
                </div>
              </div>

              <div class="mt-5 flex items-center justify-center">
                <div class="relative w-56 h-56 group">
                  <div
                    class="absolute inset-0 rounded-full"
                    :style="{ background: `conic-gradient(#22c55e 0 ${currentData.acceptance.accepted}%, #e2e8f0 ${currentData.acceptance.accepted}% 100%)` }"
                  />
                  <div class="absolute inset-5 rounded-full bg-white border border-slate-200" />
                  <div class="absolute inset-0 flex items-center justify-center">
                    <div class="text-center">
                      <div class="text-4xl font-black text-slate-900">{{ currentData.acceptance.accepted }}%</div>
                      <div class="mt-1 text-xs font-semibold text-slate-500">Accepted</div>
                    </div>
                  </div>

                  <div class="absolute left-1/2 -translate-x-1/2 -bottom-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div class="rounded-2xl bg-slate-900 text-white px-4 py-2 text-[11px] font-black shadow-lg whitespace-nowrap">
                      Accepted {{ currentData.acceptance.accepted }}% | Rejected {{ currentData.acceptance.rejected }}%
                    </div>
                  </div>
                </div>
              </div>

              <div class="mt-5 flex items-center justify-center gap-4">
                <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-black text-emerald-700">
                  <CheckCircle2 class="w-3.5 h-3.5" /> Accepted {{ currentData.acceptance.accepted }}%
                </div>
                <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-black text-slate-700">
                  <XCircle class="w-3.5 h-3.5" /> Rejected {{ currentData.acceptance.rejected }}%
                </div>
              </div>
            </div>

            <div class="rounded-3xl bg-white border border-slate-200 p-5">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="text-sm font-black text-slate-900">2. แบ่งตามสาขา (Track)</div>
                  <div class="mt-1 text-xs font-semibold text-slate-500">จำนวนบทความแยกตามสาขาวิชา</div>
                </div>
                <div class="text-[11px] font-black text-slate-500">Hover bar</div>
              </div>

              <div class="mt-5 space-y-3">
                <div v-if="currentData.tracks.length === 0" class="text-center text-sm font-bold text-slate-400 py-8">
                  ไม่มีข้อมูลสาขา
                </div>
                <div v-for="t in currentData.tracks" :key="t.id" class="group">
                  <div class="flex items-center justify-between gap-3">
                    <div class="text-xs font-black text-slate-700">{{ t.label }}</div>
                    <div class="text-xs font-black text-slate-500">{{ t.value }}</div>
                  </div>
                  <div class="mt-2 h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      class="h-full rounded-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-500"
                      :style="{ width: `${Math.round((t.value / maxTrack) * 100)}%` }"
                    />
                  </div>
                  <div class="mt-2 text-[11px] font-semibold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {{ t.label }}: {{ t.value }} บทความ
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="rounded-3xl bg-white border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div class="text-sm font-black text-slate-900">ความพึงพอใจ (Satisfaction)</div>
              <div class="mt-1 text-xs font-semibold text-slate-500">คะแนนเฉลี่ยจากแบบประเมินหลังงาน</div>
            </div>
            <div class="inline-flex items-center gap-3">
              <div class="text-3xl font-black text-slate-900">{{ currentData.satisfaction.toFixed(1) }}</div>
              <div class="text-xs font-black text-slate-500">/ 5.0</div>
              <div class="inline-flex items-center gap-1 text-yellow-500 text-lg">
                {{ '★★★★★'.slice(0, Math.round(currentData.satisfaction)) }}{{ '☆☆☆☆☆'.slice(0, 5 - Math.round(currentData.satisfaction)) }}
              </div>
            </div>
          </div>

          <div class="flex justify-end">
            <button
              @click="() => {
                const content = `BRICC Conference Statistics Report\nYear: ${year}\n\nParticipants: ${currentData.participants.value}\nPapers: ${currentData.papers.value}\nSpeakers: ${currentData.speakers.value}\nAcceptance: ${currentData.acceptance.accepted}%\n`;
                downloadBlob(`BRICC-Statistics-${year}.pdf`, 'application/pdf', content);
              }"
              class="h-11 px-5 rounded-2xl bg-slate-900 text-white text-sm font-black hover:bg-slate-800 transition-colors inline-flex items-center gap-2"
            >
              <Download class="w-5 h-5" />
              ดาวน์โหลดรายงานสรุป (PDF)
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
