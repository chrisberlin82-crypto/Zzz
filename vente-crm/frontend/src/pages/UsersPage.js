import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box, Typography, Button, TextField, Table, TableBody, TableCell,
  TableHead, TableRow, TablePagination, IconButton, Chip, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid, MenuItem, Card,
  Avatar, Alert, CircularProgress
} from '@mui/material';
import {
  Add, Edit, Delete, PersonAdd, AdminPanelSettings,
  SupervisorAccount, Badge, Storefront
} from '@mui/icons-material';
import { userAPI } from '../services/api';

const BORDEAUX = '#7A1B2D';

const ROLES = [
  { value: 'ADMIN', label: 'Administrator', icon: <AdminPanelSettings />, color: '#7A1B2D' },
  { value: 'STANDORTLEITUNG', label: 'Standortleitung', icon: <SupervisorAccount />, color: '#9E3347' },
  { value: 'TEAMLEAD', label: 'Teamleiter', icon: <Badge />, color: '#C4A35A' },
  { value: 'VERTRIEB', label: 'Vertrieb', icon: <Storefront />, color: '#5A0F1E' }
];

const STATUS_CONFIG = {
  ACTIVE: { label: 'Aktiv', color: '#2E7D32' },
  INACTIVE: { label: 'Inaktiv', color: '#999' },
  SUSPENDED: { label: 'Gesperrt', color: '#D32F2F' }
};

const INITIAL_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  role: 'VERTRIEB',
  status: 'ACTIVE',
  phone: ''
};

const UsersPage = () => {
  const [page, setPage] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(
    ['users', page + 1],
    () => userAPI.getAll({ page: page + 1, limit: 20 }),
    { keepPreviousData: true }
  );

  const createMutation = useMutation(
    (data) => editUser
      ? userAPI.update(editUser.id, data)
      : userAPI.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        setDialogOpen(false);
        setEditUser(null);
        setFormData(INITIAL_FORM);
      }
    }
  );

  const deleteMutation = useMutation(
    (id) => userAPI.delete(id),
    { onSuccess: () => queryClient.invalidateQueries('users') }
  );

  const users = data?.data?.data?.users || data?.data?.data || [];
  const pagination = data?.data?.data?.pagination || { total: 0 };

  const openDialog = (user = null) => {
    setEditUser(user);
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        password: '',
        role: user.role || 'VERTRIEB',
        status: user.status || 'ACTIVE',
        phone: user.phone || ''
      });
    } else {
      setFormData(INITIAL_FORM);
    }
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const submitData = { ...formData };
    // Passwort nur senden wenn es gesetzt ist (bei Bearbeitung optional)
    if (editUser && !submitData.password) {
      delete submitData.password;
    }
    createMutation.mutate(submitData);
  };

  const getRoleInfo = (role) => ROLES.find(r => r.value === role) || ROLES[4];
  const getStatusInfo = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.ACTIVE;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Benutzerverwaltung</Typography>
        <Button variant="contained" startIcon={<PersonAdd />} onClick={() => openDialog()}>
          Neuer Benutzer
        </Button>
      </Box>

      {/* Rollen-Uebersicht */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {ROLES.map((role) => {
            const count = (Array.isArray(users) ? users : []).filter(u => u.role === role.value).length;
            return (
              <Chip
                key={role.value}
                icon={React.cloneElement(role.icon, { sx: { color: `${role.color} !important`, fontSize: 18 } })}
                label={`${role.label} (${count})`}
                variant="outlined"
                sx={{ borderColor: role.color, color: role.color }}
              />
            );
          })}
        </Box>
      </Card>

      {/* Tabelle */}
      <Card>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress sx={{ color: BORDEAUX }} />
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Benutzer</TableCell>
                  <TableCell>E-Mail</TableCell>
                  <TableCell>Rolle</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Erstellt</TableCell>
                  <TableCell align="right">Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(Array.isArray(users) ? users : []).map((user) => {
                  const roleInfo = getRoleInfo(user.role);
                  const statusInfo = getStatusInfo(user.status);
                  return (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{
                            width: 36, height: 36, bgcolor: roleInfo.color,
                            fontSize: '0.85rem'
                          }}>
                            {(user.first_name || '?')[0]}{(user.last_name || '?')[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {user.first_name} {user.last_name}
                            </Typography>
                            {user.phone && (
                              <Typography variant="caption" color="text.secondary">
                                {user.phone}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip
                          icon={React.cloneElement(roleInfo.icon, { sx: { fontSize: 16 } })}
                          label={roleInfo.label}
                          size="small"
                          sx={{
                            bgcolor: `${roleInfo.color}15`,
                            color: roleInfo.color,
                            fontWeight: 500,
                            '& .MuiChip-icon': { color: roleInfo.color }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={statusInfo.label}
                          size="small"
                          sx={{
                            bgcolor: `${statusInfo.color}20`,
                            color: statusInfo.color,
                            fontWeight: 500
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString('de-DE')
                          : '-'}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => openDialog(user)}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => {
                          if (window.confirm('Benutzer wirklich loeschen?')) {
                            deleteMutation.mutate(user.id);
                          }
                        }}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(Array.isArray(users) ? users : []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">Keine Benutzer gefunden</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div" count={pagination.total || (Array.isArray(users) ? users.length : 0)} page={page}
              onPageChange={(e, p) => setPage(p)} rowsPerPage={20} rowsPerPageOptions={[20]}
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} von ${count}`}
            />
          </>
        )}
      </Card>

      {/* Erstellen/Bearbeiten Dialog */}
      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditUser(null); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {editUser ? 'Benutzer bearbeiten' : 'Neuer Benutzer'}
        </DialogTitle>
        <DialogContent>
          {createMutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {createMutation.error?.response?.data?.message || 'Fehler beim Speichern'}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth label="Vorname" required
                value={formData.first_name}
                onChange={(e) => setFormData(p => ({ ...p, first_name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth label="Nachname" required
                value={formData.last_name}
                onChange={(e) => setFormData(p => ({ ...p, last_name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth label="E-Mail" type="email" required
                value={formData.email}
                onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={editUser ? 'Neues Passwort (leer lassen fuer keine Aenderung)' : 'Passwort'}
                type="password"
                required={!editUser}
                value={formData.password}
                onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth label="Telefon"
                value={formData.phone}
                onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select fullWidth label="Rolle" required
                value={formData.role}
                onChange={(e) => setFormData(p => ({ ...p, role: e.target.value }))}
              >
                {ROLES.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {React.cloneElement(role.icon, { sx: { fontSize: 18, color: role.color } })}
                      {role.label}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                select fullWidth label="Status"
                value={formData.status}
                onChange={(e) => setFormData(p => ({ ...p, status: e.target.value }))}
              >
                <MenuItem value="ACTIVE">Aktiv</MenuItem>
                <MenuItem value="INACTIVE">Inaktiv</MenuItem>
                <MenuItem value="SUSPENDED">Gesperrt</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setDialogOpen(false); setEditUser(null); }}>
            Abbrechen
          </Button>
          <Button
            variant="contained" onClick={handleSubmit}
            disabled={createMutation.isLoading || !formData.first_name || !formData.last_name || !formData.email || (!editUser && !formData.password)}
          >
            {createMutation.isLoading ? 'Wird gespeichert...' : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersPage;
