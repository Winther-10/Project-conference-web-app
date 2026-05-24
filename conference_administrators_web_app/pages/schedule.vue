<script setup>
definePageMeta({ middleware: 'auth', layout: 'admin' });
import { computed, ref, onMounted } from 'vue';
import { useSupabase } from '~/composables/useSupabase';
import {
  CalendarDays, ChevronDown, FileText,
  Pencil, Plus, RefreshCw, Search, Trash2, Users, X
} from 'lucide-vue-next';

const supabase = useSupabase();
const papers = ref([]);
const rooms = ref([]);
const isLoading = ref(true);
const filterYear = ref('all');
const allSchedules = ref([]);

const loadData = async () => {
  isLoading.value = true;
  try {
    const { data: papersData, error: papersError } = await supabase
      .from('papers')
      .select('paper_id, paper_code, title_th, track, status');
    
    if (papersError) throw papersError;
    
    // Load settings
    const { data: settingsData } = await supabase.from('system_settings').select('config_json').eq('id', 1).maybeSingle();
    if (settingsData && settingsData.config_json) {
      const conf = settingsData.config_json.conference;
      const currentYear = String(conf?.academicYear || conf?.year || new Date().getFullYear());
      if (filterYear.value === 'all') filterYear.value = currentYear;
    }

    papers.value = (papersData || []).map(p => ({
      id: p.paper_id,
      code: p.paper_code,
      title: p.title_th,
      track: p.track,
      decision: p.status,
      presentationMode: 'onsite'
    }));

    // Fetch existing schedules
    const { data: schedData, error: schedError } = await supabase
      .from('schedules')
      .select('*')
      .order('start_time', { ascending: true });

    if (schedError) throw schedError;
    allSchedules.value = schedData || [];

    updateRoomsFromSchedules();
  } catch (err) {
    console.error('Error loading papers for schedule:', err);
  } finally {
    isLoading.value = false;
  }
};

const yearOptions = computed(() => {
  const years = new Set();
  papers.value.forEach(p => {
    if (p.code) {
      const match = p.code.match(/-(\d{2})/);
      if (match) years.add('20' + match[1]);
    }
  });
  return Array.from(years).sort((a, b) => b - a);
});

const filteredPapers = computed(() => {
  if (filterYear.value === 'all') return papers.value;
  const yy = filterYear.value.slice(-2);
  return papers.value.filter(p => p.code && p.code.includes(`-${yy}`));
});

const updateRoomsFromSchedules = () => {
  // Group by room_name, but only for filtered papers
  const paperIdSet = new Set(filteredPapers.value.map(p => p.id));
  const filteredScheds = allSchedules.value.filter(s => paperIdSet.has(s.paper_id));

  const roomsMap = {};
  filteredScheds.forEach(s => {
    const roomKey = s.room_name || 'General';
    if (!roomsMap[roomKey]) {
      roomsMap[roomKey] = {
        id: roomKey,
        name: roomKey,
        track: '', 
        dateLabel: '17 ต.ค. 69', 
        eventMode: 'On-site',
        chair: '—',
        committee: [],
        startTime: s.start_time ? new Date(s.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '09:00',
        minutesPerPaper: 15,
        breakMinutes: 0,
        queue: []
      };
    }
    roomsMap[roomKey].queue.push({
      paperId: s.paper_id,
      mode: 'onsite'
    });
  });

  rooms.value = Object.values(roomsMap);
};

watch(filterYear, () => {
  updateRoomsFromSchedules();
});

const isSaving = ref(false);
const saveAllSchedules = async () => {
  isSaving.value = true;
  try {
    // Flatten rooms to schedule rows
    const rows = [];
    rooms.value.forEach(room => {
      room.queue.forEach((item, index) => {
        const startOffset = index * (room.minutesPerPaper + room.breakMinutes);
        // Create a proper timestamp for today or conference date
        const [h, m] = room.startTime.split(':');
        const date = new Date('2026-10-17'); // Conference date
        date.setHours(parseInt(h), parseInt(m) + startOffset, 0, 0);
        
        const endDate = new Date(date);
        endDate.setMinutes(date.getMinutes() + room.minutesPerPaper);
        
        rows.push({
          room_name: room.name,
          paper_id: item.paperId,
          start_time: date.toISOString(),
          end_time: endDate.toISOString(),
          mode: 'onsite'
        });
      });
    });

    console.log('Attempting to save schedules:', rows);

    // Clear existing for THIS YEAR and insert new
    const paperIdsToClear = filteredPapers.value.map(p => p.id);
    if (paperIdsToClear.length > 0) {
      const { error: deleteError } = await supabase
        .from('schedules')
        .delete()
        .in('paper_id', paperIdsToClear);
      if (deleteError) throw deleteError;
    }

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from('schedules').insert(rows);
      if (insertError) throw insertError;
    }

    alert('✅ บันทึกตารางประกาศห้องเรียบร้อยแล้ว ข้อมูลจะซิงค์ไปยังแอปกรรมการและผู้แต่งทันที');
  } catch (err) {
    console.error('Save error:', err);
    alert('❌ เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
  } finally {
    isSaving.value = false;
  }
};

onMounted(loadData);

const searchLeft = ref('');
const draggedPaperId = ref(null);
const dragOverRoomId = ref(null);

const leftPapers = computed(() => {
  const q = searchLeft.value.trim().toLowerCase();
  const scheduledIds = new Set();
  for (const r of rooms.value) {
    for (const item of r.queue || []) scheduledIds.add(item.paperId);
  }

  return filteredPapers.value
    .filter((p) => p.decision === 'accepted' || p.decision === 'published')
    .filter((p) => !scheduledIds.has(p.id))
    .filter((p) => !q || p.title.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
});

const addRoomOpen = ref(false);
const newRoom = ref({
  name: '',
  track: 'คอมพิวเตอร์',
  dateLabel: '17 ต.ค. 69',
  eventMode: 'On-site',
  chair: '',
  committeeText: '',
  startTime: '09:00',
  minutesPerPaper: 15,
  breakMinutes: 0
});

const editRoomOpen = ref(false);
const editRoomId = ref(null);
const editRoomDraft = ref({
  name: '',
  track: '',
  dateLabel: '',
  eventMode: 'On-site',
  chair: '',
  committeeText: '',
  startTime: '09:00',
  minutesPerPaper: 15,
  breakMinutes: 0
});

const openAddRoom = () => {
  addRoomOpen.value = true;
};

const closeAddRoom = () => {
  addRoomOpen.value = false;
};

const openEditRoom = (room) => {
  if (!room) return;
  editRoomId.value = room.id;
  editRoomDraft.value = {
    name: room.name,
    track: room.track,
    dateLabel: room.dateLabel,
    eventMode: room.eventMode,
    chair: room.chair,
    committeeText: (room.committee || []).join(', '),
    startTime: room.startTime,
    minutesPerPaper: room.minutesPerPaper,
    breakMinutes: room.breakMinutes
  };
  editRoomOpen.value = true;
};

const closeEditRoom = () => {
  editRoomOpen.value = false;
  editRoomId.value = null;
};

const saveEditRoom = () => {
  const roomId = editRoomId.value;
  if (!roomId) return;
  const roomIdx = rooms.value.findIndex((r) => r.id === roomId);
  if (roomIdx === -1) return;

  const committee = editRoomDraft.value.committeeText
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

  rooms.value[roomIdx] = {
    ...rooms.value[roomIdx],
    name: editRoomDraft.value.name || rooms.value[roomIdx].name,
    track: editRoomDraft.value.track,
    dateLabel: editRoomDraft.value.dateLabel,
    eventMode: editRoomDraft.value.eventMode,
    chair: editRoomDraft.value.chair || '—',
    committee,
    startTime: editRoomDraft.value.startTime,
    minutesPerPaper: Number(editRoomDraft.value.minutesPerPaper) || 15,
    breakMinutes: Number(editRoomDraft.value.breakMinutes) || 0
  };
  closeEditRoom();
};

const deleteRoom = (roomId) => {
  const room = rooms.value.find((r) => r.id === roomId);
  const ok = window.confirm(`ลบห้อง: ${room?.name || roomId} ?`);
  if (!ok) return;
  rooms.value = rooms.value.filter((r) => r.id !== roomId);
  if (dragOverRoomId.value === roomId) dragOverRoomId.value = null;
  if (editRoomId.value === roomId) closeEditRoom();
};

const createRoom = () => {
  const nextId = `R-${rooms.value.length + 1}`;
  const committee = newRoom.value.committeeText
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

  rooms.value.push({
    id: nextId,
    name: newRoom.value.name || `ห้องประชุม ${rooms.value.length + 1}`,
    track: newRoom.value.track,
    dateLabel: newRoom.value.dateLabel,
    eventMode: newRoom.value.eventMode,
    chair: newRoom.value.chair || '—',
    committee,
    startTime: newRoom.value.startTime,
    minutesPerPaper: Number(newRoom.value.minutesPerPaper) || 15,
    breakMinutes: Number(newRoom.value.breakMinutes) || 0,
    queue: []
  });
  closeAddRoom();
};

const setPaperMode = (paperId, mode) => {
  const idx = papers.value.findIndex((p) => p.id === paperId);
  if (idx === -1) return;
  papers.value[idx] = {
    ...papers.value[idx],
    presentationMode: 'onsite'
  };
};

const assignToRoom = (roomId, paperId) => {
  const room = rooms.value.find((r) => r.id === roomId);
  if (!room) return;
  const paper = papers.value.find((p) => p.id === paperId);
  if (!paper) return;

  const roomIdx = rooms.value.findIndex((r) => r.id === roomId);
  if (roomIdx === -1) return;

  const current = Array.isArray(rooms.value[roomIdx].queue) ? rooms.value[roomIdx].queue : [];
  if (current.some((x) => x.paperId === paperId)) return;

  const nextQueue = [...current, { paperId, mode: paper.presentationMode }];
  rooms.value[roomIdx] = {
    ...rooms.value[roomIdx],
    queue: nextQueue
  };
};

const onDragStartPaper = (e, paperId) => {
  draggedPaperId.value = paperId;
  try {
    e.dataTransfer?.setData('text/plain', paperId);
    e.dataTransfer.dropEffect = 'move';
  } catch {
    // ignore
  }
};

const onDragEndPaper = () => {
  draggedPaperId.value = null;
  dragOverRoomId.value = null;
};

const onDragOverRoom = (e, roomId) => {
  e.preventDefault();
  dragOverRoomId.value = roomId;
  try {
    e.dataTransfer.dropEffect = 'move';
  } catch {
    // ignore
  }
};

const onDragLeaveRoom = (roomId) => {
  if (dragOverRoomId.value === roomId) dragOverRoomId.value = null;
};

const onDropOnRoom = (e, roomId) => {
  e.preventDefault();
  const paperId = draggedPaperId.value || e.dataTransfer?.getData('text/plain');
  if (paperId) assignToRoom(roomId, paperId);
  draggedPaperId.value = null;
  dragOverRoomId.value = null;
};

const removeFromRoom = (roomId, paperId) => {
  const roomIdx = rooms.value.findIndex((r) => r.id === roomId);
  if (roomIdx === -1) return;
  rooms.value[roomIdx] = {
    ...rooms.value[roomIdx],
    queue: (rooms.value[roomIdx].queue || []).filter((x) => x.paperId !== paperId)
  };
};

const minutesToTime = (startTime, minutesToAdd) => {
  const [h, m] = String(startTime || '09:00').split(':').map((x) => Number(x));
  const total = (Number.isFinite(h) ? h : 9) * 60 + (Number.isFinite(m) ? m : 0) + minutesToAdd;
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
};

const slotLabel = (room, index) => {
  const startOffset = index * (room.minutesPerPaper + room.breakMinutes);
  const start = minutesToTime(room.startTime, startOffset);
  const end = minutesToTime(room.startTime, startOffset + room.minutesPerPaper);
  return `${start}-${end}`;
};

const paperById = (paperId) => papers.value.find((p) => p.id === paperId) || null;
</script>

<template>
  <ClientOnly>
  <div class="p-8 pb-20 font-['Sarabun'] animate-fade-in">
    <div>
        <div class="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 class="text-2xl font-bold text-slate-800 mb-1">🗓️ จัดการตารางประกาศห้อง (Schedule Management)</h2>
            <p class="text-sm text-slate-500">ตารางนี้กำหนดให้เป็น On-site ทั้งหมด บทความฝั่งซ้ายจะแสดงเฉพาะสถานะ Accepted</p>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 h-10">
              <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Year:</span>
              <select v-model="filterYear" class="text-xs font-black text-slate-800 bg-transparent focus:outline-none border-none">
                <option value="all">All Years</option>
                <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
              </select>
            </div>
            <button type="button" class="h-10 px-6 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 inline-flex items-center gap-2 shadow-lg shadow-emerald-100 transition-all active:scale-95" @click="saveAllSchedules" :disabled="isSaving">
              <RefreshCw class="w-4 h-4" :class="isSaving ? 'animate-spin' : ''" />
              {{ isSaving ? 'กำลังบันทึก...' : 'บันทึกตารางทั้งหมด' }}
            </button>
            <button type="button" class="h-10 px-4 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 inline-flex items-center gap-2" @click="openAddRoom">
              <Plus class="w-4 h-4" />
              เพิ่มห้องประชุม
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section class="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div class="text-sm font-black text-slate-800">📥 บทความที่ยังไม่ได้จัดตาราง</div>
              <div class="text-[11px] font-bold text-slate-500">{{ leftPapers.length }} รายการ</div>
            </div>
            <div class="p-4 space-y-3">
              <div v-if="isLoading" class="p-10 flex flex-col items-center justify-center text-slate-400 gap-3">
                <RefreshCw class="w-8 h-8 animate-spin" />
                <div class="text-xs font-bold">กำลังโหลดข้อมูลบทความ...</div>
              </div>
              <div v-else-if="leftPapers.length === 0" class="p-6 text-center text-sm font-bold text-slate-500">ไม่มีบทความที่เข้าเงื่อนไข Accepted หรือถูกจัดตารางครบแล้ว</div>
              <div
                v-for="p in leftPapers"
                :key="p.id"
                class="rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition-colors"
                draggable="true"
                @dragstart="onDragStartPaper($event, p.id)"
                @dragend="onDragEndPaper"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="text-xs font-black text-slate-800 truncate">📄 {{ p.title }}</div>
                    <div class="text-[11px] font-semibold text-slate-500 mt-1">{{ p.code || p.id.slice(0,8) }} | หมวดหมู่: {{ p.track }}</div>
                  </div>
                </div>

                <div class="mt-3 flex items-center gap-2">
                  <div class="text-[11px] font-bold text-slate-500">รูปแบบ:</div>
                  <select
                    class="h-9 px-3 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-700 focus:outline-none"
                    :value="p.presentationMode"
                    @change="setPaperMode(p.id, $event.target.value)"
                  >
                    <option value="onsite">🏢 On-site</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section class="lg:col-span-8 space-y-4">
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div class="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                <div class="text-sm font-black text-slate-800">🏢 จัดการห้องประชุม</div>
                <div class="text-[11px] font-bold text-slate-500">ลากบทความมาวางบนการ์ดห้อง เพื่อเข้าคิวอัตโนมัติ</div>
              </div>

              <div class="p-4">
                <div v-if="rooms.length === 0" class="p-6 text-center text-sm font-bold text-slate-500">ยังไม่มีห้องประชุม (กด “เพิ่มห้องประชุม”)</div>

                <div v-else class="space-y-4 max-h-[calc(100vh-260px)] overflow-y-auto pr-1 custom-scrollbar">
                  <div
                    v-for="room in rooms"
                    :key="room.id"
                    class="rounded-2xl border bg-white shadow-sm overflow-hidden"
                    :class="dragOverRoomId === room.id ? 'border-indigo-400 ring-2 ring-indigo-500/20' : 'border-slate-200'"
                    @dragover="onDragOverRoom($event, room.id)"
                    @dragleave="onDragLeaveRoom(room.id)"
                    @drop="onDropOnRoom($event, room.id)"
                  >
                    <div class="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-4">
                      <div>
                        <div class="text-lg font-black text-slate-800">🚪 {{ room.name }}</div>
                        <div class="text-[11px] font-semibold text-slate-500 mt-1">
                          หมวดหมู่: {{ room.track }} | วันที่: {{ room.dateLabel }} ({{ room.eventMode }})
                        </div>
                        <div class="text-[11px] font-semibold text-slate-500 mt-1">ประธาน: {{ room.chair }}</div>
                        <div class="text-[11px] font-semibold text-slate-500 mt-1">
                          กรรมการ:
                          <span v-if="(room.committee || []).length === 0">—</span>
                          <span v-else>{{ room.committee.join(', ') }}</span>
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="flex items-center justify-end gap-2 mb-2">
                          <button type="button" class="h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center justify-center" @click="openEditRoom(room)">
                            <Pencil class="w-4 h-4 text-slate-700" />
                          </button>
                          <button type="button" class="h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center justify-center" @click="deleteRoom(room.id)">
                            <Trash2 class="w-4 h-4 text-rose-600" />
                          </button>
                        </div>
                        <div class="text-[11px] font-black text-slate-700">Smart Auto-Time</div>
                        <div class="text-[11px] font-semibold text-slate-500 mt-1">เริ่ม: {{ room.startTime }}</div>
                        <div class="text-[11px] font-semibold text-slate-500 mt-1">ต่อบทความ: {{ room.minutesPerPaper }} นาที</div>
                        <div class="text-[11px] font-semibold text-slate-500 mt-1">พัก: {{ room.breakMinutes }} นาที</div>
                      </div>
                    </div>

                    <div class="p-5 overflow-x-auto">
                      <table class="min-w-full">
                        <thead class="bg-slate-50">
                          <tr class="text-[11px] font-black text-slate-700">
                            <th class="px-4 py-3 text-left w-16">คิว</th>
                            <th class="px-4 py-3 text-left w-24">รหัส</th>
                            <th class="px-4 py-3 text-left">ชื่อเรื่อง</th>
                            <th class="px-4 py-3 text-left w-32">เวลา</th>
                            <th class="px-4 py-3 text-left w-28">รูปแบบ</th>
                            <th class="px-4 py-3 text-right w-24">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                          <tr v-for="(item, idx) in room.queue" :key="item.paperId" class="bg-white">
                            <td class="px-4 py-3 text-xs font-black text-slate-800">{{ idx + 1 }}</td>
                            <td class="px-4 py-3 text-xs font-black text-slate-800">{{ paperById(item.paperId)?.code || item.paperId.slice(0,8) }}</td>
                            <td class="px-4 py-3">
                              <div class="text-xs font-black text-slate-800">{{ paperById(item.paperId)?.title || '—' }}</div>
                              <div class="text-[11px] font-semibold text-slate-500 mt-0.5">{{ paperById(item.paperId)?.track || '' }}</div>
                            </td>
                            <td class="px-4 py-3 text-xs font-black text-slate-800">{{ slotLabel(room, idx) }}</td>
                            <td class="px-4 py-3 text-xs font-black text-slate-700">
                              <span v-if="item.mode === 'online'">💻 Online</span>
                              <span v-else>🏢 On-site</span>
                            </td>
                            <td class="px-4 py-3 text-right">
                              <button type="button" class="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-black text-slate-700" @click="removeFromRoom(room.id, item.paperId)">
                                ลบ
                              </button>
                            </td>
                          </tr>
                          <tr v-if="room.queue.length === 0" class="bg-white">
                            <td colspan="6" class="px-6 py-10 text-center text-sm font-bold text-slate-500">ลากบทความมาวางบนการ์ดห้องนี้ หรือกด + ฝั่งซ้าย</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
  </div>

    <!-- ADD ROOM MODAL (Premium Overhaul) -->
    <Teleport to="body">
      <div v-if="addRoomOpen" class="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/80 backdrop-blur-md" @click="closeAddRoom"></div>
        <div class="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-300" @click.stop>
          
          <!-- Modal Header -->
          <div class="px-10 py-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
            <div class="flex items-center gap-5">
              <div class="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Plus class="w-7 h-7" />
              </div>
              <div>
                <h3 class="text-2xl font-black text-slate-800">เพิ่มห้องประชุมใหม่</h3>
                <div class="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-[0.2em] flex items-center gap-2">
                  <CalendarDays class="w-3.5 h-3.5 text-indigo-400" />
                  CREATE PRESENTATION ROOM
                </div>
              </div>
            </div>
            <button @click="closeAddRoom" class="w-12 h-12 rounded-full hover:bg-slate-100 flex items-center justify-center transition-all group">
              <X class="w-6 h-6 text-slate-400 group-hover:text-slate-600 group-hover:rotate-90 transition-all duration-300" />
            </button>
          </div>

          <!-- Modal Body (Scrollable Content) -->
          <div class="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar bg-slate-50/30">
            <!-- Basic Info Section -->
            <div class="space-y-6">
              <div class="space-y-2">
                <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อห้องประชุม (Room Name)</label>
                <input v-model="newRoom.name" type="text" class="w-full h-14 px-6 rounded-2xl border border-slate-200 bg-white text-base font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all placeholder:text-slate-300" placeholder="ระบุชื่อห้อง เช่น Room 101" />
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-2">
                  <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">หมวดหมู่ (Track)</label>
                  <input v-model="newRoom.track" type="text" class="w-full h-14 px-6 rounded-2xl border border-slate-200 bg-white text-base font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all" />
                </div>
                <div class="space-y-2">
                  <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">วันที่ (Date)</label>
                  <input v-model="newRoom.dateLabel" type="text" class="w-full h-14 px-6 rounded-2xl border border-slate-200 bg-white text-base font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all" />
                </div>
              </div>
            </div>

            <!-- Time Config Section -->
            <div class="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                <h4 class="text-xs font-black text-slate-800 uppercase tracking-widest">การกำหนดเวลาอัจฉริยะ (Smart Timing)</h4>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-2">
                  <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">รูปแบบ</label>
                  <select v-model="newRoom.eventMode" class="w-full h-14 px-6 rounded-2xl border border-slate-200 bg-white text-base font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all">
                    <option value="On-site">On-site Only</option>
                  </select>
                </div>
                <div class="space-y-2">
                  <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">เวลาเริ่ม (Start Time)</label>
                  <input v-model="newRoom.startTime" type="time" class="w-full h-14 px-6 rounded-2xl border border-slate-200 bg-white text-base font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all" />
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-2">
                  <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">นาทีต่อบทความ</label>
                  <input v-model="newRoom.minutesPerPaper" type="number" class="w-full h-14 px-6 rounded-2xl border border-slate-200 bg-white text-base font-bold text-slate-800 focus:outline-none" />
                </div>
                <div class="space-y-2">
                  <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">เวลาพักระหว่างคิว</label>
                  <input v-model="newRoom.breakMinutes" type="number" class="w-full h-14 px-6 rounded-2xl border border-slate-200 bg-white text-base font-bold text-slate-800 focus:outline-none" />
                </div>
              </div>
            </div>

            <!-- Committee Section -->
            <div class="space-y-6">
              <div class="space-y-2">
                <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ประธานห้องประชุม (Session Chair)</label>
                <input v-model="newRoom.chair" type="text" class="w-full h-14 px-6 rounded-2xl border border-slate-200 bg-white text-base font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all" placeholder="ระบุชื่อประธาน" />
              </div>

              <div class="space-y-2">
                <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">คณะกรรมการ (Committee - คั่นด้วยคอมม่า)</label>
                <textarea v-model="newRoom.committeeText" rows="2" class="w-full p-6 rounded-2xl border border-slate-200 bg-white text-base font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all resize-none" placeholder="ดร.สมบัติ, ผศ.ดร.วิชาการ"></textarea>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="px-10 py-8 border-t border-slate-100 bg-white flex items-center justify-end gap-4 shrink-0">
            <button @click="closeAddRoom" class="h-14 px-10 rounded-2xl bg-slate-50 text-slate-500 text-sm font-black hover:bg-slate-100 transition-colors">
              ยกเลิก
            </button>
            <button @click="createRoom" class="h-14 px-12 rounded-2xl bg-indigo-600 text-white text-sm font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95">
              สร้างห้องประชุม
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- EDIT ROOM MODAL (Premium Overhaul) -->
    <Teleport to="body">
      <div v-if="editRoomOpen" class="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/80 backdrop-blur-md" @click="closeEditRoom"></div>
        <div class="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-300" @click.stop>
          
          <!-- Modal Header -->
          <div class="px-10 py-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
            <div class="flex items-center gap-5">
              <div class="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Pencil class="w-7 h-7" />
              </div>
              <div>
                <h3 class="text-2xl font-black text-slate-800">แก้ไขรายละเอียดห้อง</h3>
                <div class="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-[0.2em] flex items-center gap-2">
                  <CalendarDays class="w-3.5 h-3.5 text-amber-400" />
                  ADJUST ROOM & SMART AUTO-TIME
                </div>
              </div>
            </div>
            <button @click="closeEditRoom" class="w-12 h-12 rounded-full hover:bg-slate-100 flex items-center justify-center transition-all group">
              <X class="w-6 h-6 text-slate-400 group-hover:text-slate-600 group-hover:rotate-90 transition-all duration-300" />
            </button>
          </div>

          <!-- Modal Body (Scrollable Content) -->
          <div class="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar bg-slate-50/30">
            <div class="space-y-6">
              <div class="space-y-2">
                <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อห้องประชุม (Room Name)</label>
                <input v-model="editRoomDraft.name" type="text" class="w-full h-14 px-6 rounded-2xl border border-slate-200 bg-white text-base font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all" />
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-2">
                  <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">หมวดหมู่ (Track)</label>
                  <input v-model="editRoomDraft.track" type="text" class="w-full h-14 px-6 rounded-2xl border border-slate-200 bg-white text-base font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all" />
                </div>
                <div class="space-y-2">
                  <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">วันที่ (Date)</label>
                  <input v-model="editRoomDraft.dateLabel" type="text" class="w-full h-14 px-6 rounded-2xl border border-slate-200 bg-white text-base font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all" />
                </div>
              </div>
            </div>

            <div class="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-1.5 h-4 bg-amber-500 rounded-full"></div>
                <h4 class="text-xs font-black text-slate-800 uppercase tracking-widest">การกำหนดเวลาอัจฉริยะ (Smart Timing)</h4>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-2">
                  <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">รูปแบบ</label>
                  <select v-model="editRoomDraft.eventMode" class="w-full h-14 px-6 rounded-2xl border border-slate-200 bg-white text-base font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all">
                    <option value="On-site">🏢 On-site Only</option>
                  </select>
                </div>
                <div class="space-y-2">
                  <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">เวลาเริ่ม (Start Time)</label>
                  <input v-model="editRoomDraft.startTime" type="time" class="w-full h-14 px-6 rounded-2xl border border-slate-200 bg-white text-base font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all" />
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-2">
                  <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">นาทีต่อบทความ</label>
                  <input v-model="editRoomDraft.minutesPerPaper" type="number" class="w-full h-14 px-6 rounded-2xl border border-slate-200 bg-white text-base font-bold text-slate-800 focus:outline-none" />
                </div>
                <div class="space-y-2">
                  <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">เวลาพักระหว่างคิว</label>
                  <input v-model="editRoomDraft.breakMinutes" type="number" class="w-full h-14 px-6 rounded-2xl border border-slate-200 bg-white text-base font-bold text-slate-800 focus:outline-none" />
                </div>
              </div>
            </div>

            <div class="space-y-6">
              <div class="space-y-2">
                <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ประธานห้องประชุม (Session Chair)</label>
                <input v-model="editRoomDraft.chair" type="text" class="w-full h-14 px-6 rounded-2xl border border-slate-200 bg-white text-base font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all" />
              </div>

              <div class="space-y-2">
                <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">คณะกรรมการ (Committee - คั่นด้วยคอมม่า)</label>
                <textarea v-model="editRoomDraft.committeeText" rows="2" class="w-full p-6 rounded-2xl border border-slate-200 bg-white text-base font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all resize-none"></textarea>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="px-10 py-8 border-t border-slate-100 bg-white flex items-center justify-end gap-4 shrink-0">
            <button @click="closeEditRoom" class="h-14 px-10 rounded-2xl bg-slate-50 text-slate-500 text-sm font-black hover:bg-slate-100 transition-colors">
              ยกเลิก
            </button>
            <button @click="saveEditRoom" class="h-14 px-12 rounded-2xl bg-amber-600 text-white text-sm font-black hover:bg-amber-700 shadow-xl shadow-amber-100 transition-all active:scale-95">
              บันทึกการแก้ไข
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
  </ClientOnly>
</template>
