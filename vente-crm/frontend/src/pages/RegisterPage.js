import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Alert, Grid
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    email: '', password: '', company_name: '', legal_form: '',
    owner_manager: '', tax_number: '', street: '', postal_code: '',
    city: '', iban: '', first_name: '', last_name: '', phone: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(formData);
      navigate('/login', { state: { message: 'Registrierung erfolgreich. Bitte melden Sie sich an.' } });
    } catch (err) {
      setError(err.response?.data?.error || 'Registrierung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #5A0F1E 0%, #7A1B2D 40%, #9E3347 100%)', px: 2, py: 4
    }}>
      <Card sx={{ maxWidth: 600, width: '100%', borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#7A1B2D' }}>Registrierung</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>Erstellen Sie Ihr Vente CRM Konto</Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField fullWidth label="Vorname" name="first_name" value={formData.first_name} onChange={handleChange} required />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Nachname" name="last_name" value={formData.last_name} onChange={handleChange} required />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="E-Mail" name="email" type="email" value={formData.email} onChange={handleChange} required />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Passwort" name="password" type="password" value={formData.password} onChange={handleChange} required
                  helperText="Mind. 8 Zeichen, Groß-/Kleinbuchstaben, Zahl und Sonderzeichen" />
              </Grid>
              <Grid item xs={8}>
                <TextField fullWidth label="Firmenname" name="company_name" value={formData.company_name} onChange={handleChange} required />
              </Grid>
              <Grid item xs={4}>
                <TextField fullWidth label="Rechtsform" name="legal_form" value={formData.legal_form} onChange={handleChange} placeholder="GmbH" />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Geschäftsführer" name="owner_manager" value={formData.owner_manager} onChange={handleChange} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Steuernummer" name="tax_number" value={formData.tax_number} onChange={handleChange} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Telefon" name="phone" value={formData.phone} onChange={handleChange} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Straße" name="street" value={formData.street} onChange={handleChange} />
              </Grid>
              <Grid item xs={4}>
                <TextField fullWidth label="PLZ" name="postal_code" value={formData.postal_code} onChange={handleChange} />
              </Grid>
              <Grid item xs={8}>
                <TextField fullWidth label="Ort" name="city" value={formData.city} onChange={handleChange} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="IBAN" name="iban" value={formData.iban} onChange={handleChange} />
              </Grid>
            </Grid>

            <Button fullWidth type="submit" variant="contained" size="large" disabled={loading} sx={{ mt: 3, py: 1.5 }}>
              {loading ? 'Wird registriert...' : 'Registrieren'}
            </Button>
          </form>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Bereits ein Konto? <Link to="/login" style={{ color: '#7A1B2D', fontWeight: 500 }}>Anmelden</Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RegisterPage;
