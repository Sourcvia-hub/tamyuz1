import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import VendorForm from '../components/VendorForm';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App';
import DueDiligenceQuestionnaire from '../components/DueDiligenceQuestionnaire';
import { canEdit, Module } from '../utils/permissions';
import AuditTrail from '../components/AuditTrail';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VendorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [auditLog, setAuditLog] = useState([]);
  const [createdByUser, setCreatedByUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [showDueDiligenceModal, setShowDueDiligenceModal] = useState(false);
  const [relatedTenders, setRelatedTenders] = useState([]);
  const [rankedFirstTenders, setRankedFirstTenders] = useState([]);
  const [relatedContracts, setRelatedContracts] = useState([]);
  const [relatedPOs, setRelatedPOs] = useState([]);

  useEffect(() => {
    fetchVendor();
    fetchAuditLog();
    fetchRelatedData();
  }, [id]);

  const fetchVendor = async () => {
    try {
      const response = await axios.get(`${API}/vendors/${id}`, { withCredentials: true });
      setVendor(response.data);
      
      // Fetch creator info if available
      if (response.data.created_by) {
        try {
          const userRes = await axios.get(`${API}/users/${response.data.created_by}`, { withCredentials: true });
          setCreatedByUser(userRes.data);
        } catch (err) {
          console.log('Could not fetch creator info');
        }
      }
    } catch (error) {
      console.error('Error fetching vendor:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedData = async () => {
    try {
      // Fetch all tenders and proposals
      const tendersRes = await axios.get(`${API}/tenders`, { withCredentials: true });
      const vendorTenders = tendersRes.data.filter(t => t.vendor_id === id);
      setRelatedTenders(vendorTenders);

      // Fetch proposals to find tenders where vendor is ranked #1
      const proposalsRes = await axios.get(`${API}/proposals`, { withCredentials: true });
      const vendorProposals = proposalsRes.data.filter(p => p.vendor_id === id);
      
      // Find tenders where this vendor's proposal is ranked #1
      const rankedFirst = [];
      for (const proposal of vendorProposals) {
        if (proposal.rank === 1) {
          // Fetch the tender details
          const tender = tendersRes.data.find(t => t.id === proposal.tender_id);
          if (tender) {
            rankedFirst.push({
              ...tender,
              proposal: proposal,
              evaluation_score: proposal.evaluation_score
            });
          }
        }
      }
      setRankedFirstTenders(rankedFirst);

      // Fetch related contracts
      const contractsRes = await axios.get(`${API}/contracts`, { withCredentials: true });
      const vendorContracts = contractsRes.data.filter(c => c.vendor_id === id);
      setRelatedContracts(vendorContracts);

      // Fetch related purchase orders
      const posRes = await axios.get(`${API}/purchase-orders`, { withCredentials: true });
      const vendorPOs = posRes.data.filter(po => po.vendor_id === id);
      setRelatedPOs(vendorPOs);
    } catch (error) {
      console.error('Error fetching related data:', error);
    }
  };

  const fetchAuditLog = async () => {
    try {
      const response = await axios.get(`${API}/vendors/${id}/audit-log`, { withCredentials: true });
      setAuditLog(response.data);
    } catch (error) {
      console.error('Error fetching audit log:', error);
    }
  };

  const handleEdit = () => {
    setEditFormData({ ...vendor });
    setShowEditModal(true);
  };

  const handleUpdateVendor = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/vendors/${id}`, editFormData, { withCredentials: true });
      setShowEditModal(false);
      fetchVendor();
      fetchAuditLog();
    } catch (error) {
      console.error('Error updating vendor:', error);
      alert('Failed to update vendor: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDueDiligenceSubmit = async (ddData) => {
    try {
      await axios.put(`${API}/vendors/${id}/due-diligence`, ddData, { withCredentials: true });
      setShowDueDiligenceModal(false);
      fetchVendor();
      alert('Due Diligence questionnaire submitted successfully!');
    } catch (error) {
      console.error('Error submitting due diligence:', error);
      alert('Failed to submit due diligence: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleApproveDueDiligence = async () => {
    if (!window.confirm('Are you sure you want to approve this vendor\'s Due Diligence? This will also approve all pending contracts.')) {
      return;
    }
    
    try {
      await axios.post(`${API}/vendors/${id}/due-diligence/approve`, {}, { withCredentials: true });
      fetchVendor();
      alert('Due Diligence approved successfully! Vendor and contracts are now approved.');
    } catch (error) {
      console.error('Error approving due diligence:', error);
      alert('Failed to approve due diligence: ' + (error.response?.data?.detail || error.message));
    }
  };

  const getRiskBadgeColor = (category) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
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

  if (!vendor) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Vendor not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <button
              onClick={() => navigate('/vendors')}
              className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Vendors
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{vendor.name_english || vendor.company_name}</h1>
            <p className="text-gray-600 mt-1">Vendor Details</p>
            
            {/* DD Completion Badge */}
            {vendor.dd_completed && (
              <div className="mt-3">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-bold border-2 border-green-300">
                  ✓ Due Diligence Completed
                  {vendor.dd_approved_at && (
                    <span className="text-xs">({new Date(vendor.dd_approved_at).toLocaleDateString()})</span>
                  )}
                </span>
              </div>
            )}
            
            {vendor.created_at && (
              <p className="text-sm text-gray-500 mt-2">
                Created by <strong>{createdByUser?.name || 'System'}</strong> on {new Date(vendor.created_at).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            {/* Legacy Due Diligence Button - Only show if required and not completed */}
            {vendor.dd_required && !vendor.dd_completed && canEdit(user?.role, Module.VENDOR_DD) && (
              <button
                onClick={() => setShowDueDiligenceModal(true)}
                className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <span>📋</span>
                Complete DD
              </button>
            )}
            <button
              onClick={handleEdit}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Edit Vendor
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Company Information */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Company Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Company Name</p>
                  <p className="text-gray-900 font-medium mt-1">{vendor.name_english || vendor.commercial_name || vendor.company_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">CR Number</p>
                  <p className="text-gray-900 font-medium mt-1">{vendor.cr_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">VAT Number</p>
                  <p className="text-gray-900 font-medium mt-1">{vendor.vat_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="text-gray-900 font-medium mt-1">{vendor.address}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Contact Person</p>
                  <p className="text-gray-900 font-medium mt-1">{vendor.contact_person}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-gray-900 font-medium mt-1">{vendor.contact_email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="text-gray-900 font-medium mt-1">{vendor.contact_phone}</p>
                </div>
              </div>
            </div>

            {vendor.bank_name && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Bank Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Bank Name</p>
                    <p className="text-gray-900 font-medium mt-1">{vendor.bank_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Bank Account</p>
                    <p className="text-gray-900 font-medium mt-1">{vendor.bank_account}</p>
                  </div>
                </div>
              </div>
            )}

            {vendor.evaluation_notes && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Evaluation Notes</h2>
                <p className="text-gray-700">{vendor.evaluation_notes}</p>
              </div>
            )}
          </div>

          {/* Risk Assessment & Actions */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Risk Assessment</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Risk Score</p>
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                      <div
                        className={`h-2 rounded-full ${
                          vendor.risk_category === 'high'
                            ? 'bg-red-600'
                            : vendor.risk_category === 'medium'
                            ? 'bg-yellow-600'
                            : 'bg-green-600'
                        }`}
                        style={{ width: `${vendor.risk_score}%` }}
                      />
                    </div>
                    <span className="text-lg font-bold text-gray-900">{vendor.risk_score.toFixed(1)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">Risk Category</p>
                  <span className={`inline-block px-4 py-2 rounded-lg text-sm font-medium ${getRiskBadgeColor(vendor.risk_category)}`}>
                    {vendor.risk_category.toUpperCase()} RISK
                  </span>
                </div>
              </div>
            </div>

            {/* Due Diligence Status */}
            {vendor.dd_required && (
              <div className={`rounded-xl shadow-md p-6 ${
                vendor.dd_completed && vendor.dd_approved_by ? 'bg-green-50 border-2 border-green-300' :
                vendor.dd_completed ? 'bg-blue-50 border-2 border-blue-300' :
                'bg-red-50 border-2 border-red-300'
              }`}>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span>📋</span>
                  Due Diligence Status
                </h2>
                <div className="space-y-3">
                  {vendor.dd_completed && vendor.dd_approved_by ? (
                    <div className="text-center py-3">
                      <span className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-lg">
                        ✓ APPROVED
                      </span>
                      <p className="text-sm text-gray-600 mt-2">
                        Approved on {new Date(vendor.dd_approved_at).toLocaleDateString()}
                      </p>
                    </div>
                  ) : vendor.dd_completed ? (
                    <div className="text-center py-3">
                      <span className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">
                        PENDING APPROVAL
                      </span>
                      <p className="text-sm text-gray-600 mt-2">
                        Completed on {new Date(vendor.dd_completed_at).toLocaleDateString()}
                      </p>
                      {canEdit(user?.role, Module.VENDOR_DD) && (
                        <button
                          onClick={handleApproveDueDiligence}
                          className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                        >
                          Approve Due Diligence
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-3">
                      <span className="inline-block px-4 py-2 bg-red-600 text-white rounded-lg font-bold">
                        ⚠️ REQUIRED
                      </span>
                      <p className="text-sm text-gray-700 mt-2">
                        Due diligence questionnaire must be completed
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Risk Assessment Details</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Risk Score:</span>
                  <span className="text-2xl font-bold text-gray-900">{vendor.risk_score.toFixed(1)}</span>
                </div>
                {vendor.risk_assessment_details && Object.keys(vendor.risk_assessment_details).length > 0 ? (
                  <div className="space-y-2 mt-4">
                    <p className="text-sm font-semibold text-gray-700">Risk Factors:</p>
                    {Object.entries(vendor.risk_assessment_details).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-start p-2 bg-gray-50 rounded">
                        <div className="flex-1">
                          <p className="text-sm text-gray-700">{value.reason}</p>
                        </div>
                        <span className="text-sm font-semibold text-red-600 ml-2">+{value.score}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-green-600 mt-2">✓ No risk factors identified</p>
                )}
                <div className="mt-4 p-3 bg-gray-50 rounded">
                  <p className="text-xs text-gray-600 font-semibold mb-2">Assessment Criteria:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Missing Documents: +30 points</li>
                    <li>• Incomplete Banking Info: +20 points</li>
                    <li>• CR Expiring Soon (&lt;90 days): +15 points</li>
                    <li>• Missing License: +10 points</li>
                    <li>• Small Team (&lt;5 employees): +10 points</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Registration Date</h2>
              <p className="text-gray-700">{new Date(vendor.created_at).toLocaleDateString()}</p>
              {vendor.updated_at && vendor.updated_at !== vendor.created_at && (
                <p className="text-sm text-gray-500 mt-2">Last updated: {new Date(vendor.updated_at).toLocaleDateString()}</p>
              )}
            </div>
          </div>
        </div>

        {/* Audit Trail */}
        <AuditTrail 
          auditTrail={auditLog} 
          entityType="vendor" 
          userRole={user?.role} 
        />

        {/* Tenders Where Vendor Ranked #1 */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-xl font-bold text-gray-900">Tenders Ranked #1 ({rankedFirstTenders.length})</h3>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">TOP RANKED</span>
          </div>
          {rankedFirstTenders.length > 0 ? (
            <div className="space-y-3">
              {rankedFirstTenders.map((tender) => (
                <div key={tender.id} className="p-4 border-2 border-green-200 bg-green-50 rounded-lg hover:border-green-300 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-gray-900">{tender.title}</h4>
                        <span className="px-2 py-1 bg-green-600 text-white rounded text-xs font-bold">RANK #1</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{tender.description}</p>
                      <div className="flex gap-4 mt-2 text-sm text-gray-500">
                        <span>Budget: ${tender.budget?.toLocaleString()}</span>
                        <span>Deadline: {new Date(tender.deadline).toLocaleDateString()}</span>
                        {tender.evaluation_score && (
                          <span className="text-green-600 font-medium">Score: {tender.evaluation_score}/100</span>
                        )}
                      </div>
                    </div>
                    <Link
                      to={`/tenders/${tender.id}`}
                      className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">This vendor has not been ranked #1 in any tender evaluations yet</p>
          )}
        </div>

        {/* Related Contracts */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Related Contracts ({relatedContracts.length})</h3>
          {relatedContracts.length > 0 ? (
            <div className="space-y-3">
              {relatedContracts.map((contract) => (
                <div key={contract.id} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">Contract #{contract.contract_number}</h4>
                      <p className="text-sm text-gray-600 mt-1">{contract.title}</p>
                      <div className="flex gap-4 mt-2 text-sm text-gray-500">
                        <span>Value: ${contract.value?.toLocaleString()}</span>
                        <span>Status: {contract.status}</span>
                        <span>Start: {new Date(contract.start_date).toLocaleDateString()}</span>
                        <span>End: {new Date(contract.end_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <a
                      href={`/contracts/${contract.id}`}
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                    >
                      View
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No contracts found for this vendor</p>
          )}
        </div>

        {/* Related Purchase Orders */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Related Purchase Orders ({relatedPOs.length})</h3>
          {relatedPOs.length > 0 ? (
            <div className="space-y-3">
              {relatedPOs.map((po) => (
                <div key={po.id} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">PO #{po.po_number}</h4>
                      <div className="flex gap-4 mt-2 text-sm text-gray-500">
                        <span>Amount: ${po.total_amount?.toLocaleString()}</span>
                        <span>Status: {po.status}</span>
                        <span>Created: {new Date(po.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <a
                      href={`/purchase-orders/${po.id}`}
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                    >
                      View
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No purchase orders found for this vendor</p>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editFormData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[95vh] p-6 overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Vendor</h2>
            <VendorForm
              formData={editFormData}
              setFormData={setEditFormData}
              onSubmit={handleUpdateVendor}
              onCancel={() => setShowEditModal(false)}
              isEdit={true}
              vendorId={id}
            />
          </div>
        </div>
      )}

      {/* Due Diligence Questionnaire Modal */}
      {showDueDiligenceModal && vendor && (
        <DueDiligenceQuestionnaire
          vendor={vendor}
          onClose={() => setShowDueDiligenceModal(false)}
          onSubmit={handleDueDiligenceSubmit}
        />
      )}
    </Layout>
  );
};

export default VendorDetail;
