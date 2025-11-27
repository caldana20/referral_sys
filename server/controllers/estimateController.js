const { Estimate, Referral } = require('../models');

exports.createEstimate = async (req, res) => {
  const { referralCode, name, email, phone, address, city, description } = req.body;

  try {
    const referral = await Referral.findOne({ where: { code: referralCode } });
    if (!referral) return res.status(404).json({ message: 'Invalid referral code' });

    if (referral.status !== 'Open') {
        return res.status(400).json({ message: 'Referral is no longer active' });
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

