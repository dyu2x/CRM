import { useCRM } from '../../context/CRMContext';
import { ExportDataButton } from '../common/ExportDataButton';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Search, Pencil, Trash2, Save, X, Radio, AlertCircle } from 'lucide-react';

type Source = { source_id: number; source_name: string; inquiry_count: number };

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('mesina_crm_token') || ''}`,
  'Content-Type': 'application/json',
});

export const OnlineInquirySourcesView: React.FC = () => {
  const { currentUser, rolePermissions } = useCRM();
  const [items, setItems] = useState<Source[]>([]);
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/online-inquiry-sources', { headers: authHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load inquiry sources.');
      setItems(data.items || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load inquiry sources.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter(item => item.source_name.toLowerCase().includes(query));
  }, [items, search]);

  const addSource = async (event: React.FormEvent) => {
    event.preventDefault();
    const sourceName = name.trim();
    if (!sourceName) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/online-inquiry-sources', {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ source_name: sourceName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to add source.');
      setName('');
      setSuccess('Inquiry source added.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add source.');
    } finally { setBusy(false); }
  };

  const saveEdit = async (id: number) => {
    const sourceName = editingName.trim();
    if (!sourceName) { setError('Source name is required.'); return; }
    setBusy(true); setError(''); setSuccess('');
    try {
      const response = await fetch(`/api/online-inquiry-sources/${id}`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ source_name: sourceName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to update source.');
      setEditingId(null); setEditingName(''); setSuccess('Inquiry source updated. Existing inquiries were kept.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update source.');
    } finally { setBusy(false); }
  };

  const deleteSource = async (source: Source) => {
    if (!window.confirm(`Delete the inquiry source “${source.source_name}”?`)) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const response = await fetch(`/api/online-inquiry-sources/${source.source_id}`, {
        method: 'DELETE', headers: authHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to delete source.');
      setSuccess('Inquiry source deleted.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete source.');
    } finally { setBusy(false); }
  };

  const canExport = String(currentUser?.role || '').toLowerCase() === 'admin' || Boolean(rolePermissions[currentUser?.role || '']?.includes('export:online_inquiry_sources'));
  return (
    <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-2xs">
      <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-neutral-100 p-2 text-neutral-700"><Radio className="h-4 w-4" /></div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Inquiry Sources</h2>
            <p className="mt-0.5 text-xs text-neutral-500">Manage the channels available for incoming online inquiries.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">{canExport && <ExportDataButton tableKey="online_inquiry_sources" tableLabel="Inquiry Sources" rows={filteredItems as unknown as Record<string, unknown>[]}/>}<button type="button" onClick={() => void load()} disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} /> Refresh
        </button></div>
      </div>

      <form onSubmit={addSource} className="flex flex-col gap-2 border-b border-neutral-200 bg-neutral-50/70 p-4 sm:flex-row">
        <input value={name} onChange={event => setName(event.target.value)} maxLength={100}
          placeholder="Enter a new inquiry source" aria-label="New inquiry source" required
          className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200" />
        <button type="submit" disabled={busy || !name.trim()}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50">
          <Plus className="h-3.5 w-3.5" /> Add Source
        </button>
      </form>

      {(error || success) && (
        <div role="status" className={`flex items-start gap-2 border-b px-4 py-3 text-xs ${error ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
          {error && <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
          <span>{error || success}</span>
        </div>
      )}

      <div className="flex flex-col gap-2 border-b border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search inquiry sources"
            className="w-full rounded-md border border-neutral-300 py-2 pl-9 pr-3 text-xs outline-none focus:border-neutral-500" />
        </div>
        <p className="text-[11px] text-neutral-500">{filteredItems.length} {filteredItems.length === 1 ? 'source' : 'sources'}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="bg-neutral-50 text-[10px] uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Source Name</th>
              <th className="px-4 py-3 font-semibold">Linked Inquiries</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredItems.map(source => (
              <tr key={source.source_id} className="hover:bg-neutral-50/70">
                <td className="px-4 py-3">
                  {editingId === source.source_id ? (
                    <input autoFocus value={editingName} onChange={event => setEditingName(event.target.value)} maxLength={100}
                      onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void saveEdit(source.source_id); } if (event.key === 'Escape') setEditingId(null); }}
                      className="w-full max-w-sm rounded-md border border-neutral-300 px-2.5 py-2 text-xs outline-none focus:border-neutral-500" />
                  ) : <span className="font-medium text-neutral-800">{source.source_name}</span>}
                </td>
                <td className="px-4 py-3 text-neutral-500">{source.inquiry_count ?? 0}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    {editingId === source.source_id ? <>
                      <button type="button" onClick={() => void saveEdit(source.source_id)} disabled={busy || !editingName.trim()}
                        className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-2.5 py-1.5 text-[11px] font-medium text-white disabled:opacity-50"><Save className="h-3 w-3" /> Save</button>
                      <button type="button" onClick={() => { setEditingId(null); setEditingName(''); }}
                        className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-2.5 py-1.5 text-[11px] text-neutral-600 hover:bg-neutral-100"><X className="h-3 w-3" /> Cancel</button>
                    </> : <>
                      <button type="button" onClick={() => { setEditingId(source.source_id); setEditingName(source.source_name); setError(''); setSuccess(''); }}
                        className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-2.5 py-1.5 text-[11px] font-medium text-neutral-700 hover:bg-neutral-100"><Pencil className="h-3 w-3" /> Edit</button>
                      <button type="button" onClick={() => void deleteSource(source)} disabled={busy}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-3 w-3" /> Delete</button>
                    </>}
                  </div>
                </td>
              </tr>
            ))}
            {!filteredItems.length && <tr><td colSpan={3} className="px-4 py-10 text-center text-xs text-neutral-400">{search ? 'No inquiry sources match your search.' : 'No inquiry sources have been added yet.'}</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="border-t border-neutral-200 px-4 py-3 text-[10px] text-neutral-400">
        Editing a source also updates its existing inquiries. A source cannot be deleted while inquiries are still linked to it.
      </div>
    </section>
  );
};
