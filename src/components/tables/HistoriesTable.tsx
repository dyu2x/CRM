import { ExportDataButton } from '../common/ExportDataButton';
import React, { useState, useMemo } from 'react';
import { Search, History, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { TablePagination } from '../common/TablePagination';

export const HistoriesTable: React.FC = () => {
  const { histories } = useCRM();

  const [searchTerm, setSearchTerm] = useState('');
  const [tableFilter, setTableFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const filteredData = useMemo(() => {
    return histories.filter((h) => {
      const entryTable = (h.entry_table || h.table_name || '').toLowerCase();
      const fieldName = (h.field_name || h.modified_field || '').toLowerCase();
      const modifier = (h.modifiers_name || h.modifying_agent || '').toLowerCase();
      const newVal = (h.new_value || '').toLowerCase();
      const oldVal = (h.old_value || '').toLowerCase();
      const q = searchTerm.toLowerCase();

      const matchesSearch =
        entryTable.includes(q) ||
        fieldName.includes(q) ||
        newVal.includes(q) ||
        oldVal.includes(q) ||
        modifier.includes(q);

      const actualTable = h.entry_table || h.table_name;
      const matchesTable = tableFilter === 'ALL' || actualTable === tableFilter;
      const matchesAction = actionFilter === 'ALL' || h.action_type === actionFilter;

      return matchesSearch && matchesTable && matchesAction;
    });
  }, [histories, searchTerm, tableFilter, actionFilter]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search audit trail (table, field, value, agent)..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Table Filter */}
          <select
            value={tableFilter}
            onChange={(e) => {
              setTableFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs border border-neutral-300 rounded px-2.5 py-1.5 bg-white text-neutral-800 focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="ALL">All Tables</option>
            <option value="opportunities">opportunities</option>
            <option value="orders">orders</option>
            <option value="follow_up_orders">follow_up_orders</option>
            <option value="invoices">invoices</option>
            <option value="deliveries">deliveries</option>
            <option value="revenues">revenues</option>
            <option value="farm_registries">farm_registries</option>
            <option value="contact_people">contact_people</option>
            <option value="agents">agents</option>
            <option value="crm_branding">crm_branding</option>
          </select>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs border border-neutral-300 rounded px-2.5 py-1.5 bg-white text-neutral-800 focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="ALL">All Actions</option>
            <option value="AUTOMATION">AUTOMATION (System Logic)</option>
            <option value="INSERT">INSERT (New Record)</option>
            <option value="UPDATE">UPDATE (Edit)</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
      </div>

            <div className="flex justify-end"><ExportDataButton tableKey="histories" tableLabel="Audit Trail" rows={filteredData as unknown as Record<string, unknown>[]} /></div>

{/* Table Display */}
      <div className="bg-white rounded-lg border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                <th className="py-3 px-4">Log ID</th>
                <th className="py-3 px-4">Entry Table</th>
                <th className="py-3 px-4">Field Name</th>
                <th className="py-3 px-4">Date and Time</th>
                <th className="py-3 px-4">Old Value</th>
                <th className="py-3 px-4">New Value</th>
                <th className="py-3 px-4">Modifier's Name</th>
                <th className="py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800 font-mono">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-neutral-400 font-sans">
                    No history log records found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((h) => {
                  const entryTable = h.entry_table || h.table_name || '';
                  const fieldName = h.field_name || h.modified_field || '';
                  const modifier = h.modifiers_name || h.modifying_agent || 'System';

                  return (
                    <tr key={h.history_id} className="hover:bg-neutral-50/70 transition">
                      <td className="py-3 px-4 font-bold text-neutral-900">
                        #{h.history_id}
                      </td>
                      <td className="py-3 px-4 font-semibold text-neutral-900 font-sans">
                        <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200 text-[11px]">
                          {entryTable}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-800 font-semibold">{fieldName}</td>
                      <td className="py-3 px-4 text-neutral-500 text-[11px] whitespace-nowrap">
                        {new Date(h.date_and_time).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-neutral-400 max-w-[160px] truncate" title={h.old_value}>
                        {h.old_value || 'None'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-neutral-900 max-w-[200px] truncate" title={h.new_value}>
                        <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {h.new_value}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-700 font-sans font-medium whitespace-nowrap">
                        {modifier}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            h.action_type === 'AUTOMATION'
                              ? 'bg-purple-100 text-purple-800'
                              : h.action_type === 'INSERT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {h.action_type || 'UPDATE'}
                        </span>
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
    </div>
  );
};
