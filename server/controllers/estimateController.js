const { Estimate, Referral, User } = require('../models');
const { sendEmail } = require('../utils/emailService');

exports.createEstimate = async (req, res) => {
  const { referralCode, name, email, phone, address, city, description } = req.body;

  try {
    const referral = await Referral.findOne({ where: { code: referralCode } });
    if (!referral) return res.status(404).json({ message: 'Invalid referral code' });

    if (referral.status !== 'Open') {
        return res.status(400).json({ message: 'Referral is no longer active' });
    }

    const existingEstimate = await Estimate.findOne({ where: { referralId: referral.id } });
    if (existingEstimate) {
      return res.status(400).json({ message: 'This referral link has already been used' });
    }

    const estimate = await Estimate.create({
      referralId: referral.id,
      name,
      email,
      phone,
      address,
      city,
      description,
      status: 'Pending'
    });

    // --- Send Email to Admins ---
    try {
      const admins = await User.findAll({ where: { role: 'admin' } });
      const adminEmails = admins.map(admin => admin.email);

      if (adminEmails.length > 0) {
        const emailContent = `
          <h2>New Estimate Request</h2>
          <p><strong>Referral Code:</strong> ${referralCode}</p>
          <h3>Prospect Details:</h3>
          <ul>
            <li><strong>Name:</strong> ${name}</li>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Phone:</strong> ${phone}</li>
            <li><strong>Address:</strong> ${address}, ${city || 'N/A'}</li>
          </ul>
          <p><strong>Description:</strong><br/>${description || 'No description provided.'}</p>
        `;

        // Send email asynchronously
        sendEmail({
          to: adminEmails,
          subject: 'New Estimate Request Received',
          html: emailContent
        });
      }
    } catch (emailError) {
      console.error('Failed to trigger admin email notification:', emailError);
      // Continue - do not fail the request if email fails
    }

    // Optionally update referral status to 'Wait'?
    // The diagrams say "submitEstimate" -> "addProspect" -> "setStatus" on Referral?
    // The Close Reward flow is Manual by Admin.
    // But creating an estimate might trigger a status change.
    // I'll leave it as Open for now, as Admin closes it.

    res.status(201).json(estimate);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

