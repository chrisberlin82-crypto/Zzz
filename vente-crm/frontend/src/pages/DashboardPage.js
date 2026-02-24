import React from 'react';
import { useQuery } from 'react-query';
import {
  Box, Grid, Card, CardContent, Typography, Chip, Table,
  TableBody, TableCell, TableHead, TableRow, CircularProgress
} from '@mui/material';
import { People, Description, TrendingUp, AccountBalance } from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { dashboardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const PIPELINE_COLORS = {
  LEAD: '#E0D8D0', QUALIFIED: '#C4A35A', OFFER: '#D4B97A',
  NEGOTIATION: '#9E3347', SIGNED: '#7A1B2D', ACTIVE: '#2E7D32',
  CANCELLED: '#D32F2F', EXPIRED: '#999'
};

const STATUS_LABELS = {
  LEAD: 'Lead', QUALIFIED: 'Qualifiziert', OFFER: 'Angebot',
  NEGOTIATION: 'Verhandlung', SIGNED: 'Unterschrieben', ACTIVE: 'Aktiv',
  CANCELLED: 'Storniert', EXPIRED: 'Abgelaufen'
};

const KPICard = ({ title, value, subtitle, icon, color = '#7A1B2D' }) => (
  <Card>
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography color="text.secondary" sx={{ fontSize: '0.85rem', mb: 0.5 }}>{title}</Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color }}>{value}</Typography>
          {subtitle && <Typography color="text.secondary" sx={{ fontSize: '0.8rem', mt: 0.5 }}>{subtitle}</Typography>}
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

const DashboardPage = () => {
  const { user } = useAuth();
  const { data, isLoading } = useQuery('dashboard', () => dashboardAPI.get());

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  const dashboard = data?.data?.data;
  if (!dashboard) return <Typography>Keine Daten verfügbar</Typography>;

  const { kpis, pipeline, recent_contracts } = dashboard;

  const pipelineData = Object.entries(pipeline || {}).map(([status, info]) => ({
    name: STATUS_LABELS[status] || status,
    value: info.count,
    totalValue: info.value,
    color: PIPELINE_COLORS[status]
  }));

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
        Willkommen, {user?.first_name || user?.email}
      </Typography>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <KPICard title="Kunden" value={kpis.customers?.total || 0}
            icon={<People />} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KPICard title="Verträge gesamt" value={kpis.contracts?.total || 0}
            subtitle={`${kpis.contracts?.this_month || 0} diesen Monat`}
            icon={<Description />} color="#9E3347" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KPICard title="Forecast" value={`${((kpis.revenue?.forecast_value || 0) / 1000).toFixed(1)}k`}
            subtitle={`Conversion: ${kpis.contracts?.conversion_rate || 0}%`}
            icon={<TrendingUp />} color="#C4A35A" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KPICard title="Ausgaben (Monat)" value={`${(kpis.expenses?.this_month || 0).toFixed(0)} €`}
            subtitle={`Absetzbar: ${(kpis.expenses?.deductible_this_month || 0).toFixed(0)} €`}
            icon={<AccountBalance />} color="#2E7D32" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Pipeline Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Pipeline</Typography>
              {pipelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={pipelineData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(val) => [val, 'Anzahl']} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {pipelineData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  Keine Pipeline-Daten vorhanden
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Pipeline Values */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Pipeline-Werte</Typography>
              {pipelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={pipelineData.filter(d => d.totalValue > 0)} dataKey="totalValue"
                      cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}€`}>
                      {pipelineData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => [`${val} €`, 'Wert']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  Keine Wertdaten vorhanden
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Contracts */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Letzte Verträge</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Kunde</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Wert</TableCell>
                    <TableCell>Erstellt</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(recent_contracts || []).map((contract) => (
                    <TableRow key={contract.id} hover>
                      <TableCell>#{contract.id}</TableCell>
                      <TableCell>
                        {contract.customer ? `${contract.customer.first_name} ${contract.customer.last_name}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip label={STATUS_LABELS[contract.status] || contract.status} size="small"
                          sx={{ bgcolor: PIPELINE_COLORS[contract.status] + '20', color: PIPELINE_COLORS[contract.status], fontWeight: 500 }} />
                      </TableCell>
                      <TableCell align="right">{parseFloat(contract.estimated_value || 0).toFixed(2)} €</TableCell>
                      <TableCell>{new Date(contract.created_at).toLocaleDateString('de-DE')}</TableCell>
                    </TableRow>
                  ))}
                  {(!recent_contracts || recent_contracts.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        Noch keine Verträge vorhanden
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
