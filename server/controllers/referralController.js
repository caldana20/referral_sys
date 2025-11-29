const { Referral, User, Estimate } = require('../models');
const crypto = require('crypto');

exports.createReferral = async (req, res) => {
  // Client identifies themselves
  const { email, name, selectedReward, prospectName, prospectEmail } = req.body;
  console.log('Creating referral request:', req.body);

  try {
    // Check if client exists
    // Ensure we query case-insensitively if needed, but here we assume email is stored lowercase
    const normalizedEmail = email ? email.toLowerCase() : '';
    
    let user = await User.findOne({ where: { email: normalizedEmail } });
    
    if (!user) {
        console.log('Client not found for email:', normalizedEmail);
        return res.status(404).json({ message: 'Client not found. Please contact support.' });
    }

    console.log('Found user:', user.id);
    
    // Generate unique code
    const code = crypto.randomBytes(4).toString('hex');

    const referralData = {
      userId: user.id,
      code,
      selectedReward,
      status: 'Open'
    };

    if (prospectName) referralData.prospectName = prospectName;
    if (prospectEmail && prospectEmail.trim() !== '') referralData.prospectEmail = prospectEmail;

    const referral = await Referral.create(referralData);

    console.log('Referral created:', referral.id);
    res.status(201).json(referral);

  } catch (error) {
    console.error('Error creating referral:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getReferrals = async (req, res) => {
  try {
    const referrals = await Referral.findAll({
      include: [
        { model: User, attributes: ['name', 'email'] },
        { model: Estimate, attributes: ['createdAt'] } // Include creation date
      ]
    });
    res.json(referrals);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateReferralStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const referral = await Referral.findByPk(id);
    if (!referral) return res.status(404).json({ message: 'Referral not found' });

    referral.status = status;
    await referral.save();
    res.json(referral);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getReferralByCode = async (req, res) => {
  const { code } = req.params;
  try {
    const referral = await Referral.findOne({ 
      where: { code },
      include: [{ model: Estimate }]
    });
    if (!referral) return res.status(404).json({ message: 'Invalid referral code' });
    
    const referralData = referral.toJSON();
    referralData.used = referral.Estimates && referral.Estimates.length > 0;

    res.json(referralData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.bulkDeleteReferrals = async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'No referral IDs provided' });
  }

  try {
    await Referral.destroy({ where: { id: ids } });
    res.json({ message: 'Referrals deleted successfully' });
  } catch (error) {
    console.error('Error deleting referrals:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
