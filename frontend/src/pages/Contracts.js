import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Contracts = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [tenders, setTenders] = useState([]);
  const [selectedTender, setSelectedTender] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    tender_id: '',
    vendor_id: '',
    title: '',
    sow: '',
    sla: '',
    value: '',
    start_date: '',
    end_date: '',
    is_outsourcing: false,
  });

  useEffect(() => {
    fetchContracts();
    fetchVendors();
    fetchTenders();
  }, []);

  const fetchContracts = async (search = '') => {
    try {
      const url = search ? `${API}/contracts?search=${encodeURIComponent(search)}` : `${API}/contracts`;
      const response = await axios.get(url, { withCredentials: true });
      setContracts(response.data);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await axios.get(`${API}/vendors?status=approved`, { withCredentials: true });
      setVendors(response.data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchTenders = async () => {
    try {
      const response = await axios.get(`${API}/tenders/approved/list`, { withCredentials: true });
      setTenders(response.data);
    } catch (error) {
      console.error('Error fetching tenders:', error);
    }
  };

  const handleTenderSelect = async (tenderId) => {
    const tender = tenders.find(t => t.id === tenderId);
    setSelectedTender(tender);
    setFormData({
      ...formData,
      tender_id: tenderId,
      title: tender ? `Contract for ${tender.title}` : '',
      sow: tender ? tender.requirements : '',
      value: tender ? tender.budget : ''
    });
  };

  const handleVendorSelect = async (vendorId) => {
    const vendor = vendors.find(v => v.id === vendorId);
    setSelectedVendor(vendor);
    setFormData({
      ...formData,
      vendor_id: vendorId
    });
  };

  const handleCreateContract = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API}/contracts`,
        {
          ...formData,
          value: parseFloat(formData.value),
          start_date: new Date(formData.start_date).toISOString(),
          end_date: new Date(formData.end_date).toISOString(),
          milestones: [],
          documents: [],
        },
        { withCredentials: true }
      );
      setShowCreateModal(false);
      setFormData({
        tender_id: '',
        vendor_id: '',
        title: '',
        sow: '',
        sla: '',
        value: '',
        start_date: '',
        end_date: '',
        is_outsourcing: false,
      });
      setSelectedTender(null);
      setSelectedVendor(null);
      fetchContracts();
    } catch (error) {
      console.error('Error creating contract:', error);
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || error.message || 'Unknown error occurred';
      alert('Failed to create contract: ' + errorMsg);
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      under_review: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      active: 'bg-blue-100 text-blue-800',
      expired: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Contract Management</h1>
            <p className="text-gray-600 mt-1">Manage service agreements and contracts</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            data-testid="create-contract-btn"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Create Contract
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-md p-4">
          <input
            type="text"
            placeholder="Search by contract number or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : contracts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <span className="text-6xl mb-4 block">📄</span>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No contracts found</h3>
            <p className="text-gray-600">Contracts will appear here once tenders are awarded.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {contracts.map((contract) => (
              <Link
                key={contract.id}
                to={`/contracts/${contract.id}`}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{contract.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">Contract #{contract.contract_number}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(contract.status)}`}>
                    {contract.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 w-24">Value:</span>
                    <span className="text-gray-900 font-medium">${contract.value.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 w-24">Start Date:</span>
                    <span className="text-gray-900 font-medium">{new Date(contract.start_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 w-24">End Date:</span>
                    <span className="text-gray-900 font-medium">{new Date(contract.end_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Contract Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Contract</h2>
            <form onSubmit={handleCreateContract} className="space-y-4">
              {/* Tender Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Approved Tender *</label>
                <select
                  value={formData.tender_id}
                  onChange={(e) => handleTenderSelect(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a tender</option>
                  {tenders.map((tender) => (
                    <option key={tender.id} value={tender.id}>
                      {tender.tender_number} - {tender.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tender RFP Guidelines */}
              {selectedTender && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-2">📋 Tender RFP Guidelines</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Project:</strong> {selectedTender.project_name}</div>
                    <div><strong>Budget:</strong> ${selectedTender.budget?.toLocaleString()}</div>
                    <div><strong>Requirements:</strong> {selectedTender.requirements}</div>
                  </div>
                  <p className="text-xs text-blue-700 mt-2 italic">Contract should follow the same scope as outlined in the RFP</p>
                </div>
              )}

              {/* Vendor Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Vendor *</label>
                <select
                  value={formData.vendor_id}
                  onChange={(e) => handleVendorSelect(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.vendor_number ? `${vendor.vendor_number} - ` : ''}{vendor.name_english || vendor.commercial_name || 'Unknown Vendor'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vendor Risk Assessment */}
              {selectedVendor && (
                <div className={`p-4 rounded-lg border ${
                  selectedVendor.risk_category === 'low' ? 'bg-green-50 border-green-200' :
                  selectedVendor.risk_category === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <h3 className="font-semibold text-gray-900 mb-2">⚠️ Vendor Risk Assessment</h3>
                  <div className="text-sm">
                    <strong>Risk Score:</strong> {selectedVendor.risk_score} / 100 - 
                    <span className={`ml-2 font-bold ${
                      selectedVendor.risk_category === 'low' ? 'text-green-700' :
                      selectedVendor.risk_category === 'medium' ? 'text-yellow-700' :
                      'text-red-700'
                    }`}>
                      {selectedVendor.risk_category.toUpperCase()} RISK
                    </span>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statement of Work (SOW) *</label>
                <textarea
                  value={formData.sow}
                  onChange={(e) => setFormData({ ...formData, sow: e.target.value })}
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Level Agreement (SLA) *</label>
                <textarea
                  value={formData.sla}
                  onChange={(e) => setFormData({ ...formData, sla: e.target.value })}
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contract Value *</label>
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_outsourcing}
                    onChange={(e) => setFormData({ ...formData, is_outsourcing: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">This is an outsourcing contract</span>
                </label>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Create Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Contracts;
