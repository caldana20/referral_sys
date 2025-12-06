import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const BulkUpload = () => {
  const [importFile, setImportFile] = useState(null);
  const [importMsg, setImportMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const { logout } = useAuth();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportFile(e.target.files[0]);
      setImportMsg('');
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importFile) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/users/import', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setImportMsg(`✅ Success! Imported ${res.data.importedCount} clients. Skipped/Error: ${res.data.errors.length}`);
      
      // If there are errors, show some details
      if (res.data.errors.length > 0) {
        setImportMsg(prev => prev + ` (Check console for details or see skipped list below)`);
        console.log("Import Errors:", res.data.errors);
      }

      setImportFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setImportMsg(`❌ Error: ${err.response?.data?.message || 'Error importing file'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
        <div className="space-x-4">
            <Link to="/admin/dashboard" className="text-blue-600 hover:underline">Referrals</Link>
            <Link to="/admin/clients" className="text-blue-600 hover:underline">Clients</Link>
            <span className="font-bold text-gray-800">Bulk Upload</span>
            <button onClick={logout} className="text-red-600 hover:text-red-800 ml-4">Logout</button>
        </div>
      </nav>

      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-6 flex items-center gap-2">
            <Link to="/admin/clients" className="text-blue-600 hover:underline">← Back to Clients</Link>
        </div>

        <h2 className="text-2xl font-bold mb-6">Bulk Import Clients</h2>
        
        <div className="bg-white p-8 rounded shadow-lg border-t-4 border-blue-500">
            <div className="mb-6 text-center">
                <div className="mx-auto w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl mb-4">
                    📂
                </div>
                <h3 className="text-xl font-semibold mb-2">Upload Client List</h3>
                <p className="text-gray-600 mb-4">
                    Upload a CSV file to quickly add multiple clients.
                </p>
                <div className="text-sm bg-gray-50 p-4 rounded inline-block text-left">
                    <p className="font-bold mb-2">CSV Format Requirements:</p>
                    <ul className="list-disc pl-5 space-y-1 text-gray-600">
                        <li>Must be a <strong>.csv</strong> file</li>
                        <li>Required columns: <strong>Name, Email</strong></li>
                        <li>Optional column: <strong>Phone</strong></li>
                    </ul>
                </div>
            </div>

            <form onSubmit={handleImport} className="max-w-lg mx-auto space-y-6">
                <div className="flex flex-col items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                            </svg>
                            <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                            <p className="text-xs text-gray-500">CSV (MAX. 5MB)</p>
                        </div>
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept=".csv"
                            className="hidden" 
                            onChange={handleFileChange} 
                        />
                    </label>
                    {importFile && (
                        <div className="mt-2 text-sm text-green-600 font-medium">
                            Selected: {importFile.name}
                        </div>
                    )}
                </div>

                <button 
                    type="submit" 
                    disabled={!importFile || loading}
                    className={`w-full py-3 px-4 rounded-lg text-white font-bold shadow transition
                        ${!importFile || loading 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5'
                        }`}
                >
                    {loading ? 'Importing...' : 'Start Import'}
                </button>
            </form>

            {importMsg && (
                <div className={`mt-6 p-4 rounded-lg text-center text-sm border ${
                    importMsg.includes('Error') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'
                }`}>
                    {importMsg}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default BulkUpload;

