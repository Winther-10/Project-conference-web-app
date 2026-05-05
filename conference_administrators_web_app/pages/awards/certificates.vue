<script setup>
definePageMeta({ middleware: 'auth', layout: 'admin' });
import { ref, computed, onMounted } from 'vue';
import { Trophy, Award, Download, RefreshCw, FileText, Medal, Users, Star, Printer, Upload, X, ArrowLeft, Type, Settings, ChevronDown, Mail, CheckCircle2 } from 'lucide-vue-next';

const supabase = useSupabase();
const loading = ref(true);
const generating = ref(false);
const rankedPapers = ref([]);
const allUsers = ref([]);
const templateBytes = ref(null);
const templateFileName = ref('');
const templateUrl = ref('');
const fontBytes = ref(null);
const fontFileName = ref('');

const showConfig = ref(false);
const previewMode = ref('award'); // 'award' or 'participant'
const awardNames = ref({
  0: 'ชนะเลิศ',
  1: 'รองชนะเลิศอันดับ 1',
  2: 'รองชนะเลิศอันดับ 2'
});

const templateConfig = ref({
  authorName: { yPosPercent: 48, size: 28, color: '#1e293b' },
  awardText: { yPosPercent: 40, size: 20, color: '#92400e' },
  paperTitle: { yPosPercent: 33, size: 16, color: '#334155' }
});

const handleTemplateUpload = (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.type !== 'application/pdf') {
    alert('กรุณาอัปโหลดไฟล์ PDF เท่านั้น');
    return;
  }
  templateFileName.value = file.name;
  const reader = new FileReader();
  reader.onload = (e) => { 
    templateBytes.value = e.target.result; 
    const blob = new Blob([e.target.result], { type: 'application/pdf' });
    templateUrl.value = URL.createObjectURL(blob);
  };
  reader.readAsArrayBuffer(file);
};
const clearTemplate = () => { templateBytes.value = null; templateFileName.value = ''; templateUrl.value = ''; };

const handleFontUpload = (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.ttf')) {
    alert('กรุณาอัปโหลดไฟล์ฟอนต์นามสกุล .ttf เท่านั้น');
    return;
  }
  fontFileName.value = file.name;
  const reader = new FileReader();
  reader.onload = (e) => { fontBytes.value = e.target.result; };
  reader.readAsArrayBuffer(file);
};
const clearFont = () => { fontBytes.value = null; fontFileName.value = ''; };

const loadData = async () => {
  loading.value = true;
  try {
    const [papersRes, usersRes, awardsRes] = await Promise.all([
      supabase.from('papers').select(`
        paper_id, paper_code, title_th, title_en, track, author_id,
        review_assignments (
          assignment_id, reviewer_id, phase2_total_score, phase2_completed_at,
          phase2_score_creativity, phase2_score_methodology, phase2_score_usefulness,
          phase2_score_paper, phase2_score_presentation,
          users:reviewer_id ( first_name_th, last_name_th )
        )
      `).in('status', ['accepted', 'published']),
      supabase.from('users').select('user_id, title, first_name_th, last_name_th, title_en, first_name_en, last_name_en, email, institution'),
      supabase.from('awards').select('paper_id, certificate_url')
    ]);

    allUsers.value = usersRes.data || [];
    const awardsMap = (awardsRes.data || []).reduce((acc, a) => {
      acc[a.paper_id] = a.certificate_url;
      return acc;
    }, {});

    rankedPapers.value = (papersRes.data || [])
      .map(p => {
        const phase2 = (p.review_assignments || []).filter(a => a.phase2_completed_at);
        const avg = phase2.length > 0
          ? phase2.reduce((s, a) => s + (a.phase2_total_score || 0), 0) / phase2.length
          : 0;
        const certUrl = awardsMap[p.paper_id];
        return { 
          ...p, 
          phase2Assignments: phase2, 
          avg_score: Math.round(avg * 10) / 10, 
          completed: phase2.length,
          _saved_award: !!certUrl,
          // Since participant certs aren't strictly tracked in the same field, 
          // we can check if a file might exist, but for now we rely on the award entry presence
          _saved_participant: !!certUrl 
        };
      })
      .filter(p => p.completed > 0)
      .sort((a, b) => b.avg_score - a.avg_score);
  } catch (e) {
    console.error('loadData error:', e);
  } finally {
    loading.value = false;
  }
};

onMounted(loadData);

const getAuthor = (authorId) => allUsers.value.find(u => u.user_id === authorId);
const getAuthorName = (authorId) => {
  const u = getAuthor(authorId);
  return u ? `${u.title || ''}${u.first_name_th || ''} ${u.last_name_th || ''}`.trim() : 'ไม่ระบุ';
};

const awardLabel = (rank) => awardNames.value[rank] || '';
const awardEmoji = (rank) => ['🥇','🥈','🥉'][rank] || '🏅';

const top3 = computed(() => rankedPapers.value.slice(0, 3));
const allParticipants = computed(() => rankedPapers.value.slice(0, 20));
const isReady = computed(() => !!templateBytes.value && !!fontBytes.value);

// --- Visual Editor Drag Logic ---
const canvasRef = ref(null);
const activeDrag = ref(null);

const startDrag = (event, key) => {
  activeDrag.value = key;
};

const onDrag = (event) => {
  if (!activeDrag.value || !canvasRef.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  let yPercentBottom = 100 - (((event.clientY - rect.top) / rect.height) * 100);
  yPercentBottom = Math.max(0, Math.min(100, yPercentBottom));
  templateConfig.value[activeDrag.value].yPosPercent = Math.round(yPercentBottom);
};

const stopDrag = () => {
  activeDrag.value = null;
};

// --- PDF Generation ---
const generateCertificate = async (paper, rank, type, action = 'download') => {
  if (!isReady.value) {
    alert('กรุณาอัปโหลดเทมเพลต PDF และฟอนต์ไทยก่อนดำเนินการ');
    return;
  }
  generating.value = true;
  try {
    const { PDFDocument, rgb } = await import('pdf-lib');
    const fontkit = await import('fontkit');
    const fk = fontkit.default || fontkit;
    
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fk);

    // Load custom font (REQUIRED for Thai)
    let font;
    try {
      if (fontBytes.value) {
        font = await pdfDoc.embedFont(fontBytes.value);
      } else {
        throw new Error('กรุณาอัปโหลดไฟล์ฟอนต์ (.ttf) ก่อนเริ่มสร้างเกียรติบัตร');
      }
    } catch (e) {
      alert(`❌ ข้อผิดพลาด: ${e.message}`);
      generating.value = false;
      return;
    }

    // Use uploaded template PDF
    let page;
    if (templateBytes.value) {
      try {
        const templateDoc = await PDFDocument.load(templateBytes.value);
        const [templatePage] = await pdfDoc.copyPages(templateDoc, [0]);
        pdfDoc.addPage(templatePage);
        page = pdfDoc.getPages()[0];
      } catch (e) { console.error('Template load error:', e); }
    }

    if (!page) {
      // Create blank A4 landscape page as fallback
      page = pdfDoc.addPage([841.89, 595.28]);
    }

    const { width, height } = page.getSize();
    const authorName = getAuthorName(paper.author_id);
    const paperTitle = paper.title_th || paper.title_en || 'ไม่ระบุชื่อ';

    // Draw text centered
    const drawCentered = (text, y, size, color = rgb(0.1, 0.1, 0.1)) => {
      try {
        const tw = font.widthOfTextAtSize(text, size);
        page.drawText(text, { x: (width - tw) / 2, y, size, font, color });
      } catch (err) {
        console.error('Drawing error:', err, 'Text:', text);
      }
    };

    const config = templateConfig.value;
    const getY = (percent) => height * (percent / 100);
    
    // Helper to convert hex to rgb
    const getC = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      return rgb(r, g, b);
    };

    if (type === 'award') {
      const award = awardLabel(rank);
      drawCentered(authorName, getY(config.authorName.yPosPercent), config.authorName.size, getC(config.authorName.color));
      drawCentered(`ได้รับรางวัล ${award}`, getY(config.awardText.yPosPercent), config.awardText.size, getC(config.awardText.color));
      drawCentered(`บทความเรื่อง ${paperTitle}`, getY(config.paperTitle.yPosPercent), config.paperTitle.size, getC(config.paperTitle.color));
    } else {
      drawCentered(authorName, getY(config.authorName.yPosPercent), config.authorName.size, getC(config.authorName.color));
      drawCentered(`บทความเรื่อง ${paperTitle}`, getY(config.paperTitle.yPosPercent), config.paperTitle.size, getC(config.paperTitle.color));
    }

    const pdfBytes = await pdfDoc.save();
    
    if (action === 'upload') {
      return pdfBytes;
    }

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate_${type}_${paper.paper_code || 'paper'}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Certificate generation error:', e);
    alert('เกิดข้อผิดพลาดในการสร้างเกียรติบัตร: ' + e.message);
  } finally {
    if (action !== 'upload') generating.value = false;
  }
};

const saveToCloudOnly = async (paper, rank, type) => {
  try {
    generating.value = true;
    const pdfBytes = await generateCertificate(paper, rank, type, 'upload');
    if (!pdfBytes) return;

    const fileName = `cert_${type}_${paper.paper_code}.pdf`;
    
    // 1. Upload to Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('certificates')
      .upload(fileName, pdfBytes, { contentType: 'application/pdf', upsert: true });

    if (uploadError) throw new Error('อัปโหลดไฟล์ล้มเหลว: ' + uploadError.message);

    // 2. Get Public URL
    const { data: { publicUrl } } = supabase.storage.from('certificates').getPublicUrl(fileName);

    // 3. Update Database (if award)
    if (type === 'award') {
      const { error: dbError } = await supabase.from('awards').update({ certificate_url: publicUrl }).eq('paper_id', paper.paper_id);
      if (dbError && !dbError.message.includes('does not exist')) console.error('DB Update Error:', dbError);
    }
    
    paper[`_saved_${type}`] = true;
    alert('บันทึกเข้าระบบเรียบร้อยแล้ว!');
  } catch (e) {
    console.error('Save error:', e);
    alert('❌ ' + e.message);
  } finally {
    generating.value = false;
  }
};

const sendEmailOnly = (paper, type) => {
  const fileName = `cert_${type}_${paper.paper_code}.pdf`;
  const { data: { publicUrl } } = supabase.storage.from('certificates').getPublicUrl(fileName);

  const author = getAuthor(paper.author_id);
  const email = author?.email || '';
  const subject = encodeURIComponent(`[การประชุมวิชาการ] เกียรติบัตรของคุณสำหรับบทความ ${paper.paper_code}`);
  const body = encodeURIComponent(`เรียน ${getAuthorName(paper.author_id)},\n\nขอแสดงความยินดี! คุณสามารถดาวน์โหลดเกียรติบัตรของคุณได้จากลิงก์ด้านล่างนี้:\n${publicUrl}\n\nขอขอบคุณที่เข้าร่วมนำเสนอผลงาน\nคณะผู้จัดงาน`);
  
  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  paper[`_emailed_${type}`] = true;
};

const generateAllAwards = async () => {
  for (let i = 0; i < Math.min(top3.value.length, 3); i++) {
    await generateCertificate(top3.value[i], i, 'award');
  }
};

const generateAllParticipants = async () => {
  for (const paper of allParticipants.value) {
    await generateCertificate(paper, -1, 'participant');
  }
};
</script>

<template>
  <div class="p-8 pb-32 font-['Sarabun'] animate-fade-in">
    <!-- Header -->
    <div class="mb-8">
      <NuxtLink to="/awards" class="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft class="w-4 h-4" /> กลับไปหน้าประกาศรางวัล
      </NuxtLink>
    </div>

    <div class="mb-8 flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-black text-slate-800 flex items-center gap-2">
          <Award class="w-6 h-6 text-amber-500" />
          สร้างเกียรติบัตรอัตโนมัติ (Certificate Generator)
        </h2>
        <p class="text-sm text-slate-500 mt-1">สร้างเกียรติบัตรจากผลคะแนน Phase 2 พร้อมรายละเอียดบทความและผู้นำเสนอ</p>
      </div>
      <button @click="loadData" class="flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-4 py-2.5 rounded-xl transition-all">
        <RefreshCw class="w-3.5 h-3.5" :class="loading ? 'animate-spin' : ''" />
        รีเฟรช
      </button>
    </div>

    <!-- Upload Area -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <!-- Template Upload -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h4 class="font-black text-sm text-slate-800 mb-4 flex items-center gap-2"><FileText class="w-4 h-4 text-amber-500" /> 1. อัปโหลดเทมเพลต (PDF)</h4>
        <div v-if="!templateBytes" class="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-amber-300 transition-colors cursor-pointer relative min-h-[160px] flex flex-col justify-center">
          <input type="file" accept=".pdf" @change="handleTemplateUpload" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          <Upload class="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <div class="text-xs font-bold text-slate-500">คลิกเพื่อเลือกไฟล์ PDF เทมเพลต</div>
        </div>
        <div v-else class="flex items-center justify-between bg-amber-50 rounded-xl p-4 border border-amber-200 min-h-[160px]">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><FileText class="w-5 h-5 text-amber-600" /></div>
            <div>
              <div class="font-black text-sm text-slate-800 truncate max-w-[240px]">{{ templateFileName }}</div>
              <div class="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold mt-0.5">
                <CheckCircle2 class="w-3 h-3" />
                พร้อมใช้งาน
              </div>
            </div>
          </div>
          <button @click="clearTemplate" class="w-8 h-8 rounded-lg bg-white border border-amber-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition-all">
            <X class="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      <!-- Font Upload -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h4 class="font-black text-sm text-slate-800 mb-4 flex items-center gap-2"><Type class="w-4 h-4 text-indigo-500" /> 2. อัปโหลดฟอนต์ไทย (.ttf)</h4>
        <div v-if="!fontBytes" class="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-indigo-300 transition-colors cursor-pointer relative min-h-[160px] flex flex-col justify-center">
          <input type="file" accept=".ttf" @change="handleFontUpload" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          <Upload class="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <div class="text-xs font-bold text-slate-500">คลิกเพื่อเลือกไฟล์ฟอนต์ JS Wansika (.ttf)</div>
        </div>
        <div v-else class="flex items-center justify-between bg-indigo-50 rounded-xl p-4 border border-indigo-200 min-h-[160px]">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center"><Type class="w-5 h-5 text-indigo-600" /></div>
            <div>
              <div class="font-black text-sm text-slate-800 truncate max-w-[240px]">{{ fontFileName }}</div>
              <div class="flex items-center gap-1.5 text-[10px] text-indigo-600 font-bold mt-0.5">
                <CheckCircle2 class="w-3 h-3" />
                พร้อมใช้งาน
              </div>
            </div>
          </div>
          <button @click="clearFont" class="w-8 h-8 rounded-lg bg-white border border-indigo-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition-all">
            <X class="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
    </div>

    <!-- Settings Panel (Collapsible) -->
    <div class="mb-8">
      <div class="flex items-center gap-4">
        <button @click="showConfig = !showConfig" class="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-5 py-3 rounded-2xl transition-all shadow-sm">
          <Settings class="w-4 h-4" /> ตั้งค่าตำแหน่งข้อความบนเกียรติบัตร
          <ChevronDown class="w-4 h-4 transition-transform ml-2" :class="{ 'rotate-180': showConfig }" />
        </button>

        <div v-if="showConfig" class="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button @click="previewMode = 'award'" :class="previewMode === 'award' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'" class="px-4 py-2 rounded-lg text-xs font-black transition-all">โหมดรางวัล (Award)</button>
          <button @click="previewMode = 'participant'" :class="previewMode === 'participant' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'" class="px-4 py-2 rounded-lg text-xs font-black transition-all">โหมดเข้าร่วม (Participant)</button>
        </div>
      </div>
      
      <div v-if="showConfig" class="mt-4 p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-8 animate-in fade-in slide-in-from-top-2">
        <!-- Text Customization (Award Labels) -->
        <div v-if="previewMode === 'award'" class="grid grid-cols-1 md:grid-cols-3 gap-4 pb-6 border-b border-slate-100">
          <div v-for="(name, idx) in awardNames" :key="idx">
            <span class="text-[10px] font-black text-slate-400 block mb-1 uppercase">ชื่อรางวัลลำดับที่ {{ Number(idx)+1 }}</span>
            <input type="text" v-model="awardNames[idx]" class="w-full h-10 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold focus:border-amber-500 focus:outline-none transition-all">
          </div>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <label class="text-xs font-black text-indigo-600 block mb-3 uppercase tracking-wide">ชื่อผู้นำเสนอ (Author)</label>
            <div class="space-y-4">
              <div>
                <span class="text-[11px] font-bold text-slate-500 block mb-1">ตำแหน่งแกน Y (%)</span>
                <input type="number" v-model.number="templateConfig.authorName.yPosPercent" class="w-full h-10 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold">
              </div>
              <div>
                <span class="text-[11px] font-bold text-slate-500 block mb-1">ขนาดอักษร</span>
                <input type="number" v-model.number="templateConfig.authorName.size" class="w-full h-10 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold">
              </div>
              <div>
                <span class="text-[11px] font-bold text-slate-500 block mb-1">สีตัวอักษร</span>
                <input type="color" v-model="templateConfig.authorName.color" class="w-full h-10 p-1 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              </div>
            </div>
          </div>
          
          <div v-if="previewMode === 'award'">
            <label class="text-xs font-black text-amber-600 block mb-3 uppercase tracking-wide">ข้อความรางวัล (Award)</label>
            <div class="space-y-4">
              <div>
                <span class="text-[11px] font-bold text-slate-500 block mb-1">ตำแหน่งแกน Y (%)</span>
                <input type="number" v-model.number="templateConfig.awardText.yPosPercent" class="w-full h-10 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold">
              </div>
              <div>
                <span class="text-[11px] font-bold text-slate-500 block mb-1">ขนาดอักษร</span>
                <input type="number" v-model.number="templateConfig.awardText.size" class="w-full h-10 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold">
              </div>
              <div>
                <span class="text-[11px] font-bold text-slate-500 block mb-1">สีตัวอักษร</span>
                <input type="color" v-model="templateConfig.awardText.color" class="w-full h-10 p-1 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              </div>
            </div>
          </div>



          <div>
            <label class="text-xs font-black text-emerald-600 block mb-3 uppercase tracking-wide">ชื่อบทความ (Title)</label>
            <div class="space-y-4">
              <div>
                <span class="text-[11px] font-bold text-slate-500 block mb-1">ตำแหน่งแกน Y (%)</span>
                <input type="number" v-model.number="templateConfig.paperTitle.yPosPercent" class="w-full h-10 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold">
              </div>
              <div>
                <span class="text-[11px] font-bold text-slate-500 block mb-1">ขนาดอักษร</span>
                <input type="number" v-model.number="templateConfig.paperTitle.size" class="w-full h-10 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold">
              </div>
              <div>
                <span class="text-[11px] font-bold text-slate-500 block mb-1">สีตัวอักษร</span>
                <input type="color" v-model="templateConfig.paperTitle.color" class="w-full h-10 p-1 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Visual Editor Canvas -->
      <div v-if="showConfig" class="mt-8 pt-8 border-t border-slate-200 animate-in fade-in">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h4 class="text-base font-black text-slate-800">พรีวิวการจัดวาง (Visual Editor)</h4>
            <p class="text-xs text-slate-500 mt-1">จำลองกระดาษ A4 แนวนอน คุณสามารถ <span class="font-bold text-indigo-600">"คลิกค้างแล้วลาก"</span> ข้อความเพื่อปรับตำแหน่งขึ้น-ลงได้ทันที</p>
          </div>
          <div class="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            พรีวิวนี้เป็นการกะระยะคร่าวๆ เท่านั้น
          </div>
        </div>
        
        <div class="relative w-full aspect-[1.414] max-w-4xl mx-auto bg-slate-50 rounded-2xl overflow-hidden shadow-inner border-2 border-slate-300 border-dashed" ref="canvasRef">
          <!-- Background PDF Overlay -->
          <iframe v-if="templateUrl" :src="templateUrl + '#toolbar=0&navpanes=0&scrollbar=0&view=FitH'" class="absolute inset-0 w-full h-full pointer-events-none opacity-40" tabindex="-1"></iframe>
          <div v-else class="absolute inset-0 flex items-center justify-center text-slate-300 font-black text-2xl uppercase tracking-widest opacity-50 select-none">No Template Uploaded</div>
          
          <!-- Drag Area -->
          <div class="absolute inset-0 z-10" @mousemove="onDrag" @mouseup="stopDrag" @mouseleave="stopDrag">
            <!-- Center Line -->
            <div class="absolute top-0 bottom-0 left-1/2 w-[1px] bg-indigo-500/20 border-l border-dashed border-indigo-500/30"></div>

            <!-- Draggable Items -->
            <template v-for="(item, key) in templateConfig" :key="key">
              <div v-if="key !== 'awardText' || previewMode === 'award'"
                   class="absolute cursor-ns-resize px-6 py-2 transform -translate-x-1/2 translate-y-1/2 border-2 border-transparent hover:border-indigo-400 hover:bg-indigo-50/80 rounded-xl select-none transition-all duration-75 group flex flex-col items-center justify-center whitespace-nowrap"
                   :class="{ 'border-indigo-500 bg-indigo-100/90 shadow-lg shadow-indigo-500/20 z-20 scale-105': activeDrag === key }"
                   :style="{ left: '50%', bottom: item.yPosPercent + '%', fontSize: (item.size * 0.8) + 'px', color: item.color }"
                   @mousedown.prevent="startDrag($event, key)">
                <div class="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[11px] font-bold px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  Y: {{ item.yPosPercent }}%
                </div>
                <span class="font-black drop-shadow-sm">
                  <template v-if="key === 'authorName'">ชื่อ-นามสกุล (Author Name)</template>
                  <template v-else-if="key === 'awardText'">ได้รับรางวัล {{ awardLabel(0) }}</template>
                  <template v-else-if="key === 'paperTitle'">ชื่อบทความวิจัย (Paper Title)</template>
                </span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <RefreshCw class="w-8 h-8 text-slate-300 animate-spin" />
    </div>

    <template v-else-if="rankedPapers.length > 0">
      <!-- GROUP 1: Awards (Top 3) -->
      <div class="mb-10 transition-all duration-300" :class="{ 'opacity-40 grayscale-[0.5] pointer-events-none': previewMode !== 'award' }">
        <div class="flex items-center justify-between mb-5">
          <div class="flex items-center gap-2">
            <Trophy class="w-5 h-5 text-amber-500" />
            <h3 class="text-lg font-black text-slate-800">กลุ่มที่ 1 — รางวัล (Top 3)</h3>
            <span v-if="previewMode !== 'award'" class="text-[10px] font-black bg-slate-200 text-slate-500 px-2 py-0.5 rounded ml-2 uppercase">Locked: Switch to Award Mode</span>
            <span v-else class="text-xs font-bold text-slate-400 ml-2">ชนะเลิศ / รองชนะเลิศ 1 / รองชนะเลิศ 2</span>
          </div>
          <button @click="generateAllAwards" :disabled="generating || top3.length === 0 || !isReady || previewMode !== 'award'" class="flex items-center gap-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2.5 rounded-xl transition-all shadow-sm">
            <Printer class="w-3.5 h-3.5" />
            สร้างเกียรติบัตรทั้ง 3 ใบ
          </button>
        </div>
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th class="text-left px-6 py-4 text-xs font-black text-slate-500 uppercase">อันดับ</th>
                <th class="text-left px-6 py-4 text-xs font-black text-slate-500 uppercase">ผู้นำเสนอ</th>
                <th class="text-left px-6 py-4 text-xs font-black text-slate-500 uppercase">บทความ</th>
                <th class="text-center px-6 py-4 text-xs font-black text-slate-500 uppercase">คะแนนเฉลี่ย</th>
                <th class="text-center px-6 py-4 text-xs font-black text-slate-500 uppercase">รางวัล</th>
                <th class="text-center px-6 py-4 text-xs font-black text-slate-500 uppercase">สร้าง</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="(paper, idx) in top3" :key="paper.paper_id" class="hover:bg-amber-50/30 transition-colors">
                <td class="px-6 py-5">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black"
                    :class="{ 'bg-amber-50 text-amber-600': idx===0, 'bg-slate-100 text-slate-600': idx===1, 'bg-orange-50 text-orange-600': idx===2 }">
                    {{ awardEmoji(idx) }}
                  </div>
                </td>
                <td class="px-6 py-5">
                  <div class="font-black text-slate-800">{{ getAuthorName(paper.author_id) }}</div>
                  <div class="text-[11px] text-slate-400 font-bold">{{ paper.paper_code }}</div>
                </td>
                <td class="px-6 py-5 max-w-sm">
                  <div class="font-bold text-slate-700 text-sm leading-snug line-clamp-2">{{ paper.title_th }}</div>
                  <div v-if="paper.track" class="text-[10px] text-slate-400 mt-1">{{ paper.track }}</div>
                </td>
                <td class="px-6 py-5 text-center">
                  <span class="text-2xl font-black text-amber-500">{{ paper.avg_score }}</span>
                  <div class="text-[10px] text-slate-400 font-bold">/100</div>
                </td>
                <td class="px-6 py-5 text-center">
                  <span class="px-3 py-1.5 rounded-full text-[10px] font-black border"
                    :class="{ 'bg-amber-50 border-amber-200 text-amber-700': idx===0, 'bg-slate-50 border-slate-300 text-slate-700': idx===1, 'bg-orange-50 border-orange-200 text-orange-700': idx===2 }">
                    {{ awardLabel(idx) }}
                  </span>
                </td>
                <td class="px-6 py-5 text-center">
                      <div class="flex flex-col gap-1.5 w-32 ml-auto">
                        <button @click="generateCertificate(paper, idx, 'award')" :disabled="generating || !isReady || previewMode !== 'award'" class="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors disabled:opacity-40" title="ดาวน์โหลดเพื่อตรวจสอบ">
                          <Download class="w-3.5 h-3.5" /> โหลดตรวจสอบ
                        </button>
                        <button @click="saveToCloudOnly(paper, idx, 'award')" :disabled="generating || !isReady || previewMode !== 'award'" 
                                :class="paper._saved_award ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600'" 
                                class="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-40" title="อัปโหลดเข้าสู่ระบบ Dashboard">
                          <CheckCircle2 v-if="paper._saved_award" class="w-3.5 h-3.5" />
                          <Upload v-else class="w-3.5 h-3.5" />
                          {{ paper._saved_award ? 'บันทึกสำเร็จ' : 'บันทึกเข้าระบบ' }}
                        </button>
                        <button @click="sendEmailOnly(paper, 'award')" :disabled="generating || !isReady || previewMode !== 'award'" 
                                :class="paper._emailed_award ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'" 
                                class="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-40" title="ส่งอีเมลหาผู้ใช้ (ควรบันทึกก่อน)">
                          <CheckCircle2 v-if="paper._emailed_award" class="w-3.5 h-3.5" />
                          <Mail v-else class="w-3.5 h-3.5" />
                          {{ paper._emailed_award ? 'ส่ง Email แล้ว' : 'ส่ง Email' }}
                        </button>
                      </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- GROUP 2: All Participants -->
      <div class="transition-all duration-300" :class="{ 'opacity-40 grayscale-[0.5] pointer-events-none': previewMode !== 'participant' }">
        <div class="flex items-center justify-between mb-5">
          <div class="flex items-center gap-2">
            <Medal class="w-5 h-5 text-indigo-500" />
            <h3 class="text-lg font-black text-slate-800">กลุ่มที่ 2 — ผู้เข้าร่วมและผ่านการนำเสนอ</h3>
            <span v-if="previewMode !== 'participant'" class="text-[10px] font-black bg-slate-200 text-slate-500 px-2 py-0.5 rounded ml-2 uppercase">Locked: Switch to Participant Mode</span>
            <span v-else class="text-xs font-bold text-slate-400 ml-2">ทุกคนที่ได้นำเสนอ (สูงสุด 20 คน)</span>
          </div>
          <button @click="generateAllParticipants" :disabled="generating || allParticipants.length === 0 || !isReady || previewMode !== 'participant'" class="flex items-center gap-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2.5 rounded-xl transition-all shadow-sm">
            <Printer class="w-3.5 h-3.5" />
            สร้างเกียรติบัตรทั้งหมด ({{ allParticipants.length }} ใบ)
          </button>
        </div>
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th class="text-left px-6 py-4 text-xs font-black text-slate-500 uppercase w-16">อันดับ</th>
                <th class="text-left px-6 py-4 text-xs font-black text-slate-500 uppercase">ผู้นำเสนอ</th>
                <th class="text-left px-6 py-4 text-xs font-black text-slate-500 uppercase">บทความ</th>
                <th class="text-center px-6 py-4 text-xs font-black text-slate-500 uppercase">คะแนน</th>
                <th class="text-center px-6 py-4 text-xs font-black text-slate-500 uppercase">ผู้ประเมิน</th>
                <th class="text-center px-6 py-4 text-xs font-black text-slate-500 uppercase">สร้าง</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="(paper, idx) in allParticipants" :key="paper.paper_id" class="hover:bg-indigo-50/20 transition-colors">
                <td class="px-6 py-4">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm"
                    :class="idx < 3 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500 border border-slate-200'">
                    {{ idx + 1 }}
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="font-black text-slate-800 text-sm">{{ getAuthorName(paper.author_id) }}</div>
                  <div class="text-[10px] text-slate-400 font-bold">{{ paper.paper_code }}</div>
                </td>
                <td class="px-6 py-4 max-w-sm">
                  <div class="font-bold text-slate-700 text-sm leading-snug line-clamp-1">{{ paper.title_th }}</div>
                </td>
                <td class="px-6 py-4 text-center">
                  <span class="text-lg font-black" :class="paper.avg_score >= 85 ? 'text-amber-500' : paper.avg_score >= 70 ? 'text-indigo-600' : 'text-slate-600'">
                    {{ paper.avg_score }}
                  </span>
                </td>
                <td class="px-6 py-4 text-center text-xs font-bold text-slate-500">{{ paper.completed }} คน</td>
                <td class="px-6 py-4 text-center">
                      <div class="flex flex-col gap-1.5 w-32 ml-auto">
                        <button @click="generateCertificate(paper, -1, 'participant')" :disabled="generating || !isReady || previewMode !== 'participant'" class="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors disabled:opacity-40" title="ดาวน์โหลดเพื่อตรวจสอบ">
                          <Download class="w-3.5 h-3.5" /> โหลดตรวจสอบ
                        </button>
                        <button @click="saveToCloudOnly(paper, -1, 'participant')" :disabled="generating || !isReady || previewMode !== 'participant'" 
                                :class="paper._saved_participant ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600'" 
                                class="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-40" title="อัปโหลดเข้าสู่ระบบ Dashboard">
                          <CheckCircle2 v-if="paper._saved_participant" class="w-3.5 h-3.5" />
                          <Upload v-else class="w-3.5 h-3.5" />
                          {{ paper._saved_participant ? 'บันทึกสำเร็จ' : 'บันทึกเข้าระบบ' }}
                        </button>
                        <button @click="sendEmailOnly(paper, 'participant')" :disabled="generating || !isReady || previewMode !== 'participant'" 
                                :class="paper._emailed_participant ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'" 
                                class="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-40" title="ส่งอีเมลหาผู้ใช้ (ควรบันทึกก่อน)">
                          <CheckCircle2 v-if="paper._emailed_participant" class="w-3.5 h-3.5" />
                          <Mail v-else class="w-3.5 h-3.5" />
                          {{ paper._emailed_participant ? 'ส่ง Email แล้ว' : 'ส่ง Email' }}
                        </button>
                      </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Empty State -->
    <div v-else class="text-center py-20 bg-white rounded-2xl border border-slate-200">
      <Trophy class="w-12 h-12 text-slate-200 mx-auto mb-4" />
      <div class="font-bold text-slate-500">ยังไม่มีคะแนน Phase 2</div>
      <div class="text-sm text-slate-400 mt-1">กรรมการต้องกรอกคะแนนผ่าน Reviewer App ก่อนจึงจะสร้างเกียรติบัตรได้</div>
    </div>

    <!-- Generating Overlay -->
    <div v-if="generating" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div class="bg-white rounded-3xl p-10 shadow-2xl text-center">
        <RefreshCw class="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
        <div class="font-black text-slate-800 text-lg">กำลังสร้างเกียรติบัตร...</div>
        <div class="text-sm text-slate-500 mt-1">กรุณารอสักครู่</div>
      </div>
    </div>
  </div>
</template>
