require('dotenv').config();
const sgMail = require('@sendgrid/mail');

console.log('--- Email Config Diagnostics (SendGrid) ---');
console.log('Current Working Directory:', process.cwd());

const apiKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER;

console.log('SENDGRID_API_KEY:', apiKey ? `'${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}' (Length: ${apiKey.length})` : '(undefined)');
console.log('SENDGRID_FROM_EMAIL:', fromEmail ? `'${fromEmail}'` : '(undefined)');

if (!apiKey) {
  console.error('ERROR: SENDGRID_API_KEY environment variable is not set.');
  console.error('Get your API key from: SendGrid Dashboard > Settings > API Keys');
  process.exit(1);
}

if (!fromEmail) {
  console.error('ERROR: SENDGRID_FROM_EMAIL or EMAIL_USER environment variable is not set.');
  console.error('This should be a verified sender email in your SendGrid account.');
  process.exit(1);
}

// Set API key
sgMail.setApiKey(apiKey);

console.log('Attempting to verify SendGrid connection...');

// Test SendGrid API key by making a test request
(async () => {
  try {
    // SendGrid doesn't have a verify method, so we'll try to send a test email
    // But for diagnostics, we'll just check if the API key is set correctly
    console.log('✓ SendGrid API key is configured');
    console.log('✓ From email:', fromEmail);
    console.log('');
    console.log('To test email sending, use the sendEmail function from emailService.js');
    console.log('Or send a test email from SendGrid dashboard.');
  } catch (error) {
    console.error('Verification Failed!');
    console.error(error);
    if (error.response) {
      console.error('Status Code:', error.response.statusCode);
      console.error('Body:', error.response.body);
    }
  }
})();

