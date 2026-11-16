export type PricingUnit = 'per piece' | 'per kilo';

export interface OrderPricingSource {
  quantity: number;
  price?: number;
  price_unit?: PricingUnit;
  discount?: number;
  discount_enabled?: boolean;
  total_price?: number;
}

export interface MarketPriceSource {
  price: number;
  unit?: PricingUnit;
}

export interface InvoicePricingInput {
  quantity: number;
  unitPrice?: number;
  unit?: PricingUnit;
  discount?: number;
  discountEnabled?: boolean;
  totalPrice?: number;
  order?: OrderPricingSource;
  marketPrice?: MarketPriceSource;
}

export interface InvoicePricingSnapshot {
  quantity: number;
  unitPrice: number;
  unit: PricingUnit;
  subtotal: number;
  discount: number;
  discountEnabled: boolean;
  total: number;
}

const money = (value: number) => Number(value.toFixed(2));

/** Resolve pricing in order-of-authority: saved order, explicit terms, then current market price. */
export function resolveInvoicePricing(input: InvoicePricingInput): InvoicePricingSnapshot {
  const quantity = Number(input.order?.quantity ?? input.quantity);
  const unitPrice = Number(input.order?.price ?? input.unitPrice ?? input.marketPrice?.price ?? 0);
  const unit = input.order?.price_unit ?? input.unit ?? input.marketPrice?.unit ?? 'per piece';
  const discountEnabled = Boolean(input.order?.discount_enabled ?? input.discountEnabled ?? false);
  const discount = discountEnabled ? Number(input.order?.discount ?? input.discount ?? 0) : 0;
  const subtotal = money(quantity * unitPrice);
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Quantity must be greater than zero.');
  if (!['per piece', 'per kilo'].includes(unit)) throw new Error('A valid pricing unit is required.');
  if (unit === 'per piece' && !Number.isInteger(quantity)) throw new Error('Piece quantities must be whole numbers.');
  if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error('Unit price must be zero or greater.');
  if (!Number.isFinite(discount) || discount < 0 || discount > subtotal) throw new Error('Discount must be between zero and the subtotal.');
  const total = money(Math.max(0, input.order?.total_price ?? input.totalPrice ?? subtotal - discount));
  if (!Number.isFinite(total) || total < 0) throw new Error('Invoice total must be zero or greater.');
  return { quantity, unitPrice, unit, subtotal, discount: money(discount), discountEnabled, total };
}
