import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/App';
import { fetchServiceRequestById, changeServiceRequestStatus } from './api';
import { getProcureFlixRole, canManageOperationalStatus } from './roles';

const statusOptions = ['open', 'in_progress', 'closed'];

const PfServiceRequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = getProcureFlixRole(user?.email);
  const canManageStatus = canManageOperationalStatus(role);

  const [sr, setSr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('open');
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchServiceRequestById(id);
        setSr(data);
        setSelectedStatus(data.status || 'open');
      } catch (err) {
        console.error('Failed to load service request', err);
        setError('Failed to load service request');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleChangeStatus = async () => {
    if (!sr || !selectedStatus) return;
    setStatusUpdating(true);
    try {
      const updated = await changeServiceRequestStatus(sr.id, selectedStatus);
      setSr(updated);
    } catch (err) {
      console.error('Failed to change status', err);
      setError('Failed to change status');
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading service request...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!sr) {
    return <p className="text-sm text-slate-500">Service request not found.</p>;
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/pf/service-requests')}
        className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
      >
        ← Back to service requests
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{sr.title}</h2>
          <p className="text-sm text-slate-500 mt-1">{sr.description}</p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <div>Priority: {sr.priority}</div>
          <div>Status: {sr.status}</div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 text-sm space-y-1">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Linkage</h3>
          <p>
            <span className="text-slate-500">Vendor ID:</span> {sr.vendor_id}
          </p>
          <p>
            <span className="text-slate-500">Contract ID:</span> {sr.contract_id || '—'}
          </p>
          <p>
            <span className="text-slate-500">Asset ID:</span> {sr.asset_id || '—'}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-4 text-sm space-y-1">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Lifecycle</h3>
          <p>
            <span className="text-slate-500">Requester:</span> {sr.requester}
          </p>

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

export default PfServiceRequestDetail;
