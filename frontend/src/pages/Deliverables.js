import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { useToast } from '../hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Deliverables = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deliverables, setDeliverables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [contracts, setContracts] = useState([]);
  const [vendors, setVendors] = useState([]);

  useEffect(() => {
    fetchDeliverables();
    fetchContracts();
    fetchVendors();
  }, []);

  const fetchDeliverables = async () => {
    try {
      const response = await axios.get(`${API}/deliverables`, { withCredentials: true });
      setDeliverables(response.data.deliverables || []);
    } catch (error) {
      console.error('Error fetching deliverables:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContracts = async () => {
    try {
      const response = await axios.get(`${API}/contracts`, { withCredentials: true });
      setContracts(response.data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await axios.get(`${API}/vendors`, { withCredentials: true });
      setVendors(response.data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      under_review: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      partially_accepted: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPAFStatusBadge = (status) => {
    const colors = {
      generated: 'bg-blue-100 text-blue-800',
      pending_approval: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredDeliverables = deliverables.filter(d => {
    if (filter === 'all') return true;
    if (filter === 'accepted') return d.status === 'accepted';
    if (filter === 'pending_paf') return d.status === 'accepted' && !d.payment_authorization_id;
    if (filter === 'with_paf') return d.payment_authorization_id;
    return d.status === filter;
  });

  const stats = {
    total: deliverables.length,
    accepted: deliverables.filter(d => d.status === 'accepted').length,
    pendingPAF: deliverables.filter(d => d.status === 'accepted' && !d.payment_authorization_id).length,
    withPAF: deliverables.filter(d => d.payment_authorization_id).length,
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span>📦</span> Deliverables
            </h1>
            <p className="text-gray-600 mt-1">Manage contract deliverables and payment authorizations</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            + New Deliverable
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-500">
            <p className="text-sm text-gray-600">Total Deliverables</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Accepted</p>
            <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
            <p className="text-sm text-gray-600">Pending PAF</p>
            <p className="text-2xl font-bold text-orange-600">{stats.pendingPAF}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600">With PAF</p>
            <p className="text-2xl font-bold text-blue-600">{stats.withPAF}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 border-b pb-4">
          {[
            { key: 'all', label: 'All', count: stats.total },
            { key: 'accepted', label: 'Accepted', count: stats.accepted },
            { key: 'pending_paf', label: 'Pending PAF', count: stats.pendingPAF },
            { key: 'with_paf', label: 'With PAF', count: stats.withPAF },
            { key: 'draft', label: 'Draft' },
            { key: 'submitted', label: 'Submitted' },
            { key: 'rejected', label: 'Rejected' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1 text-xs opacity-70">({tab.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Deliverables List */}
        {filteredDeliverables.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <span className="text-6xl mb-4 block">📦</span>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Deliverables Found</h3>
            <p className="text-gray-600">Create your first deliverable to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDeliverables.map(deliverable => (
              <DeliverableCard
                key={deliverable.id}
                deliverable={deliverable}
                getStatusBadge={getStatusBadge}
                getPAFStatusBadge={getPAFStatusBadge}
                navigate={navigate}
                onRefresh={fetchDeliverables}
              />
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <CreateDeliverableModal
            contracts={contracts}
            vendors={vendors}
            onClose={() => setShowCreateModal(false)}
            onCreated={() => {
              setShowCreateModal(false);
              fetchDeliverables();
            }}
          />
        )}
      </div>
    </Layout>
  );
};

// Deliverable Card Component
const DeliverableCard = ({ deliverable, getStatusBadge, getPAFStatusBadge, navigate, onRefresh, toast }) => {
  const [generating, setGenerating] = useState(false);

  const handleGeneratePAF = async () => {
    if (!window.confirm('Generate Payment Authorization Form for this deliverable?')) return;
    
    setGenerating(true);
    try {
      const response = await axios.post(
        `${API}/deliverables/${deliverable.id}/generate-paf`,
        {},
        { withCredentials: true }
      );
      toast({
        title: "✅ PAF Generated",
        description: `Payment Authorization ${response.data.payment_authorization.paf_number} generated successfully!`,
        variant: "success"
      });
      onRefresh();
    } catch (error) {
      console.error('Error generating PAF:', error);
      toast({
        title: "❌ Generation Failed",
        description: error.response?.data?.detail || error.message,
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{deliverable.title}</h3>
            <span className="text-xs text-blue-600 font-medium">{deliverable.deliverable_number}</span>
          </div>
          
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{deliverable.description}</p>

          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(deliverable.status)}`}>
              {(deliverable.status || '').replace(/_/g, ' ').toUpperCase()}
            </span>
            <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
              {deliverable.deliverable_type?.replace(/_/g, ' ').toUpperCase()}
            </span>
            {deliverable.payment_authorization_id && (
              <span className={`px-2 py-1 rounded text-xs font-medium ${getPAFStatusBadge(deliverable.payment_authorization_status)}`}>
                PAF: {(deliverable.payment_authorization_status || '').toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex gap-4 text-sm text-gray-500">
            <span>Amount: <strong className="text-gray-700">{deliverable.currency} {deliverable.amount?.toLocaleString()}</strong></span>
            {deliverable.due_date && (
              <span>Due: <strong className="text-gray-700">{new Date(deliverable.due_date).toLocaleDateString()}</strong></span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 ml-4">
          <button
            onClick={() => navigate(`/deliverables/${deliverable.id}`)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
          >
            View Details
          </button>
          
          {/* Generate PAF Button - Only for accepted deliverables without PAF */}
          {deliverable.status === 'accepted' && !deliverable.payment_authorization_id && (
            <button
              onClick={handleGeneratePAF}
              disabled={generating}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {generating ? (
                <>⏳ Generating...</>
              ) : (
                <>💰 Generate PAF</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Create Deliverable Modal
const CreateDeliverableModal = ({ contracts, vendors, onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    contract_id: '',
    vendor_id: '',
    title: '',
    description: '',
    deliverable_type: 'milestone',
    amount: '',
    currency: 'SAR',
    due_date: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.vendor_id || !formData.title) {
      alert('Please fill in required fields');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/deliverables`, {
        ...formData,
        amount: parseFloat(formData.amount) || 0,
      }, { withCredentials: true });
      onCreated();
    } catch (error) {
      console.error('Error creating deliverable:', error);
      alert('Failed to create deliverable: ' + (error.response?.data?.detail || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-select vendor when contract is selected
  useEffect(() => {
    if (formData.contract_id) {
      const contract = contracts.find(c => c.id === formData.contract_id);
      if (contract?.vendor_id) {
        setFormData(prev => ({ ...prev, vendor_id: contract.vendor_id }));
      }
    }
  }, [formData.contract_id, contracts]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 m-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Deliverable</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contract *</label>
            <select
              value={formData.contract_id}
              onChange={(e) => setFormData({ ...formData, contract_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            >
              <option value="">Select Contract...</option>
              {contracts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.contract_number} - {c.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
            <select
              value={formData.vendor_id}
              onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            >
              <option value="">Select Vendor...</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name_english || v.commercial_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.deliverable_type}
                onChange={(e) => setFormData({ ...formData, deliverable_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="milestone">Milestone</option>
                <option value="service_delivery">Service Delivery</option>
                <option value="product_delivery">Product Delivery</option>
                <option value="report">Report</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="SAR">SAR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Deliverable'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Deliverables;
