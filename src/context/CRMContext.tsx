import React, { createContext, useContext, useEffect, useState } from 'react';
import bcrypt from 'bcryptjs';
import {
  Agent,
  ContactPerson,
  CRMBranding,
  Delivery,
  FarmRegistry,
  FollowUpOrder,
  FollowUpStatus,
  HistoryLog,
  Invoice,
  LookupItem,
  MarketPrice,
  Opportunity,
  Order,
  Revenue,
  StatusTableKey,
} from '../types/crm';
import { resolveInvoicePricing } from '../utils/pricing';
import {
  deliveryStatuses as defaultDeliveryStatuses,
  followUpMethods as defaultFollowUpMethods,
  followUpStatuses as defaultFollowUpStatuses,
  initialAgents,
  initialBranding,
  initialContactPeople,
  initialDeliveries,
  initialFarmRegistries,
  initialFollowUpOrders,
  initialHistories,
  initialInvoices,
  initialMarketPrices,
  initialOpportunities,
  initialOrders,
  initialRevenues,
  initialRolePermissions,
  opportunityStatuses as defaultOpportunityStatuses,
  paymentMethods as defaultPaymentMethods,
  paymentStatuses as defaultPaymentStatuses,
  orderStatuses as defaultOrderStatuses,
} from '../data/initialData';


/**
 * Generate a stable, sequential client-side ID for the JSON-backed CRM tables.
 * Older releases used Date.now() values; keep those records intact but exclude
 * timestamp-sized values from the sequence calculation.
 */
function nextSequentialId<T>(rows: T[], key: keyof T): number {
  const maxId = rows.reduce((max, row) => {
    const id = Number(row[key]);
    return Number.isSafeInteger(id) && id > 0 && id < 1_000_000_000_000
      ? Math.max(max, id)
      : max;
  }, 0);
  return maxId + 1;
}

/**
 * Convert legacy timestamp-based audit IDs to a compact sequence.
 * The history array is newest-first, so the oldest record receives ID 1.
 */
function normalizeHistoryIds(rows: HistoryLog[]): HistoryLog[] {
  return [...rows].reverse().map((row, index) => ({
    ...row,
    history_id: index + 1,
  })).reverse();
}

interface CRMContextType {
  // Current Auth Agent
  currentUser: Agent | null;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateMyProfile: (data: { name: string; username: string; email: string; phone: string; address: string; currentPassword?: string; newPassword?: string; avatar_url?: string }) => Promise<{ success: boolean; message?: string }>;
  clearOperationalData: () => Promise<{ success: boolean; message?: string }>;
  overviewVisibility: string[];
  setOverviewVisibility: (items: string[]) => void;

  // Branding
  branding: CRMBranding;
  updateBranding: (newBranding: Partial<CRMBranding>) => void;

  // Data sets
  agents: Agent[];
  marketPrices: MarketPrice[];
  farmRegistries: FarmRegistry[];
  contactPeople: ContactPerson[];
  opportunities: Opportunity[];
  orders: Order[];
  followUpOrders: FollowUpOrder[];
  invoices: Invoice[];
  deliveries: Delivery[];
  revenues: Revenue[];
  histories: HistoryLog[];

  // Admin Configurable Status & Lookup Tables
  opportunityStatuses: LookupItem[];
  followUpStatuses: LookupItem[];
  followUpMethods: LookupItem[];
  deliveryStatuses: LookupItem[];
  paymentStatuses: LookupItem[];
  paymentMethods: LookupItem[];
  orderStatuses: LookupItem[];
  editStatusItem: (tableKey: StatusTableKey, id: number, name: string, description?: string) => void;
  addStatusItem: (tableKey: StatusTableKey, name: string, description?: string) => void;
  deleteStatusItem: (tableKey: StatusTableKey, id: number) => void;
  editMarketPriceItem: (id: number, price: number, unit: 'per piece' | 'per kilo', notes?: string, name?: string, description?: string) => void;
  addMarketPriceItem: (name: string, price: number, unit: 'per piece' | 'per kilo', notes?: string, description?: string) => void;

  // Role Permissions Configuration
  rolePermissions: Record<string, string[]>;
  updateRolePermissions: (role: string, allowedTabs: string[]) => void;
  removeRole: (role: string) => void;

  // Mutators & Automations
  addContactPerson: (contact: Omit<ContactPerson, 'contact_id' | 'date_created'>) => void;
  updateContactPerson: (id: number, contact: Partial<ContactPerson>) => void;

  addFarmRegistry: (farm: Omit<FarmRegistry, 'farm_id' | 'date_created'>) => void;
  updateFarmRegistry: (id: number, farm: Partial<FarmRegistry>) => void;

  addOpportunity: (opp: Omit<Opportunity, 'opportunity_id' | 'date_created'>) => void;
  updateOpportunityStatus: (id: number, newStatus: Opportunity['status'], notes?: string) => void;

  addOrder: (order: Omit<Order, 'order_id' | 'order_date'>) => void;

  updateFollowUpStatus: (id: number, newStatus: FollowUpStatus, notes?: string) => void;
  addFollowUpOrder: (fu: Omit<FollowUpOrder, 'follow_up_orders_id' | 'date_of_inquiry'>) => void;

  createInvoice: (data: {
    follow_up_orders_id?: number;
    order_id?: number;
    official_receipt_id: string;
    farm_name: string;
    contact_person_name: string;
    fish_category: string;
    quantity: number;
    unit_price?: number;
    item_unit?: 'per piece' | 'per kilo';
    discount?: number;
    discount_enabled?: boolean;
    total_price?: number;
    payment_method: string;
    delivery_date?: string;
    notes?: string;
  }) => void;
  updateInvoicePaymentStatus: (invoice_id: number, status: string) => void;

  updateDeliveryRestrictedFields: (
    delivery_id: number,
    updates: {
      status?: Delivery['status'];
      payment_collected_by?: string;
      payment_method?: string;
      fulfillment_accepted_by?: string;
    }
  ) => void;

  addAgent: (agentData: Omit<Agent, 'agent_id' | 'date_started'>) => void;
  updateAgentPassword: (agent_id: number, newPass: string) => void;

  // General edit functions for all entries (makes all entries editable)
  editOpportunity: (id: number, data: Partial<Opportunity>) => void;
  editOrder: (id: number, data: Partial<Order>) => void;
  editFollowUpOrder: (id: number, data: Partial<FollowUpOrder>) => void;
  editInvoice: (id: number, data: Partial<Invoice>) => void;
  editDelivery: (id: number, data: Partial<Delivery>) => void;
  editRevenue: (id: number, data: Partial<Revenue>) => void;
  editFarmRegistry: (id: number, data: Partial<FarmRegistry>) => void;
  editContactPerson: (id: number, data: Partial<ContactPerson>) => void;
  editAgent: (id: number, data: Partial<Agent>) => void;


  // Backup & Reset
  exportAllData: () => string;
  importAllData: (jsonData: string) => Promise<boolean>;
  resetToDefaults: () => void;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

const STORAGE_KEY = 'mesina_crm_state_v1';

export const CRMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load state from local storage or fallback to seed data
  const loadInitial = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading CRM state:', e);
    }
    return {
      branding: initialBranding,
      agents: initialAgents,
      marketPrices: initialMarketPrices,
      farmRegistries: initialFarmRegistries,
      contactPeople: initialContactPeople,
      opportunities: initialOpportunities,
      orders: initialOrders,
      followUpOrders: initialFollowUpOrders,
      invoices: initialInvoices,
      deliveries: initialDeliveries,
      revenues: initialRevenues,
      histories: initialHistories,
      opportunityStatuses: defaultOpportunityStatuses,
      followUpStatuses: defaultFollowUpStatuses,
      followUpMethods: defaultFollowUpMethods,
      deliveryStatuses: defaultDeliveryStatuses,
      paymentStatuses: defaultPaymentStatuses,
      paymentMethods: defaultPaymentMethods,
      orderStatuses: defaultOrderStatuses,
      rolePermissions: initialRolePermissions,
      overviewVisibility: {},
    };
  };

  const initial = loadInitial();

  const [branding, setBranding] = useState<CRMBranding>(initial.branding);
  const [agents, setAgents] = useState<Agent[]>(initial.agents);
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>(initial.marketPrices);
  const [farmRegistries, setFarmRegistries] = useState<FarmRegistry[]>(initial.farmRegistries);
  const [contactPeople, setContactPeople] = useState<ContactPerson[]>(initial.contactPeople);
  const [opportunities, setOpportunities] = useState<Opportunity[]>(initial.opportunities);
  const [orders, setOrders] = useState<Order[]>(initial.orders);
  const [followUpOrders, setFollowUpOrders] = useState<FollowUpOrder[]>(initial.followUpOrders);
  const [invoices, setInvoices] = useState<Invoice[]>(initial.invoices);
  const [deliveries, setDeliveries] = useState<Delivery[]>(initial.deliveries);
  const [revenues, setRevenues] = useState<Revenue[]>(initial.revenues);
  const [histories, setHistories] = useState<HistoryLog[]>(initial.histories);

  // Status & Lookup tables
  const [opportunityStatuses, setOpportunityStatuses] = useState<LookupItem[]>(
    initial.opportunityStatuses || defaultOpportunityStatuses
  );
  const [followUpStatuses, setFollowUpStatuses] = useState<LookupItem[]>(
    initial.followUpStatuses || defaultFollowUpStatuses
  );
  const [followUpMethods, setFollowUpMethods] = useState<LookupItem[]>(
    initial.followUpMethods || defaultFollowUpMethods
  );
  const [deliveryStatuses, setDeliveryStatuses] = useState<LookupItem[]>(
    initial.deliveryStatuses || defaultDeliveryStatuses
  );
  const [paymentStatuses, setPaymentStatuses] = useState<LookupItem[]>(
    initial.paymentStatuses || defaultPaymentStatuses
  );
  const [paymentMethods, setPaymentMethods] = useState<LookupItem[]>(
    initial.paymentMethods || defaultPaymentMethods
  );
  const [orderStatuses, setOrderStatuses] = useState<LookupItem[]>(initial.orderStatuses || defaultOrderStatuses);

  // Role permissions configuration
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>(
    initial.rolePermissions || initialRolePermissions
  );
  const [overviewVisibilityByUser, setOverviewVisibilityByUser] = useState<Record<string, string[]>>(initial.overviewVisibility && !Array.isArray(initial.overviewVisibility) ? initial.overviewVisibility : {});

  const [isHydrated, setIsHydrated] = useState(false);
  const [currentUser, setCurrentUser] = useState<Agent | null>(() => {
    try {
      const savedUser = localStorage.getItem('mesina_crm_user');
      return savedUser && localStorage.getItem('mesina_crm_token') ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const overviewVisibility = overviewVisibilityByUser[currentUser?.username || 'default'] || ['kpis', 'workflow', 'followups', 'audit'];
  const setOverviewVisibility = (items: string[]) => setOverviewVisibilityByUser(prev => ({ ...prev, [currentUser?.username || 'default']: items }));

  // Persist the CRM state through the authenticated PostgreSQL API.
  useEffect(() => {
    const token = localStorage.getItem('mesina_crm_token');
    if (!currentUser || !token || !isHydrated) return;
    const state = { branding, agents, marketPrices, farmRegistries, contactPeople, opportunities, orders, followUpOrders, invoices, deliveries, revenues, histories, opportunityStatuses, followUpStatuses, followUpMethods, deliveryStatuses, paymentStatuses, paymentMethods, orderStatuses, rolePermissions, overviewVisibility: overviewVisibilityByUser };
    const controller = new AbortController();
    fetch('/api/state', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ state }), signal: controller.signal })
      .then(async (response) => { if (response.status === 401) { localStorage.removeItem('mesina_crm_token'); localStorage.removeItem('mesina_crm_user'); setCurrentUser(null); } else if (!response.ok) { const body = await response.json().catch(() => ({})); console.error('PostgreSQL sync failed:', body.error || response.statusText); } })
      .catch((error) => { if (error.name !== 'AbortError') console.error('PostgreSQL sync failed:', error); });
    return () => controller.abort();
  }, [currentUser, isHydrated, branding, agents, marketPrices, farmRegistries, contactPeople, opportunities, orders, followUpOrders, invoices, deliveries, revenues, histories, opportunityStatuses, followUpStatuses, followUpMethods, deliveryStatuses, paymentStatuses, paymentMethods, orderStatuses, rolePermissions, overviewVisibilityByUser]);

  // Restore the latest authorized state from PostgreSQL after a browser refresh.
  useEffect(() => {
    const token = localStorage.getItem('mesina_crm_token');
    if (!token || !currentUser) return;
    fetch('/api/state', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => { if (!r.ok) throw new Error('Session expired'); return r.json(); })
      .then(({ state }) => { if (!state) { setIsHydrated(true); return; } if (state.branding) setBranding(state.branding); if (state.agents) setAgents(state.agents); if (state.marketPrices) setMarketPrices(state.marketPrices); if (state.farmRegistries) setFarmRegistries(state.farmRegistries); if (state.contactPeople) setContactPeople(state.contactPeople); if (state.opportunities) setOpportunities(state.opportunities); if (state.orders) setOrders(state.orders); if (state.followUpOrders) setFollowUpOrders(state.followUpOrders); if (state.invoices) setInvoices(state.invoices); if (state.deliveries) setDeliveries(state.deliveries); if (state.revenues) setRevenues(state.revenues); if (state.histories) setHistories(normalizeHistoryIds(state.histories)); if (state.opportunityStatuses) setOpportunityStatuses(state.opportunityStatuses); if (state.followUpStatuses) setFollowUpStatuses(state.followUpStatuses); if (state.followUpMethods) setFollowUpMethods(state.followUpMethods); if (state.deliveryStatuses) setDeliveryStatuses(state.deliveryStatuses); if (state.paymentStatuses) setPaymentStatuses(state.paymentStatuses); if (state.paymentMethods) setPaymentMethods(state.paymentMethods); if (state.orderStatuses) setOrderStatuses(state.orderStatuses); if (state.rolePermissions) setRolePermissions(state.rolePermissions); if (state.overviewVisibility && !Array.isArray(state.overviewVisibility)) setOverviewVisibilityByUser(state.overviewVisibility); setIsHydrated(true); })
      .catch(() => { localStorage.removeItem('mesina_crm_token'); localStorage.removeItem('mesina_crm_user'); setCurrentUser(null); });
  // Run once when an existing browser session is restored.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh the authenticated profile and role permissions while a session remains open.
  // This makes administrator role changes take effect without forcing agents to sign out.
  useEffect(() => {
    const token = localStorage.getItem('mesina_crm_token');
    if (!token || !currentUser) return;
    let active = true;
    const refreshSession = async () => {
      try {
        const response = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) {
          if (response.status === 401 && active) logout();
          return;
        }
        const { user } = await response.json();
        if (!active) return;
        if (user.role !== currentUser.role || user.name !== currentUser.name || user.status !== currentUser.status) {
          setCurrentUser(user);
          localStorage.setItem('mesina_crm_user', JSON.stringify(user));
          const stateResponse = await fetch('/api/state', { headers: { Authorization: `Bearer ${token}` } });
          if (stateResponse.ok && active) {
            const { state } = await stateResponse.json();
            if (state?.rolePermissions) setRolePermissions(state.rolePermissions);
          }
        }
      } catch { /* A temporary network issue should not end an otherwise valid session. */ }
    };
    const interval = window.setInterval(refreshSession, 10000);
    return () => { active = false; window.clearInterval(interval); };
  }, [currentUser]);

  // Sync browser title and favicon from branding
  useEffect(() => {
    if (branding?.company_name) {
      document.title = `${branding.company_name} CRM`;
    }
    const faviconLink = document.getElementById('dynamic-favicon') as HTMLLinkElement | null;
    if (faviconLink) {
      if (branding?.company_logo && branding.company_logo.trim() !== '') {
        faviconLink.href = branding.company_logo;
      } else {
        const char = (branding?.company_name || 'M').charAt(0).toUpperCase();
        faviconLink.href = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%23000'/><text x='50' y='68' font-size='56' font-family='system-ui, sans-serif' font-weight='bold' text-anchor='middle' fill='%23fff'>${char}</text></svg>`;
      }
    }
  }, [branding]);

  // History Logger: keeps record of all updates of all entries:
  // - entry table
  // - field name
  // - date and time
  // - old value
  // - new value
  // - modifier's name
  const logHistory = (
    tableName: string,
    field: string,
    oldVal: any,
    newVal: any,
    action: HistoryLog['action_type'] = 'UPDATE',
    agentName?: string
  ) => {
    setHistories((prev) => {
      const newLog: HistoryLog = {
        history_id: nextSequentialId(prev, 'history_id'),
        entry_table: tableName,
        field_name: field,
        date_and_time: new Date().toISOString(),
        old_value: String(oldVal !== undefined && oldVal !== null ? oldVal : 'None'),
        new_value: String(newVal !== undefined && newVal !== null ? newVal : 'None'),
        modifiers_name: agentName || currentUser?.name || 'Admin Officer',
        action_type: action,
        table_name: tableName,
        modified_field: field,
        modifying_agent: agentName || currentUser?.name || 'Admin Officer',
      };
      return [newLog, ...prev];
    });
  };

  // Auth Functions
  const login = async (username: string, pass: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password: pass }) });
      const result = await response.json();
      if (!response.ok) return { success: false, message: result.error || 'Unable to sign in.' };
      localStorage.setItem('mesina_crm_token', result.token);
      localStorage.setItem('mesina_crm_user', JSON.stringify(result.user));
      setCurrentUser(result.user);
      const stateResponse = await fetch('/api/state', { headers: { Authorization: `Bearer ${result.token}` } });
      if (!stateResponse.ok) { const error = await stateResponse.json().catch(() => ({})); localStorage.removeItem('mesina_crm_token'); localStorage.removeItem('mesina_crm_user'); setCurrentUser(null); return { success: false, message: error.error || 'Unable to load CRM data.' }; }
      if (stateResponse.ok) {
        const { state } = await stateResponse.json();
        if (!state) setAgents([{ ...result.user, password: '' }]);
        if (state) { if (state.branding) setBranding(state.branding); if (state.agents) setAgents(state.agents); if (state.marketPrices) setMarketPrices(state.marketPrices); if (state.farmRegistries) setFarmRegistries(state.farmRegistries); if (state.contactPeople) setContactPeople(state.contactPeople); if (state.opportunities) setOpportunities(state.opportunities); if (state.orders) setOrders(state.orders); if (state.followUpOrders) setFollowUpOrders(state.followUpOrders); if (state.invoices) setInvoices(state.invoices); if (state.deliveries) setDeliveries(state.deliveries); if (state.revenues) setRevenues(state.revenues); if (state.histories) setHistories(normalizeHistoryIds(state.histories)); if (state.opportunityStatuses) setOpportunityStatuses(state.opportunityStatuses); if (state.followUpStatuses) setFollowUpStatuses(state.followUpStatuses); if (state.followUpMethods) setFollowUpMethods(state.followUpMethods); if (state.deliveryStatuses) setDeliveryStatuses(state.deliveryStatuses); if (state.paymentStatuses) setPaymentStatuses(state.paymentStatuses); if (state.paymentMethods) setPaymentMethods(state.paymentMethods); if (state.orderStatuses) setOrderStatuses(state.orderStatuses); if (state.rolePermissions) setRolePermissions(state.rolePermissions); if (state.overviewVisibility && !Array.isArray(state.overviewVisibility)) setOverviewVisibilityByUser(state.overviewVisibility); }
      }
      setIsHydrated(true);
      return { success: true };
    } catch { return { success: false, message: 'Cannot connect to the CRM server. Check that Docker services are running.' }; }
  };

  const logout = () => {
    const token = localStorage.getItem('mesina_crm_token');
    if (token) fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined);
    setCurrentUser(null);
    setIsHydrated(false);
    localStorage.removeItem('mesina_crm_token');
    localStorage.removeItem('mesina_crm_user');
  };

  const updateMyProfile = async (data: { name: string; username: string; email: string; phone: string; address: string; currentPassword?: string; newPassword?: string; avatar_url?: string }) => {
    const token = localStorage.getItem('mesina_crm_token');
    if (!token) return { success: false, message: 'Your session has expired. Please sign in again.' };
    try {
      const response = await fetch('/api/me', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(data) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return { success: false, message: result.error || 'Unable to update your profile.' };
      setCurrentUser(result.user);
      localStorage.setItem('mesina_crm_user', JSON.stringify(result.user));
      setAgents(prev => prev.map(agent => agent.agent_id === result.user.agent_id ? { ...agent, ...result.user, password: agent.password } : agent));
      return { success: true, message: 'Profile updated successfully.' };
    } catch { return { success: false, message: 'Unable to connect to the CRM server.' }; }
  };

  const clearOperationalData = async () => {
    if (currentUser?.role !== 'Admin') return { success: false, message: 'Administrator access required.' };
    const token = localStorage.getItem('mesina_crm_token');
    try {
      const response = await fetch('/api/admin/clear-operational-data', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ confirmation: 'CLEAR CRM DATA' }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return { success: false, message: result.error || 'Unable to clear CRM data.' };
      setMarketPrices([]); setFarmRegistries([]); setContactPeople([]); setOpportunities([]); setOrders([]); setFollowUpOrders([]); setInvoices([]); setDeliveries([]); setRevenues([]); setHistories([]);
      setOverviewVisibilityByUser({});
      return { success: true, message: result.message || 'CRM tables cleared.' };
    } catch { return { success: false, message: 'Unable to connect to the CRM server.' }; }
  };

  const updateBranding = (newBranding: Partial<CRMBranding>) => {
    setBranding((prev) => {
      const updated = { ...prev, ...newBranding, updated_at: new Date().toISOString() };
      logHistory('crm_branding', 'branding_settings', prev.company_name, updated.company_name, 'UPDATE');
      return updated;
    });
  };

  // 1. Contact Person Automation:
  // "check if farm name already exist.
  // if yes, set is_point_person? field will be set to 'no'
  // if no, set is_point_person? field will be set to 'yes' and autocreate a new farm_registries entry
  // is_active default yes"
  const addContactPerson = (data: Omit<ContactPerson, 'contact_id' | 'date_created'>) => {
    const existingFarm = farmRegistries.find(
      (f) => f.farm_name.trim().toLowerCase() === data.farm_name.trim().toLowerCase()
    );

    const isPointPerson: 'yes' | 'no' = data.is_point_person || (existingFarm ? 'no' : 'yes');
    const newContactId = nextSequentialId(contactPeople, 'contact_id');

    const newContact: ContactPerson = {
      ...data,
      contact_id: newContactId,
      is_point_person: isPointPerson,
      is_active: data.is_active || 'yes',
      date_created: new Date().toISOString(),
      assigned_agent: data.assigned_agent || currentUser?.name || 'Admin Officer',
    };

    setContactPeople((prev) => [newContact, ...prev]);
    logHistory('contact_people', 'contact_id', 'None', `${newContact.contact_person_name} (${newContact.farm_name})`, 'INSERT');

    // If farm did not exist, auto-create a new farm_registries entry
    if (!existingFarm) {
      const newFarm: FarmRegistry = {
        farm_id: nextSequentialId(farmRegistries, 'farm_id'),
        farm_name: data.farm_name.trim(),
        farm_address: 'Address pending registration',
        coordinates_lat_lng: '14.5995, 120.9842',
        designated_point_person: data.contact_person_name,
        farm_phone: data.phone_number,
        farm_email: data.email_address || '',
        date_created: new Date().toISOString(),
        assigned_agent: data.assigned_agent || currentUser?.name || 'Admin Officer',
      };
      setFarmRegistries((prev) => [newFarm, ...prev]);
      logHistory(
        'farm_registries',
        'farm_name',
        'None',
        newFarm.farm_name,
        'AUTOMATION',
        'Auto-created from Contact Person'
      );
    }
  };

  const updateContactPerson = (id: number, updates: Partial<ContactPerson>) => {
    setContactPeople((prev) =>
      prev.map((c) => {
        if (c.contact_id === id) {
          logHistory('contact_people', 'multiple_fields', c.contact_person_name, updates.contact_person_name || c.contact_person_name, 'UPDATE');
          return { ...c, ...updates };
        }
        return c;
      })
    );
  };

  const addFarmRegistry = (farmData: Omit<FarmRegistry, 'farm_id' | 'date_created'>) => {
    const newFarm: FarmRegistry = {
      ...farmData,
      farm_id: nextSequentialId(farmRegistries, 'farm_id'),
      date_created: new Date().toISOString(),
    };
    setFarmRegistries((prev) => [newFarm, ...prev]);
    logHistory('farm_registries', 'farm_id', 'None', newFarm.farm_name, 'INSERT');
  };

  const updateFarmRegistry = (id: number, updates: Partial<FarmRegistry>) => {
    setFarmRegistries((prev) =>
      prev.map((f) => {
        if (f.farm_id === id) {
          logHistory('farm_registries', 'farm_name', f.farm_name, updates.farm_name || f.farm_name, 'UPDATE');
          return { ...f, ...updates };
        }
        return f;
      })
    );
  };

  // 2. Order Creation & 24h Follow-up Automation
  // "once created, need to wait for 24hours and will auto create a new follow_up_orders entry for verification and initial state is 'Scheduled'
  // contact_person field: if name exist, continue with the order; if not, create new contact_people entry"
  const addOrder = (orderData: Omit<Order, 'order_id' | 'order_date'>) => {
    const orderId = nextSequentialId(orders, 'order_id');
    const newOrder: Order = {
      ...orderData,
      order_id: orderId,
      status: orderData.status || defaultOrderStatuses[0]?.name || 'Pending',
      order_date: new Date().toISOString(),
    };

    // Check if contact_person exists
    const existingContact = contactPeople.find(
      (c) => c.contact_person_name.trim().toLowerCase() === orderData.contact_person.trim().toLowerCase()
    );

    let contactPhone = '+63 917 000 0000';
    let contactEmail = '';

    if (!existingContact) {
      // Auto-create new contact_people entry
      const newContact: ContactPerson = {
        contact_id: nextSequentialId(contactPeople, 'contact_id'),
        contact_person_name: orderData.contact_person,
        farm_name: orderData.farm_name,
        is_point_person: 'no',
        phone_number: '+63 917 000 0000',
        is_active: 'yes',
        date_created: new Date().toISOString(),
        assigned_agent: orderData.booking_agent || currentUser?.name || 'Admin Officer',
      };
      setContactPeople((prev) => [newContact, ...prev]);
      logHistory('contact_people', 'contact_person_name', 'None', newContact.contact_person_name, 'AUTOMATION', 'Auto-created from Order');
    } else {
      contactPhone = existingContact.phone_number;
      contactEmail = existingContact.email_address || '';
    }

    setOrders((prev) => [newOrder, ...prev]);
    logHistory('orders', 'order_id', 'None', `#${orderId} (${newOrder.farm_name})`, 'INSERT');

    // Auto-create follow_up_orders for verification with initial state "Scheduled" (24h follow up)
    const followUpId = nextSequentialId(followUpOrders, 'follow_up_orders_id');
    const newFollowUp: FollowUpOrder = {
      follow_up_orders_id: followUpId,
      order_id: orderId,
      opportunity_id: orderData.opportunity_id,
      farm_name: orderData.farm_name,
      contact_person_name: orderData.contact_person,
      contact_number: contactPhone,
      contact_email: contactEmail,
      date_of_inquiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h queued follow-up
      fish_category: orderData.fish_category,
      quantity: orderData.quantity,
      status: 'Scheduled',
      verified_up_by: orderData.booking_agent || currentUser?.name || 'Admin Officer',
      notes: 'Automated 24h verification follow-up queued in system upon Order placement.',
    };

    setFollowUpOrders((prev) => [newFollowUp, ...prev]);
    logHistory('follow_up_orders', 'follow_up_orders_id', 'None', `#${followUpId} (Scheduled 24h)`, 'AUTOMATION');
  };

  // 3. Opportunities Table Automations:
  // "Accepted -> Automatically creates an Order Entry
  //  Pending/Undecided -> Potential Buy. Auto-create a follow up inquiries entry. initially tagged as 'Scheduled'
  //  Negotiating -> Under negotiation state
  //  Cancelled -> no actions required. close entry"
  const addOpportunity = (oppData: Omit<Opportunity, 'opportunity_id' | 'date_created'>) => {
    const oppId = nextSequentialId(opportunities, 'opportunity_id');
    const newOpp: Opportunity = {
      ...oppData,
      opportunity_id: oppId,
      date_created: new Date().toISOString(),
    };

    setOpportunities((prev) => [newOpp, ...prev]);
    logHistory('opportunities', 'opportunity_id', 'None', `#${oppId} (${newOpp.contact_person})`, 'INSERT');

    // Trigger automations based on initial status
    handleOpportunityStatusAction(newOpp, newOpp.status);
  };

  const updateOpportunityStatus = (id: number, newStatus: Opportunity['status'], notes?: string) => {
    const opp = opportunities.find((o) => o.opportunity_id === id);
    if (!opp) return;

    const oldStatus = opp.status;
    const updatedOpp = { ...opp, status: newStatus, notes: notes || opp.notes };

    setOpportunities((prev) => prev.map((o) => (o.opportunity_id === id ? updatedOpp : o)));
    logHistory('opportunities', 'status', oldStatus, newStatus, 'UPDATE');

    handleOpportunityStatusAction(updatedOpp, newStatus);
  };

  const handleOpportunityStatusAction = (opp: Opportunity, status: Opportunity['status']) => {
    // Find associated contact person and farm
    const contact = contactPeople.find((c) => c.contact_id === opp.contact_id) ||
      contactPeople.find((c) => c.contact_person_name === opp.contact_person);
    const farmName = contact ? contact.farm_name : 'Pending Farm Association';

    if (status === 'Accepted') {
      // "Accepted: Automatically creates an Order Entry"
      const defaultDeliveryDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      addOrder({
        opportunity_id: opp.opportunity_id,
        farm_name: farmName,
        contact_person: opp.contact_person,
        fish_category: opp.fish_category,
        quantity: opp.quantity,
        delivery_date: defaultDeliveryDate,
        booking_agent: opp.contacted_by || currentUser?.name || 'Admin Officer',
        notes: `Autocreated from Opportunity #${opp.opportunity_id} (Status: Accepted)`,
      });
    } else if (status === 'Pending/Undecided') {
      // "Pending/Undecided: Potential Buy. Auto-create a follow up inquiries entry. initially tagged as 'Scheduled'"
      const newFollowUp: FollowUpOrder = {
        follow_up_orders_id: nextSequentialId(followUpOrders, 'follow_up_orders_id'),
        opportunity_id: opp.opportunity_id,
        farm_name: farmName,
        contact_person_name: opp.contact_person,
        contact_number: opp.phone,
        contact_email: contact?.email_address || '',
        date_of_inquiry: new Date().toISOString(),
        fish_category: opp.fish_category,
        quantity: opp.quantity,
        status: 'Scheduled',
        verified_up_by: opp.contacted_by || currentUser?.name || 'Admin Officer',
        notes: `Potential buy inquiry follow-up queued from Opportunity #${opp.opportunity_id}.`,
      };
      setFollowUpOrders((prev) => [newFollowUp, ...prev]);
      logHistory('follow_up_orders', 'status', 'None', 'Scheduled (Potential Buy)', 'AUTOMATION');
    }
  };

  // 4. Follow Up Orders Automations:
  // "Continue with an Order: automatically creates an Order Entry"
  const addFollowUpOrder = (fuData: Omit<FollowUpOrder, 'follow_up_orders_id' | 'date_of_inquiry'>) => {
    const id = nextSequentialId(followUpOrders, 'follow_up_orders_id');
    const newFU: FollowUpOrder = {
      ...fuData,
      delivery_date: fuData.delivery_date || (fuData.order_id ? orders.find(o => o.order_id === fuData.order_id)?.delivery_date : undefined),
      follow_up_orders_id: id,
      date_of_inquiry: new Date().toISOString(),
    };
    setFollowUpOrders((prev) => [newFU, ...prev]);
    logHistory('follow_up_orders', 'follow_up_orders_id', 'None', `#${id} (${newFU.farm_name})`, 'INSERT');

    if (newFU.status === 'Continue with an Order') {
      handleContinueWithOrder(newFU);
    }
  };

  const updateFollowUpStatus = (id: number, newStatus: FollowUpStatus, notes?: string) => {
    const fu = followUpOrders.find((f) => f.follow_up_orders_id === id);
    if (!fu) return;

    const oldStatus = fu.status;
    const updated = { ...fu, status: newStatus, notes: notes || fu.notes };

    setFollowUpOrders((prev) => prev.map((f) => (f.follow_up_orders_id === id ? updated : f)));
    logHistory('follow_up_orders', 'status', oldStatus, newStatus, 'UPDATE');

    if (newStatus === 'Continue with an Order') {
      handleContinueWithOrder(updated);
    }
  };

  const handleContinueWithOrder = (fu: FollowUpOrder) => {
    const defaultDeliveryDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    addOrder({
      opportunity_id: fu.opportunity_id,
      farm_name: fu.farm_name,
      contact_person: fu.contact_person_name,
      fish_category: fu.fish_category,
      quantity: fu.quantity,
      delivery_date: defaultDeliveryDate,
      booking_agent: fu.verified_up_by || currentUser?.name || 'Admin Officer',
      notes: `Autocreated from Follow-up #${fu.follow_up_orders_id} (Continue with an Order)`,
    });
  };

  // 5. Invoices & Auto Delivery Creation
  // Invoices capture the exact commercial terms agreed on the originating order.
  // Market Prices are only a fallback for invoices created without a linked order.
  const createInvoice = (data: {
    follow_up_orders_id?: number;
    order_id?: number;
    official_receipt_id: string;
    farm_name: string;
    contact_person_name: string;
    fish_category: string;
    quantity: number;
    unit_price?: number;
    item_unit?: 'per piece' | 'per kilo';
    discount?: number;
    discount_enabled?: boolean;
    total_price?: number;
    payment_method: string;
    delivery_date?: string;
    notes?: string;
  }) => {
    const followUp = data.follow_up_orders_id ? followUpOrders.find((f) => f.follow_up_orders_id === data.follow_up_orders_id) : undefined;
    const linkedOrderId = data.order_id ?? followUp?.order_id;
    const sourceOrder = linkedOrderId ? orders.find((o) => o.order_id === linkedOrderId) : undefined;
    if (linkedOrderId && !sourceOrder) { alert('The linked order could not be found. Invoice creation was cancelled.'); return; }
    const fishCategory = sourceOrder?.fish_category ?? data.fish_category;
    const priceLookup = marketPrices.find((m) => m.name === fishCategory);
    if (!sourceOrder && !priceLookup && data.unit_price === undefined) return;
    let resolvedPricing;
    try {
      resolvedPricing = resolveInvoicePricing({
        quantity: data.quantity,
        unitPrice: data.unit_price,
        unit: data.item_unit,
        discount: data.discount,
        discountEnabled: data.discount_enabled,
        totalPrice: data.total_price,
        order: sourceOrder,
        marketPrice: priceLookup ? { price: priceLookup.price, unit: priceLookup.unit } : undefined,
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to calculate invoice pricing.');
      return;
    }
    const { quantity: invoiceQuantity, unitPrice, unit: itemUnit, subtotal, discount: discountAmount, discountEnabled, total: totalPrice } = resolvedPricing;
    const pricingSnapshot = { unit_price: unitPrice, unit: itemUnit, quantity: invoiceQuantity, subtotal, discount: discountAmount, discount_enabled: discountEnabled, total: totalPrice, captured_at: new Date().toISOString(), source: sourceOrder ? 'order' as const : followUp ? 'follow_up' as const : 'market_price' as const };
    const invoiceId = nextSequentialId(invoices, 'invoice_id');
    const orId = data.official_receipt_id.trim();
    if (!orId) return;

    const newInvoice: Invoice = {
      invoice_id: invoiceId,
      follow_up_orders_id: data.follow_up_orders_id,
      order_id: linkedOrderId,
      official_receipt_id: orId,
      farm_name: sourceOrder?.farm_name ?? data.farm_name,
      contact_person_name: sourceOrder?.contact_person ?? data.contact_person_name,
      fish_category: fishCategory,
      quantity: invoiceQuantity,
      item_price_per_piece: unitPrice,
      item_unit: itemUnit,
      subtotal: Number(subtotal.toFixed(2)),
      discount: Number(discountAmount.toFixed(2)),
      discount_enabled: discountEnabled,
      pricing_snapshot: pricingSnapshot,
      total_price: totalPrice,
      or_issued_by: currentUser?.name || 'Admin Officer',
      payment_received_by: currentUser?.name || '',
      payment_method: data.payment_method,
      payment_status: 'Pending',
      date_created: new Date().toISOString(),
      delivery_date: data.delivery_date || (data.follow_up_orders_id ? followUpOrders.find(f => f.follow_up_orders_id === data.follow_up_orders_id)?.delivery_date : undefined) || (data.order_id ? orders.find(o => o.order_id === data.order_id)?.delivery_date : undefined),
      notes: data.notes || 'Official tax invoice issued.',
    };

    setInvoices((prev) => [newInvoice, ...prev]);
    logHistory('invoices', 'invoice_id', 'None', `${orId} (₱${totalPrice.toLocaleString()})`, 'INSERT');

    // Automatically create a corresponding Delivery entry
    // "Deliveries table entries will depend on fk (invoices.invoice_id)
    //  entries will depend on farm_name info: contact_person_name, farm_address, farm_phone, farm_gps_coordinates"
    const farm = farmRegistries.find(
      (f) => f.farm_name.trim().toLowerCase() === data.farm_name.trim().toLowerCase()
    );

    const deliveryId = nextSequentialId(deliveries, 'delivery_id');
    const deliveryDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const newDelivery: Delivery = {
      delivery_id: deliveryId,
      invoice_id: invoiceId,
      farm_name: data.farm_name,
      farm_address: farm?.farm_address || 'Poblacion Fish Farm Site',
      farm_phone: farm?.farm_phone || '+63 917 000 0000',
      farm_gps_coordinates: farm?.coordinates_lat_lng || '14.8321, 120.7335',
      delivered_by: 'Ramon Bautista',
      status: 'Pending',
      payment_collected_by: 'Ramon Bautista',
      payment_method: data.payment_method,
      payment_status: newInvoice.payment_status as Delivery['payment_status'],
      fulfillment_accepted_by: data.contact_person_name,
      landmarks: (data.follow_up_orders_id ? followUpOrders.find(f => f.follow_up_orders_id === data.follow_up_orders_id)?.landmarks : undefined) || (data.order_id ? orders.find(o => o.order_id === data.order_id)?.landmarks : undefined) || (data.order_id ? followUpOrders.find(f => f.order_id === data.order_id)?.landmarks : undefined) || '',
      date_created: new Date().toISOString(),
      delivery_date: deliveryDate,
    };

    setDeliveries((prev) => [newDelivery, ...prev]);
    logHistory('deliveries', 'delivery_id', 'None', `#${deliveryId} for Invoice ${orId}`, 'AUTOMATION');
  };

  const updateInvoicePaymentStatus = (invoice_id: number, status: string) => {
    const invoice = invoices.find((inv) => inv.invoice_id === invoice_id);
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.invoice_id === invoice_id) {
          logHistory('invoices', 'payment_status', inv.payment_status, status, 'UPDATE');
          return { ...inv, payment_status: status };
        }
        return inv;
      })
    );
    setDeliveries((prev) => prev.map((delivery) =>
      delivery.invoice_id === invoice_id
        ? { ...delivery, payment_status: status as Delivery['payment_status'] }
        : delivery
    ));
    if (status === 'Paid in Full' && invoice) {
      const linkedOrderId = invoice.order_id
        ?? (invoice.follow_up_orders_id
          ? followUpOrders.find((fu) => fu.follow_up_orders_id === invoice.follow_up_orders_id)?.order_id
          : undefined);
      if (linkedOrderId) {
        setOrders((prev) => prev.map((order) => {
          if (order.order_id !== linkedOrderId || order.status === 'Order Complete') return order;
          logHistory('orders', 'status', order.status || 'Pending', 'Order Complete', 'AUTOMATION');
          return { ...order, status: 'Order Complete' };
        }));
      }
    }
  };

  // 6. Deliveries Table:
  // "can only update the following fields:
  //    - delivery status
  //    - payment collected by
  //    - payment method
  //    - Fulfillment accepted by"
  // "revenues table: only count as a revenue once the delivery status is set to Delivered AND Paid in Full"
  const updateDeliveryRestrictedFields = (
    delivery_id: number,
    updates: {
      status?: Delivery['status'];
      payment_collected_by?: string;
      payment_method?: string;
      fulfillment_accepted_by?: string;
    }
  ) => {
    setDeliveries((prev) =>
      prev.map((d) => {
        if (d.delivery_id === delivery_id) {
          const newStatus = updates.status !== undefined ? updates.status : d.status;
          const newPaymentCollectedBy =
            updates.payment_collected_by !== undefined ? updates.payment_collected_by : d.payment_collected_by;
          const newPaymentMethod =
            updates.payment_method !== undefined ? updates.payment_method : d.payment_method;
          const newFulfillmentAccepted =
            updates.fulfillment_accepted_by !== undefined
              ? updates.fulfillment_accepted_by
              : d.fulfillment_accepted_by;

          const updatedDelivery: Delivery = {
            ...d,
            status: newStatus,
            payment_collected_by: newPaymentCollectedBy,
            payment_method: newPaymentMethod,
            fulfillment_accepted_by: newFulfillmentAccepted,
            delivered_date: newStatus === 'Delivered' ? (d.delivered_date || new Date().toISOString()) : d.delivered_date,
          };

          // If delivery is delivered, synchronize payment status if COD collected
          if (newStatus === 'Delivered') {
            updatedDelivery.payment_status = 'Paid in Full';
            // Also update matching invoice payment status
            setInvoices((invs) =>
              invs.map((inv) =>
                inv.invoice_id === d.invoice_id ? { ...inv, payment_status: 'Paid in Full' } : inv
              )
            );
          }

          logHistory('deliveries', 'status', d.status, newStatus, 'UPDATE');

          // Check Revenue condition:
          // "only count as a revenue once the delivery status is set to Delivered AND Paid in Full"
          if (updatedDelivery.payment_status === 'Paid in Full') {
            const invoice = invoices.find((inv) => inv.invoice_id === updatedDelivery.invoice_id);
            const linkedOrderId = invoice?.order_id
              ?? (invoice?.follow_up_orders_id
                ? followUpOrders.find((fu) => fu.follow_up_orders_id === invoice.follow_up_orders_id)?.order_id
                : undefined);
            if (linkedOrderId) {
              setOrders((prevOrders) => prevOrders.map((order) => {
                if (order.order_id !== linkedOrderId || order.status === 'Order Complete') return order;
                logHistory('orders', 'status', order.status || 'Pending', 'Order Complete', 'AUTOMATION');
                return { ...order, status: 'Order Complete' };
              }));
            }
          }

          if (updatedDelivery.status === 'Delivered' && updatedDelivery.payment_status === 'Paid in Full') {
            triggerRevenueEntry(updatedDelivery);
          }

          return updatedDelivery;
        }
        return d;
      })
    );
  };

  const triggerRevenueEntry = (delivery: Delivery) => {
    // Check if revenue already registered for this delivery
    const existingRev = revenues.find((r) => r.delivery_id === delivery.delivery_id);
    if (existingRev) return;

    const invoice = invoices.find((inv) => inv.invoice_id === delivery.invoice_id);
    const amount = invoice ? invoice.total_price : 0;

    const newRevenue: Revenue = {
      revenue_id: nextSequentialId(revenues, 'revenue_id'),
      invoice_id: delivery.invoice_id,
      delivery_id: delivery.delivery_id,
      delivery_status: 'Delivered',
      payment_collected_by: delivery.payment_collected_by,
      revenue_amount: amount,
      payment_method: delivery.payment_method,
      delivered_date: delivery.delivered_date || new Date().toISOString(),
    };

    setRevenues((prev) => [newRevenue, ...prev]);
    logHistory(
      'revenues',
      'revenue_id',
      'None',
      `₱${amount.toLocaleString()} (Invoice #${delivery.invoice_id})`,
      'AUTOMATION',
      'Triggered upon Delivered & Paid in Full'
    );
  };

  // Agents & Password management (bcrypt)
  const addAgent = (agentData: Omit<Agent, 'agent_id' | 'date_started'>) => {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(agentData.password, salt);

    const newAgent: Agent = {
      ...agentData,
      // Managers receive timestamp-sized IDs because their view intentionally excludes
      // privileged accounts whose sequential IDs must remain hidden.
      agent_id: String(currentUser?.role || '').trim().toLowerCase() === 'manager' ? Date.now() : nextSequentialId(agents, 'agent_id'),
      password: hashedPassword,
      date_started: new Date().toISOString(),
    };

    setAgents((prev) => [...prev, newAgent]);
    logHistory('agents', 'agent_id', 'None', `${newAgent.name} (${newAgent.username})`, 'INSERT');
  };

  const updateAgentPassword = (agent_id: number, newPass: string) => {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(newPass, salt);

    setAgents((prev) =>
      prev.map((a) => {
        if (a.agent_id === agent_id) {
          logHistory('agents', 'password', '********', '******** (bcrypt)', 'UPDATE');
          return { ...a, password: hashedPassword };
        }
        return a;
      })
    );
  };

  // -------------------------------------------------------------
  // Comprehensive Edit Functions (Make All Entries Editable)
  // Each change across any field is recorded in the histories table:
  // - entry table
  // - field name
  // - date and time
  // - old value
  // - new value
  // - modifier's name
  // -------------------------------------------------------------

  const editOpportunity = (id: number, data: Partial<Opportunity>) => {
    setOpportunities((prev) =>
      prev.map((item) => {
        if (item.opportunity_id === id) {
          const oldStatus = item.status;
          Object.keys(data).forEach((key) => {
            const k = key as keyof Opportunity;
            if (data[k] !== undefined && data[k] !== item[k]) {
              logHistory('opportunities', k, String(item[k] ?? ''), String(data[k] ?? ''), 'UPDATE');
            }
          });
          const updated = { ...item, ...data };
          if (data.delivery_date !== undefined) {
            setInvoices(prev => prev.map(inv => inv.follow_up_orders_id === id ? { ...inv, delivery_date: data.delivery_date } : inv));
            const invIds = invoices.filter(inv => inv.follow_up_orders_id === id).map(inv => inv.invoice_id);
            setDeliveries(prev => prev.map(d => invIds.includes(d.invoice_id) ? { ...d, delivery_date: data.delivery_date } : d));
          }
          if (data.status && data.status !== oldStatus) {
            handleOpportunityStatusAction(updated, data.status);
          }
          return updated;
        }
        return item;
      })
    );
  };

  const editOrder = (id: number, data: Partial<Order>) => {
    setOrders((prev) =>
      prev.map((item) => {
        if (item.order_id === id) {
          Object.keys(data).forEach((key) => {
            const k = key as keyof Order;
            if (data[k] !== undefined && data[k] !== item[k]) {
              logHistory('orders', k, String(item[k] ?? ''), String(data[k] ?? ''), 'UPDATE');
            }
          });
          const updated = { ...item, ...data };
          if (data.delivery_date !== undefined) {
            setFollowUpOrders(prev => prev.map(f => f.order_id === id ? { ...f, delivery_date: data.delivery_date } : f));
            const fuIds = followUpOrders.filter(f => f.order_id === id).map(f => f.follow_up_orders_id);
            setInvoices(prev => prev.map(inv => inv.order_id === id || fuIds.includes(inv.follow_up_orders_id || -1) ? { ...inv, delivery_date: data.delivery_date } : inv));
            const invoiceIds = invoices.filter(inv => inv.order_id === id || fuIds.includes(inv.follow_up_orders_id || -1)).map(inv => inv.invoice_id);
            setDeliveries(prev => prev.map(d => invoiceIds.includes(d.invoice_id) ? { ...d, delivery_date: data.delivery_date } : d));
          }
          return updated;
        }
        return item;
      })
    );
  };

  const editFollowUpOrder = (id: number, data: Partial<FollowUpOrder>) => {
    setFollowUpOrders((prev) =>
      prev.map((item) => {
        if (item.follow_up_orders_id === id) {
          const oldStatus = item.status;
          Object.keys(data).forEach((key) => {
            const k = key as keyof FollowUpOrder;
            if (data[k] !== undefined && data[k] !== item[k]) {
              logHistory('follow_up_orders', k, String(item[k] ?? ''), String(data[k] ?? ''), 'UPDATE');
            }
          });
          const updated = { ...item, ...data };
          if (data.delivery_date !== undefined) {
            setInvoices(prev => prev.map(inv => inv.follow_up_orders_id === id ? { ...inv, delivery_date: data.delivery_date } : inv));
            const linkedInvoiceIds = invoices.filter(inv => inv.follow_up_orders_id === id).map(inv => inv.invoice_id);
            setDeliveries(prev => prev.map(d => linkedInvoiceIds.includes(d.invoice_id) ? { ...d, delivery_date: data.delivery_date } : d));
          }
          if (data.status && data.status !== oldStatus && data.status === 'Continue with an Order') {
            handleContinueWithOrder(updated);
          }
          return updated;
        }
        return item;
      })
    );
  };

  const editInvoice = (id: number, data: Partial<Invoice>) => {
    setInvoices((prev) =>
      prev.map((item) => {
        if (item.invoice_id === id) {
          Object.keys(data).forEach((key) => {
            const k = key as keyof Invoice;
            if (data[k] !== undefined && data[k] !== item[k]) {
              logHistory('invoices', k, String(item[k] ?? ''), String(data[k] ?? ''), 'UPDATE');
            }
          });
          const updated = { ...item, ...data };
          if (data.delivery_date !== undefined) setDeliveries(prev => prev.map(d => d.invoice_id === id ? { ...d, delivery_date: data.delivery_date } : d));
          // If quantity or price changed, update total price
          if (data.quantity !== undefined || data.item_price_per_piece !== undefined) {
            updated.subtotal = Number((updated.quantity * updated.item_price_per_piece).toFixed(2));
            updated.total_price = Math.max(0, Number((updated.subtotal - (updated.discount_enabled ? Number(updated.discount || 0) : 0)).toFixed(2)));
            updated.pricing_snapshot = { unit_price: updated.item_price_per_piece, unit: updated.item_unit, quantity: updated.quantity, subtotal: updated.subtotal, discount: updated.discount_enabled ? Number(updated.discount || 0) : 0, discount_enabled: Boolean(updated.discount_enabled), total: updated.total_price, captured_at: new Date().toISOString(), source: item.pricing_snapshot?.source ?? (updated.follow_up_orders_id ? 'follow_up' : updated.order_id ? 'order' : 'market_price') }; 
          }
          return updated;
        }
        return item;
      })
    );
  };

  const editDelivery = (id: number, data: Partial<Delivery>) => {
    setDeliveries((prev) =>
      prev.map((item) => {
        if (item.delivery_id === id) {
          Object.keys(data).forEach((key) => {
            const k = key as keyof Delivery;
            if (data[k] !== undefined && data[k] !== item[k]) {
              logHistory('deliveries', k, String(item[k] ?? ''), String(data[k] ?? ''), 'UPDATE');
            }
          });
          const updated = { ...item, ...data };
          // A fully paid delivery completes its linked order, independent of delivery status.
          if (updated.payment_status === 'Paid in Full') {
            const invoice = invoices.find((inv) => inv.invoice_id === updated.invoice_id);
            const linkedOrderId = invoice?.order_id
              ?? (invoice?.follow_up_orders_id
                ? followUpOrders.find((fu) => fu.follow_up_orders_id === invoice.follow_up_orders_id)?.order_id
                : undefined);
            if (linkedOrderId) {
              setOrders((prevOrders) => prevOrders.map((order) => {
                if (order.order_id !== linkedOrderId || order.status === 'Order Complete') return order;
                logHistory('orders', 'status', order.status || 'Pending', 'Order Complete', 'AUTOMATION');
                return { ...order, status: 'Order Complete' };
              }));
            }
          }
          // Revenue still requires both Delivered and Paid in Full.
          if (updated.status === 'Delivered' && updated.payment_status === 'Paid in Full') {
            triggerRevenueEntry(updated);
          }
          return updated;
        }
        return item;
      })
    );
  };

  const editRevenue = (id: number, data: Partial<Revenue>) => {
    setRevenues((prev) =>
      prev.map((item) => {
        if (item.revenue_id === id) {
          Object.keys(data).forEach((key) => {
            const k = key as keyof Revenue;
            if (data[k] !== undefined && data[k] !== item[k]) {
              logHistory('revenues', k, String(item[k] ?? ''), String(data[k] ?? ''), 'UPDATE');
            }
          });
          return { ...item, ...data };
        }
        return item;
      })
    );
  };

  const editFarmRegistry = (id: number, data: Partial<FarmRegistry>) => {
    setFarmRegistries((prev) =>
      prev.map((item) => {
        if (item.farm_id === id) {
          Object.keys(data).forEach((key) => {
            const k = key as keyof FarmRegistry;
            if (data[k] !== undefined && data[k] !== item[k]) {
              logHistory('farm_registries', k, String(item[k] ?? ''), String(data[k] ?? ''), 'UPDATE');
            }
          });
          return { ...item, ...data };
        }
        return item;
      })
    );
  };

  const editContactPerson = (id: number, data: Partial<ContactPerson>) => {
    setContactPeople((prev) =>
      prev.map((item) => {
        if (item.contact_id === id) {
          Object.keys(data).forEach((key) => {
            const k = key as keyof ContactPerson;
            if (data[k] !== undefined && data[k] !== item[k]) {
              logHistory('contact_people', k, String(item[k] ?? ''), String(data[k] ?? ''), 'UPDATE');
            }
          });
          return { ...item, ...data };
        }
        return item;
      })
    );
  };

  const editAgent = (id: number, data: Partial<Agent>) => {
    setAgents((prev) =>
      prev.map((item) => {
        if (item.agent_id === id) {
          const finalData = { ...data };
          if (data.password && data.password.trim() !== '' && !data.password.startsWith('$2a$')) {
            const salt = bcrypt.genSaltSync(10);
            finalData.password = bcrypt.hashSync(data.password, salt);
            logHistory('agents', 'password', '********', '******** (bcrypt)', 'UPDATE');
          }
          Object.keys(finalData).forEach((key) => {
            const k = key as keyof Agent;
            if (k !== 'password' && finalData[k] !== undefined && finalData[k] !== item[k]) {
              logHistory('agents', k, String(item[k] ?? ''), String(finalData[k] ?? ''), 'UPDATE');
            }
          });
          return { ...item, ...finalData };
        }
        return item;
      })
    );
  };

  const editStatusItem = (tableKey: StatusTableKey, id: number, name: string, description?: string) => {
    const updateList = (prev: LookupItem[]) =>
      prev.map((item) => {
        if (item.id === id) {
          if (item.name !== name) {
            logHistory(tableKey, 'name', item.name, name, 'UPDATE');
          }
          if (description !== undefined && item.description !== description) {
            logHistory(tableKey, 'description', item.description || '', description, 'UPDATE');
          }
          return { ...item, name, description: description !== undefined ? description : item.description };
        }
        return item;
      });

    switch (tableKey) {
      case 'opportunity_statuses':
        setOpportunityStatuses(updateList);
        break;
      case 'fu_orders_statuses':
        setFollowUpStatuses(updateList);
        break;
      case 'fu_orders_method':
        setFollowUpMethods(updateList);
        break;
      case 'delivery_statuses':
        setDeliveryStatuses(updateList);
        break;
      case 'payment_statuses':
        setPaymentStatuses(updateList);
        break;
      case 'payment_methods':
        setPaymentMethods(updateList);
        break;
      case 'order_statuses':
        setOrderStatuses(updateList);
        break;
    }
  };

  const addStatusItem = (tableKey: StatusTableKey, name: string, description?: string) => {
    const statusRows = tableKey === 'opportunity_statuses' ? opportunityStatuses : tableKey === 'fu_orders_statuses' ? followUpStatuses : tableKey === 'fu_orders_method' ? followUpMethods : tableKey === 'delivery_statuses' ? deliveryStatuses : tableKey === 'payment_statuses' ? paymentStatuses : tableKey === 'payment_methods' ? paymentMethods : orderStatuses;
    const newId = nextSequentialId(statusRows, 'id');
    const newItem: LookupItem = { id: newId, name, description: description || '' };
    const appendList = (prev: LookupItem[]) => [...prev, newItem];

    switch (tableKey) {
      case 'opportunity_statuses':
        setOpportunityStatuses(appendList);
        break;
      case 'fu_orders_statuses':
        setFollowUpStatuses(appendList);
        break;
      case 'fu_orders_method':
        setFollowUpMethods(appendList);
        break;
      case 'delivery_statuses':
        setDeliveryStatuses(appendList);
        break;
      case 'payment_statuses':
        setPaymentStatuses(appendList);
        break;
      case 'payment_methods':
        setPaymentMethods(appendList);
        break;
      case 'order_statuses':
        setOrderStatuses(appendList);
        break;
    }

    logHistory(tableKey, 'status_entry', 'None', `${name} (#${newId})`, 'INSERT');
  };

  const deleteStatusItem = (tableKey: StatusTableKey, id: number) => {
    const filterList = (prev: LookupItem[]) => {
      const target = prev.find((i) => i.id === id);
      if (target) {
        logHistory(tableKey, 'status_entry', `${target.name} (#${id})`, 'Deleted', 'DELETE');
      }
      return prev.filter((i) => i.id !== id);
    };

    switch (tableKey) {
      case 'opportunity_statuses':
        setOpportunityStatuses(filterList);
        break;
      case 'fu_orders_statuses':
        setFollowUpStatuses(filterList);
        break;
      case 'fu_orders_method':
        setFollowUpMethods(filterList);
        break;
      case 'delivery_statuses':
        setDeliveryStatuses(filterList);
        break;
      case 'payment_statuses':
        setPaymentStatuses(filterList);
        break;
      case 'payment_methods':
        setPaymentMethods(filterList);
        break;
      case 'order_statuses':
        setOrderStatuses(filterList);
        break;
    }
  };

  const addMarketPriceItem = (name: string, price: number, unit: 'per piece' | 'per kilo', notes?: string, description?: string) => {
    const itemName = name.trim();
    if (!itemName || !Number.isFinite(price) || price < 0 || marketPrices.some((item) => item.name.trim().toLowerCase() === itemName.toLowerCase())) return;
    const id = Math.max(0, ...marketPrices.map((item) => item.market_price_id)) + 1;
    const entry: MarketPrice = { market_price_id: id, name: itemName, price, unit, description: description || '', notes: notes || '' };
    setMarketPrices((prev) => [...prev, entry]);
    logHistory('market_price', 'market_price_entry', 'None', `${itemName}: ${price} ${unit}`, 'INSERT');
  };

  const editMarketPriceItem = (id: number, price: number, unit: 'per piece' | 'per kilo', notes?: string, name?: string, description?: string) => {
    const existing = marketPrices.find((item) => item.market_price_id === id);
    if (!existing || !Number.isFinite(price) || price < 0) return;
    const nextName = name !== undefined ? name.trim() : existing.name;
    if (!nextName) return;
    if (existing.name !== nextName) {
      if (marketPrices.some((item) => item.market_price_id !== id && item.name.trim().toLowerCase() === nextName.toLowerCase())) return;
      logHistory('market_price', 'name', existing.name, nextName, 'UPDATE');
      setOpportunities((prev) => prev.map((row) => row.fish_category === existing.name ? { ...row, fish_category: nextName } : row));
      setOrders((prev) => prev.map((row) => row.fish_category === existing.name ? { ...row, fish_category: nextName } : row));
      setFollowUpOrders((prev) => prev.map((row) => row.fish_category === existing.name ? { ...row, fish_category: nextName } : row));
      setInvoices((prev) => prev.map((row) => row.fish_category === existing.name ? { ...row, fish_category: nextName } : row));
    }
    if (existing.price !== price) logHistory('market_price', 'price', String(existing.price), String(price), 'UPDATE');
    if (existing.unit !== unit) logHistory('market_price', 'unit', existing.unit, unit, 'UPDATE');
    if (notes !== undefined && existing.notes !== notes) logHistory('market_price', 'notes', existing.notes || '', notes, 'UPDATE');
    if (description !== undefined && existing.description !== description) logHistory('market_price', 'description', existing.description || '', description, 'UPDATE');
    setMarketPrices((prev) => prev.map((mp) => mp.market_price_id === id
      ? { ...mp, name: nextName, price, unit, notes: notes !== undefined ? notes : mp.notes, description: description !== undefined ? description : mp.description }
      : mp
    ));
  };

  const updateRolePermissions = (role: string, allowedTabs: string[]) => {
    setRolePermissions((prev) => {
      const oldAllowed = (prev[role] || []).join(', ');
      const newAllowed = allowedTabs.join(', ');
      logHistory(
        'role_permissions',
        `permissions_${role}`,
        oldAllowed || 'None',
        newAllowed || 'None',
        'UPDATE'
      );
      return { ...prev, [role]: allowedTabs };
    });
  };

  const removeRole = (role: string) => {
    if (['admin', 'manager'].includes(String(role || '').trim().toLowerCase()) || agents.some((agent) => agent.role === role)) return;
    setRolePermissions((prev) => { const next = { ...prev }; delete next[role]; return next; });
  };

  // Export / Import Backup (Admin only)
  const exportAllData = (): string => {
    const snapshot = {
      version: '2.07',
      exported_at: new Date().toISOString(),
      branding,
      agents,
      marketPrices,
      farmRegistries,
      contactPeople,
      opportunities,
      orders,
      followUpOrders,
      invoices,
      deliveries,
      revenues,
      histories,
      opportunityStatuses,
      followUpStatuses,
      followUpMethods,
      deliveryStatuses,
      paymentStatuses,
      paymentMethods,
      orderStatuses,
      rolePermissions,
      overviewVisibility: overviewVisibilityByUser,
    };
    return JSON.stringify(snapshot, null, 2);
  };

  const importAllData = async (backupText: string): Promise<boolean> => {
    if (currentUser?.role !== 'Admin') return false;
    try {
      let data: any;
      const marker = backupText.match(/^-- MESINA_CRM_STATE_BASE64:([A-Za-z0-9+/=]+)$/m);
      if (marker) {
        const binary = atob(marker[1]);
        const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
        data = JSON.parse(new TextDecoder().decode(bytes));
      } else {
        // Legacy JSON backups remain importable for backwards compatibility.
        data = JSON.parse(backupText);
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
      const arrayKeys = ['agents','marketPrices','farmRegistries','contactPeople','opportunities','orders','followUpOrders','invoices','deliveries','revenues','histories','opportunityStatuses','followUpStatuses','followUpMethods','deliveryStatuses','paymentStatuses','paymentMethods','orderStatuses','onlineInquiries','onlineInquirySources'];
      for (const key of arrayKeys) if (data[key] !== undefined && !Array.isArray(data[key])) return false;
      if (data.rolePermissions !== undefined && (!data.rolePermissions || typeof data.rolePermissions !== 'object' || Array.isArray(data.rolePermissions))) return false;

      // Build a complete candidate from the current in-memory state plus the backup.
      // The server is the source of truth: do not report success until PostgreSQL confirms it.
      const state = {
        branding, agents, marketPrices, farmRegistries, contactPeople, opportunities, orders,
        followUpOrders, invoices, deliveries, revenues, histories, opportunityStatuses,
        followUpStatuses, followUpMethods, deliveryStatuses, paymentStatuses, paymentMethods,
        orderStatuses, rolePermissions, overviewVisibility: overviewVisibilityByUser,
      } as Record<string, any>;
      for (const key of [...arrayKeys, 'branding','rolePermissions','overviewVisibility']) {
        if (Object.prototype.hasOwnProperty.call(data, key)) state[key] = data[key];
      }
      const token = localStorage.getItem('mesina_crm_token');
      if (!token) return false;
      const response = await fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ state }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        console.error('PostgreSQL restore failed:', body.error || response.statusText);
        return false;
      }
      if (state.branding) setBranding(state.branding);
      if (state.agents) setAgents(state.agents);
      if (state.marketPrices) setMarketPrices(state.marketPrices);
      if (state.farmRegistries) setFarmRegistries(state.farmRegistries);
      if (state.contactPeople) setContactPeople(state.contactPeople);
      if (state.opportunities) setOpportunities(state.opportunities);
      if (state.orders) setOrders(state.orders);
      if (state.followUpOrders) setFollowUpOrders(state.followUpOrders);
      if (state.invoices) setInvoices(state.invoices);
      if (state.deliveries) setDeliveries(state.deliveries);
      if (state.revenues) setRevenues(state.revenues);
      if (state.histories) setHistories(normalizeHistoryIds(state.histories));
      if (state.opportunityStatuses) setOpportunityStatuses(state.opportunityStatuses);
      if (state.followUpStatuses) setFollowUpStatuses(state.followUpStatuses);
      if (state.followUpMethods) setFollowUpMethods(state.followUpMethods);
      if (state.deliveryStatuses) setDeliveryStatuses(state.deliveryStatuses);
      if (state.paymentStatuses) setPaymentStatuses(state.paymentStatuses);
      if (state.paymentMethods) setPaymentMethods(state.paymentMethods);
      if (state.orderStatuses) setOrderStatuses(state.orderStatuses);
      if (state.rolePermissions) setRolePermissions(state.rolePermissions);
      if (state.overviewVisibility) setOverviewVisibilityByUser(state.overviewVisibility);
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  };

  const resetToDefaults = () => {
    setBranding(initialBranding);
    // Preserve all administrator and agent accounts during a data reset.
    setMarketPrices(initialMarketPrices);
    setFarmRegistries(initialFarmRegistries);
    setContactPeople(initialContactPeople);
    setOpportunities(initialOpportunities);
    setOrders(initialOrders);
    setFollowUpOrders(initialFollowUpOrders);
    setInvoices(initialInvoices);
    setDeliveries(initialDeliveries);
    setRevenues(initialRevenues);
    setHistories(initialHistories);
    setOpportunityStatuses(defaultOpportunityStatuses);
    setFollowUpStatuses(defaultFollowUpStatuses);
    setFollowUpMethods(defaultFollowUpMethods);
    setDeliveryStatuses(defaultDeliveryStatuses);
    setPaymentStatuses(defaultPaymentStatuses);
    setPaymentMethods(defaultPaymentMethods);
    setOrderStatuses(defaultOrderStatuses);
    // Preserve the configured role-to-table restrictions.
    localStorage.removeItem(STORAGE_KEY);
    logHistory('system', 'database', 'Custom State', 'Reset to Factory Defaults', 'AUTOMATION');
  };

  return (
    <CRMContext.Provider
      value={{
        currentUser,
        login,
        logout,
        updateMyProfile,
        clearOperationalData,
        overviewVisibility,
        setOverviewVisibility,
        branding,
        updateBranding,
        agents,
          marketPrices,
        farmRegistries,
        contactPeople,
        opportunities,
        orders,
        followUpOrders,
        invoices,
        deliveries,
        revenues,
        histories,
        opportunityStatuses,
        followUpStatuses,
        followUpMethods,
        deliveryStatuses,
        paymentStatuses,
        paymentMethods,
        orderStatuses,
        rolePermissions,
        updateRolePermissions,
        removeRole,
        editStatusItem,
        addStatusItem,
        deleteStatusItem,
        editMarketPriceItem,
        addMarketPriceItem,
        addContactPerson,
        updateContactPerson,
        addFarmRegistry,
        updateFarmRegistry,
        addOpportunity,
        updateOpportunityStatus,
        addOrder,
        updateFollowUpStatus,
        addFollowUpOrder,
        createInvoice,
        updateInvoicePaymentStatus,
        updateDeliveryRestrictedFields,
        addAgent,
        updateAgentPassword,
        editOpportunity,
        editOrder,
        editFollowUpOrder,
        editInvoice,
        editDelivery,
        editRevenue,
        editFarmRegistry,
        editContactPerson,
        editAgent,
        exportAllData,
        importAllData,
        resetToDefaults,
      }}
    >
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
};
