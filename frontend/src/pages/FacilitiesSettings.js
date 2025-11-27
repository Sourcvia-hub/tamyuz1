import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAuth } from '../App';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const FacilitiesSettings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('buildings');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [assetCategories, setAssetCategories] = useState([]);
  const [osrCategories, setOsrCategories] = useState([]);
  
  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    // Check if user is admin
    if (user && user.role !== 'admin' && user.role !== 'system_admin') {
      alert('Access denied. Admin privileges required.');
      window.location.href = '/dashboard';
      return;
    }
    fetchAllData();
  }, [user]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [buildingsRes, floorsRes, masterDataRes] = await Promise.all([
        axios.get(`${API}/buildings`, { withCredentials: true }),
        axios.get(`${API}/floors`, { withCredentials: true }),
        axios.get(`${API}/facilities/master-data`, { withCredentials: true })
      ]);
      
      setBuildings(buildingsRes.data);
      setFloors(floorsRes.data);
      setAssetCategories(masterDataRes.data.asset_categories || []);
      setOsrCategories(masterDataRes.data.osr_categories || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error loading settings data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = (type) => {
    setIsEditing(true);
    setEditingId(null);
    setFormData(getEmptyForm(type));
  };

  const handleEdit = (item, type) => {
    setIsEditing(true);
    setEditingId(item.id);
    setFormData({ ...item, type });
  };

  const handleDelete = async (id, type, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    
    try {
      const endpoints = {
        buildings: `/buildings/${id}`,
        floors: `/floors/${id}`,
        assetCategories: `/asset-categories/${id}`,
        osrCategories: `/osr-categories/${id}`
      };
      
      await axios.delete(`${API}${endpoints[type]}`, { withCredentials: true });
      alert('Deleted successfully');
      fetchAllData();
    } catch (error) {
      console.error('Error deleting:', error);
      
      let errorMessage = 'Error deleting item';
      if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (typeof errorData.detail === 'object') {
          errorMessage = JSON.stringify(errorData.detail, null, 2);
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      }
      
      alert(errorMessage);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const endpoints = {
        buildings: '/buildings',
        floors: '/floors',
        assetCategories: '/asset-categories',
        osrCategories: '/osr-categories'
      };
      
      const type = formData.type || activeTab;
      const endpoint = `${API}${endpoints[type]}`;
      
      if (editingId) {
        // Update
        await axios.put(`${endpoint}/${editingId}`, formData, { withCredentials: true });
        alert('Updated successfully');
      } else {
        // Create
        await axios.post(endpoint, formData, { withCredentials: true });
        alert('Created successfully');
      }
      
      setIsEditing(false);
      setFormData({});
      setEditingId(null);
      fetchAllData();
    } catch (error) {
      console.error('Error saving:', error);
      alert(error.response?.data?.detail || 'Error saving item');
    }
  };

  const getEmptyForm = (type) => {
    switch (type) {
      case 'buildings':
        return { name: '', code: '', address: '', is_active: true };
      case 'floors':
        return { building_id: '', name: '', number: '', is_active: true };
      case 'assetCategories':
        return { name: '', description: '', is_active: true };
      case 'osrCategories':
        return { name: '', description: '', is_active: true };
      default:
        return {};
    }
  };

  const renderBuildingsTab = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Buildings</h2>
        <button
          onClick={() => handleCreate('buildings')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add Building
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {buildings.map((building) => (
              <tr key={building.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{building.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{building.code || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{building.address || '-'}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${building.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {building.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm space-x-2">
                  <button onClick={() => handleEdit(building, 'buildings')} className="text-blue-600 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(building.id, 'buildings', building.name)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderFloorsTab = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Floors</h2>
        <button
          onClick={() => handleCreate('floors')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add Floor
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Building</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Floor Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {floors.map((floor) => {
              const building = buildings.find(b => b.id === floor.building_id);
              return (
                <tr key={floor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{building?.name || 'Unknown'}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{floor.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{floor.number ?? '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${floor.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {floor.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button onClick={() => handleEdit(floor, 'floors')} className="text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(floor.id, 'floors', floor.name)} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCategoriesTab = (categories, type, title) => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <button
          onClick={() => handleCreate(type)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add Category
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {categories.map((category) => (
              <tr key={category.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{category.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{category.description || '-'}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${category.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {category.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm space-x-2">
                  <button onClick={() => handleEdit(category, type)} className="text-blue-600 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(category.id, type, category.name)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderForm = () => {
    if (!isEditing) return null;

    const type = formData.type || activeTab;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            {editingId ? 'Edit' : 'Add'} {type === 'buildings' ? 'Building' : type === 'floors' ? 'Floor' : 'Category'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {type === 'buildings' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                  <input
                    type="text"
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {type === 'floors' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Building *</label>
                  <select
                    required
                    value={formData.building_id || ''}
                    onChange={(e) => setFormData({ ...formData, building_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Building</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Floor Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Ground Floor, 1st Floor"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Floor Number</label>
                  <input
                    type="number"
                    value={formData.number || ''}
                    onChange={(e) => setFormData({ ...formData, number: parseInt(e.target.value) || null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0 for ground, 1 for first, etc."
                  />
                </div>
              </>
            )}

            {(type === 'assetCategories' || type === 'osrCategories') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="3"
                  />
                </div>
              </>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active ?? true}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">Active</label>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => { setIsEditing(false); setFormData({}); setEditingId(null); }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Facilities Settings</h1>
          <p className="text-gray-600 mt-1">Manage master data for facilities management</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'buildings', label: 'Buildings', count: buildings.length },
              { id: 'floors', label: 'Floors', count: floors.length },
              { id: 'assetCategories', label: 'Asset Categories', count: assetCategories.length },
              { id: 'osrCategories', label: 'OSR Categories', count: osrCategories.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'buildings' && renderBuildingsTab()}
          {activeTab === 'floors' && renderFloorsTab()}
          {activeTab === 'assetCategories' && renderCategoriesTab(assetCategories, 'assetCategories', 'Asset Categories')}
          {activeTab === 'osrCategories' && renderCategoriesTab(osrCategories, 'osrCategories', 'OSR Categories')}
        </div>

        {/* Modal Form */}
        {renderForm()}
      </div>
    </Layout>
  );
};

export default FacilitiesSettings;
