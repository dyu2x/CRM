const clampInt = (value, fallback, min, max) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};

export function paginateRecords(records, query = {}) {
  const page = clampInt(query.page, 1, 1, 1_000_000);
  const perPage = clampInt(query.perPage, 20, 1, 100);
  const search = String(query.search ?? '').trim().toLocaleLowerCase();
  const filtered = search
    ? records.filter((record) => JSON.stringify(record).toLocaleLowerCase().includes(search))
    : records;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * perPage;
  return {
    items: filtered.slice(start, start + perPage),
    pagination: { page: safePage, perPage, total, totalPages, hasNextPage: safePage < totalPages, hasPreviousPage: safePage > 1 },
  };
}

const amount = (value) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : 0;
};

export function buildFinancialReconciliation(state = {}) {
  const orders = Array.isArray(state.orders) ? state.orders : [];
  const invoices = Array.isArray(state.invoices) ? state.invoices : [];
  const revenues = Array.isArray(state.revenues) ? state.revenues : [];
  const followUps = Array.isArray(state.followUpOrders) ? state.followUpOrders : [];
  const followUpOrderById = new Map(followUps.map((row) => [String(row.follow_up_orders_id), row.order_id]));
  const orderById = new Map(orders.map((row) => [String(row.order_id), row]));
  const invoiceOrderId = (invoice) => invoice.order_id ?? followUpOrderById.get(String(invoice.follow_up_orders_id));
  const invoiceTotal = (invoice) => amount(invoice.pricing_snapshot?.total ?? invoice.total_price);
  const orderTotal = (order) => amount(order.total_price ?? (Number(order.quantity || 0) * Number(order.price || 0) - Number(order.discount_enabled ? order.discount || 0 : 0)));
  const invoicedOrderIds = new Set(invoices.map(invoiceOrderId).filter((id) => id !== undefined && id !== null).map(String));
  const linkedInvoices = invoices.filter((invoice) => invoiceOrderId(invoice) !== undefined && invoiceOrderId(invoice) !== null);
  const mismatches = linkedInvoices.flatMap((invoice) => {
    const orderId = invoiceOrderId(invoice);
    const order = orderById.get(String(orderId));
    if (!order) return [{ invoice_id: invoice.invoice_id, order_id: orderId, reason: 'linked_order_missing', order_total: null, invoice_total: invoiceTotal(invoice), difference: null }];
    const expected = orderTotal(order);
    const actual = invoiceTotal(invoice);
    return Math.abs(expected - actual) > 0.01
      ? [{ invoice_id: invoice.invoice_id, order_id: orderId, reason: 'total_mismatch', order_total: expected, invoice_total: actual, difference: amount(actual - expected) }]
      : [];
  });
  const paid = invoices.filter((invoice) => String(invoice.payment_status || '').toLowerCase() === 'paid in full');
  const unpaid = invoices.filter((invoice) => !['paid in full', 'cancelled', 'refunded'].includes(String(invoice.payment_status || '').toLowerCase()));
  const totalOrders = orders.reduce((sum, row) => sum + orderTotal(row), 0);
  const totalInvoiced = invoices.filter((row) => !['cancelled', 'void'].includes(String(row.payment_status || '').toLowerCase())).reduce((sum, row) => sum + invoiceTotal(row), 0);
  return {
    generated_at: new Date().toISOString(),
    counts: { orders: orders.length, invoices: invoices.length, linked_invoices: linkedInvoices.length, orders_without_invoice: orders.filter((row) => !invoicedOrderIds.has(String(row.order_id))).length, pricing_mismatches: mismatches.length },
    totals: {
      orders: amount(totalOrders), invoices: amount(totalInvoiced), invoiced_minus_all_order_value: amount(totalInvoiced - totalOrders),
      paid_invoices: amount(paid.reduce((sum, row) => sum + invoiceTotal(row), 0)),
      unpaid_or_partially_paid_invoice_value: amount(unpaid.reduce((sum, row) => sum + invoiceTotal(row), 0)),
      recorded_revenue: amount(revenues.reduce((sum, row) => sum + Number(row.revenue_amount || 0), 0)),
    },
    mismatches,
  };
}
