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
        <h1 class="text-3xl font-black text-purple-950 tracking-tight">นโยบายความเป็นส่วนตัว</h1>
        <p class="mt-2 text-sm font-semibold text-purple-500">Privacy Policy — BRICC Festival 2027</p>

        <div class="mt-8 space-y-6 text-[14px] font-medium text-slate-700 leading-relaxed">
          <section>
            <h2 class="text-lg font-black text-slate-900 mb-2">1. ข้อมูลที่เราเก็บรวบรวม</h2>
            <p>เราเก็บรวบรวมข้อมูลส่วนบุคคลที่ท่านให้ไว้ขณะลงทะเบียน ได้แก่ ชื่อ-นามสกุล อีเมล เบอร์โทรศัพท์ สังกัด ตำแหน่งทางวิชาการ และจังหวัด เพื่อใช้ในการจัดการระบบการประชุมวิชาการ</p>
          </section>

          <section>
            <h2 class="text-lg font-black text-slate-900 mb-2">2. วัตถุประสงค์ในการใช้ข้อมูล</h2>
            <ul class="list-disc pl-5 space-y-1 mt-2">
              <li>จัดการบทความและกระบวนการ Peer Review</li>
              <li>ติดต่อสื่อสารเกี่ยวกับการประชุมวิชาการ</li>
              <li>ออกใบประกาศนียบัตร (Certificate)</li>
              <li>จัดทำรายงานสถิติภาพรวม (ไม่ระบุตัวตน)</li>
            </ul>
          </section>

          <section>
            <h2 class="text-lg font-black text-slate-900 mb-2">3. การปกป้องข้อมูล</h2>
            <p>เราใช้มาตรการรักษาความปลอดภัยตามมาตรฐาน เช่น การเข้ารหัสข้อมูล (Encryption) การยืนยันตัวตนแบบหลายขั้นตอน และการจำกัดสิทธิ์การเข้าถึงข้อมูลเฉพาะผู้ที่เกี่ยวข้องเท่านั้น</p>
          </section>

          <section>
            <h2 class="text-lg font-black text-slate-900 mb-2">4. การเปิดเผยข้อมูลแก่บุคคลภายนอก</h2>
            <p>เราจะไม่เปิดเผย จำหน่าย หรือแลกเปลี่ยนข้อมูลส่วนบุคคลของท่านแก่บุคคลภายนอก ยกเว้นกรณีที่จำเป็นตามกฎหมาย หรือได้รับความยินยอมจากท่านแล้ว</p>
          </section>

          <section>
            <h2 class="text-lg font-black text-slate-900 mb-2">5. สิทธิ์ของเจ้าของข้อมูล</h2>
            <p>ท่านมีสิทธิ์ในการเข้าถึง แก้ไข ลบ หรือขอสำเนาข้อมูลส่วนบุคคลของท่านได้ตลอดเวลาผ่านหน้าการตั้งค่า (Settings) หรือติดต่อผู้จัดงานโดยตรง</p>
          </section>

          <section>
            <h2 class="text-lg font-black text-slate-900 mb-2">6. การเปลี่ยนแปลงนโยบาย</h2>
            <p>เราสงวนสิทธิ์ในการเปลี่ยนแปลงนโยบายความเป็นส่วนตัวนี้ได้ตลอดเวลา โดยจะแจ้งให้ทราบผ่านทางระบบ</p>
          </section>
        </div>

        <div class="mt-10 pt-6 border-t border-slate-100 text-[12px] font-semibold text-slate-400">
          ปรับปรุงล่าสุด: พฤษภาคม 2027 | BRICC Festival 2027 — Buriram Rajabhat University
        </div>
      </div>
    </div>
  </div>
</template>
