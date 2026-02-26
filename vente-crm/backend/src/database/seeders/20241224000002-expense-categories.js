'use strict';

const expenseCategories = [
  {
    code: '4000',
    name: 'Büromaterial',
    description: 'Bürobedarf, Schreibwaren, Druckerpatronen und sonstige Büromaterialien',
    tax_deductible: true,
    vat_rate: 19.00,
    deduction_limit: null,
    skr_account: '4000',
  },
  {
    code: '4110',
    name: 'Fahrtkosten',
    description: 'Geschäftsreisen, Dienstfahrten, Kilometerpauschale, Tankbelege',
    tax_deductible: true,
    vat_rate: 19.00,
    deduction_limit: null,
    skr_account: '4110',
  },
  {
    code: '4120',
    name: 'Bewirtungskosten',
    description: 'Geschäftsessen, Kundenbewirtung (70% absetzbar gemäß §4 Abs. 5 Nr. 2 EStG)',
    tax_deductible: true,
    vat_rate: 19.00,
    deduction_limit: 70.00,
    skr_account: '4120',
  },
  {
    code: '4210',
    name: 'Telefon/Internet',
    description: 'Telefon-, Mobilfunk- und Internetkosten für geschäftliche Nutzung',
    tax_deductible: true,
    vat_rate: 19.00,
    deduction_limit: null,
    skr_account: '4210',
  },
  {
    code: '4510',
    name: 'Fortbildungskosten',
    description: 'Schulungen, Seminare, Fachbücher, Weiterbildungsmaßnahmen',
    tax_deductible: true,
    vat_rate: 19.00,
    deduction_limit: null,
    skr_account: '4510',
  },
  {
    code: '4600',
    name: 'Werbungskosten',
    description: 'Werbung, Marketing, Flyer, Visitenkarten, Online-Werbung',
    tax_deductible: true,
    vat_rate: 19.00,
    deduction_limit: null,
    skr_account: '4600',
  },
  {
    code: '4800',
    name: 'Versicherungen',
    description: 'Betriebliche Versicherungen (Haftpflicht, Berufsunfähigkeit, etc.)',
    tax_deductible: true,
    vat_rate: 0.00,
    deduction_limit: null,
    skr_account: '4800',
  },
  {
    code: '4900',
    name: 'Sonstige betriebliche Aufwendungen',
    description: 'Alle weiteren betrieblichen Ausgaben, die keiner anderen Kategorie zugeordnet werden können',
    tax_deductible: true,
    vat_rate: 19.00,
    deduction_limit: null,
    skr_account: '4900',
  },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const records = expenseCategories.map((cat) => ({
      ...cat,
      created_at: now,
      updated_at: now,
    }));

    await queryInterface.bulkInsert('expense_categories', records, { ignoreDuplicates: true });
  },

  async down(queryInterface) {
    const { Op } = require('sequelize');

    await queryInterface.bulkDelete('expense_categories', {
      code: {
        [Op.in]: expenseCategories.map((c) => c.code),
      },
    });
  },
};
