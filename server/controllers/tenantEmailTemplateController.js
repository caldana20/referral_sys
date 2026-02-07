const { listTemplatesForTenant, upsertTemplate, resetTemplate } = require('../utils/emailTemplates');

exports.listTemplates = async (req, res) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) return res.status(400).json({ message: 'Missing tenant context' });

  try {
    const templates = await listTemplatesForTenant(tenantId);
    res.json({ templates });
  } catch (error) {
    console.error('listTemplates error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateTemplate = async (req, res) => {
  const tenantId = req.user?.tenantId;
  const key = req.params.key;
  const { subject, html } = req.body || {};
  if (!tenantId) return res.status(400).json({ message: 'Missing tenant context' });

  try {
    await upsertTemplate(tenantId, key, subject, html);
    const templates = await listTemplatesForTenant(tenantId);
    res.json({ templates });
  } catch (error) {
    console.error('updateTemplate error:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.resetTemplate = async (req, res) => {
  const tenantId = req.user?.tenantId;
  const key = req.params.key;
  if (!tenantId) return res.status(400).json({ message: 'Missing tenant context' });

  try {
    await resetTemplate(tenantId, key);
    const templates = await listTemplatesForTenant(tenantId);
    res.json({ templates });
  } catch (error) {
    console.error('resetTemplate error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
