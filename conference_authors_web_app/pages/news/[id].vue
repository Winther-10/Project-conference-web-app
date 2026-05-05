<script setup>
definePageMeta({ layout: 'default' });
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useSupabase } from '~/composables/useSupabase';
import { ArrowLeft, CalendarDays, Tag } from 'lucide-vue-next';

const route = useRoute();
const supabase = useSupabase();
const post = ref(null);
const isLoading = ref(true);

const formatDate = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'long' }).format(d);
};

onMounted(async () => {
  const id = route.params.id;
  const { data, error } = await supabase.from('news').select('*').eq('id', id).single();
  if (data) {
    post.value = data;
  }
  isLoading.value = false;
});
</script>

<template>
  <div class="flex-1 bg-gradient-to-b from-purple-50 to-white min-h-screen">
    <div class="max-w-4xl mx-auto px-6 py-12">
      <NuxtLink to="/news" class="inline-flex items-center gap-2 text-sm font-bold text-purple-600 hover:text-purple-800 mb-8 transition-colors">
        <ArrowLeft class="w-4 h-4" />
        กลับไปหน้าข่าวสาร
      </NuxtLink>

      <div v-if="isLoading" class="text-center py-20">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto"></div>
        <div class="mt-4 text-sm font-bold text-slate-500">กำลังโหลดเนื้อหา...</div>
      </div>

      <div v-else-if="!post" class="text-center py-20">
        <div class="text-xl font-bold text-slate-700">ไม่พบข่าวสารที่คุณต้องการ</div>
      </div>

      <article v-else class="bg-white rounded-[28px] p-8 shadow-xl shadow-purple-100/50 border border-purple-100">
        <div class="flex flex-wrap items-center gap-4 mb-6">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-purple-100 text-purple-700 border border-purple-200">
            ข่าวสาร
          </span>
          <div class="flex items-center gap-1.5 text-sm font-semibold text-slate-500">
            <CalendarDays class="w-4 h-4" />
            {{ formatDate(post.published_at || post.created_at) }}
          </div>
        </div>

        <h1 class="text-3xl font-black text-slate-900 mb-8 leading-tight">{{ post.title }}</h1>

        <div v-if="post.cover_image_url" class="mb-8 rounded-2xl overflow-hidden border border-slate-200">
          <img :src="post.cover_image_url" :alt="post.title" class="w-full h-auto object-cover max-h-[400px]" />
        </div>

        <div class="prose prose-purple max-w-none text-slate-700 font-medium leading-relaxed" v-html="post.content"></div>

        <div v-if="post.attachments && post.attachments.length > 0" class="mt-10 pt-8 border-t border-slate-200">
          <h3 class="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Tag class="w-5 h-5 text-purple-600" />
            ไฟล์แนบ / ลิงก์ที่เกี่ยวข้อง
          </h3>
          <div class="space-y-3">
            <a v-for="(att, idx) in post.attachments" :key="idx" :href="att.url" target="_blank" class="block p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 transition-colors text-sm font-bold text-slate-700">
              {{ att.label }}
            </a>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
:deep(.prose),
:deep(.prose *) {
  font-family: 'Sarabun', sans-serif !important;
}
</style>
