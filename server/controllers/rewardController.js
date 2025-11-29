const { RewardSetting } = require('../models');

exports.getRewards = async (req, res) => {
  try {
    const rewards = await RewardSetting.findAll();
    res.json(rewards);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getActiveRewards = async (req, res) => {
  try {
    const rewards = await RewardSetting.findAll({ where: { active: true } });
    res.json(rewards);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createReward = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Reward name is required' });

  try {
    const reward = await RewardSetting.create({ name });
    res.status(201).json(reward);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteReward = async (req, res) => {
  const { id } = req.params;
  try {
    await RewardSetting.destroy({ where: { id } });
    res.json({ message: 'Reward deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.toggleReward = async (req, res) => {
  const { id } = req.params;
  try {
    const reward = await RewardSetting.findByPk(id);
    if (!reward) return res.status(404).json({ message: 'Reward not found' });
    
    reward.active = !reward.active;
    await reward.save();
    res.json(reward);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

