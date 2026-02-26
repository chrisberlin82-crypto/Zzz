import React, { useState } from 'react';
import { useQuery } from 'react-query';
import {
  Box, Typography, Card, CardContent, CircularProgress, Chip, Avatar,
  List, ListItem, ListItemAvatar, ListItemText, Divider, FormControlLabel, Switch
} from '@mui/material';
import { Groups, Circle, Phone, Email, Description, Person, Euro, GpsFixed, GpsOff } from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { userAPI, territoryAPI } from '../services/api';
import 'leaflet/dist/leaflet.css';

const BORDEAUX = '#7A1B2D';

const ROLE_COLORS = {
  VERTRIEB: '#2E7D32',
  TEAMLEAD: '#A68836',
  STANDORTLEITUNG: '#9E3347',
  BACKOFFICE: '#6A5ACD',
  ADMIN: BORDEAUX
};

const ROLE_LABELS = {
  ADMIN: 'Administrator',
  STANDORTLEITUNG: 'Standortleitung',
  TEAMLEAD: 'Teamleiter',
  BACKOFFICE: 'Backoffice',
  VERTRIEB: 'Vertrieb'
};

const T_COLORS = ['#7A1B2D', '#2E7D32', '#A68836', '#6A5ACD', '#D32F2F', '#0288D1'];

const createUserIcon = (name, color, isInArea) => {
  const initials = (name || '?').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const border = isInArea ? '3px solid #2E7D32' : '3px solid white';
  return L.divIcon({
    className: 'team-marker',
    html: `<div style="
      background-color: ${color};
      width: 36px; height: 36px;
      border-radius: 50%;
      border: ${border};
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

const contractIcon = L.divIcon({
  className: 'contract-marker',
  html: `<div style="
    background-color: #2E7D32;
    width: 28px; height: 28px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 2px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    display: flex; align-items: center; justify-content: center;
  "><span style="transform: rotate(45deg); color: white; font-size: 14px; font-weight: bold;">&#10003;</span></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28]
});

const TeamMapPage = () => {
  const [showContracts, setShowContracts] = useState(true);
  const [showTerritories, setShowTerritories] = useState(true);

  const { data, isLoading } = useQuery(
    'team-locations',
    () => userAPI.getTeamLocations(),
    { refetchInterval: 15000 }
  );

  const { data: signedData } = useQuery(
    'signed-locations',
    () => userAPI.getSignedLocations(),
    { refetchInterval: 60000 }
  );

  // Aktive Runs laden fuer Territory-Polygone
  const { data: runsData } = useQuery(
    'active-territory-runs',
    () => territoryAPI.getRuns({ status: 'active' }),
    { refetchInterval: 60000 }
  );

  const rawTeamMembers = data?.data?.data || [];
  const teamMembers = rawTeamMembers.filter(m => m.last_latitude && m.last_longitude && !isNaN(parseFloat(m.last_latitude)) && !isNaN(parseFloat(m.last_longitude)));

  const isOnline = (member) => {
    if (!member.last_location_at) return false;
    return (Date.now() - new Date(member.last_location_at).getTime()) < 60 * 1000; // 60s = live
  };
  const isStale = (member) => {
    if (!member.last_location_at) return true;
    const diff = Date.now() - new Date(member.last_location_at).getTime();
    return diff >= 60 * 1000 && diff < 10 * 60 * 1000; // 1-10 min
  };

  const rawSignedContracts = signedData?.data?.data || [];
  const signedContracts = rawSignedContracts.filter(s => s.gps_latitude && s.gps_longitude && !isNaN(parseFloat(s.gps_latitude)) && !isNaN(parseFloat(s.gps_longitude)));

  // Territory-Polygone aus aktiven Runs
  const activeRuns = runsData?.data?.data || [];
  const allTerritoryPolygons = [];
  activeRuns.forEach(run => {
    (run.territories || []).forEach((t, i) => {
      try {
        const poly = typeof t.polygon_json === 'string' ? JSON.parse(t.polygon_json) : t.polygon_json;
        if (poly) {
          allTerritoryPolygons.push({
            polygon: poly,
            rep: t.rep,
            plz: run.plz,
            color: T_COLORS[i % T_COLORS.length]
          });
        }
      } catch { /* ignore */ }
    });
  });

  const defaultCenter = [52.5200, 13.4050];
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

  const onlineCount = teamMembers.filter(m => isOnline(m)).length;
  const inAreaCount = teamMembers.filter(m => m.is_in_area).length;

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Groups sx={{ color: BORDEAUX, fontSize: 28 }} />
          <Typography variant="h5" sx={{ fontWeight: 600 }}>Team Live</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <FormControlLabel
            control={<Switch checked={showTerritories} onChange={(e) => setShowTerritories(e.target.checked)} size="small"
              sx={{ '& .Mui-checked': { color: BORDEAUX }, '& .Mui-checked + .MuiSwitch-track': { bgcolor: BORDEAUX } }} />}
            label={<Typography variant="body2">Gebiete</Typography>}
          />
          <FormControlLabel
            control={<Switch checked={showContracts} onChange={(e) => setShowContracts(e.target.checked)} size="small"
              sx={{ '& .Mui-checked': { color: '#2E7D32' }, '& .Mui-checked + .MuiSwitch-track': { bgcolor: '#2E7D32' } }} />}
            label={<Typography variant="body2">Vertraege ({signedContracts.length})</Typography>}
          />
          <Chip icon={<Circle sx={{ fontSize: '10px !important', color: '#2E7D32 !important' }} />}
            label={`${onlineCount} live`}
            sx={{ bgcolor: '#2E7D3215', color: '#2E7D32', fontWeight: 600 }} />
          <Chip icon={<GpsFixed sx={{ fontSize: '14px !important', color: '#0288D1 !important' }} />}
            label={`${inAreaCount} im Gebiet`}
            sx={{ bgcolor: '#0288D115', color: '#0288D1', fontWeight: 600 }} />
          <Chip label={`${teamMembers.length} gesamt`}
            sx={{ bgcolor: '#66666615', color: '#666', fontWeight: 600 }} />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flex: 1, minHeight: 0 }}>
        {/* Karte */}
        <Card sx={{ flex: 1, overflow: 'hidden' }}>
          <CardContent sx={{ p: 0, height: '100%', '&:last-child': { pb: 0 } }}>
            <MapContainer center={center} zoom={zoom}
              style={{ height: '100%', width: '100%', minHeight: '500px' }} scrollWheelZoom>
              <TileLayer attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {/* Territory Polygone */}
              {showTerritories && allTerritoryPolygons.map((tp, i) => (
                <GeoJSON key={`tp-${i}`} data={tp.polygon}
                  style={{ color: tp.color, weight: 2, fillOpacity: 0.1, fillColor: tp.color }}>
                  <Popup>
                    <b>PLZ {tp.plz}</b><br />
                    {tp.rep && `${tp.rep.first_name} ${tp.rep.last_name}`}
                  </Popup>
                </GeoJSON>
              ))}

              {/* Team Markers */}
              {teamMembers.map((member) => {
                const name = `${member.first_name || ''} ${member.last_name || ''}`.trim();
                const online = isOnline(member);
                const stale = isStale(member);
                const color = online ? (ROLE_COLORS[member.role] || BORDEAUX) :
                              stale ? '#ED6C02' : '#999999';
                return (
                  <Marker key={`user-${member.id}`}
                    position={[parseFloat(member.last_latitude), parseFloat(member.last_longitude)]}
                    icon={createUserIcon(name, color, member.is_in_area)}>
                    <Popup>
                      <Box sx={{ minWidth: 200 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {name || member.email}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                          <Chip label={ROLE_LABELS[member.role] || member.role} size="small"
                            sx={{ bgcolor: `${ROLE_COLORS[member.role] || BORDEAUX}20`, color: ROLE_COLORS[member.role] || BORDEAUX, fontWeight: 500 }} />
                          {member.is_in_area ? (
                            <Chip icon={<GpsFixed sx={{ fontSize: '12px !important' }} />} label="Im Gebiet" size="small"
                              sx={{ bgcolor: '#2E7D3220', color: '#2E7D32', fontWeight: 500, fontSize: '0.7rem' }} />
                          ) : (
                            <Chip icon={<GpsOff sx={{ fontSize: '12px !important' }} />} label="Ausserhalb" size="small"
                              sx={{ bgcolor: '#99999920', color: '#999', fontWeight: 500, fontSize: '0.7rem' }} />
                          )}
                        </Box>
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
                          Zuletzt: {member.last_location_at
                            ? new Date(member.last_location_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr'
                            : 'Unbekannt'}
                          {online ? ' (Live)' : stale ? ' (Veraltet)' : ' (Offline)'}
                        </Typography>
                      </Box>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Signed Contract Markers */}
              {showContracts && signedContracts.map((sig) => {
                const contract = sig.contract || {};
                const customer = contract.customer || {};
                const signer = sig.user || {};
                return (
                  <Marker key={`sig-${sig.id}`}
                    position={[parseFloat(sig.gps_latitude), parseFloat(sig.gps_longitude)]}
                    icon={contractIcon}>
                    <Popup>
                      <Box sx={{ minWidth: 220 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Description sx={{ fontSize: 14, color: '#2E7D32' }} />
                          Vertrag #{contract.id}
                        </Typography>
                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
                          <Person sx={{ fontSize: 14, color: BORDEAUX }} />
                          {customer.first_name} {customer.last_name}
                          {customer.company_name && ` (${customer.company_name})`}
                        </Typography>
                        {contract.estimated_value && (
                          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
                            <Euro sx={{ fontSize: 14, color: BORDEAUX }} />
                            {parseFloat(contract.estimated_value).toFixed(2)} EUR
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          Unterschrieben: {new Date(sig.signed_at).toLocaleDateString('de-DE')} um {new Date(sig.signed_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                        </Typography>
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          Von: {signer.first_name} {signer.last_name}
                        </Typography>
                      </Box>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </CardContent>
        </Card>

        {/* Seitenleiste */}
        <Card sx={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
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
              const online = isOnline(member);
              const stale = isStale(member);
              const color = online ? (ROLE_COLORS[member.role] || BORDEAUX) : stale ? '#ED6C02' : '#999';
              const minutesAgo = member.last_location_at ? Math.round((Date.now() - new Date(member.last_location_at).getTime()) / 60000) : null;
              const hoursAgo = minutesAgo !== null ? Math.round(minutesAgo / 60) : null;
              let timeLabel = 'Keine Position';
              if (minutesAgo !== null) {
                if (minutesAgo < 1) timeLabel = 'Gerade eben';
                else if (minutesAgo < 60) timeLabel = `Vor ${minutesAgo} Min.`;
                else if (hoursAgo < 24) timeLabel = `Vor ${hoursAgo} Std.`;
                else timeLabel = `Vor ${Math.round(hoursAgo / 24)} Tagen`;
              }
              return (
                <ListItem key={member.id} sx={{ py: 0.5 }}>
                  <ListItemAvatar sx={{ minWidth: 44 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: color, fontSize: '0.75rem' }}>
                      {(member.first_name?.[0] || '') + (member.last_name?.[0] || '')}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{name || member.email}</span>
                        {member.is_in_area && (
                          <GpsFixed sx={{ fontSize: 12, color: '#2E7D32' }} />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Circle sx={{ fontSize: 8, color: online ? '#2E7D32' : stale ? '#ED6C02' : '#999' }} />
                        <span style={{ fontSize: '0.75rem' }}>
                          {online ? `Live - ${timeLabel}` : stale ? `Veraltet - ${timeLabel}` : `Offline - ${timeLabel}`}
                        </span>
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}

            {/* Signed Contracts Section */}
            {showContracts && signedContracts.length > 0 && (
              <>
                <Divider sx={{ my: 1 }} />
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemText
                    primary={`Unterschriebene Vertraege (${signedContracts.length})`}
                    primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600, color: '#2E7D32' }}
                  />
                </ListItem>
                {signedContracts.slice(0, 10).map((sig) => {
                  const customer = sig.contract?.customer || {};
                  return (
                    <ListItem key={sig.id} sx={{ py: 0.5 }}>
                      <ListItemAvatar sx={{ minWidth: 44 }}>
                        <Avatar sx={{ width: 28, height: 28, bgcolor: '#2E7D32', fontSize: '0.65rem' }}>
                          #{sig.contract?.id}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${customer.first_name || ''} ${customer.last_name || ''}`}
                        secondary={new Date(sig.signed_at).toLocaleDateString('de-DE')}
                        primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 500 }}
                        secondaryTypographyProps={{ fontSize: '0.7rem' }}
                      />
                    </ListItem>
                  );
                })}
              </>
            )}
          </List>
        </Card>
      </Box>
    </Box>
  );
};

export default TeamMapPage;
