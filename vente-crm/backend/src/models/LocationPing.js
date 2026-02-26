'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class LocationPing extends Model {
    static associate(models) {
      LocationPing.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
      LocationPing.belongsTo(models.TerritoryRun, {
        foreignKey: 'run_id',
        as: 'run'
      });
    }
  }

  LocationPing.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    run_id: {
      type: DataTypes.INTEGER
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false
    },
    accuracy_m: {
      type: DataTypes.DECIMAL(10, 2)
    },
    speed_mps: {
      type: DataTypes.DECIMAL(10, 2)
    },
    heading_deg: {
      type: DataTypes.DECIMAL(10, 2)
    },
    is_in_area: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'LocationPing',
    tableName: 'location_pings',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return LocationPing;
};
