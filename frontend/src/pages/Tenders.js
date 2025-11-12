import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Tenders = () => {
  const { user } = useAuth();
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_name: '',
    requirements: '',
    budget: '',
    deadline: '',
    invited_vendors: [],
  });

  useEffect(() => {
    fetchTenders();
    if (user?.role === 'procurement_officer') {
      fetchVendors();
    }
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchTenders(searchQuery);
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const fetchTenders = async (search = '') => {
    try {
      const url = search ? `${API}/tenders?search=${encodeURIComponent(search)}` : `${API}/tenders`;
      const response = await axios.get(url, { withCredentials: true });
      setTenders(response.data);
    } catch (error) {
      console.error('Error fetching tenders:', error);
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

  const handleCreateTender = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API}/tenders`,
        {
          ...formData,
          budget: parseFloat(formData.budget),
          deadline: new Date(formData.deadline).toISOString(),
        },
        { withCredentials: true }
      );
      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        project_name: '',
        requirements: '',
        budget: '',
        deadline: '',
        invited_vendors: [],
      });
      fetchTenders();
    } catch (error) {
      console.error('Error creating tender:', error);
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || error.message || 'Unknown error occurred';
      alert('Failed to create tender: ' + errorMsg);
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      published: 'bg-blue-100 text-blue-800',
      closed: 'bg-orange-100 text-orange-800',
      awarded: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tender Management</h1>
            <p className="text-gray-600 mt-1">Create and manage tenders and proposals</p>
          </div>
          {user?.role === 'procurement_officer' && (
            <button
              onClick={() => setShowCreateModal(true)}
              data-testid="create-tender-btn"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Create Tender
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-md p-4">
          <input
            type="text"
            placeholder="Search by tender number, title, or project name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Tenders List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : tenders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <span className="text-6xl mb-4 block">📋</span>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No tenders found</h3>
            <p className="text-gray-600">
              {user?.role === 'procurement_officer'
                ? 'Create your first tender to get started.'
                : 'No tenders are available at the moment.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {tenders.map((tender) => (
              <div
                key={tender.id}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">{tender.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{tender.project_name}</p>
                    {tender.tender_number && (
                      <p className="text-xs text-blue-600 font-medium mt-1">#{tender.tender_number}</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(tender.status)}`}>
                    {tender.status.toUpperCase()}
                  </span>
                </div>

                <p className="text-gray-700 text-sm mb-4 line-clamp-2">{tender.description}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 w-24">Budget:</span>
                    <span className="text-gray-900 font-medium">${tender.budget.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 w-24">Deadline:</span>
                    <span className="text-gray-900 font-medium">{new Date(tender.deadline).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 w-24">Vendors:</span>
                    <span className="text-gray-900 font-medium">{tender.invited_vendors.length} invited</span>
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Created {new Date(tender.created_at).toLocaleDateString()}
                  </span>
                  {(tender.status === 'published' || tender.status === 'closed') && (
                    <Link
                      to={`/tenders/${tender.id}/evaluate`}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Evaluate
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Tender Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Tender</h2>
            <form onSubmit={handleCreateTender} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Project Name *</label>
                <input
                  type="text"
                  value={formData.project_name}
                  onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Requirements *</label>
                <textarea
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Budget *</label>
                  <input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Deadline *</label>
                  <input
                    type="datetime-local"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invited Vendors</label>
                <select
                  multiple
                  value={formData.invited_vendors}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      invited_vendors: Array.from(e.target.selectedOptions, (option) => option.value),
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  size={5}
                >
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name_english || vendor.commercial_name || vendor.company_name || 'Unknown Vendor'}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple vendors</p>
              </div>
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Create Tender
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Tenders;
