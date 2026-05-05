<script setup>
definePageMeta({ layout: 'portal' });
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, Plus, Check, FileText, Users, 
  UploadCloud, Send, X, FileUp, AlertCircle
} from 'lucide-vue-next';
import { useAuth } from '~/composables/useAuth';
import { useSupabase } from '~/composables/useSupabase';

const Rocket = Send;

const router = useRouter();
const { userProfile } = useAuth();
const supabase = useSupabase();

const currentStep = ref(1);
const steps = [
  { id: 1, label: 'ข้อมูลทั่วไป' },
  { id: 2, label: 'ผู้แต่ง' },
  { id: 3, label: 'บทคัดย่อ' },
  { id: 4, label: 'อัปโหลดไฟล์' },
];

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

onMounted(async () => {
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
      // Use year from settings (last 2 digits of C.E.), fallback to current C.E. year
      if (conf.year) {
        conferenceYear.value = String(conf.year).slice(-2);
      } else {
        conferenceYear.value = String(new Date().getFullYear()).slice(-2);
      }
    }
  } catch (err) {
    conferenceYear.value = String(new Date().getFullYear()).slice(-2);
  }
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

const uploadFile = ref(null);
const uploadError = ref('');

const showToast = (message, tone = 'ok') => {
  toast.value = { message, tone };
  setTimeout(() => { toast.value = null; }, 3000);
};



const coAuthorQuery = ref('');
const coAuthorResults = ref([]);
const isSearchingCoAuthor = ref(false);

const searchCoAuthor = async () => {
  const q = coAuthorQuery.value.trim();
  if (q.length < 2) {
    coAuthorResults.value = [];
    return;
  }
  
  isSearchingCoAuthor.value = true;
  try {
    const { data } = await supabase
      .from('users')
      .select('user_id, first_name_th, last_name_th, institution')
      .eq('role', 'author')
      .or(`first_name_th.ilike.%${q}%,last_name_th.ilike.%${q}%`)
      .limit(5);
      
    coAuthorResults.value = data || [];
  } catch (err) {
    console.error(err);
  } finally {
    isSearchingCoAuthor.value = false;
  }
};

const addCoAuthorFromSearch = (u) => {
  const name = [u.first_name_th, u.last_name_th].filter(Boolean).join(' ');
  if (!formData.authors.includes(name)) {
    formData.authors.push(name);
  }
  coAuthorQuery.value = '';
  coAuthorResults.value = [];
};

const removeCoAuthor = (idx) => {
  formData.authors.splice(idx, 1);
};

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

const handlePickUploadFile = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  const maxBytes = 10 * 1024 * 1024; // 10 MB limit
  const ext = String(file.name || '').split('.').pop()?.toLowerCase();
  const allowed = new Set(['pdf']);

  if (!allowed.has(ext)) {
    uploadError.value = 'รองรับเฉพาะไฟล์ .pdf เท่านั้น';
    uploadFile.value = null;
    return;
  }
  if (file.size > maxBytes) {
    uploadError.value = 'ขนาดไฟล์ต้องไม่เกิน 10MB';
    uploadFile.value = null;
    return;
  }
  
  uploadError.value = '';
  uploadFile.value = file;
};

const submitArticle = async () => {
  if (isPastDeadline.value) {
    showToast('ปิดรับบทความแล้ว ไม่สามารถส่งได้', 'err');
    return;
  }
  if (!uploadFile.value) {
    showToast('กรุณาอัปโหลดไฟล์บทความ', 'err');
    return;
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
    const fileExt = uploadFile.value.name.split('.').pop();
    const fileName = `submission_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `submissions/${userProfile.value.user_id}/${fileName}`;
    
    const { error: uploadErr } = await supabase.storage
      .from('papers')
      .upload(filePath, uploadFile.value);
      
    if (uploadErr) throw uploadErr;
    
    const { data: { publicUrl } } = supabase.storage.from('papers').getPublicUrl(filePath);
    
    const authorName = [userProfile.value.first_name_th, userProfile.value.last_name_th].filter(Boolean).join(' ') || userProfile.value.email;
    const finalAuthors = [authorName, ...formData.authors];

    const trackInfo = trackOptions.find(t => t.value === formData.track) || trackOptions[7];
    const yearSuffix = conferenceYear.value || String(new Date().getFullYear()).slice(-2);
    const prefix = `${trackInfo.abbr}-${yearSuffix}${trackInfo.code}`;

    const { count } = await supabase
      .from('papers')
      .select('*', { count: 'exact', head: true })
      .like('paper_code', `${prefix}%`);

    const runningNumber = String((count || 0) + 1).padStart(3, '0');
    const paperId = `${prefix}${runningNumber}`;

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
        authors: finalAuthors,
        file_url: publicUrl,
        status: 'pending_review',
        accepted_terms: formData.termsAccepted
      });
      
    if (insertErr) throw insertErr;

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
    <header class="h-24 bg-white/80 backdrop-blur-xl border-b border-white shadow-sm flex items-center justify-between px-6 sm:px-10 sticky top-0 z-40">
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
                  <div class="flex gap-4">
                    <label class="flex items-center gap-2 cursor-pointer p-3 border border-slate-200 rounded-xl hover:bg-slate-50 w-full">
                      <input type="radio" v-model="formData.level" value="ปริญญาตรี" class="accent-purple-600" />
                      <span class="text-sm text-slate-600">ปริญญาตรี</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer p-3 border border-slate-200 rounded-xl hover:bg-slate-50 w-full">
                      <input type="radio" v-model="formData.level" value="บุคคลทั่วไป / นักวิจัย" class="accent-purple-600" />
                      <span class="text-sm text-slate-600">บุคคลทั่วไป / นักวิจัย</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label class="text-sm font-bold text-slate-700 mb-2 block">ประเภทบทความ</label>
                  <select v-model="formData.type" disabled class="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed transition-colors appearance-none">
                    <option value="Poster Presentation">Poster Presentation</option>
                  </select>
                </div>
              </div>

              <div class="space-y-4">
                <div>
                  <label class="text-sm font-bold text-slate-700 mb-2 block">รูปแบบการนำเสนอ</label>
                  <div class="flex gap-4">
                    <label class="flex items-center gap-2 cursor-not-allowed p-3 border border-slate-200 bg-slate-50 rounded-xl w-full">
                      <input type="radio" v-model="formData.format" value="On-site" disabled class="accent-purple-600" />
                      <span class="text-sm text-slate-500 font-bold">On-site (สถานที่จัดงาน)</span>
                    </label>
                  </div>
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
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users :size="20" class="text-purple-500"/> รายชื่อผู้แต่ง (Authors List)
              </h3>
            </div>

            <div class="overflow-hidden border border-slate-200 rounded-xl">
              <table class="w-full text-left">
                <thead class="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                  <tr>
                    <th class="px-6 py-4 w-16 text-center">#</th>
                    <th class="px-6 py-4">ชื่อ-สกุล</th>
                    <th class="px-6 py-4">สถาบัน</th>
                    <th class="px-6 py-4">สถานะ</th>
                    <th class="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr>
                    <td class="px-6 py-4 text-center text-sm font-medium text-slate-500">1</td>
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">
                          {{ userProfile ? (userProfile.first_name_en?.[0] || 'U') : 'U' }}
                        </div>
                        <span class="text-sm font-bold text-slate-800">
                          {{ userProfile ? ([userProfile.first_name_th, userProfile.last_name_th].filter(Boolean).join(' ') || userProfile.email) : 'คุณ' }}
                        </span>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-600">{{ userProfile?.institution || '-' }}</td>
                    <td class="px-6 py-4">
                      <span class="bg-purple-50 text-purple-600 px-2 py-1 rounded-md text-[10px] font-bold border border-purple-100">Corresponding</span>
                    </td>
                    <td class="px-6 py-4 text-right"><span class="text-xs text-slate-400">(คุณ)</span></td>
                  </tr>
                  
                  <tr v-for="(author, idx) in formData.authors" :key="idx">
                    <td class="px-6 py-4 text-center text-sm font-medium text-slate-500">{{ idx + 2 }}</td>
                    <td class="px-6 py-4">
                      <span class="text-sm font-bold text-slate-800">{{ author }}</span>
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-600">-</td>
                    <td class="px-6 py-4">
                      <span class="bg-slate-50 text-slate-500 px-2 py-1 rounded-md text-[10px] font-bold border border-slate-200">Co-author</span>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <button @click="removeCoAuthor(idx)" class="text-slate-400 hover:text-red-500 transition-colors">
                        <X :size="16" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="p-6 bg-slate-50 border-t border-slate-200">
                <div class="max-w-md mx-auto space-y-3">
                  <div class="text-xs font-black text-slate-500 uppercase tracking-wider text-center mb-1">เพิ่มผู้ร่วมวิจัยจากฐานข้อมูล</div>
                  <div class="relative">
                    <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      v-model="coAuthorQuery" 
                      @input="searchCoAuthor"
                      placeholder="ค้นหาด้วยชื่อ หรือ นามสกุล..." 
                      class="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 shadow-sm transition-all" 
                    />
                  </div>

                  <!-- Search Results Dropdown -->
                  <div v-if="coAuthorResults.length > 0" class="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <button 
                      v-for="u in coAuthorResults" :key="u.user_id"
                      @click="addCoAuthorFromSearch(u)"
                      class="w-full px-4 py-3 text-left hover:bg-purple-50 flex items-center justify-between group transition-colors border-b border-slate-50 last:border-0"
                    >
                      <div>
                        <div class="text-sm font-bold text-slate-800">{{ u.first_name_th }} {{ u.last_name_th }}</div>
                        <div class="text-[10px] text-slate-500">{{ u.institution || 'ไม่ระบุสถาบัน' }}</div>
                      </div>
                      <Plus :size="16" class="text-slate-300 group-hover:text-purple-600 transition-colors" />
                    </button>
                  </div>

                  <!-- Not Found Warning -->
                  <div v-else-if="coAuthorQuery.length >= 2 && !isSearchingCoAuthor" class="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <AlertCircle :size="18" class="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p class="text-xs font-bold text-amber-900 leading-relaxed">ไม่พบรายชื่อในระบบ</p>
                      <p class="text-[10px] text-amber-700/80 mt-0.5 leading-relaxed">กรุณาแจ้งให้ผู้ร่วมวิจัยลงทะเบียนเข้าสู่ระบบก่อน เพื่อความถูกต้องของข้อมูลและประวัติการวิจัย</p>
                    </div>
                  </div>
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
                  <label class="text-sm font-bold text-slate-700 mb-2 block">บทคัดย่อภาษาไทย</label>
                  <textarea v-model="formData.abstract_th" rows="5" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 transition-colors resize-none custom-scrollbar" 
                            placeholder="พิมพ์เนื้อหาบทคัดย่อภาษาไทย..."></textarea>
                </div>
                <div>
                  <label class="text-sm font-bold text-slate-700 mb-2 block">บทคัดย่อภาษาอังกฤษ (English Abstract)</label>
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
                  <p class="text-[10px] text-slate-400 mt-1">*คั่นด้วยเครื่องหมายลูกน้ำ (,) หรือกด Enter</p>
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
                 <label class="text-sm font-bold text-slate-700 mb-2 block">1. ไฟล์บทความฉบับเต็ม (Full Paper)</label>
                 
                 <label class="border-2 border-dashed border-slate-300 rounded-2xl p-10 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-purple-400 transition-all cursor-pointer group h-48 bg-slate-50/50">
                   <input type="file" class="hidden" accept=".pdf" @change="handlePickUploadFile" />
                   
                   <div v-if="uploadFile" class="flex flex-col items-center">
                     <FileUp :size="32" class="text-purple-600 mb-2" />
                     <p class="text-sm font-bold text-slate-800">{{ uploadFile.name }}</p>
                     <p class="text-xs text-slate-500 mt-1">{{ (uploadFile.size / (1024 * 1024)).toFixed(2) }} MB</p>
                   </div>
                   <div v-else class="flex flex-col items-center">
                     <div class="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                       <FileUp :size="24" class="text-purple-500" />
                     </div>
                     <p class="text-sm font-bold text-slate-600">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่</p>
                     <p class="text-xs text-slate-400 mt-1">(.pdf ไม่เกิน 10MB)</p>
                   </div>
                 </label>
                 <p v-if="uploadError" class="text-xs font-bold text-red-500 mt-2">{{ uploadError }}</p>
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
  </div>
</template>
