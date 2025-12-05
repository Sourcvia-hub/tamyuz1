import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  fetchVendorById,
  submitVendorDueDiligence,
  changeVendorStatus,
  fetchVendorRiskExplanation,
} from './api';

const statusOptions = ['pending', 'pending_due_diligence', 'approved', 'rejected', 'blacklisted'];

const PfVendorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ddSubmitting, setDdSubmitting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchVendorById(id);
        setVendor(data);
        setSelectedStatus(data.status || 'pending');
      } catch (err) {
        console.error('Failed to load vendor', err);
        setError('Failed to load vendor');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSubmitBasicDD = async () => {
    if (!vendor) return;
    setDdSubmitting(true);
    try {
      // Minimal DD payload that sets some key positive indicators
      const payload = {
        dd_bc_strategy_exists: true,
        dd_bc_staff_assigned: true,
        dd_fraud_whistle_blowing_mechanism: true,
        dd_op_documented_procedures: true,
        dd_hr_background_investigation: true,
        dd_checklist_supporting_documents: true,
      };
      const updated = await submitVendorDueDiligence(vendor.id, payload);
      setVendor(updated);
    } catch (err) {
      console.error('Failed to submit due diligence', err);
      setError('Failed to submit due diligence');
    } finally {
      setDdSubmitting(false);
    }
  };

  const handleChangeStatus = async () => {
    if (!vendor || !selectedStatus) return;
    setStatusUpdating(true);
    try {
      const updated = await changeVendorStatus(vendor.id, selectedStatus);
      setVendor(updated);
    } catch (err) {
      console.error('Failed to change status', err);
      setError('Failed to change status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleFetchAI = async () => {
    if (!vendor) return;
    setAiLoading(true);
    try {
      const result = await fetchVendorRiskExplanation(vendor.id);
      setAiResult(result);
    } catch (err) {
      console.error('Failed to fetch AI explanation', err);
      setError('Failed to fetch AI explanation');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading vendor...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!vendor) {
    return <p className="text-sm text-slate-500">Vendor not found.</p>;
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/pf/vendors')}
        className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
      >
        ← Back to vendors
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{vendor.name_english}</h2>
          <p className="text-sm text-slate-500 mt-1">{vendor.commercial_name}</p>
          <p className="text-xs text-slate-500 mt-1">
            Vendor #: <span className="font-mono">{vendor.vendor_number || '—'}</span>
          </p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <div>Risk: {vendor.risk_category}</div>
          <div>Status: {vendor.status}</div>
          <div>DD required: {vendor.dd_required ? 'Yes' : 'No'}</div>
          <div>DD completed: {vendor.dd_completed ? 'Yes' : 'No'}</div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 space-y-2 text-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Company information</h3>
          <p>
            <span className="text-slate-500">Entity type:</span> {vendor.entity_type}
          </p>
          <p>
            <span className="text-slate-500">VAT:</span> {vendor.vat_number}
          </p>
          <p>
            <span className="text-slate-500">CR #:</span> {vendor.cr_number}
          </p>
          <p>
            <span className="text-slate-500">Country / city:</span> {vendor.cr_country_city}
          </p>
          <p>
            <span className="text-slate-500">Activity:</span> {vendor.activity_description}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-4 space-y-2 text-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Contact</h3>
          <p>
            <span className="text-slate-500">Email:</span> {vendor.email}
          </p>
          <p>
            <span className="text-slate-500">Mobile:</span> {vendor.mobile}
          </p>
          <p>
            <span className="text-slate-500">City:</span> {vendor.city}
          </p>
          <p>
            <span className="text-slate-500">Country:</span> {vendor.country}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-4 space-y-2 text-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Bank details</h3>
          <p>
            <span className="text-slate-500">Bank:</span> {vendor.bank_name}
          </p>
          <p>
            <span className="text-slate-500">IBAN:</span> {vendor.iban}
          </p>
          <p>
            <span className="text-slate-500">Currency:</span> {vendor.currency}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-4 space-y-2 text-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Risk & Due Diligence</h3>
          <p>
            <span className="text-slate-500">Risk score:</span> {vendor.risk_score}
          </p>
          <p>
            <span className="text-slate-500">Risk category:</span> {vendor.risk_category}
          </p>
          <p>
            <span className="text-slate-500">DD required:</span> {vendor.dd_required ? 'Yes' : 'No'}
          </p>
          <p>
            <span className="text-slate-500">DD completed:</span> {vendor.dd_completed ? 'Yes' : 'No'}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={handleSubmitBasicDD}
              disabled={ddSubmitting}
              className="inline-flex items-center rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:bg-slate-400"
            >
              {ddSubmitting ? 'Submitting DD...' : 'Mark basic DD complete'}
            </button>

            <div className="flex items-center gap-2 text-xs">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded border px-2 py-1 text-xs"
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                onClick={handleChangeStatus}
                disabled={statusUpdating}
                className="inline-flex items-center rounded-md bg-white border px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-100"
              >
                {statusUpdating ? 'Updating...' : 'Change status'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4 text-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-900">AI risk explanation</h3>
          <button
            onClick={handleFetchAI}
            disabled={aiLoading}
            className="inline-flex items-center rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700 disabled:bg-slate-400"
          >
            {aiLoading ? 'Calling AI...' : 'Call AI endpoint'}
          </button>
        </div>
        <div className="rounded-md bg-slate-50 border border-slate-100 px-3 py-2 text-xs text-slate-700 min-h-[3rem]">
          {aiResult ? (
            <pre className="whitespace-pre-wrap text-xs">
              {JSON.stringify(aiResult, null, 2)}
            </pre>
          ) : (
            <span className="text-slate-400">No AI result yet. Click the button to call the endpoint.</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PfVendorDetail;
