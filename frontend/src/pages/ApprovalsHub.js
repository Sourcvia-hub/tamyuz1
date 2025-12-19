import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ApprovalsHub = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [moduleData, setModuleData] = useState({});
  const [moduleLoading, setModuleLoading] = useState(false);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const response = await axios.get(`${API}/approvals-hub/summary`, { withCredentials: true });
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchModuleData = async (module) => {
    setModuleLoading(true);
    try {
      const response = await axios.get(`${API}/approvals-hub/${module}`, { withCredentials: true });
      setModuleData(prev => ({ ...prev, [module]: response.data }));
    } catch (error) {
      console.error(`Error fetching ${module}:`, error);
    } finally {
      setModuleLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab !== 'overview' && !moduleData[tab]) {
      fetchModuleData(tab);
    }
  };

  const modules = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'vendors', label: 'Vendors', icon: '🏢', color: 'blue' },
    { key: 'business-requests', label: 'Business Requests', icon: '📝', color: 'purple' },
    { key: 'contracts', label: 'Contracts', icon: '📄', color: 'green' },
    { key: 'purchase-orders', label: 'Purchase Orders', icon: '🛒', color: 'orange' },
    { key: 'deliverables', label: 'Deliverables', icon: '📦', color: 'yellow' },
    { key: 'resources', label: 'Resources', icon: '👥', color: 'indigo' },
    { key: 'assets', label: 'Assets', icon: '🖥️', color: 'gray' },
  ];

  const getStatusBadge = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      pending_review: 'bg-blue-100 text-blue-800',
      pending_due_diligence: 'bg-purple-100 text-purple-800',
      pending_approval: 'bg-orange-100 text-orange-800',
      pending_hop_approval: 'bg-red-100 text-red-800',
      verified: 'bg-green-100 text-green-800',
      published: 'bg-blue-100 text-blue-800',
      closed: 'bg-orange-100 text-orange-800',
      active: 'bg-green-100 text-green-800',
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span>📋</span> Approvals Hub
            </h1>
            <p className="text-gray-600 mt-1">Unified dashboard for all pending approvals and actions</p>
          </div>
          <div className="bg-blue-50 px-4 py-2 rounded-lg">
            <span className="text-sm text-blue-600">Total Pending: </span>
            <span className="text-xl font-bold text-blue-700">{summary?.total_all || 0}</span>
          </div>
        </div>

        {/* Module Tabs */}
        <div className="flex flex-wrap gap-2 border-b pb-4">
          {modules.map(module => (
            <button
              key={module.key}
              onClick={() => handleTabChange(module.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === module.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              <span>{module.icon}</span>
              {module.label}
              {module.key !== 'overview' && summary?.[module.key.replace('-', '_')]?.total_pending > 0 && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === module.key ? 'bg-white text-blue-600' : 'bg-red-100 text-red-700'
                }`}>
                  {summary[module.key.replace('-', '_')].total_pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        {activeTab === 'overview' ? (
          <OverviewPanel summary={summary} onModuleClick={handleTabChange} />
        ) : (
          <ModulePanel
            module={activeTab}
            data={moduleData[activeTab]}
            loading={moduleLoading}
            getStatusBadge={getStatusBadge}
            navigate={navigate}
          />
        )}
      </div>
    </Layout>
  );
};

// Overview Panel Component
const OverviewPanel = ({ summary, onModuleClick }) => {
  const cards = [
    {
      key: 'vendors',
      title: 'Vendors',
      icon: '🏢',
      color: 'blue',
      items: [
        { label: 'Pending Review', count: summary?.vendors?.pending_review || 0 },
        { label: 'Pending DD', count: summary?.vendors?.pending_dd || 0 },
        { label: 'Pending Approval', count: summary?.vendors?.pending_approval || 0 },
      ],
      total: summary?.vendors?.total_pending || 0,
      link: '/vendors'
    },
    {
      key: 'business-requests',
      title: 'Business Requests',
      icon: '📝',
      color: 'purple',
      items: [
        { label: 'Draft', count: summary?.business_requests?.draft || 0 },
        { label: 'Pending Evaluation', count: summary?.business_requests?.pending_evaluation || 0 },
        { label: 'Pending Award', count: summary?.business_requests?.pending_award || 0 },
      ],
      total: summary?.business_requests?.total_pending || 0,
      link: '/tenders'
    },
    {
      key: 'contracts',
      title: 'Contracts',
      icon: '📄',
      color: 'green',
      items: [
        { label: 'Pending DD', count: summary?.contracts?.pending_dd || 0 },
        { label: 'Pending SAMA', count: summary?.contracts?.pending_sama || 0 },
        { label: 'Pending HoP', count: summary?.contracts?.pending_hop || 0 },
      ],
      total: summary?.contracts?.total_pending || 0,
      link: '/contracts'
    },
    {
      key: 'purchase-orders',
      title: 'Purchase Orders',
      icon: '🛒',
      color: 'orange',
      items: [
        { label: 'Draft', count: summary?.purchase_orders?.draft || 0 },
        { label: 'Pending Approval', count: summary?.purchase_orders?.pending_approval || 0 },
      ],
      total: summary?.purchase_orders?.total_pending || 0,
      link: '/purchase-orders'
    },
    {
      key: 'deliverables',
      title: 'Deliverables',
      icon: '📦',
      color: 'yellow',
      items: [
        { label: 'Pending Review', count: summary?.deliverables?.pending_review || 0 },
        { label: 'Pending HoP', count: summary?.deliverables?.pending_hop || 0 },
      ],
      total: summary?.deliverables?.total_pending || 0,
      link: '/deliverables'
    },
    {
      key: 'resources',
      title: 'Resources',
      icon: '👥',
      color: 'indigo',
      items: [
        { label: 'Pending Approval', count: summary?.resources?.pending_approval || 0 },
        { label: 'Expiring Soon', count: summary?.resources?.expiring_soon || 0 },
      ],
      total: summary?.resources?.total_pending || 0,
      link: '/resources'
    },
    {
      key: 'assets',
      title: 'Assets',
      icon: '🖥️',
      color: 'gray',
      items: [
        { label: 'Under Maintenance', count: summary?.assets?.pending_maintenance || 0 },
        { label: 'Warranty Expiring', count: summary?.assets?.warranty_expiring || 0 },
      ],
      total: summary?.assets?.total_pending || 0,
      link: '/assets'
    },
  ];

  const colorClasses = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-800' },
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-800' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-800' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-800' },
    gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-800' },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {cards.map(card => {
        const colors = colorClasses[card.color];
        return (
          <div
            key={card.key}
            className={`${colors.bg} rounded-xl border ${colors.border} p-5 hover:shadow-md transition-shadow cursor-pointer`}
            onClick={() => onModuleClick(card.key)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{card.icon}</span>
                <h3 className={`font-semibold ${colors.text}`}>{card.title}</h3>
              </div>
              <span className={`text-2xl font-bold ${colors.text}`}>{card.total}</span>
            </div>
            
            <div className="space-y-2">
              {card.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">{item.label}</span>
                  <span className={`px-2 py-0.5 rounded ${colors.badge}`}>{item.count}</span>
                </div>
              ))}
            </div>

            <Link
              to={card.link}
              className={`mt-4 block text-center py-2 rounded-lg text-sm font-medium ${colors.text} hover:underline`}
              onClick={(e) => e.stopPropagation()}
            >
              View All →
            </Link>
          </div>
        );
      })}
    </div>
  );
};

// Module Panel Component
const ModulePanel = ({ module, data, loading, getStatusBadge, navigate }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getItems = () => {
    switch (module) {
      case 'vendors': return data?.vendors || [];
      case 'business-requests': return data?.business_requests || [];
      case 'contracts': return data?.contracts || [];
      case 'purchase-orders': return data?.purchase_orders || [];
      case 'deliverables': return data?.deliverables || [];
      case 'resources': return data?.resources || [];
      case 'assets': return data?.assets || [];
      default: return [];
    }
  };

  const items = getItems();

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <span className="text-6xl mb-4 block">✅</span>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">All Clear!</h3>
        <p className="text-gray-600">No pending items in this category.</p>
      </div>
    );
  }

  const renderItem = (item) => {
    switch (module) {
      case 'vendors':
        return (
          <VendorItem key={item.id} item={item} getStatusBadge={getStatusBadge} navigate={navigate} />
        );
      case 'business-requests':
        return (
          <BusinessRequestItem key={item.id} item={item} getStatusBadge={getStatusBadge} navigate={navigate} />
        );
      case 'contracts':
        return (
          <ContractItem key={item.id} item={item} getStatusBadge={getStatusBadge} navigate={navigate} />
        );
      case 'purchase-orders':
        return (
          <POItem key={item.id} item={item} getStatusBadge={getStatusBadge} navigate={navigate} />
        );
      case 'deliverables':
        return (
          <DeliverableItem key={item.id} item={item} getStatusBadge={getStatusBadge} navigate={navigate} />
        );
      case 'resources':
        return (
          <ResourceItem key={item.id} item={item} getStatusBadge={getStatusBadge} navigate={navigate} />
        );
      case 'assets':
        return (
          <AssetItem key={item.id} item={item} getStatusBadge={getStatusBadge} navigate={navigate} />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {items.map(renderItem)}
    </div>
  );
};

// Individual Item Components
const VendorItem = ({ item, getStatusBadge, navigate }) => (
  <div className="bg-white rounded-lg shadow p-4 border border-gray-200 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start">
      <div>
        <h4 className="font-semibold text-gray-900">{item.name_english || item.commercial_name || 'Unnamed Vendor'}</h4>
        <p className="text-sm text-gray-500">{item.vendor_number}</p>
        <div className="flex gap-2 mt-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(item.status)}`}>
            {(item.status || '').replace(/_/g, ' ').toUpperCase()}
          </span>
          {item.risk_category && (
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              item.risk_category === 'high' ? 'bg-red-100 text-red-800' :
              item.risk_category === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {item.risk_category.toUpperCase()} RISK
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => navigate(`/vendors/${item.id}`)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
      >
        Review
      </button>
    </div>
  </div>
);

const BusinessRequestItem = ({ item, getStatusBadge, navigate }) => (
  <div className="bg-white rounded-lg shadow p-4 border border-gray-200 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start">
      <div>
        <h4 className="font-semibold text-gray-900">{item.title}</h4>
        <p className="text-sm text-gray-500">{item.tender_number} • {item.project_name}</p>
        <div className="flex gap-2 mt-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(item.status)}`}>
            {(item.status || '').toUpperCase()}
          </span>
          <span className="text-sm text-gray-500">
            Budget: ${item.budget?.toLocaleString()}
          </span>
          <span className="text-sm text-gray-500">
            {item.proposal_count || 0} proposals
          </span>
        </div>
      </div>
      <button
        onClick={() => navigate(`/tenders/${item.id}`)}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
      >
        Review
      </button>
    </div>
  </div>
);

const ContractItem = ({ item, getStatusBadge, navigate }) => (
  <div className="bg-white rounded-lg shadow p-4 border border-gray-200 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start">
      <div>
        <h4 className="font-semibold text-gray-900">{item.title}</h4>
        <p className="text-sm text-gray-500">
          {item.contract_number} • {item.vendor_info?.name_english || item.vendor_info?.commercial_name || 'N/A'}
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(item.status)}`}>
            {(item.status || '').replace(/_/g, ' ').toUpperCase()}
          </span>
          {item.contract_dd_status === 'pending' && (
            <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">DD PENDING</span>
          )}
          {item.sama_noc_status && item.sama_noc_status !== 'not_required' && item.sama_noc_status !== 'approved' && (
            <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
              SAMA: {item.sama_noc_status.toUpperCase()}
            </span>
          )}
          <span className="text-sm text-gray-500">
            ${item.value?.toLocaleString()}
          </span>
        </div>
      </div>
      <button
        onClick={() => navigate(`/contracts/${item.id}`)}
        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
      >
        Review
      </button>
    </div>
  </div>
);

const POItem = ({ item, getStatusBadge, navigate }) => (
  <div className="bg-white rounded-lg shadow p-4 border border-gray-200 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start">
      <div>
        <h4 className="font-semibold text-gray-900">{item.po_number || 'New PO'}</h4>
        <p className="text-sm text-gray-500">
          {item.vendor_info?.name_english || item.vendor_info?.commercial_name || 'N/A'}
        </p>
        <div className="flex gap-2 mt-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(item.status)}`}>
            {(item.status || '').replace(/_/g, ' ').toUpperCase()}
          </span>
          <span className="text-sm text-gray-500">
            ${item.total_amount?.toLocaleString()}
          </span>
          {item.requires_contract && (
            <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">REQUIRES CONTRACT</span>
          )}
        </div>
      </div>
      <button
        onClick={() => navigate(`/purchase-orders/${item.id}`)}
        className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700"
      >
        Review
      </button>
    </div>
  </div>
);

const DeliverableItem = ({ item, getStatusBadge, navigate }) => (
  <div className="bg-white rounded-lg shadow p-4 border border-gray-200 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start">
      <div>
        <h4 className="font-semibold text-gray-900">{item.title || item.deliverable_number || 'Deliverable'}</h4>
        <p className="text-sm text-gray-500">
          {item.vendor_info?.name_english || item.vendor_info?.commercial_name || 'N/A'} • 
          {item.contract_info?.title || item.po_info?.po_number || 'N/A'}
        </p>
        <div className="flex gap-2 mt-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(item.status)}`}>
            {(item.status || '').replace(/_/g, ' ').toUpperCase()}
          </span>
          <span className="text-sm font-medium text-gray-700">
            {item.amount?.toLocaleString()} SAR
          </span>
        </div>
      </div>
      <button
        onClick={() => navigate(`/deliverables`)}
        className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700"
      >
        {item.status === 'submitted' ? 'Review' : item.status === 'pending_hop_approval' ? 'Approve' : 'View'}
      </button>
    </div>
  </div>
);

const ResourceItem = ({ item, getStatusBadge, navigate }) => {
  const daysUntilExpiry = item.end_date
    ? Math.ceil((new Date(item.end_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="bg-white rounded-lg shadow p-4 border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-semibold text-gray-900">{item.name}</h4>
          <p className="text-sm text-gray-500">
            {item.resource_number} • {item.vendor_info?.name_english || 'N/A'}
          </p>
          <div className="flex gap-2 mt-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(item.status)}`}>
              {(item.status || '').toUpperCase()}
            </span>
            {daysUntilExpiry !== null && daysUntilExpiry <= 30 && (
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                daysUntilExpiry <= 7 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
              }`}>
                {daysUntilExpiry <= 0 ? 'EXPIRED' : `${daysUntilExpiry} DAYS LEFT`}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => navigate(`/resources/${item.id}`)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
        >
          View
        </button>
      </div>
    </div>
  );
};

const AssetItem = ({ item, getStatusBadge, navigate }) => (
  <div className="bg-white rounded-lg shadow p-4 border border-gray-200 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start">
      <div>
        <h4 className="font-semibold text-gray-900">{item.name}</h4>
        <p className="text-sm text-gray-500">
          {item.asset_number} • {item.building_name} {item.floor_name ? `/ ${item.floor_name}` : ''}
        </p>
        <div className="flex gap-2 mt-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(item.status)}`}>
            {(item.status || '').replace(/_/g, ' ').toUpperCase()}
          </span>
          {item.condition && (
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              item.condition === 'good' ? 'bg-green-100 text-green-800' :
              item.condition === 'fair' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {item.condition.toUpperCase()}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => navigate(`/assets/${item.id}`)}
        className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700"
      >
        View
      </button>
    </div>
  </div>
);

export default ApprovalsHub;
