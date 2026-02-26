'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('contracts', {
      id: {
        allowNull: false, autoIncrement: true, primaryKey: true,
        type: Sequelize.INTEGER
      },
      customer_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'customers', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      product_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'products', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      user_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      status: {
        type: Sequelize.ENUM('LEAD', 'QUALIFIED', 'OFFER', 'NEGOTIATION', 'SIGNED', 'ACTIVE', 'CANCELLED', 'EXPIRED'),
        allowNull: false, defaultValue: 'LEAD'
      },
      status_history: { type: Sequelize.JSONB, allowNull: true, defaultValue: [] },
      consumption: { type: Sequelize.INTEGER, allowNull: true },
      estimated_value: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      start_date: { type: Sequelize.DATEONLY, allowNull: true },
      end_date: { type: Sequelize.DATEONLY, allowNull: true },
      duration: { type: Sequelize.INTEGER, allowNull: true },
      commission_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      commission_paid: { type: Sequelize.BOOLEAN, defaultValue: false },
      documents: { type: Sequelize.JSONB, allowNull: true, defaultValue: [] },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: {
        allowNull: false, type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false, type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('contracts', ['customer_id']);
    await queryInterface.addIndex('contracts', ['product_id']);
    await queryInterface.addIndex('contracts', ['user_id']);
    await queryInterface.addIndex('contracts', ['status']);
    await queryInterface.addIndex('contracts', ['user_id', 'status', 'created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('contracts');
  }
};
