<script setup>
definePageMeta({ middleware: 'auth', layout: 'admin' });
import { ref, computed, onMounted } from 'vue';
import {
  UserPlus, Mail,
  RefreshCw, CheckCircle2, Clock, AlertCircle,
  Users, Search, Send
} from 'lucide-vue-next';

const supabase = useSupabase();

// ───── INVITE FORM ─────
const inviteForm = ref({
  email: '',
  first_name_th: '',
  last_name_th: '',
  first_name_en: '',
  last_name_en: '',
  institution: '',
});
const inviteLoading = ref(false);
const inviteResult = ref(null);
const inviteError = ref('');

const canInvite = computed(() =>
  inviteForm.value.email.includes('@') &&
  inviteForm.value.first_name_th &&
  inviteForm.value.last_name_th
);

const sendInvite = async () => {
  if (!canInvite.value || inviteLoading.value) return;
  inviteLoading.value = true;
  inviteError.value = '';
  inviteResult.value = null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('ไม่พบ session ของผู้ดูแลระบบ กรุณาเข้าสู่ระบบใหม่');
    }

    const { data: json, error } = await supabase.functions.invoke('invite-reviewer', {
      body: {
        email: inviteForm.value.email.trim().toLowerCase(),
        metadata: {
          first_name_th: inviteForm.value.first_name_th,
          last_name_th: inviteForm.value.last_name_th,
          first_name_en: inviteForm.value.first_name_en,
          last_name_en: inviteForm.value.last_name_en,
          institution: inviteForm.value.institution,
          role: 'reviewer',
        }
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    if (error) throw error;
    if (!json) throw new Error('ไม่ได้รับข้อมูลตอบกลับจากระบบคำเชิญ');
    if (json.error) throw new Error(json.error);

    inviteResult.value = json;
    if (json.success) {
      // Reset form
      inviteForm.value = { email: '', first_name_th: '', last_name_th: '', first_name_en: '', last_name_en: '', institution: '' };
      // Refresh reviewer list
      await loadReviewers();
    }
  } catch (err) {
    inviteError.value = err.message || 'ไม่สามารถส่งคำเชิญได้';
  } finally {
    inviteLoading.value = false;
  }
};

// ───── REVIEWER LIST ─────
const reviewers = ref([]);
const loadingReviewers = ref(true);
const searchQuery = ref('');

const filteredReviewers = computed(() => {
  const q = searchQuery.value.toLowerCase();
  if (!q) return reviewers.value;
  return reviewers.value.filter(r =>
    r.email?.toLowerCase().includes(q) ||
    r.first_name_th?.includes(q) ||
    r.last_name_th?.includes(q) ||
    r.institution?.toLowerCase().includes(q)
  );
});

const loadReviewers = async () => {
  loadingReviewers.value = true;
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        user_id,
        email,
        first_name_th,
        last_name_th,
        first_name_en,
        last_name_en,
        institution,
        created_at
      `)
      .eq('role', 'reviewer')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Also get assignment counts per reviewer
    const { data: assignments } = await supabase
      .from('review_assignments')
      .select('reviewer_id, status');

    const countMap = {};
    const completedMap = {};
    (assignments || []).forEach(a => {
      countMap[a.reviewer_id] = (countMap[a.reviewer_id] || 0) + 1;
      if (a.status === 'completed') {
        completedMap[a.reviewer_id] = (completedMap[a.reviewer_id] || 0) + 1;
      }
    });

    reviewers.value = (data || []).map(r => ({
      ...r,
      total_assignments: countMap[r.user_id] || 0,
      completed_assignments: completedMap[r.user_id] || 0,
    }));
  } catch (err) {
    console.error('loadReviewers error:', err);
  } finally {
    loadingReviewers.value = false;
  }
};

onMounted(loadReviewers);
</script>

<template>
  <div class="p-8 pb-32 font-['Sarabun','Lato'] animate-fade-in">
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-black text-slate-800">จัดการกรรมการประเมิน</h2>
        <p class="text-sm text-slate-500 mt-1">เชิญกรรมการและติดตามความคืบหน้า (ตั้งค่าสิทธิ์ Phase 2 ที่หน้าเฉพาะ)</p>
      </div>
      <button @click="loadReviewers" class="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-4 py-2.5 rounded-xl transition-all">
        <RefreshCw class="w-3.5 h-3.5" :class="loadingReviewers ? 'animate-spin' : ''" />
        รีเฟรช
      </button>
    </div>



        <div class="grid grid-cols-1 xl:grid-cols-3 gap-8 max-w-7xl mx-auto">

          <!-- ★ INVITE FORM -->
          <div class="xl:col-span-1">
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-0">
              <div class="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center gap-3">
                <div class="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
                  <UserPlus class="w-4 h-4 text-white" />
                </div>
                <div>
                  <div class="font-bold text-slate-800 text-sm">เชิญกรรมการใหม่</div>
                  <div class="text-[11px] text-slate-500">ส่ง invitation email พร้อมลิงก์ตั้งรหัสผ่าน</div>
                </div>
              </div>

              <div class="p-6 space-y-4">
                <!-- Email -->
                <div>
                  <label class="text-xs font-bold text-slate-600 block mb-1.5">อีเมลมหาวิทยาลัย *</label>
                  <div class="relative">
                    <Mail class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      v-model="inviteForm.email"
                      type="email"
                      placeholder="reviewer@university.ac.th"
                      class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <!-- Thai name -->
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="text-xs font-bold text-slate-600 block mb-1.5">ชื่อ (ไทย) *</label>
                    <input v-model="inviteForm.first_name_th" placeholder="สมชาย" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label class="text-xs font-bold text-slate-600 block mb-1.5">นามสกุล (ไทย) *</label>
                    <input v-model="inviteForm.last_name_th" placeholder="ใจดี" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                  </div>
                </div>

                <!-- English name -->
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="text-xs font-bold text-slate-600 block mb-1.5">First Name (EN)</label>
                    <input v-model="inviteForm.first_name_en" placeholder="Somchai" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label class="text-xs font-bold text-slate-600 block mb-1.5">Last Name (EN)</label>
                    <input v-model="inviteForm.last_name_en" placeholder="Jaidee" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                  </div>
                </div>

                <!-- Institution -->
                <div>
                  <label class="text-xs font-bold text-slate-600 block mb-1.5">สังกัดมหาวิทยาลัย</label>
                  <input v-model="inviteForm.institution" placeholder="มหาวิทยาลัยราชภัฏบุรีรัมย์" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                </div>

                <!-- Result / Error -->
                <div v-if="inviteResult && inviteResult.success" class="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <CheckCircle2 class="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span class="text-xs font-semibold text-emerald-700">{{ inviteResult.message }}</span>
                </div>
                <div v-else-if="inviteResult && !inviteResult.success" class="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <AlertCircle class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span class="text-xs font-semibold text-amber-700">{{ inviteResult.message }}</span>
                </div>
                <div v-if="inviteError" class="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200">
                  <AlertCircle class="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span class="text-xs font-semibold text-rose-700">{{ inviteError }}</span>
                </div>

                <!-- Submit -->
                <button
                  @click="sendInvite"
                  :disabled="!canInvite || inviteLoading"
                  class="w-full h-11 rounded-2xl text-xs font-black inline-flex items-center justify-center gap-2 transition-all"
                  :class="canInvite && !inviteLoading
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-900/20'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'"
                >
                  <span v-if="inviteLoading" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <Send v-else class="w-4 h-4" />
                  {{ inviteLoading ? 'กำลังส่งคำเชิญ...' : 'ส่งคำเชิญ (Invite Reviewer)' }}
                </button>

                <div class="text-[10px] text-slate-400 text-center leading-relaxed">
                  กรรมการจะได้รับอีเมล พร้อมลิงก์ตั้งรหัสผ่านและดาวน์โหลด Mobile App
                </div>
              </div>
            </div>
          </div>

          <!-- ★ REVIEWER LIST -->
          <div class="xl:col-span-2">
            <!-- Search -->
            <div class="flex items-center gap-4 mb-6">
              <div class="relative flex-1">
                <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  v-model="searchQuery"
                  placeholder="ค้นหาชื่อ, อีเมล, สังกัด..."
                  class="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div class="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 whitespace-nowrap">
                {{ filteredReviewers.length }} คน
              </div>
            </div>

            <!-- Loading -->
            <div v-if="loadingReviewers" class="flex items-center justify-center py-20">
              <RefreshCw class="w-8 h-8 text-slate-300 animate-spin" />
            </div>

            <!-- Empty -->
            <div v-else-if="filteredReviewers.length === 0" class="text-center py-20 bg-white rounded-2xl border border-slate-200">
              <Users class="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <div class="font-bold text-slate-500">ยังไม่มีกรรมการในระบบ</div>
              <div class="text-sm text-slate-400 mt-1">ใช้ฟอร์มด้านซ้ายเพื่อส่งคำเชิญ</div>
            </div>

            <!-- Reviewer Cards -->
            <div v-else class="space-y-4">
              <div
                v-for="reviewer in filteredReviewers"
                :key="reviewer.user_id"
                class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all"
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="flex items-center gap-4 flex-1 min-w-0">
                    <!-- Avatar -->
                    <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600 font-black text-lg shrink-0">
                      {{ (reviewer.first_name_th || reviewer.email || '?').charAt(0) }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-bold text-slate-800 text-sm">
                        {{ reviewer.first_name_th }} {{ reviewer.last_name_th }}
                        <span v-if="reviewer.first_name_en" class="text-slate-400 font-medium text-xs ml-2">({{ reviewer.first_name_en }} {{ reviewer.last_name_en }})</span>
                      </div>
                      <div class="text-xs text-slate-500 mt-0.5 truncate">{{ reviewer.email }}</div>
                      <div v-if="reviewer.institution" class="text-[11px] text-slate-400 mt-0.5">{{ reviewer.institution }}</div>
                    </div>
                  </div>

                  <!-- Phase 2 shortcut -->
                  <div class="flex flex-col items-end gap-2 shrink-0">
                    <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reviewer</div>
                    <NuxtLink
                      to="/phase2/permissions"
                      class="px-4 py-2 rounded-xl border text-xs font-black transition-all bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                    >
                      จัดการสิทธิ์ Phase 2
                    </NuxtLink>
                  </div>
                </div>

                <!-- Progress -->
                <div class="mt-5 pt-4 border-t border-slate-100 flex items-center gap-6">
                  <div class="flex-1">
                    <div class="flex justify-between text-[11px] font-bold text-slate-500 mb-1.5">
                      <span>ความคืบหน้า Phase 1</span>
                      <span>{{ reviewer.completed_assignments }}/{{ reviewer.total_assignments }} บทความ</span>
                    </div>
                    <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all duration-500"
                        :class="reviewer.total_assignments > 0 && reviewer.completed_assignments === reviewer.total_assignments
                          ? 'bg-emerald-500' : 'bg-indigo-500'"
                        :style="{ width: reviewer.total_assignments > 0 ? `${(reviewer.completed_assignments / reviewer.total_assignments) * 100}%` : '0%' }"
                      />
                    </div>
                  </div>
                  <div class="flex items-center gap-1.5 text-[11px] font-bold"
                    :class="reviewer.total_assignments > 0 && reviewer.completed_assignments === reviewer.total_assignments ? 'text-emerald-600' : 'text-amber-600'"
                  >
                    <CheckCircle2 v-if="reviewer.total_assignments > 0 && reviewer.completed_assignments === reviewer.total_assignments" class="w-3.5 h-3.5" />
                    <Clock v-else class="w-3.5 h-3.5" />
                    {{ reviewer.total_assignments > 0 && reviewer.completed_assignments === reviewer.total_assignments ? 'เสร็จสิ้นแล้ว' : 'กำลังดำเนินการ' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
  </div>
</template>
