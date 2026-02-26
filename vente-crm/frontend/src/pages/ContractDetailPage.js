import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Button,
  CircularProgress, Divider, Avatar, Timeline, TimelineItem,
  TimelineSeparator, TimelineConnector, TimelineContent, TimelineDot
} from '@mui/material';
import {
  ArrowBack, Person, Email, Phone, Business, Description,
  CalendarToday, Euro, Link as LinkIcon, Timer, Category,
  ElectricBolt, CheckCircle, Schedule
} from '@mui/icons-material';
import { contractAPI } from '../services/api';

const BORDEAUX = '#7A1B2D';

const STATUS_LABELS = {
  LEAD: 'Lead', QUALIFIED: 'Qualifiziert', OFFER: 'Angebot',
  NEGOTIATION: 'Verhandlung', SIGNED: 'Unterschrieben', ACTIVE: 'Aktiv',
  CANCELLED: 'Storniert', EXPIRED: 'Abgelaufen'
};

const STATUS_COLORS = {
  LEAD: '#8B7355', QUALIFIED: '#A68836', OFFER: '#B8860B',
  NEGOTIATION: '#9E3347', SIGNED: '#7A1B2D', ACTIVE: '#2E7D32',
  CANCELLED: '#D32F2F', EXPIRED: '#666666'
};

const STATUS_ORDER = ['LEAD', 'QUALIFIED', 'OFFER', 'NEGOTIATION', 'SIGNED', 'ACTIVE'];

const DetailRow = ({ icon, label, value }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', py: 1.5 }}>
    <Box sx={{
      width: 36, height: 36, borderRadius: '8px', bgcolor: `${BORDEAUX}10`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 2
    }}>
      {React.cloneElement(icon, { sx: { color: BORDEAUX, fontSize: 20 } })}
    </Box>
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>{value || '-'}</Typography>
    </Box>
  </Box>
);

const ContractDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery(
    ['contract', id],
    () => contractAPI.getOne(id),
    { enabled: !!id }
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: BORDEAUX }} />
      </Box>
    );
  }

  const contract = data?.data?.data || data?.data;
  if (!contract) {
    return <Typography>Vertrag nicht gefunden</Typography>;
  }

  const customer = contract.customer || {};
  const product = contract.product || {};
  const statusHistory = contract.status_history || [];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/contracts')} sx={{ mr: 2 }}>
          Zurueck
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 600, flexGrow: 1 }}>
          Vertrag #{contract.id}
        </Typography>
        <Chip
          label={STATUS_LABELS[contract.status] || contract.status}
          sx={{
            bgcolor: (STATUS_COLORS[contract.status] || '#999') + '20',
            color: STATUS_COLORS[contract.status] || '#999',
            fontWeight: 600, fontSize: '0.9rem', py: 0.5
          }}
        />
      </Box>

      <Grid container spacing={3}>
        {/* Vertragsdetails */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Vertragsdetails
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <DetailRow icon={<Description />} label="Vertrags-ID" value={`#${contract.id}`} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailRow icon={<Euro />} label="Geschaetzter Wert"
                    value={`${parseFloat(contract.estimated_value || 0).toFixed(2)} EUR`} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailRow icon={<CalendarToday />} label="Startdatum"
                    value={contract.start_date ? new Date(contract.start_date).toLocaleDateString('de-DE') : '-'} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailRow icon={<Timer />} label="Laufzeit"
                    value={contract.duration ? `${contract.duration} Monate` : '-'} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailRow icon={<ElectricBolt />} label="Verbrauch"
                    value={contract.consumption ? `${contract.consumption} kWh` : '-'} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailRow icon={<CalendarToday />} label="Erstellt am"
                    value={contract.created_at ? new Date(contract.created_at).toLocaleDateString('de-DE') : '-'} />
                </Grid>
              </Grid>

              {contract.notes && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Notizen
                  </Typography>
                  <Typography variant="body2">{contract.notes}</Typography>
                </>
              )}

              {/* Signatur-Link */}
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  startIcon={<LinkIcon />}
                  onClick={() => navigate(`/contracts/${contract.id}/signature`)}
                  sx={{ bgcolor: BORDEAUX, '&:hover': { bgcolor: '#5A0F1E' } }}
                >
                  Zur Unterschrift
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Status-Verlauf Timeline */}
          <Card sx={{ mt: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Status-Verlauf
              </Typography>
              {statusHistory.length > 0 ? (
                <Box sx={{ pl: 1 }}>
                  {statusHistory.map((entry, index) => (
                    <Box key={index} sx={{ display: 'flex', mb: 2, position: 'relative' }}>
                      {/* Timeline line */}
                      {index < statusHistory.length - 1 && (
                        <Box sx={{
                          position: 'absolute', left: 15, top: 32, width: 2, bottom: -8,
                          bgcolor: '#E0D8D0'
                        }} />
                      )}
                      {/* Dot */}
                      <Box sx={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        bgcolor: (STATUS_COLORS[entry.status] || '#999') + '20',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 2
                      }}>
                        {entry.status === 'ACTIVE' || entry.status === 'SIGNED'
                          ? <CheckCircle sx={{ fontSize: 18, color: STATUS_COLORS[entry.status] }} />
                          : <Schedule sx={{ fontSize: 18, color: STATUS_COLORS[entry.status] || '#999' }} />
                        }
                      </Box>
                      {/* Content */}
                      <Box>
                        <Chip
                          label={STATUS_LABELS[entry.status] || entry.status}
                          size="small"
                          sx={{
                            bgcolor: (STATUS_COLORS[entry.status] || '#999') + '20',
                            color: STATUS_COLORS[entry.status] || '#999',
                            fontWeight: 500, mb: 0.5
                          }}
                        />
                        <Typography variant="caption" display="block" color="text.secondary">
                          {entry.changed_at
                            ? new Date(entry.changed_at).toLocaleDateString('de-DE', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })
                            : '-'}
                        </Typography>
                        {entry.changed_by && (
                          <Typography variant="caption" color="text.secondary">
                            von {entry.changed_by}
                          </Typography>
                        )}
                        {entry.note && (
                          <Typography variant="body2" sx={{ mt: 0.5 }}>{entry.note}</Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <Schedule sx={{ fontSize: 48, color: '#E0D8D0', mb: 1 }} />
                  <Typography color="text.secondary">
                    Noch kein Status-Verlauf vorhanden
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                    {STATUS_ORDER.map((status, idx) => (
                      <Box key={status} sx={{ display: 'flex', alignItems: 'center' }}>
                        <Chip
                          label={STATUS_LABELS[status]}
                          size="small"
                          sx={{
                            bgcolor: contract.status === status
                              ? (STATUS_COLORS[status] || '#999') + '30'
                              : '#f5f5f5',
                            color: contract.status === status
                              ? STATUS_COLORS[status]
                              : '#999',
                            fontWeight: contract.status === status ? 600 : 400,
                            border: contract.status === status
                              ? `2px solid ${STATUS_COLORS[status]}`
                              : '1px solid #e0e0e0'
                          }}
                        />
                        {idx < STATUS_ORDER.length - 1 && (
                          <Box sx={{ mx: 0.5, color: '#ccc' }}>→</Box>
                        )}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Seitenleiste */}
        <Grid item xs={12} md={4}>
          {/* Kundeninfo */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Kunde
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ width: 48, height: 48, bgcolor: BORDEAUX, mr: 2 }}>
                  {(customer.first_name || '?')[0]}{(customer.last_name || '?')[0]}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {customer.first_name} {customer.last_name}
                  </Typography>
                  {customer.company_name && (
                    <Typography variant="caption" color="text.secondary">
                      {customer.company_name}
                    </Typography>
                  )}
                </Box>
              </Box>
              <Divider sx={{ my: 1.5 }} />
              <DetailRow icon={<Email />} label="E-Mail" value={customer.email} />
              <DetailRow icon={<Phone />} label="Telefon" value={customer.phone} />
              <DetailRow icon={<Business />} label="Adresse"
                value={customer.street
                  ? `${customer.street}, ${customer.postal_code} ${customer.city}`
                  : customer.city || '-'} />
              <Box sx={{ mt: 2 }}>
                <Button
                  fullWidth variant="outlined" size="small"
                  onClick={() => navigate(`/customers/${customer.id}`)}
                  sx={{ borderColor: BORDEAUX, color: BORDEAUX }}
                >
                  Kundendetails anzeigen
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Produktinfo */}
          <Card sx={{ mt: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Produkt
              </Typography>
              <DetailRow icon={<Business />} label="Anbieter" value={product.provider} />
              <DetailRow icon={<Category />} label="Tarif" value={product.tariff_name} />
              <DetailRow icon={<ElectricBolt />} label="Kategorie"
                value={product.category === 'STROM' ? 'Strom' : product.category === 'GAS' ? 'Gas' : product.category || '-'} />
              <DetailRow icon={<Euro />} label="Grundpreis"
                value={product.base_price ? `${parseFloat(product.base_price).toFixed(2)} EUR/Monat` : '-'} />
              <DetailRow icon={<Euro />} label="Arbeitspreis"
                value={product.working_price ? `${parseFloat(product.working_price).toFixed(2)} ct/kWh` : '-'} />
              <DetailRow icon={<Timer />} label="Vertragslaufzeit"
                value={product.duration ? `${product.duration} Monate` : '-'} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ContractDetailPage;
