'use strict';

const sampleProducts = [
  // ========================================
  // Strom-Tarife
  // ========================================
  {
    provider: 'E.ON',
    category: 'STROM',
    tariff_name: 'E.ON Grundversorgung Strom',
    base_price: 11.90,
    working_price: 0.3489,
    duration: 12,
    cancellation_period: 4,
    commission_model: JSON.stringify({
      type: 'per_contract',
      base_commission: 85.00,
      bonus_threshold: 10,
      bonus_amount: 10.00,
      currency: 'EUR',
    }),
    conditions: 'Mindestlaufzeit 12 Monate. Preisgarantie für die gesamte Vertragslaufzeit. Automatische Verlängerung um 12 Monate.',
    is_eco: false,
    is_active: true,
  },
  {
    provider: 'Vattenfall',
    category: 'STROM',
    tariff_name: 'Vattenfall Natur24 Strom',
    base_price: 9.95,
    working_price: 0.3295,
    duration: 24,
    cancellation_period: 6,
    commission_model: JSON.stringify({
      type: 'per_contract',
      base_commission: 110.00,
      bonus_threshold: 15,
      bonus_amount: 15.00,
      currency: 'EUR',
    }),
    conditions: 'Mindestlaufzeit 24 Monate. 100% Ökostrom aus erneuerbaren Energien. Preisgarantie bis zum Laufzeitende.',
    is_eco: true,
    is_active: true,
  },
  {
    provider: 'EnBW',
    category: 'STROM',
    tariff_name: 'EnBW Comfort Strom',
    base_price: 10.50,
    working_price: 0.3390,
    duration: 12,
    cancellation_period: 4,
    commission_model: JSON.stringify({
      type: 'per_contract',
      base_commission: 90.00,
      bonus_threshold: 8,
      bonus_amount: 12.00,
      currency: 'EUR',
    }),
    conditions: 'Mindestlaufzeit 12 Monate. Persönlicher Kundenservice. Flexible Abschlagszahlung.',
    is_eco: false,
    is_active: true,
  },
  {
    provider: 'E.ON',
    category: 'STROM',
    tariff_name: 'E.ON Öko Plus Strom',
    base_price: 12.50,
    working_price: 0.3590,
    duration: 24,
    cancellation_period: 6,
    commission_model: JSON.stringify({
      type: 'per_contract',
      base_commission: 120.00,
      bonus_threshold: 12,
      bonus_amount: 15.00,
      currency: 'EUR',
    }),
    conditions: 'Mindestlaufzeit 24 Monate. 100% Ökostrom mit TÜV-Zertifizierung. Preisgarantie 24 Monate.',
    is_eco: true,
    is_active: true,
  },

  // ========================================
  // Gas-Tarife
  // ========================================
  {
    provider: 'E.ON',
    category: 'GAS',
    tariff_name: 'E.ON Grundversorgung Gas',
    base_price: 13.90,
    working_price: 0.1189,
    duration: 12,
    cancellation_period: 4,
    commission_model: JSON.stringify({
      type: 'per_contract',
      base_commission: 95.00,
      bonus_threshold: 10,
      bonus_amount: 10.00,
      currency: 'EUR',
    }),
    conditions: 'Mindestlaufzeit 12 Monate. Preisgarantie für die gesamte Vertragslaufzeit. Monatliche Abschlagszahlung.',
    is_eco: false,
    is_active: true,
  },
  {
    provider: 'Vattenfall',
    category: 'GAS',
    tariff_name: 'Vattenfall Comfort Gas',
    base_price: 11.95,
    working_price: 0.1095,
    duration: 24,
    cancellation_period: 6,
    commission_model: JSON.stringify({
      type: 'per_contract',
      base_commission: 105.00,
      bonus_threshold: 12,
      bonus_amount: 12.00,
      currency: 'EUR',
    }),
    conditions: 'Mindestlaufzeit 24 Monate. Preisgarantie 24 Monate. CO2-kompensiert über zertifizierte Klimaprojekte.',
    is_eco: false,
    is_active: true,
  },
  {
    provider: 'EnBW',
    category: 'GAS',
    tariff_name: 'EnBW Öko Biogas',
    base_price: 14.50,
    working_price: 0.1295,
    duration: 12,
    cancellation_period: 4,
    commission_model: JSON.stringify({
      type: 'per_contract',
      base_commission: 100.00,
      bonus_threshold: 8,
      bonus_amount: 10.00,
      currency: 'EUR',
    }),
    conditions: 'Mindestlaufzeit 12 Monate. 10% Biogas-Anteil. Klimaneutraler Tarif mit TÜV-Zertifizierung.',
    is_eco: true,
    is_active: true,
  },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const records = sampleProducts.map((product) => ({
      ...product,
      created_at: now,
      updated_at: now,
    }));

    await queryInterface.bulkInsert('products', records, { ignoreDuplicates: true });
  },

  async down(queryInterface) {
    const { Op } = require('sequelize');

    await queryInterface.bulkDelete('products', {
      tariff_name: {
        [Op.in]: sampleProducts.map((p) => p.tariff_name),
      },
    });
  },
};
