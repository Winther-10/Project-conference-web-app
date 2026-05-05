<script setup>
definePageMeta({ middleware: 'auth', layout: 'admin' });
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft, Save, Trophy } from 'lucide-vue-next';
import { useSupabase } from '~/composables/useSupabase';

const supabase = useSupabase();
const router = useRouter();

const form = ref({
  type: 'poster',
  level: 'good',
  article_id: '',
  title: '',
  university: '',
  track: '',
  authors: '',
  abstract: '',
  committee_comment: ''
});

const isSubmitting = ref(false);

const submitForm = async () => {
  if (!form.value.title) {
    alert('กรุณากรอกชื่อผลงาน');
    return;
  }
  isSubmitting.value = true;
  try {
    // authors could be a string, let's parse it to array if needed, or just store as JSON
    const authorsArr = form.value.authors.split(',').map(a => a.trim()).filter(a => a);
    
    const { error } = await supabase.from('awards').insert({
      type: form.value.type,
      level: form.value.level,
      article_id: form.value.article_id || null, // Should be UUID of paper
      title: form.value.title,
      university: form.value.university,
      track: form.value.track,
      authors: authorsArr,
      abstract: form.value.abstract,
      committee_comment: form.value.committee_comment
    });
    
    if (error) throw error;
    alert('เพิ่มรางวัลสำเร็จ');
    router.push('/awards');
  } catch (error) {
    alert('เกิดข้อผิดพลาด: ' + error.message);
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="p-8 pb-32 font-['Sarabun','Lato'] animate-fade-in">
    <div class="max-w-4xl mx-auto mb-8 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <NuxtLink to="/awards" class="h-10 px-4 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2">
          <ArrowLeft class="w-4 h-4" /> กลับไปหน้ารายการ
        </NuxtLink>
        <div>
          <h2 class="text-2xl font-bold text-slate-800 mb-1 flex items-center gap-2"><Trophy class="w-5 h-5 text-orange-500"/> เพิ่มรางวัลใหม่</h2>
        </div>
      </div>
    </div>

    <div class="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-2">ประเภทรางวัล (Type)</label>
          <select v-model="form.type" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500">
            <option value="poster">Poster Presentation</option>
            <option value="innovation">Innovation Award</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-2">ระดับรางวัล (Level)</label>
          <select v-model="form.level" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500">
            <option value="excellent">ยอดเยี่ยม (Excellent)</option>
            <option value="distinguished">ดีเด่น (Distinguished)</option>
            <option value="good">ดี (Good)</option>
          </select>
        </div>
      </div>

      <div class="mb-6">
        <label class="block text-xs font-bold text-slate-700 mb-2">ชื่อผลงาน / บทความ (Title)</label>
        <input v-model="form.title" type="text" placeholder="ระบุชื่อผลงาน" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-2">รหัสบทความ (Paper ID) <span class="text-slate-400 font-normal">*ถ้ามี</span></label>
          <input v-model="form.article_id" type="text" placeholder="UUID ของบทความ" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-2">มหาวิทยาลัย / สถาบัน</label>
          <input v-model="form.university" type="text" placeholder="ระบุชื่อสถาบัน" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
        </div>
      </div>

      <div class="mb-6">
        <label class="block text-xs font-bold text-slate-700 mb-2">กลุ่มสาขา (Track)</label>
        <input v-model="form.track" type="text" placeholder="ระบุกลุ่มสาขา" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
      </div>

      <div class="mb-6">
        <label class="block text-xs font-bold text-slate-700 mb-2">ผู้แต่ง (Authors) <span class="text-slate-400 font-normal">*คั่นด้วยเครื่องหมายจุลภาค (,)</span></label>
        <input v-model="form.authors" type="text" placeholder="เช่น ดช. สมปอง, นาย ยอดเยี่ยม" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
      </div>

      <div class="mb-6">
        <label class="block text-xs font-bold text-slate-700 mb-2">ความเห็นกรรมการ (Committee Comment)</label>
        <textarea v-model="form.committee_comment" rows="3" placeholder="ระบุข้อความ..." class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"></textarea>
      </div>

      <div class="flex justify-end gap-3 mt-8">
        <button type="button" @click="submitForm" :disabled="isSubmitting" class="h-10 px-6 rounded-xl bg-orange-600 text-white text-xs font-black hover:bg-orange-700 flex items-center gap-2 disabled:opacity-50 transition-colors shadow-sm shadow-orange-500/20">
          <Save class="w-4 h-4" />
          {{ isSubmitting ? 'กำลังบันทึก...' : 'บันทึกรางวัล' }}
        </button>
      </div>
    </div>
  </div>
</template>
