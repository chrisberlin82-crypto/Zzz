'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('run_territories', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      run_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'territory_runs', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      rep_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      weight: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      bounds_json: {
        type: Sequelize.TEXT,
        comment: 'JSON: {north, south, east, west}'
      },
      polygon_json: {
        type: Sequelize.TEXT,
        comment: 'GeoJSON Polygon (ConvexHull der StreetUnits)'
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    await queryInterface.addIndex('run_territories', ['run_id'], { name: 'run_territories_run_id' });
    await queryInterface.addIndex('run_territories', ['rep_user_id'], { name: 'run_territories_rep_user_id' });
    await queryInterface.addIndex('run_territories', ['run_id', 'rep_user_id'], { unique: true, name: 'run_territories_run_rep_unique' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('run_territories');
  }
};
