const logger = require('../utils/logger');

const getProducts = async (req, res) => {
  try {
    const { Product } = req.app.locals.db;
    const { category, provider, is_active = 'true' } = req.query;

    const where = {};
    if (category) where.category = category;
    if (provider) where.provider = provider;
    if (is_active !== 'all') where.is_active = is_active === 'true';

    const products = await Product.findAll({
      where,
      order: [['provider', 'ASC'], ['tariff_name', 'ASC']]
    });

    res.json({ success: true, data: products });
  } catch (error) {
    logger.error('Get products error:', error);
    res.status(500).json({ success: false, error: 'Produkte konnten nicht geladen werden' });
  }
};

const getProduct = async (req, res) => {
  try {
    const { Product } = req.app.locals.db;
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Produkt nicht gefunden' });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    logger.error('Get product error:', error);
    res.status(500).json({ success: false, error: 'Produkt konnte nicht geladen werden' });
  }
};

const createProduct = async (req, res) => {
  try {
    const { Product } = req.app.locals.db;
    const product = await Product.create(req.body);

    logger.info(`Product created: ${product.id}`);
    res.status(201).json({
      success: true,
      message: 'Produkt erstellt',
      data: product
    });
  } catch (error) {
    logger.error('Create product error:', error);
    res.status(500).json({ success: false, error: 'Produkt konnte nicht erstellt werden' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { Product } = req.app.locals.db;
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Produkt nicht gefunden' });
    }

    await product.update(req.body);
    res.json({ success: true, message: 'Produkt aktualisiert', data: product });
  } catch (error) {
    logger.error('Update product error:', error);
    res.status(500).json({ success: false, error: 'Produkt konnte nicht aktualisiert werden' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { Product } = req.app.locals.db;
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Produkt nicht gefunden' });
    }

    await product.update({ is_active: false });
    res.json({ success: true, message: 'Produkt deaktiviert' });
  } catch (error) {
    logger.error('Delete product error:', error);
    res.status(500).json({ success: false, error: 'Produkt konnte nicht deaktiviert werden' });
  }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct };
