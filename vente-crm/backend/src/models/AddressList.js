module.exports = (sequelize, DataTypes) => {
  const AddressList = sequelize.define('AddressList', {
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
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    file_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    total_addresses: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    geocoded_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    geocoding_status: {
      type: DataTypes.ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'),
      defaultValue: 'PENDING'
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'address_lists',
    timestamps: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['geocoding_status'] }
    ]
  });

  return AddressList;
};
