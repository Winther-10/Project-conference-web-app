<script setup>
definePageMeta({ layout: 'default' });
import { ref, computed, onMounted } from 'vue';
import { Calendar, MapPin, Building2, Users2, Info, Clock, Handshake, ArrowRight, Star } from 'lucide-vue-next';
import { useSupabase } from '~/composables/useSupabase';

const supabase = useSupabase();

const conf = ref({
  name: 'BRICC Festival',
  year: '2025',
  venue: 'มหาวิทยาลัยราชภัฏบุรีรัมย์',
  activeTracks: [],
  dates: {
    submissionOpen: '',
    submissionClose: '',
    announcementDate: '',
    revisionDeadline: '',
    conferenceDate: ''
  }
});

onMounted(async () => {
  try {
    const { data } = await supabase.from('system_settings').select('config_json').eq('id', 1).maybeSingle();
    if (data?.config_json?.conference) {
      conf.value = { ...conf.value, ...data.config_json.conference };
    }
  } catch (err) {}
});

// Format ISO date → Thai short date string
const thaiMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

const formatThaiDate = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const day = d.getDate();
    const month = thaiMonths[d.getMonth()];
    const year = d.getFullYear() + 543;
    return `${day} ${month} ${year}`;
  } catch { return iso; }
};

const keyDates = computed(() => [
  { id: 'd1', iso: conf.value.dates?.submissionOpen,   title: 'เปิดรับบทความ',  note: 'Submission Open'  },
  { id: 'd2', iso: conf.value.dates?.submissionClose,  title: 'ปิดรับบทความ',   note: 'Submission Close' },
  { id: 'd3', iso: conf.value.dates?.announcementDate, title: 'ประกาศผล',        note: 'Notification'     },
  { id: 'd4', iso: conf.value.dates?.conferenceDate,   title: 'วันจัดงาน',      note: 'Conference Day'   },
].map(d => ({ ...d, date: formatThaiDate(d.iso) })));

const organizers = [
  { id: 'org-1', name: 'คณะวิทยาศาสตร์', abbr: 'SCI' },
  { id: 'org-2', name: 'มรภ.บุรีรัมย์', abbr: 'BRU' },
  { id: 'org-3', name: 'BRICC Committee', abbr: 'COM' },
  { id: 'org-4', name: 'Industry Partner', abbr: 'IND' },
];
</script>

<template>
  <div class="flex-1 bg-gradient-to-b from-purple-50 to-white overflow-hidden">
    
    <!-- Animated bg blobs -->
    <div class="fixed -top-40 -left-40 w-[500px] h-[500px] bg-purple-200/30 rounded-full blur-[100px] animate-[pulse_8s_ease-in-out_infinite] pointer-events-none z-0"></div>
    <div class="fixed top-1/3 right-[-200px] w-[400px] h-[400px] bg-fuchsia-200/20 rounded-full blur-[80px] animate-[pulse_10s_ease-in-out_infinite_reverse] pointer-events-none z-0"></div>

    <div class="relative z-10 max-w-6xl mx-auto px-6 py-12">

      <!-- Page Header -->
      <div class="mb-10">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100 border border-purple-200 text-[11px] font-black uppercase tracking-widest text-purple-600 mb-4">
          <Info class="w-3.5 h-3.5" />
          About Conference
        </div>
        <h1 class="text-4xl font-black text-purple-950 tracking-tight">เกี่ยวกับงานประชุม</h1>
        <p class="mt-2 text-[15px] font-semibold text-purple-700/60">ข้อมูลภาพรวมของงานประชุมและองค์ประกอบสำคัญ</p>
      </div>

      <!-- Hero Banner -->
      <section class="mb-10">
        <div class="relative rounded-[36px] overflow-hidden border border-purple-200/50 shadow-[0_20px_60px_-10px_rgba(147,51,234,0.15)]">
          <!-- Lighter gradient -->
          <div class="absolute inset-0 bg-gradient-to-br from-purple-500 via-fuchsia-500 to-indigo-600"></div>
          <div class="absolute -right-24 -top-24 w-[520px] h-[520px] bg-white/10 blur-[100px] rounded-full animate-[pulse_6s_ease-in-out_infinite]"></div>
          <div class="absolute -left-24 -bottom-24 w-[400px] h-[400px] bg-fuchsia-300/15 blur-[80px] rounded-full animate-[pulse_8s_ease-in-out_infinite_reverse]"></div>

          <div class="relative px-8 py-12 md:px-14 md:py-16 z-10">
            <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 border border-white/30 text-white text-xs font-black mb-6">
              <Calendar class="w-4 h-4" />
              {{ conf.name || 'BRICC Festival' }}
            </div>

            <div class="flex flex-col lg:flex-row gap-8 lg:items-end lg:justify-between">
              <div>
                <div class="flex items-center gap-5 mb-6">
                  <!-- Logo on solid white rounded background for maximum visibility -->
                  <div class="bg-white rounded-3xl px-4 py-3 shadow-lg flex items-center justify-center shrink-0">
                    <img src="~/assets/bru-web-logo-en.png" alt="BRU Logo" class="h-12 w-auto object-contain" />
                  </div>
                  <div>
                    <div class="text-3xl md:text-4xl font-black text-white tracking-tight">{{ conf.name || 'BRICC Festival' }}</div>
                    <div class="text-sm font-semibold text-white/80 mt-1">{{ conf.venue || 'มหาวิทยาลัยราชภัฏบุรีรัมย์' }}</div>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
                  <div class="rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 p-4 hover:bg-white/20 transition-colors">
                    <div class="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">Date</div>
                    <div class="text-sm font-black text-white">
                      {{ conf.dates?.conferenceDate ? formatThaiDate(conf.dates.conferenceDate) : '—' }}
                    </div>
                  </div>
                  <div class="rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 p-4 hover:bg-white/20 transition-colors">
                    <div class="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">Venue</div>
                    <div class="text-sm font-black text-white">{{ conf.venue || '—' }}</div>
                  </div>
                </div>
              </div>

              <!-- Active Tracks box -->
              <div class="rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 p-6 max-w-md">
                <div class="flex items-center gap-2 mb-3">
                  <Star class="w-4 h-4 text-yellow-300 fill-yellow-300" />
                  <div class="text-[10px] font-black text-white/70 uppercase tracking-widest">Active Tracks {{ conf.year ? `(${conf.year})` : '' }}</div>
                </div>
                <div v-if="conf.activeTracks && conf.activeTracks.length" class="flex flex-wrap gap-1.5">
                  <span
                    v-for="t in conf.activeTracks"
                    :key="t"
                    class="px-2.5 py-1 rounded-full bg-white/20 border border-white/25 text-white text-[11px] font-bold"
                  >{{ t }}</span>
                </div>
                <div v-else class="text-sm font-semibold text-white/60">ยังไม่ได้กำหนด Track ในปีนี้</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Important Dates -->
      <section class="mb-10">
        <div class="flex items-center gap-2 text-xl font-black text-purple-950 mb-2">
          <div class="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
            <Clock class="w-4 h-4" />
          </div>
          กำหนดการสำคัญ (Important Dates)
        </div>
        <p class="text-sm font-semibold text-purple-700/60 mb-6">เส้นเวลาแนวนอนเพื่อดูภาพรวมได้ทันที</p>

        <div class="rounded-[32px] bg-white/80 backdrop-blur-xl border border-purple-100 p-8 shadow-sm overflow-x-auto">
          <div class="min-w-[700px] flex items-center">
            <div v-for="(d, idx) in keyDates" :key="d.id" class="flex-1 flex items-center">
              <div class="flex flex-col items-center gap-2 group cursor-default">
                <div
                  class="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-all duration-300 group-hover:scale-110 shadow-sm"
                  :class="d.iso && new Date(d.iso) <= new Date() ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-purple-200' : 'bg-purple-50 text-purple-400 border-2 border-purple-200'"
                >
                  {{ idx + 1 }}
                </div>
                <div class="text-center">
                  <div class="text-[11px] font-black text-purple-400 tracking-wide">{{ d.date }}</div>
                  <div class="text-[13px] font-black text-purple-950">{{ d.title }}</div>
                  <div class="text-[11px] font-semibold text-purple-500">{{ d.note }}</div>
                </div>
              </div>
              <div v-if="idx !== keyDates.length - 1" class="flex-1 px-4 pb-6">
                <div class="h-1.5 rounded-full" :class="d.iso && new Date(d.iso) <= new Date() ? 'bg-gradient-to-r from-purple-400 to-purple-200' : 'bg-purple-100'"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Venue -->
      <section class="mb-10">
        <div class="flex items-center gap-2 text-xl font-black text-purple-950 mb-2">
          <div class="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
            <MapPin class="w-4 h-4" />
          </div>
          สถานที่จัดงาน (Venue)
        </div>
        <p class="text-sm font-semibold text-purple-700/60 mb-6">{{ conf.venue || 'รายละเอียดสถานที่และแผนที่การเดินทาง' }}</p>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="rounded-[28px] bg-white/80 backdrop-blur-xl border border-purple-100 overflow-hidden shadow-sm hover:shadow-purple-100/50 hover:shadow-lg transition-shadow">
            <div class="p-6 flex items-center gap-3 border-b border-purple-100">
              <div class="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                <Building2 class="w-5 h-5" />
              </div>
              <div>
                <div class="text-sm font-black text-purple-950">{{ conf.venue || 'สถานที่จัดงาน' }}</div>
                <div class="text-xs font-semibold text-purple-500">ปี ค.ศ. {{ conf.year || '—' }}</div>
              </div>
            </div>
            <div class="aspect-[16/10] bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center overflow-hidden">
              <img src="~/assets/venue_auditorium.jpg" alt="Venue" class="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
            </div>
          </div>

          <div class="rounded-[28px] bg-white/80 backdrop-blur-xl border border-purple-100 overflow-hidden shadow-sm hover:shadow-purple-100/50 hover:shadow-lg transition-shadow">
            <div class="p-6 border-b border-purple-100">
              <div class="rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 p-5">
                <div class="text-sm font-semibold text-purple-800 leading-relaxed">
                  "ขอเชิญนักวิจัยทุกท่านร่วมแลกเปลี่ยนองค์ความรู้ นำเสนองานวิจัย และสร้างเครือข่ายความร่วมมือ เพื่อยกระดับมาตรฐานการวิจัยและนวัตกรรมของประเทศ"
                </div>
                <div class="mt-3 text-xs font-black text-purple-400">— ประธานจัดงาน {{ conf.name || 'BRICC' }}</div>
              </div>
            </div>
            <div class="aspect-[16/9] bg-purple-50">
              <iframe
                title="BRICC Venue"
                class="w-full h-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src="https://www.google.com/maps?q=Buriram+Rajabhat+University&output=embed"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- Organizers -->
      <section class="mb-12">
        <div class="flex items-center gap-2 text-xl font-black text-purple-950 mb-2">
          <div class="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
            <Handshake class="w-4 h-4" />
          </div>
          ผู้จัดงานและผู้สนับสนุน
        </div>
        <p class="text-sm font-semibold text-purple-700/60 mb-6">หน่วยงานที่ร่วมจัดและสนับสนุนการประชุม</p>

        <div class="rounded-[28px] bg-white/80 backdrop-blur-xl border border-purple-100 p-8 shadow-sm">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div
              class="rounded-2xl border border-purple-100 bg-purple-50/50 p-6 flex flex-col items-center justify-center gap-4 hover:bg-purple-100/50 hover:border-purple-200 hover:-translate-y-1 transition-all duration-300 cursor-default"
            >
              <div class="h-24 flex items-center justify-center mix-blend-multiply">
                <img src="~/assets/rajabhat_bru_logo.png" alt="Buriram Rajabhat University" class="max-h-full max-w-full object-contain" />
              </div>
              <div class="text-[14px] font-black text-purple-900 text-center mt-2">มหาวิทยาลัยราชภัฏบุรีรัมย์</div>
            </div>

            <div
              class="rounded-2xl border border-purple-100 bg-purple-50/50 p-6 flex flex-col items-center justify-center gap-4 hover:bg-purple-100/50 hover:border-purple-200 hover:-translate-y-1 transition-all duration-300 cursor-default"
            >
              <div class="h-24 flex items-center justify-center mix-blend-multiply">
                <img src="~/assets/SCI-BRU-Logo.png" alt="Faculty of Science BRU" class="max-h-full max-w-full object-contain" />
              </div>
              <div class="text-[14px] font-black text-purple-900 text-center mt-2">คณะวิทยาศาสตร์ มรภ.บุรีรัมย์</div>
            </div>
          </div>

          <div class="rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
                <Users2 class="w-5 h-5" />
              </div>
              <div>
                <div class="text-sm font-black">Join the Community</div>
                <div class="text-xs font-semibold text-white/70">ร่วมเป็นส่วนหนึ่งของเครือข่ายนักวิจัย BRICC</div>
              </div>
            </div>
            <NuxtLink to="/register" class="flex items-center gap-2 h-9 px-5 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-black transition-colors border border-white/20">
              ลงทะเบียน <ArrowRight class="w-3.5 h-3.5" />
            </NuxtLink>
          </div>
        </div>
      </section>

    </div>
  </div>
</template>
