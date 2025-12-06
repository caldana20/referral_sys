import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const BulkEmail = () => {
  const [clients, setClients] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
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

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedClients(clients.map(c => c.id));
    } else {
      setSelectedClients([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedClients.includes(id)) {
      setSelectedClients(selectedClients.filter(sid => sid !== id));
    } else {
      setSelectedClients([...selectedClients, id]);
    }
  };

  const handleSendEmails = async () => {
    if (selectedClients.length === 0) {
      setMessage('Please select at least one client to send emails to.');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        '/api/users/bulk-email',
        { clientIds: selectedClients },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage(`✅ Successfully sent emails to ${res.data.sentCount} client(s). ${res.data.failedCount > 0 ? `${res.data.failedCount} failed.` : ''}`);
      setMessageType('success');
      setSelectedClients([]);
    } catch (err) {
      setMessage(`❌ Error: ${err.response?.data?.message || 'Failed to send emails'}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
        <div className="space-x-4">
            <Link to="/admin/dashboard" className="text-blue-600 hover:underline">Referrals</Link>
            <Link to="/admin/clients" className="text-blue-600 hover:underline">Clients</Link>
            <span className="font-bold text-gray-800">Bulk Email</span>
            <button onClick={logout} className="text-red-600 hover:text-red-800 ml-4">Logout</button>
        </div>
      </nav>

      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-6 flex items-center gap-2">
            <Link to="/admin/clients" className="text-blue-600 hover:underline">← Back to Clients</Link>
        </div>

        <h2 className="text-2xl font-bold mb-6">Send Reward Program Email</h2>
        
        <div className="bg-white p-6 rounded shadow mb-6">
            <h3 className="text-lg font-semibold mb-4">About This Email</h3>
            <p className="text-gray-600 mb-4">
                Send an email to selected clients informing them about our referral reward program. 
                The email will include a link to generate their referral links.
            </p>
            <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-500">
                <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Each client will receive a personalized email with their name and a direct link to start earning rewards.
                </p>
            </div>
        </div>

        <div className="bg-white rounded shadow overflow-x-auto mb-6">
            <div className="p-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold">Select Clients</h3>
                <div className="text-sm text-gray-600">
                    {selectedClients.length} of {clients.length} selected
                </div>
            </div>
            <table className="min-w-full text-left">
                <thead>
                    <tr className="bg-gray-50 border-b">
                        <th className="p-4">
                            <input 
                                type="checkbox" 
                                onChange={handleSelectAll}
                                checked={clients.length > 0 && selectedClients.length === clients.length}
                            />
                        </th>
                        <th className="p-4">Name</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Phone</th>
                    </tr>
                </thead>
                <tbody>
                    {clients.map(client => (
                        <tr key={client.id} className="border-b hover:bg-gray-50">
                            <td className="p-4">
                                <input 
                                    type="checkbox" 
                                    checked={selectedClients.includes(client.id)}
                                    onChange={() => handleSelectOne(client.id)}
                                />
                            </td>
                            <td className="p-4">{client.name}</td>
                            <td className="p-4">{client.email}</td>
                            <td className="p-4">{client.phone || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {clients.length === 0 && <div className="p-8 text-center text-gray-500">No clients found.</div>}
        </div>

        <div className="flex justify-end gap-4">
            <button
                onClick={() => setSelectedClients([])}
                disabled={selectedClients.length === 0 || loading}
                className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Clear Selection
            </button>
            <button
                onClick={handleSendEmails}
                disabled={selectedClients.length === 0 || loading}
                className={`px-6 py-2 rounded text-white font-medium shadow ${
                    selectedClients.length === 0 || loading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
                }`}
            >
                {loading ? 'Sending...' : `Send Emails (${selectedClients.length})`}
            </button>
        </div>

        {message && (
            <div className={`mt-6 p-4 rounded-lg ${
                messageType === 'success' 
                    ? 'bg-green-50 border border-green-200 text-green-700' 
                    : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
                {message}
            </div>
        )}
      </div>
    </div>
  );
};

export default BulkEmail;

