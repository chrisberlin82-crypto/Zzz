'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('run_territory_units', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      run_territory_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'run_territories', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      street_unit_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'street_units', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    await queryInterface.addIndex('run_territory_units', ['run_territory_id', 'street_unit_id'], { unique: true, name: 'run_territory_units_unique' });
    await queryInterface.addIndex('run_territory_units', ['street_unit_id'], { name: 'run_territory_units_street_unit' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('run_territory_units');
  }
};
