const sgMail = require('@sendgrid/mail');
const { Tenant } = require('../models');

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('Warning: SENDGRID_API_KEY not set. Email functionality will be disabled.');
}

function cleanBase(url) {
  return (url || '').toString().trim().replace(/\/+$/, '');
}

function formatTenantMailingAddress(tenant) {
  if (!tenant) return '';
  const parts = [tenant.address, tenant.city, tenant.state, tenant.zip, tenant.country]
    .map((v) => (v || '').toString().trim())
    .filter(Boolean);
  return parts.join(', ');
}

function resolveFooterLinks({ tenantSlug, unsubscribeUrl, privacyPolicyUrl }) {
  const publicBase = cleanBase(process.env.PUBLIC_SITE_URL) || 'https://refoza.com';
  const unsubscribe =
    unsubscribeUrl ||
    process.env.EMAIL_UNSUBSCRIBE_URL ||
    `${publicBase}/unsubscribe${tenantSlug ? `?tenant=${encodeURIComponent(tenantSlug)}` : ''}`;
  const privacy = privacyPolicyUrl || process.env.PRIVACY_POLICY_URL || `${publicBase}/privacy-policy`;
  return { unsubscribe, privacy };
}

function appendFooterHtml(html, { unsubscribeUrl, privacyPolicyUrl, mailingAddress }) {
  const footer = `
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;line-height:1.5;">
      <p style="margin:0 0 8px;">
        <a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>
        &nbsp;|&nbsp;
        <a href="${privacyPolicyUrl}" style="color:#6b7280;text-decoration:underline;">Privacy Policy</a>
      </p>
      <p style="margin:0;">${mailingAddress}</p>
    </div>
  `;
  return `${html || ''}${footer}`;
}

async function resolveFooterData({ tenantId, unsubscribeUrl, privacyPolicyUrl, mailingAddress }) {
  let tenant = null;
  if (tenantId) {
    try {
      tenant = await Tenant.findByPk(tenantId, {
        attributes: ['slug', 'address', 'city', 'state', 'zip', 'country']
      });
    } catch (error) {
      console.warn('Failed to resolve tenant for email footer:', error.message);
    }
  }
  const links = resolveFooterLinks({
    tenantSlug: tenant?.slug || null,
    unsubscribeUrl,
    privacyPolicyUrl
  });
  const resolvedMailingAddress =
    (mailingAddress || '').toString().trim() ||
    formatTenantMailingAddress(tenant) ||
    'Physical mailing address unavailable';

  return {
    unsubscribeUrl: links.unsubscribe,
    privacyPolicyUrl: links.privacy,
    mailingAddress: resolvedMailingAddress
  };
}

exports.sendEmail = async ({ to, subject, html, fromEmail, fromName, tenantId, unsubscribeUrl, privacyPolicyUrl, mailingAddress }) => {
  // Validate API key is set
  if (!process.env.SENDGRID_API_KEY) {
    console.error('Error: SENDGRID_API_KEY environment variable is not set');
    return null;
  }

  // Require explicit sender; no fallbacks. Validate format.
  const resolvedFromEmail = fromEmail;
  if (!resolvedFromEmail) {
    console.error('Error: fromEmail is required and no fallback is allowed');
    return null;
  }
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(resolvedFromEmail)) {
    console.error('Error: fromEmail is invalid');
    return null;
  }
  const resolvedFromName = fromName || process.env.COMPANY_NAME || 'Your Company';

  try {
    // Convert single email to array if needed
    const recipients = Array.isArray(to) ? to : [to];
    
    // SendGrid requires separate API calls for each recipient for better deliverability
    // or we can send to multiple recipients in one call
    const footerData = await resolveFooterData({ tenantId, unsubscribeUrl, privacyPolicyUrl, mailingAddress });
    const msg = {
      to: recipients,
      from: {
        email: resolvedFromEmail,
        name: resolvedFromName
      },
      subject: subject,
      html: appendFooterHtml(html, footerData)
    };

    console.info('SendGrid mail payload:', msg);

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
      try {
        console.error('SendGrid error body (stringified):', JSON.stringify(error.response.body));
      } catch (_) {
        // ignore stringify failures
      }
    }
    
    // Return null so we don't crash the request flow
    return null;
  }
};

