module.exports = (sequelize, DataTypes) => {
  const ExpenseCategory = sequelize.define('ExpenseCategory', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
      comment: 'SKR03/SKR04 Kontonummer'
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tax_deductible: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    vat_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 19.00
    },
    deduction_limit: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Absetzungsgrenze als Dezimalzahl (0.7 = 70%)'
    },
    skr_account: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'SKR03 Sachkonto'
    }
  }, {
    tableName: 'expense_categories',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['code'] }
    ]
  });

  return ExpenseCategory;
};
