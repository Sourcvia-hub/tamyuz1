import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import FileUpload from '../components/FileUpload';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [vendor, setVendor] = useState(null);
  const [contract, setContract] = useState(null);
  const [po, setPO] = useState(null);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    milestone_reference: '',
  });

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const response = await axios.get(`${API}/invoices/${id}`, { withCredentials: true });
      setInvoice(response.data);
      setFormData({
        amount: response.data.amount,
        description: response.data.description,
        milestone_reference: response.data.milestone_reference || '',
      });
      
      // Fetch related entities
      if (response.data.vendor_id) {
        try {
          const vendorRes = await axios.get(`${API}/vendors/${response.data.vendor_id}`, { withCredentials: true });
          setVendor(vendorRes.data);
        } catch (err) {
          console.log('Could not fetch vendor info');
        }
      }
      
      if (response.data.contract_id) {
        try {
          const contractRes = await axios.get(`${API}/contracts/${response.data.contract_id}`, { withCredentials: true });
          setContract(contractRes.data);
        } catch (err) {
          console.log('Could not fetch contract info');
        }
      }
      
      if (response.data.po_id) {
        try {
          const poRes = await axios.get(`${API}/purchase-orders/${response.data.po_id}`, { withCredentials: true });
          setPO(poRes.data);
        } catch (err) {
          console.log('Could not fetch PO info');
        }
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      alert('Invoice not found');
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/invoices/${id}`, formData, { withCredentials: true });
      alert('Invoice updated successfully');
      setIsEditing(false);
      fetchInvoice();
    } catch (error) {
      console.error('Error updating invoice:', error);
      alert('Failed to update invoice');
    }
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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoice Details</h1>
            <p className="text-gray-600 mt-1">Invoice #{invoice.invoice_number}</p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/invoices"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Back to List
            </Link>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Edit Invoice
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </div>

        {/* Invoice Information */}
        {!isEditing ? (
          <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="text-lg font-bold text-gray-900">${invoice.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="text-lg font-bold text-gray-900">{invoice.status.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Contract ID</p>
                  <p className="text-lg font-medium text-gray-900">{invoice.contract_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vendor ID</p>
                  <p className="text-lg font-medium text-gray-900">{invoice.vendor_id}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Description</p>
                  <p className="text-lg font-medium text-gray-900">{invoice.description}</p>
                </div>
                {invoice.milestone_reference && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Milestone Reference</p>
                    <p className="text-lg font-medium text-gray-900">{invoice.milestone_reference}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Submitted At</p>
                  <p className="text-lg font-medium text-gray-900">
                    {new Date(invoice.submitted_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Invoice</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Milestone Reference</label>
                <input
                  type="text"
                  value={formData.milestone_reference}
                  onChange={(e) => setFormData({ ...formData, milestone_reference: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* File Attachments */}
              <div className="mt-6">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Invoice File Attachment</h4>
                <FileUpload
                  entityId={id}
                  module="invoices"
                  label="Attach Invoice File (PDF, DOCX, Images)"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
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

        {/* Related Vendor */}
        {!isEditing && vendor && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Vendor Information</h3>
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-gray-900 text-lg">{vendor.name}</h4>
                  <p className="text-gray-600 mt-1">{vendor.email}</p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="text-gray-500">Category: {vendor.category}</span>
                    {vendor.risk_score !== undefined && (
                      <span className={`font-medium ${
                        vendor.risk_score >= 70 ? 'text-red-600' :
                        vendor.risk_score >= 40 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        Risk Score: {vendor.risk_score}
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  to={`/vendors/${vendor.id}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Vendor
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Related Contract */}
        {!isEditing && contract && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Related Contract</h3>
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-gray-900 text-lg">Contract #{contract.contract_number}</h4>
                  <p className="text-gray-600 mt-1">{contract.title}</p>
                  <div className="flex gap-4 mt-2 text-sm text-gray-500">
                    <span>Value: ${contract.value?.toLocaleString()}</span>
                    <span>Status: {contract.status}</span>
                  </div>
                </div>
                <Link
                  to={`/contracts/${contract.id}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Contract
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Related Purchase Order */}
        {!isEditing && po && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Related Purchase Order</h3>
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-gray-900 text-lg">PO #{po.po_number}</h4>
                  <div className="flex gap-4 mt-2 text-sm text-gray-500">
                    <span>Amount: ${po.total_amount?.toLocaleString()}</span>
                    <span>Status: {po.status}</span>
                    <span>Items: {po.items?.length || 0}</span>
                  </div>
                </div>
                <Link
                  to={`/purchase-orders/${po.id}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View PO
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default InvoiceDetail;
