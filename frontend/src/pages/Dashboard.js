import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAuth } from '../App';
import { Link } from 'react-router-dom';
import { canCreate, Module } from '../utils/permissions';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    procurement: true,
    operations: false
  });

  const userRole = user?.role?.toLowerCase() || '';
  const isHoP = ['procurement_manager', 'admin', 'hop'].includes(userRole);
  const isOfficer = ['procurement_officer', 'procurement_manager', 'admin'].includes(userRole);
  const isUser = userRole === 'user' || userRole === 'business_user';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, approvalsRes] = await Promise.all([
        axios.get(`${API}/dashboard`, { withCredentials: true }),
        axios.get(`${API}/business-requests/my-pending-approvals`, { withCredentials: true }).catch(() => ({ data: { notifications: [] } }))
      ]);
      setStats(statsRes.data);
      setPendingApprovals(approvalsRes.data.notifications || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Calculate key metrics
  const keyMetrics = {
    pendingApprovals: pendingApprovals.length,
    activeContracts: stats?.contracts?.active || 0,
    pendingTenders: (stats?.tenders?.waiting_proposals || 0) + (stats?.tenders?.waiting_evaluation || 0),
    highRiskVendors: stats?.vendors?.high_risk || 0,
    openServiceRequests: stats?.osr?.open || 0,
    dueDiligencePending: stats?.vendors?.waiting_due_diligence || 0,
  };

  // Priority alerts based on role
  const getPriorityAlerts = () => {
    const alerts = [];
    
    if (pendingApprovals.length > 0) {
      alerts.push({
        type: 'warning',
        icon: '⏰',
        message: `${pendingApprovals.length} item${pendingApprovals.length > 1 ? 's' : ''} awaiting your approval`,
        link: '/my-approvals',
        priority: 1
      });
    }
    
    if (stats?.vendors?.high_risk > 0) {
      alerts.push({
        type: 'danger',
        icon: '⚠️',
        message: `${stats.vendors.high_risk} high-risk vendor${stats.vendors.high_risk > 1 ? 's' : ''} require attention`,
        link: '/vendors',
        priority: 2
      });
    }
    
    if (stats?.contracts?.expired > 0) {
      alerts.push({
        type: 'danger',
        icon: '📅',
        message: `${stats.contracts.expired} contract${stats.contracts.expired > 1 ? 's' : ''} expired`,
        link: '/contracts?filter=expired',
        priority: 3
      });
    }
    
    if (stats?.vendors?.waiting_due_diligence > 0 && isOfficer) {
      alerts.push({
        type: 'info',
        icon: '📋',
        message: `${stats.vendors.waiting_due_diligence} vendor${stats.vendors.waiting_due_diligence > 1 ? 's' : ''} pending due diligence`,
        link: '/vendors',
        priority: 4
      });
    }

    if (stats?.osr?.high_priority > 0) {
      alerts.push({
        type: 'danger',
        icon: '🔴',
        message: `${stats.osr.high_priority} high priority service request${stats.osr.high_priority > 1 ? 's' : ''}`,
        link: '/osr',
        priority: 5
      });
    }

    return alerts.sort((a, b) => a.priority - b.priority).slice(0, 4);
  };

  // Role-based quick actions
  const getQuickActions = () => {
    if (isHoP) {
      return [
        { icon: '✅', label: 'My Approvals', description: 'Review pending items', link: '/my-approvals', color: 'bg-purple-500' },
        { icon: '📊', label: 'Approvals Hub', description: 'Full overview', link: '/approvals-hub', color: 'bg-blue-500' },
        { icon: '📈', label: 'Reports', description: 'Analytics & insights', link: '/reports', color: 'bg-green-500' },
        { icon: '⚙️', label: 'Settings', description: 'System configuration', link: '/admin/settings', color: 'bg-gray-500' },
      ];
    } else if (isOfficer) {
      return [
        { icon: '📋', label: 'Business Requests', description: 'Manage PRs', link: '/tenders', color: 'bg-blue-500' },
        { icon: '🏢', label: 'Vendors', description: 'Manage vendors', link: '/vendors', color: 'bg-indigo-500' },
        { icon: '📄', label: 'Contracts', description: 'Contract management', link: '/contracts', color: 'bg-green-500' },
        { icon: '📦', label: 'Deliverables', description: 'Track deliveries', link: '/deliverables', color: 'bg-orange-500' },
      ];
    } else {
      return [
        { icon: '📋', label: 'My Requests', description: 'View your PRs', link: '/tenders', color: 'bg-blue-500' },
        { icon: '➕', label: 'New Request', description: 'Raise a PR', link: '/tenders', color: 'bg-green-500' },
        { icon: '📊', label: 'Track Status', description: 'Check progress', link: '/tenders', color: 'bg-purple-500' },
        { icon: '🔧', label: 'Service Request', description: 'Report an issue', link: '/osr', color: 'bg-orange-500' },
      ];
    }
  };

  const alerts = getPriorityAlerts();
  const quickActions = getQuickActions();

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
      <div className="space-y-6 max-w-7xl mx-auto" data-testid="dashboard">
        {/* Welcome Header with Role Badge */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Welcome back, {user?.name?.split(' ')[0]}!
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-gray-600">Sourcevia Procurement</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                isHoP ? 'bg-purple-100 text-purple-800' :
                isOfficer ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {isHoP ? '👑 Head of Procurement' : isOfficer ? '📋 Procurement Officer' : '👤 Business User'}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              to="/reports"
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              📈 Reports
            </Link>
            <Link
              to="/bulk-import"
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              📤 Import
            </Link>
          </div>
        </div>

        {/* Priority Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert, idx) => (
              <Link
                key={idx}
                to={alert.link}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-md ${
                  alert.type === 'danger' ? 'bg-red-50 border-red-200 hover:bg-red-100' :
                  alert.type === 'warning' ? 'bg-amber-50 border-amber-200 hover:bg-amber-100' :
                  'bg-blue-50 border-blue-200 hover:bg-blue-100'
                }`}
              >
                <span className="text-xl">{alert.icon}</span>
                <span className="flex-1 font-medium text-gray-800">{alert.message}</span>
                <span className="text-gray-400">→</span>
              </Link>
            ))}
          </div>
        )}

        {/* Key Metrics - Compact Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard
            label="Pending Approvals"
            value={keyMetrics.pendingApprovals}
            trend={keyMetrics.pendingApprovals > 0 ? 'up' : 'neutral'}
            color="purple"
            link="/my-approvals"
          />
          <MetricCard
            label="Active Contracts"
            value={keyMetrics.activeContracts}
            trend="neutral"
            color="green"
            link="/contracts"
          />
          <MetricCard
            label="Open Tenders"
            value={keyMetrics.pendingTenders}
            trend={keyMetrics.pendingTenders > 0 ? 'up' : 'neutral'}
            color="blue"
            link="/tenders"
          />
          <MetricCard
            label="High Risk Vendors"
            value={keyMetrics.highRiskVendors}
            trend={keyMetrics.highRiskVendors > 0 ? 'up' : 'neutral'}
            color="red"
            link="/vendors"
          />
          <MetricCard
            label="DD Pending"
            value={keyMetrics.dueDiligencePending}
            trend="neutral"
            color="amber"
            link="/vendors"
          />
          <MetricCard
            label="Open Requests"
            value={keyMetrics.openServiceRequests}
            trend="neutral"
            color="indigo"
            link="/osr"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action, idx) => (
              <Link
                key={idx}
                to={action.link}
                className="flex items-center gap-3 p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all bg-white"
              >
                <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center text-white text-lg`}>
                  {action.icon}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{action.label}</p>
                  <p className="text-xs text-gray-500 truncate">{action.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Pending Approvals Section - For HoP/Officers */}
        {(isHoP || isOfficer) && pendingApprovals.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                📥 Pending Your Action ({pendingApprovals.length})
              </h2>
              <Link to="/my-approvals" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                View All →
              </Link>
            </div>
            <div className="space-y-2">
              {pendingApprovals.slice(0, 5).map((item, idx) => (
                <PendingItemCard key={idx} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* Collapsible Sections */}
        
        {/* Procurement Overview */}
        <CollapsibleSection
          title="Procurement Overview"
          icon="📊"
          expanded={expandedSections.procurement}
          onToggle={() => toggleSection('procurement')}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Vendors Summary */}
            <SummaryCard
              title="Vendors"
              icon="🏢"
              link="/vendors"
              stats={[
                { label: 'Total', value: stats?.vendors?.all || 0 },
                { label: 'Active', value: stats?.vendors?.active || 0, color: 'text-green-600' },
                { label: 'High Risk', value: stats?.vendors?.high_risk || 0, color: 'text-red-600' },
              ]}
            />
            
            {/* Contracts Summary */}
            <SummaryCard
              title="Contracts"
              icon="📄"
              link="/contracts"
              stats={[
                { label: 'Total', value: stats?.contracts?.all || 0 },
                { label: 'Active', value: stats?.contracts?.active || 0, color: 'text-green-600' },
                { label: 'Expired', value: stats?.contracts?.expired || 0, color: 'text-red-600' },
              ]}
            />
            
            {/* Tenders Summary */}
            <SummaryCard
              title="Business Requests"
              icon="📋"
              link="/tenders"
              stats={[
                { label: 'Total', value: stats?.tenders?.all || 0 },
                { label: 'Active', value: stats?.tenders?.active || 0, color: 'text-blue-600' },
                { label: 'Approved', value: stats?.tenders?.approved || 0, color: 'text-green-600' },
              ]}
            />
          </div>
        </CollapsibleSection>

        {/* Operations & Assets - Hidden for business users */}
        {!isUser && (
          <CollapsibleSection
            title="Operations & Facilities"
            icon="🏗️"
            expanded={expandedSections.operations}
            onToggle={() => toggleSection('operations')}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Assets Summary */}
              <SummaryCard
                title="Assets"
                icon="🏢"
                link="/assets"
                stats={[
                  { label: 'Total', value: stats?.assets?.total || 0 },
                  { label: 'Active', value: stats?.assets?.active || 0, color: 'text-green-600' },
                  { label: 'Maintenance', value: stats?.assets?.under_maintenance || 0, color: 'text-yellow-600' },
                ]}
              />
              
              {/* Service Requests Summary */}
              <SummaryCard
                title="Service Requests"
              icon="🔧"
              link="/osr"
              stats={[
                { label: 'Total', value: stats?.osr?.total || 0 },
                { label: 'Open', value: stats?.osr?.open || 0, color: 'text-blue-600' },
                { label: 'In Progress', value: stats?.osr?.in_progress || 0, color: 'text-purple-600' },
              ]}
            />
            
            {/* Resources Summary */}
            <SummaryCard
              title="Resources"
              icon="👥"
              link="/resources"
              stats={[
                { label: 'Total', value: stats?.resources?.all || 0 },
                { label: 'Active', value: stats?.resources?.active || 0, color: 'text-green-600' },
                { label: 'Offshore', value: stats?.resources?.offshore || 0, color: 'text-blue-600' },
              ]}
            />
          </div>
        </CollapsibleSection>

        {/* Financial Section - Compact */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">💰 Financial Overview</h2>
            <Link to="/deliverables" className="text-emerald-600 hover:text-emerald-800 text-sm font-medium">
              View Deliverables →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-emerald-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Purchase Orders</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.purchase_orders?.all || 0}</p>
              <p className="text-xs text-emerald-600 mt-1">
                {stats?.purchase_orders?.issued || 0} issued
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-emerald-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide">PO Value</p>
              <p className="text-2xl font-bold text-gray-900">
                {((stats?.purchase_orders?.total_value || 0) / 1000).toFixed(0)}K
              </p>
              <p className="text-xs text-gray-500 mt-1">SAR</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-emerald-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Deliverables</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.invoices?.all || 0}</p>
              <p className="text-xs text-amber-600 mt-1">
                {stats?.invoices?.due || 0} pending
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-emerald-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Cloud Contracts</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.contracts?.cloud || 0}</p>
              <p className="text-xs text-blue-600 mt-1">
                + {stats?.contracts?.outsourcing || 0} outsourcing
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

// Metric Card Component
const MetricCard = ({ label, value, trend, color, link }) => {
  const colorClasses = {
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  };

  return (
    <Link
      to={link}
      className={`p-3 rounded-lg border ${colorClasses[color]} hover:shadow-md transition-all`}
    >
      <p className="text-xs font-medium opacity-80 truncate">{label}</p>
      <div className="flex items-center gap-1 mt-1">
        <span className="text-xl font-bold">{value}</span>
        {trend === 'up' && value > 0 && (
          <span className="text-xs">⬆</span>
        )}
      </div>
    </Link>
  );
};

// Pending Item Card
const PendingItemCard = ({ item }) => {
  const typeColors = {
    business_request: 'bg-blue-100 text-blue-800',
    contract: 'bg-purple-100 text-purple-800',
    deliverable: 'bg-green-100 text-green-800',
    asset: 'bg-orange-100 text-orange-800',
  };

  const getLink = () => {
    switch (item.item_type) {
      case 'business_request': return `/tenders/${item.item_id}`;
      case 'contract': return `/contracts/${item.item_id}`;
      case 'deliverable': return '/deliverables';
      case 'asset': return `/assets/${item.item_id}`;
      default: return '/my-approvals';
    }
  };

  return (
    <Link
      to={getLink()}
      className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all"
    >
      <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[item.item_type] || 'bg-gray-100 text-gray-800'}`}>
        {item.item_type?.replace('_', ' ')}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{item.item_title || item.item_number}</p>
        <p className="text-xs text-gray-500 truncate">{item.message}</p>
      </div>
      {item.amount > 0 && (
        <span className="text-sm font-medium text-gray-600">{item.amount?.toLocaleString()} SAR</span>
      )}
      <span className="text-gray-400">→</span>
    </Link>
  );
};

// Summary Card Component
const SummaryCard = ({ title, icon, link, stats }) => (
  <Link
    to={link}
    className="bg-white rounded-lg border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all"
  >
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xl">{icon}</span>
      <h3 className="font-semibold text-gray-900">{title}</h3>
    </div>
    <div className="space-y-2">
      {stats.map((stat, idx) => (
        <div key={idx} className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{stat.label}</span>
          <span className={`font-semibold ${stat.color || 'text-gray-900'}`}>{stat.value}</span>
        </div>
      ))}
    </div>
  </Link>
);

// Collapsible Section Component
const CollapsibleSection = ({ title, icon, expanded, onToggle, children }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      <span className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>
        ▼
      </span>
    </button>
    {expanded && (
      <div className="px-5 pb-5 border-t border-gray-100 pt-4">
        {children}
      </div>
    )}
  </div>
);

export default Dashboard;
