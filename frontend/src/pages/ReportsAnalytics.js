import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAuth } from '../App';
import { useToast } from '../hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ReportsAnalytics = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [reportMode, setReportMode] = useState('regular'); // 'regular' or 'expert'
  const [overview, setOverview] = useState(null);
  const [spendAnalysis, setSpendAnalysis] = useState(null);
  const [vendorPerformance, setVendorPerformance] = useState(null);
  const [contractAnalytics, setContractAnalytics] = useState(null);
  const [approvalMetrics, setApprovalMetrics] = useState(null);
  const [spendPeriod, setSpendPeriod] = useState('monthly');

  useEffect(() => {
    fetchData();
  }, [activeTab, spendPeriod, reportMode]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        // Use different endpoints based on report mode
        const endpoint = reportMode === 'expert' 
          ? `${API}/reports/expert-overview` 
          : `${API}/reports/procurement-overview`;
        const res = await axios.get(endpoint, { withCredentials: true });
        setOverview(res.data);
      } else if (activeTab === 'spend') {
        const res = await axios.get(`${API}/reports/spend-analysis?period=${spendPeriod}`, { withCredentials: true });
        setSpendAnalysis(res.data);
      } else if (activeTab === 'vendors') {
        const res = await axios.get(`${API}/reports/vendor-performance`, { withCredentials: true });
        setVendorPerformance(res.data);
      } else if (activeTab === 'contracts') {
        const res = await axios.get(`${API}/reports/contract-analytics`, { withCredentials: true });
        setContractAnalytics(res.data);
      } else if (activeTab === 'approvals') {
        const res = await axios.get(`${API}/reports/approval-metrics`, { withCredentials: true });
        setApprovalMetrics(res.data);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({ title: '❌ Error', description: 'Failed to load report data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (reportType) => {
    try {
      const response = await axios.get(`${API}/reports/export?report_type=${reportType}`, {
        withCredentials: true,
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${reportType}_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast({ title: '✅ Exported', description: 'Report downloaded successfully' });
    } catch (error) {
      toast({ title: '❌ Error', description: 'Failed to export report', variant: 'destructive' });
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(value || 0);
  };

  const tabs = [
    { id: 'overview', label: 'Procurement Overview', icon: '📊' },
    { id: 'spend', label: 'Spend Analysis', icon: '💰' },
    { id: 'vendors', label: 'Vendor Performance', icon: '🏢' },
    { id: 'contracts', label: 'Contract Analytics', icon: '📄' },
    { id: 'approvals', label: 'Approval Metrics', icon: '✅' },
  ];

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-600">Comprehensive procurement insights and metrics</p>
          </div>
          <button
            onClick={() => handleExport(activeTab === 'overview' ? 'procurement-overview' : 
                                        activeTab === 'spend' ? 'spend-analysis' : 
                                        activeTab === 'vendors' ? 'vendor-performance' : 
                                        activeTab === 'contracts' ? 'contract-analytics' : 'procurement-overview')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            📥 Export Report
          </button>
        </div>

        {/* Report Mode Toggle - Only visible on Overview tab */}
        {activeTab === 'overview' && (
          <div className="bg-white rounded-xl shadow p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Report Type</h3>
                <p className="text-sm text-gray-500">
                  {reportMode === 'regular' 
                    ? 'Showing active/approved items only' 
                    : 'Showing all items regardless of status'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setReportMode('regular')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    reportMode === 'regular'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📊 Regular Report
                </button>
                <button
                  onClick={() => setReportMode('expert')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    reportMode === 'expert'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🔬 Expert Report
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && overview && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6">
                    <p className="text-blue-100 text-sm">Total Spend</p>
                    <p className="text-2xl font-bold">{formatCurrency(overview.summary.total_spend)}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6">
                    <p className="text-green-100 text-sm">Active Contracts</p>
                    <p className="text-2xl font-bold">{overview.summary.active_contracts}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6">
                    <p className="text-purple-100 text-sm">Approved Vendors</p>
                    <p className="text-2xl font-bold">{overview.summary.approved_vendors}</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-6">
                    <p className="text-orange-100 text-sm">Pending Payments</p>
                    <p className="text-2xl font-bold">{overview.summary.pending_payments}</p>
                  </div>
                </div>

                {/* Detail Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Vendors */}
                  <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="font-semibold text-lg mb-4">🏢 Vendors</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between"><span className="text-gray-600">Total</span><span className="font-medium">{overview.vendors.total}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Approved</span><span className="font-medium text-green-600">{overview.vendors.approved}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Active (30d)</span><span className="font-medium">{overview.vendors.active_30d}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Approval Rate</span><span className="font-medium">{overview.vendors.approval_rate}%</span></div>
                    </div>
                  </div>

                  {/* Contracts */}
                  <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="font-semibold text-lg mb-4">📄 Contracts</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between"><span className="text-gray-600">Total</span><span className="font-medium">{overview.contracts.total}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Active</span><span className="font-medium text-green-600">{overview.contracts.active}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Expiring Soon</span><span className="font-medium text-orange-600">{overview.contracts.expiring_soon}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Total Value</span><span className="font-medium">{formatCurrency(overview.contracts.total_value)}</span></div>
                    </div>
                  </div>

                  {/* Purchase Orders */}
                  <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="font-semibold text-lg mb-4">📦 Purchase Orders</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between"><span className="text-gray-600">Total</span><span className="font-medium">{overview.purchase_orders.total}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Issued</span><span className="font-medium text-green-600">{overview.purchase_orders.issued}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Total Value</span><span className="font-medium">{formatCurrency(overview.purchase_orders.total_value)}</span></div>
                    </div>
                  </div>

                  {/* Deliverables */}
                  <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="font-semibold text-lg mb-4">📦 Deliverables</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between"><span className="text-gray-600">Total</span><span className="font-medium">{overview.deliverables?.total || 0}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Pending</span><span className="font-medium text-yellow-600">{overview.deliverables?.pending || 0}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Approved</span><span className="font-medium text-green-600">{overview.deliverables?.approved || 0}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Total Value</span><span className="font-medium">{formatCurrency(overview.deliverables?.total_value)}</span></div>
                    </div>
                  </div>

                  {/* Business Requests */}
                  <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="font-semibold text-lg mb-4">📋 Business Requests</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between"><span className="text-gray-600">Total</span><span className="font-medium">{overview.business_requests.total}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Awarded</span><span className="font-medium text-green-600">{overview.business_requests.awarded}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Conversion Rate</span><span className="font-medium">{overview.business_requests.conversion_rate}%</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Spend Analysis Tab */}
            {activeTab === 'spend' && spendAnalysis && (
              <div className="space-y-6">
                {/* Period Selector */}
                <div className="flex gap-2">
                  {['daily', 'weekly', 'monthly', 'quarterly', 'yearly'].map(period => (
                    <button
                      key={period}
                      onClick={() => setSpendPeriod(period)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        spendPeriod === period ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Top Vendors by Spend */}
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="font-semibold text-lg mb-4">🏆 Top Vendors by Spend</h3>
                  <div className="space-y-3">
                    {spendAnalysis.top_vendors_by_spend?.map((vendor, index) => (
                      <div key={vendor.vendor_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                            index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                          }`}>{index + 1}</span>
                          <span className="font-medium">{vendor.vendor_name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600">{formatCurrency(vendor.total_spend)}</p>
                          <p className="text-xs text-gray-500">{vendor.order_count} orders</p>
                        </div>
                      </div>
                    ))}
                    {(!spendAnalysis.top_vendors_by_spend || spendAnalysis.top_vendors_by_spend.length === 0) && (
                      <p className="text-gray-500 text-center py-4">No spending data available</p>
                    )}
                  </div>
                </div>

                {/* PO Spend Trend */}
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="font-semibold text-lg mb-4">📈 PO Spend Trend</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-4">Period</th>
                          <th className="text-right py-2 px-4">Amount</th>
                          <th className="text-right py-2 px-4">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {spendAnalysis.po_spend_trend?.slice(-10).map(item => (
                          <tr key={item.period} className="border-b">
                            <td className="py-2 px-4">{item.period}</td>
                            <td className="text-right py-2 px-4 font-medium">{formatCurrency(item.amount)}</td>
                            <td className="text-right py-2 px-4">{item.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Vendor Performance Tab */}
            {activeTab === 'vendors' && vendorPerformance && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Risk Distribution */}
                  <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="font-semibold text-lg mb-4">⚠️ Risk Distribution</h3>
                    <div className="space-y-3">
                      {Object.entries(vendorPerformance.risk_distribution || {}).map(([risk, count]) => (
                        <div key={risk} className="flex items-center justify-between">
                          <span className={`px-2 py-1 rounded text-sm font-medium ${
                            risk === 'low' ? 'bg-green-100 text-green-800' :
                            risk === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            risk === 'high' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                          }`}>{risk.charAt(0).toUpperCase() + risk.slice(1)}</span>
                          <span className="font-bold">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* DD Completion */}
                  <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="font-semibold text-lg mb-4">📋 Due Diligence Status</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between"><span>Required</span><span className="font-bold">{vendorPerformance.due_diligence?.total_required || 0}</span></div>
                      <div className="flex justify-between"><span>Completed</span><span className="font-bold text-green-600">{vendorPerformance.due_diligence?.completed || 0}</span></div>
                      <div className="mt-4">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Completion Rate</span>
                          <span className="font-bold">{vendorPerformance.due_diligence?.completion_rate || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-green-500 h-3 rounded-full"
                            style={{ width: `${vendorPerformance.due_diligence?.completion_rate || 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Vendors by Contracts */}
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="font-semibold text-lg mb-4">🏆 Top Vendors by Contracts</h3>
                  <div className="space-y-3">
                    {vendorPerformance.top_vendors_by_contracts?.map((vendor, index) => (
                      <div key={vendor.vendor_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                            index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                          }`}>{index + 1}</span>
                          <span className="font-medium">{vendor.vendor_name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600">{vendor.contract_count} contracts</p>
                          <p className="text-xs text-gray-500">{formatCurrency(vendor.total_value)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Contract Analytics Tab */}
            {activeTab === 'contracts' && contractAnalytics && (
              <div className="space-y-6">
                {/* Expiration Alerts */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                    <p className="text-red-600 font-medium">Expiring in 30 Days</p>
                    <p className="text-3xl font-bold text-red-700">{contractAnalytics.expiration_alerts?.expiring_30_days || 0}</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                    <p className="text-orange-600 font-medium">Expiring in 60 Days</p>
                    <p className="text-3xl font-bold text-orange-700">{contractAnalytics.expiration_alerts?.expiring_60_days || 0}</p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                    <p className="text-yellow-600 font-medium">Expiring in 90 Days</p>
                    <p className="text-3xl font-bold text-yellow-700">{contractAnalytics.expiration_alerts?.expiring_90_days || 0}</p>
                  </div>
                </div>

                {/* Status Distribution */}
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="font-semibold text-lg mb-4">📊 Contract Status Distribution</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-4">Status</th>
                          <th className="text-right py-2 px-4">Count</th>
                          <th className="text-right py-2 px-4">Total Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contractAnalytics.status_distribution?.map(item => (
                          <tr key={item.status} className="border-b">
                            <td className="py-2 px-4">
                              <span className={`px-2 py-1 rounded text-sm font-medium ${
                                item.status === 'active' ? 'bg-green-100 text-green-800' :
                                item.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                item.status === 'expired' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                              }`}>{item.status}</span>
                            </td>
                            <td className="text-right py-2 px-4 font-medium">{item.count}</td>
                            <td className="text-right py-2 px-4">{formatCurrency(item.total_value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Value Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl shadow p-6">
                    <p className="text-gray-600 text-sm">Average Contract Value</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(contractAnalytics.value_stats?.average)}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow p-6">
                    <p className="text-gray-600 text-sm">Maximum Contract Value</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(contractAnalytics.value_stats?.maximum)}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow p-6">
                    <p className="text-gray-600 text-sm">Minimum Contract Value</p>
                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(contractAnalytics.value_stats?.minimum)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Approval Metrics Tab */}
            {activeTab === 'approvals' && approvalMetrics && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl p-6">
                  <p className="text-purple-100">Total Pending Approvals</p>
                  <p className="text-4xl font-bold">{approvalMetrics.pending_approvals?.total || 0}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl shadow p-6">
                    <p className="text-gray-600 text-sm">Vendors</p>
                    <p className="text-3xl font-bold text-blue-600">{approvalMetrics.pending_approvals?.vendors || 0}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow p-6">
                    <p className="text-gray-600 text-sm">Contracts</p>
                    <p className="text-3xl font-bold text-green-600">{approvalMetrics.pending_approvals?.contracts || 0}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow p-6">
                    <p className="text-gray-600 text-sm">Deliverables</p>
                    <p className="text-3xl font-bold text-orange-600">{approvalMetrics.pending_approvals?.deliverables || 0}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow p-6">
                    <p className="text-gray-600 text-sm">Business Requests</p>
                    <p className="text-3xl font-bold text-purple-600">{approvalMetrics.pending_approvals?.business_requests || 0}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default ReportsAnalytics;
