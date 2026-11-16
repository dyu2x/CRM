import React, { useEffect, useState } from 'react';
import { KeyRound, UserRound, X } from 'lucide-react';
import { useCRM } from '../context/CRMContext';

interface Props { isOpen: boolean; onClose: () => void; }
export const ProfileModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { currentUser, updateMyProfile } = useCRM();
  const [name,setName]=useState(''); const [username,setUsername]=useState(''); const [email,setEmail]=useState(''); const [phone,setPhone]=useState(''); const [address,setAddress]=useState('');
  const [currentPassword,setCurrentPassword]=useState(''); const [newPassword,setNewPassword]=useState(''); const [confirmPassword,setConfirmPassword]=useState('');
  const [avatarUrl,setAvatarUrl]=useState(''); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
  useEffect(()=>{ if(currentUser){setName(currentUser.name||'');setUsername(currentUser.username||'');setEmail(currentUser.email||'');setPhone(currentUser.phone||'');setAddress(currentUser.address||'');setAvatarUrl(currentUser.avatar_url||'');} },[currentUser,isOpen]);
  if(!isOpen || !currentUser) return null;
  const submit=async(e:React.FormEvent)=>{e.preventDefault();setMessage('');if(newPassword && newPassword!==confirmPassword){setMessage('New password and confirmation do not match.');return;}setBusy(true);const result=await updateMyProfile({name,username,email,phone,address,currentPassword,newPassword,avatar_url:avatarUrl});setBusy(false);setMessage(result.message||'');if(result.success){setCurrentPassword('');setNewPassword('');setConfirmPassword('');}};
  return <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"><div className="bg-white w-full max-w-xl rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
    <div className="px-5 py-4 border-b flex items-center justify-between"><div className="flex items-center gap-2"><UserRound className="w-4 h-4"/><div><h2 className="font-semibold text-sm">My Profile</h2><p className="text-[11px] text-neutral-500">Update your account information and password</p></div></div><button onClick={onClose} className="p-1.5 rounded hover:bg-neutral-100"><X className="w-4 h-4"/></button></div>
    <form onSubmit={submit} className="p-5 overflow-y-auto space-y-4"><div className="flex items-center gap-4 mb-4"><img src={avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name||'User')}`} className="w-16 h-16 rounded-full object-cover border"/><label className="text-xs font-medium">Profile avatar<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="block mt-1 text-xs" onChange={e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>2*1024*1024){setMessage('Avatar must be smaller than 2 MB.');return;}const reader=new FileReader();reader.onload=()=>setAvatarUrl(String(reader.result||''));reader.readAsDataURL(file);}}/><span className="text-[10px] text-neutral-500">PNG, JPG, WEBP or GIF · max 2 MB</span></label></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {[['Full name',name,setName],['Username',username,setUsername],['Email',email,setEmail],['Phone',phone,setPhone]].map(([label,value,setter]:any)=><label key={label} className="text-xs font-medium text-neutral-700">{label}<input value={value} onChange={e=>setter(e.target.value)} className="mt-1 w-full border border-neutral-300 rounded px-3 py-2 text-sm" required={label==='Full name'||label==='Username'} type={label==='Email'?'email':'text'}/></label>)}
    </div><label className="block text-xs font-medium text-neutral-700">Address<input value={address} onChange={e=>setAddress(e.target.value)} className="mt-1 w-full border border-neutral-300 rounded px-3 py-2 text-sm"/></label>
    <div className="pt-3 border-t"><div className="flex items-center gap-2 text-xs font-semibold mb-3"><KeyRound className="w-4 h-4"/>Change password <span className="text-neutral-400 font-normal">(optional)</span></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <label className="text-xs text-neutral-700">Current password<input type="password" autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} className="mt-1 w-full border rounded px-3 py-2 text-sm"/></label>
      <label className="text-xs text-neutral-700">New password<input type="password" autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} minLength={10} className="mt-1 w-full border rounded px-3 py-2 text-sm" placeholder="10+ characters"/></label>
      <label className="text-xs text-neutral-700">Confirm password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="mt-1 w-full border rounded px-3 py-2 text-sm"/></label>
    </div></div>
    {message&&<p className={`text-xs rounded p-2 ${message.includes('success')?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-800'}`}>{message}</p>}
    <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="px-3 py-2 border rounded text-xs">Close</button><button disabled={busy} className="px-4 py-2 rounded bg-neutral-900 text-white text-xs disabled:opacity-50">{busy?'Saving…':'Save profile'}</button></div></form>
  </div></div>;
};
