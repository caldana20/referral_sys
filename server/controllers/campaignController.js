const { Campaign, CampaignReward, Product, RewardSetting } = require('../models');

async function attachRewards(campaign, rewardIds = []) {
  const uniqueIds = Array.from(new Set(rewardIds.map((r) => Number(r)).filter(Boolean)));
  await CampaignReward.destroy({ where: { campaignId: campaign.id } });
  if (uniqueIds.length > 0) {
    const rows = uniqueIds.map((rewardSettingId) => ({ campaignId: campaign.id, rewardSettingId }));
    await CampaignReward.bulkCreate(rows);
  }
}

exports.list = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const campaigns = await Campaign.findAll({
      where: { tenantId },
      include: [
        { model: CampaignReward, include: [{ model: RewardSetting, attributes: ['id', 'name'] }] },
        { model: Product }
      ]
    });
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ message: 'Failed to list campaigns' });
  }
};

exports.get = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const campaign = await Campaign.findOne({
      where: { id: req.params.id, tenantId },
      include: [
        { model: CampaignReward, include: [{ model: RewardSetting, attributes: ['id', 'name'] }] },
        { model: Product }
      ]
    });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch campaign' });
  }
};

exports.create = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const { name, description, productId, imageUrl, rewardIds = [] } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ message: 'Name is required' });

    if (productId) {
      const prod = await Product.findOne({ where: { id: productId, tenantId } });
      if (!prod) return res.status(400).json({ message: 'Invalid productId' });
    }

    // Validate rewardIds belong to tenant
    const rewards = Array.isArray(rewardIds) ? rewardIds.map((r) => Number(r)).filter(Boolean) : [];
    if (rewards.length > 0) {
      const count = await RewardSetting.count({ where: { id: rewards, tenantId } });
      if (count !== rewards.length) return res.status(400).json({ message: 'Invalid rewardIds' });
    }

    const campaign = await Campaign.create({
      tenantId,
      name: name.trim(),
      description: description?.trim() || null,
      productId: productId || null,
      imageUrl: imageUrl?.trim() || null
    });

    if (rewards.length > 0) {
      await attachRewards(campaign, rewards);
    }

    res.status(201).json(campaign);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create campaign' });
  }
};

exports.update = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const { name, description, productId, imageUrl, rewardIds } = req.body || {};
    const campaign = await Campaign.findOne({ where: { id: req.params.id, tenantId } });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ message: 'Name cannot be empty' });
      campaign.name = name.trim();
    }
    if (description !== undefined) campaign.description = description?.trim() || null;
    if (imageUrl !== undefined) campaign.imageUrl = imageUrl?.trim() || null;

    if (productId !== undefined) {
      if (productId === null || productId === '') {
        campaign.productId = null;
      } else {
        const prod = await Product.findOne({ where: { id: productId, tenantId } });
        if (!prod) return res.status(400).json({ message: 'Invalid productId' });
        campaign.productId = productId;
      }
    }

    await campaign.save();

    if (rewardIds !== undefined) {
      // validate rewards
      const rewards = Array.isArray(rewardIds) ? rewardIds.map((r) => Number(r)).filter(Boolean) : [];
      if (rewards.length > 0) {
        const count = await RewardSetting.count({ where: { id: rewards, tenantId } });
        if (count !== rewards.length) return res.status(400).json({ message: 'Invalid rewardIds' });
      }
      await attachRewards(campaign, rewards);
    }

    res.json(campaign);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update campaign' });
  }
};

exports.remove = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const campaign = await Campaign.findOne({ where: { id: req.params.id, tenantId } });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    await CampaignReward.destroy({ where: { campaignId: campaign.id } });
    await campaign.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete campaign' });
  }
};

