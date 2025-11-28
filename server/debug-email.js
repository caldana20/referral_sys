require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('--- Email Config Diagnostics ---');
console.log('Current Working Directory:', process.cwd());

const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS;

console.log('EMAIL_USER:', user ? `'${user}'` : '(undefined)');
console.log('EMAIL_PASS:', pass ? `'${pass.substring(0, 2)}...${pass.substring(pass.length - 2)}' (Length: ${pass.length})` : '(undefined)');

if (!user || !pass) {
  console.error('ERROR: Missing environment variables. Check your .env file.');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: user,
    pass: pass
  }
});

console.log('Attempting to verify connection...');

transporter.verify(function (error, success) {
  if (error) {
    console.error('Verification Failed!');
    console.error(error);
  } else {
    console.log('Server is ready to take our messages');
  }
});

