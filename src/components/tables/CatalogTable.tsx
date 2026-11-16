import React, { useMemo, useState } from 'react';
import { Search, Fish, Tag, Calculator } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { TablePagination } from '../common/TablePagination';
import { ExportDataButton } from '../common/ExportDataButton';

export const CatalogTable: React.FC = () => {
  const { marketPrices } = useCRM();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [calculatorItemId, setCalculatorItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [discount, setDiscount] = useState('0');
  const [customKiloUnitPrice, setCustomKiloUnitPrice] = useState('');
  const filtered = useMemo(() => marketPrices.filter((item) =>
    `${item.name} ${item.description || ''} ${item.notes || ''} ${item.unit || 'per piece'}`.toLowerCase().includes(searchTerm.toLowerCase())
  ), [marketPrices, searchTerm]);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const calculatorItem = marketPrices.find((item) => String(item.market_price_id) === calculatorItemId) || marketPrices[0];
  const isPerKilo = calculatorItem?.unit === 'per kilo';
  const savedUnitPrice = Math.max(0, Number(calculatorItem?.price) || 0);
  const unitPrice = isPerKilo && customKiloUnitPrice !== ''
    ? Math.max(0, Number(customKiloUnitPrice) || 0)
    : savedUnitPrice;
  const quantityValue = Math.max(0, Number(quantity) || 0);
  const discountValue = Math.min(100, Math.max(0, Number(discount) || 0));
  const subtotal = unitPrice * quantityValue;
  const discountAmount = subtotal * (discountValue / 100);
  const total = subtotal - discountAmount;
  const money = (value: number) => `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return <div className="space-y-4">
    <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs">
      <div className="flex items-center gap-2 mb-3"><Tag className="w-4 h-4"/><h3 className="text-sm font-bold">Market Price Catalog</h3></div>
      <p className="text-xs text-neutral-500 mb-3">This section displays the complete Market Prices master table. Add or edit items under Admin Status &amp; Lookup Master Tables → Market Prices.</p>
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="relative max-w-sm"><Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2"/><input value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} placeholder="Search market prices..." className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded"/></div><ExportDataButton tableKey="catalog" tableLabel="Market Price Catalog" rows={filtered as unknown as Record<string, unknown>[]}/></div>
    </div>
    <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs">
      <div className="flex items-center gap-2 mb-1"><Calculator className="w-4 h-4"/><h3 className="text-sm font-bold">Price Calculator</h3></div>
      <p className="text-xs text-neutral-500 mb-4">Calculate an estimated total using a market price and an optional percentage discount. This calculator does not change saved market prices.</p>
      {marketPrices.length === 0 ? <p className="text-xs text-neutral-500 rounded bg-neutral-50 p-3">Add a Market Price entry in Admin Status &amp; Lookup Master Tables to use the calculator.</p> : <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="block text-xs font-medium text-neutral-600">Market Price Item
            <select value={calculatorItem ? String(calculatorItem.market_price_id) : ''} onChange={(e) => { const selected = marketPrices.find((item) => String(item.market_price_id) === e.target.value); setCalculatorItemId(e.target.value); setCustomKiloUnitPrice(selected ? String(selected.price) : ''); }} className="mt-1 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800">
              {marketPrices.map((item) => <option key={item.market_price_id} value={String(item.market_price_id)}>{item.name} ({item.unit || 'per piece'})</option>)}
            </select>
          </label>
          <label className="block text-xs font-medium text-neutral-600">Unit Price {isPerKilo ? '(editable for per kilo)' : '(from Market Prices)'}
            <div className={`mt-1 flex items-center rounded border border-neutral-300 px-3 py-2 text-sm text-neutral-800 ${isPerKilo ? 'bg-white border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100' : 'bg-neutral-50'}`}><span className="mr-1">₱</span><input type="number" min="0" step="0.01" value={isPerKilo ? (customKiloUnitPrice === '' ? String(savedUnitPrice) : customKiloUnitPrice) : String(savedUnitPrice)} onChange={(e) => setCustomKiloUnitPrice(e.target.value)} disabled={!isPerKilo} aria-label="Calculator unit price" className="w-full min-w-0 bg-transparent outline-none disabled:cursor-not-allowed"/></div>
            {isPerKilo && <span className="mt-1 block text-[11px] font-normal text-emerald-700">You can adjust the price per kilo for this calculation only. The saved Market Price will not change.</span>}
          </label>
          <label className="block text-xs font-medium text-neutral-600">Quantity ({calculatorItem?.unit || 'unit'})
            <input type="number" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm text-neutral-800"/>
          </label>
          <label className="block text-xs font-medium text-neutral-600">Discount (%)
            <input type="number" min="0" max="100" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm text-neutral-800"/>
          </label>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg bg-neutral-50 p-3"><div className="text-xs text-neutral-500">Subtotal</div><div className="mt-1 text-lg font-semibold text-neutral-800">{money(subtotal)}</div></div>
          <div className="rounded-lg bg-neutral-50 p-3"><div className="text-xs text-neutral-500">Discount Amount ({discountValue.toFixed(2)}%)</div><div className="mt-1 text-lg font-semibold text-neutral-800">−{money(discountAmount)}</div></div>
          <div className="rounded-lg bg-emerald-50 p-3"><div className="text-xs text-emerald-700">Total After Discount</div><div className="mt-1 text-xl font-bold text-emerald-800">{money(total)}</div></div>
        </div>
      </>}
    </div>
    <div className="bg-white rounded-lg border border-neutral-200 shadow-2xs overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-neutral-50 text-neutral-600"><tr><th className="px-4 py-3">Market Price ID</th><th className="px-4 py-3">Item</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Unit</th><th className="px-4 py-3">Market Price</th><th className="px-4 py-3">Pricing Notes</th></tr></thead><tbody className="divide-y divide-neutral-100">{paginated.length === 0 ? <tr><td colSpan={6} className="py-8 text-center text-neutral-400">No market price entries found.</td></tr> : paginated.map((item) => <tr key={item.market_price_id}><td className="px-4 py-3 font-mono">#{item.market_price_id}</td><td className="px-4 py-3 font-semibold"><span className="inline-flex items-center gap-2"><Fish className="w-4 h-4 text-neutral-500"/>{item.name}</span></td><td className="px-4 py-3 text-neutral-600">{item.description || '—'}</td><td className="px-4 py-3">{item.unit || 'per piece'}</td><td className="px-4 py-3 font-mono font-bold">₱{Number(item.price).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td><td className="px-4 py-3 text-neutral-600">{item.notes || '—'}</td></tr>)}</tbody></table></div><TablePagination totalItems={filtered.length} currentPage={currentPage} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize}/></div>
  </div>;
};
