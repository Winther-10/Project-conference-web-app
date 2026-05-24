<script setup>
definePageMeta({ layout: 'portal' });
import { ref, computed } from 'vue';
import {
  Search,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  FileText,
  CreditCard,
  Mic,
  Users,
  Plus,
  Minus,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Trophy,
  LifeBuoy,
  BookOpen,
  MessageSquareMore,
  FileDown,
  PhoneCall,
  Bell,
  BarChart3,
  Archive,
  DownloadCloud,
  Printer,
  Facebook
} from 'lucide-vue-next';

const query = ref('');
const activeTopic = ref('all');
const expandedId = ref('faq-002');
const suggestOpen = ref(false);

const topics = [
  { id: 'registration', label: 'สมัคร', icon: Users, tint: 'bg-purple-50 border-purple-200 text-purple-700' },
  { id: 'submission', label: 'ส่งงาน', icon: FileText, tint: 'bg-blue-50 border-blue-200 text-blue-700' },
  { id: 'schedule', label: 'ตาราง', icon: Calendar, tint: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  { id: 'awards', label: 'รางวัล', icon: Trophy, tint: 'bg-amber-50 border-amber-200 text-amber-800' },
  { id: 'notifications', label: 'แจ้งเตือน', icon: Bell, tint: 'bg-rose-50 border-rose-200 text-rose-700' },
  { id: 'statistics', label: 'สถิติ', icon: BarChart3, tint: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  { id: 'archives', label: 'คลังบทความ', icon: Archive, tint: 'bg-slate-50 border-slate-200 text-slate-700' },
  { id: 'downloads', label: 'ดาวน์โหลด', icon: DownloadCloud, tint: 'bg-teal-50 border-teal-200 text-teal-700' }
];

const faqs = [
  {
    id: 'faq-001',
    topic: 'submission',
    q: 'แก้ไขบทความยังไง?',
    a: 'ไปที่หน้า “บทความของฉัน” เลือกบทความที่ต้องการ แล้วกด “แก้ไข/อัปโหลดไฟล์ใหม่” เพื่อส่งเวอร์ชันปรับปรุง จากนั้นตรวจสอบสถานะในหน้าเดิมได้ทันที',
    actions: [{ label: 'ไปที่บทความของฉัน', to: '/portal/articles' }]
  },
  {
    id: 'faq-002',
    topic: 'submission',
    q: 'เปลี่ยนชื่อผู้แต่งได้ไหม?',
    a: 'ได้ครับ หากยังไม่ผ่านขั้นตอนพิจารณา ให้เข้าไปที่หน้า “บทความของฉัน” แล้วแก้ไขข้อมูลผู้แต่ง/ผู้ติดต่อ จากนั้นบันทึกอีกครั้ง (หากผ่านการพิจารณาแล้ว อาจต้องติดต่อเจ้าหน้าที่เพื่อยืนยัน)',
    actions: [{ label: 'ไปที่บทความของฉัน', to: '/portal/articles' }]
  },
  {
    id: 'faq-005',
    topic: 'schedule',
    q: 'ดูตารางนำเสนอของตัวเองได้จากที่ไหน?',
    a: 'ไปที่หน้า “ตารางนำเสนอ” แล้วตารางจะแสดงบทความที่คุณส่งและได้รับการตอบรับให้เข้าร่วมนำเสนอ',
    actions: [{ label: 'ไปที่ตารางนำเสนอ', to: '/portal/schedule' }]
  },
  {
    id: 'faq-006',
    topic: 'registration',
    q: 'ต้องทำอะไรบ้างก่อนเริ่มส่งบทความ?',
    a: 'แนะนำให้ตรวจสอบคู่มือผู้เขียน (Author Manual) และ template ให้เรียบร้อยก่อน จากนั้นค่อยเข้าเมนู “ส่งบทความใหม่” เพื่อเริ่มต้นกรอกข้อมูลและอัปโหลดไฟล์',
    actions: [{ label: 'ไปที่ส่งบทความใหม่', to: '/portal/submit' }, { label: 'ไปที่ดาวน์โหลดคู่มือ', to: '/portal/downloads' }]
  },
  {
    id: 'faq-007',
    topic: 'awards',
    q: 'ตรวจสอบการประกาศผลรางวัลได้ที่ไหน?',
    a: 'คุณสามารถตรวจสอบรายชื่อบทความที่ได้รับรางวัลได้ที่เมนู "รางวัลและเกียรติบัตร" หากได้รับรางวัล สามารถดาวน์โหลดเกียรติบัตรอิเล็กทรอนิกส์ได้จากหน้านั้นทันที',
    actions: [{ label: 'ไปที่หน้ารางวัล', to: '/portal/awards' }]
  },
  {
    id: 'faq-008',
    topic: 'notifications',
    q: 'ทำไมถึงไม่ได้รับการแจ้งเตือน?',
    a: 'ระบบแจ้งเตือนจะทำงานเมื่อมีการอัปเดตสถานะจาก Admin (เช่น รอตรวจสอบ, ต้องแก้ไข, ตอบรับบทความ) หรือเมื่อคุณเพิ่งเข้าสู่ระบบครั้งแรก หากพบปัญหา ให้ลองรีเฟรชหน้าต่าง (F5)',
    actions: []
  },
  {
    id: 'faq-009',
    topic: 'statistics',
    q: 'ข้อมูลในหน้าสถิติคืออะไรบ้าง?',
    a: 'หน้าสถิติจะแสดงจำนวนผู้อ่านบทความของคุณ สถิติการดาวน์โหลด และคะแนนหรือความเห็นจาก Reviewer เพื่อให้คุณเห็นผลตอบรับของผลงานตนเองได้อย่างชัดเจน',
    actions: [{ label: 'ไปที่หน้าสถิติ', to: '/portal/statistics' }]
  },
  {
    id: 'faq-010',
    topic: 'archives',
    q: 'คลังบทความคืออะไร?',
    a: 'คลังบทความ (Archives) ใช้สำหรับรวบรวมและสืบค้นบทความที่ตีพิมพ์ในงานประชุมปีก่อนๆ คุณสามารถค้นหางานวิจัยที่น่าสนใจและอ้างอิงได้จากหน้านี้',
    actions: [{ label: 'ไปที่คลังบทความ', to: '/portal/archives' }]
  },
  {
    id: 'faq-011',
    topic: 'downloads',
    q: 'ดาวน์โหลดไฟล์ Template ได้ที่ไหน?',
    a: 'ไฟล์ Template เอกสารต่างๆ และคู่มือ (Author Manual) สามารถดาวน์โหลดได้ที่หน้า “ดาวน์โหลด”',
    actions: [{ label: 'ไปที่ดาวน์โหลด', to: '/portal/downloads' }]
  }
];

const normalized = (s) => String(s || '').trim().toLowerCase();

const scoredFaqs = computed(() => {
  const q = normalized(query.value);
  return faqs
    .filter((f) => (activeTopic.value === 'all' ? true : f.topic === activeTopic.value))
    .map((f) => {
      if (!q) return { f, score: 0 };
      const hay = normalized(`${f.q} ${f.a}`);
      const score = hay.includes(q) ? 3 : normalized(f.q).includes(q) ? 2 : hay.split(' ').some((w) => w.includes(q)) ? 1 : 0;
      return { f, score };
    })
    .filter((x) => (q ? x.score > 0 : true))
    .sort((a, b) => b.score - a.score);
});

const visibleFaqs = computed(() => scoredFaqs.value.map((x) => x.f));

const suggestions = computed(() => {
  const q = normalized(query.value);
  if (!q) return [];
  return scoredFaqs.value.slice(0, 5).map((x) => x.f);
});

const handleBlur = () => {
  window.setTimeout(() => {
    suggestOpen.value = false;
  }, 120);
};

const toggleFaq = (id) => {
  expandedId.value = expandedId.value === id ? null : id;
};

const selectSuggestion = (id) => {
  expandedId.value = id;
  suggestOpen.value = false;
};
</script>

<template>
  <div class="flex-1 overflow-y-auto px-6 pt-8 pb-32 no-scrollbar animate-in fade-in duration-300 max-w-6xl mx-auto">
    <header class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-7">
      <div class="flex items-center gap-3 min-w-0">
        <LifeBuoy class="w-8 h-8 text-slate-900" />
        <div class="min-w-0">
          <div class="text-2xl font-black text-slate-900 truncate">ศูนย์ช่วยเหลือและติดต่อ (Help Center & Support)</div>
          <div class="mt-1 text-sm font-semibold text-slate-500 truncate">มีปัญหาการใช้งาน? ค้นหาคำตอบหรือติดต่อทีมงานได้ที่นี่</div>
        </div>
      </div>
    </header>

    <div class="grid grid-cols-1 xl:grid-cols-10 gap-6">
      <div class="xl:col-span-7 space-y-6">
        <section class="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm">
          <div class="flex items-center gap-2">
            <div class="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center">
              <HelpCircle class="w-5 h-5 text-purple-700" />
            </div>
            <div class="min-w-0">
              <div class="text-sm font-black text-slate-900">ค้นหาคำตอบ</div>
              <div class="text-xs font-semibold text-slate-500">พิมพ์ปัญหาของคุณ เช่น “วิธีจ่ายเงิน”</div>
            </div>
          </div>

          <div class="mt-4 relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              v-model="query"
              @focus="suggestOpen = true"
              @blur="handleBlur"
              class="w-full h-12 pl-9 pr-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100 transition-shadow"
              placeholder="พิมพ์ปัญหาของคุณ..."
            />

            <div v-if="suggestOpen && suggestions.length > 0" class="absolute left-0 right-0 top-[54px] rounded-3xl bg-white border border-slate-200 shadow-lg overflow-hidden z-10">
              <div class="px-4 py-3 text-[11px] font-black text-slate-500 bg-slate-50 border-b border-slate-200">
                แนะนำคำถามที่เกี่ยวข้อง
              </div>
              <div class="divide-y divide-slate-100">
                <button
                  v-for="s in suggestions"
                  :key="s.id"
                  type="button"
                  @mousedown.prevent
                  @click="selectSuggestion(s.id)"
                  class="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
                >
                  <div class="min-w-0">
                    <div class="text-sm font-black text-slate-900 truncate">{{ s.q }}</div>
                    <div class="text-xs font-semibold text-slate-500 truncate">{{ s.topic.toUpperCase() }}</div>
                  </div>
                  <ChevronRight class="w-4 h-4 text-slate-400 flex-shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section class="space-y-3">
          <div class="flex items-end justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 text-base font-black text-slate-900">
                <BookOpen class="w-5 h-5 text-purple-600" />
                เลือกหัวข้อ (Topics)
              </div>
              <div class="mt-1 text-xs font-semibold text-slate-500">เลือกหมวดเพื่อกรอง FAQ ให้ตรงปัญหา</div>
            </div>

            <button
              type="button"
              @click="activeTopic = 'all'"
              :class="[
                'h-9 px-4 rounded-2xl border text-xs font-black transition-colors',
                activeTopic === 'all'
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              ]"
            >
              ดูทั้งหมด
            </button>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              v-for="t in topics"
              :key="t.id"
              type="button"
              @click="activeTopic = activeTopic === t.id ? 'all' : t.id"
              :class="[
                'rounded-3xl border p-4 text-left transition-all',
                activeTopic === t.id ? 'bg-slate-900 border-slate-900 text-white shadow-sm' : 'bg-white border-slate-200 hover:shadow-sm'
              ]"
            >
              <div class="flex items-center justify-between gap-3">
                <div :class="['w-11 h-11 rounded-2xl border flex items-center justify-center', activeTopic === t.id ? 'bg-white/10 border-white/10' : t.tint]">
                  <component :is="t.icon" :class="['w-5 h-5', activeTopic === t.id ? 'text-white' : '']" />
                </div>
                <ChevronRight :class="['w-4 h-4', activeTopic === t.id ? 'text-white/70' : 'text-slate-400']" />
              </div>
              <div :class="['mt-3 text-sm font-black', activeTopic === t.id ? 'text-white' : 'text-slate-900']">{{ t.label }}</div>
              <div :class="['mt-1 text-[11px] font-semibold', activeTopic === t.id ? 'text-white/80' : 'text-slate-500']">FAQ & วิธีแก้ปัญหา</div>
            </button>
          </div>
        </section>

        <section class="space-y-3">
          <div class="flex items-end justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 text-base font-black text-slate-900">
                <MessageSquareMore class="w-5 h-5 text-blue-600" />
                คำถามที่พบบ่อย (FAQ)
              </div>
              <div class="mt-1 text-xs font-semibold text-slate-500">คลิกเพื่อดูคำตอบแบบยืด-หด</div>
            </div>
            <div class="text-xs font-black text-slate-500">{{ visibleFaqs.length }} รายการ</div>
          </div>

          <div class="space-y-2">
            <div v-if="visibleFaqs.length === 0" class="rounded-3xl bg-white border border-slate-200 p-5 text-sm font-semibold text-slate-600">
              ไม่พบคำถามที่ตรงกับคำค้นหา
            </div>
            <div v-else v-for="f in visibleFaqs" :key="f.id" class="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm">
              <button
                type="button"
                @click="toggleFaq(f.id)"
                class="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
              >
                <div class="min-w-0 text-left">
                  <div class="text-sm font-black text-slate-900 truncate">{{ f.q }}</div>
                  <div class="mt-1 text-[11px] font-black text-slate-500">{{ f.topic.toUpperCase() }}</div>
                </div>
                <div class="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                  <Minus v-if="expandedId === f.id" class="w-4 h-4 text-slate-700" />
                  <Plus v-else class="w-4 h-4 text-slate-700" />
                </div>
              </button>

              <div v-if="expandedId === f.id" class="px-5 pb-5">
                <div class="text-sm font-semibold text-slate-700 leading-relaxed">{{ f.a }}</div>
                <div v-if="f.actions && f.actions.length > 0" class="mt-4 flex flex-wrap gap-2">
                  <NuxtLink
                    v-for="action in f.actions"
                    :key="action.label"
                    :to="action.to"
                    class="inline-flex items-center gap-2 h-9 px-3 rounded-2xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 transition-colors"
                  >
                    <ExternalLink class="w-4 h-4" />
                    {{ action.label }}
                  </NuxtLink>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm">
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-2 text-base font-black text-slate-900">
                <FileDown class="w-5 h-5 text-emerald-600" />
                ดาวน์โหลดคู่มือฉบับเต็ม
              </div>
              <div class="mt-1 text-xs font-semibold text-slate-500">Author Manual (PDF) (5 MB)</div>
            </div>
            <NuxtLink
              to="/portal/downloads"
              class="h-10 px-4 rounded-2xl bg-purple-600 text-white text-xs font-black hover:bg-purple-500 transition-colors inline-flex items-center gap-2"
            >
              <ExternalLink class="w-4 h-4" />
              ไปที่ดาวน์โหลด
            </NuxtLink>
          </div>
        </section>
      </div>

      <aside class="xl:col-span-3 space-y-4">
        <div class="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm">
          <div class="flex items-center gap-2 text-base font-black text-slate-900">
            <PhoneCall class="w-5 h-5 text-rose-600" />
            ติดต่อเรา (Contact Us)
          </div>
          <div class="mt-1 text-xs font-semibold text-slate-500">Direct Support เมื่อแก้ปัญหาเองไม่ได้</div>

          <div class="mt-4 space-y-3">
            <div class="rounded-2xl bg-slate-50 border border-slate-200 p-3">
              <div class="flex items-center gap-2">
                <Phone class="w-4 h-4 text-slate-600" />
                <div class="text-xs font-black text-slate-700">044-611221-6611, 6612</div>
              </div>
            </div>
            <div class="rounded-2xl bg-slate-50 border border-slate-200 p-3">
              <div class="flex items-center gap-2">
                <Printer class="w-4 h-4 text-slate-600" />
                <div class="text-xs font-black text-slate-700">044-611221-858</div>
              </div>
            </div>
            <div class="rounded-2xl bg-slate-50 border border-slate-200 p-3">
              <div class="flex items-center gap-2">
                <Mail class="w-4 h-4 text-slate-600" />
                <div class="text-xs font-black text-slate-700">comsci_bru@hotmail.com</div>
              </div>
            </div>
            <a href="https://www.facebook.com/comsci.bru" target="_blank" rel="noopener noreferrer" class="rounded-2xl bg-slate-50 border border-slate-200 p-3 hover:bg-slate-100 transition-colors block">
              <div class="flex items-center gap-2">
                <Facebook class="w-4 h-4 text-blue-600" />
                <div class="text-xs font-black text-slate-700 flex items-center gap-1">
                  วิทยาการคอมพิวเตอร์ ราชภัฏบุรีรัมย์
                  <ExternalLink class="w-3 h-3 text-slate-400" />
                </div>
              </div>
            </a>
          </div>
        </div>

        <div class="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm">
          <a href="https://maps.google.com/?q=มหาวิทยาลัยราชภัฏบุรีรัมย์+อาคาร+5+สาขาวิชาวิทยาการคอมพิวเตอร์" target="_blank" rel="noopener noreferrer" class="p-5 border-b border-slate-200 hover:bg-slate-50 transition-colors block">
            <div class="flex items-start gap-2">
              <MapPin class="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <div class="text-base font-black text-slate-900 flex items-center gap-1.5">
                  แผนที่ (Location)
                  <ExternalLink class="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div class="mt-1 text-[11px] font-semibold text-slate-500 leading-snug">มหาวิทยาลัยราชภัฏบุรีรัมย์ อาคาร 5 ชั้น 2 สาขาวิชาวิทยาการคอมพิวเตอร์ 439 ถนน จิระ ตำบลในเมือง อำเภอเมือง จังหวัดบุรีรัมย์ 31000</div>
              </div>
            </div>
          </a>
          <div class="aspect-[4/3] bg-slate-100">
            <iframe
              title="BRICC Location"
              class="w-full h-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src="https://www.google.com/maps?q=มหาวิทยาลัยราชภัฏบุรีรัมย์+อาคาร+5&output=embed"
            />
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
