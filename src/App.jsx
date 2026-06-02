import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import PaymentDetails from './pages/PaymentDetails';
import Settings from './pages/Settings';
import Scan from './pages/Scan';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuthStore } from './store/authStore';
import { initializeStorage } from './utils/storageManager';

function PermissionRoute({ permKey, adminOnly, children }) {
  const user = useAuthStore(state => state.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN') return children;
  if (adminOnly) return <Navigate to="/" replace />;
  if (!(user.permissions || {})[permKey]) return <Navigate to="/" replace />;
  return children;
}

function App() {
  useEffect(() => {
    initializeStorage();
  }, []);

  return (
    <div className="gradient-bg min-h-screen">
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="add-case" element={<PermissionRoute permKey="payments"><PaymentDetails /></PermissionRoute>} />
            <Route path="scan" element={<PermissionRoute permKey="scan"><Scan /></PermissionRoute>} />
            <Route path="settings" element={<PermissionRoute adminOnly><Settings /></PermissionRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;