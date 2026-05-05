<script setup>
definePageMeta({ layout: 'portal' });

import { ref, computed, onMounted } from 'vue';
import { 
  Search, Download, Quote, BookOpen, ChevronDown, X, Copy, Check, FileText, Calendar, Filter, Loader2, CheckCircle2 
} from 'lucide-vue-next';
import { useSupabase } from '~/composables/useSupabase';

const supabase = useSupabase();
const papers = ref([]);
const isLoading = ref(true);
const systemConfig = ref(null);

const fetchArchives = async () => {
  isLoading.value = true;
  try {
    const [papersRes, settingsRes] = await Promise.all([
      supabase
        .from('papers')
        .select(`
          *,
          author:author_id (
            first_name_th,
            last_name_th
          )
        `)
        .in('status', ['published', 'accepted'])
        .order('created_at', { ascending: false }),
      supabase.from('system_settings').select('config_json').eq('id', 1).maybeSingle()
    ]);

    if (papersRes.data) {
      // Map author names for easier use in template
      papers.value = papersRes.data.map(p => ({
        ...p,
        author_display_name: p.author ? `${p.author.first_name_th} ${p.author.last_name_th}` : (p.author_name || 'ไม่ระบุชื่อผู้แต่ง')
      }));
    }
    if (settingsRes.data) systemConfig.value = settingsRes.data.config_json;
  } catch (error) {
    console.error('Fetch Error:', error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchArchives();
});

const years = computed(() => {
  const ySet = new Set();
  const currentYear = new Date().getFullYear();
  ySet.add(currentYear);
  papers.value.forEach(p => {
    if (p.created_at) {
      const y = new Date(p.created_at).getFullYear();
      if (y) ySet.add(y);
    }
  });
  return Array.from(ySet).sort((a, b) => b - a);
});

const tracks = computed(() => {
  const tSet = new Set();
  papers.value.forEach(p => {
    if (p.track) tSet.add(p.track);
  });
  return Array.from(tSet).sort();
});

const allProceedingsArray = computed(() => {
  const map = systemConfig.value?.proceedings_map || {};
  return Object.keys(map)
    .sort((a, b) => Number(b) - Number(a))
    .map(y => ({
      year: y,
      url: typeof map[y] === 'string' ? map[y] : map[y]?.url,
      cover: typeof map[y] === 'string' ? null : map[y]?.cover,
      theme: typeof map[y] === 'string' ? '' : (map[y]?.theme || ''),
      subtitle: typeof map[y] === 'string' ? '' : (map[y]?.subtitle || '')
    }));
});

const selectedYears = ref(new Set([new Date().getFullYear()]));
const selectedTracks = ref(new Set());
const query = ref('');
const yearQuery = ref('');
const page = ref(1);
const citeModalOpen = ref(false);
const citePaper = ref(null);
const copied = ref('');

const pageSize = 6;

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('th-TH-u-ca-gregory', { year: 'numeric', month: 'short', day: 'numeric' });
};

const selectedYearsSorted = computed(() => Array.from(selectedYears.value).sort((a, b) => b - a));
const primaryYear = computed(() => selectedYearsSorted.value[0] ?? new Date().getFullYear());


const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  return papers.value
    .filter((p) => {
      const pYear = p.created_at ? new Date(p.created_at).getFullYear() : null;
      if (!selectedYears.value || selectedYears.value.size === 0) return true;
      return selectedYears.value.has(pYear);
    })
    .filter((p) => {
      if (!selectedTracks.value || selectedTracks.value.size === 0) return true;
      return selectedTracks.value.has(p.track);
    })
    .filter((p) => {
      if (!q) return true;
      const hay = `${p.id} ${p.title} ${p.track} ${(p.authors || []).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
});

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
const current = computed(() => filtered.value.slice((page.value - 1) * pageSize, (page.value - 1) * pageSize + pageSize));

const toggleTrack = (t) => {
  page.value = 1;
  const next = new Set(selectedTracks.value);
  if (next.has(t)) next.delete(t);
  else next.add(t);
  selectedTracks.value = next;
};

const toggleYear = (y) => {
  page.value = 1;
  const next = new Set(selectedYears.value);
  if (next.has(y)) next.delete(y);
  else next.add(y);
  selectedYears.value = next;
};

const selectAllYears = () => {
  page.value = 1;
  selectedYears.value = new Set(years.value);
};

const clearYears = () => {
  page.value = 1;
  selectedYears.value = new Set();
};

const filteredYears = computed(() => {
  const q = yearQuery.value.trim();
  if (!q) return years.value;
  return years.value.filter((y) => String(y).includes(q));
});

const openCite = (paper) => {
  citePaper.value = paper;
  citeModalOpen.value = true;
  copied.value = '';
};

const closeCite = () => {
  citeModalOpen.value = false;
  citePaper.value = null;
  copied.value = '';
};

const citations = computed(() => {
  const paper = citePaper.value;
  const authors = paper.author_display_name || 'Anonymous';
  const pYear = paper.created_at ? new Date(paper.created_at).getFullYear() : new Date().getFullYear();
  const title = paper.title_th || paper.title_en || 'Untitled';
  const track = paper.track || 'General';
  const doi = paper.doi || `10.1234/paper.${paper.id}`;

  const apa = `${authors} (${pYear}). ${title}. In Proceedings of IC-Sci ${pYear} (${track}). https://doi.org/${doi}`;
  const ieee = `${authors}, "${title}," in Proceedings of IC-Sci ${pYear} (${track}), ${pYear}. doi: ${doi}.`;
  const key = `${(paper.paper_code || paper.id).replace('-', '').toLowerCase()}_${pYear}`;
  const bibtex = `@inproceedings{${key},\n  title={${title}},\n  author={${authors}},\n  booktitle={Proceedings of IC-Sci ${pYear}},\n  year={${pYear}},\n  doi={${doi}},\n  note={Track: ${track}}\n}`;
  return { apa, ieee, bibtex };
});

const copyText = async (key, value) => {
  try {
    await navigator.clipboard.writeText(value);
    copied.value = key;
    window.setTimeout(() => copied.value = '', 1200);
  } catch (e) {
    copied.value = '';
  }
};

const downloadPaper = (url) => {
  if (!url) {
    alert('ขออภัย: ไม่พบไฟล์บทความนี้ในระบบ');
    return;
  }
  window.open(url, '_blank');
};

const downloadProceedings = (url) => {
  if (!url) {
    alert('ขออภัย: ไฟล์รวมเล่ม (Proceedings) ของปีนี้ยังไม่ได้ถูกอัปโหลดเข้าระบบ');
    return;
  }
  window.open(url, '_blank');
};
</script>

<template>
  <div class="flex-1 overflow-y-auto px-6 pt-8 pb-32 no-scrollbar bg-slate-50 font-['Sarabun']">
    <div class="mx-auto max-w-7xl">
      <div class="mb-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-900 leading-tight">คลังบทความย้อนหลัง (Archives)</h1>
            <p class="text-sm text-slate-500">แหล่งรวบรวมองค์ความรู้จากงานประชุมวิชาการ BRICC ทุกปี</p>
          </div>
          <button
            type="button"
            @click="() => {}"
            class="h-11 px-5 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-sm hover:bg-slate-50 transition-colors font-extrabold text-sm inline-flex items-center gap-2"
          >
            <BookOpen :size="18" />
            Library
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside class="lg:col-span-4 xl:col-span-3">
          <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div class="text-sm font-extrabold text-slate-900 inline-flex items-center gap-2">
                <Filter :size="16" class="text-slate-500" />
                ตัวกรอง (Filters)
              </div>
            </div>

            <div class="p-5">
              <div>
                <div class="text-xs font-extrabold text-slate-700">เลือกปี (Year)</div>
                <div class="mt-3 rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <div class="p-3 border-b border-slate-100 bg-white sticky top-0 z-10">
                    <div class="relative">
                      <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        v-model="yearQuery"
                        class="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100 transition-shadow"
                        placeholder="ค้นหาปี..."
                      />
                    </div>
                    <div class="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        @click="selectAllYears"
                        class="h-8 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors text-xs font-extrabold"
                      >
                        เลือกทั้งหมด
                      </button>
                      <button
                        type="button"
                        @click="clearYears"
                        class="h-8 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-white transition-colors text-xs font-extrabold"
                      >
                        ล้าง
                      </button>
                    </div>
                  </div>

                  <div class="p-3 space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                    <button
                      v-for="y in filteredYears"
                      :key="y"
                      type="button"
                      @click="toggleYear(y)"
                      :class="[
                        'w-full rounded-2xl border px-4 py-3 text-left transition-all',
                        selectedYears.has(y)
                          ? 'bg-slate-900 text-white border-slate-900 shadow'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      ]"
                    >
                      <div class="flex items-center justify-between gap-3">
                        <div>
                          <div class="text-sm font-extrabold">{{ y }}</div>
                          <div :class="['text-[11px] font-semibold', selectedYears.has(y) ? 'text-white/70' : 'text-slate-500']">
                            การประชุมปี {{ y }}
                          </div>
                        </div>
                        <div :class="['w-5 h-5 rounded-md border flex items-center justify-center', selectedYears.has(y) ? 'bg-white/15 border-white/30' : 'bg-white border-slate-300']">
                          <Check v-if="selectedYears.has(y)" :size="14" class="text-white" />
                        </div>
                      </div>
                    </button>
                    <div v-if="filteredYears.length === 0" class="py-6 text-center text-xs font-semibold text-slate-500">ไม่พบปีที่ค้นหา</div>
                  </div>
                </div>
              </div>

              <div class="mt-6">
                <div class="text-xs font-extrabold text-slate-700">หมวดหมู่ (Track)</div>
                <div class="mt-3 space-y-2">
                  <div v-if="tracks.length === 0" class="py-4 text-center text-xs font-semibold text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                    ไม่มีข้อมูล Track ในปีที่เลือก
                  </div>
                  <button
                    v-for="t in tracks"
                    :key="t"
                    type="button"
                    @click="toggleTrack(t)"
                    :class="[
                      'w-full rounded-2xl border px-4 py-3 text-left transition-colors',
                      selectedTracks.has(t) ? 'bg-purple-50 border-purple-200' : 'bg-white border-slate-200 hover:bg-slate-50'
                    ]"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <div class="text-sm font-extrabold text-slate-900">{{ t }}</div>
                      <div :class="['w-5 h-5 rounded-md border flex items-center justify-center', selectedTracks.has(t) ? 'bg-purple-600 border-purple-600' : 'bg-white border-slate-300']">
                        <Check v-if="selectedTracks.has(t)" :size="14" class="text-white" />
                      </div>
                    </div>
                  </button>
                </div>
                <div class="mt-3 text-[11px] font-semibold text-slate-500">
                  * ไม่เลือกอะไรเลย = แสดงทุก Track
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main class="lg:col-span-8 xl:col-span-9 space-y-6">
          
          <div class="space-y-4">
            <div v-for="proc in allProceedingsArray" :key="proc.year" class="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden animate-fade-in group hover:border-purple-200 transition-all">
              <div class="flex flex-col md:flex-row items-stretch">
                <!-- COVER IMAGE SECTION (Adjusted for Horizontal Cover) -->
                <div class="md:w-64 shrink-0 bg-slate-50 border-r border-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
                  <div class="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div class="relative z-10 w-full aspect-[1.41/1] rounded-xl shadow-lg shadow-slate-200 overflow-hidden border border-slate-200 bg-white transform group-hover:scale-[1.03] transition-transform duration-500">
                    <img v-if="proc.cover" :src="proc.cover" alt="Cover" class="w-full h-full object-cover" />
                    <img v-else src="~/assets/bricc.png" alt="Default Cover" class="w-full h-full object-cover" />
                  </div>
                </div>

                <!-- INFO SECTION (Compact) -->
                <div class="flex-1 p-6 md:p-8 flex flex-col justify-center">
                  <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-[10px] font-black uppercase tracking-wider mb-3 w-fit">
                    <Calendar :size="12" />
                    Proceedings {{ proc.year }}
                  </div>
                  
                  <h3 class="text-xl font-black text-slate-900 mb-1 leading-tight">
                    {{ proc.theme }}
                  </h3>
                  <p class="text-sm font-bold text-slate-500 mb-6 line-clamp-2 leading-relaxed">
                    {{ proc.subtitle }}
                  </p>

                  <div class="flex items-center gap-3">
                    <button
                      type="button"
                      @click="downloadProceedings(proc.url)"
                      class="h-11 px-6 rounded-2xl bg-purple-600 text-white shadow-lg shadow-purple-100 hover:bg-purple-700 transition-all active:scale-[0.98] font-black text-xs inline-flex items-center gap-2"
                    >
                      <Download :size="16" />
                      ดาวน์โหลด (Proceedings)
                    </button>
                    
                    <!-- Stats / Mini Info -->
                    <div class="hidden sm:flex items-center gap-4 ml-2 border-l border-slate-100 pl-6">
                       <div class="text-center">
                          <div class="text-[10px] font-black text-slate-400 uppercase">Year</div>
                          <div class="text-xs font-black text-slate-700">{{ proc.year }}</div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="allProceedingsArray.length === 0" class="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
               <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText class="w-8 h-8 text-slate-300" />
               </div>
               <p class="text-sm font-black text-slate-400">ยังไม่มีข้อมูลรวมเล่ม (Proceedings) ในระบบ</p>
            </div>
          </div>

          <!-- SEARCH BAR FOR PAPER LIST -->

          <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
            <div class="relative">
              <Search :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                v-model="query"
                @input="page = 1"
                class="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100 transition-shadow"
                placeholder="ค้นหาบทความในเล่มนี้... (ชื่อ, รหัส, ผู้แต่ง, Track)"
              />
            </div>
          </div>

          <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
              <div class="text-sm font-extrabold text-slate-900">รายการบทความ (Paper List)</div>
              <div class="text-xs font-semibold text-slate-500">{{ filtered.length }} รายการ</div>
            </div>

            <div v-if="isLoading" class="p-16 flex flex-col items-center justify-center gap-4">
              <Loader2 class="w-10 h-10 text-purple-600 animate-spin" />
              <div class="text-sm font-bold text-slate-500">กำลังโหลดคลังบทความ...</div>
            </div>
            <div v-else-if="current.length === 0" class="p-12 text-center">
              <div class="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Search class="w-8 h-8 text-slate-300" />
              </div>
              <div class="text-sm font-extrabold text-slate-900">ไม่พบบทความ</div>
              <div class="mt-1 text-sm text-slate-500">ลองเปลี่ยนตัวกรองหรือคำค้นหา</div>
            </div>
            <div v-else class="divide-y divide-slate-100">
              <div v-for="p in current" :key="p.id" class="px-6 py-6 hover:bg-slate-50/70 transition-colors">
                <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                  <div class="min-w-0">
                    <div class="text-[11px] font-extrabold text-slate-300 tracking-[0.18em]">#{{ p.paper_code || p.id.slice(0,8) }}</div>
                    <div class="mt-2 text-left text-[16px] font-extrabold text-slate-900 leading-snug group-hover:text-purple-700 transition-colors">
                      {{ p.title_th || p.title_en }}
                    </div>
                    <div class="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <div class="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200">
                        {{ (p.author_display_name || 'A').charAt(0) }}
                      </div>
                      {{ p.author_display_name }}
                    </div>
                    <div class="mt-4 flex flex-wrap items-center gap-2">
                      <span v-if="p.status === 'published'" class="inline-flex items-center gap-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider">
                        <CheckCircle2 :size="12" /> ตีพิมพ์แล้ว
                      </span>
                      <span v-else class="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider">
                        <CheckCircle2 :size="12" /> ผ่านการคัดเลือก
                      </span>

                      <span class="inline-flex items-center rounded-xl bg-slate-50 text-slate-600 border border-slate-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider">
                        {{ p.track || 'General' }}
                      </span>
                      <span class="inline-flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        <Calendar :size="14" class="text-slate-400" /> {{ formatDate(p.created_at) }}
                      </span>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      @click="downloadPaper(p.file_url)"
                      class="h-10 px-5 rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all active:scale-[0.98] text-xs font-black inline-flex items-center gap-2"
                    >
                      <Download :size="16" /> PDF
                    </button>
                    <button
                      type="button"
                      @click="openCite(p)"
                      class="h-10 px-5 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-sm hover:bg-slate-50 transition-all active:scale-[0.98] text-xs font-black inline-flex items-center gap-2"
                    >
                      <Quote :size="16" /> Cite
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-center gap-2">
            <button
              type="button"
              @click="page = Math.max(1, page - 1)"
              :disabled="page <= 1"
              class="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronDown :size="18" class="rotate-90" />
            </button>
            <button
              v-for="(_, i) in Array.from({ length: totalPages })"
              :key="i"
              type="button"
              @click="page = i + 1"
              :class="[
                'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                page === i + 1 ? 'bg-purple-600 text-white' : 'hover:bg-slate-100 text-slate-600'
              ]"
            >
              {{ i + 1 }}
            </button>
            <button
              type="button"
              @click="page = Math.min(totalPages, page + 1)"
              :disabled="page >= totalPages"
              class="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronDown :size="18" class="-rotate-90" />
            </button>
          </div>
        </main>
      </div>
    </div>

    <div v-if="citeModalOpen && citePaper" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close cite modal"
        @click="closeCite"
        class="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      ></button>

      <div class="relative w-full max-w-2xl rounded-[28px] bg-white shadow-2xl overflow-hidden">
        <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4">
          <div>
            <div class="text-lg font-extrabold text-slate-900">Citation</div>
            <div class="mt-1 text-xs font-semibold text-slate-500 truncate">#{{ citePaper.id }} • {{ citePaper.track }} • {{ citePaper.year }}</div>
          </div>
          <button
            type="button"
            @click="closeCite"
            class="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-white transition-colors"
            aria-label="ปิด"
          >
            <X :size="18" class="text-slate-700" />
          </button>
        </div>

        <div class="p-6 space-y-4">
          <div v-for="c in [
            { key: 'apa', label: 'APA', value: citations.apa },
            { key: 'ieee', label: 'IEEE', value: citations.ieee },
            { key: 'bibtex', label: 'BibTeX', value: citations.bibtex }
          ]" :key="c.key" class="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
            <div class="flex items-center justify-between gap-3">
              <div class="text-xs font-extrabold text-slate-700">{{ c.label }}</div>
              <button
                type="button"
                @click="copyText(c.key, c.value)"
                class="h-9 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors text-xs font-extrabold inline-flex items-center gap-2"
              >
                <Check v-if="copied === c.key" :size="16" class="text-emerald-600" />
                <Copy v-else :size="16" />
                {{ copied === c.key ? 'คัดลอกแล้ว' : 'คัดลอก' }}
              </button>
            </div>
            <pre class="mt-3 whitespace-pre-wrap break-words text-xs text-slate-700 font-mono bg-white border border-slate-200 rounded-xl p-3 max-h-40 overflow-y-auto custom-scrollbar">{{ c.value }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
