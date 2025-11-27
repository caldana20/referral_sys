import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin', // Locked to admin
    phone: ''
  });
  const [error, setError] = useState('');
  const { logout } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      // Only fetch admins
      const res = await axios.get('http://localhost:5000/api/users?role=admin', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (error) {
      console.error('Error fetching users', error);
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
      await axios.post('http://localhost:5000/api/users', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFormData({ name: '', email: '', password: '', role: 'admin', phone: '' });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating user');
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting user');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
        <div className="space-x-4">
             <Link to="/admin/dashboard" className="text-blue-600 hover:underline">Referrals</Link>
             <span className="font-bold text-gray-800">Admins</span>
             <Link to="/admin/clients" className="text-blue-600 hover:underline">Clients</Link>
            <button onClick={logout} className="text-red-600 hover:text-red-800 ml-4">Logout</button>
        </div>
      </nav>

      <div className="p-8 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Admin Management</h2>
        
        <div className="bg-white p-6 rounded shadow mb-8">
            <h3 className="text-lg font-semibold mb-4">Add New Admin</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="name" placeholder="Name" required className="border p-2 rounded" value={formData.name} onChange={handleChange} />
                <input type="email" name="email" placeholder="Email" required className="border p-2 rounded" value={formData.email} onChange={handleChange} />
                <input type="password" name="password" placeholder="Password" required className="border p-2 rounded" value={formData.password} onChange={handleChange} />
                <input type="text" name="phone" placeholder="Phone" className="border p-2 rounded" value={formData.phone} onChange={handleChange} />
                <button type="submit" className="bg-purple-600 text-white p-2 rounded hover:bg-purple-700 col-span-1 md:col-span-2">Create Admin</button>
            </form>
            {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>

        <div className="bg-white rounded shadow overflow-x-auto">
            <table className="min-w-full text-left">
                <thead>
                    <tr className="bg-gray-50 border-b">
                        <th className="p-4">Name</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.id} className="border-b hover:bg-gray-50">
                            <td className="p-4">{user.name}</td>
                            <td className="p-4">{user.email}</td>
                            <td className="p-4">
                                <button onClick={() => deleteUser(user.id)} className="text-red-600 hover:text-red-800">Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
