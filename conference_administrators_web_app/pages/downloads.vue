<script setup>
definePageMeta({ middleware: 'auth', layout: 'admin' });
import { ref, onMounted, computed } from 'vue';
import {
  Download, FileText, Plus, Search, Trash2, User, 
  ChevronRight, ArrowLeft, UploadCloud, X, CheckCircle2,
  FileIcon, BookOpen, AlertCircle
} from 'lucide-vue-next';
import { useSupabase } from '~/composables/useSupabase';

const supabase = useSupabase();
const activeTab = ref('public'); // 'public' or 'individual'

// Public Templates State
const publicDocs = ref([]);
const isFetchingPublic = ref(false);
const publicModalOpen = ref(false);
const publicDraft = ref({ title_th: '', title_en: '', file_type: 'pdf', file: null });
const isUploadingPublic = ref(false);

// Individual Docs State
const searchQuery = ref('');
const users = ref([]);
const selectedUser = ref(null);
const userDocs = ref([]);
const isFetchingDocs = ref(false);
const docDraft = ref({ title_th: '', title_en: '', type: 'receipt', file: null });
const isUploadingDoc = ref(false);

onMounted(async () => {
  await fetchPublicDocs();
});

const fetchPublicDocs = async () => {
  isFetchingPublic.value = true;
  const { data, error } = await supabase.from('downloads').select('*').order('created_at', { ascending: false });
  if (!error) publicDocs.value = data || [];
  isFetchingPublic.value = false;
};

const handlePublicFile = (e) => { publicDraft.value.file = e.target.files[0]; };
const handleIndividualFile = (e) => { docDraft.value.file = e.target.files[0]; };

const uploadPublic = async () => {
  if (!publicDraft.value.file || !publicDraft.value.title_th) return;
  isUploadingPublic.value = true;
  try {
    const file = publicDraft.value.file;
    const fileName = `templates/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from('certificates').upload(fileName, file);
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('certificates').getPublicUrl(fileName);

    const { error: dbError } = await supabase.from('downloads').insert({
      title_th: publicDraft.value.title_th,
      title_en: publicDraft.value.title_en,
      file_url: publicUrl,
      file_type: publicDraft.value.file_type,
      filename: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB'
    });

    if (dbError) throw dbError;
    alert('อัปโหลดแบบฟอร์มสาธารณะเรียบร้อยแล้ว');
    publicModalOpen.value = false;
    publicDraft.value = { title_th: '', title_en: '', file_type: 'pdf', file: null };
    await fetchPublicDocs();
  } catch (e) {
    alert(e.message);
  } finally {
    isUploadingPublic.value = false;
  }
};

const deletePublic = async (id) => {
  if (!confirm('ต้องการลบแบบฟอร์มนี้ใช่หรือไม่? ผู้แต่งจะไม่เห็นไฟล์นี้อีกต่อไป')) return;
  const { error } = await supabase.from('downloads').delete().eq('id', id);
  if (!error) await fetchPublicDocs();
};

const searchUsers = async () => {
  if (searchQuery.value.length < 2) return;
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, first_name_th, last_name_th, email')
    .or(`first_name_th.ilike.%${searchQuery.value}%,last_name_th.ilike.%${searchQuery.value}%,email.ilike.%${searchQuery.value}%`)
    .limit(5);
  if (!error) users.value = data || [];
};

const selectUser = async (u) => {
  selectedUser.value = u;
  users.value = [];
  searchQuery.value = `${u.first_name_th} ${u.last_name_th}`;
  await fetchUserDocs();
};

const fetchUserDocs = async () => {
  if (!selectedUser.value) return;
  isFetchingDocs.value = true;
  const { data, error } = await supabase
    .from('user_documents')
    .select('*')
    .eq('user_id', selectedUser.value.user_id)
    .order('created_at', { ascending: false });
  if (!error) userDocs.value = data || [];
  isFetchingDocs.value = false;
};

const uploadIndividual = async () => {
  if (!docDraft.value.file || !selectedUser.value) return;
  isUploadingDoc.value = true;
  try {
    const file = docDraft.value.file;
    const fileName = `official_docs/${selectedUser.value.user_id}/${Date.now()}_${file.name}`;
    await supabase.storage.from('certificates').upload(fileName, file);
    const { data: { publicUrl } } = supabase.storage.from('certificates').getPublicUrl(fileName);

    await supabase.from('user_documents').insert({
      user_id: selectedUser.value.user_id,
      title_th: docDraft.value.title_th || docDraft.value.type,
      title_en: docDraft.value.title_en || docDraft.value.type,
      file_url: publicUrl,
      document_type: docDraft.value.type
    });

    alert('ส่งเอกสารให้ผู้ใช้เรียบร้อยแล้ว');
    docDraft.value = { title_th: '', title_en: '', type: 'receipt', file: null };
    await fetchUserDocs();
  } catch (e) {
    alert(e.message);
  } finally {
    isUploadingDoc.value = false;
  }
};

const deleteUserDoc = async (id) => {
  if (!confirm('ต้องการลบเอกสารนี้ใช่หรือไม่?')) return;
  const { error } = await supabase.from('user_documents').delete().eq('id', id);
  if (!error) await fetchUserDocs();
};
</script>

<template>
  <div class="p-8 pb-20 font-['Sarabun','Lato'] animate-fade-in bg-slate-50 min-h-screen">
    <header class="mb-8 flex justify-between items-end">
      <div>
        <h2 class="text-2xl font-black text-slate-800 mb-1">ศูนย์จัดการเอกสาร</h2>
        <p class="text-sm font-semibold text-slate-500">จัดการแบบฟอร์มสาธารณะและส่งเอกสารสำคัญรายบุคคล</p>
      </div>
      <div class="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
        <button 
          @click="activeTab = 'public'"
          :class="['px-5 py-2.5 rounded-xl text-xs font-black transition-all', activeTab === 'public' ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-500 hover:bg-slate-50']"
        >
          แบบฟอร์มและคู่มือ
        </button>
        <button 
          @click="activeTab = 'individual'"
          :class="['px-5 py-2.5 rounded-xl text-xs font-black transition-all', activeTab === 'individual' ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-500 hover:bg-slate-50']"
        >
          เอกสารสำคัญของฉัน
        </button>
      </div>
    </header>

    <!-- Tab 1: Public Templates -->
    <div v-if="activeTab === 'public'" class="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
      <div class="flex justify-end">
        <button @click="publicModalOpen = true" class="h-11 px-6 rounded-2xl bg-indigo-600 text-white text-sm font-black hover:bg-indigo-700 shadow-lg shadow-indigo-100 flex items-center gap-2 transition-all">
          <Plus class="w-5 h-5" />
          อัปโหลดแบบฟอร์มใหม่
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div v-if="isFetchingPublic" class="col-span-full py-20 flex justify-center">
          <div class="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 animate-spin rounded-full"></div>
        </div>
        <div v-else-if="publicDocs.length === 0" class="col-span-full py-20 text-center text-slate-400 font-bold bg-white rounded-3xl border border-slate-200">
          ยังไม่มีแบบฟอร์มในระบบ
        </div>
        
        <div v-for="doc in publicDocs" :key="doc.id" class="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
          <div class="flex items-start justify-between gap-4">
            <div class="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-100">
              <component :is="doc.file_type === 'docx' ? FileText : doc.file_type === 'pdf' ? BookOpen : FileIcon" class="w-6 h-6" />
            </div>
            <button @click="deletePublic(doc.id)" class="text-slate-300 hover:text-rose-600 transition-colors">
              <Trash2 class="w-5 h-5" />
            </button>
          </div>
          <div class="mt-4 min-w-0">
            <div class="text-[15px] font-black text-slate-800 truncate">{{ doc.title_th }}</div>
            <div class="text-[12px] font-semibold text-slate-500 truncate">{{ doc.title_en }}</div>
            <div class="mt-4 flex items-center justify-between">
              <span class="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider border border-indigo-100">{{ doc.file_type }}</span>
              <span class="text-[11px] font-bold text-slate-400">{{ doc.size }}</span>
            </div>
          </div>
          <a :href="doc.file_url" target="_blank" class="mt-4 w-full h-10 rounded-xl bg-slate-50 text-slate-700 text-xs font-black hover:bg-slate-100 flex items-center justify-center gap-2 border border-slate-100">
            <Download class="w-4 h-4" />
            ตรวจสอบไฟล์
          </a>
        </div>
      </div>
    </div>

    <!-- Tab 2: Individual Docs -->
    <div v-else class="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
      <div class="max-w-3xl mx-auto space-y-6">
        <!-- Search User -->
        <div class="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm">
          <div class="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
            <User class="w-6 h-6 text-indigo-600" />
            1. เลือกผู้รับ (Search User)
          </div>
          <div class="relative group">
            <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input 
              v-model="searchQuery"
              @input="searchUsers"
              placeholder="ค้นหาด้วยชื่อ-นามสกุล หรือ อีเมล..." 
              class="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-100/50 focus:border-indigo-300 transition-all shadow-inner"
            />
            
            <div v-if="users.length > 0" class="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl z-20 overflow-hidden">
              <button 
                v-for="u in users" :key="u.user_id"
                @click="selectUser(u)"
                class="w-full px-5 py-4 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0 flex items-center justify-between group"
              >
                <div>
                  <div class="text-xs font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{{ u.first_name_th }} {{ u.last_name_th }}</div>
                  <div class="text-[11px] font-semibold text-slate-500">{{ u.email }}</div>
                </div>
                <ChevronRight class="w-4 h-4 text-slate-300" />
              </button>
            </div>
          </div>
        </div>

        <!-- Selected User & Upload -->
        <div v-if="selectedUser" class="space-y-6">
          <div class="bg-indigo-600 rounded-[32px] p-6 text-white shadow-xl shadow-indigo-100">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                  <User class="w-7 h-7" />
                </div>
                <div>
                  <div class="text-lg font-black">{{ selectedUser.first_name_th }} {{ selectedUser.last_name_th }}</div>
                  <div class="text-xs font-semibold text-indigo-100">{{ selectedUser.email }}</div>
                </div>
              </div>
              <button @click="selectedUser = null; searchQuery = '';" class="text-indigo-200 hover:text-white transition-colors">
                <X class="w-6 h-6" />
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm flex flex-col">
              <div class="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                <UploadCloud class="w-6 h-6 text-emerald-600" />
                2. ส่งเอกสารใหม่
              </div>
              <div class="space-y-4 flex-1">
                <div>
                  <div class="text-[11px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">ประเภทเอกสาร</div>
                  <select v-model="docDraft.type" class="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold focus:outline-none focus:border-indigo-300">
                    <option value="receipt">ใบเสร็จรับเงิน (Official Receipt)</option>
                    <option value="invitation">หนังสือเชิญ (Invitation Letter)</option>
                    <option value="acceptance">หนังสือตอบรับ (Acceptance Letter)</option>
                    <option value="other">เอกสารอื่นๆ (Other Documents)</option>
                  </select>
                </div>
                <div>
                  <div class="text-[11px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">ชื่อไฟล์ (ภาษาไทย)</div>
                  <input v-model="docDraft.title_th" placeholder="เช่น ใบเสร็จรับเงินรอบเช้า" class="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold focus:outline-none" />
                </div>
                <div>
                  <div class="text-[11px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">ชื่อไฟล์ (English)</div>
                  <input v-model="docDraft.title_en" placeholder="e.g. Morning Receipt" class="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold focus:outline-none" />
                </div>
                <div>
                  <div class="text-[11px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">เลือกไฟล์ (PDF)</div>
                  <input type="file" accept=".pdf" @change="handleIndividualFile" class="w-full text-xs font-bold" />
                </div>
              </div>
              <button 
                @click="uploadIndividual"
                :disabled="isUploadingDoc || !docDraft.file"
                class="mt-8 h-12 w-full rounded-2xl bg-indigo-600 text-white text-sm font-black hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
              >
                <UploadCloud v-if="!isUploadingDoc" class="w-5 h-5" />
                <div v-else class="w-5 h-5 border-2 border-white/30 border-t-white animate-spin rounded-full"></div>
                {{ isUploadingDoc ? 'กำลังส่งเอกสาร...' : 'ส่งเอกสารทันที' }}
              </button>
            </div>

            <div class="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm flex flex-col">
              <div class="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                <FileText class="w-6 h-6 text-amber-600" />
                เอกสารที่ส่งแล้ว ({{ userDocs.length }})
              </div>
              <div class="space-y-3 flex-1 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                <div v-if="isFetchingDocs" class="py-20 flex justify-center">
                  <div class="w-8 h-8 border-4 border-slate-100 border-t-amber-500 animate-spin rounded-full"></div>
                </div>
                <div v-else-if="userDocs.length === 0" class="py-12 text-center text-xs font-bold text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  ยังไม่มีประวัติการส่งเอกสาร
                </div>
                <div v-for="doc in userDocs" :key="doc.id" class="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3 group">
                  <div class="min-w-0">
                    <div class="text-xs font-black text-slate-800 truncate">{{ doc.title_th }}</div>
                    <div class="text-[10px] font-semibold text-slate-500">{{ new Date(doc.created_at).toLocaleDateString('th-TH') }}</div>
                  </div>
                  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a :href="doc.file_url" target="_blank" class="p-2 rounded-lg hover:bg-white text-slate-400 hover:text-indigo-600 transition-colors">
                      <Download class="w-4 h-4" />
                    </a>
                    <button @click="deleteUserDoc(doc.id)" class="p-2 rounded-lg hover:bg-white text-slate-400 hover:text-rose-600 transition-colors">
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="py-32 text-center space-y-4 animate-pulse">
          <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
            <User class="w-10 h-10" />
          </div>
          <div class="text-slate-400 font-bold">กรุณาเลือกผู้รับด้านบนเพื่อเริ่มจัดการเอกสาร</div>
        </div>
      </div>
    </div>

    <!-- Modal for Public Upload -->
    <div v-if="publicModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="publicModalOpen = false"></div>
      <div class="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        <div class="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <div class="text-xl font-black text-slate-800">อัปโหลดแบบฟอร์มสาธารณะ</div>
          <button @click="publicModalOpen = false" class="p-2 rounded-xl hover:bg-slate-50 text-slate-400 transition-colors">
            <X class="w-6 h-6" />
          </button>
        </div>
        <div class="p-8 space-y-5">
          <div>
            <div class="text-[11px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">ชื่อเอกสาร (ภาษาไทย)</div>
            <input v-model="publicDraft.title_th" placeholder="เช่น คู่มือการส่งบทความ" class="w-full h-12 px-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold focus:outline-none focus:border-indigo-300" />
          </div>
          <div>
            <div class="text-[11px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">ชื่อเอกสาร (English)</div>
            <input v-model="publicDraft.title_en" placeholder="e.g. Submission Manual" class="w-full h-12 px-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold focus:outline-none focus:border-indigo-300" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="text-[11px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">ประเภทไฟล์</div>
              <select v-model="publicDraft.file_type" class="w-full h-12 px-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold focus:outline-none">
                <option value="pdf">PDF Document</option>
                <option value="docx">Word (DOCX)</option>
                <option value="latex">ZIP / LaTeX</option>
              </select>
            </div>
            <div>
              <div class="text-[11px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">เลือกไฟล์</div>
              <input type="file" @change="handlePublicFile" class="w-full h-12 flex items-center text-xs font-bold" />
            </div>
          </div>
          <button 
            @click="uploadPublic"
            :disabled="isUploadingPublic || !publicDraft.file"
            class="mt-4 h-14 w-full rounded-2xl bg-slate-900 text-white text-sm font-black hover:bg-slate-800 disabled:opacity-50 shadow-xl transition-all flex items-center justify-center gap-3"
          >
            <CheckCircle2 v-if="!isUploadingPublic" class="w-5 h-5 text-emerald-400" />
            <div v-else class="w-5 h-5 border-2 border-white/30 border-t-white animate-spin rounded-full"></div>
            {{ isUploadingPublic ? 'กำลังบันทึกข้อมูล...' : 'ยืนยันการเพิ่มไฟล์' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 5px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
</style>
