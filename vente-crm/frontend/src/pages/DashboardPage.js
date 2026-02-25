import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, Chip, Table,
  TableBody, TableCell, TableHead, TableRow, CircularProgress,
  Button, ToggleButton, ToggleButtonGroup, IconButton, Tooltip as MuiTooltip
} from '@mui/material';
import {
  TrendingUp, TrendingDown, Description, Euro, People,
  Add, FileDownload, Refresh, OpenInNew, ShoppingCart,
  Groups, Business, BarChart as BarChartIcon
} from '@mui/icons-material';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import { dashboardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

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

const KPICard = ({ title, value, subtitle, icon, color = BORDEAUX, trend }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1 }}>
          <Typography color="text.secondary" sx={{ fontSize: '0.85rem', mb: 0.5 }}>{title}</Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color }}>{value}</Typography>
          {subtitle && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              {trend !== undefined && (
                trend >= 0
                  ? <TrendingUp sx={{ fontSize: 16, color: '#2E7D32' }} />
                  : <TrendingDown sx={{ fontSize: 16, color: '#D32F2F' }} />
              )}
              <Typography color="text.secondary" sx={{ fontSize: '0.8rem' }}>{subtitle}</Typography>
            </Box>
          )}
        </Box>
        <Box sx={{
          width: 48, height: 48, borderRadius: '12px',
          bgcolor: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {React.cloneElement(icon, { sx: { color, fontSize: 28 } })}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const QuickAction = ({ icon, label, onClick, color = BORDEAUX }) => (
  <Button
    variant="outlined"
    startIcon={icon}
    onClick={onClick}
    sx={{
      borderColor: color, color,
      borderRadius: '10px', py: 1.2, px: 2,
      fontWeight: 500, fontSize: '0.85rem',
      '&:hover': { bgcolor: `${color}08`, borderColor: color }
    }}
  >
    {label}
  </Button>
);

const DashboardPage = () => {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [trendView, setTrendView] = useState('revenue');

  const { data, isLoading, refetch } = useQuery('dashboard', () => dashboardAPI.get(), {
    refetchInterval: 60000
  });

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: BORDEAUX }} /></Box>;
  }

  const dashboard = data?.data?.data;
  if (!dashboard) return <Typography>Keine Daten verfuegbar</Typography>;

  const { kpis, trend, recent_contracts, provider_breakdown, team_performance } = dashboard;

  const isAdmin = hasRole('ADMIN');
  const isManager = hasRole(['ADMIN', 'STANDORTLEITUNG', 'TEAMLEAD']);

  // Scope-Label
  const scopeLabel = isAdmin ? 'Gesamtunternehmen'
    : hasRole('STANDORTLEITUNG') ? 'Mein Standort'
    : hasRole('TEAMLEAD') ? 'Mein Team'
    : 'Meine Daten';

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Willkommen, {user?.first_name || user?.email}
          </Typography>
          <Chip
            label={scopeLabel}
            size="small"
            sx={{ mt: 0.5, bgcolor: `${BORDEAUX}15`, color: BORDEAUX, fontWeight: 500 }}
          />
        </Box>
        <MuiTooltip title="Daten aktualisieren">
          <IconButton onClick={() => refetch()} sx={{ color: BORDEAUX }}>
            <Refresh />
          </IconButton>
        </MuiTooltip>
      </Box>

      {/* ====== TREND CHART (oberste Ebene) ====== */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              <TrendingUp sx={{ mr: 1, verticalAlign: 'middle', color: BORDEAUX }} />
              Trend-Uebersicht (6 Monate)
            </Typography>
            <ToggleButtonGroup
              value={trendView}
              exclusive
              onChange={(e, v) => v && setTrendView(v)}
              size="small"
            >
              <ToggleButton value="revenue" sx={{ fontSize: '0.75rem' }}>Umsatz</ToggleButton>
              <ToggleButton value="contracts" sx={{ fontSize: '0.75rem' }}>Vertraege</ToggleButton>
              <ToggleButton value="combined" sx={{ fontSize: '0.75rem' }}>Kombiniert</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {trend && trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              {trendView === 'contracts' ? (
                <BarChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0D8D0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(val, name) => [
                    name === 'contracts' ? val : `${val.toFixed(0)} EUR`,
                    name === 'contracts' ? 'Vertraege' : 'Umsatz'
                  ]} />
                  <Bar dataKey="contracts" name="Vertraege" fill={BORDEAUX} radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : trendView === 'revenue' ? (
                <AreaChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0D8D0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(val) => [`${val.toFixed(2)} EUR`, 'Umsatz']} />
                  <Area type="monotone" dataKey="revenue" name="Umsatz"
                    stroke={BORDEAUX} fill={`${BORDEAUX}30`} strokeWidth={2} />
                </AreaChart>
              ) : (
                <AreaChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0D8D0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(val, name) => [
                    name === 'Vertraege' ? val : `${val.toFixed(2)} EUR`,
                    name
                  ]} />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="revenue" name="Umsatz"
                    stroke={BORDEAUX} fill={`${BORDEAUX}20`} strokeWidth={2} />
                  <Area yAxisId="left" type="monotone" dataKey="expenses" name="Ausgaben"
                    stroke="#D32F2F" fill="#D32F2F20" strokeWidth={2} />
                  <Area yAxisId="right" type="monotone" dataKey="contracts" name="Vertraege"
                    stroke="#C4A35A" fill="#C4A35A20" strokeWidth={2} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          ) : (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              Noch keine Trenddaten vorhanden
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* ====== KPI Cards ====== */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <KPICard
            title="Vertraege gesamt"
            value={kpis.contracts?.total || 0}
            subtitle={`${kpis.contracts?.this_month || 0} diesen Monat`}
            icon={<Description />}
            color="#9E3347"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KPICard
            title="Aktive Vertraege"
            value={kpis.contracts?.active || 0}
            subtitle={`Conversion: ${kpis.contracts?.conversion_rate || 0}%`}
            icon={<TrendingUp />}
            color={BORDEAUX}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KPICard
            title="Forecast"
            value={`${((kpis.revenue?.forecast_value || 0) / 1000).toFixed(1)}k EUR`}
            subtitle={`Pipeline: ${((kpis.revenue?.pipeline_total || 0) / 1000).toFixed(1)}k EUR`}
            icon={<Euro />}
            color="#C4A35A"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KPICard
            title="Ausgaben (Monat)"
            value={`${(kpis.expenses?.this_month || 0).toFixed(0)} EUR`}
            subtitle={`Absetzbar: ${(kpis.expenses?.deductible_this_month || 0).toFixed(0)} EUR`}
            icon={<Euro />}
            color="#2E7D32"
          />
        </Grid>
      </Grid>

      {/* ====== Quick Actions ====== */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <QuickAction icon={<Add />} label="Neuer Verkauf" onClick={() => navigate('/sale')} />
            <QuickAction icon={<People />} label="Kunden" onClick={() => navigate('/customers')} color="#9E3347" />
            <QuickAction icon={<Description />} label="Vertraege" onClick={() => navigate('/contracts')} color="#C4A35A" />
            <QuickAction icon={<Euro />} label="Ausgaben" onClick={() => navigate('/expenses')} color="#2E7D32" />
            {isManager && (
              <QuickAction icon={<Groups />} label="Team Live" onClick={() => navigate('/team-map')} color="#5A0F1E" />
            )}
            {isAdmin && (
              <QuickAction icon={<BarChartIcon />} label="Benutzer" onClick={() => navigate('/users')} color="#6A5ACD" />
            )}
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* ====== Anbieter/Produkt Aufschluesselung (nur Admin/Standortleitung) ====== */}
        {provider_breakdown && provider_breakdown.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  <Business sx={{ mr: 1, verticalAlign: 'middle', color: BORDEAUX }} />
                  Umsatz nach Anbieter
                </Typography>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={provider_breakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E0D8D0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip formatter={(val) => [`${val.toFixed(2)} EUR`, 'Umsatz']} />
                    <Bar dataKey="value" name="Umsatz" fill={BORDEAUX} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* ====== Team Performance (Teamleiter+) ====== */}
        {team_performance && team_performance.length > 0 && (
          <Grid item xs={12} md={provider_breakdown ? 6 : 12}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  <Groups sx={{ mr: 1, verticalAlign: 'middle', color: BORDEAUX }} />
                  Team-Performance (Monat)
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Mitarbeiter</TableCell>
                      <TableCell align="right">Vertraege</TableCell>
                      <TableCell align="right">Umsatz</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {team_performance
                      .sort((a, b) => b.revenue - a.revenue)
                      .map((member, i) => (
                        <TableRow key={i} hover>
                          <TableCell sx={{ fontWeight: i === 0 ? 600 : 400 }}>
                            {i === 0 && <span style={{ color: '#C4A35A', marginRight: 4 }}>&#9733;</span>}
                            {member.name}
                          </TableCell>
                          <TableCell align="right">{member.contracts}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 500 }}>
                            {member.revenue.toFixed(2)} EUR
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* ====== Letzte Vertraege ====== */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Letzte Vertraege</Typography>
                <Button
                  size="small"
                  endIcon={<OpenInNew sx={{ fontSize: 14 }} />}
                  onClick={() => navigate('/contracts')}
                  sx={{ color: BORDEAUX }}
                >
                  Alle anzeigen
                </Button>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Kunde</TableCell>
                    {isManager && <TableCell>Vertriebler</TableCell>}
                    <TableCell>Produkt</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Wert</TableCell>
                    <TableCell>Erstellt</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(recent_contracts || []).map((contract) => (
                    <TableRow
                      key={contract.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/contracts/${contract.id}`)}
                    >
                      <TableCell>#{contract.id}</TableCell>
                      <TableCell>
                        {contract.customer ? `${contract.customer.first_name} ${contract.customer.last_name}` : '-'}
                      </TableCell>
                      {isManager && (
                        <TableCell>
                          {contract.user ? `${contract.user.first_name} ${contract.user.last_name}` : '-'}
                        </TableCell>
                      )}
                      <TableCell>{contract.product?.name || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={STATUS_LABELS[contract.status] || contract.status}
                          size="small"
                          sx={{
                            bgcolor: (STATUS_COLORS[contract.status] || '#666') + '20',
                            color: STATUS_COLORS[contract.status] || '#666',
                            fontWeight: 500
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500 }}>
                        {parseFloat(contract.estimated_value || 0).toFixed(2)} EUR
                      </TableCell>
                      <TableCell>{new Date(contract.created_at).toLocaleDateString('de-DE')}</TableCell>
                    </TableRow>
                  ))}
                  {(!recent_contracts || recent_contracts.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={isManager ? 7 : 6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        Noch keine Vertraege vorhanden
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
