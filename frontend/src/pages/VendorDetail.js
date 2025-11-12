import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

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

  useEffect(() => {
    fetchVendor();
    fetchAuditLog();
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

  // Approval removed - all vendors are auto-approved

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
            {vendor.created_at && (
              <p className="text-sm text-gray-500 mt-2">
                Created by <strong>{createdByUser?.name || 'System'}</strong> on {new Date(vendor.created_at).toLocaleDateString()}
              </p>
            )}
          </div>
          <button
            onClick={handleEdit}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Edit Vendor
          </button>
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
                  <p className="text-gray-900 font-medium mt-1">{vendor.company_name}</p>
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

        {/* Audit Log */}
        {auditLog.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Change History</h2>
            <div className="space-y-3">
              {auditLog.map((log) => (
                <div key={log.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {log.action === 'created' ? '📝 Created' : '✏️ Updated'}
                      </p>
                      <p className="text-sm text-gray-600">by {log.user_name}</p>
                      {log.changes && Object.keys(log.changes).length > 0 && (
                        <div className="mt-2 text-sm">
                          {Object.entries(log.changes).map(([field, change]) => (
                            <div key={field} className="text-gray-700">
                              <span className="font-medium">{field}:</span>{' '}
                              {change.old ? (
                                <>
                                  <span className="text-red-600 line-through">{change.old}</span>
                                  {' → '}
                                  <span className="text-green-600">{change.new}</span>
                                </>
                              ) : (
                                <span>{JSON.stringify(change)}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && editFormData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[95vh] p-6 overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Vendor</h2>
            <form onSubmit={handleUpdateVendor}>
              <VendorForm
                formData={editFormData}
                setFormData={setEditFormData}
                onSubmit={handleUpdateVendor}
                onCancel={() => setShowEditModal(false)}
              />
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default VendorDetail;
