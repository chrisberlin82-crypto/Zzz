'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'last_latitude', {
      type: Sequelize.DECIMAL(10, 7),
      allowNull: true
    });
    await queryInterface.addColumn('users', 'last_longitude', {
      type: Sequelize.DECIMAL(10, 7),
      allowNull: true
    });
    await queryInterface.addColumn('users', 'last_location_at', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'last_latitude');
    await queryInterface.removeColumn('users', 'last_longitude');
    await queryInterface.removeColumn('users', 'last_location_at');
  }
};
