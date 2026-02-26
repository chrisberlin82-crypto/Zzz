'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('products', {
      id: {
        allowNull: false, autoIncrement: true, primaryKey: true,
        type: Sequelize.INTEGER
      },
      provider: { type: Sequelize.STRING(255), allowNull: false },
      category: {
        type: Sequelize.ENUM('STROM', 'GAS', 'STROM_GAS', 'SOLAR', 'WAERMEPUMPE'),
        allowNull: false
      },
      tariff_name: { type: Sequelize.STRING(255), allowNull: false },
      base_price: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      working_price: { type: Sequelize.DECIMAL(10, 4), allowNull: true },
      duration: { type: Sequelize.INTEGER, allowNull: true },
      cancellation_period: { type: Sequelize.INTEGER, allowNull: true },
      commission_model: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      conditions: { type: Sequelize.TEXT, allowNull: true },
      is_eco: { type: Sequelize.BOOLEAN, defaultValue: false },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: {
        allowNull: false, type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false, type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('products', ['provider']);
    await queryInterface.addIndex('products', ['category']);
    await queryInterface.addIndex('products', ['is_active']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('products');
  }
};
