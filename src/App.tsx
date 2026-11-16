import React, { useState } from 'react';
import { CRMProvider, useCRM } from './context/CRMContext';
import { LoginPage } from './components/LoginPage';
import { Sidebar } from './components/Sidebar';
import { TabKey } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { OpportunitiesTable } from './components/tables/OpportunitiesTable';
import { OrdersTable } from './components/tables/OrdersTable';
import { FollowUpOrdersTable } from './components/tables/FollowUpOrdersTable';
import { InvoicesTable } from './components/tables/InvoicesTable';
import { DeliveriesTable } from './components/tables/DeliveriesTable';
import { RevenuesTable } from './components/tables/RevenuesTable';
import { FarmRegistriesTable } from './components/tables/FarmRegistriesTable';
import { ContactPeopleTable } from './components/tables/ContactPeopleTable';
import { AgentsTable } from './components/tables/AgentsTable';
import { CatalogTable } from './components/tables/CatalogTable';
import { HistoriesTable } from './components/tables/HistoriesTable';
import { StatusTablesView } from './components/tables/StatusTablesView';
import { OnlineInquiryView } from './components/tables/OnlineInquiryView';
import { ExpensesReportsView } from './components/expenses/ExpensesReportsView';
import { AdminBrandingModal } from './components/AdminBrandingModal';
import { DeploymentModal } from './components/DeploymentModal';
import { Menu, Settings, LogOut, UserRoundCog } from 'lucide-react';
import { ProfileModal } from './components/ProfileModal';

const sectionTitles: Record<TabKey, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'CRM Operations Overview',
    subtitle: 'Real-time metrics, pipeline stages, delivery tracking and revenue status',
  },
  opportunities: {
    title: 'Opportunities',
    subtitle: 'Track leads, potential buys, and automated order generation',
  },
  orders: {
    title: 'Orders Management',
    subtitle: 'Automated 24h follow-up queuing and verification',
  },
  follow_up_orders: {
    title: 'Follow-Up Orders & Inquiries',
    subtitle: 'Quality resolution, callback scheduling, and order progression',
  },
  invoices: {
    title: 'Billing & Invoices',
    subtitle: 'Itemized billing calculated from the Market Prices master table',
  },
  deliveries: {
    title: 'Deliveries & Logistics',
    subtitle: 'Farm GPS coordinates, fulfillment verification, and payment collection',
  },
  revenues: {
    title: 'Recognized Revenues',
    subtitle: 'Only recorded when orders are Delivered AND Paid in Full',
  },
  farm_registries: {
    title: 'Farm Registries',
    subtitle: 'Official registered aquaculture farms, designated point persons, and assigned agents',
  },
  contact_people: {
    title: 'Contact Directory',
    subtitle: 'Farm contact personnel with auto-point-person designation',
  },
  agents: {
    title: 'Agents & Access Control',
    subtitle: 'Officer authentication credentials with bcrypt password encryption',
  },
  catalog: {
    title: 'Catalog & Pricing',
    subtitle: 'Fish items, unit types and benchmark prices maintained in Market Prices',
  },
  histories: {
    title: 'Histories & Audit Trail',
    subtitle: 'Record of all updates across all CRM entries with old/new values and modifier names',
  },
  online_inquiry: { title: 'Online Inquiry', subtitle: 'Customer inquiries received from online channels' },
  expenses_overview: { title: 'Expense Report Overview', subtitle: 'Consolidated expenses, payroll, payment status and recent activity' },
  employees: { title: 'Employees', subtitle: 'Employee directory, employment details and hourly rates' },
  attendance: { title: 'Attendance', subtitle: 'Employee time-in and time-out records' },
  weekly_attendance: { title: 'Weekly Attendance', subtitle: 'Automatically calculated weekly work hours' },
  salaries: { title: 'Salaries', subtitle: 'Weekly salary calculations based on hourly rates and attendance' },
  obligations: { title: 'Obligations', subtitle: 'Track recurring business obligations and payments' },
  farm_maintenance: { title: 'Farm Maintenance', subtitle: 'Track farm maintenance expenses and receipts' },
  extra_expenses: { title: 'Extra Expenses', subtitle: 'Record miscellaneous business expenses' },
  obligations_list: { title: 'Obligations List', subtitle: 'Manage liability categories' },
  farm_maintenance_list: { title: 'Farm Maintenance List', subtitle: 'Manage maintenance categories' },
  status_tables: {
    title: 'Status & Lookup Master Tables',
    subtitle: 'System dropdown options and pipeline stages (Admin authorized)',
  },
};

const MainLayout: React.FC = () => {
  const { currentUser, branding, rolePermissions, logout } = useCRM();
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [workspace, setWorkspace] = useState<'crm'|'expenses'>('crm');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isBrandingOpen, setIsBrandingOpen] = useState(false);
  const [isDeploymentOpen, setIsDeploymentOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // If user is not logged in, show login page matching login_page_screenshot
  if (!currentUser) {
    return <LoginPage />;
  }

  const renderContent = () => {
    if (workspace === 'expenses') return <ExpensesReportsView activeTab={activeTab} />;
    const allowedTabs = currentUser?.role === 'Admin' ? Object.keys(sectionTitles) : (rolePermissions[currentUser?.role || ''] || ['dashboard']);
    if (!allowedTabs.includes(activeTab)) return allowedTabs.includes('dashboard') ? <DashboardView setActiveTab={setActiveTab} /> : <div className="p-8 bg-white border border-neutral-200 rounded-lg text-sm text-neutral-600">No CRM sections are assigned to your role. Please contact an administrator.</div>;
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView setActiveTab={setActiveTab} />;
      case 'opportunities':
        return <OpportunitiesTable />;
      case 'orders':
        return <OrdersTable />;
      case 'follow_up_orders':
        return <FollowUpOrdersTable />;
      case 'invoices':
        return <InvoicesTable />;
      case 'deliveries':
        return <DeliveriesTable />;
      case 'revenues':
        return <RevenuesTable />;
      case 'farm_registries':
        return <FarmRegistriesTable />;
      case 'contact_people':
        return <ContactPeopleTable />;
      case 'agents':
        return <AgentsTable />;
      case 'catalog':
        return <CatalogTable />;
      case 'histories':
        return <HistoriesTable />;
      case 'status_tables':
        return <StatusTablesView />;
      case 'online_inquiry': return <OnlineInquiryView />;
      default:
        return <DashboardView setActiveTab={setActiveTab} />;
    }
  };

  const currentMeta = sectionTitles[activeTab] || {
    title: 'Mesina Farms CRM',
    subtitle: 'Aquaculture operations and customer relations management',
  };

  return (
    <div className="min-h-screen bg-neutral-100/70 font-sans text-neutral-900 selection:bg-neutral-800 selection:text-white flex">
      {/* Side Bar Navigation (supports collapse to icons only & mobile drawer) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        workspace={workspace}
        setWorkspace={(next) => { setWorkspace(next); if (next === 'crm') setActiveTab('dashboard'); else setActiveTab('expenses_overview'); }}
        onOpenBranding={() => setIsBrandingOpen(true)}
        onOpenDeployment={() => setIsDeploymentOpen(true)}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-neutral-200 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 text-neutral-600 hover:text-black rounded hover:bg-neutral-100 transition cursor-pointer"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
                  {currentMeta.title}
                </h1>
              </div>
              <p className="text-xs text-neutral-500 hidden sm:block">
                {currentMeta.subtitle}
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            {currentUser.role === 'Admin' && <button
              onClick={() => setIsBrandingOpen(true)}
              className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs text-neutral-700 hover:text-black border border-neutral-300 rounded hover:bg-neutral-50 transition cursor-pointer flex items-center gap-1.5"
              title="Company Branding, Logo & Database Backup"
            >
              <Settings className="w-3.5 h-3.5 text-neutral-500" />
              <span className="hidden md:inline">Settings</span>
            </button>}
            <div className="ml-1 flex items-center gap-1 border-l border-neutral-200 pl-2">
              <button onClick={() => setIsProfileOpen(true)} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-neutral-100" title="Edit agent profile">
                <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-neutral-200 text-xs font-bold text-neutral-700">{currentUser.avatar_url ? <img src={currentUser.avatar_url} alt="" className="h-full w-full object-cover"/> : currentUser.name.charAt(0).toUpperCase()}</span>
                <span className="hidden sm:flex flex-col"><span className="max-w-32 truncate text-xs font-semibold leading-tight">{currentUser.name}</span><span className="text-[10px] text-neutral-500">{currentUser.role}</span></span>
                <UserRoundCog className="h-3.5 w-3.5 text-neutral-400"/>
              </button>
              <button onClick={logout} className="rounded p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600" title="Log off" aria-label="Log off"><LogOut className="h-4 w-4"/></button>
            </div>
          </div>
        </header>

        {/* Dynamic Table & Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderContent()}
        </main>
      </div>

      {/* Admin Branding & Data Backup Modal */}
      <AdminBrandingModal isOpen={isBrandingOpen} onClose={() => setIsBrandingOpen(false)} onOpenDeployment={() => { setIsBrandingOpen(false); setIsDeploymentOpen(true); }} />

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      {/* Ubuntu Docker Bundle Modal (Admin Authorized) */}
      <DeploymentModal
        isOpen={isDeploymentOpen}
        onClose={() => setIsDeploymentOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <CRMProvider>
      <MainLayout />
    </CRMProvider>
  );
}
