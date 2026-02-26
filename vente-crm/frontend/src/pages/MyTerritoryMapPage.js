import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box, Typography, Card, CardContent, CircularProgress, Alert, Chip, Divider,
  IconButton, Tooltip, Button, TextField, MenuItem, LinearProgress, Collapse,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  Map, LocationOn, Home, Phone, Email, CheckCircle, Navigation, Info,
  ExpandMore, ExpandLess, Edit, Apartment, Handshake, Save, Close
} from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup, Rectangle, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { territoryAPI } from '../services/api';
import 'leaflet/dist/leaflet.css';

const BORDEAUX = '#7A1B2D';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
});

const createCustomIcon = (color = BORDEAUX) => L.divIcon({
  className: 'custom-marker',
  html: `<div style="background-color:${color};width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
  iconSize: [24, 24], iconAnchor: [12, 24], popupAnchor: [0, -24]
});

const STATUS_COLORS = {
  NEW: '#7A1B2D', CONTACTED: '#A68836', APPOINTMENT: '#2E7D32',
  NOT_INTERESTED: '#666666', CONVERTED: '#5A0F1E', INVALID: '#D32F2F'
};
const STATUS_LABELS = {
  NEW: 'Neu', CONTACTED: 'Kontaktiert', APPOINTMENT: 'Termin',
  NOT_INTERESTED: 'Kein Interesse', CONVERTED: 'Vertrag', INVALID: 'Ungueltig'
};
const STATUS_OPTIONS = [
  { value: 'NEW', label: 'Neu' },
  { value: 'CONTACTED', label: 'Kontaktiert' },
  { value: 'APPOINTMENT', label: 'Termin' },
  { value: 'CONVERTED', label: 'Vertrag' },
  { value: 'NOT_INTERESTED', label: 'Kein Interesse' },
  { value: 'INVALID', label: 'Ungueltig' }
];

const iconCache = {};
const getIconForStatus = (status) => {
  if (!iconCache[status]) iconCache[status] = createCustomIcon(STATUS_COLORS[status] || BORDEAUX);
  return iconCache[status];
};

const openNavigation = (lat, lon, street, houseNumber) => {
  const dest = street && houseNumber
    ? encodeURIComponent(`${street} ${houseNumber}`)
    : `${lat},${lon}`;
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
};

// ====== Adress-Bearbeitungs-Dialog ======
const EditAddressDialog = ({ address, open, onClose, onSave, saving }) => {
  const [form, setForm] = useState({});

  React.useEffect(() => {
    if (address) {
      setForm({
        status: address.status || 'NEW',
        total_households: address.total_households ?? '',
        contacted_households: address.contacted_households ?? '',
        contact_name: address.contact_name || '',
        phone: address.phone || '',
        email: address.email || '',
        notes: address.notes || ''
      });
    }
  }, [address]);

  if (!address) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>
        {address.street} {address.house_number}
        <Typography variant="body2" color="text.secondary">{address.postal_code} {address.city}</Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField select label="Status" value={form.status || 'NEW'} fullWidth
            onChange={e => setForm({ ...form, status: e.target.value })}>
            {STATUS_OPTIONS.map(o => (
              <MenuItem key={o.value} value={o.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: STATUS_COLORS[o.value] }} />
                  {o.label}
                </Box>
              </MenuItem>
            ))}
          </TextField>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Wohneinheiten (WE)" type="number" fullWidth
              value={form.total_households} onChange={e => setForm({ ...form, total_households: e.target.value === '' ? '' : parseInt(e.target.value) || 0 })}
              InputProps={{ inputProps: { min: 0 } }} />
            <TextField label="Kontaktierte WE" type="number" fullWidth
              value={form.contacted_households} onChange={e => setForm({ ...form, contacted_households: e.target.value === '' ? '' : parseInt(e.target.value) || 0 })}
              InputProps={{ inputProps: { min: 0 } }} />
          </Box>
          <TextField label="Kontaktperson" value={form.contact_name}
            onChange={e => setForm({ ...form, contact_name: e.target.value })} fullWidth />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Telefon" value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })} fullWidth />
            <TextField label="E-Mail" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} fullWidth />
          </Box>
          <TextField label="Notizen" value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })} multiline rows={2} fullWidth />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
          disabled={saving}
          onClick={() => onSave(address.id, {
            ...form,
            total_households: form.total_households === '' ? null : form.total_households,
            contacted_households: form.contacted_households === '' ? null : form.contacted_households
          })}
          sx={{ bgcolor: BORDEAUX, '&:hover': { bgcolor: '#5A0F1E' } }}>
          Speichern
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ====== Haupt-Komponente ======
const MyTerritoryMapPage = () => {
  const queryClient = useQueryClient();
  const [expandedStreet, setExpandedStreet] = useState(null);
  const [editAddr, setEditAddr] = useState(null);

  const { data: runData, isLoading: runLoading } = useQuery(
    'my-active-run', () => territoryAPI.getMyActiveRun(), { retry: 1 }
  );
  const { data: legacyData, isLoading: legacyLoading } = useQuery(
    'my-territory', () => territoryAPI.getMyTerritory(),
    { enabled: !runData?.data?.data?.territory }
  );

  const updateMutation = useMutation(
    ({ addrId, updates }) => territoryAPI.updateTerritoryAddress(addrId, updates),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('my-active-run');
        queryClient.invalidateQueries('my-territory');
        setEditAddr(null);
      }
    }
  );

  const handleSave = useCallback((addrId, updates) => {
    updateMutation.mutate({ addrId, updates });
  }, [updateMutation]);

  const handleQuickStatus = useCallback((addrId, newStatus) => {
    updateMutation.mutate({ addrId, updates: { status: newStatus } });
  }, [updateMutation]);

  const isLoading = runLoading || legacyLoading;

  const { addresses, bounds, center, postalCodes, polygon, streets } = useMemo(() => {
    const runResult = runData?.data?.data;
    const legacyResult = legacyData?.data?.data;
    const hasRunTerritory = runResult && runResult.territory;

    let addrs = [], bnd = null, cnt = null, plz = [], poly = null;

    if (hasRunTerritory) {
      addrs = runResult.addresses || [];
      poly = runResult.polygon || null;
      bnd = runResult.bounds || null;
      plz = runResult.run?.plz ? [runResult.run.plz] : [];
      if (bnd) cnt = { latitude: (bnd.north + bnd.south) / 2, longitude: (bnd.east + bnd.west) / 2 };
    } else if (legacyResult) {
      addrs = legacyResult.addresses || [];
      bnd = legacyResult.bounds || null;
      cnt = legacyResult.center || null;
      plz = legacyResult.postal_codes || [];
    }

    // Nach Strasse gruppieren
    const streetMap = {};
    addrs.forEach(addr => {
      const key = addr.street || 'Unbekannt';
      if (!streetMap[key]) streetMap[key] = { street: key, postal_code: addr.postal_code, city: addr.city, addresses: [] };
      streetMap[key].addresses.push(addr);
    });

    return {
      addresses: addrs, bounds: bnd, center: cnt, postalCodes: plz, polygon: poly,
      streets: Object.values(streetMap)
    };
  }, [runData, legacyData]);

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: BORDEAUX }} /></Box>;
  }

  const mappableAddresses = addresses.filter(a => a.latitude && a.longitude);
  const defaultCenter = [52.52, 13.405];
  let mapCenter = defaultCenter;
  let zoom = 10;

  if (center) {
    mapCenter = [center.latitude, center.longitude];
    zoom = 14;
  } else if (mappableAddresses.length > 0) {
    mapCenter = [
      mappableAddresses.reduce((sum, a) => sum + parseFloat(a.latitude), 0) / mappableAddresses.length,
      mappableAddresses.reduce((sum, a) => sum + parseFloat(a.longitude), 0) / mappableAddresses.length
    ];
    zoom = 14;
  }

  const boundsRect = (!polygon && bounds) ? [
    [bounds.south - 0.001, bounds.west - 0.001],
    [bounds.north + 0.001, bounds.east + 0.001]
  ] : null;

  // Auswertungen
  const totalAddr = addresses.length;
  const visitedAddr = addresses.filter(a => a.status !== 'NEW').length;
  const convertedAddr = addresses.filter(a => a.status === 'CONVERTED').length;
  const appointmentAddr = addresses.filter(a => a.status === 'APPOINTMENT').length;
  const contactedAddr = addresses.filter(a => a.status === 'CONTACTED').length;
  const totalHH = addresses.reduce((s, a) => s + (a.total_households || 0), 0);
  const contactedHH = addresses.reduce((s, a) => s + (a.contacted_households || 0), 0);
  const visitPct = totalAddr > 0 ? Math.round(visitedAddr / totalAddr * 100) : 0;
  const convertPct = totalAddr > 0 ? Math.round(convertedAddr / totalAddr * 100) : 0;

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          <Map sx={{ mr: 1, verticalAlign: 'middle', color: BORDEAUX }} />
          Mein Gebiet
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {postalCodes.map((plz, i) => (
            <Chip key={i} icon={<LocationOn sx={{ fontSize: 14 }} />} label={plz}
              size="small" sx={{ bgcolor: `${BORDEAUX}15`, color: BORDEAUX, fontWeight: 500 }} />
          ))}
        </Box>
      </Box>

      {/* Auswertungen */}
      <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <Chip label={`${totalAddr} Adressen`} size="small" sx={{ fontWeight: 600 }} />
        <Chip label={`${visitPct}% besucht (${visitedAddr})`} size="small" color="info" variant="outlined" />
        <Chip icon={<Handshake sx={{ fontSize: '14px !important' }} />}
          label={`${convertedAddr} Vertraege (${convertPct}%)`} size="small"
          sx={{ bgcolor: '#5A0F1E20', color: '#5A0F1E', fontWeight: 600 }} />
        {appointmentAddr > 0 && (
          <Chip label={`${appointmentAddr} Termine`} size="small"
            sx={{ bgcolor: '#2E7D3220', color: '#2E7D32' }} />
        )}
        {contactedAddr > 0 && (
          <Chip label={`${contactedAddr} kontaktiert`} size="small"
            sx={{ bgcolor: '#A6883620', color: '#A68836' }} />
        )}
        {totalHH > 0 && (
          <Chip icon={<Apartment sx={{ fontSize: '14px !important' }} />}
            label={`${contactedHH}/${totalHH} WE`} size="small" variant="outlined" />
        )}
      </Box>

      <LinearProgress variant="determinate" value={visitPct}
        sx={{ mb: 1, height: 6, borderRadius: 3, bgcolor: '#E0D8D0',
          '& .MuiLinearProgress-bar': { bgcolor: convertedAddr > 0 ? '#5A0F1E' : '#2E7D32' } }} />

      {addresses.length === 0 ? (
        <Alert severity="info">
          Ihnen wurde noch kein Gebiet zugewiesen oder es sind keine Adressen in Ihrem Gebiet vorhanden.
          Bitte wenden Sie sich an Ihren Teamleiter.
        </Alert>
      ) : (
        <Box sx={{ display: 'flex', gap: 2, flex: 1, minHeight: 0 }}>
          {/* Karte - deutlichere Gebiete */}
          <Card sx={{ flex: 2, overflow: 'hidden' }}>
            <CardContent sx={{ p: 0, height: '100%', '&:last-child': { pb: 0 } }}>
              <MapContainer center={mapCenter} zoom={zoom}
                style={{ height: '100%', width: '100%', minHeight: '500px' }} scrollWheelZoom>
                <TileLayer attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {polygon && (
                  <GeoJSON data={polygon} style={{
                    color: BORDEAUX, weight: 5, fillColor: BORDEAUX,
                    fillOpacity: 0.15, opacity: 1
                  }} />
                )}

                {boundsRect && !polygon && (
                  <Rectangle bounds={boundsRect} pathOptions={{
                    color: BORDEAUX, weight: 5, fillColor: BORDEAUX,
                    fillOpacity: 0.12, opacity: 1
                  }} />
                )}

                {mappableAddresses.map((addr) => (
                  <Marker key={addr.id}
                    position={[parseFloat(addr.latitude), parseFloat(addr.longitude)]}
                    icon={getIconForStatus(addr.status)}>
                    <Popup>
                      <Box sx={{ minWidth: 220 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                          {addr.street} {addr.house_number}
                        </Typography>
                        {addr.contact_name && (
                          <Typography variant="body2" sx={{ mb: 0.5 }}>{addr.contact_name}</Typography>
                        )}
                        <Typography variant="caption" display="block" color="text.secondary">
                          {addr.postal_code} {addr.city}
                        </Typography>
                        {addr.phone && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            <Phone sx={{ fontSize: 14, color: BORDEAUX }} />
                            <Typography variant="body2">{addr.phone}</Typography>
                          </Box>
                        )}
                        {addr.total_households != null && (
                          <Typography variant="caption" display="block" sx={{ mt: 0.5, fontWeight: 600 }}>
                            WE: {addr.contacted_households || 0}/{addr.total_households}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Chip label={STATUS_LABELS[addr.status] || addr.status} size="small"
                            sx={{ bgcolor: (STATUS_COLORS[addr.status] || '#999') + '20',
                              color: STATUS_COLORS[addr.status] || '#999', fontWeight: 500 }} />
                          <Button size="small" variant="outlined"
                            startIcon={<Navigation sx={{ fontSize: 14 }} />}
                            onClick={() => openNavigation(addr.latitude, addr.longitude, addr.street, addr.house_number)}
                            sx={{ fontSize: '0.65rem', py: 0, minHeight: 24, color: BORDEAUX, borderColor: BORDEAUX }}>
                            Navi
                          </Button>
                        </Box>
                      </Box>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </CardContent>
          </Card>

          {/* Sidebar: Strassen-Liste mit Bearbeitung */}
          <Card sx={{ flex: 1, overflow: 'auto', maxWidth: 420, minWidth: 320 }}>
            <CardContent sx={{ p: 1.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, px: 0.5, mb: 1 }}>
                Strassen ({streets.length})
              </Typography>

              {streets.map((street, si) => {
                const isExp = expandedStreet === si;
                const sVisited = street.addresses.filter(a => a.status !== 'NEW').length;
                const sConverted = street.addresses.filter(a => a.status === 'CONVERTED').length;
                const sHH = street.addresses.reduce((s, a) => s + (a.total_households || 0), 0);
                const sPct = street.addresses.length > 0 ? Math.round(sVisited / street.addresses.length * 100) : 0;

                return (
                  <Card key={si} variant="outlined" sx={{ mb: 1, borderLeft: `3px solid ${BORDEAUX}` }}>
                    {/* Strassen-Header */}
                    <Box
                      onClick={() => setExpandedStreet(isExp ? null : si)}
                      sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        p: 1, cursor: 'pointer', '&:hover': { bgcolor: '#F5F3F0' } }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocationOn sx={{ fontSize: 16, color: BORDEAUX }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }} noWrap>
                            {street.street}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.3, flexWrap: 'wrap' }}>
                          <Chip label={`${street.addresses.length} HNr.`} size="small"
                            sx={{ fontSize: '0.65rem', height: 18 }} />
                          <Chip label={`${sPct}%`} size="small"
                            sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#2E7D3220', color: '#2E7D32' }} />
                          {sConverted > 0 && (
                            <Chip label={`${sConverted} V`} size="small"
                              sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#5A0F1E20', color: '#5A0F1E', fontWeight: 700 }} />
                          )}
                          {sHH > 0 && (
                            <Chip label={`${sHH} WE`} size="small"
                              sx={{ fontSize: '0.65rem', height: 18 }} variant="outlined" />
                          )}
                        </Box>
                      </Box>
                      {isExp ? <ExpandLess sx={{ fontSize: 20, color: '#999' }} /> : <ExpandMore sx={{ fontSize: 20, color: '#999' }} />}
                    </Box>

                    {/* Hausnummern-Liste (expandiert) */}
                    <Collapse in={isExp}>
                      <Divider />
                      <Box sx={{ p: 1 }}>
                        {street.addresses.map((addr) => (
                          <Box key={addr.id} sx={{
                            display: 'flex', alignItems: 'center', gap: 0.5, py: 0.5, px: 0.5,
                            borderRadius: 1, '&:hover': { bgcolor: '#F5F3F0' },
                            borderBottom: '1px solid #eee'
                          }}>
                            {/* Hausnummer */}
                            <Chip
                              label={addr.house_number || '?'}
                              size="small"
                              sx={{
                                minWidth: 40, fontWeight: 700, fontSize: '0.8rem',
                                bgcolor: (STATUS_COLORS[addr.status] || STATUS_COLORS.NEW) + '20',
                                color: STATUS_COLORS[addr.status] || STATUS_COLORS.NEW,
                                border: addr.status === 'CONVERTED' ? `2px solid ${STATUS_COLORS.CONVERTED}` : 'none'
                              }}
                            />

                            {/* Status + Info */}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Chip
                                  label={STATUS_LABELS[addr.status] || 'Neu'}
                                  size="small"
                                  sx={{
                                    fontSize: '0.6rem', height: 18,
                                    bgcolor: (STATUS_COLORS[addr.status] || '#999') + '20',
                                    color: STATUS_COLORS[addr.status] || '#999',
                                    fontWeight: 600
                                  }}
                                />
                                {addr.status === 'CONVERTED' && (
                                  <Chip label="Vertrag" size="small" icon={<Handshake sx={{ fontSize: '10px !important' }} />}
                                    sx={{ fontSize: '0.6rem', height: 18, bgcolor: '#5A0F1E', color: '#fff', fontWeight: 700,
                                      '& .MuiChip-icon': { color: '#fff' } }} />
                                )}
                                {addr.total_households != null && (
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                    {addr.contacted_households || 0}/{addr.total_households} WE
                                  </Typography>
                                )}
                              </Box>
                              {addr.contact_name && (
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }} noWrap>
                                  {addr.contact_name}
                                </Typography>
                              )}
                            </Box>

                            {/* Quick-Actions */}
                            <Box sx={{ display: 'flex', gap: 0 }}>
                              {addr.status === 'NEW' && (
                                <Tooltip title="Als kontaktiert markieren">
                                  <IconButton size="small" sx={{ p: 0.3 }}
                                    onClick={() => handleQuickStatus(addr.id, 'CONTACTED')}>
                                    <CheckCircle sx={{ fontSize: 16, color: '#A68836' }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {addr.latitude && addr.longitude && (
                                <Tooltip title="Navigation">
                                  <IconButton size="small" sx={{ p: 0.3 }}
                                    onClick={() => openNavigation(addr.latitude, addr.longitude, addr.street, addr.house_number)}>
                                    <Navigation sx={{ fontSize: 16, color: BORDEAUX }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip title="Bearbeiten">
                                <IconButton size="small" sx={{ p: 0.3 }}
                                  onClick={() => setEditAddr(addr)}>
                                  <Edit sx={{ fontSize: 16, color: '#666' }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Collapse>
                  </Card>
                );
              })}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Bearbeitungs-Dialog */}
      <EditAddressDialog
        address={editAddr}
        open={!!editAddr}
        onClose={() => setEditAddr(null)}
        onSave={handleSave}
        saving={updateMutation.isLoading}
      />

      {updateMutation.isError && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {updateMutation.error?.response?.data?.error || 'Fehler beim Speichern'}
        </Alert>
      )}
    </Box>
  );
};

export default MyTerritoryMapPage;
