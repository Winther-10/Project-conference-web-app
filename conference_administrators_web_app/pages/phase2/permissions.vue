<script setup>
definePageMeta({ middleware: 'auth', layout: 'admin' });
import { ref, computed, onMounted } from 'vue';
import { Shield, ShieldCheck, Trophy, RefreshCw, ChevronUp, ChevronDown, CheckCircle2, Clock, Users, Star } from 'lucide-vue-next';

const supabase = useSupabase();
const loading = ref(true);
const togglingId = ref(null);
const reviewers = ref([]);
const papers = ref([]);
const activeTab = ref('permissions'); // 'permissions' | 'scores'
const sortKey = ref('avg_score');
const sortDir = ref('desc');
const filterYear = ref('all');
const activeAcademicYear = ref(null);

const fetchSettings = async () => {
  const { data } = await supabase.from('system_settings').select('config_json').single();
  if (data?.config_json?.conference) {
    const conf = data.config_json.conference;
    activeAcademicYear.value = conf.academicYear || conf.year || new Date().getFullYear();
    if (filterYear.value === 'all') filterYear.value = String(activeAcademicYear.value);
  }
};

// ─── Load Reviewers ───
const loadReviewers = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('user_id, email, first_name_th, last_name_th, institution')
    .eq('role', 'reviewer')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const reviewerIds = (data || []).map((r) => r.user_id);
  let permissionRows = [];
  if (reviewerIds.length > 0) {
    const { data: permissions, error: permissionsError } = await supabase
      .from('reviewer_expertise')
      .select('user_id, can_evaluate_phase_2')
      .in('user_id', reviewerIds);
    if (permissionsError) throw permissionsError;
    permissionRows = permissions || [];
  }

  const { data: assignments } = await supabase.from('review_assignments').select('reviewer_id, status');
  const countMap = {}, completedMap = {};
  (assignments || []).forEach(a => {
    countMap[a.reviewer_id] = (countMap[a.reviewer_id] || 0) + 1;
    if (a.status === 'completed') completedMap[a.reviewer_id] = (completedMap[a.reviewer_id] || 0) + 1;
  });

  const canPhase2Map = {};
  permissionRows.forEach((row) => {
    if (row.can_evaluate_phase_2) canPhase2Map[row.user_id] = true;
  });

  reviewers.value = (data || []).map(r => ({
    ...r,
    can_evaluate_phase_2: !!canPhase2Map[r.user_id],
    total_assignments: countMap[r.user_id] || 0,
    completed_assignments: completedMap[r.user_id] || 0,
  }));
};

// ─── Load Phase 2 Scores ───
const loadScores = async () => {
  const { data } = await supabase
    .from('papers')
    .select(`
      paper_id, paper_code, title_th, track,
      review_assignments (
        assignment_id, reviewer_id,
        phase2_total_score, phase2_completed_at,
        phase2_score_creativity, phase2_score_methodology,
        phase2_score_usefulness, phase2_score_paper, phase2_score_presentation,
        users:reviewer_id ( first_name_th, last_name_th )
      )
    `)
    .in('status', ['accepted', 'published']);

  papers.value = (data || []).map(p => {
    const p2 = (p.review_assignments || []).filter(a => a.phase2_completed_at !== null);
    const avg = p2.length > 0 ? p2.reduce((s, a) => s + (a.phase2_total_score || 0), 0) / p2.length : 0;
    return {
      ...p,
      phase2Assignments: p2,
      total_reviewers: p.review_assignments?.length || 0,
      completed_reviewers: p2.length,
      avg_score: Math.round(avg * 10) / 10,
    };
  }).filter(p => p.phase2Assignments.length > 0);
};

const loadAll = async () => {
  loading.value = true;
  await fetchSettings();
  await Promise.all([loadReviewers(), loadScores()]);
  loading.value = false;
};

onMounted(loadAll);

// ─── Toggle Phase 2 access ───
const togglePhase2 = async (reviewer) => {
  togglingId.value = reviewer.user_id;
  const newVal = !reviewer.can_evaluate_phase_2;
  try {
    // Try to update existing rows first
    const { data: updateData, error: updateError } = await supabase
      .from('reviewer_expertise')
      .update({ can_evaluate_phase_2: newVal })
      .eq('user_id', reviewer.user_id)
      .select();

    if (updateError) throw updateError;

    // If no rows were updated, it means the reviewer doesn't have an expertise entry yet
    if (!updateData || updateData.length === 0) {
      const { error: insertError } = await supabase
        .from('reviewer_expertise')
        .insert({ 
          user_id: reviewer.user_id, 
          can_evaluate_phase_2: newVal,
          tag_name: 'ทั่วไป' 
        });
      if (insertError) throw insertError;
    }
    // Update local state
    const idx = reviewers.value.findIndex(u => u.user_id === reviewer.user_id);
    if (idx !== -1) {
      reviewers.value[idx].can_evaluate_phase_2 = newVal;
    }
    reviewer.can_evaluate_phase_2 = newVal;
    await loadScores();
  } catch (err) { alert('ไม่สามารถอัปเดตสิทธิ์ได้: ' + err.message); }
  finally { togglingId.value = null; }
};

// ─── Score table ───
const phase2Reviewers = computed(() => reviewers.value.filter(r => r.can_evaluate_phase_2));

const yearOptions = computed(() => {
  const years = new Set();
  if (activeAcademicYear.value) years.add(String(activeAcademicYear.value));
  papers.value.forEach(p => {
    if (p.paper_code) {
      const match = p.paper_code.match(/-(\d{2})/);
      if (match) years.add('20' + match[1]);
    }
  });
  return Array.from(years).sort((a, b) => Number(b) - Number(a));
});

const sortedPapers = computed(() => {
  let arr = [...papers.value];
  if (filterYear.value !== 'all') {
    const yy = filterYear.value.slice(-2);
    arr = arr.filter(p => p.paper_code && p.paper_code.includes(`-${yy}`));
  }
  arr.sort((a, b) => sortDir.value === 'desc' ? (b[sortKey.value] ?? 0) - (a[sortKey.value] ?? 0) : (a[sortKey.value] ?? 0) - (b[sortKey.value] ?? 0));
  return arr;
});

const toggleSort = (key) => {
  if (sortKey.value === key) sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc';
  else { sortKey.value = key; sortDir.value = 'desc'; }
};

const getScore = (paper, reviewerId) => {
  const a = paper.phase2Assignments.find(a => a.reviewer_id === reviewerId);
  return a ? a.phase2_total_score : null;
};

const scoreColor = (score) => {
  if (score === null) return 'text-slate-300';
  if (score >= 85) return 'text-amber-500 font-black';
  if (score >= 70) return 'text-indigo-600 font-bold';
  return 'text-slate-600 font-semibold';
};
</script>

<template>
  <ClientOnly>
  <div class="p-8 pb-20 animate-fade-in">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-black text-slate-900 tracking-tight">Phase 2 — สิทธิ์ & คะแนน</h1>
        <p class="text-sm text-slate-500 mt-1">กำหนดสิทธิ์กรรมการและดูสรุปคะแนนการนำเสนอ On-site</p>
      </div>
      <div class="flex items-center gap-4">
        <!-- Year Filter -->
        <div class="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
          <span class="text-xs font-black text-slate-500 uppercase tracking-widest">Year:</span>
          <select v-model="filterYear" class="text-sm font-black text-slate-800 bg-transparent focus:outline-none border-none">
            <option value="all">All</option>
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <button @click="loadAll" class="flex items-center gap-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-4 py-2.5 rounded-xl transition-all">
          <RefreshCw class="w-3.5 h-3.5" :class="loading ? 'animate-spin' : ''" />
          รีเฟรช
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex items-center gap-1 p-1.5 bg-slate-100 rounded-2xl mb-8 w-fit">
      <button @click="activeTab = 'permissions'" :class="['px-5 py-2.5 rounded-xl text-sm font-bold transition-all', activeTab === 'permissions' ? 'bg-white text-purple-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800']">
        <span class="flex items-center gap-2"><Shield class="w-4 h-4" />สิทธิ์การเข้าถึง ({{ reviewers.length }} คน)</span>
      </button>
      <button @click="activeTab = 'scores'" :class="['px-5 py-2.5 rounded-xl text-sm font-bold transition-all', activeTab === 'scores' ? 'bg-white text-purple-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800']">
        <span class="flex items-center gap-2"><Trophy class="w-4 h-4" />สรุปคะแนน Phase 2 ({{ papers.length }} บทความ)</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-24">
      <div class="w-10 h-10 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin"></div>
    </div>

    <!-- ─── TAB: PERMISSIONS ─── -->
    <div v-else-if="activeTab === 'permissions'" class="animate-fade-in">
      <div v-if="reviewers.length === 0" class="text-center py-20 bg-white rounded-3xl border border-slate-200">
        <Users class="w-12 h-12 text-slate-200 mx-auto mb-4" />
        <p class="font-bold text-slate-500">ยังไม่มีกรรมการในระบบ</p>
        <p class="text-sm text-slate-400 mt-1">ไปที่หน้า "จัดการกรรมการ" เพื่อเชิญกรรมการก่อน</p>
      </div>
      <div v-else class="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div
          v-for="(reviewer, i) in reviewers"
          :key="reviewer.user_id"
          class="bg-white/90 backdrop-blur rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-lg hover:border-purple-200 hover:-translate-y-0.5 transition-all duration-300 animate-fade-in"
          :class="`stagger-${(i % 4) + 1}`"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-center gap-4 flex-1 min-w-0">
              <div class="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center text-indigo-700 font-black text-lg shrink-0 border border-purple-200">
                {{ (reviewer.first_name_th || reviewer.email || '?').charAt(0) }}
              </div>
              <div class="min-w-0">
                <p class="font-bold text-slate-800 text-sm">{{ reviewer.first_name_th }} {{ reviewer.last_name_th }}</p>
                <p class="text-xs text-slate-500 mt-0.5 truncate">{{ reviewer.email }}</p>
                <p v-if="reviewer.institution" class="text-[11px] text-slate-400 mt-0.5">{{ reviewer.institution }}</p>
              </div>
            </div>
            <!-- Phase 2 Toggle -->
            <div class="shrink-0">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-right">Phase 2</p>
              <button
                @click="togglePhase2(reviewer)"
                :disabled="togglingId === reviewer.user_id"
                class="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-black transition-all duration-300"
                :class="reviewer.can_evaluate_phase_2
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'"
              >
                <span v-if="togglingId === reviewer.user_id" class="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                <ShieldCheck v-else-if="reviewer.can_evaluate_phase_2" class="w-3.5 h-3.5" />
                <Shield v-else class="w-3.5 h-3.5" />
                {{ reviewer.can_evaluate_phase_2 ? 'มีสิทธิ์' : 'ไม่มีสิทธิ์' }}
              </button>
            </div>
          </div>
          <!-- Progress bar -->
          <div class="mt-5 pt-4 border-t border-slate-100">
            <div class="flex justify-between text-[11px] font-bold text-slate-500 mb-2">
              <span>Phase 1 Progress</span>
              <span>{{ reviewer.completed_assignments }}/{{ reviewer.total_assignments }} บทความ</span>
            </div>
            <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-700"
                :class="reviewer.total_assignments > 0 && reviewer.completed_assignments === reviewer.total_assignments ? 'bg-emerald-500' : 'bg-purple-500'"
                :style="{ width: reviewer.total_assignments > 0 ? `${(reviewer.completed_assignments / reviewer.total_assignments) * 100}%` : '0%' }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── TAB: SCORES ─── -->
    <div v-else class="animate-fade-in">
      <div v-if="papers.length === 0" class="text-center py-20 bg-white rounded-3xl border border-slate-200">
        <Trophy class="w-12 h-12 text-slate-200 mx-auto mb-4" />
        <p class="font-bold text-slate-500">ยังไม่มีคะแนน Phase 2</p>
        <p class="text-sm text-slate-400 mt-1">กรรมการต้องกรอกคะแนนผ่าน Reviewer App ก่อน</p>
      </div>

      <div v-else>
        <!-- Summary stats -->
        <div class="grid grid-cols-3 gap-5 mb-6">
          <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">บทความที่มีคะแนน</p>
            <p class="text-3xl font-black text-slate-900 mt-1 font-['Lato']">{{ sortedPapers.length }}</p>
          </div>
          <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">กรรมการ Phase 2</p>
            <p class="text-3xl font-black text-slate-900 mt-1 font-['Lato']">{{ phase2Reviewers.length }}</p>
          </div>
          <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">คะแนนเฉลี่ยสูงสุด</p>
            <p class="text-3xl font-black text-amber-500 mt-1 font-['Lato']">{{ sortedPapers[0]?.avg_score ?? '—' }}</p>
          </div>
        </div>

        <!-- Score Table -->
        <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <p class="font-bold text-slate-800">ตารางสรุปคะแนนรวม (Consolidated Score Table)</p>
            <span class="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-xl px-3 py-1.5">🔒 เฉพาะ Admin</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th class="text-left px-4 py-3 text-xs font-black text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 min-w-[48px]">
                    <button @click="toggleSort('avg_score')" class="flex items-center gap-1 hover:text-slate-800">
                      อันดับ
                      <ChevronDown v-if="sortKey === 'avg_score' && sortDir === 'desc'" class="w-3 h-3" />
                      <ChevronUp v-else-if="sortKey === 'avg_score' && sortDir === 'asc'" class="w-3 h-3" />
                    </button>
                  </th>
                  <th class="text-left px-4 py-3 text-xs font-black text-slate-500 uppercase tracking-wider min-w-[220px]">บทความ</th>
                  <!-- One column per Phase-2 reviewer -->
                  <th
                    v-for="r in phase2Reviewers"
                    :key="r.user_id"
                    class="px-4 py-3 text-xs font-black text-slate-500 uppercase tracking-wider text-center whitespace-nowrap"
                  >
                    {{ r.first_name_th }}<br/>
                    <span class="text-[10px] font-semibold text-slate-400 normal-case tracking-normal">{{ r.last_name_th }}</span>
                  </th>
                  <!-- Average -->
                  <th class="px-4 py-3 text-xs font-black text-amber-600 uppercase tracking-wider text-center bg-amber-50/50">
                    <button @click="toggleSort('avg_score')" class="flex items-center gap-1 mx-auto hover:text-amber-800">
                      <Star class="w-3 h-3" /> เฉลี่ย
                      <ChevronDown v-if="sortKey === 'avg_score' && sortDir === 'desc'" class="w-3 h-3" />
                      <ChevronUp v-else-if="sortKey === 'avg_score' && sortDir === 'asc'" class="w-3 h-3" />
                    </button>
                  </th>
                  <th class="px-4 py-3 text-xs font-black text-slate-500 uppercase tracking-wider text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="(paper, index) in sortedPapers"
                  :key="paper.paper_id"
                  class="hover:bg-purple-50/30 transition-colors"
                  :class="index === 0 ? 'bg-amber-50/40' : index === 1 ? 'bg-slate-50/60' : ''"
                >
                  <!-- Rank -->
                  <td class="px-4 py-4 sticky left-0 bg-inherit">
                    <div class="w-9 h-9 rounded-xl flex items-center justify-center font-black text-base"
                      :class="{ 'bg-amber-50 text-amber-500': index === 0, 'bg-slate-100 text-slate-500': index === 1, 'bg-orange-50 text-orange-500': index === 2, 'text-slate-400 border border-slate-200': index > 2 }">
                      {{ index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1 }}
                    </div>
                  </td>
                  <!-- Paper info -->
                  <td class="px-4 py-4 min-w-[220px]">
                    <p class="font-bold text-slate-800 text-sm leading-snug line-clamp-2">{{ paper.title_th }}</p>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="text-xs font-bold text-slate-500 bg-slate-100 rounded-lg px-2 py-0.5">{{ paper.paper_code }}</span>
                      <span v-if="paper.track" class="text-xs text-slate-400">{{ paper.track }}</span>
                    </div>
                  </td>
                  <!-- Score per reviewer -->
                  <td
                    v-for="r in phase2Reviewers"
                    :key="r.user_id"
                    class="px-4 py-4 text-center"
                  >
                    <span :class="['text-base', scoreColor(getScore(paper, r.user_id))]">
                      {{ getScore(paper, r.user_id) ?? '—' }}
                    </span>
                  </td>
                  <!-- Average -->
                  <td class="px-4 py-4 text-center bg-amber-50/30">
                    <span class="text-xl font-black" :class="paper.avg_score >= 85 ? 'text-amber-500' : paper.avg_score >= 70 ? 'text-indigo-600' : 'text-slate-600'">
                      {{ paper.avg_score }}
                    </span>
                    <span class="text-[10px] text-slate-400 block">/100</span>
                  </td>
                  <!-- Status -->
                  <td class="px-4 py-4 text-center">
                    <span class="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full border"
                      :class="paper.completed_reviewers === paper.total_reviewers && paper.total_reviewers > 0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'">
                      <CheckCircle2 v-if="paper.completed_reviewers === paper.total_reviewers && paper.total_reviewers > 0" class="w-3 h-3" />
                      <Clock v-else class="w-3 h-3" />
                      {{ paper.completed_reviewers }}/{{ paper.total_reviewers }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
  </ClientOnly>
</template>
