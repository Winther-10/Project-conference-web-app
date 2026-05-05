<script setup>
definePageMeta({ layout: 'portal' });
import { ref, computed, onMounted } from 'vue';
import {
  Search, Calendar, MapPin, Clock, Bookmark, Check, Filter, 
  Users, Download, ExternalLink, ChevronDown, ChevronUp, Star, 
  Video, Link, Map as MapIcon
} from 'lucide-vue-next';
import { useAuth } from '~/composables/useAuth';
import { useSupabase } from '~/composables/useSupabase';

const { userProfile } = useAuth();
const supabase = useSupabase();

const formatRange = (start, end) => `${start} - ${end}`;
const timeToMinutes = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const schedule = ref([]);
const myPaperIds = ref(new Set());
const isLoading = ref(true);

const days = ref([]);
const tracks = ref(['Computer Science', 'Education', 'Smart Farm', 'General Science', 'Innovation']);
const formats = ['On-site'];

const activeDay = ref('');
const selectedTracks = ref(new Set());
const selectedFormats = ref(new Set());
const roomQuery = ref('');
const query = ref('');
const expandedSessions = ref(new Set());
const myPlan = ref(new Set());
const onlyMyPapers = ref(false);

onMounted(async () => {
  await fetchSchedule();
  await fetchMyPapers();
});

const fetchSchedule = async () => {
  isLoading.value = true;
  try {
    // Join with users (author_id) to get the most up-to-date name
    const { data, error } = await supabase
      .from('schedules')
      .select('*, papers(*, users:author_id(first_name_th, last_name_th))')
      .order('start_time', { ascending: true });
    
    if (!error && data && data.length > 0) {
      const sessionsMap = {};
      const uniqueDaysMap = new Map();

      data.forEach((row, i) => {
        const room = row.room_name || 'General Room';
        const d = row.start_time ? new Date(row.start_time) : new Date();
        const dayId = `date-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        
        if (!uniqueDaysMap.has(dayId)) {
           const options = { day: 'numeric', month: 'short' };
           uniqueDaysMap.set(dayId, {
               id: dayId,
               label: `วันที่ ${d.toLocaleDateString('th-TH', options)}`,
               time: d.getTime()
           });
        }

        const startStr = row.start_time ? new Date(row.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '09:00';
        const endStr = row.end_time ? new Date(row.end_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '12:00';
        
        const sessionKey = `${room}-${dayId}`;
        
        if (!sessionsMap[sessionKey]) {
          sessionsMap[sessionKey] = {
            id: sessionKey,
            dayId: dayId,
            start: startStr,
            end: endStr,
            room: room,
            sessionCode: room,
            track: row.papers?.track || 'General Science',
            format: 'On-site',
            meetingLink: '',
            papers: []
          };
        }
        
        sessionsMap[sessionKey].end = endStr;
        
        // Construct display names: use current name from profiles for primary author
        const pAuthors = Array.isArray(row.papers?.authors) ? [...row.papers.authors] : [];
        if (row.papers?.users) {
          const currentName = [row.papers.users.first_name_th, row.papers.users.last_name_th].filter(Boolean).join(' ');
          if (currentName) {
            if (pAuthors.length > 0) pAuthors[0] = currentName;
            else pAuthors.push(currentName);
          }
        }
        
        sessionsMap[sessionKey].papers.push({
          id: row.paper_id,
          code: row.papers?.paper_code || row.paper_id?.slice(0, 8),
          title: row.papers?.title_th || row.papers?.title_en || 'Untitled',
          presenter: pAuthors.length > 0 ? pAuthors.join(', ') : 'Presenter',
          time: startStr
        });
      });
      
      
      schedule.value = Object.values(sessionsMap);
      
      // Update available days
      days.value = Array.from(uniqueDaysMap.values()).sort((a,b) => a.time - b.time);
      if (days.value.length > 0 && !days.value.some(d => d.id === activeDay.value)) {
         activeDay.value = days.value[0].id;
      }
      
      // Update available tracks dynamically
      const allTracks = new Set();
      schedule.value.forEach(s => {
        allTracks.add(s.track);
        s.papers.forEach(p => {
           // Also add paper tracks if needed, but session track is main
        });
      });
      if (allTracks.size > 0) {
        tracks.value = Array.from(allTracks);
      }
    } else {
      schedule.value = [];
    }
  } catch (error) {
    schedule.value = [];
  } finally {
    isLoading.value = false;
  }
};

const fetchMyPapers = async () => {
  if (!userProfile.value) return;
  try {
    const { data } = await supabase.from('papers').select('paper_id').eq('author_id', userProfile.value.user_id);
    if (data) {
      myPaperIds.value = new Set(data.map(p => p.paper_id));
    }
  } catch (e) {
    console.error(e);
  }
};

const toggleTrack = (t) => {
  const next = new Set(selectedTracks.value);
  if (next.has(t)) next.delete(t);
  else next.add(t);
  selectedTracks.value = next;
};

const toggleFormat = (f) => {
  const next = new Set(selectedFormats.value);
  if (next.has(f)) next.delete(f);
  else next.add(f);
  selectedFormats.value = next;
};

const clearTracks = () => selectedTracks.value = new Set();
const selectAllTracks = () => selectedTracks.value = new Set(tracks);

const toggleSessionExpanded = (id) => {
  const next = new Set(expandedSessions.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expandedSessions.value = next;
};

const toggleSave = (sessionId, paperId = null) => {
  const key = paperId ? `${sessionId}::${paperId}` : sessionId;
  const next = new Set(myPlan.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  myPlan.value = next;
};

const isSaved = (sessionId, paperId = null) => {
  const key = paperId ? `${sessionId}::${paperId}` : sessionId;
  return myPlan.value.has(key);
};

const filteredSessions = computed(() => {
  const q = query.value.trim().toLowerCase();
  const rq = roomQuery.value.trim().toLowerCase();

  return schedule.value
    .filter((s) => s.dayId === activeDay.value)
    .filter((s) => {
      if (selectedTracks.value.size === 0) return true;
      return selectedTracks.value.has(s.track);
    })
    .filter((s) => {
      if (selectedFormats.value.size === 0) return true;
      return selectedFormats.value.has(s.format);
    })
    .filter((s) => {
      if (!onlyMyPapers.value) return true;
      return s.papers.some((p) => myPaperIds.value.has(p.id));
    })
    .filter((s) => {
      if (!rq) return true;
      return `${s.room} ${s.sessionCode}`.toLowerCase().includes(rq);
    })
    .filter((s) => {
      if (!q) return true;
      const hay = `${s.room} ${s.sessionCode} ${s.track} ${s.papers.map((p) => `${p.id} ${p.title} ${p.presenter}`).join(' ')}`.toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start) || a.room.localeCompare(b.room));
});

const myPlanItems = computed(() => {
  const out = [];
  for (const key of myPlan.value) {
    const [sessionId, paperId] = key.split('::');
    const s = schedule.value.find((x) => x.id === sessionId);
    if (!s) continue;

    if (!paperId) {
      out.push({
        key,
        dayId: s.dayId,
        start: s.start,
        end: s.end,
        title: `${s.sessionCode} (${s.room})`,
        subtitle: `Track: ${s.track}`,
        isMine: false
      });
      continue;
    }

    const p = s.papers.find((pp) => pp.id === paperId);
    if (!p) continue;
    out.push({
      key,
      dayId: s.dayId,
      start: p.time,
      end: s.end,
      title: `${p.code}: ${p.title}`,
      subtitle: `${s.room} (${s.sessionCode})`,
      isMine: myPaperIds.value.has(p.id)
    });
  }

  return out
    .filter((x) => x.dayId === activeDay.value)
    .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start) || a.title.localeCompare(b.title));
});

const getFormatBadgeConfig = (format) => {
  return { class: 'bg-blue-50 text-blue-700 border-blue-200', icon: '🏢' };
};

const getTrackBadgeClass = (track) => {
  if (!track) return 'bg-slate-50 text-slate-700 border-slate-200';
  
  const colors = [
    'bg-purple-50 text-purple-700 border-purple-200',
    'bg-emerald-50 text-emerald-700 border-emerald-200',
    'bg-yellow-50 text-yellow-700 border-yellow-200',
    'bg-blue-50 text-blue-700 border-blue-200',
    'bg-rose-50 text-rose-700 border-rose-200',
    'bg-indigo-50 text-indigo-700 border-indigo-200',
    'bg-amber-50 text-amber-700 border-amber-200',
    'bg-cyan-50 text-cyan-700 border-cyan-200',
  ];
  
  // Create a simple hash from the track name to assign a consistent color
  let hash = 0;
  for (let i = 0; i < track.length; i++) {
    hash = track.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};
</script>

<template>
  <div class="flex-1 flex flex-col h-full bg-[#F1F5F9] animate-in slide-in-from-right duration-300 font-['Sarabun'] overflow-hidden">
    <div class="flex-1 overflow-y-auto custom-scrollbar">
      <div class="p-4 max-w-7xl mx-auto w-full">
        <div class="flex flex-col gap-4">
          <div class="min-w-0 mb-3">
            <div class="text-2xl font-black text-slate-900 truncate flex items-center gap-2"><Calendar class="w-6 h-6 text-purple-600" /> ตารางนำเสนอ (Presentation Schedule)</div>
            <div class="mt-1 text-sm font-semibold text-slate-500 truncate">วางแผนการนำเสนอและการเข้าร่วมฟังบรรยายของคุณ</div>
          </div>

          <div class="w-full">
            <div class="relative">
              <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                v-model="query"
                class="w-full h-9 pl-9 pr-3 rounded-lg bg-white border border-slate-200 text-sm focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100 transition-shadow"
                placeholder="ค้นหาหัวข้อ, รหัส, ผู้นำเสนอ..."
              />
            </div>
          </div>
        </div>

        <div class="mt-4 space-y-4">
          <div class="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div class="p-4 border-b border-slate-100 bg-slate-50/40">
              <div class="flex flex-col gap-3">
                <div class="flex items-center gap-2 overflow-x-auto">
                  <button
                    v-for="d in days"
                    :key="d.id"
                    @click="activeDay = d.id"
                    :class="[
                      'h-8 px-3 rounded-lg border text-xs font-extrabold transition-colors whitespace-nowrap flex-shrink-0',
                      activeDay === d.id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    ]"
                  >
                    {{ d.label }}
                  </button>
                </div>

                <div class="relative">
                  <MapPin :size="14" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    v-model="roomQuery"
                    class="h-8 w-full pl-8 pr-3 rounded-lg bg-white border border-slate-200 text-xs focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100 transition-shadow"
                    placeholder="กรองห้อง/Session..."
                  />
                </div>
              </div>
            </div>

            <div class="p-4">
              <div class="flex items-center gap-2 text-xs font-extrabold text-slate-900 mb-3">
                <Filter :size="14" class="text-slate-500" /> ตัวกรอง (Filters)
              </div>

              <div class="flex flex-col gap-3">
                <div>
                  <div class="text-xs font-extrabold text-slate-700 mb-2">สาขา (Tracks)</div>
                  <div class="flex flex-wrap gap-1.5">
                    <button
                      v-for="t in tracks"
                      :key="t"
                      @click="toggleTrack(t)"
                      :class="[
                        'h-8 px-3 rounded-lg border text-xs font-extrabold transition-colors',
                        selectedTracks.has(t) ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      ]"
                    >
                      {{ t }}
                    </button>
                  </div>
                </div>



                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="flex gap-2">
                    <button @click="selectAllTracks" class="h-8 px-3 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors text-xs font-extrabold">
                      เลือกทั้งหมด
                    </button>
                    <button @click="clearTracks" class="h-8 px-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:bg-white transition-colors text-xs font-extrabold">
                      ล้าง
                    </button>
                  </div>
                  <button @click="onlyMyPapers = !onlyMyPapers" :class="[
                    'h-8 px-3 rounded-lg border text-xs font-extrabold transition-colors flex items-center gap-1.5',
                    onlyMyPapers ? 'bg-yellow-50 border-yellow-300 text-yellow-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  ]">
                    <Star class="w-3.5 h-3.5" :class="onlyMyPapers ? 'fill-yellow-500 text-yellow-500' : ''" />
                    เฉพาะบทความของฉัน
                  </button>
                </div>
              </div>

              <div class="mt-4 bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div class="text-sm font-extrabold text-slate-900 inline-flex items-center gap-2">
                    <Calendar :size="14" class="text-slate-500" />
                    ตารางของฉัน (My Plan)
                  </div>
                </div>

                <div class="p-4">
                  <div v-if="myPlanItems.length === 0" class="rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-center">
                    <div class="text-sm font-extrabold text-slate-900">ยังไม่มีรายการ</div>
                    <div class="mt-1 text-xs font-semibold text-slate-500">กด "Add to My Plan" ที่ session ที่สนใจ</div>
                  </div>
                  <div v-else class="space-y-2">
                    <div v-for="it in myPlanItems" :key="it.key" :class="['rounded-lg border p-3', it.isMine ? 'border-yellow-200 bg-yellow-50/40' : 'border-slate-200 bg-white']">
                      <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0 flex-1">
                          <div class="text-[10px] font-black text-slate-500">🕒 {{ formatRange(it.start, it.end) }}</div>
                          <div class="mt-1 text-xs font-extrabold text-slate-900 line-clamp-2">{{ it.title }}</div>
                          <div class="mt-1 text-xs font-semibold text-slate-500">{{ it.subtitle }}</div>
                        </div>
                        <button @click="() => { const [sId, pId] = it.key.split('::'); toggleSave(sId, pId || null); }" class="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:bg-white transition-colors inline-flex items-center justify-center flex-shrink-0">
                          <Check :size="12" class="text-emerald-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <div v-if="isLoading" class="p-12 flex justify-center bg-white rounded-xl border border-slate-200">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
            
            <div v-else-if="filteredSessions.length === 0" class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
              <div class="text-sm font-extrabold text-slate-900">ไม่พบตารางนำเสนอ</div>
              <div class="mt-1 text-sm text-slate-500">ระบบจะทำการอัปเดตตารางนำเสนอในภายหลัง</div>
            </div>

            <div v-for="s in filteredSessions" :key="s.id" :class="['bg-white rounded-xl border shadow-sm overflow-hidden', s.papers.some(p => myPaperIds.has(p.id)) ? 'border-yellow-200 ring-2 ring-yellow-100' : 'border-slate-200']">
              <div class="p-4 border-b border-slate-100 bg-slate-50/40">
                <div class="flex flex-col gap-2">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span class="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2 py-1 text-[10px] font-extrabold text-slate-700">
                      <Clock :size="12" class="text-slate-500" /> {{ formatRange(s.start, s.end) }}
                    </span>
                    <span class="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2 py-1 text-[10px] font-extrabold text-slate-700">
                      <MapPin :size="12" class="text-slate-500" /> {{ s.room }}
                    </span>
                    <span :class="['inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-extrabold border', getFormatBadgeConfig(s.format).class]">
                      {{ getFormatBadgeConfig(s.format).icon }} {{ s.format }}
                    </span>
                    <span :class="['inline-flex items-center rounded-full px-3 py-1 text-[11px] font-extrabold border', getTrackBadgeClass(s.track)]">{{ s.track }}</span>
                    <span v-if="s.papers.some(p => myPaperIds.has(p.id))" class="inline-flex items-center gap-1 rounded-full bg-yellow-50 border border-yellow-200 px-2 py-1 text-[10px] font-extrabold text-yellow-800">
                      <Star :size="12" /> บทความของคุณ
                    </span>
                  </div>
                </div>

                <button @click="toggleSave(s.id)" :class="['mt-3 h-8 px-3 rounded-lg border text-xs font-extrabold transition-colors inline-flex items-center gap-1 w-full', isSaved(s.id) ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50']">
                  <Check v-if="isSaved(s.id)" :size="14" />
                  <Bookmark v-else :size="14" />
                  {{ isSaved(s.id) ? 'Saved' : 'Add to My Plan' }}
                </button>
              </div>

              <div class="p-4" v-if="s.papers && s.papers.length > 0">
                <div class="space-y-2">
                  <div v-for="p in (expandedSessions.has(s.id) ? s.papers : s.papers.slice(0, 2))" :key="p.id" :class="['rounded-lg border p-3 flex items-start justify-between gap-2', myPaperIds.has(p.id) ? 'bg-yellow-50/40 border-yellow-200' : 'bg-white border-slate-200']">
                    <div class="min-w-0 flex-1">
                      <div class="flex items-baseline gap-2">
                        <div class="text-[10px] font-black text-slate-500 font-['Sarabun']">{{ p.time }}</div>
                        <div class="text-xs font-extrabold text-slate-900 line-clamp-2">
                          {{ p.code }}: {{ p.title }} <span v-if="myPaperIds.has(p.id)" class="text-yellow-700">(คุณ)</span>
                        </div>
                      </div>
                      <div class="mt-1 text-[10px] font-semibold text-slate-500">ผู้นำเสนอ: {{ p.presenter }}</div>
                      <div v-if="p.abstract" class="mt-1 text-[10px] font-medium text-slate-600 line-clamp-2">{{ p.abstract }}</div>
                    </div>
                    <button @click="toggleSave(s.id, p.id)" :class="['h-7 w-7 rounded-lg border text-xs font-extrabold transition-colors inline-flex items-center justify-center flex-shrink-0', isSaved(s.id, p.id) ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50']">
                      <Check v-if="isSaved(s.id, p.id)" :size="12" />
                      <Bookmark v-else :size="12" />
                    </button>
                  </div>
                </div>

                <button v-if="s.papers.length > 2" @click="toggleSessionExpanded(s.id)" class="mt-3 h-8 px-3 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors text-xs font-extrabold inline-flex items-center gap-1 w-full">
                  <ChevronUp v-if="expandedSessions.has(s.id)" :size="14" />
                  <ChevronDown v-else :size="14" />
                  {{ expandedSessions.has(s.id) ? 'ซ่อนรายการ' : `ดูเพิ่มเติม (${s.papers.length - 2})` }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
