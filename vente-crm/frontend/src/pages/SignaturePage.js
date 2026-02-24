import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box, Typography, Button, Card, CardContent, Grid, Chip,
  CircularProgress, Alert, Checkbox, FormControlLabel, Divider
} from '@mui/material';
import {
  ArrowBack, Draw, GpsFixed, CheckCircle, Refresh,
  Description, Person, Euro, CalendarToday
} from '@mui/icons-material';
import SignatureCanvas from 'react-signature-canvas';
import { contractAPI, signatureAPI } from '../services/api';

const BORDEAUX = '#7A1B2D';

const STATUS_LABELS = {
  LEAD: 'Lead', QUALIFIED: 'Qualifiziert', OFFER: 'Angebot',
  NEGOTIATION: 'Verhandlung', SIGNED: 'Unterschrieben', ACTIVE: 'Aktiv',
  CANCELLED: 'Storniert', EXPIRED: 'Abgelaufen'
};

const SignaturePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sigCanvasRef = useRef(null);
  const [consent, setConsent] = useState(false);
  const [gpsLocation, setGpsLocation] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const { data, isLoading } = useQuery(
    ['contract', id],
    () => contractAPI.getOne(id),
    { enabled: !!id }
  );

  const submitMutation = useMutation(
    (signatureData) => signatureAPI.create(id, signatureData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['contract', id]);
        queryClient.invalidateQueries('contracts');
        setSubmitSuccess(true);
      }
    }
  );

  // GPS-Position erfassen
  const captureGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation wird von Ihrem Browser nicht unterstuetzt.');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setGpsLoading(false);
      },
      (error) => {
        setGpsError('GPS-Position konnte nicht ermittelt werden. Bitte erlauben Sie den Standortzugriff.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // GPS beim Laden automatisch starten
  useEffect(() => {
    captureGPS();
  }, []);

  const clearSignature = () => {
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
    }
  };

  const handleSubmit = () => {
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
      return;
    }

    const signatureData = {
      signedAt: new Date().toISOString(),
      consent: consent,
      geo: gpsLocation || null,
      deviceInfo: navigator.userAgent,
      signature: { pngBase64: sigCanvasRef.current.toDataURL('image/png') }
    };

    submitMutation.mutate(signatureData);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: BORDEAUX }} />
      </Box>
    );
  }

  const contract = data?.data?.data || data?.data;
  if (!contract) {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/contracts')} sx={{ mb: 2 }}>
          Zurueck
        </Button>
        <Alert severity="error">Vertrag nicht gefunden</Alert>
      </Box>
    );
  }

  const customer = contract.customer || {};
  const product = contract.product || {};

  if (submitSuccess) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, textAlign: 'center' }}>
        <Card>
          <CardContent sx={{ p: 4 }}>
            <CheckCircle sx={{ fontSize: 80, color: '#2E7D32', mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
              Unterschrift erfolgreich gespeichert!
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Der Vertrag #{contract.id} wurde erfolgreich unterschrieben.
            </Typography>
            <Button
              variant="contained" onClick={() => navigate(`/contracts/${id}`)}
              sx={{ bgcolor: BORDEAUX, '&:hover': { bgcolor: '#5A0F1E' } }}
            >
              Zum Vertrag
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(`/contracts/${id}`)} sx={{ mr: 2 }}>
          Zurueck
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Vertragsunterschrift
        </Typography>
      </Box>

      {/* Vertragsinformationen */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Description sx={{ color: BORDEAUX }} />
            Vertrag #{contract.id}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Person sx={{ fontSize: 18, color: BORDEAUX }} />
                <Typography variant="body2" color="text.secondary">Kunde</Typography>
              </Box>
              <Typography variant="body1" sx={{ fontWeight: 500, ml: 3.5 }}>
                {customer.first_name} {customer.last_name}
                {customer.company_name && ` (${customer.company_name})`}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Description sx={{ fontSize: 18, color: BORDEAUX }} />
                <Typography variant="body2" color="text.secondary">Produkt</Typography>
              </Box>
              <Typography variant="body1" sx={{ fontWeight: 500, ml: 3.5 }}>
                {product.provider && `${product.provider} - `}{product.tariff_name || '-'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Euro sx={{ fontSize: 18, color: BORDEAUX }} />
                <Typography variant="body2" color="text.secondary">Wert</Typography>
              </Box>
              <Typography variant="body1" sx={{ fontWeight: 500, ml: 3.5 }}>
                {parseFloat(contract.estimated_value || 0).toFixed(2)} EUR
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CalendarToday sx={{ fontSize: 18, color: BORDEAUX }} />
                <Typography variant="body2" color="text.secondary">Status</Typography>
              </Box>
              <Chip
                label={STATUS_LABELS[contract.status] || contract.status}
                size="small"
                sx={{ ml: 3.5, bgcolor: `${BORDEAUX}15`, color: BORDEAUX, fontWeight: 500 }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* GPS-Erfassung */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <GpsFixed sx={{ color: BORDEAUX }} />
                GPS-Standort
              </Typography>
              {gpsLocation ? (
                <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                  Lat: {gpsLocation.latitude.toFixed(6)}, Lng: {gpsLocation.longitude.toFixed(6)}
                  {gpsLocation.accuracy && ` (Genauigkeit: ${Math.round(gpsLocation.accuracy)}m)`}
                </Typography>
              ) : gpsError ? (
                <Typography variant="body2" color="error" sx={{ ml: 4 }}>
                  {gpsError}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                  Standort wird ermittelt...
                </Typography>
              )}
            </Box>
            <Button
              size="small" startIcon={gpsLoading ? <CircularProgress size={14} /> : <GpsFixed />}
              onClick={captureGPS} disabled={gpsLoading}
              sx={{ color: BORDEAUX }}
            >
              {gpsLoading ? 'Ermittle...' : 'Aktualisieren'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Unterschrift-Canvas */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Draw sx={{ color: BORDEAUX }} />
              Unterschrift
            </Typography>
            <Button
              size="small" startIcon={<Refresh />}
              onClick={clearSignature}
              sx={{ color: BORDEAUX }}
            >
              Loeschen
            </Button>
          </Box>

          <Box sx={{
            border: '2px solid #E0D8D0',
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: '#FAFAFA'
          }}>
            <SignatureCanvas
              ref={sigCanvasRef}
              penColor={BORDEAUX}
              canvasProps={{
                width: 740,
                height: 300,
                className: 'signature-canvas',
                style: { width: '100%', height: '300px' }
              }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Bitte unterschreiben Sie im Feld oben mit der Maus oder dem Finger.
          </Typography>
        </CardContent>
      </Card>

      {/* Einwilligung & Absenden */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                sx={{
                  color: BORDEAUX,
                  '&.Mui-checked': { color: BORDEAUX }
                }}
              />
            }
            label={
              <Typography variant="body2">
                Ich bestaetige, dass ich die Vertragsbedingungen gelesen und verstanden habe.
                Ich stimme dem Vertragsabschluss und der Verarbeitung meiner Daten gemaess der
                Datenschutzerklaerung zu.
              </Typography>
            }
          />

          {submitMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Fehler beim Speichern der Unterschrift. Bitte versuchen Sie es erneut.
            </Alert>
          )}

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              onClick={() => navigate(`/contracts/${id}`)}
            >
              Abbrechen
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!consent || submitMutation.isLoading}
              startIcon={submitMutation.isLoading ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
              sx={{
                bgcolor: BORDEAUX,
                '&:hover': { bgcolor: '#5A0F1E' },
                '&.Mui-disabled': { bgcolor: '#ccc' }
              }}
            >
              {submitMutation.isLoading ? 'Wird gespeichert...' : 'Unterschrift absenden'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SignaturePage;
