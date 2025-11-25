import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AssetForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    model: '',
    serial_number: '',
    manufacturer: '',
    building_id: '',
    floor_id: '',
    room_area: '',
    custodian: '',
    vendor_id: '',
    purchase_date: '',
    cost: '',
    po_number: '',
    contract_id: '',
    warranty_start_date: '',
    warranty_end_date: '',
    installation_date: '',
    last_maintenance_date: '',
    next_maintenance_due: '',
    status: 'active',
    condition: '',
    notes: ''
  });

  useEffect(() => {
    fetchMasterData();
    if (isEdit) {
      fetchAsset();
    }
  }, [id]);

  useEffect(() => {
    if (formData.building_id) {
      fetchFloors(formData.building_id);
    }
  }, [formData.building_id]);

  // Clear contract selection if vendor changes
  useEffect(() => {
    if (formData.vendor_id && formData.contract_id) {
      const selectedContract = contracts.find(c => c.id === formData.contract_id);
      if (selectedContract && selectedContract.vendor_id !== formData.vendor_id) {
        setFormData(prev => ({ ...prev, contract_id: '' }));
      }
    }
  }, [formData.vendor_id]);

  const fetchMasterData = async () => {
    try {
      const [buildingsRes, categoriesRes, vendorsRes, contractsRes, posRes] = await Promise.all([
        axios.get(`${API}/buildings`, { withCredentials: true }),
        axios.get(`${API}/asset-categories`, { withCredentials: true }),
        axios.get(`${API}/vendors`, { withCredentials: true }),
        axios.get(`${API}/contracts`, { withCredentials: true }),
        axios.get(`${API}/purchase-orders`, { withCredentials: true })
      ]);
      
      setBuildings(buildingsRes.data);
      setCategories(categoriesRes.data);
      setVendors(vendorsRes.data);
      setContracts(contractsRes.data);
      setPurchaseOrders(posRes.data);
    } catch (error) {
      console.error('Error fetching master data:', error);
    }
  };

  const fetchFloors = async (buildingId) => {
    try {
      const response = await axios.get(`${API}/floors?building_id=${buildingId}`, { withCredentials: true });
      setFloors(response.data);
    } catch (error) {
      console.error('Error fetching floors:', error);
    }
  };

  const fetchAsset = async () => {
    try {
      const response = await axios.get(`${API}/assets/${id}`, { withCredentials: true });
      const asset = response.data;
      
      // Convert dates to input format
      const formatDate = (date) => date ? new Date(date).toISOString().split('T')[0] : '';
      
      setFormData({
        name: asset.name || '',
        category_id: asset.category_id || '',
        model: asset.model || '',
        serial_number: asset.serial_number || '',
        manufacturer: asset.manufacturer || '',
        building_id: asset.building_id || '',
        floor_id: asset.floor_id || '',
        room_area: asset.room_area || '',
        custodian: asset.custodian || '',
        vendor_id: asset.vendor_id || '',
        purchase_date: formatDate(asset.purchase_date),
        cost: asset.cost || '',
        po_number: asset.po_number || '',
        contract_id: asset.contract_id || '',
        warranty_start_date: formatDate(asset.warranty_start_date),
        warranty_end_date: formatDate(asset.warranty_end_date),
        installation_date: formatDate(asset.installation_date),
        last_maintenance_date: formatDate(asset.last_maintenance_date),
        next_maintenance_due: formatDate(asset.next_maintenance_due),
        status: asset.status || 'active',
        condition: asset.condition || '',
        notes: asset.notes || ''
      });
    } catch (error) {
      console.error('Error fetching asset:', error);
      alert('Asset not found');
      navigate('/assets');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Enrich with denormalized data
      const enrichedData = { ...formData };
      
      if (formData.category_id) {
        const category = categories.find(c => c.id === formData.category_id);
        enrichedData.category_name = category?.name;
      }
      
      if (formData.building_id) {
        const building = buildings.find(b => b.id === formData.building_id);
        enrichedData.building_name = building?.name;
      }
      
      if (formData.floor_id) {
        const floor = floors.find(f => f.id === formData.floor_id);
        enrichedData.floor_name = floor?.name;
      }
      
      if (formData.vendor_id) {
        const vendor = vendors.find(v => v.id === formData.vendor_id);
        enrichedData.vendor_name = vendor?.name_english || vendor?.commercial_name;
      }
      
      if (formData.contract_id) {
        const contract = contracts.find(c => c.id === formData.contract_id);
        enrichedData.contract_number = contract?.contract_number;
      }

      // Convert empty strings to null for dates and numbers
      Object.keys(enrichedData).forEach(key => {
        if (enrichedData[key] === '') {
          enrichedData[key] = null;
        }
      });

      if (isEdit) {
        await axios.put(`${API}/assets/${id}`, enrichedData, { withCredentials: true });
        alert('Asset updated successfully!');
      } else {
        await axios.post(`${API}/assets`, enrichedData, { withCredentials: true });
        alert('Asset registered successfully!');
      }
      
      navigate('/assets');
    } catch (error) {
      console.error('Error saving asset:', error);
      alert('Error: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {isEdit ? 'Edit Asset' : 'Register New Asset'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit ? 'Update asset information' : 'Add a new asset to the registry'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8 space-y-8">
          {/* Basic Information */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asset Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., AC Unit - Conference Room A"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Model XYZ-2000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Serial Number</label>
                <input
                  type="text"
                  name="serial_number"
                  value={formData.serial_number}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., SN123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Manufacturer</label>
                <input
                  type="text"
                  name="manufacturer"
                  value={formData.manufacturer}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Samsung, LG, etc."
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">Location</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Building *
                </label>
                <select
                  name="building_id"
                  value={formData.building_id}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Building</option>
                  {buildings.map(building => (
                    <option key={building.id} value={building.id}>{building.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Floor *
                </label>
                <select
                  name="floor_id"
                  value={formData.floor_id}
                  onChange={handleChange}
                  required
                  disabled={!formData.building_id}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Select Floor</option>
                  {floors.map(floor => (
                    <option key={floor.id} value={floor.id}>{floor.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Room/Area</label>
                <input
                  type="text"
                  name="room_area"
                  value={formData.room_area}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Conference Room A"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Custodian</label>
                <input
                  type="text"
                  name="custodian"
                  value={formData.custodian}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Facilities Team"
                />
              </div>
            </div>
          </div>

          {/* Procurement & Contract */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">Procurement & Contract</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vendor</label>
                <select
                  name="vendor_id"
                  value={formData.vendor_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Vendor</option>
                  {vendors.map(vendor => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name_english || vendor.commercial_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Date</label>
                <input
                  type="date"
                  name="purchase_date"
                  value={formData.purchase_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cost</label>
                <input
                  type="number"
                  name="cost"
                  value={formData.cost}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">PO Number</label>
                <input
                  type="text"
                  name="po_number"
                  value={formData.po_number}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AMC Contract
                </label>
                <select
                  name="contract_id"
                  value={formData.contract_id}
                  onChange={handleChange}
                  disabled={!formData.vendor_id}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">
                    {formData.vendor_id ? 'No AMC Contract' : 'Select vendor first'}
                  </option>
                  {contracts
                    .filter(contract => contract.vendor_id === formData.vendor_id)
                    .map(contract => (
                      <option key={contract.id} value={contract.id}>
                        {contract.contract_number} - {contract.title}
                      </option>
                    ))}
                </select>
                {formData.vendor_id && contracts.filter(c => c.vendor_id === formData.vendor_id).length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    No contracts found for selected vendor
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Warranty */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">Warranty</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Warranty Start Date
                </label>
                <input
                  type="date"
                  name="warranty_start_date"
                  value={formData.warranty_start_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Warranty End Date
                </label>
                <input
                  type="date"
                  name="warranty_end_date"
                  value={formData.warranty_end_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              ℹ️ Warranty status will be automatically calculated based on the end date
            </p>
          </div>

          {/* Lifecycle */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">Lifecycle & Maintenance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Installation Date
                </label>
                <input
                  type="date"
                  name="installation_date"
                  value={formData.installation_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Maintenance Date
                </label>
                <input
                  type="date"
                  name="last_maintenance_date"
                  value={formData.last_maintenance_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Next Maintenance Due
                </label>
                <input
                  type="date"
                  name="next_maintenance_due"
                  value={formData.next_maintenance_due}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asset Status *
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="under_maintenance">Under Maintenance</option>
                  <option value="out_of_service">Out of Service</option>
                  <option value="replaced">Replaced</option>
                  <option value="decommissioned">Decommissioned</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                <select
                  name="condition"
                  value={formData.condition}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Not Assessed</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">Additional Notes</h2>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Any additional information about the asset..."
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/assets')}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : (isEdit ? 'Update Asset' : 'Register Asset')}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default AssetForm;
