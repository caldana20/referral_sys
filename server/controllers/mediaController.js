const { Media } = require('../models');
const { uploadBuffer, deleteObject, getSignedReadUrl } = require('../utils/storage');

exports.list = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const records = await Media.findAll({
      where: { tenantId },
      order: [['createdAt', 'DESC']]
    });

    const withSigned = await Promise.all(
      records.map(async (m) => {
        const json = m.toJSON();
        json.signedUrl = await getSignedReadUrl(json.key);
        return json;
      })
    );

    res.json(withSigned);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load media', error: err.message });
  }
};

exports.upload = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'File is required' });

    const { key, url, signedUrl } = await uploadBuffer({
      tenantId,
      buffer: file.buffer,
      contentType: file.mimetype,
      filename: file.originalname
    });

    const record = await Media.create({
      tenantId,
      key,
      url,
      filename: file.originalname,
      contentType: file.mimetype,
      size: file.size
    });

    const json = record.toJSON();
    json.signedUrl = signedUrl;
    res.status(201).json(json);
  } catch (err) {
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const id = req.params.id;
    const record = await Media.findOne({ where: { id, tenantId } });
    if (!record) return res.status(404).json({ message: 'Media not found' });

    await deleteObject(record.key);
    await record.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Delete failed', error: err.message });
  }
};
