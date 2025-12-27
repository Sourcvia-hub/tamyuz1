import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import FileUpload from '../components/FileUpload';
import { useAuth } from '../App';
import AuditTrail from '../components/AuditTrail';
import EntityWorkflowPanel from '../components/EntityWorkflowPanel';
import { exportPOToPDF } from '../utils/pdfExport';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PurchaseOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [po, setPO] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [tender, setTender] = useState(null);
  const [auditTrail, setAuditTrail] = useState([]);
  const [editFormData, setEditFormData] = useState({
    delivery_time: '',
    items: []
  });

  useEffect(() => {
    fetchPO();
    fetchAuditTrail();
  }, [id]);

  const fetchAuditTrail = async () => {
    try {
      const res = await axios.get(`${API}/purchase-orders/${id}/audit-trail`, { withCredentials: true });
      setAuditTrail(res.data);
    } catch (error) {
      console.log('Audit trail not available or access denied');
    }
  };

  const fetchPO = async () => {
    try {
      const response = await axios.get(`${API}/purchase-orders/${id}`, { withCredentials: true });
      let poData = response.data;
      
      // Fetch vendor name if vendor_id exists
      if (poData.vendor_id && !poData.vendor_name) {
        try {
          const vendorRes = await axios.get(`${API}/vendors/${poData.vendor_id}`, { withCredentials: true });
          poData = { 
            ...poData, 
            vendor_name: vendorRes.data.name_english || vendorRes.data.commercial_name || vendorRes.data.name || poData.vendor_id
          };
        } catch (err) {
          console.log('Could not fetch vendor name');
        }
      }
      
      setPO(poData);
      setEditFormData({
        delivery_time: poData.delivery_time || '',
        items: poData.items || []
      });
      
      // Fetch related tender if applicable
      if (poData.tender_id) {
        try {
          const tenderRes = await axios.get(`${API}/tenders/${poData.tender_id}`, { withCredentials: true });
          setTender(tenderRes.data);
        } catch (err) {
          console.log('Could not fetch tender info');
        }
      }
    } catch (error) {
      console.error('Error fetching PO:', error);
      alert('Purchase Order not found');
      navigate('/purchase-orders');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/purchase-orders/${id}`, editFormData, { withCredentials: true });
      alert('Purchase Order updated successfully');
      setIsEditing(false);
      fetchPO();
    } catch (error) {
      console.error('Error updating PO:', error);
      alert('Failed to update purchase order');
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...editFormData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setEditFormData({ ...editFormData, items: newItems });
  };

  const addItem = () => {
    setEditFormData({
      ...editFormData,
      items: [...editFormData.items, { name: '', quantity: 1, unit_price: 0 }]
    });
  };

  const removeItem = (index) => {
    const newItems = editFormData.items.filter((_, i) => i !== index);
    setEditFormData({ ...editFormData, items: newItems });
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      issued: 'bg-blue-100 text-blue-800',
      converted_to_contract: 'bg-green-100 text-green-800',
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

  const calculateTotal = (items) => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Approval Workflow Panel */}
        <EntityWorkflowPanel
          entityType="po"
          entityId={id}
          entityTitle={po?.title || `PO #${po?.po_number}`}
          onStatusChange={() => fetchPO()}
          showAuditTrail={true}
        />

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Purchase Order Details</h1>
            <p className="text-gray-600 mt-1">PO #{po.po_number}</p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/purchase-orders"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Back to List
            </Link>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Edit PO
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Cancel Edit
              </button>
            )}
            <button
              onClick={() => exportPOToPDF(po, vendor, po.line_items)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              📄 Export PDF
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              🖨️ Print
            </button>
          </div>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Purchase Order</h2>
            <form onSubmit={handleUpdate} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Time</label>
                <input
                  type="text"
                  value={editFormData.delivery_time}
                  onChange={(e) => setEditFormData({ ...editFormData, delivery_time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 30 days"
                />
              </div>

              {/* Items */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">Items</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                  >
                    + Add Item
                  </button>
                </div>
                <div className="space-y-3">
                  {editFormData.items.map((item, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-xs text-gray-600 mb-1">Item Name *</label>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Quantity *</label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                            required
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Unit Price *</label>
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value))}
                            required
                            min="0"
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          Subtotal: ${(item.quantity * item.unit_price).toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {editFormData.items.length > 0 && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">Total Amount:</span>
                      <span className="text-xl font-bold text-blue-600">
                        ${calculateTotal(editFormData.items).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* File Attachments */}
              <div className="mt-6">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Supporting Documents</h4>
                <FileUpload
                  entityId={id}
                  module="purchase_orders"
                  label="Attach Supporting Documents (PDF, DOCX, Images)"
                  accept=".pdf,.doc,.docx,.xlsx,.xls,.png,.jpg,.jpeg"
                  multiple={true}
                  onUploadComplete={(files) => {
                    console.log('Files uploaded:', files);
                  }}
                />
              </div>

              <button
                type="submit"
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </form>
          </div>
        )}

        {/* View Mode */}
        {!isEditing && (
          <>
            {/* Main PO Info */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">PO #{po.po_number}</h2>
                  <p className="text-gray-600 mt-1">Created on {new Date(po.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(po.status)}`}>
                  {po.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Vendor</h3>
                  {po.vendor_id ? (
                    <Link to={`/vendors/${po.vendor_id}`} className="text-blue-600 hover:underline font-medium">
                      {po.vendor_name || po.vendor_id}
                    </Link>
                  ) : (
                    <p className="text-gray-900">N/A</p>
                  )}
                </div>

                {po.tender_id && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Related Tender</h3>
                    <Link to={`/tenders/${po.tender_id}`} className="text-blue-600 hover:underline font-medium">
                      View Tender
                    </Link>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Delivery Time</h3>
                  <p className="text-gray-900">{po.delivery_time || 'Not specified'}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Total Amount</h3>
                  <p className="text-2xl font-bold text-blue-600">${po.total_amount?.toLocaleString()}</p>
                </div>

                {po.requires_contract && (
                  <div className="md:col-span-2">
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-orange-800 font-medium">⚠️ This PO requires a contract</p>
                      {po.converted_to_contract && po.contract_id && (
                        <Link to={`/contracts/${po.contract_id}`} className="text-blue-600 hover:underline mt-2 inline-block">
                          View Contract →
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Items List */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Items ({po.items?.length || 0})</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Item Name</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Quantity</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Unit Price</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {po.items && po.items.length > 0 ? (
                      po.items.map((item, index) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-3 px-4 text-gray-900">{item.name}</td>
                          <td className="py-3 px-4 text-right text-gray-900">{item.quantity}</td>
                          <td className="py-3 px-4 text-right text-gray-900">${item.unit_price?.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right font-medium text-gray-900">
                            ${(item.quantity * item.unit_price).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="py-8 text-center text-gray-500">
                          No items found
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {po.items && po.items.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-gray-300">
                        <td colSpan="3" className="py-4 px-4 text-right font-bold text-gray-900">Total Amount:</td>
                        <td className="py-4 px-4 text-right text-2xl font-bold text-blue-600">
                          ${po.total_amount?.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Classification Details */}
            {(po.has_data_access || po.has_onsite_presence || po.has_implementation || po.duration_more_than_year) && (
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Classification Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-lg ${po.has_data_access ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                    <p className="text-sm text-gray-600 mb-1">Data Access</p>
                    <p className={`font-medium ${po.has_data_access ? 'text-blue-600' : 'text-gray-400'}`}>
                      {po.has_data_access ? '✓ Yes' : '✗ No'}
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg ${po.has_onsite_presence ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                    <p className="text-sm text-gray-600 mb-1">Onsite Presence</p>
                    <p className={`font-medium ${po.has_onsite_presence ? 'text-blue-600' : 'text-gray-400'}`}>
                      {po.has_onsite_presence ? '✓ Yes' : '✗ No'}
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg ${po.has_implementation ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                    <p className="text-sm text-gray-600 mb-1">Implementation</p>
                    <p className={`font-medium ${po.has_implementation ? 'text-blue-600' : 'text-gray-400'}`}>
                      {po.has_implementation ? '✓ Yes' : '✗ No'}
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg ${po.duration_more_than_year ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                    <p className="text-sm text-gray-600 mb-1">Duration &gt; 1 Year</p>
                    <p className={`font-medium ${po.duration_more_than_year ? 'text-blue-600' : 'text-gray-400'}`}>
                      {po.duration_more_than_year ? '✓ Yes' : '✗ No'}
                    </p>
                  </div>
                </div>
                {po.requires_contract && (
                  <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800">
                      <strong>Contract Required:</strong> This PO meets the criteria requiring a formal contract.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Financial Summary */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Financial Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                  <p className="text-2xl font-bold text-blue-600">${po.total_amount?.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900">{po.items?.length || 0}</p>
                </div>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Average Item Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${po.items?.length > 0 ? (po.total_amount / po.items.length).toLocaleString(undefined, {maximumFractionDigits: 2}) : '0'}
                  </p>
                </div>
              </div>
              {po.requires_contract && (
                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-orange-800">
                    <strong>⚠️ Contract Required:</strong> This PO requires a formal contract due to its value or classification.
                  </p>
                </div>
              )}
            </div>

            {/* Related Tender */}
            {tender && (
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Related Tender</h3>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900 text-lg">{tender.title}</h4>
                      <p className="text-gray-600 mt-1">{tender.description}</p>
                    </div>
                    <Link
                      to={`/tenders/${tender.id}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      View Tender
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-gray-500">Budget</p>
                      <p className="font-medium text-gray-900">${tender.budget?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Deadline</p>
                      <p className="font-medium text-gray-900">{new Date(tender.deadline).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <p className="font-medium text-gray-900">{tender.status}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Proposals</p>
                      <p className="font-medium text-gray-900">{tender.proposals_count || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Audit Trail */}
            <AuditTrail 
              auditTrail={auditTrail} 
              entityType="purchase_order" 
              userRole={user?.role} 
            />
          </>
        )}
      </div>
    </Layout>
  );
};

export default PurchaseOrderDetail;
