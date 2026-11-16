import {Miniflare} from 'miniflare';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const f=JSON.parse(readFileSync(new URL('../fixtures.json',import.meta.url)));
if(!['localhost','127.0.0.1'].includes(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname))throw Error('Local synthetic Auth only');
const bundle=await build({entryPoints:['tests/workers/auth-worker.js'],bundle:true,write:false,format:'esm',platform:'browser',conditions:['workerd','worker','browser'],external:['node:*']});
const runtime=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-08-06',compatibilityFlags:['nodejs_compat'],bindings:{SUPABASE_URL:process.env.NEXT_PUBLIC_SUPABASE_URL,SUPABASE_KEY:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}});
const jar=new Map();
async function call(path,body){const response=await runtime.dispatchFetch('http://localhost'+path,{method:body?'POST':'GET',headers:{cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '),'content-type':'application/json'},body:body?JSON.stringify(body):undefined});for(const value of response.headers.getSetCookie()){const raw=value.split(';')[0];const split=raw.indexOf('=');jar.set(raw.slice(0,split),raw.slice(split+1));}assert.match(response.headers.get('cache-control'),/no-store/);return response.json();}
try{
 assert.equal((await call('/')).ok,false);
 assert.equal((await call('/login',{email:'owner.a@example.test',password:'Comanda-Test-Only-2026!'})).ok,true);assert.ok(jar.size>0);
 let current=await call('/');assert.equal(current.ok,true);assert.ok(current.organizations.length>0);assert.ok(current.organizations.every(o=>o===f.a));
 assert.equal((await call('/refresh')).ok,true);assert.equal((await call('/')).ok,true);
 assert.equal((await call('/logout')).ok,true);assert.equal((await call('/')).ok,false);
 console.log('PASS workerd: Supabase SSR login, cookies, validated identity, RLS, refresh, logout, no-store');
}finally{await runtime.dispose();}
