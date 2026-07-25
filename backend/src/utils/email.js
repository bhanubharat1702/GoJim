const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, text, html) => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    console.log(`\n--- [EMAIL SIMULATOR] ---\nTo: ${to}\nSubject: ${subject}\nMessage: ${text}\n-------------------------\n`);
    return {
      success: false,
      isDemo: true,
      message: 'OTP sent to your server console. To receive real-world emails for 100% FREE, configure EMAIL_USER and EMAIL_PASS in backend/.env!'
    };
  }

  let appName = 'goJim';
  try {
    const PlatformSettings = require('../models/PlatformSettings');
    const settings = await PlatformSettings.findOne({});
    if (settings && settings.appName) {
      appName = settings.appName;
    }
  } catch (err) {
    console.error('Error fetching appName in sendEmail utility:', err);
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for port 465, false for other ports (like 587)
      auth: {
        user: emailUser,
        pass: emailPass
      },
      tls: {
        rejectUnauthorized: false // avoids SSL certificate issues
      }
    });

    const mailOptions = {
      from: `"${appName} Verification" <${emailUser}>`,
      to,
      subject,
      text,
      html
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Nodemailer SMTP Error:', error.message);
    return {
      success: false,
      message: `Nodemailer SMTP delivery failed: ${error.message}`
    };
  }
};

module.exports = { sendEmail };
