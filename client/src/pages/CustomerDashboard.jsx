import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

const CustomerDashboard = () => {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [rewards, setRewards] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    prospectName: '',
    prospectEmail: '',
    selectedReward: ''
  });
  const [generatedLink, setGeneratedLink] = useState('');
  const [error, setError] = useState('');
  const [isLoadingClientInfo, setIsLoadingClientInfo] = useState(false);

  useEffect(() => {
    const fetchRewards = async () => {
      try {
        const res = await axios.get('/api/rewards/active');
        const rewardsData = Array.isArray(res.data) ? res.data : [];
        setRewards(rewardsData);
        if (rewardsData.length > 0) {
          setFormData(prev => ({ ...prev, selectedReward: rewardsData[0].name }));
        }
      } catch (err) {
        console.error('Failed to fetch rewards', err);
        // Fallback defaults if API fails
        setRewards([
            { id: 1, name: 'Service Discount' },
            { id: 2, name: 'Free Laundry' },
            { id: 3, name: 'Pest Treatment' }
        ]);
        setFormData(prev => ({ ...prev, selectedReward: 'Service Discount' }));
      }
    };
    fetchRewards();
  }, []);

  // Check for token in URL and pre-fill form
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setIsLoadingClientInfo(true);
      axios.get(`/api/users/validate-client-token?token=${token}`)
        .then(res => {
          const { name, email } = res.data;
          setFormData(prev => ({
            ...prev,
            name: name || prev.name,
            email: email || prev.email
          }));
          setIsLoadingClientInfo(false);
        })
        .catch(err => {
          console.error('Failed to validate token:', err);
          if (err.response?.status === 401) {
            setError('This link has expired. Please contact support for a new link.');
          } else {
            setError('Unable to pre-fill form. You can still enter your information manually.');
          }
          setIsLoadingClientInfo(false);
        });
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const payload = {
        ...formData,
        email: formData.email.toLowerCase()
      };
      const res = await axios.post('/api/referrals', payload);
      const { code } = res.data;
      setGeneratedLink(`${window.location.origin}/referral/${code}`);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Error generating link');
    }
  };

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col">
      {/* Header / Navbar removed */}
      
      {/* Hero Section */}
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="max-w-4xl w-full flex flex-col md:flex-row bg-white rounded-2xl shadow-xl overflow-hidden">
          
          {/* Left Side: Branding / Image Area */}
          <div className="md:w-1/2 bg-brand-500 p-10 text-white flex flex-col justify-center">
            <h2 className="text-4xl font-bold mb-4">Give your home an angel's touch</h2>
            <p className="text-brand-100 text-lg mb-8">
              Share the joy of a clean home. Refer a friend and earn rewards for your next service.
            </p>
            <div className="mt-auto">
              <p className="text-sm font-semibold uppercase tracking-wider opacity-75">Rewards Include</p>
              <ul className="mt-2 space-y-1 text-brand-50">
                {rewards.length > 0 ? (
                    rewards.slice(0, 3).map(r => <li key={r.id}>✨ {r.name}</li>)
                ) : (
                    <li>✨ Service Discounts</li>
                )}
              </ul>
            </div>
          </div>

          {/* Right Side: Form */}
          <div className="md:w-1/2 p-10 bg-white">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Generate Referral Link</h1>
            
            {isLoadingClientInfo && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">Loading your information...</p>
              </div>
            )}
            
            {step === 1 && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Your Full Name</label>
                        <input 
                            type="text" name="name" required
                            className="w-full border-gray-300 bg-gray-50 border p-3 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                            placeholder="John Doe"
                            value={formData.name} onChange={handleChange}
                            disabled={isLoadingClientInfo}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Your Email</label>
                        <input 
                            type="email" name="email" required
                            className="w-full border-gray-300 bg-gray-50 border p-3 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                            placeholder="client@example.com"
                            value={formData.email} onChange={handleChange}
                            disabled={isLoadingClientInfo}
                        />
                        <p className="text-xs text-gray-500 mt-1">Must be an active client email.</p>
                    </div>

                    <div className="pt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Reward</label>
                        <select 
                            name="selectedReward" 
                            className="w-full border-gray-300 bg-gray-50 border p-3 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                            value={formData.selectedReward} onChange={handleChange}
                        >
                            {rewards.map(r => (
                                <option key={r.id} value={r.name}>{r.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                        <p className="text-sm font-medium text-gray-500 mb-3">Optional: Add Friend's Details</p>
                        <div className="grid grid-cols-2 gap-3">
                            <input 
                                type="text" name="prospectName"
                                className="w-full border-gray-300 bg-gray-50 border p-3 rounded-lg text-sm"
                                placeholder="Friend's Name"
                                value={formData.prospectName} onChange={handleChange}
                            />
                            <input 
                                type="email" name="prospectEmail"
                                className="w-full border-gray-300 bg-gray-50 border p-3 rounded-lg text-sm"
                                placeholder="Friend's Email"
                                value={formData.prospectEmail} onChange={handleChange}
                            />
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</p>}

                    <button 
                        type="submit" 
                        className="w-full bg-brand-600 text-white py-3 rounded-lg font-bold hover:bg-brand-700 transition shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isLoadingClientInfo}
                    >
                        {isLoadingClientInfo ? 'Loading...' : 'Get Reward Link'}
                    </button>
                </div>
              </form>
            )}

            {step === 2 && (
              <div className="text-center space-y-6 py-8">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl">
                  ✓
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Link Ready!</h2>
                <p className="text-gray-600">Share this link with your friend to claim your reward.</p>
                
                <div className="flex items-center justify-center space-x-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <input 
                        type="text" 
                        readOnly 
                        value={generatedLink} 
                        className="w-full p-2 bg-transparent text-center font-mono text-brand-600 text-sm outline-none"
                    />
                    <button 
                        onClick={() => navigator.clipboard.writeText(generatedLink)}
                        className="bg-brand-500 text-white px-4 py-2 rounded hover:bg-brand-600 text-sm font-medium"
                    >
                        Copy
                    </button>
                </div>

                <button 
                    onClick={() => setStep(1)}
                    className="text-brand-600 hover:text-brand-800 text-sm font-medium underline"
                >
                    Create another link
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CustomerDashboard;
