<script setup>
definePageMeta({ middleware: 'auth', layout: 'admin' });
import { ref, computed, onMounted } from 'vue';
import {
  Trophy, Award, Star, RefreshCw, CheckCircle2, Clock, Medal,
  ChevronUp, ChevronDown, Users, FileText, Megaphone
} from 'lucide-vue-next';

const supabase = useSupabase();

const papers = ref([]);
const awards = ref([]);
const loading = ref(true);
const announcing = ref(null);
const sortKey = ref('avg_score');
const sortDir = ref('desc');

const loadData = async () => {
  loading.value = true;
  try {
    // Fetch papers that are accepted and have at least one Phase 2 score
    const { data: papersData } = await supabase
      .from('papers')
      .select(`
        paper_id,
        paper_code,
        title_th,
        title_en,
        track,
        authors,
        abstract,
        author_id,
        review_assignments (
          assignment_id,
          reviewer_id,
          phase2_total_score,
          phase2_completed_at,
          phase2_score_creativity,
          phase2_score_methodology,
          phase2_score_usefulness,
          phase2_score_paper,
          phase2_score_presentation,
          users:reviewer_id ( first_name_th, last_name_th )
        )
      `)
      .in('status', ['accepted', 'published']);

    // Fetch existing awards
    const { data: awardsData } = await supabase
      .from('awards')
      .select('*');

    // Fetch author details for universities
    const authorIds = (papersData || []).map(p => p.author_id).filter(Boolean);
    const { data: usersData } = authorIds.length > 0 
      ? await supabase.from('users').select('user_id, institution').in('user_id', authorIds)
      : { data: [] };

    papers.value = (papersData || [])
      .map(p => {
        const phase2Assignments = (p.review_assignments || []).filter(a => a.phase2_completed_at !== null);
        const total_reviewers = p.review_assignments?.length || 0;
        const completed_reviewers = phase2Assignments.length;
        const avg_score = phase2Assignments.length > 0
          ? phase2Assignments.reduce((sum, a) => sum + (a.phase2_total_score || 0), 0) / phase2Assignments.length
          : 0;
        const award = (awardsData || []).find(aw => aw.paper_id === p.paper_id);

        return {
          ...p,
          phase2Assignments,
          total_reviewers,
          completed_reviewers,
          avg_score: Math.round(avg_score * 10) / 10,
          university: (usersData || []).find(u => u.user_id === p.author_id)?.institution || '-',
          has_award: !!award,
          award_id: award?.id || null,
        };
      })
      .filter(p => p.phase2Assignments.length > 0);

    awards.value = awardsData || [];
  } catch (err) {
    console.error('loadData error:', err);
  } finally {
    loading.value = false;
  }
};

const sortedPapers = computed(() => {
  const arr = [...papers.value];
  arr.sort((a, b) => {
    const av = a[sortKey.value] ?? 0;
    const bv = b[sortKey.value] ?? 0;
    return sortDir.value === 'desc' ? bv - av : av - bv;
  });
  return arr;
});

const toggleSort = (key) => {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc';
  } else {
    sortKey.value = key;
    sortDir.value = 'desc';
  }
};

const announceAward = async (paper, awardType) => {
  announcing.value = paper.paper_id;
  try {
    const { error } = await supabase.from('awards').upsert({
      ...(paper.award_id ? { id: paper.award_id } : {}),
      paper_id: paper.paper_id,
      paper_code: paper.paper_code,
      title: paper.title_th,
      title_th: paper.title_th,
      award_type: awardType,
      level: awardType === 'gold' ? 'excellent' : awardType === 'silver' ? 'distinguished' : 'good',
      type: 'poster',
      university: paper.university || '-',
      authors: paper.authors || [],
      abstract: paper.abstract || '-',
      track: paper.track || '-',
      phase2_avg_score: paper.avg_score,
      announced_at: new Date().toISOString(),
    });

    if (error) throw error;

    paper.has_award = true;
    paper.award_type = awardType;
    alert(`✅ ประกาศรางวัล "${awardLabel(awardType)}" สำหรับบทความ ${paper.paper_code} เรียบร้อยแล้ว\n\nผู้แต่งจะเห็นผลรางวัลทันทีใน Author Portal`);
    await loadData();
  } catch (err) {
    console.error('announceAward error:', err);
    alert('เกิดข้อผิดพลาด: ' + err.message);
  } finally {
    announcing.value = null;
  }
};

const cancelAward = async (paper) => {
  if (!confirm(`ต้องการยกเลิกรางวัลของบทความ ${paper.paper_code} ใช่หรือไม่?`)) return;
  announcing.value = paper.paper_id;
  try {
    const { error } = await supabase.from('awards').delete().eq('id', paper.award_id);
    if (error) throw error;
    alert('✅ ยกเลิกรางวัลเรียบร้อยแล้ว');
    await loadData();
  } catch (e) { alert('เกิดข้อผิดพลาด: ' + e.message); }
  finally { announcing.value = null; }
};

const awardLabel = (type) => {
  const map = {
    gold: '🥇 Gold Award (ยอดเยี่ยมอันดับ 1)',
    silver: '🥈 Silver Award (ยอดเยี่ยมอันดับ 2)',
    bronze: '🥉 Bronze Award (ยอดเยี่ยมอันดับ 3)',
    best_paper: '🏆 Best Paper Award',
    honorable: '🎖️ Honorable Mention',
  };
  return map[type] || type;
};

const awardColor = (type) => ({
  gold: 'bg-amber-50 border-amber-200 text-amber-700',
  silver: 'bg-slate-50 border-slate-300 text-slate-700',
  bronze: 'bg-orange-50 border-orange-200 text-orange-700',
  best_paper: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  honorable: 'bg-purple-50 border-purple-200 text-purple-700',
}[type] || 'bg-slate-50 border-slate-200 text-slate-700');

onMounted(loadData);
</script>

<template>
  <div class="p-8 pb-32 font-['Sarabun'] animate-fade-in">
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-black text-slate-800 flex items-center gap-2">
          <Trophy class="w-6 h-6 text-amber-500" />
          สรุปคะแนน Phase 2 (On-Site Pitch)
        </h2>
        <p class="text-sm text-slate-500 mt-1 font-en">คะแนนจากกรรมการทุกท่าน — Admin เท่านั้นที่เห็นข้อมูลนี้</p>
      </div>
      <button @click="loadData" class="flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-4 py-2.5 rounded-xl transition-all">
        <RefreshCw class="w-3.5 h-3.5" :class="loading ? 'animate-spin' : ''" />
        รีเฟรช
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <RefreshCw class="w-8 h-8 text-slate-300 animate-spin" />
    </div>

    <!-- Empty -->
    <div v-else-if="papers.length === 0" class="text-center py-20 bg-white rounded-2xl border border-slate-200">
      <Trophy class="w-12 h-12 text-slate-200 mx-auto mb-4" />
      <div class="font-bold text-slate-500">ยังไม่มีคะแนน Phase 2</div>
      <div class="text-sm text-slate-400 mt-1">กรรมการต้องกรอกคะแนนผ่าน Reviewer App ก่อน</div>
    </div>

    <!-- Score Table -->
    <div v-else class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div class="font-bold text-slate-800 font-['Sarabun']">{{ papers.length }} บทความที่มีคะแนน Phase 2</div>
        <div class="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 font-bold text-amber-700 font-['Sarabun']">
          🔒 ข้อมูลลับ — เฉพาะ Admin
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm font-['Lato']">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr class="font-['Sarabun']">
              <th class="text-left px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">อันดับ</th>
              <th class="text-left px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">บทความ</th>
              <th class="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-800" @click="toggleSort('completed_reviewers')">
                <span class="flex items-center justify-center gap-1">
                  กรรมการ
                  <ChevronDown v-if="sortKey === 'completed_reviewers' && sortDir === 'desc'" class="w-3 h-3" />
                  <ChevronUp v-else-if="sortKey === 'completed_reviewers' && sortDir === 'asc'" class="w-3 h-3" />
                </span>
              </th>
              <th class="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-800" @click="toggleSort('avg_score')">
                <span class="flex items-center justify-center gap-1">
                  คะแนนเฉลี่ย
                  <ChevronDown v-if="sortKey === 'avg_score' && sortDir === 'desc'" class="w-3 h-3 text-amber-500" />
                  <ChevronUp v-else-if="sortKey === 'avg_score' && sortDir === 'asc'" class="w-3 h-3 text-amber-500" />
                </span>
              </th>
              <th class="text-center px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">รายละเอียดคะแนน</th>
              <th class="text-center px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">ประกาศรางวัล</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="(paper, index) in sortedPapers" :key="paper.paper_id" class="hover:bg-slate-50 transition-colors">
              <!-- Rank -->
              <td class="px-6 py-5">
                <div class="flex items-center justify-center w-10 h-10 rounded-xl font-black text-lg"
                  :class="{
                    'bg-amber-50 text-amber-600': index === 0,
                    'bg-slate-50 text-slate-600': index === 1,
                    'bg-orange-50 text-orange-600': index === 2,
                    'bg-white text-slate-400 border border-slate-200': index > 2
                  }"
                >
                  {{ index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1 }}
                </div>
              </td>

              <!-- Paper -->
              <td class="px-6 py-5 min-w-[250px]">
                <div class="font-bold text-slate-800 text-sm leading-snug line-clamp-2 font-['Sarabun']">{{ paper.title_th }}</div>
                <div class="flex items-center gap-2 mt-1">
                  <span class="text-xs font-bold text-slate-500 bg-slate-100 rounded-lg px-2 py-0.5">{{ paper.paper_code }}</span>
                  <span v-if="paper.track" class="text-xs text-slate-400 font-['Sarabun']">{{ paper.track }}</span>
                </div>
                <div v-if="paper.has_award" class="mt-1.5 font-['Sarabun'] flex flex-col items-center gap-1">
                  <span class="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full border" :class="awardColor(paper.award_type)">
                    <Trophy class="w-3 h-3" /> {{ awardLabel(paper.award_type) }}
                  </span>
                  <button @click="cancelAward(paper)" class="text-[9px] font-bold text-rose-500 hover:text-rose-700 underline">ยกเลิกรางวัล</button>
                </div>
              </td>

              <!-- Reviewer Count -->
              <td class="px-6 py-5 text-center">
                <div class="inline-flex items-center gap-1 font-bold text-sm"
                  :class="paper.completed_reviewers === paper.total_reviewers && paper.total_reviewers > 0 ? 'text-emerald-600' : 'text-amber-600'"
                >
                  <CheckCircle2 v-if="paper.completed_reviewers === paper.total_reviewers && paper.total_reviewers > 0" class="w-4 h-4" />
                  <Clock v-else class="w-4 h-4" />
                  {{ paper.completed_reviewers }}/{{ paper.total_reviewers }}
                </div>
              </td>

              <!-- Avg Score -->
              <td class="px-6 py-5 text-center">
                <div class="text-3xl font-black" :class="{
                  'text-amber-500': paper.avg_score >= 85,
                  'text-indigo-600': paper.avg_score >= 70 && paper.avg_score < 85,
                  'text-slate-600': paper.avg_score < 70
                }">
                  {{ paper.avg_score }}
                </div>
                <div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">/100</div>
              </td>

              <!-- Score Details -->
              <td class="px-6 py-5">
                <details class="group">
                  <summary class="cursor-pointer text-xs font-bold text-indigo-600 hover:text-indigo-800 list-none flex items-center justify-center gap-1 font-['Sarabun']">
                    ดูรายละเอียด
                    <ChevronDown class="w-3.5 h-3.5 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div class="mt-3 space-y-2 min-w-[200px]">
                    <div v-for="assignment in paper.phase2Assignments" :key="assignment.assignment_id" class="text-[11px] bg-slate-50 rounded-xl p-3 border border-slate-100 font-['Sarabun']">
                      <div class="font-bold text-slate-700 mb-1.5">
                        {{ assignment.users?.first_name_th }} {{ assignment.users?.last_name_th }}
                      </div>
                      <div class="grid grid-cols-5 gap-1 text-center font-['Lato']">
                        <div v-for="[label, val] in [['🎨', assignment.phase2_score_creativity], ['🔬', assignment.phase2_score_methodology], ['💡', assignment.phase2_score_usefulness], ['📄', assignment.phase2_score_paper], ['🎤', assignment.phase2_score_presentation]]" :key="label">
                          <div class="font-black text-slate-800">{{ val ?? '-' }}</div>
                          <div class="text-slate-400 text-[9px]">{{ label }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </details>
                  </td>
              
              <!-- Announce Award -->
              <td class="px-6 py-5 text-center">
                <div v-if="paper.has_award" class="flex flex-col items-center gap-1">
                  <div class="text-xs font-bold text-emerald-600 flex items-center justify-center gap-1">
                    <CheckCircle2 class="w-4 h-4" /> ประกาศแล้ว
                  </div>
                  <button @click="cancelAward(paper)" class="text-[10px] font-bold text-rose-500 hover:text-rose-700 underline">
                    ยกเลิกประกาศ
                  </button>
                </div>
                <div v-else class="flex flex-wrap items-center justify-center gap-1">
                  <button 
                    v-for="type in ['gold', 'silver', 'bronze']" 
                    :key="type"
                    @click="announceAward(paper, type)"
                    :disabled="announcing === paper.paper_id"
                    class="px-3 py-1.5 rounded-lg border text-[10px] font-black transition-all active:scale-95 disabled:opacity-50"
                    :class="awardColor(type)"
                  >
                    {{ type.toUpperCase() }}
                  </button>
                </div>
              </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
  </div>
</template>
