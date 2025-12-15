import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const ReferralLanding = () => {
  const { code, tenantSlug } = useParams();
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
  const [customFields, setCustomFields] = useState({});
  const [fieldConfig, setFieldConfig] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkCode = async () => {
      try {
        if (!tenantSlug) {
          setValid(false);
          return;
        }
        const res = await axios.get(`/api/referrals/code/${code}`, {
          params: { tenantSlug }
        });
        setValid(true);
        setReferralData(res.data);
        if (Array.isArray(res.data.fieldConfig)) {
          setFieldConfig(res.data.fieldConfig);
        }
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
  }, [code, tenantSlug]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/estimates', {
        referralCode: code,
        tenantSlug,
        ...formData,
        customFields
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

  const renderField = (field) => {
    const value = customFields[field.id] ?? '';
    const commonProps = {
      id: field.id,
      name: field.id,
      required: field.required,
      value,
      onChange: (e) => setCustomFields({ ...customFields, [field.id]: e.target.value })
    };

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows="3"
            className="w-full border-gray-300 bg-gray-50 border p-3 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
          />
        );
      case 'select':
        return (
          <select
            {...commonProps}
            className="w-full border-gray-300 bg-gray-50 border p-3 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
          >
            <option value="">Select...</option>
            {(field.options || []).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      case 'checkbox':
        return (
          <input
            type="checkbox"
            id={field.id}
            name={field.id}
            checked={Boolean(customFields[field.id])}
            onChange={(e) => setCustomFields({ ...customFields, [field.id]: e.target.checked })}
            className="h-4 w-4 text-brand-600 border-gray-300 rounded"
          />
        );
      case 'date':
        return (
          <input
            type="date"
            {...commonProps}
            className="w-full border-gray-300 bg-gray-50 border p-3 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
          />
        );
      case 'number':
        return (
          <input
            type="number"
            {...commonProps}
            className="w-full border-gray-300 bg-gray-50 border p-3 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
          />
        );
      default:
        return (
          <input
            type={field.type || 'text'}
            {...commonProps}
            className="w-full border-gray-300 bg-gray-50 border p-3 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
          />
        );
    }
  };

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

                        {fieldConfig.length > 0 && (
                          <div className="space-y-4">
                            {fieldConfig.map((field) => (
                              <div key={field.id}>
                                <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1">
                                  {field.label} {field.required ? '*' : ''}
                                </label>
                                {renderField(field)}
                                {field.helperText && (
                                  <p className="text-xs text-gray-500 mt-1">{field.helperText}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

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

