import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box, Typography, Button, TextField, Table, TableBody, TableCell,
  TableHead, TableRow, TablePagination, IconButton, Chip, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid, MenuItem, Card,
  InputAdornment, Alert
} from '@mui/material';
import { Add, Search, Edit, Delete, Visibility } from '@mui/icons-material';
import { customerAPI } from '../services/api';

const SOURCES = [
  { value: 'ONLINE', label: 'Online' },
  { value: 'REFERRAL', label: 'Empfehlung' },
  { value: 'COLD_CALL', label: 'Kaltakquise' },
  { value: 'EVENT', label: 'Event' },
  { value: 'PARTNER', label: 'Partner' },
  { value: 'OTHER', label: 'Sonstige' }
];

const CustomersPage = () => {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [formData, setFormData] = useState({});
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(
    ['customers', page + 1, search],
    () => customerAPI.getAll({ page: page + 1, limit: 20, search }),
    { keepPreviousData: true }
  );

  const createMutation = useMutation(
    (data) => editCustomer ? customerAPI.update(editCustomer.id, data) : customerAPI.create(data),
    { onSuccess: () => { queryClient.invalidateQueries('customers'); setDialogOpen(false); } }
  );

  const deleteMutation = useMutation(
    (id) => customerAPI.delete(id),
    { onSuccess: () => queryClient.invalidateQueries('customers') }
  );

  const customers = data?.data?.data?.customers || [];
  const pagination = data?.data?.data?.pagination || { total: 0 };

  const openDialog = (customer = null) => {
    setEditCustomer(customer);
    setFormData(customer || {
      type: 'PRIVATE', first_name: '', last_name: '', email: '',
      phone: '', street: '', postal_code: '', city: '', source: 'OTHER',
      needs: [], notes: '', gdpr_consent: true
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    createMutation.mutate(formData);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Kunden</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => openDialog()}>
          Neuer Kunde
        </Button>
      </Box>

      {/* Suche */}
      <Card sx={{ mb: 3, p: 2 }}>
        <TextField
          fullWidth placeholder="Kunden suchen..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
          size="small"
        />
      </Card>

      {/* Tabelle */}
      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>E-Mail</TableCell>
              <TableCell>Telefon</TableCell>
              <TableCell>Ort</TableCell>
              <TableCell>Quelle</TableCell>
              <TableCell>Verträge</TableCell>
              <TableCell align="right">Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id} hover>
                <TableCell sx={{ fontWeight: 500 }}>
                  {customer.first_name} {customer.last_name}
                  {customer.company_name && <Typography variant="caption" display="block" color="text.secondary">{customer.company_name}</Typography>}
                </TableCell>
                <TableCell>{customer.email || '-'}</TableCell>
                <TableCell>{customer.phone || '-'}</TableCell>
                <TableCell>{customer.city || '-'}</TableCell>
                <TableCell>
                  <Chip label={SOURCES.find(s => s.value === customer.source)?.label || customer.source}
                    size="small" variant="outlined" />
                </TableCell>
                <TableCell>{customer.contracts_count || 0}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => navigate(`/customers/${customer.id}`)}><Visibility fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => openDialog(customer)}><Edit fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => {
                    if (window.confirm('Kunde wirklich löschen?')) deleteMutation.mutate(customer.id);
                  }}><Delete fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && customers.length === 0 && (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}>Keine Kunden gefunden</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div" count={pagination.total} page={page}
          onPageChange={(e, p) => setPage(p)} rowsPerPage={20} rowsPerPageOptions={[20]}
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} von ${count}`}
        />
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editCustomer ? 'Kunde bearbeiten' : 'Neuer Kunde'}</DialogTitle>
        <DialogContent>
          {createMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>Fehler beim Speichern</Alert>}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField fullWidth label="Vorname" value={formData.first_name || ''} onChange={(e) => setFormData(p => ({ ...p, first_name: e.target.value }))} required />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Nachname" value={formData.last_name || ''} onChange={(e) => setFormData(p => ({ ...p, last_name: e.target.value }))} required />
            </Grid>
            <Grid item xs={6}>
              <TextField select fullWidth label="Typ" value={formData.type || 'PRIVATE'} onChange={(e) => setFormData(p => ({ ...p, type: e.target.value }))}>
                <MenuItem value="PRIVATE">Privat</MenuItem>
                <MenuItem value="BUSINESS">Geschäftlich</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField select fullWidth label="Quelle" value={formData.source || 'OTHER'} onChange={(e) => setFormData(p => ({ ...p, source: e.target.value }))}>
                {SOURCES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}><TextField fullWidth label="E-Mail" value={formData.email || ''} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Telefon" value={formData.phone || ''} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Straße" value={formData.street || ''} onChange={(e) => setFormData(p => ({ ...p, street: e.target.value }))} /></Grid>
            <Grid item xs={4}><TextField fullWidth label="PLZ" value={formData.postal_code || ''} onChange={(e) => setFormData(p => ({ ...p, postal_code: e.target.value }))} /></Grid>
            <Grid item xs={8}><TextField fullWidth label="Ort" value={formData.city || ''} onChange={(e) => setFormData(p => ({ ...p, city: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Firma" value={formData.company_name || ''} onChange={(e) => setFormData(p => ({ ...p, company_name: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Notizen" multiline rows={2} value={formData.notes || ''} onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={createMutation.isLoading}>Speichern</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomersPage;
