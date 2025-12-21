import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const EstimateDetail = () => {
  const { id } = useParams();
  const { logout } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEstimate = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/estimates/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load estimate');
      } finally {
        setLoading(false);
      }
    };
    fetchEstimate();
  }, [id]);

  const renderCustomFields = (customFields = {}, fieldConfig = []) => {
    if (!fieldConfig.length) {
      return (
        <div className="text-sm text-gray-600">
          {Object.keys(customFields).length === 0 ? 'No custom fields' : JSON.stringify(customFields, null, 2)}
        </div>
      );
    }
    return fieldConfig.map((field) => {
      const value = customFields[field.id];
      let display = value;
      if (field.type === 'checkbox') {
        display = value ? 'Yes' : 'No';
      }
      return (
        <div key={field.id} className="flex justify-between py-2 border-b border-gray-100 text-sm">
          <span className="font-medium text-gray-700">{field.label}</span>
          <span className="text-gray-800 text-right">{display !== undefined && display !== null && display !== '' ? `${display}` : '-'}</span>
        </div>
      );
    });
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!data) return null;

  const { estimate, fieldConfig } = data;
  const referral = estimate.Referral;
  const referrer = referral?.User;

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link to="/admin/dashboard" className="text-blue-600 hover:underline">← Back to Dashboard</Link>
          <h1 className="text-xl font-bold">Estimate Details</h1>
        </div>
        <button onClick={logout} className="text-red-600 hover:text-red-800">Logout</button>
      </nav>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded shadow p-6 space-y-2">
          <h2 className="text-lg font-bold">Estimate</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-800">
            <div><span className="font-medium">Name:</span> {estimate.name}</div>
            <div><span className="font-medium">Email:</span> {estimate.email}</div>
            <div><span className="font-medium">Phone:</span> {estimate.phone}</div>
            <div><span className="font-medium">Address:</span> {estimate.address}</div>
            <div><span className="font-medium">City:</span> {estimate.city || '-'}</div>
            <div><span className="font-medium">Status:</span> {estimate.status}</div>
            <div><span className="font-medium">Created:</span> {new Date(estimate.createdAt).toLocaleString()}</div>
          </div>
          <div className="text-sm text-gray-800">
            <span className="font-medium">Description:</span> {estimate.description || '-'}
          </div>
        </div>

        <div className="bg-white rounded shadow p-6 space-y-2">
          <h2 className="text-lg font-bold">Referral</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-800">
            <div><span className="font-medium">Code:</span> {referral?.code}</div>
            <div><span className="font-medium">Reward:</span> {referral?.selectedReward || '-'}</div>
            <div><span className="font-medium">Prospect:</span> {referral?.prospectName || '-'} {referral?.prospectEmail ? `(${referral.prospectEmail})` : ''}</div>
            <div><span className="font-medium">Status:</span> {referral?.status}</div>
            {referrer && (
              <>
                <div><span className="font-medium">Referrer:</span> {referrer.name}</div>
                <div><span className="font-medium">Referrer Email:</span> {referrer.email}</div>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded shadow p-6 space-y-3">
          <h2 className="text-lg font-bold">Custom Fields</h2>
          {renderCustomFields(estimate.customFields || {}, fieldConfig || [])}
        </div>
      </div>
    </div>
  );
};

export default EstimateDetail;

