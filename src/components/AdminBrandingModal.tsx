import React, { useEffect, useState } from 'react';
import { X, Upload, Download, RefreshCw, CheckCircle2, AlertTriangle, Shield, Building2, Sliders, LayoutDashboard, Target, ShoppingCart, PhoneCall, FileSpreadsheet, Truck, PhilippinePeso, Compass, Users, Fish, History, Settings, CalendarDays, ClipboardList, Wallet, Wrench, UserRound, Package, MapPin, Receipt, ChartNoAxesCombined } from 'lucide-react';
import { RoleRestrictionsModal } from './RoleRestrictionsModal';
import { useCRM } from '../context/CRMContext';

interface Props { isOpen: boolean; onClose: () => void; onOpenDeployment?: () => void; }

export const AdminBrandingModal: React.FC<Props> = ({ isOpen, onClose, onOpenDeployment }) => {
  const { branding, updateBranding, exportAllData, importAllData, resetToDefaults, currentUser, clearOperationalData } = useCRM();
  const isAdmin = currentUser?.role === 'Admin';

  const [companyName, setCompanyName] = useState(branding.company_name);
  const [tableIconConfig, setTableIconConfig] = useState(branding.table_icon_config || {});
  const iconChoices = [
    ['LayoutDashboard', 'Dashboard'], ['Target', 'Target'], ['ShoppingCart', 'Shopping cart'],
    ['PhoneCall', 'Phone'], ['FileSpreadsheet', 'Spreadsheet'], ['Truck', 'Truck'],
    ['PhilippinePeso', 'Philippine peso (₱)'], ['Compass', 'Compass'], ['Users', 'Users'],
    ['Fish', 'Fish'], ['Shield', 'Shield'], ['History', 'History'], ['Sliders', 'Sliders'],
    ['Settings', 'Settings'], ['CalendarDays', 'Calendar'], ['ClipboardList', 'Clipboard'],
    ['Wallet', 'Wallet'], ['Wrench', 'Tools'], ['UserRound', 'Person'], ['Package', 'Package'],
    ['MapPin', 'Map pin'], ['Receipt', 'Receipt'], ['ChartNoAxesCombined', 'Chart']
  ];
  const navTables = [
    ['dashboard','Overview'], ['opportunities','Opportunities'], ['orders','Orders'],
    ['follow_up_orders','Follow-ups'], ['invoices','Invoices'], ['deliveries','Deliveries'],
    ['revenues','Revenues'], ['farm_registries','Farm Registries'], ['contact_people','Contact People'],
    ['catalog','Catalog & Pricing'], ['agents','Agents'], ['histories','Histories (Audit)'],
    ['status_tables','Status & Lookups'], ['online_inquiry','Online Inquiry'],
    ['expenses_overview','Expense Overview'], ['employees','Employees'], ['attendance','Attendance'],
    ['weekly_attendance','Weekly Attendance'], ['salaries','Salaries'], ['obligations','Obligations'],
    ['farm_maintenance','Farm Maintenance'], ['extra_expenses','Extra Expenses'],
    ['obligations_list','Obligations List'], ['farm_maintenance_list','Maintenance List']
  ] as const;
  const updateTableIcon = (key: string, field: 'icon' | 'color', value: string) => {
    setTableIconConfig(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }));
  };
  const [tagline, setTagline] = useState(branding.tagline);
  const [subtitle, setSubtitle] = useState(branding.subtitle);
  const [loginHeading, setLoginHeading] = useState(branding.login_heading || 'Welcome back');
  const [loginDescription, setLoginDescription] = useState(branding.login_description || 'Sign in with your username and password.');
  const [loginFooter, setLoginFooter] = useState(branding.login_footer || '');
  const [companyLogo, setCompanyLogo] = useState(branding.company_logo || '');
  const [loginBackground, setLoginBackground] = useState(branding.login_background_image ?? '/login-golden-gate.png');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [clearBusy, setClearBusy] = useState(false);
  const [backupExported, setBackupExported] = useState(false);
  const [truncateSeconds, setTruncateSeconds] = useState(0);
  const [isRestrictionsOpen, setIsRestrictionsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen || !isAdmin) { setBackupExported(false); setTruncateSeconds(0); return; }
    const token = localStorage.getItem('mesina_crm_token') || '';
    fetch('/api/admin/truncate-eligibility', { headers: { Authorization: `Bearer ${token}` } })
      .then(response => response.ok ? response.json() : { eligible: false, remainingSeconds: 0 })
      .then(result => { const seconds = Math.max(0, Number(result.remainingSeconds || 0)); setTruncateSeconds(seconds); setBackupExported(Boolean(result.eligible) && seconds > 0); })
      .catch(() => { setBackupExported(false); setTruncateSeconds(0); });
  }, [isOpen, isAdmin]);

  useEffect(() => {
    if (!isOpen || !backupExported || truncateSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setTruncateSeconds(current => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isOpen, backupExported, truncateSeconds > 0]);

  useEffect(() => {
    if (backupExported && truncateSeconds === 0) setBackupExported(false);
  }, [backupExported, truncateSeconds]);

  if (!isOpen) return null;

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    updateBranding({
      company_name: companyName,
      tagline,
      subtitle,
      login_heading: loginHeading,
      login_description: loginDescription,
      login_footer: loginFooter,
      company_logo: companyLogo,
      login_background_image: loginBackground,
      table_icon_config: tableIconConfig,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const readImage = (file: File, setter: (value: string) => void) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) { alert('Please choose an image smaller than 5 MB.'); return; }
    const reader = new FileReader(); reader.onloadend = () => setter(reader.result as string); reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readImage(file, setCompanyLogo);
    }
  };

  const handleExportSql = async () => {
    try {
      const token = localStorage.getItem('mesina_crm_token') || '';
      const response = await fetch('/api/backup.sql', { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('PostgreSQL did not create the SQL backup.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `mesina_crm_backup_${new Date().toISOString().slice(0,10)}.sql`;
      a.click(); URL.revokeObjectURL(url);
      const exportId = response.headers.get('X-CRM-Backup-Export-Id');
      if (!exportId) throw new Error('Backup downloaded, but its export confirmation was missing. Export again before truncating.');
      const confirmed = await fetch('/api/admin/confirm-backup-export', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ exportId }) });
      if (!confirmed.ok) throw new Error('Backup downloaded, but the server could not confirm it. Export again before truncating.');
      setBackupExported(true);
      setTruncateSeconds(300);
      setImportStatus('CRM SQL backup exported and confirmed. Truncate is available for 5 minutes.');
    } catch (error: any) { setImportStatus(error?.message || 'SQL export failed.'); }
  };

  const handleImportSql = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = String(event.target?.result || '');
      setImportStatus('Validating SQL backup and restoring PostgreSQL data…');
      const success = await importAllData(content);
      setImportStatus(success
        ? 'SQL backup successfully restored to PostgreSQL and synchronized with the CRM.'
        : 'Restore failed. Use an SQL backup exported by this CRM version and check server logs.');
      setTimeout(() => setImportStatus(null), 6000);
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-lg shadow-2xl border border-neutral-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-neutral-900 text-white rounded-md">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-neutral-900">
                Company Branding & Administration Settings
              </h3>
              <p className="text-xs text-neutral-500">
                Customize corporate identity, tab title, logo, and system backups &bull; <span className="font-mono font-semibold text-neutral-700">V2.07</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded hover:bg-neutral-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {onOpenDeployment && <div className="px-6 py-2 border-b border-neutral-200 bg-neutral-50 flex justify-end"><button type="button" onClick={onOpenDeployment} className="px-3 py-2 text-xs font-semibold text-emerald-800 border-b-2 border-emerald-600 hover:bg-emerald-50">Docker Bundle</button></div>}

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          {isAdmin && <section className="rounded-lg border border-neutral-200 p-4 space-y-2">
            <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-neutral-600"/><h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">Access restrictions</h4></div>
            <p className="text-xs text-neutral-500">Configure which CRM pages and tables each role can access.</p>
            <button type="button" onClick={() => setIsRestrictionsOpen(true)} className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-700"><Sliders className="w-3.5 h-3.5"/>Manage access restrictions</button>
          </section>}
          {/* Section 1: Branding */}
          <form onSubmit={handleSaveBranding} className="space-y-4">
            <div className="border-b border-neutral-100 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                1. Corporate Identity (crm_branding table)
              </h4>
              <p className="text-xs text-neutral-500 mt-0.5">
                Automatically syncs the browser tab title, favicon, login page, and dashboard headers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                  placeholder="e.g. Mesina Farms"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Tagline (Left Hero Banner)
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                  placeholder="Orders, deliveries and follow-ups in one place."
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Subtitle Description
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                placeholder="Track every farm from first order to collected payment."
              />
            </div>

            <div className="border-t border-neutral-100 pt-4 space-y-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">Table & Sidebar Icon Appearance</h4>
                <p className="text-[11px] text-neutral-500 mt-1">Choose an icon and its color for each CRM or Expenses navigation table. Changes are saved with Branding.</p>
              </div>
              <div className="space-y-2">
                {navTables.map(([key, label]) => {
                  const config = tableIconConfig[key] || {};
                  return <div key={key} className="grid grid-cols-[minmax(0,1fr)_minmax(130px,1fr)_54px] items-center gap-2 rounded-md border border-neutral-200 px-3 py-2">
                    <span className="text-xs font-medium text-neutral-700">{label}</span>
                    <select aria-label={`${label} icon`} value={config.icon === 'DollarSign' ? 'PhilippinePeso' : (config.icon || '')} onChange={e => updateTableIcon(key, 'icon', e.target.value)} className="min-w-0 rounded border border-neutral-300 bg-white px-2 py-1.5 text-xs">
                      <option value="">Default icon</option>
                      {iconChoices.map(([iconName, iconLabel]) => <option key={iconName} value={iconName}>{iconLabel}</option>)}
                    </select>
                    <input aria-label={`${label} icon color`} type="color" value={config.color || '#64748b'} onChange={e => updateTableIcon(key, 'color', e.target.value)} className="h-8 w-full cursor-pointer rounded border border-neutral-300 bg-white p-0.5" />
                  </div>;
                })}
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">Login Portal Content</h4>
              <div><label className="block text-xs font-medium text-neutral-700 mb-1">Login Heading</label><input value={loginHeading} onChange={(e) => setLoginHeading(e.target.value)} className="w-full px-3 py-2 text-sm border border-neutral-300 rounded" placeholder="Welcome back" /></div>
              <div><label className="block text-xs font-medium text-neutral-700 mb-1">Login Description</label><textarea rows={2} value={loginDescription} onChange={(e) => setLoginDescription(e.target.value)} className="w-full px-3 py-2 text-sm border border-neutral-300 rounded" placeholder="Sign in with your username and password." /></div>
              <div><label className="block text-xs font-medium text-neutral-700 mb-1">Login Footer Text</label><input value={loginFooter} onChange={(e) => setLoginFooter(e.target.value)} className="w-full px-3 py-2 text-sm border border-neutral-300 rounded" placeholder="Optional footer text" /></div>
            </div>

            {/* Logo upload / preview */}
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Company Logo / Favicon
              </label>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded border border-neutral-200 bg-neutral-50 flex items-center justify-center overflow-hidden shrink-0">
                  {companyLogo ? (
                    <img
                      src={companyLogo}
                      alt="Logo Preview"
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <span className="text-xl font-bold text-neutral-400">
                      {(companyName || 'M').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 border border-neutral-300 rounded text-xs font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Logo Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  {companyLogo && (
                    <button
                      type="button"
                      onClick={() => setCompanyLogo('')}
                      className="ml-2 text-xs text-red-600 hover:underline"
                    >
                      Remove Logo
                    </button>
                  )}
                  <p className="text-[11px] text-neutral-500">
                    Supports PNG, JPG, SVG. Updates browser favicon and application bar dynamically.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">Login page background</h4>
              <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-900">
                <img src={loginBackground || '/login-golden-gate.png'} alt="Login background preview" className="h-36 w-full object-cover" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-neutral-300 px-3 py-2 text-xs font-medium hover:bg-neutral-50"><Upload className="h-3.5 w-3.5"/>Upload login background<input type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)readImage(f,setLoginBackground)}}/></label>
                <button type="button" onClick={()=>setLoginBackground('/login-golden-gate.png')} className="text-xs text-neutral-600 underline">Use Golden Gate default</button>
                <button type="button" onClick={()=>setLoginBackground('')} className="text-xs text-red-600 underline">Remove image</button>
              </div>
              <p className="text-[11px] text-neutral-500">Images up to 5 MB. The login scene uses a slow cinematic pan/zoom animation.</p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-black hover:bg-neutral-800 text-white text-xs font-medium rounded transition"
              >
                Save Branding Changes
              </button>
              {saveSuccess && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Branding and browser tab updated!</span>
                </div>
              )}
            </div>
          </form>

          {/* Section 2: Data Backup & Restore (Admin Only) */}
          <div className="space-y-4 pt-4 border-t border-neutral-200">
            <div className="border-b border-neutral-100 pb-2 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-neutral-700" />
                  2. Database Backup & Restore (Admin Role Only)
                </h4>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Export a PostgreSQL SQL backup for pgAdmin 4 or restore the same SQL file through this WebUI.
                </p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${isAdmin ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {isAdmin ? 'Admin Authorized' : 'Read-Only (Non-Admin)'}
              </span>
            </div>

            {importStatus && (
              <div className="p-3 bg-neutral-100 border border-neutral-300 rounded text-xs text-neutral-800 flex items-center gap-2">
                <>{importStatus.startsWith('Restore failed') ? <AlertTriangle className="w-4 h-4 text-red-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}</>
                <span>{importStatus}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleExportSql}
                disabled={!isAdmin}
                className="flex items-center justify-center gap-2 p-3 border border-neutral-300 rounded-md hover:border-black hover:bg-neutral-50 transition text-xs font-medium text-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4 text-neutral-600" />
                <span>Export CRM Data (.SQL)</span>
              </button>

              <label
                className={`flex items-center justify-center gap-2 p-3 border border-neutral-300 rounded-md text-xs font-medium transition ${
                  isAdmin
                    ? 'hover:border-black hover:bg-neutral-50 cursor-pointer text-neutral-800'
                    : 'opacity-40 cursor-not-allowed text-neutral-400'
                }`}
              >
                <Upload className="w-4 h-4 text-neutral-600" />
                <span>Import SQL Backup</span>
                {isAdmin && (
                  <input
                    type="file"
                    accept=".sql,.json"
                    onChange={handleImportSql}
                    className="hidden"
                  />
                )}
              </label>
            </div>

            {isAdmin && <div className="mt-4 p-4 border border-red-200 bg-red-50/60 rounded-md space-y-2">
              <div className="text-xs font-semibold text-red-800">Clear operational data (Admin only)</div>
              <p className="text-[11px] text-red-700">Permanently clears all normalized CRM data and lookup tables. Agent accounts, role restrictions, active sessions, branding settings and essential workflow options in the CRM state are preserved. Export CRM Data (.SQL) successfully first; the server verifies the completed export before enabling truncation.</p>
              <button type="button" disabled={clearBusy || !backupExported} onClick={async()=>{const phrase=window.prompt('This cannot be undone. Type CLEAR CRM DATA to continue:');if(phrase!=='CLEAR CRM DATA')return;setClearBusy(true);const result=await clearOperationalData();setClearBusy(false);if(result.success){setBackupExported(false);setTruncateSeconds(0);}setImportStatus(result.message||'');}} className={`px-3 py-2 rounded text-xs font-semibold transition ${backupExported ? 'bg-red-700 hover:bg-red-800 text-white' : 'bg-neutral-200 text-neutral-500 cursor-not-allowed'} disabled:opacity-70`}>{clearBusy?'Clearing data…':backupExported?`Truncate operational data (${Math.floor(truncateSeconds/60)}:${String(truncateSeconds%60).padStart(2,'0')})`:'Export CRM Data first'}</button>
            </div>}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (confirm('Reset all CRM tables back to factory demo dataset?')) {
                    resetToDefaults();
                    onClose();
                  }
                }}
                disabled={!isAdmin}
                className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-red-600 transition disabled:opacity-40"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset CRM to clean defaults (preserve agents & roles)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-neutral-50 border-t border-neutral-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-neutral-300 text-neutral-700 text-xs font-medium rounded hover:bg-neutral-100 transition"
          >
            Close
          </button>
        </div>
      </div>
      <RoleRestrictionsModal isOpen={isRestrictionsOpen} onClose={() => setIsRestrictionsOpen(false)} />
    </div>
  );
};
