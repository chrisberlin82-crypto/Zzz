'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('address_lists', {
      id: {
        allowNull: false, autoIncrement: true, primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      name: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      file_url: { type: Sequelize.STRING(500), allowNull: true },
      total_addresses: { type: Sequelize.INTEGER, defaultValue: 0 },
      geocoded_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      geocoding_status: {
        type: Sequelize.ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'),
        defaultValue: 'PENDING'
      },
      processed_at: { type: Sequelize.DATE, allowNull: true },
      created_at: {
        allowNull: false, type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false, type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('address_lists', ['user_id']);
    await queryInterface.addIndex('address_lists', ['geocoding_status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('address_lists');
  }
};
