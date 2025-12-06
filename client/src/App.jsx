import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLogin from './pages/AdminLogin';

import CustomerDashboard from './pages/CustomerDashboard';

import ReferralLanding from './pages/ReferralLanding';

import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import ClientManagement from './pages/ClientManagement';
import BulkUpload from './pages/BulkUpload';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<CustomerDashboard />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/referral/:code" element={<ReferralLanding />} />

          {/* Protected Admin Routes */}
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/users" 
            element={
              <ProtectedRoute role="admin">
                <UserManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/clients" 
            element={
              <ProtectedRoute role="admin">
                <ClientManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/bulk-upload" 
            element={
              <ProtectedRoute role="admin">
                <BulkUpload />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
