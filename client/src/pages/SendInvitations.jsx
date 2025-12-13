import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const SendInvitations = () => {
  const [clients, setClients] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [searchTerm, setSearchTerm] = useState('');
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
    const filteredClients = getFilteredClients();
    if (e.target.checked) {
      setSelectedClients(filteredClients.map(c => c.id));
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

  const getFilteredClients = () => {
    if (!searchTerm) return clients;
    const term = searchTerm.toLowerCase();
    return clients.filter(client => 
      client.name.toLowerCase().includes(term) ||
      client.email.toLowerCase().includes(term) ||
      (client.phone && client.phone.includes(term))
    );
  };

  const handleSendInvitations = async () => {
    if (selectedClients.length === 0) {
      setMessage('Please select at least one client to send invitations to.');
      setMessageType('error');
      return;
    }

    if (!window.confirm(`Send invitation emails to ${selectedClients.length} client(s)?`)) {
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

      setMessage(`✅ Successfully sent ${res.data.sentCount} invitation(s). ${res.data.failedCount > 0 ? `${res.data.failedCount} failed.` : ''}`);
      setMessageType('success');
      setSelectedClients([]);
    } catch (err) {
      setMessage(`❌ Error: ${err.response?.data?.message || 'Failed to send invitations'}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = getFilteredClients();
  const allFilteredSelected = filteredClients.length > 0 && 
    filteredClients.every(c => selectedClients.includes(c.id));

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
        <div className="space-x-4">
            <Link to="/admin/dashboard" className="text-blue-600 hover:underline">Referrals</Link>
            <Link to="/admin/clients" className="text-blue-600 hover:underline">Clients</Link>
            <span className="font-bold text-gray-800">Send Invitations</span>
            <button onClick={logout} className="text-red-600 hover:text-red-800 ml-4">Logout</button>
        </div>
      </nav>

      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-6 flex items-center gap-2">
            <Link to="/admin/clients" className="text-blue-600 hover:underline">← Back to Clients</Link>
        </div>

        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">Send Reward Program Invitations</h2>
          <p className="text-gray-600">
            Select clients to invite them to participate in our referral reward program.
          </p>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg shadow mb-6 border border-blue-200">
          <div className="flex items-start gap-4">
            <div className="text-4xl">🎁</div>
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800">What happens when you send an invitation?</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>✓ Each client receives a personalized email invitation</li>
                <li>✓ The email includes their name and a direct link to get started</li>
                <li>✓ When they click the link, their information is automatically pre-filled</li>
                <li>✓ They can immediately start generating referral links and earning rewards</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Search and Selection Controls */}
        <div className="bg-white p-4 rounded shadow mb-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full md:w-auto">
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-600">
              {selectedClients.length} of {clients.length} selected
            </span>
            {selectedClients.length > 0 && (
              <button
                onClick={() => setSelectedClients([])}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Clients Table */}
        <div className="bg-white rounded shadow overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="p-4">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll}
                      checked={allFilteredSelected}
                      disabled={filteredClients.length === 0}
                    />
                  </th>
                  <th className="p-4 font-semibold">Name</th>
                  <th className="p-4 font-semibold">Email</th>
                  <th className="p-4 font-semibold">Phone</th>
                  <th className="p-4 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map(client => (
                  <tr 
                    key={client.id} 
                    className={`border-b hover:bg-gray-50 transition ${
                      selectedClients.includes(client.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="p-4">
                      <input 
                        type="checkbox" 
                        checked={selectedClients.includes(client.id)}
                        onChange={() => handleSelectOne(client.id)}
                      />
                    </td>
                    <td className="p-4 font-medium">{client.name}</td>
                    <td className="p-4 text-gray-600">{client.email}</td>
                    <td className="p-4 text-gray-600">{client.phone || '-'}</td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(client.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredClients.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                {searchTerm ? 'No clients found matching your search.' : 'No clients found.'}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <button
            onClick={() => {
              setSelectedClients([]);
              setSearchTerm('');
            }}
            disabled={selectedClients.length === 0 || loading}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Reset
          </button>
          <button
            onClick={handleSendInvitations}
            disabled={selectedClients.length === 0 || loading}
            className={`px-8 py-3 rounded-lg text-white font-semibold shadow-lg transition ${
              selectedClients.length === 0 || loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl transform hover:-translate-y-0.5'
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                Sending Invitations...
              </span>
            ) : (
              `📧 Send ${selectedClients.length} Invitation${selectedClients.length !== 1 ? 's' : ''}`
            )}
          </button>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mt-6 p-4 rounded-lg border ${
            messageType === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-xl">{messageType === 'success' ? '✅' : '❌'}</span>
              <span>{message}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SendInvitations;

