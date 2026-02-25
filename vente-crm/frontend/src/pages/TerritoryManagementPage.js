import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box, Typography, Button, Card, CardContent, Chip, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, CircularProgress, Alert,
  Tooltip, Autocomplete, Grid, LinearProgress, Divider, Avatar, InputAdornment
} from '@mui/material';
import {
  Add, Edit, Delete, Map, CheckCircle, Cancel, Schedule,
  ExpandMore, ExpandLess, Home, LocationOn, Groups, Search,
  Person, Circle
} from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup, Rectangle } from 'react-leaflet';
import L from 'leaflet';
import { territoryAPI, userAPI } from '../services/api';
import 'leaflet/dist/leaflet.css';

const BORDEAUX = '#7A1B2D';

const STATUS_COLORS = {
  NEW: '#7A1B2D', CONTACTED: '#A68836', APPOINTMENT: '#2E7D32',
  NOT_INTERESTED: '#666666', CONVERTED: '#5A0F1E', INVALID: '#D32F2F'
};
const STATUS_LABELS = {
  NEW: 'Neu', CONTACTED: 'Kontaktiert', APPOINTMENT: 'Termin',
  NOT_INTERESTED: 'Kein Interesse', CONVERTED: 'Konvertiert', INVALID: 'Ungueltig'
};

const ROLE_COLORS = {
  VERTRIEB: '#2E7D32', TEAMLEAD: '#A68836',
  STANDORTLEITUNG: '#9E3347', BACKOFFICE: '#6A5ACD', ADMIN: BORDEAUX
};
const TERRITORY_COLORS = ['#7A1B2D', '#2E7D32', '#A68836', '#6A5ACD', '#D32F2F', '#0288D1'];

const createUserIcon = (name, color) => {
  const initials = (name || '?').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  return L.divIcon({
    className: 'team-marker',
    html: `<div style="background-color:${color};width:36px;height:36px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${initials}</div>`,
    iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20]
  });
};

const createAddressIcon = (color) => L.divIcon({
  className: 'addr-marker',
  html: `<div style="background-color:${color};width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [12, 12], iconAnchor: [6, 6]
});

// ====== Strassen-Detail mit Hausnummern ======
const StreetList = ({ streets, totalAddresses }) => {
  if (!streets || streets.length === 0) {
    return <Alert severity="info" sx={{ m: 1 }}>Keine Adressen in diesem Gebiet.</Alert>;
  }

  const allAddresses = streets.flatMap(s => s.addresses);
  const visited = allAddresses.filter(a => a.status && a.status !== 'NEW').length;
  const statusCounts = {};
  allAddresses.forEach(a => { statusCounts[a.status || 'NEW'] = (statusCounts[a.status || 'NEW'] || 0) + 1; });

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
        <Chip label={`${totalAddresses || allAddresses.length} Adressen`} size="small" sx={{ fontWeight: 600 }} />
        <Chip label={`${visited} besucht (${allAddresses.length > 0 ? Math.round(visited / allAddresses.length * 100) : 0}%)`}
          size="small" color="info" variant="outlined" />
        {Object.entries(statusCounts).map(([st, count]) => (
          <Chip key={st} label={`${STATUS_LABELS[st] || st}: ${count}`} size="small"
            sx={{ bgcolor: (STATUS_COLORS[st] || '#999') + '20', color: STATUS_COLORS[st] || '#999', fontWeight: 500 }} />
        ))}
      </Box>

      <LinearProgress variant="determinate"
        value={allAddresses.length > 0 ? (visited / allAddresses.length * 100) : 0}
        sx={{ mb: 2, height: 6, borderRadius: 3, bgcolor: '#E0D8D0',
          '& .MuiLinearProgress-bar': { bgcolor: '#2E7D32' } }} />

      {streets.map((street, si) => {
        const streetVisited = street.addresses.filter(a => a.status && a.status !== 'NEW').length;
        return (
          <Card key={si} variant="outlined" sx={{ mb: 1.5 }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationOn sx={{ fontSize: 18, color: BORDEAUX }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{street.street}</Typography>
                  <Typography variant="caption" color="text.secondary">({street.postal_code} {street.city})</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Chip label={`${street.addresses.length} HNr.`} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                  <Chip label={`${streetVisited} besucht`} size="small"
                    sx={{ fontSize: '0.7rem', bgcolor: '#2E7D3220', color: '#2E7D32' }} />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {street.addresses.map((addr, ai) => (
                  <Tooltip key={ai} title={
                    <Box>
                      <Typography variant="caption" display="block">{addr.street} {addr.house_number}</Typography>
                      {addr.contact_name && <Typography variant="caption" display="block">Kontakt: {addr.contact_name}</Typography>}
                      <Typography variant="caption" display="block">Status: {STATUS_LABELS[addr.status] || 'Neu'}</Typography>
                      {addr.total_households != null && (
                        <Typography variant="caption" display="block">HH: {addr.contacted_households || 0}/{addr.total_households}</Typography>
                      )}
                      {addr.notes && <Typography variant="caption" display="block" sx={{ fontStyle: 'italic' }}>{addr.notes}</Typography>}
                    </Box>
                  } arrow>
                    <Chip
                      icon={<Home sx={{ fontSize: '12px !important' }} />}
                      label={addr.house_number || '?'}
                      size="small"
                      sx={{
                        fontSize: '0.75rem',
                        bgcolor: (STATUS_COLORS[addr.status] || STATUS_COLORS.NEW) + '20',
                        color: STATUS_COLORS[addr.status] || STATUS_COLORS.NEW,
                        fontWeight: 500, cursor: 'default',
                        '& .MuiChip-icon': { color: 'inherit' }
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
};

// ====== Haupt-Komponente ======
const TerritoryManagementPage = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [plzSearch, setPlzSearch] = useState('');
  const [form, setForm] = useState({
    assigned_to_user_id: '', postal_codes: [], name: '',
    valid_from: '', valid_until: '', rotation_days: 14, notes: ''
  });

  const { data: assignmentsData, isLoading } = useQuery('territory-assignments', () => territoryAPI.getAll());
  const { data: usersData } = useQuery('users-for-territory', () => userAPI.getAll());
  const { data: plzData } = useQuery('available-plz', () => territoryAPI.getAvailablePLZ());
  const { data: teamData } = useQuery('team-locations-map', () => userAPI.getTeamLocations(), { refetchInterval: 30000 });
  const availablePLZ = plzData?.data?.data || [];
  const assignments = assignmentsData?.data?.data || [];
  const users = (usersData?.data?.data || []).filter(u => ['STANDORTLEITUNG', 'TEAMLEAD'].includes(u.role));
  const teamMembers = (teamData?.data?.data || []).filter(m => m.last_latitude && m.last_longitude);

  // PLZ-Filter: Gebiete die die gesuchte PLZ enthalten
  const filteredAssignments = useMemo(() => {
    if (!plzSearch.trim()) return assignments;
    return assignments.filter(a => {
      const codes = Array.isArray(a.postal_codes) ? a.postal_codes : (a.postal_codes || '').split(',');
      return codes.some(c => c.trim().includes(plzSearch.trim()));
    });
  }, [assignments, plzSearch]);

  // Adressen fuer alle gefilterten Gebiete laden
  const filteredIds = filteredAssignments.map(a => a.id);
  const { data: addressData, isLoading: addrLoading } = useQuery(
    ['territory-addresses-all', filteredIds.join(',')],
    async () => {
      const results = await Promise.all(
        filteredAssignments.map(a => territoryAPI.getAddresses(a.id).catch(() => null))
      );
      return results;
    },
    { enabled: filteredAssignments.length > 0 }
  );

  // Adressen und Bounds aus den Daten berechnen
  const { allAddresses, territoryBounds, allStreets, totalAddresses } = useMemo(() => {
    const addrs = [];
    const bounds = [];
    const streets = [];
    let total = 0;
    (addressData || []).forEach((res, idx) => {
      const d = res?.data?.data;
      if (!d) return;
      const assignment = filteredAssignments[idx];
      total += d.total_addresses || 0;
      (d.streets || []).forEach(street => {
        streets.push(street);
        street.addresses.forEach(addr => {
          if (addr.latitude && addr.longitude) {
            addrs.push({ ...addr, territoryName: assignment?.name || `Gebiet #${assignment?.id}` });
          }
        });
      });
      const geocoded = (d.streets || []).flatMap(s => s.addresses).filter(a => a.latitude && a.longitude);
      if (geocoded.length > 0) {
        const lats = geocoded.map(a => parseFloat(a.latitude));
        const lons = geocoded.map(a => parseFloat(a.longitude));
        bounds.push({
          name: assignment?.name || `Gebiet #${assignment?.id}`,
          assignedTo: assignment?.assignedTo,
          bounds: [[Math.min(...lats) - 0.002, Math.min(...lons) - 0.002],
                    [Math.max(...lats) + 0.002, Math.max(...lons) + 0.002]]
        });
      }
    });
    return { allAddresses: addrs, territoryBounds: bounds, allStreets: streets, totalAddresses: total };
  }, [addressData, filteredAssignments]);

  // Karten-Center
  const mapCenter = allAddresses.length > 0
    ? [allAddresses.reduce((s, a) => s + parseFloat(a.latitude), 0) / allAddresses.length,
       allAddresses.reduce((s, a) => s + parseFloat(a.longitude), 0) / allAddresses.length]
    : teamMembers.length > 0
      ? [teamMembers.reduce((s, m) => s + parseFloat(m.last_latitude), 0) / teamMembers.length,
         teamMembers.reduce((s, m) => s + parseFloat(m.last_longitude), 0) / teamMembers.length]
      : [52.52, 13.405];
  const mapZoom = allAddresses.length > 0 ? 14 : 11;

  const createMutation = useMutation(
    (data) => territoryAPI.create(data),
    { onSuccess: () => { queryClient.invalidateQueries('territory-assignments'); handleCloseDialog(); } }
  );
  const updateMutation = useMutation(
    ({ id, data }) => territoryAPI.update(id, data),
    { onSuccess: () => { queryClient.invalidateQueries('territory-assignments'); handleCloseDialog(); } }
  );
  const deleteMutation = useMutation(
    (id) => territoryAPI.delete(id),
    { onSuccess: () => queryClient.invalidateQueries('territory-assignments') }
  );

  const handleOpenCreate = () => {
    setEditItem(null);
    const today = new Date().toISOString().split('T')[0];
    const in14d = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    setForm({ assigned_to_user_id: '', postal_codes: [], name: '',
      valid_from: today, valid_until: in14d, rotation_days: 14, notes: '' });
    setDialogOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditItem(item);
    const pc = Array.isArray(item.postal_codes) ? item.postal_codes
      : (item.postal_codes || '').split(',').map(s => s.trim()).filter(Boolean);
    setForm({ assigned_to_user_id: item.assigned_to_user_id, postal_codes: pc,
      name: item.name || '', valid_from: item.valid_from, valid_until: item.valid_until,
      rotation_days: item.rotation_days || 14, notes: item.notes || '' });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => { setDialogOpen(false); setEditItem(null); };

  const handleSubmit = () => {
    const payload = { ...form };
    if (editItem) updateMutation.mutate({ id: editItem.id, data: payload });
    else createMutation.mutate(payload);
  };

  const handleDelete = (id) => {
    if (window.confirm('Gebietszuweisung wirklich loeschen?')) deleteMutation.mutate(id);
  };

  const getStatusChip = (item) => {
    const today = new Date().toISOString().split('T')[0];
    if (!item.is_active) return <Chip icon={<Cancel />} label="Inaktiv" size="small" color="default" />;
    if (item.valid_until < today) return <Chip icon={<Schedule />} label="Abgelaufen" size="small" color="warning" />;
    if (item.valid_from > today) return <Chip icon={<Schedule />} label="Geplant" size="small" color="info" />;
    return <Chip icon={<CheckCircle />} label="Aktiv" size="small" color="success" />;
  };

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: BORDEAUX }} /></Box>;
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          <Map sx={{ mr: 1, verticalAlign: 'middle', color: BORDEAUX }} />
          Gebietsverwaltung
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreate}
          sx={{ bgcolor: BORDEAUX, '&:hover': { bgcolor: '#5A0F1E' } }}>
          Neues Gebiet zuweisen
        </Button>
      </Box>

      {/* PLZ-Suche */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2 }}>
          <TextField
            fullWidth
            placeholder="PLZ eingeben um Gebiet auf der Karte zu suchen..."
            value={plzSearch}
            onChange={(e) => setPlzSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: BORDEAUX }} />
                </InputAdornment>
              )
            }}
            sx={{ '& .MuiOutlinedInput-root': {
              '&.Mui-focused fieldset': { borderColor: BORDEAUX }
            } }}
          />
          {plzSearch && (
            <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {filteredAssignments.length} Gebiet(e) gefunden
              </Typography>
              {filteredAssignments.map(a => {
                const codes = Array.isArray(a.postal_codes) ? a.postal_codes : (a.postal_codes || '').split(',');
                return codes.filter(c => c.trim().includes(plzSearch.trim())).map((c, i) => (
                  <Chip key={`${a.id}-${i}`} label={`${c.trim()} - ${a.name || `Gebiet #${a.id}`}`}
                    size="small" sx={{ bgcolor: `${BORDEAUX}15`, color: BORDEAUX, fontWeight: 500 }} />
                ));
              })}
              <Button size="small" onClick={() => setPlzSearch('')} sx={{ color: BORDEAUX, ml: 'auto' }}>
                Filter zuruecksetzen
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Karte - immer sichtbar */}
      <Card sx={{ mb: 3, overflow: 'hidden' }}>
        <CardContent sx={{ p: 0 }}>
          {addrLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: BORDEAUX }} /></Box>
          ) : (
            <MapContainer key={`map-${mapCenter[0].toFixed(4)}-${mapCenter[1].toFixed(4)}`}
              center={mapCenter} zoom={mapZoom}
              style={{ height: '450px', width: '100%' }} scrollWheelZoom={true}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {/* Gebiets-Rahmen */}
              {territoryBounds.map((tb, i) => (
                <Rectangle key={i} bounds={tb.bounds}
                  pathOptions={{
                    color: TERRITORY_COLORS[i % TERRITORY_COLORS.length],
                    weight: 3, fillOpacity: 0.1, dashArray: '8, 4'
                  }}>
                  <Popup>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{tb.name}</Typography>
                    {tb.assignedTo && (
                      <Typography variant="body2">
                        {tb.assignedTo.first_name} {tb.assignedTo.last_name}
                      </Typography>
                    )}
                  </Popup>
                </Rectangle>
              ))}

              {/* Adress-Marker */}
              {allAddresses.map((addr, i) => (
                <Marker key={`a-${i}`}
                  position={[parseFloat(addr.latitude), parseFloat(addr.longitude)]}
                  icon={createAddressIcon(STATUS_COLORS[addr.status] || STATUS_COLORS.NEW)}>
                  <Popup>
                    <Box sx={{ minWidth: 180 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {addr.street} {addr.house_number}
                      </Typography>
                      <Typography variant="caption" display="block">{addr.postal_code} {addr.city}</Typography>
                      <Chip label={STATUS_LABELS[addr.status] || 'Neu'} size="small"
                        sx={{ mt: 0.5, bgcolor: (STATUS_COLORS[addr.status] || '#999') + '20',
                          color: STATUS_COLORS[addr.status] || '#999', fontWeight: 500 }} />
                      {addr.contact_name && <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>Kontakt: {addr.contact_name}</Typography>}
                    </Box>
                  </Popup>
                </Marker>
              ))}

              {/* Team-Mitglieder */}
              {teamMembers.map((member) => {
                const name = `${member.first_name || ''} ${member.last_name || ''}`.trim();
                const isOnline = member.last_location_at && (Date.now() - new Date(member.last_location_at).getTime()) < 600000;
                const color = isOnline ? (ROLE_COLORS[member.role] || BORDEAUX) : '#999';
                return (
                  <Marker key={`u-${member.id}`}
                    position={[parseFloat(member.last_latitude), parseFloat(member.last_longitude)]}
                    icon={createUserIcon(name, color)}>
                    <Popup>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{name}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Circle sx={{ fontSize: 8, color: isOnline ? '#2E7D32' : '#999' }} />
                        <Typography variant="caption">{isOnline ? 'Online' : 'Offline'}</Typography>
                      </Box>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          )}
        </CardContent>
      </Card>

      {/* Legende */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <Chip icon={<Groups sx={{ fontSize: '16px !important' }} />}
          label={`${teamMembers.length} Team-Mitglieder`}
          size="small" sx={{ bgcolor: `${BORDEAUX}15`, color: BORDEAUX, fontWeight: 600 }} />
        <Chip label={`${allAddresses.length} Adressen auf Karte`} size="small" variant="outlined" />
        <Chip label={`${territoryBounds.length} Gebiete markiert`} size="small" variant="outlined" />
        <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto' }}>
          {Object.entries(STATUS_LABELS).map(([st, label]) => (
            <Chip key={st} label={label} size="small"
              sx={{ fontSize: '0.65rem', height: 20, bgcolor: STATUS_COLORS[st] + '20', color: STATUS_COLORS[st] }} />
          ))}
        </Box>
      </Box>

      {/* Strassen und Hausnummern - wenn PLZ gesucht oder Gebiet expandiert */}
      {(plzSearch || expandedId) && allStreets.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              <Home sx={{ mr: 1, verticalAlign: 'middle', color: BORDEAUX }} />
              Strassen & Hausnummern {plzSearch && `(PLZ: ${plzSearch})`}
            </Typography>
            <StreetList streets={allStreets} totalAddresses={totalAddresses} />
          </CardContent>
        </Card>
      )}

      {/* Gebietsliste */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        Zugewiesene Gebiete ({filteredAssignments.length})
      </Typography>

      {filteredAssignments.length === 0 ? (
        <Alert severity="info">
          {plzSearch ? `Keine Gebiete fuer PLZ "${plzSearch}" gefunden.` : 'Noch keine Gebiete zugewiesen.'}
        </Alert>
      ) : (
        filteredAssignments.map((item) => {
          const isExpanded = expandedId === item.id;
          const plzList = (Array.isArray(item.postal_codes) ? item.postal_codes : (item.postal_codes || '').split(',')).filter(Boolean);

          return (
            <Card key={item.id} sx={{ mb: 2 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: isExpanded ? 0 : 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {item.name || `Gebiet #${item.id}`}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Person sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {item.assignedTo
                            ? `${item.assignedTo.first_name || ''} ${item.assignedTo.last_name || ''}`.trim()
                            : 'Unbekannt'}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {plzList.slice(0, 5).map((plz, i) => (
                        <Chip key={i} label={plz.trim()} size="small"
                          sx={{ bgcolor: `${BORDEAUX}15`, color: BORDEAUX, fontWeight: 500 }} />
                      ))}
                      {plzList.length > 5 && <Chip label={`+${plzList.length - 5}`} size="small" variant="outlined" />}
                    </Box>

                    {getStatusChip(item)}
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Tooltip title="Strassen anzeigen">
                      <IconButton size="small" onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        sx={{ color: BORDEAUX }}>
                        {isExpanded ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Bearbeiten">
                      <IconButton size="small" onClick={() => handleOpenEdit(item)}><Edit fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Loeschen">
                      <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}><Delete fontSize="small" /></IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Vertriebler */}
                {item.salespersonTerritories && item.salespersonTerritories.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>Vertriebler:</Typography>
                    {item.salespersonTerritories.map((sp) => (
                      <Chip key={sp.id} size="small"
                        avatar={<Avatar sx={{ bgcolor: '#2E7D32', width: 20, height: 20, fontSize: '0.6rem' }}>
                          {(sp.salesperson?.first_name?.[0] || '') + (sp.salesperson?.last_name?.[0] || '')}
                        </Avatar>}
                        label={`${sp.salesperson?.first_name || ''} ${sp.salesperson?.last_name || ''}`.trim()}
                        sx={{ bgcolor: '#2E7D3215', color: '#2E7D32', fontWeight: 500 }}
                      />
                    ))}
                  </Box>
                )}
              </CardContent>

              {/* Expandierte Strassenansicht */}
              {isExpanded && (
                <>
                  <Divider />
                  <CardContent sx={{ p: 2 }}>
                    <ExpandedStreetDetail territoryId={item.id} />
                  </CardContent>
                </>
              )}
            </Card>
          );
        })
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {editItem ? 'Gebietszuweisung bearbeiten' : 'Neues Gebiet zuweisen'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {!editItem && (
              <TextField select label="Zuweisen an" value={form.assigned_to_user_id}
                onChange={(e) => setForm({ ...form, assigned_to_user_id: e.target.value })} fullWidth required>
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email}
                    {' '}({u.role === 'STANDORTLEITUNG' ? 'Standortleitung' : 'Teamleiter'})
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField label="Gebietsname" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="z.B. Berlin Mitte Nord" fullWidth />
            <Autocomplete multiple freeSolo options={availablePLZ.map(p => p.plz)}
              value={form.postal_codes}
              onChange={(e, v) => setForm({ ...form, postal_codes: v })}
              getOptionLabel={(opt) => {
                const m = availablePLZ.find(p => p.plz === opt);
                return m ? `${opt} (${m.city})` : opt;
              }}
              renderTags={(value, getTagProps) =>
                value.map((plz, index) => {
                  const m = availablePLZ.find(p => p.plz === plz);
                  return (
                    <Chip key={plz} label={m ? `${plz} - ${m.city}` : plz} size="small"
                      sx={{ bgcolor: `${BORDEAUX}15`, color: BORDEAUX, fontWeight: 500 }}
                      {...getTagProps({ index })} />
                  );
                })
              }
              renderInput={(params) => (
                <TextField {...params} label="PLZ-Gebiete"
                  placeholder={form.postal_codes.length === 0 ? 'PLZ eingeben...' : ''}
                  required helperText={availablePLZ.length > 0
                    ? `${availablePLZ.length} PLZ verfuegbar` : 'PLZ eingeben + Enter'} />
              )}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Gueltig ab" type="date" value={form.valid_from}
                onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                fullWidth required InputLabelProps={{ shrink: true }} />
              <TextField label="Gueltig bis" type="date" value={form.valid_until}
                onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                fullWidth required InputLabelProps={{ shrink: true }} />
            </Box>
            <TextField label="Rotationsintervall (Tage)" type="number" value={form.rotation_days}
              onChange={(e) => setForm({ ...form, rotation_days: parseInt(e.target.value) || 14 })}
              fullWidth />
            <TextField label="Notizen" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              multiline rows={2} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog}>Abbrechen</Button>
          <Button variant="contained" onClick={handleSubmit}
            disabled={createMutation.isLoading || updateMutation.isLoading}
            sx={{ bgcolor: BORDEAUX, '&:hover': { bgcolor: '#5A0F1E' } }}>
            {createMutation.isLoading || updateMutation.isLoading
              ? <CircularProgress size={20} color="inherit" />
              : editItem ? 'Speichern' : 'Zuweisen'}
          </Button>
        </DialogActions>
      </Dialog>

      {(createMutation.isError || updateMutation.isError || deleteMutation.isError) && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {createMutation.error?.response?.data?.error ||
           updateMutation.error?.response?.data?.error ||
           deleteMutation.error?.response?.data?.error ||
           'Ein Fehler ist aufgetreten'}
        </Alert>
      )}
    </Box>
  );
};

// Separate Komponente fuer expandierte Strassen (eigene Query)
const ExpandedStreetDetail = ({ territoryId }) => {
  const { data, isLoading } = useQuery(
    ['territory-addresses', territoryId],
    () => territoryAPI.getAddresses(territoryId),
    { enabled: !!territoryId }
  );

  if (isLoading) return <Box sx={{ p: 2 }}><CircularProgress size={24} sx={{ color: BORDEAUX }} /></Box>;

  const result = data?.data?.data;
  if (!result || !result.streets || result.streets.length === 0) {
    return <Alert severity="info">Keine Adressen in diesem Gebiet.</Alert>;
  }

  return <StreetList streets={result.streets} totalAddresses={result.total_addresses} />;
};

export default TerritoryManagementPage;
