module.exports = (sequelize, DataTypes) => {
  const Signature = sequelize.define('Signature', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    contract_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'contracts', key: 'id' }
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    signature_data: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Base64-encoded PNG Signatur'
    },
    signed_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    gps_latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true
    },
    gps_longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true
    },
    gps_accuracy: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    device_info: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    consent_given: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    hash_value: {
      type: DataTypes.STRING(128),
      allowNull: false,
      comment: 'SHA-256 Hash fuer Integritaetspruefung'
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true
    }
  }, {
    tableName: 'signatures',
    timestamps: true,
    indexes: [
      { fields: ['contract_id'] },
      { fields: ['user_id'] },
      { fields: ['signed_at'] }
    ]
  });

  return Signature;
};
