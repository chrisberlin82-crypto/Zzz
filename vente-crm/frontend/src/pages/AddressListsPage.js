import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box, Typography, Button, Card, CardContent, CardActions,
  Grid, LinearProgress, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, CircularProgress, Alert, IconButton
} from '@mui/material';
import {
  Upload, Map, Delete, ListAlt, LocationOn, CheckCircle,
  HourglassEmpty, CloudUpload, InsertDriveFile
} from '@mui/icons-material';
import { addressAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const BORDEAUX = '#7A1B2D';

const GEOCODING_STATUS_CONFIG = {
  PENDING: { label: 'Ausstehend', color: '#C4A35A', icon: <HourglassEmpty /> },
  IN_PROGRESS: { label: 'In Bearbeitung', color: '#9E3347', icon: <HourglassEmpty /> },
  COMPLETED: { label: 'Abgeschlossen', color: '#2E7D32', icon: <CheckCircle /> },
  FAILED: { label: 'Fehlgeschlagen', color: '#D32F2F', icon: <CheckCircle /> }
};

const AddressListsPage = () => {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [listName, setListName] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, hasRole } = useAuth();
  const isVertrieb = hasRole('VERTRIEB');
  const pageTitle = isVertrieb ? 'Mein Geschaeftsgebiet' : 'Adresslisten';

  const { data, isLoading } = useQuery(
    'address-lists',
    () => addressAPI.getAll()
  );

  const uploadMutation = useMutation(
    (formData) => addressAPI.import(formData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('address-lists');
        setUploadDialogOpen(false);
        setSelectedFile(null);
        setListName('');
      }
    }
  );

  const deleteMutation = useMutation(
    (id) => addressAPI.delete(id),
    { onSuccess: () => queryClient.invalidateQueries('address-lists') }
  );

  const geocodeMutation = useMutation(
    (id) => addressAPI.geocode(id),
    { onSuccess: () => queryClient.invalidateQueries('address-lists') }
  );

  const lists = data?.data?.data || data?.data || [];

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (!listName) {
        setListName(file.name.replace(/\.(xlsx?|csv)$/i, ''));
      }
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('name', listName || selectedFile.name);
    uploadMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: BORDEAUX }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>{pageTitle}</Typography>
        {!isVertrieb && (
          <Button
            variant="contained" startIcon={<Upload />}
            onClick={() => setUploadDialogOpen(true)}
          >
            Excel importieren
          </Button>
        )}
      </Box>

      {/* Listen-Grid */}
      <Grid container spacing={3}>
        {(Array.isArray(lists) ? lists : []).map((list) => {
          const statusConfig = GEOCODING_STATUS_CONFIG[list.geocoding_status] || GEOCODING_STATUS_CONFIG.PENDING;
          const geocodedPercent = list.total_addresses > 0
            ? Math.round((list.geocoded_count || 0) / list.total_addresses * 100)
            : 0;

          return (
            <Grid item xs={12} sm={6} md={4} key={list.id}>
              <Card sx={{
                height: '100%', display: 'flex', flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 24px rgba(122, 27, 45, 0.15)'
                }
              }}>
                <CardContent sx={{ p: 3, flexGrow: 1 }}>
                  {/* Name & Status */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {list.name || `Liste #${list.id}`}
                    </Typography>
                    <Chip
                      icon={React.cloneElement(statusConfig.icon, { sx: { fontSize: 16 } })}
                      label={statusConfig.label}
                      size="small"
                      sx={{
                        bgcolor: `${statusConfig.color}15`,
                        color: statusConfig.color,
                        fontWeight: 500
                      }}
                    />
                  </Box>

                  {/* Statistiken */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ListAlt sx={{ fontSize: 18, color: BORDEAUX }} />
                        <Typography variant="body2" color="text.secondary">
                          Adressen gesamt
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {list.total_addresses || 0}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LocationOn sx={{ fontSize: 18, color: '#2E7D32' }} />
                        <Typography variant="body2" color="text.secondary">
                          Geocodiert
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {list.geocoded_count || 0}
                      </Typography>
                    </Box>

                    {/* Fortschrittsbalken */}
                    <LinearProgress
                      variant="determinate"
                      value={geocodedPercent}
                      sx={{
                        height: 8, borderRadius: 4,
                        bgcolor: '#E0D8D020',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 4,
                          bgcolor: geocodedPercent === 100 ? '#2E7D32' : BORDEAUX
                        }
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {geocodedPercent}% geocodiert
                    </Typography>
                  </Box>

                  {/* Erstelldatum */}
                  {list.created_at && (
                    <Typography variant="caption" color="text.secondary">
                      Erstellt: {new Date(list.created_at).toLocaleDateString('de-DE')}
                    </Typography>
                  )}
                </CardContent>

                <CardActions sx={{ px: 3, pb: 2, pt: 0, justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small" startIcon={<ListAlt />}
                      onClick={() => navigate(`/address-lists/${list.id}/addresses`)}
                      sx={{ color: BORDEAUX }}
                    >
                      Adressen
                    </Button>
                    <Button
                      size="small" startIcon={<Map />}
                      onClick={() => navigate(`/address-lists/${list.id}/map`)}
                      sx={{ color: BORDEAUX }}
                    >
                      Karte
                    </Button>
                    {list.geocoding_status !== 'COMPLETED' && list.geocoding_status !== 'IN_PROGRESS' && (
                      <Button
                        size="small" startIcon={<LocationOn />}
                        onClick={() => geocodeMutation.mutate(list.id)}
                        disabled={geocodeMutation.isLoading}
                        sx={{ color: '#2E7D32' }}
                      >
                        Geocodieren
                      </Button>
                    )}
                  </Box>
                  {!isVertrieb && <IconButton
                    size="small" color="error"
                    onClick={() => {
                      if (window.confirm('Adressliste wirklich loeschen? Alle Adressen werden entfernt.')) {
                        deleteMutation.mutate(list.id);
                      }
                    }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>}
                </CardActions>
              </Card>
            </Grid>
          );
        })}

        {lists.length === 0 && (
          <Grid item xs={12}>
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <ListAlt sx={{ fontSize: 64, color: '#E0D8D0', mb: 2 }} />
              <Typography color="text.secondary" variant="h6">
                Noch keine Adresslisten vorhanden
              </Typography>
              <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                Importieren Sie eine Excel-Datei um zu beginnen
              </Typography>
            </Box>
          </Grid>
        )}
      </Grid>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Excel-Datei importieren</DialogTitle>
        <DialogContent>
          {uploadMutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Fehler beim Importieren. Bitte pruefen Sie das Dateiformat.
            </Alert>
          )}

          <TextField
            fullWidth label="Listenname" sx={{ mt: 1, mb: 3 }}
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="Name der Adressliste"
          />

          {/* Datei-Upload-Bereich */}
          <Box
            sx={{
              border: '2px dashed #E0D8D0',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'border-color 0.2s, background-color 0.2s',
              '&:hover': {
                borderColor: BORDEAUX,
                bgcolor: `${BORDEAUX}05`
              }
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              hidden
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
            />
            {selectedFile ? (
              <Box>
                <InsertDriveFile sx={{ fontSize: 48, color: BORDEAUX, mb: 1 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                  {selectedFile.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </Typography>
              </Box>
            ) : (
              <Box>
                <CloudUpload sx={{ fontSize: 48, color: '#E0D8D0', mb: 1 }} />
                <Typography variant="subtitle1" color="text.secondary">
                  Klicken Sie hier oder ziehen Sie eine Datei hierher
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Unterstuetzte Formate: .xlsx, .xls, .csv
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setUploadDialogOpen(false); setSelectedFile(null); setListName(''); }}>
            Abbrechen
          </Button>
          <Button
            variant="contained" onClick={handleUpload}
            disabled={!selectedFile || uploadMutation.isLoading}
            startIcon={uploadMutation.isLoading ? <CircularProgress size={16} /> : <Upload />}
          >
            {uploadMutation.isLoading ? 'Wird importiert...' : 'Importieren'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AddressListsPage;
