import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Resources = () => {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [contracts, setContracts] = useState([]);
  const [selectedContract, setSelectedContract] = useState(null);
  
  const [formData, setFormData] = useState({
    contract_id: '',
    vendor_id: '',
    name: '',
    nationality: '',
    id_number: '',
    education_qualification: '',
    years_of_experience: 0,
    work_type: 'on_premises',
    start_date: '',
    end_date: '',
    access_development: false,
    access_production: false,
    access_uat: false,
    scope_of_work: '',
    has_relatives: false,
    relatives: [],
  });

  const [currentRelative, setCurrentRelative] = useState({
    name: '',
    position: '',
    department: '',
    relation: '',
  });

  useEffect(() => {
    fetchResources();
    fetchContracts();
  }, []);

  const fetchResources = async () => {
    try {
      const response = await axios.get(`${API}/resources`, { withCredentials: true });
      setResources(response.data);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContracts = async () => {
    try {
      const response = await axios.get(`${API}/contracts`, { withCredentials: true });
      // Filter for active or approved contracts
      const activeContracts = response.data.filter(c => 
        c.status === 'active' || c.status === 'approved'
      );
      setContracts(activeContracts);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  };

  const handleContractSelect = (contractId) => {
    const contract = contracts.find(c => c.id === contractId);
    setSelectedContract(contract);
    
    if (contract) {
      setFormData({
        ...formData,
        contract_id: contractId,
        vendor_id: contract.vendor_id,
        scope_of_work: contract.sow || '',
      });
    }
  };

  const handleAddRelative = () => {
    if (!currentRelative.name || !currentRelative.relation) {
      alert('Please fill in relative name and relation');
      return;
    }

    setFormData({
      ...formData,
      relatives: [...formData.relatives, currentRelative]
    });

    setCurrentRelative({
      name: '',
      position: '',
      department: '',
      relation: '',
    });
  };

  const handleRemoveRelative = (index) => {
    const newRelatives = formData.relatives.filter((_, i) => i !== index);
    setFormData({ ...formData, relatives: newRelatives });
  };

  const handleCreateResource = async (e) => {
    e.preventDefault();

    if (!formData.contract_id) {
      alert('Please select a contract');
      return;
    }

    try {
      await axios.post(`${API}/resources`, formData, { withCredentials: true });
      alert('Resource registered successfully!');
      setShowCreateModal(false);
      fetchResources();
      
      // Reset form
      setFormData({
        contract_id: '',
        vendor_id: '',
        name: '',
        nationality: '',
        id_number: '',
        education_qualification: '',
        years_of_experience: 0,
        work_type: 'on_premises',
        start_date: '',
        end_date: '',
        access_development: false,
        access_production: false,
        access_uat: false,
        scope_of_work: '',
        has_relatives: false,
        relatives: [],
      });
      setSelectedContract(null);
    } catch (error) {
      console.error('Error creating resource:', error);
      alert('Failed to register resource: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleTerminateResource = async (resourceId) => {
    if (!window.confirm('Are you sure you want to terminate this resource?')) {
      return;
    }

    try {
      await axios.post(`${API}/resources/${resourceId}/terminate`, {}, { withCredentials: true });
      alert('Resource terminated successfully');
      fetchResources();
    } catch (error) {
      console.error('Error terminating resource:', error);
      alert('Failed to terminate resource');
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      terminated: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Resources</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Register Resource
          </button>
        </div>

        {/* Stats Dashboard */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>📊</span>
            Resource Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-700">{resources.length}</p>
                <p className="text-sm text-blue-600 font-medium mt-1">Total Resources</p>
              </div>
            </div>
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-700">{resources.filter(r => r.status === 'active').length}</p>
                <p className="text-sm text-green-600 font-medium mt-1">Active</p>
              </div>
            </div>
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-700">{resources.filter(r => r.work_type === 'offshore').length}</p>
                <p className="text-sm text-purple-600 font-medium mt-1">Offshore</p>
              </div>
            </div>
            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-700">{resources.filter(r => r.work_type === 'on_premises').length}</p>
                <p className="text-sm text-orange-600 font-medium mt-1">On Premises</p>
              </div>
            </div>
          </div>
        </div>

        {/* Resources List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : resources.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <span className="text-6xl mb-4 block">👤</span>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No resources found</h3>
            <p className="text-gray-600">Register your first resource to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {resources.map((resource) => (
              <div key={resource.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{resource.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">#{resource.resource_number}</p>
                    <p className="text-sm text-gray-600">{resource.nationality}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(resource.status)}`}>
                      {resource.status.toUpperCase()}
                    </span>
                    <p className="text-xs text-gray-500 mt-2">
                      {resource.work_type === 'offshore' ? '🌍 Offshore' : '🏢 On Premises'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 w-32">Vendor:</span>
                    <span className="text-gray-900 font-medium">{resource.vendor_name}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 w-32">Contract:</span>
                    <span className="text-gray-900 font-medium">{resource.contract_name}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 w-32">Experience:</span>
                    <span className="text-gray-900 font-medium">{resource.years_of_experience} years</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 w-32">Duration:</span>
                    <span className="text-gray-900 font-medium">
                      {new Date(resource.start_date).toLocaleDateString()} - {new Date(resource.end_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center text-sm gap-2">
                    <span className="text-gray-600">Access:</span>
                    {resource.access_development && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Dev</span>}
                    {resource.access_production && <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Prod</span>}
                    {resource.access_uat && <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">UAT</span>}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    to={`/resources/${resource.id}`}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white text-center rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    View Details
                  </Link>
                  {resource.status === 'active' && (
                    <button
                      onClick={() => handleTerminateResource(resource.id)}
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

      {/* Create Resource Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Register Resource</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateResource} className="p-6 space-y-6">
              {/* Contract Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contract * {contracts.length === 0 && <span className="text-red-600 text-xs">(No active/approved contracts available)</span>}
                </label>
                <select
                  value={formData.contract_id}
                  onChange={(e) => handleContractSelect(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={contracts.length === 0}
                >
                  <option value="">
                    {contracts.length === 0 ? 'No contracts available - Please create an approved contract first' : 'Select a contract'}
                  </option>
                  {contracts.map((contract) => (
                    <option key={contract.id} value={contract.id}>
                      {contract.contract_number} - {contract.title} ({contract.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Contract Brief Info */}
              {selectedContract && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">📋 Contract Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-blue-600 font-medium">Contract Name:</p>
                      <p className="text-blue-900">{selectedContract.title}</p>
                    </div>
                    <div>
                      <p className="text-blue-600 font-medium">Duration:</p>
                      <p className="text-blue-900">
                        {new Date(selectedContract.start_date).toLocaleDateString()} - {new Date(selectedContract.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-blue-600 font-medium">Scope:</p>
                      <p className="text-blue-900">{selectedContract.sow}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-blue-600 font-medium">SLA:</p>
                      <p className="text-blue-900">{selectedContract.sla}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Resource Details */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Resource Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nationality *</label>
                    <input
                      type="text"
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ID Number *</label>
                    <input
                      type="text"
                      value={formData.id_number}
                      onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Education & Qualification *</label>
                    <input
                      type="text"
                      value={formData.education_qualification}
                      onChange={(e) => setFormData({ ...formData, education_qualification: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience *</label>
                    <input
                      type="number"
                      value={formData.years_of_experience}
                      onChange={(e) => setFormData({ ...formData, years_of_experience: parseFloat(e.target.value) })}
                      required
                      min="0"
                      step="0.5"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Work Type *</label>
                    <select
                      value={formData.work_type}
                      onChange={(e) => setFormData({ ...formData, work_type: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="on_premises">On Premises</option>
                      <option value="offshore">Offshore</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Duration */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Duration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">From *</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">To *</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Requested Access */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Requested Access</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.access_development}
                      onChange={(e) => setFormData({ ...formData, access_development: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span className="text-sm text-gray-700">Development</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.access_production}
                      onChange={(e) => setFormData({ ...formData, access_production: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span className="text-sm text-gray-700">Production</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.access_uat}
                      onChange={(e) => setFormData({ ...formData, access_uat: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span className="text-sm text-gray-700">UAT</span>
                  </label>
                </div>
              </div>

              {/* Scope of Work */}
              <div className="border-t pt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Scope of Work *</label>
                <textarea
                  value={formData.scope_of_work}
                  onChange={(e) => setFormData({ ...formData, scope_of_work: e.target.value })}
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Relatives Declaration */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Relatives Declaration</h3>
                <label className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    checked={formData.has_relatives}
                    onChange={(e) => setFormData({ ...formData, has_relatives: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <span className="text-sm text-gray-700">Do any of your relatives work for Tamyuz Group of Companies/Joint Ventures?</span>
                </label>

                {formData.has_relatives && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                      <input
                        type="text"
                        placeholder="Name"
                        value={currentRelative.name}
                        onChange={(e) => setCurrentRelative({ ...currentRelative, name: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Position"
                        value={currentRelative.position}
                        onChange={(e) => setCurrentRelative({ ...currentRelative, position: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Department"
                        value={currentRelative.department}
                        onChange={(e) => setCurrentRelative({ ...currentRelative, department: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Relation"
                          value={currentRelative.relation}
                          onChange={(e) => setCurrentRelative({ ...currentRelative, relation: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={handleAddRelative}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {formData.relatives.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-700">Relatives Added:</h4>
                        {formData.relatives.map((relative, index) => (
                          <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium">{relative.name} - {relative.relation}</p>
                              <p className="text-sm text-gray-600">{relative.position} at {relative.department}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveRelative(index)}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <button
                type="submit"
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Register Resource
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Resources;
