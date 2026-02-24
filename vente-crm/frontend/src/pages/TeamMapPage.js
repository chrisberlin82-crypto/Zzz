import React from 'react';
import { useQuery } from 'react-query';
import {
  Box, Typography, Card, CardContent, CircularProgress, Chip, Avatar,
  List, ListItem, ListItemAvatar, ListItemText
} from '@mui/material';
import { Groups, Circle, Phone, Email } from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { userAPI } from '../services/api';
import 'leaflet/dist/leaflet.css';

const BORDEAUX = '#7A1B2D';

const ROLE_COLORS = {
  VERTRIEB: '#2E7D32',
  TEAMLEAD: '#A68836',
  STANDORTLEITUNG: '#9E3347',
  BACKOFFICE: '#666666',
  ADMIN: BORDEAUX
};

const ROLE_LABELS = {
  ADMIN: 'Administrator',
  STANDORTLEITUNG: 'Standortleitung',
  TEAMLEAD: 'Teamleiter',
  BACKOFFICE: 'Backoffice',
  VERTRIEB: 'Vertrieb'
};

const createUserIcon = (name, color) => {
  const initials = (name || '?').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  return L.divIcon({
    className: 'team-marker',
    html: `<div style="
      background-color: ${color};
      width: 36px; height: 36px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
      color: white; font-weight: 700; font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    ">${initials}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20]
  });
};

const TeamMapPage = () => {
  const { data, isLoading } = useQuery(
    'team-locations',
    () => userAPI.getTeamLocations(),
    { refetchInterval: 15000 } // Alle 15 Sekunden aktualisieren
  );

  const teamMembers = data?.data?.data || [];

  // Kartenmittelpunkt berechnen
  const defaultCenter = [52.5200, 13.4050]; // Berlin
  let center = defaultCenter;
  let zoom = 11;

  if (teamMembers.length > 0) {
    center = [
      teamMembers.reduce((sum, m) => sum + parseFloat(m.last_latitude), 0) / teamMembers.length,
      teamMembers.reduce((sum, m) => sum + parseFloat(m.last_longitude), 0) / teamMembers.length
    ];
    zoom = teamMembers.length === 1 ? 14 : 12;
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: BORDEAUX }} />
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Groups sx={{ color: BORDEAUX, fontSize: 28 }} />
          <Typography variant="h5" sx={{ fontWeight: 600 }}>Team Live</Typography>
        </Box>
        <Chip
          icon={<Circle sx={{ fontSize: '10px !important', color: '#2E7D32 !important' }} />}
          label={`${teamMembers.length} aktiv`}
          sx={{ bgcolor: '#2E7D3215', color: '#2E7D32', fontWeight: 600 }}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flex: 1, minHeight: 0 }}>
        {/* Karte */}
        <Card sx={{ flex: 1, overflow: 'hidden' }}>
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
              {teamMembers.map((member) => {
                const name = `${member.first_name || ''} ${member.last_name || ''}`.trim();
                const color = ROLE_COLORS[member.role] || BORDEAUX;
                return (
                  <Marker
                    key={member.id}
                    position={[parseFloat(member.last_latitude), parseFloat(member.last_longitude)]}
                    icon={createUserIcon(name, color)}
                  >
                    <Popup>
                      <Box sx={{ minWidth: 200 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {name || member.email}
                        </Typography>
                        <Chip
                          label={ROLE_LABELS[member.role] || member.role}
                          size="small"
                          sx={{ mb: 1, bgcolor: `${color}20`, color, fontWeight: 500 }}
                        />
                        {member.phone && (
                          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
                            <Phone sx={{ fontSize: 14, color: BORDEAUX }} /> {member.phone}
                          </Typography>
                        )}
                        {member.email && (
                          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
                            <Email sx={{ fontSize: 14, color: BORDEAUX }} /> {member.email}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          Zuletzt: {new Date(member.last_location_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                        </Typography>
                      </Box>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </CardContent>
        </Card>

        {/* Seitenleiste mit Team-Liste */}
        <Card sx={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: 2, pb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Aktive Mitarbeiter
            </Typography>
          </CardContent>
          <List sx={{ flex: 1, overflow: 'auto', pt: 0 }}>
            {teamMembers.length === 0 && (
              <ListItem>
                <ListItemText
                  primary="Keine aktiven Mitarbeiter"
                  secondary="Positionen werden angezeigt sobald sich Mitarbeiter anmelden"
                  primaryTypographyProps={{ color: 'text.secondary', fontSize: '0.85rem' }}
                  secondaryTypographyProps={{ fontSize: '0.75rem' }}
                />
              </ListItem>
            )}
            {teamMembers.map((member) => {
              const name = `${member.first_name || ''} ${member.last_name || ''}`.trim();
              const color = ROLE_COLORS[member.role] || BORDEAUX;
              const minutesAgo = Math.round((Date.now() - new Date(member.last_location_at).getTime()) / 60000);
              return (
                <ListItem key={member.id} sx={{ py: 1 }}>
                  <ListItemAvatar sx={{ minWidth: 44 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: color, fontSize: '0.75rem' }}>
                      {(member.first_name?.[0] || '') + (member.last_name?.[0] || '')}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={name || member.email}
                    secondary={
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Circle sx={{ fontSize: 8, color: minutesAgo < 2 ? '#2E7D32' : '#A68836' }} />
                        {minutesAgo < 1 ? 'Gerade eben' : `Vor ${minutesAgo} Min.`}
                      </Box>
                    }
                    primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 500 }}
                    secondaryTypographyProps={{ fontSize: '0.75rem' }}
                  />
                </ListItem>
              );
            })}
          </List>
        </Card>
      </Box>
    </Box>
  );
};

export default TeamMapPage;
