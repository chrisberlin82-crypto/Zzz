const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const XLSX = require('xlsx');
const logger = require('../utils/logger');

// Multer-Konfiguration fuer Excel-Upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.env.UPLOAD_PATH || './uploads', 'address-lists'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `addresslist-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10485760 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Nur Excel/CSV-Dateien erlaubt'));
    }
  }
});

// Spalten-Mapping fuer automatische Erkennung
const COLUMN_MAPPING = {
  street: ['straße', 'strasse', 'street', 'adresse', 'address', 'str'],
  house_number: ['hausnummer', 'hnr', 'house_number', 'nr'],
  postal_code: ['plz', 'postleitzahl', 'postal_code', 'zip'],
  city: ['ort', 'stadt', 'city', 'place', 'gemeinde'],
  contact_name: ['name', 'firma', 'company', 'unternehmen', 'kontakt', 'contact'],
  phone: ['telefon', 'phone', 'tel', 'mobile', 'mobil', 'handy'],
  email: ['email', 'e-mail', 'mail']
};

const detectColumnMapping = (headers) => {
  const mapping = {};
  headers.forEach((header, index) => {
    const normalized = header.toLowerCase().trim();
    for (const [field, aliases] of Object.entries(COLUMN_MAPPING)) {
      if (aliases.some(alias => normalized.includes(alias))) {
        mapping[field] = index;
        break;
      }
    }
  });
  return mapping;
};

const getAddressLists = async (req, res) => {
  try {
    const { AddressList } = req.app.locals.db;
    const where = {};

    if (req.scopeUserId) {
      where.user_id = req.scopeUserId;
    }

    const lists = await AddressList.findAll({
      where,
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, data: lists });
  } catch (error) {
    logger.error('Get address lists error:', error);
    res.status(500).json({ success: false, error: 'Adresslisten konnten nicht geladen werden' });
  }
};

const importAddressList = async (req, res) => {
  try {
    const { AddressList, Address } = req.app.locals.db;

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Keine Datei hochgeladen' });
    }

    // Excel parsen
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (data.length < 2) {
      return res.status(400).json({ success: false, error: 'Datei enthält keine Daten' });
    }

    const headers = data[0].map(h => String(h));
    const columnMap = detectColumnMapping(headers);
    const rows = data.slice(1);

    // Adressliste erstellen
    const addressList = await AddressList.create({
      user_id: req.user.id,
      name: req.body.name || req.file.originalname,
      description: req.body.description || '',
      file_url: req.file.path,
      total_addresses: rows.length,
      geocoding_status: 'PENDING'
    });

    // Adressen importieren
    let validCount = 0;
    let invalidCount = 0;
    const addresses = [];

    for (const row of rows) {
      const address = {
        address_list_id: addressList.id,
        street: columnMap.street !== undefined ? String(row[columnMap.street] || '') : '',
        house_number: columnMap.house_number !== undefined ? String(row[columnMap.house_number] || '') : '',
        postal_code: columnMap.postal_code !== undefined ? String(row[columnMap.postal_code] || '') : '',
        city: columnMap.city !== undefined ? String(row[columnMap.city] || '') : '',
        contact_name: columnMap.contact_name !== undefined ? String(row[columnMap.contact_name] || '') : '',
        phone: columnMap.phone !== undefined ? String(row[columnMap.phone] || '') : '',
        email: columnMap.email !== undefined ? String(row[columnMap.email] || '') : '',
        status: 'NEW'
      };

      // Validierung
      if (address.street || address.city || address.postal_code) {
        // PLZ-Validierung
        if (address.postal_code && !/^\d{5}$/.test(address.postal_code)) {
          address.status = 'INVALID';
          invalidCount++;
        } else {
          validCount++;
        }
        addresses.push(address);
      } else {
        invalidCount++;
      }
    }

    if (addresses.length > 0) {
      await Address.bulkCreate(addresses);
    }

    logger.info(`Address list imported: ${addressList.id}, ${validCount} valid, ${invalidCount} invalid`);

    res.status(201).json({
      success: true,
      data: {
        id: addressList.id,
        name: addressList.name,
        total_addresses: rows.length,
        valid_addresses: validCount,
        invalid_addresses: invalidCount,
        geocoding_status: 'PENDING',
        created_at: addressList.created_at
      }
    });
  } catch (error) {
    logger.error('Import address list error:', error);
    res.status(500).json({ success: false, error: 'Import fehlgeschlagen' });
  }
};

const getMapData = async (req, res) => {
  try {
    const { AddressList, Address } = req.app.locals.db;
    const addressList = await AddressList.findByPk(req.params.id);

    if (!addressList) {
      return res.status(404).json({ success: false, error: 'Adressliste nicht gefunden' });
    }

    const addresses = await Address.findAll({
      where: { address_list_id: req.params.id },
      order: [['status', 'ASC'], ['created_at', 'ASC']]
    });

    // Bounds berechnen
    const geocoded = addresses.filter(a => a.latitude && a.longitude);
    let center = {
      latitude: parseFloat(process.env.MAP_DEFAULT_CENTER_LAT) || 51.2277,
      longitude: parseFloat(process.env.MAP_DEFAULT_CENTER_LON) || 6.7735
    };
    let bounds = null;

    if (geocoded.length > 0) {
      const lats = geocoded.map(a => parseFloat(a.latitude));
      const lons = geocoded.map(a => parseFloat(a.longitude));
      center = {
        latitude: lats.reduce((a, b) => a + b) / lats.length,
        longitude: lons.reduce((a, b) => a + b) / lons.length
      };
      bounds = {
        north: Math.max(...lats),
        south: Math.min(...lats),
        east: Math.max(...lons),
        west: Math.min(...lons)
      };
    }

    res.json({
      success: true,
      data: {
        addresses,
        center,
        bounds
      }
    });
  } catch (error) {
    logger.error('Get map data error:', error);
    res.status(500).json({ success: false, error: 'Kartendaten konnten nicht geladen werden' });
  }
};

const geocodeAddressList = async (req, res) => {
  try {
    const { AddressList, Address } = req.app.locals.db;
    const addressList = await AddressList.findByPk(req.params.id);

    if (!addressList) {
      return res.status(404).json({ success: false, error: 'Adressliste nicht gefunden' });
    }

    await addressList.update({ geocoding_status: 'IN_PROGRESS' });

    // Geocoding im Hintergrund starten
    const addresses = await Address.findAll({
      where: {
        address_list_id: req.params.id,
        latitude: null,
        status: { [Op.ne]: 'INVALID' }
      }
    });

    const nominatimUrl = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org';
    const userAgent = process.env.GEOCODING_USER_AGENT || 'Vente CRM v1.0';
    let geocodedCount = 0;

    // Geocoding mit Rate-Limiting (1 Request/Sekunde fuer Nominatim)
    const geocodeSequentially = async () => {
      for (const address of addresses) {
        try {
          const query = [address.street, address.house_number, address.postal_code, address.city, 'Deutschland']
            .filter(Boolean).join(', ');

          const response = await fetch(
            `${nominatimUrl}/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
            { headers: { 'User-Agent': userAgent } }
          );
          const data = await response.json();

          if (data.length > 0) {
            await address.update({
              latitude: parseFloat(data[0].lat),
              longitude: parseFloat(data[0].lon)
            });
            geocodedCount++;
          }

          // 1 Sekunde Rate-Limit
          await new Promise(resolve => setTimeout(resolve, 1100));
        } catch (err) {
          logger.warn(`Geocoding failed for address ${address.id}:`, err.message);
        }
      }

      await addressList.update({
        geocoding_status: 'COMPLETED',
        geocoded_count: addressList.geocoded_count + geocodedCount,
        processed_at: new Date()
      });
    };

    // Async starten (nicht blockierend)
    geocodeSequentially().catch(err => {
      logger.error('Geocoding batch error:', err);
      addressList.update({ geocoding_status: 'FAILED' });
    });

    res.json({
      success: true,
      message: `Geocodierung gestartet für ${addresses.length} Adressen`
    });
  } catch (error) {
    logger.error('Geocode error:', error);
    res.status(500).json({ success: false, error: 'Geocodierung fehlgeschlagen' });
  }
};

const updateAddress = async (req, res) => {
  try {
    const { Address } = req.app.locals.db;
    const address = await Address.findByPk(req.params.addressId);

    if (!address) {
      return res.status(404).json({ success: false, error: 'Adresse nicht gefunden' });
    }

    const allowedFields = ['status', 'notes', 'contact_name', 'phone', 'email', 'visited_at'];
    const updates = {};
    allowedFields.forEach(f => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    await address.update(updates);
    res.json({ success: true, message: 'Adresse aktualisiert', data: address });
  } catch (error) {
    logger.error('Update address error:', error);
    res.status(500).json({ success: false, error: 'Adresse konnte nicht aktualisiert werden' });
  }
};

const deleteAddressList = async (req, res) => {
  try {
    const { AddressList, Address } = req.app.locals.db;
    const addressList = await AddressList.findByPk(req.params.id);

    if (!addressList) {
      return res.status(404).json({ success: false, error: 'Adressliste nicht gefunden' });
    }

    await Address.destroy({ where: { address_list_id: req.params.id } });
    await addressList.destroy();

    res.json({ success: true, message: 'Adressliste gelöscht' });
  } catch (error) {
    logger.error('Delete address list error:', error);
    res.status(500).json({ success: false, error: 'Adressliste konnte nicht gelöscht werden' });
  }
};

module.exports = {
  getAddressLists, importAddressList, getMapData,
  geocodeAddressList, updateAddress, deleteAddressList, upload
};
