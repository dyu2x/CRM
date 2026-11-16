import React, { useState } from 'react';
import {
  TrendingUp,
  ShoppingCart,
  PhoneCall,
  Truck,
  Building,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Activity,
  Settings2,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { TabKey } from './Navbar';

interface Props {
  setActiveTab: (tab: TabKey) => void;
}

export const DashboardView: React.FC<Props> = ({ setActiveTab }) => {
  const {
    opportunities,
    orders,
    followUpOrders,
    invoices,
    deliveries,
    revenues,
    farmRegistries,
    contactPeople,
    histories,
    overviewVisibility,
    setOverviewVisibility,
    currentUser,
    rolePermissions,
  } = useCRM();
  const [showOverviewOptions, setShowOverviewOptions] = useState(false);
  const overviewOptions = [{key:'kpis',label:'Summary metrics'},{key:'workflow',label:'PostgreSQL workflow automations'},{key:'followups',label:'Follow-up queue'},{key:'audit',label:'Recent audit trail'}];
  const roleGrants = rolePermissions[currentUser?.role || ''] || [];
  const roleOverviewKeys = roleGrants.filter((item) => item.startsWith('overview:')).map((item) => item.slice('overview:'.length));
  const visible = (key:string) => (roleOverviewKeys.length ? roleOverviewKeys.includes(key) : overviewVisibility.includes(key));

  // Metrics
  const totalRevenue = revenues.reduce((sum, r) => sum + Number(r.revenue_amount || 0), 0);
  const pendingFollowUps = followUpOrders.filter((f) => f.status === 'Scheduled' || f.status === 'Call Back Later').length;
  const activeOrders = orders.filter((order) => (order.status || 'Pending') !== 'Order Complete').length;
  const totalFarms = farmRegistries.length;
  const deliveredCount = deliveries.filter((d) => d.status === 'Delivered').length;
  const pendingDeliveries = deliveries.filter((d) => d.status === 'Pending' || d.status === 'Out for Delivery').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-end relative"><button onClick={()=>setShowOverviewOptions(v=>!v)} className="inline-flex items-center gap-2 px-3 py-2 border border-neutral-300 rounded-md bg-white text-xs font-medium hover:border-neutral-500"><Settings2 className="w-3.5 h-3.5"/>Customize Overview</button>{showOverviewOptions&&<div className="absolute right-0 top-10 z-20 w-64 p-3 bg-white border border-neutral-200 rounded-lg shadow-lg space-y-2"><div className="text-xs font-semibold mb-2">Visible sections</div>{overviewOptions.map(option=><label key={option.key} className="flex items-center gap-2 text-xs text-neutral-700"><input type="checkbox" checked={visible(option.key)} onChange={e=>setOverviewVisibility(e.target.checked?[...overviewVisibility,option.key]:overviewVisibility.filter(x=>x!==option.key))}/>{option.label}</label>)}<p className="text-[10px] text-neutral-400 pt-1">Changes are saved to the CRM database.</p></div>}</div>
      {/* KPI Cards Grid */}
      {visible('kpis') && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Realized Revenue */}
        <div className="p-5 bg-white border border-neutral-200 rounded-lg shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Collected Revenue</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded">
              <span className="w-4 h-4 inline-flex items-center justify-center font-semibold leading-none">₱</span>
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-neutral-900 tracking-tight">
            ₱{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            Condition: Delivered &amp; Paid in Full ({revenues.length} settled)
          </p>
        </div>

        {/* Active Orders */}
        <div className="p-5 bg-white border border-neutral-200 rounded-lg shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Orders</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-neutral-900 tracking-tight">
            {activeOrders}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-neutral-500">
            <span>Excludes orders marked Order Complete · Linked to {farmRegistries.length} farm registries</span>
          </div>
        </div>

        {/* Pending Follow-ups */}
        <div className="p-5 bg-white border border-neutral-200 rounded-lg shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Follow-ups</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-neutral-900 tracking-tight">
            {pendingFollowUps}
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            24h verification &amp; inquiries queued
          </p>
        </div>

        {/* Deliveries & Farms */}
        <div className="p-5 bg-white border border-neutral-200 rounded-lg shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Logistics &amp; Farms</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-neutral-900 tracking-tight">
            {deliveredCount} / {deliveries.length}
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            {pendingDeliveries} currently pending or en route
          </p>
        </div>
      </div>}

      {/* Relational Automations Pipeline Banner */}
      {visible('workflow') && <div className="p-5 bg-neutral-900 text-white rounded-lg border border-neutral-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white tracking-wide uppercase">
                Active PostgreSQL-Backed Workflow Automations
              </h3>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              CRM service rules with records and outcomes persisted in PostgreSQL
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-800 text-emerald-400 border border-neutral-700">
              Persistence: PostgreSQL
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-neutral-800/80 rounded border border-neutral-700/60">
            <div className="font-semibold text-neutral-200">1. Contact People &rarr; Farm</div>
            <p className="text-neutral-400 text-[11px] mt-1">
              If farm exists: <code className="text-amber-300">is_point_person=no</code>. If new: sets <code className="text-emerald-300">yes</code> and auto-creates farm registry.
            </p>
          </div>

          <div className="p-3 bg-neutral-800/80 rounded border border-neutral-700/60">
            <div className="font-semibold text-neutral-200">2. Opportunity Accepted</div>
            <p className="text-neutral-400 text-[11px] mt-1">
              Automatically creates an <code className="text-emerald-300">Order Entry</code> with farm name and fish category.
            </p>
          </div>

          <div className="p-3 bg-neutral-800/80 rounded border border-neutral-700/60">
            <div className="font-semibold text-neutral-200">3. Order &rarr; 24h Follow-up</div>
            <p className="text-neutral-400 text-[11px] mt-1">
              Orders auto-queue a <code className="text-blue-300">Scheduled 24h follow-up</code> for verification.
            </p>
          </div>

          <div className="p-3 bg-neutral-800/80 rounded border border-neutral-700/60">
            <div className="font-semibold text-neutral-200">4. Revenue Gate</div>
            <p className="text-neutral-400 text-[11px] mt-1">
              Revenues table strictly gates entries until <code className="text-emerald-300">Delivered &amp; Paid in Full</code>.
            </p>
          </div>
        </div>
      </div>}

      {/* Two Columns: Recent Follow-ups Queue & Recent Audit Trail */}
      {(visible('followups') || visible('audit')) && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Pending Follow-ups */}
        {visible('followups') && <div className="bg-white border border-neutral-200 rounded-lg shadow-2xs p-5">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-neutral-700" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                Follow-ups &amp; Inquiries Queue
              </h4>
            </div>
            <button
              onClick={() => setActiveTab('follow_up_orders')}
              className="text-xs text-neutral-600 hover:text-black font-medium flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {followUpOrders.slice(0, 4).map((fu) => (
              <div
                key={fu.follow_up_orders_id}
                className="p-3 border border-neutral-200 rounded-md hover:border-black/50 transition flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-neutral-900 flex items-center gap-2">
                    <span>{fu.farm_name}</span>
                    <span className="text-[10px] text-neutral-400 font-normal">
                      #{fu.follow_up_orders_id}
                    </span>
                  </div>
                  <div className="text-neutral-500 text-[11px] mt-0.5">
                    Contact: {fu.contact_person_name} &bull; {fu.fish_category} ({fu.quantity.toLocaleString()} pcs)
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded ${
                      fu.status === 'Scheduled'
                        ? 'bg-amber-100 text-amber-800'
                        : fu.status === 'Satisfied'
                        ? 'bg-emerald-100 text-emerald-800'
                        : fu.status === 'Quality Issue Reported'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-neutral-100 text-neutral-800'
                    }`}
                  >
                    {fu.status}
                  </span>
                  <div className="text-[10px] text-neutral-400 mt-1">
                    Agent: {fu.verified_up_by}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>}

        {/* Right: Recent Audit Trail (histories table) */}
        {visible('audit') && <div className="bg-white border border-neutral-200 rounded-lg shadow-2xs p-5">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-neutral-700" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                Recent Audit Trail (histories table)
              </h4>
            </div>
            <button
              onClick={() => setActiveTab('histories')}
              className="text-xs text-neutral-600 hover:text-black font-medium flex items-center gap-1"
            >
              <span>Full Log</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {histories.slice(0, 5).map((log) => (
              <div
                key={log.history_id}
                className="p-2.5 bg-neutral-50 rounded border border-neutral-100 text-xs flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-700">
                    <span className="font-semibold text-neutral-900">{log.entry_table || log.table_name}</span>
                    <span className="text-neutral-400">&bull;</span>
                    <span className="text-neutral-600">{log.field_name || log.modified_field}</span>
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    {log.old_value !== 'None' ? (
                      <>
                        <span className="line-through text-neutral-400">{log.old_value}</span> &rarr;{' '}
                        <span className="font-medium text-neutral-800">{log.new_value}</span>
                      </>
                    ) : (
                      <span className="font-medium text-neutral-800">{log.new_value}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono text-neutral-400">
                    {new Date(log.date_and_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className="text-[10px] text-neutral-600 font-medium">
                    {log.modifiers_name || log.modifying_agent}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>}
      </div>}
    </div>
  );
};
