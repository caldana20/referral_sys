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
    let tenantId = req.user?.tenantId;
    const { tenantSlug } = req.query;

    if (!tenantId && tenantSlug) {
      const tenant = await Tenant.findOne({ where: { slug: tenantSlug } });
      tenantId = tenant?.id;
    }

    if (!tenantId && req.tenant?.tenantId) {
      tenantId = req.tenant.tenantId;
    }

    if (!tenantId) return res.status(400).json({ message: 'Tenant context is required' });

    const rewards = await RewardSetting.findAll({ where: { active: true, tenantId } });
    res.json(rewards);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createReward = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Reward name is required' });

  try {
    const tenantId = req.user?.tenantId || req.tenant?.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant context is required' });

    const reward = await RewardSetting.create({ name, tenantId });
    res.status(201).json(reward);
  } catch (error) {
    console.error('Error creating reward:', error);
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

