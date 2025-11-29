import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const ClientManagement = () => {
  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [error, setError] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [importMsg, setImportMsg] = useState('');

  const { logout } = useAuth();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/users?role=client', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClients(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching clients', error);
      setClients([]);
    }
  };

  const handleFileChange = (e) => {
    setImportFile(e.target.files[0]);
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importFile) return;

    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/users/import', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setImportMsg(`Successfully imported ${res.data.importedCount} clients. Skipped/Error: ${res.data.errors.length}`);
      setImportFile(null);
      // Reset file input manually if needed, but simple state reset is fine for now
      fetchClients();
    } catch (err) {
      setImportMsg(err.response?.data?.message || 'Error importing file');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        email: formData.email.toLowerCase(),
        role: 'client'
      };
      await axios.post('/api/users', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFormData({ name: '', email: '', phone: '' });
      fetchClients();
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating client');
    }
  };

  const deleteClient = async (id) => {
    if (!window.confirm('Are you sure? This will delete their referrals too.')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchClients();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting client');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
        <div className="space-x-4">
            <Link to="/admin/dashboard" className="text-blue-600 hover:underline">Referrals</Link>
            <Link to="/admin/users" className="text-blue-600 hover:underline">Admins</Link>
            <span className="font-bold text-gray-800">Clients</span>
            <button onClick={logout} className="text-red-600 hover:text-red-800 ml-4">Logout</button>
        </div>
      </nav>

      <div className="p-8 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Client Management</h2>
        
        <div className="bg-white p-6 rounded shadow mb-8">
            <h3 className="text-lg font-semibold mb-4">Add New Client</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input type="text" name="name" placeholder="Full Name" required className="border p-2 rounded" value={formData.name} onChange={handleChange} />
                <input type="email" name="email" placeholder="Email Address" required className="border p-2 rounded" value={formData.email} onChange={handleChange} />
                <input type="text" name="phone" placeholder="Phone Number" className="border p-2 rounded" value={formData.phone} onChange={handleChange} />
                <button type="submit" className="bg-green-600 text-white p-2 rounded hover:bg-green-700 col-span-1 md:col-span-3">Add Client</button>
            </form>
            {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>

        <div className="bg-white p-6 rounded shadow mb-8 border-l-4 border-blue-500">
            <h3 className="text-lg font-semibold mb-4">Bulk Import Clients (CSV)</h3>
            <p className="text-sm text-gray-600 mb-4">Upload a CSV file with headers: <strong>Name, Email, Phone</strong></p>
            <form onSubmit={handleImport} className="flex flex-col md:flex-row gap-4 items-center">
                <input 
                    type="file" 
                    accept=".csv"
                    onChange={handleFileChange}
                    className="border p-2 rounded w-full md:w-auto"
                />
                <button 
                    type="submit" 
                    disabled={!importFile}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    Upload CSV
                </button>
            </form>
            {importMsg && (
                <div className={`mt-3 p-2 rounded text-sm ${importMsg.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {importMsg}
                </div>
            )}
        </div>

        <div className="bg-white rounded shadow overflow-x-auto">
            <table className="min-w-full text-left">
                <thead>
                    <tr className="bg-gray-50 border-b">
                        <th className="p-4">Name</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Phone</th>
                        <th className="p-4">Joined</th>
                        <th className="p-4">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {clients.map(client => (
                        <tr key={client.id} className="border-b hover:bg-gray-50">
                            <td className="p-4">{client.name}</td>
                            <td className="p-4">{client.email}</td>
                            <td className="p-4">{client.phone || '-'}</td>
                            <td className="p-4 text-sm text-gray-500">{new Date(client.createdAt).toLocaleDateString()}</td>
                            <td className="p-4">
                                <button onClick={() => deleteClient(client.id)} className="text-red-600 hover:text-red-800">Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {clients.length === 0 && <div className="p-8 text-center text-gray-500">No clients found.</div>}
        </div>
      </div>
    </div>
  );
};

export default ClientManagement;

