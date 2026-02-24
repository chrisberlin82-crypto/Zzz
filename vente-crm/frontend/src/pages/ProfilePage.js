import React, { useState, useEffect } from 'react';
import { useMutation } from 'react-query';
import {
  Box, Typography, Card, CardContent, TextField, Button,
  Grid, Alert, Divider
} from '@mui/material';
import { Save, Lock } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

const ProfilePage = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({});
  const [passwords, setPasswords] = useState({ current_password: '', password: '', confirm: '' });
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) setFormData({ ...user });
  }, [user]);

  const profileMutation = useMutation(
    (data) => authAPI.updateProfile(data),
    { onSuccess: () => { setSuccess('Profil aktualisiert'); setTimeout(() => setSuccess(''), 3000); } }
  );

  const passwordMutation = useMutation(
    (data) => authAPI.updateProfile(data),
    { onSuccess: () => { setSuccess('Passwort geändert'); setPasswords({ current_password: '', password: '', confirm: '' }); setTimeout(() => setSuccess(''), 3000); } }
  );

  const handleProfileSave = () => {
    const { first_name, last_name, company_name, phone, street, postal_code, city, iban, tax_number } = formData;
    profileMutation.mutate({ first_name, last_name, company_name, phone, street, postal_code, city, iban, tax_number });
  };

  const handlePasswordSave = () => {
    if (passwords.password !== passwords.confirm) return;
    passwordMutation.mutate({ current_password: passwords.current_password, password: passwords.password });
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>Mein Profil</Typography>

      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      {profileMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>Fehler beim Speichern</Alert>}

      {/* Persönliche Daten */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Persönliche Daten</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}><TextField fullWidth label="Vorname" value={formData.first_name || ''} onChange={(e) => setFormData(p => ({ ...p, first_name: e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Nachname" value={formData.last_name || ''} onChange={(e) => setFormData(p => ({ ...p, last_name: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="E-Mail" value={formData.email || ''} disabled /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Telefon" value={formData.phone || ''} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Rolle" value={formData.role || ''} disabled /></Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Firmendaten</Typography>
          <Grid container spacing={2}>
            <Grid item xs={8}><TextField fullWidth label="Firmenname" value={formData.company_name || ''} onChange={(e) => setFormData(p => ({ ...p, company_name: e.target.value }))} /></Grid>
            <Grid item xs={4}><TextField fullWidth label="Steuernummer" value={formData.tax_number || ''} onChange={(e) => setFormData(p => ({ ...p, tax_number: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Straße" value={formData.street || ''} onChange={(e) => setFormData(p => ({ ...p, street: e.target.value }))} /></Grid>
            <Grid item xs={4}><TextField fullWidth label="PLZ" value={formData.postal_code || ''} onChange={(e) => setFormData(p => ({ ...p, postal_code: e.target.value }))} /></Grid>
            <Grid item xs={8}><TextField fullWidth label="Ort" value={formData.city || ''} onChange={(e) => setFormData(p => ({ ...p, city: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="IBAN" value={formData.iban || ''} onChange={(e) => setFormData(p => ({ ...p, iban: e.target.value }))} /></Grid>
          </Grid>

          <Box sx={{ mt: 3 }}>
            <Button variant="contained" startIcon={<Save />} onClick={handleProfileSave} disabled={profileMutation.isLoading}>
              Profil speichern
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Passwort ändern */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            <Lock sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />Passwort ändern
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}><TextField fullWidth label="Aktuelles Passwort" type="password" value={passwords.current_password} onChange={(e) => setPasswords(p => ({ ...p, current_password: e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Neues Passwort" type="password" value={passwords.password} onChange={(e) => setPasswords(p => ({ ...p, password: e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Bestätigen" type="password" value={passwords.confirm} onChange={(e) => setPasswords(p => ({ ...p, confirm: e.target.value }))}
              error={passwords.confirm && passwords.password !== passwords.confirm}
              helperText={passwords.confirm && passwords.password !== passwords.confirm ? 'Passwörter stimmen nicht überein' : ''} /></Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" startIcon={<Lock />} onClick={handlePasswordSave}
              disabled={!passwords.current_password || !passwords.password || passwords.password !== passwords.confirm || passwordMutation.isLoading}>
              Passwort ändern
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProfilePage;
