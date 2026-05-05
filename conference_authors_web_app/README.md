# IC-Sci 2025 Conference Management System

ระบบบริหารจัดการงานประชุมวิชาการระดับชาติ คณะวิทยาศาสตร์ มหาวิทยาลัยราชภัฏบุรีรัมย์

## 📋 ภาพรวมโครงการ

**ชื่อโครงการ:** ระบบบริหารจัดการงานประชุมวิชาการระดับชาติ คณะวิทยาศาสตร์ มหาวิทยาลัยราชภัฏบุรีรัมย์ (IC-Sci 2025)

**วิสัยทัศน์:** พลิกโฉมการจัดงานประชุมวิชาการจากระบบเอกสาร/อีเมล สู่รูปแบบ Digital Platform 100% ที่ทันสมัย ใช้งานง่าย และตรวจสอบได้ทุกขั้นตอน

## 🌐 ระบบนิเวศของโครงการ

โปรเจกต์นี้เป็น Cross-platform Solution ที่เชื่อมโยงกันสมบูรณ์แบบ:

### 1. Web Application (Responsive Web)
- **Target:** ครอบคลุมทั้ง Author, Reviewer, และ Admin
- **Role:** เป็น "โต๊ะทำงานหลัก" (Workspace) สำหรับงานเอกสารและงานบริหารจัดการ

**Key Features:**
- 📝 **Submission Wizard:** ระบบส่งบทความ 4 ขั้นตอนที่ง่ายและเป็นระบบ
- 🧐 **Reviewer Console:** หน้าจอตรวจงานที่แบ่งครึ่งหน้าจอ (Split View) อ่านไปให้คะแนนไปได้เลย
- ⚙️ **Admin Dashboard:** แผงควบคุมกลางสำหรับบริหารจัดคน เงิน และบทความ

### 2. Mobile Application (Native App)
- **Target:** เน้นกลุ่ม Author (ผู้ส่งบทความ) และ Participant (ผู้เข้าร่วมงาน)
- **Role:** เป็น "ผู้ช่วยส่วนตัว" ที่พกพาไปได้ทุกที่

**Key Features:**
- 🔔 **Notifications:** แจ้งเตือนสถานะบทความ, การเงิน, และห้องนำเสนอแบบ Real-time
- 📅 **Smart Schedule:** ตารางงานและห้องนำเสนอส่วนตัว
- 🏆 **Digital Awards:** เก็บเกียรติบัตรและรางวัลในรูปแบบดิจิทัล
- 💳 **Quick Payment:** สแกนจ่ายและแนบสลิปผ่านมือถือ

## 👥 User Journeys (เส้นทางผู้ใช้งาน 3 กลุ่ม)

### 1. Author (ผู้ส่งบทความ)
**Pain Point เดิม:** ไม่รู้ว่างานถึงขั้นตอนไหน, ลืม Deadline, เอกสารหาย

**Solution:** Dashboard & Timeline ที่บอกสถานะชัดเจน (เขียว/เหลือง/แดง) และระบบแจ้งเตือนอัตโนมัติเมื่อต้องแก้ไขหรือชำระเงิน

### 2. Reviewer (ผู้ประเมิน)
**Pain Point เดิม:** ต้องโหลดไฟล์มาเปิดสลับหน้าจอไปมา, แบบฟอร์มประเมินยุ่งยาก

**Solution:** Side-by-Side Review หน้าจออ่านบทความคู่กับฟอร์มให้คะแนน พร้อมระบบ Auto-save ป้องกันเน็ตหลุด

### 3. Admin (ผู้ดูแลระบบ)
**Pain Point เดิม:** ตามงานยาก, เช็คสลิปโอนเงินตาลาย, จัดตารางห้องชนกัน

**Solution:** Centralized Management ระบบช่วยกรองสถานะการเงิน, ระบบจัดตารางอัตโนมัติ และออกใบประกาศนียบัตร (Certificate) ได้ในคลิกเดียว

## ✨ Project Highlights (จุดเด่นที่น่าภาคภูมิใจ)

- **UX/UI Design:** ดีไซน์ทันสมัย (Modern Clean) ไม่เหมือนระบบราชการเดิมๆ เน้นความสะอาดตาและการใช้งานที่ลื่นไหล (Intuitive Flow)
- **Real-time Interaction:** การซิงค์ข้อมูลระหว่าง Mobile และ Web (ส่งงานบนเว็บ -> เด้งแจ้งเตือนบนมือถือ)
- **Gamification:** ระบบรางวัล (Awards) ในรูปแบบ Digital Badge สร้างความภาคภูมิใจให้ผู้ได้รับรางวัล
- **End-to-End Process:** รองรับตั้งแต่ สมัครสมาชิก -> ส่งงาน -> ตรวจงาน -> แก้ไข -> จ่ายเงิน -> นำเสนอ -> รับรางวัล (ครบวงจร)

## 🚀 เริ่มต้นใช้งาน

### การติดตั้ง
```bash
# ติดตั้ง dependencies
npm install

# เริ่มต้น development server
npm start
```

### เปิดใน browser
- เปิด [http://localhost:3000](http://localhost:3000) เพื่อดูผลลัพธ์

## 📁 โครงสร้างโปรเจกต์

```
src/
├── components/
│   ├── common/          # Components ที่ใช้ร่วมกัน
│   │   ├── StatCard.jsx
│   │   ├── TimelineSection.jsx
│   │   ├── RecentTable.jsx
│   │   ├── ActionRequiredSection.jsx
│   │   └── StatusOverview.jsx
│   ├── layout/          # Layout components
│   │   └── Sidebar.jsx
│   └── ui/              # UI components พื้นฐาน
├── views/               # Page components
│   ├── DashboardView.jsx
│   ├── SubmissionWizard.jsx
│   └── ... (other views)
├── hooks/               # Custom React hooks
├── utils/               # Utility functions
├── styles/              # CSS/Style files
├── App.jsx              # Main App component
└── index.js             # Entry point
```

## 🛠️ Technology Stack

- **Frontend:** React 18
- **UI Components:** Lucide React Icons
- **Styling:** Tailwind CSS (inline classes)
- **Build Tool:** Create React App
- **Language:** JavaScript (ES6+)

## 📝 License

สงวนลิขสิทธิ์ โดย สาขาวิชาวิทยาการคอมพิวเตอร์ มหาวิทยาลัยราชภัฏบุรีรัมย์

---

**Webmaster:** cs.bru.ac.th
