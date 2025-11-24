import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import FileUpload from '../components/FileUpload';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ContractDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contract, setContract] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [tender, setTender] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: '',
    sow: '',
    sla: '',
    value: '',
    start_date: '',
    end_date: '',
    milestones: []
  });

  useEffect(() => {
    fetchContract();
  }, [id]);

  const fetchContract = async () => {
    try {
      const response = await axios.get(`${API}/contracts/${id}`, { withCredentials: true });
      setContract(response.data);
      
      // Fetch related data
      if (response.data.vendor_id) {
        fetchVendor(response.data.vendor_id);
      }
      if (response.data.tender_id) {
        fetchTender(response.data.tender_id);
      }
      fetchInvoices();
    } catch (error) {
      console.error('Error fetching contract:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendor = async (vendorId) => {
    try {
      const response = await axios.get(`${API}/vendors/${vendorId}`, { withCredentials: true });
      setVendor(response.data);
    } catch (error) {
      console.error('Error fetching vendor:', error);
    }
  };

  const fetchTender = async (tenderId) => {
    try {
      const response = await axios.get(`${API}/tenders/${tenderId}`, { withCredentials: true });
      setTender(response.data);
    } catch (error) {
      console.error('Error fetching tender:', error);
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await axios.get(`${API}/invoices`, { withCredentials: true });
      const contractInvoices = response.data.filter(inv => inv.contract_id === id);
      setInvoices(contractInvoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
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

  const getRiskBadgeColor = (category) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const handleEditClick = () => {
    setEditFormData({
      title: contract.title || '',
      sow: contract.sow || '',
      sla: contract.sla || '',
      value: contract.value || '',
      start_date: contract.start_date ? new Date(contract.start_date).toISOString().split('T')[0] : '',
      end_date: contract.end_date ? new Date(contract.end_date).toISOString().split('T')[0] : '',
      milestones: contract.milestones || []
    });
    setIsEditing(true);
  };

  const handleUpdateContract = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/contracts/${id}`, editFormData, { withCredentials: true });
      alert('Contract updated successfully');
      setIsEditing(false);
      fetchContract();
    } catch (error) {
      console.error('Error updating contract:', error);
      alert('Failed to update contract: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleAddMilestone = () => {
    setEditFormData({
      ...editFormData,
      milestones: [...editFormData.milestones, { name: '', date: '', amount: '' }]
    });
  };

  const handleRemoveMilestone = (index) => {
    const newMilestones = editFormData.milestones.filter((_, i) => i !== index);
    setEditFormData({ ...editFormData, milestones: newMilestones });
  };

  const handleMilestoneChange = (index, field, value) => {
    const newMilestones = [...editFormData.milestones];
    newMilestones[index][field] = value;
    setEditFormData({ ...editFormData, milestones: newMilestones });
  };

  const calculateContractProgress = () => {
    if (!contract) return 0;
    const now = new Date();
    const start = new Date(contract.start_date);
    const end = new Date(contract.end_date);
    const total = end - start;
    const elapsed = now - start;
    const progress = Math.min(Math.max((elapsed / total) * 100, 0), 100);
    return progress.toFixed(1);
  };

  const calculateDaysRemaining = () => {
    if (!contract) return 0;
    const now = new Date();
    const end = new Date(contract.end_date);
    const diff = end - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const calculateInvoiceStats = () => {
    const total = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const paid = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const pending = invoices.filter(inv => inv.status !== 'paid').reduce((sum, inv) => sum + (inv.amount || 0), 0);
    return { total, paid, pending };
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!contract) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Contract not found</h2>
          <button
            onClick={() => navigate('/contracts')}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            ← Back to Contracts
          </button>
        </div>
      </Layout>
    );
  }

  const progress = calculateContractProgress();
  const daysRemaining = calculateDaysRemaining();
  const invoiceStats = calculateInvoiceStats();

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <button
            onClick={() => navigate('/contracts')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Contracts
          </button>
          <div className="flex gap-2">
            {!isEditing ? (
              <button
                onClick={handleEditClick}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Edit Contract
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Contract</h2>
            <form onSubmit={handleUpdateContract} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statement of Work (SOW) *</label>
                <textarea
                  value={editFormData.sow}
                  onChange={(e) => setEditFormData({ ...editFormData, sow: e.target.value })}
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Level Agreement (SLA) *</label>
                <textarea
                  value={editFormData.sla}
                  onChange={(e) => setEditFormData({ ...editFormData, sla: e.target.value })}
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Milestones */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">Milestones</label>
                  <button
                    type="button"
                    onClick={handleAddMilestone}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
                  >
                    + Add Milestone
                  </button>
                </div>
                
                {editFormData.milestones.length > 0 ? (
                  <div className="space-y-3">
                    {editFormData.milestones.map((milestone, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <input
                          type="text"
                          placeholder="Milestone Name"
                          value={milestone.name}
                          onChange={(e) => handleMilestoneChange(index, 'name', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <input
                          type="date"
                          value={milestone.date}
                          onChange={(e) => handleMilestoneChange(index, 'date', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Amount"
                          value={milestone.amount}
                          onChange={(e) => handleMilestoneChange(index, 'amount', e.target.value)}
                          step="0.01"
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveMilestone(index)}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No milestones. Click "Add Milestone" to create one.</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contract Value *</label>
                  <input
                    type="number"
                    value={editFormData.value}
                    onChange={(e) => setEditFormData({ ...editFormData, value: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                  <input
                    type="date"
                    value={editFormData.start_date}
                    onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                  <input
                    type="date"
                    value={editFormData.end_date}
                    onChange={(e) => setEditFormData({ ...editFormData, end_date: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* File Attachments */}
              <div className="mt-6">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Contract Documents</h4>
                <FileUpload
                  entityId={id}
                  module="contracts"
                  label="Attach Contract Documents (PDF, DOCX, Images)"
                  accept=".pdf,.doc,.docx,.xlsx,.xls,.png,.jpg,.jpeg"
                  multiple={true}
                  onUploadComplete={(files) => {
                    console.log('Files uploaded:', files);
                  }}
                />
              </div>

              <button
                type="submit"
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </form>
          </div>
        )}

        {/* Main Contract Info Card */}
        {!isEditing && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{contract.title}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(contract.status)}`}>
                  {contract.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              {contract.contract_number && (
                <p className="text-sm text-blue-600 font-medium">#{contract.contract_number}</p>
              )}
            </div>
          </div>

          {/* Contract Value & Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg">
              <p className="text-sm text-blue-700 font-medium mb-1">Contract Value</p>
              <p className="text-2xl font-bold text-blue-900">${contract.value?.toLocaleString()}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg">
              <p className="text-sm text-green-700 font-medium mb-1">Progress</p>
              <p className="text-2xl font-bold text-green-900">{progress}%</p>
              <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg">
              <p className="text-sm text-purple-700 font-medium mb-1">Days Remaining</p>
              <p className="text-2xl font-bold text-purple-900">
                {daysRemaining > 0 ? daysRemaining : 'Expired'}
              </p>
            </div>
          </div>

          {/* Contract Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="text-sm font-medium text-gray-600">Start Date</label>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(contract.start_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">End Date</label>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(contract.end_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* SOW & SLA */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Statement of Work (SOW)</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 whitespace-pre-wrap">{contract.sow}</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Service Level Agreement (SLA)</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 whitespace-pre-wrap">{contract.sla}</p>
              </div>
            </div>
          </div>

          {/* Outsourcing Badge */}
          {contract.is_outsourcing && (
            <div className="mt-6">
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                🌍 Outsourcing Contract
              </span>
            </div>
          )}
        </div>
        )}

        {/* Vendor Information */}
        {vendor && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Vendor Information</h2>
              <button
                onClick={() => navigate(`/vendors/${vendor.id}`)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
              >
                View Vendor Details →
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{vendor.name_english}</h3>
                  {vendor.vendor_number && (
                    <p className="text-xs text-blue-600 font-medium">#{vendor.vendor_number}</p>
                  )}
                  <p className="text-sm text-gray-600">{vendor.commercial_name}</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Contact: </span>
                    <span className="text-gray-900 font-medium">{vendor.representative_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Email: </span>
                    <span className="text-gray-900 font-medium">{vendor.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Phone: </span>
                    <span className="text-gray-900 font-medium">{vendor.mobile}</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">⚠️ Risk Assessment</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Risk Score</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskBadgeColor(vendor.risk_category)}`}>
                        {vendor.risk_category.toUpperCase()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${
                          vendor.risk_category === 'low' ? 'bg-green-500' :
                          vendor.risk_category === 'medium' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${vendor.risk_score}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{vendor.risk_score} / 100</p>
                  </div>
                  {vendor.risk_assessment_details && Object.keys(vendor.risk_assessment_details).length > 0 && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs font-medium text-gray-700 mb-2">Risk Factors:</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {Object.entries(vendor.risk_assessment_details).map(([key, value]) => (
                          <li key={key}>• {value.reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Related Tender */}
        {tender && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Tender (RFP)</h2>
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{tender.title}</h3>
                  {tender.tender_number && (
                    <p className="text-xs text-blue-600 font-medium mt-1">#{tender.tender_number}</p>
                  )}
                  <p className="text-sm text-gray-600 mt-1">{tender.project_name}</p>
                </div>
                <button
                  onClick={() => navigate(`/tenders/${tender.id}`)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View Tender →
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Budget: </span>
                  <span className="text-gray-900 font-medium">${tender.budget?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-600">Deadline: </span>
                  <span className="text-gray-900 font-medium">
                    {new Date(tender.deadline).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Requirements:</p>
                <p className="text-sm text-gray-700">{tender.requirements}</p>
              </div>
            </div>
          </div>
        )}

        {/* Invoices Section */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Financial Summary</h2>
          
          {/* Invoice Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-700 font-medium">Total Invoiced</p>
              <p className="text-xl font-bold text-blue-900">${invoiceStats.total.toLocaleString()}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-700 font-medium">Paid</p>
              <p className="text-xl font-bold text-green-900">${invoiceStats.paid.toLocaleString()}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-700 font-medium">Pending</p>
              <p className="text-xl font-bold text-yellow-900">${invoiceStats.pending.toLocaleString()}</p>
            </div>
          </div>

          {/* Invoice List */}
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoices ({invoices.length})</h3>
          {invoices.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <p>No invoices have been submitted for this contract yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {invoice.invoice_number || `Invoice #${invoice.id.substring(0, 8)}`}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">{invoice.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">${invoice.amount?.toLocaleString()}</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                        invoice.status === 'verified' ? 'bg-yellow-100 text-yellow-800' :
                        invoice.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {invoice.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Submitted: {new Date(invoice.submitted_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract History</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Created:</span> {new Date(contract.created_at).toLocaleString()}
            </div>
            <div>
              <span className="font-medium">Last Updated:</span> {new Date(contract.updated_at).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ContractDetail;
