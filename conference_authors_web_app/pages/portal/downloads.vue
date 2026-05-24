<script setup>
definePageMeta({ layout: 'portal' });
import { ref, computed, onMounted } from 'vue';
import {
  Search, Download, Lock, FileText, File as FileIcon, BookOpen, Bell, User, ChevronDown,
  FileSpreadsheet, Image as ImageIcon
} from 'lucide-vue-next';
import { useAuth } from '~/composables/useAuth';
import { useSupabase } from '~/composables/useSupabase';

const { userProfile } = useAuth();
const supabase = useSupabase();

const query = ref('');
const templates = ref([]);
const myDocs = ref([]);
const isLoading = ref(true);

const downloadBlob = (filename, mime, content) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const getExtensionFromUrl = (url, fallback = 'pdf') => {
  if (!url) return fallback;
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split('.');
    if (parts.length > 1) {
      const ext = parts.pop().toLowerCase();
      if (['pdf', 'docx', 'doc', 'zip', 'rar', '7z', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
        if (['doc', 'docx'].includes(ext)) return 'docx';
        if (['zip', 'rar', '7z'].includes(ext)) return 'latex';
        if (['xls', 'xlsx'].includes(ext)) return 'excel';
        if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return 'image';
        return ext;
      }
    }
  } catch (e) {
    const parts = url.split('?')[0].split('.');
    if (parts.length > 1) {
      const ext = parts.pop().toLowerCase();
      if (['pdf', 'docx', 'doc', 'zip', 'rar', '7z', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
        if (['doc', 'docx'].includes(ext)) return 'docx';
        if (['zip', 'rar', '7z'].includes(ext)) return 'latex';
        if (['xls', 'xlsx'].includes(ext)) return 'excel';
        if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return 'image';
        return ext;
      }
    }
  }
  return fallback;
};

const fileKindMeta = {
  docx: { label: 'DOCX', pill: 'bg-blue-50 border-blue-200 text-blue-700', icon: FileText },
  latex: { label: 'ZIP', pill: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: FileIcon },
  pdf: { label: 'PDF', pill: 'bg-rose-50 border-rose-200 text-rose-700', icon: FileText },
  manual: { label: 'PDF', pill: 'bg-slate-50 border-slate-200 text-slate-700', icon: BookOpen },
  excel: { label: 'EXCEL', pill: 'bg-teal-50 border-teal-200 text-teal-700', icon: FileSpreadsheet },
  image: { label: 'IMAGE', pill: 'bg-violet-50 border-violet-200 text-violet-700', icon: ImageIcon }
};

const statusMeta = {
  available: { labelTh: 'พร้อมดาวน์โหลด', labelEn: 'Available', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending: { labelTh: 'รอพิจารณา', labelEn: 'Pending', pill: 'bg-amber-50 text-amber-700 border-amber-200' },
  locked: { labelTh: 'จบงานก่อน', labelEn: 'Locked', pill: 'bg-slate-100 text-slate-600 border-slate-200' }
};

onMounted(async () => {
  await fetchData();
});

const fetchData = async () => {
  isLoading.value = true;
  try {
    // Fetch public templates/downloads
    const { data: publicDocs } = await supabase.from('downloads').select('*').order('created_at', { ascending: false });
    if (publicDocs) {
      templates.value = publicDocs.map(d => ({
        id: d.id,
        kind: d.file_type || 'pdf',
        title: d.title_en,
        subtitle: d.title_th,
        size: d.size || 'Unknown',
        filename: d.filename,
        url: d.file_url
      }));
    }

    // Fetch user-specific docs from the new table
    if (userProfile.value) {
      const { data: officialDocs, error: docError } = await supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', userProfile.value.user_id)
        .order('created_at', { ascending: false });

      if (!docError && officialDocs) {
        myDocs.value = officialDocs.map(d => {
          const ext = getExtensionFromUrl(d.file_url, 'pdf');
          let articleRef = '';
          const match = d.title_th.match(/^\[([^\]]+)\]/);
          if (match) {
            articleRef = match[1];
          }
          return {
            id: d.id,
            titleTh: d.title_th,
            titleEn: d.title_en,
            status: 'available',
            filename: d.title_th.endsWith('.' + ext) ? d.title_th : d.title_th + '.' + ext,
            url: d.file_url,
            type: d.document_type,
            kind: ext,
            articleRef: articleRef
          };
        });
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    isLoading.value = false;
  }
};

const filteredTemplates = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return templates.value;
  return templates.value.filter((t) => `${t.title} ${t.subtitle} ${t.filename}`.toLowerCase().includes(q));
});

const filteredMyDocs = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return myDocs.value;
  return myDocs.value.filter((d) => `${d.titleTh} ${d.titleEn} ${d.articleRef || ''}`.toLowerCase().includes(q));
});

const getFileKindMeta = (kind) => fileKindMeta[kind] || fileKindMeta.pdf;
const getStatusMeta = (status) => statusMeta[status] || statusMeta.locked;

</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 custom-scrollbar animate-in fade-in duration-500 bg-slate-50 font-sans">
    <div class="max-w-7xl mx-auto w-full">
      <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 border border-white/20">
            <Download class="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 class="text-2xl font-black text-slate-900 leading-tight tracking-tight">ศูนย์ดาวน์โหลดเอกสาร</h1>
            <p class="text-[14px] font-semibold text-slate-500 mt-0.5">ดาวน์โหลดแบบฟอร์มและเอกสารราชการที่เกี่ยวข้อง</p>
          </div>
        </div>

        <div class="flex items-center gap-3 w-full sm:w-auto">
          <div class="relative w-full sm:w-[360px] group">
            <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
            <input
              v-model="query"
              class="w-full h-12 pl-11 pr-4 rounded-[18px] bg-white border border-slate-200 text-[14px] font-semibold text-slate-800 placeholder:font-medium placeholder-slate-400 focus:outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100/50 transition-all shadow-sm"
              placeholder="ค้นหาเอกสาร..."
            />
          </div>
        </div>
      </header>

      <div class="space-y-8">
        <section class="space-y-5">
          <div class="flex items-end justify-between gap-4">
            <div>
              <div class="text-[17px] font-black text-slate-900 tracking-tight">แบบฟอร์มและคู่มือ (Templates & Manuals)</div>
              <div class="mt-1 text-[13px] font-bold text-slate-500">ไฟล์ที่ทุกคนต้องใช้ (Template บทความ, คู่มือ)</div>
            </div>
          </div>

          <div v-if="isLoading" class="p-16 flex justify-center">
            <div class="w-10 h-10 rounded-full border-4 border-slate-200 border-t-purple-600 animate-spin"></div>
          </div>
          <div v-else-if="filteredTemplates.length === 0" class="p-12 text-center text-slate-500 font-bold bg-white/80 backdrop-blur-xl rounded-[28px] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">ไม่พบเอกสารดาวน์โหลด</div>
          
          <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            <div v-for="t in filteredTemplates" :key="t.id" class="rounded-[28px] bg-white/90 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1 hover:border-purple-100 transition-all duration-300 group">
              <div class="flex items-start justify-between gap-4">
                <div class="flex items-start gap-4 min-w-0">
                  <div :class="['w-14 h-14 rounded-2xl border flex items-center justify-center flex-shrink-0 shadow-sm transition-colors duration-300', getFileKindMeta(t.kind).pill]">
                    <component :is="getFileKindMeta(t.kind).icon" class="w-6 h-6" />
                  </div>
                  <div class="min-w-0">
                    <div class="text-[15px] font-black text-slate-900 truncate group-hover:text-purple-700 transition-colors">{{ t.title }}</div>
                    <div class="mt-1 text-[12px] font-bold text-slate-500 line-clamp-2">{{ t.subtitle }}</div>
                    <div class="mt-4 inline-flex items-center gap-2">
                      <span :class="['px-3 py-1 rounded-full border text-[11px] font-black uppercase tracking-wider', getFileKindMeta(t.kind).pill]">{{ getFileKindMeta(t.kind).label }}</span>
                      <span class="text-[11px] font-black text-slate-400">{{ t.size }}</span>
                    </div>
                  </div>
                </div>

                <button
                  @click="() => {
                    if (t.url) {
                      window.open(t.url, '_blank');
                    } else {
                      const mime = t.kind === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : t.kind === 'latex' ? 'application/zip' : 'application/pdf';
                      const content = `IC-Sci 2025 Document Center\n\n${t.title}\n${t.subtitle}\n\nFilename: ${t.filename}\n`;
                      downloadBlob(t.filename, mime, content);
                    }
                  }"
                  class="w-12 h-12 rounded-2xl bg-slate-50 text-slate-600 hover:bg-purple-600 hover:text-white hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300 flex items-center justify-center flex-shrink-0"
                >
                  <Download class="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section class="space-y-5 pt-4">
          <div>
            <div class="text-[17px] font-black text-slate-900 tracking-tight">เอกสารสำคัญของฉัน (My Official Documents)</div>
            <div class="mt-1 text-[13px] font-bold text-slate-500">เอกสารจะดาวน์โหลดได้เมื่อผ่านขั้นตอนที่กำหนด</div>
          </div>

          <div class="rounded-[32px] bg-white/90 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div class="grid grid-cols-12 gap-4 px-8 py-5 bg-slate-50/50 border-b border-slate-100 text-[12px] font-black text-slate-500 uppercase tracking-widest">
              <div class="col-span-7">Document Name</div>
              <div class="col-span-3">Status</div>
              <div class="col-span-2 text-right">Action</div>
            </div>

            <div v-if="isLoading" class="p-16 flex justify-center">
              <div class="w-10 h-10 rounded-full border-4 border-slate-200 border-t-purple-600 animate-spin"></div>
            </div>
            <div v-else-if="filteredMyDocs.length === 0" class="p-12 text-center text-slate-500 font-bold">ไม่พบเอกสารสำคัญของคุณ</div>

            <div v-else class="divide-y divide-slate-100">
              <div v-for="d in filteredMyDocs" :key="d.id" class="grid grid-cols-12 gap-4 px-8 py-6 items-center hover:bg-slate-50/50 transition-colors">
                <div class="col-span-7 min-w-0">
                  <div class="flex items-start gap-4">
                    <div :class="['w-12 h-12 rounded-2xl border flex items-center justify-center flex-shrink-0 shadow-sm transition-colors duration-300', getFileKindMeta(d.kind).pill]">
                      <component :is="getFileKindMeta(d.kind).icon" class="w-5 h-5" />
                    </div>
                    <div class="min-w-0">
                      <div class="text-[15px] font-black text-slate-900 truncate">{{ d.titleTh }}</div>
                      <div class="text-[13px] font-bold text-slate-500 truncate">({{ d.titleEn }})</div>
                      <div v-if="d.articleRef" class="mt-2 inline-flex items-center px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-500 tracking-wider font-['Lato']">REF: {{ d.articleRef }}</div>
                    </div>
                  </div>
                </div>

                <div class="col-span-3">
                  <div :class="['inline-flex items-center rounded-[12px] px-3 py-1.5 text-[12px] font-black border', getStatusMeta(d.status).pill]">
                    {{ getStatusMeta(d.status).labelTh }}
                  </div>
                </div>

                <div class="col-span-2 flex justify-end">
                  <button
                    v-if="d.status === 'available'"
                    @click="() => {
                      if (d.url) {
                        window.open(d.url, '_blank');
                      } else {
                        const content = `IC-Sci 2025 - My Official Document\n\n${d.titleTh} (${d.titleEn})\n`;
                        downloadBlob(d.filename || `${d.id}.pdf`, 'application/pdf', content);
                      }
                    }"
                    class="h-11 px-5 rounded-[18px] bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[13px] font-black shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:-translate-y-0.5 transition-all duration-300 inline-flex items-center gap-2"
                  >
                    <Download class="w-4 h-4" />
                    โหลด
                  </button>
                  <button
                    v-else
                    disabled
                    class="h-11 px-5 rounded-[18px] bg-slate-50 border border-slate-200 text-slate-400 text-[13px] font-black inline-flex items-center gap-2 cursor-not-allowed"
                    :title="d.status === 'pending' ? 'รอพิจารณา' : 'ยังไม่พร้อมให้ดาวน์โหลด'"
                  >
                    <Lock class="w-4 h-4" />
                    ล็อค
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
