<script setup>
definePageMeta({ middleware: 'auth', layout: 'admin' });
import { ref, computed, onMounted } from 'vue';
import { Trophy, Award, Download, RefreshCw, FileText, Medal, Users, Star, Printer, Upload, X, ArrowLeft, Type, Settings, ChevronDown, Mail, CheckCircle2, Loader2, Eye, Trash2 } from 'lucide-vue-next';

const supabase = useSupabase();
const loading = ref(true);
const generating = ref(false);
const rawRankedPapers = ref([]);
const allUsers = ref([]);
const paperAuthorsMap = ref({});
const savedFiles = ref(new Set());

// Font State
const font = ref({ bytes: null, fileName: '', url: '' });

// Templates State (4 types)
const templates = ref({
  author_finalist: { bytes: null, fileName: '', url: '' },
  advisor_finalist: { bytes: null, fileName: '', url: '' },
  author_participant: { bytes: null, fileName: '', url: '' },
  advisor_participant: { bytes: null, fileName: '', url: '' }
});

const filterYear = ref('all');
const activeAcademicYear = ref(null);
const finalistCount = ref(20);

// Visual Config & Mode
const showConfig = ref(false);
const previewMode = ref('author_finalist'); // 'author_finalist', 'advisor_finalist', 'author_participant', 'advisor_participant'

const awardNames = ref({
  0: 'ชนะเลิศ',
  1: 'รองชนะเลิศอันดับ 1',
  2: 'รองชนะเลิศอันดับ 2',
  3: 'ชมเชย',
  4: 'ชมเชย',
  5: 'ชมเชย'
});

const defaultConfig = {
  authorName: { yPosPercent: 48, size: 28, color: '#1e293b', enabled: true, showPrefix: true, language: 'th' },
  institution: { yPosPercent: 40, size: 18, color: '#475569', enabled: true },
  awardText: { 
    yPosPercent: 33, 
    size: 20, 
    color: '#92400e', 
    enabled: true,
    textAuthorWinner: 'ได้รับรางวัล {award}',
    textAdvisorWinner: 'ในฐานะอาจารย์ที่ปรึกษาบทความวิจัยที่ได้รับรางวัล {award}',
    textAuthorFinalist: 'ในฐานะผู้เสนอผลงานบทความวิจัยที่ผ่านเข้ารอบสุดท้าย',
    textAdvisorFinalist: 'ในฐานะอาจารย์ที่ปรึกษาบทความวิจัยที่ผ่านเข้ารอบสุดท้าย',
    textAuthorParticipant: 'ในฐานะผู้เสนอผลงานบทความวิจัยที่เข้าร่วมนำเสนอผลงาน',
    textAdvisorParticipant: 'ในฐานะอาจารย์ที่ปรึกษาบทความวิจัยที่เข้าร่วมนำเสนอผลงาน'
  },
  paperTitle: { yPosPercent: 25, size: 16, color: '#334155', enabled: true, textTemplate: 'บทความเรื่อง "{title}"' }
};

const templateConfig = ref(JSON.parse(JSON.stringify(defaultConfig)));

const fetchFileAsBytes = async (url) => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Fetch failed');
    return await res.arrayBuffer();
  } catch (e) {
    console.error('Failed to download file from URL:', url, e);
    return null;
  }
};

const fetchSettings = async () => {
  const { data } = await supabase.from('system_settings').select('config_json').single();
  if (data?.config_json) {
    const conf = data.config_json.conference || {};
    activeAcademicYear.value = conf.academicYear || conf.year || new Date().getFullYear();
    if (filterYear.value === 'all') filterYear.value = String(activeAcademicYear.value);
    finalistCount.value = conf.finalistCount || 20;

    const savedTemplates = data.config_json.templates || {};
    const savedConfig = data.config_json.templateConfig || {};
    
    const merged = JSON.parse(JSON.stringify(defaultConfig));
    for (const key of Object.keys(defaultConfig)) {
      if (savedConfig[key]) {
        merged[key] = { ...defaultConfig[key], ...savedConfig[key] };
      }
    }
    templateConfig.value = merged;
    
    for (const key of Object.keys(templates.value)) {
      if (savedTemplates[key]) {
        templates.value[key].url = savedTemplates[key];
        templates.value[key].fileName = `${key}.pdf`;
        fetchFileAsBytes(savedTemplates[key]).then(bytes => {
          if (bytes) templates.value[key].bytes = bytes;
        });
      }
    }
    
    if (savedTemplates.font_thai) {
      font.value.url = savedTemplates.font_thai;
      font.value.fileName = 'font_thai.ttf';
      fetchFileAsBytes(savedTemplates.font_thai).then(bytes => {
        if (bytes) font.value.bytes = bytes;
      });
    }
  }
};

const saveTemplatesToConfig = async () => {
  try {
    const { data: settingsData } = await supabase.from('system_settings').select('config_json').single();
    const config = settingsData?.config_json || {};
    
    config.templates = {
      author_finalist: templates.value.author_finalist.url || '',
      advisor_finalist: templates.value.advisor_finalist.url || '',
      author_participant: templates.value.author_participant.url || '',
      advisor_participant: templates.value.advisor_participant.url || '',
      font_thai: font.value.url || ''
    };
    
    config.templateConfig = templateConfig.value;
    
    const { error } = await supabase.from('system_settings').upsert({
      id: 1,
      config_json: config,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
};

const handleTemplateUpload = async (type, event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.type !== 'application/pdf') {
    alert('กรุณาอัปโหลดไฟล์ PDF เท่านั้น');
    return;
  }
  
  generating.value = true;
  try {
    const fileName = `templates/${type}.pdf`;
    const reader = new FileReader();
    
    const arrayBuffer = await new Promise((resolve) => {
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsArrayBuffer(file);
    });
    
    const { error: uploadError } = await supabase.storage
      .from('certificates')
      .upload(fileName, arrayBuffer, { contentType: 'application/pdf', upsert: true });
      
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage.from('certificates').getPublicUrl(fileName);
    
    templates.value[type] = {
      bytes: arrayBuffer,
      fileName: file.name,
      url: publicUrl
    };
    
    await saveTemplatesToConfig();
    alert('อัปโหลดและบันทึกเทมเพลตเรียบร้อยแล้ว');
  } catch (err) {
    console.error('Error uploading template:', err);
    alert('เกิดข้อผิดพลาดในการอัปโหลด: ' + err.message);
  } finally {
    generating.value = false;
  }
};

const handleFontUpload = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.ttf')) {
    alert('กรุณาอัปโหลดไฟล์ฟอนต์นามสกุล .ttf เท่านั้น');
    return;
  }
  
  generating.value = true;
  try {
    const fileName = 'templates/font_thai.ttf';
    const reader = new FileReader();
    
    const arrayBuffer = await new Promise((resolve) => {
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsArrayBuffer(file);
    });
    
    const { error: uploadError } = await supabase.storage
      .from('certificates')
      .upload(fileName, arrayBuffer, { contentType: 'application/octet-stream', upsert: true });
      
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage.from('certificates').getPublicUrl(fileName);
    
    font.value = {
      bytes: arrayBuffer,
      fileName: file.name,
      url: publicUrl
    };
    
    await saveTemplatesToConfig();
    alert('อัปโหลดและบันทึกฟอนต์เรียบร้อยแล้ว');
  } catch (err) {
    console.error('Error uploading font:', err);
    alert('เกิดข้อผิดพลาดในการอัปโหลดฟอนต์: ' + err.message);
  } finally {
    generating.value = false;
  }
};

const clearTemplate = async (type) => {
  templates.value[type] = { bytes: null, fileName: '', url: '' };
  await saveTemplatesToConfig();
};

const clearFont = async () => {
  font.value = { bytes: null, fileName: '', url: '' };
  await saveTemplatesToConfig();
};

const fetchSavedFiles = async () => {
  try {
    const { data, error } = await supabase.storage.from('certificates').list();
    if (data) {
      savedFiles.value = new Set(data.map(f => f.name));
    }
  } catch (e) {
    console.error('Failed to list files:', e);
  }
};

const loadData = async () => {
  loading.value = true;
  await fetchSettings();
  try {
    const [papersRes, usersRes, awardsRes, authorsRes] = await Promise.all([
      supabase.from('papers').select(`
        paper_id, paper_code, title_th, title_en, track, author_id, status,
        review_assignments (
          assignment_id, reviewer_id, total_score, completed_at, phase2_total_score, phase2_completed_at,
          users:reviewer_id ( first_name_th, last_name_th )
        )
      `),
      supabase.from('users').select('user_id, title, title_en, first_name_th, last_name_th, first_name_en, last_name_en, institution, email'),
      supabase.from('awards').select('paper_id, certificate_url, award_type'),
      supabase.from('paper_authors').select('*')
    ]);

    allUsers.value = usersRes.data || [];
    const awardsMap = (awardsRes.data || []).reduce((acc, a) => {
      acc[a.paper_id] = a;
      return acc;
    }, {});

    const grouped = {};
    (authorsRes.data || []).forEach(a => {
      if (!grouped[a.paper_code]) grouped[a.paper_code] = [];
      grouped[a.paper_code].push(a);
    });
    paperAuthorsMap.value = grouped;

    rawRankedPapers.value = (papersRes.data || [])
      .map(p => {
        const phase1 = (p.review_assignments || []).filter(a => a.completed_at || a.total_score !== null);
        const phase2 = (p.review_assignments || []).filter(a => a.phase2_completed_at);
        
        const avg1 = phase1.length > 0
          ? phase1.reduce((s, a) => s + (a.total_score || 0), 0) / phase1.length
          : 0;
        const avg2 = phase2.length > 0
          ? phase2.reduce((s, a) => s + (a.phase2_total_score || 0), 0) / phase2.length
          : 0;
          
        const award = awardsMap[p.paper_id];
        return { 
          ...p, 
          phase1Assignments: phase1,
          phase2Assignments: phase2, 
          phase1_avg: Math.round(avg1 * 10) / 10,
          phase2_avg: Math.round(avg2 * 10) / 10,
          avg_score: Math.round(avg2 * 10) / 10, // Default to phase 2 average score for backward compatibility
          completed: phase2.length,
          completed_phase1: phase1.length,
          completed_phase2: phase2.length,
          has_award: !!award,
          award_type: award?.award_type || null
        };
      })
      .filter(p => p.completed_phase1 > 0 || p.completed_phase2 > 0 || ['rejected', 'revision_required', 'format_error'].includes(p.status));

    await fetchSavedFiles();
  } catch (e) {
    console.error('loadData error:', e);
  } finally {
    loading.value = false;
  }
};

onMounted(loadData);

const filteredPapers = computed(() => {
  let arr = [...rawRankedPapers.value];
  if (filterYear.value !== 'all') {
    const yy = filterYear.value.slice(-2);
    arr = arr.filter(p => p.paper_code && p.paper_code.includes(`-${yy}`));
  }
  return arr;
});

const rankedPapers = computed(() => {
  return [...finalists.value, ...participants.value];
});

const yearOptions = computed(() => {
  const years = new Set();
  if (activeAcademicYear.value) years.add(String(activeAcademicYear.value));
  rawRankedPapers.value.forEach(p => {
    if (p.paper_code) {
      const match = p.paper_code.match(/-(\d{2})/);
      if (match) years.add('20' + match[1]);
    }
  });
  return Array.from(years).sort((a, b) => Number(b) - Number(a));
});

const getAuthor = (authorId) => allUsers.value.find(u => u.user_id === authorId);

const getPaperMembers = (paper) => {
  const members = paperAuthorsMap.value[paper.paper_code] || [];
  let authors = members.filter(m => m.member_type === 'author').sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  let advisors = members.filter(m => m.member_type === 'advisor').sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  
  if (authors.length === 0) {
    const primary = getAuthor(paper.author_id);
    if (primary) {
      authors = [{
        prefix: primary.title || '',
        first_name: primary.first_name_th || '',
        last_name: primary.last_name_th || '',
        institution: primary.institution || '',
        member_type: 'author',
        email: primary.email || ''
      }];
    }
  }
  return { authors, advisors };
};

const formatMembersListStr = (members) => {
  return members.map(m => `${m.prefix || ''}${m.first_name || ''} ${m.last_name || ''}`.trim()).join(', ');
};

const awardLabel = (rank) => {
  if (rank === 0) return 'ชนะเลิศ';
  if (rank === 1) return 'รองชนะเลิศอันดับ 1';
  if (rank === 2) return 'รองชนะเลิศอันดับ 2';
  if (rank >= 3 && rank <= 5) return 'ชมเชย';
  return '';
};

const getAwardTextPreview = () => {
  const mode = previewMode.value; // 'author_finalist', 'advisor_finalist', 'author_participant', 'advisor_participant'
  const t = templateConfig.value.awardText || {};
  if (mode === 'author_finalist') {
    return (t.textAuthorWinner || 'ได้รับรางวัล {award}').replace('{award}', 'ชนะเลิศ');
  } else if (mode === 'advisor_finalist') {
    return (t.textAdvisorWinner || 'ในฐานะอาจารย์ที่ปรึกษาบทความวิจัยที่ได้รับรางวัล {award}').replace('{award}', 'ชนะเลิศ');
  } else if (mode === 'author_participant') {
    return t.textAuthorParticipant || 'ในฐานะผู้เสนอผลงานบทความวิจัยที่เข้าร่วมนำเสนอผลงาน';
  } else if (mode === 'advisor_participant') {
    return t.textAdvisorParticipant || 'ในฐานะอาจารย์ที่ปรึกษาบทความวิจัยที่เข้าร่วมนำเสนอผลงาน';
  }
  return '';
};

const awardEmoji = (rank) => {
  if (rank === 0) return '🥇';
  if (rank === 1) return '🥈';
  if (rank === 2) return '🥉';
  if (rank >= 3 && rank <= 5) return '🎖️';
  return '🏅';
};

const isReady = computed(() => {
  const hasFinalist = !!(templates.value.author_finalist.bytes || templates.value.advisor_finalist.bytes);
  const hasParticipant = !!(templates.value.author_participant.bytes || templates.value.advisor_participant.bytes);
  return hasFinalist && hasParticipant && !!font.value.bytes;
});

const finalists = computed(() => {
  // กรองเฉพาะบทความที่ไม่ถูกปฏิเสธ/รอแก้ไข/มีข้อผิดพลาดรูปแบบ และต้องผ่านการประเมิน Phase 2 แล้วเท่านั้น (completed_phase2 > 0)
  const pool = filteredPapers.value.filter(p => 
    !['rejected', 'revision_required', 'format_error'].includes(p.status) &&
    p.completed_phase2 > 0
  );
  return pool.sort((a, b) => b.phase2_avg - a.phase2_avg).slice(0, finalistCount.value);
});

const participants = computed(() => {
  // กรองเฉพาะบทความที่หยุดแค่ใน Phase 1 เท่านั้น (rejected, revision_required, format_error)
  const pool = filteredPapers.value.filter(p => 
    ['rejected', 'revision_required', 'format_error'].includes(p.status)
  );
  return pool.sort((a, b) => b.phase1_avg - a.phase1_avg);
});

const getSavedStatus = (paper, role) => {
  const isFinalist = finalists.value.some(f => f.paper_id === paper.paper_id);
  const status = isFinalist ? 'finalist' : 'participant';
  const fileName = `cert_${role}_${status}_${paper.paper_code}.pdf`;
  return savedFiles.value.has(fileName);
};

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
  saveTemplatesToConfig();
};

const currentTemplateUrl = computed(() => {
  const t = templates.value[previewMode.value];
  if (t?.url) return t.url;
  if (previewMode.value === 'advisor_finalist') return templates.value.author_finalist.url || '';
  if (previewMode.value === 'advisor_participant') return templates.value.author_participant.url || '';
  if (previewMode.value === 'author_finalist') return templates.value.advisor_finalist.url || '';
  if (previewMode.value === 'author_participant') return templates.value.advisor_participant.url || '';
  return '';
});

const buildPdf = async (members, templateObj, paper, rank, isAdvisor) => {
  const { PDFDocument, rgb } = await import('pdf-lib');
  const fontkit = await import('fontkit');
  const fk = fontkit.default || fontkit;
  
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fk);
  
  const embeddedFont = await pdfDoc.embedFont(font.value.bytes);
  const templateDoc = await PDFDocument.load(templateObj.bytes);
  
  const config = templateConfig.value;
  
  const getC = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return rgb(r, g, b);
  };
  
  for (const m of members) {
    const [templatePage] = await pdfDoc.copyPages(templateDoc, [0]);
    pdfDoc.addPage(templatePage);
    const page = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
    const { width, height } = page.getSize();
    
    const getY = (percent) => height * (percent / 100);
    
    const drawCentered = (text, y, size, color = rgb(0.1, 0.1, 0.1)) => {
      try {
        const tw = embeddedFont.widthOfTextAtSize(text, size);
        page.drawText(text, { x: (width - tw) / 2, y, size, font: embeddedFont, color });
      } catch (err) {
        console.error('Drawing error:', err, 'Text:', text);
      }
    };
    
    // 1. Draw Name if enabled
    if (config.authorName && config.authorName.enabled !== false) {
      const isEnglish = config.authorName.language === 'en';
      let prefixText = '';
      let firstText = '';
      let lastText = '';
      
      const registeredUser = m.email 
        ? allUsers.value.find(u => u.email && u.email.toLowerCase() === m.email.toLowerCase())
        : null;
        
      if (registeredUser) {
        if (isEnglish) {
          prefixText = registeredUser.title_en || '';
          firstText = registeredUser.first_name_en || '';
          lastText = registeredUser.last_name_en || '';
        } else {
          prefixText = registeredUser.title || '';
          firstText = registeredUser.first_name_th || '';
          lastText = registeredUser.last_name_th || '';
        }
      }
      
      if (!firstText) {
        prefixText = m.prefix || '';
        firstText = m.first_name || '';
        lastText = m.last_name || '';
      }
      
      const showPrefix = config.authorName.showPrefix !== false;
      let fullName = '';
      if (showPrefix && prefixText) {
        if (isEnglish) {
          fullName = `${prefixText} ${firstText} ${lastText}`.trim();
        } else {
          fullName = `${prefixText}${firstText} ${lastText}`.trim();
        }
      } else {
        fullName = `${firstText} ${lastText}`.trim();
      }
      
      drawCentered(fullName, getY(config.authorName.yPosPercent), config.authorName.size, getC(config.authorName.color));
    }
    
    // 2. Draw Institution if enabled
    if (config.institution && config.institution.enabled !== false) {
      const inst = m.institution || '';
      if (inst) {
        drawCentered(inst, getY(config.institution.yPosPercent), config.institution.size, getC(config.institution.color));
      }
    }
    
    // 3. Draw Paper Title if enabled
    if (config.paperTitle && config.paperTitle.enabled !== false) {
      const paperTitleTemplate = config.paperTitle.textTemplate || 'บทความเรื่อง "{title}"';
      const titleValue = paper.title_th || paper.title_en || 'ไม่ระบุชื่อ';
      const paperTitleText = paperTitleTemplate.replace('{title}', titleValue);
      drawCentered(paperTitleText, getY(config.paperTitle.yPosPercent), config.paperTitle.size, getC(config.paperTitle.color));
    }
    
    // 4. Draw Award Text if enabled
    if (config.awardText && config.awardText.enabled !== false) {
      let awardTextStr = '';
      if (rank >= 0 && rank <= 5) {
        const award = awardLabel(rank);
        const tmpl = isAdvisor 
          ? (config.awardText.textAdvisorWinner || 'ในฐานะอาจารย์ที่ปรึกษาบทความวิจัยที่ได้รับรางวัล {award}')
          : (config.awardText.textAuthorWinner || 'ได้รับรางวัล {award}');
        awardTextStr = tmpl.replace('{award}', award);
      } else if (rank >= 6) {
        awardTextStr = isAdvisor
          ? (config.awardText.textAdvisorFinalist || 'ในฐานะอาจารย์ที่ปรึกษาบทความวิจัยที่ผ่านเข้ารอบสุดท้าย')
          : (config.awardText.textAuthorFinalist || 'ในฐานะผู้เสนอผลงานบทความวิจัยที่ผ่านเข้ารอบสุดท้าย');
      } else { // rank === -1
        awardTextStr = isAdvisor
          ? (config.awardText.textAdvisorParticipant || 'ในฐานะอาจารย์ที่ปรึกษาบทความวิจัยที่เข้าร่วมนำเสนอผลงาน')
          : (config.awardText.textAuthorParticipant || 'ในฐานะผู้เสนอผลงานบทความวิจัยที่เข้าร่วมนำเสนอผลงาน');
      }
      
      if (awardTextStr) {
        drawCentered(awardTextStr, getY(config.awardText.yPosPercent), config.awardText.size, getC(config.awardText.color));
      }
    }
  }
  
  return await pdfDoc.save();
};

const generateCertificate = async (paper, rank, role, action = 'download') => {
  if (!isReady.value) {
    alert('กรุณาอัปโหลดเทมเพลต PDF (อย่างน้อยส่วนของผู้แต่ง) และฟอนต์ไทยก่อนดำเนินการ');
    return null;
  }
  
  const { authors, advisors } = getPaperMembers(paper);
  const targetMembers = role === 'author' ? authors : advisors;
  
  if (targetMembers.length === 0) {
    if (action === 'download' || action === 'preview') {
      alert(`ไม่พบรายชื่อสำหรับบทบาท ${role === 'author' ? 'ผู้แต่ง' : 'ที่ปรึกษา'}`);
    }
    return null;
  }
  
  const idx = finalists.value.findIndex(f => f.paper_id === paper.paper_id);
  const isFinalist = idx !== -1;
  const status = isFinalist ? 'finalist' : 'participant';
  const templateKey = `${role}_${status}`;
  let templateObj = templates.value[templateKey];

  if (!templateObj.bytes) {
    if (templateKey === 'advisor_finalist') templateObj = templates.value.author_finalist;
    else if (templateKey === 'advisor_participant') templateObj = templates.value.author_participant;
    else if (templateKey === 'author_finalist') templateObj = templates.value.advisor_finalist;
    else if (templateKey === 'author_participant') templateObj = templates.value.advisor_participant;
  }

  if (!templateObj || !templateObj.bytes) {
    alert('ไม่สามารถสร้างเกียรติบัตรได้ เนื่องจากยังไม่ได้อัปโหลดเทมเพลตที่เกี่ยวข้อง');
    return null;
  }
  
  generating.value = true;
  try {
    const pdfBytes = await buildPdf(targetMembers, templateObj, paper, isFinalist ? idx : -1, role === 'advisor');
    
    if (action === 'upload') {
      return pdfBytes;
    }
    
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    if (action === 'preview') {
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return;
    }
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `cert_${role}_${status}_${paper.paper_code}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Certificate generation error:', e);
    alert('เกิดข้อผิดพลาดในการสร้างเกียรติบัตร: ' + e.message);
  } finally {
    if (action !== 'upload') generating.value = false;
  }
};

const saveToCloudOnly = async (paper, isBatch = false) => {
  const { authors, advisors } = getPaperMembers(paper);
  const idx = finalists.value.findIndex(f => f.paper_id === paper.paper_id);
  const isFinalist = idx !== -1;
  const status = isFinalist ? 'finalist' : 'participant';
  
  if (!isBatch) generating.value = true;
  try {
    let authorPublicUrl = '';
    
    if (authors.length > 0) {
      const authorPdfBytes = await generateCertificate(paper, isFinalist ? idx : -1, 'author', 'upload');
      if (authorPdfBytes) {
        const authorFileName = `cert_author_${status}_${paper.paper_code}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from('certificates')
          .upload(authorFileName, authorPdfBytes, { contentType: 'application/pdf', upsert: true });
        if (uploadError) throw new Error('อัปโหลดไฟล์เกียรติบัตรผู้แต่งล้มเหลว: ' + uploadError.message);
        
        const { data: { publicUrl } } = supabase.storage.from('certificates').getPublicUrl(authorFileName);
        authorPublicUrl = publicUrl;
      }
    }
    
    if (advisors.length > 0) {
      const advisorPdfBytes = await generateCertificate(paper, isFinalist ? idx : -1, 'advisor', 'upload');
      if (advisorPdfBytes) {
        const advisorFileName = `cert_advisor_${status}_${paper.paper_code}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from('certificates')
          .upload(advisorFileName, advisorPdfBytes, { contentType: 'application/pdf', upsert: true });
        if (uploadError) throw new Error('อัปโหลดไฟล์เกียรติบัตรที่ปรึกษาล้มเหลว: ' + uploadError.message);
      }
    }
    
    if (paper.has_award && authorPublicUrl) {
      const { error: dbError } = await supabase.from('awards').update({ certificate_url: authorPublicUrl }).eq('paper_id', paper.paper_id);
      if (dbError) console.error('DB Update Error:', dbError);
    }
    
    if (!isBatch) {
      await fetchSavedFiles();
      alert('บันทึกเกียรติบัตรเข้าระบบเรียบร้อยแล้ว!');
    }
  } catch (e) {
    console.error('Save error:', e);
    if (!isBatch) alert('❌ ' + e.message);
    else throw e;
  } finally {
    if (!isBatch) generating.value = false;
  }
};

const deleteFromCloud = async (paper, role) => {
  if (!confirm(`ต้องการลบเกียรติบัตร${role === 'author' ? 'ผู้แต่ง' : 'ที่ปรึกษา'} ออกจากระบบคลาวด์ใช่หรือไม่?`)) return;
  
  const idx = finalists.value.findIndex(f => f.paper_id === paper.paper_id);
  const isFinalist = idx !== -1;
  const status = isFinalist ? 'finalist' : 'participant';
  const fileName = `cert_${role}_${status}_${paper.paper_code}.pdf`;
  
  generating.value = true;
  try {
    const { error } = await supabase.storage.from('certificates').remove([fileName]);
    if (error) throw new Error('ลบไฟล์ล้มเหลว: ' + error.message);
    
    if (role === 'author' && paper.has_award) {
      await supabase.from('awards').update({ certificate_url: null }).eq('paper_id', paper.paper_id);
    }
    
    await fetchSavedFiles();
    alert('ลบเกียรติบัตรเรียบร้อยแล้ว');
  } catch (e) {
    console.error('Delete error:', e);
    alert('เกิดข้อผิดพลาดในการลบ: ' + e.message);
  } finally {
    generating.value = false;
  }
};

const sendEmailOnly = (paper, role) => {
  const idx = finalists.value.findIndex(f => f.paper_id === paper.paper_id);
  const isFinalist = idx !== -1;
  const status = isFinalist ? 'finalist' : 'participant';
  const fileName = `cert_${role}_${status}_${paper.paper_code}.pdf`;
  const { data: { publicUrl } } = supabase.storage.from('certificates').getPublicUrl(fileName);

  const { authors, advisors } = getPaperMembers(paper);
  const targets = role === 'author' ? authors : advisors;
  
  const email = targets.map(t => t.email).filter(Boolean).join(',') || getAuthor(paper.author_id)?.email || '';
  const names = targets.map(t => `${t.prefix || ''}${t.first_name || ''} ${t.last_name || ''}`.trim()).join(', ');
  
  const subject = encodeURIComponent(`[การประชุมวิชาการ] เกียรติบัตรของคุณสำหรับบทความ ${paper.paper_code}`);
  const body = encodeURIComponent(`เรียนคุณ/อาจารย์ ${names},\n\nขอแสดงความยินดี! คุณสามารถดาวน์โหลดเกียรติบัตรของคุณในบทบาท "${role === 'author' ? 'ผู้แต่งบทความ' : 'อาจารย์ที่ปรึกษา'}" ได้จากลิงก์ด้านล่างนี้:\n${publicUrl}\n\nขอขอบคุณที่เข้าร่วมนำเสนอผลงานในงานประชุมวิชาการ BRICC Festival ครั้งที่ 9\nคณะผู้จัดงาน`);
  
  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
};

const generateAllFinalists = async () => {
  if (finalists.value.length === 0) return;
  generating.value = true;
  try {
    for (const paper of finalists.value) {
      await saveToCloudOnly(paper, true);
    }
    await fetchSavedFiles();
    alert('สร้างและบันทึกเกียรติบัตรทีมเข้ารอบทั้งหมดเรียบร้อยแล้ว');
  } catch (e) {
    alert('เกิดข้อผิดพลาด: ' + e.message);
  } finally {
    generating.value = false;
  }
};

const generateAllParticipants = async () => {
  if (participants.value.length === 0) return;
  generating.value = true;
  try {
    for (const paper of participants.value) {
      await saveToCloudOnly(paper, true);
    }
    await fetchSavedFiles();
    alert('สร้างและบันทึกเกียรติบัตรผู้เข้าร่วมทั้งหมดเรียบร้อยแล้ว');
  } catch (e) {
    alert('เกิดข้อผิดพลาด: ' + e.message);
  } finally {
    generating.value = false;
  }
};
</script>

<template>
  <ClientOnly>
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
        <p class="text-sm text-slate-500 mt-1">อัปโหลดไฟล์ PDF เทมเพลตเกียรติบัตรทั้ง 4 ประเภทและฟอนต์ เพื่อสร้างเกียรติบัตรแบบกลุ่มและแยกตามบทบาท</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
          <span class="text-xs font-black text-slate-500 uppercase tracking-widest">Year:</span>
          <select v-model="filterYear" class="text-sm font-black text-slate-800 bg-transparent focus:outline-none border-none">
            <option value="all">All</option>
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <button @click="loadData" class="flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-4 py-2.5 rounded-xl transition-all">
          <RefreshCw class="w-3.5 h-3.5" :class="loading ? 'animate-spin' : ''" />
          รีเฟรช
        </button>
      </div>
    </div>

    <!-- Upload Area (Font + 4 Templates) -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      <!-- Font Card -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
        <div>
          <h4 class="font-black text-xs text-slate-800 mb-2 flex items-center gap-1.5"><Type class="w-4 h-4 text-indigo-500" /> ฟอนต์ภาษาไทย (.ttf)</h4>
          <p class="text-[10px] text-slate-400 mb-3">จำเป็นสำหรับการแสดงอักษรไทย เช่น TH Sarabun</p>
        </div>
        <div v-if="!font.bytes" class="border border-dashed border-slate-200 hover:border-indigo-300 rounded-xl p-4 text-center cursor-pointer relative min-h-[90px] flex flex-col justify-center">
          <input type="file" accept=".ttf" @change="handleFontUpload" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          <Upload class="w-5 h-5 text-slate-300 mx-auto mb-1" />
          <div class="text-[10px] font-bold text-slate-400">เลือกไฟล์ .ttf</div>
        </div>
        <div v-else class="flex items-center justify-between bg-indigo-50 rounded-xl p-3 border border-indigo-150 min-h-[90px]">
          <div class="min-w-0 flex-1">
            <div class="font-black text-[11px] text-slate-700 truncate">{{ font.fileName }}</div>
            <div class="text-[9px] text-emerald-600 font-bold mt-1">พร้อมใช้งาน</div>
          </div>
          <button @click="clearFont" class="w-6 h-6 rounded-lg bg-white border border-indigo-200 flex items-center justify-center hover:bg-rose-50 hover:border-rose-100 shrink-0 ml-2">
            <X class="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      <!-- Author Finalist Card -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
        <div>
          <h4 class="font-black text-xs text-slate-800 mb-2 flex items-center gap-1.5"><FileText class="w-4 h-4 text-amber-500" /> ผู้แต่ง - ผ่านเข้ารอบ</h4>
          <p class="text-[10px] text-slate-400 mb-3">ไฟล์ PDF สำหรับผู้เสนอผลงานที่ผ่านเข้ารอบ</p>
        </div>
        <div v-if="!templates.author_finalist.bytes" class="border border-dashed border-slate-200 hover:border-amber-300 rounded-xl p-4 text-center cursor-pointer relative min-h-[90px] flex flex-col justify-center">
          <input type="file" accept=".pdf" @change="e => handleTemplateUpload('author_finalist', e)" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          <Upload class="w-5 h-5 text-slate-300 mx-auto mb-1" />
          <div class="text-[10px] font-bold text-slate-400">เลือกไฟล์ PDF</div>
        </div>
        <div v-else class="flex items-center justify-between bg-amber-50 rounded-xl p-3 border border-amber-150 min-h-[90px]">
          <div class="min-w-0 flex-1">
            <div class="font-black text-[11px] text-slate-700 truncate">{{ templates.author_finalist.fileName }}</div>
            <div class="text-[9px] text-emerald-600 font-bold mt-1">พร้อมใช้งาน</div>
          </div>
          <button @click="clearTemplate('author_finalist')" class="w-6 h-6 rounded-lg bg-white border border-amber-200 flex items-center justify-center hover:bg-rose-50 hover:border-rose-100 shrink-0 ml-2">
            <X class="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      <!-- Advisor Finalist Card -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
        <div>
          <h4 class="font-black text-xs text-slate-800 mb-2 flex items-center gap-1.5"><FileText class="w-4 h-4 text-orange-500" /> ที่ปรึกษา - ผ่านเข้ารอบ</h4>
          <p class="text-[10px] text-slate-400 mb-3">ไฟล์ PDF สำหรับอาจารย์ที่ปรึกษาที่ผ่านเข้ารอบ (หากเว้นว่าง จะใช้เทมเพลตของผู้แต่งแทน)</p>
        </div>
        <div v-if="!templates.advisor_finalist.bytes" class="border border-dashed border-slate-200 hover:border-orange-300 rounded-xl p-4 text-center cursor-pointer relative min-h-[90px] flex flex-col justify-center">
          <input type="file" accept=".pdf" @change="e => handleTemplateUpload('advisor_finalist', e)" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          <Upload class="w-5 h-5 text-slate-300 mx-auto mb-1" />
          <div class="text-[10px] font-bold text-slate-400">เลือกไฟล์ PDF</div>
        </div>
        <div v-else class="flex items-center justify-between bg-orange-50 rounded-xl p-3 border border-orange-150 min-h-[90px]">
          <div class="min-w-0 flex-1">
            <div class="font-black text-[11px] text-slate-700 truncate">{{ templates.advisor_finalist.fileName }}</div>
            <div class="text-[9px] text-emerald-600 font-bold mt-1">พร้อมใช้งาน</div>
          </div>
          <button @click="clearTemplate('advisor_finalist')" class="w-6 h-6 rounded-lg bg-white border border-orange-200 flex items-center justify-center hover:bg-rose-50 hover:border-rose-100 shrink-0 ml-2">
            <X class="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      <!-- Author Participant Card -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
        <div>
          <h4 class="font-black text-xs text-slate-800 mb-2 flex items-center gap-1.5"><FileText class="w-4 h-4 text-blue-500" /> ผู้แต่ง - เข้าร่วม</h4>
          <p class="text-[10px] text-slate-400 mb-3">ไฟล์ PDF สำหรับผู้เสนอผลงานที่เข้าร่วม</p>
        </div>
        <div v-if="!templates.author_participant.bytes" class="border border-dashed border-slate-200 hover:border-blue-300 rounded-xl p-4 text-center cursor-pointer relative min-h-[90px] flex flex-col justify-center">
          <input type="file" accept=".pdf" @change="e => handleTemplateUpload('author_participant', e)" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          <Upload class="w-5 h-5 text-slate-300 mx-auto mb-1" />
          <div class="text-[10px] font-bold text-slate-400">เลือกไฟล์ PDF</div>
        </div>
        <div v-else class="flex items-center justify-between bg-blue-50 rounded-xl p-3 border border-blue-150 min-h-[90px]">
          <div class="min-w-0 flex-1">
            <div class="font-black text-[11px] text-slate-700 truncate">{{ templates.author_participant.fileName }}</div>
            <div class="text-[9px] text-emerald-600 font-bold mt-1">พร้อมใช้งาน</div>
          </div>
          <button @click="clearTemplate('author_participant')" class="w-6 h-6 rounded-lg bg-white border border-blue-200 flex items-center justify-center hover:bg-rose-50 hover:border-rose-100 shrink-0 ml-2">
            <X class="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      <!-- Advisor Participant Card -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
        <div>
          <h4 class="font-black text-xs text-slate-800 mb-2 flex items-center gap-1.5"><FileText class="w-4 h-4 text-emerald-500" /> ที่ปรึกษา - เข้าร่วม</h4>
          <p class="text-[10px] text-slate-400 mb-3">ไฟล์ PDF สำหรับอาจารย์ที่ปรึกษาที่เข้าร่วม (หากเว้นว่าง จะใช้เทมเพลตของผู้แต่งแทน)</p>
        </div>
        <div v-if="!templates.advisor_participant.bytes" class="border border-dashed border-slate-200 hover:border-emerald-300 rounded-xl p-4 text-center cursor-pointer relative min-h-[90px] flex flex-col justify-center">
          <input type="file" accept=".pdf" @change="e => handleTemplateUpload('advisor_participant', e)" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          <Upload class="w-5 h-5 text-slate-300 mx-auto mb-1" />
          <div class="text-[10px] font-bold text-slate-400">เลือกไฟล์ PDF</div>
        </div>
        <div v-else class="flex items-center justify-between bg-emerald-50 rounded-xl p-3 border border-emerald-150 min-h-[90px]">
          <div class="min-w-0 flex-1">
            <div class="font-black text-[11px] text-slate-700 truncate">{{ templates.advisor_participant.fileName }}</div>
            <div class="text-[9px] text-emerald-600 font-bold mt-1">พร้อมใช้งาน</div>
          </div>
          <button @click="clearTemplate('advisor_participant')" class="w-6 h-6 rounded-lg bg-white border border-emerald-200 flex items-center justify-center hover:bg-rose-50 hover:border-rose-100 shrink-0 ml-2">
            <X class="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>
    </div>

    <!-- Position Editor Panel -->
    <div class="mb-8">
      <div class="flex items-center gap-4">
        <button @click="showConfig = !showConfig" class="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-5 py-3 rounded-2xl transition-all shadow-sm">
          <Settings class="w-4 h-4" /> ปรับแต่งตำแหน่งและขนาดตัวอักษรของทุกเทมเพลต
          <ChevronDown class="w-4 h-4 transition-transform ml-2" :class="{ 'rotate-180': showConfig }" />
        </button>

        <div v-if="showConfig" class="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button @click="previewMode = 'author_finalist'" :class="previewMode === 'author_finalist' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'" class="px-3.5 py-1.5 rounded-lg text-xs font-black transition-all">ผู้แต่ง (เข้ารอบ)</button>
          <button @click="previewMode = 'advisor_finalist'" :class="previewMode === 'advisor_finalist' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'" class="px-3.5 py-1.5 rounded-lg text-xs font-black transition-all">ที่ปรึกษา (เข้ารอบ)</button>
          <button @click="previewMode = 'author_participant'" :class="previewMode === 'author_participant' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'" class="px-3.5 py-1.5 rounded-lg text-xs font-black transition-all">ผู้แต่ง (เข้าร่วม)</button>
          <button @click="previewMode = 'advisor_participant'" :class="previewMode === 'advisor_participant' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'" class="px-3.5 py-1.5 rounded-lg text-xs font-black transition-all">ที่ปรึกษา (เข้าร่วม)</button>
        </div>
      </div>
      
      <div v-if="showConfig" class="mt-4 p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-6 animate-in fade-in slide-in-from-top-2">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <!-- Text Name Config -->
          <div class="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-3">
                <label class="text-xs font-black text-indigo-600 uppercase tracking-wide flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" v-model="templateConfig.authorName.enabled" @change="saveTemplatesToConfig" class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5">
                  ชื่อ-นามสกุล (Name)
                </label>
              </div>
              <div v-if="templateConfig.authorName.enabled !== false" class="space-y-3">
                <div>
                  <span class="text-[10px] font-bold text-slate-500 block mb-1">ตำแหน่งแกน Y (%)</span>
                  <input type="number" v-model.number="templateConfig.authorName.yPosPercent" @change="saveTemplatesToConfig" class="w-full h-9 px-3 rounded-lg bg-white border border-slate-200 text-xs font-bold">
                </div>
                <div>
                  <span class="text-[10px] font-bold text-slate-500 block mb-1">ขนาดอักษร</span>
                  <input type="number" v-model.number="templateConfig.authorName.size" @change="saveTemplatesToConfig" class="w-full h-9 px-3 rounded-lg bg-white border border-slate-200 text-xs font-bold">
                </div>
                <div>
                  <span class="text-[10px] font-bold text-slate-500 block mb-1">สีตัวอักษร</span>
                  <input type="color" v-model="templateConfig.authorName.color" @change="saveTemplatesToConfig" class="w-full h-9 p-1 rounded-lg bg-white border border-slate-200 cursor-pointer">
                </div>
                <div class="pt-2 border-t border-slate-200/50 flex flex-col gap-2">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" v-model="templateConfig.authorName.showPrefix" @change="saveTemplatesToConfig" class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5">
                    <span class="text-[10px] font-bold text-slate-650">แสดงคำนำหน้า (Prefix)</span>
                  </label>
                  <div>
                    <span class="text-[10px] font-bold text-slate-500 block mb-1">ภาษาที่ใช้</span>
                    <select v-model="templateConfig.authorName.language" @change="saveTemplatesToConfig" class="w-full h-8 px-2 rounded-md bg-white border border-slate-200 text-[10px] font-bold focus:outline-none">
                      <option value="th">ภาษาไทย (Thai)</option>
                      <option value="en">ภาษาอังกฤษ (English)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div v-else class="py-6 text-center text-xs text-slate-400 font-bold">ปิดการใช้งาน</div>
            </div>
          </div>

          <!-- Institution Config -->
          <div class="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-3">
                <label class="text-xs font-black text-teal-600 uppercase tracking-wide flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" v-model="templateConfig.institution.enabled" @change="saveTemplatesToConfig" class="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-3.5 h-3.5">
                  สถาบัน (Institution)
                </label>
              </div>
              <div v-if="templateConfig.institution.enabled !== false" class="space-y-3">
                <div>
                  <span class="text-[10px] font-bold text-slate-500 block mb-1">ตำแหน่งแกน Y (%)</span>
                  <input type="number" v-model.number="templateConfig.institution.yPosPercent" @change="saveTemplatesToConfig" class="w-full h-9 px-3 rounded-lg bg-white border border-slate-200 text-xs font-bold">
                </div>
                <div>
                  <span class="text-[10px] font-bold text-slate-500 block mb-1">ขนาดอักษร</span>
                  <input type="number" v-model.number="templateConfig.institution.size" @change="saveTemplatesToConfig" class="w-full h-9 px-3 rounded-lg bg-white border border-slate-200 text-xs font-bold">
                </div>
                <div>
                  <span class="text-[10px] font-bold text-slate-500 block mb-1">สีตัวอักษร</span>
                  <input type="color" v-model="templateConfig.institution.color" @change="saveTemplatesToConfig" class="w-full h-9 p-1 rounded-lg bg-white border border-slate-200 cursor-pointer">
                </div>
              </div>
              <div v-else class="py-6 text-center text-xs text-slate-400 font-bold">ปิดการใช้งาน</div>
            </div>
          </div>

          <!-- Award Config -->
          <div class="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-3">
                <label class="text-xs font-black text-amber-600 uppercase tracking-wide flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" v-model="templateConfig.awardText.enabled" @change="saveTemplatesToConfig" class="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5">
                  ข้อความรางวัล (Award Text)
                </label>
              </div>
              <div v-if="templateConfig.awardText.enabled !== false" class="space-y-3">
                <div>
                  <span class="text-[10px] font-bold text-slate-500 block mb-1">ตำแหน่งแกน Y (%)</span>
                  <input type="number" v-model.number="templateConfig.awardText.yPosPercent" @change="saveTemplatesToConfig" class="w-full h-9 px-3 rounded-lg bg-white border border-slate-200 text-xs font-bold">
                </div>
                <div>
                  <span class="text-[10px] font-bold text-slate-500 block mb-1">ขนาดอักษร</span>
                  <input type="number" v-model.number="templateConfig.awardText.size" @change="saveTemplatesToConfig" class="w-full h-9 px-3 rounded-lg bg-white border border-slate-200 text-xs font-bold">
                </div>
                <div>
                  <span class="text-[10px] font-bold text-slate-500 block mb-1">สีตัวอักษร</span>
                  <input type="color" v-model="templateConfig.awardText.color" @change="saveTemplatesToConfig" class="w-full h-9 p-1 rounded-lg bg-white border border-slate-200 cursor-pointer">
                </div>
              </div>
              <div v-else class="py-6 text-center text-xs text-slate-400 font-bold">ปิดการใช้งาน</div>
            </div>
          </div>

          <!-- Paper Title Config -->
          <div class="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-3">
                <label class="text-xs font-black text-rose-650 uppercase tracking-wide flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" v-model="templateConfig.paperTitle.enabled" @change="saveTemplatesToConfig" class="rounded border-slate-300 text-rose-650 focus:ring-rose-500 w-3.5 h-3.5">
                  ชื่อบทความ (Paper Title)
                </label>
              </div>
              <div v-if="templateConfig.paperTitle.enabled !== false" class="space-y-3">
                <div>
                  <span class="text-[10px] font-bold text-slate-500 block mb-1">ตำแหน่งแกน Y (%)</span>
                  <input type="number" v-model.number="templateConfig.paperTitle.yPosPercent" @change="saveTemplatesToConfig" class="w-full h-9 px-3 rounded-lg bg-white border border-slate-200 text-xs font-bold">
                </div>
                <div>
                  <span class="text-[10px] font-bold text-slate-500 block mb-1">ขนาดอักษร</span>
                  <input type="number" v-model.number="templateConfig.paperTitle.size" @change="saveTemplatesToConfig" class="w-full h-9 px-3 rounded-lg bg-white border border-slate-200 text-xs font-bold">
                </div>
                <div>
                  <span class="text-[10px] font-bold text-slate-500 block mb-1">สีตัวอักษร</span>
                  <input type="color" v-model="templateConfig.paperTitle.color" @change="saveTemplatesToConfig" class="w-full h-9 p-1 rounded-lg bg-white border border-slate-200 cursor-pointer">
                </div>
                <div class="pt-2 border-t border-slate-200/50">
                  <span class="text-[10px] font-bold text-slate-500 block mb-1">รูปแบบบทความ (ใช้ {title})</span>
                  <input type="text" v-model="templateConfig.paperTitle.textTemplate" @change="saveTemplatesToConfig" placeholder='บทความเรื่อง "{title}"' class="w-full h-8 px-2 rounded bg-white border border-slate-200 text-[10px] font-bold focus:outline-none">
                </div>
              </div>
              <div v-else class="py-6 text-center text-xs text-slate-400 font-bold">ปิดการใช้งาน</div>
            </div>
          </div>
        </div>

        <!-- Conditional Wording Templates -->
        <div v-if="templateConfig.awardText.enabled !== false" class="pt-6 border-t border-slate-200/80">
          <h4 class="text-xs font-black text-slate-700 uppercase tracking-wider mb-4">ข้อความรางวัล/บทบาทตามเงื่อนไข (Wording Templates)</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span class="text-[10px] font-bold text-slate-500 block mb-1">ผู้แต่ง - ได้รับรางวัลชนะเลิศ/รอง/ชมเชย (ใช้ {award})</span>
              <input type="text" v-model="templateConfig.awardText.textAuthorWinner" @change="saveTemplatesToConfig" class="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold">
            </div>
            <div>
              <span class="text-[10px] font-bold text-slate-500 block mb-1">ที่ปรึกษา - ได้รับรางวัลชนะเลิศ/รอง/ชมเชย (ใช้ {award})</span>
              <input type="text" v-model="templateConfig.awardText.textAdvisorWinner" @change="saveTemplatesToConfig" class="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold">
            </div>
            <div>
              <span class="text-[10px] font-bold text-slate-500 block mb-1">ผู้แต่ง - ผ่านเข้ารอบสุดท้าย (Finalist)</span>
              <input type="text" v-model="templateConfig.awardText.textAuthorFinalist" @change="saveTemplatesToConfig" class="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold">
            </div>
            <div>
              <span class="text-[10px] font-bold text-slate-500 block mb-1">ที่ปรึกษา - ผ่านเข้ารอบสุดท้าย (Finalist)</span>
              <input type="text" v-model="templateConfig.awardText.textAdvisorFinalist" @change="saveTemplatesToConfig" class="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold">
            </div>
            <div>
              <span class="text-[10px] font-bold text-slate-500 block mb-1">ผู้แต่ง - เข้าร่วมนำเสนอผลงาน (Participant)</span>
              <input type="text" v-model="templateConfig.awardText.textAuthorParticipant" @change="saveTemplatesToConfig" class="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold">
            </div>
            <div>
              <span class="text-[10px] font-bold text-slate-500 block mb-1">ที่ปรึกษา - เข้าร่วมนำเสนอผลงาน (Participant)</span>
              <input type="text" v-model="templateConfig.awardText.textAdvisorParticipant" @change="saveTemplatesToConfig" class="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold">
            </div>
          </div>
        </div>

        <!-- Drag Canvas Visual Editor -->
        <div class="pt-6 border-t border-slate-200">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h4 class="text-sm font-black text-slate-800">Visual Layout Editor Preview (จำลองระยะกระดาษแนวตั้ง/นอน)</h4>
              <p class="text-[11px] text-slate-500 mt-0.5">คุณสามารถลากข้อความเพื่อปรับพิกัดแกน Y ขึ้น-ลงได้ทันที</p>
            </div>
            <span class="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">กำลังปรับ: {{ previewMode }}</span>
          </div>

          <div class="relative w-full aspect-[1.414] max-w-3xl mx-auto bg-slate-50 rounded-2xl overflow-hidden shadow-inner border-2 border-slate-350 border-dashed" ref="canvasRef">
            <iframe v-if="currentTemplateUrl" :src="currentTemplateUrl + '#toolbar=0&navpanes=0&scrollbar=0&view=FitH'" class="absolute inset-0 w-full h-full pointer-events-none opacity-40" tabindex="-1"></iframe>
            <div v-else class="absolute inset-0 flex items-center justify-center text-slate-300 font-black text-xl uppercase tracking-widest select-none">ไม่ได้อัปโหลดเทมเพลต {{ previewMode }}</div>
            
            <div class="absolute inset-0 z-10" @mousemove="onDrag" @mouseup="stopDrag" @mouseleave="stopDrag">
              <div class="absolute top-0 bottom-0 left-1/2 w-[1px] bg-indigo-500/25 border-l border-dashed"></div>
              
              <template v-for="(item, key) in templateConfig" :key="key">
                <div v-if="item.enabled !== false"
                     class="absolute cursor-ns-resize px-4 py-1.5 transform -translate-x-1/2 translate-y-1/2 border border-transparent hover:border-indigo-400 hover:bg-indigo-50/90 rounded-lg select-none transition-all duration-75 group flex flex-col items-center justify-center whitespace-nowrap"
                     :class="{ 'border-indigo-500 bg-indigo-100 shadow-md z-20 scale-105': activeDrag === key }"
                     :style="{ left: '50%', bottom: item.yPosPercent + '%', fontSize: (item.size * 0.7) + 'px', color: item.color }"
                     @mousedown.prevent="startDrag($event, key)">
                  <div class="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">Y: {{ item.yPosPercent }}%</div>
                  <span class="font-black drop-shadow-sm text-xs">
                    <template v-if="key === 'authorName'">[ชื่อ-นามสกุลผู้นำเสนอ]</template>
                    <template v-else-if="key === 'institution'">[ชื่อมหาวิทยาลัย/หน่วยงานต้นสังกัด]</template>
                    <template v-else-if="key === 'awardText'">{{ getAwardTextPreview() }}</template>
                    <template v-else-if="key === 'paperTitle'">{{ (templateConfig.paperTitle.textTemplate || 'บทความเรื่อง "{title}"').replace('{title}', 'ชื่อบทความวิจัย') }}</template>
                  </span>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <RefreshCw class="w-8 h-8 text-slate-300 animate-spin" />
    </div>

    <template v-else-if="rankedPapers.length > 0">
      <!-- Group 1: Finalist Table -->
      <div class="mb-10">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <Trophy class="w-5 h-5 text-amber-500" />
            <h3 class="text-lg font-black text-slate-800">กลุ่มผ่านเข้ารอบ (Finalists - Top {{ finalistCount }})</h3>
            <span class="text-xs text-slate-400">บทความที่ได้อันดับ 1 ถึง {{ finalistCount }}</span>
          </div>
          <button @click="generateAllFinalists" :disabled="generating || finalists.length === 0 || !isReady" class="flex items-center gap-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-xl transition-all shadow-sm">
            <Printer class="w-3.5 h-3.5" />
            สร้างเกียรติบัตรกลุ่มเข้ารอบทั้งหมด ({{ finalists.length }} ทีม)
          </button>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th class="text-left px-5 py-4 text-xs font-black text-slate-500 uppercase w-16">อันดับ</th>
                <th class="text-left px-5 py-4 text-xs font-black text-slate-500 uppercase">บทความ / รหัส</th>
                <th class="text-left px-5 py-4 text-xs font-black text-slate-500 uppercase">รายชื่อผู้แต่งบทความ (Author)</th>
                <th class="text-left px-5 py-4 text-xs font-black text-slate-500 uppercase">รายชื่อที่ปรึกษา (Advisor)</th>
                <th class="text-center px-5 py-4 text-xs font-black text-slate-500 uppercase">คะแนนเฉลี่ย (Phase 2)</th>
                <th class="text-center px-5 py-4 text-xs font-black text-slate-500 uppercase">จัดการ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="(paper, idx) in finalists" :key="paper.paper_id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-5 py-4">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm"
                    :class="idx < 3 ? 'bg-amber-50 text-amber-600' : idx < 6 ? 'bg-sky-50 text-sky-600' : 'bg-slate-100 text-slate-600'">
                    {{ idx < 3 ? awardEmoji(idx) : idx + 1 }}
                  </div>
                </td>
                <td class="px-5 py-4 min-w-[200px] max-w-xs">
                  <div class="font-black text-slate-800 text-xs truncate">{{ paper.paper_code }}</div>
                  <div class="font-bold text-slate-700 text-xs mt-0.5 line-clamp-2 leading-relaxed">{{ paper.title_th }}</div>
                  <div v-if="paper.has_award" class="mt-1 flex">
                    <span class="bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded-full">
                      🏆 {{ awardLabel(idx) }}
                    </span>
                  </div>
                </td>
                <td class="px-5 py-4 text-xs">
                  <div class="font-black text-slate-800">{{ formatMembersListStr(getPaperMembers(paper).authors) }}</div>
                  <div class="text-[10px] text-slate-450 mt-1 truncate">{{ getPaperMembers(paper).authors[0]?.institution || '-' }}</div>
                </td>
                <td class="px-5 py-4 text-xs">
                  <div class="font-bold text-slate-600">{{ formatMembersListStr(getPaperMembers(paper).advisors) || 'ไม่มี' }}</div>
                  <div class="text-[10px] text-slate-400 mt-1 truncate">{{ getPaperMembers(paper).advisors[0]?.institution || '-' }}</div>
                </td>
                <td class="px-5 py-4 text-center">
                  <span class="text-base font-black text-amber-500">{{ paper.phase2_avg }}</span>
                  <div class="text-[9px] text-slate-400 font-bold">/100</div>
                </td>
                <td class="px-5 py-4">
                  <div class="flex flex-col gap-2 min-w-[280px]">
                    <!-- Authors Cert Panel -->
                    <div class="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span class="text-[10px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">เกียรติบัตรผู้แต่ง:</span>
                      <div class="flex gap-1">
                        <button @click="generateCertificate(paper, idx, 'author', 'preview')" :disabled="generating || !isReady" class="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors">
                          <Eye class="w-3 h-3" /> พรีวิว
                        </button>
                        <button @click="generateCertificate(paper, idx, 'author')" :disabled="generating || !isReady" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors">
                          <Download class="w-3 h-3" /> โหลดตรวจ
                        </button>
                        <button @click="saveToCloudOnly(paper)" :disabled="generating || !isReady" 
                                :class="getSavedStatus(paper, 'author') ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600'" 
                                class="px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors">
                          <CheckCircle2 v-if="getSavedStatus(paper, 'author')" class="w-3 h-3" />
                          <Upload v-else class="w-3 h-3" /> {{ getSavedStatus(paper, 'author') ? 'บันทึกแล้ว' : 'บันทึก' }}
                        </button>
                        <button v-if="getSavedStatus(paper, 'author')" @click="deleteFromCloud(paper, 'author')" :disabled="generating || !isReady" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors">
                          <Trash2 class="w-3 h-3" /> ลบ
                        </button>
                        <button @click="sendEmailOnly(paper, 'author')" :disabled="generating || !isReady" class="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors">
                          <Mail class="w-3 h-3" /> อีเมล
                        </button>
                      </div>
                    </div>
                    <!-- Advisors Cert Panel -->
                    <div v-if="getPaperMembers(paper).advisors.length > 0" class="flex items-center justify-between">
                      <span class="text-[10px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">เกียรติบัตรที่ปรึกษา:</span>
                      <div class="flex gap-1">
                        <button @click="generateCertificate(paper, idx, 'advisor', 'preview')" :disabled="generating || !isReady" class="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors">
                          <Eye class="w-3 h-3" /> พรีวิว
                        </button>
                        <button @click="generateCertificate(paper, idx, 'advisor')" :disabled="generating || !isReady" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors">
                          <Download class="w-3 h-3" /> โหลดตรวจ
                        </button>
                        <button @click="saveToCloudOnly(paper)" :disabled="generating || !isReady" 
                                :class="getSavedStatus(paper, 'advisor') ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600'" 
                                class="px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors">
                          <CheckCircle2 v-if="getSavedStatus(paper, 'advisor')" class="w-3 h-3" />
                          <Upload v-else class="w-3 h-3" /> {{ getSavedStatus(paper, 'advisor') ? 'บันทึกแล้ว' : 'บันทึก' }}
                        </button>
                        <button v-if="getSavedStatus(paper, 'advisor')" @click="deleteFromCloud(paper, 'advisor')" :disabled="generating || !isReady" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors">
                          <Trash2 class="w-3 h-3" /> ลบ
                        </button>
                        <button @click="sendEmailOnly(paper, 'advisor')" :disabled="generating || !isReady" class="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors">
                          <Mail class="w-3 h-3" /> อีเมล
                        </button>
                      </div>
                    </div>
                    <div v-else class="text-right text-[10px] text-slate-400 font-bold">ไม่มีอาจารย์ที่ปรึกษา</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Group 2: Participant Table -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <Medal class="w-5 h-5 text-indigo-500" />
            <h3 class="text-lg font-black text-slate-800">กลุ่มเข้าร่วม (Participants - อันดับ {{ finalistCount + 1 }}+)</h3>
            <span class="text-xs text-slate-400">บทความที่อยู่ต่ำกว่าอันดับ {{ finalistCount }}</span>
          </div>
          <button @click="generateAllParticipants" :disabled="generating || participants.length === 0 || !isReady" class="flex items-center gap-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-xl transition-all shadow-sm">
            <Printer class="w-3.5 h-3.5" />
            สร้างเกียรติบัตรผู้เข้าร่วมทั้งหมด ({{ participants.length }} ทีม)
          </button>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th class="text-left px-5 py-4 text-xs font-black text-slate-500 uppercase w-16">อันดับ</th>
                <th class="text-left px-5 py-4 text-xs font-black text-slate-500 uppercase">บทความ / รหัส</th>
                <th class="text-left px-5 py-4 text-xs font-black text-slate-500 uppercase">รายชื่อผู้แต่งบทความ (Author)</th>
                <th class="text-left px-5 py-4 text-xs font-black text-slate-500 uppercase">รายชื่อที่ปรึกษา (Advisor)</th>
                <th class="text-center px-5 py-4 text-xs font-black text-slate-500 uppercase">คะแนนเฉลี่ย (Phase 1)</th>
                <th class="text-center px-5 py-4 text-xs font-black text-slate-500 uppercase">จัดการ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="(paper, idx) in participants" :key="paper.paper_id" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-5 py-4">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center font-black text-slate-500 text-xs border border-slate-200 bg-slate-50">
                    {{ finalistCount + idx + 1 }}
                  </div>
                </td>
                <td class="px-5 py-4 min-w-[200px] max-w-xs">
                  <div class="font-black text-slate-800 text-xs truncate">{{ paper.paper_code }}</div>
                  <div class="font-bold text-slate-700 text-xs mt-0.5 line-clamp-2 leading-relaxed">{{ paper.title_th }}</div>
                </td>
                <td class="px-5 py-4 text-xs">
                  <div class="font-black text-slate-800">{{ formatMembersListStr(getPaperMembers(paper).authors) }}</div>
                  <div class="text-[10px] text-slate-450 mt-1 truncate">{{ getPaperMembers(paper).authors[0]?.institution || '-' }}</div>
                </td>
                <td class="px-5 py-4 text-xs">
                  <div class="font-bold text-slate-600">{{ formatMembersListStr(getPaperMembers(paper).advisors) || 'ไม่มี' }}</div>
                  <div class="text-[10px] text-slate-400 mt-1 truncate">{{ getPaperMembers(paper).advisors[0]?.institution || '-' }}</div>
                </td>
                <td class="px-5 py-4 text-center">
                  <span class="text-base font-black text-slate-600">{{ paper.phase1_avg }}</span>
                  <div class="text-[9px] text-slate-400 font-bold">/100</div>
                </td>
                <td class="px-5 py-4">
                  <div class="flex flex-col gap-2 min-w-[280px]">
                    <!-- Authors Cert Panel -->
                    <div class="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span class="text-[10px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">เกียรติบัตรผู้แต่ง:</span>
                      <div class="flex gap-1">
                        <button @click="generateCertificate(paper, -1, 'author', 'preview')" :disabled="generating || !isReady" class="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors">
                          <Eye class="w-3 h-3" /> พรีวิว
                        </button>
                        <button @click="generateCertificate(paper, -1, 'author')" :disabled="generating || !isReady" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors">
                          <Download class="w-3 h-3" /> โหลดตรวจ
                        </button>
                        <button @click="saveToCloudOnly(paper)" :disabled="generating || !isReady" 
                                :class="getSavedStatus(paper, 'author') ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600'" 
                                class="px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors">
                          <CheckCircle2 v-if="getSavedStatus(paper, 'author')" class="w-3 h-3" />
                          <Upload v-else class="w-3 h-3" /> {{ getSavedStatus(paper, 'author') ? 'บันทึกแล้ว' : 'บันทึก' }}
                        </button>
                        <button v-if="getSavedStatus(paper, 'author')" @click="deleteFromCloud(paper, 'author')" :disabled="generating || !isReady" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors">
                          <Trash2 class="w-3 h-3" /> ลบ
                        </button>
                        <button @click="sendEmailOnly(paper, 'author')" :disabled="generating || !isReady" class="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors">
                          <Mail class="w-3 h-3" /> อีเมล
                        </button>
                      </div>
                    </div>
                    <!-- Advisors Cert Panel -->
                    <div v-if="getPaperMembers(paper).advisors.length > 0" class="flex items-center justify-between">
                      <span class="text-[10px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">เกียรติบัตรที่ปรึกษา:</span>
                      <div class="flex gap-1">
                        <button @click="generateCertificate(paper, -1, 'advisor', 'preview')" :disabled="generating || !isReady" class="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors">
                          <Eye class="w-3 h-3" /> พรีวิว
                        </button>
                        <button @click="generateCertificate(paper, -1, 'advisor')" :disabled="generating || !isReady" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors">
                          <Download class="w-3 h-3" /> โหลดตรวจ
                        </button>
                        <button @click="saveToCloudOnly(paper)" :disabled="generating || !isReady" 
                                :class="getSavedStatus(paper, 'advisor') ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600'" 
                                class="px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors">
                          <CheckCircle2 v-if="getSavedStatus(paper, 'advisor')" class="w-3 h-3" />
                          <Upload v-else class="w-3 h-3" /> {{ getSavedStatus(paper, 'advisor') ? 'บันทึกแล้ว' : 'บันทึก' }}
                        </button>
                        <button v-if="getSavedStatus(paper, 'advisor')" @click="deleteFromCloud(paper, 'advisor')" :disabled="generating || !isReady" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors">
                          <Trash2 class="w-3 h-3" /> ลบ
                        </button>
                        <button @click="sendEmailOnly(paper, 'advisor')" :disabled="generating || !isReady" class="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors">
                          <Mail class="w-3 h-3" /> อีเมล
                        </button>
                      </div>
                    </div>
                    <div v-else class="text-right text-[10px] text-slate-400 font-bold">ไม่มีอาจารย์ที่ปรึกษา</div>
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
      <div class="font-bold text-slate-500">ยังไม่มีคะแนนประเมิน (Phase 1 หรือ Phase 2)</div>
      <div class="text-sm text-slate-400 mt-1">กรรมการต้องกรอกคะแนนประเมินในระบบก่อนจึงจะสร้างเกียรติบัตรได้</div>
    </div>

    <!-- Generating Overlay -->
    <div v-if="generating" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div class="bg-white rounded-3xl p-10 shadow-2xl text-center">
        <Loader2 class="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
        <div class="font-black text-slate-800 text-lg">กำลังจัดการเกียรติบัตร...</div>
        <div class="text-sm text-slate-500 mt-1">กรุณารอสักครู่ ห้ามปิดหน้านี้</div>
      </div>
    </div>
  </div>
  </ClientOnly>
</template>
