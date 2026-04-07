import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import POS from './pages/POS';
import Finance from './pages/Finance';
import Users from './pages/Users';
import Master from './pages/Master';
import { NotificationProvider } from './components/NotificationContext';

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles?: string[] }) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="pos" element={<POS />} />
            <Route path="finance" element={<Finance />} />
            <Route path="users" element={
              <ProtectedRoute roles={['admin']}>
                <Users />
              </ProtectedRoute>
            } />
            <Route path="master" element={
              <ProtectedRoute roles={['admin']}>
                <Master />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </NotificationProvider>
    </BrowserRouter>
  );
}
