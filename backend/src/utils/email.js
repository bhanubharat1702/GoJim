const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, text, html) => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    return {
      success: false,
      message: 'Email service is not configured. Please add EMAIL_USER and EMAIL_PASS in your Render Environment Variables.'
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
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      },
      tls: {
        rejectUnauthorized: false
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
      message: `Email delivery failed (${error.message}). Please check EMAIL_USER and EMAIL_PASS App Password.`
    };
  }
};

module.exports = { sendEmail };
