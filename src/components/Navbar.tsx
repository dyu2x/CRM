import React from 'react';
import {
  Building2,
  Download,
  LogOut,
  Settings,
  UserCheck,
  LayoutDashboard,
  Target,
  ShoppingCart,
  PhoneCall,
  FileSpreadsheet,
  Truck,
  Users,
  Compass,
  Fish,
  History,
  Shield,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';

export type TabKey =
  | 'dashboard'
  | 'opportunities'
  | 'orders'
  | 'follow_up_orders'
  | 'invoices'
  | 'deliveries'
  | 'revenues'
  | 'farm_registries'
  | 'contact_people'
  | 'agents'
  | 'catalog'
  | 'histories'
  | 'status_tables'
  | 'online_inquiry'
  | 'online_inquiry_sources'
  | 'expenses_overview' | 'employees' | 'attendance' | 'weekly_attendance' | 'salaries' | 'obligations' | 'farm_maintenance' | 'extra_expenses' | 'obligations_list' | 'farm_maintenance_list';

interface Props {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  onOpenBranding: () => void;
  onOpenDeployment: () => void;
}

export const Navbar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  onOpenBranding,
  onOpenDeployment,
}) => {
  const { branding, currentUser, logout } = useCRM();

  const navItems: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Overview', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { key: 'opportunities', label: 'Opportunities', icon: <Target className="w-3.5 h-3.5" /> },
    { key: 'orders', label: 'Orders', icon: <ShoppingCart className="w-3.5 h-3.5" /> },
    { key: 'follow_up_orders', label: 'Follow-ups', icon: <PhoneCall className="w-3.5 h-3.5" /> },
    { key: 'invoices', label: 'Invoices', icon: <FileSpreadsheet className="w-3.5 h-3.5" /> },
    { key: 'deliveries', label: 'Deliveries', icon: <Truck className="w-3.5 h-3.5" /> },
    { key: 'revenues', label: 'Revenues', icon: <span className="w-3.5 h-3.5 inline-flex items-center justify-center font-semibold leading-none">₱</span> },
    { key: 'farm_registries', label: 'Farm Registries', icon: <Compass className="w-3.5 h-3.5" /> },
    { key: 'contact_people', label: 'Contact People', icon: <Users className="w-3.5 h-3.5" /> },
    { key: 'catalog', label: 'Catalog & Pricing', icon: <Fish className="w-3.5 h-3.5" /> },
    { key: 'agents', label: 'Agents', icon: <Shield className="w-3.5 h-3.5" /> },
    { key: 'histories', label: 'Audit Trail', icon: <History className="w-3.5 h-3.5" /> },
  ];

  const initialLetter = (branding.company_name || 'M').charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-neutral-200">
      {/* Upper Brand Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand Left */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-black flex items-center justify-center text-white font-bold text-sm tracking-wider overflow-hidden shrink-0 shadow-xs">
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
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-neutral-900 tracking-tight">
                {branding.company_name || 'Mesina Farms'}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 hidden sm:block">
              Minimalist Aquaculture Management System
            </p>
          </div>
        </div>

        {/* Action Buttons Right */}
        <div className="flex items-center gap-2">
          {/* Ubuntu Docker Bundle Button */}
          <button
            onClick={onOpenDeployment}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium transition cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Ubuntu Docker Bundle</span>
            <span className="md:hidden">Docker</span>
          </button>

          {/* Admin Settings Button */}
          <button
            onClick={onOpenBranding}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-300 hover:border-black hover:bg-neutral-50 text-neutral-700 text-xs font-medium transition cursor-pointer"
            title="Branding & System Backup"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Settings</span>
          </button>

          {/* Current User & Logout */}
          <div className="h-4 w-px bg-neutral-200 mx-1 hidden sm:block" />

          {currentUser && (
            <div className="flex items-center gap-2 pl-1">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-semibold text-neutral-900 leading-tight">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-neutral-500 capitalize">
                  {currentUser.role}
                </span>
              </div>
              <button
                onClick={logout}
                className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded hover:bg-neutral-100 transition"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lower Navigation Tabs Bar (Scrollable on small screens) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-neutral-100 overflow-x-auto no-scrollbar">
        <nav className="flex space-x-1 py-1.5 min-w-max">
          {navItems.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-neutral-900 text-white shadow-xs font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
