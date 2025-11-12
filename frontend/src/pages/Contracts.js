import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Contracts = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [formData, setFormData] = useState({
    vendor_id: '',
    contract_number: '',
    title: '',
    sow: '',
    sla: '',
    value: '',
    start_date: '',
    end_date: '',
    is_outsourcing: false,
  });

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const response = await axios.get(`${API}/contracts`, { withCredentials: true });
      setContracts(response.data);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      under_review: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      active: 'bg-blue-100 text-blue-800',
      expired: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contract Management</h1>
          <p className="text-gray-600 mt-1">Manage service agreements and contracts</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : contracts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <span className="text-6xl mb-4 block">📄</span>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No contracts found</h3>
            <p className="text-gray-600">Contracts will appear here once tenders are awarded.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {contracts.map((contract) => (
              <Link
                key={contract.id}
                to={`/contracts/${contract.id}`}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{contract.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">Contract #{contract.contract_number}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(contract.status)}`}>
                    {contract.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 w-24">Value:</span>
                    <span className="text-gray-900 font-medium">${contract.value.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 w-24">Start Date:</span>
                    <span className="text-gray-900 font-medium">{new Date(contract.start_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 w-24">End Date:</span>
                    <span className="text-gray-900 font-medium">{new Date(contract.end_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Contracts;
