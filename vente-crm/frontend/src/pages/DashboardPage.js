import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, Chip, Table,
  TableBody, TableCell, TableHead, TableRow, CircularProgress,
  Button, ToggleButton, ToggleButtonGroup, IconButton, Tooltip as MuiTooltip,
  LinearProgress, Paper
} from '@mui/material';
import {
  TrendingUp, TrendingDown, Description, Euro, People,
  Add, Refresh, OpenInNew,
  Groups, Business, BarChart as BarChartIcon, WavingHand,
  CalendarMonth, LocationOn, AccessTime, Speed,
  ShowChart, EmojiEvents
} from '@mui/icons-material';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie,
  Cell, LineChart, Line
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

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 10) return 'Guten Morgen';
  if (hour < 14) return 'Guten Tag';
  if (hour < 18) return 'Guten Nachmittag';
  return 'Guten Abend';
};

const getMotivation = (contractsMonth, role) => {
  if (role === 'VERTRIEB') {
    if (contractsMonth > 5) return 'Hervorragende Leistung diesen Monat!';
    if (contractsMonth > 0) return 'Weiter so - jeder Vertrag zaehlt!';
    return 'Ein neuer Tag, eine neue Chance!';
  }
  if (['TEAMLEAD', 'STANDORTLEITUNG'].includes(role))
    return 'Hier ist Ihre Team-Uebersicht auf einen Blick.';
  if (role === 'ADMIN')
    return 'Unternehmens-Dashboard mit allen wichtigen Kennzahlen.';
  return 'Willkommen in Ihrem persoenlichen Bereich.';
};

const formatDate = () =>
  new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

const KPICard = ({ title, value, subtitle, icon, color = BORDEAUX, trend, trendLabel }) => (
  <Card sx={{ height: '100%', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 4 } }}>
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
          {trendLabel && (
            <Chip label={trendLabel} size="small" sx={{
              mt: 0.5, fontSize: '0.7rem', height: 20,
              bgcolor: trend >= 0 ? '#2E7D3220' : '#D32F2F20',
              color: trend >= 0 ? '#2E7D32' : '#D32F2F', fontWeight: 600
            }} />
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
  <Button variant="outlined" startIcon={icon} onClick={onClick} sx={{
    borderColor: color, color, borderRadius: '10px', py: 1.2, px: 2,
    fontWeight: 500, fontSize: '0.85rem',
    '&:hover': { bgcolor: `${color}08`, borderColor: color }
  }}>{label}</Button>
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

  const { kpis, trend, recent_contracts, provider_breakdown, team_performance, pipeline } = dashboard;

  const isAdmin = hasRole('ADMIN');
  const isManager = hasRole(['ADMIN', 'STANDORTLEITUNG', 'TEAMLEAD']);

  const scopeLabel = isAdmin ? 'Gesamtunternehmen'
    : hasRole('STANDORTLEITUNG') ? 'Mein Standort'
    : hasRole('TEAMLEAD') ? 'Mein Team' : 'Meine Daten';

  // Trend-Berechnung: aktueller vs. vorheriger Monat
  const curRev = trend && trend.length > 0 ? trend[trend.length - 1]?.revenue || 0 : 0;
  const prevRev = trend && trend.length > 1 ? trend[trend.length - 2]?.revenue || 0 : 0;
  const revTrend = prevRev > 0 ? ((curRev - prevRev) / prevRev * 100).toFixed(1) : 0;

  const curContr = trend && trend.length > 0 ? trend[trend.length - 1]?.contracts || 0 : 0;
  const prevContr = trend && trend.length > 1 ? trend[trend.length - 2]?.contracts || 0 : 0;
  const contrTrend = prevContr > 0 ? ((curContr - prevContr) / prevContr * 100).toFixed(1) : 0;

  // Pipeline-Daten fuer PieChart
  const pipelineChart = pipeline ? Object.entries(pipeline).map(([st, d]) => ({
    name: STATUS_LABELS[st] || st, value: d.count || 0,
    amount: d.value || 0, color: STATUS_COLORS[st] || '#999'
  })).filter(d => d.value > 0) : [];

  return (
    <Box>
      {/* ====== BEGRUESSUNG ====== */}
      <Card sx={{
        mb: 3,
        background: `linear-gradient(135deg, ${BORDEAUX} 0%, #5A0F1E 50%, #3D0A14 100%)`,
        color: '#fff', overflow: 'hidden', position: 'relative'
      }}>
        <CardContent sx={{ p: { xs: 2.5, md: 4 }, position: 'relative', zIndex: 1 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={7}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <WavingHand sx={{ fontSize: 32, color: '#C4A35A' }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {getGreeting()}, {user?.first_name || user?.email}!
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <CalendarMonth sx={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }} />
                <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
                  {formatDate()}
                </Typography>
              </Box>
              <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', mb: 2 }}>
                {getMotivation(kpis.contracts?.this_month || 0, user?.role)}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Chip label={scopeLabel}
                  sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600, fontSize: '0.8rem' }} />
                <Chip
                  icon={<AccessTime sx={{ color: '#C4A35A !important', fontSize: 14 }} />}
                  label={new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr'}
                  sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)', fontSize: '0.8rem' }} />
              </Box>
            </Grid>
            <Grid item xs={12} md={5}>
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <Paper sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>Vertraege (Monat)</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff' }}>{kpis.contracts?.this_month || 0}</Typography>
                    {parseFloat(contrTrend) !== 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                        {parseFloat(contrTrend) >= 0
                          ? <TrendingUp sx={{ fontSize: 14, color: '#66BB6A' }} />
                          : <TrendingDown sx={{ fontSize: 14, color: '#EF5350' }} />}
                        <Typography sx={{ fontSize: '0.7rem', color: parseFloat(contrTrend) >= 0 ? '#66BB6A' : '#EF5350' }}>
                          {contrTrend > 0 ? '+' : ''}{contrTrend}% vs. Vormonat
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>Conversion Rate</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff' }}>{kpis.contracts?.conversion_rate || 0}%</Typography>
                    <LinearProgress variant="determinate" value={Math.min(kpis.contracts?.conversion_rate || 0, 100)}
                      sx={{ mt: 0.5, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)',
                        '& .MuiLinearProgress-bar': { bgcolor: '#C4A35A' } }} />
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>Umsatz (Monat)</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff' }}>{(curRev / 1000).toFixed(1)}k</Typography>
                    {parseFloat(revTrend) !== 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                        {parseFloat(revTrend) >= 0
                          ? <TrendingUp sx={{ fontSize: 14, color: '#66BB6A' }} />
                          : <TrendingDown sx={{ fontSize: 14, color: '#EF5350' }} />}
                        <Typography sx={{ fontSize: '0.7rem', color: parseFloat(revTrend) >= 0 ? '#66BB6A' : '#EF5350' }}>
                          {revTrend > 0 ? '+' : ''}{revTrend}% vs. Vormonat
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>Forecast</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#C4A35A' }}>
                      {((kpis.revenue?.forecast_value || 0) / 1000).toFixed(1)}k
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>
                      Pipeline: {((kpis.revenue?.pipeline_total || 0) / 1000).toFixed(1)}k EUR
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.03)' }} />
        <Box sx={{ position: 'absolute', bottom: -60, right: 100, width: 160, height: 160, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.02)' }} />
      </Card>

      {/* ====== KPI Cards ====== */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <KPICard title="Vertraege gesamt" value={kpis.contracts?.total || 0}
            subtitle={`${kpis.contracts?.this_month || 0} diesen Monat`}
            icon={<Description />} color="#9E3347" trend={parseFloat(contrTrend)}
            trendLabel={parseFloat(contrTrend) !== 0 ? `${contrTrend > 0 ? '+' : ''}${contrTrend}%` : undefined} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KPICard title="Aktive Vertraege" value={kpis.contracts?.active || 0}
            subtitle={`Conversion: ${kpis.contracts?.conversion_rate || 0}%`}
            icon={<TrendingUp />} color={BORDEAUX} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KPICard title="Forecast" value={`${((kpis.revenue?.forecast_value || 0) / 1000).toFixed(1)}k EUR`}
            subtitle={`Pipeline: ${((kpis.revenue?.pipeline_total || 0) / 1000).toFixed(1)}k EUR`}
            icon={<Euro />} color="#C4A35A" trend={parseFloat(revTrend)}
            trendLabel={parseFloat(revTrend) !== 0 ? `${revTrend > 0 ? '+' : ''}${revTrend}%` : undefined} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KPICard title="Ausgaben (Monat)" value={`${(kpis.expenses?.this_month || 0).toFixed(0)} EUR`}
            subtitle={`Absetzbar: ${(kpis.expenses?.deductible_this_month || 0).toFixed(0)} EUR`}
            icon={<Euro />} color="#2E7D32" />
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
            {isManager && <QuickAction icon={<Groups />} label="Team Live" onClick={() => navigate('/team-map')} color="#5A0F1E" />}
            {hasRole(['ADMIN', 'STANDORTLEITUNG']) && <QuickAction icon={<LocationOn />} label="Gebiete" onClick={() => navigate('/territories')} color="#6A5ACD" />}
            {isAdmin && <QuickAction icon={<BarChartIcon />} label="Benutzer" onClick={() => navigate('/users')} color="#6A5ACD" />}
          </Box>
        </CardContent>
      </Card>

      {/* ====== TREND-ANALYSE ====== */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShowChart sx={{ color: BORDEAUX }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Trend-Analyse (6 Monate)</Typography>
              <MuiTooltip title="Daten aktualisieren">
                <IconButton size="small" onClick={() => refetch()} sx={{ color: BORDEAUX }}><Refresh fontSize="small" /></IconButton>
              </MuiTooltip>
            </Box>
            <ToggleButtonGroup value={trendView} exclusive onChange={(e, v) => v && setTrendView(v)} size="small">
              <ToggleButton value="revenue" sx={{ fontSize: '0.75rem' }}>Umsatz</ToggleButton>
              <ToggleButton value="contracts" sx={{ fontSize: '0.75rem' }}>Vertraege</ToggleButton>
              <ToggleButton value="combined" sx={{ fontSize: '0.75rem' }}>Kombiniert</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {trend && trend.length > 1 && (
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <Chip icon={<Speed sx={{ fontSize: '16px !important' }} />}
                label={`Durchschn. Umsatz: ${(trend.reduce((s, t) => s + t.revenue, 0) / trend.length / 1000).toFixed(1)}k EUR`}
                size="small" sx={{ bgcolor: `${BORDEAUX}10`, color: BORDEAUX }} />
              <Chip icon={<Description sx={{ fontSize: '16px !important' }} />}
                label={`Durchschn. Vertraege: ${(trend.reduce((s, t) => s + t.contracts, 0) / trend.length).toFixed(1)} / Monat`}
                size="small" sx={{ bgcolor: '#C4A35A20', color: '#A68836' }} />
              {(() => {
                const half = Math.floor(trend.length / 2);
                const recent = trend.slice(half);
                const older = trend.slice(0, half);
                const ra = recent.reduce((s, t) => s + t.revenue, 0) / (recent.length || 1);
                const oa = older.reduce((s, t) => s + t.revenue, 0) / (older.length || 1);
                const p = oa > 0 ? ((ra - oa) / oa * 100).toFixed(1) : 0;
                return (
                  <Chip
                    icon={parseFloat(p) >= 0
                      ? <TrendingUp sx={{ fontSize: '16px !important', color: '#2E7D32 !important' }} />
                      : <TrendingDown sx={{ fontSize: '16px !important', color: '#D32F2F !important' }} />}
                    label={`Halbjahrestrend: ${p > 0 ? '+' : ''}${p}%`}
                    size="small" sx={{
                      bgcolor: parseFloat(p) >= 0 ? '#2E7D3215' : '#D32F2F15',
                      color: parseFloat(p) >= 0 ? '#2E7D32' : '#D32F2F', fontWeight: 600
                    }} />
                );
              })()}
            </Box>
          )}

          {trend && trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              {trendView === 'contracts' ? (
                <BarChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0D8D0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(val, name) => [name === 'contracts' ? val : `${val.toFixed(0)} EUR`, name === 'contracts' ? 'Vertraege' : 'Umsatz']} />
                  <Bar dataKey="contracts" name="Vertraege" fill={BORDEAUX} radius={[4, 4, 0, 0]}>
                    {trend.map((_, i) => <Cell key={i} fill={i === trend.length - 1 ? '#C4A35A' : BORDEAUX} />)}
                  </Bar>
                </BarChart>
              ) : trendView === 'revenue' ? (
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BORDEAUX} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={BORDEAUX} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0D8D0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(val) => [`${val.toFixed(2)} EUR`, 'Umsatz']} />
                  <Area type="monotone" dataKey="revenue" name="Umsatz" stroke={BORDEAUX} fill="url(#revGrad)" strokeWidth={3} />
                </AreaChart>
              ) : (
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BORDEAUX} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={BORDEAUX} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D32F2F" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#D32F2F" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0D8D0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(val, name) => [name === 'Vertraege' ? val : `${val.toFixed(2)} EUR`, name]} />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="revenue" name="Umsatz" stroke={BORDEAUX} fill="url(#revGrad2)" strokeWidth={2} />
                  <Area yAxisId="left" type="monotone" dataKey="expenses" name="Ausgaben" stroke="#D32F2F" fill="url(#expGrad)" strokeWidth={2} />
                  <Area yAxisId="right" type="monotone" dataKey="contracts" name="Vertraege" stroke="#C4A35A" fill="#C4A35A10" strokeWidth={2} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          ) : (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>Noch keine Trenddaten vorhanden</Typography>
          )}
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* ====== Pipeline-Verteilung (PieChart) ====== */}
        {pipelineChart.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Pipeline-Verteilung</Typography>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={pipelineChart} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                      {pipelineChart.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(val, name) => [val, name]} />
                    <Legend verticalAlign="bottom" iconType="circle" iconSize={8}
                      formatter={(v) => <span style={{ fontSize: '0.8rem', color: '#666' }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* ====== Anbieter-Aufschluesselung ====== */}
        {provider_breakdown && provider_breakdown.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  <Business sx={{ mr: 1, verticalAlign: 'middle', color: BORDEAUX }} />Umsatz nach Anbieter
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

        {/* ====== Team Performance ====== */}
        {team_performance && team_performance.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  <Groups sx={{ mr: 1, verticalAlign: 'middle', color: BORDEAUX }} />Team-Performance (Monat)
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Mitarbeiter</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Vertraege</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Umsatz</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {team_performance.sort((a, b) => b.revenue - a.revenue).map((m, i) => (
                      <TableRow key={i} hover>
                        <TableCell>
                          {i === 0 && <EmojiEvents sx={{ fontSize: 18, color: '#C4A35A', verticalAlign: 'middle' }} />}
                          {i === 1 && <EmojiEvents sx={{ fontSize: 18, color: '#B0B0B0', verticalAlign: 'middle' }} />}
                          {i === 2 && <EmojiEvents sx={{ fontSize: 18, color: '#CD7F32', verticalAlign: 'middle' }} />}
                          {i > 2 && <Typography variant="body2" color="text.secondary">{i + 1}</Typography>}
                        </TableCell>
                        <TableCell sx={{ fontWeight: i < 3 ? 600 : 400 }}>{m.name}</TableCell>
                        <TableCell align="right">
                          <Chip label={m.contracts} size="small" sx={{ bgcolor: `${BORDEAUX}15`, color: BORDEAUX, fontWeight: 600, minWidth: 36 }} />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 500 }}>{m.revenue.toFixed(2)} EUR</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* ====== Gewinn-Entwicklung (LineChart) ====== */}
        {trend && trend.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  <Euro sx={{ mr: 1, verticalAlign: 'middle', color: BORDEAUX }} />Gewinn-Entwicklung
                </Typography>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={trend.map(t => ({ ...t, profit: t.revenue - t.expenses }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E0D8D0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(val) => [`${val.toFixed(2)} EUR`]} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="Umsatz" stroke={BORDEAUX} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="expenses" name="Ausgaben" stroke="#D32F2F" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="profit" name="Gewinn" stroke="#2E7D32" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
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
                <Button size="small" endIcon={<OpenInNew sx={{ fontSize: 14 }} />}
                  onClick={() => navigate('/contracts')} sx={{ color: BORDEAUX }}>Alle anzeigen</Button>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell><TableCell>Kunde</TableCell>
                    {isManager && <TableCell>Vertriebler</TableCell>}
                    <TableCell>Produkt</TableCell><TableCell>Status</TableCell>
                    <TableCell align="right">Wert</TableCell><TableCell>Erstellt</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(recent_contracts || []).map((c) => (
                    <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/contracts/${c.id}`)}>
                      <TableCell>#{c.id}</TableCell>
                      <TableCell>{c.customer ? `${c.customer.first_name} ${c.customer.last_name}` : '-'}</TableCell>
                      {isManager && <TableCell>{c.user ? `${c.user.first_name} ${c.user.last_name}` : '-'}</TableCell>}
                      <TableCell>{c.product?.name || '-'}</TableCell>
                      <TableCell>
                        <Chip label={STATUS_LABELS[c.status] || c.status} size="small"
                          sx={{ bgcolor: (STATUS_COLORS[c.status] || '#666') + '20', color: STATUS_COLORS[c.status] || '#666', fontWeight: 500 }} />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500 }}>{parseFloat(c.estimated_value || 0).toFixed(2)} EUR</TableCell>
                      <TableCell>{new Date(c.created_at).toLocaleDateString('de-DE')}</TableCell>
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
