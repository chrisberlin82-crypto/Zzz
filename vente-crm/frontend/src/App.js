import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuth } from './context/AuthContext';
import Layout from './components/common/Layout';

// Lazy Loading fuer alle Seiten
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const CustomerDetailPage = lazy(() => import('./pages/CustomerDetailPage'));
const ContractsPage = lazy(() => import('./pages/ContractsPage'));
const ContractDetailPage = lazy(() => import('./pages/ContractDetailPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'));
const AddressListsPage = lazy(() => import('./pages/AddressListsPage'));
const MapPage = lazy(() => import('./pages/MapPage'));
const SignaturePage = lazy(() => import('./pages/SignaturePage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const TeamMapPage = lazy(() => import('./pages/TeamMapPage'));

const Loading = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <CircularProgress sx={{ color: '#7A1B2D' }} />
  </Box>
);

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Loading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

const App = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <Loading />;

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Oeffentliche Routen */}
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
        } />
        <Route path="/register" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />
        } />

        {/* Geschuetzte Routen */}
        <Route path="/" element={
          <ProtectedRoute><Layout /></ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/:id" element={<CustomerDetailPage />} />
          <Route path="contracts" element={<ContractsPage />} />
          <Route path="contracts/:id" element={<ContractDetailPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="address-lists" element={<AddressListsPage />} />
          <Route path="address-lists/:id/map" element={<MapPage />} />
          <Route path="contracts/:id/signature" element={<SignaturePage />} />
          <Route path="team-map" element={<TeamMapPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;
