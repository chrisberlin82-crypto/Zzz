import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box, Typography, Button, TextField, Table, TableBody, TableCell,
  TableHead, TableRow, TablePagination, IconButton, Chip, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid, MenuItem, Card,
  Tabs, Tab, Alert, CircularProgress
} from '@mui/material';
import {
  Add, Visibility, Edit, Delete, FilterList
} from '@mui/icons-material';
import { contractAPI, customerAPI, productAPI } from '../services/api';

const BORDEAUX = '#7A1B2D';

const STATUS_OPTIONS = [
  { value: '', label: 'Alle' },
  { value: 'LEAD', label: 'Lead' },
  { value: 'QUALIFIED', label: 'Qualifiziert' },
  { value: 'OFFER', label: 'Angebot' },
  { value: 'NEGOTIATION', label: 'Verhandlung' },
  { value: 'SIGNED', label: 'Unterschrieben' },
  { value: 'ACTIVE', label: 'Aktiv' },
  { value: 'CANCELLED', label: 'Storniert' },
  { value: 'EXPIRED', label: 'Abgelaufen' }
];

const STATUS_COLORS = {
  LEAD: '#8B7355', QUALIFIED: '#A68836', OFFER: '#B8860B',
  NEGOTIATION: '#9E3347', SIGNED: '#7A1B2D', ACTIVE: '#2E7D32',
  CANCELLED: '#D32F2F', EXPIRED: '#666666'
};

const INITIAL_FORM = {
  customer_id: '',
  product_id: '',
  consumption: '',
  start_date: '',
  duration: '',
  estimated_value: '',
  notes: ''
};

const ContractsPage = () => {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Auto-open dialog when customer_id or product_id is in URL
  useEffect(() => {
    const customerId = searchParams.get('customer_id');
    const productId = searchParams.get('product_id');
    if (customerId || productId) {
      setFormData(prev => ({
        ...prev,
        ...(customerId ? { customer_id: customerId } : {}),
        ...(productId ? { product_id: productId } : {})
      }));
      setDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data, isLoading } = useQuery(
    ['contracts', page + 1, statusFilter],
    () => contractAPI.getAll({ page: page + 1, limit: 20, status: statusFilter || undefined }),
    { keepPreviousData: true }
  );

  const { data: customersData } = useQuery(
    'customers-list',
    () => customerAPI.getAll({ limit: 200 }),
    { enabled: dialogOpen }
  );

  const { data: productsData } = useQuery(
    'products-list',
    () => productAPI.getAll({ limit: 200 }),
    { enabled: dialogOpen }
  );

  const createMutation = useMutation(
    (data) => contractAPI.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('contracts');
        setDialogOpen(false);
        setFormData(INITIAL_FORM);
      }
    }
  );

  const deleteMutation = useMutation(
    (id) => contractAPI.delete(id),
    { onSuccess: () => queryClient.invalidateQueries('contracts') }
  );

  const contracts = data?.data?.data?.contracts || [];
  const pagination = data?.data?.data?.pagination || { total: 0 };
  const customers = customersData?.data?.data?.customers || [];
  const products = productsData?.data?.data?.products || productsData?.data?.data || [];

  const handleSubmit = () => {
    const submitData = {
      ...formData,
      customer_id: parseInt(formData.customer_id),
      product_id: parseInt(formData.product_id),
      consumption: formData.consumption ? parseFloat(formData.consumption) : undefined,
      duration: formData.duration ? parseInt(formData.duration) : undefined,
      estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : undefined
    };
    createMutation.mutate(submitData);
  };

  const handleTabChange = (event, newValue) => {
    setStatusFilter(newValue);
    setPage(0);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Vertraege</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>
          Neuer Vertrag
        </Button>
      </Box>

      {/* Status Filter Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs
          value={statusFilter}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': { textTransform: 'none', minWidth: 'auto' },
            '& .Mui-selected': { color: BORDEAUX }
          }}
          TabIndicatorProps={{ sx: { bgcolor: BORDEAUX } }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <Tab key={opt.value} value={opt.value} label={opt.label} />
          ))}
        </Tabs>
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
                  <TableCell>ID</TableCell>
                  <TableCell>Kunde</TableCell>
                  <TableCell>Produkt</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Wert</TableCell>
                  <TableCell>Erstellt</TableCell>
                  <TableCell align="right">Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contracts.map((contract) => (
                  <TableRow key={contract.id} hover>
                    <TableCell>#{contract.id}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>
                      {contract.customer
                        ? `${contract.customer.first_name} ${contract.customer.last_name}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {contract.product?.tariff_name || '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={STATUS_OPTIONS.find(s => s.value === contract.status)?.label || contract.status}
                        size="small"
                        sx={{
                          bgcolor: (STATUS_COLORS[contract.status] || '#999') + '20',
                          color: STATUS_COLORS[contract.status] || '#999',
                          fontWeight: 500
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {parseFloat(contract.estimated_value || 0).toFixed(2)} EUR
                    </TableCell>
                    <TableCell>
                      {contract.created_at
                        ? new Date(contract.created_at).toLocaleDateString('de-DE')
                        : '-'}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => navigate(`/contracts/${contract.id}`)}>
                        <Visibility fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => {
                        if (window.confirm('Vertrag wirklich loeschen?')) deleteMutation.mutate(contract.id);
                      }}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && contracts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      Keine Vertraege gefunden
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div" count={pagination.total} page={page}
              onPageChange={(e, p) => setPage(p)} rowsPerPage={20} rowsPerPageOptions={[20]}
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} von ${count}`}
            />
          </>
        )}
      </Card>

      {/* Neuer Vertrag Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Neuer Vertrag</DialogTitle>
        <DialogContent>
          {createMutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Fehler beim Erstellen des Vertrags
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                select fullWidth label="Kunde" required
                value={formData.customer_id}
                onChange={(e) => setFormData(p => ({ ...p, customer_id: e.target.value }))}
              >
                <MenuItem value="">-- Kunde waehlen --</MenuItem>
                {customers.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} {c.company_name ? `(${c.company_name})` : ''}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                select fullWidth label="Produkt" required
                value={formData.product_id}
                onChange={(e) => setFormData(p => ({ ...p, product_id: e.target.value }))}
              >
                <MenuItem value="">-- Produkt waehlen --</MenuItem>
                {products.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.provider} - {p.tariff_name} ({p.category})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth label="Verbrauch (kWh)" type="number"
                value={formData.consumption}
                onChange={(e) => setFormData(p => ({ ...p, consumption: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth label="Startdatum" type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.start_date}
                onChange={(e) => setFormData(p => ({ ...p, start_date: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth label="Laufzeit (Monate)" type="number"
                value={formData.duration}
                onChange={(e) => setFormData(p => ({ ...p, duration: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth label="Geschaetzter Wert (EUR)" type="number"
                value={formData.estimated_value}
                onChange={(e) => setFormData(p => ({ ...p, estimated_value: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth label="Notizen" multiline rows={3}
                value={formData.notes}
                onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setDialogOpen(false); setFormData(INITIAL_FORM); }}>
            Abbrechen
          </Button>
          <Button
            variant="contained" onClick={handleSubmit}
            disabled={createMutation.isLoading || !formData.customer_id || !formData.product_id}
          >
            {createMutation.isLoading ? 'Wird erstellt...' : 'Vertrag erstellen'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContractsPage;
