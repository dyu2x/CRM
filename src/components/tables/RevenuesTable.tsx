import { ExportDataButton } from '../common/ExportDataButton';
import { RecordDetails } from '../common/RecordDetails';
import React, { useState, useMemo } from 'react';
import { Search, CheckCircle2, TrendingUp, Edit2, X, RotateCcw } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { Revenue } from '../../types/crm';
import { TablePagination } from '../common/TablePagination';
import { DateRangeFilter, isWithinDateRange } from './DateRangeFilter';

export const RevenuesTable: React.FC = () => {
  const [viewRecord, setViewRecord] = useState<Record<string, unknown> | null>(null);
  const { revenues, invoices, editRevenue, agents, paymentMethods } = useCRM();

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Edit Modal State (Make All Entries Editable)
  const [editingRevenue, setEditingRevenue] = useState<Revenue | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editPaymentMethod, setEditPaymentMethod] = useState('');
  const [editCollector, setEditCollector] = useState('');

  const totalRevenue = useMemo(() => {
    return revenues.reduce((sum, r) => sum + Number(r.revenue_amount || 0), 0);
  }, [revenues]);

  const hasActiveFilters = searchTerm !== '' || paymentFilter !== 'ALL' || startDate !== '' || endDate !== '';

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setPaymentFilter('ALL');
    setCurrentPage(1);
  };

  const filteredData = useMemo(() => {
    return revenues.filter((rev) => {
      const invoice = invoices.find((inv) => inv.invoice_id === rev.invoice_id);
      const farmName = invoice ? invoice.farm_name : '';

      const matchesSearch =
        rev.revenue_id.toString().includes(searchTerm) ||
        rev.payment_collected_by.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rev.payment_method.toLowerCase().includes(searchTerm.toLowerCase()) ||
        farmName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPayment = paymentFilter === 'ALL' || rev.payment_method === paymentFilter;

      return matchesSearch && matchesPayment && isWithinDateRange(rev.delivered_date, startDate, endDate);
    });
  }, [revenues, invoices, searchTerm, paymentFilter, startDate, endDate]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleOpenEdit = (rev: Revenue) => {
    setEditingRevenue(rev);
    setEditAmount(rev.revenue_amount);
    setEditPaymentMethod(rev.payment_method);
    setEditCollector(rev.payment_collected_by);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRevenue) return;

    editRevenue(editingRevenue.revenue_id, {
      revenue_amount: Number(editAmount),
      payment_method: editPaymentMethod,
      payment_collected_by: editCollector,
    });

    setEditingRevenue(null);
  };

  return (
    <div className="space-y-4">
      {/* Revenue Header Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-neutral-200 rounded-lg shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Realized Revenue</span>
            <span className="w-4 h-4 inline-flex items-center justify-center font-semibold leading-none text-emerald-600">₱</span>
          </div>
          <div className="mt-1 text-2xl font-bold text-neutral-900 tracking-tight">
            ₱{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            Delivered &amp; Paid in Full verified
          </p>
        </div>

        <div className="p-4 bg-white border border-neutral-200 rounded-lg shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Settled Deliveries</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1 text-2xl font-bold text-neutral-900 tracking-tight">
            {revenues.length} Transactions
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            100% collected and audited
          </p>
        </div>

        <div className="p-4 bg-white border border-neutral-200 rounded-lg shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Ticket</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-1 text-2xl font-bold text-neutral-900 tracking-tight">
            ₱
            {revenues.length > 0
              ? (totalRevenue / revenues.length).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : '0.00'}
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            Average realization per delivery
          </p>
        </div>
      </div>

      {/* Controls with Search & Filter View */}
      <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search revenues (farm, collector, payment method)..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs border border-neutral-300 rounded px-2.5 py-1.5 bg-white text-neutral-800 focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="ALL">All Payment Channels</option>
            {paymentMethods.map((pm) => (
              <option key={pm.id} value={pm.name}>
                {pm.name}
              </option>
            ))}
          </select>

          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={(value) => { setStartDate(value); setCurrentPage(1); }}
            onEndDateChange={(value) => { setEndDate(value); setCurrentPage(1); }}
          />

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-neutral-600 hover:text-black border border-neutral-300 rounded hover:bg-neutral-50 transition cursor-pointer"
              title="Reset filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

            <div className="flex justify-end"><ExportDataButton tableKey="revenues" tableLabel="Revenues" rows={filteredData as unknown as Record<string, unknown>[]} /></div>

{/* Table Display */}
      <div className="bg-white rounded-lg border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                <th className="py-3 px-4">Revenue ID</th>
                <th className="py-3 px-4">Invoice OR #</th>
                <th className="py-3 px-4">Delivery Ref</th>
                <th className="py-3 px-4">Farm Beneficiary</th>
                <th className="py-3 px-4">Delivery State</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Collected By</th>
                <th className="py-3 px-4">Settled Date</th>
                <th className="py-3 px-4 text-right">Revenue Amount</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-neutral-400">
                    No confirmed revenues found. (Requires Delivery = Delivered AND Paid in Full)
                  </td>
                </tr>
              ) : (
                paginatedData.map((rev) => {
                  const invoice = invoices.find((inv) => inv.invoice_id === rev.invoice_id);
                  return (
                    <tr key={rev.revenue_id} className="hover:bg-neutral-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                        #{rev.revenue_id}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-neutral-700">
                        {invoice ? invoice.official_receipt_id : `#${rev.invoice_id}`}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-neutral-500">
                        #{rev.delivery_id}
                      </td>
                      <td className="py-3 px-4 font-semibold text-neutral-900">
                        {invoice?.farm_name || 'Verified Farm'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Delivered &amp; Paid</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-700">{rev.payment_method}</td>
                      <td className="py-3 px-4 text-neutral-700 font-medium">{rev.payment_collected_by}</td>
                      <td className="py-3 px-4 text-neutral-500 text-[11px] whitespace-nowrap">
                        {new Date(rev.delivered_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 text-sm">
                        ₱{Number(rev.revenue_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button type="button" onClick={() => setViewRecord(rev as unknown as Record<string, unknown>)} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition">View</button>
                          <button
                          onClick={() => handleOpenEdit(rev)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:text-white bg-neutral-100 hover:bg-neutral-900 rounded border border-neutral-300 transition cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <TablePagination
          totalItems={filteredData.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Modal: Edit Revenue (Make All Entries Editable) */}
      {editingRevenue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-neutral-200 max-w-sm w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <h3 className="font-semibold text-sm text-neutral-900">
                Edit Revenue Entry #{editingRevenue.revenue_id}
              </h3>
              <button
                onClick={() => setEditingRevenue(null)}
                className="text-neutral-400 hover:text-neutral-700 text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Revenue Amount (₱)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white"
                >
                  {paymentMethods.map((pm) => (
                    <option key={pm.id} value={pm.name}>
                      {pm.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Payment Collected By (Agent)
                </label>
                <select
                  value={editCollector}
                  onChange={(e) => setEditCollector(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white"
                >
                  {agents.map((ag) => (
                    <option key={ag.agent_id} value={ag.name}>
                      {ag.name} ({ag.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setEditingRevenue(null)}
                  className="px-3 py-1.5 border border-neutral-300 text-neutral-700 text-xs rounded hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-semibold rounded shadow-xs"
                >
                  Save Changes (Record History)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <RecordDetails title="Revenue Details" record={viewRecord} onBack={() => setViewRecord(null)} />
    </div>
  );
};
