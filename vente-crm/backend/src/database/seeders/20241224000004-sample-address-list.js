'use strict';

const addresses = [
  { contact_name: 'Galeria Kaufhof', street: 'Friedrichstraße', house_number: '136', postal_code: '10117', city: 'Berlin', phone: '030 20946-0', email: 'info@galeria-berlin.de' },
  { contact_name: 'Rechtsanwälte Müller & Partner', street: 'Friedrichstraße', house_number: '134', postal_code: '10117', city: 'Berlin', phone: '030 2045110', email: 'kanzlei@mueller-partner.de' },
  { contact_name: 'Steuerberatung Schneider GmbH', street: 'Friedrichstraße', house_number: '131', postal_code: '10117', city: 'Berlin', phone: '030 2091820', email: 'kontakt@stb-schneider.de' },
  { contact_name: 'Café Einstein', street: 'Friedrichstraße', house_number: '130', postal_code: '10117', city: 'Berlin', phone: '030 2047532', email: 'reservierung@cafe-einstein.de' },
  { contact_name: 'Dr. med. Weber - Zahnarzt', street: 'Friedrichstraße', house_number: '128', postal_code: '10117', city: 'Berlin', phone: '030 2048876', email: 'praxis@dr-weber-berlin.de' },
  { contact_name: 'TechHub Berlin GmbH', street: 'Friedrichstraße', house_number: '126', postal_code: '10117', city: 'Berlin', phone: '030 2093310', email: 'hello@techhub-berlin.de' },
  { contact_name: 'Optiker Fielmann', street: 'Friedrichstraße', house_number: '124', postal_code: '10117', city: 'Berlin', phone: '030 2043390', email: 'berlin-mitte@fielmann.de' },
  { contact_name: 'Reisebüro Horizont', street: 'Friedrichstraße', house_number: '122', postal_code: '10117', city: 'Berlin', phone: '030 2091456', email: 'reisen@horizont-berlin.de' },
  { contact_name: 'Sparkasse Berlin Filiale Mitte', street: 'Friedrichstraße', house_number: '120', postal_code: '10117', city: 'Berlin', phone: '030 2045500', email: 'filiale-mitte@sparkasse-berlin.de' },
  { contact_name: 'Immobilien Schmidt & Co.', street: 'Friedrichstraße', house_number: '118', postal_code: '10117', city: 'Berlin', phone: '030 2087734', email: 'info@schmidt-immobilien.de' },
  { contact_name: 'Friseur Haarmonie', street: 'Friedrichstraße', house_number: '116', postal_code: '10117', city: 'Berlin', phone: '030 2049912', email: 'termin@haarmonie.de' },
  { contact_name: 'Asia Gourmet Restaurant', street: 'Friedrichstraße', house_number: '114', postal_code: '10117', city: 'Berlin', phone: '030 2046678', email: 'bestellen@asia-gourmet.de' },
  { contact_name: 'Apotheke am Checkpoint', street: 'Friedrichstraße', house_number: '112', postal_code: '10117', city: 'Berlin', phone: '030 2041199', email: 'service@apo-checkpoint.de' },
  { contact_name: 'Versicherungsbüro Braun', street: 'Friedrichstraße', house_number: '110', postal_code: '10117', city: 'Berlin', phone: '030 2098823', email: 'beratung@braun-versicherung.de' },
  { contact_name: 'Physiotherapie Balance', street: 'Friedrichstraße', house_number: '108', postal_code: '10117', city: 'Berlin', phone: '030 2044456', email: 'praxis@physio-balance.de' },
  { contact_name: 'Buchhandlung Dussmann', street: 'Friedrichstraße', house_number: '106', postal_code: '10117', city: 'Berlin', phone: '030 2025-0', email: 'info@kulturkaufhaus.de' },
  { contact_name: 'Vodafone Shop Mitte', street: 'Friedrichstraße', house_number: '104', postal_code: '10117', city: 'Berlin', phone: '030 2073318', email: 'shop-mitte@vodafone.de' },
  { contact_name: 'Bäckerei Wiedemann', street: 'Friedrichstraße', house_number: '102', postal_code: '10117', city: 'Berlin', phone: '030 2049987', email: 'bestellung@wiedemann.de' },
  { contact_name: 'Architekturbüro Hartmann', street: 'Friedrichstraße', house_number: '100', postal_code: '10117', city: 'Berlin', phone: '030 2086641', email: 'kontakt@hartmann-architektur.de' },
  { contact_name: 'Hotel Maritim proArte', street: 'Friedrichstraße', house_number: '98', postal_code: '10117', city: 'Berlin', phone: '030 20335-0', email: 'info.ber@maritim.de' },
  { contact_name: 'Westin Grand Hotel', street: 'Friedrichstraße', house_number: '96', postal_code: '10117', city: 'Berlin', phone: '030 20270', email: 'info@westingrandberlin.com' },
  { contact_name: 'Deutsche Bank Filiale', street: 'Unter den Linden', house_number: '13', postal_code: '10117', city: 'Berlin', phone: '030 2014550', email: 'filiale-udl@deutsche-bank.de' },
  { contact_name: 'Humboldt-Universität Mensa', street: 'Unter den Linden', house_number: '15', postal_code: '10117', city: 'Berlin', phone: '030 2093-0', email: 'info@hu-berlin.de' },
  { contact_name: 'Staatsoper Unter den Linden', street: 'Unter den Linden', house_number: '17', postal_code: '10117', city: 'Berlin', phone: '030 20354-0', email: 'info@staatsoper-berlin.de' },
  { contact_name: 'Botschaft Russland', street: 'Unter den Linden', house_number: '19', postal_code: '10117', city: 'Berlin', phone: '030 229-1110', email: '' },
  { contact_name: 'Galerie Alte Meister', street: 'Unter den Linden', house_number: '21', postal_code: '10117', city: 'Berlin', phone: '030 2078844', email: 'galerie@alte-meister.de' },
  { contact_name: 'Café Operà', street: 'Unter den Linden', house_number: '23', postal_code: '10117', city: 'Berlin', phone: '030 2041156', email: 'reservierung@cafe-opera.de' },
  { contact_name: 'Anwaltskanzlei Berger & Zoll', street: 'Unter den Linden', house_number: '25', postal_code: '10117', city: 'Berlin', phone: '030 2069934', email: 'kanzlei@berger-zoll.de' },
  { contact_name: 'Augenoptik Sehstärke', street: 'Unter den Linden', house_number: '27', postal_code: '10117', city: 'Berlin', phone: '030 2081247', email: 'info@sehstaerke.de' },
  { contact_name: 'Blumenhaus Linden', street: 'Unter den Linden', house_number: '29', postal_code: '10117', city: 'Berlin', phone: '030 2049983', email: 'bestellung@blumenhaus-linden.de' },
  { contact_name: 'Hotel Adlon Kempinski', street: 'Unter den Linden', house_number: '31', postal_code: '10117', city: 'Berlin', phone: '030 2261-0', email: 'hotel.adlon@kempinski.com' },
  { contact_name: 'Commerzbank Filiale', street: 'Unter den Linden', house_number: '33', postal_code: '10117', city: 'Berlin', phone: '030 2073300', email: 'udl@commerzbank.de' },
  { contact_name: 'Konditorei Lindenberg', street: 'Unter den Linden', house_number: '35', postal_code: '10117', city: 'Berlin', phone: '030 2042278', email: 'info@konditorei-lindenberg.de' },
  { contact_name: 'IT-Solutions Berlin GmbH', street: 'Unter den Linden', house_number: '37', postal_code: '10117', city: 'Berlin', phone: '030 2098865', email: 'kontakt@it-solutions-berlin.de' },
  { contact_name: 'Wellness Oase Mitte', street: 'Unter den Linden', house_number: '39', postal_code: '10117', city: 'Berlin', phone: '030 2044492', email: 'termin@wellness-oase.de' },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // Ersten Vertrieb-User finden
    const [users] = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE role = 'VERTRIEB' LIMIT 1"
    );
    const userId = users.length > 0 ? users[0].id : 1;

    // Adressliste erstellen
    // Pruefen ob Adressliste bereits existiert
    const [existing] = await queryInterface.sequelize.query(
      "SELECT id FROM address_lists WHERE name = 'Friedrichstr. / Unter den Linden - Berlin Mitte' LIMIT 1"
    );
    if (existing.length > 0) return;

    await queryInterface.bulkInsert('address_lists', [{
      user_id: userId,
      name: 'Friedrichstr. / Unter den Linden - Berlin Mitte',
      description: 'Adressen von Friedrichstraße 136 bis Unter den Linden, 10117 Berlin',
      total_addresses: addresses.length,
      geocoded_count: 0,
      geocoding_status: 'PENDING',
      created_at: now,
      updated_at: now,
    }]);

    // ID der neuen Liste holen
    const [lists] = await queryInterface.sequelize.query(
      "SELECT id FROM address_lists ORDER BY id DESC LIMIT 1"
    );
    const listId = lists[0].id;

    // Adressen einfuegen
    const rows = addresses.map(addr => ({
      address_list_id: listId,
      street: addr.street,
      house_number: addr.house_number,
      postal_code: addr.postal_code,
      city: addr.city,
      contact_name: addr.contact_name,
      phone: addr.phone,
      email: addr.email,
      status: 'NEW',
      created_at: now,
      updated_at: now,
    }));

    await queryInterface.bulkInsert('addresses', rows);
  },

  async down(queryInterface) {
    const { Op } = require('sequelize');

    const [lists] = await queryInterface.sequelize.query(
      "SELECT id FROM address_lists WHERE name = 'Friedrichstr. / Unter den Linden - Berlin Mitte' LIMIT 1"
    );

    if (lists.length > 0) {
      await queryInterface.bulkDelete('addresses', { address_list_id: lists[0].id });
      await queryInterface.bulkDelete('address_lists', { id: lists[0].id });
    }
  },
};
