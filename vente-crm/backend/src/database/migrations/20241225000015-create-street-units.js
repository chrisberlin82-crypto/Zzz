'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('street_units', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      plz: {
        type: Sequelize.STRING(10),
        allowNull: false
      },
      street: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      address_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      household_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      centroid_lat: {
        type: Sequelize.DECIMAL(10, 7)
      },
      centroid_lon: {
        type: Sequelize.DECIMAL(10, 7)
      },
      weight: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
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

    await queryInterface.addIndex('street_units', ['plz', 'street'], { unique: true, name: 'street_units_plz_street_unique' });
    await queryInterface.addIndex('street_units', ['plz'], { name: 'street_units_plz' });
    await queryInterface.addIndex('street_units', ['centroid_lat', 'centroid_lon'], { name: 'street_units_centroid' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('street_units');
  }
};
