<script setup>
definePageMeta({ middleware: 'auth', layout: 'admin' });
import { computed, ref, onMounted } from 'vue';
import {
  BarChart3,
  Calendar,
  CalendarDays,
  ChevronDown,
  CreditCard,
  Download,
  Eye,
  FileText,
  Filter,
  LayoutDashboard,
  LogOut,
  MoreVertical,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
  X,
  Zap,
  Plus,
  Edit,
  Trash2,
  Image as ImageIcon,
  Link,
  Bold,
  Italic,
  Underline,
  List,
  Link2,
  FileText as FileTextIcon
} from 'lucide-vue-next';


const supabase = useSupabase();
const posts = ref([]);

const fetchPosts = async () => {
  const { data, error } = await supabase.from('news').select('*').order('created_at', { ascending: false });
  if (data) {
    posts.value = data;
  }
};

onMounted(fetchPosts);

const query = ref('');
const statusFilter = ref('all');

const filteredPosts = computed(() => {
  const q = query.value.trim().toLowerCase();
  return posts.value.filter((p) => {
    const matchesQuery = !q || p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
    const matchesStatus = statusFilter.value === 'all' || p.status === statusFilter.value;
    return matchesQuery && matchesStatus;
  });
});

const statusMeta = {
  published: { label: 'เผยแพร่', class: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  draft: { label: 'ฉบับร่าง', class: 'bg-amber-50 text-amber-800 border-amber-200' }
};

const formatDate = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(d);
};

const openMenuId = ref(null);
const toggleRowMenu = (id) => {
  openMenuId.value = openMenuId.value === id ? null : id;
};
const closeRowMenu = () => {
  openMenuId.value = null;
};

const detailModalOpen = ref(false);
const detailTargetId = ref(null);
const detailTarget = computed(() => posts.value.find((p) => p.id === detailTargetId.value) || null);

const openDetailModal = (id) => {
  detailTargetId.value = id;
  detailModalOpen.value = true;
  closeRowMenu();
};

const closeDetailModal = () => {
  detailModalOpen.value = false;
  detailTargetId.value = null;
};

const deletePost = async (id) => {
  const ok = window.confirm('ลบข่าวนี้?');
  if (!ok) return;
  const { error } = await supabase.from('news').delete().eq('id', id);
  if (!error) {
    posts.value = posts.value.filter((p) => p.id !== id);
  } else {
    alert('เกิดข้อผิดพลาดในการลบ: ' + error.message);
  }
  closeRowMenu();
};
</script>

<template>
  <div class="p-8 pb-20 font-['Sarabun','Lato'] animate-fade-in" @click="closeRowMenu">
    <div>
      <div>
        <div class="mb-8 flex justify-between items-end">
          <div>
            <h2 class="text-2xl font-bold text-slate-800 mb-1">จัดการโพสต์/ข่าวสาร (News Management)</h2>
            <p class="text-sm text-slate-500">The Communication Hub</p>
          </div>
          <NuxtLink to="/news/create" class="h-10 px-4 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 inline-flex items-center gap-2">
            <Plus class="w-4 h-4" />
            สร้างข่าวใหม่
          </NuxtLink>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div class="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <div class="flex flex-col lg:flex-row gap-2 lg:items-center">
              <div class="relative flex-1">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  v-model="query"
                  type="text"
                  placeholder="ค้นหาหัวข้อข่าว..."
                  class="w-full h-10 pl-9 pr-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none"
                />
              </div>

              <div class="grid grid-cols-1 lg:grid-cols-1 gap-2 w-full lg:w-auto">
                <select v-model="statusFilter" class="w-full lg:w-48 h-10 px-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none">
                  <option value="all">สถานะ: ทั้งหมด</option>
                  <option value="published">เผยแพร่</option>
                  <option value="draft">ฉบับร่าง</option>
                </select>
              </div>
            </div>
          </div>

          <div class="mt-4 bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div class="overflow-x-auto">
              <table class="min-w-full">
                <thead class="bg-slate-50">
                  <tr class="text-[11px] font-black text-slate-700">
                    <th class="px-4 py-3 text-left">รูปภาพ</th>
                    <th class="px-4 py-3 text-left">หัวข้อข่าว (Title)</th>
                    <th class="px-4 py-3 text-left">สถานะ</th>
                    <th class="px-4 py-3 text-left">วันที่เผยแพร่</th>
                    <th class="px-4 py-3 text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="post in filteredPosts" :key="post.id" class="bg-white">
                    <td class="px-4 py-3">
                      <div class="w-20 h-12 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                        <img v-if="post.cover_image_url" :src="post.cover_image_url" :alt="post.title" class="w-full h-full object-cover" />
                        <ImageIcon v-else class="w-4 h-4 text-slate-400" />
                      </div>
                    </td>
                    <td class="px-4 py-3">
                      <div class="text-xs font-bold text-slate-800">{{ post.title }}</div>
                    </td>
                    <td class="px-4 py-3">
                      <span class="inline-flex items-center justify-center px-3 py-1 rounded-full border text-[10px] font-black" :class="statusMeta[post.status].class">
                        {{ statusMeta[post.status].label }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-xs font-semibold text-slate-700">{{ formatDate(post.published_at) }}</td>
                    <td class="px-4 py-3 text-right relative" @click.stop>
                      <button type="button" class="h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center justify-center" @click="toggleRowMenu(post.id)">
                        <MoreVertical class="w-4 h-4 text-slate-600" />
                      </button>

                      <div v-if="openMenuId === post.id" class="absolute right-4 top-12 w-48 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden z-30">
                        <div class="px-4 py-2 text-[10px] font-black text-slate-500 bg-slate-50">คำสั่งจัดการ</div>
                        <button type="button" class="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2" @click="openDetailModal(post.id)">
                          <Eye class="w-4 h-4 text-slate-500" />
                          ดูรายละเอียด
                        </button>
                        <NuxtLink :to="`/news/edit/${post.id}`" class="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                          <Edit class="w-4 h-4 text-slate-500" />
                          แก้ไข
                        </NuxtLink>
                        <button type="button" class="w-full px-4 py-2 text-left text-xs font-bold text-rose-700 hover:bg-rose-50 flex items-center gap-2" @click="deletePost(post.id)">
                          <Trash2 class="w-4 h-4 text-rose-600" />
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="filteredPosts.length === 0" class="bg-white">
                    <td colspan="5" class="px-6 py-10 text-center text-sm font-bold text-slate-500">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
          </div>
        </div>

    <div v-if="detailModalOpen" class="fixed inset-0 z-50">
      <div class="absolute inset-0 bg-black/40" @click="closeDetailModal"></div>
      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="w-full max-w-3xl max-h-[calc(100vh-2rem)] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col" @click.stop>
          <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div>
              <div class="text-lg font-black text-slate-800">ดูรายละเอียดข่าวสาร</div>
              <div class="text-[11px] font-semibold text-slate-500 mt-0.5">{{ detailTarget?.id }}</div>
            </div>
            <button type="button" class="h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 inline-flex items-center justify-center" @click="closeDetailModal">
              <X class="w-4 h-4 text-slate-700" />
            </button>
          </div>

          <div class="p-6 overflow-y-auto">
            <div class="text-xl font-black text-slate-900">{{ detailTarget?.title }}</div>
            <div class="mt-2 flex items-center gap-2">
              <span class="inline-flex items-center justify-center px-3 py-1 rounded-full border text-[10px] font-black" :class="detailTarget ? statusMeta[detailTarget.status].class : ''">
                {{ detailTarget ? statusMeta[detailTarget.status].label : '' }}
              </span>
              <div class="text-xs font-semibold text-slate-600">วันที่เผยแพร่: {{ formatDate(detailTarget?.published_at) }}</div>
            </div>

            <div class="mt-4 p-4 rounded-2xl border border-slate-200 bg-slate-50">
              <div class="text-xs font-black text-slate-700 mb-2">เนื้อหา</div>
              <div class="prose prose-slate max-w-none" v-html="detailTarget?.content"></div>
            </div>

            <div class="mt-4">
              <div class="text-xs font-black text-slate-700 mb-2">ไฟล์แนบ / ลิงก์</div>
              <div v-if="(detailTarget?.attachments || []).length === 0" class="text-xs font-semibold text-slate-500">-</div>
              <div v-else class="space-y-2">
                <a
                  v-for="(att, idx) in detailTarget.attachments"
                  :key="idx"
                  :href="att.url"
                  target="_blank"
                  class="block px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-indigo-700 hover:bg-indigo-50"
                >
                  {{ att.label }}
                </a>
              </div>
            </div>
          </div>

          <div class="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
            <NuxtLink
              v-if="detailTarget"
              :to="`/news/edit/${detailTarget.id}`"
              class="h-10 px-4 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 inline-flex items-center gap-2"
              @click="closeDetailModal"
            >
              <Edit class="w-4 h-4" />
              แก้ไข
            </NuxtLink>
            <button type="button" class="h-10 px-4 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50" @click="closeDetailModal">ปิด</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
