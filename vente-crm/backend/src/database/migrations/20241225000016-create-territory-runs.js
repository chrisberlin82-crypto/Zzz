'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('territory_runs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      territory_assignment_id: {
        type: Sequelize.INTEGER,
        references: { model: 'territory_assignments', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      plz: {
        type: Sequelize.STRING(10),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('draft', 'active', 'archived'),
        defaultValue: 'draft'
      },
      num_reps: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      target_weight: {
        type: Sequelize.DECIMAL(10, 2)
      },
      rep_ids: {
        type: Sequelize.TEXT,
        comment: 'Comma-separated User-IDs der Vertriebler'
      },
      valid_from: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      valid_until: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      created_by_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    await queryInterface.addIndex('territory_runs', ['plz'], { name: 'territory_runs_plz' });
    await queryInterface.addIndex('territory_runs', ['status'], { name: 'territory_runs_status' });
    await queryInterface.addIndex('territory_runs', ['plz', 'status'], { name: 'territory_runs_plz_status' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('territory_runs');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_territory_runs_status";');
  }
};
