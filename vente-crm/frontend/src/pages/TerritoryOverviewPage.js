import React, { useState, useMemo } from 'react';
import { useQuery, useQueries, useMutation, useQueryClient } from 'react-query';
import {
  Box, Typography, Button, Card, CardContent, CircularProgress, Alert,
  Chip, Accordion, AccordionSummary, AccordionDetails, Table, TableBody,
  TableCell, TableHead, TableRow, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, IconButton, Tooltip, Autocomplete,
  Avatar, Grid, Divider
} from '@mui/material';
import {
  ExpandMore, Map, Person, Assignment, Delete, LocationOn, Home, Schedule,
  AutoAwesome, PlayArrow, CheckCircle, GridView, Groups
} from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup, Rectangle, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { territoryAPI, userAPI } from '../services/api';
import 'leaflet/dist/leaflet.css';

const BORDEAUX = '#7A1B2D';
const T_COLORS = ['#7A1B2D', '#2E7D32', '#A68836', '#6A5ACD', '#D32F2F', '#0288D1', '#E91E63', '#00BCD4'];

const STATUS_LABELS = {
  NEW: 'Neu', CONTACTED: 'Kontaktiert', APPOINTMENT: 'Termin',
  NOT_INTERESTED: 'Kein Interesse', CONVERTED: 'Konvertiert', INVALID: 'Ungueltig'
};
const STATUS_COLORS = {
  NEW: '#7A1B2D', CONTACTED: '#A68836', APPOINTMENT: '#2E7D32',
  NOT_INTERESTED: '#666', CONVERTED: '#5A0F1E', INVALID: '#D32F2F'
};

const mkAddrIcon = (color) => L.divIcon({
  className: 'am', iconSize: [10, 10], iconAnchor: [5, 5],
  html: `<div style="background:${color};width:10px;height:10px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3)"></div>`
});

const RUN_STATUS = {
  draft: { label: 'Entwurf', color: '#A68836' },
  active: { label: 'Aktiv', color: '#2E7D32' },
  archived: { label: 'Archiviert', color: '#999' }
};

const TerritoryOverviewPage = () => {
  const queryClient = useQueryClient();
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [runForm, setRunForm] = useState({ plz: '', rep_ids: [], valid_from: '', valid_until: '' });
  const [selectedRunId, setSelectedRunId] = useState(null);

  // Daten laden
  const { data: assignmentsData, isLoading } = useQuery(
    'my-territory-assignments', () => territoryAPI.getMyAssignments()
  );
  const { data: usersData } = useQuery('team-users', () => userAPI.getAll());
  const { data: runsData, isLoading: runsLoading } = useQuery(
    'territory-runs', () => territoryAPI.getRuns()
  );

  const assignments = assignmentsData?.data?.data || [];
  const allUsers = usersData?.data?.data || [];
  const salespersons = allUsers.filter(u => u.role === 'VERTRIEB' && u.is_active);
  const runs = runsData?.data?.data || [];

  // Alle PLZs aus eigenen Gebieten
  const myPostalCodes = useMemo(() => {
    const codes = new Set();
    assignments.forEach(a => {
      const pc = Array.isArray(a.postal_codes) ? a.postal_codes : (a.postal_codes || '').split(',');
      pc.forEach(c => { if (c.trim()) codes.add(c.trim()); });
    });
    return [...codes];
  }, [assignments]);

  // Runs filtern die zu meinen PLZs gehoeren
  const myRuns = useMemo(() =>
    runs.filter(r => myPostalCodes.includes(r.plz)),
    [runs, myPostalCodes]
  );

  // Adressen fuer jede PLZ laden (fuer Karte)
  const territoryQueryResults = useQueries(
    assignments.map(a => ({
      queryKey: ['territory-addresses', a.id],
      queryFn: () => territoryAPI.getAddresses(a.id),
      enabled: !!a.id
    }))
  );

  // Alle Adressen zusammenfuehren fuer die Karte
  const { allAddresses, mapCenter, addrByPlz } = useMemo(() => {
    const addrs = [];
    const byPlz = {};
    territoryQueryResults.forEach((res, idx) => {
      const d = res?.data?.data?.data;
      if (!d) return;
      const assignment = assignments[idx];
      const pcs = Array.isArray(assignment?.postal_codes) ? assignment.postal_codes
        : (assignment?.postal_codes || '').split(',').map(s => s.trim());
      (d.streets || []).forEach(st => st.addresses.forEach(addr => {
        addrs.push(addr);
        pcs.forEach(p => {
          if (addr.postal_code === p) {
            if (!byPlz[p]) byPlz[p] = [];
            byPlz[p].push(addr);
          }
        });
      }));
    });
    const geo = addrs.filter(a => a.latitude && a.longitude);
    const center = geo.length > 0
      ? [geo.reduce((s, a) => s + parseFloat(a.latitude), 0) / geo.length,
         geo.reduce((s, a) => s + parseFloat(a.longitude), 0) / geo.length]
      : [52.52, 13.405];
    return { allAddresses: addrs, mapCenter: center, addrByPlz: byPlz };
  }, [territoryQueryResults, assignments]);

  // Mutations
  const createRunM = useMutation(d => territoryAPI.createRun(d), {
    onSuccess: () => { queryClient.invalidateQueries('territory-runs'); setRunDialogOpen(false); }
  });
  const assignRunM = useMutation(id => territoryAPI.assignRun(id), {
    onSuccess: () => queryClient.invalidateQueries('territory-runs')
  });
  const activateRunM = useMutation(id => territoryAPI.activateRun(id), {
    onSuccess: () => queryClient.invalidateQueries('territory-runs')
  });
  const deleteRunM = useMutation(id => territoryAPI.deleteRun(id), {
    onSuccess: () => queryClient.invalidateQueries('territory-runs')
  });

  const openRunDialog = (plz) => {
    const t = new Date().toISOString().split('T')[0];
    const e = new Date(Date.now() + 14 * 864e5).toISOString().split('T')[0];
    setRunForm({ plz: plz || '', rep_ids: [], valid_from: t, valid_until: e });
    setRunDialogOpen(true);
  };

  const handleCreateRun = () => {
    if (!runForm.plz || runForm.rep_ids.length === 0) return;
    createRunM.mutate(runForm);
  };

  // Aktive Run-Polygone fuer die Karte
  const runPolygons = useMemo(() => {
    const polys = [];
    myRuns.forEach(run => {
      (run.territories || []).forEach((t, i) => {
        try {
          const poly = typeof t.polygon_json === 'string' ? JSON.parse(t.polygon_json) : t.polygon_json;
          if (poly) polys.push({ polygon: poly, rep: t.rep, plz: run.plz, runId: run.id,
            color: T_COLORS[i % T_COLORS.length], status: run.status, weight: t.weight });
        } catch { /* ignore */ }
      });
    });
    return polys;
  }, [myRuns]);

  // Statistik
  const totalAddresses = allAddresses.length;
  const totalReps = new Set(myRuns.flatMap(r => (r.territories || []).map(t => t.rep_user_id))).size;
  const activeRuns = myRuns.filter(r => r.status === 'active').length;

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: BORDEAUX }} /></Box>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          <Map sx={{ mr: 1, verticalAlign: 'middle', color: BORDEAUX }} />Meine Gebiete
        </Typography>
        <Button variant="contained" startIcon={<GridView />} onClick={() => openRunDialog('')}
          sx={{ bgcolor: BORDEAUX, '&:hover': { bgcolor: '#5A0F1E' } }}>
          Gebiet aufteilen
        </Button>
      </Box>

      {assignments.length === 0 ? (
        <Alert severity="info">
          Ihnen wurden noch keine Gebiete zugewiesen. Bitte wenden Sie sich an den Administrator.
        </Alert>
      ) : (<>

      {/* Statistik */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { v: myPostalCodes.length, l: 'PLZ-Gebiete', c: BORDEAUX },
          { v: totalAddresses, l: 'Adressen gesamt', c: '#A68836' },
          { v: totalReps, l: 'Vertriebler aktiv', c: '#2E7D32' },
          { v: activeRuns, l: 'Aktive Aufteilungen', c: '#6A5ACD' }
        ].map((s, i) => (
          <Grid item xs={6} sm={3} key={i}>
            <Card><CardContent sx={{ p: 2, textAlign: 'center', '&:last-child': { pb: 2 } }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: s.c }}>{s.v}</Typography>
              <Typography variant="body2" color="text.secondary">{s.l}</Typography>
            </CardContent></Card>
          </Grid>
        ))}
      </Grid>

      {/* Karte mit allen Adressen + Quadraten */}
      <Card sx={{ mb: 3, overflow: 'hidden' }}>
        <CardContent sx={{ p: 0 }}>
          <MapContainer center={mapCenter} zoom={allAddresses.length > 0 ? 14 : 11}
            style={{ height: 450, width: '100%' }} scrollWheelZoom>
            <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {/* Quadrat-Polygone aus Runs */}
            {runPolygons.map((tp, i) => (
              <GeoJSON key={`tp-${tp.runId}-${i}`} data={tp.polygon}
                style={{
                  color: tp.color, weight: 3,
                  fillOpacity: tp.status === 'active' ? 0.15 : 0.08,
                  fillColor: tp.color,
                  dashArray: tp.status === 'draft' ? '8,4' : undefined
                }}>
                <Popup>
                  <b>{tp.rep ? `${tp.rep.first_name} ${tp.rep.last_name}` : 'Nicht zugewiesen'}</b><br />
                  PLZ {tp.plz} | {parseFloat(tp.weight || 0).toFixed(0)} Haushalte<br />
                  Status: {RUN_STATUS[tp.status]?.label || tp.status}
                </Popup>
              </GeoJSON>
            ))}

            {/* Adress-Marker */}
            {allAddresses.filter(a => a.latitude && a.longitude).map((a, i) => (
              <Marker key={`a${i}`} position={[parseFloat(a.latitude), parseFloat(a.longitude)]}
                icon={mkAddrIcon(STATUS_COLORS[a.status] || STATUS_COLORS.NEW)}>
                <Popup><b>{a.street} {a.house_number}</b><br />{a.postal_code} {a.city}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </CardContent>
        <Box sx={{ display: 'flex', gap: 1, p: 1.5, flexWrap: 'wrap', bgcolor: '#F5F3F0' }}>
          <Chip label={`${allAddresses.length} Adressen`} size="small" />
          <Chip label={`${runPolygons.length} Quadrate`} size="small" variant="outlined" />
          {myPostalCodes.map(plz => (
            <Chip key={plz} icon={<LocationOn sx={{ fontSize: '14px !important' }} />}
              label={plz} size="small" sx={{ bgcolor: `${BORDEAUX}15`, color: BORDEAUX }} />
          ))}
        </Box>
      </Card>

      {/* PLZ-Gebiete mit Aufteilungs-Buttons */}
      {myPostalCodes.map(plz => {
        const plzRuns = myRuns.filter(r => r.plz === plz);
        const activeRun = plzRuns.find(r => r.status === 'active');
        const draftRun = plzRuns.find(r => r.status === 'draft');
        const plzAddresses = addrByPlz[plz] || [];

        return (
          <Card key={plz} sx={{ mb: 2, borderLeft: `4px solid ${activeRun ? '#2E7D32' : BORDEAUX}` }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>PLZ {plz}</Typography>
                    <Chip label={`${plzAddresses.length} Adressen`} size="small" variant="outlined" />
                    {activeRun && (
                      <Chip icon={<CheckCircle sx={{ fontSize: 14 }} />} label="Aufgeteilt"
                        size="small" sx={{ bgcolor: '#2E7D3220', color: '#2E7D32', fontWeight: 600 }} />
                    )}
                  </Box>
                  {activeRun && (
                    <Typography variant="body2" color="text.secondary">
                      {activeRun.num_reps} Vertriebler | {new Date(activeRun.valid_from).toLocaleDateString('de-DE')} - {new Date(activeRun.valid_until).toLocaleDateString('de-DE')}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {!activeRun && !draftRun && (
                    <Button variant="contained" size="small" startIcon={<GridView />}
                      onClick={() => openRunDialog(plz)}
                      sx={{ bgcolor: BORDEAUX, '&:hover': { bgcolor: '#5A0F1E' } }}>
                      Aufteilen
                    </Button>
                  )}
                  {draftRun && (
                    <>
                      <Tooltip title="Quadrate automatisch zuteilen">
                        <Button variant="outlined" size="small" startIcon={<AutoAwesome />}
                          onClick={() => assignRunM.mutate(draftRun.id)}
                          disabled={assignRunM.isLoading}
                          sx={{ color: '#A68836', borderColor: '#A68836' }}>
                          {assignRunM.isLoading ? <CircularProgress size={16} /> : 'Zuteilen'}
                        </Button>
                      </Tooltip>
                      {(draftRun.territories || []).length > 0 && (
                        <Tooltip title="Aufteilung aktivieren">
                          <Button variant="outlined" size="small" startIcon={<PlayArrow />}
                            onClick={() => activateRunM.mutate(draftRun.id)}
                            disabled={activateRunM.isLoading}
                            sx={{ color: '#2E7D32', borderColor: '#2E7D32' }}>
                            Aktivieren
                          </Button>
                        </Tooltip>
                      )}
                      <Tooltip title="Entwurf loeschen">
                        <IconButton size="small" color="error"
                          onClick={() => { if (window.confirm('Entwurf loeschen?')) deleteRunM.mutate(draftRun.id); }}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </Box>
              </Box>

              {/* Quadrat-Zuweisungen anzeigen */}
              {plzRuns.map(run => {
                const territories = run.territories || [];
                if (territories.length === 0) return null;
                const st = RUN_STATUS[run.status] || RUN_STATUS.draft;

                return (
                  <Box key={run.id} sx={{ mt: 1.5, p: 1.5, bgcolor: '#F5F3F0', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Chip label={st.label} size="small" sx={{ bgcolor: st.color + '20', color: st.color, fontWeight: 600 }} />
                      <Typography variant="caption" color="text.secondary">
                        {territories.length} Quadrate | {salespersons.length > 0 && `${run.num_reps} Vertriebler`}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {territories.map((t, i) => (
                        <Chip key={t.id} size="small"
                          avatar={<Avatar sx={{ bgcolor: T_COLORS[i % T_COLORS.length], width: 24, height: 24, fontSize: '0.65rem' }}>
                            {(t.rep?.first_name?.[0] || '') + (t.rep?.last_name?.[0] || '')}
                          </Avatar>}
                          label={`${t.rep?.first_name || '?'} ${t.rep?.last_name || ''} (${parseFloat(t.weight || 0).toFixed(0)} HH)`}
                          sx={{ fontWeight: 500, bgcolor: T_COLORS[i % T_COLORS.length] + '15' }} />
                      ))}
                    </Box>
                  </Box>
                );
              })}

              {/* Adress-Statistik */}
              {plzAddresses.length > 0 && !activeRun && (
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    <Home sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                    {plzAddresses.length} Adressen bereit zur Aufteilung
                    {salespersons.length > 0 && ` (~${Math.ceil(plzAddresses.length / Math.max(salespersons.length, 1))} pro Vertriebler)`}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        );
      })}

      </>)}

      {/* Run-Erstellen-Dialog */}
      <Dialog open={runDialogOpen} onClose={() => setRunDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          <GridView sx={{ mr: 1, verticalAlign: 'middle', color: BORDEAUX }} />
          Gebiet in Quadrate aufteilen
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
            Die Adressen im PLZ-Gebiet werden gleichmaessig in Quadrate aufgeteilt.
            Jeder Vertriebler erhaelt ein eigenes Quadrat mit Adressliste.
          </Alert>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField select label="PLZ-Gebiet" value={runForm.plz}
              onChange={e => setRunForm({ ...runForm, plz: e.target.value })} fullWidth required>
              {myPostalCodes.map(plz => (
                <MenuItem key={plz} value={plz}>
                  {plz} ({(addrByPlz[plz] || []).length} Adressen)
                </MenuItem>
              ))}
            </TextField>

            <Autocomplete multiple
              options={salespersons.map(r => r.id)}
              value={runForm.rep_ids}
              onChange={(e, v) => setRunForm({ ...runForm, rep_ids: v })}
              getOptionLabel={id => {
                const r = salespersons.find(u => u.id === id);
                return r ? `${r.first_name} ${r.last_name}` : `#${id}`;
              }}
              renderTags={(val, gtp) => val.map((id, i) => {
                const r = salespersons.find(u => u.id === id);
                return <Chip key={id} label={r ? `${r.first_name} ${r.last_name}` : `#${id}`} size="small"
                  sx={{ bgcolor: `${BORDEAUX}15`, color: BORDEAUX }} {...gtp({ index: i })} />;
              })}
              renderInput={p => <TextField {...p} label="Vertriebler auswaehlen" required
                helperText={runForm.plz && runForm.rep_ids.length > 0
                  ? `${(addrByPlz[runForm.plz] || []).length} Adressen / ${runForm.rep_ids.length} = ~${Math.ceil((addrByPlz[runForm.plz] || []).length / runForm.rep_ids.length)} pro Quadrat`
                  : `${salespersons.length} Vertriebler verfuegbar`} />}
              renderOption={(props, id) => {
                const r = salespersons.find(u => u.id === id);
                return <li {...props} key={id}>
                  <Avatar sx={{ bgcolor: BORDEAUX, width: 28, height: 28, fontSize: '0.7rem', mr: 1 }}>
                    {(r?.first_name?.[0] || '') + (r?.last_name?.[0] || '')}
                  </Avatar>
                  {r ? `${r.first_name} ${r.last_name}` : `#${id}`}
                </li>;
              }}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Gueltig ab" type="date" value={runForm.valid_from}
                onChange={e => setRunForm({ ...runForm, valid_from: e.target.value })}
                fullWidth required InputLabelProps={{ shrink: true }} />
              <TextField label="Gueltig bis" type="date" value={runForm.valid_until}
                onChange={e => setRunForm({ ...runForm, valid_until: e.target.value })}
                fullWidth required InputLabelProps={{ shrink: true }} />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRunDialogOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handleCreateRun}
            disabled={createRunM.isLoading || !runForm.plz || runForm.rep_ids.length === 0}
            sx={{ bgcolor: BORDEAUX, '&:hover': { bgcolor: '#5A0F1E' } }}>
            {createRunM.isLoading ? <CircularProgress size={20} color="inherit" /> : 'Erstellen & Aufteilen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Fehlermeldungen */}
      {(createRunM.isError || assignRunM.isError || activateRunM.isError || deleteRunM.isError) && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {createRunM.error?.response?.data?.error || assignRunM.error?.response?.data?.error ||
           activateRunM.error?.response?.data?.error || deleteRunM.error?.response?.data?.error || 'Fehler'}
        </Alert>
      )}
    </Box>
  );
};

export default TerritoryOverviewPage;
