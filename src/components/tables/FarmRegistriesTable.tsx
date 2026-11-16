import { ExportDataButton } from '../common/ExportDataButton';
import React, { useState, useMemo } from 'react';
import { Plus, Search, UserCheck, Edit2, X, RotateCcw } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { FarmRegistry } from '../../types/crm';
import { TablePagination } from '../common/TablePagination';
import { GoogleMapsLink } from '../common/GoogleMapsLink';

export const FarmRegistriesTable: React.FC = () => {
  const { farmRegistries, contactPeople, agents, addFarmRegistry, editFarmRegistry } = useCRM();

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [agentFilter, setAgentFilter] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Add Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [farmName, setFarmName] = useState('');
  const [farmAddress, setFarmAddress] = useState('');
  const [coordinates, setCoordinates] = useState('14.8321, 120.7335');
  const [farmPhone, setFarmPhone] = useState('+63 917 ');
  const [farmEmail, setFarmEmail] = useState('');
  const [designatedPointPerson, setDesignatedPointPerson] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string>(agents[0]?.name || '');

  // Edit Modal State (Make All Entries Editable)
  const [editingFarm, setEditingFarm] = useState<FarmRegistry | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCoords, setEditCoords] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPointPerson, setEditPointPerson] = useState('');
  const [editAgent, setEditAgent] = useState('');

  const hasActiveFilters = searchTerm !== '' || agentFilter !== 'ALL';

  const clearFilters = () => {
    setSearchTerm('');
    setAgentFilter('ALL');
    setCurrentPage(1);
  };

  // Filtered & Paginated records
  const filteredData = useMemo(() => {
    return farmRegistries.filter((farm) => {
      const matchesSearch =
        farm.farm_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        farm.farm_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (farm.designated_point_person || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        farm.farm_phone.includes(searchTerm);

      const matchesAgent = agentFilter === 'ALL' || farm.assigned_agent === agentFilter;

      return matchesSearch && matchesAgent;
    });
  }, [farmRegistries, searchTerm, agentFilter]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleCreateFarm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmName.trim() || !farmAddress.trim() || !farmPhone.trim()) return;

    addFarmRegistry({
      farm_name: farmName.trim(),
      farm_address: farmAddress.trim(),
      coordinates_lat_lng: coordinates.trim(),
      designated_point_person: designatedPointPerson.trim() || undefined,
      farm_phone: farmPhone.trim(),
      farm_email: farmEmail.trim() || undefined,
      assigned_agent: selectedAgent,
    });

    setIsModalOpen(false);
    setFarmName('');
    setFarmAddress('');
    setFarmPhone('+63 917 ');
    setFarmEmail('');
    setDesignatedPointPerson('');
  };

  const handleOpenEdit = (farm: FarmRegistry) => {
    setEditingFarm(farm);
    setEditName(farm.farm_name);
    setEditAddress(farm.farm_address);
    setEditCoords(farm.coordinates_lat_lng);
    setEditPhone(farm.farm_phone);
    setEditEmail(farm.farm_email || '');
    setEditPointPerson(farm.designated_point_person || '');
    setEditAgent(farm.assigned_agent);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFarm) return;

    editFarmRegistry(editingFarm.farm_id, {
      farm_name: editName,
      farm_address: editAddress,
      coordinates_lat_lng: editCoords,
      designated_point_person: editPointPerson,
      farm_phone: editPhone,
      farm_email: editEmail,
      assigned_agent: editAgent,
    });

    setEditingFarm(null);
  };

  return (
    <div className="space-y-4">
      {/* Header Controls with Rich Filter View */}
      <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search farm registries (farm name, address, person)..."
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
            value={agentFilter}
            onChange={(e) => {
              setAgentFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs border border-neutral-300 rounded px-2.5 py-1.5 bg-white text-neutral-800 focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="ALL">All Assigned Agents</option>
            {agents.map((ag) => (
              <option key={ag.agent_id} value={ag.name}>
                {ag.name}
              </option>
            ))}
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
            <span>New Farm Registry</span>
          </button>
        </div>
      </div>

            <div className="flex justify-end"><ExportDataButton tableKey="farm_registries" tableLabel="Farm Registries" rows={filteredData as unknown as Record<string, unknown>[]} /></div>

{/* Table Display */}
      <div className="bg-white rounded-lg border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                <th className="py-3 px-4">Farm ID</th>
                <th className="py-3 px-4">Farm Name</th>
                <th className="py-3 px-4">Farm Address</th>
                <th className="py-3 px-4">GPS Coordinates</th>
                <th className="py-3 px-4">Designated Point Person</th>
                <th className="py-3 px-4">Primary Phone</th>
                <th className="py-3 px-4">Primary Email</th>
                <th className="py-3 px-4">Assigned Agent</th>
                <th className="py-3 px-4">Date Registered</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-neutral-400">
                    No farm registries found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((farm) => {
                  const primaryContact = contactPeople.find(
                    (c) => c.farm_name === farm.farm_name && c.is_point_person === 'yes'
                  );
                  const displayPerson = farm.designated_point_person || primaryContact?.contact_person_name || 'Unassigned';

                  return (
                    <tr key={farm.farm_id} className="hover:bg-neutral-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                        #{farm.farm_id}
                      </td>
                      <td className="py-3 px-4 font-semibold text-neutral-900">
                        {farm.farm_name}
                      </td>
                      <td className="py-3 px-4 max-w-[200px] truncate text-neutral-700" title={farm.farm_address}>
                        {farm.farm_address}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap">
                        <GoogleMapsLink
                          coordinates={farm.coordinates_lat_lng}
                          address={farm.farm_address}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-neutral-900 flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{displayPerson}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-neutral-700 whitespace-nowrap">
                        {farm.farm_phone}
                      </td>
                      <td className="py-3 px-4 text-neutral-500">
                        {farm.farm_email || '—'}
                      </td>
                      <td className="py-3 px-4 text-neutral-700 font-medium">
                        {farm.assigned_agent}
                      </td>
                      <td className="py-3 px-4 text-neutral-400 text-[11px] whitespace-nowrap">
                        {new Date(farm.date_created).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(farm)}
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

      {/* Modal: Edit Farm (Make All Entries Editable) */}
      {editingFarm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-neutral-200 max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <h3 className="font-semibold text-sm text-neutral-900">
                Edit Farm #{editingFarm.farm_id}
              </h3>
              <button
                onClick={() => setEditingFarm(null)}
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
                  Farm Address
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    GPS Coordinates
                  </label>
                  <input
                    type="text"
                    value={editCoords}
                    onChange={(e) => setEditCoords(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Designated Point Person
                  </label>
                  <input
                    type="text"
                    value={editPointPerson}
                    onChange={(e) => setEditPointPerson(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
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
                    required
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Farm Email
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
                  onClick={() => setEditingFarm(null)}
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

      {/* Modal: New Farm Registry */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-neutral-200 max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <h3 className="font-semibold text-sm text-neutral-900">
                Register New Farm Facility (farm_registries table)
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateFarm} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Farm Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  placeholder="e.g. Isla Verde Aquaculture Hatchery"
                  required
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Farm Physical Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={farmAddress}
                  onChange={(e) => setFarmAddress(e.target.value)}
                  placeholder="Barangay, Municipality, Province"
                  required
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    GPS Coordinates (Lat, Lng)
                  </label>
                  <input
                    type="text"
                    value={coordinates}
                    onChange={(e) => setCoordinates(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Designated Point Person
                  </label>
                  <input
                    type="text"
                    value={designatedPointPerson}
                    onChange={(e) => setDesignatedPointPerson(e.target.value)}
                    placeholder="Primary site manager"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Farm Primary Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={farmPhone}
                    onChange={(e) => setFarmPhone(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Farm Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={farmEmail}
                    onChange={(e) => setFarmEmail(e.target.value)}
                    placeholder="contact@farm.ph"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Assigned Agent (Dropdown FK &bull; agents)
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
                  Save Farm Registry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
