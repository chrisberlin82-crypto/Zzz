module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    provider: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    category: {
      type: DataTypes.ENUM('STROM', 'GAS', 'STROM_GAS', 'SOLAR', 'WAERMEPUMPE'),
      allowNull: false
    },
    tariff_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    base_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Grundpreis in EUR/Monat'
    },
    working_price: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true,
      comment: 'Arbeitspreis in EUR/kWh'
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Mindestvertragslaufzeit in Monaten'
    },
    cancellation_period: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Kuendigungsfrist in Wochen'
    },
    commission_model: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Provisionsmodell: {type, amount, percentage}'
    },
    conditions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_eco: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Oekostrom/Oekogas'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'products',
    timestamps: true,
    indexes: [
      { fields: ['provider'] },
      { fields: ['category'] },
      { fields: ['is_active'] }
    ]
  });

  return Product;
};
