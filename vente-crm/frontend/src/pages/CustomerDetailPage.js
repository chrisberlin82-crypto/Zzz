import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Button,
  Table, TableBody, TableCell, TableHead, TableRow,
  CircularProgress, Divider, Avatar
} from '@mui/material';
import {
  ArrowBack, Person, Email, Phone, Home, Business,
  Description, Visibility, Add
} from '@mui/icons-material';
import { customerAPI } from '../services/api';

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

const SOURCE_LABELS = {
  ONLINE: 'Online', REFERRAL: 'Empfehlung', COLD_CALL: 'Kaltakquise',
  EVENT: 'Event', PARTNER: 'Partner', OTHER: 'Sonstige'
};

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

const CustomerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery(
    ['customer', id],
    () => customerAPI.getOne(id),
    { enabled: !!id }
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: BORDEAUX }} />
      </Box>
    );
  }

  const customer = data?.data?.data || data?.data;
  if (!customer) {
    return <Typography>Kunde nicht gefunden</Typography>;
  }

  const contracts = customer.contracts || [];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/customers')} sx={{ mr: 2 }}>
          Zurueck
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Kundendetails</Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Kundeninfo */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{
                  width: 64, height: 64, bgcolor: BORDEAUX, fontSize: 24, mr: 2
                }}>
                  {(customer.first_name || '?')[0]}{(customer.last_name || '?')[0]}
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    {customer.first_name} {customer.last_name}
                  </Typography>
                  {customer.company_name && (
                    <Typography color="text.secondary">{customer.company_name}</Typography>
                  )}
                </Box>
                <Box sx={{ ml: 'auto' }}>
                  <Chip
                    label={customer.type === 'BUSINESS' ? 'Geschaeftlich' : 'Privat'}
                    sx={{ bgcolor: `${BORDEAUX}15`, color: BORDEAUX, fontWeight: 500 }}
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <DetailRow icon={<Person />} label="Vollstaendiger Name"
                    value={`${customer.first_name} ${customer.last_name}`} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailRow icon={<Email />} label="E-Mail" value={customer.email} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailRow icon={<Phone />} label="Telefon" value={customer.phone} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailRow icon={<Home />} label="Adresse"
                    value={customer.street ? `${customer.street}, ${customer.postal_code} ${customer.city}` : customer.city} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailRow icon={<Business />} label="Quelle"
                    value={SOURCE_LABELS[customer.source] || customer.source} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailRow icon={<Description />} label="Erstellt am"
                    value={customer.created_at ? new Date(customer.created_at).toLocaleDateString('de-DE') : '-'} />
                </Grid>
              </Grid>

              {customer.notes && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Notizen
                  </Typography>
                  <Typography variant="body2">{customer.notes}</Typography>
                </>
              )}

              {customer.needs && customer.needs.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Beduerfnisse
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {customer.needs.map((need, idx) => (
                      <Chip key={idx} label={need} size="small" variant="outlined"
                        sx={{ borderColor: BORDEAUX, color: BORDEAUX }} />
                    ))}
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Statistiken */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Uebersicht
              </Typography>
              <Box sx={{
                display: 'flex', flexDirection: 'column', gap: 2
              }}>
                <Box sx={{
                  p: 2, borderRadius: 2, bgcolor: `${BORDEAUX}08`,
                  textAlign: 'center'
                }}>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: BORDEAUX }}>
                    {contracts.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Vertraege
                  </Typography>
                </Box>
                <Box sx={{
                  p: 2, borderRadius: 2, bgcolor: '#2E7D3208',
                  textAlign: 'center'
                }}>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: '#2E7D32' }}>
                    {contracts.filter(c => c.status === 'ACTIVE' || c.status === 'SIGNED').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Aktive Vertraege
                  </Typography>
                </Box>
                <Box sx={{
                  p: 2, borderRadius: 2, bgcolor: '#C4A35A08',
                  textAlign: 'center'
                }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#C4A35A' }}>
                    {contracts.reduce((sum, c) => sum + parseFloat(c.estimated_value || 0), 0).toFixed(2)} EUR
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Gesamtwert
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {customer.gdpr_consent !== undefined && (
            <Card sx={{ mt: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  DSGVO-Einwilligung
                </Typography>
                <Chip
                  label={customer.gdpr_consent ? 'Erteilt' : 'Nicht erteilt'}
                  color={customer.gdpr_consent ? 'success' : 'error'}
                  size="small"
                />
                {customer.gdpr_consent_date && (
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                    am {new Date(customer.gdpr_consent_date).toLocaleDateString('de-DE')}
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Vertraege */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Vertraege ({contracts.length})
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button variant="contained" size="small" startIcon={<Add />}
                    onClick={() => navigate(`/contracts?customer_id=${customer.id}`)}>
                    Neuer Vertrag
                  </Button>
                  <Button variant="outlined" size="small"
                    onClick={() => navigate('/contracts')}>
                    Alle Vertraege
                  </Button>
                </Box>
              </Box>

              {contracts.length > 0 ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Produkt</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Wert</TableCell>
                      <TableCell>Startdatum</TableCell>
                      <TableCell>Laufzeit</TableCell>
                      <TableCell align="right">Aktionen</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {contracts.map((contract) => (
                      <TableRow key={contract.id} hover>
                        <TableCell>#{contract.id}</TableCell>
                        <TableCell>
                          {contract.product?.tariff_name || contract.product_id || '-'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={STATUS_LABELS[contract.status] || contract.status}
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
                          {contract.start_date ? new Date(contract.start_date).toLocaleDateString('de-DE') : '-'}
                        </TableCell>
                        <TableCell>
                          {contract.duration ? `${contract.duration} Monate` : '-'}
                        </TableCell>
                        <TableCell align="right">
                          <Button size="small" startIcon={<Visibility />}
                            onClick={() => navigate(`/contracts/${contract.id}`)}>
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Description sx={{ fontSize: 48, color: '#E0D8D0', mb: 1 }} />
                  <Typography color="text.secondary">
                    Noch keine Vertraege fuer diesen Kunden
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CustomerDetailPage;
