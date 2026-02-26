module.exports = (sequelize, DataTypes) => {
  const TerritoryAssignment = sequelize.define('TerritoryAssignment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    assigned_to_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    assigned_by_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    postal_codes: {
      type: DataTypes.TEXT,
      allowNull: false,
      get() {
        const val = this.getDataValue('postal_codes');
        return val ? val.split(',').map(s => s.trim()) : [];
      },
      set(val) {
        this.setDataValue('postal_codes', Array.isArray(val) ? val.join(',') : val);
      }
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    valid_from: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    valid_until: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    rotation_days: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 14
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'territory_assignments',
    timestamps: true,
    indexes: [
      { fields: ['assigned_to_user_id'] },
      { fields: ['assigned_by_user_id'] },
      { fields: ['is_active'] },
      { fields: ['valid_from', 'valid_until'] }
    ]
  });

  return TerritoryAssignment;
};
