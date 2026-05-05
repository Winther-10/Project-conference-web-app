<script setup>
definePageMeta({ layout: 'portal' });
import { ref, reactive, onMounted, computed } from 'vue';
import {
  Bell, ChevronDown, Eye, EyeOff, Lock, Save, Settings as SettingsIcon, Upload, User,
  CheckCircle2, XCircle
} from 'lucide-vue-next';
import { useAuth } from '~/composables/useAuth';
import { useSupabase } from '~/composables/useSupabase';
import { PREFIXES, ACADEMIC_POSITIONS, THAI_PROVINCES } from '~/utils/constants';

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
const prefsDraft = reactive({
  notifyStatus: true,
  notifyNews: false,
  language: 'th',
  darkMode: false
});

onMounted(() => {
  if (userProfile.value) {
    initProfileFromStore();
  }
});

const initProfileFromStore = () => {
  profileDraft.title = userProfile.value.title || '';
  profileDraft.titleEn = userProfile.value.title_en || '';
  profileDraft.email = userProfile.value.email || '';
  profileDraft.firstNameTh = userProfile.value.first_name_th || '';
  profileDraft.lastNameTh = userProfile.value.last_name_th || '';
  profileDraft.firstNameEn = userProfile.value.first_name_en || '';
  profileDraft.lastNameEn = userProfile.value.last_name_en || '';
  profileDraft.institution = userProfile.value.institution || '';
  profileDraft.phone = userProfile.value.phone || '';
  profileDraft.academicPosition = userProfile.value.academic_position || '';
  profileDraft.province = userProfile.value.province || '';
  avatarUrl.value = userProfile.value.avatar_url || '';
};

const resetProfile = () => {
  initProfileFromStore();
  showToast('ยกเลิกการแก้ไขแล้ว');
};

const updateProfile = async () => {
  if (!userProfile.value) {
    showToast('ไม่พบข้อมูลผู้ใช้งาน กรุณาล็อกอินใหม่', 'err');
    return;
  }
  isLoading.value = true;
  try {
    const updates = {
      title: profileDraft.title,
      first_name_th: profileDraft.firstNameTh,
      last_name_th: profileDraft.lastNameTh,
      first_name_en: profileDraft.firstNameEn,
      last_name_en: profileDraft.lastNameEn,
      institution: profileDraft.institution,
      phone: profileDraft.phone,
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

const validatePassword = () => {
  if (!passwordDraft.next || !passwordDraft.confirm) {
    return { ok: false, msg: 'กรุณากรอกข้อมูลให้ครบ' };
  }
  if (passwordDraft.next.length < 8) {
    return { ok: false, msg: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' };
  }
  if (passwordDraft.next !== passwordDraft.confirm) {
    return { ok: false, msg: 'รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน' };
  }
  return { ok: true };
};

const updatePassword = async () => {
  const v = validatePassword();
  if (!v.ok) {
    showToast(v.msg, 'err');
    return;
  }
  isLoading.value = true;
  try {
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
  prefsDraft.notifyStatus = true;
  prefsDraft.notifyNews = false;
  prefsDraft.language = 'th';
  prefsDraft.darkMode = false;
  showToast('ล้างค่าแล้ว');
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
          <div class="text-2xl font-black text-slate-900 truncate">⚙️ การตั้งค่าและโปรไฟล์ (Settings & Profile)</div>
          <div class="mt-1 text-sm font-semibold text-slate-500 truncate">จัดการข้อมูลส่วนตัวและความปลอดภัยของบัญชีผู้ใช้</div>
        </div>
        <div class="hidden md:flex items-center gap-2 text-xs font-black text-slate-500">
          <SettingsIcon class="w-4 h-4" />
          Account Control Center
        </div>
      </header>

      <div class="rounded-[32px] bg-white border border-slate-200 overflow-hidden shadow-sm">
        <div class="px-5 py-4 bg-slate-50 border-b border-slate-200">
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
              <div class="text-base font-black text-slate-900">📸 รูปโปรไฟล์ (Profile Picture)</div>
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
              <div class="text-base font-black text-slate-900">📝 ข้อมูลพื้นฐาน (Basic Info)</div>

              <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div class="text-xs font-black text-slate-600">คำนำหน้า (TH)</div>
                  <div class="mt-2 relative">
                    <select v-model="profileDraft.title" :class="inputBase" class="pr-10 appearance-none">
                      <option value="">เลือก...</option>
                      <option v-for="p in PREFIXES" :key="p" :value="p">{{ p }}</option>
                    </select>
                    <ChevronDown class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  </div>
                </div>

                <div>
                  <div class="text-xs font-black text-slate-600">คำนำหน้า (EN)</div>
                  <div class="mt-2 relative">
                    <select v-model="profileDraft.titleEn" :class="inputBase" class="pr-10 appearance-none">
                      <option value="">เลือก...</option>
                      <option v-for="p in PREFIXES" :key="p" :value="p">{{ p }}</option>
                    </select>
                    <ChevronDown class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  </div>
                </div>

                <div>
                  <div class="text-xs font-black text-slate-600">ชื่อ (ภาษาไทย)</div>
                  <input v-model="profileDraft.firstNameTh" :class="inputBase" class="mt-2" placeholder="สมชาย" />
                </div>

                <div>
                  <div class="text-xs font-black text-slate-600">นามสกุล (ภาษาไทย)</div>
                  <input v-model="profileDraft.lastNameTh" :class="inputBase" class="mt-2" placeholder="ใจดี" />
                </div>

                <div>
                  <div class="text-xs font-black text-slate-600">First Name (EN)</div>
                  <input v-model="profileDraft.firstNameEn" :class="inputBase" class="mt-2" placeholder="Somchai" />
                </div>

                <div>
                  <div class="text-xs font-black text-slate-600">Last Name (EN)</div>
                  <input v-model="profileDraft.lastNameEn" :class="inputBase" class="mt-2" placeholder="Jaidee" />
                </div>

                <div class="md:col-span-2">
                  <div class="text-xs font-black text-orange-700 bg-orange-50 border border-orange-200 px-3 py-2 rounded-2xl inline-block mb-2">
                    ชื่อภาษาอังกฤษจะปรากฏในใบประกาศนียบัตร (Certificate)
                  </div>
                </div>

                <div class="md:col-span-2">
                  <div class="text-xs font-black text-slate-600">อีเมล (Email)</div>
                  <div class="mt-2 relative">
                    <input v-model="profileDraft.email" disabled :class="disabledBase" />
                    <Lock class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>

              <div class="mt-6 text-base font-black text-slate-900">🏢 สังกัดและที่อยู่ (Affiliation)</div>

              <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div class="text-xs font-black text-slate-600">มหาวิทยาลัย/หน่วยงาน (Institution)</div>
                  <input v-model="profileDraft.institution" :class="inputBase" class="mt-2" placeholder="มหาวิทยาลัย/หน่วยงาน" />
                </div>

                <div>
                  <div class="text-xs font-black text-slate-600">เบอร์โทรศัพท์ (Phone Number)</div>
                  <input v-model="profileDraft.phone" :class="inputBase" class="mt-2" placeholder="081-234-5678" />
                </div>

                <div>
                  <div class="text-xs font-black text-slate-600">ตำแหน่งทางวิชาการ (Academic Position)</div>
                  <div class="mt-2 relative">
                    <select v-model="profileDraft.academicPosition" :class="inputBase" class="pr-10 appearance-none">
                      <option value="">เลือกตำแหน่ง...</option>
                      <option v-for="p in ACADEMIC_POSITIONS" :key="p" :value="p">{{ p }}</option>
                    </select>
                    <ChevronDown class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  </div>
                </div>

                <div>
                  <div class="text-xs font-black text-slate-600">จังหวัด (Province)</div>
                  <div class="mt-2 relative">
                    <select v-model="profileDraft.province" :class="inputBase" class="pr-10 appearance-none">
                      <option value="">เลือกจังหวัด...</option>
                      <option v-for="p in THAI_PROVINCES" :key="p" :value="p">{{ p }}</option>
                    </select>
                    <ChevronDown class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  </div>
                </div>
              </div>

              <div class="mt-6 flex items-center justify-end gap-2">
                <button @click="resetProfile" :disabled="isLoading" class="h-11 px-5 rounded-2xl bg-white border border-slate-200 text-slate-700 text-sm font-black hover:bg-slate-50 transition-colors">
                  ยกเลิก
                </button>
                <button @click="updateProfile" :disabled="isLoading" class="h-11 px-5 rounded-2xl bg-purple-600 text-white text-sm font-black hover:bg-purple-500 transition-colors inline-flex items-center gap-2">
                  <Save class="w-5 h-5" />
                  {{ isLoading ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Security Tab -->
          <div v-if="activeTab === 'security'" class="rounded-3xl bg-white border border-slate-200 p-5">
            <div class="text-base font-black text-slate-900">🔑 เปลี่ยนรหัสผ่าน (Change Password)</div>
            <div class="mt-1 text-sm font-semibold text-slate-500">เพื่อความปลอดภัยของบัญชี</div>

            <div class="mt-5 grid grid-cols-1 gap-4">
              <div>
                <div class="text-xs font-black text-slate-600">รหัสผ่านใหม่ (New Password)</div>
                <div class="mt-2 relative">
                  <input :type="showPw.next ? 'text' : 'password'" v-model="passwordDraft.next" :class="inputBase" class="pr-12" placeholder="************" />
                  <button @click="showPw.next = !showPw.next" class="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors">
                    <EyeOff v-if="showPw.next" class="w-4 h-4 text-slate-600" />
                    <Eye v-else class="w-4 h-4 text-slate-600" />
                  </button>
                </div>
                <div class="mt-2 text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-2xl">
                   ความยาวอย่างน้อย 8 ตัวอักษร
                </div>
              </div>

              <div>
                <div class="text-xs font-black text-slate-600">ยืนยันรหัสผ่านใหม่ (Confirm Password)</div>
                <div class="mt-2 relative">
                  <input :type="showPw.confirm ? 'text' : 'password'" v-model="passwordDraft.confirm" :class="inputBase" class="pr-12" placeholder="************" />
                  <button @click="showPw.confirm = !showPw.confirm" class="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors">
                    <EyeOff v-if="showPw.confirm" class="w-4 h-4 text-slate-600" />
                    <Eye v-else class="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              </div>
            </div>

            <div class="mt-6 flex items-center justify-end gap-2">
              <button @click="resetSecurity" :disabled="isLoading" class="h-11 px-5 rounded-2xl bg-white border border-slate-200 text-slate-700 text-sm font-black hover:bg-slate-50 transition-colors">
                ล้างค่า
              </button>
              <button @click="updatePassword" :disabled="isLoading" class="h-11 px-5 rounded-2xl bg-purple-600 text-white text-sm font-black hover:bg-purple-500 transition-colors inline-flex items-center gap-2">
                <Save class="w-5 h-5" />
                {{ isLoading ? 'กำลังบันทึก...' : 'อัปเดตรหัสผ่าน' }}
              </button>
            </div>
          </div>

          <!-- Prefs Tab -->
          <div v-if="activeTab === 'prefs'" class="space-y-4">
            <div class="rounded-3xl bg-white border border-slate-200 p-5">
              <div class="text-base font-black text-slate-900">📢 ตั้งค่าการรับข่าวสาร (Notification Preferences)</div>
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
            </div>

            <div class="rounded-3xl bg-white border border-slate-200 p-5">
              <div class="text-base font-black text-slate-900">🌍 ภาษาและการแสดงผล (Language & Theme)</div>

              <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="rounded-3xl bg-slate-50 border border-slate-200 p-4">
                  <div class="text-xs font-black text-slate-700">ภาษาของระบบ</div>
                  <div class="mt-3 flex items-center gap-3">
                    <label class="inline-flex items-center gap-2 text-sm font-black text-slate-800 cursor-pointer">
                      <input type="radio" value="th" v-model="prefsDraft.language" class="accent-purple-600" />
                      ภาษาไทย
                    </label>
                    <label class="inline-flex items-center gap-2 text-sm font-black text-slate-800 cursor-pointer">
                      <input type="radio" value="en" v-model="prefsDraft.language" class="accent-purple-600" />
                      English
                    </label>
                  </div>
                </div>

                <div class="rounded-3xl bg-slate-50 border border-slate-200 p-4">
                  <div class="text-xs font-black text-slate-700">โหมดมืด</div>
                  <div class="mt-3 flex items-center gap-3">
                    <label class="inline-flex items-center gap-2 text-sm font-black text-slate-800 cursor-pointer">
                      <input type="radio" :value="true" v-model="prefsDraft.darkMode" class="accent-purple-600" />
                      เปิด
                    </label>
                    <label class="inline-flex items-center gap-2 text-sm font-black text-slate-800 cursor-pointer">
                      <input type="radio" :value="false" v-model="prefsDraft.darkMode" class="accent-purple-600" />
                      ปิด
                    </label>
                  </div>
                </div>
              </div>

              <div class="mt-6 flex items-center justify-end gap-2">
                <button @click="resetPrefs" class="h-11 px-5 rounded-2xl bg-white border border-slate-200 text-slate-700 text-sm font-black hover:bg-slate-50 transition-colors">
                  ล้างค่า
                </button>
                <button @click="showToast('บันทึกการตั้งค่าแล้ว')" class="h-11 px-5 rounded-2xl bg-purple-600 text-white text-sm font-black hover:bg-purple-500 transition-colors inline-flex items-center gap-2">
                  <Save class="w-5 h-5" />
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
