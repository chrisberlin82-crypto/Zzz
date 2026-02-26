'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('addresses', {
      id: {
        allowNull: false, autoIncrement: true, primaryKey: true,
        type: Sequelize.INTEGER
      },
      address_list_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'address_lists', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      street: { type: Sequelize.STRING(255), allowNull: true },
      house_number: { type: Sequelize.STRING(20), allowNull: true },
      postal_code: { type: Sequelize.STRING(10), allowNull: true },
      city: { type: Sequelize.STRING(100), allowNull: true },
      latitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      longitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      contact_name: { type: Sequelize.STRING(255), allowNull: true },
      phone: { type: Sequelize.STRING(50), allowNull: true },
      email: { type: Sequelize.STRING(255), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      status: {
        type: Sequelize.ENUM('NEW', 'CONTACTED', 'APPOINTMENT', 'NOT_INTERESTED', 'CONVERTED', 'INVALID'),
        defaultValue: 'NEW'
      },
      visited_at: { type: Sequelize.DATE, allowNull: true },
      created_at: {
        allowNull: false, type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false, type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('addresses', ['address_list_id']);
    await queryInterface.addIndex('addresses', ['status']);
    await queryInterface.addIndex('addresses', ['postal_code']);
    await queryInterface.addIndex('addresses', ['latitude', 'longitude']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('addresses');
  }
};
