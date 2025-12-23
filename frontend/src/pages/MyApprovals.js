import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { useToast } from '../hooks/use-toast';
import { getErrorMessage } from '../utils/errorUtils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MyApprovals = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [approvalHistory, setApprovalHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [processingItem, setProcessingItem] = useState(null);
  const [notesModal, setNotesModal] = useState({ open: false, item: null, action: null });
  const [notes, setNotes] = useState('');

  const isHoP = ['procurement_manager', 'admin', 'hop'].includes(user?.role);

  useEffect(() => {
    fetchPendingApprovals();
    fetchApprovalHistory();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      const response = await axios.get(`${API}/business-requests/my-pending-approvals`, { withCredentials: true });
      setPendingApprovals(response.data.notifications || []);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovalHistory = async () => {
    try {
      const response = await axios.get(`${API}/business-requests/approval-history`, { withCredentials: true });
      setApprovalHistory(response.data.history || []);
    } catch (error) {
      console.error('Error fetching approval history:', error);
    }
  };

  const handleApprove = async (notification) => {
    setProcessingItem(notification.id);
    try {
      if (notification.item_type === 'business_request') {
        await axios.post(`${API}/business-requests/${notification.item_id}/additional-approver-decision`, {
          decision: 'approved',
          notes: ''
        }, { withCredentials: true });
      } else if (notification.item_type === 'contract') {
        await axios.post(`${API}/contract-governance/hop-decision/${notification.item_id}`, {
          decision: 'approved',
          notes: ''
        }, { withCredentials: true });
      } else if (notification.item_type === 'deliverable') {
        await axios.post(`${API}/deliverables/${notification.item_id}/hop-decision`, {
          decision: 'approved',
          notes: ''
        }, { withCredentials: true });
      } else if (notification.item_type === 'asset') {
        await axios.post(`${API}/assets/${notification.item_id}/hop-decision`, {
          decision: 'approved',
          notes: ''
        }, { withCredentials: true });
      }
      toast({ title: "✅ Approved", description: "Request approved successfully", variant: "success" });
      fetchPendingApprovals();
      fetchApprovalHistory();
    } catch (error) {
      toast({ title: "❌ Error", description: getErrorMessage(error, "Failed to approve"), variant: "destructive" });
    } finally {
      setProcessingItem(null);
    }
  };

  const handleReject = async (notification) => {
    setProcessingItem(notification.id);
    try {
      if (notification.item_type === 'business_request') {
        await axios.post(`${API}/business-requests/${notification.item_id}/additional-approver-decision`, {
          decision: 'rejected',
          notes: notes || ''
        }, { withCredentials: true });
      } else if (notification.item_type === 'contract') {
        await axios.post(`${API}/contract-governance/hop-decision/${notification.item_id}`, {
          decision: 'rejected',
          notes: notes || ''
        }, { withCredentials: true });
      } else if (notification.item_type === 'deliverable') {
        await axios.post(`${API}/deliverables/${notification.item_id}/hop-decision`, {
          decision: 'rejected',
          notes: notes || ''
        }, { withCredentials: true });
      } else if (notification.item_type === 'asset') {
        await axios.post(`${API}/assets/${notification.item_id}/hop-decision`, {
          decision: 'rejected',
          notes: notes || ''
        }, { withCredentials: true });
      }
      toast({ title: "❌ Rejected", description: "Request rejected", variant: "warning" });
      setNotesModal({ open: false, item: null, action: null });
      setNotes('');
      fetchPendingApprovals();
      fetchApprovalHistory();
    } catch (error) {
      toast({ title: "❌ Error", description: getErrorMessage(error, "Failed to reject"), variant: "destructive" });
    } finally {
      setProcessingItem(null);
    }
  };

  const handleReturn = async (notification) => {
    setProcessingItem(notification.id);
    try {
      if (notification.item_type === 'contract') {
        await axios.post(`${API}/contract-governance/hop-decision/${notification.item_id}`, {
          decision: 'returned',
          notes: notes || ''
        }, { withCredentials: true });
      } else if (notification.item_type === 'deliverable') {
        await axios.post(`${API}/deliverables/${notification.item_id}/hop-decision`, {
          decision: 'returned',
          notes: notes || ''
        }, { withCredentials: true });
      } else if (notification.item_type === 'asset') {
        await axios.post(`${API}/assets/${notification.item_id}/hop-decision`, {
          decision: 'returned',
          notes: notes || ''
        }, { withCredentials: true });
      }
      toast({ title: "↩️ Returned", description: "Request returned for corrections", variant: "warning" });
      setNotesModal({ open: false, item: null, action: null });
      setNotes('');
      fetchPendingApprovals();
      fetchApprovalHistory();
    } catch (error) {
      toast({ title: "❌ Error", description: getErrorMessage(error, "Failed to return", variant: "destructive" });
    } finally {
      setProcessingItem(null);
    }
  };

  const openNotesModal = (item, action) => {
    setNotesModal({ open: true, item, action });
    setNotes('');
  };

  const executeModalAction = () => {
    if (notesModal.action === 'reject') {
      handleReject(notesModal.item);
    } else if (notesModal.action === 'return') {
      handleReturn(notesModal.item);
    }
  };

  const getItemTypeLabel = (type) => {
    const labels = {
      business_request: '📋 Business Request',
      contract: '📄 Contract',
      deliverable: '📦 Deliverable',
      asset: '🏢 Asset',
    };
    return labels[type] || type;
  };

  const getItemTypeIcon = (type) => {
    const icons = {
      business_request: '📋',
      contract: '📄',
      deliverable: '📦',
      asset: '🏢',
    };
    return icons[type] || '📝';
  };

  const getItemTypeColor = (type) => {
    const colors = {
      business_request: 'bg-blue-100 text-blue-800',
      contract: 'bg-purple-100 text-purple-800',
      deliverable: 'bg-green-100 text-green-800',
      asset: 'bg-orange-100 text-orange-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      returned: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const navigateToItem = (notification) => {
    switch (notification.item_type) {
      case 'business_request':
        navigate(`/tenders/${notification.item_id}`);
        break;
      case 'contract':
        navigate(`/contracts/${notification.item_id}`);
        break;
      case 'deliverable':
        navigate(`/deliverables`);
        break;
      case 'asset':
        navigate(`/assets/${notification.item_id}`);
        break;
      default:
        break;
    }
  };

  const filteredPending = pendingApprovals.filter(item => {
    if (selectedFilter === 'all') return true;
    return item.item_type === selectedFilter;
  });

  const itemTypeCounts = {
    all: pendingApprovals.length,
    business_request: pendingApprovals.filter(i => i.item_type === 'business_request').length,
    contract: pendingApprovals.filter(i => i.item_type === 'contract').length,
    deliverable: pendingApprovals.filter(i => i.item_type === 'deliverable').length,
    asset: pendingApprovals.filter(i => i.item_type === 'asset').length,
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
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Approvals</h1>
          <p className="text-gray-600">Review and approve requests assigned to you</p>
          {isHoP && (
            <div className="mt-2 px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full inline-block">
              👑 Head of Procurement - Full approval access
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-600">Total Pending</p>
            <p className="text-3xl font-bold text-yellow-700">{pendingApprovals.length}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-600">📋 PRs</p>
            <p className="text-3xl font-bold text-blue-700">{itemTypeCounts.business_request}</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-600">📄 Contracts</p>
            <p className="text-3xl font-bold text-purple-700">{itemTypeCounts.contract}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-600">📦 Deliverables</p>
            <p className="text-3xl font-bold text-green-700">{itemTypeCounts.deliverable}</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-600">🏢 Assets</p>
            <p className="text-3xl font-bold text-orange-700">{itemTypeCounts.asset}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b mb-4">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 font-medium ${activeTab === 'pending' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
          >
            Pending ({pendingApprovals.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 font-medium ${activeTab === 'history' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
          >
            History ({approvalHistory.length})
          </button>
        </div>

        {/* Filters for pending tab */}
        {activeTab === 'pending' && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {[
              { key: 'all', label: 'All' },
              { key: 'business_request', label: '📋 PRs' },
              { key: 'contract', label: '📄 Contracts' },
              { key: 'deliverable', label: '📦 Deliverables' },
              { key: 'asset', label: '🏢 Assets' },
            ].map(filter => (
              <button
                key={filter.key}
                onClick={() => setSelectedFilter(filter.key)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedFilter === filter.key 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter.label} ({itemTypeCounts[filter.key]})
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            {filteredPending.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                <p className="text-lg">🎉 No pending approvals!</p>
                <p className="text-sm mt-2">You are all caught up.</p>
              </div>
            ) : (
              filteredPending.map((notification) => (
                <div key={notification.id} className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getItemTypeColor(notification.item_type)}`}>
                          {getItemTypeLabel(notification.item_type)}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(notification.status)}`}>
                          {notification.status}
                        </span>
                        {notification.amount > 0 && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-800">
                            💰 {notification.amount?.toLocaleString()} SAR
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900">
                        {notification.item_title || notification.item_number}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                        <span>#{notification.item_number}</span>
                        {notification.vendor_name && <span>🏪 {notification.vendor_name}</span>}
                        <span>From: {notification.requested_by_name || 'Unknown'}</span>
                        <span>📅 {notification.requested_at ? new Date(notification.requested_at).toLocaleString() : 'N/A'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4 flex-wrap">
                      <button
                        onClick={() => navigateToItem(notification)}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleApprove(notification)}
                        disabled={processingItem === notification.id}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {processingItem === notification.id ? '...' : 'Approve'}
                      </button>
                      {['contract', 'deliverable', 'asset'].includes(notification.item_type) && (
                        <button
                          onClick={() => openNotesModal(notification, 'return')}
                          disabled={processingItem === notification.id}
                          className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
                        >
                          Return
                        </button>
                      )}
                      <button
                        onClick={() => openNotesModal(notification, 'reject')}
                        disabled={processingItem === notification.id}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            {approvalHistory.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                <p>No approval history yet.</p>
              </div>
            ) : (
              approvalHistory.map((notification) => (
                <div key={notification.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getItemTypeColor(notification.item_type)}`}>
                          {getItemTypeLabel(notification.item_type)}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(notification.status)}`}>
                          {notification.status}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900">
                        {notification.item_title || notification.item_number}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Decided on: {notification.decision_at ? new Date(notification.decision_at).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <button
                      onClick={() => navigateToItem(notification)}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Notes Modal */}
        {notesModal.open && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">
                {notesModal.action === 'reject' ? '❌ Reject Request' : '↩️ Return Request'}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {notesModal.action === 'reject' 
                  ? 'Please provide a reason for rejection (optional)'
                  : 'Please provide notes for returning this request (optional)'}
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg mb-4"
                rows={3}
                placeholder="Enter notes..."
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setNotesModal({ open: false, item: null, action: null })}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={executeModalAction}
                  disabled={processingItem}
                  className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                    notesModal.action === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-500 hover:bg-yellow-600'
                  }`}
                >
                  {processingItem ? 'Processing...' : notesModal.action === 'reject' ? 'Reject' : 'Return'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MyApprovals;
