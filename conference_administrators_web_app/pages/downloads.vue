<script setup>
definePageMeta({ middleware: 'auth', layout: 'admin' });
import { ref, onMounted, computed, watch } from 'vue';
import {
  Download, FileText, Plus, Search, Trash2, User, 
  ChevronRight, ArrowLeft, UploadCloud, X, CheckCircle2,
  FileIcon, BookOpen, AlertCircle, FileSpreadsheet, Image as ImageIcon,
  SlidersHorizontal, ChevronLeft
} from 'lucide-vue-next';
import { useSupabase } from '~/composables/useSupabase';

const supabase = useSupabase();
const activeTab = ref('public'); // 'public' or 'individual'

// Public Templates State
const publicDocs = ref([]);
const isFetchingPublic = ref(false);
const publicModalOpen = ref(false);
const publicDraft = ref({ title_th: '', title_en: '', file: null });
const isUploadingPublic = ref(false);

// Individual / Team Docs State
const searchQuery = ref('');
const papers = ref([]);
const profiles = ref([]);
const userDocs = ref([]);
const targetTeam = ref(null);
const teamUploadModalOpen = ref(false);
const isFetchingDocs = ref(false);
const docDraft = ref({ title_th: '', title_en: '', type: 'receipt', file: null });
const isUploadingDoc = ref(false);

const selectedTrack = ref('all');
const selectedStatus = ref('all');
const currentPage = ref(1);

// Drag and Drop States for Modals
const isDraggingPublic = ref(false);
const isDraggingTeam = ref(false);

const publicFileInput = ref(null);
const teamFileInput = ref(null);

const triggerPublicFileSelect = () => {
  publicFileInput.value?.click();
};

const triggerTeamFileSelect = () => {
  teamFileInput.value?.click();
};

const onPublicDragOver = (e) => {
  e.preventDefault();
  isDraggingPublic.value = true;
};

const onPublicDragLeave = () => {
  isDraggingPublic.value = false;
};

const onPublicDrop = (e) => {
  e.preventDefault();
  isDraggingPublic.value = false;
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    publicDraft.value.file = e.dataTransfer.files[0];
  }
};

const onTeamDragOver = (e) => {
  e.preventDefault();
  isDraggingTeam.value = true;
};

const onTeamDragLeave = () => {
  isDraggingTeam.value = false;
};

const onTeamDrop = (e) => {
  e.preventDefault();
  isDraggingTeam.value = false;
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    docDraft.value.file = e.dataTransfer.files[0];
  }
};

const clearPublicFile = () => {
  publicDraft.value.file = null;
  if (publicFileInput.value) publicFileInput.value.value = '';
};

const clearTeamFile = () => {
  docDraft.value.file = null;
  if (teamFileInput.value) teamFileInput.value.value = '';
};

const fileKindMeta = {
  docx: { label: 'DOCX', pill: 'bg-blue-50 border-blue-200 text-blue-700', icon: FileText },
  latex: { label: 'ZIP', pill: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: FileIcon },
  pdf: { label: 'PDF', pill: 'bg-rose-50 border-rose-200 text-rose-700', icon: FileText },
  excel: { label: 'EXCEL', pill: 'bg-teal-50 border-teal-200 text-teal-700', icon: FileSpreadsheet },
  image: { label: 'IMAGE', pill: 'bg-violet-50 border-violet-200 text-violet-700', icon: ImageIcon }
};

const statusMeta = {
  draft: { label: 'ฉบับร่าง', class: 'bg-slate-100 text-slate-600 border-slate-200 border' },
  submitted: { label: 'รอตรวจ', class: 'bg-indigo-50 text-indigo-750 border-indigo-100 border font-semibold' },
  under_review: { label: 'ประเมินอยู่', class: 'bg-blue-50 text-blue-700 border-blue-100 border font-semibold' },
  waiting_author_fix: { label: 'รอตรวจแก้ไขด่วน', class: 'bg-rose-50 text-rose-700 border-rose-200 border animate-pulse font-bold' },
  accepted: { label: 'ตอบรับแล้ว', class: 'bg-emerald-50 text-emerald-750 border-emerald-100 border font-semibold' },
  rejected: { label: 'ปฏิเสธแล้ว', class: 'bg-red-50 text-red-700 border-red-100 border font-semibold' },
  published: { label: 'ตีพิมพ์แล้ว', class: 'bg-purple-50 text-purple-750 border-purple-100 border font-semibold' },
  revision_required: { label: 'รอผู้แต่งแก้ไข', class: 'bg-amber-50 text-amber-700 border-amber-200 border font-semibold' }
};

const statusOptions = {
  all: 'สถานะทั้งหมด',
  draft: 'ฉบับร่าง',
  submitted: 'รอตรวจ',
  under_review: 'ประเมินอยู่',
  waiting_author_fix: 'รอผู้แต่งแก้ไขด่วน',
  accepted: 'ตอบรับแล้ว',
  rejected: 'ปฏิเสธแล้ว',
  published: 'ตีพิมพ์แล้ว',
  revision_required: 'รอผู้แต่งแก้ไข'
};

onMounted(async () => {
  await Promise.all([
    fetchPublicDocs(),
    fetchAllData()
  ]);
});

const fetchPublicDocs = async () => {
  isFetchingPublic.value = true;
  const { data, error } = await supabase.from('downloads').select('*').order('created_at', { ascending: false });
  if (!error) publicDocs.value = data || [];
  isFetchingPublic.value = false;
};

const fetchAllData = async () => {
  isFetchingDocs.value = true;
  try {
    const [papersRes, usersRes, userDocsRes] = await Promise.all([
      supabase.from('papers').select('paper_id, paper_code, title_th, title_en, track, status, author_id').order('paper_code'),
      supabase.from('users').select('user_id, title, first_name_th, last_name_th, email, institution'),
      supabase.from('user_documents').select('*').order('created_at', { ascending: false })
    ]);
    if (!papersRes.error) papers.value = papersRes.data || [];
    if (!usersRes.error) profiles.value = usersRes.data || [];
    if (!userDocsRes.error) userDocs.value = userDocsRes.data || [];
  } catch (e) {
    console.error(e);
  } finally {
    isFetchingDocs.value = false;
  }
};

const detectFileType = (fileName) => {
  if (!fileName) return 'pdf';
  const ext = fileName.split('.').pop().toLowerCase();
  if (['doc', 'docx'].includes(ext)) return 'docx';
  if (['zip', 'rar', '7z'].includes(ext)) return 'latex';
  if (['xls', 'xlsx'].includes(ext)) return 'excel';
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return 'image';
  return 'pdf';
};

const getFileKindMeta = (kind) => fileKindMeta[kind] || fileKindMeta.pdf;

const handlePublicFile = (e) => { publicDraft.value.file = e.target.files[0]; };
const handleIndividualFile = (e) => { docDraft.value.file = e.target.files[0]; };

const uploadPublic = async () => {
  if (!publicDraft.value.file || !publicDraft.value.title_th) return;
  isUploadingPublic.value = true;
  try {
    const file = publicDraft.value.file;
    const detectedType = detectFileType(file.name);
    const ext = file.name.split('.').pop().toLowerCase();
    const safeRandom = Math.random().toString(36).substring(2, 8);
    const fileName = `templates/${Date.now()}_${safeRandom}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('certificates').upload(fileName, file);
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('certificates').getPublicUrl(fileName);

    const { error: dbError } = await supabase.from('downloads').insert({
      title_th: publicDraft.value.title_th,
      title_en: publicDraft.value.title_en,
      file_url: publicUrl,
      file_type: detectedType,
      filename: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB'
    });

    if (dbError) throw dbError;
    alert('อัปโหลดแบบฟอร์มสาธารณะเรียบร้อยแล้ว');
    publicModalOpen.value = false;
    publicDraft.value = { title_th: '', title_en: '', file: null };
    await fetchPublicDocs();
  } catch (e) {
    alert(e.message);
  } finally {
    isUploadingPublic.value = false;
  }
};

const deletePublic = async (id) => {
  if (!confirm('ต้องการลบแบบฟอร์มนี้ใช่หรือไม่? ผู้แต่งจะไม่เห็นไฟล์นี้อีกต่อไป')) return;
  const { error } = await supabase.from('downloads').delete().eq('id', id);
  if (!error) await fetchPublicDocs();
};

const openTeamUpload = (team) => {
  targetTeam.value = team;
  docDraft.value = {
    title_th: '',
    title_en: '',
    type: 'receipt',
    file: null
  };
  onDocTypeChange();
  teamUploadModalOpen.value = true;
};

const onDocTypeChange = () => {
  if (!targetTeam.value) return;
  const code = targetTeam.value.paper_code;
  if (docDraft.value.type === 'receipt') {
    docDraft.value.title_th = `[${code}] ใบเสร็จรับเงิน`;
    docDraft.value.title_en = `[${code}] Receipt`;
  } else if (docDraft.value.type === 'invitation') {
    docDraft.value.title_th = `[${code}] หนังสือเชิญเข้าร่วมงาน`;
    docDraft.value.title_en = `[${code}] Invitation Letter`;
  } else if (docDraft.value.type === 'acceptance') {
    docDraft.value.title_th = `[${code}] หนังสือตอบรับการนำเสนอ`;
    docDraft.value.title_en = `[${code}] Acceptance Letter`;
  } else {
    docDraft.value.title_th = `[${code}] เอกสารสำคัญ`;
    docDraft.value.title_en = `[${code}] Official Document`;
  }
};

const uploadTeamDoc = async () => {
  if (!docDraft.value.file || !targetTeam.value) return;
  isUploadingDoc.value = true;
  try {
    const file = docDraft.value.file;
    const user_id = targetTeam.value.author_id;
    const ext = file.name.split('.').pop().toLowerCase();
    const safeRandom = Math.random().toString(36).substring(2, 8);
    const fileName = `official_docs/${user_id}/${Date.now()}_${safeRandom}.${ext}`;
    
    const { error: uploadError } = await supabase.storage.from('certificates').upload(fileName, file);
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage.from('certificates').getPublicUrl(fileName);

    const { error: dbError } = await supabase.from('user_documents').insert({
      user_id: user_id,
      title_th: docDraft.value.title_th,
      title_en: docDraft.value.title_en,
      file_url: publicUrl,
      document_type: docDraft.value.type
    });

    if (dbError) throw dbError;

    alert('ส่งเอกสารให้ทีมเรียบร้อยแล้ว');
    teamUploadModalOpen.value = false;
    docDraft.value = { title_th: '', title_en: '', type: 'receipt', file: null };
    await fetchAllData();
  } catch (e) {
    alert(e.message);
  } finally {
    isUploadingDoc.value = false;
  }
};

const deleteTeamDoc = async (id) => {
  if (!confirm('ต้องการลบเอกสารนี้ใช่หรือไม่? ผู้แต่งจะไม่เห็นไฟล์นี้อีกต่อไป')) return;
  const { error } = await supabase.from('user_documents').delete().eq('id', id);
  if (!error) {
    await fetchAllData();
  } else {
    alert('เกิดข้อผิดพลาด: ' + error.message);
  }
};

const trackOptions = computed(() => {
  return ['all', ...new Set(papers.value.map(p => p.track).filter(Boolean))];
});

const mappedTeams = computed(() => {
  const profilesMap = (profiles.value || []).reduce((acc, u) => {
    acc[u.user_id] = u;
    return acc;
  }, {});

  const docsByPaperCode = {};
  (userDocs.value || []).forEach(d => {
    const title = d.title_th || '';
    const match = title.match(/^\[([^\]]+)\]/);
    if (match) {
      const paperCode = match[1];
      if (!docsByPaperCode[paperCode]) {
        docsByPaperCode[paperCode] = [];
      }
      docsByPaperCode[paperCode].push(d);
    }
  });

  return (papers.value || []).map(p => {
    const author = profilesMap[p.author_id] || { title: '', first_name_th: 'ไม่ระบุ', last_name_th: '', email: '-', institution: '-' };
    const docs = docsByPaperCode[p.paper_code] || [];
    
    let fullName = 'ไม่ระบุ';
    if (author.first_name_th && author.first_name_th !== 'ไม่ระบุ') {
      const prefix = author.title ? author.title : '';
      fullName = `${prefix}${author.first_name_th} ${author.last_name_th || ''}`.trim();
    }

    return {
      ...p,
      authorName: fullName,
      authorEmail: author.email || '-',
      authorInstitution: author.institution || '-',
      documents: docs
    };
  });
});

const filteredTeams = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  let list = mappedTeams.value;
  if (selectedTrack.value !== 'all') {
    list = list.filter(t => t.track === selectedTrack.value);
  }
  if (selectedStatus.value !== 'all') {
    list = list.filter(t => t.status === selectedStatus.value);
  }
  if (q) {
    list = list.filter(t => 
      (t.paper_code || '').toLowerCase().includes(q) ||
      (t.title_th || '').toLowerCase().includes(q) ||
      (t.title_en || '').toLowerCase().includes(q) ||
      (t.authorName || '').toLowerCase().includes(q) ||
      (t.authorEmail || '').toLowerCase().includes(q)
    );
  }
  return list;
});

const paginatedTeams = computed(() => {
  const start = (currentPage.value - 1) * 10;
  return filteredTeams.value.slice(start, start + 10);
});

const totalPages = computed(() => Math.ceil(filteredTeams.value.length / 10));

// Watch filters to reset page
watch([searchQuery, selectedTrack, selectedStatus], () => {
  currentPage.value = 1;
});
</script>

<template>
  <div class="p-8 pb-20 font-['Sarabun','Lato'] animate-fade-in bg-slate-50 min-h-screen">
    <header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h2 class="text-2xl font-black text-slate-800 mb-1">ศูนย์จัดการเอกสาร</h2>
        <p class="text-sm font-semibold text-slate-500">จัดการแบบฟอร์มส่วนกลางและส่งไฟล์รับรองแยกรายทีมนำเสนอ</p>
      </div>
      <div class="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm shrink-0">
        <button 
          @click="activeTab = 'public'"
          :class="['px-5 py-2.5 rounded-xl text-xs font-black transition-all', activeTab === 'public' ? 'bg-slate-900 text-white shadow-lg shadow-slate-250' : 'text-slate-500 hover:bg-slate-50']"
        >
          แบบฟอร์มส่วนกลาง
        </button>
        <button 
          @click="activeTab = 'individual'"
          :class="['px-5 py-2.5 rounded-xl text-xs font-black transition-all', activeTab === 'individual' ? 'bg-slate-900 text-white shadow-lg shadow-slate-250' : 'text-slate-500 hover:bg-slate-50']"
        >
          เอกสารสำคัญรายทีม
        </button>
      </div>
    </header>

    <!-- Tab 1: Public Templates -->
    <div v-if="activeTab === 'public'" class="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
      <div class="flex justify-end">
        <button @click="publicModalOpen = true" class="h-11 px-6 rounded-2xl bg-indigo-600 text-white text-sm font-black hover:bg-indigo-700 shadow-lg shadow-indigo-100 flex items-center gap-2 transition-all">
          <Plus class="w-5 h-5" />
          อัปโหลดแบบฟอร์มใหม่
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div v-if="isFetchingPublic" class="col-span-full py-20 flex justify-center">
          <div class="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 animate-spin rounded-full"></div>
        </div>
        <div v-else-if="publicDocs.length === 0" class="col-span-full py-20 text-center text-slate-400 font-bold bg-white rounded-3xl border border-slate-200 shadow-sm">
          ยังไม่มีแบบฟอร์มในระบบ
        </div>
        
        <div v-for="doc in publicDocs" :key="doc.id" class="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
          <div class="flex items-start justify-between gap-4">
            <div :class="['w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm', getFileKindMeta(doc.file_type).pill]">
              <component :is="getFileKindMeta(doc.file_type).icon" class="w-6 h-6" />
            </div>
            <button @click="deletePublic(doc.id)" class="text-slate-350 hover:text-rose-600 transition-colors p-1 hover:bg-rose-50 rounded-lg">
              <Trash2 class="w-5 h-5" />
            </button>
          </div>
          <div class="mt-4 min-w-0">
            <div class="text-[15px] font-black text-slate-800 truncate" :title="doc.title_th">{{ doc.title_th }}</div>
            <div class="text-[12px] font-semibold text-slate-500 truncate" :title="doc.title_en">{{ doc.title_en }}</div>
            <div class="mt-4 flex items-center justify-between">
              <span :class="['px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border', getFileKindMeta(doc.file_type).pill]">{{ getFileKindMeta(doc.file_type).label }}</span>
              <span class="text-[11px] font-bold text-slate-400">{{ doc.size }}</span>
            </div>
          </div>
          <a :href="doc.file_url" target="_blank" class="mt-4 w-full h-10 rounded-xl bg-slate-50 text-slate-700 text-xs font-black hover:bg-slate-100 flex items-center justify-center gap-2 border border-slate-100 transition-colors">
            <Download class="w-4 h-4" />
            ตรวจสอบไฟล์
          </a>
        </div>
      </div>
    </div>

    <!-- Tab 2: Individual/Team Docs Table -->
    <div v-else class="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
      <!-- Search, Filter & Summary Bar -->
      <div class="bg-white rounded-[24px] p-6 border border-slate-200 shadow-sm space-y-4">
        <div class="flex flex-col lg:flex-row items-center gap-4">
          <!-- Search input -->
          <div class="relative w-full lg:flex-1 group">
            <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-650 transition-colors" />
            <input 
              v-model="searchQuery"
              placeholder="ค้นหาด้วยรหัสบทความ, ชื่อบทความ, ผู้แต่ง หรืออีเมล..." 
              class="w-full h-12 pl-12 pr-4 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-100/50 focus:border-indigo-300 transition-all shadow-inner"
            />
          </div>

          <!-- Track filter -->
          <div class="flex items-center gap-2 w-full lg:w-auto bg-slate-50 border border-slate-100 rounded-xl px-3 py-1 group shrink-0">
            <SlidersHorizontal class="w-4 h-4 text-slate-400 group-focus-within:text-indigo-605" />
            <select v-model="selectedTrack" class="h-10 text-xs font-bold text-slate-700 bg-transparent border-none focus:outline-none min-w-[120px]">
              <option value="all">ทุกสาขา / Track</option>
              <option v-for="t in trackOptions" :key="t" :value="t">{{ t === 'all' ? 'ทุกสาขา / Track' : t }}</option>
            </select>
          </div>

          <!-- Status filter -->
          <div class="flex items-center gap-2 w-full lg:w-auto bg-slate-50 border border-slate-100 rounded-xl px-3 py-1 group shrink-0">
            <SlidersHorizontal class="w-4 h-4 text-slate-400" />
            <select v-model="selectedStatus" class="h-10 text-xs font-bold text-slate-700 bg-transparent border-none focus:outline-none min-w-[120px]">
              <option v-for="(val, key) in statusOptions" :key="key" :value="key">{{ val }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Main Data Table -->
      <div class="bg-white rounded-[28px] border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-left">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-100 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                <th class="py-4 px-6 text-center w-12">#</th>
                <th class="py-4 px-6 min-w-[160px]">บทความ (Paper)</th>
                <th class="py-4 px-6 min-w-[180px]">ผู้ส่งบทความ (Submitting Author)</th>
                <th class="py-4 px-6 text-center w-28">สถานะ</th>
                <th class="py-4 px-6 min-w-[240px]">เอกสารสำคัญ (Files Uploaded)</th>
                <th class="py-4 px-6 text-center w-28">จัดการ</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-slate-100">
              <tr v-if="isFetchingDocs" class="hover:bg-transparent">
                <td colspan="6" class="py-20 text-center">
                  <div class="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 animate-spin rounded-full mx-auto"></div>
                </td>
              </tr>
              <tr v-else-if="filteredTeams.length === 0" class="hover:bg-transparent">
                <td colspan="6" class="py-16 text-center text-xs font-bold text-slate-400">
                  ไม่พบข้อมูลบทความหรือเอกสารที่ตรงเงื่อนไข
                </td>
              </tr>

              <tr v-for="(team, index) in paginatedTeams" :key="team.paper_id" class="hover:bg-slate-50/50 transition-colors">
                <!-- Index -->
                <td class="py-4 px-6 text-center text-xs font-bold text-slate-450">
                  {{ (currentPage - 1) * 10 + index + 1 }}
                </td>

                <!-- Paper details -->
                <td class="py-4 px-6 min-w-[160px]">
                  <div class="flex flex-col gap-1">
                    <span class="inline-flex text-[11px] font-black font-['Lato'] text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md w-fit tracking-wider">
                      {{ team.paper_code }}
                    </span>
                    <span class="text-[13px] font-black text-slate-800 line-clamp-1" :title="team.title_th || team.title_en">
                      {{ team.title_th || team.title_en }}
                    </span>
                    <span class="text-[10px] font-bold text-slate-400 truncate">
                      Track: {{ team.track }}
                    </span>
                  </div>
                </td>

                <!-- Author info -->
                <td class="py-4 px-6">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <User class="w-4 h-4" />
                    </div>
                    <div class="min-w-0">
                      <div class="text-[12px] font-black text-slate-800 truncate" :title="team.authorName">{{ team.authorName }}</div>
                      <div class="text-[10px] font-bold text-slate-450 truncate" :title="team.authorEmail">{{ team.authorEmail }}</div>
                      <div v-if="team.authorInstitution && team.authorInstitution !== '-'" class="text-[10px] font-bold text-indigo-600 truncate mt-0.5" :title="team.authorInstitution">
                        สถาบัน: {{ team.authorInstitution }}
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Status badge -->
                <td class="py-4 px-6 text-center">
                  <span :class="['inline-flex rounded-lg px-2.5 py-1 text-[11px] font-black border', statusMeta[team.status]?.class || 'bg-slate-150 text-slate-650']">
                    {{ statusMeta[team.status]?.label || team.status }}
                  </span>
                </td>

                <!-- Files Uploaded list -->
                <td class="py-4 px-6">
                  <div v-if="team.documents.length === 0" class="text-[11px] font-bold text-slate-400 italic">
                    ยังไม่มีเอกสารอัปโหลด
                  </div>
                  <div v-else class="flex flex-wrap gap-2">
                    <div v-for="doc in team.documents" :key="doc.id" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-slate-50 border-slate-200 text-xs font-semibold group/file transition-all">
                      <component :is="getFileKindMeta(detectFileType(doc.file_url)).icon" class="w-3.5 h-3.5 text-slate-550 shrink-0" />
                      <span class="text-slate-700 truncate max-w-[140px]" :title="doc.title_th">{{ doc.title_th }}</span>
                      <div class="flex items-center gap-1 ml-1 opacity-60 group-hover/file:opacity-100 transition-opacity">
                        <a :href="doc.file_url" target="_blank" class="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-indigo-650 transition-colors" title="ดาวน์โหลด">
                          <Download class="w-3.5 h-3.5" />
                        </a>
                        <button @click="deleteTeamDoc(doc.id)" class="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-rose-600 transition-colors" title="ลบ">
                          <Trash2 class="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Action Button -->
                <td class="py-4 px-6 text-center">
                  <button 
                    @click="openTeamUpload(team)"
                    class="h-9 px-3.5 rounded-xl bg-slate-900 text-white text-[11px] font-black hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md mx-auto shrink-0"
                  >
                    <UploadCloud class="w-3.5 h-3.5" />
                    อัปโหลด
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Table Pagination controls -->
        <div v-if="totalPages > 1" class="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <div class="text-xs font-bold text-slate-450">
            แสดงหน้า {{ currentPage }} จากทั้งหมด {{ totalPages }} หน้า (ข้อมูล {{ filteredTeams.length }} รายการ)
          </div>
          <div class="flex items-center gap-1">
            <button 
              @click="currentPage--" 
              :disabled="currentPage <= 1"
              class="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft class="w-4 h-4" />
            </button>
            <span class="px-3 text-xs font-black text-slate-800">
              {{ currentPage }}
            </span>
            <button 
              @click="currentPage++" 
              :disabled="currentPage >= totalPages"
              class="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal for Public Upload -->
    <div v-if="publicModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="publicModalOpen = false"></div>
      <div class="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        <!-- Modal Header -->
        <div class="px-8 py-6 bg-white border-b border-slate-100 flex items-center justify-between">
          <div>
            <div class="text-xs font-black text-indigo-500 uppercase tracking-widest">Public Templates</div>
            <div class="text-lg font-black mt-0.5 text-slate-800">อัปโหลดแบบฟอร์มสาธารณะ</div>
          </div>
          <button @click="publicModalOpen = false" class="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all">
            <X class="w-6 h-6" />
          </button>
        </div>
        
        <!-- Modal Body -->
        <div class="p-8 space-y-5">
          <div>
            <div class="text-[11px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">ชื่อเอกสาร (ภาษาไทย)</div>
            <input 
              v-model="publicDraft.title_th" 
              placeholder="เช่น คู่มือการส่งบทความ" 
              class="w-full h-12 px-4 rounded-xl bg-slate-50/50 border border-slate-200 text-xs font-bold focus:outline-none focus:ring-4 focus:ring-indigo-100/50 focus:border-indigo-400 focus:bg-white transition-all" 
            />
          </div>
          <div>
            <div class="text-[11px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">ชื่อเอกสาร (English)</div>
            <input 
              v-model="publicDraft.title_en" 
              placeholder="e.g. Submission Manual" 
              class="w-full h-12 px-4 rounded-xl bg-slate-50/50 border border-slate-200 text-xs font-bold focus:outline-none focus:ring-4 focus:ring-indigo-100/50 focus:border-indigo-400 focus:bg-white transition-all" 
            />
          </div>
          <div>
            <div class="text-[11px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">เลือกไฟล์ (ตรวจจับประเภทอัตโนมัติ)</div>
            <input 
              type="file" 
              ref="publicFileInput"
              @change="handlePublicFile" 
              class="hidden" 
            />
            
            <div 
              @dragover="onPublicDragOver"
              @dragleave="onPublicDragLeave"
              @drop="onPublicDrop"
              @click="triggerPublicFileSelect"
              :class="[
                'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 min-h-[120px]',
                isDraggingPublic ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50',
                publicDraft.file ? 'border-emerald-250 bg-emerald-50/10' : ''
              ]"
            >
              <div v-if="!publicDraft.file" class="flex flex-col items-center gap-1.5">
                <div class="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors">
                  <UploadCloud class="w-6 h-6 text-slate-450 animate-bounce" style="animation-duration: 3s" />
                </div>
                <div class="text-xs font-black text-slate-700">ลากไฟล์มาวางที่นี่ หรือ <span class="text-indigo-600 underline">คลิกเพื่อเลือกไฟล์</span></div>
                <div class="text-[10px] font-bold text-slate-450">รองรับไฟล์ PDF, Word, ZIP, Excel, PNG, JPG (สูงสุด 20MB)</div>
              </div>
              <div v-else class="w-full flex items-center justify-between p-1">
                <div class="flex items-center gap-3 min-w-0">
                  <div :class="['w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs shrink-0', getFileKindMeta(detectFileType(publicDraft.file.name)).pill]">
                    <component :is="getFileKindMeta(detectFileType(publicDraft.file.name)).icon" class="w-5 h-5" />
                  </div>
                  <div class="text-left min-w-0">
                    <div class="text-xs font-black text-slate-800 truncate max-w-[280px]" :title="publicDraft.file.name">{{ publicDraft.file.name }}</div>
                    <div class="text-[10px] font-bold text-slate-400">{{ (publicDraft.file.size / 1024).toFixed(1) }} KB</div>
                  </div>
                </div>
                <button 
                  @click.stop="clearPublicFile" 
                  class="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors shrink-0"
                  type="button"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          
          <button 
            @click="uploadPublic"
            :disabled="isUploadingPublic || !publicDraft.file"
            class="mt-4 h-14 w-full rounded-2xl bg-indigo-600 text-white text-sm font-black hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 shadow-lg shadow-indigo-100 hover:shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <CheckCircle2 v-if="!isUploadingPublic" class="w-4 h-4 text-emerald-400" />
            <div v-else class="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full"></div>
            {{ isUploadingPublic ? 'กำลังบันทึกข้อมูล...' : 'ยืนยันการเพิ่มไฟล์' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal for Individual/Team Document Upload -->
    <div v-if="teamUploadModalOpen && targetTeam" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="teamUploadModalOpen = false"></div>
      <div class="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        <!-- Modal Header -->
        <div class="px-8 py-6 bg-white border-b border-slate-100 flex items-center justify-between">
          <div>
            <div class="text-xs font-black text-indigo-500 uppercase tracking-widest">Team Document Center</div>
            <div class="text-lg font-black mt-0.5 text-slate-800">อัปโหลดเอกสารบทความ [{{ targetTeam.paper_code }}]</div>
          </div>
          <button @click="teamUploadModalOpen = false" class="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all">
            <X class="w-6 h-6" />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-8 space-y-4">
          <div>
            <div class="text-[11px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">ประเภทเอกสาร</div>
            <select 
              v-model="docDraft.type" 
              @change="onDocTypeChange" 
              class="w-full h-11 px-4 rounded-xl bg-slate-50/50 border border-slate-200 text-xs font-bold focus:outline-none focus:ring-4 focus:ring-indigo-100/50 focus:border-indigo-400 focus:bg-white transition-all"
            >
              <option value="receipt">ใบเสร็จรับเงิน (Official Receipt)</option>
              <option value="invitation">หนังสือเชิญ (Invitation Letter)</option>
              <option value="acceptance">หนังสือตอบรับ (Acceptance Letter)</option>
              <option value="other">เอกสารสำคัญอื่นๆ (Other Official Docs)</option>
            </select>
          </div>

          <div>
            <div class="text-[11px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">ชื่อไฟล์นำเสนอ (ภาษาไทย)</div>
            <input 
              v-model="docDraft.title_th" 
              class="w-full h-11 px-4 rounded-xl bg-slate-50/50 border border-slate-200 text-xs font-bold focus:outline-none focus:ring-4 focus:ring-indigo-100/50 focus:border-indigo-400 focus:bg-white transition-all" 
            />
          </div>

          <div>
            <div class="text-[11px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">ชื่อไฟล์นำเสนอ (English)</div>
            <input 
              v-model="docDraft.title_en" 
              class="w-full h-11 px-4 rounded-xl bg-slate-50/50 border border-slate-200 text-xs font-bold focus:outline-none focus:ring-4 focus:ring-indigo-100/50 focus:border-indigo-400 focus:bg-white transition-all" 
            />
          </div>

          <div>
            <div class="text-[11px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">เลือกไฟล์อัปโหลด</div>
            <input 
              type="file" 
              ref="teamFileInput"
              @change="handleIndividualFile" 
              class="hidden" 
            />
            
            <div 
              @dragover="onTeamDragOver"
              @dragleave="onTeamDragLeave"
              @drop="onTeamDrop"
              @click="triggerTeamFileSelect"
              :class="[
                'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 min-h-[120px]',
                isDraggingTeam ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50',
                docDraft.file ? 'border-emerald-250 bg-emerald-50/10' : ''
              ]"
            >
              <div v-if="!docDraft.file" class="flex flex-col items-center gap-1.5">
                <div class="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors">
                  <UploadCloud class="w-6 h-6 text-slate-450 animate-bounce" style="animation-duration: 3s" />
                </div>
                <div class="text-xs font-black text-slate-700">ลากไฟล์เอกสารมาวางที่นี่ หรือ <span class="text-indigo-600 underline">คลิกเพื่อเลือกไฟล์</span></div>
                <div class="text-[10px] font-bold text-slate-450">รองรับไฟล์ PDF, Word, ZIP, Excel, PNG, JPG (สูงสุด 20MB)</div>
              </div>
              <div v-else class="w-full flex items-center justify-between p-1">
                <div class="flex items-center gap-3 min-w-0">
                  <div :class="['w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs shrink-0', getFileKindMeta(detectFileType(docDraft.file.name)).pill]">
                    <component :is="getFileKindMeta(detectFileType(docDraft.file.name)).icon" class="w-5 h-5" />
                  </div>
                  <div class="text-left min-w-0">
                    <div class="text-xs font-black text-slate-800 truncate max-w-[280px]" :title="docDraft.file.name">{{ docDraft.file.name }}</div>
                    <div class="text-[10px] font-bold text-slate-400">{{ (docDraft.file.size / 1024).toFixed(1) }} KB</div>
                  </div>
                </div>
                <button 
                  @click.stop="clearTeamFile" 
                  class="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors shrink-0"
                  type="button"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div class="bg-indigo-50/65 border border-indigo-100 rounded-xl p-4 flex gap-3 text-indigo-900 text-xs leading-relaxed">
            <AlertCircle class="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <span class="font-black">คำแนะนำ:</span> ระบบจะจัดเก็บเอกสารและแสดงผลในศูนย์ดาวน์โหลดของสมาชิกผู้ส่งโดยอัตโนมัติ โดยระบบได้ระบุรหัสบทความ `[{{ targetTeam.paper_code }}]` หน้าชื่อไฟล์ให้เรียบร้อยแล้วเพื่อความถูกต้อง
            </div>
          </div>

          <button 
            @click="uploadTeamDoc"
            :disabled="isUploadingDoc || !docDraft.file"
            class="mt-4 h-14 w-full rounded-2xl bg-indigo-600 text-white text-sm font-black hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 shadow-lg shadow-indigo-100 hover:shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <UploadCloud v-if="!isUploadingDoc" class="w-4 h-4 text-indigo-200" />
            <div v-else class="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full"></div>
            {{ isUploadingDoc ? 'กำลังอัปโหลดส่งให้ทีม...' : 'อัปโหลดส่งให้ทีมนำเสนอ' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 5px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
</style>

