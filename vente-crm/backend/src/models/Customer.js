module.exports = (sequelize, DataTypes) => {
  const Customer = sequelize.define('Customer', {
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
    type: {
      type: DataTypes.ENUM('PRIVATE', 'BUSINESS'),
      allowNull: false,
      defaultValue: 'PRIVATE'
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    company_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: { isEmail: true }
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    street: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    postal_code: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    source: {
      type: DataTypes.ENUM('ONLINE', 'REFERRAL', 'COLD_CALL', 'EVENT', 'PARTNER', 'OTHER'),
      allowNull: true,
      defaultValue: 'OTHER'
    },
    needs: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    gdpr_consent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    gdpr_consent_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'customers',
    timestamps: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['email'] },
      { fields: ['type'] },
      { fields: ['last_name', 'first_name'] },
      { fields: ['postal_code'] },
      { fields: ['is_active'] }
    ]
  });

  return Customer;
};
