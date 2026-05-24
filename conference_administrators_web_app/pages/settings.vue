<script setup>
definePageMeta({ middleware: 'auth', layout: 'admin' });
import { computed, ref, watch, onMounted } from 'vue';
import {
  CalendarDays,
  Eye,
  EyeOff,
  Save,
  Trash2,
  Upload,
  User,
  Users,
  X,
  CheckSquare,
  Loader2
} from 'lucide-vue-next';

const currentYear = new Date().getFullYear();
const availableYears = Array.from({ length: 10 }, (_, i) => String(currentYear - 2 + i));




const allTracks = [
  'เทคโนโลยีภูมิสารสนเทศและภูมิศาสตร์',
  'เคมี',
  'วิทยาศาสตร์และเทคโนโลยีสิ่งแวดล้อม',
  'สาธารณสุขศาสตร์',
  'สถิติประยุกต์และวิทยาการสารสนเทศ',
  'ชีววิทยา',
  'เทคโนโลยีสารสนเทศ',
  'วิทยาการคอมพิวเตอร์',
  'คณิตศาสตร์',
  'วิทยาศาสตร์การกีฬา',
  'นวัตกรรมสิ่งทอและการออกแบบ',
  'นวัตกรรมอาหารและแปรรูป'
];

const settingsState = useState('system_settings', () => ({
  conference: {
    name: 'IC-Sci 2025: Innovations for Sustainable Science',
    year: '2025',
    venue: 'คณะวิทยาศาสตร์ มหาวิทยาลัยราชภัฏบุรีรัมย์',
    activeTracks: ['วิทยาการคอมพิวเตอร์', 'เคมี', 'ชีววิทยา', 'เทคโนโลยีสารสนเทศ', 'คณิตศาสตร์'],
    dates: {
      submissionOpen: '2025-08-01',
      submissionClose: '2025-10-15',
      announcementDate: '2025-11-01',
      revisionDeadline: '2025-11-10',
      conferenceDate: '2025-11-15'
    }
  },
  reviewer: {
    defaultDeadlineDays: 14,
    maxWorkloadPerReviewer: 5
  },
  myAccount: {
    profilePictureDataUrl: '',
    prefix: '',
    firstName: 'สมชาย',
    lastName: 'ใจดี',
    email: 'admin1@example.com',
    phone: '081-234-5678'
  },
  proceedings_map: {}
}));

const activeTab = ref('conference');
const isSaving = ref(false);
const isUploadingCover = ref(false);
const proceedingsYear = ref(new Date().getFullYear().toString());
const proceedingsUrlInput = ref('');
const proceedingsThemeInput = ref('');
const proceedingsSubtitleInput = ref('');
const toast = ref(null); // { message, type: 'success' | 'error' }

const saveProceedingsInfo = () => {
  const targetYear = proceedingsYear.value;
  if (!targetYear || !proceedingsUrlInput.value) {
    showToast('กรุณาระบุปี และ URL ของรวมเล่ม', 'error');
    return;
  }
  if (!draft.value.proceedings_map) draft.value.proceedings_map = {};
  
  const existing = draft.value.proceedings_map[targetYear] || {};
  let currentCover = '';
  if (typeof existing === 'string') currentCover = '';
  else currentCover = existing.cover || '';
  
  draft.value.proceedings_map[targetYear] = {
    url: proceedingsUrlInput.value,
    cover: currentCover,
    theme: proceedingsThemeInput.value,
    subtitle: proceedingsSubtitleInput.value
  };
  
  proceedingsUrlInput.value = '';
  proceedingsThemeInput.value = '';
  proceedingsSubtitleInput.value = '';
  showToast(`✅ บันทึกข้อมูลรวมเล่มปี ${targetYear} สำเร็จ`, 'success');
};

const uploadCover = async (event, year) => {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('กรุณาเลือกไฟล์รูปภาพเท่านั้น', 'error');
    return;
  }
  
  isUploadingCover.value = true;
  try {
    const ext = file.name.split('.').pop();
    const fileName = `cover_${year}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('proceedings').upload(fileName, file);
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('proceedings').getPublicUrl(fileName);
      
      if (!draft.value.proceedings_map[year]) {
        draft.value.proceedings_map[year] = { url: '', cover: publicUrl, theme: '', subtitle: '' };
      } else if (typeof draft.value.proceedings_map[year] === 'string') {
        draft.value.proceedings_map[year] = { url: draft.value.proceedings_map[year], cover: publicUrl, theme: '', subtitle: '' };
      } else {
        draft.value.proceedings_map[year].cover = publicUrl;
      }
      showToast(`✅ อัปโหลดปกปี ${year} สำเร็จ! อย่าลืมกดบันทึกการตั้งค่า`, 'success');
    } else {
      throw error;
    }
  } catch (err) {
    console.error('Upload Error:', err);
    showToast('อัปโหลดไม่สำเร็จ: ' + (err.message || 'ตรวจสอบว่ามี Bucket ชื่อ proceedings และตั้งเป็น Public หรือยัง'), 'error');
  } finally {
    isUploadingCover.value = false;
  }
};

const removeProceedings = (year) => {
  if (confirm(`ยืนยันการลบไฟล์รวมเล่มปี ${year}?`)) {
    delete draft.value.proceedings_map[year];
  }
};

const showToast = (message, type = 'success') => {
  toast.value = { message, type };
  setTimeout(() => { toast.value = null; }, 4000);
};

const profilePasswords = ref({
  current: '',
  next: '',
  confirm: ''
});

const profilePwVisible = ref({
  current: false,
  next: false,
  confirm: false
});

const draft = ref(JSON.parse(JSON.stringify(settingsState.value)));

watch(
  () => settingsState.value,
  (v) => {
    if (!v) return;
    draft.value = JSON.parse(JSON.stringify(v));
  },
  { deep: true }
);

const resetDraft = () => {
  draft.value = JSON.parse(JSON.stringify(settingsState.value));
  profilePasswords.value = { current: '', next: '', confirm: '' };
};

const confirmOpen = ref(false);
const openConfirm = () => { confirmOpen.value = true; };
const closeConfirm = () => { confirmOpen.value = false; };

// --- PERSISTENCE ---
const supabase = useSupabase();

const DEFAULT_SETTINGS = {
  conference: {
    name: 'IC-Sci 2025: Innovations for Sustainable Science',
    year: '2025',
    academicYear: '2024',
    venue: 'คณะวิทยาศาสตร์ มหาวิทยาลัยราชภัฏบุรีรัมย์',
    activeTracks: [],
    dates: {
      submissionOpen: '',
      submissionClose: '',
      announcementDate: '',
      revisionDeadline: '',
      conferenceDate: ''
    },
    finalistCount: 20
  },
  reviewer: { defaultDeadlineDays: 14, maxWorkloadPerReviewer: 5 },
  myAccount: { profilePictureDataUrl: '', prefix: '', firstName: '', lastName: '', email: '', phone: '' },
  proceedings_map: {}
};

const deepMerge = (target, source) => {
  const result = { ...target };
  for (const key of Object.keys(source || {})) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
};

const loadSettings = async () => {
  try {
    const { data, error } = await supabase.from('system_settings').select('config_json').eq('id', 1).maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    if (data && data.config_json) {
      // Deep-merge DB data with defaults so new fields always exist
      const merged = deepMerge(DEFAULT_SETTINGS, data.config_json);

      // Fix email/phone swap: if phone looks like an email, clear it
      if (merged.myAccount) {
        const phoneVal = String(merged.myAccount.phone || '').trim();
        if (phoneVal.includes('@')) {
          merged.myAccount.phone = '';
        }
      }

      settingsState.value = merged;
      draft.value = JSON.parse(JSON.stringify(merged));
    }

    // Always load email from auth (the email field is read-only)
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      draft.value.myAccount.email = user.email;
      settingsState.value.myAccount.email = user.email;
    }
  } catch (err) {
    console.error('Error loading settings:', err.message);
  }
};

onMounted(loadSettings);

const saveSettings = async () => {
  isSaving.value = true;
  try {
    // Ensure email is synced from auth before saving
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      draft.value.myAccount.email = user.email;
    }

    const { error } = await supabase.from('system_settings').upsert({
      id: 1,
      config_json: draft.value,
      updated_at: new Date().toISOString()
    });

    if (error) {
      if (error.code === '42P01') {
        showToast('ไม่พบตาราง system_settings ในฐานข้อมูล กรุณาสร้างตารางก่อน', 'error');
      } else {
        showToast('บันทึกไม่สำเร็จ: ' + error.message, 'error');
      }
      closeConfirm();
      return;
    }

    settingsState.value = JSON.parse(JSON.stringify(draft.value));
    profilePasswords.value = { current: '', next: '', confirm: '' };
    closeConfirm();
    showToast('✅ บันทึกการตั้งค่าระบบเรียบร้อยแล้ว!', 'success');
  } catch (err) {
    showToast('ไม่สามารถบันทึกได้: ' + err.message, 'error');
    closeConfirm();
  } finally {
    isSaving.value = false;
  }
};


const profileFileInputRef = ref(null);
const isUploadingPicture = ref(false);

const pickProfilePicture = () => {
  profileFileInputRef.value?.click();
};

// Compress image via canvas to prevent oversized base64 in config_json
const compressImage = (file, maxWidth = 256, quality = 0.7) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = (maxWidth / w) * h;
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(ev.target?.result || '');
    };
    reader.readAsDataURL(file);
  });
};

const onUploadProfilePicture = async (e) => {
  const file = e?.target?.files?.[0];
  if (!file) return;
  if (!file.type?.startsWith('image/')) {
    showToast('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG)', 'error');
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    showToast('ขนาดไฟล์เกิน 2MB กรุณาเลือกรูปที่เล็กกว่า', 'error');
    return;
  }

  isUploadingPicture.value = true;
  try {
    const compressed = await compressImage(file);
    draft.value.myAccount.profilePictureDataUrl = compressed;
    showToast('✅ อัปโหลดรูปภาพสำเร็จ! กดบันทึกเพื่อยืนยัน', 'success');
  } catch (err) {
    showToast('อัปโหลดรูปภาพไม่สำเร็จ: ' + (err.message || 'Unknown error'), 'error');
  } finally {
    isUploadingPicture.value = false;
  }
};

const removeProfilePicture = () => {
  draft.value.myAccount.profilePictureDataUrl = '';
  if (profileFileInputRef.value) profileFileInputRef.value.value = '';
};

const passwordPolicyOk = computed(() => {
  const pw = profilePasswords.value.next || '';
  if (pw.length < 8) return false;
  const hasLetter = /[A-Za-z]/.test(pw);
  const hasNumber = /\d/.test(pw);
  return hasLetter && hasNumber;
});

const isChangingPassword = computed(() => {
  return Boolean(profilePasswords.value.current || profilePasswords.value.next || profilePasswords.value.confirm);
});

const passwordChangeValid = computed(() => {
  if (!isChangingPassword.value) return true;
  if (!profilePasswords.value.current) return false;
  if (!profilePasswords.value.next || !profilePasswords.value.confirm) return false;
  if (!passwordPolicyOk.value) return false;
  if (profilePasswords.value.next !== profilePasswords.value.confirm) return false;
  return true;
});

const canSaveProfile = computed(() => {
  const first = (draft.value?.myAccount?.firstName || '').trim();
  const last = (draft.value?.myAccount?.lastName || '').trim();
  if (!first && !last) return passwordChangeValid.value; // allow if names empty (admin may not fill)
  return passwordChangeValid.value;
});

const conferenceNotice = computed(() => {
  const d = draft.value?.conference?.dates;
  if (!d) return '';
  return 'หมายเหตุ: การเปลี่ยนวันที่ตรงนี้ จะมีระบบเปิด-ปิดปุ่มส่งงานอัตโนมัติตามเวลา';
});
</script>

<template>
  <div class="p-8 pb-20 font-['Sarabun'] animate-fade-in">
    <!-- Toast Notification -->
    <Transition name="toast">
      <div
        v-if="toast"
        :class="[
          'fixed top-6 right-6 z-[9999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border text-sm font-black transition-all',
          toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        ]"
      >
        <span>{{ toast.message }}</span>
        <button @click="toast = null" class="ml-2 opacity-60 hover:opacity-100">×</button>
      </div>
    </Transition>

    <div class="mb-6">
          <h2 class="text-2xl font-bold text-slate-800 mb-1">⚙️ ตั้งค่าระบบ (System Settings)</h2>
          <p class="text-sm text-slate-500">จัดการข้อมูลงานประชุม กำหนดการ สาขาวิชา และการตั้งค่าผู้ประเมิน</p>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="h-10 px-4 rounded-xl text-xs font-black inline-flex items-center gap-2 transition-colors"
                :class="activeTab === 'conference' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'"
                @click="activeTab = 'conference'"
              >
                <CalendarDays class="w-4 h-4" />
                ข้อมูลและกำหนดการ
              </button>
              <button
                type="button"
                class="h-10 px-4 rounded-xl text-xs font-black inline-flex items-center gap-2 transition-colors"
                :class="activeTab === 'reviewer' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'"
                @click="activeTab = 'reviewer'"
              >
                <Users class="w-4 h-4" />
                การตั้งค่าผู้ประเมิน
              </button>
              <button
                type="button"
                class="h-10 px-4 rounded-xl text-xs font-black inline-flex items-center gap-2 transition-colors"
                :class="activeTab === 'account' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'"
                @click="activeTab = 'account'"
              >
                <User class="w-4 h-4" />
                โปรไฟล์ฉัน
              </button>
            </div>
          </div>

          <div class="p-6">
            <div v-if="activeTab === 'conference'" class="space-y-6">
              <template v-if="draft.conference">
              <div class="p-6 rounded-2xl border border-slate-200 bg-white">
                <div class="text-sm font-black text-slate-800 mb-4">📌 ข้อมูลพื้นฐานงานประชุม (Basic Info)</div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div class="text-xs font-black text-slate-700 mb-2">ชื่องานประชุม (Conference Name)</div>
                    <input v-model="draft.conference.name" type="text" class="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none" />
                  </div>
                  <div>
                    <div class="text-xs font-black text-slate-700 mb-2">ปีงานประชุม ค.ศ. (Event Year)</div>
                    <select v-model="draft.conference.year" class="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none appearance-none cursor-pointer">
                      <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
                    </select>
                  </div>
                  <div>
                    <div class="text-xs font-black text-slate-700 mb-2">ปีการศึกษา ค.ศ. (Academic Year)</div>
                    <select v-model="draft.conference.academicYear" class="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none appearance-none cursor-pointer">
                      <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
                    </select>
                  </div>
                  <div class="md:col-span-2">
                    <div class="text-xs font-black text-slate-700 mb-2">สถานที่จัดงาน (Venue)</div>
                    <input v-model="draft.conference.venue" type="text" class="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none" />
                  </div>

                  <div class="md:col-span-2 mt-2">
                    <div class="text-xs font-black text-slate-700 mb-2">สาขาวิชาที่เปิดรับบทความในปีนี้ (Active Tracks) — เลือกที่ต้องการเปิดรับ</div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      <label v-for="track in allTracks" :key="track"
                        :class="['flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors',
                          draft.conference.activeTracks?.includes(track)
                            ? 'border-indigo-400 bg-indigo-50'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                        ]">
                        <input type="checkbox" :value="track" v-model="draft.conference.activeTracks" class="w-4 h-4 accent-indigo-600" />
                        <span class="text-sm font-semibold text-slate-700">{{ track }}</span>
                      </label>
                    </div>
                    <div class="mt-2 text-xs font-semibold text-indigo-600">{{ draft.conference.activeTracks?.length || 0 }} สาขาที่เลือก</div>
                  </div>
                </div>
              </div>

              <div class="p-6 rounded-2xl border border-slate-200 bg-white">
                <div class="text-sm font-black text-slate-800 mb-4">📚 ห้องสมุดรวมเล่ม (Proceedings Library)</div>
                
                <!-- ADD/UPDATE SECTION -->
                <div class="p-5 rounded-2xl bg-slate-50 border border-slate-200 mb-6">
                  <div class="flex flex-col md:flex-row gap-4 items-end">
                    <div class="w-full md:w-32">
                      <label class="text-[10px] font-black text-slate-500 uppercase mb-1.5 block">ปี (ค.ศ.)</label>
                      <input v-model="proceedingsYear" type="number" class="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-bold" />
                    </div>
                    <div class="flex-1">
                      <label class="text-[10px] font-black text-slate-500 uppercase mb-1.5 block">ธีมงาน (Theme)</label>
                      <input v-model="proceedingsThemeInput" type="text" placeholder="เช่น BRICC Festival" class="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-bold" />
                    </div>
                    <div class="flex-1">
                      <label class="text-[10px] font-black text-slate-500 uppercase mb-1.5 block">คำบรรยาย (Subtitle)</label>
                      <input v-model="proceedingsSubtitleInput" type="text" placeholder="เช่น The 10th Conference..." class="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-bold" />
                    </div>
                  </div>
                  <div class="flex flex-col md:flex-row gap-4 items-end mt-4">
                    <div class="flex-1">
                      <label class="text-[10px] font-black text-slate-500 uppercase mb-1.5 block">ลิงก์ดาวน์โหลดเล่มรวม (URL)</label>
                      <input v-model="proceedingsUrlInput" type="text" placeholder="https://..." class="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-bold" />
                    </div>
                    <button type="button" @click="saveProceedingsInfo" class="shrink-0 h-11 px-6 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition-colors">
                      บันทึกข้อมูลปีนี้
                    </button>
                  </div>
                </div>

                <!-- LIST OF PROCEEDINGS -->
                <div class="space-y-4">
                  <div v-for="(data, year) in (draft.proceedings_map || {})" :key="year" class="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white border border-slate-200 rounded-3xl shadow-sm gap-4">
                    <div class="flex items-center gap-4 flex-1 min-w-0">
                      <div class="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative flex items-center justify-center">
                        <img v-if="(typeof data === 'object' && data.cover)" :src="data.cover" class="w-full h-full object-cover" />
                        <span v-else class="text-[9px] font-bold text-slate-400 text-center px-1">No Cover</span>
                      </div>
                      <div class="min-w-0">
                        <div class="text-base font-black text-slate-800">รวมเล่มปี {{ year }}</div>
                        <div v-if="typeof data === 'object'" class="text-[10px] font-bold text-slate-400 mb-1 line-clamp-1">
                          {{ data.theme }} | {{ data.subtitle }}
                        </div>
                        <a :href="typeof data === 'string' ? data : data.url" target="_blank" class="text-xs font-bold text-indigo-500 hover:underline truncate block">ลิงก์: {{ typeof data === 'string' ? data : data.url }}</a>
                      </div>
                    </div>
                    
                    <div class="flex items-center gap-2 shrink-0">
                      <label :class="['h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-600 flex items-center justify-center gap-2 text-xs font-bold transition-all', isUploadingCover ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 cursor-pointer']">
                        <input type="file" accept="image/*" class="hidden" @change="e => uploadCover(e, year)" :disabled="isUploadingCover" />
                        <Loader2 v-if="isUploadingCover" class="w-4 h-4 animate-spin" />
                        <Upload v-else class="w-4 h-4" /> อัปโหลดปก
                      </label>
                      <button @click="removeProceedings(year)" class="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors">
                        <Trash2 class="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div v-if="!draft.proceedings_map || Object.keys(draft.proceedings_map).length === 0" class="py-10 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                    <p class="text-xs font-bold text-slate-400 italic">ยังไม่มีข้อมูลรวมเล่มในคลัง</p>
                  </div>
                </div>
              </div>

              <div class="p-6 rounded-2xl border border-slate-200 bg-white">
                <div class="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div class="text-sm font-black text-slate-800">⏳ กำหนดการและเดดไลน์ (Important Dates)</div>
                    <div class="text-[11px] font-semibold text-amber-700 mt-1">{{ conferenceNotice }}</div>
                  </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div class="text-xs font-black text-slate-700 mb-2">เปิดรับบทความวันแรก</div>
                    <input v-model="draft.conference.dates.submissionOpen" type="date" class="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none" />
                  </div>
                  <div>
                    <div class="text-xs font-black text-slate-700 mb-2">วันสุดท้ายของการส่งบทความ</div>
                    <input v-model="draft.conference.dates.submissionClose" type="date" class="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none" />
                  </div>
                  <div>
                    <div class="text-xs font-black text-slate-700 mb-2">วันประกาศผลการพิจารณา</div>
                    <input v-model="draft.conference.dates.announcementDate" type="date" class="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none" />
                  </div>
                  <div>
                    <div class="text-xs font-black text-slate-700 mb-2">วันสุดท้ายของการส่งงานแก้ไข</div>
                    <input v-model="draft.conference.dates.revisionDeadline" type="date" class="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none" />
                  </div>
                  <div>
                    <div class="text-xs font-black text-slate-700 mb-2">วันจัดงานประชุม</div>
                    <input v-model="draft.conference.dates.conferenceDate" type="date" class="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none" />
                  </div>
                </div>
              </div>

              <div class="p-6 rounded-2xl border border-slate-200 bg-white">
                <div class="text-sm font-black text-slate-800 mb-4">🏆 การตั้งค่ารางวัล (Awards Settings)</div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div class="text-xs font-black text-slate-700 mb-2">จำนวนทีมผ่านเข้ารอบ (Finalist Count)</div>
                    <div class="flex items-center gap-3">
                      <input v-model.number="draft.conference.finalistCount" type="number" min="1" class="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none" />
                      <span class="text-sm font-bold text-slate-500 whitespace-nowrap">ทีม</span>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-2">จำนวนทีมที่ผ่านเข้ารอบสำหรับการออกเกียรติบัตร "ผ่านเข้ารอบ" (ทีมที่ไม่ผ่านจะได้เกียรติบัตร "เข้าร่วม")</p>
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-end gap-2">
                <button type="button" class="h-10 px-4 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50" @click="resetDraft">ยกเลิก</button>
                <button type="button" class="h-10 px-4 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 inline-flex items-center gap-2" @click="openConfirm">
                  <Save class="w-4 h-4" />
                  บันทึกการตั้งค่า
                </button>
              </div>
              </template>
            </div>

            <div v-else-if="activeTab === 'reviewer'" class="space-y-6">
              <div class="p-6 rounded-2xl border border-slate-200 bg-white">
                <div class="text-sm font-black text-slate-800 mb-4">👥 ตั้งค่าการมอบหมายงาน (Reviewer Settings)</div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div class="text-xs font-black text-slate-700 mb-2">ระยะเวลาในการประเมินผล (วัน)</div>
                    <div class="flex items-center gap-3">
                      <input v-model.number="draft.reviewer.defaultDeadlineDays" type="number" class="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none" />
                      <span class="text-sm font-bold text-slate-500 whitespace-nowrap">วัน</span>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-2">กำหนดเดดไลน์อัตโนมัติเมื่อมีการมอบหมายงาน (นับจากวันที่มอบหมาย)</p>
                  </div>
                  <div>
                    <div class="text-xs font-black text-slate-700 mb-2">จำนวนงานสูงสุดต่อกรรมการ 1 ท่าน</div>
                    <div class="flex items-center gap-3">
                      <input v-model.number="draft.reviewer.maxWorkloadPerReviewer" type="number" class="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none" />
                      <span class="text-sm font-bold text-slate-500 whitespace-nowrap">งาน</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-end gap-2">
                <button type="button" class="h-10 px-4 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50" @click="resetDraft">ยกเลิก</button>
                <button type="button" class="h-10 px-4 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 inline-flex items-center gap-2" @click="openConfirm">
                  <Save class="w-4 h-4" />
                  บันทึกการตั้งค่า
                </button>
              </div>
            </div>



            <div v-else class="space-y-6">
              <div class="p-6 rounded-2xl border border-slate-200 bg-white">
                <div class="text-sm font-black text-slate-800 mb-4">👤 โปรไฟล์ฉัน (My Profile)</div>

                <div class="space-y-6">
                  <div>
                    <div class="text-xs font-black text-slate-700 mb-3">🖼️ รูปโปรไฟล์ (Profile Picture)</div>
                    <div class="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row items-start md:items-center gap-4">
                      <div class="w-16 h-16 rounded-2xl border border-slate-200 bg-white overflow-hidden flex items-center justify-center">
                        <img
                          v-if="draft.myAccount.profilePictureDataUrl"
                          :src="draft.myAccount.profilePictureDataUrl"
                          alt="Profile"
                          class="w-full h-full object-cover"
                        />
                        <User v-else class="w-7 h-7 text-slate-400" />
                      </div>

                      <div class="flex-1">
                        <div class="flex flex-wrap items-center gap-2">
                          <input ref="profileFileInputRef" type="file" accept="image/*" class="hidden" @change="onUploadProfilePicture" />
                          <button
                            type="button"
                            class="h-10 px-4 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
                            :disabled="isUploadingPicture"
                            :class="isUploadingPicture ? 'opacity-50 cursor-wait' : ''"
                            @click="pickProfilePicture"
                          >
                            <Upload v-if="!isUploadingPicture" class="w-4 h-4" />
                            <span v-else class="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                            {{ isUploadingPicture ? 'กำลังประมวลผล...' : 'อัปโหลดรูปภาพใหม่' }}
                          </button>

                          <button
                            type="button"
                            class="h-10 px-4 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
                            :disabled="!draft.myAccount.profilePictureDataUrl"
                            :class="!draft.myAccount.profilePictureDataUrl ? 'opacity-50 cursor-not-allowed' : ''"
                            @click="removeProfilePicture"
                          >
                            <Trash2 class="w-4 h-4" />
                            ลบรูปภาพปัจจุบัน
                          </button>
                        </div>
                        <div class="text-[11px] font-semibold text-slate-500 mt-2">รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 2MB</div>
                      </div>
                    </div>
                  </div>

                  <div class="border-t border-slate-200"></div>

                  <div>
                    <div class="text-xs font-black text-slate-700 mb-3">📝 ข้อมูลส่วนตัว (Personal Information)</div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div class="text-xs font-black text-slate-700 mb-2">คำนำหน้า (Prefix)</div>
                        <select 
                          v-model="draft.myAccount.prefix" 
                          class="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none appearance-none cursor-pointer"
                        >
                          <option value="">เลือกคำนำหน้า</option>
                          <option value="นาย">นาย (Mr.)</option>
                          <option value="นาง">นาง (Mrs.)</option>
                          <option value="นางสาว">นางสาว (Ms.)</option>
                          <option value="ดร.">ดร. (Dr.)</option>
                          <option value="ผศ.">ผศ. (Asst. Prof.)</option>
                          <option value="ผศ.ดร.">ผศ.ดร. (Asst. Prof. Dr.)</option>
                          <option value="รองศาสตราจารย์">รศ. (Assoc. Prof.)</option>
                          <option value="รศ.ดร.">รศ.ดร. (Assoc. Prof. Dr.)</option>
                          <option value="ศาสตราจารย์">ศ. (Prof.)</option>
                          <option value="ศ.ดร.">ศ.ดร. (Prof. Dr.)</option>
                        </select>
                      </div>
                      <div>
                        <div class="text-xs font-black text-slate-700 mb-2">ชื่อจริง (First Name)</div>
                        <input v-model="draft.myAccount.firstName" type="text" class="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none" />
                      </div>
                      <div>
                        <div class="text-xs font-black text-slate-700 mb-2">นามสกุล (Last Name)</div>
                        <input v-model="draft.myAccount.lastName" type="text" class="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none" />
                      </div>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <div class="text-xs font-black text-slate-700 mb-2">อีเมล (Email) 🔒</div>
                        <input v-model="draft.myAccount.email" type="email" disabled class="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-500 focus:outline-none cursor-not-allowed" />
                      </div>
                      <div>
                        <div class="text-xs font-black text-slate-700 mb-2">เบอร์โทรศัพท์ (Phone)</div>
                        <input 
                          v-model="draft.myAccount.phone" 
                          type="tel" 
                          placeholder="ยังไม่ได้ระบุเบอร์โทรศัพท์"
                          class="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none placeholder:text-slate-300" 
                        />
                      </div>
                    </div>
                    <div class="text-[11px] font-semibold text-slate-500 mt-2">หมายเหตุ: อีเมลใช้สำหรับการเข้าระบบ หากต้องการเปลี่ยนกรุณาติดต่อ IT</div>
                  </div>

                  <div class="border-t border-slate-200"></div>

                  <div>
                    <div class="text-xs font-black text-slate-700 mb-3">🔐 ความปลอดภัยและรหัสผ่าน (Security & Password)</div>

                    <div>
                      <div class="text-xs font-black text-slate-700 mb-2">รหัสผ่านปัจจุบัน (Current Password)</div>
                      <div class="relative">
                        <input
                          v-model="profilePasswords.current"
                          :type="profilePwVisible.current ? 'text' : 'password'"
                          class="w-full pr-12 px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          class="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 inline-flex items-center justify-center"
                          @click="profilePwVisible.current = !profilePwVisible.current"
                        >
                          <Eye v-if="!profilePwVisible.current" class="w-4 h-4 text-slate-600" />
                          <EyeOff v-else class="w-4 h-4 text-slate-600" />
                        </button>
                      </div>
                    </div>

                    <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div class="text-xs font-black text-slate-700 mb-2">รหัสผ่านใหม่ (New Password)</div>
                        <div class="relative">
                          <input
                            v-model="profilePasswords.next"
                            :type="profilePwVisible.next ? 'text' : 'password'"
                            class="w-full pr-12 px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            class="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 inline-flex items-center justify-center"
                            @click="profilePwVisible.next = !profilePwVisible.next"
                          >
                            <Eye v-if="!profilePwVisible.next" class="w-4 h-4 text-slate-600" />
                            <EyeOff v-else class="w-4 h-4 text-slate-600" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <div class="text-xs font-black text-slate-700 mb-2">ยืนยันรหัสผ่านใหม่</div>
                        <div class="relative">
                          <input
                            v-model="profilePasswords.confirm"
                            :type="profilePwVisible.confirm ? 'text' : 'password'"
                            class="w-full pr-12 px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            class="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 inline-flex items-center justify-center"
                            @click="profilePwVisible.confirm = !profilePwVisible.confirm"
                          >
                            <Eye v-if="!profilePwVisible.confirm" class="w-4 h-4 text-slate-600" />
                            <EyeOff v-else class="w-4 h-4 text-slate-600" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div class="text-[11px] font-semibold mt-2" :class="passwordPolicyOk ? 'text-slate-500' : 'text-amber-700'">
                      รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร ประกอบด้วยตัวเลขและตัวอักษร
                    </div>

                    <div v-if="isChangingPassword && !profilePasswords.current" class="text-[11px] font-semibold text-rose-600 mt-1">
                      กรุณากรอกรหัสผ่านปัจจุบันก่อนบันทึก
                    </div>
                    <div v-else-if="isChangingPassword && profilePasswords.next && profilePasswords.confirm && profilePasswords.next !== profilePasswords.confirm" class="text-[11px] font-semibold text-rose-600 mt-1">
                      รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน
                    </div>
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-end gap-2">
                <button type="button" class="h-10 px-4 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50" @click="resetDraft">ยกเลิก</button>
                <button
                  type="button"
                  class="h-10 px-4 rounded-xl text-xs font-black inline-flex items-center gap-2"
                  :class="canSaveProfile ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-200 text-slate-500 cursor-not-allowed'"
                  :disabled="!canSaveProfile"
                  @click="openConfirm"
                >
                  <Save class="w-4 h-4" />
                  บันทึกข้อมูลโปรไฟล์
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="confirmOpen" class="fixed inset-0 z-50">
          <div class="absolute inset-0 bg-black/40" @click="closeConfirm"></div>
          <div class="absolute inset-0 flex items-center justify-center p-4">
            <div class="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden" @click.stop>
              <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <div class="text-lg font-black text-slate-800">ยืนยันการบันทึกการตั้งค่า</div>
                  <div class="text-[11px] font-semibold text-slate-500 mt-0.5">การเปลี่ยนแปลงจะมีผลกับระบบทันที</div>
                </div>
                <button type="button" class="h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 inline-flex items-center justify-center" @click="closeConfirm">
                  <X class="w-4 h-4 text-slate-700" />
                </button>
              </div>
              <div class="p-6">
                <div class="text-sm font-semibold text-slate-600">
                  คุณแน่ใจหรือไม่ที่จะบันทึกการตั้งค่า? การเปลี่ยนแปลงจะมีผลทันทีกับทุกส่วนของระบบ
                </div>
              </div>
              <div class="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button type="button" class="h-10 px-4 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50" @click="closeConfirm" :disabled="isSaving">ยกเลิก</button>
                <button
                  type="button"
                  class="h-10 px-5 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 inline-flex items-center gap-2 disabled:opacity-60"
                  @click="saveSettings"
                  :disabled="isSaving"
                >
                  <Save class="w-4 h-4" />
                  {{ isSaving ? 'กำลังบันทึก...' : 'ยืนยันและบันทึก' }}
                </button>
              </div>
            </div>
          </div>
        </div>
  </div>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active {
  transition: all 0.35s cubic-bezier(0.4,0,0.2,1);
}
.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translateX(40px) scale(0.95);
}
</style>
