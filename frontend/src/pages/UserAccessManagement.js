import { getErrorMessage } from '../utils/errorUtils';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAuth } from '../App';
import { useToast } from '../hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ROLE_OPTIONS = [
  { value: 'business_user', label: 'Business User', color: 'bg-gray-100 text-gray-800' },
  { value: 'procurement_officer', label: 'Procurement Officer', color: 'bg-blue-100 text-blue-800' },
  { value: 'approver', label: 'Approver', color: 'bg-purple-100 text-purple-800' },
  { value: 'hop', label: 'Head of Procurement', color: 'bg-amber-100 text-amber-800' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'disabled', label: 'Disabled', color: 'bg-red-100 text-red-800' },
];

const UserAccessManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [config, setConfig] = useState({});

  const isHoP = ['hop', 'procurement_manager', 'admin'].includes(user?.role);

  useEffect(() => {
    if (!isHoP) {
      toast({ title: '⛔ Access Denied', description: 'Only Head of Procurement can access this page', variant: 'destructive' });
      navigate('/dashboard');
      return;
    }
    fetchUsers();
    fetchConfig();
  }, [isHoP]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (roleFilter) params.append('role_filter', roleFilter);
      if (statusFilter) params.append('status_filter', statusFilter);
      
      const response = await axios.get(`${API}/users?${params.toString()}`, { withCredentials: true });
      setUsers(response.data.users || []);
    } catch (error) {
      toast({ title: '❌ Error', description: 'Failed to fetch users', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${API}/users/config/domain-restriction`, { withCredentials: true });
      setConfig(response.data);
    } catch (error) {
      console.error('Failed to fetch config');
    }
  };

  const fetchAuditLogs = async (userId = null) => {
    try {
      const url = userId ? `${API}/users/audit/logs?user_id=${userId}` : `${API}/users/audit/logs`;
      const response = await axios.get(url, { withCredentials: true });
      setAuditLogs(response.data.logs || []);
      setShowAuditModal(true);
    } catch (error) {
      toast({ title: '❌ Error', description: 'Failed to fetch audit logs', variant: 'destructive' });
    }
  };

  const handleRoleChange = async (userId, newRole, reason = '') => {
    try {
      await axios.patch(`${API}/users/${userId}/role`, { role: newRole, reason }, { withCredentials: true });
      toast({ title: '✅ Success', description: 'User role updated', variant: 'success' });
      fetchUsers();
      setEditingUser(null);
    } catch (error) {
      toast({ title: '❌ Error', description: getErrorMessage(error, 'Failed to update role'), variant: 'destructive' });
    }
  };

  const handleStatusChange = async (userId, newStatus, reason = '') => {
    try {
      await axios.patch(`${API}/users/${userId}/status`, { status: newStatus, reason }, { withCredentials: true });
      toast({ title: '✅ Success', description: `User ${newStatus === 'active' ? 'enabled' : 'disabled'}`, variant: 'success' });
      fetchUsers();
    } catch (error) {
      toast({ title: '❌ Error', description: getErrorMessage(error, 'Failed to update status'), variant: 'destructive' });
    }
  };

  const handleForcePasswordReset = async (userId) => {
    if (!window.confirm('Force this user to reset their password on next login?')) return;
    try {
      await axios.post(`${API}/users/${userId}/force-password-reset`, {}, { withCredentials: true });
      toast({ title: '✅ Success', description: 'User will be required to reset password on next login', variant: 'success' });
    } catch (error) {
      toast({ title: '❌ Error', description: getErrorMessage(error, 'Failed'), variant: 'destructive' });
    }
  };

  const getRoleBadge = (role) => {
    const option = ROLE_OPTIONS.find(r => r.value === role) || ROLE_OPTIONS[0];
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${option.color}`}>{option.label}</span>;
  };

  const getStatusBadge = (status) => {
    const option = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${option.color}`}>{option.label}</span>;
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
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Access Management</h1>
            <p className="text-gray-600">Manage user roles, access, and security</p>
          </div>
          <button
            onClick={() => fetchAuditLogs()}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            📋 View Audit Log
          </button>
        </div>

        {/* Domain Restriction Info */}
        <div className={`p-4 rounded-lg border ${config.enabled ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{config.enabled ? '🔒' : '🔓'}</span>
            <div>
              <p className="font-medium">
                Domain Restriction: <span className={config.enabled ? 'text-amber-700' : 'text-blue-700'}>
                  {config.enabled ? 'ENABLED' : 'DISABLED (Testing Mode)'}
                </span>
              </p>
              {config.enabled && (
                <p className="text-sm text-gray-600">Allowed domains: {config.allowed_domains?.join(', ')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="px-3 py-2 border rounded-lg"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">All Roles</option>
              {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button
              onClick={fetchUsers}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              🔍 Search
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{u.name}</p>
                      <p className="text-sm text-gray-500">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {editingUser === u.id ? (
                      <select
                        defaultValue={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        onBlur={() => setEditingUser(null)}
                        className="px-2 py-1 border rounded text-sm"
                        autoFocus
                      >
                        {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    ) : (
                      <button onClick={() => setEditingUser(u.id)} className="hover:opacity-80">
                        {getRoleBadge(u.role)}
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(u.status)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {u.id !== user?.id && (
                      <>
                        <button
                          onClick={() => handleStatusChange(u.id, u.status === 'active' ? 'disabled' : 'active')}
                          className={`px-3 py-1 rounded text-xs font-medium ${u.status === 'active' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                        >
                          {u.status === 'active' ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleForcePasswordReset(u.id)}
                          className="px-3 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200"
                        >
                          Reset PW
                        </button>
                        <button
                          onClick={() => fetchAuditLogs(u.id)}
                          className="px-3 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                        >
                          History
                        </button>
                      </>
                    )}
                    {u.id === user?.id && <span className="text-xs text-gray-400">You</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="text-center py-12 text-gray-500">No users found</div>
          )}
        </div>

        {/* Audit Log Modal */}
        {showAuditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Access Change Audit Log</h2>
                <button onClick={() => setShowAuditModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Time</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Actor</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Target</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Change</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-2 text-sm">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-4 py-2 text-sm">{log.actor_email}</td>
                      <td className="px-4 py-2 text-sm">{log.target_email}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className="text-red-600">{log.old_value}</span>
                        <span className="mx-1">→</span>
                        <span className="text-green-600">{log.new_value}</span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">{log.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {auditLogs.length === 0 && (
                <div className="text-center py-8 text-gray-500">No audit logs found</div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default UserAccessManagement;
