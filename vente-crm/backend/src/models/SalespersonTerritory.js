module.exports = (sequelize, DataTypes) => {
  const SalespersonTerritory = sequelize.define('SalespersonTerritory', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    territory_assignment_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'territory_assignments', key: 'id' }
    },
    salesperson_user_id: {
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
    streets: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const val = this.getDataValue('streets');
        if (!val) return null;
        try { return JSON.parse(val); } catch { return null; }
      },
      set(val) {
        this.setDataValue('streets', val ? JSON.stringify(val) : null);
      }
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
    tableName: 'salesperson_territories',
    timestamps: true,
    indexes: [
      { fields: ['territory_assignment_id'] },
      { fields: ['salesperson_user_id'] },
      { fields: ['assigned_by_user_id'] },
      { fields: ['is_active'] }
    ]
  });

  return SalespersonTerritory;
};
