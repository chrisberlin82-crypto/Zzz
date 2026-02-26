'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class RunTerritory extends Model {
    static associate(models) {
      RunTerritory.belongsTo(models.TerritoryRun, {
        foreignKey: 'run_id',
        as: 'run'
      });
      RunTerritory.belongsTo(models.User, {
        foreignKey: 'rep_user_id',
        as: 'rep'
      });
      RunTerritory.hasMany(models.RunTerritoryUnit, {
        foreignKey: 'run_territory_id',
        as: 'units'
      });
    }

    // Parsed polygon_json
    get polygon() {
      const raw = this.getDataValue('polygon_json');
      if (!raw) return null;
      try { return JSON.parse(raw); } catch { return null; }
    }

    // Parsed bounds_json
    get bounds() {
      const raw = this.getDataValue('bounds_json');
      if (!raw) return null;
      try { return JSON.parse(raw); } catch { return null; }
    }
  }

  RunTerritory.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    run_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    rep_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    weight: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    bounds_json: {
      type: DataTypes.TEXT
    },
    polygon_json: {
      type: DataTypes.TEXT
    }
  }, {
    sequelize,
    modelName: 'RunTerritory',
    tableName: 'run_territories',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return RunTerritory;
};
