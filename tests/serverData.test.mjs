import test from 'node:test';
import assert from 'node:assert/strict';
import { paginateRecords, buildFinancialReconciliation } from '../src/utils/serverData.mjs';

test('pagination clamps limits and returns stable metadata', () => {
  const rows = Array.from({ length: 45 }, (_, i) => ({ id: i + 1, name: `Farm ${i + 1}` }));
  const result = paginateRecords(rows, { page: '2', perPage: '10' });
  assert.equal(result.items.length, 10);
  assert.equal(result.items[0].id, 11);
  assert.deepEqual(result.pagination, { page: 2, perPage: 10, total: 45, totalPages: 5, hasNextPage: true, hasPreviousPage: true });
});

test('pagination searches records and caps page size', () => {
  const result = paginateRecords([{ id: 1, farm: 'North' }, { id: 2, farm: 'South' }], { search: 'south', perPage: 500 });
  assert.equal(result.items.length, 1);
  assert.equal(result.pagination.perPage, 100);
  assert.equal(result.items[0].id, 2);
});

test('financial reconciliation reports linked invoice mismatches and totals', () => {
  const report = buildFinancialReconciliation({
    orders: [{ order_id: 1, quantity: 10, price: 20, discount_enabled: true, discount: 10, total_price: 190 }, { order_id: 2, quantity: 2, price: 5, total_price: 10 }],
    invoices: [{ invoice_id: 9, order_id: 1, total_price: 180, payment_status: 'Paid in Full' }, { invoice_id: 10, order_id: 99, total_price: 50, payment_status: 'Pending' }],
    revenues: [{ revenue_amount: 180 }],
  });
  assert.equal(report.counts.pricing_mismatches, 2);
  assert.equal(report.counts.orders_without_invoice, 1);
  assert.equal(report.totals.orders, 200);
  assert.equal(report.totals.invoices, 230);
  assert.equal(report.totals.recorded_revenue, 180);
});
