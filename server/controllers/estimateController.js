const { Estimate, Referral, User, Tenant } = require('../models');
const { sendEmail } = require('../utils/emailService');
const { getFieldsForTenant } = require('../config/tenantFields');

exports.createEstimate = async (req, res) => {
  const { referralCode, name, email, phone, address, city, description, tenantSlug, customFields = {} } = req.body;

  try {
    if (!tenantSlug) {
      return res.status(400).json({ message: 'tenantSlug is required' });
    }
    const tenant = await require('../models').Tenant.findOne({ where: { slug: tenantSlug } });
    if (!tenant) return res.status(404).json({ message: 'Invalid tenant' });
    const companyName = tenant.name || 'Your Company';
    const fromEmail = tenant.sendgridFromEmail || process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER;

    const referral = await Referral.findOne({ 
      where: { code: referralCode, tenantId: tenant.id },
      include: [{ model: User }] // Include referrer info
    });
    if (!referral) return res.status(404).json({ message: 'Invalid referral code for this tenant' });

    if (referral.status !== 'Open') {
        return res.status(400).json({ message: 'Referral is no longer active' });
    }

    const existingEstimate = await Estimate.findOne({ where: { referralId: referral.id } });
    if (existingEstimate) {
      return res.status(400).json({ message: 'This referral link has already been used' });
    }

    // Validate and sanitize custom fields
    const fieldDefs = tenant.estimateFieldConfig || getFieldsForTenant(tenant.slug);
    const sanitizedCustomFields = {};
    const errors = [];

    const cf = customFields && typeof customFields === 'object' ? customFields : {};
    for (const field of fieldDefs) {
      const value = cf[field.id];
      if (field.required && (value === undefined || value === null || `${value}`.trim() === '')) {
        errors.push(`Field '${field.label}' is required`);
        continue;
      }

      if (value === undefined || value === null || `${value}`.trim?.() === '') {
        continue; // optional empty
      }

      switch (field.type) {
        case 'select':
          if (!field.options || !field.options.includes(value)) {
            errors.push(`Invalid option for '${field.label}'`);
          } else {
            sanitizedCustomFields[field.id] = value;
          }
          break;
        case 'number':
          if (Number.isNaN(Number(value))) {
            errors.push(`Field '${field.label}' must be a number`);
          } else {
            sanitizedCustomFields[field.id] = Number(value);
          }
          break;
        case 'checkbox':
          sanitizedCustomFields[field.id] = Boolean(value);
          break;
        case 'date':
          if (isNaN(Date.parse(value))) {
            errors.push(`Field '${field.label}' must be a valid date`);
          } else {
            sanitizedCustomFields[field.id] = value;
          }
          break;
        default:
          sanitizedCustomFields[field.id] = `${value}`;
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join('; ') });
    }

    const estimate = await Estimate.create({
      referralId: referral.id,
      tenantId: referral.tenantId || null,
      name,
      email,
      phone,
      address,
      city,
      description,
      customFields: sanitizedCustomFields,
      status: 'Pending'
    });

    // --- Send Email to Admins ---
    try {
      const admins = await User.findAll({ where: { role: 'admin', tenantId: referral.tenantId } });
      const adminEmails = admins.map(admin => admin.email);

      if (adminEmails.length > 0) {
        const emailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
            <h2 style="color: #2563eb; text-align: center; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">New Estimate Request</h2>
            
            <div style="background-color: #eff6ff; padding: 10px; border-radius: 6px; text-align: center; margin-bottom: 20px;">
                <p style="margin: 0; color: #1e40af;"><strong>Referral Code Used:</strong> <span style="font-family: monospace; font-size: 1.1em;">${referralCode}</span></p>
            </div>

            <h3 style="color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Prospect Details</h3>
            <ul style="list-style: none; padding: 0;">
                <li style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>Name:</strong> ${name}</li>
                <li style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #2563eb;">${email}</a></li>
                <li style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>Phone:</strong> ${phone}</li>
                <li style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>Address:</strong> ${address}, ${city || ''}</li>
            </ul>

            <div style="margin-top: 20px;">
                <h3 style="color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Description</h3>
                <p style="background-color: #f9fafb; padding: 15px; border-radius: 6px; color: #4b5563; border: 1px solid #e5e7eb;">
                    ${description || 'No description provided.'}
                </p>
            </div>
            
            <div style="margin-top: 20px; font-size: 14px; color: #6b7280; text-align: center;">
                ${companyName} Admin Notification
            </div>
          </div>
        `;

        // Send email asynchronously
        sendEmail({
          to: adminEmails,
          subject: `New Estimate Request Received - ${companyName}`,
          html: emailContent,
          fromEmail,
          fromName: companyName
        });
      }
    } catch (emailError) {
      console.error('Failed to trigger admin email notification:', emailError);
      // Continue - do not fail the request if email fails
    }

    // --- Send Confirmation Email to Client (Referrer) ---
    try {
        if (referral.User && referral.User.email) {
            const referrerEmail = referral.User.email;
            const referrerName = referral.User.name || 'Valued Client';
            const rewardName = referral.selectedReward;

            const clientEmailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <h2 style="color: #2563eb; margin: 0;">${companyName}</h2>
                </div>
                
                <div style="text-align: center; background-color: #f0fdf4; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
                  <h1 style="color: #166534; margin-top: 0; font-size: 24px;">Good News!</h1>
                  <p style="color: #374151; font-size: 16px;">
                    Your friend <strong>${name}</strong> has just requested an estimate using your referral link!
                  </p>
                </div>

                <div style="color: #4b5563; font-size: 15px; line-height: 1.6;">
                  <p>Hi ${referrerName},</p>
                  <p>We wanted to let you know that your referral code was successfully used.</p>
                  
                  <div style="background-color: #f9fafb; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Your Pending Reward:</strong> ${rewardName}</p>
                  </div>

                  <p><strong>What happens next?</strong></p>
                  <ul>
                    <li>We will contact your friend to provide an estimate.</li>
                    <li>Once their service is completed and paid for, your reward will be activated!</li>
                    <li>We'll send you another email when your reward is ready to use.</li>
                  </ul>
                </div>
                
                <div style="margin-top: 30px; pt-20px; border-top: 1px solid #e0e0e0; text-align: center; color: #9ca3af; font-size: 12px;">
                  <p>Thank you for spreading the word!</p>
                  <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
                </div>
              </div>
            `;

            sendEmail({
                to: referrerEmail,
                subject: `Your ${companyName} Referral Code was Used! 🎉`,
                html: clientEmailHtml,
                fromEmail,
                fromName: companyName
            }).catch(err => console.error('Failed to send referrer confirmation email:', err));
        }
    } catch (clientEmailError) {
        console.error('Failed to trigger client email notification:', clientEmailError);
    }

    // --- Send Confirmation Email to Prospect (Estimate Requester) ---
    try {
        const prospectEmailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #2563eb; margin: 0;">${companyName}</h2>
            </div>
            
            <div style="text-align: center; background-color: #eff6ff; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
              <h1 style="color: #1e40af; margin-top: 0; font-size: 24px;">Thank You for Your Request!</h1>
              <p style="color: #374151; font-size: 16px;">
                We've received your estimate request and will be in touch soon.
              </p>
            </div>

            <div style="color: #4b5563; font-size: 15px; line-height: 1.6;">
              <p>Hi ${name},</p>
              <p>Thank you for requesting an estimate from ${companyName}! We're excited to help make your home sparkle.</p>
              
              <div style="background-color: #f9fafb; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
                <p style="margin: 0 0 8px 0;"><strong>Request Summary:</strong></p>
                <p style="margin: 4px 0;"><strong>Name:</strong> ${name}</p>
                <p style="margin: 4px 0;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 4px 0;"><strong>Phone:</strong> ${phone}</p>
                <p style="margin: 4px 0;"><strong>Location:</strong> ${address}${city ? `, ${city}` : ''}</p>
              </div>

              ${description ? `
                <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 8px 0; font-weight: bold; color: #374151;">Your Notes:</p>
                  <p style="margin: 0; color: #4b5563;">${description}</p>
                </div>
              ` : ''}

              <p><strong>What happens next?</strong></p>
              <ul style="padding-left: 20px;">
                <li>Our team will review your request within 24 hours.</li>
                <li>We'll contact you at <strong>${phone}</strong> or <strong>${email}</strong> to schedule a convenient time.</li>
                <li>During our visit, we'll provide a detailed estimate tailored to your needs.</li>
                <li>You're under no obligation - the estimate is completely free!</li>
              </ul>

              <p style="margin-top: 20px;">If you have any questions before we contact you, feel free to reach out to us directly.</p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #9ca3af; font-size: 12px;">
              <p>We look forward to serving you!</p>
              <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
          </div>
        `;

        sendEmail({
            to: email,
            subject: `Your Estimate Request Has Been Received ✨`,
            html: prospectEmailHtml,
            fromEmail,
            fromName: companyName
        }).catch(err => console.error('Failed to send prospect confirmation email:', err));
    } catch (prospectEmailError) {
        console.error('Failed to trigger prospect email notification:', prospectEmailError);
    }

    // Optionally update referral status to 'Wait'?
    // The diagrams say "submitEstimate" -> "addProspect" -> "setStatus" on Referral?
    // The Close Reward flow is Manual by Admin.
    // But creating an estimate might trigger a status change.
    // I'll leave it as Open for now, as Admin closes it.

    // Update referral status to Used
    referral.status = 'Used';
    await referral.save();

    res.status(201).json(estimate);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get a single estimate with custom fields (admin-only)
exports.getEstimateById = async (req, res) => {
  const { id } = req.params;

  try {
    const estimate = await Estimate.findOne({
      where: { id, tenantId: req.user.tenantId },
      include: [
        { model: Referral, include: [{ model: User, attributes: ['name', 'email'] }] }
      ]
    });

    if (!estimate) {
      return res.status(404).json({ message: 'Estimate not found' });
    }

    const tenant = await Tenant.findByPk(req.user.tenantId);
    const fieldConfig = getFieldsForTenant(tenant?.slug);

    res.json({
      estimate,
      fieldConfig
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

