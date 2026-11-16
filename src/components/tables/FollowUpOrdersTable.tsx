import { ExportDataButton } from '../common/ExportDataButton';
import { RecordDetails } from '../common/RecordDetails';
import React, { useState, useMemo } from 'react';
import { Plus, Search, Edit2, X, RotateCcw, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { FollowUpOrder, FollowUpStatus } from '../../types/crm';
import { TablePagination } from '../common/TablePagination';
import { DateRangeFilter, isWithinDateRange } from './DateRangeFilter';

export const FollowUpOrdersTable: React.FC = () => {
  const [viewRecord, setViewRecord] = useState<Record<string, unknown> | null>(null);
  const {
    followUpOrders,
    updateFollowUpStatus,
    addFollowUpOrder,
    editFollowUpOrder,
    farmRegistries,
    contactPeople,
    marketPrices,
    agents,
    createInvoice,
    invoices,
    followUpStatuses,
  } = useCRM();

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [farmFilter, setFarmFilter] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Add Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFarmName, setSelectedFarmName] = useState<string>(
    farmRegistries[0]?.farm_name || ''
  );
  const [selectedContactName, setSelectedContactName] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    marketPrices[0]?.name || ''
  );
  const [quantity, setQuantity] = useState<number>(marketPrices[0]?.unit === 'per kilo' ? 1 : 5000);
  const [initialStatus, setInitialStatus] = useState<FollowUpStatus>('Scheduled');
  const [selectedAgent, setSelectedAgent] = useState<string>(agents[0]?.name || '');
  const [notes, setNotes] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [landmarks, setLandmarks] = useState('');

  // Edit Modal State (Make All Entries Editable)
  const [editingFU, setEditingFU] = useState<FollowUpOrder | null>(null);
  const [editFarmName, setEditFarmName] = useState('');
  const [editContactPerson, setEditContactPerson] = useState('');
  const [editContactNumber, setEditContactNumber] = useState('');
  const [editContactEmail, setEditContactEmail] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editQuantity, setEditQuantity] = useState(5000);
  const [editStatus, setEditStatus] = useState<FollowUpStatus>('Scheduled');
  const [editAgent, setEditAgent] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDeliveryDate, setEditDeliveryDate] = useState('');
  const [editLandmarks, setEditLandmarks] = useState('');

  const eligibleFarmContacts = useMemo(() => contactPeople.filter((c) => c.farm_name === selectedFarmName && c.is_point_person === 'yes' && c.is_active === 'yes'), [contactPeople, selectedFarmName]);
  const matchedContact = useMemo(() => eligibleFarmContacts.find((c) => c.contact_person_name === selectedContactName) || eligibleFarmContacts[0], [eligibleFarmContacts, selectedContactName]);

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'ALL' || farmFilter !== 'ALL' || startDate !== '' || endDate !== '';

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setStatusFilter('ALL');
    setFarmFilter('ALL');
    setCurrentPage(1);
  };

  const filteredData = useMemo(() => {
    return followUpOrders.filter((fu) => {
      const matchesSearch =
        fu.farm_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fu.contact_person_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fu.contact_number.includes(searchTerm) ||
        fu.follow_up_orders_id.toString().includes(searchTerm) ||
        (fu.notes || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || fu.status === statusFilter;
      const matchesFarm = farmFilter === 'ALL' || fu.farm_name === farmFilter;

      return matchesSearch && matchesStatus && matchesFarm && isWithinDateRange(fu.date_of_inquiry, startDate, endDate);
    });
  }, [followUpOrders, searchTerm, statusFilter, farmFilter, startDate, endDate]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const getAvailableStatuses = (currentStatus: FollowUpStatus): FollowUpStatus[] => {
    if (currentStatus === 'Quality Issue Reported') {
      return ['Quality Issue Reported', 'Call Back Later', 'Resolved', 'Satisfied', 'Continue with an Order'];
    }
    return [
      'Scheduled',
      'Call Back Later',
      'Inquiry Only',
      'Cancelled',
      'Quality Issue Reported',
      'Resolved',
      'Satisfied',
      'Continue with an Order',
    ];
  };

  const handleCreateFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchedContact) return;

    addFollowUpOrder({
      farm_name: selectedFarmName,
      contact_person_name: matchedContact.contact_person_name,
      contact_number: matchedContact.phone_number,
      contact_email: matchedContact.email_address || '',
      fish_category: selectedCategory,
      quantity: Number(quantity) || 1000,
      status: initialStatus,
      verified_up_by: selectedAgent,
      delivery_date: deliveryDate || undefined,
      landmarks,
      notes: notes || 'Manual follow-up registered.',
    });

    setIsModalOpen(false);
    setNotes('');
    setDeliveryDate('');
    setLandmarks('');
  };

  const handleOpenEdit = (fu: FollowUpOrder) => {
    setEditingFU(fu);
    setEditFarmName(fu.farm_name);
    setEditContactPerson(fu.contact_person_name);
    setEditContactNumber(fu.contact_number);
    setEditContactEmail(fu.contact_email || '');
    setEditCategory(fu.fish_category);
    setEditQuantity(fu.quantity);
    setEditStatus(fu.status);
    setEditAgent(fu.verified_up_by);
    setEditNotes(fu.notes || '');
    setEditDeliveryDate(fu.delivery_date || '');
    setEditLandmarks(fu.landmarks || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFU) return;

    editFollowUpOrder(editingFU.follow_up_orders_id, {
      farm_name: editFarmName,
      contact_person_name: editContactPerson,
      contact_number: editContactNumber,
      contact_email: editContactEmail,
      fish_category: editCategory,
      quantity: Number(editQuantity),
      status: editStatus,
      verified_up_by: editAgent,
      delivery_date: editDeliveryDate || undefined,
      landmarks: editLandmarks,
      notes: editNotes,
    });

    setEditingFU(null);
  };

  const handleCreateInvoiceForFU = (fu: FollowUpOrder) => {
    const existing = invoices.find((inv) => inv.follow_up_orders_id === fu.follow_up_orders_id);
    if (existing) {
      alert(`Invoice already exists for Follow-up #${fu.follow_up_orders_id} (${existing.official_receipt_id})`);
      return;
    }

    const officialReceiptId = window.prompt('Enter the required Official Receipt ID for this invoice:')?.trim();
    if (!officialReceiptId) return;
    if (invoices.some((inv) => (inv.official_receipt_id || '').trim().toLowerCase() === officialReceiptId.toLowerCase())) { alert('This Official Receipt ID is already in use.'); return; }
    createInvoice({
      official_receipt_id: officialReceiptId,
      follow_up_orders_id: fu.follow_up_orders_id,
      order_id: fu.order_id,
      farm_name: fu.farm_name,
      contact_person_name: fu.contact_person_name,
      fish_category: fu.fish_category,
      quantity: fu.quantity,
      payment_method: 'Cash on Delivery',
      notes: `Invoice issued from verified Follow-up #${fu.follow_up_orders_id}`,
    });
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Header with Rich Filters */}
      <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search follow-ups (farm, contact, number, notes)..."
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
            <option value="ALL">All Follow-up Statuses</option>
            {followUpStatuses.map((st) => (
              <option key={st.id} value={st.name}>
                {st.name}
              </option>
            ))}
          </select>

          <select
            value={farmFilter}
            onChange={(e) => {
              setFarmFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs border border-neutral-300 rounded px-2.5 py-1.5 bg-white text-neutral-800 focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="ALL">All Farms</option>
            {farmRegistries.map((f) => (
              <option key={f.farm_id} value={f.farm_name}>
                {f.farm_name}
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

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-neutral-800 text-white rounded text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Follow-up</span>
          </button>
        </div>
      </div>

            <div className="flex justify-end"><ExportDataButton tableKey="follow_up_orders" tableLabel="Follow-up Orders" rows={filteredData as unknown as Record<string, unknown>[]} /></div>

{/* Table Display */}
      <div className="bg-white rounded-lg border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                <th className="py-3 px-4">FU ID</th>
                <th className="py-3 px-4">Order Ref</th>
                <th className="py-3 px-4">Farm Name</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Contact Phone &amp; Email</th>
                <th className="py-3 px-4">Fish &amp; Quantity</th>
                <th className="py-3 px-4">Landmarks</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Verified By</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-neutral-400">
                    No follow-up entries found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((fu) => {
                  const isQualityIssue = fu.status === 'Quality Issue Reported';
                  const hasInvoice = invoices.some(
                    (inv) => inv.follow_up_orders_id === fu.follow_up_orders_id
                  );

                  return (
                    <tr
                      key={fu.follow_up_orders_id}
                      className={`hover:bg-neutral-50/70 transition ${
                        isQualityIssue ? 'bg-red-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-medium text-neutral-900">
                        #{fu.follow_up_orders_id}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-neutral-500">
                        {fu.order_id ? `#${fu.order_id}` : 'Inquiry'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-neutral-900">
                        {fu.farm_name}
                      </td>
                      <td className="py-3 px-4 font-medium">{fu.contact_person_name}</td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-[11px] text-neutral-700">{fu.contact_number}</div>
                        {fu.contact_email && (
                          <div className="text-[10px] text-neutral-400">{fu.contact_email}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="max-w-[170px] truncate" title={fu.fish_category}>
                          {fu.fish_category}
                        </div>
                        <div className="font-mono text-[11px] text-neutral-500">
                          {fu.quantity.toLocaleString()} pcs
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-[180px] text-[11px] text-neutral-600" title={fu.landmarks || ''}>{fu.landmarks || '—'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            fu.status === 'Scheduled'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : fu.status === 'Quality Issue Reported'
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : fu.status === 'Continue with an Order'
                              ? 'bg-blue-100 text-blue-900 border-blue-300'
                              : fu.status === 'Satisfied' || fu.status === 'Resolved'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-neutral-100 text-neutral-700 border-neutral-300'
                          }`}
                        >
                          {fu.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-600">{fu.verified_up_by}</td>
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                        <button type="button" onClick={() => setViewRecord(fu as unknown as Record<string, unknown>)} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition">View</button>
                          <button
                          onClick={() => handleOpenEdit(fu)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-neutral-700 hover:text-white bg-neutral-100 hover:bg-neutral-900 rounded border border-neutral-300 transition cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        {hasInvoice ? (
                          <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Invoiced
                          </span>
                        ) : (
                          <button
                            onClick={() => handleCreateInvoiceForFU(fu)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-neutral-700 bg-neutral-100 hover:bg-black hover:text-white rounded border border-neutral-300 transition cursor-pointer"
                            title="Generate official invoice"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Invoice</span>
                          </button>
                        )}
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

      {/* Modal: Edit Follow Up (Make All Entries Editable) */}
      {editingFU && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-neutral-200 max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <h3 className="font-semibold text-sm text-neutral-900">
                Edit Follow-up #{editingFU.follow_up_orders_id}
              </h3>
              <button
                onClick={() => setEditingFU(null)}
                className="text-neutral-400 hover:text-neutral-700 text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Farm Name
                </label>
                <select value={editFarmName} onChange={(e) => { const farm = e.target.value; setEditFarmName(farm); const first = contactPeople.find((c) => c.farm_name === farm && c.is_active === 'yes'); if (first) setEditContactPerson(first.contact_person_name); }} required className="w-full px-3 py-2 text-xs border border-neutral-300 rounded bg-white">
                  {farmRegistries.map((f) => <option key={f.farm_id} value={f.farm_name}>{f.farm_name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Contact Person Name
                </label>
                <select value={editContactPerson} onChange={(e) => setEditContactPerson(e.target.value)} required className="w-full px-3 py-2 text-xs border border-neutral-300 rounded bg-white">
                  {contactPeople.filter((c) => c.farm_name === editFarmName && c.is_active === 'yes').map((c) => <option key={c.contact_id} value={c.contact_person_name}>{c.contact_person_name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={editContactNumber}
                    onChange={(e) => setEditContactNumber(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={editContactEmail}
                    onChange={(e) => setEditContactEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div><label className="block text-xs font-medium text-neutral-700 mb-1">Landmarks</label><textarea value={editLandmarks} onChange={e => setEditLandmarks(e.target.value)} rows={2} className="w-full px-3 py-2 text-xs border border-neutral-300 rounded" placeholder="Directions or nearby landmarks" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Fish Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white"
                  >
                    {marketPrices.map((c) => (
                      <option key={c.market_price_id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Quantity ({marketPrices.find((item) => item.name === editCategory)?.unit === 'per kilo' ? 'kg' : 'pcs'})
                  </label>
                  <input
                    type="number"
                    min={marketPrices.find((item) => item.name === editCategory)?.unit === 'per kilo' ? '0.001' : '1'}
                    step={marketPrices.find((item) => item.name === editCategory)?.unit === 'per kilo' ? '0.001' : '1'}
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Status Transition
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as FollowUpStatus)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white"
                >
                  {getAvailableStatuses(editingFU.status).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt} {opt === 'Continue with an Order' ? '(Auto Order)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Verified Up By
                </label>
                <select
                  value={editAgent}
                  onChange={(e) => setEditAgent(e.target.value)}
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
                <label className="block text-xs font-medium text-neutral-700 mb-1">Delivery Date</label>
                <input type="date" value={editDeliveryDate} onChange={(e) => setEditDeliveryDate(e.target.value)} className="w-full px-3 py-2 text-xs border border-neutral-300 rounded" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setEditingFU(null)}
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

      {/* Modal: New Follow Up */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-neutral-200 max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <h3 className="font-semibold text-sm text-neutral-900">
                Log Follow-up Inquiry (follow_up_orders table)
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateFollowUp} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Farm Name (Dropdown FK &bull; farm_registries)
                </label>
                <select
                  value={selectedFarmName}
                  onChange={(e) => { const farm = e.target.value; setSelectedFarmName(farm); const first = contactPeople.find((c) => c.farm_name === farm && c.is_point_person === 'yes' && c.is_active === 'yes'); setSelectedContactName(first?.contact_person_name || ''); }}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white"
                >
                  {farmRegistries.map((f) => (
                    <option key={f.farm_id} value={f.farm_name}>
                      {f.farm_name}
                    </option>
                  ))}
                </select>
                <label className="block text-xs font-medium text-neutral-700 mt-3 mb-1">Contact Person</label>
                <select value={matchedContact?.contact_person_name || ''} onChange={(e) => setSelectedContactName(e.target.value)} required className="w-full px-3 py-2 text-xs border border-neutral-300 rounded bg-white">
                  {eligibleFarmContacts.map((cp) => <option key={cp.contact_id} value={cp.contact_person_name}>{cp.contact_person_name} — {cp.phone_number}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Fish Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => { const next = e.target.value; setSelectedCategory(next); setQuantity(marketPrices.find((item) => item.name === next)?.unit === 'per kilo' ? 1 : 5000); }}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white"
                >
                  {marketPrices.map((c) => (
                    <option key={c.market_price_id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Quantity ({marketPrices.find((item) => item.name === selectedCategory)?.unit === 'per kilo' ? 'kg' : 'pcs'})
                  </label>
                  {marketPrices.find((item) => item.name === selectedCategory)?.unit === 'per kilo' ? (
                    <input type="number" min="0.001" step="0.001" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black" />
                  ) : (
                    <select value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white">
                      {[2000, 5000, 10000, 15000].map((amount) => <option key={amount} value={amount}>{amount.toLocaleString()} pcs</option>)}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={initialStatus}
                    onChange={(e) => setInitialStatus(e.target.value as FollowUpStatus)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white"
                  >
                    <option value="Scheduled">Scheduled (Automated 24h Queue)</option>
                    <option value="Call Back Later">Call Back Later</option>
                    <option value="Quality Issue Reported">Quality Issue Reported</option>
                    <option value="Inquiry Only">Inquiry Only</option>
                    <option value="Continue with an Order">Continue with an Order</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Verified Up By (Dropdown FK &bull; agents)
                </label>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
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
                <label className="block text-xs font-medium text-neutral-700 mb-1">Delivery Date</label>
                <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="w-full px-3 py-2 text-xs border border-neutral-300 rounded" />
              </div>
              <div><label className="block text-xs font-medium text-neutral-700 mb-1">Landmarks</label><textarea value={landmarks} onChange={(e) => setLandmarks(e.target.value)} rows={2} className="w-full px-3 py-2 text-xs border border-neutral-300 rounded" placeholder="Directions or nearby landmarks" /></div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Inquiry / Follow-up Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                  placeholder="Record customer feedback or inquiry details..."
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-neutral-300 text-neutral-700 text-xs rounded hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-semibold rounded shadow-xs"
                >
                  Save Follow-up Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <RecordDetails title="Follow-up Details" record={viewRecord} onBack={() => setViewRecord(null)} />
    </div>
  );
};
