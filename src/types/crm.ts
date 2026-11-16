export interface ContactPerson {
  contact_id: number;
  contact_person_name: string;
  farm_name: string;
  is_point_person: 'yes' | 'no';
  phone_number: string;
  email_address?: string;
  address?: string;
  is_active: 'yes' | 'no';
  date_created: string;
  assigned_agent: string;
}

export interface FarmRegistry {
  farm_id: number;
  farm_name: string;
  farm_address: string;
  coordinates_lat_lng: string;
  designated_point_person?: string; // only for is_point_person = yes
  farm_phone: string;
  farm_email?: string;
  date_created: string;
  assigned_agent: string;
}

export interface Opportunity {
  opportunity_id: number;
  contact_id: number;
  contact_person: string;
  phone: string;
  fish_category: string;
  quantity: number;
  status: 'Accepted' | 'Pending/Undecided' | 'Negotiating' | 'Cancelled';
  contacted_by: string;
  source?: 'Phone' | 'In-person/Walk-in';
  date_created: string;
  notes?: string;
}

export interface Order {
  order_id: number;
  opportunity_id?: number;
  farm_name: string;
  contact_person: string;
  fish_category: string;
  quantity: number;
  price?: number;
  price_unit?: 'per piece' | 'per kilo';
  discount?: number; // calculated discount amount in PHP
  discount_percent?: number;
  discount_enabled?: boolean;
  total_price?: number;
  order_date: string;
  delivery_date: string;
  status?: string;
  booking_agent: string;
  notes?: string;
}

export type FollowUpStatus =
  | 'Scheduled'
  | 'Call Back Later'
  | 'Inquiry Only'
  | 'Cancelled'
  | 'Quality Issue Reported'
  | 'Resolved'
  | 'Satisfied'
  | 'Continue with an Order';

export interface FollowUpOrder {
  follow_up_orders_id: number;
  order_id?: number;
  opportunity_id?: number;
  farm_name: string;
  contact_person_name: string;
  contact_number: string;
  contact_email: string;
  date_of_inquiry: string;
  fish_category: string;
  quantity: number;
  status: FollowUpStatus;
  verified_up_by: string;
  delivery_date?: string;
  landmarks?: string;
  notes?: string;
}

export interface Invoice {
  invoice_id: number;
  follow_up_orders_id?: number;
  order_id?: number;
  official_receipt_id: string;
  farm_name: string;
  contact_person_name: string;
  fish_category: string;
  quantity: number;
  item_price_per_piece: number;
  item_unit: 'per piece' | 'per kilo';
  subtotal?: number;
  discount?: number;
  discount_enabled?: boolean;
  pricing_snapshot?: { unit_price: number; unit: 'per piece' | 'per kilo'; quantity: number; subtotal: number; discount: number; discount_enabled: boolean; total: number; captured_at: string; source: 'order' | 'follow_up' | 'market_price' };
  total_price: number;
  or_issued_by: string;
  payment_received_by: string;
  payment_method: string;
  payment_status: string;
  date_created: string;
  delivery_date?: string;
  notes?: string;
}

export interface Delivery {
  delivery_id: number;
  invoice_id: number;
  farm_name: string;
  farm_address: string;
  farm_phone: string;
  farm_gps_coordinates: string;
  delivered_by: string;
  status: 'Pending' | 'Out for Delivery' | 'Delivered' | 'Failed' | 'Rescheduled';
  payment_collected_by: string;
  payment_method: string;
  payment_status: 'Pending' | 'Partially Paid' | 'Paid in Full' | 'Cancelled' | 'Refunded';
  fulfillment_accepted_by: string; // fk contact_people.contact_person_name
  landmarks?: string;
  delivery_notes?: string; // Legacy delivery notes
  date_created: string;
  delivery_date?: string;
  delivered_date?: string;
}

export interface Revenue {
  revenue_id: number;
  invoice_id: number;
  delivery_id: number;
  delivery_status: string;
  payment_collected_by: string;
  revenue_amount: number;
  payment_method: string;
  delivered_date: string;
}

export type AgentRole = string;

export type RolePermissionsMap = Record<string, string[]>;

export interface Agent {
  agent_id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  status: 'Active' | 'Inactive';
  role: AgentRole;
  username: string;
  password: string; // bcrypt hash
  date_started: string;
  avatar_url?: string;
}

export interface HistoryLog {
  history_id: number;
  entry_table: string; // entry table
  field_name: string; // field name
  date_and_time: string; // date and time
  old_value: string; // old value
  new_value: string; // new value
  modifiers_name: string; // modifier's name
  action_type?: 'INSERT' | 'UPDATE' | 'DELETE' | 'AUTOMATION';
  // Aliases for compatibility
  table_name?: string;
  modified_field?: string;
  modifying_agent?: string;
}

export interface MarketPrice {
  market_price_id: number;
  name: string;
  price: number;
  unit: 'per piece' | 'per kilo';
  description?: string;
  notes?: string;
}

export interface LookupItem {
  id: number;
  name: string;
  description?: string;
}

export type StatusTableKey =
  | 'opportunity_statuses'
  | 'fu_orders_statuses'
  | 'fu_orders_method'
  | 'delivery_statuses'
  | 'payment_statuses'
  | 'payment_methods'
  | 'order_statuses';

export interface CRMBranding {
  id: number;
  company_name: string;
  company_logo: string;
  tagline: string;
  subtitle: string;
  login_heading?: string;
  login_description?: string;
  login_footer?: string;
  login_background_image?: string;
  favicon: string;
  updated_at: string;
  /** Per-navigation-item icon and color customization configured in Branding. */
  table_icon_config?: Record<string, { icon?: string; color?: string }>;
}
