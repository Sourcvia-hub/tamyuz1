import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { canAccessModule, Module } from '../utils/permissions';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navigation = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊', module: Module.DASHBOARD },
    { name: 'Vendors', path: '/vendors', icon: '🏢', module: Module.VENDORS },
    { name: 'Purchase Requests', path: '/tenders', icon: '📋', module: Module.TENDERS },
    { name: 'Contracts', path: '/contracts', icon: '📄', module: Module.CONTRACTS },
    { name: 'Purchase Orders', path: '/purchase-orders', icon: '📝', module: Module.PURCHASE_ORDERS },
    { name: 'Resources', path: '/resources', icon: '👤', module: Module.RESOURCES },
    { name: 'Invoices', path: '/invoices', icon: '💰', module: Module.INVOICES },
    { name: 'Assets', path: '/assets', icon: '🏗️', module: Module.ASSETS },
    { name: 'Service Requests', path: '/osr', icon: '🔧', module: Module.SERVICE_REQUESTS },
  ];

  // Special links for Procurement Manager and Admin only
  const specialLinks = [
    { name: 'CCTV Live View', path: '/cctv', icon: '📹', roles: ['procurement_manager', 'admin'] },
    { name: 'Access Management', path: '/access-management', icon: '🚪', roles: ['procurement_manager', 'admin'] },
    { name: 'Admin Settings', path: '/admin/settings', icon: '⚙️', roles: ['procurement_manager', 'system_admin'] },
  ];

  // Filter navigation based on user permissions
  const filteredNavigation = navigation.filter(item => 
    canAccessModule(user?.role, item.module)
  );

  // Filter special links based on user role
  const filteredSpecialLinks = specialLinks.filter(item =>
    item.roles.includes(user?.role)
  );

  const getRoleBadgeColor = (role) => {
    const colors = {
      procurement_officer: 'bg-blue-100 text-blue-800',
      project_manager: 'bg-green-100 text-green-800',
      system_admin: 'bg-purple-100 text-purple-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getRoleLabel = (role) => {
    const labels = {
      user: 'User',
      direct_manager: 'Direct Manager',
      procurement_officer: 'Procurement Officer',
      senior_manager: 'Senior Manager',
      procurement_manager: 'Procurement Manager',
      admin: 'Admin',
      // Legacy roles
      requester: 'Requester',
      pd_officer: 'PD Officer',
      pd_manager: 'PD Manager',
      project_manager: 'Project Manager',
      system_admin: 'System Admin'
    };
    return labels[role] || role;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-sky-500 flex items-center justify-center text-white font-bold text-xl">
                S
              </div>
              <span className="text-xl font-bold text-gray-900">Sourcevia</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={`nav-${item.name.toLowerCase()}`}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-3 text-xl">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}

            {/* Special Links Section (Manager/Admin Only) */}
            {filteredSpecialLinks.length > 0 && (
              <>
                <div className="pt-4 pb-2">
                  <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Security & Access
                  </p>
                </div>
                {filteredSpecialLinks.map((item) => {
                  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? 'bg-purple-50 text-purple-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="mr-3 text-xl">{item.icon}</span>
                      {item.name}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* User Info */}
          <div className="border-t p-4">
            <div className="flex flex-col">
              <p className="text-sm font-medium text-gray-900 mb-1">{user?.name}</p>
              <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded self-start ${getRoleBadgeColor(user?.role)}`}>
                {getRoleLabel(user?.role)}
              </span>
            </div>
            <button
              onClick={handleLogout}
              data-testid="logout-btn"
              className="mt-3 w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-200 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {/* Top Bar */}
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
