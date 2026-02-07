const { TenantEmailTemplate } = require('../models');

const TEMPLATES = {
  client_invite: {
    label: 'Client invite',
    subject: '{{companyName}} referral link',
    variables: ['companyName', 'clientName', 'campaignName', 'personalizedLink'],
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
        <p style="margin: 0 0 8px; color: #111827; font-size: 18px;"><strong>{{companyName}}</strong></p>
        <p style="margin: 0 0 16px; color: #4b5563; font-size: 14px;">Hi {{clientName}},</p>
        <p style="margin: 0 0 16px; color: #4b5563; font-size: 14px;">
          You can generate a referral link for {{companyName}}. Your details will be pre‑filled.
          {{campaignNameLine}}
        </p>
        <p style="margin: 16px 0;">
          <a href="{{personalizedLink}}" style="color: #2563eb; text-decoration: underline;">Open referral link</a>
        </p>
        <p style="margin: 16px 0; color: #6b7280; font-size: 12px;">
          You’re receiving this because you’re a customer of {{companyName}}.
        </p>
      </div>
    `
  },
  referral_link_client: {
    label: 'Referral link (client)',
    subject: '{{companyName}} referral link',
    variables: ['companyName', 'clientName', 'referralLink', 'selectedReward', 'prospectName'],
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
        <p style="margin: 0 0 8px; color: #111827; font-size: 18px;"><strong>{{companyName}}</strong></p>
        <p style="margin: 0 0 16px; color: #4b5563; font-size: 14px;">Hi {{clientName}},</p>
        <p style="margin: 0 0 16px; color: #4b5563; font-size: 14px;">
          Here is your referral link{{prospectNameInline}}.
        </p>
        <p style="margin: 16px 0;">
          <a href="{{referralLink}}" style="color: #2563eb; text-decoration: underline;">{{referralLink}}</a>
        </p>
        <p style="margin: 0 0 16px; color: #4b5563; font-size: 14px;">
          Reward selected: <strong>{{selectedReward}}</strong>
        </p>
        <p style="margin: 16px 0; color: #6b7280; font-size: 12px;">
          You’re receiving this because you requested a referral link from {{companyName}}.
        </p>
      </div>
    `
  },
  referral_link_admin: {
    label: 'Referral link (admin notification)',
    subject: 'New referral link created',
    variables: ['companyName', 'clientName', 'clientEmail', 'selectedReward', 'prospectName', 'code'],
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
        <p style="margin: 0 0 8px; color: #111827; font-size: 16px;"><strong>New referral link created</strong></p>
        <p style="margin: 0 0 12px; color: #4b5563; font-size: 14px;">
          A client generated a referral link.
        </p>
        <ul style="margin: 0; padding-left: 18px; color: #4b5563; font-size: 14px;">
          <li>Client: {{clientName}} ({{clientEmail}})</li>
          <li>Reward: {{selectedReward}}</li>
          <li>Prospect: {{prospectName}}</li>
          <li>Referral code: {{code}}</li>
        </ul>
        <p style="margin: 16px 0 0; color: #6b7280; font-size: 12px;">
          {{companyName}} admin notification.
        </p>
      </div>
    `
  },
  referral_reward_closed: {
    label: 'Reward closed',
    subject: '{{companyName}} referral reward update',
    variables: ['companyName', 'clientName', 'referralCode', 'selectedReward', 'prospectName'],
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
        <p style="margin: 0 0 8px; color: #111827; font-size: 18px;"><strong>{{companyName}}</strong></p>
        <p style="margin: 0 0 16px; color: #4b5563; font-size: 14px;">Hi {{clientName}},</p>
        <p style="margin: 0 0 16px; color: #4b5563; font-size: 14px;">
          Your referral reward has been marked as closed and is ready.
        </p>
        <ul style="margin: 0 0 16px; padding-left: 18px; color: #4b5563; font-size: 14px;">
          <li>Referral code: {{referralCode}}</li>
          <li>Reward: {{selectedReward}}</li>
          {{prospectNameList}}
        </ul>
        <p style="margin: 16px 0; color: #6b7280; font-size: 12px;">
          You’re receiving this because you participated in {{companyName}}'s referral program.
        </p>
      </div>
    `
  },
  password_reset: {
    label: 'Password reset',
    subject: 'Reset your password',
    variables: ['companyName', 'resetLink'],
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="margin-top: 0; color: #111827;">Reset your password</h2>
        <p style="color: #4b5563; font-size: 14px;">
          We received a request to reset your password for {{companyName}}. Click the link below to choose a new password.
        </p>
        <p style="margin: 16px 0;">
          <a href="{{resetLink}}" style="color: #2563eb; text-decoration: underline;">Reset password</a>
        </p>
        <p style="color: #6b7280; font-size: 12px;">
          If you did not request this, you can ignore this email. This link will expire soon.
        </p>
      </div>
    `
  }
};

function renderTemplate(template, vars) {
  if (!template) return template;
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
    const value = vars?.[key];
    return value == null ? '' : String(value);
  });
}

function injectOptional(template, key, value) {
  if (!template) return template;
  const replacement = value ? String(value) : '';
  return template.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), replacement);
}

async function resolveEmailTemplate(tenantId, key, vars = {}) {
  const defaults = TEMPLATES[key];
  if (!defaults) {
    throw new Error(`Unknown email template key: ${key}`);
  }

  const override = await TenantEmailTemplate.findOne({ where: { tenantId, key } });
  const subject = override?.subject || defaults.subject;
  let html = override?.html || defaults.html;

  // Handle optional blocks
  html = injectOptional(
    html,
    'campaignNameLine',
    vars.campaignName ? `Campaign: <strong>${vars.campaignName}</strong>.` : ''
  );
  html = injectOptional(html, 'prospectNameInline', vars.prospectName ? ` for ${vars.prospectName}` : '');
  html = injectOptional(html, 'prospectNameList', vars.prospectName ? `<li>Referred: ${vars.prospectName}</li>` : '');

  return {
    subject: renderTemplate(subject, vars),
    html: renderTemplate(html, vars)
  };
}

async function listTemplatesForTenant(tenantId) {
  const overrides = await TenantEmailTemplate.findAll({ where: { tenantId } });
  const overrideMap = new Map(overrides.map((o) => [o.key, o]));

  return Object.entries(TEMPLATES).map(([key, def]) => ({
    key,
    label: def.label,
    subject: overrideMap.get(key)?.subject || def.subject,
    html: overrideMap.get(key)?.html || def.html,
    variables: def.variables,
    isDefault: !overrideMap.has(key)
  }));
}

async function upsertTemplate(tenantId, key, subject, html) {
  if (!TEMPLATES[key]) {
    throw new Error('Invalid template key');
  }
  const trimmedSubject = (subject || '').trim();
  const trimmedHtml = (html || '').trim();
  if (!trimmedSubject || !trimmedHtml) {
    throw new Error('Subject and HTML are required');
  }

  const [record] = await TenantEmailTemplate.findOrCreate({
    where: { tenantId, key },
    defaults: { subject: trimmedSubject, html: trimmedHtml }
  });
  if (record.subject !== trimmedSubject || record.html !== trimmedHtml) {
    record.subject = trimmedSubject;
    record.html = trimmedHtml;
    await record.save();
  }
  return record;
}

async function resetTemplate(tenantId, key) {
  await TenantEmailTemplate.destroy({ where: { tenantId, key } });
}

module.exports = {
  TEMPLATES,
  resolveEmailTemplate,
  listTemplatesForTenant,
  upsertTemplate,
  resetTemplate
};
