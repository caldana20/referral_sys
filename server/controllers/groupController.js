const { Group, GroupMember, User } = require('../models');

exports.list = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const groups = await Group.findAll({
      where: { tenantId },
      order: [['name', 'ASC']],
      include: [{ model: User, attributes: ['id'], through: { attributes: [] } }]
    });
    const payload = groups.map((g) => ({
      id: g.id,
      name: g.name,
      memberCount: Array.isArray(g.Users) ? g.Users.length : 0
    }));
    res.json(payload);
  } catch (err) {
    res.status(500).json({ message: 'Failed to list groups', error: err.message });
  }
};

exports.get = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const group = await Group.findOne({
      where: { id: req.params.id, tenantId },
      include: [{ model: User, attributes: ['id'], through: { attributes: [] } }]
    });
    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.json({
      id: group.id,
      name: group.name,
      memberIds: Array.isArray(group.Users) ? group.Users.map((u) => u.id) : []
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load group', error: err.message });
  }
};

exports.create = async (req, res) => {
  const { name, clientIds } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Group name is required' });
  }

  try {
    const tenantId = req.user?.tenantId;
    const group = await Group.create({ tenantId, name: name.trim() });

    if (Array.isArray(clientIds) && clientIds.length > 0) {
      const clients = await User.findAll({
        where: { id: clientIds, role: 'client', tenantId }
      });
      const memberRows = clients.map((c) => ({ groupId: group.id, userId: c.id }));
      if (memberRows.length > 0) {
        await GroupMember.bulkCreate(memberRows);
      }
    }

    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create group', error: err.message });
  }
};

exports.update = async (req, res) => {
  const { name, clientIds } = req.body || {};
  try {
    const tenantId = req.user?.tenantId;
    const group = await Group.findOne({ where: { id: req.params.id, tenantId } });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ message: 'Group name cannot be empty' });
      group.name = name.trim();
      await group.save();
    }

    if (Array.isArray(clientIds)) {
      await GroupMember.destroy({ where: { groupId: group.id } });
      if (clientIds.length > 0) {
        const clients = await User.findAll({ where: { id: clientIds, role: 'client', tenantId } });
        const memberRows = clients.map((c) => ({ groupId: group.id, userId: c.id }));
        if (memberRows.length > 0) {
          await GroupMember.bulkCreate(memberRows);
        }
      }
    }

    res.json(group);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update group', error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const group = await Group.findOne({ where: { id: req.params.id, tenantId } });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    await GroupMember.destroy({ where: { groupId: group.id } });
    await group.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete group', error: err.message });
  }
};
