'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: {
        allowNull: false, autoIncrement: true, primaryKey: true,
        type: Sequelize.INTEGER
      },
      entity_type: { type: Sequelize.STRING(50), allowNull: false },
      entity_id: { type: Sequelize.INTEGER, allowNull: true },
      user_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      action: { type: Sequelize.STRING(20), allowNull: false },
      before_data: { type: Sequelize.JSONB, allowNull: true },
      after_data: { type: Sequelize.JSONB, allowNull: true },
      ip_address: { type: Sequelize.STRING(45), allowNull: true },
      user_agent: { type: Sequelize.TEXT, allowNull: true },
      reason: { type: Sequelize.TEXT, allowNull: true },
      created_at: {
        allowNull: false, type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('audit_logs', ['entity_type', 'entity_id']);
    await queryInterface.addIndex('audit_logs', ['user_id']);
    await queryInterface.addIndex('audit_logs', ['action']);
    await queryInterface.addIndex('audit_logs', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('audit_logs');
  }
};
