import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TenantSettings = () => {
  const { logout } = useAuth();
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/tenants/settings', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setName(res.data.name || '');
        setLogoUrl(res.data.logoUrl || '');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      if (name) formData.append('name', name);
      if (logoFile) formData.append('logo', logoFile);

      const res = await axios.patch('/api/tenants/settings', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setMessage('Settings updated');
      setLogoUrl(res.data.logoUrl || '');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link to="/admin/dashboard" className="text-blue-600 hover:underline">← Back to Dashboard</Link>
          <h1 className="text-xl font-bold">Tenant Settings</h1>
        </div>
        <button onClick={logout} className="text-red-600 hover:text-red-800">Logout</button>
      </nav>

      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-white rounded shadow p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                className="w-full border p-3 rounded"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Company Logo</label>
              {logoUrl && (
                <div className="mb-2">
                  <img src={logoUrl} alt="Company logo" className="h-20 object-contain border rounded bg-white" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-gray-500">Max 5 MB. JPG/PNG recommended.</p>
            </div>

            {message && <div className="text-green-600 text-sm">{message}</div>}
            {error && <div className="text-red-600 text-sm">{error}</div>}

            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TenantSettings;

