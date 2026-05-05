<script setup>
definePageMeta({ middleware: 'auth', layout: 'admin' });
import { ref, computed, onMounted } from 'vue';
import { Trophy, Award, Star, RefreshCw, CheckCircle2, Medal, ChevronDown, ChevronUp, FileText, Megaphone, Download } from 'lucide-vue-next';

const supabase = useSupabase();
const papers = ref([]);
const loading = ref(true);
const sortKey = ref('avg_score');
const sortDir = ref('desc');
const announcing = ref(null);

const loadData = async () => {
  loading.value = true;
  try {
    const { data: papersData } = await supabase
      .from('papers')
      .select(`
        paper_id, paper_code, title_th, title_en, track, author_id, authors, abstract,
        review_assignments (
          assignment_id, reviewer_id, phase2_total_score, phase2_completed_at,
          phase2_score_creativity, phase2_score_methodology, phase2_score_usefulness,
          phase2_score_paper, phase2_score_presentation,
          users:reviewer_id ( first_name_th, last_name_th )
        )
      `)
      .in('status', ['accepted', 'published']);

    const { data: awardsData } = await supabase.from('awards').select('*');
    const { data: usersData } = await supabase.from('users').select('user_id, title, first_name_th, last_name_th, institution');

    allUsers.value = usersData || [];

    papers.value = (papersData || [])
      .map(p => {
        const phase2 = (p.review_assignments || []).filter(a => a.phase2_completed_at);
        const avg = phase2.length > 0
          ? phase2.reduce((s, a) => s + (a.phase2_total_score || 0), 0) / phase2.length : 0;
        const award = (awardsData || []).find(aw => aw.paper_id === p.paper_id);
        return {
          ...p, phase2Assignments: phase2,
          total_reviewers: p.review_assignments?.length || 0,
          completed_reviewers: phase2.length,
          avg_score: Math.round(avg * 10) / 10,
          university: (usersData || []).find(u => u.user_id === p.author_id)?.institution || '-',
          has_award: !!award, award_id: award?.id || null, award_type: award?.award_type || null,
        };
      })
      .filter(p => p.phase2Assignments.length > 0);
  } catch (e) { console.error(e); }
  finally { loading.value = false; }
};

const allUsers = ref([]);
const getAuthorName = (id) => {
  const u = allUsers.value.find(x => x.user_id === id);
  return u ? `${u.title || ''}${u.first_name_th || ''} ${u.last_name_th || ''}`.trim() : 'ไม่ระบุ';
};

const sortedPapers = computed(() => {
  const arr = [...papers.value];
  arr.sort((a, b) => {
    const av = a[sortKey.value] ?? 0, bv = b[sortKey.value] ?? 0;
    return sortDir.value === 'desc' ? bv - av : av - bv;
  });
  return arr;
});

const toggleSort = (key) => {
  if (sortKey.value === key) sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc';
  else { sortKey.value = key; sortDir.value = 'desc'; }
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
    alert(`✅ ประกาศรางวัล "${awardLabelMap[awardType]}" สำหรับ ${paper.paper_code} เรียบร้อยแล้ว`);
    await loadData();
  } catch (e) { alert('เกิดข้อผิดพลาด: ' + e.message); }
  finally { announcing.value = null; }
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

const awardLabelMap = {
  gold: '🥇 ชนะเลิศ',
  silver: '🥈 รองชนะเลิศอันดับ 1',
  bronze: '🥉 รองชนะเลิศอันดับ 2',
};
const awardColorMap = {
  gold: 'bg-amber-50 border-amber-200 text-amber-700',
  silver: 'bg-slate-50 border-slate-300 text-slate-700',
  bronze: 'bg-orange-50 border-orange-200 text-orange-700',
};

onMounted(loadData);
</script>

<template>
  <div class="p-8 pb-32 font-['Sarabun'] animate-fade-in">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-black text-slate-900 flex items-center gap-2">
          <Trophy class="w-6 h-6 text-amber-500" />
          ประกาศรางวัลและเกียรติบัตร
        </h1>
        <p class="text-sm text-slate-500 mt-1">สรุปอันดับคะแนน Phase 2 · ประกาศรางวัล · สร้างเกียรติบัตร</p>
      </div>
      <div class="flex items-center gap-3">
        <button @click="loadData" class="flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-4 py-2.5 rounded-xl transition-all">
          <RefreshCw class="w-3.5 h-3.5" :class="loading ? 'animate-spin' : ''" /> รีเฟรช
        </button>
        <NuxtLink to="/awards/certificates" class="flex items-center gap-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 px-5 py-2.5 rounded-xl transition-all shadow-sm">
          <Award class="w-4 h-4" /> สร้างเกียรติบัตร
        </NuxtLink>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-3 gap-5 mb-8" v-if="!loading">
      <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center"><FileText class="w-5 h-5 text-indigo-600" /></div>
          <div class="text-xs font-bold text-slate-500">บทความที่มีคะแนน Phase 2</div>
        </div>
        <div class="text-3xl font-black text-slate-800">{{ papers.length }}</div>
      </div>
      <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><Trophy class="w-5 h-5 text-amber-600" /></div>
          <div class="text-xs font-bold text-slate-500">ประกาศรางวัลแล้ว</div>
        </div>
        <div class="text-3xl font-black text-amber-600">{{ papers.filter(p => p.has_award).length }}</div>
      </div>
      <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><Star class="w-5 h-5 text-emerald-600" /></div>
          <div class="text-xs font-bold text-slate-500">คะแนนสูงสุด</div>
        </div>
        <div class="text-3xl font-black text-emerald-600">{{ sortedPapers[0]?.avg_score || '-' }}</div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20"><RefreshCw class="w-8 h-8 text-slate-300 animate-spin" /></div>

    <!-- Empty -->
    <div v-else-if="papers.length === 0" class="text-center py-20 bg-white rounded-2xl border border-slate-200">
      <Trophy class="w-12 h-12 text-slate-200 mx-auto mb-4" />
      <div class="font-bold text-slate-500">ยังไม่มีคะแนน Phase 2</div>
      <div class="text-sm text-slate-400 mt-1">กรรมการต้องกรอกคะแนนก่อนจึงจะประกาศรางวัลได้</div>
    </div>

    <!-- Score Table -->
    <div v-else class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div class="font-bold text-slate-800">อันดับคะแนน Phase 2 — {{ papers.length }} บทความ</div>
        <div class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 font-bold">🔒 เฉพาะ Admin</div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="text-left px-6 py-4 text-xs font-black text-slate-500 uppercase">อันดับ</th>
              <th class="text-left px-6 py-4 text-xs font-black text-slate-500 uppercase">ผู้นำเสนอ</th>
              <th class="text-left px-6 py-4 text-xs font-black text-slate-500 uppercase">บทความ</th>
              <th class="px-6 py-4 text-xs font-black text-slate-500 uppercase cursor-pointer hover:text-slate-800 text-center" @click="toggleSort('completed_reviewers')">
                <span class="flex items-center justify-center gap-1">กรรมการ
                  <ChevronDown v-if="sortKey==='completed_reviewers'&&sortDir==='desc'" class="w-3 h-3" />
                  <ChevronUp v-else-if="sortKey==='completed_reviewers'&&sortDir==='asc'" class="w-3 h-3" />
                </span>
              </th>
              <th class="px-6 py-4 text-xs font-black text-slate-500 uppercase cursor-pointer hover:text-slate-800 text-center" @click="toggleSort('avg_score')">
                <span class="flex items-center justify-center gap-1">คะแนนเฉลี่ย
                  <ChevronDown v-if="sortKey==='avg_score'&&sortDir==='desc'" class="w-3 h-3 text-amber-500" />
                  <ChevronUp v-else-if="sortKey==='avg_score'&&sortDir==='asc'" class="w-3 h-3 text-amber-500" />
                </span>
              </th>
              <th class="text-center px-6 py-4 text-xs font-black text-slate-500 uppercase">รายละเอียด</th>
              <th class="text-center px-6 py-4 text-xs font-black text-slate-500 uppercase">ประกาศรางวัล</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="(paper, index) in sortedPapers" :key="paper.paper_id" class="hover:bg-slate-50 transition-colors">
              <td class="px-6 py-5">
                <div class="flex items-center justify-center w-10 h-10 rounded-xl font-black text-lg"
                  :class="{ 'bg-amber-50 text-amber-600': index===0, 'bg-slate-100 text-slate-600': index===1, 'bg-orange-50 text-orange-600': index===2, 'bg-white text-slate-400 border border-slate-200': index>2 }">
                  {{ index===0?'🥇':index===1?'🥈':index===2?'🥉':index+1 }}
                </div>
              </td>
              <td class="px-6 py-5 min-w-[160px]">
                <div class="font-black text-slate-800 text-sm">{{ getAuthorName(paper.author_id) }}</div>
                <div class="text-[10px] text-slate-400 font-bold mt-0.5">{{ paper.paper_code }}</div>
              </td>
              <td class="px-6 py-5 min-w-[250px]">
                <div class="font-bold text-slate-800 text-sm leading-snug line-clamp-2">{{ paper.title_th }}</div>
                <div v-if="paper.track" class="text-[10px] text-slate-400 mt-1">{{ paper.track }}</div>
                <div v-if="paper.has_award" class="mt-1.5">
                  <span class="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full border" :class="awardColorMap[paper.award_type] || 'bg-slate-50 border-slate-200 text-slate-600'">
                    <Trophy class="w-3 h-3" /> {{ awardLabelMap[paper.award_type] || paper.award_type }}
                  </span>
                </div>
              </td>
              <td class="px-6 py-5 text-center">
                <div class="inline-flex items-center gap-1 font-bold text-sm"
                  :class="paper.completed_reviewers===paper.total_reviewers&&paper.total_reviewers>0?'text-emerald-600':'text-amber-600'">
                  <CheckCircle2 v-if="paper.completed_reviewers===paper.total_reviewers&&paper.total_reviewers>0" class="w-4 h-4" />
                  {{ paper.completed_reviewers }}/{{ paper.total_reviewers }}
                </div>
              </td>
              <td class="px-6 py-5 text-center">
                <div class="text-3xl font-black" :class="{ 'text-amber-500': paper.avg_score>=85, 'text-indigo-600': paper.avg_score>=70&&paper.avg_score<85, 'text-slate-600': paper.avg_score<70 }">{{ paper.avg_score }}</div>
                <div class="text-[10px] text-slate-400 font-bold">/100</div>
              </td>
              <td class="px-6 py-5">
                <details class="group">
                  <summary class="cursor-pointer text-xs font-bold text-indigo-600 hover:text-indigo-800 list-none flex items-center justify-center gap-1">
                    ดูรายละเอียด <ChevronDown class="w-3.5 h-3.5 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div class="mt-3 space-y-2 min-w-[200px]">
                    <div v-for="a in paper.phase2Assignments" :key="a.assignment_id" class="text-[11px] bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <div class="font-bold text-slate-700 mb-1.5">{{ a.users?.first_name_th }} {{ a.users?.last_name_th }}</div>
                      <div class="grid grid-cols-5 gap-1 text-center font-['Lato']">
                        <div v-for="[label, val] in [['🎨',a.phase2_score_creativity],['🔬',a.phase2_score_methodology],['💡',a.phase2_score_usefulness],['📄',a.phase2_score_paper],['🎤',a.phase2_score_presentation]]" :key="label">
                          <div class="font-black text-slate-800">{{ val??'-' }}</div>
                          <div class="text-slate-400 text-[9px]">{{ label }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </details>
              </td>
              <td class="px-6 py-5 text-center">
                <div v-if="paper.has_award" class="space-y-1">
                  <div class="text-xs font-bold text-emerald-600 flex items-center justify-center gap-1">
                    <CheckCircle2 class="w-4 h-4" /> ประกาศแล้ว
                  </div>
                  <button @click="cancelAward(paper)" class="text-[10px] font-bold text-rose-500 hover:text-rose-700 underline">
                    ยกเลิกประกาศ
                  </button>
                </div>
                <div v-else-if="index < 3" class="space-y-1.5">
                  <button @click="announceAward(paper, index===0?'gold':index===1?'silver':'bronze')" :disabled="announcing===paper.paper_id"
                    class="w-full text-[10px] font-black px-3 py-2 rounded-xl border transition-all disabled:opacity-50"
                    :class="{ 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100': index===0, 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100': index===1, 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100': index===2 }">
                    <Megaphone class="w-3 h-3 inline mr-1" /> {{ awardLabelMap[index===0?'gold':index===1?'silver':'bronze'] }}
                  </button>
                </div>
                <div v-else class="text-[10px] text-slate-400 font-bold">—</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
