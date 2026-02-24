import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box, Typography, Button, Card, CardContent, CircularProgress,
  Alert, Chip
} from '@mui/material';
import {
  ArrowBack, MyLocation, LocationOn, Phone, Email, Home
} from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { addressAPI } from '../services/api';
import 'leaflet/dist/leaflet.css';

const BORDEAUX = '#7A1B2D';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
});

// Custom Marker-Icon fuer Bordeaux-Farbschema
const createCustomIcon = (color = BORDEAUX) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  });
};

const bordeauxIcon = createCustomIcon(BORDEAUX);

const STATUS_COLORS = {
  NEW: '#7A1B2D', CONTACTED: '#C4A35A', APPOINTMENT: '#2E7D32',
  NOT_INTERESTED: '#999', CONVERTED: '#5A0F1E', INVALID: '#D32F2F'
};

const STATUS_LABELS = {
  NEW: 'Neu', CONTACTED: 'Kontaktiert', APPOINTMENT: 'Termin',
  NOT_INTERESTED: 'Kein Interesse', CONVERTED: 'Konvertiert', INVALID: 'Ungueltig'
};

const MapPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [geocodeMessage, setGeocodeMessage] = useState(null);

  const { data, isLoading, isError } = useQuery(
    ['map-data', id],
    () => addressAPI.getMapData(id),
    { enabled: !!id }
  );

  const geocodeMutation = useMutation(
    () => addressAPI.geocode(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['map-data', id]);
        queryClient.invalidateQueries('address-lists');
        setGeocodeMessage({ type: 'success', text: 'Geocodierung gestartet. Daten werden aktualisiert.' });
      },
      onError: () => {
        setGeocodeMessage({ type: 'error', text: 'Fehler beim Starten der Geocodierung.' });
      }
    }
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: BORDEAUX }} />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/address-lists')} sx={{ mb: 2 }}>
          Zurueck
        </Button>
        <Alert severity="error">Fehler beim Laden der Kartendaten</Alert>
      </Box>
    );
  }

  const mapData = data?.data?.data || data?.data || {};
  const addresses = mapData.addresses || [];
  const listInfo = mapData.list || mapData;

  // Adressen mit Koordinaten filtern
  const mappableAddresses = addresses.filter(
    addr => addr.latitude && addr.longitude
  );

  // Kartenmittelpunkt berechnen
  const defaultCenter = [51.1657, 10.4515]; // Deutschland Mitte
  let center = defaultCenter;
  let zoom = 6;

  if (mapData.center && mapData.center.latitude) {
    center = [mapData.center.latitude, mapData.center.longitude];
    zoom = 13;
  } else if (mappableAddresses.length > 0) {
    center = [
      mappableAddresses.reduce((sum, a) => sum + parseFloat(a.latitude), 0) / mappableAddresses.length,
      mappableAddresses.reduce((sum, a) => sum + parseFloat(a.longitude), 0) / mappableAddresses.length
    ];
    zoom = 10;
  }

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/address-lists')} sx={{ mr: 2 }}>
            Zurueck
          </Button>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Karte: {listInfo.name || `Liste #${id}`}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            icon={<LocationOn sx={{ fontSize: 16 }} />}
            label={`${mappableAddresses.length} von ${addresses.length} Adressen auf Karte`}
            size="small"
            sx={{ bgcolor: `${BORDEAUX}15`, color: BORDEAUX }}
          />
          <Button
            variant="contained"
            startIcon={geocodeMutation.isLoading ? <CircularProgress size={16} color="inherit" /> : <MyLocation />}
            onClick={() => geocodeMutation.mutate()}
            disabled={geocodeMutation.isLoading}
            sx={{ bgcolor: BORDEAUX, '&:hover': { bgcolor: '#5A0F1E' } }}
          >
            {geocodeMutation.isLoading ? 'Wird gestartet...' : 'Geocodierung starten'}
          </Button>
        </Box>
      </Box>

      {/* Meldungen */}
      {geocodeMessage && (
        <Alert
          severity={geocodeMessage.type}
          onClose={() => setGeocodeMessage(null)}
          sx={{ mb: 2 }}
        >
          {geocodeMessage.text}
        </Alert>
      )}

      {mappableAddresses.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Keine geocodierten Adressen vorhanden. Starten Sie die Geocodierung um Adressen auf der Karte anzuzeigen.
        </Alert>
      )}

      {/* Karte */}
      <Card sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <CardContent sx={{ p: 0, height: '100%', '&:last-child': { pb: 0 } }}>
          <MapContainer
            center={center}
            zoom={zoom}
            style={{ height: '100%', width: '100%', minHeight: '500px' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {mappableAddresses.map((addr) => (
              <Marker
                key={addr.id}
                position={[parseFloat(addr.latitude), parseFloat(addr.longitude)]}
                icon={bordeauxIcon}
              >
                <Popup>
                  <Box sx={{ minWidth: 220 }}>
                    {/* Name */}
                    {(addr.contact_name || addr.first_name || addr.last_name) && (
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LocationOn sx={{ fontSize: 14, color: STATUS_COLORS[addr.status] || BORDEAUX }} />
                        {addr.contact_name || `${addr.first_name || ''} ${addr.last_name || ''}`.trim() || 'Unbekannt'}
                      </Typography>
                    )}
                    {addr.company_name && (
                      <Typography variant="caption" display="block" sx={{ color: '#666', mb: 0.5 }}>
                        {addr.company_name}
                      </Typography>
                    )}

                    {/* Adresse */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 0.5 }}>
                      <Home sx={{ fontSize: 14, color: BORDEAUX, mt: 0.3 }} />
                      <Typography variant="body2">
                        {addr.street && `${addr.street}${addr.house_number ? ` ${addr.house_number}` : ''}, `}
                        {addr.postal_code} {addr.city}
                      </Typography>
                    </Box>

                    {/* Telefon */}
                    {addr.phone && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <Phone sx={{ fontSize: 14, color: BORDEAUX }} />
                        <Typography variant="body2">{addr.phone}</Typography>
                      </Box>
                    )}

                    {/* E-Mail */}
                    {addr.email && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Email sx={{ fontSize: 14, color: BORDEAUX }} />
                        <Typography variant="body2">{addr.email}</Typography>
                      </Box>
                    )}

                    {/* Status */}
                    {addr.status && (
                      <Chip
                        label={STATUS_LABELS[addr.status] || addr.status}
                        size="small"
                        sx={{
                          mt: 1,
                          bgcolor: (STATUS_COLORS[addr.status] || '#999') + '20',
                          color: STATUS_COLORS[addr.status] || '#999',
                          fontWeight: 500
                        }}
                      />
                    )}

                    {/* Notizen */}
                    {addr.notes && (
                      <Typography variant="caption" display="block" sx={{ color: '#999', mt: 0.5, fontStyle: 'italic' }}>
                        {addr.notes}
                      </Typography>
                    )}
                  </Box>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MapPage;
