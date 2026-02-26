import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box, Typography, Button, TextField, Grid, Card, CardContent,
  CardActions, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, IconButton, CircularProgress, Alert, InputAdornment,
  Divider, Tooltip
} from '@mui/material';
import {
  Add, Edit, Delete, ElectricBolt, LocalFireDepartment, Euro,
  Timer, Business, Search, Category, ShoppingCart, Api, OpenInNew,
  TrackChanges, Language, Bolt, Info
} from '@mui/icons-material';
import { productAPI, energyProviderAPI } from '../services/api';
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

// ====== Energie-Dienstleister API Card (Slot 1) ======
const EnergyProviderCard = () => {
  const [lookupOpen, setLookupOpen] = useState(false);
  const [plz, setPlz] = useState('');
  const [consumption, setConsumption] = useState('3500');
  const [category, setCategory] = useState('STROM');

  const tariffMutation = useMutation(
    (data) => energyProviderAPI.tariffLookup(data)
  );

  const handleLookup = () => {
    if (!plz) return;
    tariffMutation.mutate({
      postal_code: plz,
      consumption_kwh: parseInt(consumption) || 3500,
      category
    });
  };

  const tariffs = tariffMutation.data?.data?.data?.tariffs || [];

  return (
    <>
      <Card sx={{
        height: '100%', display: 'flex', flexDirection: 'column',
        border: '2px dashed #E0D8D0',
        transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 24px rgba(122, 27, 45, 0.15)',
          borderColor: BORDEAUX
        }
      }}>
        <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{
            width: 64, height: 64, borderRadius: '16px',
            bgcolor: `${BORDEAUX}10`, display: 'flex',
            alignItems: 'center', justifyContent: 'center', mb: 2
          }}>
            <Api sx={{ fontSize: 32, color: BORDEAUX }} />
          </Box>

          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, textAlign: 'center' }}>
            Energiedienstleister
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 2 }}>
            GASAG &amp; E.ON Tarife ueber Partner-Schnittstelle
          </Typography>

          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center', mb: 2 }}>
            <Chip icon={<Bolt sx={{ fontSize: 14 }} />} label="GASAG" size="small"
              sx={{ bgcolor: '#9E334715', color: '#9E3347', fontWeight: 500 }} />
            <Chip icon={<ElectricBolt sx={{ fontSize: 14 }} />} label="E.ON" size="small"
              sx={{ bgcolor: '#C4A35A15', color: '#C4A35A', fontWeight: 500 }} />
          </Box>

          <Alert severity="info" sx={{ fontSize: '0.75rem', mb: 1 }}>
            Integration ueber Ennux / EnerConnex / Verivox. Direkte API-Anbindung in Vorbereitung.
          </Alert>
        </CardContent>

        <CardActions sx={{ px: 3, pb: 2, pt: 0, justifyContent: 'center' }}>
          <Button size="small" variant="outlined" startIcon={<Search />}
            onClick={() => setLookupOpen(true)}
            sx={{ borderColor: BORDEAUX, color: BORDEAUX }}>
            Tarifsuche
          </Button>
        </CardActions>
      </Card>

      {/* Tarifsuche Dialog */}
      <Dialog open={lookupOpen} onClose={() => setLookupOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          <Api sx={{ mr: 1, verticalAlign: 'middle', color: BORDEAUX }} />
          Energietarife suchen (GASAG / E.ON)
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Postleitzahl" value={plz}
                onChange={(e) => setPlz(e.target.value)} placeholder="z.B. 10115"
                size="small" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Jahresverbrauch (kWh)" type="number"
                value={consumption} onChange={(e) => setConsumption(e.target.value)}
                size="small" />
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField select fullWidth label="Kategorie" value={category}
                onChange={(e) => setCategory(e.target.value)} size="small">
                <MenuItem value="STROM">Strom</MenuItem>
                <MenuItem value="GAS">Gas</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button fullWidth variant="contained" onClick={handleLookup}
                disabled={tariffMutation.isLoading || !plz}
                sx={{ bgcolor: BORDEAUX, '&:hover': { bgcolor: '#5A0F1E' }, height: 40 }}>
                {tariffMutation.isLoading ? <CircularProgress size={20} color="inherit" /> : 'Suchen'}
              </Button>
            </Grid>
          </Grid>

          {tariffs.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Ergebnisse fuer PLZ {plz}
              </Typography>
              <Alert severity="warning" sx={{ mb: 2, fontSize: '0.75rem' }}>
                Platzhalter-Daten. Echte Tarife nach Aktivierung der Partner-Schnittstelle.
              </Alert>
              <Grid container spacing={2}>
                {tariffs.map((tariff, idx) => (
                  <Grid item xs={12} sm={4} key={idx}>
                    <Card variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="caption" color="text.secondary">{tariff.provider}</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{tariff.tariff_name}</Typography>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="body2">
                        Grundpreis: <strong>{tariff.base_price_monthly} EUR/Monat</strong>
                      </Typography>
                      <Typography variant="body2">
                        Arbeitspreis: <strong>{tariff.working_price_ct} ct/kWh</strong>
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="body2" sx={{ color: BORDEAUX, fontWeight: 600 }}>
                        ca. {tariff.estimated_monthly} EUR/Monat
                      </Typography>
                      <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
                        <Chip label={`${tariff.duration_months} Mon.`} size="small" variant="outlined" />
                        {tariff.is_eco && <Chip label="Oeko" size="small" color="success" />}
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLookupOpen(false)}>Schliessen</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// ====== Externe Seite iFrame Card (Slot 2) ======
const ExternalIframeCard = () => {
  const [iframeOpen, setIframeOpen] = useState(false);
  const [iframeUrl, setIframeUrl] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const iframeRef = useRef(null);
  const startTimeRef = useRef(null);

  const activityMutation = useMutation(
    (data) => energyProviderAPI.logIframeActivity(data)
  );

  const PRESET_URLS = [
    { label: 'Verivox Tarifrechner', url: 'https://www.verivox.de/strom/', category: 'TARIFF' },
    { label: 'Check24 Energie', url: 'https://www.check24.de/strom/', category: 'TARIFF' },
    { label: 'GASAG Tarifrechner', url: 'https://www.gasag.de/privatkunden/erdgas', category: 'PROVIDER' },
    { label: 'E.ON Tarife', url: 'https://www.eon.de/de/pk/strom.html', category: 'PROVIDER' }
  ];

  const handleOpenIframe = (url) => {
    setIframeUrl(url);
    setIframeOpen(true);
    startTimeRef.current = Date.now();

    // Aktivitaet dokumentieren: Seite geoeffnet
    activityMutation.mutate({
      url,
      action: 'PAGE_OPENED',
      details: `Externe Seite geoeffnet: ${url}`
    });
  };

  const handleCloseIframe = () => {
    // Dauer berechnen und Aktivitaet dokumentieren
    const duration = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : 0;

    activityMutation.mutate({
      url: iframeUrl,
      action: 'PAGE_CLOSED',
      details: `Externe Seite geschlossen nach ${duration}s`,
      duration_seconds: duration
    });

    setIframeOpen(false);
    setIframeUrl('');
    startTimeRef.current = null;
  };

  return (
    <>
      <Card sx={{
        height: '100%', display: 'flex', flexDirection: 'column',
        border: '2px dashed #E0D8D0',
        transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 24px rgba(122, 27, 45, 0.15)',
          borderColor: BORDEAUX
        }
      }}>
        <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{
            width: 64, height: 64, borderRadius: '16px',
            bgcolor: '#C4A35A10', display: 'flex',
            alignItems: 'center', justifyContent: 'center', mb: 2
          }}>
            <Language sx={{ fontSize: 32, color: '#C4A35A' }} />
          </Box>

          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, textAlign: 'center' }}>
            Externe Angebote
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 2 }}>
            Tarifrechner und Partnerseiten direkt im System
          </Typography>

          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center', mb: 2 }}>
            <Chip icon={<TrackChanges sx={{ fontSize: 14 }} />} label="Tracking" size="small"
              sx={{ bgcolor: '#2E7D3215', color: '#2E7D32', fontWeight: 500 }} />
            <Chip icon={<OpenInNew sx={{ fontSize: 14 }} />} label="iFrame" size="small"
              sx={{ bgcolor: '#C4A35A15', color: '#C4A35A', fontWeight: 500 }} />
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
            Alle Aktivitaeten auf externen Seiten werden automatisch dokumentiert.
          </Typography>
        </CardContent>

        <CardActions sx={{ px: 3, pb: 2, pt: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
            {PRESET_URLS.slice(0, 2).map((preset) => (
              <Button key={preset.url} size="small" variant="outlined"
                startIcon={<OpenInNew />}
                onClick={() => handleOpenIframe(preset.url)}
                sx={{ borderColor: BORDEAUX, color: BORDEAUX, fontSize: '0.7rem' }}>
                {preset.label}
              </Button>
            ))}
          </Box>
        </CardActions>
      </Card>

      {/* iFrame Dialog */}
      <Dialog open={iframeOpen} onClose={handleCloseIframe}
        maxWidth={false}
        fullWidth
        PaperProps={{ sx: { width: '95vw', height: '90vh', maxWidth: 'none' } }}>
        <DialogTitle sx={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Language sx={{ color: BORDEAUX }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Externe Seite
            </Typography>
            <Chip label={iframeUrl} size="small" variant="outlined" sx={{ maxWidth: 400, fontSize: '0.7rem' }} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Aktivitaeten werden automatisch dokumentiert">
              <Chip icon={<TrackChanges sx={{ fontSize: 14 }} />} label="Tracking aktiv"
                size="small" color="success" />
            </Tooltip>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
          {iframeUrl && (
            <iframe
              ref={iframeRef}
              src={iframeUrl}
              title="Externe Seite"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                minHeight: 'calc(90vh - 130px)'
              }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1, borderTop: '1px solid #E0D8D0' }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flex: 1 }}>
            <TextField size="small" placeholder="Eigene URL eingeben..." value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              sx={{ flex: 1, maxWidth: 400 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Language sx={{ fontSize: 18 }} /></InputAdornment>
              }}
            />
            <Button size="small" variant="outlined"
              onClick={() => { if (customUrl) handleOpenIframe(customUrl); }}
              disabled={!customUrl}
              sx={{ borderColor: BORDEAUX, color: BORDEAUX }}>
              Laden
            </Button>
            {PRESET_URLS.slice(2).map((preset) => (
              <Button key={preset.url} size="small" variant="text"
                onClick={() => { setIframeUrl(preset.url); activityMutation.mutate({ url: preset.url, action: 'PAGE_NAVIGATED', details: `Navigiert zu: ${preset.label}` }); }}
                sx={{ color: BORDEAUX, fontSize: '0.7rem' }}>
                {preset.label}
              </Button>
            ))}
          </Box>
          <Button onClick={handleCloseIframe} variant="contained"
            sx={{ bgcolor: BORDEAUX, '&:hover': { bgcolor: '#5A0F1E' } }}>
            Schliessen
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// ====== Haupt-Seite ======
const ProductsPage = () => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
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
          <Button variant="contained" startIcon={<Add />} onClick={() => openDialog()}
            sx={{ bgcolor: BORDEAUX, '&:hover': { bgcolor: '#5A0F1E' } }}>
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

      {/* Produkt-Grid mit 2 leeren Slots vorne */}
      <Grid container spacing={3}>
        {/* Slot 1: Energiedienstleister API */}
        <Grid item xs={12} sm={6} md={4}>
          <EnergyProviderCard />
        </Grid>

        {/* Slot 2: Externe Seiten iFrame */}
        <Grid item xs={12} sm={6} md={4}>
          <ExternalIframeCard />
        </Grid>

        {/* Regulaere Produkte */}
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
                <CardActions sx={{ px: 3, pb: 2, pt: 0 }}>
                  <Button size="small" startIcon={<ShoppingCart />}
                    onClick={() => navigate(`/sale?product_id=${product.id}`)}
                    sx={{ color: BORDEAUX }}>
                    Verkaufen
                  </Button>
                  {isAdmin && (
                    <>
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
                    </>
                  )}
                </CardActions>
              </Card>
            </Grid>
          );
        })}

        {filteredProducts.length === 0 && (
          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Category sx={{ fontSize: 64, color: '#E0D8D0', mb: 2 }} />
              <Typography color="text.secondary" variant="h6">
                Keine weiteren Produkte
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Nutzen Sie die Energiedienstleister-Karte oder erstellen Sie neue Produkte.
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
            sx={{ bgcolor: BORDEAUX, '&:hover': { bgcolor: '#5A0F1E' } }}
          >
            {createMutation.isLoading ? 'Wird gespeichert...' : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductsPage;
