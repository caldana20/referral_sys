const sgMail = require('@sendgrid/mail');

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('Warning: SENDGRID_API_KEY not set. Email functionality will be disabled.');
}

exports.sendEmail = async ({ to, subject, html, fromEmail, fromName }) => {
  // Validate API key is set
  if (!process.env.SENDGRID_API_KEY) {
    console.error('Error: SENDGRID_API_KEY environment variable is not set');
    return null;
  }

  // Validate sender email
  const resolvedFromEmail = fromEmail || process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER;
  if (!resolvedFromEmail) {
    console.error('Error: SENDGRID_FROM_EMAIL or EMAIL_USER environment variable is not set');
    return null;
  }
  const resolvedFromName = fromName || process.env.COMPANY_NAME || 'Your Company';

  try {
    // Convert single email to array if needed
    const recipients = Array.isArray(to) ? to : [to];
    
    // SendGrid requires separate API calls for each recipient for better deliverability
    // or we can send to multiple recipients in one call
    const msg = {
      to: recipients,
      from: {
        email: resolvedFromEmail,
        name: resolvedFromName
      },
      subject: subject,
      html: html
    };

    const result = await sgMail.send(msg);
    
    // Log success
    console.log('Email sent successfully via SendGrid');
    if (result[0]) {
      console.log('Message ID:', result[0].headers['x-message-id']);
    }
    
    return {
      success: true,
      messageId: result[0]?.headers['x-message-id'],
      statusCode: result[0]?.statusCode
    };
  } catch (error) {
    console.error('Error sending email via SendGrid:', error);
    
    // Log detailed error information
    if (error.response) {
      console.error('SendGrid API Error:', {
        statusCode: error.response.statusCode,
        body: error.response.body,
        headers: error.response.headers
      });
    }
    
    // Return null so we don't crash the request flow
    return null;
  }
};

