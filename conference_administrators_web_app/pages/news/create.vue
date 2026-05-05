<script setup>
definePageMeta({ middleware: 'auth', layout: 'admin' });
import { ref } from 'vue';
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
  FileText as FileTextIcon,
  Upload,
  Save,
  Rocket,
} from 'lucide-vue-next';
import { useRouter } from 'vue-router';
const supabase = useSupabase();
const router = useRouter();
const form = ref({
  title: '',
  content: '',
  cover: null,
  attachments: []
});

const isDragging = ref(false);
const fileInputRef = ref(null);

const handleDragOver = (e) => {
  e.preventDefault();
  isDragging.value = true;
};

const handleDragLeave = (e) => {
  e.preventDefault();
  isDragging.value = false;
};

const handleDrop = (e) => {
  e.preventDefault();
  isDragging.value = false;
  const files = Array.from(e.dataTransfer.files);
  if (files.length > 0) {
    const file = files[0];
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        form.value.cover = {
          name: file.name,
          url: event.target.result,
          file
        };
      };
      reader.readAsDataURL(file);
    }
  }
};

const selectFile = () => {
  fileInputRef.value?.click();
};

const onFileChange = (e) => {
  const file = e.target.files[0];
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (event) => {
      form.value.cover = {
        name: file.name,
        url: event.target.result,
        file
      };
    };
    reader.readAsDataURL(file);
  }
};

const removeCover = () => {
  form.value.cover = null;
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
};

const addAttachment = () => {
  const url = prompt('ใส่ URL หรืออัปโหลดไฟล์ (PDF, DOC, etc.):');
  if (url) {
    form.value.attachments.push({
      type: url.startsWith('http') ? 'link' : 'file',
      label: url.split('/').pop(),
      url
    });
  }
};

const removeAttachment = (index) => {
  form.value.attachments.splice(index, 1);
};

const compressCoverImage = (dataUrl, maxWidth = 800, quality = 0.8) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width;
      let h = img.height;
      if (w > maxWidth) {
        h = (maxWidth / w) * h;
        w = maxWidth;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
};

const isSaving = ref(false);

const savePostToDb = async (status) => {
  if (!form.value.title) {
    alert('กรุณาระบุหัวข้อข่าว');
    return;
  }
  
  isSaving.value = true;
  try {
    const slug = form.value.title.toLowerCase().replace(/[^a-z0-9ก-๙]+/g, '-') + '-' + Date.now();
    
    // Compress cover image if it's a data URL
    let coverUrl = null;
    if (form.value.cover?.url) {
      if (form.value.cover.url.startsWith('data:')) {
        coverUrl = await compressCoverImage(form.value.cover.url);
      } else {
        coverUrl = form.value.cover.url;
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('ไม่พบข้อมูลผู้ใช้งาน กรุณาล็อกอินใหม่');

    const { error } = await supabase.from('news').insert({
      id: crypto.randomUUID(),
      title: form.value.title,
      slug: slug,
      content: form.value.content,
      cover_image_url: coverUrl,
      status: status,
      author_id: user.id,
      published_at: status === 'published' ? new Date().toISOString() : null
    });

    if (error) throw error;
    
    alert(status === 'published' ? '✅ เผยแพร่ข่าวสารสำเร็จ!' : '✅ บันทึกฉบับร่างสำเร็จ!');
    router.push('/news');
  } catch (error) {
    console.error('Error saving post:', error);
    alert('เกิดข้อผิดพลาดในการบันทึก: ' + error.message);
  } finally {
    isSaving.value = false;
  }
};

const saveDraft = () => {
  savePostToDb('draft');
};

const publishPost = () => {
  savePostToDb('published');
};

const execCommand = (cmd, value = null) => {
  document.execCommand(cmd, false, value);
};

const insertLink = () => {
  const url = prompt('ใส่ URL:');
  if (url) {
    execCommand('createLink', url);
  }
};

const insertImage = () => {
  const url = prompt('ใส่ URL รูปภาพ:');
  if (url) {
    execCommand('insertImage', url);
  }
};
</script>

<template>
  <div class="p-8 pb-32 font-['Sarabun','Lato'] animate-fade-in">
    <div class="max-w-4xl mx-auto mb-8 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <NuxtLink
          to="/news"
          class="h-10 px-4 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
        >
          <ArrowLeft class="w-4 h-4" />
          กลับไปหน้ารายการ
        </NuxtLink>
        <div>
          <h2 class="text-2xl font-bold text-slate-800 mb-1">สร้างโพสต์รายการข่าวสาร (Create News Post)</h2>
          <p class="text-sm text-slate-500 font-en">The Communication Hub</p>
        </div>
      </div>
    </div>



        <div class="max-w-4xl mx-auto space-y-6">
          <div class="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div class="mb-4">
              <label class="block text-xs font-bold text-slate-700 mb-2">🖼️ รูปภาพหน้าปก (Cover Image)</label>
              <div
                class="relative border-2 border-dashed border-slate-300 rounded-xl p-8 text-center transition-colors"
                :class="isDragging ? 'border-indigo-500 bg-indigo-50' : 'hover:border-slate-400'"
                @dragover="handleDragOver"
                @dragleave="handleDragLeave"
                @drop="handleDrop"
                @click="selectFile"
              >
                <input
                  ref="fileInputRef"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="onFileChange"
                />
                <div v-if="!form.cover">
                  <Upload class="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p class="text-sm font-bold text-slate-700">☁️ อัปโหลดไฟล์ หรือลากมาวาง</p>
                  <p class="text-xs text-slate-500 mt-1">รองรับ PNG, JPG ขนาดไม่เกิน 10 MB (สัดส่วน 16:9)</p>
                </div>
                <div v-else class="space-y-3">
                  <img :src="form.cover.url" :alt="form.cover.name" class="max-h-64 mx-auto rounded-lg" />
                  <button
                    type="button"
                    class="text-xs font-black text-rose-600 hover:text-rose-700"
                    @click.stop="removeCover"
                  >
                    ลบรูปภาพ
                  </button>
                </div>
              </div>
            </div>

            <div class="mb-4">
              <label class="block text-xs font-bold text-slate-700 mb-2">📌 หัวข้อข่าว (Title)</label>
              <input
                v-model="form.title"
                type="text"
                placeholder="กรอกหัวข้อข่าวสารที่ต้องการประกาศ..."
                class="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div class="mb-4">
              <label class="block text-xs font-bold text-slate-700 mb-2">📄 เนื้อหาข่าว (Content)</label>
              <div class="border border-slate-200 rounded-xl overflow-hidden">
                <div class="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center gap-2">
                  <button
                    type="button"
                    class="p-1.5 rounded hover:bg-slate-200 transition-colors"
                    title="ตัวหนา"
                    @click="execCommand('bold')"
                  >
                    <Bold class="w-4 h-4 text-slate-600" />
                  </button>
                  <button
                    type="button"
                    class="p-1.5 rounded hover:bg-slate-200 transition-colors"
                    title="ตัวเอียง"
                    @click="execCommand('italic')"
                  >
                    <Italic class="w-4 h-4 text-slate-600" />
                  </button>
                  <button
                    type="button"
                    class="p-1.5 rounded hover:bg-slate-200 transition-colors"
                    title="ขีดเส้นใต้"
                    @click="execCommand('underline')"
                  >
                    <Underline class="w-4 h-4 text-slate-600" />
                  </button>
                  <div class="w-px h-5 bg-slate-300 mx-1"></div>
                  <button
                    type="button"
                    class="p-1.5 rounded hover:bg-slate-200 transition-colors"
                    title="แทรกลิงก์"
                    @click="insertLink"
                  >
                    <Link2 class="w-4 h-4 text-slate-600" />
                  </button>
                  <button
                    type="button"
                    class="p-1.5 rounded hover:bg-slate-200 transition-colors"
                    title="แทรกรูปภาพ"
                    @click="insertImage"
                  >
                    <ImageIcon class="w-4 h-4 text-slate-600" />
                  </button>
                  <button
                    type="button"
                    class="p-1.5 rounded hover:bg-slate-200 transition-colors"
                    title="รายการ"
                    @click="execCommand('insertUnorderedList')"
                  >
                    <List class="w-4 h-4 text-slate-600" />
                  </button>
                </div>
                <div
                  ref="editor"
                  contenteditable
                  class="min-h-[200px] p-4 bg-white text-sm font-semibold text-slate-700 focus:outline-none"
                  @input="form.content = $event.target.innerHTML"
                ></div>
              </div>
            </div>

            <div class="mb-6">
              <label class="block text-xs font-bold text-slate-700 mb-2">🔗 ลิงก์ภายนอกหรือไฟล์แนบ (Attachments / Links)</label>
              <div class="space-y-2">
                <div
                  v-for="(att, idx) in form.attachments"
                  :key="idx"
                  class="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200"
                >
                  <FileTextIcon class="w-4 h-4 text-slate-500" />
                  <span class="flex-1 text-xs font-semibold text-slate-700">{{ att.label }}</span>
                  <button
                    type="button"
                    class="text-xs font-black text-rose-600 hover:text-rose-700"
                    @click="removeAttachment(idx)"
                  >
                    ลบ
                  </button>
                </div>
                <button
                  type="button"
                  class="w-full px-4 py-2 rounded-xl border-2 border-dashed border-slate-300 text-xs font-bold text-slate-600 hover:border-slate-400 hover:text-slate-700"
                  @click="addAttachment"
                >
                  + เพิ่มลิงก์หรือไฟล์แนบ
                </button>
              </div>
            </div>

            <div class="flex justify-end gap-3">
              <NuxtLink
                to="/news"
                class="h-10 px-4 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <Trash2 class="w-4 h-4" />
                ยกเลิก
              </NuxtLink>
              <button
                type="button"
                class="h-10 px-4 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                @click="saveDraft"
              >
                <Save class="w-4 h-4" />
                บันทึกฉบับร่าง
              </button>
              <button
                type="button"
                class="h-10 px-4 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 flex items-center gap-2"
                @click="publishPost"
              >
                <Rocket class="w-4 h-4" />
                เผยแพร่ข่าวสาร
              </button>
            </div>
          </div>
        </div>
  </div>
</template>