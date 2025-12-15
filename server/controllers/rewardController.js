const { RewardSetting, Tenant } = require('../models');

exports.getRewards = async (req, res) => {
  try {
    const rewards = await RewardSetting.findAll({ where: { tenantId: req.user.tenantId } });
    res.json(rewards);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getActiveRewards = async (req, res) => {
  try {
    const { tenantSlug } = req.query;
    if (!tenantSlug) return res.status(400).json({ message: 'tenantSlug is required' });
    const tenant = await Tenant.findOne({ where: { slug: tenantSlug } });
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    const rewards = await RewardSetting.findAll({ where: { active: true, tenantId: tenant.id } });
    res.json(rewards);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createReward = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Reward name is required' });

  try {
    const reward = await RewardSetting.create({ name, tenantId: req.user.tenantId });
    res.status(201).json(reward);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteReward = async (req, res) => {
  const { id } = req.params;
  try {
    await RewardSetting.destroy({ where: { id, tenantId: req.user.tenantId } });
    res.json({ message: 'Reward deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.toggleReward = async (req, res) => {
  const { id } = req.params;
  try {
    const reward = await RewardSetting.findOne({ where: { id, tenantId: req.user.tenantId } });
    if (!reward) return res.status(404).json({ message: 'Reward not found' });
    
    reward.active = !reward.active;
    await reward.save();
    res.json(reward);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

