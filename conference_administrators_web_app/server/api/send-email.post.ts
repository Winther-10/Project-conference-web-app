import nodemailer from 'nodemailer';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { to, subject, html, attachments } = body;

  const config = useRuntimeConfig();
  const user = config.gmailUser || process.env.GMAIL_USER;
  const pass = config.gmailAppPassword || process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Email configuration (GMAIL_USER, GMAIL_APP_PASSWORD) is missing'
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });

    const mailOptions = {
      from: `"BRICC Festival 2027" <${user}>`,
      to,
      subject,
      html,
      attachments
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('Error sending email:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to send email',
      data: error.message
    });
  }
});
