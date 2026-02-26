'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class TerritoryRun extends Model {
    static associate(models) {
      TerritoryRun.belongsTo(models.TerritoryAssignment, {
        foreignKey: 'territory_assignment_id',
        as: 'territoryAssignment'
      });
      TerritoryRun.belongsTo(models.User, {
        foreignKey: 'created_by_user_id',
        as: 'createdBy'
      });
      TerritoryRun.hasMany(models.RunTerritory, {
        foreignKey: 'run_id',
        as: 'territories'
      });
      TerritoryRun.hasMany(models.LocationPing, {
        foreignKey: 'run_id',
        as: 'pings'
      });
    }

    // Getter: rep_ids als Array
    get repIdsArray() {
      const raw = this.getDataValue('rep_ids');
      if (!raw) return [];
      return raw.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    }
  }

  TerritoryRun.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    territory_assignment_id: {
      type: DataTypes.INTEGER
    },
    plz: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('draft', 'active', 'archived'),
      defaultValue: 'draft'
    },
    num_reps: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    target_weight: {
      type: DataTypes.DECIMAL(10, 2)
    },
    rep_ids: {
      type: DataTypes.TEXT,
      get() {
        const raw = this.getDataValue('rep_ids');
        if (!raw) return [];
        return raw.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      },
      set(val) {
        if (Array.isArray(val)) {
          this.setDataValue('rep_ids', val.join(','));
        } else {
          this.setDataValue('rep_ids', val);
        }
      }
    },
    valid_from: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    valid_until: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    created_by_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'TerritoryRun',
    tableName: 'territory_runs',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return TerritoryRun;
};
