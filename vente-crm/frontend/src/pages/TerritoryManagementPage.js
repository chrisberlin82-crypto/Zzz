import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, CircularProgress, Alert,
  Tooltip, Autocomplete, Collapse, Grid, LinearProgress, Tabs, Tab, Divider,
  Avatar, List, ListItem, ListItemText, ListItemAvatar
} from '@mui/material';
import {
  Add, Edit, Delete, Map, CheckCircle, Cancel, Schedule,
  ExpandMore, ExpandLess, Home, LocationOn, Groups,
  Person, Circle, Visibility
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

// ====== Strassen-Detail Komponente ======
const StreetDetail = ({ territoryId }) => {
  const { data, isLoading } = useQuery(
    ['territory-addresses', territoryId],
    () => territoryAPI.getAddresses(territoryId),
    { enabled: !!territoryId }
  );

  if (isLoading) return <Box sx={{ p: 2 }}><CircularProgress size={24} sx={{ color: BORDEAUX }} /></Box>;

  const result = data?.data?.data;
  if (!result || !result.streets || result.streets.length === 0) {
    return <Alert severity="info" sx={{ m: 2 }}>Keine Adressen in diesem Gebiet vorhanden.</Alert>;
  }

  const { streets, total_addresses } = result;

  // Statistiken berechnen
  const allAddresses = streets.flatMap(s => s.addresses);
  const statusCounts = {};
  allAddresses.forEach(a => {
    const st = a.status || 'NEW';
    statusCounts[st] = (statusCounts[st] || 0) + 1;
  });
  const visited = allAddresses.filter(a => a.status && a.status !== 'NEW').length;

  return (
    <Box sx={{ p: 2 }}>
      {/* Gebiet-Statistik */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Chip label={`${total_addresses} Adressen`} size="small" sx={{ fontWeight: 600 }} />
        <Chip label={`${visited} besucht (${total_addresses > 0 ? Math.round(visited / total_addresses * 100) : 0}%)`}
          size="small" color="info" variant="outlined" />
        {Object.entries(statusCounts).map(([st, count]) => (
          <Chip key={st} label={`${STATUS_LABELS[st] || st}: ${count}`} size="small"
            sx={{ bgcolor: (STATUS_COLORS[st] || '#999') + '20', color: STATUS_COLORS[st] || '#999', fontWeight: 500 }} />
        ))}
      </Box>

      <LinearProgress variant="determinate"
        value={total_addresses > 0 ? (visited / total_addresses * 100) : 0}
        sx={{ mb: 2, height: 6, borderRadius: 3, bgcolor: '#E0D8D0',
          '& .MuiLinearProgress-bar': { bgcolor: '#2E7D32' } }} />

      {/* Strassen-Liste */}
      {streets.map((street, si) => {
        const streetVisited = street.addresses.filter(a => a.status && a.status !== 'NEW').length;
        return (
          <Card key={si} variant="outlined" sx={{ mb: 1.5 }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationOn sx={{ fontSize: 18, color: BORDEAUX }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {street.street}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ({street.postal_code} {street.city})
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Chip label={`${street.addresses.length} HNr.`} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                  <Chip label={`${streetVisited} besucht`} size="small"
                    sx={{ fontSize: '0.7rem', bgcolor: '#2E7D3220', color: '#2E7D32' }} />
                </Box>
              </Box>

              {/* Hausnummern als Chips */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {street.addresses.map((addr, ai) => (
                  <Tooltip key={ai} title={
                    <Box>
                      <Typography variant="caption" display="block">{addr.street} {addr.house_number}</Typography>
                      {addr.contact_name && <Typography variant="caption" display="block">Kontakt: {addr.contact_name}</Typography>}
                      <Typography variant="caption" display="block">Status: {STATUS_LABELS[addr.status] || addr.status || 'Neu'}</Typography>
                      {addr.total_households != null && (
                        <Typography variant="caption" display="block">
                          Haushalte: {addr.contacted_households || 0}/{addr.total_households}
                        </Typography>
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
                        fontWeight: 500,
                        cursor: 'default',
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

// ====== Gebiets-Karte ======
const TerritoryMap = ({ assignments }) => {
  const { data: teamData, isLoading: teamLoading } = useQuery(
    'team-locations-map',
    () => userAPI.getTeamLocations(),
    { refetchInterval: 30000 }
  );

  // Alle Adressen aller Gebiete laden
  const territoryIds = assignments.map(a => a.id);
  const addressQueries = useQuery(
    ['all-territory-addresses', territoryIds.join(',')],
    async () => {
      const results = await Promise.all(
        assignments.map(a => territoryAPI.getAddresses(a.id).catch(() => null))
      );
      return results;
    },
    { enabled: assignments.length > 0 }
  );

  const teamMembers = (teamData?.data?.data || []).filter(
    m => m.last_latitude && m.last_longitude && !isNaN(parseFloat(m.last_latitude))
  );

  // Alle Adressen mit Koordinaten sammeln
  const allAddresses = [];
  const territoryBounds = [];
  (addressQueries.data || []).forEach((res, idx) => {
    const d = res?.data?.data;
    if (!d) return;
    const assignment = assignments[idx];
    (d.streets || []).forEach(street => {
      street.addresses.forEach(addr => {
        if (addr.latitude && addr.longitude) {
          allAddresses.push({ ...addr, territoryName: assignment?.name || `Gebiet #${assignment?.id}` });
        }
      });
    });
    // Bounds berechnen
    const geocoded = (d.streets || []).flatMap(s => s.addresses).filter(a => a.latitude && a.longitude);
    if (geocoded.length > 0) {
      const lats = geocoded.map(a => parseFloat(a.latitude));
      const lons = geocoded.map(a => parseFloat(a.longitude));
      territoryBounds.push({
        name: assignment?.name || `Gebiet #${assignment?.id}`,
        assignedTo: assignment?.assignedTo,
        bounds: [[Math.min(...lats) - 0.001, Math.min(...lons) - 0.001],
                  [Math.max(...lats) + 0.001, Math.max(...lons) + 0.001]]
      });
    }
  });

  // Kartenmittelpunkt
  const defaultCenter = [52.52, 13.405];
  let center = defaultCenter;
  let zoom = 11;

  if (allAddresses.length > 0) {
    center = [
      allAddresses.reduce((s, a) => s + parseFloat(a.latitude), 0) / allAddresses.length,
      allAddresses.reduce((s, a) => s + parseFloat(a.longitude), 0) / allAddresses.length
    ];
    zoom = 12;
  } else if (teamMembers.length > 0) {
    center = [
      teamMembers.reduce((s, m) => s + parseFloat(m.last_latitude), 0) / teamMembers.length,
      teamMembers.reduce((s, m) => s + parseFloat(m.last_longitude), 0) / teamMembers.length
    ];
  }

  const TERRITORY_COLORS = ['#7A1B2D', '#2E7D32', '#A68836', '#6A5ACD', '#D32F2F', '#0288D1'];

  if (teamLoading || addressQueries.isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: BORDEAUX }} /></Box>;
  }

  return (
    <Box>
      {/* Legende */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Chip icon={<Groups sx={{ fontSize: '16px !important' }} />}
          label={`${teamMembers.length} Team-Mitglieder`}
          size="small" sx={{ bgcolor: `${BORDEAUX}15`, color: BORDEAUX, fontWeight: 600 }} />
        <Chip label={`${allAddresses.length} Adressen`} size="small" variant="outlined" />
        <Chip label={`${territoryBounds.length} Gebiete`} size="small" variant="outlined" />
        <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
          {Object.entries(STATUS_LABELS).slice(0, 4).map(([st, label]) => (
            <Chip key={st} label={label} size="small"
              sx={{ fontSize: '0.65rem', height: 20, bgcolor: STATUS_COLORS[st] + '20', color: STATUS_COLORS[st] }} />
          ))}
        </Box>
      </Box>

      <Card sx={{ overflow: 'hidden' }}>
        <MapContainer center={center} zoom={zoom}
          style={{ height: '500px', width: '100%' }} scrollWheelZoom={true}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {/* Gebiets-Rahmen */}
          {territoryBounds.map((tb, i) => (
            <Rectangle key={i} bounds={tb.bounds}
              pathOptions={{
                color: TERRITORY_COLORS[i % TERRITORY_COLORS.length],
                weight: 3, fillOpacity: 0.08, dashArray: '8, 4'
              }}>
              <Popup>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{tb.name}</Typography>
                {tb.assignedTo && (
                  <Typography variant="body2">
                    Zugewiesen: {tb.assignedTo.first_name} {tb.assignedTo.last_name}
                  </Typography>
                )}
              </Popup>
            </Rectangle>
          ))}

          {/* Adress-Marker */}
          {allAddresses.map((addr, i) => (
            <Marker key={`addr-${i}`}
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
                  <Typography variant="caption" display="block" color="text.secondary">{addr.territoryName}</Typography>
                </Box>
              </Popup>
            </Marker>
          ))}

          {/* Team-Mitglieder */}
          {teamMembers.map((member) => {
            const name = `${member.first_name || ''} ${member.last_name || ''}`.trim();
            const isOnline = member.last_location_at && (Date.now() - new Date(member.last_location_at).getTime()) < 10 * 60 * 1000;
            const color = isOnline ? (ROLE_COLORS[member.role] || BORDEAUX) : '#999';
            return (
              <Marker key={`user-${member.id}`}
                position={[parseFloat(member.last_latitude), parseFloat(member.last_longitude)]}
                icon={createUserIcon(name, color)}>
                <Popup>
                  <Box sx={{ minWidth: 180 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{name || member.email}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <Circle sx={{ fontSize: 8, color: isOnline ? '#2E7D32' : '#999' }} />
                      <Typography variant="caption">{isOnline ? 'Online' : 'Offline'}</Typography>
                    </Box>
                    <Typography variant="caption" display="block" color="text.secondary">
                      {member.last_location_at ? new Date(member.last_location_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr' : ''}
                    </Typography>
                  </Box>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </Card>

      {/* Team-Liste unter der Karte */}
      {teamMembers.length > 0 && (
        <Card sx={{ mt: 2 }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              <Groups sx={{ mr: 1, verticalAlign: 'middle', color: BORDEAUX, fontSize: 20 }} />
              Team-Mitglieder auf der Karte
            </Typography>
            <Grid container spacing={1}>
              {teamMembers.map((member) => {
                const name = `${member.first_name || ''} ${member.last_name || ''}`.trim();
                const isOnline = member.last_location_at && (Date.now() - new Date(member.last_location_at).getTime()) < 10 * 60 * 1000;
                return (
                  <Grid item xs={12} sm={6} md={4} key={member.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1, bgcolor: '#F5F3F0' }}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: isOnline ? (ROLE_COLORS[member.role] || BORDEAUX) : '#999', fontSize: '0.7rem' }}>
                        {(member.first_name?.[0] || '') + (member.last_name?.[0] || '')}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }} noWrap>{name}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Circle sx={{ fontSize: 6, color: isOnline ? '#2E7D32' : '#999' }} />
                          <Typography variant="caption" color="text.secondary">{isOnline ? 'Online' : 'Offline'}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

// ====== Haupt-Komponente ======
const TerritoryManagementPage = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm] = useState({
    assigned_to_user_id: '', postal_codes: [], name: '',
    valid_from: '', valid_until: '', rotation_days: 14, notes: ''
  });

  const { data: assignmentsData, isLoading } = useQuery('territory-assignments', () => territoryAPI.getAll());
  const { data: usersData } = useQuery('users-for-territory', () => userAPI.getAll());
  const { data: plzData } = useQuery('available-plz', () => territoryAPI.getAvailablePLZ());
  const availablePLZ = plzData?.data?.data || [];

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

  const assignments = assignmentsData?.data?.data || [];
  const users = (usersData?.data?.data || []).filter(u => ['STANDORTLEITUNG', 'TEAMLEAD'].includes(u.role));

  const handleOpenCreate = () => {
    setEditItem(null);
    const today = new Date().toISOString().split('T')[0];
    const in14days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setForm({ assigned_to_user_id: '', postal_codes: [], name: '',
      valid_from: today, valid_until: in14days, rotation_days: 14, notes: '' });
    setDialogOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditItem(item);
    const postalCodes = Array.isArray(item.postal_codes)
      ? item.postal_codes
      : (item.postal_codes || '').split(',').map(s => s.trim()).filter(Boolean);
    setForm({
      assigned_to_user_id: item.assigned_to_user_id,
      postal_codes: postalCodes, name: item.name || '',
      valid_from: item.valid_from, valid_until: item.valid_until,
      rotation_days: item.rotation_days || 14, notes: item.notes || ''
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => { setDialogOpen(false); setEditItem(null); };

  const handleSubmit = () => {
    const payload = { ...form, postal_codes: form.postal_codes };
    if (editItem) updateMutation.mutate({ id: editItem.id, data: payload });
    else createMutation.mutate(payload);
  };

  const handleDelete = (id) => {
    if (window.confirm('Gebietszuweisung wirklich loeschen? Alle Vertriebler-Zuweisungen werden ebenfalls geloescht.'))
      deleteMutation.mutate(id);
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

      {/* Tabs: Tabelle / Karte */}
      <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2,
        '& .MuiTab-root': { fontWeight: 600 },
        '& .Mui-selected': { color: BORDEAUX },
        '& .MuiTabs-indicator': { bgcolor: BORDEAUX }
      }}>
        <Tab icon={<LocationOn sx={{ fontSize: 18 }} />} iconPosition="start" label="Gebiete & Strassen" />
        <Tab icon={<Map sx={{ fontSize: 18 }} />} iconPosition="start" label="Karte mit Teams" />
      </Tabs>

      {/* ====== TAB 0: Gebietstabelle mit expandierbaren Strassen ====== */}
      {activeTab === 0 && (
        <>
          {assignments.length === 0 ? (
            <Alert severity="info">
              Noch keine Gebiete zugewiesen. Erstellen Sie eine Gebietszuweisung fuer Standortleiter oder Teamleiter.
            </Alert>
          ) : (
            assignments.map((item) => {
              const isExpanded = expandedId === item.id;
              const plzList = (Array.isArray(item.postal_codes) ? item.postal_codes : (item.postal_codes || '').split(',')).filter(Boolean);

              return (
                <Card key={item.id} sx={{ mb: 2 }}>
                  {/* Gebiet-Header */}
                  <CardContent sx={{ p: 2, '&:last-child': { pb: isExpanded ? 0 : 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {item.name || `Gebiet #${item.id}`}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Person sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {item.assignedTo
                                ? `${item.assignedTo.first_name || ''} ${item.assignedTo.last_name || ''}`.trim() || item.assignedTo.email
                                : 'Unbekannt'}
                              {' '}({item.assignedTo?.role === 'STANDORTLEITUNG' ? 'Standortleitung' : 'Teamleiter'})
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

                        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                          {new Date(item.valid_from).toLocaleDateString('de-DE')} - {new Date(item.valid_until).toLocaleDateString('de-DE')}
                        </Typography>

                        {getStatusChip(item)}
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Tooltip title="Strassen & Hausnummern anzeigen">
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

                    {/* Zugewiesene Vertriebler */}
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

                  {/* Expandierter Strassen-Bereich */}
                  <Collapse in={isExpanded}>
                    <Divider />
                    <StreetDetail territoryId={item.id} />
                  </Collapse>
                </Card>
              );
            })
          )}
        </>
      )}

      {/* ====== TAB 1: Karte mit Gebieten und Teams ====== */}
      {activeTab === 1 && (
        <TerritoryMap assignments={assignments} />
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
              onChange={(e, newValue) => setForm({ ...form, postal_codes: newValue })}
              getOptionLabel={(option) => {
                const match = availablePLZ.find(p => p.plz === option);
                return match ? `${option} (${match.city})` : option;
              }}
              renderTags={(value, getTagProps) =>
                value.map((plz, index) => {
                  const match = availablePLZ.find(p => p.plz === plz);
                  return (
                    <Chip key={plz} label={match ? `${plz} - ${match.city}` : plz} size="small"
                      sx={{ bgcolor: `${BORDEAUX}15`, color: BORDEAUX, fontWeight: 500 }}
                      {...getTagProps({ index })} />
                  );
                })
              }
              renderInput={(params) => (
                <TextField {...params} label="PLZ-Gebiete"
                  placeholder={form.postal_codes.length === 0 ? 'PLZ eingeben oder auswaehlen...' : ''}
                  required helperText={availablePLZ.length > 0
                    ? `${availablePLZ.length} PLZ aus Adresslisten verfuegbar.`
                    : 'Geben Sie Postleitzahlen ein (Enter zum Bestaetigen)'} />
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
              fullWidth helperText="z.B. 14 = alle 2 Wochen wechselt das Gebiet" />
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

export default TerritoryManagementPage;
