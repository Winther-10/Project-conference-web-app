<script setup>
definePageMeta({ layout: 'portal' });
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  Download, Award, Trophy, FileText, GraduationCap, User, ChevronRight, Search
} from 'lucide-vue-next';
import { useAuth } from '~/composables/useAuth';
import { useSupabase } from '~/composables/useSupabase';

const { userProfile } = useAuth();
const supabase = useSupabase();

const profile = ref('researcher');
const awardType = ref('poster');
const annualQuery = ref('');
const openCertificate = ref(null);
const openAnnual = ref(null);
const isLoading = ref(true);
const myCertificates = ref([]);
const annualAwards = ref([]);

const conferenceInfo = ref({
  theme: 'BRICC Festival',
  subtitle: 'The 10th Buriram Rajabhat Conference',
  year: '2026'
});

const annualLevelTheme = {
  gold: { label: 'ชนะเลิศ', gradient: 'from-amber-400 to-amber-500', softBg: 'bg-amber-50', softBorder: 'border-amber-100', softText: 'text-amber-700', badge: 'bg-amber-50 border-amber-200 text-amber-700' },
  silver: { label: 'รองชนะเลิศอันดับ 1', gradient: 'from-slate-300 to-slate-400', softBg: 'bg-slate-50', softBorder: 'border-slate-100', softText: 'text-slate-700', badge: 'bg-slate-50 border-slate-200 text-slate-700' },
  bronze: { label: 'รองชนะเลิศอันดับ 2', gradient: 'from-orange-300 to-orange-400', softBg: 'bg-orange-50', softBorder: 'border-orange-100', softText: 'text-orange-700', badge: 'bg-orange-50 border-orange-200 text-orange-700' },
  qualified: { label: 'ผ่านการนำเสนอ', gradient: 'from-blue-300 to-indigo-400', softBg: 'bg-blue-50', softBorder: 'border-blue-100', softText: 'text-blue-700', badge: 'bg-blue-50 border-blue-200 text-blue-700' }
};

const levelMeta = {
  gold: { title: 'รางวัลชนะเลิศ', pill: 'bg-amber-50 border-amber-100 text-amber-700', accent: 'border-amber-100' },
  silver: { title: 'รางวัลรองชนะเลิศอันดับ 1', pill: 'bg-slate-50 border-slate-100 text-slate-700', accent: 'border-slate-100' },
  bronze: { title: 'รางวัลรองชนะเลิศอันดับ 2', pill: 'bg-orange-50 border-orange-100 text-orange-700', accent: 'border-orange-100' },
  qualified: { title: 'รายชื่อบทความที่ผ่านการนำเสนอ (อันดับ 4-20)', pill: 'bg-blue-50 border-blue-100 text-blue-700', accent: 'border-blue-100' }
};

const awardTabs = [
  { id: 'poster', label: 'Poster Presentation' }
];

const closeAllModals = () => {
  openCertificate.value = null;
  openAnnual.value = null;
};

const handleKeyDown = (e) => {
  if (e.key === 'Escape') closeAllModals();
};

onMounted(async () => {
  window.addEventListener('keydown', handleKeyDown);
  await fetchData();
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

const fetchData = async () => {
  isLoading.value = true;
  try {
    // Fetch System Settings
    const { data: sysData } = await supabase.from('system_settings').select('*').eq('id', 1).single();
    if (sysData?.config_json?.conference) {
      const conf = sysData.config_json.conference;
      conferenceInfo.value = {
        theme: conf.theme || 'BRICC Festival',
        subtitle: conf.subtitle || 'The 10th Buriram Rajabhat Conference',
        year: conf.year || '2026'
      };
    }

    // 1. Fetch user's papers to know which awards belong to them
    const { data: myPapers } = await supabase.from('papers').select('paper_id, paper_code').eq('author_id', userProfile.value?.user_id);
    const myPaperIds = myPapers?.map(p => p.paper_id) || [];

    // 2. Fetch public annual awards
    const { data: publicAwards } = await supabase.from('awards').select('*').order('phase2_avg_score', { ascending: false });
    
    if (publicAwards) {
      annualAwards.value = publicAwards.map(a => {
        let rawLevel = a.award_type || a.level || 'qualified';
        let mappedLevel = rawLevel.toLowerCase();
        if (mappedLevel === 'excellent' || mappedLevel.includes('ชนะเลิศ')) mappedLevel = 'gold';
        if (mappedLevel === 'distinguished' || mappedLevel.includes('อันดับ 1')) mappedLevel = 'silver';
        if (mappedLevel === 'good' || mappedLevel.includes('อันดับ 2')) mappedLevel = 'bronze';

        return {
          ...a,
          id: a.id,
          type: a.type || 'poster',
          level: mappedLevel,
          score: a.phase2_avg_score || 0,
          articleId: a.paper_code || a.article_id || '-',
          title: a.title_th || a.title || '-',
          uni: a.university || '-',
          track: a.track || '-',
          authors: a.authors || []
        };
      });

      // 3. Match my awards and participation certs
      const certs = [];
      const myFullName = `${userProfile.value?.first_name_th} ${userProfile.value?.last_name_th}`.trim();

      // Filter public awards to find those related to me
      const myRelatedAwards = publicAwards.filter(a => {
        const isAuthor = myPaperIds.includes(a.paper_id);
        const isCoAuthor = a.authors?.some(name => name && name.trim().includes(myFullName));
        return isAuthor || isCoAuthor;
      });

      myRelatedAwards.forEach(a => {
        let rawLevel = a.award_type || a.level || 'qualified';
        let mappedLevel = rawLevel.toLowerCase();
        if (mappedLevel === 'excellent' || mappedLevel.includes('ชนะเลิศ')) mappedLevel = 'gold';
        if (mappedLevel === 'distinguished' || mappedLevel.includes('อันดับ 1')) mappedLevel = 'silver';
        if (mappedLevel === 'good' || mappedLevel.includes('อันดับ 2')) mappedLevel = 'bronze';

        const isAward = ['gold', 'silver', 'bronze'].includes(mappedLevel);
        
        // 1. Add Award Certificate if exists
        if (isAward && a.certificate_url) {
          certs.push({
            id: `award-${a.id}`,
            kind: 'award',
            awardName: annualLevelTheme[mappedLevel]?.label ? `${annualLevelTheme[mappedLevel].label} Paper` : 'Award Certificate',
            level: mappedLevel,
            ref: a.paper_code || '-',
            issuedAt: a.announced_at ? a.announced_at.split('T')[0] : new Date().toISOString().split('T')[0],
            category: 'รางวัลบทความ',
            url: a.certificate_url
          });
        }

        // 2. Add Participation Certificate if saved to cloud
        // We use a convention: if award entry exists, they ARE qualified for participation
        // But we only show it if the admin has saved the participant cert
        const partFileName = `cert_participant_${a.paper_code}.pdf`;
        const { data: { publicUrl } } = supabase.storage.from('certificates').getPublicUrl(partFileName);
        
        // Note: Currently we don't have a separate DB column for participant URL, 
        // so we show it if the award entry exists (meaning they are announced).
        certs.push({
          id: `part-${a.id}`,
          kind: 'participation',
          awardName: 'Participation Certificate',
          level: 'qualified',
          ref: a.paper_code || '-',
          issuedAt: a.announced_at ? a.announced_at.split('T')[0] : new Date().toISOString().split('T')[0],
          category: 'ผู้เข้าร่วม',
          url: publicUrl
        });
      });
      myCertificates.value = certs;
    }
  } catch (error) {
    console.error(error);
  } finally {
    isLoading.value = false;
  }
};

const groupedAnnual = computed(() => {
  const q = annualQuery.value.trim().toLowerCase();
  const filtered = annualAwards.value
    .filter((x) => x.type === awardType.value)
    .filter((x) => {
      if (!q) return true;
      return `${x.articleId} ${x.title} ${x.uni}`.toLowerCase().includes(q);
    });
  return {
    gold: filtered.filter((x) => x.level === 'gold'),
    silver: filtered.filter((x) => x.level === 'silver'),
    bronze: filtered.filter((x) => x.level === 'bronze'),
    qualified: filtered.filter((x) => !['gold', 'silver', 'bronze'].includes(x.level))
  };
});

const myAwardCerts = computed(() => myCertificates.value.filter(c => c.kind === 'award'));
const myParticipationCerts = computed(() => myCertificates.value.filter(c => c.kind === 'participation'));

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

const formatThaiDate = (d) => {
  if (!d) return '-';
  const date = typeof d === 'string' ? new Date(d) : d;
  const day = date.getDate();
  const month = date.toLocaleString('th-TH', { month: 'long' });
  const year = date.getFullYear() + 543;
  return `${day} ${month} ${year}`;
};

const makeCertificateSvg = ({ accent = '#F59E0B', title, subtitle, name, awardName, ref }) => {
  const esc = (s) => String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const safeTitle = esc(title);
  const safeSubtitle = esc(subtitle);
  const safeName = esc(name);
  const safeAwardName = esc(awardName);
  const safeRef = esc(ref);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#f8fafc"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="1200" height="800" rx="40" fill="url(#bg)"/>
  <rect x="60" y="60" width="1080" height="680" rx="34" fill="#ffffff" stroke="${accent}" stroke-width="10"/>
  <path d="M110 150h120v10H110z" fill="${accent}" opacity="0.9"/>
  <path d="M110 150h10v120h-10z" fill="${accent}" opacity="0.9"/>
  <path d="M1090 650h-120v-10h120z" fill="${accent}" opacity="0.9"/>
  <path d="M1090 650h-10v-120h10z" fill="${accent}" opacity="0.9"/>

  <g transform="translate(600 165)">
    <circle r="34" fill="none" stroke="${accent}" stroke-width="8"/>
    <path d="M-18 40l18 32 18-32" fill="${accent}" opacity="0.9"/>
    <path d="M-10 40l10 18 10-18" fill="#ffffff" opacity="0.9"/>
  </g>

  <text x="600" y="270" text-anchor="middle" font-family="Inter, Arial" font-size="56" font-weight="800" fill="#0f172a">${safeTitle}</text>
  <text x="600" y="315" text-anchor="middle" font-family="Inter, Arial" font-size="20" font-weight="600" fill="#64748b">${safeSubtitle}</text>

  <rect x="270" y="365" width="660" height="70" rx="18" fill="#f1f5f9" stroke="#e2e8f0"/>
  <text x="600" y="413" text-anchor="middle" font-family="Inter, Arial" font-size="34" font-weight="900" fill="#0f172a">${safeName}</text>

  <text x="600" y="485" text-anchor="middle" font-family="Inter, Arial" font-size="18" font-weight="700" fill="#64748b">for receiving the</text>
  <text x="600" y="535" text-anchor="middle" font-family="Inter, Arial" font-size="36" font-weight="900" fill="${accent}">“ ${safeAwardName} ”</text>
  <text x="600" y="575" text-anchor="middle" font-family="Inter, Arial" font-size="18" font-weight="700" fill="#64748b">${conferenceInfo.value.theme} ${conferenceInfo.value.year}</text>

  <line x1="240" y1="650" x2="460" y2="650" stroke="#cbd5e1" stroke-width="2"/>
  <line x1="740" y1="650" x2="960" y2="650" stroke="#cbd5e1" stroke-width="2"/>
  <text x="350" y="678" text-anchor="middle" font-family="Inter, Arial" font-size="14" font-weight="700" fill="#64748b">Conference Chair</text>
  <text x="850" y="678" text-anchor="middle" font-family="Inter, Arial" font-size="14" font-weight="700" fill="#64748b">Dean of Science</text>

  <text x="600" y="720" text-anchor="middle" font-family="Inter, Arial" font-size="14" font-weight="700" fill="#94a3b8">Reference: ${safeRef}</text>
</svg>`;
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 overflow-y-auto w-full custom-scrollbar animate-in fade-in duration-500 font-sans">
    <div class="bg-white/80 backdrop-blur-xl border-b border-white shadow-sm sticky top-0 z-10 w-full">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center shadow-sm border border-amber-100">
              <Trophy class="w-6 h-6 text-amber-500" />
            </div>
            <div class="min-w-0">
              <div class="text-[20px] font-black text-slate-900 tracking-tight">รางวัลและเกียรติบัตร</div>
              <div class="text-[13px] font-bold text-slate-500 mt-0.5 truncate">{{ conferenceInfo.subtitle }} ในงาน {{ conferenceInfo.theme }} {{ conferenceInfo.year }}</div>
            </div>
          </div>

          <div class="flex items-center gap-3 flex-shrink-0 bg-slate-100/50 p-1 rounded-[18px] border border-slate-200">
            <button
              @click="profile = 'undergrad'"
              :class="[
                'h-10 px-5 rounded-2xl text-[13px] font-black inline-flex items-center gap-2 transition-all duration-300',
                profile === 'undergrad' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              ]"
            >
              <GraduationCap class="w-4 h-4" /> ป.ตรี
            </button>
            <button
              @click="profile = 'researcher'"
              :class="[
                'h-10 px-5 rounded-2xl text-[13px] font-black inline-flex items-center gap-2 transition-all duration-300',
                profile === 'researcher' ? 'bg-white text-amber-600 shadow-sm border border-slate-200/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              ]"
            >
              <User class="w-4 h-4" /> นักวิจัย
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
      <div v-if="isLoading" class="p-16 flex justify-center">
        <div class="w-12 h-12 rounded-2xl border-4 border-slate-100 border-t-amber-500 animate-spin"></div>
      </div>
      <div v-else class="space-y-10">
        <div class="space-y-5">
          <div class="text-[17px] font-black text-slate-900 tracking-tight">รางวัลของฉัน</div>

          <div v-if="myCertificates.length === 0" class="p-12 text-center text-slate-500 font-bold bg-white/80 backdrop-blur-xl rounded-[28px] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            คุณยังไม่มีเกียรติบัตรหรือรางวัล
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            <div v-for="cert in myAwardCerts" :key="cert.id" class="rounded-[28px] border border-white bg-white/90 backdrop-blur-xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300 group">
              <div class="p-5">
                <div class="flex items-start gap-5">
                  <div :class="['w-14 h-14 rounded-2xl border flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300', annualLevelTheme[cert.level]?.softBg || 'bg-amber-50', annualLevelTheme[cert.level]?.softBorder || 'border-amber-100']">
                    <Trophy :class="annualLevelTheme[cert.level]?.softText || 'text-amber-500'" class="w-7 h-7" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="inline-flex items-center gap-2">
                      <div :class="['px-2.5 py-0.5 rounded-full text-white text-[10px] font-black tracking-widest uppercase border', annualLevelTheme[cert.level]?.gradient ? 'bg-gradient-to-br ' + annualLevelTheme[cert.level].gradient : 'bg-amber-500']">
                        AWARD
                      </div>
                      <div class="text-[11px] font-black text-slate-400 uppercase tracking-wider font-['Lato']">{{ profile === 'undergrad' ? 'Undergrad' : 'Researcher' }}</div>
                    </div>
                    <div class="mt-3 text-[19px] font-black text-slate-900 leading-tight transition-colors" :class="annualLevelTheme[cert.level]?.softText ? 'group-hover:' + annualLevelTheme[cert.level].softText : 'group-hover:text-amber-700'">{{ cert.awardName }}</div>
                    <div class="mt-2 text-[12px] font-bold text-slate-500 tracking-wider font-['Lato']">REF: {{ cert.ref }}</div>
                  </div>
                </div>

                <a
                  :href="cert.url"
                  target="_blank"
                  :class="['mt-6 h-12 w-full rounded-[20px] text-white text-[14px] font-black hover:shadow-lg active:scale-[0.98] transition-all duration-300 inline-flex items-center justify-center gap-2', annualLevelTheme[cert.level]?.gradient ? 'bg-gradient-to-r ' + annualLevelTheme[cert.level].gradient + ' hover:opacity-90' : 'bg-amber-500 hover:bg-amber-600']"
                >
                  <Download class="w-5 h-5" />
                  ดาวน์โหลดเกียรติบัตรรางวัล
                </a>
              </div>
            </div>

            <div v-for="cert in myParticipationCerts" :key="cert.id" class="rounded-[28px] border border-white bg-white/90 backdrop-blur-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 group">
              <div class="flex items-start gap-5">
                <div class="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-50 group-hover:border-blue-200 transition-colors duration-300">
                  <FileText class="w-6 h-6 text-slate-500 group-hover:text-blue-600 transition-colors duration-300" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-[16px] font-black text-slate-900 group-hover:text-blue-700 transition-colors">{{ cert.awardName }}</div>
                  <div class="mt-1 text-[13px] font-bold text-slate-500">สำหรับผู้เข้าร่วมงานประชุม (Participation)</div>
                  <a
                    :href="cert.url"
                    target="_blank"
                    class="mt-5 h-11 w-full rounded-[18px] bg-slate-50 border border-slate-200 text-slate-700 text-[13px] font-black hover:bg-white hover:border-blue-300 hover:text-blue-700 hover:shadow-md transition-all duration-300 inline-flex items-center justify-center gap-2"
                  >
                    <Download class="w-4 h-4" />
                    ดาวน์โหลด (PDF)
                  </a>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div class="space-y-6 pt-4">
          <div class="text-[17px] font-black text-slate-900 tracking-tight">ประกาศผลรางวัลประจำปี</div>

          <div class="rounded-[28px] border border-white bg-white/80 backdrop-blur-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div class="text-[13px] font-bold text-slate-500">ประเภทการนำเสนอ</div>
            <div class="mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button
                v-for="t in awardTabs"
                :key="t.id"
                @click="awardType = t.id"
                :class="[
                  'h-11 px-6 rounded-[18px] text-[14px] font-black whitespace-nowrap transition-all duration-300 border',
                  awardType === t.id ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                ]"
              >
                {{ t.label }}
              </button>
            </div>
          </div>

          <div class="relative group">
            <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
            <input
              v-model="annualQuery"
              class="w-full h-14 pl-12 pr-4 rounded-[24px] bg-white border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-[15px] font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100/50 transition-all placeholder:font-medium"
              placeholder="ค้นหาบทความ/สถาบัน..."
            />
          </div>

          <div class="space-y-8">
            <div v-for="g in ['gold', 'silver', 'bronze', 'qualified']" :key="g" class="space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div :class="['w-9 h-9 rounded-2xl border flex items-center justify-center shadow-sm', levelMeta[g].pill]">
                    <Award class="w-4 h-4" />
                  </div>
                  <div class="text-xs font-black text-slate-900">{{ levelMeta[g].title }}</div>
                </div>
                <div v-if="['gold', 'silver', 'bronze'].includes(g)" class="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-lg border border-amber-100">
                  รับเกียรติบัตร 2 ฉบับ
                </div>
                <div v-else class="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-lg border border-blue-100">
                  รับเกียรติบัตรเข้าร่วม
                </div>
              </div>

              <div class="space-y-2">
                <div v-if="groupedAnnual[g].length === 0" class="rounded-3xl border border-slate-200 bg-white p-4 text-xs font-semibold text-slate-500">
                  ไม่มีรายการ
                </div>
                <div
                  v-else
                  v-for="w in groupedAnnual[g]"
                  :key="w.id"
                  @click="openAnnual = w"
                  @keydown.enter="openAnnual = w"
                  @keydown.space.prevent="openAnnual = w"
                  tabindex="0"
                  :class="['rounded-3xl border bg-white p-4 cursor-pointer hover:shadow-sm hover:-translate-y-[1px] transition-all', levelMeta[g].accent]"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="inline-flex items-center gap-2">
                        <div class="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-700">
                          {{ awardType.toUpperCase() }} PRESENTATION
                        </div>
                        <div class="text-[10px] font-black text-slate-500">{{ w.articleId }}</div>
                      </div>
                      <div class="mt-2 text-sm font-black text-slate-900 line-clamp-2">{{ w.title }}</div>
                      <div class="mt-1 text-xs font-semibold text-slate-600">{{ w.uni }}</div>
                      <div class="mt-2 flex items-center gap-2">
                        <div class="text-[11px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100 inline-flex items-center gap-1.5">
                          <Star class="w-3 h-3" />
                          คะแนนเฉลี่ย: {{ w.score }}
                        </div>
                      </div>
                    </div>
                    <ChevronRight class="w-5 h-5 text-slate-400 flex-shrink-0 mt-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <div
      v-if="openCertificate || openAnnual"
      class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      @mousedown.self="closeAllModals"
    >
      <div class="w-full max-w-2xl">
        <!-- Certificate Modal -->
        <div v-if="openCertificate" class="rounded-3xl bg-slate-900 text-white overflow-hidden shadow-xl">
          <div
            class="px-5 py-4 flex items-center justify-between gap-3"
            :style="{ background: openCertificate.kind === 'participation' ? `linear-gradient(135deg, ${openCertificate.accent} 0%, ${openCertificate.accent2 || openCertificate.accent} 100%)` : `linear-gradient(135deg, ${openCertificate.accent} 0%, #F97316 100%)` }"
          >
            <div class="min-w-0">
              <div class="text-sm font-black truncate">เกียรติบัตร</div>
              <div class="mt-0.5 text-[11px] font-semibold text-white/90 truncate">
                {{ openCertificate.kind === 'participation' ? 'Certificate of Participation' : 'Award Certificate' }}
              </div>
            </div>
            <button @click="closeAllModals" class="h-9 px-3 rounded-2xl bg-white/10 hover:bg-white/15 transition-colors text-xs font-black">ปิด</button>
          </div>

          <div class="px-5 pb-5 space-y-4 pt-4">
            <div class="rounded-3xl bg-white/5 border border-white/10 p-6 text-center">
              <div class="w-20 h-20 rounded-[28px] bg-white/10 flex items-center justify-center mx-auto mb-6 border border-white/20 shadow-xl">
                <FileText :size="32" class="text-white" />
              </div>
              <h3 class="text-lg font-black text-white">พร้อมสำหรับการดาวน์โหลด</h3>
              <p class="text-xs font-medium text-white/60 mt-2">คุณสามารถดาวน์โหลดเกียรติบัตรฉบับสมบูรณ์ในรูปแบบ PDF หรือบันทึกเป็นรูปภาพได้จากปุ่มด้านล่าง</p>
            </div>

            <div class="rounded-3xl bg-white/10 border border-white/10 p-4">
              <div class="flex items-center justify-between gap-3">
                <div class="text-xs font-black">รายละเอียด</div>
                <div class="px-2.5 py-1 rounded-full text-[10px] font-black border border-white/20 bg-white/10">
                  {{ openCertificate.kind === 'participation' ? 'PARTICIPATION' : 'AWARD' }}
                </div>
              </div>
              <div class="mt-3 grid grid-cols-2 gap-3">
                <div class="rounded-2xl bg-white/5 border border-white/10 p-3">
                  <div class="text-[10px] font-black text-slate-300">ประเภท</div>
                  <div class="mt-1 text-xs font-black text-white">{{ openCertificate.category }}</div>
                </div>
                <div class="rounded-2xl bg-white/5 border border-white/10 p-3">
                  <div class="text-[10px] font-black text-slate-300">วันที่ออก</div>
                  <div class="mt-1 text-xs font-black text-white">{{ formatThaiDate(openCertificate.issuedAt) }}</div>
                </div>
                <div class="rounded-2xl bg-white/5 border border-white/10 p-3 col-span-2">
                  <div class="text-[10px] font-black text-slate-300">รหัสอ้างอิง</div>
                  <div class="mt-1 text-xs font-black text-white">{{ openCertificate.ref }}</div>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                @click="() => {
                  const content = `BRICC Conference 2026\n${openCertificate.title}\n\nPresented to: ${openCertificate.name}\nAward: ${openCertificate.awardName}\nIssued: ${formatThaiDate(openCertificate.issuedAt)}\nReference: ${openCertificate.ref}\n`;
                  downloadBlob(`${openCertificate.ref}.pdf`, 'application/pdf', content);
                }"
                :class="['h-11 rounded-2xl text-sm font-black transition-colors inline-flex items-center justify-center gap-2', openCertificate.kind === 'participation' ? 'bg-blue-500 text-white hover:bg-blue-400' : 'bg-amber-400 text-slate-900 hover:bg-amber-300']"
              >
                <Download class="w-5 h-5" />
                ดาวน์โหลด PDF
              </button>

              <button
                @click="() => {
                  const svg = makeCertificateSvg(openCertificate);
                  downloadBlob(`${openCertificate.ref}.svg`, 'image/svg+xml;charset=utf-8', svg);
                }"
                class="h-11 rounded-2xl bg-white/10 border border-white/10 text-white text-sm font-black hover:bg-white/15 transition-colors"
              >
                บันทึกรูปภาพ
              </button>
            </div>
          </div>
        </div>

        <!-- Annual Award Modal -->
        <div v-if="openAnnual" class="rounded-3xl bg-white overflow-hidden shadow-xl">
          <div class="px-5 py-4 flex items-center justify-between gap-3 border-b border-slate-200">
            <div class="text-sm font-black text-slate-900 truncate">รายละเอียดรางวัล</div>
            <button @click="closeAllModals" class="h-9 px-3 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 transition-colors text-xs font-black">ปิด</button>
          </div>

          <div class="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            <div :class="['rounded-3xl bg-gradient-to-br text-white p-5', annualLevelTheme[openAnnual.level]?.gradient || 'from-amber-500 to-orange-500']">
              <div class="inline-flex items-center gap-2">
                <div class="px-3 py-1 rounded-full bg-white/15 border border-white/25 text-[10px] font-black">
                  {{ (annualLevelTheme[openAnnual.level]?.label || openAnnual.level).toUpperCase() }} {{ openAnnual.type.toUpperCase() }}
                </div>
                <div class="text-[10px] font-black text-white/90">{{ openAnnual.articleId }}</div>
              </div>
              <div class="mt-3 text-lg font-black leading-snug">“ {{ openAnnual.title }} ”</div>
              <div class="mt-3 flex items-center gap-4">
                <div class="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/30 text-xs font-black">คะแนนเฉลี่ย: {{ openAnnual.score }}</div>
                <div class="text-xs font-semibold text-white/90">สาขา: {{ openAnnual.track || '-' }} </div>
              </div>
              <div class="mt-2 text-xs font-semibold text-white/80">สถาบัน: {{ openAnnual.uni }}</div>
            </div>

            <div v-if="openAnnual.authors && openAnnual.authors.length > 0" class="rounded-3xl border border-slate-200 bg-white p-4">
              <div class="text-xs font-black text-slate-900">ทีมวิจัย/ผู้นำเสนอ</div>
              <div class="mt-3 space-y-2">
                <div v-for="(a, idx) in openAnnual.authors" :key="idx" class="rounded-2xl bg-slate-50 border border-slate-200 p-3 flex items-center gap-3">
                  <div class="w-7 h-7 rounded-full bg-slate-200 text-slate-700 text-xs font-black flex items-center justify-center flex-shrink-0">{{ idx + 1 }}</div>
                  <div class="min-w-0">
                    <div class="text-xs font-black text-slate-900 truncate">{{ a.name || a }}</div>
                    <div class="text-[11px] font-semibold text-slate-500 truncate">{{ a.role || 'Author' }}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-3">
              <button @click="closeAllModals" class="h-11 rounded-2xl bg-white border border-slate-200 text-slate-900 text-sm font-black hover:bg-slate-50 transition-colors">
                กลับไปดูรายการ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
