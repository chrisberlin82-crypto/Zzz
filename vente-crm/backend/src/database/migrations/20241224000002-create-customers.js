'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('customers', {
      id: {
        allowNull: false, autoIncrement: true, primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT'
      },
      type: {
        type: Sequelize.ENUM('PRIVATE', 'BUSINESS'),
        allowNull: false, defaultValue: 'PRIVATE'
      },
      first_name: { type: Sequelize.STRING(100), allowNull: false },
      last_name: { type: Sequelize.STRING(100), allowNull: false },
      company_name: { type: Sequelize.STRING(255), allowNull: true },
      email: { type: Sequelize.STRING(255), allowNull: true },
      phone: { type: Sequelize.STRING(50), allowNull: true },
      street: { type: Sequelize.STRING(255), allowNull: true },
      postal_code: { type: Sequelize.STRING(10), allowNull: true },
      city: { type: Sequelize.STRING(100), allowNull: true },
      source: {
        type: Sequelize.ENUM('ONLINE', 'REFERRAL', 'COLD_CALL', 'EVENT', 'PARTNER', 'OTHER'),
        allowNull: true, defaultValue: 'OTHER'
      },
      needs: { type: Sequelize.JSONB, allowNull: true, defaultValue: [] },
      notes: { type: Sequelize.TEXT, allowNull: true },
      gdpr_consent: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      gdpr_consent_date: { type: Sequelize.DATE, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: {
        allowNull: false, type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false, type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('customers', ['user_id']);
    await queryInterface.addIndex('customers', ['email']);
    await queryInterface.addIndex('customers', ['type']);
    await queryInterface.addIndex('customers', ['last_name', 'first_name']);
    await queryInterface.addIndex('customers', ['is_active']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('customers');
  }
};
