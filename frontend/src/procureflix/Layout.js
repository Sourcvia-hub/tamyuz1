import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/App';
import { getProcureFlixRole, canSeeFinancialModules, canSeeOperationalModules } from './roles';

const navItems = [
  { to: '/pf/dashboard', label: 'Dashboard', key: 'dashboard', type: 'all' },
  { to: '/pf/vendors', label: 'Vendors', key: 'vendors', type: 'operational' },
  { to: '/pf/tenders', label: 'Tenders', key: 'tenders', type: 'operational' },
  { to: '/pf/contracts', label: 'Contracts', key: 'contracts', type: 'financial' },
  { to: '/pf/purchase-orders', label: 'Purchase Orders', key: 'pos', type: 'financial' },
  { to: '/pf/invoices', label: 'Invoices', key: 'invoices', type: 'financial' },
  { to: '/pf/resources', label: 'Resources', key: 'resources', type: 'operational' },
  { to: '/pf/service-requests', label: 'Service Requests', key: 'osr', type: 'operational' },
  { to: '/pf/cctv', label: 'CCTV Live View', key: 'cctv', type: 'operational' },
];

const ProcureFlixLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = getProcureFlixRole(user?.email);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const canSeeNavItem = (item) => {
    if (item.type === 'financial') {
      return canSeeFinancialModules(role);
    }
    if (item.type === 'operational') {
      return canSeeOperationalModules(role);
    }
    return true; // dashboard and others
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col">
        <div className="px-6 py-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-sky-500 flex items-center justify-center text-white font-bold text-xl">
              S
            </div>
            <div>
              <div className="text-lg font-bold tracking-wide text-white">Sourcevia</div>
              <div className="text-xs text-slate-400">Procurement Management System</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 text-sm">
          {navItems.filter(canSeeNavItem).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-md transition-colors ${
                  isActive
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-slate-800 text-xs text-slate-400">
          <div className="mb-2">
            <div className="font-medium text-slate-200 text-sm">{user?.email || 'User'}</div>
            <div className="text-xs text-slate-400">Role: {role}</div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left text-xs text-slate-300 hover:text-white hover:underline"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="h-14 border-b bg-white flex items-center justify-between px-6">
          <div>
            <h1 className="text-base font-semibold text-slate-900">Sourcevia</h1>
            <p className="text-xs text-slate-500">End-to-end procurement lifecycle</p>
          </div>
          <div className="text-xs text-slate-500">
            Logged in as <span className="font-medium">{user?.email}</span> · Role: <span className="font-medium">{role}</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ProcureFlixLayout;
