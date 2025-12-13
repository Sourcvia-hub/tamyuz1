import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Assets = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    status: '',
    building: '',
    warrantyStatus: ''
  });

  useEffect(() => {
    fetchAssets();
    fetchMasterData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, assets]);

  const fetchAssets = async () => {
    try {
      const response = await axios.get(`${API}/assets`, { withCredentials: true });
      setAssets(response.data);
      setFilteredAssets(response.data);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const [categoriesRes, buildingsRes] = await Promise.all([
        axios.get(`${API}/asset-categories`, { withCredentials: true }),
        axios.get(`${API}/buildings`, { withCredentials: true })
      ]);
      setCategories(categoriesRes.data);
      setBuildings(buildingsRes.data);
    } catch (error) {
      console.error('Error fetching master data:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...assets];

    if (filters.search) {
      filtered = filtered.filter(asset =>
        asset.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        asset.asset_number?.toLowerCase().includes(filters.search.toLowerCase()) ||
        asset.serial_number?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.category) {
      filtered = filtered.filter(asset => asset.category_id === filters.category);
    }

    if (filters.status) {
      filtered = filtered.filter(asset => asset.status === filters.status);
    }

    if (filters.building) {
      filtered = filtered.filter(asset => asset.building_id === filters.building);
    }

    if (filters.warrantyStatus) {
      filtered = filtered.filter(asset => asset.warranty_status === filters.warrantyStatus);
    }

    setFilteredAssets(filtered);
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      under_maintenance: 'bg-yellow-100 text-yellow-800',
      out_of_service: 'bg-red-100 text-red-800',
      replaced: 'bg-gray-100 text-gray-800',
      decommissioned: 'bg-gray-100 text-gray-600'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getConditionColor = (condition) => {
    const colors = {
      good: 'text-green-600',
      fair: 'text-yellow-600',
      poor: 'text-red-600'
    };
    return colors[condition] || 'text-gray-600';
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Asset Registry</h1>
            <p className="text-gray-600 mt-1">Manage facilities assets and equipment</p>
          </div>
          <Link
            to="/assets/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            + Register Asset
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Total Assets</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{assets.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Active</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {assets.filter(a => a.status === 'active').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Under Maintenance</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">
              {assets.filter(a => a.status === 'under_maintenance').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Out of Warranty</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {assets.filter(a => a.warranty_status === 'out_of_warranty').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <input
              type="text"
              placeholder="Search assets..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <select
              value={filters.building}
              onChange={(e) => setFilters({ ...filters, building: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Buildings</option>
              {buildings.map(building => (
                <option key={building.id} value={building.id}>{building.name}</option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="under_maintenance">Under Maintenance</option>
              <option value="out_of_service">Out of Service</option>
              <option value="replaced">Replaced</option>
              <option value="decommissioned">Decommissioned</option>
            </select>
            <select
              value={filters.warrantyStatus}
              onChange={(e) => setFilters({ ...filters, warrantyStatus: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Warranty</option>
              <option value="in_warranty">In Warranty</option>
              <option value="out_of_warranty">Out of Warranty</option>
            </select>
            <button
              onClick={() => setFilters({ search: '', category: '', status: '', building: '', warrantyStatus: '' })}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear Filters
            </button>
          </div>
          <div className="mt-4">
            <Link
              to="/facilities-settings"
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors inline-block"
            >
              ⚙️ Manage Categories & Buildings
            </Link>
          </div>
        </div>

        {/* Assets List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredAssets.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 mb-4">No assets found</p>
              <Link
                to="/assets/new"
                className="text-blue-600 hover:underline"
              >
                Register your first asset
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condition</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warranty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAssets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{asset.asset_number}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{asset.name}</p>
                          {asset.serial_number && (
                            <p className="text-xs text-gray-500">SN: {asset.serial_number}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{asset.category_name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <p>{asset.building_name}</p>
                          <p className="text-xs text-gray-500">{asset.floor_name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(asset.status)}`}>
                          {asset.status?.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getConditionColor(asset.condition)}`}>
                          {asset.condition ? asset.condition.toUpperCase() : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {asset.warranty_status ? (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            asset.warranty_status === 'in_warranty' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {asset.warranty_status === 'in_warranty' ? 'In Warranty' : 'Out of Warranty'}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          to={`/assets/${asset.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Assets;
