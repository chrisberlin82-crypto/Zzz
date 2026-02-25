import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, TextField, Table, TableBody, TableCell,
  TableHead, TableRow, TablePagination, IconButton, Card, CardContent,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, MenuItem,
  Alert, CircularProgress, Chip, InputAdornment, Tooltip, LinearProgress
} from '@mui/material';
import {
  Add, Delete, Edit, FileDownload, Euro, Receipt,
  CalendarMonth, TrendingDown, CameraAlt, Image,
  Lock, PlayArrow, AccountBalance, Calculate
} from '@mui/icons-material';
import { expenseAPI, subscriptionAPI } from '../services/api';

const BORDEAUX = '#7A1B2D';

const MONTHS = [
  { value: '', label: 'Alle Monate' },
  { value: '1', label: 'Januar' }, { value: '2', label: 'Februar' },
  { value: '3', label: 'Maerz' }, { value: '4', label: 'April' },
  { value: '5', label: 'Mai' }, { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' }, { value: '8', label: 'August' },
  { value: '9', label: 'September' }, { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' }, { value: '12', label: 'Dezember' }
];

const QUARTERS = [
  { value: '', label: 'Alle Quartale' },
  { value: '1', label: 'Q1 (Jan-Mrz)' }, { value: '2', label: 'Q2 (Apr-Jun)' },
  { value: '3', label: 'Q3 (Jul-Sep)' }, { value: '4', label: 'Q4 (Okt-Dez)' }
];

const INITIAL_FORM = {
  amount: '',
  category_id: '',
  description: '',
  expense_date: new Date().toISOString().split('T')[0],
  notes: ''
};

const ExpensesPage = () => {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState('');
  const [quarter, setQuarter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const queryClient = useQueryClient();

  // Add-On Status pruefen
  const { data: addonData, isLoading: addonLoading } = useQuery(
    'addon-status',
    () => subscriptionAPI.getAddonStatus(),
    { staleTime: 60000 }
  );

  const addonTrialMutation = useMutation(
    () => subscriptionAPI.startAddonTrial({ addon_id: 'EUER_RECHNER' }),
    { onSuccess: () => queryClient.invalidateQueries('addon-status') }
  );

  const euerStatus = addonData?.data?.data?.euer || {};
  const addonActive = euerStatus.is_active;
  const addonNeverStarted = euerStatus.never_started;
  const addonTrialExpired = euerStatus.trial_expired;

  const { data, isLoading } = useQuery(
    ['expenses', page + 1, year, month, quarter],
    () => expenseAPI.getAll({
      page: page + 1,
      limit: 20,
      year: year || undefined,
      month: month || undefined,
      quarter: quarter || undefined
    }),
    { keepPreviousData: true }
  );

  const { data: categoriesData } = useQuery(
    'expense-categories',
    () => expenseAPI.getCategories()
  );

  const createMutation = useMutation(
    (data) => editExpense
      ? expenseAPI.update(editExpense.id, data)
      : expenseAPI.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('expenses');
        setDialogOpen(false);
        setEditExpense(null);
        setFormData(INITIAL_FORM);
      }
    }
  );

  const deleteMutation = useMutation(
    (id) => expenseAPI.delete(id),
    { onSuccess: () => queryClient.invalidateQueries('expenses') }
  );

  const receiptMutation = useMutation(
    ({ id, file }) => {
      const fd = new FormData();
      fd.append('receipt', file);
      return expenseAPI.uploadReceipt(id, fd);
    },
    { onSuccess: () => queryClient.invalidateQueries('expenses') }
  );

  const fileInputRef = useRef(null);
  const [uploadExpenseId, setUploadExpenseId] = useState(null);

  const handleReceiptUpload = (expenseId) => {
    setUploadExpenseId(expenseId);
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (file && uploadExpenseId) {
      receiptMutation.mutate({ id: uploadExpenseId, file });
    }
    e.target.value = '';
    setUploadExpenseId(null);
  };

  const expenses = data?.data?.data?.expenses || [];
  const pagination = data?.data?.data?.pagination || { total: 0 };
  const totals = data?.data?.data?.totals || {};
  const categories = categoriesData?.data?.data || categoriesData?.data || [];

  const handleSubmit = () => {
    const submitData = {
      ...formData,
      amount: parseFloat(formData.amount),
      category_id: parseInt(formData.category_id, 10)
    };
    createMutation.mutate(submitData);
  };

  const openDialog = (expense = null) => {
    setEditExpense(expense);
    if (expense) {
      setFormData({
        amount: expense.amount || '',
        category_id: expense.category_id || '',
        description: expense.description || '',
        expense_date: expense.expense_date ? expense.expense_date.split('T')[0] : '',
        notes: expense.notes || ''
      });
    } else {
      setFormData(INITIAL_FORM);
    }
    setDialogOpen(true);
  };

  const handleExport = async () => {
    try {
      const response = await expenseAPI.export({
        year: year || undefined,
        month: month || undefined,
        quarter: quarter || undefined
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `EUeR_${year || 'Alle'}_${month || quarter || 'Gesamt'}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export fehlgeschlagen:', err);
    }
  };

  const years = [];
  for (let y = currentYear; y >= currentYear - 5; y--) {
    years.push(String(y));
  }

  // Add-On Locked State
  if (!addonLoading && !addonActive) {
    return (
      <Box>
        <Card sx={{
          p: 4, textAlign: 'center',
          opacity: addonTrialExpired ? 0.85 : 1,
          border: addonTrialExpired ? '2px solid #D32F2F' : '2px solid #C4A35A'
        }}>
          <Box sx={{
            width: 80, height: 80, borderRadius: '50%', mx: 'auto', mb: 2,
            bgcolor: addonTrialExpired ? '#D32F2F15' : '#C4A35A15',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {addonTrialExpired
              ? <Lock sx={{ fontSize: 40, color: '#D32F2F' }} />
              : <AccountBalance sx={{ fontSize: 40, color: '#C4A35A' }} />
            }
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            {addonTrialExpired
              ? 'EUeR-Rechner - Testphase abgelaufen'
              : 'Einnahmen-Ueberschuss-Rechner (EUeR)'}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
            {addonTrialExpired
              ? 'Ihre 30-Tage Testphase ist abgelaufen. Buchen Sie das Add-On um den EUeR-Rechner weiter zu nutzen.'
              : 'Professioneller EUeR fuer Vertriebsmitarbeiter - steuerkonform mit DATEV- und ELSTER-Schnittstelle. 30 Tage kostenlos testen!'}
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            {addonNeverStarted && (
              <Button
                variant="contained"
                size="large"
                startIcon={addonTrialMutation.isLoading ? <CircularProgress size={20} color="inherit" /> : <PlayArrow />}
                onClick={() => addonTrialMutation.mutate()}
                disabled={addonTrialMutation.isLoading}
                sx={{ bgcolor: '#C4A35A', '&:hover': { bgcolor: '#A68836' }, px: 4, py: 1.5, fontWeight: 600 }}
              >
                30 Tage kostenlos testen
              </Button>
            )}
            <Button
              variant={addonTrialExpired ? 'contained' : 'outlined'}
              size="large"
              startIcon={<Calculate />}
              onClick={() => navigate('/subscription')}
              sx={addonTrialExpired
                ? { bgcolor: BORDEAUX, '&:hover': { bgcolor: '#5A0F1E' }, px: 4, py: 1.5, fontWeight: 600 }
                : { borderColor: BORDEAUX, color: BORDEAUX, px: 4, py: 1.5, fontWeight: 600 }
              }
            >
              {addonTrialExpired ? 'Jetzt buchen (9,95 EUR/Monat)' : 'Preise ansehen'}
            </Button>
          </Box>

          {addonTrialMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {addonTrialMutation.error?.response?.data?.error || 'Fehler beim Starten der Testphase'}
            </Alert>
          )}

          {/* Feature-Liste */}
          <Grid container spacing={1} sx={{ mt: 3, textAlign: 'left', maxWidth: 600, mx: 'auto' }}>
            {['Automatische Kategorisierung (SKR03)', 'Steuerlich absetzbare Betraege',
              'DATEV-Export fuer Steuerberater', 'ELSTER-konforme Aufbereitung',
              'Belege fotografieren & zuordnen', 'Vorsteuerabzug-Berechnung'
            ].map((f, i) => (
              <Grid item xs={12} sm={6} key={i}>
                <Typography variant="body2" sx={{ color: addonTrialExpired ? '#999' : 'text.secondary' }}>
                  &#10003; {f}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      {/* Hidden file input fuer Beleg-Upload */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*,.pdf"
        onChange={handleFileSelected}
      />
      {receiptMutation.isSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => receiptMutation.reset()}>
          Beleg erfolgreich hochgeladen
        </Alert>
      )}
      {receiptMutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => receiptMutation.reset()}>
          Beleg konnte nicht hochgeladen werden
        </Alert>
      )}

      {/* Trial-Banner */}
      {euerStatus.is_trial && (
        <Alert
          severity={euerStatus.trial_days_left <= 7 ? 'warning' : 'info'}
          sx={{ mb: 2 }}
          action={
            <Button size="small" onClick={() => navigate('/subscription')} sx={{ color: 'inherit' }}>
              Jetzt buchen
            </Button>
          }
        >
          EUeR-Rechner Testphase: noch {euerStatus.trial_days_left} Tage verbleibend
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Einnahmen-Ueberschuss-Rechnung (EUeR)
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="DATEV-konformer Export (SKR03)">
            <Button
              variant="outlined" startIcon={<FileDownload />}
              onClick={handleExport}
              sx={{ borderColor: '#2E7D32', color: '#2E7D32' }}
            >
              DATEV
            </Button>
          </Tooltip>
          <Tooltip title="ELSTER-konforme Aufbereitung">
            <Button
              variant="outlined" startIcon={<FileDownload />}
              onClick={handleExport}
              sx={{ borderColor: '#1565C0', color: '#1565C0' }}
            >
              ELSTER
            </Button>
          </Tooltip>
          <Button
            variant="outlined" startIcon={<FileDownload />}
            onClick={handleExport}
            sx={{ borderColor: BORDEAUX, color: BORDEAUX }}
          >
            Excel
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => openDialog()}>
            Neue Ausgabe
          </Button>
        </Box>
      </Box>

      {/* Zusammenfassung */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">Brutto</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: BORDEAUX }}>
                {parseFloat(totals.total_amount || 0).toFixed(2)} EUR
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">Netto</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#9E3347' }}>
                {parseFloat(totals.total_net || 0).toFixed(2)} EUR
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">USt (Vorsteuer)</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#C4A35A' }}>
                {parseFloat(totals.total_tax || 0).toFixed(2)} EUR
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">Absetzbar</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#2E7D32' }}>
                {parseFloat(totals.total_deductible || 0).toFixed(2)} EUR
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              select fullWidth label="Jahr" size="small" value={year}
              onChange={(e) => { setYear(e.target.value); setPage(0); }}
            >
              <MenuItem value="">Alle Jahre</MenuItem>
              {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              select fullWidth label="Monat" size="small" value={month}
              onChange={(e) => { setMonth(e.target.value); setQuarter(''); setPage(0); }}
            >
              {MONTHS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              select fullWidth label="Quartal" size="small" value={quarter}
              onChange={(e) => { setQuarter(e.target.value); setMonth(''); setPage(0); }}
            >
              {QUARTERS.map(q => <MenuItem key={q.value} value={q.value}>{q.label}</MenuItem>)}
            </TextField>
          </Grid>
        </Grid>
      </Card>

      {/* Tabelle */}
      <Card>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress sx={{ color: BORDEAUX }} />
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Datum</TableCell>
                  <TableCell>Kategorie</TableCell>
                  <TableCell>Beschreibung</TableCell>
                  <TableCell align="right">Betrag (Brutto)</TableCell>
                  <TableCell align="right">USt</TableCell>
                  <TableCell>Absetzbar</TableCell>
                  <TableCell align="right">Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {expenses.map((expense) => {
                  const amount = parseFloat(expense.amount || 0);
                  const taxAmount = parseFloat(expense.tax_amount || 0);
                  return (
                    <TableRow key={expense.id} hover>
                      <TableCell>
                        {expense.expense_date
                          ? new Date(expense.expense_date).toLocaleDateString('de-DE')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip label={expense.category?.name || '-'} size="small" variant="outlined"
                          sx={{ borderColor: BORDEAUX, color: BORDEAUX }} />
                      </TableCell>
                      <TableCell>{expense.description || '-'}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500 }}>
                        {amount.toFixed(2)} EUR
                      </TableCell>
                      <TableCell align="right">
                        {taxAmount.toFixed(2)} EUR
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={expense.category?.tax_deductible !== false ? 'Ja' : 'Nein'}
                          size="small"
                          color={expense.category?.tax_deductible !== false ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title={expense.receipt_url ? 'Beleg vorhanden' : 'Beleg hochladen'}>
                          <IconButton
                            size="small"
                            onClick={() => expense.receipt_url
                              ? window.open(expense.receipt_url, '_blank')
                              : handleReceiptUpload(expense.id)
                            }
                            sx={{ color: expense.receipt_url ? '#2E7D32' : '#999' }}
                          >
                            {expense.receipt_url ? <Image fontSize="small" /> : <CameraAlt fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                        <IconButton size="small" onClick={() => openDialog(expense)}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => {
                          if (window.confirm('Ausgabe wirklich loeschen?')) {
                            deleteMutation.mutate(expense.id);
                          }
                        }}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {expenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Receipt sx={{ fontSize: 48, color: '#E0D8D0', mb: 1, display: 'block', mx: 'auto' }} />
                      <Typography color="text.secondary">Keine Ausgaben gefunden</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div" count={pagination.total} page={page}
              onPageChange={(e, p) => setPage(p)} rowsPerPage={20} rowsPerPageOptions={[20]}
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} von ${count}`}
            />
          </>
        )}
      </Card>

      {/* Erstellen/Bearbeiten Dialog */}
      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditExpense(null); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {editExpense ? 'Ausgabe bearbeiten' : 'Neue Ausgabe'}
        </DialogTitle>
        <DialogContent>
          {createMutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>Fehler beim Speichern</Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth label="Betrag (Brutto, EUR)" type="number" required
                value={formData.amount}
                onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Euro sx={{ fontSize: 18 }} /></InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select fullWidth label="Kategorie" required
                value={formData.category_id}
                onChange={(e) => setFormData(p => ({ ...p, category_id: e.target.value }))}
              >
                <MenuItem value="">-- Kategorie waehlen --</MenuItem>
                {(Array.isArray(categories) ? categories : []).map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.code ? `${cat.code} - ${cat.name}` : cat.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth label="Beschreibung" required
                value={formData.description}
                onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth label="Datum" type="date" required
                InputLabelProps={{ shrink: true }}
                value={formData.expense_date}
                onChange={(e) => setFormData(p => ({ ...p, expense_date: e.target.value }))}
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
          <Button onClick={() => { setDialogOpen(false); setEditExpense(null); }}>
            Abbrechen
          </Button>
          <Button
            variant="contained" onClick={handleSubmit}
            disabled={createMutation.isLoading || !formData.amount || !formData.category_id || !formData.description}
          >
            {createMutation.isLoading ? 'Wird gespeichert...' : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExpensesPage;
