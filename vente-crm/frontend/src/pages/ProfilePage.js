import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box, Typography, Button, TextField, Card, CardContent, Grid,
  Avatar, Divider, Alert, CircularProgress, Chip
} from '@mui/material';
import {
  Person, Email, Phone, Lock, Save, Badge,
  CalendarToday, Security
} from '@mui/icons-material';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const BORDEAUX = '#7A1B2D';

const ROLE_LABELS = {
  ADMIN: 'Administrator',
  STANDORTLEITUNG: 'Standortleitung',
  TEAMLEAD: 'Teamleiter',
  BACKOFFICE: 'Backoffice',
  VERTRIEB: 'Vertrieb'
};

const ProfilePage = () => {
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const { data, isLoading } = useQuery(
    'profile',
    () => authAPI.getProfile(),
    {
      onSuccess: (response) => {
        const user = response?.data?.data || response?.data;
        if (user) {
          setProfileData({
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || '',
            phone: user.phone || ''
          });
        }
      }
    }
  );

  const profileMutation = useMutation(
    (data) => authAPI.updateProfile(data),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries('profile');
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3000);
        // Lokalen Benutzer aktualisieren
        const updatedUser = response?.data?.data || response?.data;
        if (updatedUser) {
          const savedUser = JSON.parse(localStorage.getItem('vente_user') || '{}');
          const merged = { ...savedUser, ...updatedUser };
          localStorage.setItem('vente_user', JSON.stringify(merged));
        }
      }
    }
  );

  const passwordMutation = useMutation(
    (data) => authAPI.updateProfile(data),
    {
      onSuccess: () => {
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        setPasswordSuccess(true);
        setPasswordError('');
        setTimeout(() => setPasswordSuccess(false), 3000);
      },
      onError: (error) => {
        setPasswordError(error?.response?.data?.message || 'Fehler beim Aendern des Passworts');
      }
    }
  );

  const user = data?.data?.data || data?.data || authUser || {};

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    setProfileSuccess(false);
    profileMutation.mutate(profileData);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError('Die Passwoerter stimmen nicht ueberein.');
      return;
    }
    if (passwordData.new_password.length < 8) {
      setPasswordError('Das Passwort muss mindestens 8 Zeichen lang sein.');
      return;
    }

    passwordMutation.mutate({
      current_password: passwordData.current_password,
      new_password: passwordData.new_password
    });
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: BORDEAUX }} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>Mein Profil</Typography>

      {/* Profil-Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Avatar sx={{
              width: 80, height: 80, bgcolor: BORDEAUX, fontSize: 28, fontWeight: 600
            }}>
              {(user.first_name || '?')[0]}{(user.last_name || '?')[0]}
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                {user.first_name} {user.last_name}
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 1 }}>
                {user.email}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  icon={<Badge sx={{ fontSize: 16 }} />}
                  label={ROLE_LABELS[user.role] || user.role}
                  size="small"
                  sx={{
                    bgcolor: `${BORDEAUX}15`, color: BORDEAUX, fontWeight: 500,
                    '& .MuiChip-icon': { color: BORDEAUX }
                  }}
                />
                {user.created_at && (
                  <Chip
                    icon={<CalendarToday sx={{ fontSize: 14 }} />}
                    label={`Mitglied seit ${new Date(user.created_at).toLocaleDateString('de-DE')}`}
                    size="small"
                    variant="outlined"
                    sx={{ borderColor: '#E0D8D0' }}
                  />
                )}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Persoenliche Daten bearbeiten */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Person sx={{ color: BORDEAUX }} />
            Persoenliche Daten
          </Typography>

          {profileSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Profil erfolgreich aktualisiert!
            </Alert>
          )}
          {profileMutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Fehler beim Aktualisieren des Profils
            </Alert>
          )}

          <form onSubmit={handleProfileSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth label="Vorname" required
                  value={profileData.first_name}
                  onChange={(e) => setProfileData(p => ({ ...p, first_name: e.target.value }))}
                  InputProps={{
                    startAdornment: <Person sx={{ mr: 1, color: '#999', fontSize: 20 }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth label="Nachname" required
                  value={profileData.last_name}
                  onChange={(e) => setProfileData(p => ({ ...p, last_name: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth label="E-Mail" type="email" required
                  value={profileData.email}
                  onChange={(e) => setProfileData(p => ({ ...p, email: e.target.value }))}
                  InputProps={{
                    startAdornment: <Email sx={{ mr: 1, color: '#999', fontSize: 20 }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth label="Telefon"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(p => ({ ...p, phone: e.target.value }))}
                  InputProps={{
                    startAdornment: <Phone sx={{ mr: 1, color: '#999', fontSize: 20 }} />
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="submit" variant="contained" startIcon={<Save />}
                    disabled={profileMutation.isLoading}
                    sx={{ bgcolor: BORDEAUX, '&:hover': { bgcolor: '#5A0F1E' } }}
                  >
                    {profileMutation.isLoading ? 'Wird gespeichert...' : 'Profil speichern'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>

      {/* Passwort aendern */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Security sx={{ color: BORDEAUX }} />
            Passwort aendern
          </Typography>

          {passwordSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Passwort erfolgreich geaendert!
            </Alert>
          )}
          {passwordError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {passwordError}
            </Alert>
          )}

          <form onSubmit={handlePasswordSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth label="Aktuelles Passwort" type="password" required
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData(p => ({ ...p, current_password: e.target.value }))}
                  InputProps={{
                    startAdornment: <Lock sx={{ mr: 1, color: '#999', fontSize: 20 }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth label="Neues Passwort" type="password" required
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData(p => ({ ...p, new_password: e.target.value }))}
                  helperText="Mindestens 8 Zeichen"
                  InputProps={{
                    startAdornment: <Lock sx={{ mr: 1, color: '#999', fontSize: 20 }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth label="Passwort bestaetigen" type="password" required
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData(p => ({ ...p, confirm_password: e.target.value }))}
                  error={passwordData.confirm_password !== '' && passwordData.new_password !== passwordData.confirm_password}
                  helperText={
                    passwordData.confirm_password !== '' && passwordData.new_password !== passwordData.confirm_password
                      ? 'Passwoerter stimmen nicht ueberein'
                      : ''
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="submit" variant="contained" startIcon={<Lock />}
                    disabled={passwordMutation.isLoading || !passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password}
                    sx={{ bgcolor: BORDEAUX, '&:hover': { bgcolor: '#5A0F1E' } }}
                  >
                    {passwordMutation.isLoading ? 'Wird geaendert...' : 'Passwort aendern'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProfilePage;
