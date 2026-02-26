'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('location_pings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      run_id: {
        type: Sequelize.INTEGER,
        references: { model: 'territory_runs', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: false
      },
      longitude: {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: false
      },
      accuracy_m: {
        type: Sequelize.DECIMAL(10, 2)
      },
      speed_mps: {
        type: Sequelize.DECIMAL(10, 2)
      },
      heading_deg: {
        type: Sequelize.DECIMAL(10, 2)
      },
      is_in_area: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    await queryInterface.addIndex('location_pings', ['user_id'], { name: 'location_pings_user_id' });
    await queryInterface.addIndex('location_pings', ['user_id', 'created_at'], { name: 'location_pings_user_created' });
    await queryInterface.addIndex('location_pings', ['user_id', 'run_id', 'created_at'], { name: 'location_pings_user_run_created' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('location_pings');
  }
};
