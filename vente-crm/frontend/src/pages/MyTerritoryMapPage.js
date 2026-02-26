import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box, Typography, Card, CardContent, CircularProgress, Alert, Chip,
  List, ListItem, ListItemText, Divider, IconButton, Tooltip, Button
} from '@mui/material';
import {
  Map, LocationOn, Home, Phone, Email, CheckCircle, Navigation, Info
} from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup, Rectangle, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { territoryAPI, addressAPI } from '../services/api';
import 'leaflet/dist/leaflet.css';

const BORDEAUX = '#7A1B2D';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
});

const createCustomIcon = (color = BORDEAUX) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 24px; height: 24px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24], iconAnchor: [12, 24], popupAnchor: [0, -24]
  });
};

const STATUS_COLORS = {
  NEW: '#7A1B2D', CONTACTED: '#A68836', APPOINTMENT: '#2E7D32',
  NOT_INTERESTED: '#666666', CONVERTED: '#5A0F1E', INVALID: '#D32F2F'
};
const STATUS_LABELS = {
  NEW: 'Neu', CONTACTED: 'Kontaktiert', APPOINTMENT: 'Termin',
  NOT_INTERESTED: 'Kein Interesse', CONVERTED: 'Konvertiert', INVALID: 'Ungueltig'
};

const bordeauxIcon = createCustomIcon(BORDEAUX);
const greenIcon = createCustomIcon('#2E7D32');
const goldIcon = createCustomIcon('#A68836');

const getIconForStatus = (status) => {
  switch (status) {
    case 'CONVERTED':
    case 'APPOINTMENT': return greenIcon;
    case 'CONTACTED': return goldIcon;
    default: return bordeauxIcon;
  }
};

const openNavigation = (lat, lon, street, houseNumber) => {
  const dest = street && houseNumber
    ? encodeURIComponent(`${street} ${houseNumber}`)
    : `${lat},${lon}`;
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
};

const MyTerritoryMapPage = () => {
  const queryClient = useQueryClient();

  // Zuerst versuchen: Run-basiertes Territory (neues System)
  const { data: runData, isLoading: runLoading } = useQuery(
    'my-active-run',
    () => territoryAPI.getMyActiveRun(),
    { retry: 1 }
  );

  // Fallback: Altes Territory-System
  const { data: legacyData, isLoading: legacyLoading } = useQuery(
    'my-territory',
    () => territoryAPI.getMyTerritory(),
    { enabled: !runData?.data?.data?.territory }
  );

  const updateMutation = useMutation(
    ({ listId, addrId, updates }) => addressAPI.updateAddress(listId, addrId, updates),
    { onSuccess: () => { queryClient.invalidateQueries('my-active-run'); queryClient.invalidateQueries('my-territory'); } }
  );

  const isLoading = runLoading || legacyLoading;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: BORDEAUX }} />
      </Box>
    );
  }

  // Daten zusammenfuehren: Run-System hat Prioritaet
  const runResult = runData?.data?.data;
  const legacyResult = legacyData?.data?.data;
  const hasRunTerritory = runResult && runResult.territory;

  let addresses, bounds, center, postalCodes, polygon;

  if (hasRunTerritory) {
    addresses = runResult.addresses || [];
    polygon = runResult.polygon || null;
    bounds = runResult.bounds || null;
    postalCodes = runResult.run?.plz ? [runResult.run.plz] : [];
    if (bounds) {
      center = { latitude: (bounds.north + bounds.south) / 2, longitude: (bounds.east + bounds.west) / 2 };
    }
  } else if (legacyResult) {
    addresses = legacyResult.addresses || [];
    bounds = legacyResult.bounds || null;
    center = legacyResult.center || null;
    postalCodes = legacyResult.postal_codes || [];
    polygon = null;
  } else {
    addresses = [];
    bounds = null;
    center = null;
    postalCodes = [];
    polygon = null;
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

  const totalAddr = addresses.length;
  const visitedAddr = addresses.filter(a => a.status !== 'NEW').length;
  const convertedAddr = addresses.filter(a => a.status === 'CONVERTED').length;

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
          <Chip label={`${totalAddr} Adressen`} size="small" variant="outlined" />
          <Chip label={`${visitedAddr} besucht`} size="small" color="info" variant="outlined" />
          <Chip icon={<CheckCircle sx={{ fontSize: 14 }} />} label={`${convertedAddr} konvertiert`}
            size="small" color="success" variant="outlined" />
        </Box>
      </Box>

      {/* Live-Tracking Hinweis */}
      <Alert severity="info" icon={<Info />} sx={{ mb: 1, py: 0, '& .MuiAlert-message': { fontSize: '0.8rem' } }}>
        Live-Tracking aktiv — Seite geoeffnet lassen fuer Positionsuebermittlung an Ihre Teamleitung.
      </Alert>

      {addresses.length === 0 ? (
        <Alert severity="info">
          Ihnen wurde noch kein Gebiet zugewiesen oder es sind keine Adressen in Ihrem Gebiet vorhanden.
          Bitte wenden Sie sich an Ihren Teamleiter.
        </Alert>
      ) : (
        <Box sx={{ display: 'flex', gap: 2, flex: 1, minHeight: 0 }}>
          {/* Karte */}
          <Card sx={{ flex: 2, overflow: 'hidden' }}>
            <CardContent sx={{ p: 0, height: '100%', '&:last-child': { pb: 0 } }}>
              <MapContainer center={mapCenter} zoom={zoom}
                style={{ height: '100%', width: '100%', minHeight: '500px' }} scrollWheelZoom>
                <TileLayer attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {/* GeoJSON Polygon (neues System) */}
                {polygon && (
                  <GeoJSON data={polygon} style={{
                    color: BORDEAUX, weight: 3, fillColor: BORDEAUX,
                    fillOpacity: 0.08, dashArray: '10, 5'
                  }} />
                )}

                {/* Fallback: Rectangle (altes System) */}
                {boundsRect && !polygon && (
                  <Rectangle bounds={boundsRect} pathOptions={{
                    color: BORDEAUX, weight: 3, fillColor: BORDEAUX,
                    fillOpacity: 0.05, dashArray: '10, 5'
                  }} />
                )}

                {/* Adress-Marker */}
                {mappableAddresses.map((addr) => (
                  <Marker key={addr.id}
                    position={[parseFloat(addr.latitude), parseFloat(addr.longitude)]}
                    icon={getIconForStatus(addr.status)}>
                    <Popup>
                      <Box sx={{ minWidth: 220 }}>
                        {addr.contact_name && (
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {addr.contact_name}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 0.5 }}>
                          <Home sx={{ fontSize: 14, color: BORDEAUX, mt: 0.3 }} />
                          <Typography variant="body2">
                            {addr.street} {addr.house_number}, {addr.postal_code} {addr.city}
                          </Typography>
                        </Box>
                        {addr.phone && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            <Phone sx={{ fontSize: 14, color: BORDEAUX }} />
                            <Typography variant="body2">{addr.phone}</Typography>
                          </Box>
                        )}
                        {addr.email && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Email sx={{ fontSize: 14, color: BORDEAUX }} />
                            <Typography variant="body2">{addr.email}</Typography>
                          </Box>
                        )}
                        {(addr.total_households != null) && (
                          <Typography variant="caption" display="block" sx={{ mt: 0.5, fontWeight: 600 }}>
                            Haushalte: {addr.contacted_households || 0}/{addr.total_households}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Chip label={STATUS_LABELS[addr.status] || addr.status} size="small"
                            sx={{ bgcolor: (STATUS_COLORS[addr.status] || '#999') + '20',
                              color: STATUS_COLORS[addr.status] || '#999', fontWeight: 500 }} />
                          <Button size="small" variant="outlined" startIcon={<Navigation sx={{ fontSize: 14 }} />}
                            onClick={() => openNavigation(addr.latitude, addr.longitude, addr.street, addr.house_number)}
                            sx={{ fontSize: '0.65rem', py: 0, minHeight: 24, color: BORDEAUX, borderColor: BORDEAUX }}>
                            Navigation
                          </Button>
                        </Box>
                      </Box>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </CardContent>
          </Card>

          {/* Sidebar: Adressliste */}
          <Card sx={{ flex: 1, overflow: 'auto', maxWidth: 380 }}>
            <CardContent sx={{ p: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, px: 1, py: 0.5 }}>
                Adressen ({addresses.length})
              </Typography>
              <Divider />
              <List dense sx={{ p: 0 }}>
                {addresses.map((addr, i) => (
                  <React.Fragment key={addr.id}>
                    <ListItem sx={{ px: 1, py: 0.5 }}
                      secondaryAction={
                        addr.latitude && addr.longitude ? (
                          <Tooltip title="Zur Navigation">
                            <IconButton edge="end" size="small"
                              onClick={() => openNavigation(addr.latitude, addr.longitude, addr.street, addr.house_number)}
                              sx={{ color: BORDEAUX }}>
                              <Navigation sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        ) : null
                      }>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                              {addr.street} {addr.house_number}
                            </Typography>
                            <Chip label={STATUS_LABELS[addr.status] || addr.status} size="small"
                              sx={{ fontSize: '0.6rem', height: 18,
                                bgcolor: (STATUS_COLORS[addr.status] || '#999') + '20',
                                color: STATUS_COLORS[addr.status] || '#999' }} />
                          </Box>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {addr.postal_code} {addr.city}
                            {addr.contact_name && ` - ${addr.contact_name}`}
                            {addr.total_households != null && ` (${addr.contacted_households || 0}/${addr.total_households} HH)`}
                          </Typography>
                        }
                      />
                    </ListItem>
                    {i < addresses.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default MyTerritoryMapPage;
