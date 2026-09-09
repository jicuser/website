import React,{useEffect,useState}from'react';
import{Save,MessageCircle}from'lucide-react';
import{supabase}from'@/lib/supabaseClient';

const KEY='whatsapp_community_url';

export default function CommunityLinksEditor(){
  const[url,setUrl]=useState('');
  const[busy,setBusy]=useState(false);
  const[msg,setMsg]=useState('');

  useEffect(()=>{
    supabase.from('page_content').select('content_value').eq('content_key',KEY).maybeSingle().then(({data})=>setUrl(data?.content_value||''));
  },[]);

  const save=async()=>{
    setBusy(true);setMsg('');
    try{
      const clean=url.trim();
      if(clean){const u=new URL(clean);if(!['chat.whatsapp.com','wa.me','www.whatsapp.com','whatsapp.com'].includes(u.hostname))throw new Error('Use a WhatsApp community or invite link.');}
      const{error}=await supabase.from('page_content').upsert({content_key:KEY,content_value:clean,content_type:'text',page:'/'},{onConflict:'content_key'});
      if(error)throw error;
      setMsg('WhatsApp community link saved.');
      window.dispatchEvent(new Event('jic-content-updated'));
    }catch(e){setMsg(e.message)}finally{setBusy(false)}
  };

  return <section className="admin-panel">
    <div className="admin-heading"><div><h3>WhatsApp community</h3><p>Add the official JIC WhatsApp Community invite link. It will appear on the public website.</p></div><MessageCircle/></div>
    <label>Community invite URL<input type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://chat.whatsapp.com/..."/></label>
    <div className="admin-actions"><button type="button" onClick={save} disabled={busy} className="admin-button primary"><Save size={16}/>{busy?'Saving…':'Save link'}</button>{msg&&<small>{msg}</small>}</div>
  </section>;
}
