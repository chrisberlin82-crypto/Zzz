const crypto = require('crypto');
const logger = require('../utils/logger');

const createSignature = async (req, res) => {
  try {
    const { Signature, Contract } = req.app.locals.db;
    const contractId = req.params.contractId;

    const contract = await Contract.findByPk(contractId);
    if (!contract) {
      return res.status(404).json({ success: false, error: 'Vertrag nicht gefunden' });
    }

    const { signedAt, consent, geo, deviceInfo, signature } = req.body;

    // Hash der Signatur-Daten fuer Integritaetspruefung
    const hashInput = `${signature.pngBase64}|${signedAt}|${contractId}|${req.user.id}`;
    const hashValue = crypto.createHash('sha256').update(hashInput).digest('hex');

    const sig = await Signature.create({
      contract_id: contractId,
      user_id: req.user.id,
      signature_data: signature.pngBase64,
      signed_at: signedAt,
      gps_latitude: geo ? geo.latitude : null,
      gps_longitude: geo ? geo.longitude : null,
      gps_accuracy: geo ? geo.accuracy : null,
      device_info: deviceInfo || null,
      consent_given: consent,
      hash_value: hashValue,
      ip_address: req.ip
    });

    // Vertrag-Status auf SIGNED setzen
    if (contract.status !== 'SIGNED' && contract.status !== 'ACTIVE') {
      const history = [...(contract.status_history || [])];
      history.push({
        status: 'SIGNED',
        previous_status: contract.status,
        date: new Date().toISOString(),
        user_id: req.user.id,
        note: 'Signatur erfasst'
      });

      await contract.update({
        status: 'SIGNED',
        status_history: history
      });
    }

    logger.info(`Signature created for contract ${contractId} by user ${req.user.id}`);

    res.status(201).json({
      success: true,
      message: 'Signatur erfolgreich erfasst',
      data: {
        id: sig.id,
        contract_id: sig.contract_id,
        signed_at: sig.signed_at,
        hash_value: sig.hash_value,
        consent_given: sig.consent_given
      }
    });
  } catch (error) {
    logger.error('Create signature error:', error);
    res.status(500).json({ success: false, error: 'Signatur konnte nicht gespeichert werden' });
  }
};

const getSignature = async (req, res) => {
  try {
    const { Signature } = req.app.locals.db;
    const sig = await Signature.findByPk(req.params.id, {
      attributes: { exclude: ['signature_data'] }
    });

    if (!sig) {
      return res.status(404).json({ success: false, error: 'Signatur nicht gefunden' });
    }

    res.json({ success: true, data: sig });
  } catch (error) {
    logger.error('Get signature error:', error);
    res.status(500).json({ success: false, error: 'Signatur konnte nicht geladen werden' });
  }
};

const getSignatureImage = async (req, res) => {
  try {
    const { Signature } = req.app.locals.db;
    const sig = await Signature.findByPk(req.params.id);

    if (!sig) {
      return res.status(404).json({ success: false, error: 'Signatur nicht gefunden' });
    }

    // Integritaetspruefung
    const hashInput = `${sig.signature_data}|${sig.signed_at.toISOString()}|${sig.contract_id}|${sig.user_id}`;
    const calculatedHash = crypto.createHash('sha256').update(hashInput).digest('hex');

    res.json({
      success: true,
      data: {
        signature_data: sig.signature_data,
        integrity_valid: calculatedHash === sig.hash_value,
        signed_at: sig.signed_at
      }
    });
  } catch (error) {
    logger.error('Get signature image error:', error);
    res.status(500).json({ success: false, error: 'Signatur-Bild konnte nicht geladen werden' });
  }
};

const verifySignature = async (req, res) => {
  try {
    const { Signature, Contract, User } = req.app.locals.db;
    const sig = await Signature.findByPk(req.params.id, {
      include: [
        { model: Contract, as: 'contract', attributes: ['id', 'status', 'customer_id'] },
        { model: User, as: 'user', attributes: ['id', 'email', 'first_name', 'last_name'] }
      ]
    });

    if (!sig) {
      return res.status(404).json({ success: false, error: 'Signatur nicht gefunden' });
    }

    // Hash-Verifikation
    const hashInput = `${sig.signature_data}|${sig.signed_at.toISOString()}|${sig.contract_id}|${sig.user_id}`;
    const calculatedHash = crypto.createHash('sha256').update(hashInput).digest('hex');
    const integrityValid = calculatedHash === sig.hash_value;

    res.json({
      success: true,
      data: {
        id: sig.id,
        contract_id: sig.contract_id,
        signed_at: sig.signed_at,
        consent_given: sig.consent_given,
        gps_latitude: sig.gps_latitude,
        gps_longitude: sig.gps_longitude,
        device_info: sig.device_info,
        hash_value: sig.hash_value,
        integrity_valid: integrityValid,
        signer: sig.user,
        contract: sig.contract
      }
    });
  } catch (error) {
    logger.error('Verify signature error:', error);
    res.status(500).json({ success: false, error: 'Signatur-Verifikation fehlgeschlagen' });
  }
};

module.exports = { createSignature, getSignature, getSignatureImage, verifySignature };
