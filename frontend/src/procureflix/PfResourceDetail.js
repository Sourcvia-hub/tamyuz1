import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/App';
import { fetchResourceById, changeResourceStatus } from './api';
import { getProcureFlixRole, canManageOperationalStatus } from './roles';

const statusOptions = ['active', 'inactive'];

const PfResourceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = getProcureFlixRole(user?.email);
  const canManageStatus = canManageOperationalStatus(role);

  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('active');
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchResourceById(id);
        setResource(data);
        setSelectedStatus(data.status || 'active');
      } catch (err) {
        console.error('Failed to load resource', err);
        setError('Failed to load resource');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleChangeStatus = async () => {
    if (!resource || !selectedStatus) return;
    setStatusUpdating(true);
    try {
      const updated = await changeResourceStatus(resource.id, selectedStatus);
      setResource(updated);
    } catch (err) {
      console.error('Failed to change status', err);
      setError('Failed to change status');
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading resource...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!resource) {
    return <p className="text-sm text-slate-500">Resource not found.</p>;
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/pf/resources')}
        className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
      >
        ← Back to resources
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{resource.name}</h2>
          <p className="text-sm text-slate-500 mt-1">{resource.role}</p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <div>Status: {resource.status}</div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 text-sm space-y-1">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Linkage</h3>
          <p>
            <span className="text-slate-500">Vendor ID:</span> {resource.vendor_id}
          </p>
          <p>
            <span className="text-slate-500">Contract ID:</span> {resource.contract_id || '—'}
          </p>
          <p>
            <span className="text-slate-500">Project:</span> {resource.assigned_to_project || '—'}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-4 text-sm space-y-1">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Lifecycle</h3>

          <div className="mt-3 flex items-center gap-2 text-xs">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              disabled={!canManageStatus}
              className="rounded border px-2 py-1 text-xs disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              onClick={handleChangeStatus}
              disabled={statusUpdating || !canManageStatus}
              className="inline-flex items-center rounded-md bg-white border px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {statusUpdating ? 'Updating...' : 'Change status'}
            </button>
            {!canManageStatus && (
              <span className="text-xs text-amber-600">⚠ No permission</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PfResourceDetail;
