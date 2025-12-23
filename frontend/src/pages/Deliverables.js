import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { useToast } from '../hooks/use-toast';
import SearchableSelect from '../components/SearchableSelect';
import AuditTrail from '../components/AuditTrail';
import { getErrorMessage } from '../utils/errorUtils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Deliverables = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [deliverables, setDeliverables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [contracts, setContracts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [selectedDeliverable, setSelectedDeliverable] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchDeliverables();
    fetchContracts();
    fetchPurchaseOrders();
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
      // Filter for approved contracts only
      const approvedContracts = (response.data || []).filter(c => 
        ['approved', 'active'].includes(c.status)
      );
      setContracts(approvedContracts);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const response = await axios.get(`${API}/purchase-orders`, { withCredentials: true });
      // Filter for issued POs only
      const issuedPOs = (response.data || []).filter(po => 
        ['issued', 'approved', 'partially_fulfilled'].includes(po.status)
      );
      setPurchaseOrders(issuedPOs);
    } catch (error) {
      console.error('Error fetching POs:', error);
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
      validated: 'bg-indigo-100 text-indigo-800',
      pending_hop_approval: 'bg-purple-100 text-purple-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      paid: 'bg-emerald-100 text-emerald-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: 'Draft',
      submitted: 'Submitted',
      under_review: 'Under Review',
      validated: 'Validated',
      pending_hop_approval: 'Pending HoP',
      approved: 'Approved',
      rejected: 'Rejected',
      paid: 'Paid',
    };
    return labels[status] || status;
  };

  const filteredDeliverables = deliverables.filter(d => {
    if (filter === 'all') return true;
    if (filter === 'pending_action') return ['submitted', 'validated', 'pending_hop_approval'].includes(d.status);
    return d.status === filter;
  });

  const stats = {
    total: deliverables.length,
    draft: deliverables.filter(d => d.status === 'draft').length,
    pendingReview: deliverables.filter(d => ['submitted', 'under_review'].includes(d.status)).length,
    pendingHoP: deliverables.filter(d => d.status === 'pending_hop_approval').length,
    approved: deliverables.filter(d => ['approved', 'paid'].includes(d.status)).length,
  };

  // Actions
  const handleSubmit = async (id) => {
    try {
      await axios.post(`${API}/deliverables/${id}/submit`, {}, { withCredentials: true });
      toast({ title: "✅ Submitted", description: "Deliverable submitted for review", variant: "success" });
      fetchDeliverables();
    } catch (error) {
      toast({ title: "❌ Error", description: getErrorMessage(error, "Failed to submit"), variant: "destructive" });
    }
  };

  const handleValidate = async (id) => {
    try {
      await axios.post(`${API}/deliverables/${id}/review`, { status: 'validated', review_notes: 'Validated by officer' }, { withCredentials: true });
      toast({ title: "✅ Validated", description: "Deliverable validated successfully", variant: "success" });
      fetchDeliverables();
    } catch (error) {
      toast({ title: "❌ Error", description: error.response?.data?.detail || "Failed to validate", variant: "destructive" });
    }
  };

  const handleSubmitToHoP = async (id) => {
    try {
      await axios.post(`${API}/deliverables/${id}/submit-to-hop`, {}, { withCredentials: true });
      toast({ title: "✅ Submitted to HoP", description: "Deliverable sent for HoP approval", variant: "success" });
      fetchDeliverables();
    } catch (error) {
      toast({ title: "❌ Error", description: error.response?.data?.detail || "Failed to submit to HoP", variant: "destructive" });
    }
  };

  const handleHoPDecision = async (id, decision, notes = '') => {
    try {
      await axios.post(`${API}/deliverables/${id}/hop-decision`, { decision, notes }, { withCredentials: true });
      toast({ 
        title: decision === 'approved' ? "✅ Approved" : decision === 'rejected' ? "❌ Rejected" : "↩️ Returned", 
        description: `Deliverable ${decision}`, 
        variant: decision === 'approved' ? "success" : "warning" 
      });
      fetchDeliverables();
      setShowDetailModal(false);
    } catch (error) {
      toast({ title: "❌ Error", description: error.response?.data?.detail || "Failed to process", variant: "destructive" });
    }
  };

  const handleExport = async (id) => {
    try {
      const response = await axios.post(`${API}/deliverables/${id}/export`, {}, { withCredentials: true });
      toast({ title: "📤 Exported", description: `Reference: ${response.data.export_reference}`, variant: "success" });
      fetchDeliverables();
    } catch (error) {
      toast({ title: "❌ Error", description: error.response?.data?.detail || "Failed to export", variant: "destructive" });
    }
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
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Deliverables & Payments</h1>
            <p className="text-gray-600">Manage delivered items, validation, and payment approvals</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + New Deliverable
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-600">Draft</p>
            <p className="text-2xl font-bold text-gray-500">{stats.draft}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-600">Pending Review</p>
            <p className="text-2xl font-bold text-blue-600">{stats.pendingReview}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-600">Pending HoP</p>
            <p className="text-2xl font-bold text-purple-600">{stats.pendingHoP}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-600">Approved/Paid</p>
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {['all', 'draft', 'submitted', 'validated', 'pending_hop_approval', 'approved', 'paid'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-sm ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              {f === 'all' ? 'All' : getStatusLabel(f)}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-4">
          {filteredDeliverables.length === 0 ? (
            <div className="bg-white p-8 rounded-lg text-center text-gray-500">
              No deliverables found. Create one to get started.
            </div>
          ) : (
            filteredDeliverables.map(deliverable => (
              <DeliverableCard
                key={deliverable.id}
                deliverable={deliverable}
                getStatusBadge={getStatusBadge}
                getStatusLabel={getStatusLabel}
                onSubmit={handleSubmit}
                onValidate={handleValidate}
                onSubmitToHoP={handleSubmitToHoP}
                onHoPDecision={handleHoPDecision}
                onExport={handleExport}
                onViewDetails={() => { setSelectedDeliverable(deliverable); setShowDetailModal(true); }}
                user={user}
              />
            ))
          )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <CreateDeliverableModal
            contracts={contracts}
            purchaseOrders={purchaseOrders}
            vendors={vendors}
            onClose={() => setShowCreateModal(false)}
            onCreated={() => {
              setShowCreateModal(false);
              fetchDeliverables();
              toast({ title: "✅ Created", description: "New deliverable created", variant: "success" });
            }}
            toast={toast}
          />
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedDeliverable && (
          <DeliverableDetailModal
            deliverable={selectedDeliverable}
            getStatusBadge={getStatusBadge}
            getStatusLabel={getStatusLabel}
            onClose={() => setShowDetailModal(false)}
            onHoPDecision={handleHoPDecision}
            user={user}
          />
        )}
      </div>
    </Layout>
  );
};

// Deliverable Card Component
const DeliverableCard = ({ deliverable, getStatusBadge, getStatusLabel, onSubmit, onValidate, onSubmitToHoP, onHoPDecision, onExport, onViewDetails, user }) => {
  const isHoP = ['procurement_manager', 'admin', 'hop'].includes(user?.role);
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-gray-900">{deliverable.title}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadge(deliverable.status)}`}>
              {getStatusLabel(deliverable.status)}
            </span>
            {deliverable.exported && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800">Exported</span>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-2">{deliverable.description}</p>
          <div className="flex gap-4 text-sm text-gray-500">
            <span>📄 {deliverable.deliverable_number}</span>
            {deliverable.vendor_invoice_number && <span>📋 Inv: {deliverable.vendor_invoice_number}</span>}
            <span>💰 {deliverable.amount?.toLocaleString()} SAR</span>
            {deliverable.contract_info && <span>📑 {deliverable.contract_info.contract_number || deliverable.contract_info.title}</span>}
            {deliverable.po_info && <span>📝 {deliverable.po_info.po_number}</span>}
          </div>
          {deliverable.ai_validation_status && (
            <div className="mt-2 text-sm">
              <span className={`px-2 py-0.5 rounded text-xs ${deliverable.ai_validation_status === 'Ready' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                AI: {deliverable.ai_validation_status}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onViewDetails} className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
            View
          </button>
          {deliverable.status === 'draft' && (
            <button onClick={() => onSubmit(deliverable.id)} className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
              Submit
            </button>
          )}
          {deliverable.status === 'submitted' && (
            <button onClick={() => onValidate(deliverable.id)} className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200">
              Validate
            </button>
          )}
          {deliverable.status === 'validated' && (
            <button onClick={() => onSubmitToHoP(deliverable.id)} className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200">
              Submit to HoP
            </button>
          )}
          {deliverable.status === 'pending_hop_approval' && isHoP && (
            <>
              <button onClick={() => onHoPDecision(deliverable.id, 'approved')} className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200">
                Approve
              </button>
              <button onClick={() => onHoPDecision(deliverable.id, 'rejected')} className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200">
                Reject
              </button>
            </>
          )}
          {deliverable.status === 'approved' && !deliverable.exported && (
            <button onClick={() => onExport(deliverable.id)} className="px-3 py-1 text-sm bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200">
              Export
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Create Deliverable Modal
const CreateDeliverableModal = ({ contracts, purchaseOrders, vendors, onClose, onCreated, toast }) => {
  const [formData, setFormData] = useState({
    contract_id: '',
    po_id: '',
    vendor_id: '',
    title: '',
    description: '',
    deliverable_type: 'milestone',
    vendor_invoice_number: '',
    amount: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorLocked, setVendorLocked] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Only vendor and title are truly required
    if (!formData.vendor_id || !formData.title) {
      toast({ title: "⚠️ Validation", description: "Please fill required fields (Vendor and Title)", variant: "warning" });
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${BACKEND_URL}/api/deliverables`, {
        ...formData,
        amount: parseFloat(formData.amount) || 0,
      }, { withCredentials: true });
      onCreated();
    } catch (error) {
      toast({ title: "❌ Error", description: error.response?.data?.detail || "Failed to create", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">New Deliverable</h2>
        <p className="text-sm text-gray-600 mb-4">
          📋 Create deliverables. Optionally link to a contract or purchase order to auto-select vendor.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Approved Contract <span className="text-gray-400">(Optional)</span></label>
              <SearchableSelect
                options={contracts.map(c => ({ value: c.id, label: `${c.contract_number || ''} - ${c.title}` }))}
                value={selectedContract}
                onChange={(option) => {
                  setSelectedContract(option);
                  setSelectedPO(null); // Clear PO when contract is selected
                  const contract = contracts.find(c => c.id === option?.value);
                  const vendorId = contract?.vendor_id || '';
                  const vendor = vendors.find(v => v.id === vendorId);
                  setFormData({ 
                    ...formData, 
                    contract_id: option?.value || '', 
                    po_id: '',
                    vendor_id: vendorId 
                  });
                  if (vendorId) {
                    setSelectedVendor({ value: vendorId, label: vendor?.name_english || vendor?.commercial_name || 'Unknown Vendor' });
                    setVendorLocked(true);
                  } else {
                    setSelectedVendor(null);
                    setVendorLocked(false);
                  }
                }}
                placeholder="Select approved contract..."
              />
              {contracts.length === 0 && (
                <p className="text-xs text-orange-600 mt-1">No approved contracts available</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Purchase Order <span className="text-gray-400">(Optional)</span></label>
              <SearchableSelect
                options={purchaseOrders.map(po => ({ value: po.id, label: `${po.po_number} - ${po.vendor_name || 'Unknown'}` }))}
                value={selectedPO}
                onChange={(option) => {
                  setSelectedPO(option);
                  setSelectedContract(null); // Clear contract when PO is selected
                  const po = purchaseOrders.find(p => p.id === option?.value);
                  const vendorId = po?.vendor_id || '';
                  const vendor = vendors.find(v => v.id === vendorId);
                  setFormData({ 
                    ...formData, 
                    po_id: option?.value || '', 
                    contract_id: '',
                    vendor_id: vendorId 
                  });
                  if (vendorId) {
                    setSelectedVendor({ value: vendorId, label: vendor?.name_english || vendor?.commercial_name || 'Unknown Vendor' });
                    setVendorLocked(true);
                  } else {
                    setSelectedVendor(null);
                    setVendorLocked(false);
                  }
                }}
                placeholder="Select issued PO..."
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Vendor * {vendorLocked && <span className="text-blue-600">(Auto-selected from Contract/PO)</span>}</label>
            {vendorLocked ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 border rounded-lg bg-gray-100 text-gray-700">
                  🏪 {selectedVendor?.label || 'Unknown Vendor'}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setVendorLocked(false);
                    setSelectedContract(null);
                    setSelectedPO(null);
                    setFormData({ ...formData, contract_id: '', po_id: '' });
                  }}
                  className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Change
                </button>
              </div>
            ) : (
              <SearchableSelect
                options={vendors.map(v => ({ value: v.id, label: v.name_english || v.commercial_name || 'Unknown' }))}
                value={selectedVendor}
                onChange={(option) => {
                  setSelectedVendor(option);
                  setFormData({ ...formData, vendor_id: option?.value || '' });
                }}
                placeholder="Select vendor..."
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="e.g., Monthly Service Delivery - January 2025"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={3}
              placeholder="Describe the deliverable..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Vendor Invoice #</label>
              <input
                type="text"
                value={formData.vendor_invoice_number}
                onChange={(e) => setFormData({ ...formData, vendor_invoice_number: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="INV-2025-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Amount (SAR) *</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Deliverable Type</label>
            <select
              value={formData.deliverable_type}
              onChange={(e) => setFormData({ ...formData, deliverable_type: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="milestone">Milestone</option>
              <option value="service_delivery">Service Delivery</option>
              <option value="product_delivery">Product Delivery</option>
              <option value="monthly_invoice">Monthly Invoice</option>
              <option value="final_delivery">Final Delivery</option>
              <option value="report">Report</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
              {submitting ? 'Creating...' : 'Create Deliverable'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Detail Modal
const DeliverableDetailModal = ({ deliverable, getStatusBadge, getStatusLabel, onClose, onHoPDecision, user }) => {
  const isHoP = ['procurement_manager', 'admin', 'hop'].includes(user?.role);
  const [notes, setNotes] = useState('');
  const [auditTrail, setAuditTrail] = useState([]);

  useEffect(() => {
    const fetchAuditTrail = async () => {
      try {
        const res = await axios.get(`${API}/deliverables/${deliverable.id}/audit-trail`, { withCredentials: true });
        setAuditTrail(res.data);
      } catch (error) {
        console.log('Audit trail not available');
      }
    };
    if (deliverable?.id) {
      fetchAuditTrail();
    }
  }, [deliverable?.id]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold">{deliverable.title}</h2>
            <p className="text-gray-500">{deliverable.deliverable_number}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm ${getStatusBadge(deliverable.status)}`}>
            {getStatusLabel(deliverable.status)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-600">Amount</p>
            <p className="text-lg font-semibold">{deliverable.amount?.toLocaleString()} SAR</p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-600">Vendor Invoice</p>
            <p className="text-lg font-semibold">{deliverable.vendor_invoice_number || '-'}</p>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold mb-2">Description</h3>
          <p className="text-gray-700">{deliverable.description}</p>
        </div>

        {deliverable.ai_validation_summary && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">AI Validation Summary</h3>
            <p className="text-sm text-blue-700">{deliverable.ai_validation_summary}</p>
            {deliverable.ai_confidence && (
              <p className="text-xs text-blue-600 mt-1">Confidence: {deliverable.ai_confidence}</p>
            )}
          </div>
        )}

        {deliverable.payment_reference && (
          <div className="mb-4 p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700">Payment Reference: <strong>{deliverable.payment_reference}</strong></p>
          </div>
        )}

        {/* HoP Decision Section */}
        {deliverable.status === 'pending_hop_approval' && isHoP && (
          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold mb-2">HoP Decision</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg mb-3"
              rows={2}
              placeholder="Decision notes (optional)..."
            />
            <div className="flex gap-2">
              <button
                onClick={() => onHoPDecision(deliverable.id, 'approved', notes)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                ✓ Approve
              </button>
              <button
                onClick={() => onHoPDecision(deliverable.id, 'returned', notes)}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
              >
                ↩ Return
              </button>
              <button
                onClick={() => onHoPDecision(deliverable.id, 'rejected', notes)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                ✗ Reject
              </button>
            </div>
          </div>
        )}

        {/* Audit Trail */}
        <div className="border-t pt-4 mt-4">
          <AuditTrail 
            auditTrail={auditTrail} 
            entityType="deliverable" 
            userRole={user?.role} 
          />
        </div>

        <div className="flex justify-end pt-4 border-t mt-4">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg">Close</button>
        </div>
      </div>
    </div>
  );
};

export default Deliverables;
