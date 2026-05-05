<script setup>
definePageMeta({ layout: false });
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { User, Phone, FileText, MoveRight, ChevronDown, Check, Search, AlertCircle, CheckCircle2, XCircle } from 'lucide-vue-next';
import { useAuth } from '~/composables/useAuth';
import { useSupabase } from '~/composables/useSupabase';
import { PREFIXES, ACADEMIC_POSITIONS, THAI_PROVINCES } from '~/utils/constants';

const router = useRouter();
const { userProfile, currentUser } = useAuth();
const supabase = useSupabase();

const isLoading = ref(false);
const toast = ref(null);

const form = ref({
  prefix: '',
  firstName: '',
  lastName: '',
  prefixEn: '',
  firstNameEn: '',
  lastNameEn: '',
  phone: '',
  institution: '',
  academicPosition: '',
  province: ''
});

const searchStates = ref({
  prefix: { show: false, search: '' },
  prefixEn: { show: false, search: '' },
  position: { show: false, search: '' },
  province: { show: false, search: '' }
});

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

const showToast = (message, tone = 'ok') => {
  toast.value = { message, tone };
  window.setTimeout(() => { toast.value = null; }, 3000);
};

const checkProfileAndRedirect = () => {
  if (userProfile.value && userProfile.value.first_name_th && userProfile.value.phone && userProfile.value.institution) {
    router.replace('/portal/dashboard');
    return true;
  }
  
  if (userProfile.value) {
    form.value.prefix = userProfile.value.title || '';
    form.value.firstName = userProfile.value.first_name_th || '';
    form.value.lastName = userProfile.value.last_name_th || '';
    form.value.prefixEn = userProfile.value.title_en || '';
    form.value.firstNameEn = userProfile.value.first_name_en || '';
    form.value.lastNameEn = userProfile.value.last_name_en || '';
    form.value.phone = userProfile.value.phone || '';
    form.value.institution = userProfile.value.institution || '';
    form.value.academicPosition = userProfile.value.academic_position || '';
    form.value.province = userProfile.value.province || '';
  } else if (currentUser.value) {
    // Attempt to extract name from google meta
    const meta = currentUser.value.user_metadata || {};
    if (meta.full_name) {
      const parts = meta.full_name.split(' ');
      form.value.firstName = parts[0] || '';
      form.value.lastName = parts.slice(1).join(' ') || '';
    }
  }
  return false;
};

watch(userProfile, () => {
  checkProfileAndRedirect();
}, { immediate: true });

onMounted(async () => {
  // Handle click outside dropdown
  window.addEventListener('click', (e) => {
    Object.keys(searchStates.value).forEach(key => {
      if (!e.target.closest(`.search-dropdown-${key}`)) {
        searchStates.value[key].show = false;
      }
    });
  });
});

const handleSaveProfile = async () => {
  if (!form.value.prefix || !form.value.firstName.trim() || !form.value.lastName.trim() || !form.value.prefixEn || !form.value.firstNameEn.trim() || !form.value.lastNameEn.trim() || !form.value.phone.trim() || !form.value.institution.trim()) {
    showToast('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', 'err');
    return;
  }
  
  isLoading.value = true;
  try {
    // If the user logs in via Google and doesn't exist in `users` table yet, upsert it.
    const { error } = await supabase
      .from('users')
      .upsert({
        user_id: currentUser.value.id,
        email: currentUser.value.email,
        role: 'author',
        title: form.value.prefix,
        first_name_th: form.value.firstName.trim(),
        last_name_th: form.value.lastName.trim(),
        phone: form.value.phone.trim(),
        institution: form.value.institution.trim(),
        academic_position: form.value.academicPosition,
        province: form.value.province,
        created_at: userProfile.value?.created_at || new Date().toISOString(),
      }, { onConflict: 'user_id' });
      
    if (error) throw error;
    
    // Update local profile data
    if (userProfile.value) {
      Object.assign(userProfile.value, {
        title: form.value.prefix,
        first_name_th: form.value.firstName.trim(),
        last_name_th: form.value.lastName.trim(),
        title_en: form.value.prefixEn,
        first_name_en: form.value.firstNameEn.trim(),
        last_name_en: form.value.lastNameEn.trim(),
        phone: form.value.phone.trim(),
        institution: form.value.institution.trim(),
        academic_position: form.value.academicPosition,
        province: form.value.province
      });
    } else {
      userProfile.value = {
        user_id: currentUser.value.id,
        email: currentUser.value.email,
        role: 'author',
        title: form.value.prefix,
        first_name_th: form.value.firstName.trim(),
        last_name_th: form.value.lastName.trim(),
        title_en: form.value.prefixEn,
        first_name_en: form.value.firstNameEn.trim(),
        last_name_en: form.value.lastNameEn.trim(),
        phone: form.value.phone.trim(),
        institution: form.value.institution.trim(),
        academic_position: form.value.academicPosition,
        province: form.value.province
      };
    }

    showToast('บันทึกข้อมูลเรียบร้อย กำลังเข้าสู่ระบบ...', 'ok');
    setTimeout(() => {
      router.push('/portal/dashboard');
    }, 1500);
  } catch (err) {
    showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'err');
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-purple-50/30 flex flex-col items-center justify-center p-6 font-sans">
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
          'mb-6 h-12 px-5 rounded-2xl border text-[13px] font-black inline-flex items-center gap-3 transition-all fixed top-6 left-1/2 -translate-x-1/2 z-[100] max-w-md shadow-lg',
          toast.tone === 'err' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        ]"
      >
        <CheckCircle2 v-if="toast.tone !== 'err'" class="w-5 h-5 text-emerald-600" />
        <XCircle v-else class="w-5 h-5 text-rose-600" />
        {{ toast.message }}
      </div>
    </Transition>

    <div class="w-full max-w-2xl bg-white rounded-[32px] border border-purple-100 shadow-sm p-8 md:p-12">
      <div class="flex items-center justify-center mb-8">
        <div class="w-16 h-16 rounded-[24px] bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center text-purple-600 shadow-sm">
          <User class="w-8 h-8" />
        </div>
      </div>
      
      <div class="text-center mb-10">
        <h1 class="text-3xl font-black text-purple-950 tracking-tight">เติมเต็มข้อมูลของคุณ</h1>
        <p class="mt-2 text-[15px] font-semibold text-purple-700/60">เราต้องการข้อมูลพื้นฐานอีกเล็กน้อยเพื่อนำไปใช้ในการออกใบประกาศนียบัตร</p>
      </div>

      <form @submit.prevent="handleSaveProfile" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-6 gap-5">
          <!-- Prefix -->
          <div class="md:col-span-2 relative search-dropdown-prefix">
            <label class="text-[12px] font-black text-slate-700 block uppercase tracking-wide mb-2">คำนำหน้า (TH) *</label>
            <div 
              @click="searchStates.prefix.show = !searchStates.prefix.show"
              class="h-12 px-4 rounded-2xl bg-purple-50/50 border border-purple-100 flex items-center justify-between cursor-pointer hover:border-purple-300 transition-all"
            >
              <span class="text-[14px] font-semibold" :class="form.prefix ? 'text-slate-900' : 'text-slate-400'">
                {{ form.prefix || 'เลือก...' }}
              </span>
              <ChevronDown class="w-4 h-4 text-slate-400 transition-transform" :class="{ 'rotate-180': searchStates.prefix.show }" />
            </div>
            
            <div v-if="searchStates.prefix.show" class="absolute top-full left-0 right-0 mt-2 bg-white border border-purple-100 rounded-2xl shadow-xl z-50 overflow-hidden">
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
                  @click="form.prefix = p; searchStates.prefix.show = false"
                  class="px-4 py-2.5 text-[13px] font-semibold hover:bg-purple-50 cursor-pointer flex items-center justify-between"
                >
                  {{ p }}
                </div>
              </div>
            </div>
          </div>

          <!-- First Name -->
          <div class="md:col-span-2">
            <label class="text-[12px] font-black text-slate-700 block uppercase tracking-wide mb-2">ชื่อ (First Name TH) *</label>
            <input
              v-model="form.firstName"
              class="w-full h-12 px-4 rounded-2xl bg-purple-50/50 border border-purple-100 text-[14px] font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-300 transition-all"
              required
            />
          </div>

          <!-- Last Name -->
          <div class="md:col-span-2">
            <label class="text-[12px] font-black text-slate-700 block uppercase tracking-wide mb-2">นามสกุล (Last Name TH) *</label>
            <input
              v-model="form.lastName"
              class="w-full h-12 px-4 rounded-2xl bg-purple-50/50 border border-purple-100 text-[14px] font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-300 transition-all"
              required
            />
          </div>

          <!-- Prefix EN -->
          <div class="md:col-span-2 relative search-dropdown-prefixEn">
            <label class="text-[12px] font-black text-slate-700 block uppercase tracking-wide mb-2">คำนำหน้า (EN) *</label>
            <div 
              @click="searchStates.prefixEn.show = !searchStates.prefixEn.show"
              class="h-12 px-4 rounded-2xl bg-purple-50/50 border border-purple-100 flex items-center justify-between cursor-pointer hover:border-purple-300 transition-all"
            >
              <span class="text-[14px] font-semibold" :class="form.prefixEn ? 'text-slate-900' : 'text-slate-400'">
                {{ form.prefixEn || 'เลือก...' }}
              </span>
              <ChevronDown class="w-4 h-4 text-slate-400 transition-transform" :class="{ 'rotate-180': searchStates.prefixEn.show }" />
            </div>
            
            <div v-if="searchStates.prefixEn.show" class="absolute top-full left-0 right-0 mt-2 bg-white border border-purple-100 rounded-2xl shadow-xl z-50 overflow-hidden">
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
                  @click="form.prefixEn = p; searchStates.prefixEn.show = false"
                  class="px-4 py-2.5 text-[13px] font-semibold hover:bg-purple-50 cursor-pointer flex items-center justify-between"
                >
                  {{ p }}
                </div>
              </div>
            </div>
          </div>

          <!-- First Name EN -->
          <div class="md:col-span-2">
            <label class="text-[12px] font-black text-slate-700 block uppercase tracking-wide mb-2">ชื่อ (First Name EN) *</label>
            <input
              v-model="form.firstNameEn"
              class="w-full h-12 px-4 rounded-2xl bg-purple-50/50 border border-purple-100 text-[14px] font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-300 transition-all"
              required
            />
          </div>

          <!-- Last Name EN -->
          <div class="md:col-span-2">
            <label class="text-[12px] font-black text-slate-700 block uppercase tracking-wide mb-2">นามสกุล (Last Name EN) *</label>
            <input
              v-model="form.lastNameEn"
              class="w-full h-12 px-4 rounded-2xl bg-purple-50/50 border border-purple-100 text-[14px] font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-300 transition-all"
              required
            />
          </div>

          <!-- Phone -->
          <div class="md:col-span-6">
            <label class="text-[12px] font-black text-slate-700 block uppercase tracking-wide mb-2">เบอร์โทรศัพท์ (Phone) *</label>
            <div class="relative">
              <input
                v-model="form.phone"
                class="w-full h-12 px-4 pl-12 rounded-2xl bg-purple-50/50 border border-purple-100 text-[14px] font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-300 transition-all"
                required
              />
              <Phone class="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
            </div>
          </div>
        </div>

        <div class="pt-2">
          <label class="text-[12px] font-black text-slate-700 block uppercase tracking-wide mb-2">สถาบัน/หน่วยงาน (Institution) *</label>
          <div class="relative">
            <input
              v-model="form.institution"
              class="w-full h-12 px-4 pl-12 rounded-2xl bg-purple-50/50 border border-purple-100 text-[14px] font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-300 transition-all"
              required
            />
            <FileText class="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          <!-- Position -->
          <div class="relative search-dropdown-position">
            <label class="text-[12px] font-black text-slate-700 block uppercase tracking-wide mb-2">ตำแหน่งทางวิชาการ</label>
            <div 
              @click="searchStates.position.show = !searchStates.position.show"
              class="h-12 px-4 rounded-2xl bg-purple-50/50 border border-purple-100 flex items-center justify-between cursor-pointer hover:border-purple-300 transition-all"
            >
              <span class="text-[14px] font-semibold truncate pr-2" :class="form.academicPosition ? 'text-slate-900' : 'text-slate-400'">
                {{ form.academicPosition || 'เลือกตำแหน่ง...' }}
              </span>
              <ChevronDown class="w-4 h-4 text-slate-400 shrink-0 transition-transform" :class="{ 'rotate-180': searchStates.position.show }" />
            </div>
            
            <div v-if="searchStates.position.show" class="absolute top-full left-0 right-0 mt-2 bg-white border border-purple-100 rounded-2xl shadow-xl z-50 overflow-hidden">
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
                  @click="form.academicPosition = p; searchStates.position.show = false"
                  class="px-4 py-2.5 text-[13px] font-semibold hover:bg-purple-50 cursor-pointer flex items-center justify-between"
                >
                  <span class="truncate">{{ p }}</span>
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
            >
              <span class="text-[14px] font-semibold truncate pr-2" :class="form.province ? 'text-slate-900' : 'text-slate-400'">
                {{ form.province || 'เลือกจังหวัด...' }}
              </span>
              <ChevronDown class="w-4 h-4 text-slate-400 shrink-0 transition-transform" :class="{ 'rotate-180': searchStates.province.show }" />
            </div>
            
            <div v-if="searchStates.province.show" class="absolute top-full left-0 right-0 mt-2 bg-white border border-purple-100 rounded-2xl shadow-xl z-50 overflow-hidden">
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
                  @click="form.province = p; searchStates.province.show = false"
                  class="px-4 py-2.5 text-[13px] font-semibold hover:bg-purple-50 cursor-pointer flex items-center justify-between"
                >
                  <span class="truncate">{{ p }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="mt-8 h-14 w-full rounded-[24px] bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-[15px] inline-flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-300/40 hover:-translate-y-0.5 transition-all duration-300 shadow-md disabled:opacity-50"
        >
          {{ isLoading ? 'กำลังบันทึกข้อมูล...' : 'บันทึกข้อมูลและเข้าสู่ระบบ' }}
          <MoveRight v-if="!isLoading" class="w-5 h-5" />
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
</style>
