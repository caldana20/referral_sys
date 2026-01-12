const { Product, Media } = require('../models');

exports.list = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const products = await Product.findAll({ where: { tenantId } });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Failed to list products' });
  }
};

exports.get = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const product = await Product.findOne({ where: { id: req.params.id, tenantId } });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch product' });
  }
};

exports.create = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const { name, description, imageUrl, imageMediaId } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ message: 'Name is required' });

    let resolvedImageUrl = imageUrl?.trim() || null;
    let resolvedMediaId = null;

    if (imageMediaId !== undefined) {
      const mediaId = Number(imageMediaId);
      if (!Number.isFinite(mediaId)) return res.status(400).json({ message: 'imageMediaId must be a number' });
      const media = await Media.findOne({ where: { id: mediaId, tenantId } });
      if (!media) return res.status(400).json({ message: 'Image not found for tenant' });
      resolvedImageUrl = media.url;
      resolvedMediaId = media.id;
    }

    const product = await Product.create({
      tenantId,
      name: name.trim(),
      description: description?.trim() || null,
      imageUrl: resolvedImageUrl,
      imageMediaId: resolvedMediaId
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create product' });
  }
};

exports.update = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const { name, description, imageUrl, imageMediaId } = req.body || {};
    const product = await Product.findOne({ where: { id: req.params.id, tenantId } });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ message: 'Name cannot be empty' });
      product.name = name.trim();
    }
    if (description !== undefined) product.description = description?.trim() || null;
    if (imageMediaId !== undefined) {
      if (imageMediaId === null || imageMediaId === '') {
        product.imageMediaId = null;
        if (imageUrl === undefined) {
          product.imageUrl = null;
        }
      } else {
        const mediaId = Number(imageMediaId);
        if (!Number.isFinite(mediaId)) return res.status(400).json({ message: 'imageMediaId must be a number' });
        const media = await Media.findOne({ where: { id: mediaId, tenantId } });
        if (!media) return res.status(400).json({ message: 'Image not found for tenant' });
        product.imageMediaId = media.id;
        product.imageUrl = media.url;
      }
    }
    if (imageUrl !== undefined && imageMediaId === undefined) {
      product.imageUrl = imageUrl?.trim() || null;
      product.imageMediaId = null;
    }
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update product' });
  }
};

exports.remove = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const product = await Product.findOne({ where: { id: req.params.id, tenantId } });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    await product.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete product' });
  }
};

