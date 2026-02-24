import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box, Typography, Button, TextField, Card, CardContent, Grid, Chip,
  Stepper, Step, StepLabel, CircularProgress, Alert, Divider, MenuItem,
  List, ListItem, ListItemText, ListItemAvatar, Avatar, InputAdornment,
  Checkbox, FormControlLabel, IconButton
} from '@mui/material';
import {
  Person, Add, Search, ArrowBack, ArrowForward, CheckCircle,
  Description, Euro, CalendarToday, GpsFixed, Draw, Refresh,
  Business, Phone, Email, ElectricBolt, LocalFireDepartment,
  AccessTime, LocationOn
} from '@mui/icons-material';
import SignatureCanvas from 'react-signature-canvas';
import { customerAPI, contractAPI, signatureAPI, productAPI } from '../services/api';

const BORDEAUX = '#7A1B2D';
const STEPS = ['Kunde', 'Vertrag', 'Unterschrift'];

const CUSTOMER_INITIAL = {
  first_name: '', last_name: '', email: '', phone: '',
  company_name: '', street: '', postal_code: '', city: '',
  type: 'PRIVATE', source: 'DIRECT'
};

const SaleWizardPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const sigCanvasRef = useRef(null);

  const [activeStep, setActiveStep] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Step 1: Customer
  const [customerMode, setCustomerMode] = useState('select');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomer, setNewCustomer] = useState(CUSTOMER_INITIAL);

  // Step 2: Contract
  const [contractData, setContractData] = useState({
    consumption: '', start_date: '', duration: '', estimated_value: '', notes: ''
  });

  // Step 3: Signature
  const [consent, setConsent] = useState(false);
  const [gpsLocation, setGpsLocation] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [createdContract, setCreatedContract] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Load product from URL
  const productId = searchParams.get('product_id');
  const { data: productData } = useQuery(
    ['product', productId],
    () => productAPI.getOne(productId),
    { enabled: !!productId }
  );

  useEffect(() => {
    if (productData?.data?.data) setSelectedProduct(productData.data.data);
  }, [productData]);

  // All products for manual selection
  const { data: allProductsData } = useQuery(
    'products-sale',
    () => productAPI.getAll({ limit: 200 })
  );
  const allProducts = allProductsData?.data?.data?.products || allProductsData?.data?.data || [];

  // Customer search
  const { data: customersData, isLoading: customersLoading } = useQuery(
    ['customers-search', customerSearch],
    () => customerAPI.getAll({ search: customerSearch || undefined, limit: 50 }),
    { enabled: customerMode === 'select' }
  );
  const customers = customersData?.data?.data?.customers || [];

  // Mutations
  const createCustomerMutation = useMutation(
    (data) => customerAPI.create(data),
    {
      onSuccess: (response) => {
        const customer = response?.data?.data;
        setSelectedCustomer(customer);
        queryClient.invalidateQueries('customers');
        setActiveStep(1);
        setError(null);
      },
      onError: (err) => setError(err?.response?.data?.error || 'Fehler beim Erstellen des Kunden')
    }
  );

  const createContractMutation = useMutation(
    (data) => contractAPI.create(data),
    {
      onSuccess: (response) => {
        const contract = response?.data?.data;
        setCreatedContract(contract);
        queryClient.invalidateQueries('contracts');
        setActiveStep(2);
        setError(null);
      },
      onError: (err) => setError(err?.response?.data?.error || 'Fehler beim Erstellen des Vertrags')
    }
  );

  const signatureMutation = useMutation(
    (data) => signatureAPI.create(createdContract.id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('contracts');
        setSubmitSuccess(true);
        setError(null);
      },
      onError: (err) => setError(err?.response?.data?.error || 'Fehler beim Speichern der Unterschrift')
    }
  );

  // GPS
  const captureGPS = () => {
    if (!navigator.geolocation) { setGpsError('Geolocation nicht unterstuetzt.'); return; }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setGpsLoading(false);
      },
      () => { setGpsError('GPS nicht verfuegbar. Bitte Standortzugriff erlauben.'); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => { if (activeStep === 2) captureGPS(); }, [activeStep]);
  useEffect(() => {
    if (activeStep === 2) {
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timer);
    }
  }, [activeStep]);

  // Handlers
  const handleSelectCustomer = (customer) => { setSelectedCustomer(customer); setActiveStep(1); };

  const handleCreateCustomer = () => {
    if (!newCustomer.first_name || !newCustomer.last_name) { setError('Vorname und Nachname sind erforderlich'); return; }
    setError(null);
    createCustomerMutation.mutate(newCustomer);
  };

  const handleCreateContract = () => {
    if (!selectedCustomer || !selectedProduct) { setError('Kunde und Produkt muessen ausgewaehlt sein'); return; }
    setError(null);
    createContractMutation.mutate({
      customer_id: selectedCustomer.id,
      product_id: selectedProduct.id,
      consumption: contractData.consumption ? parseFloat(contractData.consumption) : undefined,
      start_date: contractData.start_date || undefined,
      duration: contractData.duration ? parseInt(contractData.duration) : undefined,
      estimated_value: contractData.estimated_value ? parseFloat(contractData.estimated_value) : undefined,
      notes: contractData.notes || undefined
    });
  };

  const handleSubmitSignature = () => {
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) { setError('Bitte unterschreiben Sie im Feld'); return; }
    if (!consent) { setError('Bitte bestaetigen Sie die Einwilligung'); return; }
    setError(null);
    signatureMutation.mutate({
      signedAt: new Date().toISOString(),
      consent: consent,
      geo: gpsLocation || null,
      deviceInfo: navigator.userAgent,
      signature: { pngBase64: sigCanvasRef.current.toDataURL('image/png') }
    });
  };

  // Success
  if (submitSuccess) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, textAlign: 'center' }}>
        <Card>
          <CardContent sx={{ p: 4 }}>
            <CheckCircle sx={{ fontSize: 80, color: '#2E7D32', mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>Verkauf abgeschlossen!</Typography>
            <Typography color="text.secondary" sx={{ mb: 1 }}>
              Vertrag #{createdContract?.id} wurde erfolgreich erstellt und unterschrieben.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Kunde: {selectedCustomer?.first_name} {selectedCustomer?.last_name}
              {selectedProduct && ` | ${selectedProduct.provider} - ${selectedProduct.tariff_name}`}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button variant="contained" onClick={() => navigate(`/contracts/${createdContract?.id}`)}
                sx={{ bgcolor: BORDEAUX, '&:hover': { bgcolor: '#5A0F1E' } }}>
                Zum Vertrag
              </Button>
              <Button variant="outlined" onClick={() => navigate('/products')}
                sx={{ borderColor: BORDEAUX, color: BORDEAUX }}>
                Weitere Produkte
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mr: 2, color: BORDEAUX }}>
          Zurueck
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Neuer Verkauf</Typography>
      </Box>

      {/* Product Info */}
      {selectedProduct && (
        <Card sx={{ mb: 3, bgcolor: `${BORDEAUX}08` }}>
          <CardContent sx={{ py: 2, display: 'flex', alignItems: 'center', gap: 2, '&:last-child': { pb: 2 } }}>
            {selectedProduct.category === 'GAS'
              ? <LocalFireDepartment sx={{ color: '#9E3347' }} />
              : <ElectricBolt sx={{ color: '#C4A35A' }} />}
            <Box>
              <Typography variant="body2" color="text.secondary">Produkt</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {selectedProduct.provider} - {selectedProduct.tariff_name}
              </Typography>
            </Box>
            <Box sx={{ ml: 'auto', textAlign: 'right' }}>
              <Typography variant="body2" color="text.secondary">Grundpreis</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: BORDEAUX }}>
                {selectedProduct.base_price ? `${parseFloat(selectedProduct.base_price).toFixed(2)} EUR/Mon.` : '-'}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Product selector if none */}
      {!selectedProduct && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Produkt waehlen</Typography>
            <TextField select fullWidth label="Produkt" required value=""
              onChange={(e) => {
                const p = allProducts.find(prod => prod.id === parseInt(e.target.value));
                if (p) setSelectedProduct(p);
              }}>
              <MenuItem value="">-- Produkt waehlen --</MenuItem>
              {allProducts.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.provider} - {p.tariff_name} ({p.category})</MenuItem>
              ))}
            </TextField>
          </CardContent>
        </Card>
      )}

      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel StepIconProps={{ sx: { '&.Mui-active': { color: BORDEAUX }, '&.Mui-completed': { color: BORDEAUX } } }}>
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* ===== STEP 1: KUNDE ===== */}
      {activeStep === 0 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
              <Chip label="Bestehender Kunde" icon={<Search sx={{ fontSize: 18 }} />}
                onClick={() => { setCustomerMode('select'); setError(null); }}
                variant={customerMode === 'select' ? 'filled' : 'outlined'}
                sx={customerMode === 'select'
                  ? { bgcolor: BORDEAUX, color: '#fff', '& .MuiChip-icon': { color: '#fff' } }
                  : { borderColor: BORDEAUX, color: BORDEAUX, '& .MuiChip-icon': { color: BORDEAUX } }} />
              <Chip label="Neuer Kunde" icon={<Add sx={{ fontSize: 18 }} />}
                onClick={() => { setCustomerMode('create'); setError(null); }}
                variant={customerMode === 'create' ? 'filled' : 'outlined'}
                sx={customerMode === 'create'
                  ? { bgcolor: BORDEAUX, color: '#fff', '& .MuiChip-icon': { color: '#fff' } }
                  : { borderColor: BORDEAUX, color: BORDEAUX, '& .MuiChip-icon': { color: BORDEAUX } }} />
            </Box>

            {customerMode === 'select' && (
              <>
                <TextField fullWidth placeholder="Kunde suchen (Name, E-Mail, Firma)..."
                  value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
                  size="small" sx={{ mb: 2 }} />
                {customersLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                    <CircularProgress size={24} sx={{ color: BORDEAUX }} />
                  </Box>
                ) : (
                  <List sx={{ maxHeight: 350, overflow: 'auto' }}>
                    {customers.length === 0 && (
                      <ListItem>
                        <ListItemText primary="Keine Kunden gefunden"
                          secondary="Suchen Sie nach einem Kunden oder erstellen Sie einen neuen."
                          primaryTypographyProps={{ color: 'text.secondary' }} />
                      </ListItem>
                    )}
                    {customers.map((c) => (
                      <ListItem key={c.id} button onClick={() => handleSelectCustomer(c)}
                        sx={{ borderRadius: 1, mb: 0.5, border: '1px solid #E0D8D0',
                          '&:hover': { bgcolor: `${BORDEAUX}08`, borderColor: BORDEAUX } }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: BORDEAUX, width: 36, height: 36, fontSize: '0.8rem' }}>
                            {(c.first_name?.[0] || '')}{(c.last_name?.[0] || '')}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {c.first_name} {c.last_name}
                              </Typography>
                              {c.company_name && (
                                <Chip label={c.company_name} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
                              )}
                            </Box>
                          }
                          secondary={<Typography variant="caption" color="text.secondary">
                            {c.email && `${c.email} `}{c.city && `| ${c.city}`}
                          </Typography>}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </>
            )}

            {customerMode === 'create' && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person sx={{ color: BORDEAUX, fontSize: 20 }} /> Neuen Kunden anlegen
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField fullWidth label="Vorname" required size="small" value={newCustomer.first_name}
                      onChange={(e) => setNewCustomer(p => ({ ...p, first_name: e.target.value }))} />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField fullWidth label="Nachname" required size="small" value={newCustomer.last_name}
                      onChange={(e) => setNewCustomer(p => ({ ...p, last_name: e.target.value }))} />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField fullWidth label="E-Mail" type="email" size="small" value={newCustomer.email}
                      onChange={(e) => setNewCustomer(p => ({ ...p, email: e.target.value }))}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ fontSize: 18, color: '#999' }} /></InputAdornment> }} />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField fullWidth label="Telefon" size="small" value={newCustomer.phone}
                      onChange={(e) => setNewCustomer(p => ({ ...p, phone: e.target.value }))}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Phone sx={{ fontSize: 18, color: '#999' }} /></InputAdornment> }} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth label="Firma" size="small" value={newCustomer.company_name}
                      onChange={(e) => setNewCustomer(p => ({ ...p, company_name: e.target.value }))}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Business sx={{ fontSize: 18, color: '#999' }} /></InputAdornment> }} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth label="Strasse" size="small" value={newCustomer.street}
                      onChange={(e) => setNewCustomer(p => ({ ...p, street: e.target.value }))} />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField fullWidth label="PLZ" size="small" value={newCustomer.postal_code}
                      onChange={(e) => setNewCustomer(p => ({ ...p, postal_code: e.target.value }))} />
                  </Grid>
                  <Grid item xs={8}>
                    <TextField fullWidth label="Stadt" size="small" value={newCustomer.city}
                      onChange={(e) => setNewCustomer(p => ({ ...p, city: e.target.value }))} />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField select fullWidth label="Kundentyp" size="small" value={newCustomer.type}
                      onChange={(e) => setNewCustomer(p => ({ ...p, type: e.target.value }))}>
                      <MenuItem value="PRIVATE">Privat</MenuItem>
                      <MenuItem value="BUSINESS">Gewerbe</MenuItem>
                    </TextField>
                  </Grid>
                </Grid>
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="contained" onClick={handleCreateCustomer}
                    disabled={createCustomerMutation.isLoading || !newCustomer.first_name || !newCustomer.last_name}
                    startIcon={createCustomerMutation.isLoading ? <CircularProgress size={16} color="inherit" /> : <ArrowForward />}
                    sx={{ bgcolor: BORDEAUX, '&:hover': { bgcolor: '#5A0F1E' } }}>
                    {createCustomerMutation.isLoading ? 'Wird erstellt...' : 'Kunde anlegen & weiter'}
                  </Button>
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== STEP 2: VERTRAG ===== */}
      {activeStep === 1 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ bgcolor: '#f5f5f5', borderRadius: 2, p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: BORDEAUX }}>
                {(selectedCustomer?.first_name?.[0] || '')}{(selectedCustomer?.last_name?.[0] || '')}
              </Avatar>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {selectedCustomer?.first_name} {selectedCustomer?.last_name}
                  {selectedCustomer?.company_name && ` (${selectedCustomer.company_name})`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedCustomer?.email} {selectedCustomer?.city && `| ${selectedCustomer.city}`}
                </Typography>
              </Box>
              <Button size="small" onClick={() => setActiveStep(0)} sx={{ ml: 'auto', color: BORDEAUX }}>
                Aendern
              </Button>
            </Box>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Description sx={{ color: BORDEAUX }} /> Vertragsdaten
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField fullWidth label="Verbrauch (kWh)" type="number" size="small"
                  value={contractData.consumption}
                  onChange={(e) => setContractData(p => ({ ...p, consumption: e.target.value }))} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Startdatum" type="date" size="small"
                  InputLabelProps={{ shrink: true }} value={contractData.start_date}
                  onChange={(e) => setContractData(p => ({ ...p, start_date: e.target.value }))} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Laufzeit (Monate)" type="number" size="small"
                  value={contractData.duration}
                  onChange={(e) => setContractData(p => ({ ...p, duration: e.target.value }))} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Geschaetzter Wert (EUR)" type="number" size="small"
                  value={contractData.estimated_value}
                  onChange={(e) => setContractData(p => ({ ...p, estimated_value: e.target.value }))}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Euro sx={{ fontSize: 18 }} /></InputAdornment> }} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Notizen" multiline rows={2} size="small"
                  value={contractData.notes}
                  onChange={(e) => setContractData(p => ({ ...p, notes: e.target.value }))} />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={() => setActiveStep(0)} startIcon={<ArrowBack />}>Zurueck</Button>
              <Button variant="contained" onClick={handleCreateContract}
                disabled={createContractMutation.isLoading || !selectedProduct}
                startIcon={createContractMutation.isLoading ? <CircularProgress size={16} color="inherit" /> : <ArrowForward />}
                sx={{ bgcolor: BORDEAUX, '&:hover': { bgcolor: '#5A0F1E' } }}>
                {createContractMutation.isLoading ? 'Wird erstellt...' : 'Vertrag erstellen & weiter'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* ===== STEP 3: UNTERSCHRIFT ===== */}
      {activeStep === 2 && (
        <>
          {/* Date/Time/GPS */}
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarToday sx={{ color: BORDEAUX, fontSize: 20 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Datum</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {currentTime.toLocaleDateString('de-DE', { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' })}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccessTime sx={{ color: BORDEAUX, fontSize: 20 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Uhrzeit</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {currentTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} Uhr
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationOn sx={{ color: gpsLocation ? '#2E7D32' : '#999', fontSize: 20 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="text.secondary">GPS</Typography>
                      {gpsLocation ? (
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#2E7D32' }}>
                          {gpsLocation.latitude.toFixed(4)}, {gpsLocation.longitude.toFixed(4)}
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                            ({Math.round(gpsLocation.accuracy)}m)
                          </Typography>
                        </Typography>
                      ) : gpsError ? (
                        <Typography variant="body2" color="error" sx={{ fontSize: '0.75rem' }}>{gpsError}</Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">Wird ermittelt...</Typography>
                      )}
                    </Box>
                    <IconButton size="small" onClick={captureGPS} disabled={gpsLoading}>
                      {gpsLoading ? <CircularProgress size={16} /> : <GpsFixed sx={{ fontSize: 18, color: BORDEAUX }} />}
                    </IconButton>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Contract Summary */}
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Vertragszusammenfassung</Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Kunde</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {selectedCustomer?.first_name} {selectedCustomer?.last_name}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Produkt</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {selectedProduct?.provider} - {selectedProduct?.tariff_name}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Vertrag</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>#{createdContract?.id}</Typography>
                </Grid>
                {contractData.estimated_value && (
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Wert</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {parseFloat(contractData.estimated_value).toFixed(2)} EUR
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Signature */}
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Draw sx={{ color: BORDEAUX }} /> Unterschrift
                </Typography>
                <Button size="small" startIcon={<Refresh />} onClick={() => sigCanvasRef.current?.clear()} sx={{ color: BORDEAUX }}>
                  Loeschen
                </Button>
              </Box>
              <Box sx={{ border: '2px solid #E0D8D0', borderRadius: 2, overflow: 'hidden', bgcolor: '#FAFAFA', touchAction: 'none' }}>
                <SignatureCanvas ref={sigCanvasRef} penColor={BORDEAUX}
                  canvasProps={{ width: 840, height: 280, className: 'signature-canvas',
                    style: { width: '100%', height: '280px', touchAction: 'none' } }} />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Bitte unterschreiben Sie mit dem Finger oder Stift.
              </Typography>
            </CardContent>
          </Card>

          {/* Consent & Submit */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <FormControlLabel
                control={<Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)}
                  sx={{ color: BORDEAUX, '&.Mui-checked': { color: BORDEAUX } }} />}
                label={<Typography variant="body2">
                  Ich bestaetige, dass ich die Vertragsbedingungen gelesen und verstanden habe.
                  Ich stimme dem Vertragsabschluss und der Verarbeitung meiner Daten gemaess der Datenschutzerklaerung zu.
                </Typography>} />
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button onClick={() => navigate(`/contracts/${createdContract?.id}`)} startIcon={<ArrowBack />}>
                  Spaeter unterschreiben
                </Button>
                <Button variant="contained" onClick={handleSubmitSignature}
                  disabled={!consent || signatureMutation.isLoading}
                  startIcon={signatureMutation.isLoading ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
                  sx={{ bgcolor: BORDEAUX, '&:hover': { bgcolor: '#5A0F1E' }, '&.Mui-disabled': { bgcolor: '#ccc' }, px: 4, py: 1.5 }}>
                  {signatureMutation.isLoading ? 'Wird gespeichert...' : 'Unterschrift absenden'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};

export default SaleWizardPage;
