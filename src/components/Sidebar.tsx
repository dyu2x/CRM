import React from 'react';
import * as LucideIcons from 'lucide-react';
import {
  LayoutDashboard,
  Target,
  ShoppingCart,
  PhoneCall,
  FileSpreadsheet,
  Truck,
  PhilippinePeso,
  Compass,
  Users,
  Fish,
  Shield,
  History,
  Download,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  Sliders,
  UserRoundCog,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { TabKey } from './Navbar';
import { ProfileModal } from './ProfileModal';
import { useState } from 'react';

interface Props {
  activeTab: TabKey;
  workspace: 'crm'|'expenses';
  setWorkspace: (workspace:'crm'|'expenses')=>void;
  setActiveTab: (tab: TabKey) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onOpenBranding: () => void;
  onOpenDeployment: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  workspace,
  setWorkspace,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  onOpenBranding,
  onOpenDeployment,
  mobileOpen,
  setMobileOpen,
}) => {
  const { branding, currentUser, logout, opportunities, orders, followUpOrders, deliveries, rolePermissions } = useCRM();

  const crmNavItems: { key: TabKey; label: string; icon: React.ReactNode; badge?: number; group?: string }[] = [
    { key: 'dashboard', label: 'Overview', group: 'Workspace', icon: <LayoutDashboard className="w-4 h-4 shrink-0" /> },
    { key: 'opportunities', label: 'Opportunities', group: 'Sales', icon: <Target className="w-4 h-4 shrink-0" />, badge: opportunities.length },
    { key: 'orders', label: 'Orders', group: 'Sales', icon: <ShoppingCart className="w-4 h-4 shrink-0" />, badge: orders.filter(order => (order.status || 'Pending') !== 'Order Complete').length },
    { key: 'follow_up_orders', label: 'Follow-ups', group: 'Sales', icon: <PhoneCall className="w-4 h-4 shrink-0" />, badge: followUpOrders.filter(f => f.status === 'Scheduled').length },
    { key: 'invoices', label: 'Invoices', group: 'Operations', icon: <FileSpreadsheet className="w-4 h-4 shrink-0" /> },
    { key: 'deliveries', label: 'Deliveries', group: 'Operations', icon: <Truck className="w-4 h-4 shrink-0" />, badge: deliveries.filter(d => d.status === 'Pending' || d.status === 'Out for Delivery').length },
    { key: 'revenues', label: 'Revenues', group: 'Operations', icon: <span className="w-4 h-4 shrink-0 inline-flex items-center justify-center font-semibold leading-none transition-transform duration-200 hover:-translate-y-0.5 hover:scale-110">₱</span> },
    { key: 'farm_registries', label: 'Farm Registries', group: 'Directory', icon: <Compass className="w-4 h-4 shrink-0" /> },
    { key: 'contact_people', label: 'Contact People', group: 'Directory', icon: <Users className="w-4 h-4 shrink-0" /> },
    { key: 'catalog', label: 'Catalog & Pricing', group: 'Directory', icon: <Fish className="w-4 h-4 shrink-0" /> },
    { key: 'agents', label: 'Agents', group: 'Administration', icon: <Shield className="w-4 h-4 shrink-0" /> },
    { key: 'histories', label: 'Histories (Audit)', group: 'Administration', icon: <History className="w-4 h-4 shrink-0" /> },
    { key: 'status_tables', label: 'Status & Lookups', group: 'Administration', icon: <Sliders className="w-4 h-4 shrink-0 text-amber-500" /> },
  ];

  const isAdmin = currentUser?.role === 'Admin';
  const expenseNavItems: {key:TabKey;label:string;icon:React.ReactNode;group?:string}[] = [
    {key:'expenses_overview',label:'Expense Overview',group:'Overview',icon:<LayoutDashboard className="w-4 h-4 shrink-0"/>},
    {key:'employees',label:'Employees',group:'People',icon:<Users className="w-4 h-4 shrink-0"/>},
    {key:'attendance',label:'Attendance',group:'People',icon:<FileSpreadsheet className="w-4 h-4 shrink-0"/>},
    {key:'weekly_attendance',label:'Weekly Attendance',group:'Payroll',icon:<FileSpreadsheet className="w-4 h-4 shrink-0"/>},
    {key:'salaries',label:'Salaries',group:'Payroll',icon:<PhilippinePeso className="w-4 h-4 shrink-0 transition-transform duration-200 hover:-translate-y-0.5 hover:scale-110"/>},
    {key:'obligations',label:'Obligations',group:'Expenses',icon:<PhilippinePeso className="w-4 h-4 shrink-0 transition-transform duration-200 hover:-translate-y-0.5 hover:scale-110"/>},
    {key:'farm_maintenance',label:'Farm Maintenance',group:'Expenses',icon:<Settings className="w-4 h-4 shrink-0"/>},
    {key:'extra_expenses',label:'Extra Expenses',group:'Expenses',icon:<FileSpreadsheet className="w-4 h-4 shrink-0"/>},
    {key:'obligations_list',label:'Obligations List',group:'Setup',icon:<Sliders className="w-4 h-4 shrink-0"/>},
    {key:'farm_maintenance_list',label:'Maintenance List',group:'Setup',icon:<Sliders className="w-4 h-4 shrink-0"/>},
  ];
  const navItems: { key: TabKey; label: string; icon: React.ReactNode; badge?: number; group?: string }[] = workspace === 'expenses' ? expenseNavItems : crmNavItems;
  const allowedTabs = isAdmin ? navItems.map(item => item.key) : (rolePermissions[currentUser?.role || ''] || ['dashboard']);
  const extraItems = workspace === 'crm' ? [{key:'online_inquiry' as TabKey,label:'Online Inquiry',icon:<PhoneCall className="w-4 h-4 shrink-0"/>,group:'Sales'}] : [];
  // Keep the workspace switcher available when the user has access to at least one expense page.
  // Admins always have access; non-admins must be granted at least one expense permission.
  const canUseExpenses = isAdmin || expenseNavItems.some(item => allowedTabs.includes(item.key));
  const firstAllowedExpenseTab: TabKey = isAdmin
    ? expenseNavItems[0].key
    : (expenseNavItems.find(item => allowedTabs.includes(item.key))?.key || 'expenses_overview');
  const firstAllowedCrmTab: TabKey = isAdmin
    ? crmNavItems[0].key
    : (crmNavItems.find(item => allowedTabs.includes(item.key))?.key || 'dashboard');
  // Expense Overview is an independently permissioned page, just like each expense table.
  const visibleNavItems = [...navItems,...extraItems].filter(item => isAdmin || allowedTabs.includes(item.key));
  let lastGroup = '';
  const initialLetter = (branding.company_name || 'M').charAt(0).toUpperCase();
  const defaultIconNames: Record<string, string> = {
    dashboard: 'LayoutDashboard', opportunities: 'Target', orders: 'ShoppingCart',
    follow_up_orders: 'PhoneCall', invoices: 'FileSpreadsheet', deliveries: 'Truck',
    revenues: 'PhilippinePeso', farm_registries: 'Compass', contact_people: 'Users',
    catalog: 'Fish', agents: 'Shield', histories: 'History', status_tables: 'Sliders',
    online_inquiry: 'PhoneCall', expenses_overview: 'LayoutDashboard', employees: 'Users',
    attendance: 'FileSpreadsheet', weekly_attendance: 'FileSpreadsheet', salaries: 'PhilippinePeso',
    obligations: 'PhilippinePeso', farm_maintenance: 'Settings', extra_expenses: 'FileSpreadsheet',
    obligations_list: 'Sliders', farm_maintenance_list: 'Sliders',
  };
  const renderNavIcon = (key: string, fallback: React.ReactNode) => {
    const config = branding.table_icon_config?.[key];
    const iconName = config?.icon === 'DollarSign' ? 'PhilippinePeso' : (config?.icon || defaultIconNames[key]);
    const IconComponent = (LucideIcons as any)[iconName];
    if (!IconComponent) return fallback;
    return <IconComponent className="w-4 h-4 shrink-0 transition-transform duration-200 hover:-translate-y-0.5 hover:scale-110" style={config?.color ? { color: config.color } : undefined} />;
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen bg-white border-r border-neutral-200 z-40 flex flex-col justify-between transition-all duration-200 ease-in-out ${
          isCollapsed ? 'w-18' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Top Header / Branding */}
        <div>
          <div className="h-16 px-4 border-b border-neutral-200 flex items-center justify-between">
            <div className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? 'justify-center w-full' : ''}`}>
              <div className="w-8 h-8 rounded bg-black flex items-center justify-center text-white font-bold text-sm tracking-wider overflow-hidden shrink-0 shadow-2xs">
                {branding.company_logo ? (
                  <img
                    src={branding.company_logo}
                    alt={branding.company_name}
                    className="w-full h-full object-contain p-0.5"
                  />
                ) : (
                  <span>{initialLetter}</span>
                )}
              </div>

              {!isCollapsed && (
                <div className="truncate">
                  <div className="font-bold text-sm text-neutral-900 tracking-tight truncate">
                    {branding.company_name || 'Mesina Farms'}
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono">
                    CRM • V2.07
                  </div>
                </div>
              )}
            </div>

            {/* Collapse Toggle Button (Desktop only) */}
            {!isCollapsed && (
              <button
                onClick={() => setIsCollapsed(true)}
                className="hidden md:flex p-1.5 text-neutral-400 hover:text-neutral-800 rounded hover:bg-neutral-100 transition cursor-pointer"
                title="Hide labels and show icons only"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>

          {canUseExpenses && !isCollapsed && <div className="grid grid-cols-2 gap-1 border-b border-neutral-100 p-2">
            <button onClick={()=>{setWorkspace('crm');setActiveTab(firstAllowedCrmTab)}} className={`rounded-md px-2 py-2 text-[11px] font-semibold ${workspace==='crm'?'bg-neutral-900 text-white':'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>CRM</button>
            <button onClick={()=>{setWorkspace('expenses');setActiveTab(firstAllowedExpenseTab)}} className={`rounded-md px-2 py-2 text-[11px] font-semibold ${workspace==='expenses'?'bg-neutral-900 text-white':'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>Expenses Reports</button>
          </div>}
          {canUseExpenses && isCollapsed && <div className="flex flex-col gap-1 border-b border-neutral-100 p-2">
            <button title="CRM" onClick={()=>{setWorkspace('crm');setActiveTab(firstAllowedCrmTab)}} className={`rounded p-2 text-[10px] ${workspace==='crm'?'bg-neutral-900 text-white':'bg-neutral-100'}`}>C</button>
            <button title="Expenses Reports" onClick={()=>{setWorkspace('expenses');setActiveTab(firstAllowedExpenseTab)}} className={`rounded p-2 text-[10px] ${workspace==='expenses'?'bg-neutral-900 text-white':'bg-neutral-100'}`}>E</button>
          </div>}
          {/* Collapsed expand button on top */}
          {isCollapsed && (
            <div className="hidden md:flex justify-center py-2 border-b border-neutral-100">
              <button
                onClick={() => setIsCollapsed(false)}
                className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded hover:bg-neutral-100 transition cursor-pointer"
                title="Expand sidebar (show labels)"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Navigation Menu Items */}
          <nav className="p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-120px)] no-scrollbar">
            {visibleNavItems.map((item) => {
              const showGroup = !isCollapsed && item.group !== lastGroup; lastGroup = item.group || '';
              const isActive = activeTab === item.key;
              return (
                <React.Fragment key={item.key}>{showGroup && <div className="px-3 pt-3 pb-1 text-[9px] uppercase tracking-wider font-bold text-neutral-400">{item.group}</div>}
                <button
                  onClick={() => {
                    setActiveTab(item.key);
                    setMobileOpen(false);
                  }}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition cursor-pointer relative group ${
                    isActive
                      ? 'bg-neutral-900 text-white shadow-xs font-semibold'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                  {renderNavIcon(item.key, item.icon)}

                  {!isCollapsed && (
                    <span className="truncate flex-1 text-left">{item.label}</span>
                  )}

                  {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? 'bg-neutral-800 text-neutral-300'
                          : 'bg-neutral-200 text-neutral-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {/* Tooltip on hover in collapsed mode */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-neutral-900 text-white text-[11px] rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                      {item.label}
                    </div>
                  )}
                </button></React.Fragment>
              );
            })}
          </nav>
        </div>

        {/* Account controls are located in the main header. */}
      </aside>
    </>
  );
};
