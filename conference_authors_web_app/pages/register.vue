<script setup>
definePageMeta({ layout: false });
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { 
  ChevronDown, Eye, EyeOff, Lock, Mail, MoveRight, Phone, User, 
  FileText, CalendarDays, CheckCircle, Search, Check, AlertCircle, X 
} from 'lucide-vue-next';
import { useAuth } from '~/composables/useAuth';
import { useSupabase } from '~/composables/useSupabase';
import { PREFIXES, ACADEMIC_POSITIONS, THAI_PROVINCES, THAI_UNIVERSITIES } from '~/utils/constants';

const router = useRouter();
const { signUp, verifyOtp } = useAuth();
const supabase = useSupabase();

const conferenceSettings = ref({});
const showTermsModal = ref(false);

onMounted(async () => {
  try {
    const { data } = await supabase.from('system_settings').select('config_json').eq('id', 1).maybeSingle();
    if (data?.config_json?.conference) {
      conferenceSettings.value = data.config_json.conference;
    }
  } catch (err) {}
});

// Form Fields
const prefix = ref('');
const firstName = ref('');
const lastName = ref('');
const prefixEn = ref('');
const firstNameEn = ref('');
const lastNameEn = ref('');
const phone = ref('');
const institution = ref('');
const academicPosition = ref('');
const province = ref('');
const email = ref('');
const password = ref('');
const confirm = ref('');
const acceptTerms = ref(false);

// Phone Sanitize Watcher
watch(phone, (newVal) => {
  if (!newVal) return;
  // Filter: Only numbers and hyphen
  let filtered = newVal.replace(/[^0-9-]/g, '');
  // Collapse multiple hyphens
  filtered = filtered.replace(/-+/g, '-');
  // Prevent leading hyphen
  if (filtered.startsWith('-')) filtered = filtered.substring(1);
  
  if (filtered !== newVal) {
    phone.value = filtered;
  }
});

const showOtpStep = ref(false);
const otpCode = ref('');
const pendingMetadata = ref({});

// Search/Dropdown States
const searchStates = ref({
  prefix: { show: false, search: '' },
  prefixEn: { show: false, search: '' },
  position: { show: false, search: '' },
  province: { show: false, search: '' },
  institution: { show: false, search: '' }
});

const showPw = ref({ password: false, confirm: false });
const toast = ref(null);
const isLoading = ref(false);

// Filtering logic for searchable dropdowns
const filteredPrefixes = computed(() => {
  const s = searchStates.value.prefix.search.toLowerCase();
  return s ? PREFIXES.filter(p => p.toLowerCase().includes(s)) : PREFIXES;
});

const filteredPrefixesEn = computed(() => {
  const s = searchStates.value.prefixEn.search.toLowerCase();
  return s ? PREFIXES.filter(p => p.toLowerCase().includes(s)) : PREFIXES;
});

const filteredPositions = computed(() => {
  const s = searchStates.value.position.search.toLowerCase();
  return s ? ACADEMIC_POSITIONS.filter(p => p.toLowerCase().includes(s)) : ACADEMIC_POSITIONS;
});

const filteredProvinces = computed(() => {
  const s = searchStates.value.province.search.toLowerCase();
  return s ? THAI_PROVINCES.filter(p => p.toLowerCase().includes(s)) : THAI_PROVINCES;
});

const filteredInstitutions = computed(() => {
  const s = searchStates.value.institution.search.toLowerCase();
  return s ? THAI_UNIVERSITIES.filter(p => p.toLowerCase().includes(s)) : THAI_UNIVERSITIES;
});

// Password Strength
const passwordCriteria = computed(() => {
  const p = password.value;
  const hasSequence = (str) => {
    const s = str.toLowerCase();
    for (let i = 0; i < s.length - 2; i++) {
      const char1 = s.charCodeAt(i);
      const char2 = s.charCodeAt(i+1);
      const char3 = s.charCodeAt(i+2);
      // Forward (123, abc)
      if (char2 === char1 + 1 && char3 === char2 + 1) return true;
      // Backward (321, cba)
      if (char2 === char1 - 1 && char3 === char2 - 1) return true;
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

const strengthScore = computed(() => {
  const c = passwordCriteria.value;
  return Object.values(c).filter(Boolean).length;
});

const strengthText = computed(() => {
  const score = strengthScore.value;
  if (score <= 3) return { label: 'Weak', color: 'text-rose-500', bar: 'bg-rose-500 w-1/4' };
  if (score <= 5) return { label: 'Good', color: 'text-amber-500', bar: 'bg-amber-500 w-2/4' };
  return { label: 'Strong', color: 'text-emerald-500', bar: 'bg-emerald-500 w-full' };
});

const showToast = (message, tone = 'ok') => {
  toast.value = { message, tone };
  window.setTimeout(() => { toast.value = null; }, 3000);
};

const validate = () => {
  if (!prefix.value || !firstName.value.trim() || !lastName.value.trim() || !prefixEn.value || !firstNameEn.value.trim() || !lastNameEn.value.trim() || !phone.value.trim() || !institution.value.trim() || !email.value.trim()) {
    return { ok: false, msg: 'กรุณากรอกข้อมูลให้ครบถ้วน' };
  }
  if (strengthScore.value < 4) {
    return { ok: false, msg: 'รหัสผ่านยังไม่ปลอดภัยเพียงพอ กรุณาทำตามคำแนะนำ' };
  }
  if (password.value !== confirm.value) {
    return { ok: false, msg: 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน' };
  }

  const cleanPhone = phone.value.replace(/\D/g, '');
  if (cleanPhone.length !== 10) {
    return { ok: false, msg: 'เบอร์โทรศัพท์ต้องมี 10 หลัก (เฉพาะตัวเลข)' };
  }

  if (!acceptTerms.value) {
    return { ok: false, msg: 'กรุณายอมรับเงื่อนไขและข้อกำหนด' };
  }
  return { ok: true };
};

const handleRegister = async () => {
  const v = validate();
  if (!v.ok) {
    showToast(v.msg, 'err');
    return;
  }
  
  if (isLoading.value) return;
  isLoading.value = true;
  
  try {
    const metadata = {
      title: prefix.value,
      first_name_th: firstName.value.trim(),
      last_name_th: lastName.value.trim(),
      title_en: prefixEn.value,
      first_name_en: firstNameEn.value.trim(),
      last_name_en: lastNameEn.value.trim(),
      institution: institution.value.trim(),
      phone: phone.value.replace(/\D/g, ''), // Save only digits
      academic_position: academicPosition.value,
      province: province.value
    };
    const { error } = await signUp(email.value.trim(), password.value, metadata);
    
    if (error) throw error;
    
    pendingMetadata.value = metadata; // save for verifyOtp step
    showToast('ระบบได้ส่งรหัส OTP ไปยังอีเมลของท่านแล้ว', 'ok');
    showOtpStep.value = true;
  } catch (err) {
    console.error('Registration Error:', err);
    if (err.message?.includes('already registered')) {
      showToast('อีเมลนี้ถูกลงทะเบียนไปแล้ว กรุณาเข้าสู่ระบบ หรือใช้อีเมลอื่น', 'err');
    } else {
      showToast(err.message || 'เกิดข้อผิดพลาดในการลงทะเบียน', 'err');
    }
  } finally {
    isLoading.value = false;
  }
};

const handleVerifyOtp = async () => {
  if (otpCode.value.length < 6) {
    showToast('กรุณากรอกรหัส OTP ให้ครบ 6 หลัก', 'err');
    return;
  }

  if (isLoading.value) return;
  isLoading.value = true;

  try {
    const { verifyOtp } = useAuth();
    await verifyOtp(email.value.trim(), otpCode.value, pendingMetadata.value);
    showToast('ยืนยันอีเมลสำเร็จ! กำลังพาท่านเข้าสู่ระบบ...', 'ok');
    setTimeout(() => {
      router.push('/portal/dashboard');
    }, 1500);
  } catch (err) {
    showToast('รหัส OTP ไม่ถูกต้องหรือหมดอายุ', 'err');
  } finally {
    isLoading.value = false;
  }
};

// Outside click handler for dropdowns
onMounted(() => {
  window.addEventListener('click', (e) => {
    Object.keys(searchStates.value).forEach(key => {
      if (!e.target.closest(`.search-dropdown-${key}`)) {
        searchStates.value[key].show = false;
      }
    });
  });
});
</script>

<template>
  <div class="h-screen w-full bg-white overflow-hidden font-sans">
    <div class="h-full grid grid-cols-1 lg:grid-cols-2">
      <!-- Left Side - Visual -->
      <div class="relative overflow-hidden bg-gradient-to-br from-purple-100 via-fuchsia-50 to-indigo-100 text-slate-800 hidden lg:flex flex-col border-r border-purple-100">
        <!-- Animated background blobs -->
        <div class="absolute -top-32 -left-32 w-[450px] h-[450px] bg-purple-300/25 rounded-full blur-[80px] animate-[pulse_7s_ease-in-out_infinite]"></div>
        <div class="absolute bottom-[-100px] right-[-80px] w-[350px] h-[350px] bg-fuchsia-300/20 rounded-full blur-[60px] animate-[pulse_9s_ease-in-out_infinite_reverse]"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] bg-indigo-200/20 rounded-full blur-[50px] animate-[pulse_5s_ease-in-out_infinite]"></div>

        <div class="relative h-full px-12 py-16 flex flex-col z-10">
          <div class="flex items-center gap-4">
            <img src="~/assets/bru-web-logo-en.png" alt="BRU Logo" class="h-10 w-auto object-contain" />
            <div>
              <div class="text-[19px] font-black leading-tight tracking-tight text-purple-900">{{ conferenceSettings.name || 'BRICC Festival 2026' }}</div>
              <div class="text-[11px] font-black text-purple-500 mt-1 uppercase tracking-widest">Join the Community</div>
            </div>
          </div>

          <div class="mt-16 max-w-md">
            <div class="text-4xl md:text-5xl font-black leading-tight tracking-tight text-purple-950">Create your<br/>account</div>
            <div class="mt-4 text-[15px] font-semibold text-purple-700/80 leading-relaxed">เริ่มต้นส่งบทความ และติดตามสถานะได้ทันที พร้อมเข้าถึงข้อมูลสำคัญทั้งหมดของการประชุม</div>

            <div class="mt-10 rounded-[28px] bg-white/60 backdrop-blur-xl border border-white shadow-sm p-8">
              <div class="text-[14px] font-black text-purple-900 tracking-wide">Why register?</div>
              <div class="mt-6 space-y-5 text-[14px] font-semibold text-purple-800/80">
                <div class="flex items-start gap-4">
                  <div class="w-10 h-10 rounded-2xl bg-purple-100 border border-purple-200/50 flex items-center justify-center text-purple-600 shrink-0">
                    <FileText class="w-5 h-5" />
                  </div>
                  <div class="mt-0.5 leading-relaxed">จัดการบทความ และเอกสารสำคัญในระบบเดียวได้อย่างรวดเร็ว</div>
                </div>
                <div class="flex items-start gap-4">
                  <div class="w-10 h-10 rounded-2xl bg-fuchsia-100 border border-fuchsia-200/50 flex items-center justify-center text-fuchsia-600 shrink-0">
                    <CalendarDays class="w-5 h-5" />
                  </div>
                  <div class="mt-0.5 leading-relaxed">วางแผนตารางนำเสนอ และติดตามประกาศรางวัลแบบ Real-time</div>
                </div>
                <div class="flex items-start gap-4">
                  <div class="w-10 h-10 rounded-2xl bg-indigo-100 border border-indigo-200/50 flex items-center justify-center text-indigo-600 shrink-0">
                    <Lock class="w-5 h-5" />
                  </div>
                  <div class="mt-0.5 leading-relaxed">ระบบรักษาความปลอดภัยมาตรฐานสากล ข้อมูลส่วนตัวใช้สำหรับใบประกาศนียบัตรเท่านั้น</div>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-auto pt-10 text-[11px] font-black text-purple-400 tracking-widest uppercase">We respect your privacy and data security</div>
        </div>
      </div>

      <!-- Right Side - Form -->
      <div class="bg-purple-50/30 overflow-y-auto custom-scrollbar">
        <div class="min-h-full flex items-start justify-center px-6 py-12 md:px-12">
          <div class="w-full max-w-xl">
            <!-- Mobile Header -->
            <div class="lg:hidden mb-10 flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-200 to-indigo-200 text-purple-700 flex items-center justify-center font-black text-[12px] shadow-sm border border-purple-200">BR</div>
              <div>
                <div class="text-[19px] font-black text-slate-900 tracking-tight">Create Account</div>
                <div class="text-[12px] font-bold text-slate-500 mt-0.5">ระบบลงทะเบียน {{ conferenceSettings.name || 'BRICC Festival' }}</div>
              </div>
            </div>

            <div
              v-if="toast"
              :class="[
                'mb-6 h-12 px-5 rounded-2xl border text-[13px] font-black inline-flex items-center transition-all w-full fixed top-6 left-1/2 -translate-x-1/2 z-[100] max-w-md shadow-lg',
                toast.tone === 'err' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              ]"
            >
              {{ toast.message }}
            </div>

            <div class="hidden lg:block mb-10">
              <div class="text-3xl font-black text-purple-950 tracking-tight">{{ showOtpStep ? 'ยืนยันอีเมล (OTP)' : 'สร้างบัญชีใหม่' }}</div>
              <div class="mt-2 text-[15px] font-semibold text-purple-700/70">{{ showOtpStep ? 'กรุณากรอกรหัส 6 หลักที่ส่งไปยังอีเมลของท่าน' : 'กรุณากรอกข้อมูลให้ครบถ้วนเพื่อเปิดใช้งานระบบ' }}</div>
            </div>

            <!-- OTP Verification Step -->
            <div v-if="showOtpStep" class="animate-in fade-in slide-in-from-right-4 space-y-6 pb-12">
              <div class="rounded-[32px] bg-white border border-purple-100 p-8 shadow-sm text-center">
                <div class="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 mx-auto mb-6">
                  <Mail class="w-8 h-8" />
                </div>
                <h3 class="text-xl font-black text-slate-900 mb-2">ตรวจสอบอีเมลของท่าน</h3>
                <p class="text-[14px] font-semibold text-slate-500 mb-6 leading-relaxed">
                  เราได้ส่งรหัสผ่าน 6 หลักไปยังอีเมล<br/>
                  <span class="text-purple-600 font-bold">{{ email }}</span>
                </p>

                <div class="max-w-[240px] mx-auto">
                  <input
                    v-model="otpCode"
                    class="w-full h-14 text-center tracking-[0.5em] text-2xl font-black rounded-2xl bg-purple-50/50 border border-purple-100 text-slate-900 placeholder-slate-300 focus:outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100/50 transition-all"
                    placeholder="------"
                    maxlength="6"
                  />
                </div>

                <button
                  @click="handleVerifyOtp"
                  :disabled="isLoading"
                  :class="[
                    'mt-8 h-14 w-full max-w-[240px] mx-auto rounded-[24px] text-[15px] font-black inline-flex items-center justify-center gap-2 transition-all duration-300 shadow-md',
                    isLoading ? 'bg-slate-200 text-slate-400 cursor-wait shadow-none' : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-purple-300/40 hover:-translate-y-0.5'
                  ]"
                >
                  {{ isLoading ? 'กำลังตรวจสอบ...' : 'ยืนยันรหัส OTP' }}
                  <CheckCircle v-if="!isLoading" class="w-5 h-5" />
                </button>
                
                <div class="mt-6 text-[12px] font-bold text-slate-400">
                  ไม่ได้รับอีเมล? <button @click="showOtpStep = false" class="text-purple-600 hover:text-purple-800 underline">กลับไปแก้ไขอีเมล</button>
                </div>
              </div>
            </div>

            <!-- Registration Form Step -->
            <form v-else @submit.prevent="handleRegister" class="space-y-6 pb-12 animate-in fade-in slide-in-from-left-4">
              <!-- Personal Info -->
              <div class="rounded-[32px] bg-white border border-purple-100 p-8 shadow-sm">
                <div class="text-[15px] font-black text-slate-900 flex items-center gap-2">
                  <div class="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                    <User :size="16" />
                  </div>
                  ข้อมูลส่วนตัว (Personal Info)
                </div>
                <p class="text-[11px] font-semibold text-slate-400 mt-1.5 mb-6">คลิกปุ่มแต่ละช่องเพื่อเลือกจากรายการ หากไม่พบตัวเลือกในรายการ ให้พิมพ์ในช่องค้นหาแล้วกด "ใช้ ..."ได้เลย</p>
                
                <div class="grid grid-cols-1 md:grid-cols-6 gap-5">
                  <!-- Prefix -->
                  <div class="md:col-span-2 relative search-dropdown-prefix">
                    <label class="text-[12px] font-black text-slate-700 block uppercase tracking-wide mb-2">คำนำหน้า (TH) *</label>
                    <div 
                      @click="searchStates.prefix.show = !searchStates.prefix.show"
                      class="h-12 px-4 rounded-2xl bg-purple-50/50 border border-purple-100 flex items-center justify-between cursor-pointer hover:border-purple-300 transition-all"
                      :class="{ 'border-purple-400 ring-4 ring-purple-100/50': searchStates.prefix.show }"
                    >
                      <span class="text-[14px] font-semibold" :class="prefix ? 'text-slate-900' : 'text-slate-400'">
                        {{ prefix || 'เลือก...' }}
                      </span>
                      <ChevronDown class="w-4 h-4 text-slate-400 transition-transform" :class="{ 'rotate-180': searchStates.prefix.show }" />
                    </div>
                    
                    <div v-if="searchStates.prefix.show" class="absolute top-full left-0 right-0 mt-2 bg-white border border-purple-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                      <div class="p-2 border-b border-purple-50">
                        <div class="relative">
                          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input 
                            v-model="searchStates.prefix.search"
                            class="w-full h-9 pl-9 pr-4 rounded-xl bg-slate-50 text-[13px] font-semibold focus:outline-none"
                            placeholder="ค้นหา..."
                            @click.stop
                          />
                        </div>
                      </div>
                      <div class="max-h-48 overflow-y-auto custom-scrollbar">
                        <div 
                          v-for="p in filteredPrefixes" 
                          :key="p"
                          @click="prefix = p; searchStates.prefix.show = false"
                          class="px-4 py-2.5 text-[13px] font-semibold hover:bg-purple-50 cursor-pointer flex items-center justify-between"
                          :class="{ 'bg-purple-50 text-purple-600': prefix === p }"
                        >
                          {{ p }}
                          <Check v-if="prefix === p" class="w-3.5 h-3.5" />
                        </div>
                        <div v-if="filteredPrefixes.length === 0" class="px-4 py-3 text-center">
                          <div class="text-[12px] text-slate-400 font-semibold mb-2">ไม่พบข้อมูล</div>
                          <button type="button" @click="prefix = searchStates.prefix.search; searchStates.prefix.show = false" class="text-[12px] font-black text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg w-full hover:bg-purple-100">
                            ใช้ "{{ searchStates.prefix.search }}"
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- First Name -->
                  <div class="md:col-span-2">
                    <label class="text-[12px] font-black text-slate-700 block uppercase tracking-wide mb-2">ชื่อ (First Name TH) *</label>
                    <input
                      v-model="firstName"
                      class="w-full h-12 px-4 rounded-2xl bg-purple-50/50 border border-purple-100 text-[14px] font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100/50 transition-all"
                      placeholder="เช่น สมชาย"
                      required
                    />
                  </div>

                  <!-- Last Name -->
                  <div class="md:col-span-2">
                    <label class="text-[12px] font-black text-slate-700 block uppercase tracking-wide mb-2">นามสกุล (Last Name TH) *</label>
                    <input
                      v-model="lastName"
                      class="w-full h-12 px-4 rounded-2xl bg-purple-50/50 border border-purple-100 text-[14px] font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100/50 transition-all"
                      placeholder="เช่น ใจดี"
                      required
                    />
                  </div>

                  <!-- Prefix EN -->
                  <div class="md:col-span-2 relative search-dropdown-prefixEn">
                    <label class="text-[12px] font-black text-slate-700 block uppercase tracking-wide mb-2">คำนำหน้า (EN) *</label>
                    <div 
                      @click="searchStates.prefixEn.show = !searchStates.prefixEn.show"
                      class="h-12 px-4 rounded-2xl bg-purple-50/50 border border-purple-100 flex items-center justify-between cursor-pointer hover:border-purple-300 transition-all"
                      :class="{ 'border-purple-400 ring-4 ring-purple-100/50': searchStates.prefixEn.show }"
                    >
                      <span class="text-[14px] font-semibold" :class="prefixEn ? 'text-slate-900' : 'text-slate-400'">
                        {{ prefixEn || 'เลือก...' }}
                      </span>
                      <ChevronDown class="w-4 h-4 text-slate-400 transition-transform" :class="{ 'rotate-180': searchStates.prefixEn.show }" />
                    </div>
                    
                    <div v-if="searchStates.prefixEn.show" class="absolute top-full left-0 right-0 mt-2 bg-white border border-purple-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                      <div class="p-2 border-b border-purple-50">
                        <div class="relative">
                          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input 
                            v-model="searchStates.prefixEn.search"
                            class="w-full h-9 pl-9 pr-4 rounded-xl bg-slate-50 text-[13px] font-semibold focus:outline-none"
                            placeholder="ค้นหา..."
                            @click.stop
                          />
                        </div>
                      </div>
                      <div class="max-h-48 overflow-y-auto custom-scrollbar">
                        <div 
                          v-for="p in filteredPrefixesEn" 
                          :key="p"
                          @click="prefixEn = p; searchStates.prefixEn.show = false"
                          class="px-4 py-2.5 text-[13px] font-semibold hover:bg-purple-50 cursor-pointer flex items-center justify-between"
                          :class="{ 'bg-purple-50 text-purple-600': prefixEn === p }"
                        >
                          {{ p }}
                          <Check v-if="prefixEn === p" class="w-3.5 h-3.5" />
                        </div>
                        <div v-if="filteredPrefixesEn.length === 0" class="px-4 py-3 text-center">
                          <div class="text-[12px] text-slate-400 font-semibold mb-2">ไม่พบข้อมูล</div>
                          <button type="button" @click="prefixEn = searchStates.prefixEn.search; searchStates.prefixEn.show = false" class="text-[12px] font-black text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg w-full hover:bg-purple-100">
                            ใช้ "{{ searchStates.prefixEn.search }}"
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- First Name EN -->
                  <div class="md:col-span-2">
                    <label class="text-[12px] font-black text-slate-700 block uppercase tracking-wide mb-2">ชื่อ (First Name EN) *</label>
                    <input
                      v-model="firstNameEn"
                      class="w-full h-12 px-4 rounded-2xl bg-purple-50/50 border border-purple-100 text-[14px] font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100/50 transition-all"
                      placeholder="e.g. Somchai"
                      required
                    />
                  </div>

                  <!-- Last Name EN -->
                  <div class="md:col-span-2">
                    <label class="text-[12px] font-black text-slate-700 block uppercase tracking-wide mb-2">นามสกุล (Last Name EN) *</label>
                    <input
                      v-model="lastNameEn"
                      class="w-full h-12 px-4 rounded-2xl bg-purple-50/50 border border-purple-100 text-[14px] font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100/50 transition-all"
                      placeholder="e.g. Jaidee"
                      required
                    />
                  </div>

                  <!-- Phone -->
                  <div class="md:col-span-6">
                    <label class="text-[12px] font-black text-slate-700 block uppercase tracking-wide mb-2">เบอร์โทรศัพท์ (Phone) *</label>
                    <div class="relative">
                      <input
                        v-model="phone"
                        class="w-full h-12 px-4 pl-12 rounded-2xl bg-purple-50/50 border border-purple-100 text-[14px] font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100/50 transition-all"
                        placeholder="08X-XXX-XXXX"
                        required
                      />
                      <Phone class="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                    </div>
                    <!-- Real-time Warning -->
                    <div v-if="phone && phone.replace(/\D/g, '').length !== 10" class="mt-2 text-[11px] font-bold text-rose-500 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                      <AlertCircle :size="12" /> เบอร์โทรศัพท์ต้องมี 10 หลัก (ขณะนี้มี {{ phone.replace(/\D/g, '').length }} หลัก)
                    </div>
                  </div>
                </div>
              </div>

              <!-- Affiliation -->
              <div class="rounded-[32px] bg-white border border-purple-100 p-8 shadow-sm">
                <div class="text-[15px] font-black text-slate-900 flex items-center gap-2">
                  <div class="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <FileText :size="16" />
                  </div>
                  ข้อมูลหน่วยงาน (Affiliation)
                </div>
                <p class="text-[11px] font-semibold text-slate-400 mt-1.5 mb-6">เลือกจากรายการ หรือพิมพ์ชื่อสถาบันตรงๆ หากไม่พบในรายการ พิมพ์ชื่อในช่องค้นหาแล้วกด "ตกลงใช้"ได้เลย</p>
                
                <div class="space-y-5">
                  <div class="relative search-dropdown-institution">
                    <label class="text-[12px] font-black text-slate-700 block uppercase tracking-wide mb-2">สถาบัน/หน่วยงาน (Institution) *</label>
                    <div 
                      @click="searchStates.institution.show = !searchStates.institution.show; searchStates.institution.search = institution"
                      class="h-12 px-4 rounded-2xl bg-purple-50/50 border border-purple-100 flex items-center justify-between cursor-pointer hover:border-purple-300 transition-all"
                      :class="{ 'border-purple-400 ring-4 ring-purple-100/50': searchStates.institution.show }"
                    >
                      <span class="text-[14px] font-semibold truncate pr-2" :class="institution ? 'text-slate-900' : 'text-slate-400'">
                        {{ institution || 'ระบุสถาบัน...' }}
                      </span>
                      <ChevronDown class="w-4 h-4 text-slate-400 shrink-0 transition-transform" :class="{ 'rotate-180': searchStates.institution.show }" />
                    </div>
                    
                    <div v-if="searchStates.institution.show" class="absolute top-full left-0 right-0 mt-2 bg-white border border-purple-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                      <div class="p-2 border-b border-purple-50">
                        <div class="relative">
                          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input 
                            v-model="searchStates.institution.search"
                            class="w-full h-9 pl-9 pr-4 rounded-xl bg-slate-50 text-[13px] font-semibold focus:outline-none"
                            placeholder="พิมพ์ชื่อสถาบัน..."
                            @click.stop
                            @input="institution = searchStates.institution.search"
                          />
                        </div>
                      </div>
                      <div class="max-h-48 overflow-y-auto custom-scrollbar">
                        <div 
                          v-for="p in filteredInstitutions" 
                          :key="p"
                          @click="institution = p; searchStates.institution.show = false"
                          class="px-4 py-2.5 text-[13px] font-semibold hover:bg-purple-50 cursor-pointer flex items-center justify-between"
                          :class="{ 'bg-purple-50 text-purple-600': institution === p }"
                        >
                          <span class="truncate pr-2">{{ p }}</span>
                          <Check v-if="institution === p" class="w-3.5 h-3.5 shrink-0" />
                        </div>
                        <div v-if="filteredInstitutions.length === 0 && searchStates.institution.search" class="px-4 py-3 text-center border-t border-slate-50">
                          <button type="button" @click="institution = searchStates.institution.search; searchStates.institution.show = false" class="text-[12px] font-black text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg w-full hover:bg-purple-100">
                            ตกลงใช้ "{{ searchStates.institution.search }}"
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <!-- Academic Position -->
                    <div class="relative search-dropdown-position">
                      <label class="text-[12px] font-black text-slate-700 block uppercase tracking-wide mb-2">ตำแหน่งทางวิชาการ</label>
                      <div 
                        @click="searchStates.position.show = !searchStates.position.show"
                        class="h-12 px-4 rounded-2xl bg-purple-50/50 border border-purple-100 flex items-center justify-between cursor-pointer hover:border-purple-300 transition-all"
                        :class="{ 'border-purple-400 ring-4 ring-purple-100/50': searchStates.position.show }"
                      >
                        <span class="text-[14px] font-semibold truncate pr-2" :class="academicPosition ? 'text-slate-900' : 'text-slate-400'">
                          {{ academicPosition || 'เลือกตำแหน่ง...' }}
                        </span>
                        <ChevronDown class="w-4 h-4 text-slate-400 shrink-0 transition-transform" :class="{ 'rotate-180': searchStates.position.show }" />
                      </div>
                      
                      <div v-if="searchStates.position.show" class="absolute top-full left-0 right-0 mt-2 bg-white border border-purple-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                        <div class="p-2 border-b border-purple-50">
                          <div class="relative">
                            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input 
                              v-model="searchStates.position.search"
                              class="w-full h-9 pl-9 pr-4 rounded-xl bg-slate-50 text-[13px] font-semibold focus:outline-none"
                              placeholder="ค้นหา..."
                              @click.stop
                            />
                          </div>
                        </div>
                        <div class="max-h-48 overflow-y-auto custom-scrollbar">
                          <div 
                            v-for="p in filteredPositions" 
                            :key="p"
                            @click="academicPosition = p; searchStates.position.show = false"
                            class="px-4 py-2.5 text-[13px] font-semibold hover:bg-purple-50 cursor-pointer flex items-center justify-between"
                            :class="{ 'bg-purple-50 text-purple-600': academicPosition === p }"
                          >
                            <span class="truncate pr-2">{{ p }}</span>
                            <Check v-if="academicPosition === p" class="w-3.5 h-3.5 shrink-0" />
                          </div>
                          <div v-if="filteredPositions.length === 0 && searchStates.position.search" class="px-4 py-3 text-center border-t border-slate-50">
                            <button type="button" @click="academicPosition = searchStates.position.search; searchStates.position.show = false" class="text-[12px] font-black text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg w-full hover:bg-purple-100">
                              ใช้ "{{ searchStates.position.search }}"
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Province -->
                    <div class="relative search-dropdown-province">
                      <label class="text-[12px] font-black text-slate-700 block uppercase tracking-wide mb-2">จังหวัด (Province)</label>
                      <div 
                        @click="searchStates.province.show = !searchStates.province.show"
                        class="h-12 px-4 rounded-2xl bg-purple-50/50 border border-purple-100 flex items-center justify-between cursor-pointer hover:border-purple-300 transition-all"
                        :class="{ 'border-purple-400 ring-4 ring-purple-100/50': searchStates.province.show }"
                      >
                        <span class="text-[14px] font-semibold" :class="province ? 'text-slate-900' : 'text-slate-400'">
                          {{ province || 'เลือกจังหวัด...' }}
                        </span>
                        <ChevronDown class="w-4 h-4 text-slate-400 transition-transform" :class="{ 'rotate-180': searchStates.province.show }" />
                      </div>
                      
                      <div v-if="searchStates.province.show" class="absolute top-full left-0 right-0 mt-2 bg-white border border-purple-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                        <div class="p-2 border-b border-purple-50">
                          <div class="relative">
                            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input 
                              v-model="searchStates.province.search"
                              class="w-full h-9 pl-9 pr-4 rounded-xl bg-slate-50 text-[13px] font-semibold focus:outline-none"
                              placeholder="ค้นหา..."
                              @click.stop
                            />
                          </div>
                        </div>
                        <div class="max-h-48 overflow-y-auto custom-scrollbar">
                          <div 
                            v-for="p in filteredProvinces" 
                            :key="p"
                            @click="province = p; searchStates.province.show = false"
                            class="px-4 py-2.5 text-[13px] font-semibold hover:bg-purple-50 cursor-pointer flex items-center justify-between"
                            :class="{ 'bg-purple-50 text-purple-600': province === p }"
                          >
                            {{ p }}
                            <Check v-if="province === p" class="w-3.5 h-3.5" />
                          </div>
                          <div v-if="filteredProvinces.length === 0" class="px-4 py-8 text-center text-[12px] text-slate-400 font-semibold">
                            ไม่พบข้อมูล
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label class="text-[12px] font-black text-slate-700 block uppercase tracking-wide mb-2">อีเมล (Email) - ใช้สำหรับเข้าสู่ระบบ</label>
                    <div class="relative">
                      <input
                        v-model="email"
                        type="email"
                        class="w-full h-12 px-4 pl-12 rounded-2xl bg-purple-50/50 border border-purple-100 text-[14px] font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100/50 transition-all"
                        placeholder="your@email.com"
                        required
                      />
                      <Mail class="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Security -->
              <div class="rounded-[32px] bg-white border border-purple-100 p-8 shadow-sm">
                <div class="text-[15px] font-black text-slate-900 flex items-center gap-2 mb-6">
                  <div class="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Lock :size="16" />
                  </div>
                  ความปลอดภัย (Security)
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="text-[12px] font-black text-slate-700 block uppercase tracking-wide mb-2">รหัสผ่าน (Password)</label>
                    <div class="relative">
                      <input
                        :type="showPw.password ? 'text' : 'password'"
                        v-model="password"
                        class="w-full h-12 px-4 pl-12 pr-12 rounded-2xl bg-purple-50/50 border border-purple-100 text-[14px] font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100/50 transition-all"
                        placeholder="*********"
                        autocomplete="new-password"
                        minlength="8"
                        maxlength="64"
                        required
                      />
                      <Lock class="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                      <button
                        type="button"
                        @click="showPw.password = !showPw.password"
                        class="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                      >
                        <EyeOff v-if="showPw.password" class="w-[14px] h-[14px] text-slate-500" />
                        <Eye v-else class="w-[14px] h-[14px] text-slate-500" />
                      </button>
                    </div>

                    <!-- Password Strength Meter -->
                    <div class="mt-4 space-y-3">
                      <div class="flex items-center justify-between text-[11px] font-black uppercase tracking-wider">
                        <span :class="strengthText.color">Strength: {{ strengthText.label }}</span>
                        <span class="text-slate-400">{{ strengthScore }}/6</span>
                      </div>
                      <div class="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div class="h-full transition-all duration-500" :class="strengthText.bar"></div>
                      </div>
                      
                      <!-- Password Suggestions -->
                      <div class="grid grid-cols-2 gap-2 mt-4">
                        <div 
                          v-for="(val, key) in passwordCriteria" 
                          :key="key"
                          class="flex items-center gap-2 text-[11px] font-bold transition-colors"
                          :class="val ? 'text-emerald-600' : 'text-slate-400'"
                        >
                          <CheckCircle v-if="val" :size="12" />
                          <AlertCircle v-else :size="12" />
                          <span v-if="key === 'length'">8+ ตัวอักษร</span>
                          <span v-if="key === 'upper'">ตัวพิมพ์ใหญ่ (A)</span>
                          <span v-if="key === 'lower'">ตัวพิมพ์เล็ก (a)</span>
                          <span v-if="key === 'number'">ตัวเลข (0-9)</span>
                          <span v-if="key === 'special'">อักขระพิเศษ (@)</span>
                          <span v-if="key === 'noSequence'">ไม่มีตัวอักษรเรียงกัน (123)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label class="text-[12px] font-black text-slate-700 block uppercase tracking-wide mb-2">ยืนยันรหัสผ่าน</label>
                    <div class="relative">
                      <input
                        :type="showPw.confirm ? 'text' : 'password'"
                        v-model="confirm"
                        class="w-full h-12 px-4 pl-12 pr-12 rounded-2xl bg-purple-50/50 border border-purple-100 text-[14px] font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100/50 transition-all"
                        placeholder="*********"
                        autocomplete="new-password"
                        minlength="8"
                        maxlength="64"
                        required
                      />
                      <Lock class="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                      <button
                        type="button"
                        @click="showPw.confirm = !showPw.confirm"
                        class="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                      >
                        <EyeOff v-if="showPw.confirm" class="w-[14px] h-[14px] text-slate-500" />
                        <Eye v-else class="w-[14px] h-[14px] text-slate-500" />
                      </button>
                    </div>
                    <div v-if="confirm && password !== confirm" class="mt-2 flex items-center gap-1.5 text-rose-500 text-[11px] font-bold">
                      <X :size="12" /> รหัสผ่านไม่ตรงกัน
                    </div>
                    <div v-else-if="confirm && password === confirm" class="mt-2 flex items-center gap-1.5 text-emerald-500 text-[11px] font-bold">
                      <Check :size="12" /> รหัสผ่านตรงกัน
                    </div>
                  </div>
                </div>
              </div>

              <label class="mt-6 flex items-start gap-3 text-[14px] font-bold text-slate-700 cursor-pointer group px-2">
                <input
                  type="checkbox"
                  v-model="acceptTerms"
                  class="mt-1 w-4 h-4 rounded border-purple-200 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <span class="group-hover:text-purple-700 transition-colors leading-relaxed">
                  ฉันยอมรับ 
                  <a href="/terms" target="_blank" class="text-purple-600 underline decoration-purple-300 underline-offset-4 hover:text-purple-800">เงื่อนไขและข้อกำหนด</a> 
                  และ 
                  <a href="/privacy" target="_blank" class="text-purple-600 underline decoration-purple-300 underline-offset-4 hover:text-purple-800">นโยบายความเป็นส่วนตัว</a>
                  ของ {{ conferenceSettings.name || 'การประชุมวิชาการ' }}
                </span>
              </label>

              <button
                type="submit"
                :disabled="isLoading"
                :class="[
                  'mt-6 h-14 w-full rounded-[24px] text-[15px] font-black inline-flex items-center justify-center gap-2 transition-all duration-300 shadow-md',
                  isLoading ? 'bg-slate-200 text-slate-400 cursor-wait shadow-none' : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-purple-300/40 hover:-translate-y-0.5'
                ]"
              >
                {{ isLoading ? 'กำลังดำเนินการ...' : 'ลงทะเบียน (Create Account)' }}
                <MoveRight v-if="!isLoading" class="w-5 h-5" />
              </button>
            </form>

            <div v-if="!showOtpStep" class="text-[14px] font-bold text-slate-600 pb-12 text-center">
              มีบัญชีอยู่แล้ว?
              <NuxtLink to="/login" class="font-black text-purple-600 hover:text-purple-500 ml-1.5 underline decoration-2 underline-offset-4 decoration-purple-600/30 hover:decoration-purple-500">
                เข้าสู่ระบบ (Sign In)
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Terms Modal Removed in favor of separate page -->
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}

/* Animations */
.animate-in {
  animation: animate-in 0.3s ease-out;
}

@keyframes animate-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
