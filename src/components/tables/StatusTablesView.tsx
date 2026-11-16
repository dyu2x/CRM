import { ExportDataButton } from '../common/ExportDataButton';
import React, { useState } from 'react';
import {
  ListFilter,
  Plus,
  Edit3,
  Search,
  Save,
  X,
  ShieldCheck,
  Tag,
  PhilippinePeso,
  PhoneCall,
  Truck,
  CreditCard,
  Target,
  CheckCircle2,
  Trash2,
  RotateCcw,
  Shield,
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { LookupItem, MarketPrice, StatusTableKey } from '../../types/crm';
import { TablePagination } from '../common/TablePagination';
import { OnlineInquirySourcesView } from './OnlineInquirySourcesView';

type ActiveStatusTab = StatusTableKey | 'market_price' | 'online_inquiry_sources';

interface TabDefinition {
  key: ActiveStatusTab;
  label: string;
  icon: React.ReactNode;
  dbTable: string;
  description: string;
}

const statusTabs: TabDefinition[] = [
  { key: 'online_inquiry_sources', label: 'Inquiry Sources', icon: <ListFilter className="w-4 h-4" />, dbTable: 'online_inquiry_sources', description: 'Approved channels for incoming online inquiries' },
  {
    key: 'opportunity_statuses',
    label: 'Opportunity Statuses',
    icon: <Target className="w-4 h-4" />,
    dbTable: 'opportunity_statuses',
    description: 'Pipeline stages for sales opportunities (Accepted, Pending, Negotiating, Cancelled)',
  },
  {
    key: 'fu_orders_statuses',
    label: 'Follow-Up Statuses',
    icon: <PhoneCall className="w-4 h-4" />,
    dbTable: 'fu_orders_statuses',
    description: 'Stages for verification and customer follow-up calls',
  },
  {
    key: 'fu_orders_method',
    label: 'Follow-Up Methods',
    icon: <PhoneCall className="w-4 h-4" />,
    dbTable: 'fu_orders_method',
    description: 'Communication channels used for customer follow-up and verification',
  },
  {
    key: 'delivery_statuses',
    label: 'Delivery Statuses',
    icon: <Truck className="w-4 h-4" />,
    dbTable: 'delivery_statuses',
    description: 'Logistics progress from dispatch to final pond delivery',
  },
  {
    key: 'payment_statuses',
    label: 'Payment Statuses',
    icon: <CreditCard className="w-4 h-4" />,
    dbTable: 'payment_statuses',
    description: 'Financial settlement states (Pending, Paid in Full, Partial)',
  },
  { key: 'order_statuses', label: 'Order Statuses', icon: <CheckCircle2 className="w-4 h-4" />, dbTable: 'order_statuses', description: 'Lifecycle stages assigned to customer orders' },
  {
    key: 'payment_methods',
    label: 'Payment Methods',
    icon: <PhilippinePeso className="w-4 h-4 transition-transform duration-200 hover:-translate-y-0.5 hover:scale-110" />,
    dbTable: 'payment_methods',
    description: 'Authorized collection channels (COD, Bank Transfer, GCash, Check)',
  },
  {
    key: 'market_price',
    label: 'Market Prices',
    icon: <Tag className="w-4 h-4" />,
    dbTable: 'market_price',
    description: 'Fish market benchmark prices with per-piece or per-kilo units',
  },
];

export const StatusTablesView: React.FC = () => {
  const {
    currentUser,
    opportunityStatuses,
    followUpStatuses,
    followUpMethods,
    deliveryStatuses,
    paymentStatuses,
    paymentMethods,
    orderStatuses,
    marketPrices,
    editStatusItem,
    addStatusItem,
    deleteStatusItem,
    editMarketPriceItem,
    addMarketPriceItem,
    rolePermissions,
    agents,
    updateRolePermissions,
    removeRole,
  } = useCRM();

  const [activeTab, setActiveTab] = useState<ActiveStatusTab>('opportunity_statuses');
  const [showRoles, setShowRoles] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LookupItem | null>(null);
  const [editingMarketPrice, setEditingMarketPrice] = useState<MarketPrice | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    unit: 'per piece' as 'per piece' | 'per kilo',
    notes: '',
  });

  if (showRoles) {
    const roles = Object.keys(rolePermissions).sort((a, b) => a.localeCompare(b));
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-900 p-4 text-white">
          <div><div className="flex items-center gap-2 text-sm font-bold"><Shield className="h-4 w-4"/> Roles</div><p className="mt-1 text-xs text-neutral-300">Manage assignable roles. Configure page and table restrictions in Admin Settings.</p></div>
          <button onClick={() => setShowRoles(false)} className="rounded border border-neutral-600 px-3 py-2 text-xs hover:bg-neutral-800">Back to Status &amp; Lookup</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); const name = newRoleName.trim(); if (!name || roles.some(r => r.toLowerCase() === name.toLowerCase())) return; updateRolePermissions(name, ['dashboard']); setNewRoleName(''); }} className="flex flex-wrap gap-2 rounded-lg border border-neutral-200 bg-white p-4">
          <input value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="New role name" className="min-w-56 flex-1 rounded border border-neutral-300 px-3 py-2 text-xs" />
          <button type="submit" disabled={!newRoleName.trim()} className="rounded bg-neutral-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">Add Role</button>
        </form>
        <div className="flex justify-end"><ExportDataButton tableKey="roles" tableLabel="CRM Roles" rows={roles.map((role) => ({ name: role, description: ({ 'Admin': 'Full CRM administration access', 'Booking Agent': 'Booking and inquiry management', 'Delivery Agent': 'Delivery and fulfillment operations', 'Sales Agent': 'Sales and customer management' } as Record<string, string>)[role] || 'Custom CRM role', assigned_users: agents.filter((agent) => agent.role === role).length }))} /></div>
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-xs"><thead className="bg-neutral-50 text-neutral-600"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Assigned users</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-neutral-100">{roles.map((role) => <tr key={role}><td className="px-4 py-3 font-semibold">{role}</td><td className="px-4 py-3 text-neutral-500">{({ 'Admin': 'Full CRM administration access', 'Booking Agent': 'Booking and inquiry management', 'Delivery Agent': 'Delivery and fulfillment operations', 'Sales Agent': 'Sales and customer management' } as Record<string, string>)[role] || 'Custom CRM role'}</td><td className="px-4 py-3">{agents.filter(a => a.role === role).length}</td><td className="px-4 py-3 text-right"><button disabled={role === 'Admin' || agents.some(a => a.role === role)} onClick={() => { if (window.confirm(`Delete role ${role}?`)) removeRole(role); }} className="rounded border border-red-200 px-2.5 py-1.5 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30">Delete</button></td></tr>)}</tbody>
          </table>
        </div>
      </div>
    );
  }

  const activeDef = statusTabs.find((t) => t.key === activeTab) || statusTabs[0];

  const handleTabChange = (key: ActiveStatusTab) => {
    setActiveTab(key);
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Retrieve current data array based on activeTab
  const getCurrentData = (): (LookupItem | MarketPrice)[] => {
    switch (activeTab) {
      case 'opportunity_statuses':
        return opportunityStatuses;
      case 'fu_orders_statuses':
        return followUpStatuses;
      case 'fu_orders_method':
        return followUpMethods;
      case 'delivery_statuses':
        return deliveryStatuses;
      case 'payment_statuses':
        return paymentStatuses;
      case 'order_statuses':
        return orderStatuses;
      case 'payment_methods':
        return paymentMethods;
      case 'market_price':
        return marketPrices;
      default:
        return [];
    }
  };

  const rawData = getCurrentData();

  // Filter
  const filteredData = rawData.filter((item) => {
    const q = searchTerm.toLowerCase();
    const nameMatch = item.name.toLowerCase().includes(q);
    const descMatch =
      'description' in item && item.description
        ? item.description.toLowerCase().includes(q)
        : 'notes' in item && item.notes
        ? item.notes.toLowerCase().includes(q)
        : false;
    return nameMatch || descMatch;
  });

  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const openAddModal = () => {
    setFormData({ name: '', description: '', price: 0, unit: 'per piece', notes: '' });
    setIsAddModalOpen(true);
  };

  const openEditModal = (item: LookupItem | MarketPrice) => {
    if (activeTab === 'market_price') {
      const mp = item as MarketPrice;
      setEditingMarketPrice(mp);
      setFormData({
        name: mp.name,
        description: mp.description || '',
        price: mp.price,
        unit: mp.unit || 'per piece',
        notes: mp.notes || '',
      });
    } else {
      const lookup = item as LookupItem;
      setEditingItem(lookup);
      setFormData({
        name: lookup.name,
        description: lookup.description || '',
        price: 0,
        unit: 'per piece',
        notes: '',
      });
    }
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab !== 'market_price' && !formData.name.trim()) return;

    if (activeTab === 'market_price') {
      if (!formData.name.trim() || formData.price < 0) return;
      addMarketPriceItem(formData.name.trim(), formData.price, formData.unit, formData.notes.trim(), formData.description.trim());
      setIsAddModalOpen(false);
      return;
    }

    addStatusItem(activeTab as StatusTableKey, formData.name.trim(), formData.description.trim());
    setIsAddModalOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'market_price' && editingMarketPrice) {
      editMarketPriceItem(
        editingMarketPrice.market_price_id,
        formData.price,
        formData.unit,
        formData.notes,
        formData.name.trim(),
        formData.description.trim()
      );
      setEditingMarketPrice(null);
      return;
    }

    if (editingItem && activeTab !== 'market_price') {
      editStatusItem(
        activeTab as StatusTableKey,
        editingItem.id,
        formData.name.trim(),
        formData.description.trim()
      );
      setEditingItem(null);
    }
  };

  const handleDelete = (id: number) => {
    if (activeTab === 'market_price') return;
    if (confirm('Are you sure you want to delete this status entry?')) {
      deleteStatusItem(activeTab as StatusTableKey, id);
    }
  };

  if (activeTab === 'online_inquiry_sources') {
    return (
      <div className="space-y-5">
        <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-sm font-semibold text-neutral-900">Status &amp; Lookup</h2><p className="mt-1 text-xs text-neutral-500">Manage approved inquiry channels and CRM dropdown options.</p></div>
          <select aria-label="Lookup category" value={activeTab} onChange={(e) => handleTabChange(e.target.value as ActiveStatusTab)} className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900">
            {statusTabs.map(tab => <option key={tab.key} value={tab.key}>{tab.label}</option>)}
          </select>
        </div>
        <OnlineInquirySourcesView />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end"><ExportDataButton tableKey="status_tables" tableLabel="Status & Lookup" rows={filteredData as unknown as Record<string, unknown>[]}/></div>
      {/* Admin Security Banner */}
      <div className="bg-neutral-900 text-white p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-neutral-800 rounded-md text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight flex items-center gap-2">
              <span>Admin Status &amp; Lookup Master Tables</span>
              <span className="text-[10px] font-mono bg-neutral-800 px-2 py-0.5 rounded text-neutral-300">
                Authorized Role: {currentUser?.role || 'Admin'}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Live schema-driven lookup tables. Edits update dropdown choices across all CRM modules and auto-log to the histories audit trail.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUser?.role === 'Admin' && <button onClick={() => setShowRoles(true)} className="flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"><Shield className="h-4 w-4"/>Roles</button>}
          { (
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-black hover:bg-neutral-100 text-xs font-semibold rounded-md shadow-xs transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{activeTab === 'market_price' ? 'Add Market Price' : 'Add Status Option'}</span>
          </button>
          )}
        </div>
      </div>

      {/* Lookup section selector */}
      <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-neutral-800">Lookup menu</div>
          <p className="text-[11px] text-neutral-500 mt-0.5">Choose which status or lookup list to manage.</p>
        </div>
        <label className="flex items-center gap-2 text-xs">
          <span className="text-neutral-500">Section</span>
          <select value={activeTab} onChange={(e) => handleTabChange(e.target.value as ActiveStatusTab)} className="bg-white text-neutral-900 border border-neutral-300 rounded-md px-3 py-2 min-w-56 focus:outline-none focus:ring-1 focus:ring-black">
            {statusTabs.map(tab => <option key={tab.key} value={tab.key}>{tab.label}</option>)}
          </select>
        </label>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={`Search ${activeDef.label}...`}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>

        <div className="flex items-center gap-2">
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-neutral-600 hover:text-black border border-neutral-200 rounded hover:bg-neutral-50 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}

        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-lg border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                <th className="py-3 px-4 w-20">ID</th>
                <th className="py-3 px-4">Status / Option Name</th>
                {activeTab === 'market_price' ? (
                  <>
                    <th className="py-3 px-4">Market Price</th>
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4">Pricing Notes</th>
                  </>
                ) : (
                  <th className="py-3 px-4">Workflow Behavior &amp; Description</th>
                )}
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'market_price' ? 6 : 4} className="py-8 text-center text-neutral-400">
                    No status options found for this criteria.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => {
                  const id = 'id' in item ? item.id : item.market_price_id;
                  const isMarket = activeTab === 'market_price';
                  const mp = isMarket ? (item as MarketPrice) : null;
                  const lookup = !isMarket ? (item as LookupItem) : null;

                  return (
                    <tr key={id} className="hover:bg-neutral-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                        #{id}
                      </td>
                      <td className="py-3 px-4 font-semibold text-neutral-900 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-neutral-900" />
                        <span>{item.name}</span>
                      </td>
                      {isMarket && mp ? (
                        <>
                          <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                            ₱{Number(mp.price).toFixed(2)}
                          </td>
                          <td className="py-3 px-4">{mp.unit || 'per piece'}</td>
                          <td className="py-3 px-4 text-neutral-600 text-xs max-w-xs">
                            {mp.notes || 'Standard benchmark'}
                          </td>
                        </>
                      ) : (
                        <td className="py-3 px-4 text-neutral-600 max-w-md">
                          {lookup?.description || 'No system description provided.'}
                        </td>
                      )}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => openEditModal(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-neutral-700 hover:text-black bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded transition cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          {!isMarket && (
                            <button
                              onClick={() => handleDelete(id)}
                              className="inline-flex items-center p-1 text-[11px] text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                              title="Delete status entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
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

      {/* Edit Status Modal */}
      {(editingItem || editingMarketPrice) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h3 className="font-bold text-sm text-neutral-900">
                  Edit {activeDef.label} Entry
                </h3>
                <p className="text-xs text-neutral-500">Update the selected lookup entry.</p>
              </div>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setEditingMarketPrice(null);
                }}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {activeTab !== 'market_price' && <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Status / Option Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>}

              {activeTab === 'market_price' ? (
                <>
                  <div><label className="block text-neutral-700 font-semibold mb-1">Market Item Name</label><input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black" /></div>
                  <div><label className="block text-neutral-700 font-semibold mb-1">Market Price (₱)</label><input type="number" step="0.01" min="0" required value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-neutral-300 rounded font-mono font-bold focus:outline-none focus:ring-1 focus:ring-black" /></div>
                  <div><label className="block text-neutral-700 font-semibold mb-1">Unit</label><select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value as 'per piece' | 'per kilo' })} className="w-full px-3 py-2 border border-neutral-300 rounded bg-white"><option value="per piece">per piece</option><option value="per kilo">per kilo</option></select></div>
                  <div><label className="block text-neutral-700 font-semibold mb-1">Description</label><textarea rows={2} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-neutral-300 rounded" /></div>
                  <div><label className="block text-neutral-700 font-semibold mb-1">Pricing Notes</label><input type="text" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black" /></div>
                </>
              ) : (
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    Behavior &amp; Description
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                    placeholder="Describe how this status behaves in automated workflows..."
                  />
                </div>
              )}

              <div className="pt-3 border-t border-neutral-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setEditingMarketPrice(null);
                  }}
                  className="px-4 py-2 border border-neutral-300 rounded text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-black text-white rounded hover:bg-neutral-800 cursor-pointer font-medium"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Status Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h3 className="font-bold text-sm text-neutral-900">
                  Add New {activeDef.label} Option
                </h3>
                <p className="text-xs text-neutral-500">Update the selected lookup entry.</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-4 text-xs">
              {activeTab !== 'market_price' && <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Option Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Under Expedited Review"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>}

              {activeTab === 'market_price' ? (
                <>
                  <div><label className="block text-neutral-700 font-semibold mb-1">Market Item Name</label><input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-neutral-300 rounded" /></div>
                  <div><label className="block text-neutral-700 font-semibold mb-1">Market Price (₱)</label><input type="number" min="0" step="0.01" required value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} className="w-full px-3 py-2 border border-neutral-300 rounded" /></div>
                  <div><label className="block text-neutral-700 font-semibold mb-1">Unit</label><select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value as 'per piece' | 'per kilo' })} className="w-full px-3 py-2 border border-neutral-300 rounded bg-white"><option value="per piece">per piece</option><option value="per kilo">per kilo</option></select></div>
                  <div><label className="block text-neutral-700 font-semibold mb-1">Description</label><textarea rows={2} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-neutral-300 rounded" /></div>
                  <div><label className="block text-neutral-700 font-semibold mb-1">Pricing Notes</label><textarea rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 border border-neutral-300 rounded" /></div>
                </>
              ) : (
                <div><label className="block text-neutral-700 font-semibold mb-1">Description / Workflow Note</label><textarea rows={3} placeholder="Explain when this status should be used..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black" /></div>
              )}

              <div className="pt-3 border-t border-neutral-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 rounded text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-black text-white rounded hover:bg-neutral-800 cursor-pointer font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {activeTab === 'market_price' ? 'Add Market Price' : 'Add to Master Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
