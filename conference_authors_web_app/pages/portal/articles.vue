<script setup>
definePageMeta({ layout: 'portal' });
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Search, Plus, Edit, Eye, Download, CreditCard, Trash2, Clock, CheckCircle, AlertCircle, XCircle, ChevronDown, Calendar, FileText, UploadCloud, X, ArrowLeft, User } from 'lucide-vue-next';
import { useAuth } from '~/composables/useAuth';
import { useSupabase } from '~/composables/useSupabase';

const router = useRouter();
const { userProfile } = useAuth();
const supabase = useSupabase();

const searchQuery = ref('');
const statusFilter = ref('all');
const yearFilter = ref('all');
const currentPage = ref(1);
const articles = ref([]);
const isLoading = ref(true);
const toast = ref(null);

const selectedArticle = ref(null);
const uploadModalOpen = ref(false);
const uploadArticle = ref(null);
const uploadFile = ref(null);
const uploadError = ref('');
const isUploading = ref(false);

const detailMode = ref(null); // 'accepted', 'pending', 'revision', 'rejected'
const detailArticle = ref(null);

const articlesPerPage = 10;

const showToast = (message, tone = 'ok') => {
  toast.value = { message, tone };
  setTimeout(() => { toast.value = null; }, 3000);
};

const submissionCloseDate = ref(null);
const revisionDeadlineDate = ref(null);

const isPastSubmissionDeadline = computed(() => {
  if (!submissionCloseDate.value) return false;
  return new Date() > new Date(submissionCloseDate.value);
});

const isPastRevisionDeadline = computed(() => {
  if (!revisionDeadlineDate.value) return false;
  return new Date() > new Date(revisionDeadlineDate.value);
});

const fetchArticles = async () => {
  if (!userProfile.value) {
    isLoading.value = false;
    return;
  }
  isLoading.value = true;
  try {
    const [papersRes, settingsRes] = await Promise.all([
      supabase.from('papers').select('*').eq('author_id', userProfile.value.user_id).order('created_at', { ascending: false }),
      supabase.from('system_settings').select('config_json').eq('id', 1).maybeSingle()
    ]);
    
    if (papersRes.error) throw papersRes.error;
    articles.value = papersRes.data || [];

    if (settingsRes.data?.config_json?.conference?.dates) {
      const d = settingsRes.data.config_json.conference.dates;
      submissionCloseDate.value = d.submissionClose || null;
      revisionDeadlineDate.value = d.revisionDeadline || null;
    }
  } catch (error) {
    console.error('Fetch Error:', error);
    showToast('Failed to fetch articles: ' + (error.message || ''), 'err');
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  if (userProfile.value) {
    await fetchArticles();
  }
});

watch(userProfile, async (newProfile) => {
  if (newProfile) {
    await fetchArticles();
  }
}, { immediate: true });

const yearOptions = computed(() => {
  const years = new Set();
  const currentYear = new Date().getFullYear();
  years.add(currentYear);
  
  articles.value.forEach(article => {
    if (article.created_at) {
      const y = new Date(article.created_at).getFullYear();
      if (y) years.add(y);
    }
  });

  const sortedYears = Array.from(years).sort((a, b) => b - a);
  return [
    { value: 'all', label: 'ทุกปี' },
    ...sortedYears.map(y => ({ value: String(y), label: String(y) }))
  ];
});

const normalizeYearToAD = (year) => {
  if (!year || year === 'all') return year;
  const n = Number(year);
  if (Number.isNaN(n)) return year;
  return n > 2400 ? String(n - 543) : String(n);
};

const extractYearFromDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return String(d.getFullYear());
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  // Use Gregory calendar for A.D. year with Thai locale for month names
  return d.toLocaleDateString('th-TH-u-ca-gregory', { year: 'numeric', month: 'short', day: 'numeric' });
};

const filteredArticles = computed(() => {
  return articles.value.filter(article => {
    const title = article.title_th || article.title_en || '';
    const pid = article.paper_code || article.paper_id || '';
    
    const matchesSearch = pid.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                         title.toLowerCase().includes(searchQuery.value.toLowerCase());
    
    const matchesStatus = statusFilter.value === 'all' || article.status === statusFilter.value;
    
    const matchesYear = (() => {
      if (yearFilter.value === 'all') return true;
      const adYearFilter = normalizeYearToAD(yearFilter.value);
      const articleYear = extractYearFromDate(article.created_at);
      return articleYear === adYearFilter;
    })();
    
    return matchesSearch && matchesStatus && matchesYear;
  });
});

const totalPages = computed(() => Math.ceil(filteredArticles.value.length / articlesPerPage));
const currentArticles = computed(() => {
  const start = (currentPage.value - 1) * articlesPerPage;
  return filteredArticles.value.slice(start, start + articlesPerPage);
});

const openDetail = (mode, article) => {
  detailArticle.value = article;
  detailMode.value = mode;
};

const closeDetail = () => {
  detailMode.value = null;
  detailArticle.value = null;
};

const getStatusConfig = (status) => {
  const config = {
    draft: { icon: Edit, color: 'bg-slate-100 text-slate-700 border-slate-200', label: 'ร่าง' },
    pending: { icon: Clock, color: 'bg-yellow-50 text-yellow-700 border-yellow-200', label: 'รอตรวจ' },
    revision: { icon: AlertCircle, color: 'bg-orange-50 text-orange-700 border-orange-200', label: 'แก้ไข' },
    accepted: { icon: CheckCircle, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'ผ่าน' },
    published: { icon: CheckCircle, color: 'bg-blue-50 text-blue-700 border-blue-200', label: 'ตีพิมพ์' },
    rejected: { icon: XCircle, color: 'bg-rose-50 text-rose-700 border-rose-200', label: 'ไม่ผ่าน' }
  };
  return config[status] || config.pending;
};

const confirmModalOpen = ref(false);
const articleToWithdraw = ref(null);
const isWithdrawing = ref(false);

const handleAction = async (action, article) => {
  if (action === 'withdraw') {
    articleToWithdraw.value = article;
    confirmModalOpen.value = true;
  } else if (action === 'download') {
    if (article.file_url) {
      window.open(article.file_url, '_blank');
    } else {
      showToast('ไม่พบไฟล์บทความ', 'err');
    }
  }
};

const executeWithdraw = async () => {
  if (!articleToWithdraw.value) return;
  isWithdrawing.value = true;
  const { error } = await supabase.from('papers').delete().eq('paper_id', articleToWithdraw.value.paper_id);
  isWithdrawing.value = false;
  
  if (!error) {
    showToast('ถอนบทความสำเร็จ');
    await fetchArticles();
    closeDetail();
    confirmModalOpen.value = false;
    articleToWithdraw.value = null;
  } else {
    showToast('ไม่สามารถถอนบทความได้: ' + error.message, 'err');
    confirmModalOpen.value = false;
  }
};

const closeUploadModal = () => {
  uploadModalOpen.value = false;
  uploadArticle.value = null;
  uploadFile.value = null;
  uploadError.value = '';
  isUploading.value = false;
};

const validateUploadFile = (file) => {
  if (!file) return '';
  const maxBytes = 20 * 1024 * 1024;
  const ext = String(file.name || '').split('.').pop()?.toLowerCase();
  const allowed = new Set(['pdf', 'doc', 'docx']);

  if (!allowed.has(ext)) return 'รองรับเฉพาะไฟล์ .pdf, .doc, .docx';
  if (file.size > maxBytes) return 'ขนาดไฟล์ต้องไม่เกิน 20MB';
  return '';
};

const handlePickUploadFile = (e) => {
  const file = e.target.files?.[0];
  const err = validateUploadFile(file);
  uploadError.value = err;
  uploadFile.value = err ? null : file;
};

const openUploadModalForArticle = (article) => {
  uploadArticle.value = article;
  uploadModalOpen.value = true;
  uploadFile.value = null;
  uploadError.value = '';
  isUploading.value = false;
};

const confirmUpload = async () => {
  if (!uploadArticle.value) return;
  const err = validateUploadFile(uploadFile.value);
  if (err) {
    uploadError.value = err;
    return;
  }

  isUploading.value = true;
  uploadError.value = '';
  
  try {
    const fileExt = uploadFile.value.name.split('.').pop();
    const fileName = `${uploadArticle.value.paper_code || uploadArticle.value.paper_id}_revision_${Math.random()}.${fileExt}`;
    const filePath = `revisions/${fileName}`;
    
    const { error: uploadErr } = await supabase.storage
      .from('papers')
      .upload(filePath, uploadFile.value);
      
    if (uploadErr) throw uploadErr;
    
    const { data: { publicUrl } } = supabase.storage.from('papers').getPublicUrl(filePath);
    
    const { error: updateErr } = await supabase
      .from('papers')
      .update({ file_url: publicUrl, status: 'pending' })
      .eq('id', uploadArticle.value.id);
      
    if (updateErr) throw updateErr;

    showToast('อัปโหลดไฟล์แก้ไขสำเร็จ');
    await fetchArticles();
    closeUploadModal();
  } catch (e) {
    uploadError.value = 'อัปโหลดไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
  } finally {
    isUploading.value = false;
  }
};

const getPrimaryAction = (article) => {
  switch (article.status) {
    case 'revision':
      return { label: 'อัปโหลดไฟล์แก้ไข', icon: UploadCloud, onClick: () => openUploadModalForArticle(article), variant: 'orange' };
    case 'accepted':
      return { label: 'ดาวน์โหลดบทความ', icon: Download, onClick: () => handleAction('download', article), variant: 'slate' };
    case 'pending':
      return { label: 'ดูรายละเอียดบทความ', icon: Eye, onClick: () => openDetail('pending', article), variant: 'slate' };
    case 'rejected':
      return { label: 'ดูรายละเอียดบทความ', icon: Eye, onClick: () => openDetail('rejected', article), variant: 'slate' };
    default:
      return { label: 'ดูรายละเอียดบทความ', icon: Eye, onClick: () => openDetail('pending', article), variant: 'slate' };
  }
};

const getSecondaryAction = (article) => {
  switch (article.status) {
    case 'revision':
      return { label: 'ดูรายละเอียด', icon: Eye, onClick: () => openDetail('revision', article) };
    case 'accepted':
      return { label: 'ดูรายละเอียด', icon: Eye, onClick: () => openDetail('accepted', article) };
    case 'pending':
      return { label: 'ถอนบทความ', icon: Trash2, onClick: () => handleAction('withdraw', article), danger: true };
    default:
      return null;
  }
};

const getAuthorName = (article) => {
  if (userProfile.value) {
    return [userProfile.value.first_name_th, userProfile.value.last_name_th].filter(Boolean).join(' ') || userProfile.value.email;
  }
  return 'ผู้ส่งบทความ';
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 font-['Sarabun'] max-w-7xl mx-auto animate-in fade-in duration-500">
    <div class="px-4 sm:px-6 lg:px-8 py-8 md:py-10">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 border border-white/20">
            <FileText class="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 class="text-2xl font-black text-slate-900 leading-tight tracking-tight">บทความของฉัน</h1>
            <p class="text-[14px] font-semibold text-slate-500 mt-0.5">จัดการและติดตามสถานะบทความของคุณทั้งหมดได้ที่นี่</p>
          </div>
        </div>
        <button
          @click="router.push('/portal/submit')"
          class="h-12 px-6 rounded-2xl bg-white border border-slate-200 text-purple-700 shadow-sm hover:shadow-md hover:border-purple-200 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 font-black text-[14px]"
          aria-label="ส่งบทความใหม่"
        >
          <Plus :size="18" />
          <span>ส่งบทความใหม่</span>
        </button>
      </div>

      <div class="bg-white/80 backdrop-blur-xl rounded-[28px] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 mb-8">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          <div class="relative lg:col-span-5 group">
            <Search :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
            <input
              type="text"
              v-model="searchQuery"
              placeholder="ค้นหาชื่อ/รหัสบทความ..."
              class="w-full h-12 pl-11 pr-4 rounded-[18px] bg-slate-50/50 border border-slate-200 text-[14px] font-semibold text-slate-800 focus:outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100/50 transition-all placeholder:font-medium placeholder:text-slate-400"
            />
          </div>

          <div class="lg:col-span-5">
            <div class="w-full bg-slate-50/50 rounded-[20px] p-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar border border-slate-200">
              <button
                v-for="t in [{ value: 'all', label: 'ทั้งหมด' }, { value: 'revision', label: 'รอแก้ไข' }, { value: 'accepted', label: 'ผ่าน' }, { value: 'pending', label: 'รอพิจารณา' }, { value: 'rejected', label: 'ปฏิเสธ' }]"
                :key="t.value"
                @click="statusFilter = t.value"
                :class="[
                  'h-9 px-5 rounded-[14px] text-[13px] font-black whitespace-nowrap transition-all duration-300',
                  statusFilter === t.value ? 'bg-white text-purple-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
                ]"
              >
                {{ t.label }}
              </button>
            </div>
          </div>

          <div class="relative lg:col-span-2 group">
            <select
              v-model="yearFilter"
              class="w-full h-12 pl-4 pr-10 rounded-[18px] bg-slate-50/50 border border-slate-200 text-[14px] font-bold text-slate-700 focus:outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100/50 appearance-none cursor-pointer transition-all"
            >
              <option v-for="option in yearOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <ChevronDown :size="16" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-focus-within:text-purple-500 transition-colors" />
          </div>
        </div>
      </div>

      <div class="bg-white/80 backdrop-blur-xl rounded-[32px] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div class="px-8 py-6 border-b border-slate-100/60 flex items-center justify-between gap-4">
          <h2 class="text-[15px] font-black text-slate-800 tracking-wide uppercase">รายการบทความ</h2>
          <div class="text-[13px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{{ filteredArticles.length }} รายการ</div>
        </div>
        
        <div v-if="isLoading" class="p-16 flex justify-center">
          <div class="w-12 h-12 rounded-2xl border-4 border-slate-100 border-t-purple-600 animate-spin"></div>
        </div>
        <div v-else-if="currentArticles.length === 0" class="p-16 text-center flex flex-col items-center">
          <div class="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
            <Search class="w-8 h-8" />
          </div>
          <p class="text-[15px] font-black text-slate-900 mb-1">ไม่พบบทความ</p>
          <p class="text-[13px] font-medium text-slate-500">ลองเปลี่ยนตัวกรองหรือคำค้นหา</p>
        </div>
        <div v-else class="p-8">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div
              v-for="article in currentArticles"
              :key="article.id"
              class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm hover:shadow-xl hover:border-purple-200 hover:-translate-y-1 transition-all duration-300 group"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="text-[11px] font-black text-slate-400 tracking-widest font-['Lato']">#{{ article.paper_code || article.paper_id?.slice(0, 8) }}</div>
                  <h3 class="mt-2 text-[16px] font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-purple-700 transition-colors">
                    {{ article.title_th || article.title_en }}
                  </h3>
                  <div class="mt-3 flex items-center gap-2 text-[12px] font-bold text-slate-500 uppercase tracking-wider font-['Lato']">
                    <Calendar :size="14" class="text-slate-400" />
                    <span>{{ formatDate(article.created_at) }}</span>
                  </div>
                </div>
                <div class="flex-shrink-0">
                  <span :class="['inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black border uppercase tracking-wider', getStatusConfig(article.status).color]">
                    <component :is="getStatusConfig(article.status).icon" :size="12" />
                    {{ getStatusConfig(article.status).label }}
                  </span>
                </div>
              </div>

              <div class="mt-6 flex gap-3">
                <button
                  type="button"
                  @click="getPrimaryAction(article).onClick()"
                  :class="[
                    'flex-1 h-12 rounded-[18px] font-black text-[13px] transition-all duration-300 shadow-sm hover:shadow-md inline-flex items-center justify-center gap-2',
                    getPrimaryAction(article).variant === 'orange' ? 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 hover:border-orange-300' :
                    getPrimaryAction(article).variant === 'emerald' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300' :
                    'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  ]"
                >
                  <component :is="getPrimaryAction(article).icon" :size="16" />
                  {{ getPrimaryAction(article).label }}
                </button>

                <button
                  v-if="getSecondaryAction(article)"
                  type="button"
                  @click="getSecondaryAction(article).onClick()"
                  :class="[
                    'flex-1 h-12 rounded-[18px] font-black text-[13px] transition-all duration-300 shadow-sm hover:shadow-md inline-flex items-center justify-center gap-2',
                    getSecondaryAction(article).danger ? 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  ]"
                >
                  <component :is="getSecondaryAction(article).icon" :size="16" />
                  {{ getSecondaryAction(article).label }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-8">
        <button 
          @click="currentPage = Math.max(currentPage - 1, 1)"
          :disabled="currentPage === 1"
          class="w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronDown :size="18" class="rotate-90" />
        </button>
        <button
          v-for="index in totalPages"
          :key="index"
          @click="currentPage = index"
          :class="[
            'w-10 h-10 rounded-xl text-[14px] font-black transition-all duration-300',
            currentPage === index ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30 border border-purple-600' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          ]"
        >
          {{ index }}
        </button>
        <button 
          @click="currentPage = Math.min(currentPage + 1, totalPages)"
          :disabled="currentPage === totalPages"
          class="w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronDown :size="18" class="-rotate-90" />
        </button>
      </div>
    </div>

    <!-- Upload Modal -->
    <div v-if="uploadModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button @click="closeUploadModal" class="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      <div class="relative w-full max-w-lg rounded-[28px] bg-white shadow-2xl">
        <div class="flex items-center justify-between px-7 pt-6">
          <div>
            <div class="text-lg font-extrabold text-slate-900">อัปโหลดไฟล์แก้ไข</div>
            <div v-if="uploadArticle" class="mt-1 text-xs font-semibold text-slate-500">#{{ uploadArticle.paper_code || uploadArticle.paper_id?.slice(0, 8) }}</div>
          </div>
          <button @click="closeUploadModal" class="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-white transition-colors">
            <X :size="18" class="text-slate-600" />
          </button>
        </div>

        <div class="px-7 pb-7 pt-5">
          <label class="block rounded-[22px] border border-slate-200 bg-slate-50/50 p-5 cursor-pointer hover:bg-white transition-colors">
            <input type="file" class="hidden" accept=".pdf,.doc,.docx" @change="handlePickUploadFile" />
            <div class="flex flex-col items-center text-center">
              <div class="w-20 h-20 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                <UploadCloud :size="28" class="text-orange-500" />
              </div>
              <div class="mt-4 text-sm font-extrabold text-slate-900">ลากไฟล์มาวาง หรือคลิกเพื่อเลือกไฟล์</div>
              <div class="mt-1 text-xs font-semibold text-slate-500">รองรับเฉพาะไฟล์ .pdf และ .docx (ไม่เกิน 20MB)</div>

              <div class="mt-4 w-full">
                <div v-if="uploadFile" class="w-full rounded-2xl bg-white border border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <div class="text-xs font-extrabold text-slate-800 truncate">{{ uploadFile.name }}</div>
                    <div class="text-[11px] font-semibold text-slate-500">{{ (uploadFile.size / (1024 * 1024)).toFixed(2) }} MB</div>
                  </div>
                  <button @click.prevent="uploadFile = null; uploadError = '';" class="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-white">
                    <Trash2 :size="16" class="text-slate-600" />
                  </button>
                </div>
              </div>
            </div>
          </label>

          <div v-if="uploadError" class="mt-3 text-xs font-bold text-rose-600">{{ uploadError }}</div>
          <div v-if="isPastRevisionDeadline" class="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-center gap-2">
            <AlertCircle :size="14" class="text-amber-600" />
            <span class="text-[11px] font-bold text-amber-700">ส่งผลงานแก้ไขหลังกำหนด ({{ formatDate(revisionDeadlineDate) }})</span>
          </div>

          <button
            @click="confirmUpload"
            :disabled="!uploadFile || Boolean(uploadError) || isUploading"
            class="mt-6 w-full h-12 rounded-2xl bg-slate-900 text-white font-extrabold text-sm shadow-xl shadow-slate-300/60 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isUploading ? 'กำลังอัปโหลด...' : 'ยืนยันการส่งไฟล์' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="detailMode && detailArticle" class="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
      <button @click="closeDetail" class="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div class="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl bg-white sm:rounded-[28px] shadow-2xl overflow-hidden flex flex-col">
        <div class="sticky top-0 bg-white/90 backdrop-blur border-b border-slate-100 px-5 py-4 flex items-center gap-3">
          <button @click="closeDetail" class="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
            <ArrowLeft :size="18" class="text-slate-700" />
          </button>
          <div class="min-w-0">
            <div class="text-sm font-extrabold text-slate-900 truncate">รายละเอียดบทความ</div>
            <div class="text-[11px] font-semibold text-slate-500 truncate">#{{ detailArticle.paper_code || detailArticle.paper_id?.slice(0, 8) }}</div>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto custom-scrollbar">
          <div class="px-5 pt-5 pb-7">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="inline-flex items-center gap-2 rounded-2xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700">
                  <FileText :size="14" class="text-slate-500" /> ID: {{ detailArticle.paper_code || detailArticle.paper_id?.slice(0, 8) }}
                </span>
                <span v-if="detailArticle.track" class="inline-flex items-center rounded-2xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700">
                  {{ detailArticle.track }}
                </span>
              </div>
              <div class="flex-shrink-0">
                <span :class="['inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border', getStatusConfig(detailArticle.status).color]">
                  <component :is="getStatusConfig(detailArticle.status).icon" :size="12" />
                  {{ getStatusConfig(detailArticle.status).label }}
                </span>
              </div>
            </div>

            <h2 class="mt-4 text-xl font-extrabold text-slate-900 leading-tight">
              {{ detailArticle.title_th || detailArticle.title_en }}
            </h2>

            <!-- Revision specific banner -->
            <div v-if="detailMode === 'revision'" class="mt-4 flex items-center gap-2 flex-wrap">
              <span class="inline-flex items-center gap-2 rounded-2xl bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1.5 text-xs font-extrabold">
                <AlertCircle :size="14" /> กรุณาแก้ไขและอัปโหลดใหม่
              </span>
            </div>

            <!-- Rejected specific banner -->
            <div v-if="detailMode === 'rejected'" class="mt-4 rounded-[22px] border border-rose-200 bg-rose-50 p-4">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-2xl bg-white/70 border border-rose-200 flex items-center justify-center">
                  <XCircle :size="18" class="text-rose-600" />
                </div>
                <div class="min-w-0">
                  <div class="text-sm font-extrabold text-rose-800">ไม่ผ่านการพิจารณา</div>
                </div>
              </div>
            </div>

            <div class="mt-5">
              <div class="text-[11px] font-extrabold tracking-[0.14em] text-slate-400">AUTHOR INFORMATION</div>
              <div class="mt-3 rounded-[22px] border border-slate-200 bg-white p-4">
                <div class="flex items-start gap-3">
                  <div class="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                    <User :size="18" class="text-slate-600" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <span class="inline-flex items-center rounded-full bg-slate-900 text-white px-2.5 py-1 text-[10px] font-extrabold">Corresponding</span>
                      <div class="text-sm font-extrabold text-slate-900 truncate">
                        {{ getAuthorName(detailArticle) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-6">
              <div class="text-[11px] font-extrabold tracking-[0.14em] text-slate-400">CONTENT & FILES</div>
              <div class="mt-3 rounded-[22px] border border-slate-200 bg-white p-4">
                <div class="flex items-center gap-2">
                  <FileText :size="16" class="text-slate-600" />
                  <div class="text-sm font-extrabold text-slate-900">บทคัดย่อ (Abstract)</div>
                </div>
                <p class="mt-2 text-sm text-slate-500 leading-relaxed whitespace-pre-wrap">
                  {{ detailArticle.abstract_th || detailArticle.abstract_en || '—' }}
                </p>

                <div v-if="detailArticle.file_url" class="mt-5 rounded-[20px] bg-slate-900 text-white px-4 py-4 flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <div class="text-xs font-extrabold truncate">ไฟล์บทความ</div>
                  </div>
                  <button
                    @click="handleAction('download', detailArticle)"
                    class="w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 flex items-center justify-center transition-colors"
                  >
                    <Download :size="18" class="text-white" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Reviewer Comments -->
            <div v-if="(detailMode === 'revision' || detailMode === 'accepted' || detailMode === 'rejected')" class="mt-6">
              <div class="text-[11px] font-extrabold tracking-[0.14em] text-slate-400">REVIEWER COMMENTS</div>
              <div class="mt-3 space-y-3">
                <div class="rounded-[22px] border border-slate-200 bg-white p-4">
                  <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {{ detailArticle.reviewer_comments || 'ไม่มีความเห็นจากผู้ทรงคุณวุฒิ' }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Contextual Actions -->
            <div v-if="detailMode === 'revision'" class="mt-8">
              <button
                @click="openUploadModalForArticle(detailArticle)"
                class="w-full h-14 rounded-2xl bg-orange-600 text-white font-black text-[15px] shadow-lg shadow-orange-200/60 hover:bg-orange-700 transition-all active:scale-[0.98] inline-flex items-center justify-center gap-2"
              >
                <UploadCloud :size="20" />
                อัปโหลดไฟล์แก้ไข
              </button>
            </div>

            <div v-if="detailMode === 'pending'" class="mt-8">
              <button
                @click="handleAction('withdraw', detailArticle)"
                class="w-full h-12 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 font-extrabold text-sm hover:bg-rose-100 transition-all active:scale-[0.98] inline-flex items-center justify-center gap-2"
              >
                <Trash2 :size="18" />
                ถอนบทความ
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
    
    <!-- Confirm Withdraw Modal -->
    <div v-if="confirmModalOpen" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button @click="confirmModalOpen = false" class="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div class="relative w-full max-w-sm bg-white rounded-[28px] shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
        <div class="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
          <Trash2 class="w-8 h-8 text-rose-600" />
        </div>
        <h3 class="text-lg font-black text-slate-900 mb-2">ยืนยันการถอนบทความ?</h3>
        <p class="text-sm font-semibold text-slate-500 mb-6 leading-relaxed">
          หากถอนบทความนี้แล้ว ข้อมูลทั้งหมดจะถูกลบออกจากระบบและไม่สามารถกู้คืนได้ คุณแน่ใจหรือไม่?
        </p>
        <div class="flex gap-3">
          <button
            @click="confirmModalOpen = false"
            class="flex-1 h-12 rounded-[16px] bg-slate-50 border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 transition-colors"
            :disabled="isWithdrawing"
          >
            ยกเลิก
          </button>
          <button
            @click="executeWithdraw"
            :disabled="isWithdrawing"
            class="flex-1 h-12 rounded-[16px] bg-rose-600 text-white font-black hover:bg-rose-700 shadow-lg shadow-rose-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span v-if="isWithdrawing" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ยืนยันการถอน
          </button>
        </div>
      </div>
    </div>

    <!-- Global Toast -->
    <div
      v-if="toast"
      :class="[
        'fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 transition-all animate-in fade-in slide-in-from-top-4',
        toast.tone === 'err' ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
      ]"
    >
      <AlertCircle v-if="toast.tone === 'err'" class="w-5 h-5 text-rose-600" />
      <CheckCircle v-else class="w-5 h-5 text-emerald-600" />
      <span class="text-sm font-bold">{{ toast.message }}</span>
    </div>
  </div>
</template>
