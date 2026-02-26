'use strict';

const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 12;

const defaultUsers = [
  {
    email: 'admin@vente-projekt.de',
    password: 'Admin123!',
    role: 'ADMIN',
    first_name: 'System',
    last_name: 'Administrator',
  },
  {
    email: 'standort@vente-projekt.de',
    password: 'Standort123!',
    role: 'STANDORTLEITUNG',
    first_name: 'Standort',
    last_name: 'Leitung',
  },
  {
    email: 'team@vente-projekt.de',
    password: 'Team123!',
    role: 'TEAMLEAD',
    first_name: 'Team',
    last_name: 'Lead',
  },
  {
    email: 'vertrieb@vente-projekt.de',
    password: 'Vertrieb123!',
    role: 'VERTRIEB',
    first_name: 'Vertrieb',
    last_name: 'Mitarbeiter',
  },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const users = await Promise.all(
      defaultUsers.map(async (user) => {
        const password_hash = await bcrypt.hash(user.password, BCRYPT_ROUNDS);
        return {
          email: user.email,
          password_hash,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
          company_name: 'Vente Projekt GmbH',
          is_active: true,
          created_at: now,
          updated_at: now,
        };
      })
    );

    await queryInterface.bulkInsert('users', users, { ignoreDuplicates: true });
  },

  async down(queryInterface) {
    const { Op } = require('sequelize');

    await queryInterface.bulkDelete('users', {
      email: {
        [Op.in]: defaultUsers.map((u) => u.email),
      },
    });
  },
};
