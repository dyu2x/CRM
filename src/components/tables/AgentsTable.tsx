import { ExportDataButton } from '../common/ExportDataButton';
import React, { useState, useMemo } from 'react';
import { Plus, Search, Shield, Key, Edit2, X, RotateCcw } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { Agent } from '../../types/crm';
import { TablePagination } from '../common/TablePagination';

export const AgentsTable: React.FC = () => {
  const { agents, addAgent, editAgent, updateAgentPassword, rolePermissions, currentUser } = useCRM();
  const isAdmin = currentUser?.role === 'Admin';
  const isManager = String(currentUser?.role || '').trim().toLowerCase() === 'manager';
  const isProtectedRole = (value: string) => ['admin', 'manager'].includes(String(value || '').trim().toLowerCase());
  const canManageAgents = isAdmin || isManager;
  const availableRoles = Array.from(new Set(['Booking Agent', 'Delivery Agent', 'Sales Agent', ...Object.keys(rolePermissions), ...agents.map((a) => a.role), ...(isAdmin ? ['Admin', 'Manager'] : [])]))
    .filter((value) => isAdmin || !isProtectedRole(value));
  const visibleAgents = isManager ? agents.filter((agent) => !isProtectedRole(agent.role)) : agents;

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modal: Add Agent
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('+63 917 ');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Agent['role']>('Booking Agent');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Modal: Edit Agent (Make All Entries Editable)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<Agent['role']>('Booking Agent');
  const [editUsername, setEditUsername] = useState('');
  const [editStatus, setEditStatus] = useState<Agent['status']>('Active');

  // Modal: Reset Password
  const [passwordModalAgent, setPasswordModalAgent] = useState<Agent | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const hasActiveFilters = searchTerm !== '' || roleFilter !== 'ALL';

  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('ALL');
    setCurrentPage(1);
  };

  // Filter & Paginate
  const filteredData = useMemo(() => {
    return visibleAgents.filter((ag) => {
      const matchesSearch =
        ag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ag.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(ag.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(ag.phone || '').includes(searchTerm);

      const matchesRole = roleFilter === 'ALL' || ag.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [visibleAgents, searchTerm, roleFilter]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleCreateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageAgents || !name.trim() || !username.trim() || !password.trim()) return;
    if (!isAdmin && isProtectedRole(role)) return;

    addAgent({
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim(),
      status: 'Active',
      role,
      username: username.trim().toLowerCase(),
      password: password.trim(),
    });

    setIsModalOpen(false);
    setName('');
    setUsername('');
    setPassword('');
  };

  const handleOpenEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setEditName(agent.name);
    setEditAddress(agent.address);
    setEditPhone(agent.phone);
    setEditEmail(agent.email);
    setEditRole(agent.role);
    setEditUsername(agent.username);
    setEditStatus(agent.status);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;
    if (!canManageAgents || (!isAdmin && (isProtectedRole(editingAgent.role) || isProtectedRole(editRole)))) return;

    editAgent(editingAgent.agent_id, {
      name: editName,
      address: editAddress,
      phone: editPhone,
      email: editEmail,
      role: editRole,
      username: editUsername,
      status: editStatus,
    });

    setEditingAgent(null);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageAgents || !passwordModalAgent || !newPassword.trim()) return;

    updateAgentPassword(passwordModalAgent.agent_id, newPassword.trim());
    setPwSuccess(true);
    setTimeout(() => {
      setPwSuccess(false);
      setPasswordModalAgent(null);
      setNewPassword('');
    }, 1500);
  };

  return (
    <div className="space-y-4">
      {/* Header Controls with Search & Filter View */}
      <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search agents (name, username, email)..."
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
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs border border-neutral-300 rounded px-2.5 py-1.5 bg-white text-neutral-800 focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="ALL">All Roles</option>
            {availableRoles.map((availableRole) => <option key={availableRole} value={availableRole}>{availableRole}</option>)}
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

          {canManageAgents && <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-neutral-800 text-white rounded text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Agent</span>
          </button>}
        </div>
      </div>

            <div className="flex justify-end"><ExportDataButton tableKey="agents" tableLabel="Agents" rows={filteredData as unknown as Record<string, unknown>[]} /></div>

{/* Table Display */}
      <div className="bg-white rounded-lg border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                <th className="py-3 px-4">Agent ID</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Password Hash (bcrypt)</th>
                <th className="py-3 px-4">Phone &amp; Email</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date Started</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {paginatedData.map((agent) => (
                <tr key={agent.agent_id} className="hover:bg-neutral-50/70 transition">
                  <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                    #{agent.agent_id}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-neutral-900">{agent.name}</div>
                    <div className="text-[11px] text-neutral-500">{agent.address}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        agent.role === 'Admin'
                          ? 'bg-neutral-900 text-white'
                          : agent.role === 'Booking Agent'
                          ? 'bg-blue-100 text-blue-800'
                          : agent.role === 'Delivery Agent'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {agent.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-neutral-800">
                    {agent.username}
                  </td>
                  <td className="py-3 px-4 max-w-[140px]">
                    <span
                      className="font-mono text-[10px] text-neutral-400 truncate block"
                      title="Password is stored as a secure hash"
                    >
                      ••••••••••••••••
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-mono text-neutral-700">{agent.phone}</div>
                    <div className="text-[10px] text-neutral-400">{agent.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>{agent.status}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-neutral-400 text-[11px]">
                    {new Date(agent.date_started).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                    {canManageAgents && <><button
                      onClick={() => handleOpenEdit(agent)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-neutral-700 hover:text-white bg-neutral-100 hover:bg-neutral-900 border border-neutral-300 rounded transition cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setPasswordModalAgent(agent)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-neutral-700 hover:text-black border border-neutral-300 rounded hover:bg-neutral-100 transition cursor-pointer"
                      title="Reset password with bcrypt"
                    >
                      <Key className="w-3 h-3 text-neutral-500" />
                      <span>Pass</span>
                    </button></>}
                  </td>
                </tr>
              ))}
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

      {/* Modal: Edit Agent (Make All Entries Editable) */}
      {editingAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-neutral-200 max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <h3 className="font-semibold text-sm text-neutral-900">
                Edit Agent #{editingAgent.agent_id}
              </h3>
              <button
                onClick={() => setEditingAgent(null)}
                className="text-neutral-400 hover:text-neutral-700 text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    System Role
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as Agent['role'])}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white"
                  >
{availableRoles.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black font-mono"
                  />
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
                    Account Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as Agent['status'])}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Station / Office Address
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setEditingAgent(null)}
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

      {/* Modal: Add Agent */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-neutral-200 max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <h3 className="font-semibold text-sm text-neutral-900">
                Add Team Agent (agents table)
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Juan De La Cruz"
                  required
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    System Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Agent['role'])}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white"
                  >
{availableRoles.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. jcruz"
                    required
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Password (Will be Encrypted via bcrypt)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter initial password"
                  required
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Phone Number
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
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="agent@mesinafarms.ph"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Station / Office Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Branch location"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
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
                  Save Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password with bcrypt */}
      {passwordModalAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-neutral-200 max-w-sm w-full p-6">
            <h3 className="font-semibold text-sm text-neutral-900 mb-1">
              Reset Password for {passwordModalAgent.name}
            </h3>
            <p className="text-xs text-neutral-500 mb-4">
              Updates password and generates new bcrypt hash round 10.
            </p>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              {pwSuccess && (
                <div className="p-2 bg-emerald-50 text-emerald-800 text-xs rounded flex items-center gap-1.5 font-medium">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Password updated with bcrypt!</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalAgent(null)}
                  className="px-3 py-1.5 border border-neutral-300 text-neutral-700 text-xs rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-semibold rounded"
                >
                  Confirm Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
