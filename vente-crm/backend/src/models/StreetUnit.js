'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class StreetUnit extends Model {
    static associate(models) {
      StreetUnit.hasMany(models.RunTerritoryUnit, {
        foreignKey: 'street_unit_id',
        as: 'territoryUnits'
      });
    }
  }

  StreetUnit.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    plz: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    street: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    address_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    household_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    centroid_lat: {
      type: DataTypes.DECIMAL(10, 7)
    },
    centroid_lon: {
      type: DataTypes.DECIMAL(10, 7)
    },
    weight: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'StreetUnit',
    tableName: 'street_units',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { unique: true, fields: ['plz', 'street'] }
    ]
  });

  return StreetUnit;
};
