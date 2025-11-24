import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App';
import FileUpload from '../components/FileUpload';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TenderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tender, setTender] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalForm, setProposalForm] = useState({
    vendor_id: '',
    technical_proposal: '',
    financial_proposal: ''
  });

  useEffect(() => {
    fetchTender();
    fetchVendors();
    fetchProposals();
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
      setVendors(response.data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchProposals = async () => {
    try {
      const response = await axios.get(`${API}/tenders/${id}/proposals`, { withCredentials: true });
      setProposals(response.data);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    }
  };

  const handleEdit = () => {
    setEditFormData({ 
      title: tender.title,
      description: tender.description,
      project_name: tender.project_name,
      requirements: tender.requirements,
      budget: tender.budget,
      deadline: new Date(tender.deadline).toISOString().split('T')[0],
      invited_vendors: tender.invited_vendors || []
    });
    setShowEditModal(true);
  };

  const handleUpdateTender = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        `${API}/tenders/${id}`,
        {
          ...editFormData,
          budget: parseFloat(editFormData.budget),
          deadline: new Date(editFormData.deadline).toISOString()
        },
        { withCredentials: true }
      );
      setShowEditModal(false);
      fetchTender();
      alert('Tender updated successfully!');
    } catch (error) {
      console.error('Error updating tender:', error);
      alert('Failed to update tender: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleSubmitProposal = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API}/tenders/${id}/proposals`,
        {
          vendor_id: proposalForm.vendor_id,
          technical_proposal: proposalForm.technical_proposal,
          financial_proposal: parseFloat(proposalForm.financial_proposal),
          documents: []
        },
        { withCredentials: true }
      );
      setShowProposalModal(false);
      setProposalForm({ vendor_id: '', technical_proposal: '', financial_proposal: '' });
      fetchProposals();
      alert('Proposal submitted successfully!');
    } catch (error) {
      console.error('Error submitting proposal:', error);
      const errorMessage = error.response?.data?.detail 
        || (typeof error.response?.data === 'string' ? error.response?.data : null)
        || error.message 
        || 'Unknown error occurred';
      alert('Failed to submit proposal: ' + errorMessage);
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      published: 'bg-green-100 text-green-800',
      closed: 'bg-yellow-100 text-yellow-800',
      awarded: 'bg-blue-100 text-blue-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
          <h2 className="text-2xl font-bold text-gray-900">Tender not found</h2>
          <button
            onClick={() => navigate('/tenders')}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            ← Back to Tenders
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <button
            onClick={() => navigate('/tenders')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Tenders
          </button>
          <div className="flex gap-3">
            {user?.role === 'procurement_officer' && tender?.status === 'published' && (
              <>
                <button
                  onClick={() => setShowProposalModal(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Submit Proposal
                </button>
                <button
                  onClick={() => navigate(`/tenders/${id}/evaluate`)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Go to Evaluation
                </button>
              </>
            )}
            {user?.role === 'procurement_officer' && (
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Tender
              </button>
            )}
          </div>
        </div>

        {/* Main Info Card */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{tender.title}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(tender.status)}`}>
                  {tender.status.toUpperCase()}
                </span>
              </div>
              {tender.tender_number && (
                <p className="text-sm text-blue-600 font-medium">#{tender.tender_number}</p>
              )}
              <p className="text-gray-600 mt-1">{tender.project_name}</p>
            </div>
          </div>

          {/* Key Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Budget</label>
                <p className="text-lg font-semibold text-gray-900">${tender.budget?.toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Deadline</label>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(tender.deadline).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Invited Vendors</label>
                <p className="text-lg font-semibold text-gray-900">
                  {tender.invited_vendors?.length || 0} vendors
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Proposals Received</label>
                <p className="text-lg font-semibold text-gray-900">
                  {proposals.length} proposals
                </p>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{tender.description}</p>
          </div>

          {/* Requirements Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Requirements</h3>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-gray-700 whitespace-pre-wrap">{tender.requirements}</p>
            </div>
          </div>

          {/* Timestamps */}
          <div className="border-t pt-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Created:</span> {new Date(tender.created_at).toLocaleString()}
              </div>
              <div>
                <span className="font-medium">Last Updated:</span> {new Date(tender.updated_at).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Proposals Section */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Proposals ({proposals.length})</h2>
          
          {proposals.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <p>No proposals have been submitted yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {proposals.map((proposal) => {
                const vendor = vendors.find(v => v.id === proposal.vendor_id);
                return (
                  <div key={proposal.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {vendor?.name_english || vendor?.commercial_name || 'Unknown Vendor'}
                        </h3>
                        {vendor?.vendor_number && (
                          <p className="text-xs text-blue-600 font-medium">#{vendor.vendor_number}</p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        proposal.status === 'approved' ? 'bg-green-100 text-green-800' :
                        proposal.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {proposal.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-gray-600">Financial Proposal</p>
                        <p className="text-lg font-semibold text-gray-900">${proposal.financial_proposal?.toLocaleString()}</p>
                      </div>
                      {proposal.evaluation?.total_score > 0 && (
                        <div>
                          <p className="text-sm text-gray-600">Total Score</p>
                          <p className="text-lg font-semibold text-gray-900">{proposal.evaluation.total_score.toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                    
                    <Link
                      to={`/tenders/${id}/evaluate`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View Details & Evaluate →
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Submit Proposal Modal */}
      {showProposalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Submit Proposal (on behalf of vendor)</h2>
            <form onSubmit={handleSubmitProposal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Vendor *</label>
                <select
                  value={proposalForm.vendor_id}
                  onChange={(e) => setProposalForm({ ...proposalForm, vendor_id: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select an invited vendor</option>
                  {vendors
                    .filter(vendor => tender?.invited_vendors?.includes(vendor.id))
                    .map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.vendor_number ? `${vendor.vendor_number} - ` : ''}{vendor.name_english || vendor.commercial_name}
                      </option>
                    ))}
                </select>
                {vendors.filter(vendor => tender?.invited_vendors?.includes(vendor.id)).length === 0 && (
                  <p className="text-sm text-red-600 mt-1">No vendors have been invited to this tender yet.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Technical Proposal *</label>
                <textarea
                  value={proposalForm.technical_proposal}
                  onChange={(e) => setProposalForm({ ...proposalForm, technical_proposal: e.target.value })}
                  required
                  rows={6}
                  placeholder="Describe the technical approach, methodology, and implementation plan..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Financial Proposal (Amount) *</label>
                <input
                  type="number"
                  value={proposalForm.financial_proposal}
                  onChange={(e) => setProposalForm({ ...proposalForm, financial_proposal: e.target.value })}
                  required
                  min="0"
                  step="0.01"
                  placeholder="Enter proposal amount"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-4 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setShowProposalModal(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Submit Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Tender</h2>
            <form onSubmit={handleUpdateTender} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Project Name *</label>
                <input
                  type="text"
                  value={editFormData.project_name}
                  onChange={(e) => setEditFormData({ ...editFormData, project_name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Requirements *</label>
                <textarea
                  value={editFormData.requirements}
                  onChange={(e) => setEditFormData({ ...editFormData, requirements: e.target.value })}
                  required
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Budget *</label>
                  <input
                    type="number"
                    value={editFormData.budget}
                    onChange={(e) => setEditFormData({ ...editFormData, budget: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Deadline *</label>
                  <input
                    type="date"
                    value={editFormData.deadline}
                    onChange={(e) => setEditFormData({ ...editFormData, deadline: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-4 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default TenderDetail;
