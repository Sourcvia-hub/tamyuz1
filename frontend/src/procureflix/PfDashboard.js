import React, { useEffect, useState } from 'react';
import { pfApi } from './api';

const PfDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [vendorsRes, tendersRes, contractsRes, posRes, invoicesRes, resourcesRes, srsRes] =
          await Promise.all([
            pfApi.get('/vendors'),
            pfApi.get('/tenders'),
            pfApi.get('/contracts'),
            pfApi.get('/purchase-orders'),
            pfApi.get('/invoices'),
            pfApi.get('/resources'),
            pfApi.get('/service-requests'),
          ]);

        const vendors = vendorsRes.data || [];
        const tenders = tendersRes.data || [];
        const contracts = contractsRes.data || [];
        const pos = posRes.data || [];
        const invoices = invoicesRes.data || [];
        const resources = resourcesRes.data || [];
        const srs = srsRes.data || [];

        const totalVendors = vendors.length;
        const highRiskVendors = vendors.filter((v) =>
          ['high', 'very_high'].includes(v.risk_category)
        ).length;

        const activeTenders = tenders.filter((t) =>
          ['published', 'awarded'].includes(t.status)
        ).length;

        const activeContracts = contracts.filter((c) =>
          ['active', 'pending_approval'].includes(c.status)
        ).length;

        const openServiceRequests = srs.filter((sr) =>
          ['open', 'in_progress'].includes(sr.status)
        ).length;

        const totalInvoicesAmount = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

        const tendersByStatus = groupCountBy(tenders, 'status');
        const contractsByType = groupCountBy(contracts, 'contract_type');
        const posByStatus = groupCountBy(pos, 'status');
        const invoicesByStatus = groupCountBy(invoices, 'status');

        const approvedInvoicesAmount = invoices
          .filter((i) => i.status === 'approved')
          .reduce((sum, i) => sum + (i.amount || 0), 0);
        const paidInvoicesAmount = invoices
          .filter((i) => i.status === 'paid')
          .reduce((sum, i) => sum + (i.amount || 0), 0);

        const activeResources = resources.filter((r) => r.status === 'active').length;
        const srsByPriority = groupCountBy(srs, 'priority');

        setData({
          totalVendors,
          highRiskVendors,
          activeTenders,
          activeContracts,
          openServiceRequests,
          totalInvoicesAmount,
          tendersByStatus,
          contractsByType,
          posByStatus,
          invoicesByStatus,
          approvedInvoicesAmount,
          paidInvoicesAmount,
          activeResources,
          srsByPriority,
        });
      } catch (err) {
        console.error('Failed to load dashboard data', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading dashboard...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!data) {
    return <p className="text-sm text-slate-500">No data available.</p>;
  }

  const currency = 'SAR';

  return (
    <div className="space-y-8">
      {/* KPI cards */}
      <section>
        <h2 className="text-xl font-semibold text-slate-900">Overview</h2>
        <p className="text-sm text-slate-500 mt-1">
          High-level KPIs from the ProcureFlix in-memory datasets.
        </p>
        <div className="mt-4 grid gap-4 grid-cols-1 md:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="Total Vendors" value={data.totalVendors} />
          <KpiCard label="High-risk Vendors" value={data.highRiskVendors} />
          <KpiCard label="Active Tenders" value={data.activeTenders} />
          <KpiCard label="Active / Pending Contracts" value={data.activeContracts} />
          <KpiCard label="Open Service Requests" value={data.openServiceRequests} />
          <KpiCard
            label="Total Invoices Amount"
            value={data.totalInvoicesAmount.toLocaleString()}
            suffix={currency}
          />
        </div>
      </section>

      {/* Tenders & Contracts */}
      <section className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 text-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Tenders by status</h3>
          <StatusList counts={data.tendersByStatus} />
        </div>
        <div className="rounded-lg border bg-white p-4 text-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Contracts by type</h3>
          <StatusList counts={data.contractsByType} />
        </div>
      </section>

      {/* POs & Invoices */}
      <section className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-4 text-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Purchase orders by status</h3>
          <StatusList counts={data.posByStatus} />
        </div>
        <div className="rounded-lg border bg-white p-4 text-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Invoices by status</h3>
          <StatusList counts={data.invoicesByStatus} />
        </div>
        <div className="rounded-lg border bg-white p-4 text-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Invoice amounts</h3>
          <ul className="space-y-1">
            <li className="flex justify-between">
              <span className="text-slate-500">Approved</span>
              <span className="font-medium">
                {data.approvedInvoicesAmount.toLocaleString()} {currency}
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-500">Paid</span>
              <span className="font-medium">
                {data.paidInvoicesAmount.toLocaleString()} {currency}
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* Operational section */}
      <section className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 text-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Resources</h3>
          <p className="text-xs text-slate-500 mb-2">Count of active resources.</p>
          <p className="text-2xl font-semibold text-slate-900">{data.activeResources}</p>
        </div>
        <div className="rounded-lg border bg-white p-4 text-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Service requests by priority</h3>
          <StatusList counts={data.srsByPriority} />
        </div>
      </section>
    </div>
  );
};

const KpiCard = ({ label, value, suffix }) => (
  <div className="rounded-lg border bg-white p-4">
    <p className="text-xs text-slate-500">{label}</p>
    <p className="text-xl font-semibold text-slate-900 mt-1">
      {value} {suffix ? <span className="text-xs font-normal text-slate-500">{suffix}</span> : null}
    </p>
  </div>
);

const StatusList = ({ counts }) => {
  if (!counts || Object.keys(counts).length === 0) {
    return <p className="text-xs text-slate-400">No data</p>;
  }
  return (
    <ul className="space-y-1 text-xs">
      {Object.entries(counts).map(([key, count]) => (
        <li key={key} className="flex justify-between">
          <span className="text-slate-600">{key}</span>
          <span className="font-medium text-slate-900">{count}</span>
        </li>
      ))}
    </ul>
  );
};

function groupCountBy(items, field) {
  const map = {};
  for (const item of items) {
    const key = item[field] ?? 'unknown';
    map[key] = (map[key] || 0) + 1;
  }
  return map;
}

export default PfDashboard;
