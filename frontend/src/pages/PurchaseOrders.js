import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import SearchableSelect from '../components/SearchableSelect';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PurchaseOrders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [tenders, setTenders] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    tender_id: '',
    vendor_id: '',
    items: [],
    delivery_time: '',
    has_data_access: false,
    has_onsite_presence: false,
    has_implementation: false,
    duration_more_than_year: false,
  });
  
  const [selectedTender, setSelectedTender] = useState(null);

  const [currentItem, setCurrentItem] = useState({
    name: '',
    description: '',
    quantity: 1,
    price: 0,
  });

  useEffect(() => {
    fetchPOs();
    fetchVendors();
    fetchTenders();
  }, []);

  const fetchPOs = async () => {
    try {
      const response = await axios.get(`${API}/purchase-orders`, { withCredentials: true });
      setPOs(response.data);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
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

  const fetchTenders = async () => {
    try {
      const response = await axios.get(`${API}/tenders/approved/list`, { withCredentials: true });
      setTenders(response.data);
    } catch (error) {
      console.error('Error fetching tenders:', error);
    }
  };

  const handleTenderSelect = async (tenderId) => {
    if (!tenderId) {
      setSelectedTender(null);
      setFormData({ ...formData, tender_id: '', vendor_id: '' });
      setSelectedVendor(null);
      return;
    }

    const tender = tenders.find(t => t.id === tenderId);
    setSelectedTender(tender);
    
    // Fetch tender evaluation to get #1 ranked vendor
    try {
      const evalResponse = await axios.post(`${API}/tenders/${tenderId}/evaluate`, {}, { withCredentials: true });
      
      // Find the proposal with highest score (rank 1)
      const topProposal = evalResponse.data.proposals
        .filter(p => p.evaluated)
        .sort((a, b) => b.final_score - a.final_score)[0];
      
      if (topProposal) {
        // Auto-select the winning vendor
        const winningVendor = vendors.find(v => v.id === topProposal.vendor_id);
        setSelectedVendor(winningVendor);
        
        setFormData({
          ...formData,
          tender_id: tenderId,
          vendor_id: topProposal.vendor_id
        });
      } else {
        setFormData({
          ...formData,
          tender_id: tenderId,
          vendor_id: ''
        });
      }
    } catch (error) {
      console.error('Error fetching tender evaluation:', error);
      setFormData({
        ...formData,
        tender_id: tenderId,
        vendor_id: ''
      });
    }
  };

  const handleVendorSelect = (vendorId) => {
    const vendor = vendors.find(v => v.id === vendorId);
    setSelectedVendor(vendor);
    setFormData({ ...formData, vendor_id: vendorId });
  };

  const handleAddItem = () => {
    if (!currentItem.name || currentItem.price <= 0) {
      alert('Please fill in item name and price');
      return;
    }

    const total = currentItem.quantity * currentItem.price;
    const newItem = { ...currentItem, total };
    
    setFormData({
      ...formData,
      items: [...formData.items, newItem]
    });

    setCurrentItem({
      name: '',
      description: '',
      quantity: 1,
      price: 0,
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotalAmount = () => {
    return formData.items.reduce((sum, item) => sum + item.total, 0);
  };

  const handleCreatePO = async (e) => {
    e.preventDefault();
    
    if (formData.items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    const totalAmount = calculateTotalAmount();
    const amountOverMillion = totalAmount > 1000000;

    // Check if contract is required BEFORE creating PO
    const requiresContract = (
      formData.has_data_access || 
      formData.has_onsite_presence || 
      formData.has_implementation || 
      formData.duration_more_than_year || 
      amountOverMillion
    );

    if (requiresContract) {
      alert(
        'Based on the provided answers, this request requires a contract.\n\n' +
        'Please update your PO or create a contract instead.\n\n' +
        'Reasons:\n' +
        (formData.has_data_access ? '- Vendor requires data access\n' : '') +
        (formData.has_onsite_presence ? '- Vendor requires onsite presence\n' : '') +
        (formData.has_implementation ? '- Implementation services needed\n' : '') +
        (formData.duration_more_than_year ? '- Duration more than one year\n' : '') +
        (amountOverMillion ? '- Amount exceeds 1,000,000 SAR\n' : '')
      );
      return; // Don't create PO, let user update the form
    }

    // Only create PO if no contract is required
    const poData = {
      ...formData,
      risk_level: selectedVendor?.risk_category || 'low',
      amount_over_million: amountOverMillion
    };

    try {
      const response = await axios.post(`${API}/purchase-orders`, poData, { withCredentials: true });
      
      alert('Purchase order issued successfully!');
      setShowCreateModal(false);
      fetchPOs();
      
      // Reset form
      setFormData({
        tender_id: '',
        vendor_id: '',
        items: [],
        delivery_time: '',
        has_data_access: false,
        has_onsite_presence: false,
        has_implementation: false,
        duration_more_than_year: false,
      });
      setSelectedVendor(null);
      setSelectedTender(null);
    } catch (error) {
      console.error('Error creating PO:', error);
      alert('Failed to create purchase order: ' + (error.response?.data?.detail || error.message));
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      draft: 'bg-yellow-100 text-yellow-800',
      issued: 'bg-green-100 text-green-800',
      converted_to_contract: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Purchase Orders</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Create PO
          </button>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            All ({pos.length})
          </button>
          <button
            onClick={() => setActiveFilter('issued')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeFilter === 'issued'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            Issued ({pos.filter(p => p.status === 'issued').length})
          </button>
          <button
            onClick={() => setActiveFilter('converted')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeFilter === 'converted'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            Converted ({pos.filter(p => p.status === 'converted_to_contract').length})
          </button>
          <button
            onClick={() => setActiveFilter('requires_contract')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeFilter === 'requires_contract'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            Requires Contract ({pos.filter(p => p.requires_contract && !p.converted_to_contract).length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-md p-4">
          <input
            type="text"
            placeholder="Search POs by number, vendor, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* PO List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (() => {
          const filteredPOs = pos.filter(po => {
            // Apply filter
            if (activeFilter === 'issued' && po.status !== 'issued') return false;
            if (activeFilter === 'converted' && po.status !== 'converted_to_contract') return false;
            if (activeFilter === 'requires_contract' && (!po.requires_contract || po.converted_to_contract)) return false;
            
            // Apply search
            if (searchQuery) {
              const query = searchQuery.toLowerCase();
              return (
                po.po_number?.toLowerCase().includes(query) ||
                po.vendor_name?.toLowerCase().includes(query) ||
                po.items?.some(item => item.name?.toLowerCase().includes(query))
              );
            }
            return true;
          });

          return filteredPOs.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <span className="text-6xl mb-4 block">📝</span>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No purchase orders found</h3>
              <p className="text-gray-600">
                {searchQuery ? 'Try adjusting your search criteria.' : 'Create your first purchase order to get started.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredPOs.map((po) => (
              <div key={po.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">PO #{po.po_number}</h3>
                    <p className="text-sm text-gray-600 mt-1">{po.items.length} items</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(po.status)}`}>
                    {po.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 w-32">Total Amount:</span>
                    <span className="text-gray-900 font-bold text-lg">${po.total_amount.toLocaleString()}</span>
                  </div>
                  {po.requires_contract && (
                    <div className="flex items-center text-sm">
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">
                        ⚠️ Requires Contract
                      </span>
                    </div>
                  )}
                  {po.converted_to_contract && po.contract_id && (
                    <div className="flex items-center text-sm">
                      <span className="text-gray-600 w-32">Contract:</span>
                      <Link to={`/contracts/${po.contract_id}`} className="text-blue-600 hover:underline">
                        View Contract
                      </Link>
                    </div>
                  )}
                </div>

                <div className="text-sm text-gray-500">
                  Created {new Date(po.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create PO Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Create Purchase Order</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="p-6 space-y-6">
              {/* Tender Selection (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tender (Optional)
                </label>
                <SearchableSelect
                  options={[
                    { value: '', label: 'No Tender' },
                    ...tenders.map(tender => ({
                      value: tender.id,
                      label: `${tender.tender_number} - ${tender.title}`
                    }))
                  ]}
                  value={formData.tender_id}
                  onChange={(value) => handleTenderSelect(value)}
                  placeholder="Search and select tender..."
                  isClearable={true}
                />
              </div>

              {/* Tender Brief Info */}
              {selectedTender && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">📋 Tender Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-blue-600 font-medium">Title:</p>
                      <p className="text-blue-900">{selectedTender.title}</p>
                    </div>
                    <div>
                      <p className="text-blue-600 font-medium">Budget:</p>
                      <p className="text-blue-900">${selectedTender.budget?.toLocaleString()}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-blue-600 font-medium">Requirements:</p>
                      <p className="text-blue-900">{selectedTender.requirements}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Vendor Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vendor * {formData.tender_id && <span className="text-xs text-gray-500">(Auto-selected from tender)</span>}
                </label>
                <SearchableSelect
                  options={vendors.map(vendor => ({
                    value: vendor.id,
                    label: `${vendor.vendor_number ? `${vendor.vendor_number} - ` : ''}${vendor.name_english || vendor.commercial_name} (${vendor.risk_category} risk)`
                  }))}
                  value={formData.vendor_id}
                  onChange={(value) => handleVendorSelect(value)}
                  placeholder="Search and select vendor..."
                  isDisabled={!!formData.tender_id}
                  required={true}
                  isClearable={false}
                />
              </div>

              {/* Delivery Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Time</label>
                <input
                  type="text"
                  placeholder="e.g., 30 days, 2 weeks"
                  value={formData.delivery_time}
                  onChange={(e) => setFormData({ ...formData, delivery_time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Items Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Items</h3>
                
                {/* Current Item Input */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Item Name *</label>
                    <input
                      type="text"
                      placeholder="Item Name"
                      value={currentItem.name}
                      onChange={(e) => setCurrentItem({ ...currentItem, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      placeholder="Description"
                      value={currentItem.description}
                      onChange={(e) => setCurrentItem({ ...currentItem, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Quantity *</label>
                    <input
                      type="number"
                      placeholder="Qty"
                      value={currentItem.quantity}
                      onChange={(e) => setCurrentItem({ ...currentItem, quantity: parseFloat(e.target.value) })}
                      min="1"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Price (SAR) *</label>
                    <input
                      type="number"
                      placeholder="Price"
                      value={currentItem.price}
                      onChange={(e) => setCurrentItem({ ...currentItem, price: parseFloat(e.target.value) })}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium mt-5"
                  >
                    + Add
                  </button>
                </div>

                {/* Items List */}
                {formData.items.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <h4 className="font-medium text-gray-700">Items Added:</h4>
                    {formData.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-600">
                            {item.description} - Qty: {item.quantity} × ${item.price} = ${item.total.toFixed(2)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">
                        Total: ${calculateTotalAmount().toLocaleString()}
                      </p>
                      {calculateTotalAmount() > 1000000 && (
                        <p className="text-sm text-orange-600 font-medium">
                          ⚠️ Amount exceeds 1,000,000 SAR - Contract required
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Risk Assessment Questions */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Assessment</h3>
                {selectedVendor && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm">
                      <span className="font-medium">Vendor Risk Level:</span> 
                      <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${
                        selectedVendor.risk_category === 'high' ? 'bg-red-200 text-red-800' :
                        selectedVendor.risk_category === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-green-200 text-green-800'
                      }`}>
                        {selectedVendor.risk_category?.toUpperCase()}
                      </span>
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.has_data_access}
                      onChange={(e) => setFormData({ ...formData, has_data_access: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span className="text-sm text-gray-700">Does vendor require data access?</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.has_onsite_presence}
                      onChange={(e) => setFormData({ ...formData, has_onsite_presence: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span className="text-sm text-gray-700">Does vendor require onsite presence?</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.has_implementation}
                      onChange={(e) => setFormData({ ...formData, has_implementation: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span className="text-sm text-gray-700">Does this involve implementation services?</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.duration_more_than_year}
                      onChange={(e) => setFormData({ ...formData, duration_more_than_year: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span className="text-sm text-gray-700">Is duration more than one year?</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Create Purchase Order
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default PurchaseOrders;
