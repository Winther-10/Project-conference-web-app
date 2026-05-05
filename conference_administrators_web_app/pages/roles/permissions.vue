<script setup>
definePageMeta({ middleware: 'auth', layout: 'admin' });
import { computed, ref, onMounted } from 'vue';
import {
  Download,
  Search,
  ShieldCheck,
  Users,
  X,
  ChevronDown,
  RefreshCw,
  AlertCircle
} from 'lucide-vue-next';

const supabase = useSupabase();
const loading = ref(true);
const saving = ref(false);
const errorMsg = ref('');

const roleOptions = [
  { key: 'author', label: 'Author', desc: 'เจ้าของบทความ (Author)' },
  { key: 'reviewer', label: 'Reviewer', desc: 'กรรมการประเมิน' },
  { key: 'admin', label: 'Admin', desc: 'ผู้ดูแลระบบ' }
];

const roleBadgeMeta = {
  author: 'bg-slate-50 text-slate-700 border-slate-200',
  reviewer: 'bg-purple-50 text-purple-800 border-purple-200',
  admin: 'bg-amber-50 text-amber-800 border-amber-200'
};

const users = ref([]);
const query = ref('');
const roleFilter = ref('all');

const loadUsers = async () => {
  loading.value = true;
  errorMsg.value = '';
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    users.value = data || [];
  } catch (err) {
    errorMsg.value = 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้: ' + err.message;
  } finally {
    loading.value = false;
  }
};

onMounted(loadUsers);

const filteredUsers = computed(() => {
  const q = query.value.trim().toLowerCase();
  return users.value.filter((u) => {
    const name = `${u.first_name_th || ''} ${u.last_name_th || ''} ${u.first_name_en || ''} ${u.last_name_en || ''}`.toLowerCase();
    const matchesQuery = !q || name.includes(q) || u.email?.toLowerCase().includes(q);
    const matchesRole = roleFilter.value === 'all' || u.role === roleFilter.value;
    return matchesQuery && matchesRole;
  });
});

const openMenuId = ref(null);
const toggleRowMenu = (id) => {
  openMenuId.value = openMenuId.value === id ? null : id;
};
const closeRowMenu = () => {
  openMenuId.value = null;
};

const editModalOpen = ref(false);
const editTarget = ref(null);
const selectedRole = ref('');

const openEdit = (user) => {
  editTarget.value = user;
  selectedRole.value = user.role || 'author';
  editModalOpen.value = true;
  closeRowMenu();
};

const closeEdit = () => {
  editModalOpen.value = false;
  editTarget.value = null;
};

const saveRole = async () => {
  if (!editTarget.value || saving.value) return;
  saving.value = true;
  try {
    const { error } = await supabase
      .from('users')
      .update({ role: selectedRole.value })
      .eq('user_id', editTarget.value.user_id);
    
    if (error) throw error;

    // If changing to reviewer, ensure reviewer_expertise exists
    if (selectedRole.value === 'reviewer') {
      const { data: updateData } = await supabase
        .from('reviewer_expertise')
        .update({ can_evaluate_phase_2: false })
        .eq('user_id', editTarget.value.user_id)
        .select();
      
      if (!updateData || updateData.length === 0) {
        await supabase.from('reviewer_expertise').insert({
          user_id: editTarget.value.user_id,
          can_evaluate_phase_2: false,
          tag_name: 'ทั่วไป'
        });
      }
    }

    // Update local state
    const idx = users.value.findIndex(u => u.user_id === editTarget.value.user_id);
    if (idx !== -1) {
      users.value[idx].role = selectedRole.value;
    }
    
    closeEdit();
  } catch (err) {
    alert('ไม่สามารถบันทึกสิทธิ์ได้: ' + err.message);
  } finally {
    saving.value = false;
  }
};

const exportCsv = () => {
  const rows = filteredUsers.value.map((u) => ({
    id: u.user_id,
    name: `${u.first_name_th || ''} ${u.last_name_th || ''}`,
    email: u.email,
    role: u.role
  }));

  const header = ['id', 'name', 'email', 'role'];
  const csv = [header.join(','), ...rows.map((r) => header.map((k) => JSON.stringify(String(r[k] ?? ''))).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `users-roles_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
</script>

<template>
  <div class="p-8 pb-32 font-['Sarabun','Lato'] animate-fade-in" @click="closeRowMenu">
    <div class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-black text-slate-800 mb-1">🛡️ จัดการสิทธิ์การใช้งาน (Roles & Permissions)</h2>
        <p class="text-sm text-slate-500">กำหนดบทบาทของผู้ใช้ในระบบ (Reviewer, Admin, Author)</p>
      </div>
      
      <div class="flex flex-wrap items-center gap-3">
        <button @click="loadUsers" class="h-10 px-4 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
          <RefreshCw class="w-4 h-4" :class="loading ? 'animate-spin' : ''" />
          รีเฟรช
        </button>
        <button type="button" class="h-10 px-4 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 shadow-sm inline-flex items-center gap-2" @click="exportCsv">
          <Download class="w-4 h-4" />
          Export CSV
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div class="md:col-span-2 relative group">
        <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
        <input v-model="query" type="text" placeholder="ค้นหาชื่อ, อีเมล..." class="w-full h-12 pl-11 pr-4 bg-white border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all shadow-sm" />
      </div>
      <select v-model="roleFilter" class="h-12 px-4 rounded-2xl bg-white border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm">
        <option value="all">กรองบทบาท: ทั้งหมด</option>
        <option v-for="r in roleOptions" :key="r.key" :value="r.key">{{ r.label }}</option>
      </select>
    </div>

    <!-- Error State -->
    <div v-if="errorMsg" class="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-700 font-bold text-sm">
      <AlertCircle class="w-5 h-5" />
      {{ errorMsg }}
    </div>

    <!-- Table -->
    <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div v-if="loading" class="flex flex-col items-center justify-center py-24 gap-4">
        <div class="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
        <p class="text-sm font-bold text-slate-400">กำลังโหลดข้อมูลผู้ใช้...</p>
      </div>
      
      <div v-else-if="filteredUsers.length === 0" class="flex flex-col items-center justify-center py-24 text-slate-400 gap-4">
        <Users class="w-16 h-16 opacity-20" />
        <p class="font-bold">ไม่พบข้อมูลผู้ใช้</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr class="text-[11px] font-black text-slate-500 uppercase tracking-wider">
              <th class="px-6 py-4 text-left">ผู้ใช้งาน</th>
              <th class="px-6 py-4 text-left">บทบาทปัจจุบัน</th>
              <th class="px-6 py-4 text-right">การดำเนินการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="u in filteredUsers" :key="u.user_id" class="bg-white hover:bg-slate-50/50 transition-colors">
              <td class="px-6 py-4">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-black text-sm uppercase shadow-sm">
                    {{ (u.first_name_th || u.email || '?').charAt(0) }}
                  </div>
                  <div>
                    <div class="text-sm font-black text-slate-800">{{ u.first_name_th }} {{ u.last_name_th }}</div>
                    <div class="text-[11px] font-bold text-slate-400">{{ u.email }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span
                  class="inline-flex items-center justify-center px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-tight"
                  :class="roleBadgeMeta[u.role] || roleBadgeMeta.author"
                >
                  {{ roleOptions.find((x) => x.key === u.role)?.label || u.role || 'Author' }}
                </span>
              </td>
              <td class="px-6 py-4 text-right relative" @click.stop>
                <button type="button" class="h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-2 text-xs font-black text-slate-700 transition-all active:scale-95" @click="toggleRowMenu(u.user_id)">
                  แก้ไขสิทธิ์
                  <ChevronDown class="w-4 h-4 text-slate-400" />
                </button>

                <div v-if="openMenuId === u.user_id" class="absolute right-6 top-14 w-52 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden z-30 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div class="px-4 py-3 text-[10px] font-black text-slate-400 bg-slate-50 uppercase tracking-widest">คำสั่งจัดการ</div>
                  <button type="button" class="w-full px-4 py-3 text-left text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 transition-colors" @click="openEdit(u)">
                    <ShieldCheck class="w-4 h-4" />
                    เปลี่ยนบทบาท (Role)
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="editModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="closeEdit"></div>
      <div class="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" @click.stop>
        <div class="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div class="text-lg font-black text-slate-800">เปลี่ยนบทบาทผู้ใช้</div>
            <div class="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{{ editTarget?.email }}</div>
          </div>
          <button type="button" class="h-10 w-10 rounded-full hover:bg-slate-200 flex items-center justify-center transition-colors" @click="closeEdit">
            <X class="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div class="p-8">
          <div class="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 px-1">เลือกบทบาทใหม่</div>
          <div class="space-y-3">
            <button
              v-for="r in roleOptions"
              :key="r.key"
              type="button"
              class="w-full p-4 rounded-2xl border transition-all flex items-start gap-4 text-left group"
              :class="selectedRole === r.key ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'"
              @click="selectedRole = r.key"
            >
              <div class="mt-1">
                <div class="h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors" :class="selectedRole === r.key ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover:border-slate-400'">
                  <div v-if="selectedRole === r.key" class="w-2 h-2 rounded-full bg-white"></div>
                </div>
              </div>
              <div>
                <div class="text-sm font-black text-slate-800 group-hover:text-indigo-700 transition-colors">{{ r.label }}</div>
                <div class="text-[11px] font-bold text-slate-400 mt-0.5">{{ r.desc }}</div>
              </div>
            </button>
          </div>
        </div>

        <div class="px-8 py-6 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
          <button type="button" class="h-11 px-6 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors" @click="closeEdit">ยกเลิก</button>
          <button 
            type="button" 
            class="h-11 px-8 rounded-2xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 shadow-lg shadow-indigo-900/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none" 
            :disabled="saving"
            @click="saveRole"
          >
            <RefreshCw v-if="saving" class="w-4 h-4 animate-spin" />
            <span v-else>บันทึกการเปลี่ยนแปลง</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
