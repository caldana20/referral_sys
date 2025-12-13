import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const [referrals, setReferrals] = useState([]);
  const [filteredReferrals, setFilteredReferrals] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  
  // Rewards management state
  const [rewards, setRewards] = useState([]);
  const [newReward, setNewReward] = useState('');
  const [rewardError, setRewardError] = useState('');

  const { logout } = useAuth();

  useEffect(() => {
    fetchReferrals();
    fetchRewards();
  }, []);

  useEffect(() => {
    applyFilterAndSort();
  }, [referrals, filterStatus, sortConfig]);

  const fetchReferrals = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/referrals', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReferrals(Array.isArray(res.data) ? res.data : []);
      setSelectedIds([]); 
    } catch (error) {
      console.error('Error fetching referrals', error);
      setReferrals([]);
    }
  };

  const fetchRewards = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/rewards', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRewards(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching rewards', error);
      setRewards([]);
    }
  };

  const addReward = async (e) => {
    e.preventDefault();
    if (!newReward.trim()) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/rewards', { name: newReward }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewReward('');
      fetchRewards();
    } catch (error) {
      setRewardError('Failed to add reward');
    }
  };

  const toggleReward = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/rewards/${id}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRewards();
    } catch (error) {
      console.error('Error toggling reward', error);
    }
  };

  const deleteReward = async (id) => {
    if (!window.confirm('Delete this reward option?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/rewards/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRewards();
    } catch (error) {
      console.error('Error deleting reward', error);
    }
  };

  const applyFilterAndSort = () => {
    let updatedList = [...referrals];

    // Filter by Status
    if (filterStatus !== 'All') {
      updatedList = updatedList.filter(ref => ref.status === filterStatus);
    }

    // Sort
    updatedList.sort((a, b) => {
      let aValue = getSortValue(a, sortConfig.key);
      let bValue = getSortValue(b, sortConfig.key);

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredReferrals(updatedList);
  };

  const getSortValue = (item, key) => {
    if (key === 'referrer') return item.User?.name || '';
    if (key === 'estimateDate') return item.Estimates?.[0]?.createdAt || '';
    if (key === 'estimates') return item.Estimates?.length || 0;
    return item[key] || '';
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredReferrals.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} referrals?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/referrals/bulk-delete', 
        { ids: selectedIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchReferrals();
    } catch (error) {
      console.error('Error deleting referrals', error);
      alert('Failed to delete referrals');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/referrals/${id}/status`, 
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
            <Link to="/admin/send-invitations" className="text-purple-600 hover:underline">Send Invitations</Link>
            <button onClick={logout} className="text-red-600 hover:text-red-800">Logout</button>
        </div>
      </nav>

      <div className="p-8 max-w-6xl mx-auto space-y-8">
        
        {/* Rewards Management Section */}
        <div className="bg-white p-6 rounded shadow">
            <h2 className="text-xl font-bold mb-4">Manage Reward Options</h2>
            <div className="flex gap-4 mb-4">
                <form onSubmit={addReward} className="flex gap-2 w-full md:w-1/2">
                    <input 
                        type="text" 
                        placeholder="New Reward Name (e.g., '10% Off')" 
                        className="border p-2 rounded flex-grow"
                        value={newReward}
                        onChange={(e) => setNewReward(e.target.value)}
                    />
                    <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Add</button>
                </form>
            </div>
            {rewardError && <p className="text-red-500 mb-2">{rewardError}</p>}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {rewards.map(reward => (
                    <div key={reward.id} className={`border p-3 rounded flex justify-between items-center ${!reward.active ? 'bg-gray-100 opacity-75' : 'bg-white'}`}>
                        <span className="font-medium">{reward.name}</span>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => toggleReward(reward.id)}
                                className={`text-xs px-2 py-1 rounded ${reward.active ? 'bg-blue-100 text-blue-800' : 'bg-gray-300 text-gray-600'}`}
                            >
                                {reward.active ? 'Active' : 'Inactive'}
                            </button>
                            <button 
                                onClick={() => deleteReward(reward.id)}
                                className="text-red-600 hover:text-red-800 text-xs"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
                {rewards.length === 0 && <p className="text-gray-500 italic">No rewards configured.</p>}
            </div>
        </div>

        {/* Referrals Section */}
        <div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold">Referrals</h2>
                <div className="flex gap-2">
                    <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="border p-2 rounded shadow-sm"
                    >
                        <option value="All">All Statuses</option>
                        <option value="Open">Open</option>
                        <option value="Used">Used</option>
                        <option value="Closed">Closed</option>
                        <option value="Wait">Wait</option>
                        <option value="Expired">Expired</option>
                    </select>
                    {selectedIds.length > 0 && (
                        <button 
                            onClick={handleBulkDelete}
                            className="bg-red-600 text-white px-4 py-2 rounded shadow hover:bg-red-700"
                        >
                            Delete Selected ({selectedIds.length})
                        </button>
                    )}
                </div>
            </div>
            <div className="bg-white rounded shadow overflow-x-auto">
                <table className="min-w-full text-left">
                    <thead>
                        <tr className="bg-gray-50 border-b">
                            <th className="p-4">
                                <input 
                                    type="checkbox" 
                                    onChange={handleSelectAll}
                                    checked={filteredReferrals.length > 0 && selectedIds.length === filteredReferrals.length}
                                />
                            </th>
                            <th className="p-4 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('createdAt')}>
                                Created Date {sortConfig.key === 'createdAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className="p-4 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('referrer')}>
                                Referrer {sortConfig.key === 'referrer' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className="p-4">Code</th>
                            <th className="p-4">Reward</th>
                            <th className="p-4">Prospect Info</th>
                            <th className="p-4 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('estimates')}>
                                Estimates {sortConfig.key === 'estimates' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className="p-4 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('estimateDate')}>
                                Estimate Date {sortConfig.key === 'estimateDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className="p-4 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                                Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className="p-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredReferrals.map(ref => (
                            <tr key={ref.id} className="border-b hover:bg-gray-50">
                                <td className="p-4">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedIds.includes(ref.id)}
                                        onChange={() => handleSelectOne(ref.id)}
                                    />
                                </td>
                                <td className="p-4 text-sm text-gray-600">
                                    {ref.createdAt ? new Date(ref.createdAt).toLocaleDateString() : '-'}
                                    <div className="text-xs text-gray-400 mt-1">
                                        {ref.createdAt ? new Date(ref.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </div>
                                </td>
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
                                <td className="p-4 text-sm text-gray-500">
                                    {ref.Estimates && ref.Estimates.length > 0 ? 
                                        new Date(ref.Estimates[0].createdAt).toLocaleDateString() : 
                                        '-'}
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
                {filteredReferrals.length === 0 && <div className="p-8 text-center text-gray-500">No referrals found.</div>}
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
