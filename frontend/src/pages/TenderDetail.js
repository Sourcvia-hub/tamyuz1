import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { useToast } from '../hooks/use-toast';
import SearchableSelect from '../components/SearchableSelect';
import AuditTrail from '../components/AuditTrail';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Helper to extract error message from API response
const getErrorMessage = (error, defaultMsg = "An error occurred") => {
  const detail = error.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map(e => e.msg || e).join(', ');
  return defaultMsg;
};

const TenderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [tender, setTender] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [workflowStatus, setWorkflowStatus] = useState(null);
  const [approvers, setApprovers] = useState([]);
  const [evaluationData, setEvaluationData] = useState(null);
  const [auditTrail, setAuditTrail] = useState([]);
  
  // Modals
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [selectedProposalForEdit, setSelectedProposalForEdit] = useState(null);
  
  // Officer Edit Modal (Change 2 - Partial Update)
  const [showOfficerEditModal, setShowOfficerEditModal] = useState(false);
  const [officerEditForm, setOfficerEditForm] = useState({
    budget: '',
    request_type: '',
    jira_ticket_number: '',
    invited_vendors: []
  });
  const [officerEditLoading, setOfficerEditLoading] = useState(false);
  
  // Enhanced Workflow Modals
  const [showUpdateEvaluationModal, setShowUpdateEvaluationModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [selectedReviewers, setSelectedReviewers] = useState([]);
  const [selectedApprovers, setSelectedApprovers] = useState([]);
  const [workflowNotes, setWorkflowNotes] = useState('');
  const [updateEvalForm, setUpdateEvalForm] = useState({
    evaluation_notes: '',
    recommendation: ''
  });
  
  // Form states
  const [proposalForm, setProposalForm] = useState({ vendor_id: '', technical_proposal: '', financial_proposal: '' });
  const [selectedApproverId, setSelectedApproverId] = useState(null);
  const [forwardNotes, setForwardNotes] = useState('');
  const [evaluationForm, setEvaluationForm] = useState({
    vendor_reliability_stability: 3,
    delivery_warranty_backup: 3,
    technical_experience: 3,
    cost_score: 3,
    meets_requirements: 3,
  });

  useEffect(() => {
    fetchTender();
    fetchVendors();
    fetchProposalsForUser();
    fetchWorkflowStatus();
    fetchAuditTrail();
  }, [id]);

  // Fetch evaluation data for officers/approvers
  useEffect(() => {
    if (tender && (isOfficer || isAdditionalApprover) && ['evaluation_complete', 'pending_additional_approval', 'pending_hop_approval'].includes(tender.status)) {
      fetchEvaluationData();
    }
  }, [tender?.status]);

  const fetchAuditTrail = async () => {
    try {
      const res = await axios.get(`${API}/tenders/${id}/audit-trail`, { withCredentials: true });
      setAuditTrail(res.data);
    } catch (error) {
      console.log('Audit trail not available or access denied');
    }
  };

  const fetchEvaluationData = async () => {
    try {
      const res = await axios.post(`${API}/tenders/${id}/evaluate`, {}, { withCredentials: true });
      setEvaluationData(res.data);
    } catch (error) {
      console.error('Error fetching evaluation data:', error);
    }
  };

  const fetchTender = async () => {
    try {
      const response = await axios.get(`${API}/tenders/${id}`, { withCredentials: true });
      setTender(response.data);
    } catch (error) {
      console.error('Error fetching tender:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await axios.get(`${API}/vendors?status=approved`, { withCredentials: true });
      setVendors(response.data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchProposalsForUser = async () => {
    try {
      // First try the new endpoint that shows proposals to the requester
      const response = await axios.get(`${API}/business-requests/${id}/proposals-for-user`, { withCredentials: true });
      console.log('Proposals fetched from business-requests endpoint:', response.data);
      setProposals(response.data.proposals || []);
    } catch (error) {
      console.log('Falling back to regular proposals endpoint:', error.message);
      // Fallback to regular proposals endpoint
      try {
        const response = await axios.get(`${API}/tenders/${id}/proposals`, { withCredentials: true });
        console.log('Proposals fetched from tenders endpoint:', response.data);
        setProposals(response.data || []);
      } catch (e) {
        console.error('Error fetching proposals:', e);
        setProposals([]);
      }
    }
  };

  const fetchWorkflowStatus = async () => {
    try {
      const response = await axios.get(`${API}/business-requests/${id}/workflow-status`, { withCredentials: true });
      setWorkflowStatus(response.data);
    } catch (error) {
      console.error('Error fetching workflow status:', error);
    }
  };

  const fetchApprovers = async () => {
    try {
      const response = await axios.get(`${API}/business-requests/approvers-list`, { withCredentials: true });
      setApprovers(response.data.approvers || []);
    } catch (error) {
      console.error('Error fetching approvers:', error);
    }
  };

  const isOfficer = user?.role && ['procurement_officer', 'procurement_manager', 'admin', 'hop'].includes(user.role);
  const isHoP = user?.role && ['procurement_manager', 'admin', 'hop'].includes(user.role);
  const isCreator = tender?.created_by === user?.id;
  const isAdditionalApprover = tender?.additional_approver_id === user?.id;
  const canViewEvaluation = isOfficer || isAdditionalApprover || isHoP;
  const canAmendEvaluation = (isOfficer || isAdditionalApprover) && 
    ['evaluation_complete', 'pending_additional_approval'].includes(tender?.status);
  
  // Officer can perform partial updates without resetting workflow
  const canOfficerEdit = isOfficer;

  // Open Officer Edit Modal with current values
  const openOfficerEditModal = () => {
    if (tender) {
      setOfficerEditForm({
        budget: tender.budget || '',
        request_type: tender.request_type || '',
        jira_ticket_number: tender.jira_ticket_number || '',
        invited_vendors: tender.invited_vendors || []
      });
      setShowOfficerEditModal(true);
    }
  };

  // Handle Officer Partial Update (no workflow reset)
  const handleOfficerUpdate = async (e) => {
    e.preventDefault();
    setOfficerEditLoading(true);
    
    try {
      // Only send fields that have values
      const updateData = {};
      if (officerEditForm.budget) updateData.budget = parseFloat(officerEditForm.budget);
      if (officerEditForm.request_type) updateData.request_type = officerEditForm.request_type;
      if (officerEditForm.jira_ticket_number !== undefined) updateData.jira_ticket_number = officerEditForm.jira_ticket_number;
      
      // Ensure invited_vendors is always an array
      if (officerEditForm.invited_vendors !== undefined) {
        updateData.invited_vendors = Array.isArray(officerEditForm.invited_vendors) 
          ? officerEditForm.invited_vendors 
          : [];
      }
      
      await axios.patch(`${API}/tenders/${id}/officer-update`, updateData, { withCredentials: true });
      
      toast({
        title: "Success",
        description: "Business case updated successfully (no workflow reset)",
      });
      
      setShowOfficerEditModal(false);
      fetchTender(); // Refresh data
      fetchAuditTrail(); // Refresh audit trail
    } catch (error) {
      console.error('Error updating tender:', error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to update business case"),
        variant: "destructive"
      });
    } finally {
      setOfficerEditLoading(false);
    }
  };

  // Open evaluation edit modal
  const handleEditEvaluation = (proposal) => {
    setSelectedProposalForEdit(proposal);
    const evaluation = proposal.evaluation || {};
    setEvaluationForm({
      vendor_reliability_stability: evaluation.vendor_reliability_stability || 3,
      delivery_warranty_backup: evaluation.delivery_warranty_backup || 3,
      technical_experience: evaluation.technical_experience || 3,
      cost_score: evaluation.cost_score || proposal.suggested_cost_score || 3,
      meets_requirements: evaluation.meets_requirements || 3,
    });
    setShowEvaluationModal(true);
  };

  // Submit amended evaluation
  const handleSubmitEvaluation = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/tenders/${id}/proposals/${selectedProposalForEdit.proposal_id}/evaluate`, 
        evaluationForm, 
        { withCredentials: true }
      );
      toast({ title: "✅ Evaluation Updated", description: "Proposal evaluation has been amended", variant: "success" });
      setShowEvaluationModal(false);
      setSelectedProposalForEdit(null);
      fetchProposalsForUser();
      fetchEvaluationData();
    } catch (error) {
      toast({ title: "❌ Error", description: getErrorMessage(error, "Failed to update evaluation"), variant: "destructive" });
    }
  };

  // Submit new proposal (officer only)
  const handleSubmitProposal = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/tenders/${id}/proposals`, {
        vendor_id: proposalForm.vendor_id,
        technical_proposal: proposalForm.technical_proposal,
        financial_proposal: parseFloat(proposalForm.financial_proposal),
        documents: []
      }, { withCredentials: true });
      toast({ title: "✅ Proposal Added", description: "Proposal has been added successfully", variant: "success" });
      setShowProposalModal(false);
      setProposalForm({ vendor_id: '', technical_proposal: '', financial_proposal: '' });
      fetchProposalsForUser();
    } catch (error) {
      toast({ title: "❌ Error", description: getErrorMessage(error, "Failed to add proposal"), variant: "destructive" });
    }
  };

  // Forward to additional approver
  const handleForwardToApprover = async () => {
    if (!selectedApproverId) {
      toast({ title: "⚠️ Select Approver", description: "Please select an approver", variant: "warning" });
      return;
    }
    try {
      await axios.post(`${API}/business-requests/${id}/forward-to-approver`, {
        approver_user_id: selectedApproverId,
        notes: forwardNotes || ''
      }, { withCredentials: true });
      toast({ title: "✅ Forwarded", description: "Request forwarded to approver", variant: "success" });
      setShowForwardModal(false);
      setSelectedApproverId(null);
      setForwardNotes('');
      fetchTender();
      fetchWorkflowStatus();
    } catch (error) {
      toast({ title: "❌ Error", description: getErrorMessage(error, "Failed to forward"), variant: "destructive" });
    }
  };

  // Forward to HoP
  const handleForwardToHoP = async () => {
    try {
      await axios.post(`${API}/business-requests/${id}/forward-to-hop`, {
        notes: ''
      }, { withCredentials: true });
      toast({ title: "✅ Forwarded to HoP", description: "Request sent for final approval", variant: "success" });
      fetchTender();
      fetchWorkflowStatus();
    } catch (error) {
      toast({ title: "❌ Error", description: getErrorMessage(error, "Failed to forward"), variant: "destructive" });
    }
  };

  // Additional approver decision
  const handleAdditionalApproverDecision = async (decision) => {
    try {
      await axios.post(`${API}/business-requests/${id}/additional-approver-decision`, {
        decision,
        notes: ''
      }, { withCredentials: true });
      toast({ title: decision === 'approved' ? "✅ Approved" : "❌ Rejected", description: `Request ${decision}`, variant: decision === 'approved' ? "success" : "warning" });
      fetchTender();
      fetchWorkflowStatus();
    } catch (error) {
      toast({ title: "❌ Error", description: getErrorMessage(error, "Failed to process"), variant: "destructive" });
    }
  };

  // HoP decision
  const handleHoPDecision = async (decision) => {
    try {
      await axios.post(`${API}/business-requests/${id}/hop-decision`, {
        decision,
        notes: ''
      }, { withCredentials: true });
      toast({ title: decision === 'approved' ? "✅ Approved" : "❌ Rejected", description: `Business Request ${decision}. ${decision === 'approved' ? 'Contract created.' : ''}`, variant: decision === 'approved' ? "success" : "warning" });
      fetchTender();
      fetchWorkflowStatus();
    } catch (error) {
      toast({ title: "❌ Error", description: getErrorMessage(error, "Failed to process"), variant: "destructive" });
    }
  };

  // ==================== ENHANCED WORKFLOW HANDLERS ====================

  // Fetch active users for review/approval assignment
  const fetchActiveUsers = async () => {
    try {
      const response = await axios.get(`${API}/business-requests/active-users-list`, { withCredentials: true });
      setActiveUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching active users:', error);
      // Fallback to approvers list
      fetchApprovers();
      setActiveUsers(approvers);
    }
  };

  // Update evaluation
  const handleUpdateEvaluation = async () => {
    try {
      await axios.post(`${API}/business-requests/${id}/update-evaluation`, {
        evaluation_notes: updateEvalForm.evaluation_notes || undefined,
        recommendation: updateEvalForm.recommendation || undefined
      }, { withCredentials: true });
      toast({ title: "✅ Updated", description: "Evaluation updated successfully", variant: "success" });
      setShowUpdateEvaluationModal(false);
      setUpdateEvalForm({ evaluation_notes: '', recommendation: '' });
      fetchTender();
      fetchWorkflowStatus();
      fetchAuditTrail();
    } catch (error) {
      toast({ title: "❌ Error", description: getErrorMessage(error, "Failed to update evaluation"), variant: "destructive" });
    }
  };

  // Forward for review (multiple reviewers)
  const handleForwardForReview = async () => {
    if (selectedReviewers.length === 0) {
      toast({ title: "⚠️ Select Reviewers", description: "Please select at least one reviewer", variant: "warning" });
      return;
    }
    try {
      await axios.post(`${API}/business-requests/${id}/forward-for-review`, {
        reviewer_user_ids: selectedReviewers,
        notes: workflowNotes
      }, { withCredentials: true });
      toast({ title: "✅ Forwarded", description: `Sent to ${selectedReviewers.length} reviewer(s) for review`, variant: "success" });
      setShowReviewModal(false);
      setSelectedReviewers([]);
      setWorkflowNotes('');
      fetchTender();
      fetchWorkflowStatus();
      fetchAuditTrail();
    } catch (error) {
      toast({ title: "❌ Error", description: getErrorMessage(error, "Failed to forward for review"), variant: "destructive" });
    }
  };

  // Forward for approval (multiple approvers - parallel)
  const handleForwardForApproval = async () => {
    if (selectedApprovers.length === 0) {
      toast({ title: "⚠️ Select Approvers", description: "Please select at least one approver", variant: "warning" });
      return;
    }
    try {
      await axios.post(`${API}/business-requests/${id}/forward-for-approval`, {
        approver_user_ids: selectedApprovers,
        notes: workflowNotes
      }, { withCredentials: true });
      toast({ title: "✅ Forwarded", description: `Sent to ${selectedApprovers.length} approver(s) for approval`, variant: "success" });
      setShowApprovalModal(false);
      setSelectedApprovers([]);
      setWorkflowNotes('');
      fetchTender();
      fetchWorkflowStatus();
      fetchAuditTrail();
    } catch (error) {
      toast({ title: "❌ Error", description: getErrorMessage(error, "Failed to forward for approval"), variant: "destructive" });
    }
  };

  // Reviewer decision
  const handleReviewerDecision = async (decision) => {
    try {
      await axios.post(`${API}/business-requests/${id}/reviewer-decision`, {
        decision,
        notes: ''
      }, { withCredentials: true });
      toast({ 
        title: decision === 'validated' ? "✅ Validated" : "↩ Returned", 
        description: decision === 'validated' ? "Review validated" : "Returned to officer for revision",
        variant: decision === 'validated' ? "success" : "warning"
      });
      fetchTender();
      fetchWorkflowStatus();
      fetchAuditTrail();
    } catch (error) {
      toast({ title: "❌ Error", description: getErrorMessage(error, "Failed to submit review"), variant: "destructive" });
    }
  };

  // Approver decision
  const handleApproverDecision = async (decision) => {
    try {
      await axios.post(`${API}/business-requests/${id}/approver-decision`, {
        decision,
        notes: ''
      }, { withCredentials: true });
      const titles = { approved: "✅ Approved", rejected: "❌ Rejected", returned: "↩ Returned" };
      toast({ 
        title: titles[decision] || decision, 
        description: `Decision: ${decision}`,
        variant: decision === 'approved' ? "success" : decision === 'rejected' ? "destructive" : "warning"
      });
      fetchTender();
      fetchWorkflowStatus();
      fetchAuditTrail();
    } catch (error) {
      toast({ title: "❌ Error", description: getErrorMessage(error, "Failed to submit decision"), variant: "destructive" });
    }
  };

  // Skip directly to HoP
  const handleSkipToHoP = async () => {
    if (!window.confirm('Are you sure you want to skip review/approval and send directly to HoP?')) return;
    try {
      await axios.post(`${API}/business-requests/${id}/skip-to-hop`, {
        notes: 'Skipped to HoP'
      }, { withCredentials: true });
      toast({ title: "⏭️ Skipped to HoP", description: "Request sent directly to HoP for final approval", variant: "success" });
      fetchTender();
      fetchWorkflowStatus();
      fetchAuditTrail();
    } catch (error) {
      toast({ title: "❌ Error", description: getErrorMessage(error, "Failed to skip to HoP"), variant: "destructive" });
    }
  };

  // Toggle user selection for reviewers
  const toggleReviewer = (userId) => {
    setSelectedReviewers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Toggle user selection for approvers
  const toggleApprover = (userId) => {
    setSelectedApprovers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getStatusBadge = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      published: 'bg-blue-100 text-blue-800',
      pending_evaluation: 'bg-yellow-100 text-yellow-800',
      evaluation_complete: 'bg-indigo-100 text-indigo-800',
      pending_review: 'bg-cyan-100 text-cyan-800',
      review_complete: 'bg-teal-100 text-teal-800',
      pending_approval: 'bg-violet-100 text-violet-800',
      approval_complete: 'bg-fuchsia-100 text-fuchsia-800',
      returned_for_revision: 'bg-amber-100 text-amber-800',
      pending_additional_approval: 'bg-purple-100 text-purple-800',
      pending_hop_approval: 'bg-orange-100 text-orange-800',
      awarded: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      closed: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: 'Draft',
      published: 'Published - Awaiting Evaluation',
      pending_evaluation: 'Pending Evaluation',
      evaluation_complete: 'Evaluation Complete',
      pending_review: 'Pending Review',
      review_complete: 'Review Complete',
      pending_approval: 'Pending Approval',
      approval_complete: 'Approval Complete',
      returned_for_revision: 'Returned for Revision',
      pending_additional_approval: 'Pending Additional Approval',
      pending_hop_approval: 'Pending HoP Approval',
      awarded: 'Awarded',
      rejected: 'Rejected',
      closed: 'Closed',
    };
    return labels[status] || status;
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

  if (!tender) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Business Request not found</h2>
          <button onClick={() => navigate('/tenders')} className="mt-4 text-blue-600 hover:text-blue-800">
            ← Back to Business Requests
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <button onClick={() => navigate('/tenders')} className="text-blue-600 hover:text-blue-800 font-medium">
            ← Back to Business Requests
          </button>
        </div>

        {/* Workflow Status Banner */}
        {workflowStatus && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">Workflow Status</h3>
                <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(tender.status)}`}>
                  {getStatusLabel(tender.status)}
                </span>
              </div>
              <div className="text-right">
                {workflowStatus.selected_proposal_id && (
                  <p className="text-sm text-blue-700">Recommended Proposal Selected ✓</p>
                )}
                {workflowStatus.additional_approver && (
                  <p className="text-sm text-purple-700">Approver: {workflowStatus.additional_approver}</p>
                )}
                {workflowStatus.auto_created_contract_id && (
                  <p className="text-sm text-green-700">Contract Auto-Created ✓</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Evaluation Workflow Panel */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">📋 Evaluation Workflow</h3>
          
          {/* Workflow Status Indicators */}
          {(tender.status !== 'draft' && tender.status !== 'published') && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex flex-wrap gap-2 text-sm">
                {tender.reviewers?.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Reviewers:</span>
                    {tender.reviewers.map((r, idx) => (
                      <span key={idx} className={`px-2 py-0.5 rounded ${
                        r.status === 'validated' ? 'bg-green-100 text-green-700' :
                        r.status === 'returned' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {r.user_name} ({r.status})
                      </span>
                    ))}
                  </div>
                )}
                {tender.approvers?.length > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="font-medium">Approvers:</span>
                    {tender.approvers.map((a, idx) => (
                      <span key={idx} className={`px-2 py-0.5 rounded ${
                        a.status === 'approved' ? 'bg-green-100 text-green-700' :
                        a.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        a.status === 'returned' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {a.user_name} ({a.status})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="flex flex-wrap gap-2">
            {/* Officer: Add Proposal */}
            {isOfficer && ['draft', 'published'].includes(tender.status) && (
              <button
                onClick={() => setShowProposalModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                + Add Proposal
              </button>
            )}
            
            {/* User: Evaluate Proposals - Link to full evaluation page */}
            {isCreator && ['published', 'pending_evaluation'].includes(tender.status) && proposals.length > 0 && (
              <button
                onClick={() => navigate(`/tenders/${id}/evaluate`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                📋 Evaluate All Proposals
              </button>
            )}
            
            {/* Officer: Update Evaluation */}
            {isOfficer && ['evaluation_complete', 'returned_for_revision', 'review_complete', 'approval_complete'].includes(tender.status) && (
              <button
                onClick={() => setShowUpdateEvaluationModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                ✏️ Update Evaluation
              </button>
            )}
            
            {/* Officer: Forward for Review */}
            {isOfficer && ['evaluation_complete', 'returned_for_revision'].includes(tender.status) && (
              <button
                onClick={() => { fetchActiveUsers(); setShowReviewModal(true); }}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
              >
                👥 Forward for Review
              </button>
            )}
            
            {/* Officer: Forward for Approval */}
            {isOfficer && ['evaluation_complete', 'review_complete', 'returned_for_revision'].includes(tender.status) && (
              <button
                onClick={() => { fetchActiveUsers(); setShowApprovalModal(true); }}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
              >
                ✅ Forward for Approval
              </button>
            )}
            
            {/* Officer: Skip to HoP */}
            {isOfficer && ['evaluation_complete', 'review_complete', 'approval_complete', 'returned_for_revision'].includes(tender.status) && (
              <button
                onClick={handleSkipToHoP}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                ⏭️ Skip to HoP
              </button>
            )}
            
            {/* Officer: Forward to HoP (after all approvals) */}
            {isOfficer && tender.status === 'approval_complete' && (
              <button
                onClick={handleForwardToHoP}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                📤 Forward to HoP
              </button>
            )}
            
            {/* Reviewer: Validate/Return */}
            {tender.status === 'pending_review' && tender.reviewers?.some(r => r.user_id === user?.id && r.status === 'pending') && (
              <>
                <button
                  onClick={() => handleReviewerDecision('validated')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  ✓ Validate
                </button>
                <button
                  onClick={() => handleReviewerDecision('returned')}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  ↩ Return to Officer
                </button>
              </>
            )}
            
            {/* Approver: Approve/Reject/Return */}
            {tender.status === 'pending_approval' && tender.approvers?.some(a => a.user_id === user?.id && a.status === 'pending') && (
              <>
                <button
                  onClick={() => handleApproverDecision('approved')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => handleApproverDecision('returned')}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  ↩ Return to Officer
                </button>
                <button
                  onClick={() => handleApproverDecision('rejected')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  ✗ Reject
                </button>
              </>
            )}
            
            {/* Legacy: Additional Approver */}
            {workflowStatus?.actions?.can_approve_as_additional && (
              <>
                <button
                  onClick={() => handleAdditionalApproverDecision('approved')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => handleAdditionalApproverDecision('rejected')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  ✗ Reject
                </button>
              </>
            )}
            
            {/* HoP: Final Decision */}
            {isHoP && tender.status === 'pending_hop_approval' && (
              <>
                <button
                  onClick={() => handleHoPDecision('approved')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  ✓ Final Approve
                </button>
                <button
                  onClick={() => handleHoPDecision('rejected')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  ✗ Final Reject
                </button>
              </>
            )}
          </div>
        </div>

        {/* Main Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{tender.title}</h1>
              <p className="text-blue-600 font-medium">#{tender.tender_number}</p>
              <p className="text-gray-600">{tender.project_name}</p>
            </div>
            {/* Officer Edit Button - Partial Update */}
            {canOfficerEdit && (
              <button
                onClick={openOfficerEditModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                ✏️ Edit Details
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-gray-500">Estimated Budget</label>
              <p className="text-lg font-semibold">{tender.budget?.toLocaleString()} SAR</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Deadline</label>
              <p className="text-lg font-semibold">{new Date(tender.deadline).toLocaleDateString()}</p>
            </div>
          </div>
          
          {/* Additional Details Row */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {tender.request_type && (
              <div>
                <label className="text-sm text-gray-500">Request Type</label>
                <p className="text-lg font-semibold capitalize">{tender.request_type}</p>
              </div>
            )}
            {tender.jira_ticket_number && (
              <div>
                <label className="text-sm text-gray-500">Jira Ticket</label>
                <p className="text-lg font-semibold">{tender.jira_ticket_number}</p>
              </div>
            )}
          </div>
          
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Business Need</h3>
            <p className="text-gray-700">{tender.description}</p>
          </div>
          
          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold mb-2">Requirements</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{tender.requirements}</p>
          </div>
        </div>

        {/* Evaluation Summary Section - Visible to officers and approvers */}
        {canViewEvaluation && evaluationData && evaluationData.proposals?.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                📊 Evaluation Summary
                <span className="text-sm font-normal text-gray-500">
                  ({evaluationData.proposals.filter(p => p.evaluated).length}/{evaluationData.proposals.length} evaluated)
                </span>
              </h2>
              {canAmendEvaluation && (
                <span className="text-sm text-blue-600">Click a proposal to amend evaluation</span>
              )}
            </div>

            {/* Evaluation Weights */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-sm text-gray-600 mb-2">Evaluation Criteria Weights</h3>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">Vendor Reliability: 20%</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">Delivery & Warranty: 20%</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">Technical Experience: 10%</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">Cost Score: 10%</span>
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">Meets Requirements: 40%</span>
              </div>
            </div>

            {/* Proposals Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left p-3 border">Vendor</th>
                    <th className="text-right p-3 border">Financial</th>
                    <th className="text-center p-3 border">Vendor Rel.</th>
                    <th className="text-center p-3 border">Delivery</th>
                    <th className="text-center p-3 border">Tech Exp.</th>
                    <th className="text-center p-3 border">Cost</th>
                    <th className="text-center p-3 border">Meets Req.</th>
                    <th className="text-center p-3 border">Total Score</th>
                    <th className="text-center p-3 border">Status</th>
                    {canAmendEvaluation && <th className="text-center p-3 border">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {evaluationData.proposals.map((proposal, idx) => {
                    const isRecommended = tender.selected_proposal_id === proposal.proposal_id;
                    return (
                      <tr key={proposal.proposal_id} className={`${isRecommended ? 'bg-green-50' : ''} hover:bg-gray-50`}>
                        <td className="p-3 border">
                          <div className="flex items-center gap-2">
                            {isRecommended && <span className="text-green-600">★</span>}
                            <span className="font-medium">{proposal.vendor_name || `Vendor ${idx + 1}`}</span>
                          </div>
                        </td>
                        <td className="text-right p-3 border font-medium">{proposal.financial_proposal?.toLocaleString()} SAR</td>
                        <td className="text-center p-3 border">{proposal.evaluation?.vendor_reliability_stability || '-'}</td>
                        <td className="text-center p-3 border">{proposal.evaluation?.delivery_warranty_backup || '-'}</td>
                        <td className="text-center p-3 border">{proposal.evaluation?.technical_experience || '-'}</td>
                        <td className="text-center p-3 border">{proposal.evaluation?.cost_score?.toFixed(1) || proposal.suggested_cost_score?.toFixed(1) || '-'}</td>
                        <td className="text-center p-3 border">{proposal.evaluation?.meets_requirements || '-'}</td>
                        <td className="text-center p-3 border">
                          <span className={`font-bold ${proposal.total_score > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                            {proposal.total_score > 0 ? proposal.total_score.toFixed(2) : '-'}
                          </span>
                        </td>
                        <td className="text-center p-3 border">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            proposal.evaluated ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {proposal.evaluated ? 'Evaluated' : 'Pending'}
                          </span>
                        </td>
                        {canAmendEvaluation && (
                          <td className="text-center p-3 border">
                            <button
                              onClick={() => handleEditEvaluation(proposal)}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                            >
                              {proposal.evaluated ? 'Edit' : 'Evaluate'}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* AI Recommendation if available */}
            {evaluationData.ai_recommendation && (
              <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-2">🤖 AI Recommendation</h3>
                <p className="text-purple-700">{evaluationData.ai_recommendation}</p>
              </div>
            )}
          </div>
        )}

        {/* Proposals Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">
            Proposals ({proposals.length})
            {!isOfficer && proposals.length === 0 && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                (Waiting for officer to add proposals)
              </span>
            )}
          </h2>
          
          {proposals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No proposals have been added yet.</p>
              {isOfficer && (
                <button
                  onClick={() => setShowProposalModal(true)}
                  className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg"
                >
                  + Add First Proposal
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {proposals.map((proposal) => {
                const vendor = proposal.vendor_info || vendors.find(v => v.id === proposal.vendor_id);
                const isSelected = tender.selected_proposal_id === proposal.id;
                return (
                  <div
                    key={proposal.id}
                    className={`border rounded-lg p-4 ${isSelected ? 'border-green-500 bg-green-50' : 'hover:border-blue-300'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">
                            {vendor?.name_english || vendor?.commercial_name || 'Unknown Vendor'}
                          </h3>
                          {isSelected && (
                            <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">#{proposal.proposal_number}</p>
                        <p className="text-sm mt-2">{proposal.technical_proposal}</p>
                        <p className="text-lg font-bold text-blue-600 mt-2">
                          {proposal.financial_proposal?.toLocaleString()} SAR
                        </p>
                      </div>
                      {proposal.evaluation?.total_score > 0 && (
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Evaluation Score</p>
                          <p className="text-2xl font-bold text-green-600">{proposal.evaluation.total_score.toFixed(1)}%</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Audit Trail */}
        <AuditTrail 
          auditTrail={auditTrail} 
          entityType="tender" 
          userRole={user?.role} 
        />

        {/* Add Proposal Modal */}
        {showProposalModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
              <h2 className="text-xl font-bold mb-4">Add Proposal</h2>
              <form onSubmit={handleSubmitProposal} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Vendor</label>
                  <select
                    value={proposalForm.vendor_id}
                    onChange={(e) => setProposalForm({ ...proposalForm, vendor_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="">Select vendor...</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name_english || v.commercial_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Technical Proposal</label>
                  <textarea
                    value={proposalForm.technical_proposal}
                    onChange={(e) => setProposalForm({ ...proposalForm, technical_proposal: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Financial Proposal (SAR)</label>
                  <input
                    type="number"
                    value={proposalForm.financial_proposal}
                    onChange={(e) => setProposalForm({ ...proposalForm, financial_proposal: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowProposalModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg">Add Proposal</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Forward to Approver Modal */}
        {showForwardModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
              <h2 className="text-xl font-bold mb-4">Forward to Additional Approver</h2>
              <p className="text-gray-600 mb-4">Select a user to approve this request before sending to HoP.</p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Select Approver</label>
                <SearchableSelect
                  options={approvers.map(a => ({ value: a.id, label: `${a.name || a.email} (${a.role})` }))}
                  value={selectedApproverId}
                  onChange={setSelectedApproverId}
                  placeholder="Search for approver..."
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                <textarea
                  value={forwardNotes}
                  onChange={(e) => setForwardNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowForwardModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button onClick={handleForwardToApprover} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
                  Forward
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Evaluation Modal */}
        {showEvaluationModal && selectedProposalForEdit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
              <h2 className="text-xl font-bold mb-2">
                {selectedProposalForEdit.evaluated ? 'Amend' : 'Submit'} Evaluation
              </h2>
              <p className="text-gray-600 mb-4">
                Vendor: <span className="font-semibold">{selectedProposalForEdit.vendor_name}</span> | 
                Financial: <span className="font-semibold">{selectedProposalForEdit.financial_proposal?.toLocaleString()} SAR</span>
              </p>
              
              <form onSubmit={handleSubmitEvaluation} className="space-y-4">
                {/* Vendor Reliability & Stability (20%) */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Vendor Reliability & Stability <span className="text-blue-600">(20%)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={evaluationForm.vendor_reliability_stability}
                      onChange={(e) => setEvaluationForm({ ...evaluationForm, vendor_reliability_stability: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="w-12 text-center font-bold text-lg">{evaluationForm.vendor_reliability_stability}</span>
                  </div>
                  <p className="text-xs text-gray-500">1=Poor, 5=Excellent</p>
                </div>

                {/* Delivery, Warranty & Backup (20%) */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Delivery, Warranty & Backup <span className="text-blue-600">(20%)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={evaluationForm.delivery_warranty_backup}
                      onChange={(e) => setEvaluationForm({ ...evaluationForm, delivery_warranty_backup: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="w-12 text-center font-bold text-lg">{evaluationForm.delivery_warranty_backup}</span>
                  </div>
                </div>

                {/* Technical Experience (10%) */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Technical Experience <span className="text-blue-600">(10%)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={evaluationForm.technical_experience}
                      onChange={(e) => setEvaluationForm({ ...evaluationForm, technical_experience: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="w-12 text-center font-bold text-lg">{evaluationForm.technical_experience}</span>
                  </div>
                </div>

                {/* Cost Score (10%) */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Cost Score <span className="text-blue-600">(10%)</span>
                    <span className="text-xs text-gray-500 ml-2">
                      (Suggested: {selectedProposalForEdit.suggested_cost_score?.toFixed(2) || 'N/A'})
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.1"
                      value={evaluationForm.cost_score}
                      onChange={(e) => setEvaluationForm({ ...evaluationForm, cost_score: parseFloat(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="w-12 text-center font-bold text-lg">{evaluationForm.cost_score?.toFixed(1)}</span>
                  </div>
                </div>

                {/* Meets Requirements (40%) */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Meets Requirements <span className="text-purple-600 font-semibold">(40%)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={evaluationForm.meets_requirements}
                      onChange={(e) => setEvaluationForm({ ...evaluationForm, meets_requirements: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="w-12 text-center font-bold text-lg">{evaluationForm.meets_requirements}</span>
                  </div>
                </div>

                {/* Calculated Score Preview */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Calculated Total Score:</p>
                  <p className="text-2xl font-bold text-green-600">
                    {(
                      evaluationForm.vendor_reliability_stability * 0.2 +
                      evaluationForm.delivery_warranty_backup * 0.2 +
                      evaluationForm.technical_experience * 0.1 +
                      evaluationForm.cost_score * 0.1 +
                      evaluationForm.meets_requirements * 0.4
                    ).toFixed(2)}
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button 
                    type="button" 
                    onClick={() => { setShowEvaluationModal(false); setSelectedProposalForEdit(null); }} 
                    className="px-4 py-2 border rounded-lg"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    {selectedProposalForEdit.evaluated ? 'Update Evaluation' : 'Submit Evaluation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Officer Edit Modal - Partial Update (No Workflow Reset) */}
        {showOfficerEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Edit Business Case</h2>
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">No Workflow Reset</span>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Update budget, type, Jira ticket, or vendors without affecting the approval workflow.
              </p>
              
              <form onSubmit={handleOfficerUpdate} className="space-y-4">
                {/* Budget */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget (SAR)</label>
                  <input
                    type="number"
                    value={officerEditForm.budget}
                    onChange={(e) => setOfficerEditForm({ ...officerEditForm, budget: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter budget amount"
                  />
                </div>
                
                {/* Request Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Request Type</label>
                  <select
                    value={officerEditForm.request_type}
                    onChange={(e) => setOfficerEditForm({ ...officerEditForm, request_type: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select type...</option>
                    <option value="technology">Technology</option>
                    <option value="services">Services</option>
                    <option value="goods">Goods</option>
                    <option value="construction">Construction</option>
                    <option value="consulting">Consulting</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                
                {/* Jira Ticket Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jira Ticket Number</label>
                  <input
                    type="text"
                    value={officerEditForm.jira_ticket_number}
                    onChange={(e) => setOfficerEditForm({ ...officerEditForm, jira_ticket_number: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., PROJ-123"
                  />
                </div>
                
                {/* Invited Vendors */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invited Vendors</label>
                  <SearchableSelect
                    options={vendors.map((vendor) => ({
                      value: vendor.id,
                      label: vendor.name_english || vendor.commercial_name || vendor.company_name || 'Unknown Vendor'
                    }))}
                    value={officerEditForm.invited_vendors}
                    onChange={(selected) => setOfficerEditForm({ ...officerEditForm, invited_vendors: selected })}
                    placeholder="Search and select vendors..."
                    isMulti
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Current: {officerEditForm.invited_vendors?.length || 0} vendors selected
                  </p>
                </div>
                
                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowOfficerEditModal(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    disabled={officerEditLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    disabled={officerEditLoading}
                  >
                    {officerEditLoading ? 'Updating...' : 'Update (No Reset)'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Update Evaluation Modal */}
        {showUpdateEvaluationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
              <h2 className="text-xl font-bold mb-4">✏️ Update Evaluation</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Evaluation Notes</label>
                  <textarea
                    value={updateEvalForm.evaluation_notes}
                    onChange={(e) => setUpdateEvalForm({...updateEvalForm, evaluation_notes: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                    placeholder="Add or update evaluation notes..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Recommendation</label>
                  <textarea
                    value={updateEvalForm.recommendation}
                    onChange={(e) => setUpdateEvalForm({...updateEvalForm, recommendation: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={2}
                    placeholder="Your recommendation..."
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setShowUpdateEvaluationModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                  <button onClick={handleUpdateEvaluation} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                    Update Evaluation
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Forward for Review Modal */}
        {showReviewModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">👥 Forward for Review</h2>
              <p className="text-sm text-gray-600 mb-4">Select users to review and validate this evaluation. All selected reviewers will receive a notification.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Select Reviewers ({selectedReviewers.length} selected)</label>
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
                <div>
                  <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                  <textarea
                    value={workflowNotes}
                    onChange={(e) => setWorkflowNotes(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={2}
                    placeholder="Add notes for reviewers..."
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => { setShowReviewModal(false); setSelectedReviewers([]); setWorkflowNotes(''); }} className="px-4 py-2 border rounded-lg">Cancel</button>
                  <button onClick={handleForwardForReview} className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700" disabled={selectedReviewers.length === 0}>
                    Forward for Review
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Forward for Approval Modal */}
        {showApprovalModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">✅ Forward for Approval</h2>
              <p className="text-sm text-gray-600 mb-4">Select approvers. <strong>All selected approvers must approve</strong> for the request to proceed (parallel approval).</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Select Approvers ({selectedApprovers.length} selected)</label>
                  <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                    {activeUsers.map(u => (
                      <label key={u.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedApprovers.includes(u.id)}
                          onChange={() => toggleApprover(u.id)}
                          className="rounded"
                        />
                        <span className="flex-1">{u.name || u.email}</span>
                        <span className="text-xs text-gray-500">({u.role})</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                  <textarea
                    value={workflowNotes}
                    onChange={(e) => setWorkflowNotes(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={2}
                    placeholder="Add notes for approvers..."
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => { setShowApprovalModal(false); setSelectedApprovers([]); setWorkflowNotes(''); }} className="px-4 py-2 border rounded-lg">Cancel</button>
                  <button onClick={handleForwardForApproval} className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700" disabled={selectedApprovers.length === 0}>
                    Forward for Approval
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default TenderDetail;
