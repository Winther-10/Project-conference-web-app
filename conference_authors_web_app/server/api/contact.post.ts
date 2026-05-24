import nodemailer from 'nodemailer';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // ดึงข้อมูลจาก .env
  const config = {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  };

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  try {
    await transporter.sendMail({
      from: `"ระบบติดต่ออัตโนมัติ" <${config.user}>`, // ใช้อีเมลจาก env
      to: '660112230009@bru.ac.th', // อีเมลผู้รับ
      subject: `ข้อความติดต่อใหม่จาก ${body.name}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2 style="color: #6b21a8;">มีข้อความติดต่อใหม่จากหน้าเว็บไซต์</h2>
          <p><strong>ชื่อ-นามสกุล:</strong> ${body.name}</p>
          <p><strong>อีเมลผู้ติดต่อ:</strong> ${body.email}</p>
          <hr style="border: 1px solid #e9d5ff; my-4" />
          <p><strong>ข้อความ:</strong></p>
          <p style="background-color: #faf5ff; padding: 15px; border-radius: 8px;">
            ${body.message.replace(/\n/g, '<br>')}
          </p>
        </div>
      `,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error sending email:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to send email',
      message: error.message
    });
  }
});
