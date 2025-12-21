import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

const AdminLogin = () => {
  const [tenantSlug, setTenantSlug] = useState('');
  const [tenants, setTenants] = useState([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const presetTenant = searchParams.get('tenant') || '';
    if (presetTenant) {
      setTenantSlug(presetTenant);
    }

    const fetchTenants = async () => {
      try {
        const res = await axios.get('/api/tenants/list-public');
        setTenants(Array.isArray(res.data) ? res.data : []);
        // If preset tenant exists and matches list, keep it
        if (presetTenant) {
          const match = res.data.find((t) => t.slug === presetTenant);
          if (!match) {
            setError('Preset tenant not found. Please select a tenant.');
            setTenantSlug('');
          }
        }
      } catch (err) {
        console.error('Failed to load tenants', err);
      } finally {
        setLoadingTenants(false);
      }
    };
    fetchTenants();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(email, password, tenantSlug);
    if (result.success) {
      navigate('/admin/dashboard');
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Admin Login</h2>
        {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-4">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Tenant</label>
            {loadingTenants ? (
              <div className="text-sm text-gray-500">Loading tenants...</div>
            ) : (
              <select
                className="w-full p-2 border rounded"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                required
              >
                <option value="">Select tenant</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.slug}>{t.name} ({t.slug})</option>
                ))}
              </select>
            )}
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Email</label>
            <input
              type="email"
              className="w-full p-2 border rounded"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Password</label>
            <input
              type="password"
              className="w-full p-2 border rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;

