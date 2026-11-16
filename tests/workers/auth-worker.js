// Test-only Worker: never deploy. Credentials are supplied by the local harness.
import {createServerClient,parseCookieHeader,serializeCookieHeader} from '@supabase/ssr';
const worker = {
 async fetch(request,env){
  const cookies=parseCookieHeader(request.headers.get('cookie')??'');const changed=[];
  const db=createServerClient(env.SUPABASE_URL,env.SUPABASE_KEY,{cookies:{getAll:()=>cookies,setAll:(values)=>{for(const cookie of values){const existing=cookies.find(x=>x.name===cookie.name);if(existing)existing.value=cookie.value;else cookies.push(cookie);changed.push(serializeCookieHeader(cookie.name,cookie.value,cookie.options));}}}});
  const path=new URL(request.url).pathname;
  let result;
  if(path==='/login'){const {error}=await db.auth.signInWithPassword(await request.json());result={ok:!error};}
  else if(path==='/refresh'){const {error}=await db.auth.refreshSession();result={ok:!error};}
  else if(path==='/logout'){const {error}=await db.auth.signOut();result={ok:!error};}
  else{const {data,error}=await db.auth.getClaims();const rows=await db.from('contacts').select('organization_id');result={ok:!error&&!!data?.claims?.sub,organizations:rows.data?.map(r=>r.organization_id)??[],queryError:rows.error?.code};}
  const headers=new Headers({'Content-Type':'application/json','Cache-Control':'private, no-store'});for(const c of changed)headers.append('Set-Cookie',c);
  return new Response(JSON.stringify(result),{headers});
 }
};

export default worker;
