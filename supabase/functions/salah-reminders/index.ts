import { createClient } from 'npm:@supabase/supabase-js@2.30.0';
import webpush from 'npm:web-push@3.6.7';
import { cleanReminderSettings, validSubscription, validId, validToken, notificationGroups, reminderNotification } from './validation.mjs';

const origins = new Set(['https://jicmasjid.org', 'https://www.jicmasjid.org']);
const sha = async (value: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(n=>n.toString(16).padStart(2,'0')).join('');
const sameSecret = async (a: string, b: string) => {
  if (!a || !b) return false;
  const left=await sha(a), right=await sha(b); let diff=0;
  for(let i=0;i<left.length;i++) diff |= left.charCodeAt(i)^right.charCodeAt(i);
  return diff===0;
};
async function jsonBody(req: Request) {
  const reader=req.body?.getReader(); if(!reader) throw new Error('Empty request.');
  const chunks: Uint8Array[]=[]; let size=0;
  while(true) { const {done,value}=await reader.read(); if(done) break; size+=value.length;
    if(size>8192) { await reader.cancel(); throw new Error('Request too large.'); } chunks.push(value); }
  const bytes=new Uint8Array(size); let offset=0; for(const chunk of chunks) {bytes.set(chunk,offset);offset+=chunk.length;}
  return JSON.parse(new TextDecoder().decode(bytes));
}

Deno.serve(async(req: Request)=>{
  const origin=req.headers.get('origin');
  const headers: Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin',
    'Access-Control-Allow-Headers':'authorization,apikey,x-client-info,content-type','Access-Control-Allow-Methods':'POST,GET,OPTIONS'};
  if(origin && origins.has(origin)) headers['Access-Control-Allow-Origin']=origin;
  const reply=(status:number,body:object)=>new Response(JSON.stringify(body),{status,headers});
  if(origin && !origins.has(origin)) return reply(403,{error:'Open reminders on the JIC website.'});
  if(req.method==='OPTIONS') return new Response(null,{status:204,headers});
  if(!['GET','POST'].includes(req.method)) return reply(405,{error:'Use GET or POST.'});
  try {
    const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
    const rpc=async(name:string,params:object={})=>{const {data,error}=await client.rpc(name,params);if(error) throw error;return data;};
    let runtime=await rpc('salah_reminder_runtime');
    const secret=req.headers.get('x-salah-dispatch');
    const send=async(subscription:object,payload:object)=>webpush.sendNotification(validSubscription(subscription),JSON.stringify(payload),{
      TTL:120,urgency:'high',timeout:5000,vapidDetails:{subject:'mailto:info@jicwoodlands.org.uk',publicKey:runtime.public_key,privateKey:runtime.private_key}});
    if(secret!==null) {
      if(req.method!=='POST' || !await sameSecret(secret,runtime.dispatch_secret)) return reply(401,{error:'Not authorised.'});
      if(!runtime.enabled) return reply(200,{ok:true,sent:0});
      if(!runtime.private_key) runtime=await rpc('salah_reminder_runtime',{p_keys:webpush.generateVAPIDKeys()});
      let sent=0,failed=0;
      const groups=notificationGroups(await rpc('salah_reminder_claim'));
      // Bounded batches, no endpoints/tokens/payloads in logs or responses.
      for(let offset=0;offset<groups.length;offset+=8) await Promise.all(groups.slice(offset,offset+8).map(async(group: any)=>{
        try {await send(group.subscription,reminderNotification(group));
          await rpc('salah_reminder_finish',{p_jobs:group.jobs,p_status:'sent'});sent++;
        } catch(error) {
          const status=Number(error.statusCode||0); const retry=!status || status===429 || status>=500;
          await rpc('salah_reminder_finish',{p_jobs:group.jobs,p_status:retry?'pending':'failed',p_gone_device:status===404||status===410?group.device_id:null});failed++;
        }
      }));
      await rpc('salah_reminder_heartbeat');
      return reply(200,{ok:true,sent,failed});
    }
    const ready=Boolean(runtime.enabled && runtime.public_key && runtime.last_run_at && Date.now()-Date.parse(runtime.last_run_at)<240000);
    if(req.method==='GET') return reply(200,{ready,publicKey:ready?runtime.public_key:null});
    if(!req.headers.get('content-type')?.includes('application/json')) return reply(415,{error:'Use JSON.'});
    const body=await jsonBody(req);
    if(!body || typeof body!=='object' || Array.isArray(body) || !validToken(body.token) || !validId(body.id)) return reply(400,{error:'Device access required. Reopen reminder setup.'});
    const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if(!await rpc('salah_reminder_limit',{p_bucket:await sha(ip)})) return reply(429,{error:'Too many requests. Try again later.'});
    const params: any={p_action:body.action,p_id:body.id,p_hash:await sha(body.token)};
    if(body.action==='save') {
      if(!ready) return reply(503,{error:'The reminder sender is temporarily unavailable. Please retry.'});
      params.p_subscription=validSubscription(body.subscription);params.p_preferences=cleanReminderSettings(body.preferences);params.p_expected=body.expected||null;
    }
    if(!['status','save','remove','test'].includes(body.action)) return reply(400,{error:'Unknown reminder action.'});
    if(body.action==='test' && !ready) return reply(503,{error:'The reminder sender is temporarily unavailable.'});
    const result=await rpc('salah_reminder_device',params);
    if(body.action==='test') {
      try { await send(result.subscription,{title:'JIC Salah reminders',body:'Your test reminder arrived. Your phone may silence or delay alerts depending on its settings.',tag:'jic-salah-test',url:'/prayer-times/reminders'}); }
      catch(error) {
        if([404,410].includes(Number(error.statusCode))) await rpc('salah_reminder_device',{...params,p_action:'remove'});
        return reply(503,{error:'The test could not be delivered. Check phone permissions or enable reminders again.'});
      }
      return reply(200,{ok:true});
    }
    return reply(200,result);
  } catch(error) {
    const message=String(error.message||'');
    if(/Device access required/.test(message)) return reply(403,{error:'Device access could not be verified. Reopen setup.'});
    if(/settings changed/.test(message)) return reply(409,{error:'Settings changed in another tab. Reload before saving.'});
    if(/Wait a minute/.test(message)) return reply(429,{error:'Wait a minute before another test.'});
    if(error.code==='23505') return reply(409,{error:'This device has an existing subscription. Reset its notification permission and try again.'});
    if(error instanceof Error && !error.code && !/fetch|network/i.test(message)) return reply(400,{error:message.slice(0,160)});
    return reply(503,{error:'Reminders are temporarily unavailable. Your saved settings have not been confirmed.'});
  }
});
