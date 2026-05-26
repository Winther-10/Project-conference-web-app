<script setup>
definePageMeta({ layout: 'portal' });
import { ref, reactive, onMounted, computed, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, Plus, Check, FileText, Users, 
  UploadCloud, Send, X, FileUp, AlertCircle, Trash2, GripVertical,
  ChevronDown, Search, GraduationCap, UserPlus, FileImage
} from 'lucide-vue-next';
import { useAuth } from '~/composables/useAuth';
import { useSupabase } from '~/composables/useSupabase';
import { useNotifications } from '~/composables/useNotifications';
import { PREFIXES, THAI_UNIVERSITIES } from '~/utils/constants';

const Rocket = Send;

const router = useRouter();
const { userProfile } = useAuth();
const supabase = useSupabase();
const { createNotification } = useNotifications();

const currentStep = ref(1);
const steps = [
  { id: 1, label: 'ข้อมูลทั่วไป' },
  { id: 2, label: 'ผู้แต่ง' },
  { id: 3, label: 'บทคัดย่อ' },
  { id: 4, label: 'อัปโหลดไฟล์' },
];

// ========== Author Management ==========
const AUTHOR_ROLES = [
  'First Author (ผู้เขียนชื่อแรก / ผู้เขียนหลัก)',
  'Corresponding Author (ผู้เขียนประสานงาน / ผู้รับผิดชอบบทความ)',
  'Co-Author / Co-Researcher (ผู้เขียนร่วม / ผู้ร่วมวิจัย)',
  'Senior Author / Last Author (ผู้เขียนลำดับสุดท้าย)',
];

const showAuthorForm = ref(false);
const editingAuthorIdx = ref(-1);
const authorForm = reactive({
  prefix: '', firstName: '', lastName: '', email: '', institution: '', role: AUTHOR_ROLES[2], isPresenting: false
});

// Searchable dropdown states
const prefixSearch = ref('');
const prefixDropdownOpen = ref(false);
const instSearch = ref('');
const instDropdownOpen = ref(false);

const filteredPrefixes = computed(() => {
  const q = prefixSearch.value.toLowerCase();
  if (!q) return PREFIXES;
  return PREFIXES.filter(p => p.toLowerCase().includes(q));
});

const filteredInstitutions = computed(() => {
  const q = instSearch.value.toLowerCase();
  if (!q) return THAI_UNIVERSITIES;
  return THAI_UNIVERSITIES.filter(u => u.toLowerCase().includes(q));
});

const selectPrefix = (val) => {
  authorForm.prefix = val;
  prefixSearch.value = val;
  prefixDropdownOpen.value = false;
};

const selectInstitution = (val) => {
  authorForm.institution = val;
  instSearch.value = val;
  instDropdownOpen.value = false;
};

const resetAuthorForm = () => {
  authorForm.prefix = ''; authorForm.firstName = ''; authorForm.lastName = '';
  authorForm.email = ''; authorForm.institution = ''; authorForm.role = AUTHOR_ROLES[2];
  authorForm.isPresenting = false;
  prefixSearch.value = ''; instSearch.value = '';
  editingAuthorIdx.value = -1;
  showAuthorForm.value = false;
};

const openAddAuthorForm = () => {
  resetAuthorForm();
  showAuthorForm.value = true;
};

const openEditAuthorForm = (idx) => {
  const a = formData.authors[idx];
  authorForm.prefix = a.prefix; authorForm.firstName = a.firstName;
  authorForm.lastName = a.lastName; authorForm.email = a.email;
  authorForm.institution = a.institution; authorForm.role = a.role;
  authorForm.isPresenting = a.isPresenting || false;
  prefixSearch.value = a.prefix; instSearch.value = a.institution;
  editingAuthorIdx.value = idx;
  showAuthorForm.value = true;
};

const saveAuthor = () => {
  if (!authorForm.firstName.trim() || !authorForm.lastName.trim() || !authorForm.institution.trim()) return;
  const entry = { ...authorForm };
  if (editingAuthorIdx.value >= 0) {
    formData.authors[editingAuthorIdx.value] = entry;
  } else {
    formData.authors.push(entry);
  }
  resetAuthorForm();
};

const removeAuthor = (idx) => { formData.authors.splice(idx, 1); };
const moveAuthor = (idx, dir) => {
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= formData.authors.length) return;
  const tmp = formData.authors[idx];
  formData.authors[idx] = formData.authors[newIdx];
  formData.authors[newIdx] = tmp;
};



// Close dropdowns on outside click
onMounted(() => {
  window.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown-container')) {
      prefixDropdownOpen.value = false;
      instDropdownOpen.value = false;
      advPrefixDropdownOpen.value = false;
      advInstDropdownOpen.value = false;
      advRoleDropdownOpen.value = false;
    }
  });
});

// ========== Advisor Section ==========
const advisors = reactive([]);
const showAdvisorForm = ref(false);
const advisorForm = reactive({ prefix: '', firstName: '', lastName: '', institution: '', role: 'อาจารย์ที่ปรึกษาหลัก', email: '' });
const advPrefixSearch = ref('');
const advPrefixDropdownOpen = ref(false);
const advInstSearch = ref('');
const advInstDropdownOpen = ref(false);
const advRoleSearch = ref('อาจารย์ที่ปรึกษาหลัก');
const advRoleDropdownOpen = ref(false);

const ADV_ROLES = ['อาจารย์ที่ปรึกษาหลัก', 'อาจารย์ที่ปรึกษาร่วม', 'ที่ปรึกษา'];

const filteredAdvPrefixes = computed(() => {
  const q = advPrefixSearch.value.toLowerCase();
  if (!q) return PREFIXES;
  return PREFIXES.filter(p => p.toLowerCase().includes(q));
});
const filteredAdvInstitutions = computed(() => {
  const q = advInstSearch.value.toLowerCase();
  if (!q) return THAI_UNIVERSITIES;
  return THAI_UNIVERSITIES.filter(u => u.toLowerCase().includes(q));
});
const filteredAdvRoles = computed(() => {
  const q = advRoleSearch.value.toLowerCase();
  if (!q) return ADV_ROLES;
  return ADV_ROLES.filter(r => r.toLowerCase().includes(q));
});

const selectAdvPrefix = (val) => { advisorForm.prefix = val; advPrefixSearch.value = val; advPrefixDropdownOpen.value = false; };
const selectAdvInstitution = (val) => { advisorForm.institution = val; advInstSearch.value = val; advInstDropdownOpen.value = false; };
const selectAdvRole = (val) => { advisorForm.role = val; advRoleSearch.value = val; advRoleDropdownOpen.value = false; };

const resetAdvisorForm = () => {
  advisorForm.prefix = ''; advisorForm.firstName = ''; advisorForm.lastName = '';
  advisorForm.institution = ''; advisorForm.email = ''; advisorForm.role = 'อาจารย์ที่ปรึกษาหลัก';
  advPrefixSearch.value = ''; advInstSearch.value = ''; advRoleSearch.value = 'อาจารย์ที่ปรึกษาหลัก';
  showAdvisorForm.value = false;
};

const saveAdvisor = () => {
  if (!advisorForm.firstName.trim() || !advisorForm.lastName.trim() || !advisorForm.institution.trim()) return;
  advisors.push({ ...advisorForm });
  resetAdvisorForm();
};
const removeAdvisor = (idx) => { advisors.splice(idx, 1); };

const trackOptions = [
  { value: 'เทคโนโลยีภูมิสารสนเทศและภูมิศาสตร์', label: 'เทคโนโลยีภูมิสารสนเทศและภูมิศาสตร์ (gi)', abbr: 'GI', code: '419' },
  { value: 'เคมี', label: 'เคมี (chem)', abbr: 'CHEM', code: '249' },
  { value: 'วิทยาศาสตร์และเทคโนโลยีสิ่งแวดล้อม', label: 'วิทยาศาสตร์และเทคโนโลยีสิ่งแวดล้อม (envi)', abbr: 'ENVI', code: '421' },
  { value: 'สาธารณสุขศาสตร์', label: 'สาธารณสุขศาสตร์ (ph)', abbr: 'PH', code: '265' },
  { value: 'สถิติประยุกต์และวิทยาการสารสนเทศ', label: 'สถิติประยุกต์และวิทยาการสารสนเทศ (stat)', abbr: 'STAT', code: '243' },
  { value: 'ชีววิทยา', label: 'ชีววิทยา (bio)', abbr: 'BIO', code: '267' },
  { value: 'เทคโนโลยีสารสนเทศ', label: 'เทคโนโลยีสารสนเทศ (it)', abbr: 'IT', code: '418' },
  { value: 'วิทยาการคอมพิวเตอร์', label: 'วิทยาการคอมพิวเตอร์ (cs)', abbr: 'CS', code: '230' },
  { value: 'คณิตศาสตร์', label: 'คณิตศาสตร์ (math)', abbr: 'MATH', code: '210' },
  { value: 'วิทยาศาสตร์การกีฬา', label: 'วิทยาศาสตร์การกีฬา (sport)', abbr: 'SPORT', code: '240' },
  { value: 'นวัตกรรมสิ่งทอและการออกแบบ', label: 'นวัตกรรมสิ่งทอและการออกแบบ (textile)', abbr: 'TEXTILE', code: '271' },
  { value: 'นวัตกรรมอาหารและแปรรูป', label: 'นวัตกรรมอาหารและแปรรูป (food)', abbr: 'FOOD', code: '272' }
];

const activeTracks = ref([]);
const conferenceYear = ref(''); // loaded from system_settings

const isSubmitting = ref(false);
const toast = ref(null);
const submissionCloseDate = ref(null);
const isPastDeadline = computed(() => {
  if (!submissionCloseDate.value) return false;
  return new Date() > new Date(submissionCloseDate.value);
});
const filteredTrackOptions = computed(() => {
  if (!activeTracks.value || activeTracks.value.length === 0) return trackOptions;
  return trackOptions.filter(t => activeTracks.value.includes(t.value));
});

const formData = reactive({
  level: 'ปริญญาตรี',
  type: 'Poster Presentation',
  format: 'On-site',
  track: 'วิทยาการคอมพิวเตอร์',
  title_th: '',
  title_en: '',
  authors: [],
  abstract_th: '',
  abstract_en: '',
  keywords: [],
  keywordInput: '',
  termsAccepted: false
});

const fullPaperFiles = ref([]);
const suppFiles = ref([]);
const fullPaperError = ref('');
const suppError = ref('');

const showToast = (message, tone = 'ok') => {
  toast.value = { message, tone };
  setTimeout(() => { toast.value = null; }, 3000);
};

// Initialize segmenters for accurate word counting (especially for Thai)
const thSegmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
const enSegmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('en', { granularity: 'word' }) : null;

const wordCountTh = computed(() => {
  const text = formData.abstract_th.trim();
  if (!text) return 0;
  if (thSegmenter) {
    let count = 0;
    for (const segment of thSegmenter.segment(text)) {
      if (segment.isWordLike) count++;
    }
    return count;
  }
  return text.split(/\s+/).length; // Fallback
});

const wordCountEn = computed(() => {
  const text = formData.abstract_en.trim();
  if (!text) return 0;
  if (enSegmenter) {
    let count = 0;
    for (const segment of enSegmenter.segment(text)) {
      if (segment.isWordLike) count++;
    }
    return count;
  }
  return text.split(/\s+/).length; // Fallback
});

onMounted(async () => {
  // Auto-populate first author from user profile
  if (userProfile.value) {
    const p = userProfile.value;
    formData.authors.push({
      prefix: p.title || '',
      firstName: p.first_name_th || '',
      lastName: p.last_name_th || '',
      email: p.email || '',
      institution: p.institution || '',
      role: AUTHOR_ROLES[0] // First Author by default
    });
  }

  try {
    const { data } = await supabase.from('system_settings').select('config_json').eq('id', 1).maybeSingle();
    if (data?.config_json?.conference) {
      const conf = data.config_json.conference;
      if (conf.dates?.submissionClose) {
        submissionCloseDate.value = conf.dates.submissionClose;
      }
      if (conf.activeTracks) {
        activeTracks.value = conf.activeTracks;
        if (activeTracks.value.length > 0 && !activeTracks.value.includes(formData.track)) {
          formData.track = activeTracks.value[0];
        }
      }
      if (conf.academicYear) {
        conferenceYear.value = String(conf.academicYear).slice(-2);
      } else if (conf.year) {
        conferenceYear.value = String(conf.year).slice(-2);
      } else {
        conferenceYear.value = String(new Date().getFullYear()).slice(-2);
      }
    }
  } catch (err) {
    conferenceYear.value = String(new Date().getFullYear()).slice(-2);
  }
});

const nextStep = () => {
  if (isPastDeadline.value) {
    showToast('ปิดรับบทความแล้ว ไม่สามารถดำเนินการต่อได้', 'err');
    return;
  }
  if (currentStep.value === 1) {
    if (!formData.title_th.trim() && !formData.title_en.trim()) {
      showToast('กรุณากรอกชื่อบทความอย่างน้อยหนึ่งภาษา', 'err');
      return;
    }
  }
  if (currentStep.value === 3) {
    if (!formData.abstract_th.trim() && !formData.abstract_en.trim()) {
      showToast('กรุณากรอกบทคัดย่ออย่างน้อยหนึ่งภาษา', 'err');
      return;
    }
  }
  currentStep.value = Math.min(currentStep.value + 1, 4);
};

const prevStep = () => currentStep.value = Math.max(currentStep.value - 1, 1);

const addKeyword = (e) => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const val = formData.keywordInput.trim().replace(',', '');
    if (val && !formData.keywords.includes(val)) {
      formData.keywords.push(val);
    }
    formData.keywordInput = '';
  }
};

const removeKeyword = (idx) => {
  formData.keywords.splice(idx, 1);
};

const formatDate = (v) => {
  if (!v) return '-';
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(new Date(v));
};

const handlePickFullPaper = (e) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  
  const maxBytes = 10 * 1024 * 1024;
  const allowed = new Set(['pdf', 'doc', 'docx']);

  let currentSize = fullPaperFiles.value.reduce((acc, f) => acc + f.size, 0);

  for (const file of files) {
    const ext = String(file.name || '').split('.').pop()?.toLowerCase();
    if (!allowed.has(ext)) {
      fullPaperError.value = 'รองรับเฉพาะไฟล์ .pdf, .doc, .docx เท่านั้น';
      return;
    }
    if (fullPaperFiles.value.length >= 2) {
      fullPaperError.value = 'อัปโหลดไฟล์บทความฉบับเต็มได้สูงสุด 2 ไฟล์เท่านั้น';
      return;
    }
    if (currentSize + file.size > maxBytes) {
      fullPaperError.value = 'ขนาดไฟล์รวมทั้งหมดต้องไม่เกิน 10MB';
      return;
    }
    currentSize += file.size;
    fullPaperFiles.value.push(file);
  }
  
  fullPaperError.value = '';
  e.target.value = '';
};

const removeFullPaper = (idx) => {
  fullPaperFiles.value.splice(idx, 1);
  fullPaperError.value = '';
};

const handlePickSupp = (e) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  
  const maxBytes = 10 * 1024 * 1024;
  const allowed = new Set(['png', 'jpg', 'jpeg', 'zip']);

  let currentSize = suppFiles.value.reduce((acc, f) => acc + f.size, 0);

  for (const file of files) {
    const ext = String(file.name || '').split('.').pop()?.toLowerCase();
    if (!allowed.has(ext)) {
      suppError.value = 'รองรับเฉพาะไฟล์รูปภาพ หรือ .zip เท่านั้น';
      return;
    }
    if (currentSize + file.size > maxBytes) {
      suppError.value = 'ขนาดไฟล์รวมทั้งหมดต้องไม่เกิน 10MB';
      return;
    }
    currentSize += file.size;
    suppFiles.value.push(file);
  }
  
  suppError.value = '';
  e.target.value = '';
};

const removeSuppFile = (idx) => {
  suppFiles.value.splice(idx, 1);
  suppError.value = '';
};

const submitArticle = async () => {
  if (isPastDeadline.value) {
    showToast('ปิดรับบทความแล้ว ไม่สามารถส่งได้', 'err');
    return;
  }
  if (fullPaperFiles.value.length === 0) {
    showToast('กรุณาอัปโหลดไฟล์บทความอย่างน้อย 1 ไฟล์', 'err');
    return;
  }
  if (formData.authors.length === 0) {
    showToast('กรุณาเพิ่มข้อมูลผู้แต่งอย่างน้อย 1 ท่าน', 'err');
    return;
  }
  for (const a of formData.authors) {
    if (!a.firstName || !a.lastName || !a.institution) {
      showToast('กรุณากรอกข้อมูลผู้แต่ง (ชื่อ, นามสกุล, สถาบัน) ให้ครบถ้วน', 'err');
      return;
    }
  }
  if (!formData.termsAccepted) {
    showToast('กรุณายอมรับข้อกำหนดและเงื่อนไข', 'err');
    return;
  }
  if (!userProfile.value) {
    showToast('ไม่พบข้อมูลผู้ใช้งาน', 'err');
    return;
  }

  isSubmitting.value = true;
  
  try {
    const uploadedUrls = [];
    const allFilesToUpload = [...fullPaperFiles.value, ...suppFiles.value];
    for (const file of allFilesToUpload) {
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `submission_${Date.now()}_${cleanName}`;
      const filePath = `submissions/${userProfile.value.user_id}/${fileName}`;
      
      const { error: uploadErr } = await supabase.storage.from('papers').upload(filePath, file);
      if (uploadErr) throw uploadErr;
      
      const { data: { publicUrl } } = supabase.storage.from('papers').getPublicUrl(filePath);
      uploadedUrls.push(`${publicUrl}?name=${encodeURIComponent(file.name)}`);
    }
    
    // Format authors as an array of strings for the papers table (Keep for backward compatibility)
    const formattedAuthors = formData.authors.map(a => 
      `[${a.role}] ${a.prefix}${a.firstName} ${a.lastName} - ${a.institution} ${a.email ? `(${a.email})` : ''} ${a.isPresenting ? '(ผู้นำเสนอ)' : ''}`.trim()
    );
    // Append advisors
    advisors.forEach(adv => {
      formattedAuthors.push(`[${adv.role}] ${adv.prefix}${adv.firstName} ${adv.lastName} - ${adv.institution}`);
    });

    const trackInfo = trackOptions.find(t => t.value === formData.track) || trackOptions[7];
    const yearSuffix = conferenceYear.value || String(new Date().getFullYear()).slice(-2);
    const prefix = `${trackInfo.abbr}-${yearSuffix}${trackInfo.code}`;

    const { count } = await supabase
      .from('papers')
      .select('*', { count: 'exact', head: true })
      .like('paper_code', `${prefix}%`);

    const runningNumber = String((count || 0) + 1).padStart(3, '0');
    const paperId = `${prefix}${runningNumber}`;

    // Prepare paper_authors data
    const paperAuthorsRecords = [];
    
    // Push authors
    formData.authors.forEach((a, idx) => {
      paperAuthorsRecords.push({
        paper_code: paperId,
        member_type: 'author',
        role: a.role,
        prefix: a.prefix,
        first_name: a.firstName,
        last_name: a.lastName,
        institution: a.institution,
        email: a.email || null,
        is_presenting: a.isPresenting || false,
        display_order: idx + 1
      });
    });

    // Push advisors
    advisors.forEach((adv, idx) => {
      paperAuthorsRecords.push({
        paper_code: paperId,
        member_type: 'advisor',
        role: adv.role,
        prefix: adv.prefix,
        first_name: adv.firstName,
        last_name: adv.lastName,
        institution: adv.institution,
        email: adv.email || null,
        is_presenting: false,
        display_order: idx + 1
      });
    });

    // 1. Insert into papers
    const { error: insertErr } = await supabase
      .from('papers')
      .insert({
        paper_code: paperId,
        author_id: userProfile.value.user_id,
        title_th: formData.title_th,
        title_en: formData.title_en,
        abstract_th: formData.abstract_th,
        abstract_en: formData.abstract_en,
        track: formData.track,
        keywords: formData.keywords,
        authors: formattedAuthors,
        file_url: uploadedUrls.join(','),
        status: 'pending_review',
        accepted_terms: formData.termsAccepted
      });
      
    if (insertErr) throw insertErr;

    // 2. Insert into paper_authors
    const { error: insertAuthorsErr } = await supabase
      .from('paper_authors')
      .insert(paperAuthorsRecords);

    if (insertAuthorsErr) {
      console.error('Error inserting paper_authors:', insertAuthorsErr);
      throw new Error('ไม่สามารถบันทึกข้อมูลรายชื่อผู้แต่งได้ กรุณาติดต่อผู้ดูแลระบบ');
    }

    // 🔔 แจ้งเตือน: ส่งบทความสำเร็จ (เฟส 2)
    const paperTitle = formData.title_th || formData.title_en || 'บทความของคุณ';
    await createNotification({
      type: 'paper_submitted',
      phase: 'submission',
      title: 'ส่งบทความสำเร็จ',
      message: `บทความเรื่อง "${paperTitle}" ถูกส่งเข้าระบบเรียบร้อยแล้ว สถานะปัจจุบัน: รอการตรวจสอบเบื้องต้นจาก Admin`,
      paper_title: paperTitle,
      link: '/portal/articles',
    });

    currentStep.value = 5;
    window.scrollTo(0, 0);
  } catch (error) {
    showToast('เกิดข้อผิดพลาดในการส่งบทความ: ' + error.message, 'err');
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="flex-1 flex flex-col h-full bg-slate-50 animate-in slide-in-from-right duration-500 font-sans">
    <header class="h-24 bg-white/80 backdrop-blur-xl border-b border-white shadow-sm flex items-center justify-between px-6 sm:px-10 sticky top-0 z-20">
      <div class="flex items-center gap-4">
        <button @click="router.push('/portal/articles')" class="w-12 h-12 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center hover:bg-white hover:shadow-md transition-all duration-300">
          <ArrowLeft :size="20" class="text-slate-600" />
        </button>
        <div class="min-w-0">
          <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">ส่งบทความใหม่</h1>
          <p class="text-[13px] font-bold text-slate-500 mt-0.5 tracking-wide font-['Lato']">NEW SUBMISSION</p>
        </div>
      </div>
    </header>

    <div class="p-6 sm:p-10 max-w-5xl mx-auto w-full flex-1 overflow-y-auto custom-scrollbar">
      <!-- Deadline Warning Banner -->
      <div v-if="isPastDeadline" class="mb-8 p-6 rounded-[28px] bg-rose-50 border border-rose-100 flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <div class="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-rose-500 shadow-sm shrink-0">
          <AlertCircle :size="24" />
        </div>
        <div>
          <h3 class="text-rose-900 font-black text-lg leading-tight">ขออภัย ระบบปิดรับบทความแล้ว</h3>
          <p class="text-rose-700/70 text-sm font-bold mt-0.5">พ้นกำหนดระยะเวลาการส่งบทความใหม่เมื่อวันที่ {{ formatDate(submissionCloseDate) }}</p>
        </div>
      </div>

      <div v-if="currentStep === 5" class="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <div class="w-full max-w-xl">
          <div class="bg-white/90 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-[36px] p-12">
            <div class="flex flex-col items-center text-center">
              <div class="w-24 h-24 rounded-[28px] bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                <Check :size="40" />
              </div>
              <div class="mt-8 text-3xl font-black text-slate-900 tracking-tight">ส่งสำเร็จ!</div>
              <div class="mt-4 text-[15px] font-bold text-slate-500 leading-relaxed max-w-xs mx-auto">
                บทความของคุณถูกส่งเข้าสู่ระบบเรียบร้อยแล้ว กรุณารอผลการตรวจสอบเบื้องต้น
              </div>
              <button
                type="button"
                @click="router.push('/portal/articles')"
                class="mt-10 h-14 px-10 rounded-[20px] bg-slate-100 border border-slate-200 text-slate-700 font-black text-[15px] hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5 transition-all duration-300"
              >
                กลับไปหน้ารายการ
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else>
        <div class="mb-10 max-w-3xl mx-auto">
          <div class="flex items-center justify-between relative">
            <div class="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1.5 bg-slate-200 rounded-full -z-10"></div>
            <div class="absolute left-0 top-1/2 transform -translate-y-1/2 h-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full -z-10 transition-all duration-500" 
                 :style="{ width: `${((currentStep - 1) / 3) * 100}%` }"></div>
            
            <div v-for="step in steps" :key="step.id" class="flex flex-col items-center gap-3 bg-slate-50 px-4">
              <div :class="['w-12 h-12 rounded-[18px] flex items-center justify-center font-black text-[15px] transition-all duration-500 border-2',
                  currentStep >= step.id ? 'bg-gradient-to-br from-purple-600 to-indigo-600 border-transparent text-white shadow-lg shadow-purple-500/30' : 'bg-white border-slate-200 text-slate-400'
              ]">
                <Check v-if="currentStep > step.id" :size="20" class="text-white" />
                <span v-else>{{ step.id }}</span>
              </div>
              <span :class="['text-[13px] font-black transition-colors', currentStep >= step.id ? 'text-purple-700' : 'text-slate-400']">
                {{ step.label }}
              </span>
            </div>
          </div>
        </div>

        <div class="bg-white/90 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[36px] p-8 sm:p-12 min-h-[400px]">
          <!-- Step 1 -->
          <div v-if="currentStep === 1" class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText :size="20" class="text-purple-500"/> ข้อมูลทั่วไป (General Info)
            </h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-4">
                <div>
                  <label class="text-sm font-bold text-slate-700 mb-2 block">ระดับผู้ส่งผลงาน</label>
                  <select v-model="formData.level" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 transition-colors">
                    <option value="ปริญญาตรี">ปริญญาตรี (Undergraduate)</option>
                  </select>
                </div>
                <div>
                  <label class="text-sm font-bold text-slate-700 mb-2 block">ประเภทบทความ</label>
                  <select v-model="formData.type" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 transition-colors">
                    <option value="Poster Presentation">Poster Presentation</option>
                  </select>
                </div>
              </div>

              <div class="space-y-4">
                <div>
                  <label class="text-sm font-bold text-slate-700 mb-2 block">รูปแบบการนำเสนอ</label>
                  <select v-model="formData.format" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 transition-colors">
                    <option value="On-site">On-site (สถานที่จัดงาน)</option>
                  </select>
                  <p class="text-[11px] text-slate-400 mt-2">* ปีนี้จัดการนำเสนอในรูปแบบ On-site ทั้งหมด</p>
                </div>
                <div>
                  <label class="text-sm font-bold text-slate-700 mb-2 block">กลุ่มสาขาวิชา</label>
                  <select v-model="formData.track" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 transition-colors">
                    <option v-for="t in filteredTrackOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="border-t border-slate-100 pt-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="text-sm font-bold text-slate-700 mb-2 block">ชื่อบทความ (ภาษาไทย)</label>
                  <input type="text" v-model="formData.title_th" placeholder="กรอกชื่อบทความภาษาไทย..." 
                         class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 transition-colors" />
                </div>
                <div>
                  <label class="text-sm font-bold text-slate-700 mb-2 block">ชื่อบทความ (ภาษาอังกฤษ)</label>
                  <input type="text" v-model="formData.title_en" placeholder="Article Title in English..." 
                         class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 transition-colors" />
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2 -->
          <div v-if="currentStep === 2" class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <!-- Authors Header -->
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users :size="20" class="text-purple-500"/> รายชื่อผู้แต่ง / ผู้นำเสนอ (Authors & Presenters)
              </h3>
              <button @click="openAddAuthorForm" class="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-200 flex items-center gap-1 transition-colors">
                <UserPlus :size="14" /> เพิ่มผู้แต่ง / ผู้นำเสนอ
              </button>
            </div>

            <!-- Authors Table -->
            <div v-if="formData.authors.length > 0" class="overflow-x-auto rounded-xl border border-slate-200">
              <table class="w-full text-sm">
                <thead class="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th class="text-left px-4 py-3 text-xs font-black text-slate-500 w-10">#</th>
                    <th class="text-left px-4 py-3 text-xs font-black text-slate-500">ชื่อ-นามสกุล</th>
                    <th class="text-left px-4 py-3 text-xs font-black text-slate-500 hidden md:table-cell">สถาบัน</th>
                    <th class="text-left px-4 py-3 text-xs font-black text-slate-500 hidden lg:table-cell">สถานะ</th>
                    <th class="text-right px-4 py-3 text-xs font-black text-slate-500 w-28">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(author, idx) in formData.authors" :key="idx" class="border-b border-slate-100 last:border-0 hover:bg-purple-50/30 transition-colors">
                    <td class="px-4 py-3 text-xs font-black text-purple-600">{{ idx + 1 }}</td>
                    <td class="px-4 py-3">
                      <div class="font-bold text-slate-800 flex items-center gap-2">
                        {{ author.prefix }}{{ author.firstName }} {{ author.lastName }}
                        <span v-if="author.isPresenting" class="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded">ผู้นำเสนอ</span>
                      </div>
                      <div v-if="author.email" class="text-xs text-slate-400 mt-0.5">{{ author.email }}</div>
                      <div class="text-xs text-slate-400 mt-0.5 md:hidden">{{ author.institution }}</div>
                    </td>
                    <td class="px-4 py-3 text-xs text-slate-600 hidden md:table-cell">{{ author.institution }}</td>
                    <td class="px-4 py-3 hidden lg:table-cell">
                      <span class="text-[10px] font-bold px-2 py-1 rounded-full" :class="author.role.includes('First') ? 'bg-purple-100 text-purple-700' : author.role.includes('Corresponding') ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'">
                        {{ author.role.split('(')[0].trim() }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-right">
                      <div class="flex items-center justify-end gap-1">
                        <button @click="moveAuthor(idx, -1)" :disabled="idx === 0" class="p-1 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-30" title="เลื่อนขึ้น">▲</button>
                        <button @click="moveAuthor(idx, 1)" :disabled="idx === formData.authors.length - 1" class="p-1 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-30" title="เลื่อนลง">▼</button>
                        <button @click="openEditAuthorForm(idx)" class="p-1 rounded hover:bg-blue-100 text-blue-500" title="แก้ไข"><FileText :size="14" /></button>
                        <button @click="removeAuthor(idx)" class="p-1 rounded hover:bg-red-100 text-red-400" title="ลบ"><Trash2 :size="14" /></button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="text-center py-10 bg-slate-50 border border-slate-200 rounded-xl">
              <Users :size="32" class="text-slate-300 mx-auto mb-2" />
              <p class="text-sm text-slate-500 font-bold">ยังไม่มีผู้แต่ง</p>
              <p class="text-xs text-slate-400 mt-1">คลิกปุ่ม "เพิ่มผู้แต่ง" เพื่อระบุข้อมูลผู้แต่งทุกคน</p>
            </div>

            <!-- Author Add/Edit Form -->
            <div v-if="showAuthorForm" class="bg-purple-50/50 border border-purple-200 rounded-2xl p-6 space-y-4">
              <div class="text-sm font-black text-purple-700">{{ editingAuthorIdx >= 0 ? 'แก้ไขผู้แต่ง' : 'เพิ่มผู้แต่งใหม่' }}</div>
              <div class="grid grid-cols-1 sm:grid-cols-6 gap-4">
                <!-- Prefix Searchable Dropdown -->
                <div class="sm:col-span-2 relative dropdown-container">
                  <label class="text-xs font-bold text-slate-600 mb-1 block">คำนำหน้า *</label>
                  <div 
                    @click="prefixDropdownOpen = !prefixDropdownOpen"
                    class="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm flex items-center justify-between cursor-pointer hover:border-purple-400 transition-colors"
                  >
                    <span :class="authorForm.prefix ? 'text-slate-800' : 'text-slate-400'">{{ authorForm.prefix || 'เลือก...' }}</span>
                    <ChevronDown :size="14" class="text-slate-400 transition-transform" :class="{ 'rotate-180': prefixDropdownOpen }" />
                  </div>
                  <div v-if="prefixDropdownOpen" class="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div class="p-2 border-b border-purple-50 bg-slate-50">
                      <div class="relative">
                        <Search :size="12" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" v-model="prefixSearch" placeholder="ค้นหาหรือพิมพ์เพิ่ม..." class="w-full h-8 pl-8 pr-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-purple-400" @click.stop />
                      </div>
                    </div>
                    <div class="max-h-40 overflow-y-auto custom-scrollbar">
                      <button v-for="p in filteredPrefixes" :key="p" @click="selectPrefix(p)" class="block w-full text-left px-3 py-2 text-xs hover:bg-purple-50 flex items-center justify-between transition-colors">
                        {{ p }}
                        <Check v-if="authorForm.prefix === p" :size="12" class="text-purple-600" />
                      </button>
                      <div v-if="filteredPrefixes.length === 0 && prefixSearch" class="p-2 border-t border-slate-100">
                        <button type="button" @click="selectPrefix(prefixSearch)" class="w-full text-center text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1.5 rounded-md hover:bg-purple-100">ใช้ "{{ prefixSearch }}"</button>
                      </div>
                    </div>
                  </div>
                  <p class="text-[10px] text-slate-400 mt-1">* คลิกเลือก หรือพิมพ์เพิ่มได้เลย</p>
                </div>
                <div class="sm:col-span-2">
                  <label class="text-xs font-bold text-slate-600 mb-1 block">ชื่อ (First Name) *</label>
                  <input type="text" v-model="authorForm.firstName" placeholder="ชื่อ" class="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-purple-400" />
                </div>
                <div class="sm:col-span-2">
                  <label class="text-xs font-bold text-slate-600 mb-1 block">นามสกุล (Last Name) *</label>
                  <input type="text" v-model="authorForm.lastName" placeholder="นามสกุล" class="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-purple-400" />
                </div>
                <!-- Institution Searchable Dropdown -->
                <div class="sm:col-span-3 relative dropdown-container">
                  <label class="text-xs font-bold text-slate-600 mb-1 block">สถาบัน (Institution) *</label>
                  <div 
                    @click="instDropdownOpen = !instDropdownOpen"
                    class="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm flex items-center justify-between cursor-pointer hover:border-purple-400 transition-colors"
                  >
                    <span class="truncate pr-2" :class="authorForm.institution ? 'text-slate-800' : 'text-slate-400'">{{ authorForm.institution || 'เลือกสถาบัน...' }}</span>
                    <ChevronDown :size="14" class="text-slate-400 transition-transform shrink-0" :class="{ 'rotate-180': instDropdownOpen }" />
                  </div>
                  <div v-if="instDropdownOpen" class="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div class="p-2 border-b border-purple-50 bg-slate-50">
                      <div class="relative">
                        <Search :size="12" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" v-model="instSearch" placeholder="พิมพ์ค้นหาสถาบัน..." class="w-full h-8 pl-8 pr-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-purple-400" @click.stop />
                      </div>
                    </div>
                    <div class="max-h-48 overflow-y-auto custom-scrollbar">
                      <button v-for="u in filteredInstitutions" :key="u" @click="selectInstitution(u)" class="block w-full text-left px-3 py-2 text-xs hover:bg-purple-50 flex items-center justify-between transition-colors">
                        <span class="truncate pr-2">{{ u }}</span>
                        <Check v-if="authorForm.institution === u" :size="12" class="text-purple-600 shrink-0" />
                      </button>
                      <div v-if="filteredInstitutions.length === 0 && instSearch" class="p-2 border-t border-slate-100">
                        <button type="button" @click="selectInstitution(instSearch)" class="w-full text-center text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1.5 rounded-md hover:bg-purple-100">ใช้ "{{ instSearch }}"</button>
                      </div>
                    </div>
                  </div>
                  <p class="text-[10px] text-slate-400 mt-1">* คลิกเลือก หรือพิมพ์เพิ่มได้เลย</p>
                </div>
                <div class="sm:col-span-3">
                  <label class="text-xs font-bold text-slate-600 mb-1 block">อีเมล (Email)</label>
                  <input type="email" v-model="authorForm.email" placeholder="email@example.com" class="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-purple-400" />
                </div>
                <div class="sm:col-span-6">
                  <label class="text-xs font-bold text-slate-600 mb-1 block">สถานะผู้แต่ง (Author Role)</label>
                  <select v-model="authorForm.role" class="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-purple-400">
                    <option v-for="r in AUTHOR_ROLES" :key="r" :value="r">{{ r }}</option>
                  </select>
                </div>
                <div class="sm:col-span-6">
                  <label class="flex items-start gap-3 cursor-pointer group p-3 border border-slate-200 hover:bg-purple-50 hover:border-purple-200 rounded-xl transition-colors">
                    <div class="mt-0.5">
                      <input type="checkbox" v-model="authorForm.isPresenting" class="accent-purple-600 w-4 h-4" />
                    </div>
                    <div class="text-xs text-slate-600">
                      <span class="font-bold text-slate-800 block mb-0.5">เป็นผู้นำเสนอ (Presenting Author)</span>
                      ติ๊กเลือกหากผู้แต่งท่านนี้จะเป็นผู้ขึ้นนำเสนอผลงานในวันจัดงาน
                    </div>
                  </label>
                </div>
              </div>
              <div class="flex gap-2 justify-end pt-2">
                <button @click="resetAuthorForm" class="px-4 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-white border border-slate-200 transition-colors">ยกเลิก</button>
                <button @click="saveAuthor" class="px-4 py-2 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center gap-1">
                  <Check :size="14" /> {{ editingAuthorIdx >= 0 ? 'บันทึกการแก้ไข' : 'เพิ่มผู้แต่ง' }}
                </button>
              </div>
            </div>

            <!-- Advisor Section -->
            <div class="border-t border-slate-100 pt-6 space-y-4">
              <div class="flex justify-between items-center">
                <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
                  <GraduationCap :size="20" class="text-indigo-500"/> อาจารย์ที่ปรึกษา / ที่ปรึกษา (Advisors)
                </h3>
                <button @click="showAdvisorForm = true" v-if="!showAdvisorForm" class="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-200 flex items-center gap-1 transition-colors">
                  <Plus :size="14" /> เพิ่มที่ปรึกษา
                </button>
              </div>
              <!-- Advisor list -->
              <div v-if="advisors.length > 0" class="space-y-2">
                <div v-for="(adv, idx) in advisors" :key="idx" class="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3">
                  <div>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 mr-2">{{ adv.role }}</span>
                    <span class="text-sm font-bold text-slate-800">{{ adv.prefix }}{{ adv.firstName }} {{ adv.lastName }}</span>
                    <span v-if="adv.institution" class="text-xs text-slate-400 ml-2">{{ adv.institution }}</span>
                  </div>
                  <button @click="removeAdvisor(idx)" class="text-red-400 hover:text-red-600 p-1"><Trash2 :size="14" /></button>
                </div>
              </div>
              <!-- Advisor Form -->
              <div v-if="showAdvisorForm" class="bg-indigo-50/50 border border-indigo-200 rounded-2xl p-5 space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-6 gap-4">
                  <div class="sm:col-span-2 relative dropdown-container">
                    <label class="text-xs font-bold text-slate-600 mb-1 block">คำนำหน้า *</label>
                    <div 
                      @click="advPrefixDropdownOpen = !advPrefixDropdownOpen"
                      class="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm flex items-center justify-between cursor-pointer hover:border-indigo-400 transition-colors"
                    >
                      <span :class="advisorForm.prefix ? 'text-slate-800' : 'text-slate-400'">{{ advisorForm.prefix || 'เลือก...' }}</span>
                      <ChevronDown :size="14" class="text-slate-400 transition-transform" :class="{ 'rotate-180': advPrefixDropdownOpen }" />
                    </div>
                    <div v-if="advPrefixDropdownOpen" class="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                      <div class="p-2 border-b border-indigo-50 bg-slate-50">
                        <div class="relative">
                          <Search :size="12" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input type="text" v-model="advPrefixSearch" placeholder="ค้นหาหรือพิมพ์เพิ่ม..." class="w-full h-8 pl-8 pr-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-indigo-400" @click.stop />
                        </div>
                      </div>
                      <div class="max-h-40 overflow-y-auto custom-scrollbar">
                        <button v-for="p in filteredAdvPrefixes" :key="p" @click="selectAdvPrefix(p)" class="block w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 flex items-center justify-between transition-colors">
                          {{ p }}
                          <Check v-if="advisorForm.prefix === p" :size="12" class="text-indigo-600" />
                        </button>
                        <div v-if="filteredAdvPrefixes.length === 0 && advPrefixSearch" class="p-2 border-t border-slate-100">
                          <button type="button" @click="selectAdvPrefix(advPrefixSearch)" class="w-full text-center text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1.5 rounded-md hover:bg-indigo-100">ใช้ "{{ advPrefixSearch }}"</button>
                        </div>
                      </div>
                    </div>
                    <p class="text-[10px] text-slate-400 mt-1">* คลิกเลือก หรือพิมพ์เพิ่มได้เลย</p>
                  </div>
                  <div class="sm:col-span-2">
                    <label class="text-xs font-bold text-slate-600 mb-1 block">ชื่อ *</label>
                    <input type="text" v-model="advisorForm.firstName" placeholder="ชื่อ" class="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" />
                  </div>
                  <div class="sm:col-span-2">
                    <label class="text-xs font-bold text-slate-600 mb-1 block">นามสกุล *</label>
                    <input type="text" v-model="advisorForm.lastName" placeholder="นามสกุล" class="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" />
                  </div>
                  <div class="sm:col-span-3 relative dropdown-container">
                    <label class="text-xs font-bold text-slate-600 mb-1 block">สถาบัน *</label>
                    <div 
                      @click="advInstDropdownOpen = !advInstDropdownOpen"
                      class="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm flex items-center justify-between cursor-pointer hover:border-indigo-400 transition-colors"
                    >
                      <span class="truncate pr-2" :class="advisorForm.institution ? 'text-slate-800' : 'text-slate-400'">{{ advisorForm.institution || 'เลือกสถาบัน...' }}</span>
                      <ChevronDown :size="14" class="text-slate-400 transition-transform shrink-0" :class="{ 'rotate-180': advInstDropdownOpen }" />
                    </div>
                    <div v-if="advInstDropdownOpen" class="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                      <div class="p-2 border-b border-indigo-50 bg-slate-50">
                        <div class="relative">
                          <Search :size="12" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input type="text" v-model="advInstSearch" placeholder="พิมพ์ค้นหาสถาบัน..." class="w-full h-8 pl-8 pr-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-indigo-400" @click.stop />
                        </div>
                      </div>
                      <div class="max-h-48 overflow-y-auto custom-scrollbar">
                        <button v-for="u in filteredAdvInstitutions" :key="u" @click="selectAdvInstitution(u)" class="block w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 flex items-center justify-between transition-colors">
                          <span class="truncate pr-2">{{ u }}</span>
                          <Check v-if="advisorForm.institution === u" :size="12" class="text-indigo-600 shrink-0" />
                        </button>
                        <div v-if="filteredAdvInstitutions.length === 0 && advInstSearch" class="p-2 border-t border-slate-100">
                          <button type="button" @click="selectAdvInstitution(advInstSearch)" class="w-full text-center text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1.5 rounded-md hover:bg-indigo-100">ใช้ "{{ advInstSearch }}"</button>
                        </div>
                      </div>
                    </div>
                    <p class="text-[10px] text-slate-400 mt-1">* คลิกเลือก หรือพิมพ์เพิ่มได้เลย</p>
                  </div>
                  <div class="sm:col-span-3">
                    <label class="text-xs font-bold text-slate-600 mb-1 block">อีเมล (Email)</label>
                    <input type="email" v-model="advisorForm.email" placeholder="email@example.com" class="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" />
                  </div>
                  <div class="sm:col-span-6 relative dropdown-container">
                    <label class="text-xs font-bold text-slate-600 mb-1 block">ตำแหน่ง</label>
                    <div 
                      @click="advRoleDropdownOpen = !advRoleDropdownOpen"
                      class="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm flex items-center justify-between cursor-pointer hover:border-indigo-400 transition-colors"
                    >
                      <span class="truncate pr-2" :class="advisorForm.role ? 'text-slate-800' : 'text-slate-400'">{{ advisorForm.role || 'เลือกตำแหน่ง...' }}</span>
                      <ChevronDown :size="14" class="text-slate-400 transition-transform shrink-0" :class="{ 'rotate-180': advRoleDropdownOpen }" />
                    </div>
                    <div v-if="advRoleDropdownOpen" class="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                      <div class="p-2 border-b border-indigo-50 bg-slate-50">
                        <div class="relative">
                          <Search :size="12" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input type="text" v-model="advRoleSearch" placeholder="พิมพ์ตำแหน่ง..." class="w-full h-8 pl-8 pr-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-indigo-400" @click.stop />
                        </div>
                      </div>
                      <div class="max-h-48 overflow-y-auto custom-scrollbar">
                        <button v-for="r in filteredAdvRoles" :key="r" @click="selectAdvRole(r)" class="block w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 flex items-center justify-between transition-colors">
                          <span class="truncate pr-2">{{ r }}</span>
                          <Check v-if="advisorForm.role === r" :size="12" class="text-indigo-600 shrink-0" />
                        </button>
                        <div v-if="filteredAdvRoles.length === 0 && advRoleSearch" class="p-2 border-t border-slate-100">
                          <button type="button" @click="selectAdvRole(advRoleSearch)" class="w-full text-center text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1.5 rounded-md hover:bg-indigo-100">ใช้ "{{ advRoleSearch }}"</button>
                        </div>
                      </div>
                    </div>
                    <p class="text-[10px] text-slate-400 mt-1">* คลิกเลือก หรือพิมพ์เพิ่มได้เลย</p>
                  </div>
                </div>
                <div class="flex gap-2 justify-end">
                  <button @click="resetAdvisorForm" class="px-4 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-white border border-slate-200">ยกเลิก</button>
                  <button @click="saveAdvisor" class="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1">
                    <Check :size="14" /> เพิ่มที่ปรึกษา
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 3 -->
          <div v-if="currentStep === 3" class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
                 <FileText :size="20" class="text-purple-500"/> บทคัดย่อ (Abstract)
             </h3>
             
             <div class="space-y-4">
                 <div>
                  <label class="text-sm font-bold text-slate-700 mb-2 flex justify-between items-end">
                    <span>บทคัดย่อภาษาไทย</span>
                    <span class="text-xs text-slate-400 font-normal"><span :class="{'text-amber-500': wordCountTh > 400}">{{ wordCountTh }}</span> คำ</span>
                  </label>
                  <textarea v-model="formData.abstract_th" rows="5" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 transition-colors resize-none custom-scrollbar" 
                            placeholder="พิมพ์เนื้อหาบทคัดย่อภาษาไทย..."></textarea>
                </div>
                <div>
                  <label class="text-sm font-bold text-slate-700 mb-2 flex justify-between items-end">
                    <span>บทคัดย่อภาษาอังกฤษ (English Abstract)</span>
                    <span class="text-xs text-slate-400 font-normal"><span :class="{'text-amber-500': wordCountEn > 400}">{{ wordCountEn }}</span> คำ</span>
                  </label>
                  <textarea v-model="formData.abstract_en" rows="5" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 transition-colors resize-none custom-scrollbar" 
                            placeholder="Type your English abstract here..."></textarea>
                </div>
                <div>
                  <label class="text-sm font-bold text-slate-700 mb-2 block">คำสำคัญ (Keywords)</label>
                  <div class="p-2 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap gap-2 min-h-[50px]">
                    <span v-for="(k, idx) in formData.keywords" :key="idx" class="bg-white border border-slate-200 px-3 py-1 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-2">
                      {{ k }} <X :size="12" @click="removeKeyword(idx)" class="cursor-pointer hover:text-red-500"/>
                    </span>
                    <input type="text" v-model="formData.keywordInput" @keydown="addKeyword" placeholder="พิมพ์แล้วกด Enter..." 
                           class="bg-transparent text-sm focus:outline-none flex-1 min-w-[150px] p-1" />
                  </div>
                  <p class="text-[10px] text-slate-400 mt-1">*คั่นด้วยเครื่องหมายจุลภาค (,) หรือกด Enter</p>
                </div>
             </div>
          </div>

          <!-- Step 4 -->
          <div v-if="currentStep === 4" class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
                 <UploadCloud :size="20" class="text-purple-500"/> อัปโหลดไฟล์ (Upload)
             </h3>
             
             <div class="grid grid-cols-1 gap-6">
               <div>
                 <label class="text-sm font-bold text-slate-700 mb-2 flex items-center justify-between">
                   <span>1. ไฟล์บทความฉบับเต็ม (Full Paper) *</span>
                   <span class="text-xs font-normal text-slate-400">อัปโหลดได้สูงสุด 2 ไฟล์</span>
                 </label>
                 
                 <!-- List of selected full paper files -->
                 <div v-if="fullPaperFiles.length > 0" class="mb-3 space-y-2">
                   <div v-for="(f, idx) in fullPaperFiles" :key="idx" class="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                     <div class="flex items-center gap-3 overflow-hidden">
                       <FileUp :size="20" class="text-purple-500 shrink-0" />
                       <div class="truncate">
                         <p class="text-xs font-bold text-slate-700 truncate">{{ f.name }}</p>
                         <p class="text-[10px] text-slate-400">{{ (f.size / (1024 * 1024)).toFixed(2) }} MB</p>
                       </div>
                     </div>
                     <button @click="removeFullPaper(idx)" class="text-red-400 hover:text-red-600 p-1 shrink-0"><Trash2 :size="14" /></button>
                   </div>
                 </div>

                 <label v-if="fullPaperFiles.length < 2" class="border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-purple-400 transition-all cursor-pointer group bg-slate-50/50">
                   <input type="file" class="hidden" accept=".pdf,.doc,.docx" multiple @change="handlePickFullPaper" />
                   
                   <div class="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                     <Plus :size="20" class="text-purple-500" />
                   </div>
                   <p class="text-sm font-bold text-slate-600">คลิกเพื่อเลือกไฟล์บทความ</p>
                   <p class="text-xs text-slate-400 mt-1">(.pdf, .doc, .docx รวมไม่เกิน 10MB)</p>
                 </label>
                 <p v-if="fullPaperError" class="text-xs font-bold text-red-500 mt-2">{{ fullPaperError }}</p>
               </div>

               <div>
                 <label class="text-sm font-bold text-slate-700 mb-2 flex items-center justify-between">
                   <span>2. ไฟล์เพิ่มเติม (Supplementary Files)</span>
                   <span class="text-xs font-normal text-slate-400">เลือกได้หลายไฟล์</span>
                 </label>

                 <div v-if="suppFiles.length > 0" class="mb-3 space-y-2">
                   <div v-for="(f, idx) in suppFiles" :key="idx" class="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                     <div class="flex items-center gap-3 overflow-hidden">
                       <FileImage :size="20" class="text-blue-500 shrink-0" />
                       <div class="truncate">
                         <p class="text-xs font-bold text-slate-700 truncate">{{ f.name }}</p>
                         <p class="text-[10px] text-slate-400">{{ (f.size / (1024 * 1024)).toFixed(2) }} MB</p>
                       </div>
                     </div>
                     <button @click="removeSuppFile(idx)" class="text-red-400 hover:text-red-600 p-1 shrink-0"><Trash2 :size="14" /></button>
                   </div>
                 </div>
                 
                 <label class="border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-blue-400 transition-all cursor-pointer group bg-slate-50/50">
                   <input type="file" class="hidden" accept=".png,.jpg,.jpeg,.zip" multiple @change="handlePickSupp" />
                   
                   <div class="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                     <Plus :size="20" class="text-blue-500" />
                   </div>
                   <p class="text-sm font-bold text-slate-600">คลิกเพื่อเลือกไฟล์รูปภาพ หรือไฟล์ zip</p>
                   <p class="text-xs text-slate-400 mt-1">(.png, .jpg, .zip รวมไม่เกิน 10MB)</p>
                 </label>
                 <p v-if="suppError" class="text-xs font-bold text-red-500 mt-2">{{ suppError }}</p>
               </div>
             </div>

             <div class="border-t border-slate-100 pt-6 mt-4">
               <label class="flex items-start gap-3 cursor-pointer group p-3 hover:bg-slate-50 rounded-xl transition-colors">
                 <div class="mt-0.5">
                   <input type="checkbox" v-model="formData.termsAccepted" class="accent-purple-600 w-4 h-4" />
                 </div>
                 <div class="text-xs text-slate-500 leading-relaxed">
                   <span class="font-bold text-slate-700 block mb-1">ข้อกำหนดและเงื่อนไข</span>
                   ข้าพเจ้ายืนยันว่าบทความนี้เป็นผลงานของข้าพเจ้าจริง ไม่เคยตีพิมพ์ที่ใดมาก่อน และไม่อยู่ระหว่างการพิจารณาของวารสารหรือการประชุมอื่น
                 </div>
               </label>
             </div>
          </div>
        </div>

        <div class="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 mt-10">
          <button 
            @click="currentStep === 1 ? router.push('/portal/articles') : prevStep()"
            class="h-14 px-8 rounded-[20px] font-black text-[14px] text-slate-500 hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 hover:text-slate-800 transition-all duration-300 flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <span v-if="currentStep === 1">ยกเลิก</span>
            <span v-else class="flex items-center gap-1"><ChevronLeft :size="18"/> ย้อนกลับ</span>
          </button>
          
          <button 
            @click="currentStep === 4 ? submitArticle() : nextStep()"
            :disabled="isSubmitting"
            class="h-14 px-10 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-[20px] font-black text-[15px] shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto"
          >
            <span v-if="currentStep === 4" class="flex items-center gap-2">
              <span v-if="isSubmitting">กำลังส่ง...</span>
              <span v-else class="flex items-center gap-2"><Rocket :size="18"/> ยืนยันการส่งบทความ</span>
            </span>
            <span v-else class="flex items-center gap-1">ถัดไป <ChevronRight :size="18"/></span>
          </button>
        </div>
      </div>
    </div>
  </div>
    
    <!-- Toast -->
    <div
      v-if="toast"
      :class="[
        'fixed bottom-4 right-4 h-10 px-4 rounded-2xl border text-xs font-black inline-flex items-center transition-all z-[60]',
        toast.tone === 'err' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
      ]"
    >
      {{ toast.message }}
    </div>
</template>
