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
              <h2 className="text-xl font-bold text-gray-900 mb-4">Registration Date</h2>
              <p className="text-gray-700">{new Date(vendor.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default VendorDetail;
