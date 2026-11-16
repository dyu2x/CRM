import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveInvoicePricing } from '../src/utils/pricing';

test('per-piece order preserves saved unit price', () => {
  const result = resolveInvoicePricing({ quantity: 10, order: { quantity: 10, price: 25, price_unit: 'per piece', total_price: 250 }, marketPrice: { price: 30, unit: 'per piece' } });
  assert.deepEqual(result, { quantity: 10, unitPrice: 25, unit: 'per piece', subtotal: 250, discount: 0, discountEnabled: false, total: 250 });
});

test('per-kilo order supports fractional quantity and saved price', () => {
  const result = resolveInvoicePricing({ quantity: 1, order: { quantity: 2.375, price: 180, price_unit: 'per kilo', total_price: 427.5 } });
  assert.equal(result.quantity, 2.375);
  assert.equal(result.subtotal, 427.5);
  assert.equal(result.unit, 'per kilo');
});

test('discount-enabled order preserves discount and final total', () => {
  const result = resolveInvoicePricing({ quantity: 4, order: { quantity: 4, price: 100, price_unit: 'per piece', discount: 50, discount_enabled: true, total_price: 350 } });
  assert.equal(result.subtotal, 400);
  assert.equal(result.discount, 50);
  assert.equal(result.discountEnabled, true);
  assert.equal(result.total, 350);
});

test('disabled discount is not deducted even if an old amount exists', () => {
  const result = resolveInvoicePricing({ quantity: 2, order: { quantity: 2, price: 100, discount: 30, discount_enabled: false } });
  assert.equal(result.discount, 0);
  assert.equal(result.total, 200);
});

test('edited order terms are used rather than changed market price', () => {
  const result = resolveInvoicePricing({ quantity: 1, order: { quantity: 3, price: 145, price_unit: 'per kilo', discount: 15, discount_enabled: true, total_price: 420 }, marketPrice: { price: 210, unit: 'per kilo' } });
  assert.equal(result.quantity, 3);
  assert.equal(result.unitPrice, 145);
  assert.equal(result.total, 420);
});

test('follow-up linked to an order uses the linked order snapshot', () => {
  const linkedOrder = { quantity: 6, price: 75, price_unit: 'per piece' as const, discount: 25, discount_enabled: true, total_price: 425 };
  const result = resolveInvoicePricing({ quantity: 6, order: linkedOrder, marketPrice: { price: 99, unit: 'per piece' } });
  assert.equal(result.unitPrice, 75);
  assert.equal(result.discount, 25);
  assert.equal(result.total, 425);
});

test('rejects discount greater than subtotal', () => {
  assert.throws(() => resolveInvoicePricing({ quantity: 1, unitPrice: 10, discount: 11, discountEnabled: true }), /Discount must be between/);
});

test('rejects fractional quantities for per-piece items', () => {
  assert.throws(() => resolveInvoicePricing({ quantity: 1.25, unit: 'per piece', unitPrice: 10 }), /Piece quantities must be whole numbers/);
});
