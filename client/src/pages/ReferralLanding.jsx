import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const ReferralLanding = () => {
  const { code } = useParams();
  const [valid, setValid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    description: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkCode = async () => {
      try {
        await axios.get(`http://localhost:5000/api/referrals/code/${code}`);
        setValid(true);
      } catch (err) {
        setValid(false);
      } finally {
        setLoading(false);
      }
    };
    checkCode();
  }, [code]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/estimates', {
        referralCode: code,
        ...formData
      });
      setSubmitted(true);
    } catch (err) {
      setError('Failed to submit estimate. Please try again.');
    }
  };

  if (loading) return <div className="text-center p-10">Loading...</div>;
  if (valid === false) return <div className="text-center p-10 text-red-600 text-xl">Invalid or expired referral link.</div>;

  if (submitted) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white p-8 rounded shadow text-center max-w-md">
                <h2 className="text-2xl font-bold text-green-600 mb-4">Request Submitted!</h2>
                <p>Thank you! We will contact you shortly for your estimate.</p>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow">
        <h1 className="text-3xl font-bold mb-2 text-center">Request an Estimate</h1>
        <p className="text-center text-gray-600 mb-8">Fill out the form below to get started.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-gray-700">Full Name</label>
                <input 
                    type="text" name="name" required
                    className="w-full border p-2 rounded"
                    value={formData.name} onChange={handleChange}
                />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-gray-700">Email</label>
                    <input 
                        type="email" name="email" required
                        className="w-full border p-2 rounded"
                        value={formData.email} onChange={handleChange}
                    />
                </div>
                <div>
                    <label className="block text-gray-700">Phone</label>
                    <input 
                        type="tel" name="phone" required
                        className="w-full border p-2 rounded"
                        value={formData.phone} onChange={handleChange}
                    />
                </div>
            </div>

            <div>
                <label className="block text-gray-700">Address</label>
                <input 
                    type="text" name="address" required
                    className="w-full border p-2 rounded"
                    value={formData.address} onChange={handleChange}
                />
            </div>

            <div>
                <label className="block text-gray-700">City</label>
                <input 
                    type="text" name="city"
                    className="w-full border p-2 rounded"
                    value={formData.city} onChange={handleChange}
                />
            </div>

            <div>
                <label className="block text-gray-700">Description</label>
                <textarea 
                    name="description" rows="4"
                    className="w-full border p-2 rounded"
                    value={formData.description} onChange={handleChange}
                ></textarea>
            </div>

            {error && <p className="text-red-500">{error}</p>}

            <button 
                type="submit" 
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700"
            >
                Submit
            </button>
        </form>
      </div>
    </div>
  );
};

export default ReferralLanding;

