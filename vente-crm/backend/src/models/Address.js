module.exports = (sequelize, DataTypes) => {
  const Address = sequelize.define('Address', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    address_list_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'address_lists', key: 'id' }
    },
    street: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    house_number: {
      type: DataTypes.STRING(20),
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
    latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true
    },
    contact_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('NEW', 'CONTACTED', 'APPOINTMENT', 'NOT_INTERESTED', 'CONVERTED', 'INVALID'),
      defaultValue: 'NEW'
    },
    visited_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    total_households: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: 'Anzahl Haushalte an der Adresse'
    },
    contacted_households: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: 'Anzahl angetroffener Haushalte'
    }
  }, {
    tableName: 'addresses',
    timestamps: true,
    indexes: [
      { fields: ['address_list_id'] },
      { fields: ['status'] },
      { fields: ['postal_code'] },
      { fields: ['latitude', 'longitude'] }
    ]
  });

  return Address;
};
