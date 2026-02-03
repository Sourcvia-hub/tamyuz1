import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../App';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AccessManagement = () => {
  const { user } = useAuth();
  const [externalUrl, setExternalUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'procurement_manager' || user?.role === 'system_admin' || user?.role === 'hop' || user?.role === 'admin';

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${API}/admin/external-system-url/access_management`, { withCredentials: true });
      if (response.data.url) {
        setExternalUrl(response.data.url);
        setInputUrl(response.data.url);
      }
    } catch (error) {
      console.log('No Access Management URL configured yet');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUrl = async () => {
    try {
      await axios.put(`${API}/admin/external-system-url/access_management`, { url: inputUrl }, { withCredentials: true });
      setExternalUrl(inputUrl);
      setIsConfiguring(false);
    } catch (error) {
      alert('Failed to save URL: ' + (error.response?.data?.detail || error.message));
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🚪</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Access Management</h1>
              <p className="text-sm text-gray-600">External access control system</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {externalUrl && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-sm text-green-600 font-medium">Connected</span>
              </div>
            )}
            {isAdmin && (
              <button
                onClick={() => setIsConfiguring(!isConfiguring)}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                ⚙️ Configure URL
              </button>
            )}
          </div>
        </div>

        {/* URL Configuration Panel (Admin Only) */}
        {isConfiguring && isAdmin && (
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">External Access System URL:</label>
              <input
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://your-access-system.com"
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSaveUrl}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => { setIsConfiguring(false); setInputUrl(externalUrl); }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Enter the URL of your external Access Management system. You will authenticate directly within that system.
            </p>
          </div>
        )}

        {/* Main Content - Iframe or Setup Message */}
        <div className="flex-1 bg-gray-100">
          {externalUrl ? (
            <iframe
              src={externalUrl}
              title="Access Management"
              className="w-full h-full border-0"
              allow="fullscreen"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center bg-white rounded-xl shadow-lg p-12 max-w-lg">
                <span className="text-6xl mb-4 block">🚪</span>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Access System Not Configured</h2>
                <p className="text-gray-600 mb-6">
                  {isAdmin 
                    ? 'Click "Configure URL" above to enter the URL of your external Access Management system.'
                    : 'Please contact your administrator to configure the Access Management system URL.'}
                </p>
                {isAdmin && (
                  <button
                    onClick={() => setIsConfiguring(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    ⚙️ Configure Access System URL
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AccessManagement;
