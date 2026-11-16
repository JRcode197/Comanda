'use server';
import {workspace} from '@/lib/auth/context';
import {z} from 'zod';
export async function issueInvitation(slug:string,key:string,token:string,_state:{error:string;code:string},form:FormData){
 const {db,org}=await workspace(slug);const email=z.email().safeParse(form.get('email'));const role=z.enum(['manager','staff','partner','admin','owner']).safeParse(form.get('role'));
 if(!email.success||!role.success||!/^[a-f0-9-]{72}$/.test(token))return {error:'Dati invito non validi.',code:''};
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 const {error}=await db.rpc('command',{p_org:org.id,p_operation:'create_invitation',p_key:key,p_payload:{email:email.data,role:role.data,token_hash:hash}});
 return error?{error:'Invito non creato. Verifica il tuo ruolo e riprova.',code:''}:{error:'',code:token};
}
