import { createTheme } from '@mui/material/styles';

// Vente CRM Farbschema: Dunkles Bordeauxrot + Weiß
const theme = createTheme({
  palette: {
    primary: {
      main: '#7A1B2D',      // Dunkles Bordeauxrot
      light: '#9E3347',     // Heller Bordeaux
      dark: '#5A0F1E',      // Sehr dunkles Bordeaux
      contrastText: '#FFFFFF'
    },
    secondary: {
      main: '#C4A35A',      // Gold-Akzent
      light: '#D4B97A',
      dark: '#A68836',
      contrastText: '#FFFFFF'
    },
    background: {
      default: '#F5F3F0',   // Warmes Hellgrau
      paper: '#FFFFFF'
    },
    error: {
      main: '#D32F2F'
    },
    warning: {
      main: '#ED6C02'
    },
    success: {
      main: '#2E7D32'
    },
    info: {
      main: '#7A1B2D'
    },
    text: {
      primary: '#2C2C2C',
      secondary: '#666666'
    },
    divider: '#E0D8D0'
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 500 }
  },
  shape: {
    borderRadius: 8
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 20px',
          boxShadow: 'none',
          '&:hover': { boxShadow: '0 2px 8px rgba(122, 27, 45, 0.25)' }
        },
        contained: {
          background: 'linear-gradient(135deg, #7A1B2D 0%, #9E3347 100%)'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          border: '1px solid #E0D8D0'
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #5A0F1E 0%, #7A1B2D 100%)',
          boxShadow: '0 2px 12px rgba(90, 15, 30, 0.3)'
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: 'linear-gradient(180deg, #5A0F1E 0%, #7A1B2D 50%, #9E3347 100%)',
          color: '#FFFFFF'
        }
      }
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#7A1B2D',
            color: '#FFFFFF',
            fontWeight: 600
          }
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6 }
      }
    }
  }
});

export default theme;
