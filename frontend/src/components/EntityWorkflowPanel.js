import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useToast } from '../hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Helper to extract error message
const getErrorMessage = (error, defaultMsg = "An error occurred") => {
  const detail = error.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map(e => e.msg || e).join(', ');
  return defaultMsg;
};

/**
 * EntityWorkflowPanel - Reusable workflow component for all entities
 * 
 * Props:
 * - entityType: 'contract' | 'po' | 'resource' | 'asset' | 'vendor' | 'deliverable'
 * - entityId: string
 * - entityTitle: string (for display)
 * - onStatusChange: callback when workflow status changes
 * - showAuditTrail: boolean (default true)
 */
const EntityWorkflowPanel = ({ 
  entityType, 
  entityId, 
  entityTitle,
  onStatusChange,
  showAuditTrail = true 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [workflowStatus, setWorkflowStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeUsers, setActiveUsers] = useState([]);
  
  // Modals
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReviewers, setSelectedReviewers] = useState([]);
  const [reviewNotes, setReviewNotes] = useState('');
  const [hopNotes, setHopNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isOfficer = ['procurement_officer', 'procurement_manager', 'admin', 'hop'].includes(user?.role);
  const isHoP = ['procurement_manager', 'admin', 'hop'].includes(user?.role);

  // Fetch workflow status
  const fetchWorkflowStatus = async () => {
    try {
      const res = await axios.get(
        `${API}/entity-workflow/${entityType}/${entityId}/workflow-status`,
        { withCredentials: true }
      );
      setWorkflowStatus(res.data);
    } catch (error) {
      console.error('Failed to fetch workflow status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch active users for review selection
  const fetchActiveUsers = async () => {
    try {
      const res = await axios.get(`${API}/entity-workflow/active-users`, { withCredentials: true });
      setActiveUsers(res.data.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  useEffect(() => {
    if (entityId) {
      fetchWorkflowStatus();
    }
  }, [entityId, entityType]);

  // Forward for review
  const handleForwardForReview = async () => {
    if (selectedReviewers.length === 0) {
      toast({ title: "⚠️ Warning", description: "Select at least one reviewer", variant: "warning" });
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(
        `${API}/entity-workflow/${entityType}/${entityId}/forward-for-review`,
        { reviewer_user_ids: selectedReviewers, notes: reviewNotes },
        { withCredentials: true }
      );
      toast({ title: "✅ Forwarded", description: `Sent to ${selectedReviewers.length} reviewer(s)`, variant: "success" });
      setShowReviewModal(false);
      setSelectedReviewers([]);
      setReviewNotes('');
      fetchWorkflowStatus();
      onStatusChange?.();
    } catch (error) {
      toast({ title: "❌ Error", description: getErrorMessage(error, "Failed to forward"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Reviewer decision
  const handleReviewerDecision = async (decision) => {
    setSubmitting(true);
    try {
      await axios.post(
        `${API}/entity-workflow/${entityType}/${entityId}/reviewer-decision`,
        { decision, notes: '' },
        { withCredentials: true }
      );
      toast({ 
        title: decision === 'validated' ? "✅ Validated" : "↩ Returned", 
        description: decision === 'validated' ? "Review validated" : "Returned for revision",
        variant: decision === 'validated' ? "success" : "warning"
      });
      fetchWorkflowStatus();
      onStatusChange?.();
    } catch (error) {
      toast({ title: "❌ Error", description: getErrorMessage(error, "Failed to submit review"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Forward to HoP
  const handleForwardToHoP = async () => {
    setSubmitting(true);
    try {
      await axios.post(
        `${API}/entity-workflow/${entityType}/${entityId}/forward-to-hop`,
        { notes: hopNotes },
        { withCredentials: true }
      );
      toast({ title: "📤 Forwarded", description: "Sent to HoP for final approval", variant: "success" });
      setHopNotes('');
      fetchWorkflowStatus();
      onStatusChange?.();
    } catch (error) {
      toast({ title: "❌ Error", description: getErrorMessage(error, "Failed to forward to HoP"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // HoP decision
  const handleHoPDecision = async (decision) => {
    setSubmitting(true);
    try {
      await axios.post(
        `${API}/entity-workflow/${entityType}/${entityId}/hop-decision`,
        { decision, notes: '' },
        { withCredentials: true }
      );
      toast({ 
        title: decision === 'approved' ? "✅ Approved" : "❌ Rejected", 
        description: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${decision}`,
        variant: decision === 'approved' ? "success" : "destructive"
      });
      fetchWorkflowStatus();
      onStatusChange?.();
    } catch (error) {
      toast({ title: "❌ Error", description: getErrorMessage(error, "Failed to process decision"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle reviewer selection
  const toggleReviewer = (userId) => {
    setSelectedReviewers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Get status badge color
  const getStatusBadge = (status) => {
    const colors = {
      pending_review: 'bg-cyan-100 text-cyan-800',
      review_complete: 'bg-teal-100 text-teal-800',
      pending_hop_approval: 'bg-orange-100 text-orange-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      returned_for_revision: 'bg-amber-100 text-amber-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending_review: 'Pending Review',
      review_complete: 'Review Complete',
      pending_hop_approval: 'Pending HoP Approval',
      approved: 'Approved',
      rejected: 'Rejected',
      returned_for_revision: 'Returned for Revision'
    };
    return labels[status] || status || 'Not Started';
  };

  if (loading) {
    return <div className="bg-white rounded-lg shadow p-4">Loading workflow...</div>;
  }

  if (!workflowStatus?.requires_workflow) {
    return null; // Don't show workflow panel if not required
  }

  const actions = workflowStatus?.actions || {};
  const currentStatus = workflowStatus?.workflow_status;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">📋 Approval Workflow</h3>
        {currentStatus && (
          <span className={`px-3 py-1 rounded-full text-sm ${getStatusBadge(currentStatus)}`}>
            {getStatusLabel(currentStatus)}
          </span>
        )}
      </div>

      {/* Reviewers Status */}
      {workflowStatus?.reviewers?.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium mb-2">Reviewers:</p>
          <div className="flex flex-wrap gap-2">
            {workflowStatus.reviewers.map((r, idx) => (
              <span key={idx} className={`px-2 py-1 rounded text-xs ${
                r.status === 'validated' ? 'bg-green-100 text-green-700' :
                r.status === 'returned' ? 'bg-amber-100 text-amber-700' :
                'bg-gray-200 text-gray-600'
              }`}>
                {r.user_name} ({r.status})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* HoP Decision Info */}
      {workflowStatus?.hop_decision && (
        <div className={`mb-4 p-3 rounded-lg ${
          workflowStatus.hop_decision === 'approved' ? 'bg-green-50' : 'bg-red-50'
        }`}>
          <p className="text-sm">
            <strong>HoP Decision:</strong> {workflowStatus.hop_decision.toUpperCase()}
            {workflowStatus.hop_decision_notes && ` - ${workflowStatus.hop_decision_notes}`}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {/* Officer: Forward for Review */}
        {isOfficer && actions.can_forward_for_review && (
          <button
            onClick={() => { fetchActiveUsers(); setShowReviewModal(true); }}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-sm"
            disabled={submitting}
          >
            👥 Forward for Review
          </button>
        )}

        {/* Officer: Forward to HoP (skip review) */}
        {isOfficer && actions.can_forward_to_hop && (
          <button
            onClick={handleForwardToHoP}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
            disabled={submitting}
          >
            📤 Forward to HoP
          </button>
        )}

        {/* Reviewer: Validate/Return */}
        {actions.can_review && (
          <>
            <button
              onClick={() => handleReviewerDecision('validated')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              disabled={submitting}
            >
              ✓ Validate
            </button>
            <button
              onClick={() => handleReviewerDecision('returned')}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm"
              disabled={submitting}
            >
              ↩ Return
            </button>
          </>
        )}

        {/* HoP: Approve/Reject */}
        {actions.can_hop_decide && (
          <>
            <button
              onClick={() => handleHoPDecision('approved')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              disabled={submitting}
            >
              ✓ Approve
            </button>
            <button
              onClick={() => handleHoPDecision('rejected')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              disabled={submitting}
            >
              ✗ Reject
            </button>
          </>
        )}
      </div>

      {/* Audit Trail */}
      {showAuditTrail && workflowStatus?.audit_trail?.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm font-medium mb-2">Workflow History:</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {workflowStatus.audit_trail.map((entry, idx) => (
              <div key={idx} className="text-xs text-gray-600">
                <span className="text-gray-400">{entry.timestamp?.substring(0, 10)}</span>
                {' '}
                <span className="font-medium">{entry.action?.replace(/_/g, ' ')}</span>
                {entry.notes && <span>: {entry.notes.substring(0, 50)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Forward for Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">👥 Forward for Review</h2>
            <p className="text-sm text-gray-600 mb-4">
              Select users to review this {entityType}. All selected reviewers will receive a notification.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Select Reviewers ({selectedReviewers.length} selected)
              </label>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                {activeUsers.map(u => (
                  <label key={u.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedReviewers.includes(u.id)}
                      onChange={() => toggleReviewer(u.id)}
                      className="rounded"
                    />
                    <span className="flex-1">{u.name || u.email}</span>
                    <span className="text-xs text-gray-500">({u.role})</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Notes (optional)</label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
                placeholder="Add notes for reviewers..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowReviewModal(false); setSelectedReviewers([]); setReviewNotes(''); }}
                className="px-4 py-2 border rounded-lg"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleForwardForReview}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50"
                disabled={submitting || selectedReviewers.length === 0}
              >
                {submitting ? 'Forwarding...' : 'Forward for Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EntityWorkflowPanel;
