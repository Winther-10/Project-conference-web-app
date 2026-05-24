<script setup>
definePageMeta({ layout: 'portal' });
import { ref, computed, onMounted } from 'vue';
import { ChevronDown, Download, Info, CheckCircle2, XCircle, TrendingUp, Users, FileText, Mic, BarChart2, Building2 } from 'lucide-vue-next';
import { useSupabase } from '~/composables/useSupabase';

const supabase = useSupabase();

const currentYear = String(new Date().getFullYear());
const year = ref(currentYear);
const dataByYear = ref({});
const availableYears = ref([currentYear]);
const isLoading = ref(true);

onMounted(async () => {
  await fetchStatistics();
});

const fetchStatistics = async () => {
  isLoading.value = true;
  try {
    // Try to fetch historical statistics from a dedicated table if it exists
    const { data, error } = await supabase.from('conference_statistics').select('*');
    
    const statsMap = {};
    if (data && data.length > 0) {
      data.forEach(row => {
        statsMap[row.year.toString()] = {
          yearLabel: `${row.year}`,
          participants: { value: row.participants_count || 0, delta: row.participants_delta || 0 },
          papers: { value: row.papers_count || 0, note: row.papers_note || '' },
          speakers: { value: row.speakers_count || 0 },
          acceptance: { accepted: row.accepted_rate || 0, rejected: 100 - (row.accepted_rate || 0) },
          tracks: row.tracks_data || [], // e.g. [{id: 'cs', label: 'CS', value: 50}]
          satisfaction: row.satisfaction_score || 0
        };
      });
    }

    // Always aggregate current year from actual tables to ensure real-time accuracy
    const startOfYear = new Date(`${currentYear}-01-01T00:00:00.000Z`).toISOString();
    const endOfYear = new Date(`${currentYear}-12-31T23:59:59.999Z`).toISOString();

    // PUBLISHED PAPERS: count only 'published'
    const { count: publishedCount } = await supabase.from('papers').select('*', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('created_at', startOfYear).lte('created_at', endOfYear);
      
    // Total submitted for acceptance rate
    const { count: totalSubmittedCount } = await supabase.from('papers').select('*', { count: 'exact', head: true })
      .gte('created_at', startOfYear).lte('created_at', endOfYear);
      
    const { count: acceptedCount } = await supabase.from('papers').select('*', { count: 'exact', head: true })
      .in('status', ['accepted', 'published'])
      .gte('created_at', startOfYear).lte('created_at', endOfYear);
      
    // PARTICIPANTS: count only 'author' role
    const { count: authorsCount } = await supabase.from('users').select('*', { count: 'exact', head: true })
      .eq('role', 'author')
      .gte('created_at', startOfYear).lte('created_at', endOfYear);

    // Get unique institutions
    const { data: usersData } = await supabase.from('users').select('institution')
      .gte('created_at', startOfYear).lte('created_at', endOfYear);
    const uniqueInstitutions = new Set(usersData?.map(u => u.institution).filter(Boolean)).size;

    const acceptanceRate = totalSubmittedCount > 0 ? Math.round((acceptedCount / totalSubmittedCount) * 100) : 0;
    
    const { data: papersData } = await supabase.from('papers').select('track')
      .gte('created_at', startOfYear).lte('created_at', endOfYear);
    let trackCounts = {};
    if (papersData) {
      papersData.forEach(p => {
        const t = p.track || 'General';
        trackCounts[t] = (trackCounts[t] || 0) + 1;
      });
    }
    const trackArr = Object.keys(trackCounts).map((k, i) => ({ id: `t${i}`, label: k, value: trackCounts[k] })).sort((a,b) => b.value - a.value);

    statsMap[currentYear] = {
      yearLabel: `${currentYear} (ปีปัจจุบัน)`,
      participants: { value: authorsCount || 0, delta: 0 },
      papers: { value: publishedCount || 0, note: 'ตีพิมพ์ในรายงานการประชุม (Proceedings)' },
      institutions: { value: uniqueInstitutions || 0 }, 
      acceptance: { accepted: acceptanceRate, rejected: 100 - acceptanceRate },
      tracks: trackArr.length > 0 ? trackArr : [{ id: 'cs', label: 'General', value: totalSubmittedCount || 0 }],
      satisfaction: 0
    };

    dataByYear.value = statsMap;
    availableYears.value = Object.keys(statsMap).sort((a, b) => b.localeCompare(a));
    if (!availableYears.value.includes(year.value) && availableYears.value.length > 0) {
      year.value = availableYears.value[0];
    }
  } catch (err) {
    console.error(err);
  } finally {
    isLoading.value = false;
  }
};

const currentData = computed(() => {
  return dataByYear.value[year.value] || {
    yearLabel: year.value,
    participants: { value: 0, delta: 0 },
    papers: { value: 0, note: '' },
    institutions: { value: 0 },
    acceptance: { accepted: 0, rejected: 0 },
    tracks: [],
    satisfaction: 0
  };
});

const maxTrack = computed(() => {
  return Math.max(...(currentData.value.tracks || []).map((t) => t.value), 1);
});

const generatePdf = async () => {
  try {
    isLoading.value = true;
    const { jsPDF } = await import('jspdf');
    const autoTableModule = await import('jspdf-autotable');
    const autoTable = autoTableModule.default || autoTableModule.autoTable || autoTableModule;

    const doc = new jsPDF();
    
    // Helper to get base64
    const getBase64 = async (url) => {
      const res = await fetch(url);
      if (!res.ok) return null;
      const buffer = await res.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    };

    // Load Fonts
    const fontRegularBase64 = await getBase64('/fonts/Sarabun-Regular.ttf');
    const fontBoldBase64 = await getBase64('/fonts/Sarabun-Bold.ttf');
    
    if (fontRegularBase64) {
      doc.addFileToVFS('Sarabun-Regular.ttf', fontRegularBase64);
      doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
    }
    if (fontBoldBase64) {
      doc.addFileToVFS('Sarabun-Bold.ttf', fontBoldBase64);
      doc.addFont('Sarabun-Bold.ttf', 'Sarabun', 'bold');
    }
    
    doc.setFont('Sarabun', 'normal');

    // Load Logos
    const logoUni = await getBase64('/images/rajabhat_bru_logo.png');
    const logoFac = await getBase64('/images/SCI-BRU-Logo.png');

    // Header with Centered Logos
    let logoStartY = 10;
    let logoHeight = 25;
    let gap = 8;
    let totalLogosWidth = 0;
    let w1 = 0, w2 = 0;

    if (logoUni) {
      const props = doc.getImageProperties(logoUni);
      w1 = (props.width * logoHeight) / props.height;
      totalLogosWidth += w1;
    }
    if (logoFac) {
      const props = doc.getImageProperties(logoFac);
      w2 = (props.width * logoHeight) / props.height;
      totalLogosWidth += w2;
    }
    if (logoUni && logoFac) totalLogosWidth += gap;

    let startX = (210 - totalLogosWidth) / 2;

    if (logoUni) {
      doc.addImage(logoUni, 'PNG', startX, logoStartY, w1, logoHeight);
      startX += w1 + gap;
    }
    if (logoFac) {
      // Adjust faculty logo y slightly if needed for alignment, but usually same height works
      doc.addImage(logoFac, 'PNG', startX, logoStartY, w2, logoHeight);
    }

    doc.setFontSize(20);
    doc.setFont('Sarabun', 'bold');
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(`รายงานสรุปสถิติการประชุมวิชาการ`, 105, 48, { align: 'center' });
    doc.setFontSize(16);
    doc.text(`ประจำปี ${year.value}`, 105, 58, { align: 'center' });
    
    // Line separator
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 65, 195, 65);

    // Key Metrics Section
    doc.setFontSize(14);
    doc.setFont('Sarabun', 'bold');
    doc.setTextColor(147, 51, 234); // purple-600
    doc.text('ภาพรวมความสำเร็จ (Key Metrics)', 15, 75);
    
    doc.setFontSize(12);
    doc.setFont('Sarabun', 'normal');
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(`• สถาบันที่เข้าร่วม (Institutions)  ${currentData.value.institutions?.value || currentData.value.speakers?.value || 0} สถาบัน`, 20, 85);
    doc.text(`• บทความที่ตีพิมพ์ (Published Papers)  ${currentData.value.papers.value} บทความ`, 20, 93);
    doc.text(`• ผู้เข้าร่วมงาน (Participants)  ${currentData.value.participants.value} คน`, 20, 101);
    doc.text(`• อัตราการตอบรับบทความ (Acceptance Rate)  ${currentData.value.acceptance.accepted}%`, 20, 109);
    
    if (currentData.value.tracks && currentData.value.tracks.length > 0) {
      doc.setFontSize(14);
      doc.setFont('Sarabun', 'bold');
      doc.setTextColor(147, 51, 234);
      doc.text('การกระจายตัวของบทความแยกตามสาขา (Tracks)', 15, 125);
      
      const trackData = currentData.value.tracks.map(t => [t.label, `${t.value} บทความ`]);
      autoTable(doc, {
        startY: 132,
        head: [['สาขาวิชา (Track)', 'จำนวนบทความ (Papers)']],
        body: trackData,
        styles: { font: 'Sarabun', fontStyle: 'normal', fontSize: 11, textColor: [71, 85, 105] },
        headStyles: { fillColor: [147, 51, 234], textColor: [255, 255, 255], font: 'Sarabun', fontStyle: 'bold' },
        theme: 'grid'
      });
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFontSize(10);
    doc.setFont('Sarabun', 'normal');
    doc.setTextColor(148, 163, 184);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`หน้า ${i} จาก ${pageCount}`, 105, 285, { align: 'center' });
      doc.text('สถาบันวิจัยและพัฒนา มหาวิทยาลัยราชภัฏบุรีรัมย์', 105, 290, { align: 'center' });
    }
    
    doc.save(`BRICC-Statistics-${year.value}.pdf`);
  } catch (err) {
    console.error('PDF Generation Error:', err);
    alert('ไม่สามารถสร้างไฟล์ PDF ได้ กรุณาลองใหม่อีกครั้ง');
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="flex-1 overflow-y-auto px-6 pt-8 pb-32 custom-scrollbar animate-in fade-in duration-300 bg-[#F1F5F9]">
    <div class="max-w-7xl mx-auto w-full">
      <header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-7">
        <div class="min-w-0">
          <div class="text-2xl font-black text-slate-900 truncate flex items-center gap-2"><BarChart2 class="w-6 h-6 text-purple-600" /> สถิติการประชุมย้อนหลัง (Conference Statistics)</div>
          <div class="mt-1 text-sm font-semibold text-slate-500 truncate">ข้อมูลสถิติเพื่อยืนยันคุณภาพและความสำเร็จของงานประชุม</div>
        </div>

        <div class="flex items-center gap-3">
          <div class="text-xs font-black text-slate-500">เลือกดูข้อมูลปี:</div>
          <div class="relative">
            <select
              v-model="year"
              class="h-11 pl-4 pr-10 rounded-2xl bg-white border border-slate-200 text-sm font-black text-slate-800 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 appearance-none"
            >
              <option v-for="y in availableYears" :key="y" :value="y">
                {{ dataByYear[y]?.yearLabel || y }}
              </option>
            </select>
            <ChevronDown class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          </div>
        </div>
      </header>

      <div v-if="isLoading" class="p-12 text-center bg-white rounded-3xl border border-slate-200">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <div class="mt-4 text-sm font-bold text-slate-500">กำลังประมวลผลข้อมูลสถิติ...</div>
      </div>
      
      <div v-else>
        <section class="space-y-4">
          <div class="text-lg font-black text-slate-900 flex items-center gap-2"><TrendingUp class="w-5 h-5 text-indigo-500" /> ภาพรวมความสำเร็จ (Key Metrics)</div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="rounded-3xl bg-white border border-slate-200 p-5">
              <div class="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <Building2 class="w-3.5 h-3.5" /> INSTITUTIONS
              </div>
              <div class="mt-2 flex items-end justify-between gap-3">
                <div class="text-3xl font-black text-slate-900">{{ currentData.institutions?.value || currentData.speakers?.value || 0 }}</div>
              </div>
              <div class="mt-2 text-xs font-semibold text-slate-500">สถาบันการศึกษาและหน่วยงานทั่วประเทศ</div>
            </div>

            <div class="rounded-3xl bg-white border border-slate-200 p-5">
              <div class="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <FileText class="w-3.5 h-3.5" /> PUBLISHED PAPERS
              </div>
              <div class="mt-2 text-3xl font-black text-slate-900">{{ currentData.papers.value }}</div>
              <div class="mt-2 text-xs font-semibold text-slate-500">ตีพิมพ์ในรายงานการประชุม (Proceedings)</div>
            </div>

            <div class="rounded-3xl bg-white border border-slate-200 p-5">
              <div class="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <Users class="w-3.5 h-3.5" /> PARTICIPANTS
              </div>
              <div class="mt-2 flex items-end justify-between gap-3">
                <div class="text-3xl font-black text-slate-900">{{ currentData.participants.value }}</div>
                <div v-if="currentData.participants.delta > 0" class="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1">
                  <TrendingUp class="w-3 h-3" /> +{{ currentData.participants.delta }}%
                </div>
              </div>
              <div class="mt-2 text-xs font-semibold text-slate-500">นักวิจัย นักวิชาการ และผู้สนใจ</div>
            </div>
          </div>
        </section>

        <div class="mt-6 h-px bg-slate-200" />

        <section class="mt-6 space-y-4">
          <div class="text-lg font-black text-slate-900 flex items-center gap-2"><BarChart2 class="w-5 h-5 text-purple-500" /> การวิเคราะห์ข้อมูล (Data Analysis)</div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div class="rounded-3xl bg-white border border-slate-200 p-5">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="text-sm font-black text-slate-900">1. อัตราการตอบรับ (Rate)</div>
                  <div class="mt-1 text-xs font-semibold text-slate-500">มาตรฐานการคัดกรองเข้มข้น</div>
                </div>
                <div class="inline-flex items-center gap-2 text-[11px] font-black text-slate-500">
                  <Info class="w-4 h-4" />
                  Hover
                </div>
              </div>

              <div class="mt-5 flex items-center justify-center">
                <div class="relative w-56 h-56 group">
                  <div
                    class="absolute inset-0 rounded-full"
                    :style="{ background: `conic-gradient(#22c55e 0 ${currentData.acceptance.accepted}%, #e2e8f0 ${currentData.acceptance.accepted}% 100%)` }"
                  />
                  <div class="absolute inset-5 rounded-full bg-white border border-slate-200" />
                  <div class="absolute inset-0 flex items-center justify-center">
                    <div class="text-center">
                      <div class="text-4xl font-black text-slate-900">{{ currentData.acceptance.accepted }}%</div>
                      <div class="mt-1 text-xs font-semibold text-slate-500">Accepted</div>
                    </div>
                  </div>

                  <div class="absolute left-1/2 -translate-x-1/2 -bottom-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div class="rounded-2xl bg-slate-900 text-white px-4 py-2 text-[11px] font-black shadow-lg whitespace-nowrap">
                      Accepted {{ currentData.acceptance.accepted }}% | Rejected {{ currentData.acceptance.rejected }}%
                    </div>
                  </div>
                </div>
              </div>

              <div class="mt-5 flex items-center justify-center gap-4">
                <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-black text-emerald-700">
                  <CheckCircle2 class="w-3.5 h-3.5" /> Accepted {{ currentData.acceptance.accepted }}%
                </div>
                <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-black text-slate-700">
                  <XCircle class="w-3.5 h-3.5" /> Rejected {{ currentData.acceptance.rejected }}%
                </div>
              </div>
            </div>

            <div class="rounded-3xl bg-white border border-slate-200 p-5">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="text-sm font-black text-slate-900">2. แบ่งตามสาขา (Track)</div>
                  <div class="mt-1 text-xs font-semibold text-slate-500">จำนวนบทความแยกตามสาขาวิชา</div>
                </div>
                <div class="text-[11px] font-black text-slate-500">Hover bar</div>
              </div>

              <div class="mt-5 space-y-3">
                <div v-if="currentData.tracks.length === 0" class="text-center text-sm font-bold text-slate-400 py-8">
                  ไม่มีข้อมูลสาขา
                </div>
                <div v-for="t in currentData.tracks" :key="t.id" class="group">
                  <div class="flex items-center justify-between gap-3">
                    <div class="text-xs font-black text-slate-700">{{ t.label }}</div>
                    <div class="text-xs font-black text-slate-500">{{ t.value }}</div>
                  </div>
                  <div class="mt-2 h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      class="h-full rounded-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-500"
                      :style="{ width: `${Math.round((t.value / maxTrack) * 100)}%` }"
                    />
                  </div>
                  <div class="mt-2 text-[11px] font-semibold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {{ t.label }}: {{ t.value }} บทความ
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="rounded-3xl bg-white border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div class="text-sm font-black text-slate-900">ความพึงพอใจ (Satisfaction)</div>
              <div class="mt-1 text-xs font-semibold text-slate-500">คะแนนเฉลี่ยจากแบบประเมินหลังงาน</div>
            </div>
            <div class="inline-flex items-center gap-3">
              <div class="text-3xl font-black text-slate-900">{{ currentData.satisfaction.toFixed(1) }}</div>
              <div class="text-xs font-black text-slate-500">/ 5.0</div>
              <div class="inline-flex items-center gap-1 text-yellow-500 text-lg">
                {{ '★★★★★'.slice(0, Math.round(currentData.satisfaction)) }}{{ '☆☆☆☆☆'.slice(0, 5 - Math.round(currentData.satisfaction)) }}
              </div>
            </div>
          </div>

          <div class="flex justify-end">
            <button
              @click="generatePdf"
              :disabled="isLoading"
              class="h-11 px-5 rounded-2xl bg-slate-900 text-white text-sm font-black hover:bg-slate-800 transition-colors inline-flex items-center gap-2"
              :class="{'opacity-70 cursor-wait': isLoading}"
            >
              <Download class="w-5 h-5" />
              {{ isLoading ? 'กำลังสร้างเอกสาร...' : 'ดาวน์โหลดรายงานสรุป (PDF)' }}
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
