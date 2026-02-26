'use strict';

const customers = [
  { first_name: 'Thomas', last_name: 'Müller', email: 'thomas.mueller@gmail.com', phone: '030 55123456', street: 'Friedrichstraße', postal_code: '10117', city: 'Berlin', type: 'PRIVATE', source: 'COLD_CALL' },
  { first_name: 'Sandra', last_name: 'Schmidt', email: 'sandra.schmidt@web.de', phone: '030 55234567', street: 'Unter den Linden', postal_code: '10117', city: 'Berlin', type: 'PRIVATE', source: 'REFERRAL' },
  { first_name: 'Michael', last_name: 'Weber', email: 'michael.weber@outlook.de', phone: '030 55345678', street: 'Leipziger Straße', postal_code: '10117', city: 'Berlin', type: 'PRIVATE', source: 'ONLINE' },
  { first_name: 'Anna', last_name: 'Fischer', email: 'anna.fischer@gmx.de', phone: '030 55456789', street: 'Charlottenstraße', postal_code: '10117', city: 'Berlin', type: 'PRIVATE', source: 'EVENT' },
  { first_name: 'Klaus', last_name: 'Hartmann', email: 'k.hartmann@hartmann-architektur.de', phone: '030 2086641', street: 'Friedrichstraße', postal_code: '10117', city: 'Berlin', type: 'BUSINESS', source: 'COLD_CALL', company_name: 'Architekturbüro Hartmann' },
  { first_name: 'Maria', last_name: 'Schneider', email: 'kontakt@stb-schneider.de', phone: '030 2091820', street: 'Friedrichstraße', postal_code: '10117', city: 'Berlin', type: 'BUSINESS', source: 'COLD_CALL', company_name: 'Steuerberatung Schneider GmbH' },
  { first_name: 'Stefan', last_name: 'Braun', email: 'beratung@braun-versicherung.de', phone: '030 2098823', street: 'Friedrichstraße', postal_code: '10117', city: 'Berlin', type: 'BUSINESS', source: 'PARTNER', company_name: 'Versicherungsbüro Braun' },
  { first_name: 'Lisa', last_name: 'Berger', email: 'kanzlei@berger-zoll.de', phone: '030 2069934', street: 'Unter den Linden', postal_code: '10117', city: 'Berlin', type: 'BUSINESS', source: 'REFERRAL', company_name: 'Anwaltskanzlei Berger & Zoll' },
  { first_name: 'Frank', last_name: 'Lindenberg', email: 'info@konditorei-lindenberg.de', phone: '030 2042278', street: 'Unter den Linden', postal_code: '10117', city: 'Berlin', type: 'BUSINESS', source: 'COLD_CALL', company_name: 'Konditorei Lindenberg' },
  { first_name: 'Petra', last_name: 'Wagner', email: 'kontakt@it-solutions-berlin.de', phone: '030 2098865', street: 'Unter den Linden', postal_code: '10117', city: 'Berlin', type: 'BUSINESS', source: 'ONLINE', company_name: 'IT-Solutions Berlin GmbH' },
  { first_name: 'Jens', last_name: 'Hoffmann', email: 'jens.hoffmann@techhub-berlin.de', phone: '030 2093310', street: 'Friedrichstraße', postal_code: '10117', city: 'Berlin', type: 'BUSINESS', source: 'EVENT', company_name: 'TechHub Berlin GmbH' },
  { first_name: 'Claudia', last_name: 'Richter', email: 'claudia.richter@t-online.de', phone: '030 55567890', street: 'Gendarmenmarkt', postal_code: '10117', city: 'Berlin', type: 'PRIVATE', source: 'ONLINE' },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // Vertrieb-User finden
    const [users] = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE role = 'VERTRIEB' LIMIT 1"
    );
    const userId = users.length > 0 ? users[0].id : 1;

    const rows = customers.map(c => ({
      user_id: userId,
      first_name: c.first_name,
      last_name: c.last_name,
      email: c.email,
      phone: c.phone,
      street: c.street,
      postal_code: c.postal_code,
      city: c.city,
      type: c.type,
      source: c.source,
      company_name: c.company_name || null,
      gdpr_consent: true,
      gdpr_consent_date: now,
      notes: '',
      created_at: now,
      updated_at: now,
    }));

    await queryInterface.bulkInsert('customers', rows, { ignoreDuplicates: true });
  },

  async down(queryInterface) {
    const { Op } = require('sequelize');
    await queryInterface.bulkDelete('customers', {
      email: { [Op.in]: customers.map(c => c.email) }
    });
  },
};
