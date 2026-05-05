<script setup>
definePageMeta({ middleware: 'auth', layout: 'admin' });
import { computed, ref, onMounted } from 'vue';
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  CreditCard,
  Download,
  FileText,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Users,
  Zap
} from 'lucide-vue-next';



const supabase = useSupabase();
const papers = ref([]);
const loading = ref(true);
const fiscalYear = ref('2569'); // Default for current cycle
const fiscalYearOptions = ['2569', '2568', '2567'];

const loadData = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from('papers')
      .select('paper_id, status, track, created_at');
    
    if (error) throw error;
    papers.value = data || [];
  } catch (err) {
    console.error('Error loading report data:', err);
  } finally {
    loading.value = false;
  }
};

const categories = computed(() => {
  const tracksMap = {};
  papers.value.forEach(p => {
    const t = p.track || 'Uncategorized';
    if (!tracksMap[t]) {
      tracksMap[t] = { name: t, total: 0, pending: 0, accepted: 0, rejected: 0 };
    }
    tracksMap[t].total++;
    if (p.status === 'accepted') tracksMap[t].accepted++;
    else if (p.status === 'rejected') tracksMap[t].rejected++;
    else if (p.status === 'pending_review' || p.status === 'reviewing' || !p.status) tracksMap[t].pending++;
  });
  
  return Object.values(tracksMap).sort((a, b) => b.total - a.total);
});

const totals = computed(() => {
  return categories.value.reduce(
    (acc, c) => {
      acc.total += c.total;
      acc.pending += c.pending;
      acc.accepted += c.accepted;
      acc.rejected += c.rejected;
      return acc;
    },
    { total: 0, pending: 0, accepted: 0, rejected: 0 }
  );
});

const maxCategoryTotal = computed(() => Math.max(...categories.value.map((c) => c.total), 1));

const monthlyTrend = computed(() => {
  const counts = new Array(12).fill(0);
  papers.value.forEach(p => {
    if (p.created_at) {
      const month = new Date(p.created_at).getMonth();
      counts[month]++;
    }
  });
  return counts;
});

const maxMonth = computed(() => Math.max(...monthlyTrend.value, 1));

const linePoints = computed(() => {
  const values = monthlyTrend.value;
  const w = 720;
  const h = 220;
  const pad = 16;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  return values
    .map((v, i) => {
      const x = pad + (innerW * i) / (values.length - 1);
      const y = pad + innerH - (innerH * v) / maxMonth.value;
      return `${x},${y}`;
    })
    .join(' ');
});

const exportPdf = () => {
  window.print();
};

onMounted(loadData);
</script>

<template>
  <div class="p-8 pb-32 font-['Sarabun'] animate-fade-in">
    <div class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-black text-slate-800 mb-1">📝 รายงานผล: การส่งบทความ (Submission Report)</h2>
        <p class="text-sm text-slate-500 font-en">Submission Analytics & Status Overview</p>
      </div>
      
      <div class="flex items-center gap-3">
        <button @click="loadData" class="h-10 px-4 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-all">
          <RefreshCw class="w-3.5 h-3.5" :class="loading ? 'animate-spin' : ''" />
          รีเฟรช
        </button>
        <select v-model="fiscalYear" class="h-10 px-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none">
          <option v-for="y in fiscalYearOptions" :key="y" :value="y">ปีงบประมาณ {{ y }}</option>
        </select>
        <button type="button" class="h-10 px-4 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 inline-flex items-center gap-2" @click="exportPdf">
          <Download class="w-4 h-4" />
          Export Report
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-40 flex flex-col items-center justify-center gap-4 text-slate-400">
      <RefreshCw class="w-10 h-10 animate-spin" />
      <div class="text-sm font-bold">กำลังรวบรวมข้อมูลรายงาน...</div>
    </div>

    <div v-else>



        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div class="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div class="text-[11px] font-black text-slate-500">บทความทั้งหมด</div>
            <div class="mt-2 text-3xl font-black text-slate-900">{{ totals.total }}</div>
            <div class="mt-2 text-xs font-semibold text-slate-500">FY {{ fiscalYear }}</div>
          </div>
          <div class="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div class="text-[11px] font-black text-slate-500">รอตรวจ</div>
            <div class="mt-2 text-3xl font-black text-amber-700">{{ totals.pending }}</div>
            <div class="mt-2 text-xs font-semibold text-slate-500">Needs review</div>
          </div>
          <div class="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div class="text-[11px] font-black text-slate-500">อนุมัติ</div>
            <div class="mt-2 text-3xl font-black text-emerald-700">{{ totals.accepted }}</div>
            <div class="mt-2 text-xs font-semibold text-slate-500">Accepted</div>
          </div>
          <div class="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div class="text-[11px] font-black text-slate-500">ปฏิเสธ</div>
            <div class="mt-2 text-3xl font-black text-rose-700">{{ totals.rejected }}</div>
            <div class="mt-2 text-xs font-semibold text-slate-500">Rejected</div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm font-black text-slate-800">จำนวนบทความแยกตามสาขา</div>
                <div class="text-xs font-semibold text-slate-500 mt-1">(Bar Chart)</div>
              </div>
              <div class="text-xs font-bold text-slate-500">จำนวน (paper)</div>
            </div>

            <div class="mt-5 space-y-3">
              <div v-for="c in categories" :key="c.name" class="flex items-center gap-3">
                <div class="w-40 text-xs font-bold text-slate-700">{{ c.name }}</div>
                <div class="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div class="h-full bg-indigo-600" :style="{ width: `${Math.round((c.total / maxCategoryTotal) * 100)}%` }"></div>
                </div>
                <div class="w-10 text-right text-xs font-black text-slate-800">{{ c.total }}</div>
              </div>
            </div>
          </div>

          <div class="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm font-black text-slate-800">แนวโน้มการส่งบทความรายเดือน</div>
                <div class="text-xs font-semibold text-slate-500 mt-1">(Line Chart)</div>
              </div>
              <div class="text-xs font-bold text-slate-500">สูงสุด {{ maxMonth }}</div>
            </div>

            <div class="mt-4">
              <svg viewBox="0 0 720 220" class="w-full h-[220px]">
                <polyline :points="linePoints" fill="none" stroke="#4F46E5" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
                <line x1="16" y1="204" x2="704" y2="204" stroke="#E2E8F0" stroke-width="2" />
              </svg>
              <div class="mt-1 grid grid-cols-12 gap-1 text-[10px] font-bold text-slate-500">
                <div v-for="m in 12" :key="m" class="text-center">{{ m }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-black text-slate-800">Summary Data Table</div>
              <div class="text-xs font-semibold text-slate-500 mt-1">รายละเอียดตามสาขา</div>
            </div>
          </div>

          <div class="mt-4 overflow-x-auto">
            <table class="min-w-full">
              <thead class="bg-slate-50">
                <tr class="text-[11px] font-black text-slate-700">
                  <th class="px-4 py-3 text-left">สาขา</th>
                  <th class="px-4 py-3 text-right">ทั้งหมด</th>
                  <th class="px-4 py-3 text-right">รอตรวจ</th>
                  <th class="px-4 py-3 text-right">อนุมัติ</th>
                  <th class="px-4 py-3 text-right">ปฏิเสธ</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="c in categories" :key="c.name" class="bg-white">
                  <td class="px-4 py-3 text-xs font-bold text-slate-800">{{ c.name }}</td>
                  <td class="px-4 py-3 text-xs font-black text-slate-800 text-right">{{ c.total }}</td>
                  <td class="px-4 py-3 text-xs font-black text-amber-700 text-right">{{ c.pending }}</td>
                  <td class="px-4 py-3 text-xs font-black text-emerald-700 text-right">{{ c.accepted }}</td>
                  <td class="px-4 py-3 text-xs font-black text-rose-700 text-right">{{ c.rejected }}</td>
                </tr>
                <tr class="bg-slate-50">
                  <td class="px-4 py-3 text-xs font-black text-slate-700">รวม</td>
                  <td class="px-4 py-3 text-xs font-black text-slate-900 text-right">{{ totals.total }}</td>
                  <td class="px-4 py-3 text-xs font-black text-amber-700 text-right">{{ totals.pending }}</td>
                  <td class="px-4 py-3 text-xs font-black text-emerald-700 text-right">{{ totals.accepted }}</td>
                  <td class="px-4 py-3 text-xs font-black text-rose-700 text-right">{{ totals.rejected }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
    </div>
  </div>

</template>

<style scoped>
@media print {
  .sidebar-hidden {
    display: none !important;
  }

  header {
    position: static !important;
  }

  main {
    padding: 0 !important;
  }
}
</style>
