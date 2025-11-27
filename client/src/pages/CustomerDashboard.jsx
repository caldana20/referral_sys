import React, { useState } from 'react';
import axios from 'axios';

const CustomerDashboard = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    prospectName: '',
    prospectEmail: '',
    selectedReward: 'service discount'
  });
  const [generatedLink, setGeneratedLink] = useState('');
  const [error, setError] = useState('');

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
      const res = await axios.post('http://localhost:5000/api/referrals', payload);
      const { code } = res.data;
      setGeneratedLink(`${window.location.origin}/referral/${code}`);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Error generating link');
    }
  };

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col">
      {/* Header / Navbar simulation */}
      <header className="bg-white shadow-sm py-4 px-8 flex justify-between items-center">
        <div className="text-2xl font-bold text-brand-600 tracking-tight">
          Cleaning Angels
        </div>
        <nav className="hidden md:flex space-x-6 text-gray-600 font-medium">
          <a href="#" className="hover:text-brand-500">Home</a>
          <a href="#" className="hover:text-brand-500">Services</a>
          <a href="#" className="hover:text-brand-500">Contact</a>
        </nav>
      </header>

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
                <li>✨ Service Discounts</li>
                <li>✨ Free Laundry</li>
                <li>✨ Pest Treatment</li>
              </ul>
            </div>
          </div>

          {/* Right Side: Form */}
          <div className="md:w-1/2 p-10 bg-white">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Generate Referral Link</h1>
            
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
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Your Email</label>
                        <input 
                            type="email" name="email" required
                            className="w-full border-gray-300 bg-gray-50 border p-3 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                            placeholder="client@example.com"
                            value={formData.email} onChange={handleChange}
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
                            <option value="service discount">Service Discount</option>
                            <option value="free laundry">Free Laundry</option>
                            <option value="pest treatment">Pest Treatment</option>
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
                        className="w-full bg-brand-600 text-white py-3 rounded-lg font-bold hover:bg-brand-700 transition shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                    >
                        Get Reward Link
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
