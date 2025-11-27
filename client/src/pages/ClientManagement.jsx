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
  const { logout } = useAuth();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/users?role=client', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClients(res.data);
    } catch (error) {
      console.error('Error fetching clients', error);
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
      await axios.post('http://localhost:5000/api/users', payload, {
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
      await axios.delete(`http://localhost:5000/api/users/${id}`, {
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

