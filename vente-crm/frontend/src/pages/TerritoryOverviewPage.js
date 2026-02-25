import React, { useState } from 'react';
import { useQuery, useQueries, useMutation, useQueryClient } from 'react-query';
import {
  Box, Typography, Button, Card, CardContent, CircularProgress, Alert,
  Chip, Accordion, AccordionSummary, AccordionDetails, Table, TableBody,
  TableCell, TableHead, TableRow, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, IconButton, Tooltip
} from '@mui/material';
import {
  ExpandMore, Map, Person, Assignment, Delete, LocationOn, Home, Schedule
} from '@mui/icons-material';
import { territoryAPI, userAPI } from '../services/api';

const BORDEAUX = '#7A1B2D';

const STATUS_LABELS = {
  NEW: 'Neu', CONTACTED: 'Kontaktiert', APPOINTMENT: 'Termin',
  NOT_INTERESTED: 'Kein Interesse', CONVERTED: 'Konvertiert', INVALID: 'Ungueltig'
};

const STATUS_COLORS = {
  NEW: '#7A1B2D', CONTACTED: '#A68836', APPOINTMENT: '#2E7D32',
  NOT_INTERESTED: '#666', CONVERTED: '#5A0F1E', INVALID: '#D32F2F'
};

const TerritoryOverviewPage = () => {
  const queryClient = useQueryClient();
  const [assignDialog, setAssignDialog] = useState({ open: false, territoryId: null, postalCodes: [] });
  const [assignForm, setAssignForm] = useState({
    salesperson_user_id: '',
    postal_codes: '',
    streets: '',
    notes: ''
  });

  const { data: assignmentsData, isLoading } = useQuery(
    'my-territory-assignments',
    () => territoryAPI.getMyAssignments()
  );

  const { data: usersData } = useQuery('team-users', () => userAPI.getAll());

  // Adressen fuer jedes Gebiet laden
  const assignments = assignmentsData?.data?.data || [];
  const allUsers = usersData?.data?.data || [];
  const salespersons = allUsers.filter(u => u.role === 'VERTRIEB');

  // Fuer jedes Assignment die Adressen laden
  const territoryQueryResults = useQueries(
    assignments.map(a => ({
      queryKey: ['territory-addresses', a.id],
      queryFn: () => territoryAPI.getAddresses(a.id),
      enabled: !!a.id
    }))
  );
  const territoryQueries = assignments.map((a, i) => ({
    id: a.id,
    query: territoryQueryResults[i]
  }));

  const assignMutation = useMutation(
    (data) => territoryAPI.assignSalesperson(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('my-territory-assignments');
        setAssignDialog({ open: false, territoryId: null, postalCodes: [] });
      }
    }
  );

  const deleteSpMutation = useMutation(
    (id) => territoryAPI.deleteSalesperson(id),
    { onSuccess: () => queryClient.invalidateQueries('my-territory-assignments') }
  );

  const handleOpenAssign = (assignment) => {
    const codes = Array.isArray(assignment.postal_codes)
      ? assignment.postal_codes
      : (assignment.postal_codes || '').split(',').map(s => s.trim());
    setAssignDialog({
      open: true,
      territoryId: assignment.id,
      postalCodes: codes
    });
    setAssignForm({
      salesperson_user_id: '',
      postal_codes: codes.join(', '),
      streets: '',
      notes: ''
    });
  };

  const handleAssign = () => {
    const payload = {
      territory_assignment_id: assignDialog.territoryId,
      salesperson_user_id: assignForm.salesperson_user_id,
      postal_codes: assignForm.postal_codes.split(',').map(s => s.trim()).filter(Boolean),
      streets: assignForm.streets ? assignForm.streets.split(',').map(s => s.trim()).filter(Boolean) : null,
      notes: assignForm.notes || null
    };
    assignMutation.mutate(payload);
  };

  const handleDeleteSp = (spId) => {
    if (window.confirm('Vertriebler-Zuweisung loeschen?')) {
      deleteSpMutation.mutate(spId);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: BORDEAUX }} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        <Map sx={{ mr: 1, verticalAlign: 'middle', color: BORDEAUX }} />
        Meine Gebiete
      </Typography>

      {assignments.length === 0 ? (
        <Alert severity="info">
          Ihnen wurden noch keine Gebiete zugewiesen. Bitte wenden Sie sich an den Administrator.
        </Alert>
      ) : (
        assignments.map((assignment, idx) => {
          const tQuery = territoryQueries.find(t => t.id === assignment.id);
          const tData = tQuery?.query?.data?.data?.data || {};
          const streets = tData.streets || [];
          const spTerritories = assignment.salespersonTerritories || [];
          const postalCodes = Array.isArray(assignment.postal_codes)
            ? assignment.postal_codes
            : (assignment.postal_codes || '').split(',').map(s => s.trim());

          return (
            <Card key={assignment.id} sx={{ mb: 3 }}>
              <CardContent>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {assignment.name || `Gebiet #${assignment.id}`}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Schedule sx={{ fontSize: 16, color: '#666' }} />
                      <Typography variant="body2" color="text.secondary">
                        {new Date(assignment.valid_from).toLocaleDateString('de-DE')} - {new Date(assignment.valid_until).toLocaleDateString('de-DE')}
                        {assignment.rotation_days && ` (${assignment.rotation_days}-Tage Rotation)`}
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<Person />}
                    onClick={() => handleOpenAssign(assignment)}
                    sx={{ bgcolor: BORDEAUX, '&:hover': { bgcolor: '#5A0F1E' } }}
                  >
                    Vertriebler zuweisen
                  </Button>
                </Box>

                {/* PLZ Chips */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                  {postalCodes.map((plz, i) => (
                    <Chip key={i} icon={<LocationOn sx={{ fontSize: 14 }} />}
                      label={plz} size="small"
                      sx={{ bgcolor: `${BORDEAUX}15`, color: BORDEAUX, fontWeight: 500 }}
                    />
                  ))}
                </Box>

                {/* Zugewiesene Vertriebler */}
                {spTerritories.length > 0 && (
                  <Box sx={{ mb: 2, p: 2, bgcolor: '#F5F3F0', borderRadius: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Zugewiesene Vertriebler
                    </Typography>
                    {spTerritories.map((sp) => {
                      const spCodes = Array.isArray(sp.postal_codes)
                        ? sp.postal_codes : (sp.postal_codes || '').split(',').map(s => s.trim());
                      const spStreets = sp.streets;
                      return (
                        <Box key={sp.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Person sx={{ fontSize: 16, color: BORDEAUX }} />
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {sp.salesperson
                              ? `${sp.salesperson.first_name || ''} ${sp.salesperson.last_name || ''}`.trim() || sp.salesperson.email
                              : `User #${sp.salesperson_user_id}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            PLZ: {spCodes.join(', ')}
                            {spStreets && spStreets.length > 0 && ` | Strassen: ${spStreets.join(', ')}`}
                          </Typography>
                          <Tooltip title="Zuweisung entfernen">
                            <IconButton size="small" color="error" onClick={() => handleDeleteSp(sp.id)}>
                              <Delete sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      );
                    })}
                  </Box>
                )}

                {/* Strassen-Uebersicht */}
                {tQuery?.query?.isLoading ? (
                  <CircularProgress size={24} sx={{ color: BORDEAUX }} />
                ) : streets.length > 0 ? (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      <Home sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                      {tData.total_addresses || 0} Adressen in {streets.length} Strassen
                    </Typography>
                    {streets.map((streetGroup, si) => (
                      <Accordion key={si} sx={{ '&:before': { display: 'none' }, boxShadow: 'none', border: '1px solid #E0D8D0' }}>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>
                              {streetGroup.street}
                            </Typography>
                            <Chip label={`${streetGroup.postal_code} ${streetGroup.city || ''}`}
                              size="small" variant="outlined" sx={{ mr: 1 }}
                            />
                            <Chip label={`${streetGroup.addresses.length} Adr.`}
                              size="small" sx={{ bgcolor: `${BORDEAUX}15`, color: BORDEAUX }}
                            />
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ p: 0 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: '#F5F3F0' }}>
                                <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Nr.</TableCell>
                                <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Kontakt</TableCell>
                                <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Haushalte</TableCell>
                                <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Status</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {streetGroup.addresses.map((addr) => (
                                <TableRow key={addr.id} hover>
                                  <TableCell sx={{ fontSize: '0.8rem' }}>
                                    {addr.house_number || '-'}
                                  </TableCell>
                                  <TableCell sx={{ fontSize: '0.8rem' }}>
                                    {addr.contact_name || '-'}
                                  </TableCell>
                                  <TableCell sx={{ fontSize: '0.8rem' }}>
                                    {addr.total_households != null ? `${addr.contacted_households || 0}/${addr.total_households}` : '-'}
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={STATUS_LABELS[addr.status] || addr.status}
                                      size="small"
                                      sx={{
                                        fontSize: '0.7rem',
                                        bgcolor: (STATUS_COLORS[addr.status] || '#999') + '20',
                                        color: STATUS_COLORS[addr.status] || '#999'
                                      }}
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Box>
                ) : (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Keine Adressen in diesem Gebiet vorhanden. Importieren Sie zuerst Adresslisten mit den passenden PLZs.
                  </Alert>
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Assign Salesperson Dialog */}
      <Dialog open={assignDialog.open} onClose={() => setAssignDialog({ open: false, territoryId: null, postalCodes: [] })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          <Assignment sx={{ mr: 1, verticalAlign: 'middle', color: BORDEAUX }} />
          Vertriebler an Gebiet zuweisen
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              label="Vertriebler"
              value={assignForm.salesperson_user_id}
              onChange={(e) => setAssignForm({ ...assignForm, salesperson_user_id: e.target.value })}
              fullWidth
              required
            >
              {salespersons.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="PLZ-Gebiete (kommagetrennt)"
              value={assignForm.postal_codes}
              onChange={(e) => setAssignForm({ ...assignForm, postal_codes: e.target.value })}
              fullWidth
              required
              helperText={`Verfuegbare PLZs: ${assignDialog.postalCodes.join(', ')}`}
            />

            <TextField
              label="Strassen (kommagetrennt, optional)"
              value={assignForm.streets}
              onChange={(e) => setAssignForm({ ...assignForm, streets: e.target.value })}
              fullWidth
              placeholder="z.B. Friedrichstr., Unter den Linden"
              helperText="Leer lassen = alle Strassen in den PLZ-Gebieten"
            />

            <TextField
              label="Notizen"
              value={assignForm.notes}
              onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAssignDialog({ open: false, territoryId: null, postalCodes: [] })}>
            Abbrechen
          </Button>
          <Button
            variant="contained"
            onClick={handleAssign}
            disabled={assignMutation.isLoading || !assignForm.salesperson_user_id}
            sx={{ bgcolor: BORDEAUX, '&:hover': { bgcolor: '#5A0F1E' } }}
          >
            {assignMutation.isLoading ? <CircularProgress size={20} color="inherit" /> : 'Zuweisen'}
          </Button>
        </DialogActions>
      </Dialog>

      {(assignMutation.isError || deleteSpMutation.isError) && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {assignMutation.error?.response?.data?.error ||
           deleteSpMutation.error?.response?.data?.error ||
           'Ein Fehler ist aufgetreten'}
        </Alert>
      )}
    </Box>
  );
};

export default TerritoryOverviewPage;
