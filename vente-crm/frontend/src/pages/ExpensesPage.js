import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box, Typography, Button, TextField, Table, TableBody, TableCell,
  TableHead, TableRow, TablePagination, IconButton, Card, CardContent,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, MenuItem,
  Alert, CircularProgress, Chip
} from '@mui/material';
import {
  Add, Delete, Edit, FileDownload, Euro, Receipt,
  CalendarMonth, TrendingDown
} from '@mui/icons-material';
import { expenseAPI } from '../services/api';

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
  category: '',
  description: '',
  expense_date: new Date().toISOString().split('T')[0],
  tax_rate: '19',
  is_deductible: true,
  receipt_number: '',
  notes: ''
};

const ExpensesPage = () => {
  const currentYear = new Date().getFullYear();
  const [page, setPage] = useState(0);
  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState('');
  const [quarter, setQuarter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const queryClient = useQueryClient();

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

  const expenses = data?.data?.data?.expenses || [];
  const pagination = data?.data?.data?.pagination || { total: 0 };
  const totals = data?.data?.data?.totals || {};
  const categories = categoriesData?.data?.data || categoriesData?.data || [];

  const handleSubmit = () => {
    const submitData = {
      ...formData,
      amount: parseFloat(formData.amount),
      tax_rate: parseFloat(formData.tax_rate),
      is_deductible: formData.is_deductible
    };
    createMutation.mutate(submitData);
  };

  const openDialog = (expense = null) => {
    setEditExpense(expense);
    if (expense) {
      setFormData({
        amount: expense.amount || '',
        category: expense.category || '',
        description: expense.description || '',
        expense_date: expense.expense_date ? expense.expense_date.split('T')[0] : '',
        tax_rate: expense.tax_rate || '19',
        is_deductible: expense.is_deductible !== false,
        receipt_number: expense.receipt_number || '',
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

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Einnahmen-Ueberschuss-Rechnung (EUeR)
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined" startIcon={<FileDownload />}
            onClick={handleExport}
            sx={{ borderColor: BORDEAUX, color: BORDEAUX }}
          >
            Excel Export
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
                {parseFloat(totals.brutto || 0).toFixed(2)} EUR
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">Netto</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#9E3347' }}>
                {parseFloat(totals.netto || 0).toFixed(2)} EUR
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">USt (Vorsteuer)</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#C4A35A' }}>
                {parseFloat(totals.ust || 0).toFixed(2)} EUR
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">Absetzbar</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#2E7D32' }}>
                {parseFloat(totals.absetzbar || totals.deductible || 0).toFixed(2)} EUR
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
                  const taxRate = parseFloat(expense.tax_rate || 19);
                  const ust = amount - (amount / (1 + taxRate / 100));
                  return (
                    <TableRow key={expense.id} hover>
                      <TableCell>
                        {expense.expense_date
                          ? new Date(expense.expense_date).toLocaleDateString('de-DE')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip label={expense.category || '-'} size="small" variant="outlined"
                          sx={{ borderColor: BORDEAUX, color: BORDEAUX }} />
                      </TableCell>
                      <TableCell>{expense.description || '-'}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500 }}>
                        {amount.toFixed(2)} EUR
                      </TableCell>
                      <TableCell align="right">
                        {ust.toFixed(2)} EUR
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={expense.is_deductible !== false ? 'Ja' : 'Nein'}
                          size="small"
                          color={expense.is_deductible !== false ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="right">
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
                value={formData.category}
                onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
              >
                <MenuItem value="">-- Kategorie waehlen --</MenuItem>
                {(Array.isArray(categories) ? categories : []).map((cat) => (
                  <MenuItem key={typeof cat === 'string' ? cat : cat.value || cat.id} value={typeof cat === 'string' ? cat : cat.value || cat.name}>
                    {typeof cat === 'string' ? cat : cat.label || cat.name}
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
            <Grid item xs={6}>
              <TextField
                fullWidth label="Datum" type="date" required
                InputLabelProps={{ shrink: true }}
                value={formData.expense_date}
                onChange={(e) => setFormData(p => ({ ...p, expense_date: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select fullWidth label="USt-Satz"
                value={formData.tax_rate}
                onChange={(e) => setFormData(p => ({ ...p, tax_rate: e.target.value }))}
              >
                <MenuItem value="19">19% (Regelsteuersatz)</MenuItem>
                <MenuItem value="7">7% (Ermaessigt)</MenuItem>
                <MenuItem value="0">0% (Steuerfrei)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                select fullWidth label="Absetzbar"
                value={formData.is_deductible ? 'true' : 'false'}
                onChange={(e) => setFormData(p => ({ ...p, is_deductible: e.target.value === 'true' }))}
              >
                <MenuItem value="true">Ja</MenuItem>
                <MenuItem value="false">Nein</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth label="Belegnummer"
                value={formData.receipt_number}
                onChange={(e) => setFormData(p => ({ ...p, receipt_number: e.target.value }))}
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
            disabled={createMutation.isLoading || !formData.amount || !formData.category || !formData.description}
          >
            {createMutation.isLoading ? 'Wird gespeichert...' : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExpensesPage;
