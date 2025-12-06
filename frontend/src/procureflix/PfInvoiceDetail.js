import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/App';
import { fetchInvoiceById, changeInvoiceStatus } from './api';
import { getProcureFlixRole, canManageFinancialStatus } from './roles';

const statusOptions = ['pending', 'under_review', 'approved', 'rejected', 'paid'];

const PfInvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = getProcureFlixRole(user?.email);
  const canManageStatus = canManageFinancialStatus(role);

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchInvoiceById(id);
        setInvoice(data);
        setSelectedStatus(data.status || 'pending');
      } catch (err) {
        console.error('Failed to load invoice', err);
        setError('Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleChangeStatus = async () => {
    if (!invoice || !selectedStatus) return;
    setStatusUpdating(true);
    try {
      const updated = await changeInvoiceStatus(invoice.id, selectedStatus);
      setInvoice(updated);
    } catch (err) {
      console.error('Failed to change status', err);
      setError('Failed to change status');
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading invoice...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!invoice) {
    return <p className="text-sm text-slate-500">Invoice not found.</p>;
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/pf/invoices')}
        className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
      >
        ← Back to invoices
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Invoice {invoice.invoice_number}</h2>
          <p className="text-xs text-slate-500 mt-1">
            Vendor ID: <span className="font-mono">{invoice.vendor_id}</span>
          </p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <div>Status: {invoice.status}</div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 text-sm space-y-1">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Linkage</h3>
          <p>
            <span className="text-slate-500">Contract ID:</span> {invoice.contract_id || '—'}
          </p>
          <p>
            <span className="text-slate-500">PO ID:</span> {invoice.po_id || '—'}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-4 text-sm space-y-1">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Amounts & dates</h3>
          <p>
            <span className="text-slate-500">Amount:</span> {invoice.amount?.toLocaleString()} {invoice.currency}
          </p>
          <p>
            <span className="text-slate-500">Invoice date:</span>{' '}
            {new Date(invoice.invoice_date).toLocaleDateString()}
          </p>
          <p>
            <span className="text-slate-500">Due date:</span>{' '}
            {new Date(invoice.due_date).toLocaleDateString()}
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

export default PfInvoiceDetail;
