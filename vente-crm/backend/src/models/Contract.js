module.exports = (sequelize, DataTypes) => {
  const Contract = sequelize.define('Contract', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'customers', key: 'id' }
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'products', key: 'id' }
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    status: {
      type: DataTypes.ENUM(
        'LEAD', 'QUALIFIED', 'OFFER', 'NEGOTIATION',
        'SIGNED', 'ACTIVE', 'CANCELLED', 'EXPIRED'
      ),
      allowNull: false,
      defaultValue: 'LEAD'
    },
    status_history: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    consumption: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Jahresverbrauch in kWh'
    },
    estimated_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Vertragsdauer in Monaten'
    },
    commission_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    commission_paid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    documents: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'contracts',
    timestamps: true,
    indexes: [
      { fields: ['customer_id'] },
      { fields: ['product_id'] },
      { fields: ['user_id'] },
      { fields: ['status'] },
      { fields: ['user_id', 'status', 'created_at'] },
      { fields: ['start_date'] }
    ]
  });

  return Contract;
};
