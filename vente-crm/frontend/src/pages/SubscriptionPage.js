import React, { useState } from 'react';
import { useQuery, useMutation } from 'react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Button, Grid, Chip,
  CircularProgress, Alert, Divider, LinearProgress
} from '@mui/material';
import {
  CreditCard, CheckCircle, Warning, Timer, Star,
  AdminPanelSettings, SupervisorAccount, Badge, Storefront,
  Payment, Receipt
} from '@mui/icons-material';
import { subscriptionAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const BORDEAUX = '#7A1B2D';

const ROLE_CONFIG = {
  ADMIN: { label: 'Administrator', icon: <AdminPanelSettings />, color: '#7A1B2D' },
  STANDORTLEITUNG: { label: 'Standortleitung', icon: <SupervisorAccount />, color: '#9E3347' },
  TEAMLEAD: { label: 'Teamleitung', icon: <Badge />, color: '#C4A35A' },
  BACKOFFICE: { label: 'Backoffice', icon: <Badge />, color: '#6A5ACD' },
  VERTRIEB: { label: 'Vertrieb', icon: <Storefront />, color: '#5A0F1E' }
};

const STATUS_CONFIG = {
  TRIAL: { label: 'Testphase', color: '#2196F3', icon: <Timer /> },
  ACTIVE: { label: 'Aktiv', color: '#2E7D32', icon: <CheckCircle /> },
  PAST_DUE: { label: 'Zahlung ausstehend', color: '#FF9800', icon: <Warning /> },
  CANCELLED: { label: 'Gekuendigt', color: '#D32F2F', icon: <Warning /> },
  EXPIRED: { label: 'Abgelaufen', color: '#D32F2F', icon: <Warning /> }
};

const SubscriptionPage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const checkoutStatus = searchParams.get('status');

  const { data: statusData, isLoading: statusLoading } = useQuery(
    'subscription-status',
    () => subscriptionAPI.getStatus(),
    { refetchInterval: 30000 }
  );

  const { data: pricesData, isLoading: pricesLoading } = useQuery(
    'subscription-prices',
    () => subscriptionAPI.getPrices()
  );

  const checkoutMutation = useMutation(
    () => subscriptionAPI.createCheckout(),
    {
      onSuccess: (response) => {
        const url = response?.data?.data?.checkout_url;
        if (url) window.location.href = url;
      }
    }
  );

  const portalMutation = useMutation(
    () => subscriptionAPI.createPortal(),
    {
      onSuccess: (response) => {
        const url = response?.data?.data?.portal_url;
        if (url) window.location.href = url;
      }
    }
  );

  const sub = statusData?.data?.data || {};
  const priceInfo = pricesData?.data?.data || {};
  const allPrices = priceInfo.prices || {};
  const statusConfig = STATUS_CONFIG[sub.subscription_status] || STATUS_CONFIG.TRIAL;
  const roleConfig = ROLE_CONFIG[user?.role] || ROLE_CONFIG.VERTRIEB;

  if (statusLoading || pricesLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: BORDEAUX }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Checkout Status Meldungen */}
      {checkoutStatus === 'success' && (
        <Alert severity="success" sx={{ mb: 3 }} icon={<CheckCircle />}>
          Zahlung erfolgreich! Ihr Abonnement ist jetzt aktiv. Vielen Dank!
        </Alert>
      )}
      {checkoutStatus === 'cancelled' && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Zahlung abgebrochen. Sie koennen jederzeit erneut ein Abo abschliessen.
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Abonnement</Typography>
      </Box>

      {/* Aktueller Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>Ihr Abo-Status</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  icon={React.cloneElement(statusConfig.icon, { sx: { color: `${statusConfig.color} !important` } })}
                  label={statusConfig.label}
                  sx={{ bgcolor: `${statusConfig.color}15`, color: statusConfig.color, fontWeight: 600 }}
                />
                <Chip
                  icon={React.cloneElement(roleConfig.icon, { sx: { color: `${roleConfig.color} !important`, fontSize: 18 } })}
                  label={roleConfig.label}
                  variant="outlined"
                  sx={{ borderColor: roleConfig.color, color: roleConfig.color }}
                />
              </Box>
            </Box>

            {/* Preis */}
            {sub.price && (
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: BORDEAUX }}>
                  {sub.price.gross.toFixed(2).replace('.', ',')} EUR
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  pro Monat inkl. {(priceInfo.vat_rate || 19)}% MwSt
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  (netto: {sub.price.net.toFixed(2).replace('.', ',')} EUR)
                </Typography>
              </Box>
            )}
          </Box>

          {/* Trial Info */}
          {sub.is_trial_active && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Kostenlose Testphase
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: sub.trial_days_left <= 7 ? '#D32F2F' : '#2E7D32' }}>
                  {sub.trial_days_left} Tage verbleibend
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.max(0, 100 - (sub.trial_days_left / 30 * 100))}
                sx={{
                  height: 8, borderRadius: 4,
                  bgcolor: '#E0D8D020',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    bgcolor: sub.trial_days_left <= 7 ? '#D32F2F' : BORDEAUX
                  }
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Testphase endet am {new Date(sub.trial_ends_at).toLocaleDateString('de-DE')}
              </Typography>
            </Box>
          )}

          {/* Abo nicht aktiv Warnung */}
          {!sub.has_access && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Ihr Zugang ist eingeschraenkt!
              </Typography>
              <Typography variant="body2">
                Ihre Testphase ist abgelaufen. Bitte schliessen Sie ein Abonnement ab um alle Funktionen weiter nutzen zu koennen.
              </Typography>
            </Alert>
          )}

          {/* Aktionen */}
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            {!sub.is_subscription_active && (
              <Button
                variant="contained"
                size="large"
                startIcon={checkoutMutation.isLoading ? <CircularProgress size={20} color="inherit" /> : <CreditCard />}
                onClick={() => checkoutMutation.mutate()}
                disabled={checkoutMutation.isLoading}
                sx={{
                  bgcolor: BORDEAUX, '&:hover': { bgcolor: '#5A0F1E' },
                  px: 4, py: 1.5, fontWeight: 600
                }}
              >
                {checkoutMutation.isLoading ? 'Wird geladen...' : 'Jetzt Abonnement abschliessen'}
              </Button>
            )}
            {sub.is_subscription_active && (
              <Button
                variant="outlined"
                startIcon={portalMutation.isLoading ? <CircularProgress size={20} /> : <Receipt />}
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isLoading}
                sx={{ borderColor: BORDEAUX, color: BORDEAUX }}
              >
                {portalMutation.isLoading ? 'Wird geladen...' : 'Abo verwalten / Rechnungen'}
              </Button>
            )}
          </Box>

          {checkoutMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {checkoutMutation.error?.response?.data?.error || 'Fehler beim Erstellen der Zahlungsseite'}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Preistabelle */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        Preise nach Rolle
      </Typography>
      <Grid container spacing={2}>
        {[
          { role: 'VERTRIEB', label: 'Vertrieb', desc: 'Fuer Vertriebsmitarbeiter im Aussendienst' },
          { role: 'TEAMLEAD', label: 'Teamleitung', desc: 'Fuer Teamleiter mit erweitertem Zugriff' },
          { role: 'STANDORTLEITUNG', label: 'Standortleitung', desc: 'Voller Zugriff auf Standort-Daten' },
          { role: 'ADMIN', label: 'Administrator', desc: 'Vollzugriff auf alle Funktionen' }
        ].map(({ role, label, desc }) => {
          const price = allPrices[role] || {};
          const config = ROLE_CONFIG[role] || {};
          const isCurrentRole = user?.role === role;
          return (
            <Grid item xs={12} sm={6} md={3} key={role}>
              <Card sx={{
                height: '100%',
                border: isCurrentRole ? `2px solid ${BORDEAUX}` : '1px solid #E0D8D0',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)' }
              }}>
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  {isCurrentRole && (
                    <Chip
                      icon={<Star sx={{ color: '#C4A35A !important', fontSize: 16 }} />}
                      label="Ihr Plan"
                      size="small"
                      sx={{ mb: 1, bgcolor: '#C4A35A15', color: '#C4A35A', fontWeight: 600 }}
                    />
                  )}
                  <Box sx={{ mb: 2 }}>
                    {React.cloneElement(config.icon || <Storefront />, {
                      sx: { fontSize: 40, color: config.color || BORDEAUX }
                    })}
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2, minHeight: 32 }}>
                    {desc}
                  </Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="h4" sx={{ fontWeight: 700, color: BORDEAUX }}>
                    {price.net ? `${price.net.toFixed(0)}` : '?'}
                    <Typography component="span" variant="body2" sx={{ fontWeight: 400, color: 'text.secondary' }}>
                      {' '}EUR/Monat
                    </Typography>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    zzgl. 19% MwSt = {price.gross ? `${price.gross.toFixed(2).replace('.', ',')}` : '?'} EUR
                  </Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="caption" color="text.secondary" display="block">
                    30 Tage kostenlos testen
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Zahlungsmethoden Info */}
      <Card sx={{ mt: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Payment sx={{ color: BORDEAUX }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Akzeptierte Zahlungsmethoden
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Kreditkarte (Visa, Mastercard, American Express), SEPA-Lastschrift, Giropay, Sofortueberweisung
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Alle Zahlungen werden sicher ueber Stripe verarbeitet. Ihre Zahlungsdaten werden niemals auf unseren Servern gespeichert.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SubscriptionPage;
