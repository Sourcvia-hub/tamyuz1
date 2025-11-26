import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../App';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const OSRForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [masterData, setMasterData] = useState({
    buildings: [],
    floors: [],
    osr_categories: [],
    assets: [],
    vendors: []
  });
  
  const [formData, setFormData] = useState({
    title: '',
    request_type: 'general_request',
    category: '',
    priority: 'normal',
    description: '',
    building_id: '',
    floor_id: '',
    room_area: '',
    asset_id: '',
    assigned_to_type: '',
    assigned_to_vendor_id: '',
    assigned_to_internal: ''
  });

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    // When building changes, filter floors
    if (formData.building_id) {
      setFormData(prev => ({ ...prev, floor_id: '' }));
    }
  }, [formData.building_id]);

  useEffect(() => {
    // When asset is selected, auto-populate asset details
    if (formData.asset_id) {
      const asset = masterData.assets.find(a => a.id === formData.asset_id);
      if (asset) {
        // Asset found - could auto-populate more fields if needed
      }
    }
  }, [formData.asset_id, masterData.assets]);

  const fetchMasterData = async () => {
    try {
      // Fetch data separately to handle individual errors
      let masterRes, assetsRes, vendorsRes;
      
      try {
        masterRes = await axios.get(`${API}/facilities/master-data`, { withCredentials: true });
      } catch (err) {
        console.error('Error fetching facilities master data:', err);
        masterRes = { data: { buildings: [], floors: [], osr_categories: [], asset_categories: [] } };
      }
      
      try {
        assetsRes = await axios.get(`${API}/assets`, { withCredentials: true });
      } catch (err) {
        console.error('Error fetching assets:', err);
        assetsRes = { data: [] };
      }
      
      try {
        vendorsRes = await axios.get(`${API}/vendors`, { withCredentials: true });
      } catch (err) {
        console.error('Error fetching vendors:', err);
        vendorsRes = { data: [] };
      }
      
      setMasterData({
        buildings: masterRes.data.buildings || [],
        floors: masterRes.data.floors || [],
        osr_categories: masterRes.data.osr_categories || [],
        assets: assetsRes.data || [],
        vendors: vendorsRes.data || []
      });
    } catch (error) {
      console.error('Error loading form data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Prepare OSR data
      const osrData = {
        ...formData,
        created_by: user?.id,
        created_by_name: user?.name
      };
      
      const response = await axios.post(`${API}/osrs`, osrData, { withCredentials: true });
      
      alert('Service request created successfully!');
      navigate(`/osr/${response.data.osr.id}`);
    } catch (error) {
      console.error('Error creating OSR:', error);
      alert(error.response?.data?.detail || 'Error creating service request');
    } finally {
      setLoading(false);
    }
  };

  const availableFloors = masterData.floors.filter(f => f.building_id === formData.building_id);
  const availableAssets = masterData.assets.filter(a => a.building_id === formData.building_id);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Service Request</h1>
          <p className="text-gray-600 mt-1">Create a new operating service request</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Request Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Request Type *</label>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                     style={{ borderColor: formData.request_type === 'asset_related' ? '#3B82F6' : '#D1D5DB' }}>
                <input
                  type="radio"
                  name="request_type"
                  value="asset_related"
                  checked={formData.request_type === 'asset_related'}
                  onChange={(e) => setFormData({ ...formData, request_type: e.target.value })}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium">Asset Related</div>
                  <div className="text-xs text-gray-500">Maintenance or repair of existing asset</div>
                </div>
              </label>
              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                     style={{ borderColor: formData.request_type === 'general_request' ? '#3B82F6' : '#D1D5DB' }}>
                <input
                  type="radio"
                  name="request_type"
                  value="general_request"
                  checked={formData.request_type === 'general_request'}
                  onChange={(e) => setFormData({ ...formData, request_type: e.target.value })}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium">General Request</div>
                  <div className="text-xs text-gray-500">Cleaning, relocation, or other services</div>
                </div>
              </label>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of the request"
            />
          </div>

          {/* Category and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Category</option>
                {masterData.osr_categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority *</label>
              <select
                required
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows="4"
              placeholder="Detailed description of the service request"
            />
          </div>

          {/* Location Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Information</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Building *</label>
                <select
                  required
                  value={formData.building_id}
                  onChange={(e) => setFormData({ ...formData, building_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Building</option>
                  {masterData.buildings.map((building) => (
                    <option key={building.id} value={building.id}>{building.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Floor *</label>
                <select
                  required
                  value={formData.floor_id}
                  onChange={(e) => setFormData({ ...formData, floor_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={!formData.building_id}
                >
                  <option value="">Select Floor</option>
                  {availableFloors.map((floor) => (
                    <option key={floor.id} value={floor.id}>{floor.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room/Area</label>
                <input
                  type="text"
                  value={formData.room_area}
                  onChange={(e) => setFormData({ ...formData, room_area: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Room 201"
                />
              </div>
            </div>
          </div>

          {/* Asset Selection (if asset-related) */}
          {formData.request_type === 'asset_related' && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Information</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Asset *</label>
                <select
                  required={formData.request_type === 'asset_related'}
                  value={formData.asset_id}
                  onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={!formData.building_id}
                >
                  <option value="">Select Asset</option>
                  {availableAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.asset_number} - {asset.name} ({asset.category_name})
                    </option>
                  ))}
                </select>
                {!formData.building_id && (
                  <p className="text-xs text-gray-500 mt-1">Please select a building first</p>
                )}
              </div>
            </div>
          )}

          {/* Assignment (Optional) */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment (Optional)</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                <select
                  value={formData.assigned_to_type}
                  onChange={(e) => setFormData({ ...formData, assigned_to_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Not Assigned</option>
                  <option value="vendor">External Vendor</option>
                  <option value="internal">Internal Team</option>
                </select>
              </div>

              {formData.assigned_to_type === 'vendor' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                  <select
                    value={formData.assigned_to_vendor_id}
                    onChange={(e) => setFormData({ ...formData, assigned_to_vendor_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Vendor</option>
                    {masterData.vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>{vendor.name_english}</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.assigned_to_type === 'internal' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Internal Team/Person</label>
                  <input
                    type="text"
                    value={formData.assigned_to_internal}
                    onChange={(e) => setFormData({ ...formData, assigned_to_internal: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Facilities Team, John Doe"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/osr')}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Service Request'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default OSRForm;
