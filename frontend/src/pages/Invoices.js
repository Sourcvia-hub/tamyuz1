import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAuth } from '../App';
import { Link } from 'react-router-dom';
import SearchableSelect from '../components/SearchableSelect';
import AIInvoiceMatcher from '../components/AIInvoiceMatcher';
import FileUpload from '../components/FileUpload';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Invoices = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [contracts, setContracts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [duplicateError, setDuplicateError] = useState('');
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [filteredPOs, setFilteredPOs] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    invoice_number: '',
    contract_id: '',
    po_id: '',
    vendor_id: '',
    amount: '',
    description: '',
  });

  useEffect(() => {
    fetchInvoices();
    if (user?.role === 'procurement_officer') {
      fetchContracts();
      fetchPurchaseOrders();
      fetchVendors();
    }
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await axios.get(`${API}/invoices`, { withCredentials: true });
      setInvoices(response.data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContracts = async () => {
    try {
      const response = await axios.get(`${API}/contracts`, { withCredentials: true });
      setContracts(response.data);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const response = await axios.get(`${API}/purchase-orders`, { withCredentials: true });
      setPurchaseOrders(response.data);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
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

  const handleVendorSelect = (vendorId) => {
    // Filter contracts and POs by selected vendor
    const vendorContracts = contracts.filter(c => c.vendor_id === vendorId);
    const vendorPOs = purchaseOrders.filter(po => po.vendor_id === vendorId);
    setFilteredContracts(vendorContracts);
    setFilteredPOs(vendorPOs);
    
    // Clear contract/PO if they don't belong to this vendor
    const contractStillValid = vendorContracts.find(c => c.id === formData.contract_id);
    const poStillValid = vendorPOs.find(po => po.id === formData.po_id);
    
    setFormData(prev => ({
      ...prev,
      vendor_id: vendorId,
      contract_id: contractStillValid ? prev.contract_id : '',
      po_id: poStillValid ? prev.po_id : ''
    }));
  };

  const handleContractOrPOSelect = (value) => {
    // Check if it's a contract or PO (format: "contract-{id}" or "po-{id}")
    // Use substring instead of split to handle IDs with hyphens
    if (value.startsWith('contract-')) {
      const id = value.substring(9); // Remove "contract-" prefix
      const selectedContract = contracts.find(c => c.id === id);
      if (selectedContract) {
        setFormData({
          ...formData,
          contract_id: id,
          po_id: '',
          vendor_id: selectedContract.vendor_id
        });
        // Update filtered lists
        const vendorContracts = contracts.filter(c => c.vendor_id === selectedContract.vendor_id);
        const vendorPOs = purchaseOrders.filter(po => po.vendor_id === selectedContract.vendor_id);
        setFilteredContracts(vendorContracts);
        setFilteredPOs(vendorPOs);
      }
    } else if (value.startsWith('po-')) {
      const id = value.substring(3); // Remove "po-" prefix
      const selectedPO = purchaseOrders.find(po => po.id === id);
      if (selectedPO) {
        setFormData({
          ...formData,
          po_id: id,
          contract_id: '',
          vendor_id: selectedPO.vendor_id
        });
        // Update filtered lists
        const vendorContracts = contracts.filter(c => c.vendor_id === selectedPO.vendor_id);
        const vendorPOs = purchaseOrders.filter(po => po.vendor_id === selectedPO.vendor_id);
        setFilteredContracts(vendorContracts);
        setFilteredPOs(vendorPOs);
      }
    }
  };

  const handleSubmitInvoice = async (e) => {
    e.preventDefault();
    
    // Check for duplicate invoice (same invoice_number and vendor_id)
    const duplicate = invoices.find(
      inv => inv.invoice_number === formData.invoice_number && inv.vendor_id === formData.vendor_id
    );
    
    if (duplicate) {
      setDuplicateError(`Duplicate invoice detected! Invoice number "${formData.invoice_number}" already exists for this vendor. Please use a different invoice number.`);
      return;
    }
    
    // Clear any previous error
    setDuplicateError('');
    
    try {
      await axios.post(
        `${API}/invoices`,
        {
          ...formData,
          amount: parseFloat(formData.amount),
          documents: [],
        },
        { withCredentials: true }
      );
      setShowCreateModal(false);
      setFormData({
        invoice_number: '',
        contract_id: '',
        po_id: '',
        vendor_id: '',
        amount: '',
        description: '',
      });
      setDuplicateError('');
      setFilteredContracts([]);
      setFilteredPOs([]);
      fetchInvoices();
    } catch (error) {
      console.error('Error submitting invoice:', error);
      if (error.response?.data?.detail) {
        setDuplicateError(error.response.data.detail);
      }
    }
  };

  const handleVerify = async (invoiceId) => {
    try {
      await axios.put(`${API}/invoices/${invoiceId}/verify`, {}, { withCredentials: true });
      fetchInvoices();
    } catch (error) {
      console.error('Error verifying invoice:', error);
    }
  };

  const handleApprove = async (invoiceId) => {
    try {
      await axios.put(`${API}/invoices/${invoiceId}/approve`, {}, { withCredentials: true });
      fetchInvoices();
    } catch (error) {
      console.error('Error approving invoice:', error);
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      paid: 'bg-purple-100 text-purple-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoice Management</h1>
            <p className="text-gray-600 mt-1">Submit and track invoice payments</p>
          </div>
          {user?.role === 'procurement_officer' && (
            <button
              onClick={() => {
                setShowCreateModal(true);
                setDuplicateError(''); // Clear error when opening modal
                setFilteredContracts([]); // Reset filtered contracts
                setFilteredPOs([]); // Reset filtered POs
              }}
              data-testid="submit-invoice-btn"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Submit Invoice
            </button>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            All ({invoices.length})
          </button>
          <button
            onClick={() => setActiveFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeFilter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            Pending ({invoices.filter(i => i.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveFilter('verified')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeFilter === 'verified' ? 'bg-cyan-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            Verified ({invoices.filter(i => i.status === 'verified').length})
          </button>
          <button
            onClick={() => setActiveFilter('approved')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeFilter === 'approved' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            Approved ({invoices.filter(i => i.status === 'approved').length})
          </button>
          <button
            onClick={() => setActiveFilter('paid')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeFilter === 'paid' ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            Paid ({invoices.filter(i => i.status === 'paid').length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-md p-4">
          <input
            type="text"
            placeholder="Search by invoice number, vendor, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (() => {
          const filteredInvoices = invoices.filter(invoice => {
            // Apply filter
            if (activeFilter !== 'all' && invoice.status !== activeFilter) return false;
            
            // Apply search
            if (searchQuery) {
              const query = searchQuery.toLowerCase();
              return (
                invoice.invoice_number?.toLowerCase().includes(query) ||
                invoice.vendor_name?.toLowerCase().includes(query) ||
                invoice.description?.toLowerCase().includes(query)
              );
            }
            return true;
          });

          return filteredInvoices.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <span className="text-6xl mb-4 block">💰</span>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No invoices found</h3>
              <p className="text-gray-600">
                {searchQuery ? 'Try adjusting your search criteria.' : 'No invoices have been submitted yet.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{invoice.invoice_number}</div>
                      <div className="text-sm text-gray-500">{invoice.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">${invoice.amount.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(invoice.status)}`}>
                        {invoice.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <Link
                        to={`/invoices/${invoice.id}`}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        View Details
                      </Link>
                      {invoice.status === 'pending' && user?.role === 'procurement_officer' && (
                        <button
                          onClick={() => handleVerify(invoice.id)}
                          className="text-green-600 hover:text-green-900 font-medium"
                        >
                          Verify
                        </button>
                      )}
                      {invoice.status === 'verified' && user?.role === 'project_manager' && (
                        <button
                          onClick={() => handleApprove(invoice.id)}
                          className="text-green-600 hover:text-green-900 font-medium"
                        >
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          );
        })()}
      </div>

      {/* Submit Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Submit Invoice</h2>
            
            {/* Duplicate Error Message */}
            {duplicateError && (
              <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <h3 className="font-bold text-red-900 mb-1">Duplicate Invoice Error</h3>
                    <p className="text-sm text-red-700">{duplicateError}</p>
                  </div>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmitInvoice} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Number *</label>
                <input
                  type="text"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vendor *
                </label>
                <SearchableSelect
                  options={vendors.map(vendor => ({
                    value: vendor.id,
                    label: `${vendor.vendor_number ? `${vendor.vendor_number} - ` : ''}${vendor.name_english || vendor.commercial_name || vendor.company_name || 'Unknown Vendor'}`
                  }))}
                  value={formData.vendor_id}
                  onChange={(value) => handleVendorSelect(value)}
                  placeholder="Search and select vendor..."
                  required={true}
                  isClearable={false}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contract or PO * {formData.vendor_id && !formData.contract_id && !formData.po_id && <span className="text-xs text-gray-500">({filteredContracts.length} contracts, {filteredPOs.length} POs)</span>}
                </label>
                <SearchableSelect
                  options={[
                    ...(formData.vendor_id ? filteredContracts : contracts).map(contract => ({
                      value: `contract-${contract.id}`,
                      label: `📄 Contract: ${contract.contract_number} - ${contract.title}`
                    })),
                    ...(formData.vendor_id ? filteredPOs : purchaseOrders).map(po => ({
                      value: `po-${po.id}`,
                      label: `📝 PO: ${po.po_number} - ${po.vendor_name || 'Purchase Order'}`
                    }))
                  ]}
                  value={formData.contract_id ? `contract-${formData.contract_id}` : formData.po_id ? `po-${formData.po_id}` : ''}
                  onChange={(value) => handleContractOrPOSelect(value)}
                  placeholder={formData.vendor_id ? "Search and select contract or PO..." : "Select vendor first..."}
                  required={true}
                  isClearable={false}
                  isDisabled={!formData.vendor_id && !formData.contract_id && !formData.po_id}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* AI Invoice Matcher */}
              {formData.contract_id && formData.description && formData.description.trim().length >= 10 && (
                <AIInvoiceMatcher 
                  invoiceDescription={formData.description}
                  milestones={contracts.find(c => c.id === formData.contract_id)?.milestones || []}
                  onMilestoneMatched={(milestoneName) => {
                    console.log('AI matched milestone:', milestoneName);
                    // Optionally update form with matched milestone
                  }}
                />
              )}

              {/* File Attachments */}
              <div className="mt-6 p-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">📎 Invoice File Attachment</p>
                <p className="text-xs text-gray-500">Save the invoice first to enable file uploads</p>
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
                  Submit Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Invoices;
