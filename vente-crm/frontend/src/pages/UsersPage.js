import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell,
  TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Grid, Alert
} from '@mui/material';
import { Add, Edit, Block, CheckCircle } from '@mui/icons-material';
import { userAPI } from '../services/api';

const ROLES = [
  { value: 'ADMIN', label: 'Admin', color: '#5A0F1E' },
  { value: 'STANDORTLEITUNG', label: 'Standortleitung', color: '#7A1B2D' },
  { value: 'TEAMLEAD', label: 'Teamlead', color: '#9E3347' },
  { value: 'BACKOFFICE', label: 'Backoffice', color: '#C4A35A' },
  { value: 'VERTRIEB', label: 'Vertrieb', color: '#2E7D32' }
];

const UsersPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [formData, setFormData] = useState({});
  const queryClient = useQueryClient();

  const { data } = useQuery('users', () => userAPI.getAll({ is_active: 'all' }));
  const saveMutation = useMutation(
    (d) => editUser ? userAPI.update(editUser.id, d) : userAPI.create(d),
    { onSuccess: () => { queryClient.invalidateQueries('users'); setDialogOpen(false); } }
  );
  const toggleMutation = useMutation(
    ({ id, is_active }) => userAPI.update(id, { is_active }),
    { onSuccess: () => queryClient.invalidateQueries('users') }
  );

  const users = data?.data?.data || [];

  const openDialog = (user = null) => {
    setEditUser(user);
    setFormData(user ? { ...user } : { email: '', password: '', role: 'VERTRIEB', first_name: '', last_name: '', company_name: '', phone: '' });
    setDialogOpen(true);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Benutzerverwaltung</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => openDialog()}>Neuer Benutzer</Button>
      </Box>

      <Card>
        <Table>
          <TableHead><TableRow>
            <TableCell>Name</TableCell><TableCell>E-Mail</TableCell><TableCell>Rolle</TableCell>
            <TableCell>Status</TableCell><TableCell>Letzter Login</TableCell><TableCell align="right">Aktionen</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {users.map(user => {
              const role = ROLES.find(r => r.value === user.role);
              return (
                <TableRow key={user.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{user.first_name} {user.last_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell><Chip label={role?.label || user.role} size="small" sx={{ bgcolor: (role?.color || '#999') + '20', color: role?.color, fontWeight: 500 }} /></TableCell>
                  <TableCell>
                    <Chip label={user.is_active ? 'Aktiv' : 'Inaktiv'} size="small"
                      color={user.is_active ? 'success' : 'default'} variant="outlined" />
                  </TableCell>
                  <TableCell>{user.last_login ? new Date(user.last_login).toLocaleDateString('de-DE') : 'Nie'}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openDialog(user)}><Edit fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => toggleMutation.mutate({ id: user.id, is_active: !user.is_active })}
                      color={user.is_active ? 'error' : 'success'}>
                      {user.is_active ? <Block fontSize="small" /> : <CheckCircle fontSize="small" />}
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editUser ? 'Benutzer bearbeiten' : 'Neuer Benutzer'}</DialogTitle>
        <DialogContent>
          {saveMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>Fehler</Alert>}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}><TextField fullWidth label="Vorname" value={formData.first_name || ''} onChange={(e) => setFormData(p => ({ ...p, first_name: e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Nachname" value={formData.last_name || ''} onChange={(e) => setFormData(p => ({ ...p, last_name: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="E-Mail" value={formData.email || ''} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} required /></Grid>
            {!editUser && <Grid item xs={12}><TextField fullWidth label="Passwort" type="password" value={formData.password || ''} onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))} required /></Grid>}
            <Grid item xs={6}>
              <TextField select fullWidth label="Rolle" value={formData.role || 'VERTRIEB'} onChange={(e) => setFormData(p => ({ ...p, role: e.target.value }))}>
                {ROLES.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}><TextField fullWidth label="Telefon" value={formData.phone || ''} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Firma" value={formData.company_name || ''} onChange={(e) => setFormData(p => ({ ...p, company_name: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isLoading}>Speichern</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersPage;
