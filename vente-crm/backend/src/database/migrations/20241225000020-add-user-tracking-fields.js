'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'is_in_area', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
    await queryInterface.addColumn('users', 'current_run_id', {
      type: Sequelize.INTEGER,
      references: { model: 'territory_runs', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'is_in_area');
    await queryInterface.removeColumn('users', 'current_run_id');
  }
};
