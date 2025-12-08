import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchContracts } from './api';

const PfContractsList = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchContracts();
        setContracts(data);
      } catch (err) {
        console.error('Failed to load contracts', err);
        setError('Failed to load contracts');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading contracts...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Contracts</h2>
          <p className="text-sm text-slate-500 mt-1">
            Sourcevia contracts linked to vendors and, where applicable, tenders.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 text-left">Contract #</th>
              <th className="px-4 py-2 text-left">Title</th>
              <th className="px-4 py-2 text-left">Vendor ID</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contracts.map((c) => (
              <tr
                key={c.id}
                className="hover:bg-slate-50 cursor-pointer"
                onClick={() => navigate(`/pf/contracts/${c.id}`)}
              >
                <td className="px-4 py-2 font-mono text-xs text-slate-600">
                  {c.contract_number || '—'}
                </td>
                <td className="px-4 py-2 text-slate-900 text-sm">{c.title}</td>
                <td className="px-4 py-2 font-mono text-[11px] text-slate-500">{c.vendor_id}</td>
                <td className="px-4 py-2 text-xs text-slate-600">{c.contract_type}</td>
                <td className="px-4 py-2 text-xs uppercase tracking-wide text-slate-500">
                  {c.status}
                </td>
                <td className="px-4 py-2 text-xs text-slate-700">
                  {c.contract_value?.toLocaleString()} {c.currency}
                </td>
              </tr>
            ))}
            {contracts.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-center text-xs text-slate-500" colSpan={6}>
                  No contracts found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PfContractsList;
