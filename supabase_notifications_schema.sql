-- ============================================================
-- BRICC Conference: Notification System Schema (v2 - FINAL)
-- วิธีใช้: Copy ทั้งหมดแล้วรันใน Supabase SQL Editor
-- ============================================================

-- 1. สร้างตาราง notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  phase         TEXT NOT NULL,
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  is_read       BOOLEAN DEFAULT FALSE NOT NULL,
  is_urgent     BOOLEAN DEFAULT FALSE NOT NULL,
  paper_id      UUID,
  paper_title   TEXT,
  link          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Index สำหรับ query เร็ว
CREATE INDEX IF NOT EXISTS idx_notifications_user_id     ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at  ON public.notifications(created_at DESC);

-- 3. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. ลบ Policy เก่า (ป้องกัน conflict)
DROP POLICY IF EXISTS "users_select_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "users_update_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "service_role_insert_notifications" ON public.notifications;
DROP POLICY IF EXISTS "users_insert_own_notifications" ON public.notifications;

-- 5. สร้าง RLS Policies ใหม่
-- Author ดูเฉพาะของตัวเอง
CREATE POLICY "users_select_own_notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Author อัปเดต is_read ได้เฉพาะของตัวเอง
CREATE POLICY "users_update_own_notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Author สร้างการแจ้งเตือนให้ตัวเองได้ (สำหรับ client-side triggers)
CREATE POLICY "users_insert_own_notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 6. Enable Realtime (สำหรับ Push Notification แบบ Live)
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;


-- ============================================================
-- Helper Function: insert_notification (เรียกจาก client ผ่าน RPC)
-- ============================================================
CREATE OR REPLACE FUNCTION public.insert_notification(
  p_user_id UUID, p_type TEXT, p_phase TEXT,
  p_title TEXT, p_message TEXT,
  p_is_urgent BOOLEAN DEFAULT FALSE,
  p_paper_id UUID DEFAULT NULL,
  p_paper_title TEXT DEFAULT NULL,
  p_link TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.notifications
    (user_id, type, phase, title, message, is_urgent, paper_id, paper_title, link)
  VALUES
    (p_user_id, p_type, p_phase, p_title, p_message, p_is_urgent, p_paper_id, p_paper_title, p_link)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;


-- ============================================================
-- Trigger: แจ้งเตือนอัตโนมัติเมื่อ Admin เปลี่ยนสถานะบทความ
-- (เฟส 2-4 ฝั่ง Admin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_paper_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_author_id UUID;
  v_paper_title TEXT;
  v_type TEXT; v_phase TEXT; v_ntitle TEXT; v_msg TEXT;
  v_urgent BOOLEAN := FALSE;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  -- ดึง author_id จาก column ที่ตรงกับ DB จริง
  v_author_id := NEW.author_id;
  v_paper_title := COALESCE(NEW.title_th, NEW.title_en, 'บทความของคุณ');

  CASE NEW.status
    -- เฟส 3: Review Process
    WHEN 'pending_review' THEN
      v_type:='review_started'; v_phase:='review';
      v_ntitle:='บทความอยู่ระหว่างการพิจารณา';
      v_msg:='บทความ "'||v_paper_title||'" กำลังอยู่ในขั้นตอนการพิจารณาจากผู้ทรงคุณวุฒิ (Under Review)';

    WHEN 'revision_required' THEN
      v_type:='revision_required'; v_phase:='review'; v_urgent:=TRUE;
      v_ntitle:='ด่วน: ต้องแก้ไขบทความ';
      v_msg:='บทความ "'||v_paper_title||'" มีข้อเสนอแนะจาก Reviewer ให้แก้ไข (Major/Minor Revision) กรุณาส่งฉบับแก้ไขโดยเร็ว';

    WHEN 'revision' THEN
      v_type:='revision_required'; v_phase:='review'; v_urgent:=TRUE;
      v_ntitle:='ด่วน: ต้องแก้ไขบทความ';
      v_msg:='บทความ "'||v_paper_title||'" มีข้อเสนอแนะจาก Reviewer ให้แก้ไข กรุณาเข้าระบบเพื่อตรวจสอบและส่งฉบับแก้ไข';

    -- เฟส 4: Decision
    WHEN 'accepted' THEN
      v_type:='paper_accepted'; v_phase:='decision';
      v_ntitle:='บทความผ่านการพิจารณา';
      v_msg:='ยินดีด้วย! บทความ "'||v_paper_title||'" ผ่านการพิจารณาให้เข้าร่วมนำเสนอในงานประชุมวิชาการ';

    WHEN 'published' THEN
      v_type:='paper_accepted'; v_phase:='decision';
      v_ntitle:='บทความได้รับการตีพิมพ์';
      v_msg:='บทความ "'||v_paper_title||'" ได้รับการตีพิมพ์ในรายงานการประชุม (Proceedings) เรียบร้อยแล้ว';

    WHEN 'rejected' THEN
      v_type:='paper_rejected'; v_phase:='decision';
      v_ntitle:='แจ้งผลการพิจารณาบทความ';
      v_msg:='ขอแจ้งผลการพิจารณาบทความ "'||v_paper_title||'" กรุณาคลิกเพื่อดูรายละเอียดเพิ่มเติม';

    -- เฟส 2: Submission (Admin ตีกลับ format)
    WHEN 'format_error' THEN
      v_type:='paper_format_error'; v_phase:='submission'; v_urgent:=TRUE;
      v_ntitle:='ด่วน: แก้ไขรูปแบบบทความ';
      v_msg:='กรุณาแก้ไขรูปแบบการจัดหน้า (Format) ของบทความ "'||v_paper_title||'" ให้ตรงตาม Template';

    ELSE RETURN NEW;
  END CASE;

  PERFORM public.insert_notification(
    v_author_id, v_type, v_phase, v_ntitle, v_msg,
    v_urgent, NEW.paper_id, v_paper_title, '/portal/articles'
  );
  RETURN NEW;
END; $$;

-- ผูก Trigger
DROP TRIGGER IF EXISTS trg_paper_status_notification ON public.papers;
CREATE TRIGGER trg_paper_status_notification
  AFTER UPDATE OF status ON public.papers
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_paper_status_change();


-- ============================================================
-- ทดสอบ: ใส่ Seed Data (เปลี่ยน USER_ID เป็น UUID จริงของคุณ)
-- ============================================================
-- วิธีหา user_id: ไปที่ Supabase Dashboard > Auth > Users > Copy UUID
--
-- SELECT public.insert_notification(
--   'YOUR_USER_ID_HERE'::UUID,
--   'welcome', 'account',
--   '🎉 ยินดีต้อนรับสู่ระบบ BRICC Festival 2027!',
--   'กรุณาอัปเดตข้อมูลส่วนตัวและสังกัดของคุณให้สมบูรณ์',
--   FALSE, NULL, NULL, '/portal/settings'
-- );
