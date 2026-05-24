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

const awardType = ref('poster');
const annualQuery = ref('');
const openCertificate = ref(null);
const openAnnual = ref(null);
const isLoading = ref(true);
const myCertificates = ref([]);
const annualAwards = ref([]);
const finalistCount = ref(20);

const conferenceInfo = ref({
  theme: 'BRICC Festival',
  subtitle: 'The 10th Buriram Rajabhat Conference',
  year: '2026'
});

const annualLevelTheme = {
  champion: { label: 'ชนะเลิศ', gradient: 'from-amber-400 to-amber-600', softBg: 'bg-amber-50', softBorder: 'border-amber-200', softText: 'text-amber-800', badge: 'bg-amber-100 border-amber-300 text-amber-800' },
  runner_up_1: { label: 'รองชนะเลิศอันดับ 1', gradient: 'from-slate-350 to-slate-500', softBg: 'bg-slate-50', softBorder: 'border-slate-250', softText: 'text-slate-800', badge: 'bg-slate-100 border-slate-300 text-slate-850' },
  runner_up_2: { label: 'รองชนะเลิศอันดับ 2', gradient: 'from-orange-450 to-orange-600', softBg: 'bg-orange-50', softBorder: 'border-orange-255', softText: 'text-orange-900', badge: 'bg-orange-100 border-orange-300 text-orange-850' },
  honorable_mention: { label: 'ชมเชย', gradient: 'from-sky-400 to-indigo-500', softBg: 'bg-sky-50', softBorder: 'border-sky-200', softText: 'text-sky-850', badge: 'bg-sky-100 border-sky-300 text-sky-800' },
  finalist: { label: 'ผ่านเข้ารอบ', gradient: 'from-teal-400 to-emerald-500', softBg: 'bg-teal-50', softBorder: 'border-teal-250', softText: 'text-teal-850', badge: 'bg-teal-100 border-teal-300 text-teal-850' },
  participant: { label: 'เข้าร่วม', gradient: 'from-slate-200 to-slate-350', softBg: 'bg-slate-50', softBorder: 'border-slate-200', softText: 'text-slate-600', badge: 'bg-slate-100 border-slate-200 text-slate-600' }
};

const levelMeta = {
  champion: { title: 'รางวัลชนะเลิศ จำนวน 1 รางวัล  ได้รับโล่พระราชทานสมเด็จพระกนิษฐาธิราชเจ้า กรมสมเด็จ พระเทพรัตนราชสุดาฯ สยามบรมราชกุมารี พร้อมเกียรติบัตรและเงินรางวัลจํานวน 5,000 บาท', pill: 'bg-amber-50 border-amber-200 text-amber-700', accent: 'border-amber-200' },
  runner_up_1: { title: 'รางวัลรองชนะเลิศอันดับ 1 จำนวน 1 รางวัล ได้รับเกียรติบัตรพร้อมเงินรางวัลจํานวน 4,000 บาท', pill: 'bg-slate-50 border-slate-300 text-slate-700', accent: 'border-slate-300' },
  runner_up_2: { title: 'รางวัลรองชนะเลิศอันดับ 2 จำนวน 1 รางวัล ได้รับเกียรติบัตรพร้อมเงินรางวัลจํานวน 3,000 บาท', pill: 'bg-orange-50 border-orange-200 text-orange-700', accent: 'border-orange-200' },
  honorable_mention: { title: 'รางวัลชมเชย จำนวน 1 รางวัล ได้รับเกียรติบัตรพร้อมเงินรางวัลจํานวน 1,000 บาท', pill: 'bg-sky-50 border-sky-200 text-sky-700', accent: 'border-sky-250' },
  finalist: { title: 'ผ่านเข้ารอบ (Finalist)', pill: 'bg-teal-50 border-teal-200 text-teal-700', accent: 'border-teal-200' },
  participant: { title: 'เข้าร่วม (Participant)', pill: 'bg-slate-50 border-slate-200 text-slate-500', accent: 'border-slate-200' }
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
    // 1. Fetch System Settings
    const { data: sysData } = await supabase.from('system_settings').select('*').eq('id', 1).single();
    if (sysData?.config_json?.conference) {
      const conf = sysData.config_json.conference;
      conferenceInfo.value = {
        theme: conf.theme || conf.name || 'BRICC Festival',
        subtitle: conf.subtitle || 'The 9th Buriram Rajabhat Conference',
        year: conf.year || '2026'
      };
      finalistCount.value = conf.finalistCount || 20;
    }

    // 2. Fetch all accepted/published papers to determine ranks dynamically
    const { data: papersData } = await supabase.from('papers').select(`
      paper_id, paper_code, title_th, title_en, track, author_id, authors, abstract, status,
      review_assignments (
        phase2_total_score, phase2_completed_at
      )
    `);

    const ranked = (papersData || [])
      .map(p => {
        const phase2 = (p.review_assignments || []).filter(a => a.phase2_completed_at);
        const avg = phase2.length > 0
          ? phase2.reduce((s, a) => s + (a.phase2_total_score || 0), 0) / phase2.length : 0;
        return {
          ...p,
          avg_score: Math.round(avg * 10) / 10,
          completed: phase2.length
        };
      })
      .filter(p => p.completed > 0 || ['rejected', 'revision_required', 'format_error'].includes(p.status))
      .sort((a, b) => b.avg_score - a.avg_score);

    // 3. Find papers related to current user
    const myEmail = userProfile.value?.email || '';
    const myFirstName = userProfile.value?.first_name_th || '';
    const myLastName = userProfile.value?.last_name_th || '';
    
    // Fetch papers where user is author_id
    const myPapers = (papersData || []).filter(p => p.author_id === userProfile.value?.user_id);
    const myPaperCodes = myPapers.map(p => p.paper_code).filter(Boolean);

    // Fetch relations from paper_authors
    let paperAuthorsQuery = supabase.from('paper_authors').select('*');
    if (myEmail) {
      paperAuthorsQuery = paperAuthorsQuery.or(`email.eq.${myEmail},and(first_name.eq.${myFirstName},last_name.eq.${myLastName})`);
    } else {
      paperAuthorsQuery = paperAuthorsQuery.and(`first_name.eq.${myFirstName},last_name.eq.${myLastName}`);
    }
    const { data: myAuthorRelations } = await paperAuthorsQuery;
    
    // Collect all related paper codes
    const relatedPaperCodes = new Set([
      ...myPaperCodes,
      ...(myAuthorRelations?.map(r => r.paper_code).filter(Boolean) || [])
    ]);

    const myRelatedPapers = (papersData || []).filter(p => relatedPaperCodes.has(p.paper_code));

    // 4. Fetch list of saved certificate files in storage
    const { data: storageFiles } = await supabase.storage.from('certificates').list();
    const savedFiles = new Set(storageFiles?.map(f => f.name) || []);

    // 5. Fetch all paper_authors for annual awards listing
    const { data: authorsRes } = await supabase.from('paper_authors').select('*');
    const paperAuthorsMap = (authorsRes || []).reduce((acc, a) => {
      if (!acc[a.paper_code]) acc[a.paper_code] = [];
      const name = `${a.prefix || ''}${a.first_name || ''} ${a.last_name || ''}`.trim();
      const role = a.member_type === 'advisor' ? 'อาจารย์ที่ปรึกษา' : (a.role || 'ผู้แต่งบทความ');
      acc[a.paper_code].push({
        name,
        role,
        member_type: a.member_type,
        display_order: a.display_order || 0
      });
      return acc;
    }, {});

    // Sort authors by display_order
    for (const code of Object.keys(paperAuthorsMap)) {
      paperAuthorsMap[code].sort((a, b) => {
        if (a.member_type !== b.member_type) {
          return a.member_type === 'author' ? -1 : 1;
        }
        return a.display_order - b.display_order;
      });
    }

    const getPaperUniversity = (paperCode) => {
      const members = paperAuthorsMap[paperCode] || [];
      const primaryAuthor = members.find(m => m.member_type === 'author') || members[0];
      return primaryAuthor?.institution || '-';
    };

    // 6. Fetch public annual awards to display official trophies/medals
    const { data: publicAwards } = await supabase.from('awards').select('*');
    const awardsMap = (publicAwards || []).reduce((acc, a) => {
      acc[a.paper_code] = a;
      acc[a.paper_id] = a;
      return acc;
    }, {});

    const finalistPapers = ranked
      .filter(p => !['rejected', 'revision_required', 'format_error'].includes(p.status))
      .slice(0, finalistCount.value);
    const finalistIds = new Set(finalistPapers.map(p => p.paper_id));
    const finalistPaperCodes = new Set(finalistPapers.map(p => p.paper_code));

    if (publicAwards) {
      annualAwards.value = ranked.map((p) => {
        const award = awardsMap[p.paper_id];
        let level = 'participant';
        if (award) {
          level = award.award_type || award.level || 'participant';
          if (level === 'excellent') level = 'champion';
          if (level === 'distinguished') level = 'runner_up_1';
          if (level === 'good') level = 'runner_up_2';
        } else if (finalistIds.has(p.paper_id)) {
          level = 'finalist';
        }
        
        return {
          id: p.paper_id,
          type: 'poster',
          level: level,
          score: p.avg_score,
          articleId: p.paper_code || '-',
          title: p.title_th || p.title_en || '-',
          uni: getPaperUniversity(p.paper_code) || p.university || '-',
          track: p.track || '-',
          authors: paperAuthorsMap[p.paper_code] || p.authors || [],
          prize_money: award?.prize_money || 0,
          prize_description: award?.prize_description || ''
        };
      });
    }

    // 7. Build myCertificates list
    const certs = [];
    for (const paper of myRelatedPapers) {
      const isFinalist = finalistPaperCodes.has(paper.paper_code);
      const status = isFinalist ? 'finalist' : 'participant';
      
      const authorFile = `cert_author_${status}_${paper.paper_code}.pdf`;
      const advisorFile = `cert_advisor_${status}_${paper.paper_code}.pdf`;

      // Check author cert
      if (savedFiles.has(authorFile)) {
        const { data: { publicUrl } } = supabase.storage.from('certificates').getPublicUrl(authorFile);
        const awardEntry = awardsMap[paper.paper_code];
        let category = isFinalist ? 'ผู้แต่ง - ผ่านเข้ารอบ (Finalist)' : 'ผู้แต่ง - เข้าร่วม (Participant)';
        let title = isFinalist ? 'เกียรติบัตรผู้เสนอผลงาน (ผ่านเข้ารอบ)' : 'เกียรติบัตรผู้เสนอผลงาน (เข้าร่วม)';
        
        certs.push({
          id: `author-${paper.paper_code}`,
          kind: 'author',
          awardName: title,
          level: isFinalist ? 'finalist' : 'participant',
          ref: paper.paper_code,
          issuedAt: awardEntry?.announced_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          category: category,
          url: publicUrl
        });
      }

      // Check advisor cert
      if (savedFiles.has(advisorFile)) {
        const { data: { publicUrl } } = supabase.storage.from('certificates').getPublicUrl(advisorFile);
        const awardEntry = awardsMap[paper.paper_code];
        let category = isFinalist ? 'ที่ปรึกษา - ผ่านเข้ารอบ (Finalist)' : 'ที่ปรึกษา - เข้าร่วม (Participant)';
        let title = isFinalist ? 'เกียรติบัตรอาจารย์ที่ปรึกษา (ผ่านเข้ารอบ)' : 'เกียรติบัตรอาจารย์ที่ปรึกษา (เข้าร่วม)';
        
        certs.push({
          id: `advisor-${paper.paper_code}`,
          kind: 'advisor',
          awardName: title,
          level: isFinalist ? 'finalist' : 'participant',
          ref: paper.paper_code,
          issuedAt: awardEntry?.announced_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          category: category,
          url: publicUrl
        });
      }

      // If they won an award, display the award certificate if available
      const awardEntry = awardsMap[paper.paper_code];
      if (awardEntry && awardEntry.certificate_url) {
        let rawLevel = awardEntry.award_type || awardEntry.level || 'participant';
        let mappedLevel = rawLevel.toLowerCase();
        if (mappedLevel === 'excellent' || mappedLevel.includes('ชนะเลิศ') || mappedLevel === 'champion') mappedLevel = 'champion';
        if (mappedLevel === 'distinguished' || mappedLevel.includes('อันดับ 1') || mappedLevel === 'runner_up_1') mappedLevel = 'runner_up_1';
        if (mappedLevel === 'good' || mappedLevel.includes('อันดับ 2') || mappedLevel === 'runner_up_2') mappedLevel = 'runner_up_2';
        if (mappedLevel === 'honorable_mention' || mappedLevel.includes('ชมเชย')) mappedLevel = 'honorable_mention';

        certs.push({
          id: `award-${paper.paper_code}`,
          kind: 'award',
          awardName: `เกียรติบัตรรางวัล${annualLevelTheme[mappedLevel]?.label || ''}`,
          level: mappedLevel,
          ref: paper.paper_code,
          issuedAt: awardEntry.announced_at ? awardEntry.announced_at.split('T')[0] : new Date().toISOString().split('T')[0],
          category: 'รางวัลบทความ',
          url: awardEntry.certificate_url
        });
      }
    }
    
    myCertificates.value = certs;

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
    champion: filtered.filter((x) => x.level === 'champion'),
    runner_up_1: filtered.filter((x) => x.level === 'runner_up_1'),
    runner_up_2: filtered.filter((x) => x.level === 'runner_up_2'),
    honorable_mention: filtered.filter((x) => x.level === 'honorable_mention'),
    finalist: filtered.filter((x) => x.level === 'finalist'),
    participant: filtered.filter((x) => x.level === 'participant')
  };
});

const myAwardCerts = computed(() => myCertificates.value.filter(c => c.kind === 'award'));
const myParticipationCerts = computed(() => myCertificates.value.filter(c => c.kind === 'author' || c.kind === 'advisor'));

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
                      <div class="text-[11px] font-black text-slate-400 uppercase tracking-wider font-['Lato']">{{ cert.category }}</div>
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
            <div v-for="g in ['champion', 'runner_up_1', 'runner_up_2', 'honorable_mention', 'finalist', 'participant']" :key="g" class="space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div :class="['w-9 h-9 rounded-2xl border flex items-center justify-center shadow-sm', levelMeta[g].pill]">
                    <Award class="w-4 h-4" />
                  </div>
                  <div class="text-xs font-black text-slate-900">{{ levelMeta[g].title }}</div>
                </div>
                <div v-if="['champion', 'runner_up_1', 'runner_up_2', 'honorable_mention'].includes(g)" class="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-lg border border-amber-100">
                  รับเกียรติบัตรรางวัล
                </div>
                <div v-else-if="g === 'finalist'" class="text-[10px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-lg border border-teal-100">
                  รับเกียรติบัตรผ่านเข้ารอบ
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
        <div v-if="openAnnual" class="rounded-[32px] bg-white overflow-hidden shadow-2xl ring-1 ring-slate-100">
          <div class="px-6 py-5 flex items-center justify-between gap-3 border-b border-slate-100">
            <div class="text-sm font-black text-slate-800 tracking-wide">รายละเอียดรางวัล</div>
            <button @click="closeAllModals" class="h-9 px-4 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all text-[11px] font-black uppercase tracking-widest">ปิดหน้าต่าง</button>
          </div>

          <div class="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            <!-- Main Info Card (Minimal Light) -->
            <div :class="['rounded-[24px] border p-6 transition-colors', annualLevelTheme[openAnnual.level]?.softBg || 'bg-slate-50', annualLevelTheme[openAnnual.level]?.softBorder || 'border-slate-200']">
              <div class="flex items-center justify-between gap-4 mb-4">
                <div :class="['px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest', annualLevelTheme[openAnnual.level]?.badge || 'bg-slate-100 border-slate-200 text-slate-600']">
                  {{ (annualLevelTheme[openAnnual.level]?.label || openAnnual.level).toUpperCase() }}
                </div>
                <div class="text-[11px] font-black text-slate-400 bg-white/60 px-3 py-1 rounded-full border border-white/50">{{ openAnnual.articleId }}</div>
              </div>
              
              <div :class="['text-xl md:text-2xl font-black leading-tight mb-4', annualLevelTheme[openAnnual.level]?.softText || 'text-slate-800']">
                {{ openAnnual.title }}
              </div>
              
              <div class="grid grid-cols-2 gap-3 mb-4">
                <div class="bg-white/60 backdrop-blur-sm rounded-2xl p-3 border border-white/50">
                  <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">สาขา / Track</div>
                  <div class="text-xs font-black text-slate-800">{{ openAnnual.track || '-' }}</div>
                </div>
                <div class="bg-white/60 backdrop-blur-sm rounded-2xl p-3 border border-white/50">
                  <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">คะแนนเฉลี่ย</div>
                  <div class="text-xs font-black text-slate-800 flex items-center gap-1"><Trophy class="w-3.5 h-3.5 text-amber-500" /> {{ openAnnual.score }} / 100</div>
                </div>
              </div>

              <div class="bg-white/60 backdrop-blur-sm rounded-2xl p-3 border border-white/50 flex items-start gap-3">
                <GraduationCap class="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">สถาบัน</div>
                  <div class="text-xs font-bold text-slate-700 leading-relaxed">{{ openAnnual.uni }}</div>
                </div>
              </div>
            </div>

            <!-- Additional Prize Info (If available) -->
            <div v-if="openAnnual.prize_description" class="rounded-[24px] border border-amber-100 bg-gradient-to-br from-amber-50/50 to-orange-50/30 p-5">
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-[18px] bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <Award class="w-6 h-6" />
                </div>
                <div>
                  <div class="text-xs font-black text-amber-800 mb-1">รางวัลที่ได้รับ</div>
                  <div class="text-[13px] font-bold text-amber-700/80 leading-relaxed">{{ openAnnual.prize_description }}</div>
                  <div v-if="openAnnual.prize_money > 0" class="mt-2 text-sm font-black text-amber-600">เงินรางวัล {{ openAnnual.prize_money.toLocaleString() }} บาท</div>
                </div>
              </div>
            </div>

            <!-- Authors list -->
            <div v-if="openAnnual.authors && openAnnual.authors.length > 0" class="space-y-3">
              <div class="text-xs font-black text-slate-800 px-1 uppercase tracking-widest">ทีมวิจัย / ผู้นำเสนอ</div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div v-for="(a, idx) in openAnnual.authors" :key="idx" class="rounded-[20px] bg-slate-50 border border-slate-100 p-3 flex items-center gap-3 hover:bg-slate-100/50 hover:border-slate-200 transition-colors">
                  <div class="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 text-xs font-black flex items-center justify-center shrink-0 shadow-sm">{{ idx + 1 }}</div>
                  <div class="min-w-0">
                    <div class="text-[13px] font-black text-slate-800 truncate">{{ a.name || a }}</div>
                    <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{{ a.role || 'Author' }}</div>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
