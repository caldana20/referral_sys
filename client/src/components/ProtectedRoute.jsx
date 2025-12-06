import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();

  // If still loading auth state, show nothing or spinner
  if (loading) {
    return <div>Loading...</div>;
  }

  // If not logged in, redirect to login
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  // If role required and user doesn't match, redirect home
  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;

