import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Link, useLocation } from 'react-router-dom';
import OutsourcingQuestionnaire from '../components/OutsourcingQuestionnaire';
import SearchableSelect from '../components/SearchableSelect';
import AIContractClassifier from '../components/AIContractClassifier';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Contracts = () => {
  const [contracts, setContracts] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [tenders, setTenders] = useState([]);
  const [selectedTender, setSelectedTender] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const location = useLocation();
  const [formData, setFormData] = useState({
    tender_id: '',
    vendor_id: '',
    title: '',
    sow: '',
    sla: '',
    milestones: [],
    value: '',
    start_date: '',
    end_date: '',
    is_outsourcing: false,
  });

  useEffect(() => {
    fetchContracts();
    fetchVendors();
    fetchTenders();
    
    // Check for filter parameter from dashboard
    const params = new URLSearchParams(location.search);
    const filter = params.get('filter');
    if (filter) {
      setActiveFilter(filter);
    }
  }, [location.search]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchContracts(searchQuery);
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);
  
  useEffect(() => {
    applyFilter();
  }, [contracts, activeFilter]);

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

  const applyFilter = () => {
    if (activeFilter === 'all') {
      setFilteredContracts(contracts);
      return;
    }

    const filtered = contracts.filter(contract => {
      switch (activeFilter) {
        case 'active':
          return contract.status === 'active';
        case 'outsourcing':
          return contract.outsourcing_classification === 'outsourcing';
        case 'cloud':
          return contract.outsourcing_classification === 'cloud_computing';
        case 'noc':
          return contract.is_noc === true;
        case 'expired':
          return contract.status === 'expired';
        default:
          return true;
      }
    });
    setFilteredContracts(filtered);
  };

  const handleTerminateContract = async (contractId) => {
    if (!window.confirm('Are you sure you want to terminate this contract?')) {
      return;
    }

    try {
      await axios.post(`${API}/contracts/${contractId}/terminate`, 
        { reason: 'Manual termination by user' },
        { withCredentials: true }
      );
      alert('Contract terminated successfully');
      fetchContracts();
    } catch (error) {
      console.error('Error terminating contract:', error);
      alert('Failed to terminate contract');
    }
  };

  const handleTenderSelect = async (tenderId) => {
    const tender = tenders.find(t => t.id === tenderId);
    setSelectedTender(tender);
    
    // Fetch tender evaluation to get #1 ranked vendor
    try {
      const evalResponse = await axios.post(`${API}/tenders/${tenderId}/evaluate`, {}, { withCredentials: true });
      
      // Find the proposal with highest score (rank 1)
      const topProposal = evalResponse.data.proposals
        .filter(p => p.evaluated)
        .sort((a, b) => b.final_score - a.final_score)[0];
      
      if (topProposal) {
        // Auto-select the winning vendor (ranked #1)
        const winningVendor = vendors.find(v => v.id === topProposal.vendor_id);
        setSelectedVendor(winningVendor);
        
        setFormData({
          ...formData,
          tender_id: tenderId,
          vendor_id: topProposal.vendor_id,
          title: tender ? `Contract for ${tender.title}` : '',
          sow: tender ? tender.requirements : '',
          value: tender ? tender.budget : ''
        });
      } else {
        // No evaluated proposals yet
        setFormData({
          ...formData,
          tender_id: tenderId,
          vendor_id: '',
          title: tender ? `Contract for ${tender.title}` : '',
          sow: tender ? tender.requirements : '',
          value: tender ? tender.budget : ''
        });
        setSelectedVendor(null);
      }
    } catch (error) {
      console.error('Error fetching tender evaluation:', error);
      setFormData({
        ...formData,
        tender_id: tenderId,
        vendor_id: '',
        title: tender ? `Contract for ${tender.title}` : '',
        sow: tender ? tender.requirements : '',
        value: tender ? tender.budget : ''
      });
      setSelectedVendor(null);
    }
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

        {/* Filter Buttons */}
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              All ({contracts.length})
            </button>
            <button
              onClick={() => setActiveFilter('active')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeFilter === 'active' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Active ({contracts.filter(c => c.status === 'active').length})
            </button>
            <button
              onClick={() => setActiveFilter('outsourcing')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeFilter === 'outsourcing' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Outsourcing ({contracts.filter(c => c.outsourcing_classification === 'outsourcing').length})
            </button>
            <button
              onClick={() => setActiveFilter('cloud')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeFilter === 'cloud' ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Cloud ({contracts.filter(c => c.outsourcing_classification === 'cloud_computing').length})
            </button>
            <button
              onClick={() => setActiveFilter('noc')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeFilter === 'noc' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              NOC ({contracts.filter(c => c.is_noc).length})
            </button>
            <button
              onClick={() => setActiveFilter('expired')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeFilter === 'expired' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Expired ({contracts.filter(c => c.status === 'expired').length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <span className="text-6xl mb-4 block">📄</span>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No contracts found</h3>
            <p className="text-gray-600">
              {activeFilter !== 'all' ? `No ${activeFilter} contracts found.` : 'Contracts will appear here once tenders are awarded.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredContracts.map((contract) => (
              <div
                key={contract.id}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <Link to={`/contracts/${contract.id}`}>
                      <h3 className="text-xl font-bold text-gray-900 hover:text-blue-600">{contract.title}</h3>
                    </Link>
                    <p className="text-sm text-gray-600 mt-1">Contract #{contract.contract_number}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(contract.status)}`}>
                    {contract.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
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
                  {contract.is_noc && (
                    <div className="flex items-center text-sm">
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">NOC Required</span>
                    </div>
                  )}
                  {contract.terminated && (
                    <div className="flex items-center text-sm">
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">Terminated</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Link
                    to={`/contracts/${contract.id}`}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white text-center rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    View Details
                  </Link>
                  {!contract.terminated && contract.status !== 'expired' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTerminateContract(contract.id);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                    >
                      Terminate
                    </button>
                  )}
                </div>
              </div>
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
                <SearchableSelect
                  options={tenders.map(tender => ({
                    value: tender.id,
                    label: `${tender.tender_number} - ${tender.title}`
                  }))}
                  value={formData.tender_id}
                  onChange={(value) => handleTenderSelect(value)}
                  placeholder="Search and select tender..."
                  required={true}
                  isClearable={false}
                />
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

              {/* Winning Vendor (Auto-Selected from Tender) */}
              {selectedVendor && formData.tender_id ? (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-300">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">🏆</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">Winning Vendor (Rank #1)</h3>
                      <p className="text-xs text-gray-600">Auto-selected from tender evaluation</p>
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-sm">
                      <strong className="text-gray-900">
                        {selectedVendor.vendor_number ? `${selectedVendor.vendor_number} - ` : ''}
                        {selectedVendor.name_english || selectedVendor.commercial_name}
                      </strong>
                    </p>
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-600">
                        <strong>Risk Assessment:</strong> {selectedVendor.risk_score}/100 - 
                        <span className={`ml-1 font-semibold ${
                          selectedVendor.risk_category === 'low' ? 'text-green-700' :
                          selectedVendor.risk_category === 'medium' ? 'text-yellow-700' :
                          'text-red-700'
                        }`}>
                          {selectedVendor.risk_category.toUpperCase()} RISK
                        </span>
                      </p>
                    </div>
                  </div>
                  <input type="hidden" value={formData.vendor_id} />
                </div>
              ) : (
                /* Vendor Selection (only shown if no tender selected) */
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
                  <p className="text-xs text-gray-500 mt-1">💡 Tip: Select a tender first to auto-select the winning vendor</p>
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

              {/* AI Contract Classifier */}
              <AIContractClassifier 
                formData={{ title: formData.title, scope: formData.sow }}
                setFormData={(updates) => setFormData({ ...formData, ...updates })}
              />

              {/* Milestones Section */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">Milestones</label>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        milestones: [
                          ...formData.milestones,
                          { name: '', date: '', amount: '' }
                        ]
                      });
                    }}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
                  >
                    + Add Milestone
                  </button>
                </div>
                
                {formData.milestones.length > 0 ? (
                  <div className="space-y-3">
                    {formData.milestones.map((milestone, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                          <input
                            type="text"
                            placeholder="Milestone Name"
                            value={milestone.name}
                            onChange={(e) => {
                              const newMilestones = [...formData.milestones];
                              newMilestones[index].name = e.target.value;
                              setFormData({ ...formData, milestones: newMilestones });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <input
                            type="date"
                            value={milestone.date}
                            onChange={(e) => {
                              const newMilestones = [...formData.milestones];
                              newMilestones[index].date = e.target.value;
                              setFormData({ ...formData, milestones: newMilestones });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            placeholder="Amount"
                            value={milestone.amount}
                            onChange={(e) => {
                              const newMilestones = [...formData.milestones];
                              newMilestones[index].amount = e.target.value;
                              setFormData({ ...formData, milestones: newMilestones });
                            }}
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              const newMilestones = formData.milestones.filter((_, i) => i !== index);
                              setFormData({ ...formData, milestones: newMilestones });
                            }}
                            className="w-full px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No milestones added. Click "Add Milestone" to create one.</p>
                )}
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

              {/* Outsourcing Assessment Questionnaire */}
              <div className="border-t pt-6 mt-6">
                <OutsourcingQuestionnaire formData={formData} setFormData={setFormData} />
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
