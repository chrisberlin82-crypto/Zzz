'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('expenses', {
      id: {
        allowNull: false, autoIncrement: true, primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      category_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'expense_categories', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      net_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      tax_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      deductible_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      description: { type: Sequelize.STRING(500), allowNull: false },
      expense_date: { type: Sequelize.DATEONLY, allowNull: false },
      receipt_url: { type: Sequelize.STRING(500), allowNull: true },
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

    await queryInterface.addIndex('expenses', ['user_id']);
    await queryInterface.addIndex('expenses', ['category_id']);
    await queryInterface.addIndex('expenses', ['expense_date']);
    await queryInterface.addIndex('expenses', ['user_id', 'expense_date']);
    await queryInterface.addIndex('expenses', ['user_id', 'category_id', 'expense_date']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('expenses');
  }
};
