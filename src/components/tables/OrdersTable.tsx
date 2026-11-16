import { ExportDataButton } from '../common/ExportDataButton';
import { RecordDetails } from '../common/RecordDetails';
import React, { useState, useMemo } from 'react';
import { Plus, Search, FileText, CheckCircle2, Edit2, X, RotateCcw } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { Order } from '../../types/crm';
import { TablePagination } from '../common/TablePagination';
import { DateRangeFilter, isWithinDateRange } from './DateRangeFilter';

export const OrdersTable: React.FC = () => {
  const [viewRecord, setViewRecord] = useState<Record<string, unknown> | null>(null);
  const {
    orders,
    farmRegistries,
    contactPeople,
    agents,
    currentUser,
    marketPrices,
    addFarmRegistry,
    addContactPerson,
    addOrder,
    editOrder,
    createInvoice,
    invoices,
    orderStatuses,
  } = useCRM();

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [farmFilter, setFarmFilter] = useState('ALL');
  const [agentFilter, setAgentFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Add Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContactPerson, setSelectedContactPerson] = useState<string>(
    contactPeople[0]?.contact_person_name || ''
  );
  const [isNewContactMode, setIsNewContactMode] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [selectedFarmName, setSelectedFarmName] = useState<string>(
    farmRegistries[0]?.farm_name || ''
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(
    marketPrices[0]?.name || ''
  );
  const [quantity, setQuantity] = useState<number>(10000);
  const [unitPrice, setUnitPrice] = useState<number>(Number(marketPrices[0]?.price || 0));
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discount, setDiscount] = useState<number>(0);
  const [deliveryDate, setDeliveryDate] = useState<string>(
    new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [selectedAgent, setSelectedAgent] = useState<string>(agents[1]?.name || agents[0]?.name || '');
  const [notes, setNotes] = useState('');
  const [selectedOrderStatus, setSelectedOrderStatus] = useState('Pending');
  const [showFarmCreate, setShowFarmCreate] = useState(false);
  const [showContactCreate, setShowContactCreate] = useState(false);
  const [newFarm, setNewFarm] = useState({ farm_name: '', farm_address: '', farm_phone: '', farm_email: '', coordinates_lat_lng: '', designated_point_person: '' });
  const [newContact, setNewContact] = useState({ contact_person_name: '', phone_number: '', email_address: '', address: '' });

  // Edit Modal State (Make All Entries Editable)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editFarmName, setEditFarmName] = useState('');
  const [editContactPerson, setEditContactPerson] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editQuantity, setEditQuantity] = useState(10000);
  const [editUnitPrice, setEditUnitPrice] = useState(0);
  const [editDiscountEnabled, setEditDiscountEnabled] = useState(false);
  const [editDiscount, setEditDiscount] = useState(0);
  const [editDeliveryDate, setEditDeliveryDate] = useState('');
  const [editAgent, setEditAgent] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editOrderStatus, setEditOrderStatus] = useState('Pending');

  const [invoiceSuccessMsg, setInvoiceSuccessMsg] = useState<string | null>(null);

  const associatedFarmName = selectedFarmName;
  const selectedFarm = farmRegistries.find(f => f.farm_name === selectedFarmName);
  const selectedContact = contactPeople.find(c => c.contact_person_name === selectedContactPerson && c.farm_name === selectedFarmName);
  const selectedMarketPrice = marketPrices.find(p => p.name === selectedCategory);
  const categoryPrice = selectedMarketPrice?.price ?? 0;
  const isPerKilo = selectedMarketPrice?.unit === 'per kilo';
  const calculatedSubtotal = Number(((Number(quantity) || 0) * (Number(unitPrice) || 0)).toFixed(2));
  const calculatedDiscountAmount = discountEnabled ? Number((calculatedSubtotal * Math.min(100, Math.max(0, Number(discount) || 0)) / 100).toFixed(2)) : 0;
  const calculatedTotal = Math.max(0, Number((calculatedSubtotal - calculatedDiscountAmount).toFixed(2)));
  const editMarketPrice = marketPrices.find((item) => item.name === editCategory);
  const editIsPerKilo = editMarketPrice?.unit === 'per kilo';
  const editCalculatedSubtotal = Number(((Number(editQuantity) || 0) * (Number(editUnitPrice) || 0)).toFixed(2));
  const editCalculatedDiscountAmount = editDiscountEnabled ? Number((editCalculatedSubtotal * Math.min(100, Math.max(0, Number(editDiscount) || 0)) / 100).toFixed(2)) : 0;
  const editCalculatedTotal = Math.max(0, Number((editCalculatedSubtotal - editCalculatedDiscountAmount).toFixed(2)));

  const hasActiveFilters =
    searchTerm !== '' || farmFilter !== 'ALL' || agentFilter !== 'ALL' || categoryFilter !== 'ALL' || startDate !== '' || endDate !== '';

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setFarmFilter('ALL');
    setAgentFilter('ALL');
    setCategoryFilter('ALL');
    setCurrentPage(1);
  };

  // Filter & Paginate
  const filteredData = useMemo(() => {
    return orders.filter((ord) => {
      const matchesSearch =
        ord.farm_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ord.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ord.order_id.toString().includes(searchTerm) ||
        (ord.notes || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFarm = farmFilter === 'ALL' || ord.farm_name === farmFilter;
      const matchesAgent = agentFilter === 'ALL' || ord.booking_agent === agentFilter;
      const matchesCategory = categoryFilter === 'ALL' || ord.fish_category === categoryFilter;

      return matchesSearch && matchesFarm && matchesAgent && matchesCategory && isWithinDateRange(ord.order_date, startDate, endDate);
    });
  }, [orders, searchTerm, farmFilter, agentFilter, categoryFilter, startDate, endDate]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const finalContact = selectedContactPerson.trim();
    if (!finalContact || !selectedFarmName || !selectedCategory) return;
    if (discountEnabled && (!Number.isFinite(Number(discount)) || Number(discount) < 0 || Number(discount) > 100)) { alert('Discount must be between 0% and 100%.'); return; }
    addOrder({
      farm_name: associatedFarmName,
      contact_person: finalContact,
      fish_category: selectedCategory,
      quantity: Number(quantity) || 1,
      price: Number(unitPrice) || 0,
      price_unit: selectedMarketPrice?.unit || 'per piece',
      discount: calculatedDiscountAmount,
      discount_percent: discountEnabled ? Number(discount) || 0 : 0,
      discount_enabled: discountEnabled,
      total_price: calculatedTotal,
      delivery_date: deliveryDate,
      status: selectedOrderStatus,
      booking_agent: currentUser?.name || selectedAgent,
      notes: notes || '',
    });

    setIsModalOpen(false);
    setIsNewContactMode(false);
    setNewContactName('');
    setNotes('');
    setDiscountEnabled(false);
    setDiscount(0);
  };

  const handleOpenEdit = (ord: Order) => {
    setEditingOrder(ord);
    setEditFarmName(ord.farm_name);
    setEditContactPerson(ord.contact_person);
    setEditCategory(ord.fish_category);
    setEditQuantity(ord.quantity);
    setEditUnitPrice(Number(ord.price ?? marketPrices.find(p => p.name === ord.fish_category)?.price ?? 0));
    setEditDiscountEnabled(Boolean(ord.discount_enabled));
    const legacySubtotal = Number(((Number(ord.quantity) || 0) * (Number(ord.price ?? marketPrices.find(p => p.name === ord.fish_category)?.price ?? 0))).toFixed(2));
    setEditDiscount(Number(ord.discount_percent ?? (legacySubtotal > 0 ? (Number(ord.discount || 0) / legacySubtotal) * 100 : 0)));
    setEditDeliveryDate(ord.delivery_date);
    setEditAgent(ord.booking_agent);
    setEditNotes(ord.notes || '');
    setEditOrderStatus(ord.status || 'Pending');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    if (editDiscountEnabled && (!Number.isFinite(Number(editDiscount)) || Number(editDiscount) < 0 || Number(editDiscount) > 100)) { alert('Discount must be between 0% and 100%.'); return; }

    editOrder(editingOrder.order_id, {
      farm_name: editFarmName,
      contact_person: editContactPerson,
      fish_category: editCategory,
      quantity: Number(editQuantity),
      price: Number(editUnitPrice) || 0,
      price_unit: editMarketPrice?.unit || 'per piece',
      discount: editCalculatedDiscountAmount,
      discount_percent: editDiscountEnabled ? Number(editDiscount) || 0 : 0,
      discount_enabled: editDiscountEnabled,
      total_price: editCalculatedTotal,
      delivery_date: editDeliveryDate,
      status: editOrderStatus,
      booking_agent: editAgent,
      notes: editNotes,
    });

    setEditingOrder(null);
  };

  const handleQuickInvoice = (order: Order) => {
    const existing = invoices.find((inv) => inv.order_id === order.order_id);
    if (existing) {
      alert(`Invoice already exists for Order #${order.order_id} (${existing.official_receipt_id})`);
      return;
    }

    const officialReceiptId = window.prompt('Enter the required Official Receipt ID for this invoice:')?.trim();
    if (!officialReceiptId) return;
    if (invoices.some((inv) => (inv.official_receipt_id || '').trim().toLowerCase() === officialReceiptId.toLowerCase())) { alert('This Official Receipt ID is already in use.'); return; }
    createInvoice({
      official_receipt_id: officialReceiptId,
      order_id: order.order_id,
      farm_name: order.farm_name,
      contact_person_name: order.contact_person,
      fish_category: order.fish_category,
      quantity: order.quantity,
      unit_price: Number(order.price ?? marketPrices.find((m) => m.name === order.fish_category)?.price ?? 0),
      item_unit: order.price_unit ?? marketPrices.find((m) => m.name === order.fish_category)?.unit ?? 'per piece',
      discount: Number(order.discount || 0),
      discount_enabled: Boolean(order.discount_enabled),
      total_price: order.total_price,
      payment_method: 'Cash on Delivery',
      notes: `Invoice generated for Order #${order.order_id}`,
    });

    setInvoiceSuccessMsg(`Official Invoice & Delivery dispatched for Order #${order.order_id}!`);
    setTimeout(() => setInvoiceSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-4">
      {invoiceSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{invoiceSuccessMsg}</span>
        </div>
      )}

      {/* Header Controls with Rich Filter View */}
      <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search orders (farm name, contact, notes)..."
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
            value={farmFilter}
            onChange={(e) => {
              setFarmFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs border border-neutral-300 rounded px-2.5 py-1.5 bg-white text-neutral-800 focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="ALL">All Registered Farms</option>
            {farmRegistries.map((f) => (
              <option key={f.farm_id} value={f.farm_name}>
                {f.farm_name}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs border border-neutral-300 rounded px-2.5 py-1.5 bg-white text-neutral-800 focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="ALL">All Fish Categories</option>
            {marketPrices.map((cat) => (
              <option key={cat.market_price_id} value={cat.name}>
                {cat.name}
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
            <option value="ALL">All Booking Agents</option>
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

          <button
            onClick={() => { const farm = farmRegistries[0]?.farm_name || ''; setSelectedFarmName(farm); setUnitPrice(Number(marketPrices.find(p => p.name === selectedCategory)?.price || 0)); setDiscountEnabled(false); setDiscount(0); setSelectedContactPerson(contactPeople.find(c => c.farm_name === farm && c.is_active === 'yes')?.contact_person_name || ''); setIsModalOpen(true); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-neutral-800 text-white rounded text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Order</span>
          </button>
        </div>
      </div>

            <div className="flex justify-end"><ExportDataButton tableKey="orders" tableLabel="Orders" rows={filteredData as unknown as Record<string, unknown>[]} /></div>

{/* Table Display */}
      <div className="bg-white rounded-lg border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Opp Ref</th>
                <th className="py-3 px-4">Farm Name</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Fish Category</th>
                <th className="py-3 px-4">Quantity</th><th className="py-3 px-4 text-right">Total Price</th>
                <th className="py-3 px-4">Order Date</th>
                <th className="py-3 px-4">Target Delivery</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Booking Agent</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-neutral-400">
                    No orders found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedData.map((order) => {
                  const hasInvoice = invoices.some((inv) => inv.order_id === order.order_id);
                  return (
                    <tr key={order.order_id} className="hover:bg-neutral-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                        #{order.order_id}
                      </td>
                      <td className="py-3 px-4 font-mono text-neutral-500 text-[11px]">
                        {order.opportunity_id ? `#${order.opportunity_id}` : 'Direct'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-neutral-900">
                        {order.farm_name}
                      </td>
                      <td className="py-3 px-4 text-neutral-700">{order.contact_person}</td>
                      <td className="py-3 px-4 max-w-[180px] truncate" title={order.fish_category}>
                        {order.fish_category}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium">
                        {order.quantity.toLocaleString()} {(order.price_unit ?? marketPrices.find(p => p.name === order.fish_category)?.unit) === 'per kilo' ? 'kg' : 'pcs'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">{Number(order.total_price ?? Math.max(0, order.quantity * (order.price || 0) - (order.discount || 0))).toLocaleString(undefined,{style:'currency',currency:'PHP'})}</td>
                      <td className="py-3 px-4 text-neutral-500 text-[11px]">
                        {new Date(order.order_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-neutral-700 font-medium whitespace-nowrap">
                        {order.delivery_date}
                      </td>
                      <td className="py-3 px-4 text-neutral-700">{order.status || 'Pending'}</td>
                      <td className="py-3 px-4 text-neutral-600">{order.booking_agent}</td>
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                        <button type="button" onClick={() => setViewRecord(order as unknown as Record<string, unknown>)} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition">View</button>
                          <button
                          onClick={() => handleOpenEdit(order)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-neutral-700 hover:text-white bg-neutral-100 hover:bg-neutral-900 rounded border border-neutral-300 transition cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        {hasInvoice ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Invoiced</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleQuickInvoice(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-neutral-700 bg-neutral-100 hover:bg-black hover:text-white rounded border border-neutral-300 transition cursor-pointer"
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

      {/* Modal: Edit Order (Make All Entries Editable) */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-neutral-200 max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <h3 className="font-semibold text-sm text-neutral-900">
                Edit Order #{editingOrder.order_id}
              </h3>
              <button
                onClick={() => setEditingOrder(null)}
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
                  Contact Person
                </label>
                <select value={editContactPerson} onChange={(e) => setEditContactPerson(e.target.value)} required className="w-full px-3 py-2 text-xs border border-neutral-300 rounded bg-white">
                  {contactPeople.filter((c) => c.farm_name === editFarmName && c.is_active === 'yes').map((c) => <option key={c.contact_id} value={c.contact_person_name}>{c.contact_person_name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Fish Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => { const next = e.target.value; setEditCategory(next); setEditUnitPrice(Number(marketPrices.find(p => p.name === next)?.price || 0)); }}
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
                    Quantity ({marketPrices.find((item) => item.name === editCategory)?.unit === 'per kilo' ? 'kg' : 'pcs'})
                  </label>
                  <input
                    type="number"
                    min={editIsPerKilo ? '0.001' : '1'}
                    step={editIsPerKilo ? '0.001' : '1'}
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Target Delivery Date
                  </label>
                  <input
                    type="date"
                    value={editDeliveryDate}
                    onChange={(e) => setEditDeliveryDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <label className="text-xs font-medium text-neutral-700">Subtotal<input readOnly value={editCalculatedSubtotal.toLocaleString(undefined,{style:'currency',currency:'PHP'})} className="mt-1 w-full px-3 py-2 text-xs border rounded bg-neutral-50" /></label>
                <label className="text-xs font-medium text-neutral-700">Price per unit ({editMarketPrice?.unit || 'per piece'})
                  <input type="number" min="0" step="0.01" value={editUnitPrice} readOnly={!editIsPerKilo} onChange={e=>setEditUnitPrice(Number(e.target.value))} className={`mt-1 w-full px-3 py-2 text-xs border border-neutral-300 rounded ${editIsPerKilo ? 'bg-white' : 'bg-neutral-100'}`} />
                  {editIsPerKilo && <span className="text-[10px] text-neutral-500">Editable for per-kilo items</span>}
                </label>
                <div className="text-xs">
                  <label className="flex items-center gap-2 font-medium text-neutral-700"><input type="checkbox" checked={editDiscountEnabled} onChange={e=>setEditDiscountEnabled(e.target.checked)} /> Enable discount</label>
                  <input type="number" min="0" max="100" step="0.01" disabled={!editDiscountEnabled} value={editDiscount} onChange={e=>setEditDiscount(Number(e.target.value))} placeholder="Discount (%)" className="mt-1 w-full px-3 py-2 text-xs border border-neutral-300 rounded disabled:bg-neutral-100" />
                  <div className="mt-1 text-[10px] text-neutral-500">Discount amount: ₱{editCalculatedDiscountAmount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                </div>
                <label className="text-xs font-medium text-neutral-700">Total Price
                  <input readOnly value={editCalculatedTotal.toLocaleString(undefined,{style:'currency',currency:'PHP'})} className="mt-1 w-full px-3 py-2 text-xs border rounded bg-neutral-50 font-semibold" />
                </label>
              </div>

              <div><label className="block text-xs font-medium text-neutral-700 mb-1">Order Status</label><select value={editOrderStatus} onChange={e => setEditOrderStatus(e.target.value)} className="w-full px-3 py-2 text-xs border border-neutral-300 rounded bg-white">{orderStatuses.map(st => <option key={st.id} value={st.name}>{st.name}</option>)}</select></div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Booking Agent
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
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Order Notes
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
                  onClick={() => setEditingOrder(null)}
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

      {/* Modal: Create New Order */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3">
          <div className="bg-white rounded-lg shadow-2xl border max-w-3xl w-full max-h-[94vh] overflow-y-auto">
            <div className="px-5 py-4 border-b flex items-center justify-between bg-neutral-50 sticky top-0 z-10"><div><h3 className="font-semibold text-sm">Create Order</h3><p className="text-[11px] text-neutral-500">Standard order form</p></div><button type="button" onClick={()=>setIsModalOpen(false)} className="text-xs">Close</button></div>
            <form onSubmit={handleCreateOrder} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs">Date / Timestamp<input readOnly value={new Date().toLocaleString()} className="mt-1 w-full border rounded px-3 py-2 bg-neutral-50"/></label>
                <label className="text-xs">Recorded By<input readOnly value={currentUser?.name || ''} className="mt-1 w-full border rounded px-3 py-2 bg-neutral-50"/></label>
              </div>
              <div><label className="text-xs font-medium">Farm Name</label><select required value={selectedFarmName} onChange={e=>{setSelectedFarmName(e.target.value);const c=contactPeople.find(x=>x.farm_name===e.target.value&&x.is_active==='yes');setSelectedContactPerson(c?.contact_person_name||'');}} className="mt-1 w-full border rounded px-3 py-2 text-xs bg-white"><option value="">Select farm</option>{farmRegistries.map(f=><option key={f.farm_id} value={f.farm_name}>{f.farm_name}</option>)}</select><button type="button" onClick={()=>setShowFarmCreate(true)} className="mt-1 text-[11px] text-blue-600">+ Create new farm</button></div>
              <div><label className="text-xs font-medium">Contact Person</label><select required value={selectedContactPerson} onChange={e=>{setSelectedContactPerson(e.target.value);const c=contactPeople.find(x=>x.contact_person_name===e.target.value);if(c)setSelectedFarmName(c.farm_name);}} className="mt-1 w-full border rounded px-3 py-2 text-xs bg-white"><option value="">Select contact person</option>{contactPeople.filter(c=>c.is_active==='yes'&&(!selectedFarmName||c.farm_name===selectedFarmName)).map(c=><option key={c.contact_id} value={c.contact_person_name}>{c.contact_person_name}</option>)}</select><button type="button" onClick={()=>setShowContactCreate(true)} className="mt-1 text-[11px] text-blue-600">+ Create new contact person</button></div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs">Farm Address<textarea readOnly rows={2} value={selectedFarm?.farm_address||''} className="mt-1 w-full border rounded px-3 py-2 bg-neutral-50"/></label>
                <label className="text-xs">Farm Contact Number<input readOnly value={selectedFarm?.farm_phone||''} className="mt-1 w-full border rounded px-3 py-2 bg-neutral-50"/></label>
                <label className="text-xs">Farm Email<input readOnly value={selectedFarm?.farm_email||''} className="mt-1 w-full border rounded px-3 py-2 bg-neutral-50"/></label>
                <label className="text-xs">Contact Person Address<textarea readOnly rows={2} value={selectedContact?.address||''} className="mt-1 w-full border rounded px-3 py-2 bg-neutral-50"/></label>
                <label className="text-xs">Contact Person Contact Number<input readOnly value={selectedContact?.phone_number||''} className="mt-1 w-full border rounded px-3 py-2 bg-neutral-50"/></label>
                <label className="text-xs">Contact Person Email<input readOnly value={selectedContact?.email_address||''} className="mt-1 w-full border rounded px-3 py-2 bg-neutral-50"/></label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs">Quantity ({marketPrices.find((item) => item.name === selectedCategory)?.unit === 'per kilo' ? 'kg' : 'pcs'})<input type="number" min={isPerKilo ? '0.001' : '1'} step={isPerKilo ? '0.001' : '1'} required value={quantity} onChange={e=>setQuantity(Number(e.target.value))} className="mt-1 w-full border rounded px-3 py-2"/></label>
                <label className="text-xs">Category<select required value={selectedCategory} onChange={e=>{const next=e.target.value;setSelectedCategory(next);setUnitPrice(Number(marketPrices.find(item=>item.name===next)?.price || 0));setQuantity(marketPrices.find(item=>item.name===next)?.unit==='per kilo'?1:10000);}} className="mt-1 w-full border rounded px-3 py-2 bg-white"><option value="">Select category</option>{marketPrices.map(c=><option key={c.market_price_id} value={c.name}>{c.name}</option>)}</select></label>
                <label className="text-xs">Price per unit ({selectedMarketPrice?.unit || 'per piece'})<input type="number" min="0" step="0.01" readOnly={!isPerKilo} value={unitPrice} onChange={e=>setUnitPrice(Number(e.target.value))} className={`mt-1 w-full border rounded px-3 py-2 ${isPerKilo ? 'bg-white' : 'bg-neutral-50'}`}/>{isPerKilo && <span className="text-[10px] text-neutral-500">Editable for per-kilo items</span>}</label>
                <label className="text-xs">Delivery Date<input type="date" required value={deliveryDate} onChange={e=>setDeliveryDate(e.target.value)} lang="en-CA" placeholder="yyyy-mm-dd" className="mt-1 w-full border rounded px-3 py-2"/></label>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <label className="text-xs">Subtotal<input readOnly value={calculatedSubtotal.toLocaleString(undefined,{style:'currency',currency:'PHP'})} className="mt-1 w-full border rounded px-3 py-2 bg-neutral-50" /></label>
                <div className="text-xs">
                  <label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={discountEnabled} onChange={e=>setDiscountEnabled(e.target.checked)} /> Enable discount</label>
                  <input type="number" min="0" max="100" step="0.01" disabled={!discountEnabled} value={discount} onChange={e=>setDiscount(Number(e.target.value))} placeholder="Discount (%)" className="mt-1 w-full border rounded px-3 py-2 disabled:bg-neutral-100"/>
                  <div className="mt-1 text-[10px] text-neutral-500">Discount amount: ₱{calculatedDiscountAmount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                </div>
                <label className="text-xs font-medium">Total Price<input readOnly value={calculatedTotal.toLocaleString(undefined,{style:'currency',currency:'PHP'})} className="mt-1 w-full border rounded px-3 py-2 bg-neutral-50 font-semibold"/></label>
              </div>
              <label className="block text-xs">Notes<textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} className="mt-1 w-full border rounded px-3 py-2"/></label>
              <div><label className="text-xs">Order Status<select value={selectedOrderStatus} onChange={e=>setSelectedOrderStatus(e.target.value)} className="mt-1 w-full border rounded px-3 py-2 bg-white">{orderStatuses.map(st=><option key={st.id} value={st.name}>{st.name}</option>)}</select></label></div>
              <div className="flex justify-end gap-2 border-t pt-3"><button type="button" onClick={()=>setIsModalOpen(false)} className="px-3 py-2 border rounded text-xs">Cancel</button><button type="submit" className="px-4 py-2 bg-black text-white rounded text-xs font-semibold">Create Order</button></div>
            </form>
          </div>
        </div>
      )}
      {showFarmCreate && <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"><form onSubmit={e=>{e.preventDefault();addFarmRegistry({...newFarm,assigned_agent:currentUser?.name||''});setSelectedFarmName(newFarm.farm_name);setSelectedContactPerson('');setNewFarm({farm_name:'',farm_address:'',farm_phone:'',farm_email:'',coordinates_lat_lng:'',designated_point_person:''});setShowFarmCreate(false);}} className="bg-white rounded-lg p-5 w-full max-w-lg space-y-3"><h3 className="font-semibold text-sm">Create New Farm</h3>{[['farm_name','Farm Name'],['farm_address','Farm Address'],['farm_phone','Farm Contact Number'],['farm_email','Farm Email'],['coordinates_lat_lng','GPS Coordinates'],['designated_point_person','Designated Point Person']].map(([k,l])=><label key={k} className="block text-xs">{l}<input required={['farm_name','farm_address','farm_phone'].includes(k)} value={(newFarm as any)[k]} onChange={e=>setNewFarm(p=>({...p,[k]:e.target.value}))} className="mt-1 w-full border rounded px-3 py-2"/></label>)}<div className="flex justify-end gap-2"><button type="button" onClick={()=>setShowFarmCreate(false)} className="border rounded px-3 py-2 text-xs">Cancel</button><button className="bg-black text-white rounded px-3 py-2 text-xs">Save Farm</button></div></form></div>}
      {showContactCreate && <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"><form onSubmit={e=>{e.preventDefault();addContactPerson({contact_person_name:newContact.contact_person_name,farm_name:selectedFarmName,is_point_person:'no',phone_number:newContact.phone_number,email_address:newContact.email_address,address:newContact.address,is_active:'yes',assigned_agent:currentUser?.name||''});setSelectedContactPerson(newContact.contact_person_name);setNewContact({contact_person_name:'',phone_number:'',email_address:'',address:''});setShowContactCreate(false);}} className="bg-white rounded-lg p-5 w-full max-w-lg space-y-3"><h3 className="font-semibold text-sm">Create New Contact Person</h3><p className="text-xs text-neutral-500">Farm: {selectedFarmName || 'Select a farm first'}</p>{[['contact_person_name','Full Name'],['phone_number','Contact Number'],['email_address','Email'],['address','Address']].map(([k,l])=><label key={k} className="block text-xs">{l}<input required={['contact_person_name','phone_number'].includes(k)} value={(newContact as any)[k]} onChange={e=>setNewContact(p=>({...p,[k]:e.target.value}))} className="mt-1 w-full border rounded px-3 py-2"/></label>)}<div className="flex justify-end gap-2"><button type="button" onClick={()=>setShowContactCreate(false)} className="border rounded px-3 py-2 text-xs">Cancel</button><button disabled={!selectedFarmName} className="bg-black text-white rounded px-3 py-2 text-xs disabled:opacity-40">Save Contact</button></div></form></div>}

      <RecordDetails title="Order Details" record={viewRecord} onBack={() => setViewRecord(null)} />
    </div>
  );
};
