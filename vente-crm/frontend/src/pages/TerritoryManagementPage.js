import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box, Typography, Button, Card, CardContent, Chip, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, CircularProgress, Alert,
  Tooltip, Autocomplete, Grid, LinearProgress, Divider, Avatar, InputAdornment,
  Switch, FormControlLabel, Collapse, Badge, Tabs, Tab, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import {
  Add, Edit, Delete, Map, CheckCircle, Cancel, Schedule,
  ExpandMore, ExpandLess, Home, LocationOn, Groups, Search,
  Person, Visibility, CalendarMonth, FiberManualRecord,
  PlayArrow, Archive, AutoAwesome, Apartment, Handshake
} from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup, Rectangle, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { territoryAPI, userAPI } from '../services/api';
import 'leaflet/dist/leaflet.css';

const BORDEAUX = '#7A1B2D';
const STATUS_COLORS = {
  NEW: '#7A1B2D', CONTACTED: '#A68836', APPOINTMENT: '#2E7D32',
  NOT_INTERESTED: '#666', CONVERTED: '#5A0F1E', INVALID: '#D32F2F'
};
const STATUS_LABELS = {
  NEW: 'Neu', CONTACTED: 'Kontaktiert', APPOINTMENT: 'Termin',
  NOT_INTERESTED: 'Kein Interesse', CONVERTED: 'Vertrag', INVALID: 'Ungueltig'
};
const ROLE_COLORS = {
  VERTRIEB: '#2E7D32', TEAMLEAD: '#A68836',
  STANDORTLEITUNG: '#9E3347', BACKOFFICE: '#6A5ACD', ADMIN: BORDEAUX
};
const T_COLORS = ['#7A1B2D', '#2E7D32', '#A68836', '#6A5ACD', '#D32F2F', '#0288D1'];

const mkUserIcon = (name, color) => {
  const ini = (name || '?').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  return L.divIcon({
    className: 'tm', iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20],
    html: `<div style="background:${color};width:36px;height:36px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12px">${ini}</div>`
  });
};
const mkAddrIcon = (color) => L.divIcon({
  className: 'am', iconSize: [12, 12], iconAnchor: [6, 6],
  html: `<div style="background:${color};width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`
});

const getStatus = (item) => {
  if (!item) return { label: 'Unbekannt', color: '#999', chipColor: 'default' };
  const today = new Date().toISOString().split('T')[0];
  if (!item.is_active) return { label: 'Inaktiv', color: '#999', icon: <Cancel />, chipColor: 'default' };
  if (item.valid_until < today) return { label: 'Abgelaufen', color: '#ED6C02', icon: <Schedule />, chipColor: 'warning' };
  if (item.valid_from > today) return { label: 'Geplant', color: '#0288D1', icon: <Schedule />, chipColor: 'info' };
  return { label: 'Aktiv', color: '#2E7D32', icon: <CheckCircle />, chipColor: 'success' };
};

// ====== Strassen + Hausnummern (Legacy-Gebiete) ======
const StreetList = ({ streets, totalAddresses }) => {
  if (!streets?.length) return <Alert severity="info" sx={{ m: 1 }}>Keine Adressen vorhanden.</Alert>;
  const all = streets.flatMap(s => s.addresses);
  const visited = all.filter(a => a.status && a.status !== 'NEW').length;
  const sc = {};
  all.forEach(a => { sc[a.status || 'NEW'] = (sc[a.status || 'NEW'] || 0) + 1; });

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
        <Chip label={`${totalAddresses || all.length} Adressen`} size="small" sx={{ fontWeight: 600 }} />
        <Chip label={`${visited} besucht (${all.length > 0 ? Math.round(visited / all.length * 100) : 0}%)`}
          size="small" color="info" variant="outlined" />
        {Object.entries(sc).map(([st, c]) => (
          <Chip key={st} label={`${STATUS_LABELS[st] || st}: ${c}`} size="small"
            sx={{ bgcolor: (STATUS_COLORS[st] || '#999') + '20', color: STATUS_COLORS[st] || '#999', fontWeight: 500 }} />
        ))}
      </Box>
      <LinearProgress variant="determinate" value={all.length > 0 ? (visited / all.length * 100) : 0}
        sx={{ mb: 2, height: 6, borderRadius: 3, bgcolor: '#E0D8D0', '& .MuiLinearProgress-bar': { bgcolor: '#2E7D32' } }} />
      {streets.map((street, si) => {
        const sv = street.addresses.filter(a => a.status && a.status !== 'NEW').length;
        return (
          <Card key={si} variant="outlined" sx={{ mb: 1.5 }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationOn sx={{ fontSize: 18, color: BORDEAUX }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{street.street}</Typography>
                  <Typography variant="caption" color="text.secondary">({street.postal_code} {street.city})</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Chip label={`${street.addresses.length} HNr.`} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                  <Chip label={`${sv} besucht`} size="small" sx={{ fontSize: '0.7rem', bgcolor: '#2E7D3220', color: '#2E7D32' }} />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {street.addresses.map((addr, ai) => (
                  <Tooltip key={ai} arrow title={
                    <Box>
                      <Typography variant="caption" display="block">{addr.street} {addr.house_number}</Typography>
                      {addr.contact_name && <Typography variant="caption" display="block">Kontakt: {addr.contact_name}</Typography>}
                      <Typography variant="caption" display="block">Status: {STATUS_LABELS[addr.status] || 'Neu'}</Typography>
                      {addr.total_households != null && <Typography variant="caption" display="block">WE: {addr.contacted_households || 0}/{addr.total_households}</Typography>}
                      {addr.notes && <Typography variant="caption" display="block" sx={{ fontStyle: 'italic' }}>{addr.notes}</Typography>}
                    </Box>
                  }>
                    <Chip icon={<Home sx={{ fontSize: '12px !important' }} />} label={addr.house_number || '?'} size="small"
                      sx={{ fontSize: '0.75rem', bgcolor: (STATUS_COLORS[addr.status] || STATUS_COLORS.NEW) + '20',
                        color: STATUS_COLORS[addr.status] || STATUS_COLORS.NEW, fontWeight: 500, cursor: 'default',
                        '& .MuiChip-icon': { color: 'inherit' } }} />
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

const ExpandedStreets = ({ territoryId }) => {
  const { data, isLoading, isError } = useQuery(
    ['territory-addresses', territoryId],
    () => territoryAPI.getAddresses(territoryId),
    { enabled: !!territoryId }
  );
  if (isLoading) return <Box sx={{ p: 2, textAlign: 'center' }}><CircularProgress size={24} sx={{ color: BORDEAUX }} /></Box>;
  if (isError) return <Alert severity="warning" sx={{ m: 1 }}>Adressen konnten nicht geladen werden.</Alert>;
  const r = data?.data?.data;
  if (!r?.streets?.length) return <Alert severity="info" sx={{ m: 1 }}>Keine Adressen in diesem Gebiet.</Alert>;
  return <StreetList streets={r.streets} totalAddresses={r.total_addresses} />;
};

// ====== Run-Detail: Strassen pro Vertriebler (Admin-Ansicht) ======
const RunStreetDetails = ({ runId }) => {
  const { data, isLoading, isError } = useQuery(
    ['run-addresses', runId],
    () => territoryAPI.getRunAddresses(runId),
    { enabled: !!runId }
  );

  if (isLoading) return <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress size={28} sx={{ color: BORDEAUX }} /></Box>;
  if (isError) return <Alert severity="warning" sx={{ m: 1 }}>Strassen konnten nicht geladen werden.</Alert>;

  const result = data?.data?.data;
  if (!result?.territories?.length) return <Alert severity="info" sx={{ m: 1 }}>Noch keine Zuweisungen.</Alert>;

  return (
    <Box>
      {result.territories.map((territory, tIdx) => {
        const repName = territory.rep ? `${territory.rep.first_name} ${territory.rep.last_name}` : 'Unbekannt';
        const color = T_COLORS[tIdx % T_COLORS.length];
        const st = territory.stats || {};
        const pct = st.total > 0 ? Math.round(st.visited / st.total * 100) : 0;

        return (
          <Card key={territory.id} variant="outlined" sx={{ mb: 2, borderLeft: `4px solid ${color}` }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              {/* Rep-Header mit Stats */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ bgcolor: color, width: 32, height: 32, fontSize: '0.75rem', fontWeight: 700 }}>
                    {(territory.rep?.first_name?.[0] || '') + (territory.rep?.last_name?.[0] || '')}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{repName}</Typography>
                    <Typography variant="caption" color="text.secondary">{territory.rep?.email}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  <Chip label={`${st.total || 0} Adr.`} size="small" sx={{ fontWeight: 600 }} />
                  <Chip label={`${pct}% besucht`} size="small" color="info" variant="outlined" />
                  <Chip icon={<Handshake sx={{ fontSize: '14px !important' }} />}
                    label={`${st.converted || 0} Vertraege`} size="small"
                    sx={{ bgcolor: '#5A0F1E20', color: '#5A0F1E', fontWeight: 600 }} />
                  {st.households_total > 0 && (
                    <Chip icon={<Apartment sx={{ fontSize: '14px !important' }} />}
                      label={`${st.households_contacted || 0}/${st.households_total} WE`}
                      size="small" variant="outlined" />
                  )}
                </Box>
              </Box>

              <LinearProgress variant="determinate" value={pct}
                sx={{ mb: 2, height: 5, borderRadius: 3, bgcolor: '#E0D8D0',
                  '& .MuiLinearProgress-bar': { bgcolor: color } }} />

              {/* Strassen-Tabelle */}
              {territory.streets?.length > 0 ? (
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#F5F3F0', fontSize: '0.8rem' }}>Strasse</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#F5F3F0', fontSize: '0.8rem' }}>Hausnummern</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#F5F3F0', fontSize: '0.8rem', width: 60 }}>WE</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#F5F3F0', fontSize: '0.8rem', width: 100 }}>Fortschritt</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {territory.streets.map((street, si) => {
                        const sVisited = street.addresses.filter(a => a.status !== 'NEW').length;
                        const sConverted = street.addresses.filter(a => a.status === 'CONVERTED').length;
                        const sHH = street.addresses.reduce((s, a) => s + (a.total_households || 0), 0);
                        const sPct = street.addresses.length > 0 ? Math.round(sVisited / street.addresses.length * 100) : 0;

                        return (
                          <TableRow key={si} hover>
                            <TableCell sx={{ verticalAlign: 'top', py: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <LocationOn sx={{ fontSize: 16, color }} />
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                    {street.street}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {street.postal_code} {street.city}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ py: 1 }}>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
                                {street.addresses.map((addr, ai) => (
                                  <Tooltip key={ai} arrow title={
                                    <Box sx={{ fontSize: '0.75rem' }}>
                                      <b>{addr.street} {addr.house_number}</b><br />
                                      Status: {STATUS_LABELS[addr.status] || 'Neu'}<br />
                                      {addr.total_households != null && <>WE: {addr.contacted_households || 0}/{addr.total_households}<br /></>}
                                      {addr.status === 'CONVERTED' && <>Vertrag: Ja<br /></>}
                                      {addr.contact_name && <>Kontakt: {addr.contact_name}<br /></>}
                                      {addr.notes && <i>{addr.notes}</i>}
                                    </Box>
                                  }>
                                    <Chip
                                      label={addr.house_number || '?'}
                                      size="small"
                                      sx={{
                                        fontSize: '0.7rem', height: 22, minWidth: 28,
                                        bgcolor: (STATUS_COLORS[addr.status] || STATUS_COLORS.NEW) + '20',
                                        color: STATUS_COLORS[addr.status] || STATUS_COLORS.NEW,
                                        fontWeight: 600, cursor: 'default',
                                        border: addr.status === 'CONVERTED' ? `2px solid ${STATUS_COLORS.CONVERTED}` : 'none'
                                      }}
                                    />
                                  </Tooltip>
                                ))}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ py: 1, textAlign: 'center' }}>
                              <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                                {sHH > 0 ? sHH : '-'}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ py: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <LinearProgress variant="determinate" value={sPct}
                                  sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: '#E0D8D0',
                                    '& .MuiLinearProgress-bar': { bgcolor: sConverted > 0 ? '#5A0F1E' : '#2E7D32' } }} />
                                <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 30 }}>
                                  {sPct}%
                                </Typography>
                              </Box>
                              {sConverted > 0 && (
                                <Typography variant="caption" sx={{ color: '#5A0F1E', fontWeight: 600, fontSize: '0.65rem' }}>
                                  {sConverted} Vertrag{sConverted !== 1 ? 'e' : ''}
                                </Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info" sx={{ py: 0.5 }}>Keine Strassen zugewiesen.</Alert>
              )}
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
};

// ====== Runs-Tab Komponente ======
const RunsTab = () => {
  const qc = useQueryClient();
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState(null);
  const [runForm, setRunForm] = useState({ plz: '', rep_ids: [], valid_from: '', valid_until: '' });

  const { data: runsData, isLoading: runsLoading } = useQuery('territory-runs', () => territoryAPI.getRuns());
  const { data: pData } = useQuery('available-plz', () => territoryAPI.getAvailablePLZ());
  const { data: uData } = useQuery('users-for-runs', () => userAPI.getAll());

  const availablePLZ = pData?.data?.data || [];
  const reps = (uData?.data?.data || []).filter(u => u.role === 'VERTRIEB' && u.is_active);
  const runs = runsData?.data?.data || [];

  const createRunM = useMutation(d => territoryAPI.createRun(d), {
    onSuccess: () => { qc.invalidateQueries('territory-runs'); setRunDialogOpen(false); }
  });
  const assignRunM = useMutation(id => territoryAPI.assignRun(id), {
    onSuccess: () => qc.invalidateQueries('territory-runs')
  });
  const activateRunM = useMutation(id => territoryAPI.activateRun(id), {
    onSuccess: () => qc.invalidateQueries('territory-runs')
  });
  const deleteRunM = useMutation(id => territoryAPI.deleteRun(id), {
    onSuccess: () => qc.invalidateQueries('territory-runs')
  });

  const openCreateRun = () => {
    const t = new Date().toISOString().split('T')[0];
    const e = new Date(Date.now() + 14 * 864e5).toISOString().split('T')[0];
    setRunForm({ plz: '', rep_ids: [], valid_from: t, valid_until: e });
    setRunDialogOpen(true);
  };

  const RUN_STATUS = {
    draft: { label: 'Entwurf', color: '#A68836', icon: <Edit sx={{ fontSize: 14 }} /> },
    active: { label: 'Aktiv', color: '#2E7D32', icon: <CheckCircle sx={{ fontSize: 14 }} /> },
    archived: { label: 'Archiviert', color: '#999', icon: <Archive sx={{ fontSize: 14 }} /> }
  };

  if (runsLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: BORDEAUX }} /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Territory Runs ({runs.length})</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openCreateRun}
          sx={{ bgcolor: BORDEAUX, '&:hover': { bgcolor: '#5A0F1E' } }}>Neuer Run</Button>
      </Box>

      {runs.length === 0 ? (
        <Alert severity="info">Noch keine Runs erstellt. Erstellen Sie einen Run um PLZ automatisch zuzuteilen.</Alert>
      ) : runs.map(run => {
        const st = RUN_STATUS[run.status] || RUN_STATUS.draft;
        const territories = run.territories || [];
        const isExp = expandedRunId === run.id;

        return (
          <Card key={run.id} sx={{ mb: 2, borderLeft: `4px solid ${st.color}` }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: isExp ? 0 : 2.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>PLZ {run.plz}</Typography>
                    <Chip icon={st.icon} label={st.label} size="small"
                      sx={{ bgcolor: st.color + '20', color: st.color, fontWeight: 600 }} />
                    <Chip label={`${run.num_reps} Reps`} size="small" variant="outlined" />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {run.valid_from ? new Date(run.valid_from).toLocaleDateString('de-DE') : '?'} - {run.valid_until ? new Date(run.valid_until).toLocaleDateString('de-DE') : '?'}
                    {run.createdBy && ` | Erstellt von ${run.createdBy.first_name} ${run.createdBy.last_name}`}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {territories.length > 0 && (
                    <Tooltip title="Strassen-Details">
                      <IconButton size="small" onClick={() => setExpandedRunId(isExp ? null : run.id)} sx={{ color: BORDEAUX }}>
                        {isExp ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </Tooltip>
                  )}
                  {run.status === 'draft' && (
                    <>
                      <Tooltip title="Auto-Zuteilen">
                        <IconButton size="small" onClick={() => assignRunM.mutate(run.id)}
                          disabled={assignRunM.isLoading} sx={{ color: '#A68836' }}>
                          {assignRunM.isLoading ? <CircularProgress size={18} /> : <AutoAwesome fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Aktivieren">
                        <IconButton size="small" onClick={() => activateRunM.mutate(run.id)}
                          disabled={territories.length === 0 || activateRunM.isLoading} sx={{ color: '#2E7D32' }}>
                          <PlayArrow fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                  {run.status !== 'active' && (
                    <Tooltip title="Loeschen">
                      <IconButton size="small" color="error" onClick={() => {
                        if (window.confirm('Run wirklich loeschen?')) deleteRunM.mutate(run.id);
                      }}><Delete fontSize="small" /></IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>

              {/* Zuweisungen */}
              {territories.length > 0 && (
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Zuweisungen:</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                    {territories.map((t, i) => (
                      <Chip key={t.id} size="small"
                        avatar={<Avatar sx={{ bgcolor: T_COLORS[i % T_COLORS.length], width: 22, height: 22, fontSize: '0.6rem' }}>
                          {(t.rep?.first_name?.[0] || '') + (t.rep?.last_name?.[0] || '')}
                        </Avatar>}
                        label={`${t.rep?.first_name || ''} ${t.rep?.last_name || ''} (${parseFloat(t.weight || 0).toFixed(0)})`}
                        sx={{ fontWeight: 500 }} />
                    ))}
                  </Box>
                </Box>
              )}

              {/* Karte - deutlichere Gebiete */}
              {territories.length > 0 && territories.some(t => t.polygon_json) && (
                <Box sx={{ mt: 2, borderRadius: 1, overflow: 'hidden', height: 300 }}>
                  <MapContainer
                    center={(() => {
                      try {
                        const first = territories.find(t => t.bounds_json);
                        if (first) {
                          const b = typeof first.bounds_json === 'string' ? JSON.parse(first.bounds_json) : first.bounds_json;
                          return [(b.north + b.south) / 2, (b.east + b.west) / 2];
                        }
                      } catch {}
                      return [52.52, 13.405];
                    })()}
                    zoom={14} style={{ height: 300, width: '100%' }} scrollWheelZoom>
                    <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {territories.map((t, i) => {
                      try {
                        const poly = typeof t.polygon_json === 'string' ? JSON.parse(t.polygon_json) : t.polygon_json;
                        if (!poly) return null;
                        const c = T_COLORS[i % T_COLORS.length];
                        return (
                          <GeoJSON key={`${t.id}-${i}`} data={poly}
                            style={{ color: c, weight: 5, fillOpacity: 0.3, fillColor: c, opacity: 1 }}>
                            <Popup>
                              <b style={{ fontSize: '14px' }}>{t.rep?.first_name} {t.rep?.last_name}</b><br />
                              Gewicht: {parseFloat(t.weight || 0).toFixed(0)}
                            </Popup>
                          </GeoJSON>
                        );
                      } catch { return null; }
                    })}
                  </MapContainer>
                </Box>
              )}
            </CardContent>

            {/* Expandiert: Strassen pro Vertriebler */}
            <Collapse in={isExp}>
              <Divider />
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Home sx={{ fontSize: 22, color: BORDEAUX }} />
                  Strassen & Hausnummern pro Vertriebler
                </Typography>
                <RunStreetDetails runId={run.id} />
              </CardContent>
            </Collapse>
          </Card>
        );
      })}

      {/* Run-Erstellen-Dialog */}
      <Dialog open={runDialogOpen} onClose={() => setRunDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Neuen Run erstellen</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Autocomplete
              options={availablePLZ.map(p => p.plz)}
              value={runForm.plz || null}
              onChange={(e, v) => setRunForm({ ...runForm, plz: v || '' })}
              getOptionLabel={o => { const m = availablePLZ.find(p => p.plz === o); return m ? `${o} (${m.city})` : o; }}
              renderInput={p => <TextField {...p} label="PLZ" required />}
              freeSolo
            />
            <Autocomplete
              multiple
              options={reps.map(r => r.id)}
              value={runForm.rep_ids}
              onChange={(e, v) => setRunForm({ ...runForm, rep_ids: v })}
              getOptionLabel={id => { const r = reps.find(u => u.id === id); return r ? `${r.first_name} ${r.last_name}` : `#${id}`; }}
              renderTags={(val, gtp) => val.map((id, i) => {
                const r = reps.find(u => u.id === id);
                return <Chip key={id} label={r ? `${r.first_name} ${r.last_name}` : `#${id}`} size="small"
                  sx={{ bgcolor: `${BORDEAUX}15`, color: BORDEAUX }} {...gtp({ index: i })} />;
              })}
              renderInput={p => <TextField {...p} label="Vertriebler" required helperText={`${reps.length} verfuegbar`} />}
              renderOption={(props, id) => {
                const r = reps.find(u => u.id === id);
                return <li {...props} key={id}>{r ? `${r.first_name} ${r.last_name} (${r.email})` : `#${id}`}</li>;
              }}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Gueltig ab" type="date" value={runForm.valid_from}
                onChange={e => setRunForm({ ...runForm, valid_from: e.target.value })} fullWidth required InputLabelProps={{ shrink: true }} />
              <TextField label="Gueltig bis" type="date" value={runForm.valid_until}
                onChange={e => setRunForm({ ...runForm, valid_until: e.target.value })} fullWidth required InputLabelProps={{ shrink: true }} />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRunDialogOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={() => { if (runForm.plz && runForm.rep_ids.length > 0) createRunM.mutate(runForm); }}
            disabled={createRunM.isLoading || !runForm.plz || runForm.rep_ids.length === 0}
            sx={{ bgcolor: BORDEAUX, '&:hover': { bgcolor: '#5A0F1E' } }}>
            {createRunM.isLoading ? <CircularProgress size={20} color="inherit" /> : 'Run erstellen'}
          </Button>
        </DialogActions>
      </Dialog>

      {(createRunM.isError || assignRunM.isError || activateRunM.isError || deleteRunM.isError) && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {createRunM.error?.response?.data?.error || assignRunM.error?.response?.data?.error ||
           activateRunM.error?.response?.data?.error || deleteRunM.error?.response?.data?.error || 'Fehler'}
        </Alert>
      )}
    </Box>
  );
};

// ====== Haupt-Komponente ======
const TerritoryManagementPage = () => {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [plzSearch, setPlzSearch] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [form, setForm] = useState({
    assigned_to_user_id: '', postal_codes: [], name: '',
    valid_from: '', valid_until: '', rotation_days: 14, notes: ''
  });

  const { data: aData, isLoading, isError, error } = useQuery('territory-assignments', () => territoryAPI.getAll(), { retry: 2 });
  const { data: uData } = useQuery('users-for-territory', () => userAPI.getAll());
  const { data: pData } = useQuery('available-plz', () => territoryAPI.getAvailablePLZ());
  const { data: tData } = useQuery('team-locations-map', () => userAPI.getTeamLocations(), { refetchInterval: 30000, enabled: showMap });

  const availablePLZ = pData?.data?.data || [];
  const assignments = aData?.data?.data || [];
  const users = (uData?.data?.data || []).filter(u => ['STANDORTLEITUNG', 'TEAMLEAD'].includes(u.role));
  const teamMembers = (tData?.data?.data || []).filter(m => m.last_latitude && m.last_longitude);

  const filtered = useMemo(() => {
    if (!plzSearch.trim()) return assignments;
    const s = plzSearch.trim().toLowerCase();
    return assignments.filter(a => {
      const codes = Array.isArray(a.postal_codes) ? a.postal_codes : (a.postal_codes || '').split(',');
      return codes.some(c => c.trim().includes(s)) || (a.name || '').toLowerCase().includes(s);
    });
  }, [assignments, plzSearch]);

  const stats = useMemo(() => {
    const active = assignments.filter(a => getStatus(a).label === 'Aktiv').length;
    const plzSet = new Set(assignments.flatMap(a =>
      (Array.isArray(a.postal_codes) ? a.postal_codes : (a.postal_codes || '').split(',')).filter(Boolean).map(c => c.trim())
    ));
    const spSet = new Set(assignments.flatMap(a => (a.salespersonTerritories || []).map(sp => sp.salesperson_user_id)));
    return { total: assignments.length, active, plz: plzSet.size, sp: spSet.size };
  }, [assignments]);

  const mapItems = plzSearch ? filtered : assignments;
  const mapIds = mapItems.map(a => a.id);
  const { data: addrData, isLoading: addrLoading } = useQuery(
    ['territory-addresses-all', mapIds.join(',')],
    () => Promise.all(mapItems.map(a => territoryAPI.getAddresses(a.id).catch(() => null))),
    { enabled: showMap && mapItems.length > 0 }
  );

  const { allAddrs, mapBounds } = useMemo(() => {
    const addrs = []; const bds = [];
    (addrData || []).forEach((res, idx) => {
      const d = res?.data?.data; if (!d) return;
      const asgn = mapItems[idx];
      (d.streets || []).forEach(st => st.addresses.forEach(addr => {
        if (addr.latitude && addr.longitude) addrs.push({ ...addr, tName: asgn?.name || `Gebiet #${asgn?.id}` });
      }));
      const gc = (d.streets || []).flatMap(s => s.addresses).filter(a => a.latitude && a.longitude);
      if (gc.length > 0) {
        const la = gc.map(a => parseFloat(a.latitude)), lo = gc.map(a => parseFloat(a.longitude));
        bds.push({ name: asgn?.name || `#${asgn?.id}`, assignedTo: asgn?.assignedTo,
          b: [[Math.min(...la) - .002, Math.min(...lo) - .002], [Math.max(...la) + .002, Math.max(...lo) + .002]] });
      }
    });
    return { allAddrs: addrs, mapBounds: bds };
  }, [addrData, mapItems]);

  const center = allAddrs.length > 0
    ? [allAddrs.reduce((s, a) => s + parseFloat(a.latitude), 0) / allAddrs.length,
       allAddrs.reduce((s, a) => s + parseFloat(a.longitude), 0) / allAddrs.length]
    : [52.52, 13.405];

  const createM = useMutation(d => territoryAPI.create(d), { onSuccess: () => { qc.invalidateQueries('territory-assignments'); closeDialog(); } });
  const updateM = useMutation(({ id, d }) => territoryAPI.update(id, d), { onSuccess: () => { qc.invalidateQueries('territory-assignments'); closeDialog(); } });
  const deleteM = useMutation(id => territoryAPI.delete(id), { onSuccess: () => qc.invalidateQueries('territory-assignments') });

  const openCreate = () => {
    setEditItem(null);
    const t = new Date().toISOString().split('T')[0];
    const e = new Date(Date.now() + 14 * 864e5).toISOString().split('T')[0];
    setForm({ assigned_to_user_id: '', postal_codes: [], name: '', valid_from: t, valid_until: e, rotation_days: 14, notes: '' });
    setDialogOpen(true);
  };
  const openEdit = (item) => {
    setEditItem(item);
    const pc = Array.isArray(item.postal_codes) ? item.postal_codes : (item.postal_codes || '').split(',').map(s => s.trim()).filter(Boolean);
    setForm({ assigned_to_user_id: item.assigned_to_user_id, postal_codes: pc, name: item.name || '',
      valid_from: item.valid_from, valid_until: item.valid_until, rotation_days: item.rotation_days || 14, notes: item.notes || '' });
    setDialogOpen(true);
  };
  const closeDialog = () => { setDialogOpen(false); setEditItem(null); };
  const handleSubmit = () => { if (editItem) updateM.mutate({ id: editItem.id, d: form }); else createM.mutate(form); };
  const handleDelete = (id) => { if (window.confirm('Gebietszuweisung wirklich loeschen?')) deleteM.mutate(id); };

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: BORDEAUX }} /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          <Map sx={{ mr: 1, verticalAlign: 'middle', color: BORDEAUX }} />Gebietsverwaltung
        </Typography>
        {activeTab === 0 && (
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}
            sx={{ bgcolor: BORDEAUX, '&:hover': { bgcolor: '#5A0F1E' } }}>Neues Gebiet</Button>
        )}
      </Box>

      <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3,
        '& .MuiTab-root': { fontWeight: 600 },
        '& .Mui-selected': { color: BORDEAUX },
        '& .MuiTabs-indicator': { bgcolor: BORDEAUX }
      }}>
        <Tab label="Gebiete" />
        <Tab label="Auto-Runs" icon={<AutoAwesome sx={{ fontSize: 18 }} />} iconPosition="start" />
      </Tabs>

      {activeTab === 1 && <RunsTab />}

      {activeTab === 0 && (<>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { v: stats.total, l: 'Gebiete gesamt', c: BORDEAUX },
          { v: stats.active, l: 'Aktive Gebiete', c: '#2E7D32' },
          { v: stats.plz, l: 'PLZ-Gebiete', c: '#A68836' },
          { v: stats.sp, l: 'Vertriebler', c: '#6A5ACD' }
        ].map((s, i) => (
          <Grid item xs={6} sm={3} key={i}>
            <Card><CardContent sx={{ p: 2, textAlign: 'center', '&:last-child': { pb: 2 } }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: s.c }}>{s.v}</Typography>
              <Typography variant="body2" color="text.secondary">{s.l}</Typography>
            </CardContent></Card>
          </Grid>
        ))}
      </Grid>

      {isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Gebiete konnten nicht geladen werden.{error?.response?.data?.error && ` (${error.response.data.error})`}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField fullWidth size="small" placeholder="PLZ oder Gebietsname suchen..."
              value={plzSearch} onChange={(e) => setPlzSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: BORDEAUX }} /></InputAdornment> }}
              sx={{ '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: BORDEAUX } }} />
            <FormControlLabel
              control={<Switch checked={showMap} onChange={(e) => setShowMap(e.target.checked)}
                sx={{ '& .Mui-checked': { color: BORDEAUX }, '& .Mui-checked+.MuiSwitch-track': { bgcolor: BORDEAUX } }} />}
              label={<Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>Karte</Typography>} />
          </Box>
          {plzSearch && (
            <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">{filtered.length} von {assignments.length} Gebieten</Typography>
              <Button size="small" onClick={() => setPlzSearch('')} sx={{ color: BORDEAUX, ml: 'auto' }}>Zuruecksetzen</Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {showMap && (
        <Card sx={{ mb: 3, overflow: 'hidden' }}>
          {addrLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: BORDEAUX }} /></Box>
          ) : (
            <>
              <MapContainer key={`m-${center[0].toFixed(3)}-${center[1].toFixed(3)}`}
                center={center} zoom={allAddrs.length > 0 ? 14 : 11}
                style={{ height: 450, width: '100%' }} scrollWheelZoom>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {mapBounds.map((tb, i) => (
                  <Rectangle key={i} bounds={tb.b} pathOptions={{
                    color: T_COLORS[i % T_COLORS.length], weight: 5, fillOpacity: 0.2, dashArray: '8,4', opacity: 1
                  }}>
                    <Popup><b>{tb.name}</b>{tb.assignedTo && <div>{tb.assignedTo.first_name} {tb.assignedTo.last_name}</div>}</Popup>
                  </Rectangle>
                ))}
                {allAddrs.map((a, i) => (
                  <Marker key={`a${i}`} position={[parseFloat(a.latitude), parseFloat(a.longitude)]}
                    icon={mkAddrIcon(STATUS_COLORS[a.status] || STATUS_COLORS.NEW)}>
                    <Popup><b>{a.street} {a.house_number}</b><br />{a.postal_code} {a.city}</Popup>
                  </Marker>
                ))}
                {teamMembers.map(m => {
                  const n = `${m.first_name || ''} ${m.last_name || ''}`.trim();
                  const on = m.last_location_at && (Date.now() - new Date(m.last_location_at).getTime()) < 6e5;
                  return (
                    <Marker key={`u${m.id}`} position={[parseFloat(m.last_latitude), parseFloat(m.last_longitude)]}
                      icon={mkUserIcon(n, on ? (ROLE_COLORS[m.role] || BORDEAUX) : '#999')}>
                      <Popup><b>{n}</b><br />{on ? 'Online' : 'Offline'}</Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
              <Box sx={{ display: 'flex', gap: 1, p: 1.5, flexWrap: 'wrap', bgcolor: '#F5F3F0' }}>
                <Chip icon={<Groups sx={{ fontSize: '14px !important' }} />} label={`${teamMembers.length} Mitglieder`} size="small" />
                <Chip label={`${allAddrs.length} Adressen`} size="small" variant="outlined" />
                <Chip label={`${mapBounds.length} Gebiete`} size="small" variant="outlined" />
              </Box>
            </>
          )}
        </Card>
      )}

      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Gebiete ({filtered.length})</Typography>

      {filtered.length === 0 ? (
        <Alert severity="info">{plzSearch ? `Keine Gebiete fuer "${plzSearch}".` : 'Noch keine Gebiete zugewiesen.'}</Alert>
      ) : filtered.map((item) => {
        const isExp = expandedId === item.id;
        const plzList = (Array.isArray(item.postal_codes) ? item.postal_codes : (item.postal_codes || '').split(',')).filter(Boolean);
        const st = getStatus(item);
        const who = item.assignedTo;
        const whoName = who ? `${who.first_name || ''} ${who.last_name || ''}`.trim() || who.email : 'Unbekannt';
        const roleL = who?.role === 'STANDORTLEITUNG' ? 'Standortleitung' : 'Teamleiter';
        const spCount = (item.salespersonTerritories || []).length;
        const daysLeft = item.valid_until ? Math.ceil((new Date(item.valid_until) - new Date()) / 864e5) : null;

        return (
          <Card key={item.id} sx={{ mb: 2, borderLeft: `4px solid ${st.color}`, '&:hover': { boxShadow: 3 } }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: isExp ? 0 : 2.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5, flexWrap: 'wrap' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                      {item.name || `Gebiet #${item.id}`}
                    </Typography>
                    <Chip icon={st.icon} label={st.label} size="small" color={st.chipColor} sx={{ fontWeight: 600 }} />
                    {daysLeft != null && daysLeft > 0 && daysLeft <= 7 && st.label === 'Aktiv' && (
                      <Chip label={`Noch ${daysLeft} Tage`} size="small" color="warning" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {whoName} <Typography component="span" variant="caption" color="text.disabled">({roleL})</Typography>
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CalendarMonth sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {item.valid_from ? new Date(item.valid_from).toLocaleDateString('de-DE') : '?'} - {item.valid_until ? new Date(item.valid_until).toLocaleDateString('de-DE') : '?'}
                      </Typography>
                    </Box>
                    {spCount > 0 && (
                      <Badge badgeContent={spCount} sx={{ '& .MuiBadge-badge': { bgcolor: '#2E7D32', color: '#fff' } }}>
                        <Chip icon={<Groups sx={{ fontSize: '14px !important' }} />} label="Vertriebler" size="small" variant="outlined" sx={{ fontSize: '0.75rem' }} />
                      </Badge>
                    )}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                  <Tooltip title="Strassen anzeigen">
                    <IconButton size="small" onClick={() => setExpandedId(isExp ? null : item.id)} sx={{ color: BORDEAUX }}>
                      {isExp ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Auf Karte zeigen">
                    <IconButton size="small" onClick={() => { setPlzSearch(plzList[0] || ''); setShowMap(true); }} sx={{ color: '#0288D1' }}>
                      <Visibility fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Bearbeiten">
                    <IconButton size="small" onClick={() => openEdit(item)}><Edit fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title="Loeschen">
                    <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}><Delete fontSize="small" /></IconButton>
                  </Tooltip>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: spCount > 0 ? 1.5 : 0 }}>
                {plzList.map((plz, i) => (
                  <Chip key={i} label={plz.trim()} size="small"
                    sx={{ bgcolor: `${BORDEAUX}12`, color: BORDEAUX, fontWeight: 500, fontSize: '0.8rem' }} />
                ))}
              </Box>

              {spCount > 0 && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">Vertriebler:</Typography>
                  {(item.salespersonTerritories || []).map(sp => {
                    const n = `${sp.salesperson?.first_name || ''} ${sp.salesperson?.last_name || ''}`.trim();
                    return (
                      <Chip key={sp.id} size="small"
                        avatar={<Avatar sx={{ bgcolor: sp.is_active ? '#2E7D32' : '#999', width: 22, height: 22, fontSize: '0.6rem' }}>
                          {(sp.salesperson?.first_name?.[0] || '') + (sp.salesperson?.last_name?.[0] || '')}
                        </Avatar>}
                        label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>{n}
                          <FiberManualRecord sx={{ fontSize: 8, color: sp.is_active ? '#2E7D32' : '#999' }} />
                        </Box>}
                        sx={{ bgcolor: sp.is_active ? '#2E7D3212' : '#99999920', fontWeight: 500 }} />
                    );
                  })}
                </Box>
              )}
            </CardContent>

            <Collapse in={isExp}>
              <Divider />
              <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                  <Home sx={{ mr: 0.5, verticalAlign: 'middle', fontSize: 20, color: BORDEAUX }} />Strassen & Hausnummern
                </Typography>
                <ExpandedStreets territoryId={item.id} />
              </CardContent>
            </Collapse>
          </Card>
        );
      })}

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>{editItem ? 'Gebiet bearbeiten' : 'Neues Gebiet zuweisen'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {!editItem && (
              <TextField select label="Zuweisen an" value={form.assigned_to_user_id}
                onChange={e => setForm({ ...form, assigned_to_user_id: e.target.value })} fullWidth required>
                {users.map(u => (
                  <MenuItem key={u.id} value={u.id}>
                    {`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email} ({u.role === 'STANDORTLEITUNG' ? 'SL' : 'TL'})
                  </MenuItem>
                ))}
                {users.length === 0 && <MenuItem disabled>Keine Standortleiter/Teamleiter</MenuItem>}
              </TextField>
            )}
            <TextField label="Gebietsname" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="z.B. Berlin Mitte Nord" fullWidth />
            <Autocomplete multiple freeSolo options={availablePLZ.map(p => p.plz)} value={form.postal_codes}
              onChange={(e, v) => setForm({ ...form, postal_codes: v })}
              getOptionLabel={o => { const m = availablePLZ.find(p => p.plz === o); return m ? `${o} (${m.city})` : o; }}
              renderTags={(val, gtp) => val.map((plz, i) => {
                const m = availablePLZ.find(p => p.plz === plz);
                return <Chip key={plz} label={m ? `${plz} - ${m.city}` : plz} size="small"
                  sx={{ bgcolor: `${BORDEAUX}15`, color: BORDEAUX, fontWeight: 500 }} {...gtp({ index: i })} />;
              })}
              renderInput={p => <TextField {...p} label="PLZ-Gebiete" placeholder={form.postal_codes.length === 0 ? 'PLZ + Enter...' : ''}
                required helperText={availablePLZ.length > 0 ? `${availablePLZ.length} PLZ verfuegbar` : 'PLZ eingeben + Enter'} />} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Gueltig ab" type="date" value={form.valid_from}
                onChange={e => setForm({ ...form, valid_from: e.target.value })} fullWidth required InputLabelProps={{ shrink: true }} />
              <TextField label="Gueltig bis" type="date" value={form.valid_until}
                onChange={e => setForm({ ...form, valid_until: e.target.value })} fullWidth required InputLabelProps={{ shrink: true }} />
            </Box>
            <TextField label="Rotationsintervall (Tage)" type="number" value={form.rotation_days}
              onChange={e => setForm({ ...form, rotation_days: parseInt(e.target.value) || 14 })} fullWidth />
            <TextField label="Notizen" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              multiline rows={2} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialog}>Abbrechen</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={createM.isLoading || updateM.isLoading}
            sx={{ bgcolor: BORDEAUX, '&:hover': { bgcolor: '#5A0F1E' } }}>
            {createM.isLoading || updateM.isLoading ? <CircularProgress size={20} color="inherit" /> : editItem ? 'Speichern' : 'Zuweisen'}
          </Button>
        </DialogActions>
      </Dialog>

      {(createM.isError || updateM.isError || deleteM.isError) && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {createM.error?.response?.data?.error || updateM.error?.response?.data?.error || deleteM.error?.response?.data?.error || 'Fehler'}
        </Alert>
      )}
      </>)}
    </Box>
  );
};

export default TerritoryManagementPage;
