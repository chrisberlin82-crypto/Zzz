'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class RunTerritoryUnit extends Model {
    static associate(models) {
      RunTerritoryUnit.belongsTo(models.RunTerritory, {
        foreignKey: 'run_territory_id',
        as: 'territory'
      });
      RunTerritoryUnit.belongsTo(models.StreetUnit, {
        foreignKey: 'street_unit_id',
        as: 'streetUnit'
      });
    }
  }

  RunTerritoryUnit.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    run_territory_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    street_unit_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'RunTerritoryUnit',
    tableName: 'run_territory_units',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return RunTerritoryUnit;
};
