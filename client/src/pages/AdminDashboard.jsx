import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const [referrals, setReferrals] = useState([]);
  const { logout } = useAuth();

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/referrals', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReferrals(res.data);
    } catch (error) {
      console.error('Error fetching referrals', error);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:5000/api/referrals/${id}/status`, 
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchReferrals();
    } catch (error) {
      console.error('Error updating status', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
        <div className="space-x-4">
            <Link to="/admin/users" className="text-blue-600 hover:underline">Admins</Link>
            <Link to="/admin/clients" className="text-blue-600 hover:underline">Clients</Link>
            <button onClick={logout} className="text-red-600 hover:text-red-800">Logout</button>
        </div>
      </nav>

      <div className="p-8 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Referrals</h2>
        <div className="bg-white rounded shadow overflow-x-auto">
            <table className="min-w-full text-left">
                <thead>
                    <tr className="bg-gray-50 border-b">
                        <th className="p-4">Referrer</th>
                        <th className="p-4">Code</th>
                        <th className="p-4">Reward</th>
                        <th className="p-4">Prospect Info</th>
                        <th className="p-4">Estimates</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {referrals.map(ref => (
                        <tr key={ref.id} className="border-b hover:bg-gray-50">
                            <td className="p-4">
                                <div className="font-bold">{ref.User?.name}</div>
                                <div className="text-sm text-gray-500">{ref.User?.email}</div>
                            </td>
                            <td className="p-4 font-mono">{ref.code}</td>
                            <td className="p-4">{ref.selectedReward}</td>
                            <td className="p-4">
                                {ref.prospectName && <div>{ref.prospectName}</div>}
                                {ref.prospectEmail && <div className="text-sm text-gray-500">{ref.prospectEmail}</div>}
                            </td>
                            <td className="p-4">
                                {ref.Estimates?.length || 0}
                            </td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold 
                                    ${ref.status === 'Open' ? 'bg-green-100 text-green-800' : 
                                      ref.status === 'Closed' ? 'bg-gray-100 text-gray-800' : 
                                      'bg-yellow-100 text-yellow-800'}`}>
                                    {ref.status}
                                </span>
                            </td>
                            <td className="p-4">
                                {ref.status !== 'Closed' && (
                                    <button 
                                        onClick={() => updateStatus(ref.id, 'Closed')}
                                        className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                                    >
                                        Close Reward
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {referrals.length === 0 && <div className="p-8 text-center text-gray-500">No referrals found.</div>}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

