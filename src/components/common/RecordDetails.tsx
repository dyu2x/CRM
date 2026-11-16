import React from 'react';
import { ArrowLeft } from 'lucide-react';

type Props = { title: string; record: Record<string, unknown> | null; onBack: () => void };
export const RecordDetails: React.FC<Props> = ({ title, record, onBack }) => {
  if (!record) return null;
  const humanize = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const display = (value: unknown) => value == null || value === '' ? '—' : typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
  return <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4">
    <section role="dialog" aria-modal="true" aria-label={title} className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
      <header className="flex items-center gap-3 p-4 border-b">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-neutral-100"><ArrowLeft size={16}/> Back to list</button>
        <h2 className="font-semibold">{title}</h2>
      </header>
      <div className="p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.entries(record).map(([key,value]) => <div key={key} className="rounded-lg border p-3 min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-neutral-500 font-semibold mb-1">{humanize(key)}</div>
          <div className="text-sm whitespace-pre-wrap break-words">{display(value)}</div>
        </div>)}
      </div>
      <footer className="p-3 border-t flex justify-end"><button type="button" onClick={onBack} className="rounded-md bg-neutral-900 text-white px-4 py-2 text-sm">Back to list</button></footer>
    </section>
  </div>;
};
