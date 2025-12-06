import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const ReferralLanding = () => {
  const { code } = useParams();
  const [valid, setValid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [used, setUsed] = useState(false);
  const [referralData, setReferralData] = useState(null);
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
        const res = await axios.get(`/api/referrals/code/${code}`);
        setValid(true);
        setReferralData(res.data);
        if (res.data.used) {
          setUsed(true);
        }
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
      await axios.post('/api/estimates', {
        referralCode: code,
        ...formData
      });
      setSubmitted(true);
    } catch (err) {
      if (err.response && err.response.status === 400 && err.response.data.message === 'This referral link has already been used') {
        setUsed(true);
      }
      setError(err.response?.data?.message || 'Failed to submit estimate. Please try again.');
    }
  };

  if (loading) return <div className="text-center p-10">Loading...</div>;
  if (valid === false) return <div className="text-center p-10 text-red-600 text-xl">Invalid or expired referral link.</div>;

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col">
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="max-w-4xl w-full flex flex-col md:flex-row bg-white rounded-2xl shadow-xl overflow-hidden">
          
          {/* Left Side: Branding / Image Area */}
          <div className="md:w-1/2 bg-brand-500 p-10 text-white flex flex-col justify-center">
            <h2 className="text-4xl font-bold mb-4">Your friend sent you an angel's touch</h2>
            <p className="text-brand-100 text-lg mb-8">
              Claim your special offer and get a sparkling clean home.
            </p>
            {/* Reward Information Removed */}
          </div>

          {/* Right Side: Form or Status Messages */}
          <div className="md:w-1/2 p-10 bg-white">
            
            {used ? (
                <div className="text-center space-y-6 py-8">
                    <h2 className="text-2xl font-bold text-red-600">Link Used</h2>
                    <p className="text-gray-600">This referral link has already been used to request an estimate.</p>
                </div>
            ) : submitted ? (
                <div className="text-center space-y-6 py-8">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl">
                      ✓
                    </div>
                    <h2 className="text-2xl font-bold text-green-600">Request Submitted!</h2>
                    <p className="text-gray-600">Thank you! We will contact you shortly for your estimate.</p>
                </div>
            ) : (
                <>
                    <h1 className="text-2xl font-bold text-gray-800 mb-6">Request an Estimate</h1>
                    <p className="text-gray-600 mb-6">Fill out the form below to get started.</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input 
                                type="text" name="name" required
                                className="w-full border-gray-300 bg-gray-50 border p-3 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                                value={formData.name} onChange={handleChange}
                            />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input 
                                    type="email" name="email" required
                                    className="w-full border-gray-300 bg-gray-50 border p-3 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                                    value={formData.email} onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input 
                                    type="tel" name="phone" required
                                    className="w-full border-gray-300 bg-gray-50 border p-3 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                                    value={formData.phone} onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                            <input 
                                type="text" name="address" required
                                className="w-full border-gray-300 bg-gray-50 border p-3 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                                value={formData.address} onChange={handleChange}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                            <input 
                                type="text" name="city"
                                className="w-full border-gray-300 bg-gray-50 border p-3 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                                value={formData.city} onChange={handleChange}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea 
                                name="description" rows="4"
                                className="w-full border-gray-300 bg-gray-50 border p-3 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                                value={formData.description} onChange={handleChange}
                            ></textarea>
                        </div>

                        {error && <p className="text-red-500 text-sm">{error}</p>}

                        <button 
                            type="submit" 
                            className="w-full bg-brand-600 text-white py-3 rounded-lg font-bold hover:bg-brand-700 transition shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                        >
                            Submit Request
                        </button>
                    </form>
                </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReferralLanding;

