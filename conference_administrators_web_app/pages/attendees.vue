<script setup>
definePageMeta({ middleware: 'auth', layout: 'admin' });
import { computed, ref, watch } from 'vue';
import {
  BarChart3,
  CalendarDays,
  Calendar,
  ChevronDown,
  Download,
  Eye,
  FileText,
  Filter,
  LayoutDashboard,
  LogOut,
  Mail,
  MoreVertical,
  Pencil,
  Search,
  Send,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
  UserCheck,
  UserX,
  X,
  Zap
} from 'lucide-vue-next';



const attendees = useState('attendees', () => []);

const papers = useState('papers', () => []);

const resolvePaperTitle = (paperId, fallbackTitle) => {
  if (!paperId) return fallbackTitle || null;
  const p = (papers.value || []).find((x) => x?.id === paperId);
  return p?.title || fallbackTitle || null;
};

const query = ref('');
const filterType = ref('all');
const filterTrack = ref('all');

const trackOptions = computed(() => {
  const set = new Set(attendees.value.map((a) => a.track).filter(Boolean));
  return [...set];
});

const filteredAttendees = computed(() => {
  const q = query.value.trim().toLowerCase();
  return attendees.value.filter((a) => {
    const matchesQuery =
      !q ||
      a.id.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      (a.paperId || '').toLowerCase().includes(q);

    const matchesType = filterType.value === 'all' || a.type === filterType.value;
    const matchesTrack = filterTrack.value === 'all' || a.track === filterTrack.value;

    return matchesQuery && matchesType && matchesTrack;
  });
});

const stats = computed(() => {
  const all = attendees.value.length;
  const presenters = attendees.value.filter((a) => a.type === 'ผู้นำเสนอ').length;
  const listeners = attendees.value.filter((a) => a.type === 'ผู้เข้าฟัง').length;
  const committee = attendees.value.filter((a) => a.type === 'กรรมการ/ผู้จัดงาน').length;
  return { all, presenters, listeners, committee };
});

const selectedIds = ref(new Set());

const isSelected = (id) => selectedIds.value.has(id);

const toggleSelected = (id) => {
  const next = new Set(selectedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selectedIds.value = next;
};

const clearSelected = () => {
  selectedIds.value = new Set();
};

const toggleSelectAllFiltered = () => {
  const allIds = filteredAttendees.value.map((a) => a.id);
  const allSelected = allIds.every((id) => selectedIds.value.has(id));
  const next = new Set(selectedIds.value);

  if (allSelected) {
    allIds.forEach((id) => next.delete(id));
  } else {
    allIds.forEach((id) => next.add(id));
  }

  selectedIds.value = next;
};

const selectedCount = computed(() => selectedIds.value.size);

const openMenuId = ref(null);
const toggleRowMenu = (id) => {
  openMenuId.value = openMenuId.value === id ? null : id;
};
const closeRowMenu = () => {
  openMenuId.value = null;
};

const exportModalOpen = ref(false);
const exportScope = ref('filtered');

const openExportModal = () => {
  exportModalOpen.value = true;
  exportScope.value = selectedCount.value > 0 ? 'selected' : 'filtered';
};

const closeExportModal = () => {
  exportModalOpen.value = false;
};

const toCsv = (rows) => {
  const headers = ['id', 'name', 'email', 'phone', 'type', 'track', 'paperId', 'paperTitle', 'submittedAt'];
  const escape = (v) => {
    const s = String(v ?? '');
    if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
    return s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map((h) => escape(r[h])).join(','));
  }
  return lines.join('\n');
};

const downloadCsv = (filename, content) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const exportCsv = () => {
  let rows = [];
  if (exportScope.value === 'all') rows = attendees.value;
  if (exportScope.value === 'filtered') rows = filteredAttendees.value;
  if (exportScope.value === 'selected') rows = attendees.value.filter((a) => selectedIds.value.has(a.id));

  downloadCsv('attendees.csv', toCsv(rows));
  exportModalOpen.value = false;
};

const emailModalOpen = ref(false);
const emailSubject = ref('');
const emailBody = ref('สวัสดีคุณ {{name}}\n\nขอความกรุณาตรวจสอบกำหนดการ/ข้อมูลการเข้าร่วมประชุมของท่าน\n\nขอบคุณครับ');

const openEmailModal = () => {
  emailModalOpen.value = true;
  closeRowMenu();
};

const openEmailModalFor = (id) => {
  selectedIds.value = new Set([id]);
  emailModalOpen.value = true;
  closeRowMenu();
};

const closeEmailModal = () => {
  emailModalOpen.value = false;
};

const selectedRecipients = computed(() => attendees.value.filter((a) => selectedIds.value.has(a.id)));

const previewRecipient = computed(() => selectedRecipients.value[0] || null);

const renderTemplate = (tmpl, attendee) => {
  return tmpl.replaceAll('{{name}}', attendee?.name || '');
};

const emailPreviewBody = computed(() => {
  return renderTemplate(emailBody.value, previewRecipient.value);
});

const recipientEmail = ref('');
const recipientEmailError = ref('');

const addRecipientByEmail = () => {
  const email = recipientEmail.value.trim().toLowerCase();
  if (!email) return;
  const found = attendees.value.find((a) => String(a.email || '').trim().toLowerCase() === email);
  if (!found) {
    recipientEmailError.value = 'ไม่พบอีเมลนี้ในระบบ';
    return;
  }
  recipientEmailError.value = '';
  if (!selectedIds.value.has(found.id)) toggleSelected(found.id);
  recipientEmail.value = '';
};

const addModalOpen = ref(false);
const addDraft = ref({
  name: '',
  email: '',
  phone: '',
  type: 'ผู้เข้าฟัง',
  track: '',
  paperId: '',
  paperTitle: ''
});

const openAddModal = () => {
  addDraft.value = {
    name: '',
    email: '',
    phone: '',
    type: 'ผู้เข้าฟัง',
    track: '',
    paperId: '',
    paperTitle: ''
  };
  addModalOpen.value = true;
};

watch(
  () => addDraft.value.paperId,
  (next) => {
    const paperId = String(next || '').trim();
    if (!paperId) return;
    const title = resolvePaperTitle(paperId, null);
    if (title) addDraft.value.paperTitle = title;
  }
);

const closeAddModal = () => {
  addModalOpen.value = false;
};

const nextAttendeeId = computed(() => {
  const nums = attendees.value
    .map((a) => String(a.id || ''))
    .map((s) => (s.startsWith('A') ? Number(s.slice(1)) : NaN))
    .filter((n) => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `A${String(max + 1).padStart(3, '0')}`;
});

const saveAdd = () => {
  const name = addDraft.value.name.trim();
  const email = addDraft.value.email.trim();
  if (!name || !email) return;
  const paperId = addDraft.value.paperId.trim();
  const resolvedTitle = resolvePaperTitle(paperId || null, addDraft.value.paperTitle.trim() || null);
  attendees.value.push({
    id: nextAttendeeId.value,
    name,
    email,
    phone: addDraft.value.phone.trim(),
    type: addDraft.value.type,
    track: addDraft.value.track.trim() || null,
    paperId: paperId || null,
    paperTitle: resolvedTitle,
    submittedAt: new Date().toISOString().slice(0, 10)
  });
  addModalOpen.value = false;
};

const detailModalOpen = ref(false);
const editModalOpen = ref(false);
const targetId = ref(null);

const targetAttendee = computed(() => attendees.value.find((a) => a.id === targetId.value) || null);

const editDraft = ref({ name: '', email: '', phone: '', type: '', track: '', paperId: '', paperTitle: '' });

const openDetailModal = (id) => {
  targetId.value = id;
  detailModalOpen.value = true;
  closeRowMenu();
};

const closeDetailModal = () => {
  detailModalOpen.value = false;
};

const openEditModal = (id) => {
  targetId.value = id;
  const t = attendees.value.find((a) => a.id === id);
  editDraft.value = {
    name: t?.name || '',
    email: t?.email || '',
    phone: t?.phone || '',
    type: t?.type || '',
    track: t?.track || '',
    paperId: t?.paperId || '',
    paperTitle: t?.paperTitle || ''
  };
  editModalOpen.value = true;
  closeRowMenu();
};

watch(
  () => editDraft.value.paperId,
  (next) => {
    const paperId = String(next || '').trim();
    if (!paperId) return;
    const title = resolvePaperTitle(paperId, null);
    if (title) editDraft.value.paperTitle = title;
  }
);

const closeEditModal = () => {
  editModalOpen.value = false;
};

const saveEdit = () => {
  const t = targetAttendee.value;
  if (!t) return;
  const paperId = editDraft.value.paperId.trim();
  const resolvedTitle = resolvePaperTitle(paperId || null, editDraft.value.paperTitle.trim() || null);
  t.name = editDraft.value.name;
  t.email = editDraft.value.email;
  t.phone = editDraft.value.phone;
  t.type = editDraft.value.type;
  t.track = editDraft.value.track || null;
  t.paperId = paperId || null;
  t.paperTitle = resolvedTitle;
  editModalOpen.value = false;
};

const docModalOpen = ref(false);
const targetDocs = ref([]);
const isUploadingDoc = ref(false);
const docDraft = ref({ title_th: '', title_en: '', type: 'receipt', file: null });

const openDocModal = async (id) => {
  targetId.value = id;
  docModalOpen.value = true;
  closeRowMenu();
  await fetchTargetDocs();
};

const fetchTargetDocs = async () => {
  if (!targetAttendee.value) return;
  const { data, error } = await supabase.from('user_documents').select('*').eq('user_id', targetAttendee.value.user_id || targetId.value).order('created_at', { ascending: false });
  if (!error) targetDocs.value = data || [];
};

const handleDocFile = (e) => {
  docDraft.value.file = e.target.files[0];
};

const uploadDoc = async () => {
  if (!docDraft.value.file || !targetAttendee.value) return;
  isUploadingDoc.value = true;
  try {
    const file = docDraft.value.file;
    const fileExt = file.name.split('.').pop();
    const fileName = `${targetId.value}_${docDraft.value.type}_${Date.now()}.${fileExt}`;
    const filePath = `official_docs/${targetId.value}/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('certificates').upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('certificates').getPublicUrl(filePath);

    const { error: dbError } = await supabase.from('user_documents').insert({
      user_id: targetAttendee.value.user_id || targetId.value,
      title_th: docDraft.value.title_th || docDraft.value.type,
      title_en: docDraft.value.title_en || docDraft.value.type,
      file_url: publicUrl,
      document_type: docDraft.value.type
    });

    if (dbError) throw dbError;

    alert('อัปโหลดและส่งเอกสารเรียบร้อยแล้ว');
    docDraft.value = { title_th: '', title_en: '', type: 'receipt', file: null };
    await fetchTargetDocs();
  } catch (e) {
    alert('เกิดข้อผิดพลาด: ' + e.message);
  } finally {
    isUploadingDoc.value = false;
  }
};

const deleteDoc = async (docId) => {
  if (!confirm('ต้องการลบเอกสารนี้ใช่หรือไม่?')) return;
  const { error } = await supabase.from('user_documents').delete().eq('id', docId);
  if (!error) await fetchTargetDocs();
};

const closeDocModal = () => {
  docModalOpen.value = false;
};

</script>

<template>
<div class="p-8 pb-20 font-['Sarabun','Lato'] animate-fade-in" @click="closeRowMenu">

  <div class="mb-8 flex justify-between items-end">
    <div>
      <h2 class="text-2xl font-bold text-slate-800 mb-1">รายชื่อผู้เข้าร่วมการประชุม</h2>
      <p class="text-sm text-slate-500">Registration Desk: จัดการรายชื่อผู้เข้าร่วมและการสื่อสารแบบกลุ่ม</p>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
    <div class="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-3xl font-black text-slate-800 tabular-nums">{{ stats.all }}</div>
          <div class="text-[11px] font-semibold text-slate-500 mt-1">ผู้เข้าร่วมทั้งหมด</div>
        </div>
        <div class="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center">
          <Users class="w-5 h-5 text-slate-600" />
        </div>
      </div>
    </div>
    <div class="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-3xl font-black text-slate-800 tabular-nums">{{ stats.presenters }}</div>
          <div class="text-[11px] font-semibold text-slate-500 mt-1">ผู้นำเสนอผลงาน</div>
        </div>
        <div class="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center">
          <FileText class="w-5 h-5 text-indigo-700" />
        </div>
      </div>
    </div>
    <div class="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-3xl font-black text-slate-800 tabular-nums">{{ stats.listeners }}</div>
          <div class="text-[11px] font-semibold text-slate-500 mt-1">ผู้เข้าร่วมฟังปกติ</div>
        </div>
        <div class="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center">
          <Users class="w-5 h-5 text-slate-600" />
        </div>
      </div>
    </div>
    <div class="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-3xl font-black text-slate-800 tabular-nums">{{ stats.committee }}</div>
          <div class="text-[11px] font-semibold text-slate-500 mt-1">กรรมการ/ผู้จัดงาน</div>
        </div>
        <div class="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
          <UserCheck class="w-5 h-5 text-emerald-700" />
        </div>
      </div>
    </div>
  </div>

  <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
    <div class="bg-slate-50 rounded-2xl p-4 border border-slate-200">
      <div class="flex flex-col lg:flex-row gap-2 lg:items-center">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            v-model="query"
            type="text"
            placeholder="ค้นหา ชื่อ/อีเมล/รหัส/บทความ"
            class="w-full h-10 pl-9 pr-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-3 gap-2 w-full lg:w-auto">
          <div class="relative">
            <Filter class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select
              v-model="filterType"
              class="w-full lg:w-48 h-10 pl-9 pr-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">กรองตามประเภท</option>
              <option value="ผู้นำเสนอ">ผู้นำเสนอ</option>
              <option value="ผู้เข้าฟัง">ผู้เข้าฟัง</option>
              <option value="กรรมการ/ผู้จัดงาน">กรรมการ/ผู้จัดงาน</option>
            </select>
          </div>

          <select
            v-model="filterTrack"
            class="w-full lg:w-48 h-10 px-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="all">กรองตามกลุ่มบทความ (Track)</option>
            <option v-for="t in trackOptions" :key="t" :value="t">{{ t }}</option>
          </select>

          <button
            type="button"
            class="h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 text-xs font-black"
            @click="toggleSelectAllFiltered"
          >
            เลือกทั้งหมด (ตามฟิลเตอร์)
          </button>
        </div>
      </div>

      <div class="mt-3 flex flex-col lg:flex-row lg:items-center justify-between gap-2">
        <div class="text-xs font-semibold text-slate-600">
          เลือกแล้ว: <span class="font-black text-slate-800 tabular-nums">{{ selectedCount }}</span>
          <button v-if="selectedCount" type="button" class="ml-2 text-indigo-600 font-black" @click="clearSelected">ล้าง</button>
        </div>

        <div class="flex items-center gap-2 justify-end">
          <button
            type="button"
            class="h-10 px-4 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
            :disabled="selectedCount === 0"
            :class="selectedCount === 0 ? 'opacity-50 cursor-not-allowed' : ''"
            @click="openEmailModal"
          >
            <Mail class="w-4 h-4" />
            ส่งอีเมล (Bulk)
          </button>
          <button
            type="button"
            class="h-10 px-4 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
            @click="openExportModal"
          >
            <Download class="w-4 h-4" />
            Export
          </button>
          <button
            type="button"
            class="h-10 px-4 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 inline-flex items-center gap-2"
            @click="openAddModal"
          >
            <UserPlus class="w-4 h-4" />
            Add
          </button>
        </div>
      </div>
    </div>

    <div class="mt-4 bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead class="bg-slate-50">
            <tr class="text-[11px] font-black text-slate-700">
              <th class="w-10 px-4 py-3 text-left"> </th>
              <th class="px-4 py-3 text-left">รหัส</th>
              <th class="px-4 py-3 text-left">ชื่อ-นามสกุล</th>
              <th class="px-4 py-3 text-left">ประเภท</th>
              <th class="px-4 py-3 text-left">บทความที่เกี่ยวข้อง</th>
              <th class="px-4 py-3 text-right">การดำเนินการ</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100">
            <tr v-for="a in filteredAttendees" :key="a.id" class="bg-white">
              <td class="px-4 py-3">
                <input
                  type="checkbox"
                  class="w-4 h-4 rounded border-slate-300"
                  :checked="isSelected(a.id)"
                  @change="toggleSelected(a.id)"
                />
              </td>
              <td class="px-4 py-3 text-xs font-black text-slate-800">{{ a.id }}</td>
              <td class="px-4 py-3">
                <div class="text-xs font-bold text-slate-800">{{ a.name }}</div>
                <div class="text-[10px] text-slate-500 mt-0.5">{{ a.email }}</div>
              </td>
              <td class="px-4 py-3 text-xs font-bold text-slate-700">{{ a.type }}</td>
              <td class="px-4 py-3">
                <div class="text-xs font-bold text-slate-800">{{ a.paperId || '-' }}</div>
                <div class="text-[10px] text-slate-500 mt-0.5 truncate max-w-[320px]">{{ resolvePaperTitle(a.paperId, a.paperTitle) || '-' }}</div>
              </td>
              <td class="px-4 py-3 text-right relative" @click.stop>
                <button
                  type="button"
                  class="h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center justify-center"
                  @click="toggleRowMenu(a.id)"
                >
                  <MoreVertical class="w-4 h-4 text-slate-600" />
                </button>

                <div
                  v-if="openMenuId === a.id"
                  class="absolute right-4 top-12 w-64 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden z-30"
                >
                  <div class="px-4 py-2 text-[10px] font-black text-slate-500 bg-slate-50">คำสั่งจัดการ</div>
                  <button type="button" class="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2" @click="openDetailModal(a.id)">
                    <Eye class="w-4 h-4 text-slate-500" />
                    ดูรายละเอียด
                  </button>
                  <button
                    type="button"
                    class="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    @click="openEditModal(a.id)"
                  >
                    <Pencil class="w-4 h-4 text-slate-500" />
                    แก้ไขข้อมูล
                  </button>
                  <button type="button" class="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2" @click="openDocModal(a.id)">
                    <FileText class="w-4 h-4 text-indigo-500" />
                    จัดการเอกสารสำคัญ
                  </button>
                  <button type="button" class="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2" @click="openEmailModalFor(a.id)">
                    <Send class="w-4 h-4 text-slate-500" />
                    ส่งอีเมล
                  </button>
                  <button type="button" class="w-full px-4 py-2 text-left text-xs font-bold text-rose-700 hover:bg-rose-50 flex items-center gap-2" @click="deleteAttendee(a.id)">
                    <UserX class="w-4 h-4 text-rose-600" />
                    ลบรายชื่อ
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="filteredAttendees.length === 0" class="bg-white">
              <td colspan="6" class="px-6 py-10 text-center text-sm font-bold text-slate-500">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between px-5 py-4 bg-slate-50/60">
        <div class="text-xs font-semibold text-slate-600">แสดง {{ filteredAttendees.length }} รายการ</div>
        <div class="flex items-center gap-2">
          <button type="button" class="h-9 px-4 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100">ก่อนหน้า</button>
          <button type="button" class="h-9 px-4 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100">ถัดไป</button>
        </div>
      </div>
    </div>
  </div>
</div>

<div v-if="exportModalOpen" class="fixed inset-0 z-50">
  <div class="absolute inset-0 bg-black/40" @click="closeExportModal"></div>
  <div class="absolute inset-0 flex items-center justify-center p-4">
    <div class="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden" @click.stop>
      <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <div class="text-sm font-black text-slate-800">Export to CSV</div>
          <div class="text-[11px] text-slate-500 font-semibold mt-0.5">เลือกรูปแบบการดาวน์โหลด</div>
        </div>
        <button type="button" class="h-10 w-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center justify-center" @click="closeExportModal">
          <X class="w-4 h-4 text-slate-600" />
        </button>
      </div>

      <div class="p-6 space-y-4">
        <label class="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 bg-white cursor-pointer">
          <input type="radio" value="all" v-model="exportScope" class="mt-1" />
          <div>
            <div class="text-xs font-black text-slate-800">ทั้งหมด</div>
            <div class="text-[11px] text-slate-500 font-semibold mt-0.5">ดาวน์โหลดข้อมูลผู้เข้าร่วมทั้งหมด</div>
          </div>
        </label>

        <label class="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 bg-white cursor-pointer">
          <input type="radio" value="filtered" v-model="exportScope" class="mt-1" />
          <div>
            <div class="text-xs font-black text-slate-800">ตามฟิลเตอร์</div>
            <div class="text-[11px] text-slate-500 font-semibold mt-0.5">ดาวน์โหลดข้อมูลเฉพาะที่กำลังกรองอยู่</div>
          </div>
        </label>

        <label
          class="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 bg-white cursor-pointer"
          :class="selectedCount === 0 ? 'opacity-50 cursor-not-allowed' : ''"
        >
          <input type="radio" value="selected" v-model="exportScope" class="mt-1" :disabled="selectedCount === 0" />
          <div>
            <div class="text-xs font-black text-slate-800">เฉพาะที่เลือก</div>
            <div class="text-[11px] text-slate-500 font-semibold mt-0.5">ดาวน์โหลดเฉพาะรายการที่ติ๊ก checkbox</div>
          </div>
        </label>

        <div class="pt-2 flex items-center justify-end gap-2">
          <button type="button" class="h-10 px-4 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-700 hover:bg-slate-50" @click="closeExportModal">ยกเลิก</button>
          <button type="button" class="h-10 px-4 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800" @click="exportCsv">ดาวน์โหลด</button>
        </div>
      </div>
    </div>
  </div>
</div>

<div v-if="emailModalOpen" class="fixed inset-0 z-50">
  <div class="absolute inset-0 bg-black/40" @click="closeEmailModal"></div>
  <div class="absolute inset-0 flex items-center justify-center p-4">
    <div class="w-full max-w-3xl max-h-[calc(100vh-2rem)] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col" @click.stop>
      <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div>
          <div class="text-sm font-black text-slate-800">ส่งอีเมล (Bulk Email)</div>
          <div class="text-[11px] text-slate-500 font-semibold mt-0.5">รองรับตัวแปร: <span class="font-black">{{name}}</span></div>
        </div>
        <button type="button" class="h-10 w-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center justify-center" @click="closeEmailModal">
          <X class="w-4 h-4 text-slate-600" />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-0">
          <div class="p-6 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50">
            <div class="text-xs font-black text-slate-700 mb-2">ผู้รับ</div>
            <div class="text-[11px] text-slate-500 font-semibold">เลือกแล้ว {{ selectedCount }} คน</div>

            <div class="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div class="text-[11px] font-black text-slate-600 mb-1">เพิ่มผู้รับด้วยอีเมล</div>
              <div class="flex items-center gap-2">
                  <div class="text-[11px] font-black text-slate-600 mb-1">เพิ่มผู้รับด้วยอีเมล</div>
                  <div class="flex items-center gap-2">
                    <input
                      v-model="recipientEmail"
                      type="email"
                      placeholder="name@example.com"
                      class="flex-1 h-10 px-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none"
                      @keydown.enter.prevent="addRecipientByEmail"
                    />
                    <button type="button" class="h-10 px-4 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800" @click="addRecipientByEmail">
                      + เพิ่ม
                    </button>
                  </div>
                  <div v-if="recipientEmailError" class="mt-2 text-[11px] font-bold text-rose-600">{{ recipientEmailError }}</div>
                  <div v-else class="mt-2 text-[11px] font-semibold text-slate-400">ระบบจะเพิ่มให้ได้เฉพาะอีเมลที่มีอยู่ในระบบเท่านั้น</div>
                </div>

                <div class="mt-4 space-y-2 max-h-[420px] overflow-y-auto pr-2">
                  <div v-for="r in selectedRecipients" :key="r.id" class="bg-white rounded-2xl border border-slate-200 p-4">
                    <div class="text-xs font-black text-slate-800">{{ r.name }}</div>
                    <div class="text-[11px] text-slate-500 font-semibold mt-1">{{ r.email }}</div>
                    <div class="mt-2 flex flex-wrap gap-1">
                      <span class="inline-flex items-center justify-center px-2.5 py-1 rounded-full border text-[10px] font-black bg-slate-50 text-slate-700 border-slate-200">{{ r.type }}</span>
                      <span v-if="r.track" class="inline-flex items-center justify-center px-2.5 py-1 rounded-full border text-[10px] font-black bg-indigo-50 text-indigo-800 border-indigo-200">{{ r.track }}</span>
                      <span v-if="r.paperId" class="inline-flex items-center justify-center px-2.5 py-1 rounded-full border text-[10px] font-black bg-amber-50 text-amber-800 border-amber-200">{{ r.paperId }}</span>
                    </div>
                  </div>
                  <div v-if="selectedRecipients.length === 0" class="text-xs font-semibold text-slate-500">โปรดเลือกผู้รับจากตารางก่อน</div>
                </div>
              </div>

              <div class="p-6">
                <div class="space-y-3">
                  <div>
                    <div class="text-[11px] font-black text-slate-600 mb-1">หัวข้อ (Subject)</div>
                    <input v-model="emailSubject" type="text" class="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
                  </div>

                  <div>
                    <div class="text-[11px] font-black text-slate-600 mb-1">ข้อความ (Body)</div>
                    <textarea v-model="emailBody" rows="9" class="w-full px-3 py-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"></textarea>
                  </div>

                  <div>
                    <div class="text-[11px] font-black text-slate-600 mb-1">Preview (คนแรกที่เลือก)</div>
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[11px] font-semibold text-slate-700 whitespace-pre-line">{{ emailPreviewBody }}</div>
                    <div v-if="previewRecipient" class="mt-2 text-[11px] text-slate-500 font-semibold">
                      ถึง: <span class="font-black text-slate-700">{{ previewRecipient.name }}</span>
                      <span class="text-slate-400">·</span>
                      {{ previewRecipient.email }}
                      <span v-if="previewRecipient.paperId" class="text-slate-400">·</span>
                      <span v-if="previewRecipient.paperId">{{ previewRecipient.paperId }}</span>
                    </div>
                  </div>

                  <div class="pt-2 flex items-center justify-end gap-2">
                    <button type="button" class="h-10 px-4 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-700 hover:bg-slate-50" @click="closeEmailModal">ยกเลิก</button>
                    <button type="button" class="h-10 px-4 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 inline-flex items-center gap-2" :disabled="selectedCount === 0" :class="selectedCount === 0 ? 'opacity-50 cursor-not-allowed' : ''">
                      <Send class="w-4 h-4" />
                      ส่งอีเมล (Mock)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="detailModalOpen" class="fixed inset-0 z-50">
      <div class="absolute inset-0 bg-black/40" @click="closeDetailModal"></div>
      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden" @click.stop>
          <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div class="text-sm font-black text-slate-800">รายละเอียดผู้เข้าร่วม</div>
            <button type="button" class="h-10 w-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center justify-center" @click="closeDetailModal">
              <X class="w-4 h-4 text-slate-600" />
            </button>
          </div>

          <div class="p-6">
            <div v-if="!targetAttendee" class="text-xs font-semibold text-slate-500">-</div>
            <div v-else class="space-y-3">
              <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div class="text-xs font-black text-slate-800">{{ targetAttendee.name }}</div>
                <div class="text-[11px] text-slate-600 font-semibold mt-1">{{ targetAttendee.email }}</div>
                <div class="text-[11px] text-slate-600 font-semibold">{{ targetAttendee.phone }}</div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="rounded-2xl border border-slate-200 bg-white p-4">
                  <div class="text-[11px] font-black text-slate-600">ประเภท</div>
                  <div class="text-xs font-black text-slate-800 mt-1">{{ targetAttendee.type }}</div>
                </div>
                <div class="rounded-2xl border border-slate-200 bg-white p-4">
                  <div class="text-[11px] font-black text-slate-600">Track</div>
                  <div class="text-xs font-black text-slate-800 mt-1">{{ targetAttendee.track || '-' }}</div>
                </div>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-white p-4">
                <div class="text-[11px] font-black text-slate-600">บทความที่เกี่ยวข้อง</div>
                <div class="text-xs font-black text-slate-800 mt-1">{{ targetAttendee.paperId || '-' }}</div>
                <div class="text-[11px] text-slate-600 font-semibold mt-1">{{ resolvePaperTitle(targetAttendee.paperId, targetAttendee.paperTitle) || '-' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="editModalOpen" class="fixed inset-0 z-50">
      <div class="absolute inset-0 bg-black/40" @click="closeEditModal"></div>
      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden" @click.stop>
          <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div class="text-sm font-black text-slate-800">แก้ไขข้อมูลผู้เข้าร่วม</div>
            <button type="button" class="h-10 w-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center justify-center" @click="closeEditModal">
              <X class="w-4 h-4 text-slate-600" />
            </button>
          </div>

          <div class="p-6 space-y-3">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div class="text-[11px] font-black text-slate-600 mb-1">ชื่อ-นามสกุล</div>
                <input v-model="editDraft.name" type="text" class="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none" />
              </div>
              <div>
                <div class="text-[11px] font-black text-slate-600 mb-1">ประเภท</div>
                <select v-model="editDraft.type" class="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none">
                  <option value="ผู้นำเสนอ">ผู้นำเสนอ</option>
                  <option value="ผู้เข้าฟัง">ผู้เข้าฟัง</option>
                  <option value="กรรมการ/ผู้จัดงาน">กรรมการ/ผู้จัดงาน</option>
                </select>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div class="text-[11px] font-black text-slate-600 mb-1">อีเมล</div>
                <input v-model="editDraft.email" type="email" class="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none" />
              </div>
              <div>
                <div class="text-[11px] font-black text-slate-600 mb-1">โทร</div>
                <input v-model="editDraft.phone" type="text" class="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none" />
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div class="text-[11px] font-black text-slate-600 mb-1">Track</div>
                <input v-model="editDraft.track" type="text" class="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none" />
              </div>
              <div>
                <div class="text-[11px] font-black text-slate-600 mb-1">Paper ID</div>
                <input v-model="editDraft.paperId" type="text" class="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none" />
              </div>
            </div>
            <div>
              <div class="text-[11px] font-black text-slate-600 mb-1">ชื่อบทความ</div>
              <input v-model="editDraft.paperTitle" type="text" class="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none" />
              <div v-if="editDraft.paperId && resolvePaperTitle(editDraft.paperId, null)" class="mt-2 text-[11px] text-slate-500 font-semibold">
                ชื่อจากระบบ: <span class="font-black text-slate-700">{{ resolvePaperTitle(editDraft.paperId, null) }}</span>
              </div>
            </div>
            <div class="pt-2 flex items-center justify-end gap-2">
              <button type="button" class="h-10 px-4 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-700 hover:bg-slate-50" @click="closeEditModal">ยกเลิก</button>
              <button type="button" class="h-10 px-4 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800" @click="saveEdit">บันทึก</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="docModalOpen" class="fixed inset-0 z-50">
      <div class="absolute inset-0 bg-black/40" @click="closeDocModal"></div>
      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" @click.stop>
          <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <div class="text-sm font-black text-slate-800">จัดการเอกสารสำคัญ: {{ targetAttendee?.name }}</div>
              <div class="text-[11px] text-slate-500 font-semibold mt-0.5">อัปโหลดเอกสารส่วนตัวเพื่อส่งให้ User ดาวน์โหลด</div>
            </div>
            <button type="button" class="h-10 w-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center justify-center" @click="closeDocModal">
              <X class="w-4 h-4 text-slate-600" />
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-6 space-y-6">
            <div class="p-5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
              <div class="text-xs font-black text-slate-800 mb-4">ส่งเอกสารใหม่</div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div class="text-[11px] font-black text-slate-600 mb-1">ชื่อเอกสาร (ไทย)</div>
                  <input v-model="docDraft.title_th" type="text" placeholder="เช่น ใบเสร็จรับเงิน" class="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none" />
                </div>
                <div>
                  <div class="text-[11px] font-black text-slate-600 mb-1">ชื่อเอกสาร (English)</div>
                  <input v-model="docDraft.title_en" type="text" placeholder="e.g. Official Receipt" class="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none" />
                </div>
                <div>
                  <div class="text-[11px] font-black text-slate-600 mb-1">ประเภท</div>
                  <select v-model="docDraft.type" class="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none">
                    <option value="receipt">ใบเสร็จรับเงิน (Receipt)</option>
                    <option value="invitation">หนังสือเชิญ (Invitation)</option>
                    <option value="acceptance">หนังสือตอบรับ (Acceptance)</option>
                    <option value="other">อื่นๆ (Other)</option>
                  </select>
                </div>
                <div>
                  <div class="text-[11px] font-black text-slate-600 mb-1">ไฟล์ (PDF)</div>
                  <input type="file" accept=".pdf" @change="handleDocFile" class="w-full text-xs font-semibold" />
                </div>
              </div>
              <div class="mt-4 flex justify-end">
                <button 
                  @click="uploadDoc" 
                  :disabled="isUploadingDoc || !docDraft.file"
                  class="h-10 px-6 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <Download v-if="!isUploadingDoc" class="w-4 h-4" />
                  <div v-else class="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full"></div>
                  {{ isUploadingDoc ? 'กำลังส่ง...' : 'อัปโหลดและส่งเอกสาร' }}
                </button>
              </div>
            </div>

            <div class="space-y-3">
              <div class="text-xs font-black text-slate-800">เอกสารที่ส่งแล้ว</div>
              <div v-if="targetDocs.length === 0" class="py-8 text-center text-xs font-semibold text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                ยังไม่มีเอกสารสำคัญสำหรับ User คนนี้
              </div>
              <div v-for="doc in targetDocs" :key="doc.id" class="p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-500">
                    <FileText class="w-5 h-5" />
                  </div>
                  <div class="min-w-0">
                    <div class="text-xs font-black text-slate-800 truncate">{{ doc.title_th }}</div>
                    <div class="text-[10px] font-semibold text-slate-500">{{ doc.title_en }}</div>
                    <div class="mt-1 text-[9px] font-black text-indigo-600 uppercase tracking-widest">{{ doc.document_type }}</div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <a :href="doc.file_url" target="_blank" class="h-8 px-3 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-black hover:bg-slate-200 flex items-center gap-1">
                    <Eye class="w-3.5 h-3.5" />
                    ดูไฟล์
                  </a>
                  <button @click="deleteDoc(doc.id)" class="h-8 w-8 rounded-lg border border-rose-100 text-rose-600 hover:bg-rose-50 flex items-center justify-center">
                    <X class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
