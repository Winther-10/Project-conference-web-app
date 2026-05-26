<script setup>
definePageMeta({ middleware: 'auth', layout: 'admin' });
import { computed, ref, onMounted } from 'vue';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  Mail,
  MoreVertical,
  Search,
  UserCheck,
  Users,
  Wallet,
  X,
  Zap,
  Info,
  Calendar,
  ShieldCheck,
  History,
  ExternalLink,
  MessageSquare,
  BookOpen
} from 'lucide-vue-next';

// --- DATA & STATE ---
const supabase = useSupabase();
const papers = ref([]);
const reviewers = ref([]);
const assignments = ref([]);
const isLoading = ref(true);
const allUsers = ref([]);

const loadData = async () => {
  isLoading.value = true;
  try {
    const [papersRes, reviewersRes, assignmentsRes, usersRes] = await Promise.all([
      supabase.from('papers').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('*').eq('role', 'reviewer'),
      supabase.from('review_assignments').select('*'),
      supabase.from('users').select('*')
    ]);

    if (papersRes.error) throw papersRes.error;
    if (reviewersRes.error) throw reviewersRes.error;
    if (assignmentsRes.error) throw assignmentsRes.error;
    if (usersRes.error) throw usersRes.error;

    // Load settings
    const { data: settingsData } = await supabase.from('system_settings').select('config_json').eq('id', 1).maybeSingle();
    if (settingsData && settingsData.config_json) {
      useState('system_settings').value = settingsData.config_json;
    }

    papers.value = papersRes.data || [];
    reviewers.value = reviewersRes.data || [];
    assignments.value = assignmentsRes.data || [];
    allUsers.value = usersRes.data || [];
    
    // Default filter to current academic year
    if (filterYear.value === 'all') {
      const conf = useState('system_settings').value?.conference;
      const currentYear = String(conf?.academicYear || conf?.year || new Date().getFullYear());
      filterYear.value = currentYear;
    }
  } catch (err) {
    console.error('Error loading data:', err);
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadData);

// --- FILTERS ---
const query = ref('');
const filterCategory = ref('all');
const filterPaperStatus = ref('all');
const filterYear = ref('all');

// --- META ---
const paperStatusMeta = {
  pending_review: { label: 'รอประเมิน', class: 'bg-amber-50 text-amber-800 border-amber-200' },
  pending_revision: { label: 'รอประเมินแก้ไข', class: 'bg-orange-50 text-orange-800 border-orange-200' },
  reviewing: { label: 'กำลังประเมิน', class: 'bg-sky-50 text-sky-800 border-sky-200' },
  revision_required: { label: 'รอผู้แต่งแก้ไข', class: 'bg-violet-50 text-violet-800 border-violet-200' },
  rejected: { label: 'ปฏิเสธ', class: 'bg-rose-50 text-rose-800 border-rose-200' },
  accepted: { label: 'ยอมรับ', class: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  published: { label: 'ตีพิมพ์แล้ว', class: 'bg-purple-50 text-purple-800 border-purple-200' }
};

// --- HELPERS ---
const getReviewerName = (reviewerId) => {
  const r = reviewers.value.find(x => x.user_id === reviewerId);
  return r ? `${r.first_name_th} ${r.last_name_th}` : 'Unknown';
};

const updatePaperStatus = async (paperId, newStatus) => {
  try {
    const { error } = await supabase
      .from('papers')
      .update({ status: newStatus })
      .eq('paper_id', paperId);
    if (error) throw error;
    
    const idx = papers.value.findIndex(p => p.paper_id === paperId);
    if (idx !== -1) papers.value[idx].status = newStatus;
    openMenuId.value = null;
  } catch (err) {
    alert('ไม่สามารถอัปเดตได้: ' + err.message);
  }
};

const getAuthorProfile = (authorId) => {
  return allUsers.value.find(x => x.user_id === authorId) || null;
};

const getAuthorName = (authorId) => {
  const u = getAuthorProfile(authorId);
  return u ? `${u.prefix || ''}${u.first_name_th} ${u.last_name_th}` : 'ไม่ระบุชื่อ';
};

const formatDateTh = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear() + 543}`;
};

const getAssignments = (paperId) => assignments.value.filter(a => a.paper_id === paperId);

const reviewerProgressPct = (p) => {
  const assignments = getAssignments(p.paper_id);
  const total = assignments.length;
  if (total === 0) return 0;
  const done = assignments.filter(a => a.status === 'completed').length;
  return Math.round((done / total) * 100);
};

// --- COMPUTED ---
const stats = computed(() => [
  { label: 'บทความทั้งหมด', value: filteredPapers.value.length, icon: FileText, color: 'text-indigo-600' },
  { label: 'รอประเมิน', value: filteredPapers.value.filter(p => p.status === 'pending_review' || !p.status).length, icon: Clock, color: 'text-amber-600' },
  { label: 'ยอมรับแล้ว', value: filteredPapers.value.filter(p => p.status === 'accepted').length, icon: CheckCircle2, color: 'text-emerald-600' }
]);

const getEffectiveStatus = (p) => {
  if (!p) return 'pending_review';
  if ((p.status === 'pending_review' || !p.status) && p.file_url && p.file_url.includes('|||')) {
    return 'pending_revision';
  }
  return p.status || 'pending_review';
};

const filteredPapers = computed(() => {
  const q = query.value.trim().toLowerCase();
  return papers.value.filter((p) => {
    const author = getAuthorName(p.author_id).toLowerCase();
    const matchesQuery = !q || p.paper_code?.toLowerCase().includes(q) || p.title_th?.toLowerCase().includes(q) || p.title_en?.toLowerCase().includes(q) || author.includes(q);
    const matchesCategory = filterCategory.value === 'all' || p.track === filterCategory.value;
    
    // Determine effective status
    let effectiveStatus = getEffectiveStatus(p);
    const matchesPaperStatus = filterPaperStatus.value === 'all' || effectiveStatus === filterPaperStatus.value;
    
    let matchesYear = true;
    if (filterYear.value !== 'all') {
      const year = new Date(p.created_at).getFullYear();
      // Also check if paper_code contains the year suffix (fallback if needed)
      matchesYear = String(year) === filterYear.value;
    }

    return matchesQuery && matchesCategory && matchesPaperStatus && matchesYear;
  });
});

const yearOptions = computed(() => {
  const years = new Set();
  papers.value.forEach(p => {
    if (p.created_at) {
      years.add(new Date(p.created_at).getFullYear());
    }
  });
  return Array.from(years).sort((a, b) => b - a);
});

const categoryStats = computed(() => {
  const counts = {};
  filteredPapers.value.forEach(p => {
    const track = p.track || 'อื่นๆ';
    counts[track] = (counts[track] || 0) + 1;
  });
  return Object.entries(counts).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
});

const statusCounts = computed(() => {
  return [
    { label: 'รอประเมิน', value: filteredPapers.value.filter(p => (p.status === 'pending_review' || !p.status) && (!p.file_url || !p.file_url.includes('|||'))).length, color: '#f59e0b' },
    { label: 'รอประเมินแก้ไข', value: filteredPapers.value.filter(p => (p.status === 'pending_review' || !p.status) && p.file_url && p.file_url.includes('|||')).length, color: '#f97316' },
    { label: 'กำลังประเมิน', value: filteredPapers.value.filter(p => p.status === 'reviewing').length, color: '#3b82f6' },
    { label: 'ยอมรับ', value: filteredPapers.value.filter(p => p.status === 'accepted').length, color: '#10b981' },
    { label: 'ตีพิมพ์แล้ว', value: filteredPapers.value.filter(p => p.status === 'published').length, color: '#8b5cf6' },
    { label: 'ปฏิเสธ', value: filteredPapers.value.filter(p => p.status === 'rejected').length, color: '#ef4444' }
  ];
});

// --- UI ACTIONS ---
const openMenuId = ref(null);
const toggleRowMenu = (id) => {
  openMenuId.value = openMenuId.value === id ? null : id;
};
const closeRowMenu = () => {
  openMenuId.value = null;
};

const detailModalOpen = ref(false);
const selectedPaper = ref(null);

const openDetail = (p) => {
  selectedPaper.value = p;
  detailModalOpen.value = true;
};

const contactModalOpen = ref(false);
const selectedPaperForContact = ref(null);
const contactForm = ref({ subject: '', message: '' });

const openContactModal = (p) => {
  selectedPaperForContact.value = p;
  const author = allUsers.value.find(u => u.user_id === p.author_id);
  contactForm.value.subject = `เกี่ยวกับบทความ: ${p.title_th}`;
  contactForm.value.message = `เรียน คุณ${author?.first_name_th || 'ผู้ส่งบทความ'},\n\nขอสอบถามเกี่ยวกับบทความรหัส ${p.paper_code || p.paper_id.slice(0,8)}\nเรื่อง: ${p.title_th}\n\n`;
  contactModalOpen.value = true;
};

const closeContactModal = () => {
  contactModalOpen.value = false;
  selectedPaperForContact.value = null;
};

const getAuthorEmail = (authorId) => {
  return allUsers.value.find(u => u.user_id === authorId)?.email || 'no-email@example.com';
};

const sendEmail = () => {
  const email = getAuthorEmail(selectedPaperForContact.value.author_id);
  const subject = encodeURIComponent(contactForm.value.subject);
  const body = encodeURIComponent(contactForm.value.message);
  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  closeContactModal();
};

const closeDetail = () => {
  detailModalOpen.value = false;
  selectedPaper.value = null;
};

const assignModalOpen = ref(false);
const selectedPaperForAssign = ref(null);
const customDeadline = ref('');

const openAssignModal = (p) => {
  selectedPaperForAssign.value = p;
  
  // Initialize custom deadline with default from settings
  const settings = useState('system_settings').value;
  const deadlineDays = settings?.reviewer?.defaultDeadlineDays || 14;
  const deadlineDate = new Date();
  deadlineDate.setDate(deadlineDate.getDate() + deadlineDays);
  customDeadline.value = deadlineDate.toISOString().split('T')[0];
  
  assignModalOpen.value = true;
};

const closeAssignModal = () => {
  assignModalOpen.value = false;
  selectedPaperForAssign.value = null;
};

const toggleAssignment = async (reviewerId) => {
  const paperId = selectedPaperForAssign.value.paper_id;
  const existing = assignments.value.find(a => a.paper_id === paperId && a.reviewer_id === reviewerId);
  
  try {
    if (existing) {
      // Prevent withdrawal if already completed
      if (existing.status === 'completed') {
        alert('ไม่สามารถถอนการมอบหมายได้ เนื่องจากกรรมการประเมินผลเรียบร้อยแล้ว');
        return;
      }
      
      // Remove
      const { error } = await supabase.from('review_assignments').delete().eq('assignment_id', existing.assignment_id);
      if (error) throw error;
      assignments.value = assignments.value.filter(a => a.assignment_id !== existing.assignment_id);
    } else {
      // Use custom deadline or fallback
      const deadlineStr = customDeadline.value || new Date().toISOString().split('T')[0];

      // Add
      const { data, error } = await supabase.from('review_assignments').insert({
        paper_id: paperId,
        reviewer_id: reviewerId,
        status: 'reviewing',
        deadline: deadlineStr
      }).select();
      
      if (error) throw error;
      assignments.value.push(data[0]);
      alert('มอบหมายงานสำเร็จแล้ว!');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
};

const getReviewerWorkload = (reviewerId) => {
  return assignments.value.filter(a => a.reviewer_id === reviewerId && a.status !== 'completed').length;
};

const downloadFile = async (url) => {
  if (!url) return;
  const displayName = getDisplayFileName(url);
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = displayName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Download failed, falling back to window.open:', error);
    window.open(url, '_blank');
  }
};

const getDisplayFileName = (url) => {
  if (!url) return 'Unknown File';
  try {
    const parsedUrl = new URL(url);
    const nameParam = parsedUrl.searchParams.get('name');
    if (nameParam) {
      return decodeURIComponent(nameParam);
    }
  } catch (e) {
    // Ignore URL parsing errors and fallback
  }
  const parts = url.split('?')[0].split('/');
  const name = decodeURIComponent(parts.pop() || '');
  return name.replace(/_\d{10,13}_/, '_');
};

const downloadPaperFiles = (paper) => {
  if (paper.file_url) {
    const allRounds = paper.file_url.split('|||');
    const latestRound = allRounds[allRounds.length - 1];
    const urls = latestRound.split(',');
    for (const url of urls) {
      if (url) downloadFile(url);
    }
  } else {
    alert('ไม่พบไฟล์บทความ');
  }
};
</script>

<template>
  <ClientOnly>
  <div class="p-8 pb-32 font-['Sarabun','Lato'] animate-fade-in" @click="closeRowMenu">
    
    <!-- DETAIL MODAL (Teleported) -->
    <Teleport to="body">
      <div v-if="detailModalOpen && selectedPaper" class="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="closeDetail"></div>
        <div class="relative w-full max-w-5xl bg-white rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-300">
          
          <!-- Modal Header -->
          <div class="px-10 py-7 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
            <div>
              <h3 class="text-xl font-black text-slate-800">รายละเอียดบทความ</h3>
              <div class="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">รหัสบทความ: {{ selectedPaper.paper_code || selectedPaper.paper_id?.slice(0,8) }}</div>
            </div>
            <button @click="closeDetail" class="w-12 h-12 rounded-full hover:bg-slate-100 flex items-center justify-center transition-all group">
              <X class="w-6 h-6 text-slate-400 group-hover:text-slate-600 group-hover:rotate-90 transition-all duration-300" />
            </button>
          </div>

          <!-- Modal Body -->
          <div class="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10 bg-slate-50/30">
            <!-- MAIN INFO CARD -->
            <div class="bg-white rounded-[24px] p-8 border border-slate-200 shadow-sm relative overflow-hidden">
              <div class="absolute top-8 right-8">
                <span class="px-4 py-1.5 rounded-full text-xs font-black border flex items-center gap-2" :class="paperStatusMeta[getEffectiveStatus(selectedPaper)]?.class || paperStatusMeta.pending_review.class">
                  <span class="w-2 h-2 rounded-full bg-current"></span>
                  {{ paperStatusMeta[getEffectiveStatus(selectedPaper)]?.label || selectedPaper.status || 'รอประเมิน' }}
                </span>
              </div>
              <div class="max-w-4xl">
                <div class="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">รหัสบทความ: {{ selectedPaper.paper_code || selectedPaper.paper_id?.slice(0,8) }}</div>
                <h2 class="text-2xl font-black text-slate-800 leading-tight mb-3">{{ selectedPaper.title_th || 'ระบบจัดการประชุมวิชาการ' }}</h2>
                <div class="text-sm font-bold text-slate-400 mb-8">ชื่อบทความภาษาอังกฤษ: {{ selectedPaper.title_en || '-' }}</div>
                
                <!-- Abstract TH -->
                <div class="space-y-4 mb-8">
                  <h4 class="text-sm font-black text-slate-800 flex items-center gap-2">
                    <div class="w-1 h-4 bg-indigo-500 rounded-full"></div>
                    บทคัดย่อ (ภาษาไทย)
                  </h4>
                  <p class="text-sm leading-relaxed text-slate-600 font-medium whitespace-pre-line">
                    {{ selectedPaper.abstract_th || 'บทความนี้เกี่ยวข้องกับระบบการจัดการประชุมวิชาการ...' }}
                  </p>
                  <div class="text-xs font-bold text-slate-400 italic mt-2">
                    คำสำคัญ: {{ Array.isArray(selectedPaper.keywords) ? selectedPaper.keywords.join(', ') : (typeof selectedPaper.keywords === 'string' ? selectedPaper.keywords : '-') }}
                  </div>
                </div>

                <!-- Abstract EN -->
                <div class="space-y-4">
                  <h4 class="text-sm font-black text-slate-800 flex items-center gap-2">
                    <div class="w-1 h-4 bg-slate-400 rounded-full"></div>
                    Abstract (English)
                  </h4>
                  <p class="text-sm leading-relaxed text-slate-600 font-medium whitespace-pre-line">
                    {{ selectedPaper.abstract_en || 'This paper describes the conference management system...' }}
                  </p>
                  <div class="text-xs font-bold text-slate-400 italic mt-2">
                    Keywords: {{ Array.isArray(selectedPaper.keywords_en) ? selectedPaper.keywords_en.join(', ') : (typeof selectedPaper.keywords_en === 'string' ? selectedPaper.keywords_en : '-') }}
                  </div>
                </div>
              </div>
            </div>

            <!-- OTHER INFO SECTIONS -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <!-- Left Column: Review Results -->
              <div class="space-y-8">
                <section>
                  <h4 class="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck class="w-4 h-4 text-indigo-500" />
                    ผลการประเมิน (Phase 1)
                  </h4>
                  <div class="space-y-3">
                    <div v-for="a in getAssignments(selectedPaper.paper_id)" :key="a.assignment_id" class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <div class="flex justify-between items-center mb-3">
                        <div class="flex items-center gap-3">
                          <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                            <Users class="w-4 h-4" />
                          </div>
                          <span class="text-xs font-black text-slate-700">{{ getReviewerName(a.reviewer_id) }}</span>
                        </div>
                        <div v-if="a.status === 'completed'" class="flex items-center gap-2">
                          <span class="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">Score: {{ a.total_score || 0 }}</span>
                        </div>
                        <div v-else>
                          <span class="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">ยังไม่ประเมิน</span>
                        </div>
                      </div>
                      
                      <!-- Reviewer Comment to Admin -->
                      <div v-if="a.status === 'completed'" class="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div class="text-[9px] font-black text-slate-400 uppercase mb-1">Comment to Admin:</div>
                        <p v-if="a.comment" class="text-[11px] font-bold text-slate-600 leading-relaxed italic">"{{ a.comment }}"</p>
                        <p v-else class="text-[11px] font-bold text-slate-300 leading-relaxed italic">ไม่มีความเห็นเพิ่มเติมจากผู้ทรงคุณวุฒิ</p>
                      </div>
                    </div>
                    
                    <div v-if="getAssignments(selectedPaper.paper_id).length === 0" class="py-10 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                      <History class="w-8 h-8 mb-2 opacity-20" />
                      <div class="text-[10px] font-black opacity-40">ยังไม่มีการมอบหมายงาน</div>
                    </div>
                  </div>
                </section>
              </div>

              <!-- Right Column: Meta Info & File -->
              <div class="space-y-8">
                <section>
                  <h4 class="text-sm font-black text-slate-800 mb-3 uppercase tracking-wider">กลุ่มบทความ</h4>
                  <span class="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 shadow-sm inline-block">
                    {{ selectedPaper.track || 'CS' }}
                  </span>
                </section>

                <section>
                  <h4 class="text-sm font-black text-slate-800 mb-3 uppercase tracking-wider">ข้อมูลผู้นิพนธ์ (Author Profile)</h4>
                  <div v-if="getAuthorProfile(selectedPaper.author_id)" class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                    <div class="flex items-center gap-4">
                      <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Users class="w-6 h-6" />
                      </div>
                      <div>
                        <div class="text-sm font-black text-slate-800">{{ getAuthorName(selectedPaper.author_id) }}</div>
                        <div class="text-[11px] font-bold text-slate-500">{{ getAuthorProfile(selectedPaper.author_id).email }}</div>
                      </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
                      <div>
                        <div class="text-[10px] font-black text-slate-400 uppercase">สถาบัน</div>
                        <div class="text-xs font-bold text-slate-700">{{ getAuthorProfile(selectedPaper.author_id).institution || '-' }}</div>
                      </div>
                      <div>
                        <div class="text-[10px] font-black text-slate-400 uppercase">จังหวัด</div>
                        <div class="text-xs font-bold text-slate-700">{{ getAuthorProfile(selectedPaper.author_id).province || '-' }}</div>
                      </div>
                      <div>
                        <div class="text-[10px] font-black text-slate-400 uppercase">เบอร์โทร</div>
                        <div class="text-xs font-bold text-slate-700">{{ getAuthorProfile(selectedPaper.author_id).phone || '-' }}</div>
                      </div>
                      <div>
                        <div class="text-[10px] font-black text-slate-400 uppercase">ตำแหน่ง</div>
                        <div class="text-xs font-bold text-slate-700">{{ getAuthorProfile(selectedPaper.author_id).academic_position || 'ไม่ระบุ' }}</div>
                      </div>
                    </div>
                  </div>
                  <div v-else class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-sm font-black text-slate-800 text-center">
                    ไม่พบข้อมูลผู้นิพนธ์
                  </div>
                </section>

                <section>
                  <h4 class="text-sm font-black text-slate-800 mb-3 uppercase tracking-wider">ไฟล์บทความ</h4>
                  <div class="space-y-4">
                    <!-- Split files into original and revision -->
                    <template v-if="selectedPaper.file_url">
                      <div v-for="(roundUrls, roundIdx) in selectedPaper.file_url.split('|||')" :key="roundIdx" class="space-y-2">
                        <div class="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          {{ roundIdx === 0 ? 'ไฟล์ส่งครั้งแรก (Original Files)' : 'ไฟล์แก้ไข (Revised Files)' }}
                        </div>
                        <div v-for="(url, fileIdx) in roundUrls.split(',')" :key="fileIdx" class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                          <div class="flex items-center gap-3 min-w-0">
                            <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
                              <FileText class="w-5 h-5" />
                            </div>
                            <div class="text-[13px] font-black text-slate-800 truncate" :title="getDisplayFileName(url)">{{ getDisplayFileName(url) }}</div>
                          </div>
                          <button @click="downloadFile(url)" class="h-9 px-4 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-[11px] font-black flex items-center gap-2 shrink-0 transition-colors">
                            <Download class="w-4 h-4" /> โหลด
                          </button>
                        </div>
                      </div>
                    </template>
                    <div v-else class="text-sm font-black text-slate-400 italic">ไม่พบไฟล์บทความ</div>
                  </div>
                </section>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="px-10 py-7 border-t border-slate-100 bg-white flex items-center justify-end gap-3 shrink-0">
             <button @click="closeDetail" class="h-12 px-10 rounded-xl bg-slate-100 text-slate-600 text-xs font-black hover:bg-slate-200 transition-colors">
              ปิดหน้าต่าง
            </button>
            <button @click="openAssignModal(selectedPaper)" class="h-12 px-10 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition-all">
              <ShieldCheck class="w-4 h-4 mr-2 inline" /> กำหนดผู้ทรงคุณวุฒิ
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ASSIGN REVIEWER MODAL (Teleported) -->
    <Teleport to="body">
      <div v-if="assignModalOpen && selectedPaperForAssign" class="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/70 backdrop-blur-md" @click="closeAssignModal"></div>
        <div class="relative w-full max-w-6xl bg-white rounded-[40px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-300">
          
          <!-- Modal Header -->
          <div class="px-10 py-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
            <div class="flex items-center gap-5">
              <div class="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <UserCheck class="w-7 h-7" />
              </div>
              <div>
                <h3 class="text-2xl font-black text-slate-800">กำหนดผู้ทรงคุณวุฒิ (Assign Reviewer)</h3>
                <div class="text-xs font-bold text-slate-400 mt-1 flex items-center gap-2">
                  <Zap class="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  Smart Match: แนะนำตาม Tags และ workload
                </div>
              </div>
            </div>

            <!-- DEADLINE PICKER -->
            <div class="hidden md:flex flex-col items-end gap-1.5 px-6 border-l border-slate-100">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">กำหนดเดดไลน์ (Deadline)</label>
              <div class="relative">
                <Calendar class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                <input 
                  v-model="customDeadline" 
                  type="date" 
                  class="h-10 pl-9 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <button @click="closeAssignModal" class="w-12 h-12 rounded-full hover:bg-slate-100 flex items-center justify-center transition-all group">
              <X class="w-6 h-6 text-slate-400 group-hover:text-slate-600 group-hover:rotate-90 transition-all duration-300" />
            </button>
          </div>

          <div class="flex-1 overflow-hidden flex flex-col lg:flex-row">
            
            <!-- LEFT: PAPER INFO & CURRENT ASSIGNMENTS -->
            <div class="w-full lg:w-[45%] border-r border-slate-100 overflow-y-auto p-10 custom-scrollbar bg-slate-50/30">
              <div class="space-y-8">
                <!-- PAPER MINI CARD -->
                <div>
                  <h4 class="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">ข้อมูลบทความ</h4>
                  <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                    <div class="flex justify-between items-start mb-4">
                      <span class="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{{ selectedPaperForAssign.paper_code || selectedPaperForAssign.paper_id?.slice(0,8) }}</span>
                      <span class="px-3 py-1 rounded-full text-[9px] font-black border bg-sky-50 text-sky-700 border-sky-100">กำลังประเมิน</span>
                    </div>
                    <h3 class="text-lg font-black text-slate-800 leading-tight mb-4">{{ selectedPaperForAssign.title_th }}</h3>
                    <div class="space-y-2 mb-6">
                      <div class="text-[11px] font-bold text-slate-500 flex items-center gap-2">
                        <span class="text-slate-400">ผู้ส่ง:</span> {{ getAuthorName(selectedPaperForAssign.author_id) }}
                      </div>
                      <div class="text-[11px] font-bold text-slate-500 flex items-center gap-2">
                        <span class="text-slate-400">วันที่ส่ง:</span> {{ formatDateTh(selectedPaperForAssign.created_at) }}
                      </div>
                    </div>
                    <div class="flex flex-wrap gap-2 mb-6">
                      <span v-for="tag in (selectedPaperForAssign.track ? [selectedPaperForAssign.track, 'AI'] : ['Computer Science', 'AI'])" :key="tag" class="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-600 border border-slate-200">{{ tag }}</span>
                    </div>
                    <div class="space-y-2 pt-4 border-t border-slate-50">
                      <div class="flex justify-between items-center text-[10px] font-black">
                        <span class="text-slate-400">Reviewer Progress</span>
                        <span class="text-slate-800">{{ getAssignments(selectedPaperForAssign.paper_id).filter(a => a.status === 'completed').length }}/{{ getAssignments(selectedPaperForAssign.paper_id).length || 0 }} เสร็จสิ้น</span>
                      </div>
                      <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div class="h-full bg-slate-800 rounded-full transition-all duration-500" :style="{ width: `${reviewerProgressPct(selectedPaperForAssign)}%` }"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- CURRENT ASSIGNED REVIEWERS -->
                <div>
                  <h4 class="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">ผู้ทรงคุณวุฒิที่ได้รับมอบหมาย</h4>
                  <div class="space-y-4">
                    <div v-for="a in getAssignments(selectedPaperForAssign.paper_id)" :key="a.assignment_id" class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm group">
                      <div class="flex justify-between items-start mb-4">
                        <div>
                          <div class="text-sm font-black text-slate-800 mb-1">{{ getReviewerName(a.reviewer_id) }}</div>
                          <div class="text-[10px] font-bold text-slate-400">สถานะ: กำลังดำเนินการ</div>
                        </div>
                        <span class="px-3 py-1 rounded-full text-[9px] font-black border" :class="a.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'">
                          {{ a.status === 'completed' ? 'ประเมินแล้ว' : 'รอประเมิน' }}
                        </span>
                      </div>
                      <p v-if="a.comment" class="text-[11px] font-bold text-slate-500 leading-relaxed italic mb-5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        "{{ a.comment }}"
                      </p>
                      <div class="flex gap-2">
                        <button class="flex-1 h-9 rounded-xl bg-indigo-600 text-white text-[10px] font-black hover:bg-indigo-700 transition-colors">เปลี่ยนคน</button>
                        <button 
                          @click="toggleAssignment(a.reviewer_id)" 
                          :disabled="a.status === 'completed'"
                          class="px-4 h-9 rounded-xl border border-slate-200 text-slate-400 text-[10px] font-black transition-all"
                          :class="a.status === 'completed' ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100'"
                        >
                          ถอนมอบหมาย
                        </button>
                      </div>
                    </div>
                    <div v-if="getAssignments(selectedPaperForAssign.paper_id).length === 0" class="py-12 border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center text-slate-400">
                      <Users class="w-10 h-10 mb-3 opacity-20" />
                      <div class="text-xs font-black opacity-40">ยังไม่มีผู้ทรงคุณวุฒิ</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- RIGHT: AVAILABLE REVIEWERS LIST -->
            <div class="flex-1 flex flex-col overflow-hidden bg-white">
              <div class="px-10 py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h4 class="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">รายชื่อ Reviewer (แนะนำก่อน)</h4>
                <div class="text-[10px] font-black text-slate-400">เรียงตาม Tags match และ workload</div>
              </div>
              <div class="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-4">
                <div v-for="r in reviewers" :key="r.user_id" class="p-6 bg-white border border-slate-100 rounded-3xl hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50/50 transition-all flex items-center justify-between group">
                  <div class="flex items-center gap-5">
                    <div class="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                      <Users class="w-7 h-7" />
                    </div>
                    <div>
                      <div class="flex items-center gap-3 mb-1">
                        <span class="text-sm font-black text-slate-800">{{ r.first_name_th }} {{ r.last_name_th }}</span>
                        <span class="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 text-[9px] font-black border border-emerald-100">Match: 1</span>
                      </div>
                      <div class="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-tight">Workload: กำลังตรวจ {{ getReviewerWorkload(r.user_id) }} งาน</div>
                      <div class="flex gap-1.5">
                        <span v-for="tag in (r.expertise || ['Computer Science'])" :key="tag" class="px-2 py-0.5 bg-slate-50 rounded-md text-[9px] font-black text-slate-500 border border-slate-100">{{ tag }}</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    @click="toggleAssignment(r.user_id)" 
                    :disabled="getAssignments(selectedPaperForAssign.paper_id).some(a => a.reviewer_id === r.user_id)"
                    class="h-11 px-8 rounded-2xl text-[11px] font-black transition-all active:scale-95 disabled:bg-slate-100 disabled:text-slate-400"
                    :class="getAssignments(selectedPaperForAssign.paper_id).some(a => a.reviewer_id === r.user_id) ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-indigo-600 shadow-lg shadow-slate-100'"
                  >
                    {{ getAssignments(selectedPaperForAssign.paper_id).some(a => a.reviewer_id === r.user_id) ? 'มอบหมายแล้ว' : 'มอบหมายงาน' }}
                  </button>
                </div>
              </div>
              
              <!-- FOOTER -->
              <div class="px-10 py-8 border-t border-slate-100 bg-white flex items-center justify-end gap-4 shrink-0">
                <button @click="closeAssignModal" class="h-12 px-10 rounded-2xl border border-slate-200 text-slate-600 text-xs font-black hover:bg-slate-50 transition-colors">
                  ปิด
                </button>
                <button @click="closeAssignModal" class="h-12 px-10 rounded-2xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">
                  บันทึกการมอบหมาย
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- CONTACT AUTHOR MODAL (Teleported) -->
    <Teleport to="body">
      <div v-if="contactModalOpen && selectedPaperForContact" class="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="closeContactModal"></div>
        <div class="relative w-full max-w-xl bg-white rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
          
          <div class="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
            <h3 class="text-lg font-black text-slate-800">ติดต่อผู้ส่งบทความ</h3>
            <button @click="closeContactModal" class="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-all group">
              <X class="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:rotate-90 transition-all duration-300" />
            </button>
          </div>

          <div class="p-8 space-y-5">
            <div class="space-y-1.5">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">ถึง (To)</label>
              <div class="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center text-xs font-bold text-slate-600">
                {{ getAuthorEmail(selectedPaperForContact.author_id) }}
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">หัวเรื่อง (Subject)</label>
              <input v-model="contactForm.subject" type="text" class="w-full h-11 px-4 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all" placeholder="ใส่หัวเรื่องอีเมล..." />
            </div>

            <div class="space-y-1.5">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">ข้อความ (Message)</label>
              <textarea v-model="contactForm.message" rows="5" class="w-full p-4 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all resize-none" placeholder="เขียนข้อความของคุณที่นี่..."></textarea>
            </div>
          </div>

          <div class="px-8 py-6 border-t border-slate-100 bg-white flex items-center justify-end gap-3 shrink-0">
            <button @click="closeContactModal" class="h-11 px-8 rounded-xl border border-slate-200 text-slate-600 text-[11px] font-black hover:bg-slate-50 transition-colors">
              ยกเลิก
            </button>
            <button @click="sendEmail" class="h-11 px-8 rounded-xl bg-slate-900 text-white text-[11px] font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-100 flex items-center gap-2">
              ส่งข้อความ
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- HEADER -->
    <div class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h2 class="text-2xl font-black text-slate-800 mb-1">จัดการบทความ (Paper Management)</h2>
        <p class="text-sm text-slate-500 font-en">Academic track and submission control center</p>
      </div>
      <button class="h-10 px-4 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2">
        <Download class="w-4 h-4" /> Export CSV
      </button>
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
    <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-6">
      <div class="flex flex-col lg:flex-row gap-4 items-end">
        <div class="flex-1 space-y-1">
          <label class="text-[11px] font-black text-slate-500 uppercase ml-1">ค้นหา</label>
          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input v-model="query" type="text" placeholder="ID, Title, Author..." class="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
        </div>
        <div class="w-full lg:w-48 space-y-1">
          <label class="text-[11px] font-black text-slate-500 uppercase ml-1">Category</label>
          <select v-model="filterCategory" class="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:outline-none">
            <option value="all">All Tracks</option>
            <option value="เทคโนโลยีภูมิสารสนเทศและภูมิศาสตร์">เทคโนโลยีภูมิสารสนเทศและภูมิศาสตร์</option>
            <option value="เคมี">เคมี</option>
            <option value="วิทยาศาสตร์และเทคโนโลยีสิ่งแวดล้อม">วิทยาศาสตร์และเทคโนโลยีสิ่งแวดล้อม</option>
            <option value="สาธารณสุขศาสตร์">สาธารณสุขศาสตร์</option>
            <option value="สถิติประยุกต์และวิทยาการสารสนเทศ">สถิติประยุกต์และวิทยาการสารสนเทศ</option>
            <option value="ชีววิทยา">ชีววิทยา</option>
            <option value="เทคโนโลยีสารสนเทศ">เทคโนโลยีสารสนเทศ</option>
            <option value="วิทยาการคอมพิวเตอร์">วิทยาการคอมพิวเตอร์</option>
            <option value="คณิตศาสตร์">คณิตศาสตร์</option>
            <option value="วิทยาศาสตร์การกีฬา">วิทยาศาสตร์การกีฬา</option>
            <option value="นวัตกรรมสิ่งทอและการออกแบบ">นวัตกรรมสิ่งทอและการออกแบบ</option>
            <option value="นวัตกรรมอาหารและแปรรูป">นวัตกรรมอาหารและแปรรูป</option>
          </select>
        </div>
        <div class="w-full lg:w-48 space-y-1">
          <label class="text-[11px] font-black text-slate-500 uppercase ml-1">Status</label>
          <select v-model="filterPaperStatus" class="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:outline-none">
            <option value="all">All Status</option>
            <option v-for="(v, k) in paperStatusMeta" :key="k" :value="k">{{ v.label }}</option>
          </select>
        </div>
        <div class="w-full lg:w-32 space-y-1">
          <label class="text-[11px] font-black text-slate-500 uppercase ml-1">Year</label>
          <select v-model="filterYear" class="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:outline-none">
            <option value="all">All Years</option>
            <option v-for="y in yearOptions" :key="y" :value="String(y)">{{ y }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- TABLE -->
    <div class="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm mb-12">
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead class="bg-slate-50/80 border-b border-slate-200">
            <tr class="text-[11px] font-black text-slate-500 uppercase tracking-widest text-left">
              <th class="px-6 py-5">รหัส</th>
              <th class="px-6 py-5">ชื่องานบทความ</th>
              <th class="px-6 py-5">ผู้ส่งบทความ</th>
              <th class="px-6 py-5">กลุ่มบทความ</th>
              <th class="px-6 py-5">ผู้ประเมิน</th>
              <th class="px-6 py-5">สถานะ</th>
              <th class="px-6 py-5">วันที่ส่ง</th>
              <th class="px-6 py-5 text-right">การดำเนินการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="p in filteredPapers" :key="p.paper_id" class="hover:bg-slate-50/50 transition-all group cursor-pointer" @click="openDetail(p)">
              <td class="px-6 py-5 whitespace-nowrap text-xs font-black text-slate-800">{{ p.paper_code || p.paper_id?.slice(0,8) }}</td>
              <td class="px-6 py-5 min-w-[300px] max-w-md">
                <div class="text-sm font-black text-slate-900 leading-tight mb-1">{{ p.title_th }}</div>
                <div v-if="p.title_en" class="text-[11px] font-bold text-slate-400 leading-tight">{{ p.title_en }}</div>
              </td>
              <td class="px-6 py-5 text-xs font-black text-slate-800">{{ getAuthorName(p.author_id) }}</td>
              <td class="px-6 py-5">
                <span class="text-[11px] font-black text-slate-700 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">{{ p.track || 'CS' }}</span>
              </td>
              <td class="px-6 py-5">
                <div v-if="getAssignments(p.paper_id).length > 0" class="space-y-1.5">
                  <div class="text-[11px] font-black text-slate-800">ผู้ประเมิน {{ getAssignments(p.paper_id).length }} คน</div>
                  <div class="flex items-center gap-2">
                    <div class="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div class="h-full bg-slate-800 rounded-full" :style="{ width: `${reviewerProgressPct(p)}%` }"></div>
                    </div>
                    <span class="text-[9px] font-black text-slate-400">({{ getAssignments(p.paper_id).filter(a => a.status === 'completed').length }}/{{ getAssignments(p.paper_id).length }} เสร็จสิ้น)</span>
                  </div>
                </div>
                <div v-else class="text-[10px] font-bold text-rose-400 flex items-center gap-1">
                  <Info class="w-3 h-3" /> ยังไม่มีผู้ประเมิน
                </div>
              </td>
              <td class="px-6 py-5">
                <span class="px-3 py-1.5 rounded-full text-[10px] font-black border inline-flex items-center gap-1.5" :class="paperStatusMeta[getEffectiveStatus(p)]?.class || paperStatusMeta.pending_review.class">
                  <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                  {{ paperStatusMeta[getEffectiveStatus(p)]?.label || p.status || 'รอประเมิน' }}
                </span>
              </td>
              <td class="px-6 py-5 text-xs font-bold text-slate-500">{{ formatDateTh(p.created_at) }}</td>
              <td class="px-6 py-5 text-right relative" @click.stop>
                <button @click.stop="toggleRowMenu(p.paper_id)" class="ml-auto w-10 h-10 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center transition-all active:scale-90">
                  <MoreVertical class="w-5 h-5 text-slate-500" />
                </button>
                <!-- ACTION MENU (MATCHED TO SCREENSHOT) -->
                <div v-if="openMenuId === p.paper_id" class="absolute right-6 top-14 w-72 rounded-[28px] border border-slate-200 bg-white shadow-2xl overflow-hidden z-[100] text-left animate-in fade-in zoom-in duration-200">
                  <div class="px-6 py-3 text-[10px] font-black text-slate-400 bg-slate-50/50 uppercase tracking-widest border-b border-slate-100 text-right">
                    กำหนดสถานะบทความ
                  </div>
                  <div class="p-2 space-y-1">
                    <button @click="updatePaperStatus(p.paper_id, 'accepted')" class="group w-full px-5 py-3 text-sm font-black text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-2xl text-left transition-all duration-300 hover:translate-x-1 active:scale-95 flex items-center justify-between">
                      <span>ยอมรับ</span>
                      <CheckCircle2 class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <button @click="updatePaperStatus(p.paper_id, 'rejected')" class="group w-full px-5 py-3 text-sm font-black text-slate-700 hover:bg-rose-50 hover:text-rose-700 rounded-2xl text-left transition-all duration-300 hover:translate-x-1 active:scale-95 flex items-center justify-between">
                      <span>ปฏิเสธ</span>
                      <X class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <button @click="updatePaperStatus(p.paper_id, 'revision_required')" class="group w-full px-5 py-3 text-sm font-black text-slate-700 hover:bg-amber-50 hover:text-amber-700 rounded-2xl text-left transition-all duration-300 hover:translate-x-1 active:scale-95 flex items-center justify-between">
                      <span>รอผู้แต่งแก้ไข</span>
                      <Zap class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <button @click="updatePaperStatus(p.paper_id, 'published')" class="group w-full px-5 py-3 text-sm font-black text-slate-700 hover:bg-purple-50 hover:text-purple-700 rounded-2xl text-left transition-all duration-300 hover:translate-x-1 active:scale-95 flex items-center justify-between">
                      <span>ตีพิมพ์แล้ว</span>
                      <BookOpen class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </div>



                  <div class="px-6 py-3 text-[10px] font-black text-slate-400 bg-slate-50/50 uppercase tracking-widest border-b border-slate-100 text-right">
                    คำสั่งจัดการ
                  </div>
                  <div class="p-3 space-y-1">
                    <button @click="openDetail(p)" class="w-full px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl text-left flex items-center gap-4 transition-colors">
                      <Eye class="w-4 h-4 text-slate-400" /> ดูรายละเอียด
                    </button>
                    <button @click="openAssignModal(p)" class="w-full px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl text-left flex items-center gap-4 transition-colors">
                      <UserCheck class="w-4 h-4 text-slate-400" /> กำหนดผู้ทรงคุณวุฒิ
                    </button>
                    <button @click="downloadPaperFiles(p)" class="w-full px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl text-left flex items-center gap-4 transition-colors">
                      <Download class="w-4 h-4 text-slate-400" /> ดาวน์โหลดไฟล์
                    </button>
                    <button @click="openContactModal(p)" class="w-full px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl text-left flex items-center gap-4 transition-colors">
                      <Mail class="w-4 h-4 text-slate-400" /> ติดต่อผู้ส่ง
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ANALYTICS SECTION -->
    <div class="mb-8">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
          <Zap class="w-5 h-5" />
        </div>
        <h3 class="text-xl font-black text-slate-800">สถิติเชิงลึก (Analytics)</h3>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div class="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <h4 class="text-sm font-black text-slate-800 mb-8 uppercase tracking-widest">สรุปสถานะ</h4>
          <div class="flex items-center gap-12">
            <div class="relative w-40 h-40 rounded-full border-[12px] border-slate-50 flex items-center justify-center">
               <div class="text-2xl font-black text-slate-800">{{ filteredPapers.length }}</div>
            </div>
            <div class="flex-1 space-y-4">
              <div v-for="s in statusCounts" :key="s.label" class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: s.color }"></div>
                  <span class="text-xs font-bold text-slate-600">{{ s.label }}</span>
                </div>
                <span class="text-xs font-black text-slate-800 tabular-nums">{{ s.value }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <h4 class="text-sm font-black text-slate-800 mb-8 uppercase tracking-widest">หมวดหมู่ยอดนิยม</h4>
          <div class="space-y-6">
            <div v-for="c in categoryStats" :key="c.label" class="space-y-2">
              <div class="flex justify-between items-end">
                <span class="text-xs font-black text-slate-700 uppercase">{{ c.label }}</span>
                <span class="text-xs font-black text-slate-900">{{ c.value }}</span>
              </div>
              <div class="h-4 bg-slate-50 rounded-full overflow-hidden">
                <div class="h-full bg-slate-700 transition-all duration-1000" :style="{ width: `${(c.value / (categoryStats[0]?.value || 1)) * 100}%` }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  </ClientOnly>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
</style>
