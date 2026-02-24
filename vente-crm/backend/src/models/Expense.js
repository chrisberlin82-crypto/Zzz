module.exports = (sequelize, DataTypes) => {
  const Expense = sequelize.define('Expense', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'expense_categories', key: 'id' }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Bruttobetrag in EUR'
    },
    net_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Nettobetrag in EUR'
    },
    tax_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'USt-Betrag in EUR'
    },
    deductible_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Steuerlich absetzbarer Betrag'
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    expense_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    receipt_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'expenses',
    timestamps: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['category_id'] },
      { fields: ['expense_date'] },
      { fields: ['user_id', 'expense_date'] },
      { fields: ['user_id', 'category_id', 'expense_date'] }
    ]
  });

  return Expense;
};
