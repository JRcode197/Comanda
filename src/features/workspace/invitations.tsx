'use client';
import {useActionState,useState} from 'react';
import {issueInvitation} from './issue-invitation';
import {Button} from '@/components/ui/button';
export function InvitationForm({slug,owner}:{slug:string;owner:boolean}){
 const [token]=useState(()=>crypto.randomUUID()+crypto.randomUUID());const [key]=useState(()=>crypto.randomUUID());
 const [state,action,pending]=useActionState(issueInvitation.bind(null,slug,key,token),{error:'',code:''});
 return <details className="panel"><summary className="font-semibold">＋ Prepara invito</summary><form action={action} className="mt-5 grid gap-4"><label>Email dell’invitato<input type="email" name="email" required/></label><label htmlFor="invitation-role">Ruolo</label><select id="invitation-role" name="role"><option value="manager">Booking manager</option><option value="staff">Staff</option><option value="partner">Partner (portale differito)</option>{owner&&<><option value="admin">Admin</option><option value="owner">Owner</option></>}</select><p className="muted text-sm">Validità 72 ore. L’amministratore prepara separatamente l’invito Auth in Supabase e comunica questo codice. Nessuna email viene inviata da questo modulo.</p>{state.error&&<p role="alert" className="text-red-300">{state.error}</p>}{state.code&&<div role="status" className="break-all rounded-lg border border-amber-500 p-4"><p>Codice da comunicare all’invitato:</p><code>{state.code}</code></div>}<Button disabled={pending||!!state.code}>Prepara codice invito</Button></form></details>;
}
