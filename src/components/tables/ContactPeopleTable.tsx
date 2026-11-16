import { ExportDataButton } from '../common/ExportDataButton';
import React, { useState, useMemo } from 'react';
import { Plus, Search, CheckCircle2, Edit2, X, RotateCcw } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { ContactPerson } from '../../types/crm';
import { TablePagination } from '../common/TablePagination';

export const ContactPeopleTable: React.FC = () => {
  const {
    contactPeople,
    farmRegistries,
    agents,
    addContactPerson,
    editContactPerson,
  } = useCRM();

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [farmFilter, setFarmFilter] = useState('ALL');
  const [pointPersonFilter, setPointPersonFilter] = useState('ALL');
  const [activeFilter, setActiveFilter] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Add Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [isExistingFarm, setIsExistingFarm] = useState(true);
  const [selectedFarmName, setSelectedFarmName] = useState<string>(
    farmRegistries[0]?.farm_name || ''
  );
  const [newFarmNameInput, setNewFarmNameInput] = useState('');
  const [phone, setPhone] = useState('+63 917 ');
  const [email, setEmail] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string>(agents[0]?.name || '');

  // Edit Modal State (Make All Entries Editable)
  const [editingContact, setEditingContact] = useState<ContactPerson | null>(null);
  const [editName, setEditName] = useState('');
  const [editFarm, setEditFarm] = useState('');
  const [editIsPointPerson, setEditIsPointPerson] = useState<'yes' | 'no'>('yes');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editIsActive, setEditIsActive] = useState<'yes' | 'no'>('yes');
  const [editAgent, setEditAgent] = useState('');

  const [willBePointPerson, setWillBePointPerson] = useState<'yes' | 'no'>('yes');

  const hasActiveFilters =
    searchTerm !== '' || farmFilter !== 'ALL' || pointPersonFilter !== 'ALL' || activeFilter !== 'ALL';

  const clearFilters = () => {
    setSearchTerm('');
    setFarmFilter('ALL');
    setPointPersonFilter('ALL');
    setActiveFilter('ALL');
    setCurrentPage(1);
  };

  const filteredData = useMemo(() => {
    return contactPeople.filter((c) => {
      const matchesSearch =
        c.contact_person_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.farm_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone_number.includes(searchTerm) ||
        (c.email_address || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFarm = farmFilter === 'ALL' || c.farm_name === farmFilter;
      const matchesPoint = pointPersonFilter === 'ALL' || c.is_point_person === pointPersonFilter;
      const matchesActive = activeFilter === 'ALL' || c.is_active === activeFilter;

      return matchesSearch && matchesFarm && matchesPoint && matchesActive;
    });
  }, [contactPeople, searchTerm, farmFilter, pointPersonFilter, activeFilter]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    const finalFarm = isExistingFarm ? selectedFarmName : newFarmNameInput.trim();
    if (!contactName.trim() || !finalFarm) return;

    addContactPerson({
      contact_person_name: contactName.trim(),
      farm_name: finalFarm,
      is_point_person: willBePointPerson,
      phone_number: phone.trim(),
      email_address: email.trim() || undefined,
      is_active: 'yes',
      assigned_agent: selectedAgent,
    });

    setIsModalOpen(false);
    setContactName('');
    setNewFarmNameInput('');
    setPhone('+63 917 ');
    setEmail('');
    setWillBePointPerson('yes');
  };

  const handleOpenEdit = (contact: ContactPerson) => {
    setEditingContact(contact);
    setEditName(contact.contact_person_name);
    setEditFarm(contact.farm_name);
    setEditIsPointPerson(contact.is_point_person);
    setEditPhone(contact.phone_number);
    setEditEmail(contact.email_address || '');
    setEditIsActive(contact.is_active);
    setEditAgent(contact.assigned_agent);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;

    editContactPerson(editingContact.contact_id, {
      contact_person_name: editName,
      farm_name: editFarm,
      is_point_person: editIsPointPerson,
      phone_number: editPhone,
      email_address: editEmail,
      is_active: editIsActive,
      assigned_agent: editAgent,
    });

    setEditingContact(null);
  };

  return (
    <div className="space-y-4">
      {/* Header Controls with Rich Filter View */}
      <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search contact people (name, farm, phone, email)..."
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
            <option value="ALL">All Farm Registries</option>
            {farmRegistries.map((f) => (
              <option key={f.farm_id} value={f.farm_name}>
                {f.farm_name}
              </option>
            ))}
          </select>

          <select
            value={pointPersonFilter}
            onChange={(e) => {
              setPointPersonFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs border border-neutral-300 rounded px-2.5 py-1.5 bg-white text-neutral-800 focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="ALL">Point Person Filter</option>
            <option value="yes">Primary Point Person (yes)</option>
            <option value="no">Secondary Contact (no)</option>
          </select>

          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs border border-neutral-300 rounded px-2.5 py-1.5 bg-white text-neutral-800 focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="ALL">All States</option>
            <option value="yes">Active (yes)</option>
            <option value="no">Inactive (no)</option>
          </select>

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
            <span>New Contact Person</span>
          </button>
        </div>
      </div>

            <div className="flex justify-end"><ExportDataButton tableKey="contact_people" tableLabel="Contact People" rows={filteredData as unknown as Record<string, unknown>[]} /></div>

{/* Table Display */}
      <div className="bg-white rounded-lg border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                <th className="py-3 px-4">Contact ID</th>
                <th className="py-3 px-4">Contact Person Name</th>
                <th className="py-3 px-4">Registered Farm Name</th>
                <th className="py-3 px-4">Point Person?</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Is Active?</th>
                <th className="py-3 px-4">Assigned Agent</th>
                <th className="py-3 px-4">Date Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-neutral-400">
                    No contact records found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((contact) => (
                  <tr key={contact.contact_id} className="hover:bg-neutral-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                      #{contact.contact_id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-neutral-900">
                      {contact.contact_person_name}
                    </td>
                    <td className="py-3 px-4 text-neutral-800 font-medium">
                      {contact.farm_name}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${
                          contact.is_point_person === 'yes'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-neutral-100 text-neutral-600 border-neutral-300'
                        }`}
                      >
                        {contact.is_point_person === 'yes' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        <span>{contact.is_point_person}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-700">
                      {contact.phone_number}
                    </td>
                    <td className="py-3 px-4 text-neutral-500">
                      {contact.email_address || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          contact.is_active === 'yes'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {contact.is_active}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-600">{contact.assigned_agent}</td>
                    <td className="py-3 px-4 text-neutral-400 text-[11px] whitespace-nowrap">
                      {new Date(contact.date_created).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(contact)}
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

      {/* Modal: Edit Contact Person (Make All Entries Editable) */}
      {editingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-neutral-200 max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <h3 className="font-semibold text-sm text-neutral-900">
                Edit Contact Person #{editingContact.contact_id}
              </h3>
              <button
                onClick={() => setEditingContact(null)}
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
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Farm Name
                </label>
                <input
                  type="text"
                  value={editFarm}
                  onChange={(e) => setEditFarm(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Is Point Person?
                  </label>
                  <select
                    value={editIsPointPerson}
                    onChange={(e) => setEditIsPointPerson(e.target.value as 'yes' | 'no')}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white"
                  >
                    <option value="yes">yes (Primary)</option>
                    <option value="no">no (Secondary)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Is Active?
                  </label>
                  <select
                    value={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.value as 'yes' | 'no')}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white"
                  >
                    <option value="yes">yes</option>
                    <option value="no">no</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Assigned Agent
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

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setEditingContact(null)}
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

      {/* Modal: Add New Contact */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-neutral-200 max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <h3 className="font-semibold text-sm text-neutral-900">
                Register Contact Person (contact_people table)
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateContact} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Contact Person Name
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Roberto Gomez"
                  required
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-neutral-700">
                    Farm Name
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsExistingFarm(!isExistingFarm)}
                    className="text-[11px] text-blue-600 hover:underline"
                  >
                    {isExistingFarm ? '+ Register New Farm' : 'Select Existing Farm'}
                  </button>
                </div>

                {isExistingFarm ? (
                  <select
                    value={selectedFarmName}
                    onChange={(e) => setSelectedFarmName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white"
                  >
                    {farmRegistries.map((f) => (
                      <option key={f.farm_id} value={f.farm_name}>
                        {f.farm_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={newFarmNameInput}
                    onChange={(e) => setNewFarmNameInput(e.target.value)}
                    placeholder="Enter new farm name (will auto-create farm_registries entry)"
                    required
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                  />
                )}

                <label className="block text-xs font-medium text-neutral-700 mt-3 mb-1">Point Person (shown in farm contact dropdowns)</label>
                <select value={willBePointPerson} onChange={(e) => setWillBePointPerson(e.target.value as 'yes' | 'no')} className="w-full px-3 py-2 text-xs border border-neutral-300 rounded bg-white">
                  <option value="yes">Yes — selectable point person</option>
                  <option value="no">No — secondary contact</option>
                </select>
                <p className="text-[10px] text-neutral-500 mt-1">A farm can have multiple contacts. Each contact belongs to one farm only; only active contacts marked Yes appear in point-person dropdowns.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@farm.ph"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Assigned Agent
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
                  Register Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
