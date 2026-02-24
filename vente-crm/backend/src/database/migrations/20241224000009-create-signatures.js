'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('signatures', {
      id: {
        allowNull: false, autoIncrement: true, primaryKey: true,
        type: Sequelize.INTEGER
      },
      contract_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'contracts', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      user_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      signature_data: { type: Sequelize.TEXT, allowNull: false },
      signed_at: { type: Sequelize.DATE, allowNull: false },
      gps_latitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      gps_longitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      gps_accuracy: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      device_info: { type: Sequelize.JSONB, allowNull: true },
      consent_given: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      hash_value: { type: Sequelize.STRING(128), allowNull: false },
      ip_address: { type: Sequelize.STRING(45), allowNull: true },
      created_at: {
        allowNull: false, type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false, type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('signatures', ['contract_id']);
    await queryInterface.addIndex('signatures', ['user_id']);
    await queryInterface.addIndex('signatures', ['signed_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('signatures');
  }
};
