const nodemailer = require('nodemailer');

// Create transporter using Google Workspace (Gmail) SMTP
// Note: You will likely need to use an "App Password" if 2FA is enabled
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.sendEmail = async ({ to, subject, html }) => {
  try {
    // Convert array of emails to comma-separated string if needed, 
    // though nodemailer handles arrays in 'to' field well.
    const info = await transporter.sendMail({
      from: `"Referral System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    console.log('Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    if (error.response) {
        console.error('SMTP Response:', error.response);
    }
    // We return null so we don't crash the request flow
    return null;
  }
};

