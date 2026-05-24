<script setup>
definePageMeta({ layout: 'portal' });
import { ref, reactive, onMounted, computed, watch } from 'vue';
import {
  Bell, ChevronDown, Eye, EyeOff, Lock, Save, Settings as SettingsIcon, Upload, User,
  CheckCircle2, XCircle, Camera, FileEdit, Building2, KeyRound, Megaphone, Globe, AlertCircle, Shield,
  Search, Check
} from 'lucide-vue-next';
import { useAuth } from '~/composables/useAuth';
import { useSupabase } from '~/composables/useSupabase';
import { PREFIXES, ACADEMIC_POSITIONS, THAI_PROVINCES, THAI_UNIVERSITIES } from '~/utils/constants';

const { userProfile, currentUser } = useAuth();
const supabase = useSupabase();

const activeTab = ref('profile');
const toast = ref(null);
const isLoading = ref(false);

const tabs = [
  { id: 'profile', label: 'ข้อมูลส่วนตัว', icon: User },
  { id: 'security', label: 'รหัสผ่าน', icon: Lock },
  { id: 'prefs', label: 'การแจ้งเตือน', icon: Bell }
];

// Searchable dropdown states for Affiliation
const ddState = reactive({
  prefixTh: { show: false, search: '' },
  prefixEn: { show: false, search: '' },
  institution: { show: false, search: '' },
  position: { show: false, search: '' },
  province: { show: false, search: '' }
});

const filteredPrefixesTh = computed(() => {
  const s = ddState.prefixTh.search.toLowerCase();
  return s ? PREFIXES.filter(p => p.toLowerCase().includes(s)) : PREFIXES;
});
const filteredPrefixesEn = computed(() => {
  const s = ddState.prefixEn.search.toLowerCase();
  return s ? PREFIXES.filter(p => p.toLowerCase().includes(s)) : PREFIXES;
});
const filteredInstitutions = computed(() => {
  const s = ddState.institution.search.toLowerCase();
  return s ? THAI_UNIVERSITIES.filter(p => p.toLowerCase().includes(s)) : THAI_UNIVERSITIES;
});
const filteredPositions = computed(() => {
  const s = ddState.position.search.toLowerCase();
  return s ? ACADEMIC_POSITIONS.filter(p => p.toLowerCase().includes(s)) : ACADEMIC_POSITIONS;
});
const filteredProvinces = computed(() => {
  const s = ddState.province.search.toLowerCase();
  return s ? THAI_PROVINCES.filter(p => p.toLowerCase().includes(s)) : THAI_PROVINCES;
});

// Close dropdowns on outside click
const handleDropdownOutsideClick = (e) => {
  const keys = ['prefixTh', 'prefixEn', 'institution', 'position', 'province'];
  keys.forEach(key => {
    const el = document.querySelector(`.settings-dd-${key}`);
    if (el && !el.contains(e.target)) ddState[key].show = false;
  });
};
onMounted(() => document.addEventListener('mousedown', handleDropdownOutsideClick));
onUnmounted(() => document.removeEventListener('mousedown', handleDropdownOutsideClick));

const showToast = (message, tone = 'ok') => {
  toast.value = { message, tone };
  setTimeout(() => { toast.value = null; }, 3000);
};

// State for Profile
const avatarUrl = ref('');
const profileDraft = reactive({
  title: '',
  titleEn: '',
  email: '',
  firstNameTh: '',
  lastNameTh: '',
  firstNameEn: '',
  lastNameEn: '',
  institution: '',
  phone: '',
  academicPosition: '',
  province: ''
});

// State for Security
const passwordDraft = reactive({
  current: '',
  next: '',
  confirm: ''
});
const showPw = reactive({ current: false, next: false, confirm: false });

// State for Preferences
const originalPrefs = reactive({
  notifyStatus: true,
  notifyNews: false
});
const prefsDraft = reactive({ ...originalPrefs });

const isSecurityChanged = computed(() => {
  return passwordDraft.current !== '' || passwordDraft.next !== '' || passwordDraft.confirm !== '';
});

const isPrefsChanged = computed(() => {
  return prefsDraft.notifyStatus !== originalPrefs.notifyStatus ||
         prefsDraft.notifyNews !== originalPrefs.notifyNews;
});

const updatePrefs = () => {
  isLoading.value = true;
  setTimeout(() => {
    localStorage.setItem('app_notify_status', String(prefsDraft.notifyStatus));
    localStorage.setItem('app_notify_news', String(prefsDraft.notifyNews));
    
    Object.assign(originalPrefs, prefsDraft);

    showToast('บันทึกการตั้งค่าแล้ว');
    isLoading.value = false;
  }, 500);
};



const initProfileFromStore = () => {
  profileDraft.title = userProfile.value?.title || '';
  profileDraft.titleEn = userProfile.value?.title_en || '';
  profileDraft.email = userProfile.value?.email || currentUser.value?.email || '';
  profileDraft.firstNameTh = userProfile.value?.first_name_th || '';
  profileDraft.lastNameTh = userProfile.value?.last_name_th || '';
  profileDraft.firstNameEn = userProfile.value?.first_name_en || '';
  profileDraft.lastNameEn = userProfile.value?.last_name_en || '';
  profileDraft.institution = userProfile.value?.institution || '';
  profileDraft.phone = userProfile.value?.phone || '';
  profileDraft.academicPosition = userProfile.value?.academic_position || '';
  profileDraft.province = userProfile.value?.province || '';
  avatarUrl.value = userProfile.value?.avatar_url || '';
};

watch([userProfile, currentUser], () => {
  initProfileFromStore();
}, { immediate: true });

onMounted(async () => {
  if (!userProfile.value) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (profile) {
        userProfile.value = profile;
        initProfileFromStore();
      }
    }
  }

  // Load preferences from localStorage
  originalPrefs.notifyStatus = localStorage.getItem('app_notify_status') !== 'false'; // default true
  originalPrefs.notifyNews = localStorage.getItem('app_notify_news') === 'true'; // default false
  Object.assign(prefsDraft, originalPrefs);
});

const resetProfile = () => {
  initProfileFromStore();
  showToast('ยกเลิกการแก้ไขแล้ว');
};

const isProfileChanged = computed(() => {
  return profileDraft.title !== (userProfile.value?.title || '') ||
    profileDraft.titleEn !== (userProfile.value?.title_en || '') ||
    profileDraft.firstNameTh !== (userProfile.value?.first_name_th || '') ||
    profileDraft.lastNameTh !== (userProfile.value?.last_name_th || '') ||
    profileDraft.firstNameEn !== (userProfile.value?.first_name_en || '') ||
    profileDraft.lastNameEn !== (userProfile.value?.last_name_en || '') ||
    profileDraft.institution !== (userProfile.value?.institution || '') ||
    profileDraft.phone !== (userProfile.value?.phone || '') ||
    profileDraft.academicPosition !== (userProfile.value?.academic_position || '') ||
    profileDraft.province !== (userProfile.value?.province || '') ||
    avatarUrl.value !== (userProfile.value?.avatar_url || '');
});

// Phone Sanitize Watcher
watch(() => profileDraft.phone, (newVal) => {
  if (!newVal) return;
  let filtered = newVal.replace(/[^0-9-]/g, '');
  filtered = filtered.replace(/-+/g, '-');
  if (filtered.startsWith('-')) filtered = filtered.substring(1);
  if (filtered !== newVal) profileDraft.phone = filtered;
});

const validateProfile = () => {
  if (!profileDraft.title || !profileDraft.firstNameTh.trim() || !profileDraft.lastNameTh.trim()) {
    return { ok: false, msg: 'กรุณากรอกคำนำหน้า ชื่อ และนามสกุล (ภาษาไทย) ให้ครบ' };
  }
  if (!profileDraft.titleEn) {
    return { ok: false, msg: 'กรุณาเลือกคำนำหน้า (EN)' };
  }
  if (!profileDraft.firstNameEn.trim() || !profileDraft.lastNameEn.trim()) {
    return { ok: false, msg: 'กรุณากรอกชื่อและนามสกุล (ภาษาอังกฤษ) ให้ครบ' };
  }
  if (!profileDraft.institution.trim()) {
    return { ok: false, msg: 'กรุณากรอกมหาวิทยาลัย/หน่วยงาน' };
  }
  const cleanPhone = profileDraft.phone.replace(/\D/g, '');
  if (cleanPhone.length !== 10) {
    return { ok: false, msg: 'เบอร์โทรศัพท์ต้องมี 10 หลัก (เฉพาะตัวเลข)' };
  }
  return { ok: true };
};

const updateProfile = async () => {
  if (!userProfile.value) {
    showToast('ไม่พบข้อมูลผู้ใช้งาน กรุณาล็อกอินใหม่', 'err');
    return;
  }
  const v = validateProfile();
  if (!v.ok) {
    showToast(v.msg, 'err');
    return;
  }
  isLoading.value = true;
  try {
    const updates = {
      title: profileDraft.title,
      title_en: profileDraft.titleEn,
      first_name_th: profileDraft.firstNameTh,
      last_name_th: profileDraft.lastNameTh,
      first_name_en: profileDraft.firstNameEn,
      last_name_en: profileDraft.lastNameEn,
      institution: profileDraft.institution,
      phone: profileDraft.phone.replace(/\D/g, ''),
      academic_position: profileDraft.academicPosition,
      province: profileDraft.province,
      avatar_url: avatarUrl.value,
      updated_at: new Date().toISOString(),
    };
    
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('user_id', userProfile.value.user_id);
      
    if (error) throw error;
    
    // Update local profile ref
    Object.assign(userProfile.value, updates);
    showToast('บันทึกข้อมูลเรียบร้อยแล้ว');
  } catch (err) {
    console.error('updateProfile error:', err);
    showToast('เกิดข้อผิดพลาด: ' + (err?.message || 'ไม่สามารถบันทึกได้'), 'err');
  } finally {
    isLoading.value = false;
  }
};

const handleAvatarUpload = async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    showToast('ไฟล์ต้องไม่เกิน 2MB', 'err');
    e.target.value = '';
    return;
  }
  
  isLoading.value = true;
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `avatar_${userProfile.value.user_id}_${Date.now()}.${fileExt}`;
    const filePath = `avatars/${userProfile.value.user_id}/${fileName}`;
    
    const { error: uploadErr } = await supabase.storage.from('papers').upload(filePath, file);
    if (uploadErr) throw uploadErr;
    
    const { data: { publicUrl } } = supabase.storage.from('papers').getPublicUrl(filePath);
    avatarUrl.value = publicUrl;
    showToast('อัปโหลดรูปล่าสุดเรียบร้อย อย่าลืมกดบันทึก');
  } catch (error) {
    showToast('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ', 'err');
  } finally {
    isLoading.value = false;
  }
};

const removeAvatar = () => {
  avatarUrl.value = '';
  showToast('ลบรูปโปรไฟล์แล้ว อย่าลืมกดบันทึก');
};

const resetSecurity = () => {
  passwordDraft.current = '';
  passwordDraft.next = '';
  passwordDraft.confirm = '';
  showPw.current = false;
  showPw.next = false;
  showPw.confirm = false;
};

// Password Strength (same logic as register page)
const pwCriteria = computed(() => {
  const p = passwordDraft.next;
  const hasSequence = (str) => {
    const s = str.toLowerCase();
    for (let i = 0; i < s.length - 2; i++) {
      const c1 = s.charCodeAt(i), c2 = s.charCodeAt(i+1), c3 = s.charCodeAt(i+2);
      if (c2 === c1 + 1 && c3 === c2 + 1) return true;
      if (c2 === c1 - 1 && c3 === c2 - 1) return true;
    }
    return false;
  };
  return {
    length: p.length >= 8,
    upper: /[A-Z]/.test(p),
    lower: /[a-z]/.test(p),
    number: /[0-9]/.test(p),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(p),
    noSequence: p.length > 0 && !hasSequence(p)
  };
});
const pwScore = computed(() => Object.values(pwCriteria.value).filter(Boolean).length);
const pwStrength = computed(() => {
  const s = pwScore.value;
  if (s <= 3) return { label: 'Weak', color: 'text-rose-500', bar: 'bg-rose-500 w-1/4' };
  if (s <= 5) return { label: 'Good', color: 'text-amber-500', bar: 'bg-amber-500 w-2/4' };
  return { label: 'Strong', color: 'text-emerald-500', bar: 'bg-emerald-500 w-full' };
});

const criteriaLabels = { length: '8+ ตัวอักษร', upper: 'ตัวพิมพ์ใหญ่ (A)', lower: 'ตัวพิมพ์เล็ก (a)', number: 'ตัวเลข (0-9)', special: 'อักขระพิเศษ (@)', noSequence: 'ไม่มีตัวอักษรเรียงกัน' };

const updatePassword = async () => {
  if (!passwordDraft.current || !passwordDraft.next || !passwordDraft.confirm) {
    showToast('กรุณากรอกข้อมูลให้ครบทั้งรหัสผ่านเก่าและใหม่', 'err');
    return;
  }
  if (pwScore.value < 4) {
    showToast('รหัสผ่านใหม่ยังไม่ปลอดภัยเพียงพอ กรุณาทำตามคำแนะนำ', 'err');
    return;
  }
  if (passwordDraft.next !== passwordDraft.confirm) {
    showToast('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน', 'err');
    return;
  }

  isLoading.value = true;
  try {
    // Verify old password first
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: currentUser.value.email,
      password: passwordDraft.current
    });
    if (signInError) {
      showToast('รหัสผ่านเก่าไม่ถูกต้อง', 'err');
      isLoading.value = false;
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: passwordDraft.next
    });
    if (error) throw error;
    showToast('อัปเดตรหัสผ่านแล้ว');
    resetSecurity();
  } catch (error) {
    showToast(error.message || 'เกิดข้อผิดพลาดในการอัปเดตรหัสผ่าน', 'err');
  } finally {
    isLoading.value = false;
  }
};

const resetPrefs = () => {
  Object.assign(prefsDraft, originalPrefs);
  showToast('ยกเลิกการแก้ไขการตั้งค่าแล้ว');
};

const inputBase = "w-full h-11 px-4 rounded-2xl bg-white border border-slate-200 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100";
const disabledBase = "w-full h-11 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-500 cursor-not-allowed";
</script>

<template>
  <div class="flex-1 overflow-y-auto px-6 pt-8 pb-32 custom-scrollbar animate-in fade-in duration-300 bg-[#F1F5F9]">

    <!-- Fixed Toast Notification -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-4"
    >
      <div
        v-if="toast"
        :class="[
          'fixed top-6 left-1/2 -translate-x-1/2 z-[999] px-6 py-3 rounded-2xl border text-sm font-black shadow-lg shadow-black/10 inline-flex items-center gap-3 whitespace-nowrap',
          toast.tone === 'err' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        ]"
      >
        <CheckCircle2 v-if="toast.tone !== 'err'" class="w-5 h-5 text-emerald-600" />
        <XCircle v-else class="w-5 h-5 text-rose-600" />
        {{ toast.message }}
      </div>
    </Transition>
    <div class="max-w-4xl mx-auto w-full">
      <header class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-6">
        <div class="min-w-0">
          <div class="text-2xl font-black text-slate-900 truncate flex items-center gap-2"><SettingsIcon class="w-6 h-6 text-slate-600" /> การตั้งค่าและโปรไฟล์ (Settings & Profile)</div>
          <div class="mt-1 text-sm font-semibold text-slate-500 truncate">จัดการข้อมูลส่วนตัวและความปลอดภัยของบัญชีผู้ใช้</div>
        </div>
        <div class="hidden md:flex items-center gap-2 text-xs font-black text-slate-500">
          <SettingsIcon class="w-4 h-4" />
          Account Control Center
        </div>
      </header>

      <div class="rounded-[32px] bg-white border border-slate-200 shadow-sm">
        <div class="px-5 py-4 bg-slate-50 border-b border-slate-200 rounded-t-[32px]">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex flex-wrap gap-2">
              <button
                v-for="t in tabs"
                :key="t.id"
                @click="activeTab = t.id"
                :class="[
                  'h-10 px-4 rounded-2xl border text-sm font-black inline-flex items-center gap-2 transition-colors',
                  activeTab === t.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                ]"
              >
                <component :is="t.icon" class="w-4 h-4" />
                {{ t.label }}
              </button>
            </div>

            <div v-if="toast" :class="[
                'h-10 px-4 rounded-2xl border text-xs font-black inline-flex items-center transition-opacity duration-300',
                toast.tone === 'err' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              ]"
            >
              {{ toast.message }}
            </div>
          </div>
        </div>

        <div class="p-5">
          <!-- Profile Tab -->
          <div v-if="activeTab === 'profile'" class="space-y-5">
            <div class="rounded-3xl bg-white border border-slate-200 p-5">
              <div class="text-base font-black text-slate-900 flex items-center gap-2"><Camera class="w-5 h-5 text-purple-500" /> รูปโปรไฟล์ (Profile Picture)</div>
              <div class="mt-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div class="w-20 h-20 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                  <img v-if="avatarUrl" :src="avatarUrl" alt="avatar" class="w-full h-full object-cover" />
                  <User v-else class="w-8 h-8 text-slate-500" />
                </div>

                <div class="flex-1">
                  <div class="flex flex-wrap gap-2">
                    <label class="h-10 px-4 rounded-2xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 transition-colors inline-flex items-center gap-2 cursor-pointer">
                      <Upload class="w-4 h-4" />
                      {{ isLoading ? 'กำลังอัปโหลด...' : 'อัปโหลดรูปใหม่' }}
                      <input type="file" accept="image/png,image/jpeg" class="hidden" @change="handleAvatarUpload" :disabled="isLoading" />
                    </label>

                    <button @click="removeAvatar" class="h-10 px-4 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs font-black hover:bg-slate-50 transition-colors">
                      ลบรูปออก
                    </button>
                  </div>
                  <div class="mt-2 text-xs font-semibold text-slate-500">ไฟล์ JPG/PNG ขนาดไม่เกิน 2MB</div>
                </div>
              </div>
            </div>

            <div class="rounded-3xl bg-white border border-slate-200 p-5">
              <div class="text-base font-black text-slate-900 flex items-center gap-2"><FileEdit class="w-5 h-5 text-indigo-500" /> ข้อมูลพื้นฐาน (Basic Info)</div>
              <p class="text-[11px] font-semibold text-slate-400 mt-1.5 mb-5">คลิกปุ่มแต่ละช่องเพื่อเลือกจากรายการ หากไม่พบตัวเลือกในรายการ ให้พิมพ์ในช่องค้นหาแล้วกด "ใช้ ..."ได้เลย</p>

              <!-- TH Row: คำนำหน้า + ชื่อ + นามสกุล -->
              <div class="grid grid-cols-1 md:grid-cols-6 gap-4">
                <!-- Prefix TH (Searchable) -->
                <div class="relative settings-dd-prefixTh md:col-span-2">
                  <div class="text-xs font-black text-slate-600">คำนำหน้า (TH) *</div>
                  <div
                    @click="ddState.prefixTh.show = !ddState.prefixTh.show"
                    class="mt-2 h-11 px-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between cursor-pointer hover:border-slate-400 transition-all"
                    :class="{ 'border-purple-400 ring-2 ring-purple-100': ddState.prefixTh.show }"
                  >
                    <span class="text-sm font-semibold truncate pr-2" :class="profileDraft.title ? 'text-slate-800' : 'text-slate-400'">{{ profileDraft.title || 'เลือก...' }}</span>
                    <ChevronDown class="w-4 h-4 text-slate-400 shrink-0 transition-transform" :class="{ 'rotate-180': ddState.prefixTh.show }" />
                  </div>
                  <div v-if="ddState.prefixTh.show" class="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                    <div class="p-2 border-b border-slate-100">
                      <div class="relative">
                        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input v-model="ddState.prefixTh.search" class="w-full h-9 pl-9 pr-4 rounded-xl bg-slate-50 text-[13px] font-semibold focus:outline-none" placeholder="ค้นหา..." @click.stop />
                      </div>
                    </div>
                    <div class="max-h-48 overflow-y-auto">
                      <div v-for="p in filteredPrefixesTh" :key="p" @click="profileDraft.title = p; ddState.prefixTh.show = false; ddState.prefixTh.search = ''" class="px-4 py-2.5 text-[13px] font-semibold hover:bg-purple-50 cursor-pointer flex items-center justify-between" :class="{ 'bg-purple-50 text-purple-600': profileDraft.title === p }">
                        {{ p }}
                        <Check v-if="profileDraft.title === p" class="w-3.5 h-3.5" />
                      </div>
                      <div v-if="filteredPrefixesTh.length === 0 && ddState.prefixTh.search" class="px-4 py-3 text-center border-t border-slate-50">
                        <button type="button" @click="profileDraft.title = ddState.prefixTh.search; ddState.prefixTh.show = false; ddState.prefixTh.search = ''" class="text-[12px] font-black text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg w-full hover:bg-purple-100">ใช้ "{{ ddState.prefixTh.search }}"</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="md:col-span-2">
                  <div class="text-xs font-black text-slate-600">ชื่อ (ภาษาไทย) *</div>
                  <input v-model="profileDraft.firstNameTh" :class="inputBase" class="mt-2" placeholder="สมชาย" />
                </div>

                <div class="md:col-span-2">
                  <div class="text-xs font-black text-slate-600">นามสกุล (ภาษาไทย) *</div>
                  <input v-model="profileDraft.lastNameTh" :class="inputBase" class="mt-2" placeholder="ใจดี" />
                </div>
              </div>

              <!-- EN Row: คำนำหน้า + First + Last -->
              <div class="grid grid-cols-1 md:grid-cols-6 gap-4 mt-4">
                <!-- Prefix EN (Searchable) -->
                <div class="relative settings-dd-prefixEn md:col-span-2">
                  <div class="text-xs font-black text-slate-600">คำนำหน้า (EN) *</div>
                  <div
                    @click="ddState.prefixEn.show = !ddState.prefixEn.show"
                    class="mt-2 h-11 px-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between cursor-pointer hover:border-slate-400 transition-all"
                    :class="{ 'border-purple-400 ring-2 ring-purple-100': ddState.prefixEn.show }"
                  >
                    <span class="text-sm font-semibold truncate pr-2" :class="profileDraft.titleEn ? 'text-slate-800' : 'text-slate-400'">{{ profileDraft.titleEn || 'เลือก...' }}</span>
                    <ChevronDown class="w-4 h-4 text-slate-400 shrink-0 transition-transform" :class="{ 'rotate-180': ddState.prefixEn.show }" />
                  </div>
                  <div v-if="ddState.prefixEn.show" class="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                    <div class="p-2 border-b border-slate-100">
                      <div class="relative">
                        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input v-model="ddState.prefixEn.search" class="w-full h-9 pl-9 pr-4 rounded-xl bg-slate-50 text-[13px] font-semibold focus:outline-none" placeholder="ค้นหา..." @click.stop />
                      </div>
                    </div>
                    <div class="max-h-48 overflow-y-auto">
                      <div v-for="p in filteredPrefixesEn" :key="p" @click="profileDraft.titleEn = p; ddState.prefixEn.show = false; ddState.prefixEn.search = ''" class="px-4 py-2.5 text-[13px] font-semibold hover:bg-purple-50 cursor-pointer flex items-center justify-between" :class="{ 'bg-purple-50 text-purple-600': profileDraft.titleEn === p }">
                        {{ p }}
                        <Check v-if="profileDraft.titleEn === p" class="w-3.5 h-3.5" />
                      </div>
                      <div v-if="filteredPrefixesEn.length === 0 && ddState.prefixEn.search" class="px-4 py-3 text-center border-t border-slate-50">
                        <button type="button" @click="profileDraft.titleEn = ddState.prefixEn.search; ddState.prefixEn.show = false; ddState.prefixEn.search = ''" class="text-[12px] font-black text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg w-full hover:bg-purple-100">ใช้ "{{ ddState.prefixEn.search }}"</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="md:col-span-2">
                  <div class="text-xs font-black text-slate-600">First Name (EN) *</div>
                  <input v-model="profileDraft.firstNameEn" :class="inputBase" class="mt-2" placeholder="Somchai" />
                </div>

                <div class="md:col-span-2">
                  <div class="text-xs font-black text-slate-600">Last Name (EN) *</div>
                  <input v-model="profileDraft.lastNameEn" :class="inputBase" class="mt-2" placeholder="Jaidee" />
                </div>
              </div>

              <div class="mt-4">
                <div class="text-xs font-black text-slate-600">อีเมล (Email)</div>
                <div class="mt-2 relative">
                  <input v-model="profileDraft.email" disabled :class="disabledBase" />
                  <Lock class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div class="mt-6 text-base font-black text-slate-900 flex items-center gap-2"><Building2 class="w-5 h-5 text-emerald-500" /> สังกัดและที่อยู่ (Affiliation)</div>

              <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Institution (Searchable) -->
                <div class="relative settings-dd-institution">
                  <div class="text-xs font-black text-slate-600">มหาวิทยาลัย/หน่วยงาน (Institution) *</div>
                  <div
                    @click="ddState.institution.show = !ddState.institution.show"
                    class="mt-2 h-11 px-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between cursor-pointer hover:border-slate-400 transition-all"
                    :class="{ 'border-purple-400 ring-2 ring-purple-100': ddState.institution.show }"
                  >
                    <span class="text-sm font-semibold truncate pr-2" :class="profileDraft.institution ? 'text-slate-800' : 'text-slate-400'">{{ profileDraft.institution || 'เลือกหรือพิมพ์ชื่อ...' }}</span>
                    <ChevronDown class="w-4 h-4 text-slate-400 shrink-0 transition-transform" :class="{ 'rotate-180': ddState.institution.show }" />
                  </div>
                  <div v-if="ddState.institution.show" class="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                    <div class="p-2 border-b border-slate-100">
                      <div class="relative">
                        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input v-model="ddState.institution.search" class="w-full h-9 pl-9 pr-4 rounded-xl bg-slate-50 text-[13px] font-semibold focus:outline-none" placeholder="ค้นหา..." @click.stop />
                      </div>
                    </div>
                    <div class="max-h-48 overflow-y-auto">
                      <div v-for="p in filteredInstitutions" :key="p" @click="profileDraft.institution = p; ddState.institution.show = false; ddState.institution.search = ''" class="px-4 py-2.5 text-[13px] font-semibold hover:bg-purple-50 cursor-pointer flex items-center justify-between" :class="{ 'bg-purple-50 text-purple-600': profileDraft.institution === p }">
                        <span class="truncate pr-2">{{ p }}</span>
                        <Check v-if="profileDraft.institution === p" class="w-3.5 h-3.5 shrink-0" />
                      </div>
                      <div v-if="filteredInstitutions.length === 0 && ddState.institution.search" class="px-4 py-3 text-center border-t border-slate-50">
                        <button type="button" @click="profileDraft.institution = ddState.institution.search; ddState.institution.show = false; ddState.institution.search = ''" class="text-[12px] font-black text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg w-full hover:bg-purple-100">ตกลงใช้ "{{ ddState.institution.search }}"</button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Phone -->
                <div>
                  <div class="text-xs font-black text-slate-600">เบอร์โทรศัพท์ (Phone Number) *</div>
                  <input v-model="profileDraft.phone" :class="inputBase" class="mt-2" placeholder="081-234-5678" />
                  <div v-if="profileDraft.phone && profileDraft.phone.replace(/\D/g, '').length !== 10" class="mt-1.5 text-[11px] font-bold text-rose-500 flex items-center gap-1">
                    <AlertCircle class="w-3 h-3" /> เบอร์โทรต้องมี 10 หลัก (ขณะนี้มี {{ profileDraft.phone.replace(/\D/g, '').length }} หลัก)
                  </div>
                </div>

                <!-- Academic Position (Searchable) -->
                <div class="relative settings-dd-position">
                  <div class="text-xs font-black text-slate-600">ตำแหน่งทางวิชาการ (Academic Position)</div>
                  <div
                    @click="ddState.position.show = !ddState.position.show"
                    class="mt-2 h-11 px-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between cursor-pointer hover:border-slate-400 transition-all"
                    :class="{ 'border-purple-400 ring-2 ring-purple-100': ddState.position.show }"
                  >
                    <span class="text-sm font-semibold truncate pr-2" :class="profileDraft.academicPosition ? 'text-slate-800' : 'text-slate-400'">{{ profileDraft.academicPosition || 'เลือกตำแหน่ง...' }}</span>
                    <ChevronDown class="w-4 h-4 text-slate-400 shrink-0 transition-transform" :class="{ 'rotate-180': ddState.position.show }" />
                  </div>
                  <div v-if="ddState.position.show" class="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                    <div class="p-2 border-b border-slate-100">
                      <div class="relative">
                        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input v-model="ddState.position.search" class="w-full h-9 pl-9 pr-4 rounded-xl bg-slate-50 text-[13px] font-semibold focus:outline-none" placeholder="ค้นหา..." @click.stop />
                      </div>
                    </div>
                    <div class="max-h-48 overflow-y-auto">
                      <div v-for="p in filteredPositions" :key="p" @click="profileDraft.academicPosition = p; ddState.position.show = false; ddState.position.search = ''" class="px-4 py-2.5 text-[13px] font-semibold hover:bg-purple-50 cursor-pointer flex items-center justify-between" :class="{ 'bg-purple-50 text-purple-600': profileDraft.academicPosition === p }">
                        {{ p }}
                        <Check v-if="profileDraft.academicPosition === p" class="w-3.5 h-3.5" />
                      </div>
                      <div v-if="filteredPositions.length === 0 && ddState.position.search" class="px-4 py-3 text-center border-t border-slate-50">
                        <button type="button" @click="profileDraft.academicPosition = ddState.position.search; ddState.position.show = false; ddState.position.search = ''" class="text-[12px] font-black text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg w-full hover:bg-purple-100">ใช้ "{{ ddState.position.search }}"</button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Province (Searchable) -->
                <div class="relative settings-dd-province">
                  <div class="text-xs font-black text-slate-600">จังหวัด (Province)</div>
                  <div
                    @click="ddState.province.show = !ddState.province.show"
                    class="mt-2 h-11 px-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between cursor-pointer hover:border-slate-400 transition-all"
                    :class="{ 'border-purple-400 ring-2 ring-purple-100': ddState.province.show }"
                  >
                    <span class="text-sm font-semibold truncate pr-2" :class="profileDraft.province ? 'text-slate-800' : 'text-slate-400'">{{ profileDraft.province || 'เลือกจังหวัด...' }}</span>
                    <ChevronDown class="w-4 h-4 text-slate-400 shrink-0 transition-transform" :class="{ 'rotate-180': ddState.province.show }" />
                  </div>
                  <div v-if="ddState.province.show" class="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                    <div class="p-2 border-b border-slate-100">
                      <div class="relative">
                        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input v-model="ddState.province.search" class="w-full h-9 pl-9 pr-4 rounded-xl bg-slate-50 text-[13px] font-semibold focus:outline-none" placeholder="ค้นหา..." @click.stop />
                      </div>
                    </div>
                    <div class="max-h-48 overflow-y-auto">
                      <div v-for="p in filteredProvinces" :key="p" @click="profileDraft.province = p; ddState.province.show = false; ddState.province.search = ''" class="px-4 py-2.5 text-[13px] font-semibold hover:bg-purple-50 cursor-pointer flex items-center justify-between" :class="{ 'bg-purple-50 text-purple-600': profileDraft.province === p }">
                        {{ p }}
                        <Check v-if="profileDraft.province === p" class="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mt-6 flex items-center justify-end gap-2">
                <button @click="resetProfile" :disabled="isLoading || !isProfileChanged" class="h-11 px-5 rounded-2xl bg-white border border-slate-200 text-sm font-black transition-colors" :class="isProfileChanged ? 'text-slate-700 hover:bg-slate-50' : 'text-slate-400 opacity-50 cursor-not-allowed'">
                  ยกเลิก
                </button>
                <button @click="updateProfile" :disabled="isLoading || !isProfileChanged" class="h-11 px-5 rounded-2xl text-white text-sm font-black transition-colors inline-flex items-center gap-2" :class="isProfileChanged ? 'bg-purple-600 hover:bg-purple-500' : 'bg-purple-300 opacity-70 cursor-not-allowed'">
                  <Save class="w-5 h-5" />
                  {{ isLoading ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Security Tab -->
          <div v-if="activeTab === 'security'" class="rounded-3xl bg-white border border-slate-200 p-5">
            <div class="text-base font-black text-slate-900 flex items-center gap-2"><KeyRound class="w-5 h-5 text-amber-500" /> เปลี่ยนรหัสผ่าน (Change Password)</div>
            <div class="mt-1 text-sm font-semibold text-slate-500">เพื่อความปลอดภัยของบัญชี</div>

            <div class="mt-5 grid grid-cols-1 gap-4">
              <div>
                <div class="text-xs font-black text-slate-600">รหัสผ่านเดิม (Old Password)</div>
                <div class="mt-2 relative">
                  <input :type="showPw.current ? 'text' : 'password'" v-model="passwordDraft.current" :class="inputBase" class="pr-12" placeholder="************" />
                  <button @click="showPw.current = !showPw.current" class="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors">
                    <EyeOff v-if="showPw.current" class="w-4 h-4 text-slate-600" />
                    <Eye v-else class="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              </div>

              <div>
                <div class="text-xs font-black text-slate-600">รหัสผ่านใหม่ (New Password)</div>
                <div class="mt-2 relative">
                  <input :type="showPw.next ? 'text' : 'password'" v-model="passwordDraft.next" :class="inputBase" class="pr-12" placeholder="************" minlength="8" maxlength="64" />
                  <button @click="showPw.next = !showPw.next" class="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors">
                    <EyeOff v-if="showPw.next" class="w-4 h-4 text-slate-600" />
                    <Eye v-else class="w-4 h-4 text-slate-600" />
                  </button>
                </div>

                <!-- Password Strength Meter -->
                <div v-if="passwordDraft.next" class="mt-3 space-y-2">
                  <div class="flex items-center justify-between text-[11px] font-black uppercase tracking-wider">
                    <span :class="pwStrength.color">Strength: {{ pwStrength.label }}</span>
                    <span class="text-slate-400">{{ pwScore }}/6</span>
                  </div>
                  <div class="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full transition-all duration-500" :class="pwStrength.bar"></div>
                  </div>
                  <div class="grid grid-cols-2 gap-1.5 mt-2">
                    <div v-for="(val, key) in pwCriteria" :key="key" class="flex items-center gap-1.5 text-[11px] font-bold" :class="val ? 'text-emerald-600' : 'text-slate-400'">
                      <CheckCircle2 v-if="val" class="w-3 h-3" />
                      <AlertCircle v-else class="w-3 h-3" />
                      {{ criteriaLabels[key] }}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div class="text-xs font-black text-slate-600">ยืนยันรหัสผ่านใหม่ (Confirm Password)</div>
                <div class="mt-2 relative">
                  <input :type="showPw.confirm ? 'text' : 'password'" v-model="passwordDraft.confirm" :class="inputBase" class="pr-12" placeholder="************" minlength="8" maxlength="64" />
                  <button @click="showPw.confirm = !showPw.confirm" class="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors">
                    <EyeOff v-if="showPw.confirm" class="w-4 h-4 text-slate-600" />
                    <Eye v-else class="w-4 h-4 text-slate-600" />
                  </button>
                </div>
                <div v-if="passwordDraft.confirm && passwordDraft.next !== passwordDraft.confirm" class="mt-1.5 text-[11px] font-bold text-rose-500 flex items-center gap-1">
                  <XCircle class="w-3 h-3" /> รหัสผ่านไม่ตรงกัน
                </div>
                <div v-else-if="passwordDraft.confirm && passwordDraft.next === passwordDraft.confirm" class="mt-1.5 text-[11px] font-bold text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 class="w-3 h-3" /> รหัสผ่านตรงกัน
                </div>
              </div>
            </div>

            <div class="mt-6 flex items-center justify-end gap-2">
              <button @click="resetSecurity" :disabled="isLoading || !isSecurityChanged" class="h-11 px-5 rounded-2xl bg-white border border-slate-200 text-sm font-black transition-colors" :class="isSecurityChanged ? 'text-slate-700 hover:bg-slate-50' : 'text-slate-400 opacity-50 cursor-not-allowed'">
                ล้างค่า
              </button>
              <button @click="updatePassword" :disabled="isLoading || !isSecurityChanged" class="h-11 px-5 rounded-2xl text-white text-sm font-black transition-colors inline-flex items-center gap-2" :class="isSecurityChanged ? 'bg-purple-600 hover:bg-purple-500' : 'bg-purple-300 opacity-70 cursor-not-allowed'">
                <Save class="w-5 h-5" />
                {{ isLoading ? 'กำลังบันทึก...' : 'อัปเดตรหัสผ่าน' }}
              </button>
            </div>
          </div>

          <!-- Prefs Tab -->
          <div v-if="activeTab === 'prefs'" class="space-y-4">
            <div class="rounded-3xl bg-white border border-slate-200 p-5">
              <div class="text-base font-black text-slate-900 flex items-center gap-2"><Megaphone class="w-5 h-5 text-blue-500" /> ตั้งค่าการรับข่าวสาร (Notification Preferences)</div>
              <div class="mt-4 divide-y divide-slate-100">
                <div class="flex items-center justify-between gap-4 py-3">
                  <div class="min-w-0">
                    <div class="text-sm font-black text-slate-900 truncate">แจ้งเตือนเมื่อสถานะบทความเปลี่ยนแปลง</div>
                    <div class="mt-1 text-xs font-semibold text-slate-500">Status Update</div>
                  </div>
                  <button @click="prefsDraft.notifyStatus = !prefsDraft.notifyStatus" :class="['w-14 h-8 rounded-full border transition-colors relative', prefsDraft.notifyStatus ? 'bg-purple-600 border-purple-600' : 'bg-slate-100 border-slate-200']">
                    <span :class="['absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white shadow-sm transition-all', prefsDraft.notifyStatus ? 'right-1' : 'left-1']" />
                  </button>
                </div>
                

                <div class="flex items-center justify-between gap-4 py-3">
                  <div class="min-w-0">
                    <div class="text-sm font-black text-slate-900 truncate">รับข่าวสารประชาสัมพันธ์ทั่วไป</div>
                    <div class="mt-1 text-xs font-semibold text-slate-500">News & Promo</div>
                  </div>
                  <button @click="prefsDraft.notifyNews = !prefsDraft.notifyNews" :class="['w-14 h-8 rounded-full border transition-colors relative', prefsDraft.notifyNews ? 'bg-purple-600 border-purple-600' : 'bg-slate-100 border-slate-200']">
                    <span :class="['absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white shadow-sm transition-all', prefsDraft.notifyNews ? 'right-1' : 'left-1']" />
                  </button>
                </div>
              </div>
              <div class="mt-6 flex items-center justify-end gap-2">
                <button @click="resetPrefs" :disabled="isLoading || !isPrefsChanged" class="h-11 px-5 rounded-2xl bg-white border border-slate-200 text-sm font-black transition-colors" :class="isPrefsChanged ? 'text-slate-700 hover:bg-slate-50' : 'text-slate-400 opacity-50 cursor-not-allowed'">
                  ยกเลิก
                </button>
                <button @click="updatePrefs" :disabled="isLoading || !isPrefsChanged" class="h-11 px-5 rounded-2xl text-white text-sm font-black transition-colors inline-flex items-center gap-2" :class="isPrefsChanged ? 'bg-purple-600 hover:bg-purple-500' : 'bg-purple-300 opacity-70 cursor-not-allowed'">
                  <Save class="w-5 h-5" />
                  {{ isLoading ? 'กำลังบันทึก...' : 'บันทึก' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
