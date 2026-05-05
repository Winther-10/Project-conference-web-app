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
  Settings,
  ShieldCheck,
  Users,
  RefreshCw,
  Search,
} from 'lucide-vue-next';



const supabase = useSupabase();
const users = ref([]);
const loading = ref(true);
const fiscalYear = ref('2569');
const fiscalYearOptions = ['2569', '2568', '2567'];

const loadData = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('user_id, role');
    
    if (error) throw error;
    users.value = data || [];
  } catch (err) {
    console.error('Error loading attendee report:', err);
  } finally {
    loading.value = false;
  }
};

const groups = computed(() => {
  const rolesMap = {};
  users.value.forEach(u => {
    const r = u.role || 'user';
    if (!rolesMap[r]) {
      rolesMap[r] = { type: r, count: 0 };
    }
    rolesMap[r].count++;
  });
  
  return Object.values(rolesMap).sort((a, b) => b.count - a.count);
});

const totals = computed(() => {
  return {
    total: users.value.length
  };
});

const maxGroupCount = computed(() => Math.max(...groups.value.map((g) => g.count), 1));

const donutSegments = computed(() => {
  const total = totals.value.total || 1;
  const r = 54;
  const c = 2 * Math.PI * r;
  
  let currentOffset = 0;
  return groups.value.map((g, idx) => {
    const percent = g.count / total;
    const dash = percent * c;
    const offset = currentOffset;
    currentOffset -= dash;
    
    // Assign colors based on index or role
    const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    return {
      ...g,
      dash: `${dash} ${c - dash}`,
      offset,
      percent: Math.round(percent * 100),
      color: colors[idx % colors.length]
    };
  });
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
        <h2 class="text-2xl font-black text-slate-800 mb-1">📊 รายงานผล: ผู้ลงทะเบียนเข้าร่วม (Attendee Report)</h2>
        <p class="text-sm text-slate-500 font-en">Registration Analytics & Demographic Overview</p>
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
      <div class="text-sm font-bold">กำลังรวบรวมข้อมูลผู้สมัคร...</div>
    </div>

    <div v-else>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div class="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div class="text-[11px] font-black text-slate-500 uppercase tracking-widest">ลงทะเบียนทั้งหมด</div>
            <div class="mt-2 text-3xl font-black text-slate-900">{{ totals.total }}</div>
            <div class="mt-2 text-xs font-semibold text-slate-500">Total registrations</div>
          </div>
          <div v-for="g in groups.slice(0, 2)" :key="g.type" class="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div class="text-[11px] font-black text-slate-500 uppercase tracking-widest">{{ g.type }}</div>
            <div class="mt-2 text-3xl font-black text-indigo-700">{{ g.count }}</div>
            <div class="mt-2 text-xs font-semibold text-slate-500">Real database count</div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm font-black text-slate-800">สัดส่วนประเภทผู้ลงทะเบียน</div>
                <div class="text-xs font-semibold text-slate-500 mt-1">(Demographic Chart)</div>
              </div>
            </div>

            <div class="mt-6 flex items-center gap-10">
              <svg viewBox="0 0 140 140" class="w-[140px] h-[140px]">
                <circle cx="70" cy="70" r="54" fill="none" stroke="#E2E8F0" stroke-width="18" />
                <circle
                  v-for="seg in donutSegments"
                  :key="seg.type"
                  cx="70"
                  cy="70"
                  r="54"
                  fill="none"
                  :stroke="seg.color"
                  stroke-width="18"
                  stroke-linecap="round"
                  :stroke-dasharray="seg.dash"
                  :stroke-dashoffset="seg.offset"
                  transform="rotate(-90 70 70)"
                  class="transition-all duration-1000"
                />
              </svg>

              <div class="space-y-3">
                <div v-for="seg in donutSegments" :key="seg.type" class="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <span class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: seg.color }"></span>
                  <span class="capitalize">{{ seg.type }}</span>
                  <span class="text-slate-500 font-black ml-1">{{ seg.percent }}%</span>
                </div>
              </div>
            </div>
          </div>

          <div class="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm font-black text-slate-800">จำนวนผู้สมัครแยกตามบทบาท</div>
                <div class="text-xs font-semibold text-slate-500 mt-1">(Role Distribution)</div>
              </div>
            </div>

            <div class="mt-5 space-y-4">
              <div v-for="(g, idx) in groups" :key="g.type" class="flex items-center gap-3">
                <div class="w-28 text-xs font-bold text-slate-700 capitalize">{{ g.type }}</div>
                <div class="flex-1 h-4 rounded-full bg-slate-100 overflow-hidden flex">
                  <div class="h-full" :style="{ width: `${Math.round((g.count / maxGroupCount) * 100)}%`, backgroundColor: donutSegments[idx]?.color || '#4F46E5' }"></div>
                </div>
                <div class="w-14 text-right text-[11px] font-black text-slate-800">{{ g.count }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div class="text-sm font-black text-slate-800">Summary Data Table</div>
          <div class="text-xs font-semibold text-slate-500 mt-1">สรุปตามกลุ่มบทบาทผู้ใช้งาน</div>

          <div class="mt-4 overflow-x-auto">
            <table class="min-w-full">
              <thead class="bg-slate-50">
                <tr class="text-[11px] font-black text-slate-700">
                  <th class="px-4 py-3 text-left">บทบาท (Role)</th>
                  <th class="px-4 py-3 text-right">จำนวนทั้งหมด</th>
                  <th class="px-4 py-3 text-right">ร้อยละ</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="seg in donutSegments" :key="seg.type" class="bg-white">
                  <td class="px-4 py-3 text-xs font-bold text-slate-800 capitalize">{{ seg.type }}</td>
                  <td class="px-4 py-3 text-xs font-black text-slate-800 text-right">{{ seg.count }}</td>
                  <td class="px-4 py-3 text-xs font-black text-indigo-700 text-right">{{ seg.percent }}%</td>
                </tr>
                <tr class="bg-slate-50">
                  <td class="px-4 py-3 text-xs font-black text-slate-700">รวมทั้งหมด</td>
                  <td class="px-4 py-3 text-xs font-black text-slate-900 text-right">{{ totals.total }}</td>
                  <td class="px-4 py-3 text-xs font-black text-slate-900 text-right">100%</td>
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
