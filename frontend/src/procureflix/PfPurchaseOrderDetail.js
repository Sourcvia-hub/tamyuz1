import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/App';
import { fetchPurchaseOrderById, changePurchaseOrderStatus } from './api';
import { getProcureFlixRole, canManageFinancialStatus } from './roles';

const statusOptions = ['draft', 'pending_approval', 'approved', 'issued', 'cancelled'];

const PfPurchaseOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = getProcureFlixRole(user?.email);
  const canManageStatus = canManageFinancialStatus(role);

  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('draft');
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchPurchaseOrderById(id);
        setPo(data);
        setSelectedStatus(data.status || 'draft');
      } catch (err) {
        console.error('Failed to load purchase order', err);
        setError('Failed to load purchase order');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleChangeStatus = async () => {
    if (!po || !selectedStatus) return;
    setStatusUpdating(true);
    try {
      const updated = await changePurchaseOrderStatus(po.id, selectedStatus);
      setPo(updated);
    } catch (err) {
      console.error('Failed to change status', err);
      setError('Failed to change status');
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading purchase order...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!po) {
    return <p className="text-sm text-slate-500">Purchase order not found.</p>;
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/pf/purchase-orders')}
        className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
      >
        ← Back to purchase orders
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{po.description}</h2>
          <p className="text-xs text-slate-500 mt-1">
            PO #: <span className="font-mono">{po.po_number}</span>
          </p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <div>Status: {po.status}</div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 text-sm space-y-1">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Core data</h3>
          <p>
            <span className="text-slate-500">Vendor ID:</span> {po.vendor_id}
          </p>
          <p>
            <span className="text-slate-500">Contract ID:</span> {po.contract_id || '—'}
          </p>
          <p>
            <span className="text-slate-500">Tender ID:</span> {po.tender_id || '—'}
          </p>
          <p>
            <span className="text-slate-500">Requested by:</span> {po.requested_by}
          </p>
          <p>
            <span className="text-slate-500">Delivery location:</span> {po.delivery_location}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-4 text-sm space-y-1">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Amounts & status</h3>
          <p>
            <span className="text-slate-500">Amount:</span> {po.amount?.toLocaleString()} {po.currency}
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

export default PfPurchaseOrderDetail;
