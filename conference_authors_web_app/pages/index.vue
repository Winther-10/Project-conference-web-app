<script setup>
definePageMeta({ layout: 'default' });
import { useSupabase } from '~/composables/useSupabase';
import { ArrowRight, BookOpen, Users, Award, FileText, CalendarDays, Star } from 'lucide-vue-next';
import { ref, onMounted, computed, onUnmounted } from 'vue';

const supabase = useSupabase();
const conferenceSettings = ref({ activeTracks: [], dates: {} });
const papersCount = ref(0);
const reviewersCount = ref(0);

// Multi-phase countdown
const confDates = ref({ submissionClose: null, announcementDate: null, conferenceDate: null });
const countdown = ref({ days: 0, hours: 0, minutes: 0, seconds: 0 });
let countdownTimer = null;

const phase = computed(() => {
  const now = new Date();
  const d = confDates.value;
  const close    = d.submissionClose  ? new Date(d.submissionClose)  : null;
  const announce = d.announcementDate ? new Date(d.announcementDate) : null;
  const conf     = d.conferenceDate   ? new Date(d.conferenceDate)   : null;
  if (!close) return 'unknown';
  if (now < close) return 'submission';
  if (announce && now < announce) return 'reviewing';
  if (conf && now < conf) return 'announced';
  if (conf && now >= conf) return 'done';
  return 'closed';
});

const phaseConfig = computed(() => {
  const d = confDates.value;
  const configs = {
    submission: { badge: 'Call for Papers is Now Open', badgeClass: 'text-purple-700 border-purple-200 bg-white/80', dot: 'bg-purple-500', timerLabel: 'Submission Ends In', target: d.submissionClose,  timerColor: 'text-purple-900', secColor: 'text-fuchsia-700' },
    reviewing:  { badge: 'Review Process in Progress',    badgeClass: 'text-amber-700 border-amber-200 bg-white/80',  dot: 'bg-amber-500',  timerLabel: 'Announcement In',    target: d.announcementDate, timerColor: 'text-amber-900',  secColor: 'text-orange-600' },
    announced:  { badge: 'Results Announced',             badgeClass: 'text-emerald-700 border-emerald-200 bg-white/80', dot: 'bg-emerald-500', timerLabel: 'Conference Starts In', target: d.conferenceDate, timerColor: 'text-emerald-900', secColor: 'text-teal-600' },
    done:       { badge: '🎉 Conference Successfully Completed', badgeClass: 'text-slate-600 border-slate-200 bg-white/80',  dot: 'bg-slate-400',  timerLabel: null, target: null, timerColor: 'text-slate-700', secColor: 'text-slate-500' },
    closed:     { badge: 'Submission Period Closed',         badgeClass: 'text-rose-700 border-rose-200 bg-white/80',   dot: 'bg-rose-500',   timerLabel: null, target: null, timerColor: 'text-slate-700', secColor: 'text-slate-500' },
    unknown:    { badge: 'Call for Papers',                  badgeClass: 'text-purple-700 border-purple-200 bg-white/80', dot: 'bg-slate-400', timerLabel: null, target: null, timerColor: 'text-slate-700', secColor: 'text-slate-500' },
  };
  return configs[phase.value] || configs.unknown;
});

const padTwo = (n) => String(n).padStart(2, '0');

const updateCountdown = () => {
  const target = phaseConfig.value.target;
  if (!target) { countdown.value = { days: 0, hours: 0, minutes: 0, seconds: 0 }; return; }
  const diff = new Date(target) - new Date();
  if (diff <= 0) { countdown.value = { days: 0, hours: 0, minutes: 0, seconds: 0 }; return; }
  const t = Math.floor(diff / 1000);
  countdown.value = { days: Math.floor(t / 86400), hours: Math.floor((t % 86400) / 3600), minutes: Math.floor((t % 3600) / 60), seconds: t % 60 };
};

onMounted(async () => {
  try {
    const [settingsRes, papersRes, usersRes] = await Promise.all([
      supabase.from('system_settings').select('config_json').eq('id', 1).maybeSingle(),
      supabase.from('papers').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'reviewer')
    ]);

    if (settingsRes.data?.config_json?.conference) {
      conferenceSettings.value = settingsRes.data.config_json.conference;
      const d = settingsRes.data.config_json.conference.dates || {};
      confDates.value = {
        submissionClose:  d.submissionClose  || null,
        announcementDate: d.announcementDate || null,
        conferenceDate:   d.conferenceDate   || null,
      };
    }
    if (papersRes.count !== null) papersCount.value = papersRes.count;
    if (usersRes.count !== null) reviewersCount.value = usersRes.count;
  } catch (err) {}

  updateCountdown();
  countdownTimer = setInterval(updateCountdown, 1000);
});

onUnmounted(() => { if (countdownTimer) clearInterval(countdownTimer); });

const submissionProgress = computed(() => {
  const d = conferenceSettings.value?.dates;
  if (!d?.submissionOpen || !d?.submissionClose) return 0;
  const start = new Date(d.submissionOpen).getTime();
  const end = new Date(d.submissionClose).getTime();
  const now = new Date().getTime();
  if (now < start) return 0;
  if (now > end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
});

const conferenceYear = computed(() => {
  if (conferenceSettings.value.year) return conferenceSettings.value.year;
  const d = confDates.value.conferenceDate;
  if (d) return new Date(d).getFullYear();
  const name = conferenceSettings.value.name || '';
  const match = name.match(/\d{4}/);
  return match ? match[0] : new Date().getFullYear();
});
</script>

<template>
  <div class="bg-gradient-to-b from-purple-50 to-white flex-1 flex flex-col font-sans overflow-hidden">

    <!-- ===== HERO ===== -->
    <div class="relative overflow-hidden min-h-[88vh] flex items-center">

      <!-- Animated background blobs -->
      <div class="absolute -top-40 -left-40 w-[600px] h-[600px] bg-purple-200/40 rounded-full blur-[100px] animate-[pulse_8s_ease-in-out_infinite] pointer-events-none"></div>
      <div class="absolute top-1/4 right-[-200px] w-[500px] h-[500px] bg-fuchsia-200/30 rounded-full blur-[80px] animate-[pulse_10s_ease-in-out_infinite_reverse] pointer-events-none"></div>
      <div class="absolute bottom-[-80px] left-1/3 w-[400px] h-[400px] bg-indigo-200/30 rounded-full blur-[90px] animate-[pulse_6s_ease-in-out_infinite] pointer-events-none"></div>

      <div class="relative max-w-7xl mx-auto px-6 lg:px-12 py-24 w-full z-10">
        <div class="flex flex-col lg:flex-row items-center gap-16 lg:gap-12">

          <!-- Left: Text -->
          <div class="flex-1 text-center lg:text-left">
            <!-- Badge -->
            <div :class="['inline-flex items-center gap-2 px-5 py-2 rounded-full backdrop-blur-md border text-[11px] font-black tracking-widest mb-8 shadow-sm animate-bounce', phaseConfig.badgeClass]">
              <span :class="['w-2 h-2 rounded-full animate-pulse', phaseConfig.dot]"></span>
              {{ phaseConfig.badge }}
            </div>

            <h1 class="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-purple-950 mb-6">
              <span class="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-fuchsia-500 to-indigo-600">{{ conferenceSettings.name || 'BRICC Festival 2026' }}</span>
            </h1>

            <p class="text-[15px] sm:text-[17px] text-purple-800/70 mb-4 font-bold">
              {{ conferenceSettings.venue || 'The 9th Buriram Rajabhat Conference' }}
            </p>
            <p class="max-w-xl mx-auto lg:mx-0 text-[15px] text-purple-700/60 mb-10 leading-relaxed font-semibold">
              แพลตฟอร์มสำหรับนักวิจัย นักวิชาการ และนิสิตนักศึกษา เพื่อนำเสนอผลงานและแลกเปลี่ยนความรู้
            </p>

            <div class="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <NuxtLink
                to="/register"
                class="h-14 px-8 rounded-[24px] bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-[15px] hover:shadow-[0_12px_30px_rgba(147,51,234,0.35)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 group shadow-lg shadow-purple-300/40"
              >
                เริ่มต้นส่งบทความ
                <ArrowRight class="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </NuxtLink>
              <NuxtLink
                to="/about"
                class="h-14 px-8 rounded-[24px] bg-white/70 backdrop-blur-sm text-purple-700 border border-purple-200 font-bold text-[15px] hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
              >
                อ่านรายละเอียดเพิ่มเติม
              </NuxtLink>
            </div>
          </div>

          <!-- Right: Floating cards visual -->
          <div class="flex-1 w-full max-w-lg lg:max-w-none relative h-[420px] hidden md:block">
            <!-- Main Card -->
            <div class="absolute top-0 left-8 right-8 bg-white/80 backdrop-blur-xl rounded-[32px] border border-purple-100 shadow-[0_20px_60px_-10px_rgba(147,51,234,0.15)] p-8 z-20">
              <div class="flex items-center gap-3 mb-6">
                <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-200 to-indigo-200 flex items-center justify-center text-purple-700">
                  <FileText class="w-5 h-5" />
                </div>
                <div>
                  <div class="text-[14px] font-black text-purple-950">Paper Submission Portal</div>
                  <div class="text-[11px] text-purple-500 font-semibold">{{ conferenceSettings.name || 'BRICC Festival 2026' }}</div>
                </div>
                <div class="ml-auto px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-black border border-emerald-200">OPEN</div>
              </div>
              <!-- Progress bar -->
              <div class="mb-4">
                <div class="flex justify-between text-[12px] font-bold text-purple-700 mb-2">
                  <span>Submissions Progress</span><span>{{ submissionProgress }}%</span>
                </div>
                <div class="h-2.5 bg-purple-100 rounded-full overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-1000" :style="{ width: submissionProgress + '%' }"></div>
                </div>
              </div>
              <!-- Mini stats row -->
              <div class="grid grid-cols-3 gap-3 mt-6">
                <div class="text-center bg-purple-50 rounded-2xl py-3 border border-purple-100">
                  <div class="text-2xl font-black text-purple-800">{{ papersCount }}</div>
                  <div class="text-[10px] font-bold text-purple-500 uppercase tracking-wide">Papers</div>
                </div>
                <div class="text-center bg-fuchsia-50 rounded-2xl py-3 border border-fuchsia-100">
                  <div class="text-2xl font-black text-fuchsia-700">{{ reviewersCount }}</div>
                  <div class="text-[10px] font-bold text-fuchsia-400 uppercase tracking-wide">Reviewers</div>
                </div>
                <div class="text-center bg-indigo-50 rounded-2xl py-3 border border-indigo-100">
                  <div class="text-2xl font-black text-indigo-700">{{ conferenceSettings.activeTracks?.length || 0 }}</div>
                  <div class="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">Tracks</div>
                </div>
              </div>
            </div>

            <!-- Floating Countdown Badge (Phase-aware) -->
            <div class="absolute bottom-8 left-0 bg-white/90 backdrop-blur-xl rounded-[20px] border border-purple-100 shadow-lg px-5 py-3 z-30 animate-[bounce_6s_ease-in-out_infinite]">
              <div v-if="!phaseConfig.timerLabel || phase === 'done'" class="text-center">
                <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">สถานะ</div>
                <div class="text-[13px] font-black" :class="phaseConfig.timerColor">{{ phaseConfig.badge }}</div>
              </div>
              <div v-else>
                <div class="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1">{{ phaseConfig.timerLabel }}</div>
                <div class="flex items-baseline gap-1">
                  <span class="text-[22px] font-black font-['Lato']" :class="phaseConfig.timerColor">{{ countdown.days }}</span>
                  <span class="text-[10px] font-bold text-slate-400 ml-1">Days Left</span>
                </div>
              </div>
            </div>

            <!-- Floating badge: Award -->
            <div class="absolute bottom-10 right-0 bg-white/90 backdrop-blur-xl rounded-[20px] border border-purple-200 shadow-lg px-5 py-4 z-30 animate-[bounce_8s_ease-in-out_infinite_reverse]">
              <div class="flex items-center gap-2">
                <Star class="w-4 h-4 text-purple-500 fill-purple-500" />
                <div>
                  <div class="text-[10px] font-black text-purple-600 uppercase tracking-widest">Best Paper</div>
                  <div class="text-[13px] font-black text-purple-900">Award {{ conferenceYear }}</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Bottom fade -->
      <div class="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
    </div>

    <!-- ===== FEATURES ===== -->
    <div class="py-20 bg-white relative">
      <!-- Subtle top decoration -->
      <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-200 to-transparent"></div>

      <div class="max-w-6xl mx-auto px-6 lg:px-8">
        <div class="text-center mb-14">
          <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-[11px] font-black uppercase tracking-widest text-purple-600 mb-5">
            <span class="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
            Why BRICC Festival?
          </div>
          <h2 class="text-3xl sm:text-4xl font-black text-purple-950 tracking-tight">ศูนย์รวมสุดยอดงานวิจัยและนวัตกรรม</h2>
          <p class="mt-4 text-[16px] text-purple-700/60 font-semibold max-w-2xl mx-auto leading-relaxed">
            นำเสนอผลงานของคุณ แลกเปลี่ยนความรู้กับผู้เชี่ยวชาญ และร่วมเป็นส่วนหนึ่งในงานระดับนานาชาติ
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Card 1 -->
          <div class="group relative bg-gradient-to-br from-purple-50 to-white rounded-[28px] border border-purple-100 p-8 hover:border-purple-300 hover:shadow-[0_20px_50px_-10px_rgba(147,51,234,0.15)] hover:-translate-y-1.5 transition-all duration-400 cursor-default overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-purple-100/40 rounded-full blur-2xl -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-700"></div>
            <div class="relative z-10">
              <div class="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 border border-purple-100 shadow-sm group-hover:bg-purple-600 group-hover:border-purple-600 transition-colors duration-300">
                <BookOpen class="w-6 h-6 text-purple-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 class="text-xl font-black text-purple-950 mb-3 tracking-tight">{{ conferenceSettings.activeTracks.length || 5 }} Tracks หลักที่เปิดรับ</h3>
              <p v-if="!conferenceSettings.activeTracks.length" class="text-purple-700/70 font-semibold text-[14px] leading-relaxed">
                ครอบคลุมงานวิจัยด้านวิทยาศาสตร์คอมพิวเตอร์, การศึกษา, นวัตกรรม, วิศวกรรม และวิทยาศาสตร์ประยุกต์
              </p>
              <div v-else class="flex flex-wrap gap-1.5 mt-3">
                <span v-for="t in conferenceSettings.activeTracks" :key="t" class="px-2 py-1 bg-white/60 border border-purple-200 text-purple-800 rounded-md text-[10px] font-bold">{{ t }}</span>
              </div>
            </div>
          </div>

          <!-- Card 2 -->
          <div class="group relative bg-gradient-to-br from-fuchsia-50 to-white rounded-[28px] border border-fuchsia-100 p-8 hover:border-fuchsia-300 hover:shadow-[0_20px_50px_-10px_rgba(217,70,239,0.12)] hover:-translate-y-1.5 transition-all duration-400 cursor-default overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-fuchsia-100/40 rounded-full blur-2xl -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-700"></div>
            <div class="relative z-10">
              <div class="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 border border-fuchsia-100 shadow-sm group-hover:bg-fuchsia-500 group-hover:border-fuchsia-500 transition-colors duration-300">
                <Users class="w-6 h-6 text-fuchsia-500 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 class="text-xl font-black text-purple-950 mb-3 tracking-tight">เครือข่ายนักวิจัย</h3>
              <p class="text-purple-700/70 font-semibold text-[14px] leading-relaxed">
                โอกาสในการพบปะและแลกเปลี่ยนแนวคิดกับผู้เชี่ยวชาญจากสถาบันชั้นนำทั่วประเทศ
              </p>
            </div>
          </div>

          <!-- Card 3 -->
          <div class="group relative bg-gradient-to-br from-indigo-50 to-white rounded-[28px] border border-indigo-100 p-8 hover:border-indigo-300 hover:shadow-[0_20px_50px_-10px_rgba(99,102,241,0.15)] hover:-translate-y-1.5 transition-all duration-400 cursor-default overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-indigo-100/40 rounded-full blur-2xl -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-700"></div>
            <div class="relative z-10">
              <div class="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 border border-indigo-100 shadow-sm group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-colors duration-300">
                <Award class="w-6 h-6 text-indigo-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 class="text-xl font-black text-purple-950 mb-3 tracking-tight">ตีพิมพ์และรางวัล</h3>
              <p class="text-purple-700/70 font-semibold text-[14px] leading-relaxed">
                บทความที่ผ่านการคัดเลือกจะได้รับการตีพิมพ์ใน Proceeding และมีสิทธิ์ลุ้นรับรางวัล Best Paper Award
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== BOTTOM CTA ===== -->
    <div class="relative overflow-hidden bg-gradient-to-br from-purple-100 via-fuchsia-50 to-indigo-100 border-t border-purple-100 py-20 text-center">
      <div class="absolute -top-20 left-1/4 w-[300px] h-[300px] bg-purple-300/20 rounded-full blur-[70px] animate-[pulse_7s_ease-in-out_infinite] pointer-events-none"></div>
      <div class="absolute bottom-[-50px] right-1/4 w-[250px] h-[250px] bg-indigo-300/20 rounded-full blur-[60px] animate-[pulse_9s_ease-in-out_infinite_reverse] pointer-events-none"></div>

      <div class="relative z-10 max-w-2xl mx-auto px-6">
        <h2 class="text-3xl sm:text-4xl font-black text-purple-950 tracking-tight mb-4">พร้อมเริ่มต้นแล้วหรือยัง?</h2>
        <p class="text-purple-700/70 font-semibold text-[16px] mb-10 leading-relaxed">
          ลงทะเบียนฟรี เริ่มส่งบทความ และติดตามสถานะได้แบบ Real-time ผ่านระบบออนไลน์
        </p>
        <NuxtLink
          to="/register"
          class="inline-flex items-center gap-2 h-14 px-10 rounded-[24px] bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-[16px] hover:shadow-[0_12px_30px_rgba(147,51,234,0.35)] hover:-translate-y-0.5 transition-all duration-300 shadow-lg shadow-purple-300/40 group"
        >
          ลงทะเบียนฟรี
          <ArrowRight class="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </NuxtLink>
      </div>
    </div>

  </div>
</template>
