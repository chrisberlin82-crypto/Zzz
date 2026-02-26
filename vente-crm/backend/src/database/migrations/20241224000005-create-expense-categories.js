'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('expense_categories', {
      id: {
        allowNull: false, autoIncrement: true, primaryKey: true,
        type: Sequelize.INTEGER
      },
      code: { type: Sequelize.STRING(10), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      tax_deductible: { type: Sequelize.BOOLEAN, defaultValue: true },
      vat_rate: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 19.00 },
      deduction_limit: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      skr_account: { type: Sequelize.STRING(10), allowNull: true },
      created_at: {
        allowNull: false, type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false, type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('expense_categories', ['code'], { unique: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('expense_categories');
  }
};
