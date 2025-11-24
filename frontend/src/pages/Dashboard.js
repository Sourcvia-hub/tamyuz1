import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAuth } from '../App';
import { Link } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await axios.get(`${API}/dashboard`, { withCredentials: true });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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

  const handleExport = async (module) => {
    try {
      const response = await axios.get(`${API}/export/${module}`, {
        withCredentials: true,
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${module}_export.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  const StatCard = ({ icon, label, value, color, link, filterType }) => {
    const linkWithFilter = filterType ? `${link}?filter=${filterType}` : link;
    return (
      <Link
        to={linkWithFilter}
        className={`block p-4 rounded-lg border-2 ${color} hover:shadow-lg transition-all transform hover:-translate-y-1`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{icon}</span>
            <div>
              <p className="text-xs text-gray-600 font-medium">{label}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <Layout>
      <div className="space-y-8" data-testid="dashboard">
        {/* Welcome Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name}!</h1>
          <p className="text-gray-600 mt-1">Sourcevia Procurement Management System Dashboard</p>
        </div>

        {/* Vendors Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🏢</span>
              <h2 className="text-2xl font-bold text-gray-900">Vendors</h2>
            </div>
            <button
              onClick={() => handleExport('vendors')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <span>📥</span>
              <span className="font-medium">Export to Excel</span>
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard
              icon="📊"
              label="All Active"
              value={stats?.vendors.active || 0}
              color="bg-blue-50 border-blue-200"
              link="/vendors"
            />
            <StatCard
              icon="⚠️"
              label="High Risk"
              value={stats?.vendors.high_risk || 0}
              color="bg-red-50 border-red-200"
              link="/vendors"
            />
            <StatCard
              icon="📋"
              label="Due Diligence"
              value={stats?.vendors.waiting_due_diligence || 0}
              color="bg-yellow-50 border-yellow-200"
              link="/vendors"
            />
            <StatCard
              icon="💤"
              label="Inactive"
              value={stats?.vendors.inactive || 0}
              color="bg-gray-50 border-gray-200"
              link="/vendors"
            />
            <StatCard
              icon="🚫"
              label="Blacklisted"
              value={stats?.vendors.blacklisted || 0}
              color="bg-black border-gray-800 text-white"
              link="/vendors"
            />
            <StatCard
              icon="🏢"
              label="Total"
              value={stats?.vendors.all || 0}
              color="bg-indigo-50 border-indigo-200"
              link="/vendors"
            />
          </div>
        </div>

        {/* Tenders Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="text-3xl">📋</span>
              <h2 className="text-2xl font-bold text-gray-900">Tenders</h2>
            </div>
            <button
              onClick={() => handleExport('tenders')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <span>📥</span>
              <span className="font-medium">Export to Excel</span>
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard
              icon="✅"
              label="Active"
              value={stats?.tenders.active || 0}
              color="bg-green-50 border-green-200"
              link="/tenders"
            />
            <StatCard
              icon="⏳"
              label="Waiting Proposals"
              value={stats?.tenders.waiting_proposals || 0}
              color="bg-orange-50 border-orange-200"
              link="/tenders"
            />
            <StatCard
              icon="📊"
              label="Waiting Evaluation"
              value={stats?.tenders.waiting_evaluation || 0}
              color="bg-purple-50 border-purple-200"
              link="/tenders"
            />
            <StatCard
              icon="🏆"
              label="Approved"
              value={stats?.tenders.approved || 0}
              color="bg-blue-50 border-blue-200"
              link="/tenders"
            />
            <StatCard
              icon="📋"
              label="Total"
              value={stats?.tenders.all || 0}
              color="bg-indigo-50 border-indigo-200"
              link="/tenders"
            />
          </div>
        </div>

        {/* Contracts Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="text-3xl">📄</span>
              <h2 className="text-2xl font-bold text-gray-900">Contracts</h2>
            </div>
            <button
              onClick={() => handleExport('contracts')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <span>📥</span>
              <span className="font-medium">Export to Excel</span>
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard
              icon="✅"
              label="Active"
              value={stats?.contracts.active || 0}
              color="bg-green-50 border-green-200"
              link="/contracts"
              filterType="active"
            />
            <StatCard
              icon="🔄"
              label="Outsourcing"
              value={stats?.contracts.outsourcing || 0}
              color="bg-orange-50 border-orange-200"
              link="/contracts"
              filterType="outsourcing"
            />
            <StatCard
              icon="☁️"
              label="Cloud"
              value={stats?.contracts.cloud || 0}
              color="bg-cyan-50 border-cyan-200"
              link="/contracts"
              filterType="cloud"
            />
            <StatCard
              icon="📜"
              label="NOC"
              value={stats?.contracts.noc || 0}
              color="bg-purple-50 border-purple-200"
              link="/contracts"
              filterType="noc"
            />
            <StatCard
              icon="⏰"
              label="Expired"
              value={stats?.contracts.expired || 0}
              color="bg-red-50 border-red-200"
              link="/contracts"
              filterType="expired"
            />
            <StatCard
              icon="📄"
              label="Total"
              value={stats?.contracts.all || 0}
              color="bg-indigo-50 border-indigo-200"
              link="/contracts"
            />
          </div>
        </div>

        {/* Invoices Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="text-3xl">💰</span>
              <h2 className="text-2xl font-bold text-gray-900">Invoices</h2>
            </div>
            <button
              onClick={() => handleExport('invoices')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <span>📥</span>
              <span className="font-medium">Export to Excel</span>
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4">
            <StatCard
              icon="💵"
              label="All Invoices"
              value={stats?.invoices.all || 0}
              color="bg-blue-50 border-blue-200"
              link="/invoices"
            />
            <StatCard
              icon="⏰"
              label="Due Invoices"
              value={stats?.invoices.due || 0}
              color="bg-yellow-50 border-yellow-200"
              link="/invoices"
            />
          </div>
        </div>

        {/* Resources Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="text-3xl">👤</span>
              <h2 className="text-2xl font-bold text-gray-900">Resources</h2>
            </div>
            <button
              onClick={() => handleExport('resources')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <span>📥</span>
              <span className="font-medium">Export to Excel</span>
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon="👥"
              label="Total"
              value={stats?.resources?.all || 0}
              color="bg-blue-50 border-blue-200"
              link="/resources"
            />
            <StatCard
              icon="✅"
              label="Active"
              value={stats?.resources?.active || 0}
              color="bg-green-50 border-green-200"
              link="/resources"
            />
            <StatCard
              icon="🌍"
              label="Offshore"
              value={stats?.resources?.offshore || 0}
              color="bg-purple-50 border-purple-200"
              link="/resources"
            />
            <StatCard
              icon="🏢"
              label="On Premises"
              value={stats?.resources?.on_premises || 0}
              color="bg-orange-50 border-orange-200"
              link="/resources"
            />
          </div>
        </div>

        {/* Purchase Orders Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="text-3xl">📝</span>
              <h2 className="text-2xl font-bold text-gray-900">Purchase Orders</h2>
            </div>
            <button
              onClick={() => handleExport('purchase-orders')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <span>📥</span>
              <span className="font-medium">Export to Excel</span>
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon="📊"
              label="Total POs"
              value={stats?.purchase_orders?.all || 0}
              color="bg-blue-50 border-blue-200"
              link="/purchase-orders"
            />
            <StatCard
              icon="✅"
              label="Issued"
              value={stats?.purchase_orders?.issued || 0}
              color="bg-green-50 border-green-200"
              link="/purchase-orders"
            />
            <StatCard
              icon="🔄"
              label="Converted"
              value={stats?.purchase_orders?.converted || 0}
              color="bg-purple-50 border-purple-200"
              link="/purchase-orders"
            />
            <StatCard
              icon="💰"
              label="Total Value"
              value={`$${(stats?.purchase_orders?.total_value || 0).toLocaleString()}`}
              color="bg-orange-50 border-orange-200"
              link="/purchase-orders"
            />
          </div>
        </div>

        {/* Quick Actions */}
        {(user?.role === 'procurement_officer' || user?.role === 'requester' || user?.role === 'pd_officer') && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg p-6 border-2 border-blue-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                to="/vendors"
                className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
              >
                <span className="text-2xl">🏢</span>
                <div>
                  <p className="font-semibold text-gray-900">Manage Vendors</p>
                  <p className="text-xs text-gray-600">Add & Review</p>
                </div>
              </Link>
              <Link
                to="/tenders"
                className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
              >
                <span className="text-2xl">📋</span>
                <div>
                  <p className="font-semibold text-gray-900">Create Tender</p>
                  <p className="text-xs text-gray-600">Start RFP</p>
                </div>
              </Link>
              <Link
                to="/contracts"
                className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
              >
                <span className="text-2xl">📄</span>
                <div>
                  <p className="font-semibold text-gray-900">Manage Contracts</p>
                  <p className="text-xs text-gray-600">Review & Approve</p>
                </div>
              </Link>
              <Link
                to="/invoices"
                className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
              >
                <span className="text-2xl">💰</span>
                <div>
                  <p className="font-semibold text-gray-900">Process Invoices</p>
                  <p className="text-xs text-gray-600">Payment Review</p>
                </div>
              </Link>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
