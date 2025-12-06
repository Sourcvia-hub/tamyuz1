import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/App';
import { fetchContractById, changeContractStatus, fetchContractAIAnalysis } from './api';
import { getProcureFlixRole, canManageFinancialStatus } from './roles';

const statusOptions = ['draft', 'pending_approval', 'active', 'expired', 'terminated'];

const PfContractDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = getProcureFlixRole(user?.email);
  const canManageStatus = canManageFinancialStatus(role);

  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('draft');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchContractById(id);
        setContract(data);
        setSelectedStatus(data.status || 'draft');
      } catch (err) {
        console.error('Failed to load contract', err);
        setError('Failed to load contract');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleChangeStatus = async () => {
    if (!contract || !selectedStatus) return;
    setStatusUpdating(true);
    try {
      const updated = await changeContractStatus(contract.id, selectedStatus);
      setContract(updated);
    } catch (err) {
      console.error('Failed to change status', err);
      setError('Failed to change status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAIAnalysis = async () => {
    if (!contract) return;
    setAiLoading(true);
    try {
      const result = await fetchContractAIAnalysis(contract.id);
      setAiResult(result);
    } catch (err) {
      console.error('Failed to fetch AI analysis', err);
      setError('Failed to fetch AI analysis');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading contract...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!contract) {
    return <p className="text-sm text-slate-500">Contract not found.</p>;
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/pf/contracts')}
        className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
      >
        ← Back to contracts
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{contract.title}</h2>
          <p className="text-sm text-slate-500 mt-1">{contract.description}</p>
          <p className="text-xs text-slate-500 mt-1">
            Contract #: <span className="font-mono">{contract.contract_number || '—'}</span>
          </p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <div>Type: {contract.contract_type}</div>
          <div>Status: {contract.status}</div>
          <div>
            Risk: {contract.risk_category} ({contract.risk_score})
          </div>
          <div>DD required: {contract.dd_required ? 'Yes' : 'No'}</div>
          <div>NOC required: {contract.noc_required ? 'Yes' : 'No'}</div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 text-sm space-y-1">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Core data</h3>
          <p>
            <span className="text-slate-500">Vendor ID:</span> {contract.vendor_id}
          </p>
          <p>
            <span className="text-slate-500">Tender ID:</span> {contract.tender_id || '—'}
          </p>
          <p>
            <span className="text-slate-500">Value:</span> {contract.contract_value?.toLocaleString()} {contract.currency}
          </p>
          <p>
            <span className="text-slate-500">Start date:</span> {new Date(contract.start_date).toLocaleDateString()}
          </p>
          <p>
            <span className="text-slate-500">End date:</span> {new Date(contract.end_date).toLocaleDateString()}
          </p>
          <p>
            <span className="text-slate-500">Auto-renewal:</span> {contract.auto_renewal ? 'Yes' : 'No'}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-4 text-sm space-y-1">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Risk & compliance</h3>
          <p>
            <span className="text-slate-500">Has data access:</span> {contract.has_data_access ? 'Yes' : 'No'}
          </p>
          <p>
            <span className="text-slate-500">Has on-site presence:</span> {contract.has_onsite_presence ? 'Yes' : 'No'}
          </p>
          <p>
            <span className="text-slate-500">Has implementation:</span> {contract.has_implementation ? 'Yes' : 'No'}
          </p>
          <p>
            <span className="text-slate-500">Criticality:</span> {contract.criticality_level}
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

      <div className="rounded-lg border bg-white p-4 text-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-900">AI contract analysis</h3>
          <button
            onClick={handleAIAnalysis}
            disabled={aiLoading}
            className="inline-flex items-center rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700 disabled:bg-slate-400"
          >
            {aiLoading ? 'Calling AI...' : 'Call contract AI analysis'}
          </button>
        </div>
        <div className="rounded-md bg-slate-50 border border-slate-100 px-3 py-2 text-xs text-slate-700 min-h-[3rem]">
          {aiResult ? (
            <pre className="whitespace-pre-wrap text-[11px]">
              {JSON.stringify(aiResult, null, 2)}
            </pre>
          ) : (
            <span className="text-slate-400">No AI analysis yet. Click the button to call the endpoint.</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PfContractDetail;
