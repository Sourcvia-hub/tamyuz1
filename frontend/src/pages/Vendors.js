import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchVendors();
  }, [filter]);

  const fetchVendors = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await axios.get(`${API}/vendors`, { params, withCredentials: true });
      setVendors(response.data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vendor Management</h1>
            <p className="text-gray-600 mt-1">Review and manage vendor registrations</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            data-testid="create-vendor-btn"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Create Vendor
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Vendors
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'approved'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'rejected'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Rejected
            </button>
          </div>
        </div>

        {/* Vendors List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : vendors.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <span className="text-6xl mb-4 block">🏢</span>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No vendors found</h3>
            <p className="text-gray-600">No vendors match the current filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {vendors.map((vendor) => (
              <Link
                key={vendor.id}
                to={`/vendors/${vendor.id}`}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{vendor.company_name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{vendor.contact_email}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(vendor.status)}`}>
                    {vendor.status.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 w-24">Contact:</span>
                    <span className="text-gray-900 font-medium">{vendor.contact_person}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 w-24">Phone:</span>
                    <span className="text-gray-900 font-medium">{vendor.contact_phone}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 w-24">CR Number:</span>
                    <span className="text-gray-900 font-medium">{vendor.cr_number}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 w-24">VAT Number:</span>
                    <span className="text-gray-900 font-medium">{vendor.vat_number}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <span className="text-sm text-gray-600">Risk Score: </span>
                    <span className="text-sm font-bold text-gray-900">{vendor.risk_score.toFixed(1)}</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskBadgeColor(vendor.risk_category)}`}>
                    {vendor.risk_category.toUpperCase()} RISK
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Vendors;
