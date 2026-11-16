import { ExportDataButton } from '../common/ExportDataButton';
import { RecordDetails } from '../common/RecordDetails';
import React, { useState, useMemo } from 'react';
import { Plus, Search, Edit2, X, RotateCcw, Printer } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { Invoice } from '../../types/crm';
import { TablePagination } from '../common/TablePagination';
import { DateRangeFilter, isWithinDateRange } from './DateRangeFilter';

export const InvoicesTable: React.FC = () => {
  const [viewRecord, setViewRecord] = useState<Record<string, unknown> | null>(null);
  const {
    invoices,
    followUpOrders,
    farmRegistries,
    contactPeople,
    marketPrices,
    branding,
    paymentMethods,
    paymentStatuses,
    createInvoice,
    editInvoice,
    updateInvoicePaymentStatus,
  } = useCRM();

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
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
  const [quantity, setQuantity] = useState<number>(marketPrices[0]?.unit === 'per kilo' ? 1 : 10000);
  const [officialReceiptId, setOfficialReceiptId] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>(
    (paymentMethods[0]?.name || '')
  );
  const [notes, setNotes] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');

  // Edit Modal State (Make All Entries Editable)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editOR, setEditOR] = useState('');
  const [editFarmName, setEditFarmName] = useState('');
  const [editContactPerson, setEditContactPerson] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editQuantity, setEditQuantity] = useState(10000);
  const [editPricePerPiece, setEditPricePerPiece] = useState(4.5);
  const [editUnit, setEditUnit] = useState<'per piece' | 'per kilo'>('per piece');
  const [editPaymentMethod, setEditPaymentMethod] = useState('');
  const [editPaymentStatus, setEditPaymentStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDeliveryDate, setEditDeliveryDate] = useState('');

  const eligibleFarmContacts = useMemo(() => contactPeople.filter((c) => c.farm_name === selectedFarmName && c.is_point_person === 'yes' && c.is_active === 'yes'), [contactPeople, selectedFarmName]);
  const currentContact = useMemo(() => eligibleFarmContacts.find((c) => c.contact_person_name === selectedContactName) || eligibleFarmContacts[0], [eligibleFarmContacts, selectedContactName]);

  const selectedMarketPrice = useMemo(() => marketPrices.find((m) => m.name === selectedCategory), [marketPrices, selectedCategory]);
  const currentPricePerPiece = selectedMarketPrice ? selectedMarketPrice.price : 0;
  const isOrderLinkedInvoice = Boolean(editingInvoice?.order_id || (editingInvoice?.follow_up_orders_id && followUpOrders.some((row) => row.follow_up_orders_id === editingInvoice.follow_up_orders_id && row.order_id))); 
  const currentUnit = selectedMarketPrice?.unit || 'per piece';

  const canPrintInvoice = (inv: Invoice) => Boolean(
    inv.official_receipt_id?.trim() && inv.farm_name?.trim() && inv.contact_person_name?.trim() &&
    inv.fish_category?.trim() && Number(inv.quantity) > 0 && Number(inv.item_price_per_piece) >= 0 &&
    Number(inv.total_price) >= 0 && inv.payment_received_by?.trim() && inv.payment_method?.trim() && inv.payment_status?.trim() && inv.or_issued_by?.trim()
  );

  const printInvoice = (inv: Invoice) => {
    if (!canPrintInvoice(inv)) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { alert('Please allow pop-ups to print invoices.'); return; }
    const esc = (value: unknown) => String(value ?? '').replace(/[&<>\"']/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[ch] || ch));
    const logo = branding.company_logo ? `<img src="${esc(branding.company_logo)}" style="max-height:76px;max-width:150px;object-fit:contain" />` : '';
    win.document.write(`<!doctype html><html><head><title>Invoice ${esc(inv.official_receipt_id)}</title><style>body{font-family:Arial,sans-serif;color:#111;padding:36px}header{display:flex;align-items:center;gap:18px;border-bottom:2px solid #222;padding-bottom:18px;margin-bottom:28px}.company{font-size:24px;font-weight:700}.muted{color:#555;font-size:12px}.meta{display:flex;justify-content:space-between;margin:22px 0}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{padding:12px;border:1px solid #ccc;text-align:left}th{background:#f4f4f4}.total{text-align:right;font-size:20px;font-weight:bold;margin-top:22px}.footer{margin-top:50px;font-size:12px;color:#555}@media print{button{display:none}}</style></head><body><header>${logo}<div><div class="company">${esc(branding.company_name || 'Mesina Farms')}</div><div class="muted">Official Invoice</div></div></header><div class="meta"><div><strong>Official Receipt ID:</strong> ${esc(inv.official_receipt_id)}<br/><strong>Date:</strong> ${esc(new Date(inv.date_created).toLocaleDateString())}</div><div><strong>Payment Status:</strong> ${esc(inv.payment_status)}<br/><strong>Payment Method:</strong> ${esc(inv.payment_method)}</div></div><p><strong>Farm:</strong> ${esc(inv.farm_name)}<br/><strong>Contact Person:</strong> ${esc(inv.contact_person_name)}</p><table><thead><tr><th>Description</th><th>Quantity</th><th>Unit Price</th><th>Amount</th></tr></thead><tbody><tr><td>${esc(inv.fish_category)}</td><td>${Number(inv.quantity).toLocaleString()} ${inv.item_unit === 'per kilo' ? 'kg' : 'pcs'}</td><td>₱${Number(inv.item_price_per_piece).toFixed(2)} / ${esc(inv.item_unit || 'per piece')}</td><td>₱${Number(inv.subtotal ?? (inv.quantity * inv.item_price_per_piece)).toLocaleString(undefined,{minimumFractionDigits:2})}</td></tr></tbody></table><div style="text-align:right;margin-top:18px">Subtotal: ₱${Number(inv.subtotal ?? (inv.quantity * inv.item_price_per_piece)).toLocaleString(undefined,{minimumFractionDigits:2})}</div>${inv.discount_enabled && Number(inv.discount || 0) > 0 ? `<div style="text-align:right">Discount: −₱${Number(inv.discount).toLocaleString(undefined,{minimumFractionDigits:2})}</div>` : ''}<div class="total">Total: ₱${Number(inv.total_price).toLocaleString(undefined,{minimumFractionDigits:2})}</div><p><strong>Issued by:</strong> ${esc(inv.or_issued_by)}</p><div class="footer">${esc(inv.notes || '')}</div></body></html>`);
    win.document.close();
    window.setTimeout(() => { win.focus(); win.print(); }, 300);
  };

  const calculatedTotal = quantity * currentPricePerPiece;

  const hasActiveFilters = searchTerm !== '' || paymentFilter !== 'ALL' || farmFilter !== 'ALL' || startDate !== '' || endDate !== '';

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setPaymentFilter('ALL');
    setFarmFilter('ALL');
    setCurrentPage(1);
  };

  const filteredData = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.official_receipt_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.farm_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.contact_person_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.notes || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPayment = paymentFilter === 'ALL' || inv.payment_status === paymentFilter;
      const matchesFarm = farmFilter === 'ALL' || inv.farm_name === farmFilter;

      return matchesSearch && matchesPayment && matchesFarm && isWithinDateRange(inv.date_created, startDate, endDate);
    });
  }, [invoices, searchTerm, paymentFilter, farmFilter, startDate, endDate]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentContact || !selectedMarketPrice) return;
    if (invoices.some((inv) => (inv.official_receipt_id || '').trim().toLowerCase() === officialReceiptId.trim().toLowerCase())) { alert('This Official Receipt ID is already in use.'); return; }

    createInvoice({
      official_receipt_id: officialReceiptId.trim(),
      farm_name: selectedFarmName,
      contact_person_name: currentContact.contact_person_name,
      fish_category: selectedCategory,
      quantity: Number(quantity) || 1000,
      payment_method: selectedPaymentMethod,
      delivery_date: deliveryDate || undefined,
      notes: notes || undefined,
    });

    setIsModalOpen(false);
    setNotes('');
    setDeliveryDate('');
    setOfficialReceiptId('');
  };

  const handleOpenEdit = (inv: Invoice) => {
    setEditingInvoice(inv);
    setEditOR(inv.official_receipt_id);
    setEditFarmName(inv.farm_name);
    setEditContactPerson(inv.contact_person_name);
    setEditCategory(inv.fish_category);
    setEditQuantity(inv.quantity);
    setEditPricePerPiece(inv.item_price_per_piece);
    setEditUnit(inv.item_unit || 'per piece');
    setEditPaymentMethod(inv.payment_method);
    setEditPaymentStatus(inv.payment_status);
    setEditNotes(inv.notes || '');
    setEditDeliveryDate(inv.delivery_date || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    if (!editOR.trim()) return;
    if (invoices.some((inv) => inv.invoice_id !== editingInvoice.invoice_id && (inv.official_receipt_id || '').trim().toLowerCase() === editOR.trim().toLowerCase())) { alert('This Official Receipt ID is already in use.'); return; }

    editInvoice(editingInvoice.invoice_id, {
      official_receipt_id: editOR,
      farm_name: editFarmName,
      contact_person_name: editContactPerson,
      fish_category: editCategory,
      quantity: Number(editQuantity),
      item_price_per_piece: Number(editPricePerPiece),
      item_unit: editUnit,
      payment_method: editPaymentMethod,
      payment_status: editPaymentStatus,
      delivery_date: editDeliveryDate || undefined,
      notes: editNotes,
    });

    setEditingInvoice(null);
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search invoices (OR #, farm, contact, notes)..."
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
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs border border-neutral-300 rounded px-2.5 py-1.5 bg-white text-neutral-800 focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="ALL">All Payment Statuses</option>
            {paymentStatuses.map((st) => (
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
            onClick={() => { setOfficialReceiptId(''); setIsModalOpen(true); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-neutral-800 text-white rounded text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Issue Invoice</span>
          </button>
        </div>
      </div>

            <div className="flex justify-end"><ExportDataButton tableKey="invoices" tableLabel="Invoices" rows={filteredData as unknown as Record<string, unknown>[]} /></div>

{/* Table Display */}
      <div className="bg-white rounded-lg border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                <th className="py-3 px-4">Receipt # (OR)</th>
                <th className="py-3 px-4">Farm Name</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Fish Category</th>
                <th className="py-3 px-4">Quantity</th>
                <th className="py-3 px-4">Price/Unit</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Payment Received By</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-neutral-400">
                    No invoice entries found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((inv) => (
                  <tr key={inv.invoice_id} className="hover:bg-neutral-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                      {inv.official_receipt_id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-neutral-900">{inv.farm_name}</td>
                    <td className="py-3 px-4 text-neutral-700">{inv.contact_person_name}</td>
                    <td className="py-3 px-4 max-w-[170px] truncate" title={inv.fish_category}>
                      {inv.fish_category}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium">
                      {inv.quantity.toLocaleString()} {(inv.item_unit || 'per piece') === 'per kilo' ? 'kg' : 'pcs'}
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-600">
                      ₱{Number(inv.item_price_per_piece).toFixed(2)} / {inv.item_unit || 'per piece'}
                      {inv.discount_enabled && Number(inv.discount || 0) > 0 && <div className="text-[10px] text-emerald-700 font-sans">Discount: −₱{Number(inv.discount).toFixed(2)}</div>}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                      ₱{Number(inv.total_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-neutral-600">{inv.payment_received_by || inv.or_issued_by || '—'}</td>
                    <td className="py-3 px-4 text-neutral-600">{inv.payment_method}</td>
                    <td className="py-3 px-4">
                      <select
                        value={inv.payment_status}
                        onChange={(e) => updateInvoicePaymentStatus(inv.invoice_id, e.target.value)}
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded border focus:outline-none focus:ring-1 cursor-pointer ${
                          inv.payment_status === 'Paid in Full'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : inv.payment_status === 'Partially Paid'
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        {paymentStatuses.map((ps) => (
                          <option key={ps.id} value={ps.name}>
                            {ps.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button type="button" onClick={() => printInvoice(inv)} disabled={!canPrintInvoice(inv)} title={canPrintInvoice(inv) ? 'Print invoice using a connected or network printer' : 'Complete the required invoice details before printing'} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-emerald-50"><Printer className="w-3 h-3" /> Print</button>
                      <button type="button" onClick={() => setViewRecord(inv as unknown as Record<string, unknown>)} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition">View</button>
                        <button
                        onClick={() => handleOpenEdit(inv)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:text-white bg-neutral-100 hover:bg-neutral-900 rounded border border-neutral-300 transition cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))
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

      {/* Modal: Edit Invoice (Make All Entries Editable) */}
      {editingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-neutral-200 max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <h3 className="font-semibold text-sm text-neutral-900">
                Edit Invoice #{editingInvoice.invoice_id}
              </h3>
              <button
                onClick={() => setEditingInvoice(null)}
                className="text-neutral-400 hover:text-neutral-700 text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Official Receipt ID (OR)
                  </label>
                  <input
                    type="text"
                    value={editOR}
                    onChange={(e) => setEditOR(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Farm Name
                  </label>
                  <input
                    type="text"
                    value={editFarmName}
                    onChange={(e) => setEditFarmName(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Contact Person Name
                </label>
                <input
                  type="text"
                  value={editContactPerson}
                  onChange={(e) => setEditContactPerson(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              {isOrderLinkedInvoice && <p className="text-xs rounded bg-amber-50 border border-amber-200 p-2 text-amber-800">Pricing and quantity are locked because this invoice preserves the terms of its originating order.</p>}
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Fish Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  disabled={isOrderLinkedInvoice}
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
                    Quantity ({editUnit === 'per kilo' ? 'kg' : 'pcs'})
                  </label>
                  <input
                    type="number"
                    min={editUnit === 'per kilo' ? '0.001' : '1'}
                    step={editUnit === 'per kilo' ? '0.001' : '1'}
                    value={editQuantity}
                    readOnly={isOrderLinkedInvoice}
                    onChange={(e) => setEditQuantity(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Price per Unit (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editPricePerPiece}
                    readOnly={isOrderLinkedInvoice}
                    onChange={(e) => setEditPricePerPiece(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black font-mono"
                  />
                  <select value={editUnit} disabled={isOrderLinkedInvoice} onChange={(e) => setEditUnit(e.target.value as 'per piece' | 'per kilo')} className="mt-2 w-full px-3 py-2 text-xs border border-neutral-300 rounded bg-white"><option value="per piece">per piece</option><option value="per kilo">per kilo</option></select>
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
                    Payment Status
                  </label>
                  <select
                    value={editPaymentStatus}
                    onChange={(e) => setEditPaymentStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white"
                  >
                    {paymentStatuses.map((ps) => (
                      <option key={ps.id} value={ps.name}>
                        {ps.name}
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
                  Invoice Notes
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
                  onClick={() => setEditingInvoice(null)}
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

      {/* Modal: New Invoice */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-neutral-200 max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <h3 className="font-semibold text-sm text-neutral-900">
                Issue Official Invoice
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Official Receipt ID</label>
                <input type="text" required value={officialReceiptId} onChange={(e) => setOfficialReceiptId(e.target.value)} placeholder="Enter official receipt number" className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Farm Name
                </label>
                <select
                  required
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
                <select value={currentContact?.contact_person_name || ''} onChange={(e) => setSelectedContactName(e.target.value)} required className="w-full px-3 py-2 text-xs border border-neutral-300 rounded bg-white">
                  {eligibleFarmContacts.map((cp) => <option key={cp.contact_id} value={cp.contact_person_name}>{cp.contact_person_name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Fish Category
                </label>
                <select
                  required
                  value={selectedCategory}
                  onChange={(e) => { const next = e.target.value; setSelectedCategory(next); setQuantity(marketPrices.find((item) => item.name === next)?.unit === 'per kilo' ? 1 : 10000); }}
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
                    Quantity ({currentUnit === 'per kilo' ? 'kg' : 'pcs'})
                  </label>
                  {currentUnit === 'per kilo' ? (
                    <input type="number" min="0.001" step="0.001" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black" />
                  ) : (
                    <select value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white">
                      {[5000, 10000, 12000, 20000, 30000].map((amount) => <option key={amount} value={amount}>{amount.toLocaleString()} pcs</option>)}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    required
                    value={selectedPaymentMethod}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white"
                  >
                    {paymentMethods.map((pm) => (
                      <option key={pm.id} value={pm.name}>
                        {pm.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-neutral-50 rounded border border-neutral-200 text-xs space-y-1">
                <div className="flex justify-between text-neutral-600">
                  <span>Market Price ({currentUnit}):</span>
                  <span className="font-mono font-medium">₱{currentPricePerPiece.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Quantity:</span>
                  <span className="font-mono">{quantity.toLocaleString()} {currentUnit === 'per kilo' ? 'kg' : 'pcs'}</span>
                </div>
                <div className="flex justify-between text-neutral-900 font-bold pt-1 border-t border-neutral-200 text-sm">
                  <span>Calculated Total Price:</span>
                  <span className="font-mono">₱{calculatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Delivery Date</label>
                <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="w-full px-3 py-2 text-xs border border-neutral-300 rounded" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Invoice Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                  placeholder="Terms of delivery, payment arrangement..."
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-neutral-100">
                <span className="text-[11px] text-neutral-500">
                  Auto: Delivery dispatch created
                </span>
                <div className="flex gap-2">
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
                    Issue Invoice
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      <RecordDetails title="Invoice Details" record={viewRecord} onBack={() => setViewRecord(null)} />
    </div>
  );
};
