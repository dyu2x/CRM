import { ExportDataButton } from '../common/ExportDataButton';
import { RecordDetails } from '../common/RecordDetails';
import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, Edit2, X, CheckCircle2, RotateCcw } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { Opportunity } from '../../types/crm';
import { TablePagination } from '../common/TablePagination';
import { DateRangeFilter, isWithinDateRange } from './DateRangeFilter';

export const OpportunitiesTable: React.FC = () => {
  const [viewRecord, setViewRecord] = useState<Record<string, unknown> | null>(null);
  const {
    opportunities,
    contactPeople,
    marketPrices,
    agents,
    opportunityStatuses,
    addOpportunity,
    editOpportunity,
  } = useCRM();

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [agentFilter, setAgentFilter] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Add Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<number>(
    contactPeople[0]?.contact_id || 0
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(
    marketPrices[0]?.name || ''
  );
  const [selectedQuantity, setSelectedQuantity] = useState<number>(marketPrices[0]?.unit === 'per kilo' ? 1 : 5000);
  const [customQuantity, setCustomQuantity] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<Opportunity['status']>('Pending/Undecided');
  const [selectedAgent, setSelectedAgent] = useState<string>(agents[0]?.name || '');
  const [notes, setNotes] = useState('');
  const [selectedSource, setSelectedSource] = useState<NonNullable<Opportunity['source']>>('Phone');

  // Edit Modal State
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);
  const [editContactPerson, setEditContactPerson] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editQuantity, setEditQuantity] = useState(5000);
  const [editStatus, setEditStatus] = useState<Opportunity['status']>('Pending/Undecided');
  const [editAgent, setEditAgent] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSource, setEditSource] = useState<NonNullable<Opportunity['source']>>('Phone');

  const currentSelectedContact = useMemo(() => {
    return contactPeople.find((c) => c.contact_id === Number(selectedContactId)) || contactPeople[0];
  }, [contactPeople, selectedContactId]);

  const hasActiveFilters =
    searchTerm !== '' ||
    statusFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    agentFilter !== 'ALL' ||
    startDate !== '' || endDate !== '';

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setAgentFilter('ALL');
    setCurrentPage(1);
  };

  // Filtered & Paginated records
  const filteredData = useMemo(() => {
    return opportunities.filter((opp) => {
      const matchesSearch =
        opp.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.phone.includes(searchTerm) ||
        (opp.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.opportunity_id.toString().includes(searchTerm);

      const matchesStatus = statusFilter === 'ALL' || opp.status === statusFilter;
      const matchesCategory = categoryFilter === 'ALL' || opp.fish_category === categoryFilter;
      const matchesAgent = agentFilter === 'ALL' || opp.contacted_by === agentFilter;

      return matchesSearch && matchesStatus && matchesCategory && matchesAgent && isWithinDateRange(opp.date_created, startDate, endDate);
    });
  }, [opportunities, searchTerm, statusFilter, categoryFilter, agentFilter, startDate, endDate]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleCreateOpportunity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSelectedContact) return;

    const finalQuantity = selectedQuantity === -1 ? Number(customQuantity) || 1000 : selectedQuantity;

    addOpportunity({
      contact_id: currentSelectedContact.contact_id,
      contact_person: currentSelectedContact.contact_person_name,
      phone: currentSelectedContact.phone_number,
      fish_category: selectedCategory,
      quantity: finalQuantity,
      status: selectedStatus,
      contacted_by: selectedAgent,
      source: selectedSource,
      notes: notes || undefined,
    });

    setIsModalOpen(false);
    setNotes('');
  };

  const handleOpenEdit = (opp: Opportunity) => {
    setEditingOpp(opp);
    setEditContactPerson(opp.contact_person);
    setEditPhone(opp.phone);
    setEditCategory(opp.fish_category);
    setEditQuantity(opp.quantity);
    setEditStatus(opp.status);
    setEditAgent(opp.contacted_by);
    setEditSource(opp.source || 'Phone');
    setEditNotes(opp.notes || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOpp) return;

    editOpportunity(editingOpp.opportunity_id, {
      contact_person: editContactPerson,
      phone: editPhone,
      fish_category: editCategory,
      quantity: Number(editQuantity),
      status: editStatus,
      contacted_by: editAgent,
      source: editSource,
      notes: editNotes,
    });

    setEditingOpp(null);
  };

  return (
    <div className="space-y-4">
      {/* Table Header Controls (Rich Filter View) */}
      <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search opportunities (contact, phone, notes)..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs border border-neutral-300 rounded px-2.5 py-1.5 bg-white text-neutral-800 focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="ALL">All Statuses</option>
            {opportunityStatuses.map((st) => (
              <option key={st.id} value={st.name}>
                {st.name}
              </option>
            ))}
          </select>

          {/* Fish Category Filter */}
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

          {/* Agent Filter */}
          <select
            value={agentFilter}
            onChange={(e) => {
              setAgentFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs border border-neutral-300 rounded px-2.5 py-1.5 bg-white text-neutral-800 focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="ALL">All Agents</option>
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
              title="Clear all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          {/* Add Entry Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-neutral-800 text-white rounded text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Opportunity</span>
          </button>
        </div>
      </div>

            <div className="flex justify-end"><ExportDataButton tableKey="opportunities" tableLabel="Opportunities" rows={filteredData as unknown as Record<string, unknown>[]} /></div>

{/* Table Display */}
      <div className="bg-white rounded-lg border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                <th className="py-3 px-4">Opp ID</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Associated Farm</th>
                <th className="py-3 px-4">Fish Category</th>
                <th className="py-3 px-4">Quantity</th>
                <th className="py-3 px-4">Status &amp; Automation</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Contacted By</th>
                <th className="py-3 px-4">Date Created</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-neutral-400">
                    No opportunity records found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedData.map((opp) => {
                  const contact = contactPeople.find((c) => c.contact_id === opp.contact_id);
                  return (
                    <tr key={opp.opportunity_id} className="hover:bg-neutral-50/70 transition">
                      <td className="py-3 px-4 font-mono font-medium text-neutral-900">
                        #{opp.opportunity_id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-neutral-900">{opp.contact_person}</div>
                        <div className="text-[11px] text-neutral-500 font-mono">{opp.phone}</div>
                      </td>
                      <td className="py-3 px-4 text-neutral-700 font-medium">
                        {contact?.farm_name || 'Pending Association'}
                      </td>
                      <td className="py-3 px-4 max-w-[180px] truncate" title={opp.fish_category}>
                        {opp.fish_category}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium">
                        {opp.quantity.toLocaleString()} pcs
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            opp.status === 'Accepted'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : opp.status === 'Pending/Undecided'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : opp.status === 'Negotiating'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : 'bg-neutral-100 text-neutral-600 border-neutral-300'
                          }`}
                        >
                          {opp.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-600">{opp.source || 'Phone'}</td>
                      <td className="py-3 px-4 text-neutral-600">{opp.contacted_by}</td>
                      <td className="py-3 px-4 text-neutral-500 text-[11px] whitespace-nowrap">
                        {new Date(opp.date_created).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 max-w-[150px] text-neutral-500 text-[11px] truncate" title={opp.notes}>
                        {opp.notes || '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button type="button" onClick={() => setViewRecord(opp as unknown as Record<string, unknown>)} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition">View</button>
                          <button
                          onClick={() => handleOpenEdit(opp)}
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

      {/* Modal: Edit Opportunity (Make Entry Editable) */}
      {editingOpp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-neutral-200 max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <h3 className="font-semibold text-sm text-neutral-900">
                Edit Opportunity #{editingOpp.opportunity_id}
              </h3>
              <button
                onClick={() => setEditingOpp(null)}
                className="text-neutral-400 hover:text-neutral-700 text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
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

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black font-mono"
                />
              </div>

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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Quantity ({marketPrices.find((item) => item.name === editCategory)?.unit === 'per kilo' ? 'kg' : 'pcs'})
                  </label>
                  <input
                    type="number"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Opportunity Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as Opportunity['status'])}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white"
                  >
                    <option value="Accepted">Accepted &rarr; Auto Order</option>
                    <option value="Pending/Undecided">Pending/Undecided &rarr; Auto Follow-up</option>
                    <option value="Negotiating">Negotiating</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Source</label>
                <select value={editSource} onChange={(e) => setEditSource(e.target.value as NonNullable<Opportunity['source']>)} className="w-full px-3 py-2 text-xs border border-neutral-300 rounded bg-white">
                  <option value="Phone">Phone</option><option value="In-person/Walk-in">In-person/Walk-in</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Contacted By (Agent)
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
                  onClick={() => setEditingOpp(null)}
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

      {/* Modal: Add New Opportunity */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-neutral-200 max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <h3 className="font-semibold text-sm text-neutral-900">
                Create New Opportunity (opportunities table)
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateOpportunity} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Contact Person (Dropdown FK &bull; contact_people)
                </label>
                <select
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white"
                >
                  {contactPeople.filter((cp) => cp.is_point_person === 'yes' && cp.is_active === 'yes').map((cp) => (
                    <option key={cp.contact_id} value={cp.contact_id}>
                      {cp.contact_person_name} — {cp.farm_name} ({cp.phone_number})
                    </option>
                  ))}
                </select>
                {currentSelectedContact && (
                  <div className="text-[11px] text-neutral-500 mt-1">
                    Associated Farm: <strong className="text-neutral-800">{currentSelectedContact.farm_name}</strong> | Phone: {currentSelectedContact.phone_number}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Fish Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => { const next = e.target.value; setSelectedCategory(next); setSelectedQuantity(marketPrices.find((item) => item.name === next)?.unit === 'per kilo' ? 1 : 5000); }}
                  required
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white"
                >
                  {marketPrices.map((cat) => (
                    <option key={cat.market_price_id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Quantity ({marketPrices.find((item) => item.name === selectedCategory)?.unit === 'per kilo' ? 'kg' : 'pcs'})
                  </label>
                  <select
                    value={selectedQuantity}
                    onChange={(e) => setSelectedQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white"
                  >
                    {(marketPrices.find((item) => item.name === selectedCategory)?.unit === 'per kilo' ? [1, 5, 10, 20, 50] : [1000, 2500, 5000, 10000, 12000, 20000, 50000]).map((amount) => <option key={amount} value={amount}>{amount.toLocaleString()} {marketPrices.find((item) => item.name === selectedCategory)?.unit === 'per kilo' ? 'kg' : 'pcs'}</option>)}
                    <option value={-1}>Custom Count...</option>
                  </select>
                </div>

                {selectedQuantity === -1 ? (
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Custom Quantity ({marketPrices.find((item) => item.name === selectedCategory)?.unit === 'per kilo' ? 'kg' : 'pcs'})
                    </label>
                    <input
                      type="number"
                      value={customQuantity}
                      onChange={(e) => setCustomQuantity(e.target.value)}
                      placeholder="e.g. 7500"
                      className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Status &amp; Automation
                    </label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value as Opportunity['status'])}
                      className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white"
                    >
                      <option value="Pending/Undecided">Pending/Undecided (Auto Follow-up)</option>
                      <option value="Accepted">Accepted (Auto Creates Order)</option>
                      <option value="Negotiating">Negotiating</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Source</label>
                <select value={selectedSource} onChange={(e) => setSelectedSource(e.target.value as NonNullable<Opportunity['source']>)} className="w-full px-3 py-2 text-xs border border-neutral-300 rounded bg-white">
                  <option value="Phone">Phone</option><option value="In-person/Walk-in">In-person/Walk-in</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Contacted By (Dropdown FK &bull; agents.name)
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
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                  placeholder="e.g. Client requested pond inspection prior to delivery"
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
                  Create Opportunity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <RecordDetails title="Opportunity Details" record={viewRecord} onBack={() => setViewRecord(null)} />
    </div>
  );
};
