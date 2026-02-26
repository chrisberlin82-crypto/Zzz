import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box, Typography, Button, Card, CardContent, Chip, TextField, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Grid
} from '@mui/material';
import {
  ArrowBack, Edit, Map, Home, Phone, Email, CheckCircle,
  Groups, LocationOn
} from '@mui/icons-material';
import { addressAPI } from '../services/api';

const BORDEAUX = '#7A1B2D';

const STATUS_COLORS = {
  NEW: '#7A1B2D', CONTACTED: '#A68836', APPOINTMENT: '#2E7D32',
  NOT_INTERESTED: '#666666', CONVERTED: '#5A0F1E', INVALID: '#D32F2F'
};

const STATUS_LABELS = {
  NEW: 'Neu', CONTACTED: 'Kontaktiert', APPOINTMENT: 'Termin',
  NOT_INTERESTED: 'Kein Interesse', CONVERTED: 'Konvertiert', INVALID: 'Ungueltig'
};

const AddressDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editDialog, setEditDialog] = useState({ open: false, address: null });
  const [editData, setEditData] = useState({});
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, isError } = useQuery(
    ['addresses', id, statusFilter],
    () => addressAPI.getAddresses(id, statusFilter ? { status: statusFilter } : {}),
    { enabled: !!id }
  );

  const updateMutation = useMutation(
    ({ addrId, updates }) => addressAPI.updateAddress(id, addrId, updates),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['addresses', id]);
        queryClient.invalidateQueries('address-lists');
        setEditDialog({ open: false, address: null });
      }
    }
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: BORDEAUX }} />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/address-lists')} sx={{ mb: 2 }}>
          Zurueck
        </Button>
        <Alert severity="error">Fehler beim Laden der Adressen</Alert>
      </Box>
    );
  }

  const responseData = data?.data?.data || data?.data || {};
  const addresses = responseData.addresses || [];
  const listInfo = responseData.list || {};

  const openEditDialog = (addr) => {
    setEditData({
      status: addr.status || 'NEW',
      notes: addr.notes || '',
      contact_name: addr.contact_name || '',
      phone: addr.phone || '',
      email: addr.email || '',
      total_households: addr.total_households ?? '',
      contacted_households: addr.contacted_households ?? ''
    });
    setEditDialog({ open: true, address: addr });
  };

  const handleSave = () => {
    const updates = { ...editData };
    if (updates.total_households === '') updates.total_households = null;
    else updates.total_households = parseInt(updates.total_households, 10);
    if (updates.contacted_households === '') updates.contacted_households = null;
    else updates.contacted_households = parseInt(updates.contacted_households, 10);
    // Auto-set visited_at when status changes from NEW
    if (editData.status !== 'NEW' && editDialog.address.status === 'NEW') {
      updates.visited_at = new Date().toISOString();
    }
    updateMutation.mutate({ addrId: editDialog.address.id, updates });
  };

  // Statistics
  const totalAddr = addresses.length;
  const contacted = addresses.filter(a => a.status !== 'NEW' && a.status !== 'INVALID').length;
  const totalHH = addresses.reduce((sum, a) => sum + (a.total_households || 0), 0);
  const contactedHH = addresses.reduce((sum, a) => sum + (a.contacted_households || 0), 0);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/address-lists')} sx={{ mr: 2 }}>
            Zurueck
          </Button>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {listInfo.name || `Liste #${id}`}
          </Typography>
        </Box>
        <Button
          variant="outlined" startIcon={<Map />}
          onClick={() => navigate(`/address-lists/${id}/map`)}
          sx={{ borderColor: BORDEAUX, color: BORDEAUX }}
        >
          Karte anzeigen
        </Button>
      </Box>

      {/* Statistics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">Adressen</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{totalAddr}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">Besucht</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#2E7D32' }}>{contacted}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">Haushalte gesamt</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{totalHH}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">Angetroffen</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: BORDEAUX }}>{contactedHH}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Chip label="Alle" onClick={() => setStatusFilter('')}
          variant={statusFilter === '' ? 'filled' : 'outlined'}
          sx={statusFilter === '' ? { bgcolor: BORDEAUX, color: '#fff' } : { borderColor: BORDEAUX, color: BORDEAUX }} />
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <Chip key={key} label={label} onClick={() => setStatusFilter(key)}
            variant={statusFilter === key ? 'filled' : 'outlined'}
            sx={statusFilter === key
              ? { bgcolor: STATUS_COLORS[key], color: '#fff' }
              : { borderColor: STATUS_COLORS[key], color: STATUS_COLORS[key] }} />
        ))}
      </Box>

      {/* Address Table */}
      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 600 }}>Adresse</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Kontakt</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Haushalte</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Angetroffen</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Notizen</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Aktion</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {addresses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                    Keine Adressen {statusFilter ? 'mit diesem Status' : 'vorhanden'}
                  </TableCell>
                </TableRow>
              )}
              {addresses.map((addr) => (
                <TableRow key={addr.id} hover sx={{ cursor: 'pointer' }} onClick={() => openEditDialog(addr)}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Home sx={{ fontSize: 16, color: BORDEAUX }} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {addr.street}{addr.house_number ? ` ${addr.house_number}` : ''}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {addr.postal_code} {addr.city}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {addr.contact_name && (
                      <Typography variant="body2">{addr.contact_name}</Typography>
                    )}
                    {addr.phone && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                        <Phone sx={{ fontSize: 12 }} /> {addr.phone}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_LABELS[addr.status] || addr.status}
                      size="small"
                      sx={{
                        bgcolor: (STATUS_COLORS[addr.status] || '#999') + '20',
                        color: STATUS_COLORS[addr.status] || '#999',
                        fontWeight: 500
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {addr.total_households != null ? addr.total_households : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" sx={{ fontWeight: 600, color: addr.contacted_households > 0 ? '#2E7D32' : 'inherit' }}>
                      {addr.contacted_households != null ? addr.contacted_households : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                      {addr.notes || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); openEditDialog(addr); }}>
                      <Edit sx={{ fontSize: 18, color: BORDEAUX }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, address: null })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          Adresse bearbeiten
          {editDialog.address && (
            <Typography variant="body2" color="text.secondary">
              {editDialog.address.street} {editDialog.address.house_number}, {editDialog.address.postal_code} {editDialog.address.city}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {updateMutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>Fehler beim Speichern</Alert>
          )}

          <TextField select fullWidth label="Status" sx={{ mt: 1, mb: 2 }}
            value={editData.status || 'NEW'}
            onChange={(e) => setEditData(p => ({ ...p, status: e.target.value }))}>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <MenuItem key={key} value={key}>{label}</MenuItem>
            ))}
          </TextField>

          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Groups sx={{ fontSize: 18, color: BORDEAUX }} /> Haushalte
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <TextField fullWidth label="Haushalte gesamt" type="number" size="small"
                value={editData.total_households}
                onChange={(e) => setEditData(p => ({ ...p, total_households: e.target.value }))}
                inputProps={{ min: 0 }}
                helperText="Wie viele Haushalte an der Adresse?" />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Angetroffen" type="number" size="small"
                value={editData.contacted_households}
                onChange={(e) => setEditData(p => ({ ...p, contacted_households: e.target.value }))}
                inputProps={{ min: 0 }}
                helperText="Wie viele Haushalte angetroffen?" />
            </Grid>
          </Grid>

          <TextField fullWidth label="Kontaktname" size="small" sx={{ mb: 2 }}
            value={editData.contact_name}
            onChange={(e) => setEditData(p => ({ ...p, contact_name: e.target.value }))} />

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <TextField fullWidth label="Telefon" size="small"
                value={editData.phone}
                onChange={(e) => setEditData(p => ({ ...p, phone: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="E-Mail" size="small"
                value={editData.email}
                onChange={(e) => setEditData(p => ({ ...p, email: e.target.value }))} />
            </Grid>
          </Grid>

          <TextField fullWidth label="Notizen" multiline rows={3} size="small"
            value={editData.notes}
            onChange={(e) => setEditData(p => ({ ...p, notes: e.target.value }))} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditDialog({ open: false, address: null })}>Abbrechen</Button>
          <Button variant="contained" onClick={handleSave}
            disabled={updateMutation.isLoading}
            startIcon={updateMutation.isLoading ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
            sx={{ bgcolor: BORDEAUX, '&:hover': { bgcolor: '#5A0F1E' } }}>
            {updateMutation.isLoading ? 'Wird gespeichert...' : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AddressDetailPage;
