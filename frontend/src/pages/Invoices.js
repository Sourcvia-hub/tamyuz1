import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAuth } from '../App';
import { Link } from 'react-router-dom';
import SearchableSelect from '../components/SearchableSelect';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Invoices = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [contracts, setContracts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [duplicateError, setDuplicateError] = useState('');

  const [formData, setFormData] = useState({
    invoice_number: '',
    contract_id: '',
    vendor_id: '',
    amount: '',
    description: '',
  });

  useEffect(() => {
    fetchInvoices();
    if (user?.role === 'procurement_officer') {
      fetchContracts();
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

  const fetchVendors = async () => {
    try {
      const response = await axios.get(`${API}/vendors?status=approved`, { withCredentials: true });
      setVendors(response.data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const handleContractSelect = (contractId) => {
    const selectedContract = contracts.find(c => c.id === contractId);
    if (selectedContract) {
      setFormData({
        ...formData,
        contract_id: contractId,
        vendor_id: selectedContract.vendor_id // Auto-populate vendor from contract
      });
    }
  };

  const handleSubmitInvoice = async (e) => {
    e.preventDefault();
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
        vendor_id: '',
        amount: '',
        description: '',
      });
      fetchInvoices();
    } catch (error) {
      console.error('Error submitting invoice:', error);
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
              onClick={() => setShowCreateModal(true)}
              data-testid="submit-invoice-btn"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Submit Invoice
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <span className="text-6xl mb-4 block">💰</span>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No invoices found</h3>
            <p className="text-gray-600">No invoices have been submitted yet.</p>
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
                {invoices.map((invoice) => (
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
        )}
      </div>

      {/* Submit Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Submit Invoice</h2>
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
                  Vendor * {formData.contract_id && <span className="text-xs text-gray-500">(Auto-populated from contract)</span>}
                </label>
                <SearchableSelect
                  options={vendors.map(vendor => ({
                    value: vendor.id,
                    label: `${vendor.vendor_number ? `${vendor.vendor_number} - ` : ''}${vendor.name_english || vendor.commercial_name || vendor.company_name || 'Unknown Vendor'}`
                  }))}
                  value={formData.vendor_id}
                  onChange={(value) => setFormData({ ...formData, vendor_id: value })}
                  placeholder="Search and select vendor..."
                  isDisabled={!!formData.contract_id}
                  required={true}
                  isClearable={false}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contract *</label>
                <SearchableSelect
                  options={contracts.map(contract => ({
                    value: contract.id,
                    label: `${contract.contract_number} - ${contract.title}`
                  }))}
                  value={formData.contract_id}
                  onChange={(value) => handleContractSelect(value)}
                  placeholder="Search and select contract..."
                  required={true}
                  isClearable={false}
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
