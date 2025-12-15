import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const steps = [
  { id: 1, title: 'Company Info' },
  { id: 2, title: 'Admin Account' },
  { id: 3, title: 'Settings' },
  { id: 4, title: 'Confirm' }
];

const TenantOnboarding = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [company, setCompany] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: ''
  });
  const [admin, setAdmin] = useState({
    email: '',
    password: ''
  });
  const [settings, setSettings] = useState({
    sendgridFromEmail: ''
  });
  const [result, setResult] = useState(null);

  const isValidEmail = (value) => /\S+@\S+\.\S+/.test(value);

  const nextStep = () => setStep((s) => Math.min(s + 1, steps.length));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handlePreview = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/tenants/preview', {
        companyName: company.name
      });
      setPreview(res.data);
      nextStep();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to preview tenant');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setError('');
    setLoading(true);
    try {
      if (!preview) {
        setError('Please complete preview first.');
        setLoading(false);
        return;
      }
      const res = await axios.post('/api/tenants/confirm', {
        companyName: company.name,
        phone: company.phone,
        address: company.address,
        city: company.city,
        state: company.state,
        zip: company.zip,
        country: company.country,
        adminEmail: admin.email,
        adminPassword: admin.password,
        sendgridFromEmail: settings.sendgridFromEmail,
        tenantSlug: preview?.slug
      });
      setResult(res.data);
      nextStep();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create tenant');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={company.name}
                onChange={(e) => setCompany({ ...company, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  value={company.phone}
                  onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  value={company.address}
                  onChange={(e) => setCompany({ ...company, address: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  value={company.city}
                  onChange={(e) => setCompany({ ...company, city: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  value={company.state}
                  onChange={(e) => setCompany({ ...company, state: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zip</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  value={company.zip}
                  onChange={(e) => setCompany({ ...company, zip: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={company.country}
                onChange={(e) => setCompany({ ...company, country: e.target.value })}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handlePreview}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                disabled={loading || !company.name}
              >
                {loading ? 'Checking...' : 'Next'}
              </button>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email</label>
              <input
                type="email"
                className="w-full p-2 border rounded"
                value={admin.email}
                onChange={(e) => setAdmin({ ...admin, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Password</label>
              <input
                type="password"
                className="w-full p-2 border rounded"
                value={admin.password}
                onChange={(e) => setAdmin({ ...admin, password: e.target.value })}
                required
              />
            </div>
            <div className="flex justify-between">
              <button type="button" onClick={prevStep} className="px-4 py-2 rounded border">Back</button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                disabled={loading || !isValidEmail(admin.email) || !admin.password || admin.password.length < 6}
              >
                Next
              </button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SendGrid From Email</label>
              <input
                type="email"
                className="w-full p-2 border rounded"
                value={settings.sendgridFromEmail}
                onChange={(e) => setSettings({ ...settings, sendgridFromEmail: e.target.value })}
              />
            </div>
            {preview && (
              <div className="p-3 bg-gray-50 border rounded text-sm text-gray-700">
                <div><strong>Tenant Slug:</strong> {preview.slug}</div>
                <div><strong>Client URL:</strong> {preview.clientUrl}</div>
              </div>
            )}
            <div className="flex justify-between">
              <button type="button" onClick={prevStep} className="px-4 py-2 rounded border">Back</button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                disabled={loading || !preview}
              >
                Next
              </button>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 border rounded text-sm text-gray-700 space-y-1">
              <div><strong>Company:</strong> {company.name}</div>
              <div><strong>Admin:</strong> {admin.email}</div>
              <div><strong>SendGrid From:</strong> {settings.sendgridFromEmail || '(not set)'}</div>
              {preview && (
                <>
                  <div><strong>Tenant Slug:</strong> {preview.slug}</div>
                  <div><strong>Client URL:</strong> {preview.clientUrl}</div>
                </>
              )}
            </div>
            {result && (
              <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800 space-y-1">
                <div>Tenant created successfully.</div>
                <div><strong>Slug:</strong> {result.tenant?.slug}</div>
                <div><strong>Client URL:</strong> {result.tenant?.clientUrl}</div>
                <div><strong>Admin Email:</strong> {result.admin?.email}</div>
                <div className="pt-2">
                  <Link
                    to={`/admin/login?tenant=${result.tenant?.slug || preview?.slug || ''}`}
                    className="text-blue-700 underline"
                  >
                    Go to Admin Login
                  </Link>
                </div>
              </div>
            )}
            <div className="flex justify-between">
              <button type="button" onClick={prevStep} className="px-4 py-2 rounded border">Back</button>
              <button
                type="button"
                onClick={handleConfirm}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                disabled={loading || !!result}
              >
                {loading ? 'Creating...' : 'Confirm & Create'}
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Tenant Onboarding</h1>
          <div className="text-sm text-gray-500">Step {step} of {steps.length}: {steps[step - 1].title}</div>
        </div>

        {error && <div className="mb-4 bg-red-100 text-red-700 p-3 rounded">{error}</div>}

        {renderStep()}
      </div>
    </div>
  );
};

export default TenantOnboarding;


