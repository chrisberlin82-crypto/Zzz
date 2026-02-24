import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, AppBar, Toolbar, Typography, Drawer, List, ListItem,
  ListItemIcon, ListItemText, IconButton, Avatar, Menu, MenuItem,
  Divider, useMediaQuery, useTheme
} from '@mui/material';
import {
  Menu as MenuIcon, Dashboard, People, Description, Inventory,
  AccountBalance, Map, Person, ExitToApp, ChevronLeft, BarChart
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

const DRAWER_WIDTH = 260;

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard', permission: 'dashboard:read' },
  { text: 'Kunden', icon: <People />, path: '/customers', permission: 'customers:read' },
  { text: 'Verträge', icon: <Description />, path: '/contracts', permission: 'contracts:read' },
  { text: 'Produkte', icon: <Inventory />, path: '/products', permission: 'products:read' },
  { text: 'EÜR / Ausgaben', icon: <AccountBalance />, path: '/expenses', permission: 'expenses:read' },
  { text: 'Adresslisten', icon: <Map />, path: '/address-lists', permission: 'addresses:read' },
  { text: 'Statistiken', icon: <BarChart />, path: '/dashboard', permission: 'reports:read' },
];

const adminItems = [
  { text: 'Benutzer', icon: <Person />, path: '/users', permission: 'users:read' },
];

const Layout = () => {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleLogout = async () => {
    setAnchorEl(null);
    await logout();
    navigate('/login');
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: '8px',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '1.1rem', color: '#fff'
          }}>V</Box>
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, fontSize: '1.2rem' }}>
            Vente CRM
          </Typography>
        </Box>
        {isMobile && (
          <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: '#fff' }}>
            <ChevronLeft />
          </IconButton>
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)' }} />

      {/* Navigation */}
      <List sx={{ flex: 1, px: 1.5, py: 1 }}>
        {menuItems.filter(item => hasPermission(item.permission)).map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => { navigate(item.path); if (isMobile) setDrawerOpen(false); }}
            sx={{
              borderRadius: '8px', mb: 0.5, py: 1.2,
              backgroundColor: location.pathname === item.path ? 'rgba(255,255,255,0.15)' : 'transparent',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <ListItemIcon sx={{ color: '#fff', minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text}
              primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: location.pathname === item.path ? 600 : 400 }}
            />
          </ListItem>
        ))}

        {adminItems.filter(item => hasPermission(item.permission)).length > 0 && (
          <>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)', my: 1.5 }} />
            <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', px: 2, py: 0.5, textTransform: 'uppercase', letterSpacing: 1 }}>
              Administration
            </Typography>
            {adminItems.filter(item => hasPermission(item.permission)).map((item) => (
              <ListItem button key={item.text}
                onClick={() => { navigate(item.path); if (isMobile) setDrawerOpen(false); }}
                sx={{
                  borderRadius: '8px', mb: 0.5, py: 1.2,
                  backgroundColor: location.pathname === item.path ? 'rgba(255,255,255,0.15)' : 'transparent',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
                }}
              >
                <ListItemIcon sx={{ color: '#fff', minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.9rem' }} />
              </ListItem>
            ))}
          </>
        )}
      </List>

      {/* User Info */}
      <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>
            {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase()}
          </Avatar>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography sx={{ color: '#fff', fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.email}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>
              {user?.role}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          width: drawerOpen ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, border: 'none' }
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Bar */}
        <AppBar position="sticky" elevation={0} sx={{
          background: '#fff', color: '#2C2C2C',
          borderBottom: '1px solid #E0D8D0',
          boxShadow: 'none'
        }}>
          <Toolbar>
            <IconButton edge="start" onClick={() => setDrawerOpen(!drawerOpen)} sx={{ mr: 2, color: '#7A1B2D' }}>
              <MenuIcon />
            </IconButton>
            <Box sx={{ flex: 1 }} />
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: '#7A1B2D', fontSize: '0.9rem' }}>
                {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase()}
              </Avatar>
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              <MenuItem onClick={() => { setAnchorEl(null); navigate('/profile'); }}>
                <ListItemIcon><Person fontSize="small" /></ListItemIcon>
                Profil
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon><ExitToApp fontSize="small" /></ListItemIcon>
                Abmelden
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Page Content */}
        <Box component="main" sx={{ flex: 1, p: 3, backgroundColor: '#F5F3F0' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
