'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('territory_assignments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      // Admin weist einem Standortleiter/Teamleiter ein PLZ-Gebiet zu
      assigned_to_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      assigned_by_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      // Kommaseparierte PLZ-Liste z.B. "10115,10117,10119"
      postal_codes: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Gebietsname z.B. Berlin Mitte Nord'
      },
      // Zeitliche Variabilitaet
      valid_from: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      valid_until: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      rotation_days: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 14,
        comment: 'Rotationsintervall in Tagen (z.B. 14 = 14-taegig)'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    await queryInterface.addIndex('territory_assignments', ['assigned_to_user_id']);
    await queryInterface.addIndex('territory_assignments', ['assigned_by_user_id']);
    await queryInterface.addIndex('territory_assignments', ['is_active']);
    await queryInterface.addIndex('territory_assignments', ['valid_from', 'valid_until']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('territory_assignments');
  }
};
