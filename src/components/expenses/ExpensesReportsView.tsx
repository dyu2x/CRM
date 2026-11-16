import { ExportDataButton } from '../common/ExportDataButton';
import React, { useEffect, useMemo, useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { TabKey } from '../Navbar';

type Kind = 'employees'|'attendance'|'weekly_attendance'|'salaries'|'obligations'|'farm_maintenance'|'extra_expenses'|'obligations_list'|'farm_maintenance_list';
const config: Record<Kind,{title:string;fields:{key:string;label:string;type?:string;options?:string[]}[];readonly?:boolean}> = {
 employees:{title:'Employees',fields:[{key:'name',label:'Name'},{key:'address',label:'Address'},{key:'birthdate',label:'Birthdate',type:'date'},{key:'tin',label:'TIN'},{key:'work_location',label:'Work location'},{key:'role',label:'Role'},{key:'is_active',label:'Active',type:'select',options:['true','false']},{key:'hire_date',label:'Hire date',type:'date'},{key:'end_date',label:'End date',type:'date'},{key:'hourly_rate',label:'Hourly rate',type:'number'}]},
 attendance:{title:'Attendance',fields:[{key:'employee_id',label:'Employee',type:'employee'},{key:'time_in',label:'Time in',type:'datetime-local'},{key:'time_out',label:'Time out',type:'datetime-local'},{key:'notes',label:'Notes'}]},
 weekly_attendance:{title:'Weekly Attendance',readonly:true,fields:[{key:'employee_name',label:'Employee'},{key:'total_work_hours',label:'Total work hours'}]},
 salaries:{title:'Salaries',readonly:true,fields:[{key:'name',label:'Employee'},{key:'rate',label:'Hourly rate'},{key:'total_hours',label:'Hours in selected period'},{key:'salary',label:'Calculated salary'}]},
 obligations_list:{title:'Obligations List',fields:[{key:'name',label:'Name'},{key:'description',label:'Description'}]},
 obligations:{title:'Obligations',fields:[{key:'name',label:'Liability',type:'liability'},{key:'cost',label:'Cost',type:'number'},{key:'date',label:'Date',type:'date'},{key:'receipt',label:'Receipt URL / file reference'},{key:'company',label:'Company'},{key:'notes',label:'Notes'},{key:'status',label:'Status',type:'select',options:['pending','paid']}]},
 farm_maintenance_list:{title:'Farm Maintenance List',fields:[{key:'name',label:'Name'},{key:'description',label:'Description'}]},
 farm_maintenance:{title:'Farm Maintenance',fields:[{key:'name',label:'Maintenance item',type:'maintenance'},{key:'cost',label:'Cost',type:'number'},{key:'date',label:'Date',type:'date'},{key:'receipt',label:'Receipt URL / file reference'},{key:'company',label:'Company'},{key:'status',label:'Status',type:'select',options:['pending','paid']},{key:'notes',label:'Notes'}]},
 extra_expenses:{title:'Extra Expenses',fields:[{key:'name',label:'Name'},{key:'cost',label:'Cost',type:'number'},{key:'date',label:'Date',type:'date'},{key:'receipt',label:'Receipt URL / file reference'},{key:'company',label:'Company'},{key:'status',label:'Status',type:'select',options:['pending','paid']},{key:'description',label:'Description'}]},
};
const expenseTabs:Kind[]=['employees','attendance','weekly_attendance','salaries','obligations','farm_maintenance','extra_expenses','obligations_list','farm_maintenance_list'];
export const expenseTabKeys = expenseTabs as TabKey[];
const dateOnly=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const defaultWeek=()=>{const d=new Date();const day=(d.getDay()+6)%7;const start=new Date(d);start.setDate(d.getDate()-day);const end=new Date(start);end.setDate(start.getDate()+6);return [dateOnly(start),dateOnly(end)] as const;};

export const ExpensesReportsView:React.FC<{activeTab:TabKey}> = ({activeTab})=>{
 if (activeTab === 'expenses_overview') return <ExpensesOverviewView />;
 const kind=expenseTabs.includes(activeTab as Kind)?activeTab as Kind:'employees';
 const [rows,setRows]=useState<any[]>([]),[employees,setEmployees]=useState<any[]>([]),[lookups,setLookups]=useState<any[]>([]);
 const [editing,setEditing]=useState<any|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [search,setSearch]=useState(''),[statusFilter,setStatusFilter]=useState('all');
 const [range,setRange]=useState(defaultWeek); const [dateFilter,setDateFilter]=useState<[string,string]>(['','']);
 const {currentUser}=useCRM(); const token=localStorage.getItem('mesina_crm_token')||'';
 const load=async()=>{setError('');try{
   const params=['weekly_attendance','salaries'].includes(kind)?`?startDate=${range[0]}&endDate=${range[1]}`:'';
   const r=await fetch(`/api/expenses/${kind}${params}`,{headers:{Authorization:`Bearer ${token}`}});const d=await r.json();if(!r.ok)throw Error(d.error||'Unable to load records');setRows(d.rows||[]);
   if(kind==='attendance'){const e=await fetch('/api/expenses/employees',{headers:{Authorization:`Bearer ${token}`}});setEmployees((await e.json()).rows||[]);}
   if(kind==='obligations'){const e=await fetch('/api/expenses/obligations_list',{headers:{Authorization:`Bearer ${token}`}});setLookups((await e.json()).rows||[]);}
   if(kind==='farm_maintenance'){const e=await fetch('/api/expenses/farm_maintenance_list',{headers:{Authorization:`Bearer ${token}`}});setLookups((await e.json()).rows||[]);}
 }catch(e:any){setError(e.message)}};
 useEffect(()=>{load();setEditing(null);setSearch('');setStatusFilter('all');setDateFilter(['',''])},[kind,range[0],range[1]]);
 const fields=config[kind].fields;
 const startNew=()=>setEditing(Object.fromEntries(fields.map(f=>[f.key,f.type==='select'?(f.options?.[0]||''):f.type==='employee'?(employees[0]?.id||''):f.key==='date'?dateOnly(new Date()):''])));
 const save=async()=>{setBusy(true);try{const payload={...editing,added_by_agent:currentUser?.name||''};const id=payload.id;delete payload.id;const r=await fetch(`/api/expenses/${kind}${id?'/'+id:''}`,{method:id?'PUT':'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)throw Error(d.error||'Save failed');setEditing(null);await load()}catch(e:any){setError(e.message)}finally{setBusy(false)}};
 const remove=async(id:number)=>{if(!confirm('Delete this record?'))return;const r=await fetch(`/api/expenses/${kind}/${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${token}`}});const d=await r.json();if(!r.ok){setError(d.error||'Delete failed');return}load()};
 const fmt=(v:any)=>{if(v===null||v===undefined||v==='')return '—';if(typeof v==='boolean')return v?'Yes':'No';if(typeof v==='number')return String(v);const raw=String(v);if(/^\d{4}-\d{2}-\d{2}T/.test(raw))return new Date(raw).toLocaleString();if(/^\d{4}-\d{2}-\d{2}$/.test(raw)){const [y,m,d]=raw.split('-');return `${m}/${d}/${y}`;}return raw};
 const columns=kind==='attendance'?['id','employee_name','time_in','time_out','work_hours','notes']:kind==='weekly_attendance'?['employee_name','total_work_hours']:kind==='salaries'?['name','rate','total_hours','salary']:['id',...fields.map(f=>f.key)];
 const filteredRows=useMemo(()=>rows.filter(r=>{
   const haystack=Object.values(r).map(v=>String(v??'')).join(' ').toLowerCase();
   const matchesSearch=!search.trim()||haystack.includes(search.trim().toLowerCase());
   const matchesStatus=statusFilter==='all'||String(r.status||'').toLowerCase()===statusFilter;
   const dateValue=String(r.date||r.time_in||r.hire_date||'').slice(0,10);
   const matchesDate=!(dateFilter[0]||dateFilter[1])||!dateValue||((!dateFilter[0]||dateValue>=dateFilter[0])&&(!dateFilter[1]||dateValue<=dateFilter[1]));
   return matchesSearch&&matchesStatus&&matchesDate;
 }),[rows,search,statusFilter,dateFilter,kind]);
 return <div className="space-y-4">
  <div className="flex justify-end"><ExportDataButton tableKey={kind} tableLabel={config[kind].title} rows={filteredRows as Record<string, unknown>[]}/></div>
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">{config[kind].title}</h2><p className="text-xs text-neutral-500">{config[kind].readonly?'Automatically calculated from attendance records.':'Manage expenses workspace records.'}</p></div>{!config[kind].readonly&&<button onClick={startNew} className="rounded-md bg-neutral-900 px-4 py-2 text-xs font-semibold text-white">Add record</button>}</div>
  {error&&<div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
  {editing&&<div className="grid grid-cols-1 gap-3 rounded-lg border bg-white p-4 sm:grid-cols-2">{fields.map(f=><label key={f.key} className="space-y-1 text-xs"><span className="font-medium text-neutral-600">{f.label}</span>
    {f.type==='select'?<select className="w-full rounded border p-2" value={editing[f.key]??''} onChange={e=>setEditing({...editing,[f.key]:e.target.value})}>{f.options?.map(o=><option key={o} value={o}>{o}</option>)}</select>
    :f.type==='employee'?<select className="w-full rounded border p-2" value={editing[f.key]??''} onChange={e=>setEditing({...editing,[f.key]:Number(e.target.value)})}>{employees.map(e=><option value={e.id} key={e.id}>{e.name}</option>)}</select>
    :f.type==='liability'||f.type==='maintenance'?<select className="w-full rounded border p-2" value={editing[f.key]??''} onChange={e=>setEditing({...editing,[f.key]:e.target.value})}>{lookups.map(o=><option key={o.id} value={o.name}>{o.name}</option>)}</select>
    :<input className="w-full rounded border p-2" type={f.type||'text'} value={editing[f.key]??''} onChange={e=>setEditing({...editing,[f.key]:e.target.value})}/>}</label>)}
    <div className="flex gap-2 sm:col-span-2"><button disabled={busy} onClick={save} className="rounded bg-neutral-900 px-4 py-2 text-xs text-white">{busy?'Saving…':'Save'}</button><button onClick={()=>setEditing(null)} className="rounded border px-4 py-2 text-xs">Cancel</button></div></div>}
  <div className="flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-3">
    <label className="min-w-[220px] flex-1 space-y-1 text-xs"><span className="font-semibold text-neutral-600">Search this table</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search any column…" className="w-full rounded border border-neutral-300 px-3 py-2"/></label>
    {['obligations','farm_maintenance','extra_expenses'].includes(kind)&&<label className="space-y-1 text-xs"><span className="font-semibold text-neutral-600">Payment status</span><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="block rounded border border-neutral-300 px-3 py-2"><option value="all">All statuses</option><option value="pending">Pending</option><option value="paid">Paid</option></select></label>}
    {['attendance','obligations','farm_maintenance','extra_expenses'].includes(kind)&&<><label className="space-y-1 text-xs"><span className="font-semibold text-neutral-600">From date</span><input type="date" value={dateFilter[0]} onChange={e=>setDateFilter([e.target.value,dateFilter[1]])} className="block rounded border border-neutral-300 px-3 py-2"/></label><label className="space-y-1 text-xs"><span className="font-semibold text-neutral-600">To date</span><input type="date" value={dateFilter[1]} onChange={e=>setDateFilter([dateFilter[0],e.target.value])} className="block rounded border border-neutral-300 px-3 py-2"/></label></>}
    {['weekly_attendance','salaries'].includes(kind)&&<><label className="space-y-1 text-xs"><span className="font-semibold text-neutral-600">Period start</span><input type="date" value={range[0]} onChange={e=>setRange([e.target.value,range[1]])} className="block rounded border border-neutral-300 px-3 py-2"/></label><label className="space-y-1 text-xs"><span className="font-semibold text-neutral-600">Period end</span><input type="date" value={range[1]} onChange={e=>setRange([range[0],e.target.value])} className="block rounded border border-neutral-300 px-3 py-2"/></label></>}
    {(search||statusFilter!=='all'||dateFilter[0]||dateFilter[1])&&<button onClick={()=>{setSearch('');setStatusFilter('all');setDateFilter(['',''])}} className="rounded border px-3 py-2 text-xs">Clear filters</button>}
  </div>
  <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white"><table className="w-full text-left text-xs"><thead className="bg-neutral-50 text-neutral-500"><tr>{columns.map(k=><th key={k} className="whitespace-nowrap px-3 py-3 font-semibold">{k.replaceAll('_',' ')}</th>)}{!config[kind].readonly&&<th className="px-3 py-3">Actions</th>}</tr></thead><tbody className="divide-y divide-neutral-100">{filteredRows.map((r,i)=><tr key={r.id||r.employee_id||i}>{columns.map(k=><td key={k} className="whitespace-nowrap px-3 py-3">{fmt(r[k])}</td>)}{!config[kind].readonly&&<td className="whitespace-nowrap px-3 py-2"><button onClick={()=>setEditing({...r})} className="mr-3 text-blue-700">Edit</button><button onClick={()=>remove(r.id)} className="text-red-600">Delete</button></td>}</tr>)}</tbody></table>{!filteredRows.length&&<div className="p-8 text-center text-xs text-neutral-400">No records match your filters.</div>}</div>
  <div className="text-xs text-neutral-500">Showing {filteredRows.length} of {rows.length} records.</div>
  {kind==='salaries'&&<p className="text-xs text-neutral-500">Salary = hourly rate × completed attendance hours from {new Date(`${range[0]}T00:00:00`).toLocaleDateString()} through {new Date(`${range[1]}T00:00:00`).toLocaleDateString()} (inclusive).</p>}
 </div>
};


const ExpensesOverviewView:React.FC = ()=>{
 const {currentUser,rolePermissions}=useCRM();
 const token=localStorage.getItem('mesina_crm_token')||'';
 const [data,setData]=useState<Record<string,any[]>>({});
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const allowed=currentUser?.role==='Admin'?['obligations','farm_maintenance','extra_expenses','salaries','employees']:((rolePermissions[currentUser?.role||'']||[]).filter(k=>['obligations','farm_maintenance','extra_expenses','salaries','employees'].includes(k)));
 useEffect(()=>{
  let live=true;
  (async()=>{
   setLoading(true);setError('');
   const results=await Promise.all(allowed.map(async kind=>{
    const response=await fetch(`/api/expenses/${kind}`,{headers:{Authorization:`Bearer ${token}`}});
    const body=await response.json();if(!response.ok)throw new Error(body.error||`Unable to load ${kind}`);
    return [kind,body.rows||[]] as const;
   }));
   if(live)setData(Object.fromEntries(results));
  })().catch(e=>{if(live)setError(e.message||'Unable to load expense overview')}).finally(()=>{if(live)setLoading(false)});
  return ()=>{live=false};
 },[currentUser?.role,token,allowed.join(',')]);
 const expenseRows=[...(data.obligations||[]).map(r=>({...r,category:'Obligations'})),...(data.farm_maintenance||[]).map(r=>({...r,category:'Farm Maintenance'})),...(data.extra_expenses||[]).map(r=>({...r,category:'Extra Expenses'}))];
 const total=expenseRows.reduce((sum,r)=>sum+(Number(r.cost)||0),0);
 const paid=expenseRows.filter(r=>String(r.status||'').toLowerCase()==='paid').reduce((sum,r)=>sum+(Number(r.cost)||0),0);
 const pending=expenseRows.filter(r=>String(r.status||'').toLowerCase()==='pending').reduce((sum,r)=>sum+(Number(r.cost)||0),0);
 const salaryRows=data.salaries||[];const payroll=salaryRows.reduce((sum,r)=>sum+(Number(r.salary)||0),0);
 const currency=(n:number)=>new Intl.NumberFormat(undefined,{style:'currency',currency:'PHP',maximumFractionDigits:2}).format(n);
 const recent=[...expenseRows].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,8);
 return <div className="space-y-5">
  <div className="flex justify-end"><ExportDataButton tableKey="expenses_overview" tableLabel="Expenses Overview" rows={expenseRows as Record<string, unknown>[]}/></div>
  <div><h2 className="text-lg font-bold">Expense Report Overview</h2><p className="text-xs text-neutral-500">Summary of recorded expenses and payroll data available to your role.</p></div>
  {error&&<div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
  {loading?<div className="rounded-lg border bg-white p-8 text-center text-sm text-neutral-500">Loading expense summary…</div>:<>
   <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {[{label:'Total recorded expenses',value:currency(total),hint:`${expenseRows.length} expense records`},{label:'Paid expenses',value:currency(paid),hint:`${expenseRows.filter(r=>String(r.status||'').toLowerCase()==='paid').length} marked paid`},{label:'Pending expenses',value:currency(pending),hint:`${expenseRows.filter(r=>String(r.status||'').toLowerCase()==='pending').length} awaiting payment`},{label:'Payroll total',value:currency(payroll),hint:`${salaryRows.length} salary entries returned`}].map(card=><div key={card.label} className="rounded-lg border border-neutral-200 bg-white p-4"><p className="text-xs font-medium text-neutral-500">{card.label}</p><p className="mt-2 text-xl font-bold tracking-tight">{card.value}</p><p className="mt-1 text-[11px] text-neutral-400">{card.hint}</p></div>)}
   </div>
   <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
    <section className="rounded-lg border border-neutral-200 bg-white p-4 lg:col-span-2"><h3 className="text-sm font-semibold">Recent expenses</h3><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-neutral-50 text-neutral-500"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Description</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2">Status</th></tr></thead><tbody className="divide-y divide-neutral-100">{recent.map((r,i)=><tr key={`${r.category}-${r.id||i}`}><td className="whitespace-nowrap px-3 py-2">{r.date ? new Date(`${String(r.date).slice(0,10)}T00:00:00`).toLocaleDateString() : '—'}</td><td className="whitespace-nowrap px-3 py-2">{r.category}</td><td className="px-3 py-2">{r.name||r.company||'—'}</td><td className="whitespace-nowrap px-3 py-2 text-right">{currency(Number(r.cost)||0)}</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-[10px] ${String(r.status).toLowerCase()==='paid'?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>{r.status||'Unspecified'}</span></td></tr>)}</tbody></table>{!recent.length&&<p className="p-6 text-center text-xs text-neutral-400">No expense records are available for this account.</p>}</div></section>
    <section className="rounded-lg border border-neutral-200 bg-white p-4"><h3 className="text-sm font-semibold">Expense breakdown</h3><div className="mt-4 space-y-4">{[{label:'Obligations',rows:data.obligations||[]},{label:'Farm maintenance',rows:data.farm_maintenance||[]},{label:'Extra expenses',rows:data.extra_expenses||[]}].map(group=>{const amount=group.rows.reduce((sum,r)=>sum+(Number(r.cost)||0),0);const pct=total?Math.round(amount/total*100):0;return <div key={group.label}><div className="mb-1 flex justify-between text-xs"><span className="text-neutral-600">{group.label}</span><span className="font-semibold">{currency(amount)}</span></div><div className="h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-neutral-800" style={{width:`${pct}%`}}/></div><p className="mt-1 text-[10px] text-neutral-400">{pct}% of recorded expenses</p></div>})}</div></section>
   </div>
  </>}
 </div>;
};
