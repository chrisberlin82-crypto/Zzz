'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'trial_ends_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('users', 'subscription_status', {
      type: Sequelize.ENUM('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED'),
      allowNull: false,
      defaultValue: 'TRIAL'
    });

    await queryInterface.addColumn('users', 'stripe_customer_id', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    await queryInterface.addColumn('users', 'stripe_subscription_id', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    await queryInterface.addColumn('users', 'subscription_plan', {
      type: Sequelize.STRING(50),
      allowNull: true
    });

    await queryInterface.addColumn('users', 'subscription_price_cents', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await queryInterface.addColumn('users', 'subscription_started_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('users', 'subscription_ends_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Set trial_ends_at for existing users (30 days from now)
    await queryInterface.sequelize.query(`
      UPDATE users SET trial_ends_at = NOW() + INTERVAL '30 days', subscription_status = 'TRIAL'
      WHERE trial_ends_at IS NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'subscription_ends_at');
    await queryInterface.removeColumn('users', 'subscription_started_at');
    await queryInterface.removeColumn('users', 'subscription_price_cents');
    await queryInterface.removeColumn('users', 'subscription_plan');
    await queryInterface.removeColumn('users', 'stripe_subscription_id');
    await queryInterface.removeColumn('users', 'stripe_customer_id');
    await queryInterface.removeColumn('users', 'subscription_status');
    await queryInterface.removeColumn('users', 'trial_ends_at');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_subscription_status";');
  }
};
