'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      password_hash: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      role: {
        type: Sequelize.ENUM('ADMIN', 'STANDORTLEITUNG', 'TEAMLEAD', 'BACKOFFICE', 'VERTRIEB'),
        allowNull: false,
        defaultValue: 'VERTRIEB'
      },
      first_name: { type: Sequelize.STRING(100), allowNull: true },
      last_name: { type: Sequelize.STRING(100), allowNull: true },
      company_name: { type: Sequelize.STRING(255), allowNull: true },
      legal_form: { type: Sequelize.STRING(50), allowNull: true },
      owner_manager: { type: Sequelize.STRING(255), allowNull: true },
      tax_number: { type: Sequelize.STRING(50), allowNull: true },
      street: { type: Sequelize.STRING(255), allowNull: true },
      postal_code: { type: Sequelize.STRING(10), allowNull: true },
      city: { type: Sequelize.STRING(100), allowNull: true },
      phone: { type: Sequelize.STRING(50), allowNull: true },
      iban: { type: Sequelize.STRING(34), allowNull: true },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      last_login: { type: Sequelize.DATE, allowNull: true },
      refresh_token: { type: Sequelize.TEXT, allowNull: true },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('users', ['email'], { unique: true });
    await queryInterface.addIndex('users', ['role']);
    await queryInterface.addIndex('users', ['is_active']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  }
};
