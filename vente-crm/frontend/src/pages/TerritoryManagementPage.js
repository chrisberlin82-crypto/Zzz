import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, CircularProgress, Alert,
  Tooltip
} from '@mui/material';
import {
  Add, Edit, Delete, Map, CheckCircle, Cancel, Schedule
} from '@mui/icons-material';
import { territoryAPI, userAPI } from '../services/api';

const BORDEAUX = '#7A1B2D';

const TerritoryManagementPage = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    assigned_to_user_id: '',
    postal_codes: '',
    name: '',
    valid_from: '',
    valid_until: '',
    rotation_days: 14,
    notes: ''
  });

  const { data: assignmentsData, isLoading } = useQuery(
    'territory-assignments',
    () => territoryAPI.getAll()
  );

  const { data: usersData } = useQuery(
    'users-for-territory',
    () => userAPI.getAll()
  );

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
  const users = (usersData?.data?.data || []).filter(u =>
    ['STANDORTLEITUNG', 'TEAMLEAD'].includes(u.role)
  );

  const handleOpenCreate = () => {
    setEditItem(null);
    const today = new Date().toISOString().split('T')[0];
    const in14days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setForm({
      assigned_to_user_id: '',
      postal_codes: '',
      name: '',
      valid_from: today,
      valid_until: in14days,
      rotation_days: 14,
      notes: ''
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditItem(item);
    const postalCodes = Array.isArray(item.postal_codes) ? item.postal_codes.join(', ') : item.postal_codes;
    setForm({
      assigned_to_user_id: item.assigned_to_user_id,
      postal_codes: postalCodes,
      name: item.name || '',
      valid_from: item.valid_from,
      valid_until: item.valid_until,
      rotation_days: item.rotation_days || 14,
      notes: item.notes || ''
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditItem(null);
  };

  const handleSubmit = () => {
    const payload = {
      ...form,
      postal_codes: form.postal_codes.split(',').map(s => s.trim()).filter(Boolean)
    };

    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Gebietszuweisung wirklich loeschen? Alle Vertriebler-Zuweisungen werden ebenfalls geloescht.')) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusChip = (item) => {
    const today = new Date().toISOString().split('T')[0];
    if (!item.is_active) {
      return <Chip icon={<Cancel />} label="Inaktiv" size="small" color="default" />;
    }
    if (item.valid_until < today) {
      return <Chip icon={<Schedule />} label="Abgelaufen" size="small" color="warning" />;
    }
    if (item.valid_from > today) {
      return <Chip icon={<Schedule />} label="Geplant" size="small" color="info" />;
    }
    return <Chip icon={<CheckCircle />} label="Aktiv" size="small" color="success" />;
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          <Map sx={{ mr: 1, verticalAlign: 'middle', color: BORDEAUX }} />
          Gebietsverwaltung
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleOpenCreate}
          sx={{ bgcolor: BORDEAUX, '&:hover': { bgcolor: '#5A0F1E' } }}
        >
          Neues Gebiet zuweisen
        </Button>
      </Box>

      {assignments.length === 0 ? (
        <Alert severity="info">
          Noch keine Gebiete zugewiesen. Erstellen Sie eine Gebietszuweisung fuer Standortleiter oder Teamleiter.
        </Alert>
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#F5F3F0' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Gebietsname</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Zugewiesen an</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>PLZ-Gebiete</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Zeitraum</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Rotation</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assignments.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {item.name || `Gebiet #${item.id}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {item.assignedTo
                            ? `${item.assignedTo.first_name || ''} ${item.assignedTo.last_name || ''}`.trim() || item.assignedTo.email
                            : 'Unbekannt'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.assignedTo?.role === 'STANDORTLEITUNG' ? 'Standortleitung' : 'Teamleiter'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(Array.isArray(item.postal_codes) ? item.postal_codes : (item.postal_codes || '').split(','))
                          .filter(Boolean)
                          .slice(0, 5)
                          .map((plz, i) => (
                            <Chip key={i} label={plz.trim()} size="small"
                              sx={{ bgcolor: `${BORDEAUX}15`, color: BORDEAUX, fontWeight: 500 }}
                            />
                          ))}
                        {(Array.isArray(item.postal_codes) ? item.postal_codes : (item.postal_codes || '').split(',')).filter(Boolean).length > 5 && (
                          <Chip label={`+${(Array.isArray(item.postal_codes) ? item.postal_codes : item.postal_codes.split(',')).filter(Boolean).length - 5}`}
                            size="small" variant="outlined"
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(item.valid_from).toLocaleDateString('de-DE')} -
                      </Typography>
                      <Typography variant="body2">
                        {new Date(item.valid_until).toLocaleDateString('de-DE')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={`${item.rotation_days || 14} Tage`} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{getStatusChip(item)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Bearbeiten">
                        <IconButton size="small" onClick={() => handleOpenEdit(item)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Loeschen">
                        <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {editItem ? 'Gebietszuweisung bearbeiten' : 'Neues Gebiet zuweisen'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {!editItem && (
              <TextField
                select
                label="Zuweisen an"
                value={form.assigned_to_user_id}
                onChange={(e) => setForm({ ...form, assigned_to_user_id: e.target.value })}
                fullWidth
                required
              >
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email}
                    {' '}({u.role === 'STANDORTLEITUNG' ? 'Standortleitung' : 'Teamleiter'})
                  </MenuItem>
                ))}
              </TextField>
            )}

            <TextField
              label="Gebietsname"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="z.B. Berlin Mitte Nord"
              fullWidth
            />

            <TextField
              label="PLZ-Gebiete (kommagetrennt)"
              value={form.postal_codes}
              onChange={(e) => setForm({ ...form, postal_codes: e.target.value })}
              placeholder="z.B. 10115, 10117, 10119"
              fullWidth
              required
              helperText="Geben Sie die Postleitzahlen kommagetrennt ein"
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Gueltig ab"
                type="date"
                value={form.valid_from}
                onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Gueltig bis"
                type="date"
                value={form.valid_until}
                onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            <TextField
              label="Rotationsintervall (Tage)"
              type="number"
              value={form.rotation_days}
              onChange={(e) => setForm({ ...form, rotation_days: parseInt(e.target.value) || 14 })}
              fullWidth
              helperText="z.B. 14 = alle 2 Wochen wechselt das Gebiet"
            />

            <TextField
              label="Notizen"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog}>Abbrechen</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={createMutation.isLoading || updateMutation.isLoading}
            sx={{ bgcolor: BORDEAUX, '&:hover': { bgcolor: '#5A0F1E' } }}
          >
            {createMutation.isLoading || updateMutation.isLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : editItem ? 'Speichern' : 'Zuweisen'}
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
