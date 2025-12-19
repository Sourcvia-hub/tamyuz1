import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { useToast } from '../hooks/use-toast';
import SearchableSelect from '../components/SearchableSelect';

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
  
  // Modals
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  
  // Form states
  const [proposalForm, setProposalForm] = useState({ vendor_id: '', technical_proposal: '', financial_proposal: '' });
  const [selectedApproverId, setSelectedApproverId] = useState(null);
  const [forwardNotes, setForwardNotes] = useState('');

  useEffect(() => {
    fetchTender();
    fetchVendors();
    fetchProposalsForUser();
    fetchWorkflowStatus();
  }, [id]);

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

  const isOfficer = user?.role && ['procurement_officer', 'procurement_manager', 'admin'].includes(user.role);
  const isHoP = user?.role && ['procurement_manager', 'admin'].includes(user.role);
  const isCreator = tender?.created_by === user?.id;

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
    if (!selectedApproverId || !selectedApproverId.value) {
      toast({ title: "⚠️ Select Approver", description: "Please select an approver", variant: "warning" });
      return;
    }
    try {
      await axios.post(`${API}/business-requests/${id}/forward-to-approver`, {
        approver_user_id: selectedApproverId.value,
        notes: forwardNotes || ''
      }, { withCredentials: true });
      toast({ title: "✅ Forwarded", description: "Request forwarded to approver", variant: "success" });
      setShowForwardModal(false);
      fetchTender();
      fetchWorkflowStatus();
    } catch (error) {
      const errorDetail = error.response?.data?.detail;
      const errorMessage = typeof errorDetail === 'string' 
        ? errorDetail 
        : Array.isArray(errorDetail) 
          ? errorDetail.map(e => e.msg).join(', ')
          : "Failed to forward";
      toast({ title: "❌ Error", description: errorMessage, variant: "destructive" });
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
      toast({ title: "❌ Error", description: error.response?.data?.detail || "Failed to forward", variant: "destructive" });
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
      toast({ title: "❌ Error", description: error.response?.data?.detail || "Failed to process", variant: "destructive" });
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
      toast({ title: "❌ Error", description: error.response?.data?.detail || "Failed to process", variant: "destructive" });
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      published: 'bg-blue-100 text-blue-800',
      pending_evaluation: 'bg-yellow-100 text-yellow-800',
      evaluation_complete: 'bg-indigo-100 text-indigo-800',
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

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Available Actions</h3>
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
            
            {/* Officer: Forward to Additional Approver */}
            {isOfficer && tender.status === 'evaluation_complete' && (
              <button
                onClick={() => { fetchApprovers(); setShowForwardModal(true); }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                👤 Forward to Approver
              </button>
            )}
            
            {/* Officer: Forward to HoP */}
            {isOfficer && tender.status === 'evaluation_complete' && (
              <button
                onClick={handleForwardToHoP}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                📤 Forward to HoP
              </button>
            )}
            
            {/* Additional Approver: Approve/Reject */}
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
          
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Business Need</h3>
            <p className="text-gray-700">{tender.description}</p>
          </div>
          
          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold mb-2">Requirements</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{tender.requirements}</p>
          </div>
        </div>

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
      </div>
    </Layout>
  );
};

export default TenderDetail;
