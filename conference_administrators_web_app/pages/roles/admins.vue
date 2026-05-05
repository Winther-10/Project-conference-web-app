<script setup>
definePageMeta({ middleware: 'auth', layout: 'admin' });
import { computed, ref, onMounted } from 'vue';
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Users,
  Zap
} from 'lucide-vue-next';



const supabase = useSupabase();
const adminsList = ref([]);
const loading = ref(true);
const query = ref('');

const loadAdmins = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'admin');
    
    if (error) throw error;
    adminsList.value = data || [];
  } catch (err) {
    console.error('Error loading admins:', err);
  } finally {
    loading.value = false;
  }
};

const filteredAdmins = computed(() => {
  const q = query.value.trim().toLowerCase();
  return adminsList.value.filter((u) => {
    const name = `${u.first_name_th || ''} ${u.last_name_th || ''}`.toLowerCase();
    const email = (u.email || '').toLowerCase();
    return !q || name.includes(q) || email.includes(q);
  });
});

onMounted(loadAdmins);
</script>

<template>
  <div class="p-8 pb-32 font-['Sarabun'] animate-fade-in">
    <div class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h2 class="text-2xl font-black text-slate-800 mb-1">👥 จัดการผู้ดูแลระบบ (Admin Users)</h2>
        <p class="text-sm text-slate-500">รายการบัญชีที่มีบทบาท Admin ในระบบ</p>
      </div>

      <div class="flex items-center gap-4 flex-1 max-w-2xl">
        <div class="relative flex-1 group">
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            v-model="query"
            type="text"
            placeholder="ค้นหาชื่อ, อีเมล..."
            class="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-sm"
          />
        </div>
        <button @click="loadAdmins" class="h-12 px-6 rounded-2xl bg-white border border-slate-200 text-sm font-black text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-all shadow-sm">
          <RefreshCw class="w-4 h-4" :class="loading ? 'animate-spin' : ''" />
          <span class="hidden sm:inline">รีเฟรช</span>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-40 flex flex-col items-center justify-center gap-4 text-slate-400">
      <RefreshCw class="w-10 h-10 animate-spin text-indigo-500" />
      <div class="text-sm font-bold">กำลังโหลดข้อมูลผู้ดูแลระบบ...</div>
    </div>

    <div v-else class="bg-white rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full">
              <thead class="bg-slate-50">
                <tr class="text-[11px] font-black text-slate-700">
                  <th class="px-4 py-3 text-left">ชื่อ - นามสกุล / อีเมล</th>
                  <th class="px-4 py-3 text-right">สถานะ</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="u in filteredAdmins" :key="u.user_id" class="group hover:bg-slate-50/50 transition-colors">
                  <td class="px-8 py-5">
                    <div class="flex items-center gap-4">
                      <div class="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black shadow-sm group-hover:scale-110 transition-transform">
                        <Users class="w-5 h-5" />
                      </div>
                      <div>
                        <div class="text-sm font-black text-slate-800">
                          {{ u.prefix_th || '' }}{{ u.first_name_th }} {{ u.last_name_th }}
                        </div>
                        <div class="text-xs font-semibold text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <ShieldCheck class="w-3 h-3 text-emerald-500" />
                          {{ u.email }}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="px-8 py-5 text-right">
                    <span class="inline-flex items-center justify-center px-4 py-1.5 rounded-xl border text-[11px] font-black tracking-wide" :class="u.is_active !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'">
                      {{ u.is_active !== false ? '🟢 ACTIVE' : '🔴 SUSPENDED' }}
                    </span>
                  </td>
                </tr>
                <tr v-if="filteredAdmins.length === 0" class="bg-white">
                  <td colspan="2" class="px-6 py-24 text-center">
                    <div class="flex flex-col items-center gap-3 text-slate-300">
                      <Search class="w-12 h-12 opacity-20" />
                      <div class="text-sm font-bold">ไม่พบรายชื่อผู้ดูแลระบบที่คุณค้นหา</div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
  </div>
</template>
