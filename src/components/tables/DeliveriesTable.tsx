import { ExportDataButton } from '../common/ExportDataButton';
import { RecordDetails } from '../common/RecordDetails';
import React, { useState, useMemo } from 'react';
import { Search, Truck, CheckCircle2, UserCheck, Edit2, X, RotateCcw } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { Delivery } from '../../types/crm';
import { TablePagination } from '../common/TablePagination';
import { DateRangeFilter, isWithinDateRange } from './DateRangeFilter';
import { GoogleMapsLink } from '../common/GoogleMapsLink';

export const DeliveriesTable: React.FC = () => {
  const [viewRecord, setViewRecord] = useState<Record<string, unknown> | null>(null);
  const {
    deliveries,
    editDelivery,
    contactPeople,
    agents,
    invoices,
    deliveryStatuses,
    paymentMethods,
    paymentStatuses,
  } = useCRM();

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [agentFilter, setAgentFilter] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Edit Modal State (Make All Entries Editable)
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);
  const [editStatus, setEditStatus] = useState<Delivery['status']>('Pending');
  const [editPaymentCollectedBy, setEditPaymentCollectedBy] = useState<string>('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<string>('');
  const [editPaymentStatus, setEditPaymentStatus] = useState<Delivery['payment_status']>('Pending');
  const [editFulfillmentAcceptedBy, setEditFulfillmentAcceptedBy] = useState<string>('');
  const [editDeliveredBy, setEditDeliveredBy] = useState<string>('');
  const [editDeliveryNotes, setEditDeliveryNotes] = useState<string>('');
  const [editLandmarks, setEditLandmarks] = useState<string>('');
  const [editAddress, setEditAddress] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editGps, setEditGps] = useState<string>('');
  const [editDeliveryDate, setEditDeliveryDate] = useState<string>('');

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'ALL' || agentFilter !== 'ALL' || startDate !== '' || endDate !== '';

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setStatusFilter('ALL');
    setAgentFilter('ALL');
    setCurrentPage(1);
  };

  // Filtered & Paginated records
  const filteredData = useMemo(() => {
    return deliveries.filter((del) => {
      const matchesSearch =
        del.farm_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        del.farm_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        del.delivery_id.toString().includes(searchTerm) ||
        (del.fulfillment_accepted_by || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (del.landmarks || del.delivery_notes || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || del.status === statusFilter;
      const matchesAgent = agentFilter === 'ALL' || del.delivered_by === agentFilter;

      return matchesSearch && matchesStatus && matchesAgent && isWithinDateRange(del.delivery_date, startDate, endDate);
    });
  }, [deliveries, searchTerm, statusFilter, agentFilter, startDate, endDate]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleOpenEdit = (del: Delivery) => {
    setEditingDelivery(del);
    setEditStatus(del.status);
    setEditPaymentCollectedBy(del.payment_collected_by || agents[0]?.name || '');
    setEditPaymentMethod(del.payment_method || 'Cash on Delivery');
    setEditPaymentStatus(del.payment_status);
    setEditFulfillmentAcceptedBy(del.fulfillment_accepted_by || contactPeople.find(cp => cp.farm_name === del.farm_name && cp.is_active === 'yes')?.contact_person_name || '');
    setEditDeliveredBy(del.delivered_by || agents[2]?.name || '');
    setEditDeliveryNotes(del.delivery_notes || '');
    setEditLandmarks(del.landmarks || '');
    setEditAddress(del.farm_address);
    setEditPhone(del.farm_phone);
    setEditGps(del.farm_gps_coordinates);
    setEditDeliveryDate(del.delivery_date || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDelivery) return;

    editDelivery(editingDelivery.delivery_id, {
      status: editStatus,
      payment_collected_by: editPaymentCollectedBy,
      payment_method: editPaymentMethod,
      payment_status: editPaymentStatus,
      fulfillment_accepted_by: editFulfillmentAcceptedBy,
      delivered_by: editDeliveredBy,
      delivery_notes: editDeliveryNotes,
      landmarks: editLandmarks,
      delivery_date: editDeliveryDate || undefined,
      farm_address: editAddress,
      farm_phone: editPhone,
      farm_gps_coordinates: editGps,
      delivered_date: editStatus === 'Delivered' ? (editingDelivery.delivered_date || new Date().toISOString()) : undefined,
    });

    setEditingDelivery(null);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Header with Rich Filters */}
      <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search deliveries (farm, address, fulfillment, notes)..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs border border-neutral-300 rounded px-2.5 py-1.5 bg-white text-neutral-800 focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="ALL">All Delivery Statuses</option>
            {deliveryStatuses.map((st) => (
              <option key={st.id} value={st.name}>
                {st.name}
              </option>
            ))}
          </select>

          <select
            value={agentFilter}
            onChange={(e) => {
              setAgentFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs border border-neutral-300 rounded px-2.5 py-1.5 bg-white text-neutral-800 focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="ALL">All Delivery Drivers</option>
            {agents.map((ag) => (
              <option key={ag.agent_id} value={ag.name}>
                {ag.name}
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

            <div className="flex justify-end"><ExportDataButton tableKey="deliveries" tableLabel="Deliveries" rows={filteredData as unknown as Record<string, unknown>[]} /></div>

{/* Table Display */}
      <div className="bg-white rounded-lg border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                <th className="py-3 px-4">Delivery ID</th>
                <th className="py-3 px-4">Invoice Ref</th>
                <th className="py-3 px-4">Farm Details &amp; GPS</th>
                <th className="py-3 px-4">Landmarks</th>
                <th className="py-3 px-4">Driver</th>
                <th className="py-3 px-4">Delivery Status</th>
                <th className="py-3 px-4">Payment Method &amp; Collector</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4">Fulfillment Accepted By</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-neutral-400">
                    No delivery records found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((del) => {
                  const invoice = invoices.find((inv) => inv.invoice_id === del.invoice_id);
                  const isDelivered = del.status === 'Delivered';
                  return (
                    <tr key={del.delivery_id} className="hover:bg-neutral-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                        #{del.delivery_id}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-neutral-500">
                        {invoice ? invoice.official_receipt_id : `#${del.invoice_id}`}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-neutral-900">{del.farm_name}</div>
                        <div className="text-[11px] text-neutral-500 max-w-[200px] truncate" title={del.farm_address}>
                          {del.farm_address}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="text-[10px] text-neutral-400 font-mono">GPS:</span>
                          <GoogleMapsLink
                            coordinates={del.farm_gps_coordinates}
                            address={del.farm_address}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-[200px]" title={del.landmarks || del.delivery_notes}>
                        <div className="text-[11px] text-neutral-700 bg-neutral-50 p-1.5 rounded border border-neutral-200">
                          {del.landmarks || del.delivery_notes || 'Not provided'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-neutral-700 font-medium">{del.delivered_by}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${
                            del.status === 'Delivered'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : del.status === 'Out for Delivery'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : del.status === 'Rescheduled'
                              ? 'bg-purple-50 text-purple-800 border-purple-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          {del.status === 'Delivered' && <CheckCircle2 className="w-3 h-3" />}
                          <span>{del.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-neutral-800">{del.payment_method}</div>
                        <div className="text-[11px] text-neutral-500">
                          Collector: {del.payment_collected_by || '—'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            del.payment_status === 'Paid in Full'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {del.payment_status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-neutral-900 flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-neutral-500" />
                          <span>{del.fulfillment_accepted_by || 'Awaiting Sign-off'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button type="button" onClick={() => setViewRecord(del as unknown as Record<string, unknown>)} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition">View</button>
                          <button
                          onClick={() => handleOpenEdit(del)}
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

      {/* Modal: Edit Delivery (Make All Entries Editable) */}
      {editingDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-neutral-200 max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <div>
                <h3 className="font-semibold text-sm text-neutral-900">
                  Edit Delivery #{editingDelivery.delivery_id}
                </h3>
                <p className="text-[11px] text-neutral-500">
                  All fields editable &bull; updates recorded in audit trail
                </p>
              </div>
              <button
                onClick={() => setEditingDelivery(null)}
                className="text-neutral-400 hover:text-neutral-700 text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Delivery Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as Delivery['status'])}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white"
                  >
                    {deliveryStatuses.map((st) => (
                      <option key={st.id} value={st.name}>
                        {st.name} {st.name === 'Delivered' ? '(Triggers Revenue)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={editPaymentStatus}
                    onChange={(e) => setEditPaymentStatus(e.target.value as Delivery['payment_status'])}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white"
                  >
                    {paymentStatuses.map((st) => (
                      <option key={st.id} value={st.name}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Delivery Driver
                  </label>
                  <select
                    value={editDeliveredBy}
                    onChange={(e) => setEditDeliveredBy(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white"
                  >
                    {agents.map((ag) => (
                      <option key={ag.agent_id} value={ag.name}>
                        {ag.name} ({ag.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Payment Collected By
                  </label>
                  <select
                    value={editPaymentCollectedBy}
                    onChange={(e) => setEditPaymentCollectedBy(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white"
                  >
                    {agents.map((ag) => (
                      <option key={ag.agent_id} value={ag.name}>
                        {ag.name} ({ag.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                    Fulfillment Accepted By
                  </label>
                  <select
                    value={editFulfillmentAcceptedBy}
                    onChange={(e) => setEditFulfillmentAcceptedBy(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white"
                  >
                    {contactPeople.filter((cp) => cp.farm_name === editingDelivery?.farm_name && cp.is_active === 'yes').map((cp) => (
                      <option key={cp.contact_id} value={cp.contact_person_name}>
                        {cp.contact_person_name} — {cp.farm_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Delivery Date</label>
                <input type="date" value={editDeliveryDate} onChange={(e) => setEditDeliveryDate(e.target.value)} className="w-full px-3 py-2 text-xs border border-neutral-300 rounded" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Landmarks
                </label>
                <textarea
                  value={editLandmarks}
                  onChange={(e) => setEditLandmarks(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Farm Address
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Farm Phone
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    GPS Coordinates
                  </label>
                  <input
                    type="text"
                    value={editGps}
                    onChange={(e) => setEditGps(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setEditingDelivery(null)}
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
      <RecordDetails title="Delivery Details" record={viewRecord} onBack={() => setViewRecord(null)} />
    </div>
  );
};
