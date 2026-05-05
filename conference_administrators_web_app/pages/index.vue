<script setup>
definePageMeta({ middleware: 'auth', layout: 'admin' });
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useSupabase } from '~/composables/useSupabase';
import {
  Users, FileText, UserCheck, RefreshCw, Zap,
  Clock, CheckCircle2, AlertCircle, Search, Inbox,
  LayoutDashboard, TrendingUp, ArrowRight, BellRing,
  PieChart, Activity, Megaphone, FolderOpen, AlertTriangle,
  BarChart3, UserMinus, Mail, Send
} from 'lucide-vue-next';

const supabase = useSupabase();

// ─── Stats ───
const stats = ref([
  { id: 'users',     label: 'ผู้เข้าร่วมงาน',   value: '—', sub: 'ลงทะเบียนแล้ว',       icon: Users,      color: 'blue'    },
  { id: 'papers',    label: 'บทความทั้งหมด',      value: '—', sub: 'ส่งเข้าระบบ',          icon: FileText,   color: 'purple'  },
  { id: 'pendingReviews', label: 'งานรอดำเนินการ', value: '—', sub: 'งานประเมิน',         icon: Clock,      color: 'amber'   },
  { id: 'reviewers', label: 'กรรมการ (Reviewer)', value: '—', sub: 'ในระบบ',               icon: UserCheck,  color: 'emerald' },
]);

const colorMap = {
  blue:    { card: 'border-blue-100',    icon: 'bg-blue-100 text-blue-600',    num: 'text-blue-700'    },
  purple:  { card: 'border-purple-100',  icon: 'bg-purple-100 text-purple-600', num: 'text-purple-700' },
  amber:   { card: 'border-amber-100',   icon: 'bg-amber-100 text-amber-600',  num: 'text-amber-700'   },
  emerald: { card: 'border-emerald-100', icon: 'bg-emerald-100 text-emerald-600', num: 'text-emerald-700' },
};

const recentPapers = ref([]);
const loadingPapers = ref(true);
const dashboardQuery = ref('');
const statusBreakdown = ref([]);
const delayStats = ref({ overdue: [], atRisk: [] });
const analyticsView = ref('weekly');
const allPaperDates = ref([]);
const autoRemindEnabled = ref(false);

const pipelineStats = ref({
  submitted: { count: 0, pct: 100 },
  assigned:  { count: 0, pct: 0 },
  reviewing: { count: 0, pct: 0 },
  revision:  { count: 0, pct: 0 },
  decision:  { count: 0, pct: 0 }
});

const chartData = computed(() => {
  const dates = allPaperDates.value.map(d => new Date(d));
  if (dates.length === 0) return [];
  const now = new Date();
  const results = [];
  if (analyticsView.value === 'daily') {
    for (let i = 9; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const dayLabel = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
      const count = dates.filter(date => date.toDateString() === d.toDateString()).length;
      results.push({ label: dayLabel, count });
    }
  } else if (analyticsView.value === 'monthly') {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const thMonth = d.toLocaleDateString('th-TH', { month: 'short' });
      const monthLabel = `${thMonth}`;
      const count = dates.filter(date => date.getMonth() === d.getMonth() && date.getFullYear() === d.getFullYear()).length;
      results.push({ label: monthLabel, count });
    }
  } else {
    for (let i = 7; i >= 0; i--) {
      const end = new Date(now); end.setDate(end.getDate() - (i * 7));
      const start = new Date(end); start.setDate(start.getDate() - 6);
      const label = `${start.getDate()}-${end.getDate()} ${end.toLocaleDateString('th-TH', { month: 'short' })}`;
      const count = dates.filter(date => date >= start && date <= end).length;
      results.push({ label, count });
    }
  }
  return results;
});

const loadData = async () => {
  loadingPapers.value = true;
  try {
    const [usersRes, papersRes, reviewersRes, assignmentsRes] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('papers').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'reviewer'),
      supabase.from('review_assignments').select('*, papers(paper_code, status), users(first_name_th, last_name_th)').neq('status', 'completed')
    ]);

    stats.value[0].value = `${usersRes.count ?? 0}`;
    stats.value[1].value = `${papersRes.count ?? 0}`;
    stats.value[3].value = `${reviewersRes.count ?? 0}`;

    const { data: papersData } = await supabase.from('papers').select('*').order('created_at', { ascending: false }).limit(8);
    recentPapers.value = papersData || [];

    const { data: allPapers } = await supabase.from('papers').select('status, created_at, paper_id');
    allPaperDates.value = (allPapers || []).map(p => p.created_at);
    const counts = {};
    (allPapers || []).forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1; });
    statusBreakdown.value = Object.entries(counts).map(([status, count]) => ({ status, count }));
    stats.value[2].value = `${counts.pending || 0}`;

    // Pipeline Logic
    const total = (allPapers || []).length || 1;
    const assignedCount = (allPapers || []).filter(p => (assignmentsRes.data || []).some(a => a.paper_id === p.paper_id)).length;
    
    pipelineStats.value = {
      submitted: { count: total, pct: 100 },
      assigned:  { count: assignedCount, pct: Math.round((assignedCount / total) * 100) },
      reviewing: { count: counts.pending || 0, pct: Math.round(((counts.pending || 0) / total) * 100) },
      revision:  { count: counts.revision || 0, pct: Math.round(((counts.revision || 0) / total) * 100) },
      decision:  { count: (counts.accepted || 0) + (counts.published || 0) + (counts.rejected || 0), pct: Math.round((((counts.accepted || 0) + (counts.published || 0) + (counts.rejected || 0)) / total) * 100) }
    };

    const now = new Date();
    const overdue = []; const atRisk = [];
    (assignmentsRes.data || []).forEach(a => {
      if (!a.deadline) return;
      const deadline = new Date(a.deadline);
      const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
      const info = { 
        id: a.assignment_id, 
        reviewerName: a.users?.first_name_th || 'N/A', 
        paperCode: a.papers?.paper_code || '-', 
        text: diffDays < 0 ? `เกินกำหนด ${Math.abs(diffDays)} วัน` : `เหลือเวลา ${diffDays * 24} ชม.` 
      };
      if (diffDays < 0) overdue.push(info); else if (diffDays <= 3) atRisk.push(info);
    });
    delayStats.value = { overdue, atRisk };
  } catch (e) { console.error(e); } finally { loadingPapers.value = false; }
};

const nudgeReviewer = (id) => alert(`ส่งอีเมลติดตามงาน #${id} สำเร็จ!`);
const changeReviewer = (id) => alert(`เปลี่ยนกรรมการสำหรับงาน #${id}`);

let subscription;
onMounted(() => {
  loadData();
  subscription = supabase.channel('public:papers').on('postgres_changes', { event: '*', schema: 'public', table: 'papers' }, () => loadData()).subscribe();
});
onUnmounted(() => { if (subscription) supabase.removeChannel(subscription); });

const getStatus = (s) => ({
  pending: { label: 'รอตรวจ', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  revision: { label: 'แก้ไข', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  accepted: { label: 'ผ่าน', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'ไม่ผ่าน', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  pending_review: { label: 'รอตรวจสอบ', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  published: { label: 'เผยแพร่แล้ว', color: 'bg-blue-50 text-blue-700 border-blue-200' },
})[s] || { label: s, color: 'bg-slate-50 text-slate-700 border-slate-200' };

const filteredRecentPapers = computed(() => {
  const q = dashboardQuery.value.trim().toLowerCase();
  if (!q) return recentPapers.value;
  return recentPapers.value.filter(p => (p.paper_code || '').toLowerCase().includes(q) || (p.title_th || '').toLowerCase().includes(q));
});

const formatDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  const dayMonth = date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
  const year = date.getFullYear(); // A.D. year
  return `${dayMonth} ${year}`;
};
</script>

<template>
  <div class="p-8 pb-20 font-['Sarabun'] animate-fade-in relative z-10">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <LayoutDashboard class="w-6 h-6 text-purple-600" />
          หน้าหลัก Dashboard
        </h1>
        <p class="text-sm text-slate-500 mt-1">ภาพรวมการจัดการงานประชุมวิชาการ IC-Sci</p>
      </div>
      <button @click="loadData" class="flex items-center gap-2 text-xs font-bold text-purple-700 bg-white hover:bg-purple-50 border border-purple-200 px-4 py-2.5 rounded-xl transition-all shadow-sm">
        <RefreshCw class="w-3.5 h-3.5" :class="loadingPapers ? 'animate-spin' : ''" /> รีเฟรช
      </button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-10">
      <div v-for="s in stats" :key="s.id" class="bg-white rounded-2xl border shadow-sm p-6 hover:shadow-md transition-all group" :class="colorMap[s.color].card">
        <div class="relative z-10 flex items-start gap-4">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" :class="colorMap[s.color].icon">
            <ClientOnly><component :is="s.icon" class="w-6 h-6" /></ClientOnly>
          </div>
          <div>
            <p class="text-xs font-bold text-slate-500 mb-0.5">{{ s.label }}</p>
            <p class="text-3xl font-black" :class="colorMap[s.color].num">{{ s.value }}</p>
            <p class="text-[11px] text-slate-400 mt-0.5">{{ s.sub }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Analytics & Quick Section -->
    <div class="flex items-center gap-2 mb-6">
      <TrendingUp class="w-6 h-6 text-purple-600" />
      <h2 class="text-xl font-black text-slate-800">สถิติ และ เมนูด่วน (Analytics & Quick Actions)</h2>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-10">
      <!-- Chart -->
      <div class="xl:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-8 flex flex-col">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <h3 class="font-bold text-slate-800 text-lg">กราฟแท่งแสดงบทความ{{ analyticsView === 'daily' ? 'รายวัน' : analyticsView === 'monthly' ? 'รายเดือน' : 'รายสัปดาห์' }}</h3>
          <div class="flex items-center bg-slate-50 rounded-2xl p-1.5 overflow-x-auto no-scrollbar border border-slate-100">
            <button @click="analyticsView = 'daily'" :class="['px-6 py-2 text-[11px] font-bold rounded-xl transition-all', analyticsView === 'daily' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700']">รายวัน</button>
            <button @click="analyticsView = 'weekly'" :class="['px-6 py-2 text-[11px] font-bold rounded-xl transition-all', analyticsView === 'weekly' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700']">รายสัปดาห์</button>
            <button @click="analyticsView = 'monthly'" :class="['px-6 py-2 text-[11px] font-bold rounded-xl transition-all', analyticsView === 'monthly' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700']">รายเดือน</button>
          </div>
        </div>
        <div class="flex-1 min-h-[240px] flex items-end justify-around gap-2 px-2">
          <div v-for="(item, idx) in chartData" :key="idx" class="flex-1 flex flex-col items-center h-full justify-end group max-w-[60px]">
            <div class="w-6 bg-gradient-to-t from-purple-400 to-purple-200 rounded-t-lg group-hover:from-purple-500 group-hover:to-purple-300 transition-all shadow-sm relative" :style="{ height: `${(item.count / Math.max(...chartData.map(c => c.count), 1)) * 80 + 5}%` }">
               <div class="absolute -top-7 left-1/2 -translate-x-1/2 text-[11px] font-black text-purple-300 group-hover:text-purple-600 transition-colors">{{ item.count }}</div>
            </div>
            <span class="text-[9px] font-bold text-slate-400 mt-3 text-center leading-tight h-8 flex items-center">{{ item.label }}</span>
          </div>
        </div>
      </div>

      <!-- Quick Menu -->
      <div class="bg-white rounded-[32px] border border-slate-200 shadow-sm p-8 flex flex-col">
        <div class="text-xl font-black text-slate-800 mb-8 flex items-center gap-2">
          <Zap class="w-6 h-6 text-amber-500" />
          เมนูด่วน (Quick)
        </div>
        <div class="grid grid-cols-2 gap-4 flex-1">
          <NuxtLink to="/roles/reviewers" class="p-5 rounded-[28px] bg-white border border-slate-50 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/5 transition-all text-center group flex flex-col items-center justify-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform"><Users class="w-6 h-6" /></div>
            <span class="text-[12px] font-black text-slate-700">จัดการกรรมการ</span>
          </NuxtLink>
          <NuxtLink to="/papers" class="p-5 rounded-[28px] bg-white border border-slate-50 hover:border-purple-200 hover:shadow-xl hover:shadow-purple-900/5 transition-all text-center group flex flex-col items-center justify-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform"><FileText class="w-6 h-6" /></div>
            <span class="text-[12px] font-black text-slate-700">จัดการบทความ</span>
          </NuxtLink>
          <NuxtLink to="/news/create" class="p-5 rounded-[28px] bg-white border border-slate-50 hover:border-rose-200 hover:shadow-xl hover:shadow-rose-900/5 transition-all text-center group flex flex-col items-center justify-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform"><Megaphone class="w-6 h-6" /></div>
            <span class="text-[12px] font-black text-slate-700">โพสต์ข่าวสาร</span>
          </NuxtLink>
          <NuxtLink to="/reports/submissions" class="p-5 rounded-[28px] bg-white border border-slate-50 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-900/5 transition-all text-center group flex flex-col items-center justify-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform"><BarChart3 class="w-6 h-6" /></div>
            <span class="text-[12px] font-black text-slate-700">ดูรายงานสรุป</span>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Submission Pipeline & Smart Delay Tracker -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
      <!-- Submission Pipeline -->
      <div class="bg-white rounded-[40px] border border-slate-200 p-10 shadow-sm flex flex-col h-full">
        <div class="mb-10">
          <h2 class="text-xl font-black text-slate-800 flex items-center gap-3">
            <div class="p-2 bg-indigo-50 rounded-xl"><BarChart3 class="w-6 h-6 text-indigo-600" /></div>
            กระบวนการพิจารณาบทความ (Submission Pipeline)
          </h2>
          <p class="text-[11px] font-bold text-slate-400 mt-2 ml-11">ภาพรวมการไหลของบทความตั้งแต่ส่งเข้าระบบจนถึงการตัดสินผล</p>
        </div>
        <div class="space-y-8 flex-1">
          <div class="flex items-center gap-5">
            <div class="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-white shadow-lg"><Inbox class="w-6 h-6" /></div>
            <div class="flex-1">
              <div class="flex justify-between items-end mb-2">
                <div>
                  <div class="text-sm font-black text-slate-800">ส่งเข้ามา (Submitted)</div>
                  <div class="text-[11px] font-bold text-slate-400 mt-0.5">{{ pipelineStats.submitted.count }} รายการ</div>
                </div>
                <div class="text-sm font-black text-slate-800">100%</div>
              </div>
              <div class="h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div class="h-full bg-slate-800 rounded-full" style="width: 100%"></div>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-5">
            <div class="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-lg"><Users class="w-6 h-6" /></div>
            <div class="flex-1">
              <div class="flex justify-between items-end mb-2">
                <div>
                  <div class="text-sm font-black text-slate-800">มอบหมายแล้ว (Assigned)</div>
                  <div class="text-[11px] font-bold text-slate-400 mt-0.5">{{ pipelineStats.assigned.count }} รายการ</div>
                </div>
                <div class="text-sm font-black text-slate-800">{{ pipelineStats.assigned.pct }}%</div>
              </div>
              <div class="h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div class="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-1000" :style="{ width: pipelineStats.assigned.pct + '%' }"></div>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-5">
            <div class="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-lg"><PieChart class="w-6 h-6" /></div>
            <div class="flex-1">
              <div class="flex justify-between items-end mb-2">
                <div>
                  <div class="text-sm font-black text-slate-800">กำลังตรวจ (Reviewing)</div>
                  <div class="text-[11px] font-bold text-slate-400 mt-0.5">{{ pipelineStats.reviewing.count }} รายการ</div>
                </div>
                <div class="text-sm font-black text-slate-800">{{ pipelineStats.reviewing.pct }}%</div>
              </div>
              <div class="h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div class="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-1000" :style="{ width: pipelineStats.reviewing.pct + '%' }"></div>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-5">
            <div class="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-lg"><RefreshCw class="w-6 h-6" /></div>
            <div class="flex-1">
              <div class="flex justify-between items-end mb-2">
                <div>
                  <div class="text-sm font-black text-slate-800">รอผู้แต่งแก้ (Revision)</div>
                  <div class="text-[11px] font-bold text-slate-400 mt-0.5">{{ pipelineStats.revision.count }} รายการ</div>
                </div>
                <div class="text-sm font-black text-slate-800">{{ pipelineStats.revision.pct }}%</div>
              </div>
              <div class="h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div class="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-1000" :style="{ width: pipelineStats.revision.pct + '%' }"></div>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-5">
            <div class="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg"><CheckCircle2 class="w-6 h-6" /></div>
            <div class="flex-1">
              <div class="flex justify-between items-end mb-2">
                <div>
                  <div class="text-sm font-black text-slate-800">ตัดสินแล้ว (Decision)</div>
                  <div class="text-[11px] font-bold text-slate-400 mt-0.5">{{ pipelineStats.decision.count }} รายการ</div>
                </div>
                <div class="text-sm font-black text-slate-800">{{ pipelineStats.decision.pct }}%</div>
              </div>
              <div class="h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div class="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-1000" :style="{ width: pipelineStats.decision.pct + '%' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Smart Delay Tracker -->
      <div class="bg-white rounded-[40px] border border-slate-200 p-10 shadow-sm flex flex-col">
        <div class="flex items-start justify-between mb-8">
          <div>
            <h2 class="text-xl font-black text-slate-800 flex items-center gap-3">
              <div class="p-2 bg-rose-50 rounded-xl"><AlertTriangle class="w-6 h-6 text-rose-500" /></div>
              ระบบติดตามความล่าช้าอัจฉริยะ
            </h2>
            <p class="text-[11px] font-bold text-slate-400 mt-2 ml-11">จัดการคอขวดและติดตามงานที่เกินกำหนด SLA</p>
          </div>
          <div class="bg-white border border-slate-200 p-1.5 rounded-2xl flex items-center gap-3 shadow-sm">
             <span class="text-[10px] font-black text-slate-500 ml-2">Auto-Remind</span>
             <button @click="autoRemindEnabled = !autoRemindEnabled" :class="['w-11 h-5.5 rounded-full p-1 transition-all', autoRemindEnabled ? 'bg-emerald-500' : 'bg-slate-300']">
               <div :class="['w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-all', autoRemindEnabled ? 'translate-x-5' : 'translate-x-0']"></div>
             </button>
          </div>
        </div>
        
        <div class="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-1">
          <!-- Overdue -->
          <div class="rounded-3xl border border-rose-100 overflow-hidden">
            <div class="bg-rose-50/50 px-5 py-3 border-b border-rose-100 flex items-center gap-2">
              <div class="w-2.5 h-2.5 bg-rose-500 rounded-full"></div>
              <h3 class="text-sm font-black text-rose-600">Reviewer ที่เกินกำหนด (Overdue)</h3>
            </div>
            <div class="p-5 space-y-4">
              <div v-if="delayStats.overdue.length === 0" class="text-xs text-slate-400 font-bold p-4 italic text-center border border-dashed border-slate-100 rounded-2xl">ไม่มีงานเกินกำหนดในขณะนี้</div>
              <div v-for="item in delayStats.overdue" :key="item.id" class="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start mb-6">
                  <div>
                    <div class="text-[15px] font-black text-slate-800">{{ item.reviewerName }}</div>
                    <div class="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest">บทความ: {{ item.paperCode }}</div>
                  </div>
                  <div class="flex items-center gap-1.5 text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100">
                     <Clock class="w-3.5 h-3.5" />
                     <span class="text-[10px] font-black">{{ item.text }}</span>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <button @click="nudgeReviewer(item.id)" class="h-11 flex items-center justify-center gap-2 rounded-xl border border-rose-200 text-rose-600 text-[11px] font-black hover:bg-rose-50 transition-all active:scale-95">
                    <Mail class="w-4 h-4" /> ส่งอีเมลติดตาม (Nudge)
                  </button>
                  <button @click="changeReviewer(item.id)" class="h-11 flex items-center justify-center gap-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 text-[11px] font-black hover:bg-white hover:border-slate-300 transition-all active:scale-95">
                    <UserMinus class="w-4 h-4" /> เปลี่ยนคนตรวจ
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- At Risk -->
          <div class="rounded-3xl border border-amber-100 overflow-hidden">
            <div class="bg-amber-50/50 px-5 py-3 border-b border-amber-100 flex items-center gap-2">
              <div class="w-2.5 h-2.5 bg-amber-500 rounded-full"></div>
              <h3 class="text-sm font-black text-amber-600">Reviewer ที่ใกล้ถึงกำหนด (At Risk)</h3>
            </div>
            <div class="p-5 space-y-4">
              <div v-if="delayStats.atRisk.length === 0" class="text-xs text-slate-400 font-bold p-4 italic text-center border border-dashed border-slate-100 rounded-2xl">ไม่มีงานใกล้ถึงกำหนดในขณะนี้</div>
              <div v-for="item in delayStats.atRisk" :key="item.id" class="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start mb-6">
                  <div>
                    <div class="text-[15px] font-black text-slate-800">{{ item.reviewerName }}</div>
                    <div class="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest">บทความ: {{ item.paperCode }}</div>
                  </div>
                  <div class="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
                     <Clock class="w-3.5 h-3.5" />
                     <span class="text-[10px] font-black">{{ item.text }}</span>
                  </div>
                </div>
                <button @click="nudgeReviewer(item.id)" class="w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-amber-200 text-amber-600 text-[11px] font-black hover:bg-amber-50 transition-all active:scale-95">
                  <Send class="w-4 h-4" /> แจ้งเตือนล่วงหน้า (Remind)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Papers Table -->
    <div class="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
      <div class="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
        <h2 class="font-black text-slate-800 text-lg flex items-center gap-3">
          <div class="p-2 bg-purple-50 rounded-xl"><FileText class="w-6 h-6 text-purple-600" /></div>
          บทความล่าสุด
        </h2>
        <div class="relative w-80">
          <Search class="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input v-model="dashboardQuery" placeholder="ค้นหาบทความ..." class="w-full h-12 pl-12 pr-5 rounded-2xl bg-white border border-slate-200 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all shadow-inner" />
        </div>
      </div>
      <div class="divide-y divide-slate-100">
        <div v-for="p in filteredRecentPapers" :key="p.paper_id" class="px-10 py-6 hover:bg-slate-50 transition-colors group">
          <div class="flex justify-between items-center">
            <div class="min-w-0">
              <p class="text-[16px] font-black text-slate-800 group-hover:text-purple-700 transition-colors truncate leading-snug">{{ p.title_th || p.title_en }}</p>
              <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{{ p.paper_code }} • {{ formatDate(p.created_at) }}</p>
            </div>
            <span :class="['px-5 py-2 rounded-xl text-[11px] font-black border uppercase tracking-wider shadow-sm', getStatus(p.status).color]">{{ getStatus(p.status).label }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
