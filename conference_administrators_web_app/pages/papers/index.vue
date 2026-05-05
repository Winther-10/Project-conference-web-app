<script setup>
definePageMeta({ middleware: 'auth', layout: 'admin' });
import { computed, ref, onMounted } from 'vue';
import {
  CheckCircle2, ChevronDown, Download, Eye, FileText,
  Filter, Inbox, MoreVertical, Receipt,
  RefreshCw, Search, UserCheck, UserPlus, Users, X, Calendar,
  AlertCircle, Clock, Zap
} from 'lucide-vue-next';

const supabase = useSupabase();
const loading = ref(true);
const papers = ref([]);
const reviewers = ref([]);
const assignments = ref([]);

const toast = ref(null);
const showToast = (message, tone = 'ok') => {
  toast.value = { message, tone };
  setTimeout(() => { toast.value = null; }, 3000);
};

// --- META ---
const paperStatusMeta = {
  pending_review: { label: 'รอประเมิน', class: 'bg-amber-50 text-amber-800 border-amber-200' },
  reviewing: { label: 'กำลังประเมิน', class: 'bg-sky-50 text-sky-800 border-sky-200' },
  revision_required: { label: 'รอผู้แต่งแก้ไข', class: 'bg-violet-50 text-violet-800 border-violet-200' },
  rejected: { label: 'ปฏิเสธ', class: 'bg-rose-50 text-rose-800 border-rose-200' },
  accepted: { label: 'ยอมรับ', class: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
};

const paymentStatusMeta = {
  pending_payment: { label: 'รอชำระเงิน', class: 'bg-amber-50 text-amber-800 border-amber-200' },
  checking: { label: 'รอตรวจสอบสลิป', class: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  paid: { label: 'ชำระเงินเรียบร้อย', class: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  issue: { label: 'การชำระเงินมีปัญหา', class: 'bg-rose-50 text-rose-800 border-rose-200' }
};

// --- DATA LOADING ---
const loadData = async () => {
  loading.value = true;
  try {
    const [papersRes, reviewersRes, assignmentsRes] = await Promise.all([
      supabase.from('papers').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('*').eq('role', 'reviewer'),
      supabase.from('review_assignments').select('*')
    ]);

    if (papersRes.error) throw papersRes.error;
    if (reviewersRes.error) throw reviewersRes.error;
    if (assignmentsRes.error) throw assignmentsRes.error;

    papers.value = papersRes.data || [];
    reviewers.value = reviewersRes.data || [];
    assignments.value = assignmentsRes.data || [];
  } catch (err) {
    console.error('Error loading papers:', err);
  } finally {
    loading.value = false;
  }
};

onMounted(loadData);

// --- FILTERS ---
const query = ref('');
const filterCategory = ref('all');
const filterPaperStatus = ref('all');

const filteredPapers = computed(() => {
  const q = query.value.trim().toLowerCase();
  return papers.value.filter((p) => {
    const matchesQuery = !q || p.paper_code?.toLowerCase().includes(q) || p.title_th?.toLowerCase().includes(q);
    const matchesCategory = filterCategory.value === 'all' || p.track === filterCategory.value;
    const matchesPaperStatus = filterPaperStatus.value === 'all' || p.status === filterPaperStatus.value;
    return matchesQuery && matchesCategory && matchesPaperStatus;
  });
});

// --- HELPERS ---
const getAssignmentsForPaper = (paperId) => assignments.value.filter(a => a.paper_id === paperId);
const getReviewerName = (reviewerId) => {
  const r = reviewers.value.find(x => x.user_id === reviewerId);
  return r ? `${r.first_name_th} ${r.last_name_th}` : 'Unknown';
};

// --- ACTIONS ---
const openMenuId = ref(null);

const isPhase2Completed = (id) => {
  return assignments.value.some(a => a.paper_id === id && a.phase2_completed_at !== null);
};

const toggleRowMenu = (id) => {
  if (openMenuId.value === id) {
    openMenuId.value = null;
  } else {
    if (isPhase2Completed(id)) {
      showToast('ไม่สามารถเปลี่ยนสถานะได้ เนื่องจากผ่านการประเมิน Phase 2 แล้ว', 'err');
      return;
    }
    openMenuId.value = id;
  }
};
const closeRowMenu = () => openMenuId.value = null;

const assignModalOpen = ref(false);
const selectedPaper = ref(null);

const openAssignModal = (paper) => {
  selectedPaper.value = paper;
  assignModalOpen.value = true;
  closeRowMenu();
};

const closeAssignModal = () => {
  assignModalOpen.value = false;
  selectedPaper.value = null;
};

const toggleAssignment = async (reviewerId) => {
  if (!selectedPaper.value) return;
  const paperId = selectedPaper.value.paper_id;
  const existing = assignments.value.find(a => a.paper_id === paperId && a.reviewer_id === reviewerId);

  try {
    if (existing) {
      // Remove assignment
      const { error } = await supabase.from('review_assignments').delete().eq('assignment_id', existing.assignment_id);
      if (error) throw error;
      assignments.value = assignments.value.filter(a => a.assignment_id !== existing.assignment_id);
      showToast('ถอนการมอบหมายเรียบร้อยแล้ว', 'ok');
    } else {
      // Add assignment
      const newAssignment = {
        paper_id: paperId,
        reviewer_id: reviewerId,
        status: 'assigned',
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 2 weeks default
      };
      const { data, error } = await supabase.from('review_assignments').insert(newAssignment).select().single();
      if (error) throw error;
      assignments.value.push(data);
      showToast('มอบหมายผู้ประเมินเรียบร้อยแล้ว', 'ok');
    }
  } catch (err) {
    showToast('ไม่สามารถอัปเดตการมอบหมายได้: ' + err.message, 'err');
  }
};

const updatePaperStatus = async (paperId, newStatus) => {
  try {
    const { error } = await supabase
      .from('papers')
      .update({ status: newStatus }) // ใช้คอลัมน์ status จริงใน DB
      .eq('paper_id', paperId);

    if (error) throw error;
    
    // อัปเดตข้อมูลใน UI ทันที
    const idx = papers.value.findIndex(p => p.paper_id === paperId);
    if (idx !== -1) {
      papers.value[idx].status = newStatus;
    }
    showToast('อัปเดตสถานะบทความสำเร็จ', 'ok');
    closeRowMenu();
  } catch (err) {
    console.error('Error updating status:', err);
    showToast('ไม่สามารถอัปเดตสถานะได้: ' + err.message, 'err');
  }
};

const formatDateTh = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const stats = computed(() => [
  { label: 'บทความทั้งหมด', value: papers.value.length, icon: FileText, color: 'text-slate-600' },
  { label: 'รอประเมิน', value: papers.value.filter(p => p.status === 'pending_review' || !p.status).length, icon: Clock, color: 'text-amber-600' },
  { label: 'ยอมรับแล้ว', value: papers.value.filter(p => p.status === 'accepted').length, icon: CheckCircle2, color: 'text-emerald-600' },
  { label: 'กรรมการในระบบ', value: reviewers.value.length, icon: Users, color: 'text-indigo-600' }
]);
</script>

<template>
  <div class="p-8 pb-32 font-['Sarabun'] animate-fade-in" @click="closeRowMenu">
    
    <!-- TOAST -->
    <div
      v-if="toast"
      :class="[
        'fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 transition-all animate-in fade-in slide-in-from-top-4',
        toast.tone === 'err' ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
      ]"
    >
      <AlertCircle v-if="toast.tone === 'err'" class="w-5 h-5 text-rose-600" />
      <CheckCircle2 v-else class="w-5 h-5 text-emerald-600" />
      <span class="text-sm font-bold">{{ toast.message }}</span>
    </div>

    <!-- HEADER -->
    <div class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h2 class="text-2xl font-black text-slate-800 mb-1">จัดการบทความ (Paper Management)</h2>
        <p class="text-sm text-slate-500 font-en">Match reviewers and manage submission lifecycle</p>
      </div>
      <div class="flex items-center gap-2">
        <button @click="loadData" class="h-10 px-4 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
          <RefreshCw class="w-4 h-4" :class="loading ? 'animate-spin' : ''" />
          รีเฟรช
        </button>
      </div>
    </div>

    <!-- STATS -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div v-for="s in stats" :key="s.label" class="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm hover:border-indigo-200 transition-colors group">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-3xl font-black text-slate-800 tabular-nums">{{ s.value }}</div>
            <div class="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wider">{{ s.label }}</div>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
            <component :is="s.icon" class="w-6 h-6" :class="s.color" />
          </div>
        </div>
      </div>
    </div>

    <!-- FILTERS -->
    <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm mb-6 flex flex-col lg:flex-row gap-4 items-center">
      <div class="relative flex-1 w-full">
        <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input v-model="query" type="text" placeholder="ค้นหารหัส หรือ ชื่อบทความ..." class="w-full h-12 pl-11 pr-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
      </div>
      <div class="flex items-center gap-2 w-full lg:w-auto">
        <select v-model="filterCategory" class="h-12 px-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-700 focus:outline-none w-full lg:w-48">
          <option value="all">ทุกกลุ่มวิชา</option>
          <option v-for="cat in [...new Set(papers.map(p => p.track))].filter(Boolean)" :key="cat" :value="cat">{{ cat }}</option>
        </select>
        <select v-model="filterPaperStatus" class="h-12 px-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-700 focus:outline-none w-full lg:w-48">
          <option value="all">ทุกสถานะ</option>
          <option v-for="(v, k) in paperStatusMeta" :key="k" :value="k">{{ v.label }}</option>
        </select>
      </div>
    </div>

    <!-- TABLE -->
    <div class="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
      <div v-if="loading" class="py-32 flex flex-col items-center gap-4 text-slate-400 font-bold">
        <RefreshCw class="w-10 h-10 animate-spin" />
        โหลดข้อมูลบทความ...
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full">
          <thead class="bg-slate-50/80 border-b border-slate-200">
            <tr class="text-[11px] font-black text-slate-500 uppercase tracking-wider">
              <th class="px-6 py-4 text-left">รหัสบทความ</th>
              <th class="px-6 py-4 text-left">ชื่อเรื่อง & ผู้ส่ง</th>
              <th class="px-6 py-4 text-left">กลุ่มวิชา</th>
              <th class="px-6 py-4 text-left">สถานะ</th>
              <th class="px-6 py-4 text-left">ผู้ประเมิน</th>
              <th class="px-6 py-4 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="p in filteredPapers" :key="p.paper_id" class="hover:bg-slate-50/50 transition-colors group">
              <td class="px-6 py-4">
                <span class="text-xs font-black text-slate-800">{{ p.paper_code || p.paper_id.slice(0,8) }}</span>
              </td>
              <td class="px-6 py-4 max-w-md">
                <div class="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">{{ p.title_th }}</div>
                <div class="text-[10px] text-slate-400 font-bold mt-0.5">{{ formatDateTh(p.created_at) }}</div>
              </td>
              <td class="px-6 py-4">
                <span class="text-[10px] font-black text-slate-500 bg-slate-100 rounded-lg px-2 py-1">{{ p.track || 'Uncategorized' }}</span>
              </td>
               <td class="px-6 py-4">
                <span class="px-2.5 py-1 rounded-full text-[10px] font-black border whitespace-nowrap" :class="paperStatusMeta[p.status]?.class || paperStatusMeta.pending.class">
                  {{ paperStatusMeta[p.status]?.label || p.status || 'รอประเมิน' }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-col gap-1">
                  <div class="flex -space-x-2">
                    <div v-for="a in getAssignmentsForPaper(p.paper_id)" :key="a.assignment_id" 
                      class="w-7 h-7 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-indigo-600"
                      :title="getReviewerName(a.reviewer_id)">
                      {{ getReviewerName(a.reviewer_id).charAt(0) }}
                    </div>
                    <button @click="openAssignModal(p)" class="w-7 h-7 rounded-full bg-slate-50 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:border-slate-400 transition-all">
                      <UserPlus class="w-3 h-3" />
                    </button>
                  </div>
                  <div class="text-[10px] font-bold text-slate-400">{{ getAssignmentsForPaper(p.paper_id).length }} คน</div>
                </div>
              </td>
              <td class="px-6 py-4 text-right relative" @click.stop>
                <button 
                  @click="toggleRowMenu(p.paper_id)" 
                  class="ml-auto w-9 h-9 rounded-xl border flex items-center justify-center transition-colors"
                  :class="isPhase2Completed(p.paper_id) ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed' : 'border-slate-200 bg-white hover:bg-slate-50'"
                  :title="isPhase2Completed(p.paper_id) ? 'ผ่านการประเมิน Phase 2 แล้ว ไม่สามารถเปลี่ยนสถานะได้' : 'เปลี่ยนสถานะ'"
                >
                  <MoreVertical class="w-4 h-4" :class="isPhase2Completed(p.paper_id) ? 'text-slate-300' : 'text-slate-500'" />
                </button>
                
                <div v-if="openMenuId === p.paper_id" class="absolute right-6 top-14 w-56 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden z-[100] text-left animate-in fade-in zoom-in duration-200">
                  <div class="px-4 py-2 text-[10px] font-black text-slate-400 bg-slate-50 uppercase tracking-widest border-b border-slate-100">เปลี่ยนสถานะบทความ</div>
                  <div class="p-1">
                    <button @click="updatePaperStatus(p.paper_id, 'accepted')" class="w-full px-4 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl text-left flex items-center gap-2 transition-colors">
                      <CheckCircle2 class="w-4 h-4" /> ยอมรับ (Accept)
                    </button>
                    <button @click="updatePaperStatus(p.paper_id, 'revision')" class="w-full px-4 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50 rounded-xl text-left flex items-center gap-2 transition-colors">
                      <Zap class="w-4 h-4" /> ให้แก้ไข (Revision)
                    </button>
                    <button @click="updatePaperStatus(p.paper_id, 'rejected')" class="w-full px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-xl text-left flex items-center gap-2 transition-colors">
                      <X class="w-4 h-4" /> ปฏิเสธ (Reject)
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ASSIGN MODAL -->
    <div v-if="assignModalOpen && selectedPaper" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="closeAssignModal"></div>
      <div class="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
        <div class="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
              <UserPlus class="w-6 h-6" />
            </div>
            <div>
              <div class="text-sm font-black text-slate-800">มอบหมายผู้ประเมิน</div>
              <div class="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{{ selectedPaper.paper_code }}</div>
            </div>
          </div>
          <button @click="closeAssignModal" class="w-10 h-10 rounded-full hover:bg-slate-200 flex items-center justify-center transition-colors">
            <X class="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-8">
          <p class="text-sm font-bold text-slate-800 mb-6 line-clamp-2 leading-relaxed">บทความ: {{ selectedPaper.title_th }}</p>
          
          <div class="space-y-3">
            <div v-for="r in reviewers" :key="r.user_id" 
              class="p-4 rounded-2xl border transition-all flex items-center justify-between group"
              :class="getAssignmentsForPaper(selectedPaper.paper_id).some(a => a.reviewer_id === r.user_id) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:border-slate-200'">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-black">
                  {{ r.first_name_th.charAt(0) }}
                </div>
                <div>
                  <div class="text-xs font-black text-slate-800">{{ r.first_name_th }} {{ r.last_name_th }}</div>
                  <div class="text-[10px] text-slate-400 font-bold">{{ r.institution || 'ไม่ระบุสังกัด' }}</div>
                </div>
              </div>
              
              <button 
                @click="toggleAssignment(r.user_id)"
                class="px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all"
                :class="getAssignmentsForPaper(selectedPaper.paper_id).some(a => a.reviewer_id === r.user_id) 
                  ? 'bg-rose-500 text-white' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'">
                {{ getAssignmentsForPaper(selectedPaper.paper_id).some(a => a.reviewer_id === r.user_id) ? 'ถอนมอบหมาย' : 'มอบหมาย' }}
              </button>
            </div>
          </div>
        </div>
        
        <div class="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button @click="closeAssignModal" class="px-8 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black hover:bg-slate-800 transition-all">
            เสร็จสิ้น
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
