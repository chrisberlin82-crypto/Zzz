import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box, Typography, Button, TextField, Grid, Card, CardContent,
  CardActions, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, IconButton, CircularProgress, Alert, InputAdornment
} from '@mui/material';
import {
  Add, Edit, Delete, ElectricBolt, LocalFireDepartment, Euro,
  Timer, Business, Search, Category
} from '@mui/icons-material';
import { productAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const BORDEAUX = '#7A1B2D';

const CATEGORIES = [
  { value: 'STROM', label: 'Strom', icon: <ElectricBolt />, color: '#C4A35A' },
  { value: 'GAS', label: 'Gas', icon: <LocalFireDepartment />, color: '#9E3347' }
];

const INITIAL_FORM = {
  provider: '',
  tariff_name: '',
  category: 'STROM',
  base_price: '',
  working_price: '',
  duration: '',
  cancellation_period: '',
  features: '',
  notes: ''
};

const ProductsPage = () => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = hasRole(['ADMIN', 'STANDORTLEITUNG']);

  const { data, isLoading } = useQuery(
    ['products', search, categoryFilter],
    () => productAPI.getAll({
      search: search || undefined,
      category: categoryFilter || undefined
    }),
    { keepPreviousData: true }
  );

  const createMutation = useMutation(
    (data) => editProduct
      ? productAPI.update(editProduct.id, data)
      : productAPI.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('products');
        setDialogOpen(false);
        setEditProduct(null);
        setFormData(INITIAL_FORM);
      }
    }
  );

  const deleteMutation = useMutation(
    (id) => productAPI.delete(id),
    { onSuccess: () => queryClient.invalidateQueries('products') }
  );

  const products = data?.data?.data?.products || data?.data?.data || [];

  const filteredProducts = products.filter(p => {
    if (search) {
      const s = search.toLowerCase();
      if (!p.provider?.toLowerCase().includes(s) &&
          !p.tariff_name?.toLowerCase().includes(s)) {
        return false;
      }
    }
    return true;
  });

  const openDialog = (product = null) => {
    setEditProduct(product);
    if (product) {
      setFormData({
        provider: product.provider || '',
        tariff_name: product.tariff_name || '',
        category: product.category || 'STROM',
        base_price: product.base_price || '',
        working_price: product.working_price || '',
        duration: product.duration || '',
        cancellation_period: product.cancellation_period || '',
        features: Array.isArray(product.features) ? product.features.join(', ') : product.features || '',
        notes: product.notes || ''
      });
    } else {
      setFormData(INITIAL_FORM);
    }
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const submitData = {
      ...formData,
      base_price: formData.base_price ? parseFloat(formData.base_price) : undefined,
      working_price: formData.working_price ? parseFloat(formData.working_price) : undefined,
      duration: formData.duration ? parseInt(formData.duration) : undefined,
      cancellation_period: formData.cancellation_period ? parseInt(formData.cancellation_period) : undefined,
      features: formData.features
        ? formData.features.split(',').map(f => f.trim()).filter(Boolean)
        : []
    };
    createMutation.mutate(submitData);
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
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Produkte (Energietarife)</Typography>
        {isAdmin && (
          <Button variant="contained" startIcon={<Add />} onClick={() => openDialog()}>
            Neues Produkt
          </Button>
        )}
      </Box>

      {/* Filter */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth placeholder="Produkte suchen..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search /></InputAdornment>
              }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                label="Alle"
                onClick={() => setCategoryFilter('')}
                variant={categoryFilter === '' ? 'filled' : 'outlined'}
                sx={categoryFilter === '' ? { bgcolor: BORDEAUX, color: '#fff' } : { borderColor: BORDEAUX, color: BORDEAUX }}
              />
              {CATEGORIES.map((cat) => (
                <Chip
                  key={cat.value}
                  icon={React.cloneElement(cat.icon, {
                    sx: { color: categoryFilter === cat.value ? '#fff !important' : `${cat.color} !important`, fontSize: 18 }
                  })}
                  label={cat.label}
                  onClick={() => setCategoryFilter(cat.value)}
                  variant={categoryFilter === cat.value ? 'filled' : 'outlined'}
                  sx={categoryFilter === cat.value
                    ? { bgcolor: cat.color, color: '#fff' }
                    : { borderColor: cat.color, color: cat.color }}
                />
              ))}
            </Box>
          </Grid>
        </Grid>
      </Card>

      {/* Produkt-Grid */}
      <Grid container spacing={3}>
        {filteredProducts.map((product) => {
          const catInfo = CATEGORIES.find(c => c.value === product.category) || CATEGORIES[0];
          return (
            <Grid item xs={12} sm={6} md={4} key={product.id}>
              <Card sx={{
                height: '100%', display: 'flex', flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 24px rgba(122, 27, 45, 0.15)'
                }
              }}>
                <CardContent sx={{ p: 3, flexGrow: 1 }}>
                  {/* Kategorie-Badge */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Chip
                      icon={React.cloneElement(catInfo.icon, { sx: { color: `${catInfo.color} !important`, fontSize: 18 } })}
                      label={catInfo.label}
                      size="small"
                      sx={{ bgcolor: `${catInfo.color}15`, color: catInfo.color, fontWeight: 500 }}
                    />
                    {product.duration && (
                      <Chip
                        icon={<Timer sx={{ fontSize: 16 }} />}
                        label={`${product.duration} Mon.`}
                        size="small"
                        variant="outlined"
                        sx={{ borderColor: '#E0D8D0' }}
                      />
                    )}
                  </Box>

                  {/* Anbieter & Tarif */}
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Business sx={{ fontSize: 14 }} /> {product.provider || '-'}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, mt: 0.5 }}>
                    {product.tariff_name || '-'}
                  </Typography>

                  {/* Preise */}
                  <Box sx={{ bgcolor: `${BORDEAUX}06`, borderRadius: 2, p: 2, mb: 2 }}>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Grundpreis</Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: BORDEAUX }}>
                          {product.base_price ? `${parseFloat(product.base_price).toFixed(2)} EUR` : '-'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">pro Monat</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Arbeitspreis</Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: BORDEAUX }}>
                          {product.working_price ? `${parseFloat(product.working_price).toFixed(2)} ct` : '-'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">pro kWh</Typography>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Features */}
                  {product.features && product.features.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {(Array.isArray(product.features) ? product.features : []).map((feature, idx) => (
                        <Chip key={idx} label={feature} size="small" variant="outlined"
                          sx={{ fontSize: '0.7rem', borderColor: '#E0D8D0' }} />
                      ))}
                    </Box>
                  )}
                </CardContent>

                {/* Aktionen */}
                {isAdmin && (
                  <CardActions sx={{ px: 3, pb: 2, pt: 0 }}>
                    <Button size="small" startIcon={<Edit />}
                      onClick={() => openDialog(product)}
                      sx={{ color: BORDEAUX }}>
                      Bearbeiten
                    </Button>
                    <IconButton size="small" color="error"
                      onClick={() => {
                        if (window.confirm('Produkt wirklich loeschen?')) {
                          deleteMutation.mutate(product.id);
                        }
                      }}
                      sx={{ ml: 'auto' }}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </CardActions>
                )}
              </Card>
            </Grid>
          );
        })}

        {filteredProducts.length === 0 && (
          <Grid item xs={12}>
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Category sx={{ fontSize: 64, color: '#E0D8D0', mb: 2 }} />
              <Typography color="text.secondary" variant="h6">
                Keine Produkte gefunden
              </Typography>
            </Box>
          </Grid>
        )}
      </Grid>

      {/* Erstellen/Bearbeiten Dialog */}
      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditProduct(null); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {editProduct ? 'Produkt bearbeiten' : 'Neues Produkt'}
        </DialogTitle>
        <DialogContent>
          {createMutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>Fehler beim Speichern</Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth label="Anbieter" required
                value={formData.provider}
                onChange={(e) => setFormData(p => ({ ...p, provider: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth label="Tarifname" required
                value={formData.tariff_name}
                onChange={(e) => setFormData(p => ({ ...p, tariff_name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select fullWidth label="Kategorie" required
                value={formData.category}
                onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
              >
                <MenuItem value="STROM">Strom</MenuItem>
                <MenuItem value="GAS">Gas</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth label="Grundpreis (EUR/Monat)" type="number"
                value={formData.base_price}
                onChange={(e) => setFormData(p => ({ ...p, base_price: e.target.value }))}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Euro sx={{ fontSize: 18 }} /></InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth label="Arbeitspreis (ct/kWh)" type="number"
                value={formData.working_price}
                onChange={(e) => setFormData(p => ({ ...p, working_price: e.target.value }))}
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
                fullWidth label="Kuendigungsfrist (Wochen)" type="number"
                value={formData.cancellation_period}
                onChange={(e) => setFormData(p => ({ ...p, cancellation_period: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth label="Features (kommagetrennt)"
                value={formData.features}
                onChange={(e) => setFormData(p => ({ ...p, features: e.target.value }))}
                helperText="z.B. Preisgarantie, Oekostrom, Bonus"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth label="Notizen" multiline rows={2}
                value={formData.notes}
                onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setDialogOpen(false); setEditProduct(null); }}>
            Abbrechen
          </Button>
          <Button
            variant="contained" onClick={handleSubmit}
            disabled={createMutation.isLoading || !formData.provider || !formData.tariff_name}
          >
            {createMutation.isLoading ? 'Wird gespeichert...' : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductsPage;
