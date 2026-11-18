import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  X,
  Save,
  RotateCcw,
  CheckCircle2,
  Lock,
  Layers,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { initialRolePermissions } from '../data/initialData';
import { TabKey } from './Navbar';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const allTablesList: { key: TabKey; label: string; desc: string }[] = [
  { key: 'dashboard', label: 'Operations Overview', desc: 'KPI metrics, revenue totals, active queue' },
  { key: 'opportunities', label: 'Opportunities Pipeline', desc: 'Sales pipeline, prospective buyers, lead stages' },
  { key: 'orders', label: 'Orders Management', desc: 'Placed orders, automated 24h follow-up queue' },
  { key: 'follow_up_orders', label: 'Follow-ups & Inquiries', desc: 'Quality complaints, resolution, callbacks' },
  { key: 'invoices', label: 'Billing & Invoices', desc: 'Official receipts, unit pricing, total amounts' },
  { key: 'deliveries', label: 'Deliveries & Logistics', desc: 'GPS routes, fulfillment signatures, payment status' },
  { key: 'revenues', label: 'Recognized Revenues', desc: 'Settled funds (Delivered AND Paid in Full)' },
  { key: 'farm_registries', label: 'Farm Registries', desc: 'Registered facilities, designated point persons' },
  { key: 'contact_people', label: 'Contact Directory', desc: 'Personnel directory, primary contact tags' },
  { key: 'catalog', label: 'Catalog & Pricing', desc: 'Fish items and market prices' },
  { key: 'roles' as TabKey, label: 'CRM Roles', desc: 'Configured CRM roles and assignments' },
  { key: 'agents', label: 'Agents & Access Control', desc: 'User profiles, bcrypt credentials, officer roles' },
  { key: 'histories', label: 'Audit Trail (Histories)', desc: 'Complete changelog with old/new values & modifier' },
  { key: 'status_tables', label: 'Status & Lookup Master Tables', desc: 'Configurable system status options & behavior' },
  { key: 'online_inquiry', label: 'Online Inquiry', desc: 'Customer inquiries received from online channels' },
  { key: 'online_inquiry_sources', label: 'Online Inquiry Sources', desc: 'Source channels for online customer inquiries' },
  { key: 'expenses_overview', label: 'Expenses: Report Overview', desc: 'Consolidated expense totals, payroll summary, payment status and recent activity' },
  { key: 'employees', label: 'Expenses: Employees', desc: 'Employee profiles, employment details and hourly rates' },
  { key: 'attendance', label: 'Expenses: Attendance', desc: 'Employee time-in, time-out and work-hour records' },
  { key: 'weekly_attendance', label: 'Expenses: Weekly Attendance', desc: 'Weekly hours summarized by employee' },
  { key: 'salaries', label: 'Expenses: Salaries', desc: 'Weekly payroll calculations by date range' },
  { key: 'obligations', label: 'Expenses: Obligations', desc: 'Business liability costs, receipts and payment status' },
  { key: 'obligations_list', label: 'Expenses: Liability Categories', desc: 'Manage liability categories' },
  { key: 'farm_maintenance', label: 'Expenses: Farm Maintenance', desc: 'Farm maintenance costs, receipts and status' },
  { key: 'farm_maintenance_list', label: 'Expenses: Maintenance Categories', desc: 'Manage farm maintenance categories' },
  { key: 'extra_expenses', label: 'Expenses: Extra Expenses', desc: 'Miscellaneous expenses, receipts and payment status' },
];

const subTables = [{ parent: 'status_tables' as TabKey, key: 'status_tables:opportunityStatuses', label: 'Opportunity Statuses' }, { parent: 'status_tables' as TabKey, key: 'status_tables:followUpStatuses', label: 'Follow-up Statuses' }, { parent: 'status_tables' as TabKey, key: 'status_tables:followUpMethods', label: 'Follow-up Methods' }, { parent: 'status_tables' as TabKey, key: 'status_tables:deliveryStatuses', label: 'Delivery Statuses' }, { parent: 'status_tables' as TabKey, key: 'status_tables:paymentStatuses', label: 'Payment Statuses' }, { parent: 'status_tables' as TabKey, key: 'status_tables:orderStatuses', label: 'Order Statuses' }, { parent: 'status_tables' as TabKey, key: 'status_tables:paymentMethods', label: 'Payment Methods' }];

const standardRoles = ['Admin', 'Manager', 'Agent', 'Booking Agent', 'Delivery Agent', 'Sales Agent'];

export const RoleRestrictionsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { rolePermissions, updateRolePermissions, removeRole, agents, currentUser } = useCRM();

  const [currentPermissions, setCurrentPermissions] = useState<Record<string, string[]>>(rolePermissions);
  // Combine standard roles with configured and assigned custom roles.
  const availableRoles = Array.from(
    new Set([...standardRoles, ...Object.keys(rolePermissions), ...Object.keys(currentPermissions), ...agents.map((a) => a.role)])
  );

  const [selectedRole, setSelectedRole] = useState<string>(availableRoles[1] || 'Booking Agent');
  const [successMessage, setSuccessMessage] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const isAdmin = currentUser?.role === 'Admin';
  const canManageRoles = isAdmin;

  useEffect(() => {
    if (isOpen) {
      setCurrentPermissions(rolePermissions);
      setSelectedRole((current) => rolePermissions[current] ? current : (Object.keys(rolePermissions)[0] || 'Booking Agent'));
    }
  }, [isOpen, rolePermissions]);

  if (!isOpen) return null;

  const activeAllowedTabs = currentPermissions[selectedRole] || [];

  const handleCreateRole = () => {
    const name = newRoleName.trim();
    if (!name || /^(admin|manager|agent)$/i.test(name) || Object.keys(currentPermissions).some((r) => r.toLowerCase() === name.toLowerCase())) return;
    setCurrentPermissions((prev) => ({ ...prev, [name]: ['dashboard'] }));
    setSelectedRole(name);
    setNewRoleName('');
  };

  const handleToggleTab = (tabKey: TabKey) => {
    if (['Admin', 'Agent'].includes(selectedRole)) return;
    const isAllowed = activeAllowedTabs.includes(tabKey);
    const updated = isAllowed
      ? activeAllowedTabs.filter((k) => k !== tabKey)
      : [...activeAllowedTabs, tabKey];

    setCurrentPermissions({
      ...currentPermissions,
      [selectedRole]: updated,
    });
  };

  const handleToggleExport = (tableKey: TabKey) => {
    if (['Admin', 'Agent'].includes(selectedRole)) return;
    const permissionKey = `export:${tableKey}`;
    const updated = activeAllowedTabs.includes(permissionKey)
      ? activeAllowedTabs.filter((key) => key !== permissionKey)
      : [...activeAllowedTabs, permissionKey];
    setCurrentPermissions({ ...currentPermissions, [selectedRole]: updated });
  };

  const handleToggleSubtable = (subtableKey: string) => {
    if (['Admin', 'Agent'].includes(selectedRole)) return;
    const hasGranular = activeAllowedTabs.some((key) => key.startsWith('status_tables:'));
    const baseline = hasGranular ? activeAllowedTabs : [...activeAllowedTabs, ...subTables.map((item) => item.key)];
    const updated = baseline.includes(subtableKey)
      ? baseline.filter((key) => key !== subtableKey)
      : [...baseline, subtableKey];
    setCurrentPermissions({ ...currentPermissions, [selectedRole]: updated });
  };

  const handleSelectAll = () => {
    if (['Admin', 'Agent'].includes(selectedRole)) return;
    setCurrentPermissions({
      ...currentPermissions,
      [selectedRole]: allTablesList.map((t) => t.key),
    });
  };

  const handleDeselectAll = () => {
    if (['Admin', 'Agent'].includes(selectedRole)) return;
    setCurrentPermissions({
      ...currentPermissions,
      [selectedRole]: ['dashboard'],
    });
  };

  const handleResetDefaults = () => {
    if (['Admin', 'Agent'].includes(selectedRole)) return;
    const defaultsForRole = initialRolePermissions[selectedRole] || ['dashboard'];
    setCurrentPermissions({
      ...currentPermissions,
      [selectedRole]: defaultsForRole,
    });
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    Object.keys(currentPermissions).forEach((role) => {
      if (!['Admin', 'Agent'].includes(role)) updateRolePermissions(role, currentPermissions[role]);
    });
    setSuccessMessage(true);
    setTimeout(() => {
      setSuccessMessage(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-lg shadow-2xl border border-neutral-200 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-neutral-800 rounded-md text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white">
                Role Permissions &amp; Table Access Restrictions
              </h3>
              <p className="text-xs text-neutral-400">
                Configure table access and export permissions for each role &bull; <span className="font-mono text-neutral-300">V2.08</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Selector Bar */}
        <div className="bg-neutral-50 px-6 py-3 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-neutral-700">Select Role:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {availableRoles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className={`px-3 py-1.5 text-xs rounded-md font-medium transition cursor-pointer ${
                    selectedRole === role
                      ? 'bg-black text-white font-semibold shadow-xs'
                      : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={['Admin', 'Agent'].includes(selectedRole)}
              className="text-[11px] text-neutral-600 hover:text-black font-medium underline"
            >
              Grant All
            </button>
            <span className="text-neutral-300">&bull;</span>
            <button
              type="button"
              onClick={handleDeselectAll}
              disabled={['Admin', 'Agent'].includes(selectedRole)}
              className="text-[11px] text-neutral-600 hover:text-black font-medium underline"
            >
              Only Dashboard
            </button>
            <span className="text-neutral-300">&bull;</span>
            <button
              type="button"
              onClick={handleResetDefaults}
              disabled={['Admin', 'Agent'].includes(selectedRole)}
              className="text-[11px] text-neutral-600 hover:text-black font-medium underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Preset
            </button>
          </div>
        </div>

        {canManageRoles && <div className="px-6 py-3 border-b border-neutral-200 flex flex-wrap items-center gap-2">
          <input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="New role name (Admin, Manager and Agent are reserved)" className="border border-neutral-300 rounded px-3 py-2 text-xs" maxLength={60} />
          <button type="button" onClick={handleCreateRole} disabled={!newRoleName.trim() || /^(admin|manager)$/i.test(newRoleName.trim()) || Object.keys(currentPermissions).some((r) => r.toLowerCase() === newRoleName.trim().toLowerCase())} className="px-3 py-2 rounded bg-neutral-900 text-white text-xs font-semibold disabled:opacity-40">Create role</button>
          <span className="text-[11px] text-neutral-500">Only Admin can create and configure roles. Admin, Manager and Agent are reserved system roles.</span>
        </div>}

        {/* Content Table / Checklist */}
        <form onSubmit={handleSaveAll} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-2 flex-1">
            <div className="text-xs text-neutral-500 mb-3 flex items-center justify-between">
              <span>
                Configuring permissions for role: <strong className="text-neutral-900">{selectedRole}</strong> ({activeAllowedTabs.filter((key) => !key.startsWith('export:')).length} of {allTablesList.length} tables granted)
              </span>
              <span className="text-[11px] font-mono text-neutral-400">
                Export access is controlled per table; Admin is always allowed
              </span>
            </div>

            <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-lg overflow-hidden">
              {allTablesList.map((tbl) => {
                const isChecked = activeAllowedTabs.includes(tbl.key);
                return (
                  <div
                    key={tbl.key}
                    onClick={() => handleToggleTab(tbl.key)}
                    className={`p-3 flex items-center justify-between gap-4 cursor-pointer transition select-none ${
                      isChecked ? 'bg-white hover:bg-neutral-50/80' : 'bg-neutral-50/50 hover:bg-neutral-100/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-neutral-900">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4 text-neutral-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-neutral-900 flex items-center gap-2">
                          <span>{tbl.label}</span>
                          <code className="text-[10px] text-neutral-400 font-mono">
                            {tbl.key}
                          </code>
                        </div>
                        <p className="text-[11px] text-neutral-500">
                          {tbl.desc}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-wrap items-center justify-end gap-3" onClick={(event) => event.stopPropagation()}>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${isChecked ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-neutral-200 text-neutral-600'}`}>
                        {isChecked ? 'Access Granted' : 'Restricted'}
                      </span>
                      {tbl.key !== 'dashboard' && <label className="inline-flex items-center gap-1.5 text-[10px] text-neutral-600 cursor-pointer" onClick={(event) => event.stopPropagation()}>
                        <input type="checkbox" aria-label={`Allow ${tbl.label} data export`} checked={selectedRole === 'Admin' || activeAllowedTabs.includes(`export:${tbl.key}`)} disabled={['Admin', 'Agent'].includes(selectedRole)} onChange={() => handleToggleExport(tbl.key)} />
                        Allow export
                      </label>}
                    </div>
                  </div>
                );
              })}
              {selectedRole && currentPermissions[selectedRole]?.includes('dashboard') && (
                <div className="border-t border-neutral-200 bg-sky-50/60 p-3 space-y-2">
                  <div className="text-xs font-semibold text-neutral-800">Operations Overview — visible sections for this role</div>
                  {[['kpis','Summary metrics'],['workflow','Workflow automations'],['followups','Follow-up queue'],['audit','Recent audit trail']].map(([key,label]) => {
                    const permissionKey = `overview:${key}`;
                    const hasAny = activeAllowedTabs.some(value => value.startsWith('overview:'));
                    const checked = hasAny ? activeAllowedTabs.includes(permissionKey) : true;
                    return <label key={key} className="flex items-center gap-2 pl-2 text-xs text-neutral-700"><input type="checkbox" checked={checked} disabled={['Admin', 'Agent'].includes(selectedRole)} onChange={() => { const base = hasAny ? activeAllowedTabs : [...activeAllowedTabs, ...['kpis','workflow','followups','audit'].map(v => `overview:${v}`)]; const next = base.includes(permissionKey) ? base.filter(v => v !== permissionKey) : [...base, permissionKey]; setCurrentPermissions({...currentPermissions,[selectedRole]:next}); }} />{label}</label>;
                  })}
                  <p className="text-[10px] text-neutral-500">When no section-specific restrictions are set, all overview sections are visible to roles with dashboard access.</p>
                </div>
              )}
              {selectedRole && currentPermissions[selectedRole]?.includes('status_tables') && (
                <div className="border-t border-neutral-200 bg-neutral-50 p-3 space-y-2">
                  <div className="text-xs font-semibold text-neutral-700">Status & Lookup subcategories — independently viewable tables</div>
                  {subTables.map((item) => (
                    <label key={item.key} className="flex items-center gap-2 pl-5 text-xs text-neutral-700">
                      <input type="checkbox" checked={activeAllowedTabs.some((key) => key.startsWith('status_tables:')) ? activeAllowedTabs.includes(item.key) : true} disabled={['Admin', 'Agent'].includes(selectedRole)} onChange={() => handleToggleSubtable(item.key)} />
                      {item.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
            <div>
              {successMessage && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Role restrictions updated and logged to histories!</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-neutral-300 text-neutral-700 hover:bg-neutral-100 text-xs rounded font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-black hover:bg-neutral-800 text-white text-xs font-semibold rounded shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Role Permissions</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
