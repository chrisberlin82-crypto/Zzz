'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('salesperson_territories', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      // Standortleiter/Teamleiter weist einem Vertriebler Strassen zu
      territory_assignment_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'territory_assignments', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      salesperson_user_id: {
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
      // Kommaseparierte PLZ-Liste (Subset der territory_assignment PLZs)
      postal_codes: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      // Optional: Spezifische Strassen als JSON-Array
      // z.B. ["Friedrichstr.", "Unter den Linden"]
      streets: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'JSON-Array mit zugewiesenen Strassen (null = alle Strassen der PLZ)'
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

    await queryInterface.addIndex('salesperson_territories', ['territory_assignment_id']);
    await queryInterface.addIndex('salesperson_territories', ['salesperson_user_id']);
    await queryInterface.addIndex('salesperson_territories', ['assigned_by_user_id']);
    await queryInterface.addIndex('salesperson_territories', ['is_active']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('salesperson_territories');
  }
};
