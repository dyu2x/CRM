import {
  Agent,
  ContactPerson,
  CRMBranding,
  Delivery,
  FarmRegistry,
  FollowUpOrder,
  HistoryLog,
  Invoice,
  LookupItem,
  MarketPrice,
  Opportunity,
  Order,
  Revenue,
} from '../types/crm';

export const initialBranding: CRMBranding = {
  id: 1,
  company_name: 'Mesina Farms',
  company_logo: '',
  tagline: 'Orders, deliveries and follow-ups in one place.',
  subtitle: 'Track every farm from first order to collected payment.',
  login_heading: 'Welcome back',
  login_description: 'Sign in with your username and password.',
  login_footer: 'Secure farm operations management',
  favicon: '',
  updated_at: '2026-11-07T08:00:00Z',
};

export const initialAgents: Agent[] = [];

export const initialMarketPrices: MarketPrice[] = [];

export const initialFarmRegistries: FarmRegistry[] = [];

export const initialContactPeople: ContactPerson[] = [];

export const initialOpportunities: Opportunity[] = [];

export const initialOrders: Order[] = [];

export const initialFollowUpOrders: FollowUpOrder[] = [];

export const initialInvoices: Invoice[] = [];

export const initialDeliveries: Delivery[] = [];

export const initialRevenues: Revenue[] = [];

export const initialHistories: HistoryLog[] = [];

export const opportunityStatuses: LookupItem[] = [
  { id: 1, name: 'Accepted', description: 'Automatically creates an Order Entry' },
  { id: 2, name: 'Pending/Undecided', description: 'Potential Buy. Auto-creates a follow up inquiries entry tagged as Scheduled' },
  { id: 3, name: 'Negotiating', description: 'Under negotiation state' },
  { id: 4, name: 'Cancelled', description: 'No actions required. Close entry' },
];

export const followUpStatuses: LookupItem[] = [
  { id: 1, name: 'Scheduled', description: 'Automated 24h follow-up queued in system' },
  { id: 2, name: 'Call Back Later', description: 'Client unavailable or requested a callback' },
  { id: 3, name: 'Inquiry Only', description: 'No actions required. Do not need to create a new Order Entry' },
  { id: 4, name: 'Cancelled', description: 'No actions required. Do not need to create a new Order Entry' },
  { id: 5, name: 'Quality Issue Reported', description: 'Customer complaint. Need immediate resolution' },
  { id: 6, name: 'Resolved', description: 'Issue or concern resolved' },
  { id: 7, name: 'Satisfied', description: 'Client satisfied with follow-up' },
  { id: 8, name: 'Continue with an Order', description: 'Automatically creates an Order Entry' },
];

export const deliveryStatuses: LookupItem[] = [
  { id: 1, name: 'Pending', description: 'Waiting for shipment dispatch' },
  { id: 2, name: 'Out for Delivery', description: 'Vehicle on route to fish farm' },
  { id: 3, name: 'Delivered', description: 'Shipment safely delivered at farm' },
  { id: 4, name: 'Failed', description: 'Delivery unsuccessful' },
  { id: 5, name: 'Rescheduled', description: 'Delivery moved to new date' },
];

export const paymentStatuses: LookupItem[] = [
  { id: 1, name: 'Pending', description: 'Awaiting payment settlement' },
  { id: 2, name: 'Partially Paid', description: 'Partial downpayment collected' },
  { id: 3, name: 'Paid in Full', description: 'Balance fully collected and confirmed' },
  { id: 4, name: 'Cancelled', description: 'Payment order cancelled' },
  { id: 5, name: 'Refunded', description: 'Money returned to client' },
];

export const orderStatuses: LookupItem[] = [
  { id: 1, name: 'Pending', description: 'Order received and awaiting processing' },
  { id: 2, name: 'Confirmed', description: 'Order confirmed with the farm' },
  { id: 3, name: 'Processing', description: 'Order is being prepared' },
  { id: 4, name: 'Order Complete', description: 'Automatically set when the linked delivery payment is Paid in Full' },
  { id: 5, name: 'Cancelled', description: 'Order cancelled' },
];

export const paymentMethods: LookupItem[] = [
  { id: 1, name: 'Cash on Delivery', description: 'Direct cash payment upon delivery' },
  { id: 2, name: 'Bank Transfer', description: 'Online wire transfer (BDO, BPI, etc.)' },
  { id: 3, name: 'GCash / Maya', description: 'Direct e-wallet mobile transfer' },
  { id: 4, name: 'Check', description: 'Bank check payment' },
];

export const followUpMethods: LookupItem[] = [
  { id: 1, name: 'Phone Call', description: 'Direct voice telephone call to farm point person' },
  { id: 2, name: 'SMS / Text Message', description: 'Cellular SMS text notification and verification' },
  { id: 3, name: 'Viber / WhatsApp', description: 'Messaging application chat and photo verification' },
  { id: 4, name: 'On-Site Farm Visit', description: 'In-person field logistics and pond inspection' },
  { id: 5, name: 'Email Correspondence', description: 'Official written email follow-up and documentation' },
];

export const initialRolePermissions: Record<string, string[]> = {
  Admin: [
    'dashboard',
    'opportunities',
    'orders',
    'follow_up_orders',
    'invoices',
    'deliveries',
    'revenues',
    'farm_registries',
    'contact_people',
    'catalog',
    'agents',
    'histories',
    'status_tables',
    'online_inquiry',
    'online_inquiry_sources',
    'expenses_overview',
    'employees',
    'attendance',
    'weekly_attendance',
    'salaries',
    'obligations',
    'obligations_list',
    'farm_maintenance',
    'farm_maintenance_list',
    'extra_expenses',
  ],
  Manager: [
    'dashboard',
    'agents',
  ],
  'Booking Agent': [
    'dashboard',
    'opportunities',
    'orders',
    'follow_up_orders',
    'farm_registries',
    'contact_people',
    'catalog',
    'online_inquiry',
  ],
  'Delivery Agent': [
    'dashboard',
    'orders',
    'deliveries',
    'farm_registries',
    'contact_people',
  ],
  'Sales Agent': [
    'dashboard',
    'opportunities',
    'orders',
    'follow_up_orders',
    'farm_registries',
    'contact_people',
    'catalog',
    'online_inquiry',
  ],
};

