<script setup>
definePageMeta({ layout: false });
import { ArrowLeft, X } from 'lucide-vue-next';

const handleBack = () => {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.close();
  }
};
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 py-12 px-6 font-sans">
    <div class="max-w-3xl mx-auto">
      <div class="flex items-center justify-between mb-8">
        <button @click="handleBack" class="inline-flex items-center gap-2 text-[13px] font-bold text-purple-500 hover:text-purple-700 transition-colors">
          <ArrowLeft class="w-4 h-4" /> กลับ
        </button>
        <button @click="window.close()" class="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-400 hover:text-slate-600 transition-colors">
          <X class="w-4 h-4" /> ปิดหน้าต่างนี้
        </button>
      </div>

      <div class="bg-white rounded-[32px] border border-purple-100 shadow-sm p-8 md:p-12">
        <h1 class="text-3xl font-black text-purple-950 tracking-tight">เงื่อนไขและข้อกำหนด</h1>
        <p class="mt-2 text-sm font-semibold text-purple-500">Terms & Conditions — BRICC Festival 2027</p>

        <div class="mt-8 space-y-6 text-[14px] font-medium text-slate-700 leading-relaxed">
          <section>
            <h2 class="text-lg font-black text-slate-900 mb-2">1. การยอมรับเงื่อนไข</h2>
            <p>การลงทะเบียนและใช้งานระบบ Author Portal ของการประชุมวิชาการ BRICC Festival 2027 ถือว่าท่านได้ยอมรับเงื่อนไขและข้อกำหนดทั้งหมดที่ระบุไว้ในเอกสารนี้แล้ว</p>
          </section>

          <section>
            <h2 class="text-lg font-black text-slate-900 mb-2">2. สิทธิ์ในการใช้งาน</h2>
            <p>ระบบนี้ให้บริการเฉพาะผู้ส่งบทความ (Author) ที่ได้ลงทะเบียนอย่างถูกต้องเท่านั้น ห้ามมิให้ผู้ใดใช้บัญชีของผู้อื่นเข้าสู่ระบบ หรือเผยแพร่ข้อมูลการเข้าถึงบัญชีแก่บุคคลภายนอก</p>
          </section>

          <section>
            <h2 class="text-lg font-black text-slate-900 mb-2">3. ความถูกต้องของข้อมูล</h2>
            <p>ผู้ใช้งานมีหน้าที่รับผิดชอบในการกรอกข้อมูลส่วนตัวให้ถูกต้อง ครบถ้วน และเป็นปัจจุบัน โดยเฉพาะอย่างยิ่งชื่อ-นามสกุลภาษาอังกฤษ ซึ่งจะถูกนำไปใช้ในการออกใบประกาศนียบัตร (Certificate)</p>
          </section>

          <section>
            <h2 class="text-lg font-black text-slate-900 mb-2">4. ลิขสิทธิ์บทความ</h2>
            <p>บทความที่ส่งเข้าประกวดต้องเป็นผลงานของผู้ส่งเอง หรือได้รับอนุญาตจากเจ้าของลิขสิทธิ์แล้ว ผู้จัดงานสงวนสิทธิ์ในการนำบทความไปเผยแพร่ในรายงานสืบเนื่องจากการประชุม (Proceedings)</p>
          </section>

          <section>
            <h2 class="text-lg font-black text-slate-900 mb-2">5. การยกเลิกหรือเปลี่ยนแปลง</h2>
            <p>ผู้จัดงานสงวนสิทธิ์ในการเปลี่ยนแปลงเงื่อนไข กำหนดการ หรือรูปแบบการจัดงานโดยไม่ต้องแจ้งให้ทราบล่วงหน้า</p>
          </section>

          <section>
            <h2 class="text-lg font-black text-slate-900 mb-2">6. ข้อจำกัดความรับผิดชอบ</h2>
            <p>ผู้จัดงานจะไม่รับผิดชอบต่อความเสียหายใดๆ ที่เกิดจากการใช้งานระบบ รวมถึงการสูญเสียข้อมูลอันเนื่องมาจากเหตุสุดวิสัย</p>
          </section>
        </div>

        <div class="mt-10 pt-6 border-t border-slate-100 text-[12px] font-semibold text-slate-400">
          ปรับปรุงล่าสุด: พฤษภาคม 2027 | BRICC Festival 2027 — Buriram Rajabhat University
        </div>
      </div>
    </div>
  </div>
</template>
