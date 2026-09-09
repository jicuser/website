import React,{useCallback,useEffect,useState}from'react';
import{Plus,Save,Trash2,Upload,Image as ImageIcon}from'lucide-react';
import{supabase}from'@/lib/supabaseClient';

const blank={section_key:'',title:'',body:'',background_image_url:'',image_urls:[],sort_order:0,published:true};

async function uploadImage(file,folder){
  if(!file)return'';
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024)throw new Error('Choose a JPG, PNG or WebP under 8 MB.');
  const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
  const path=`${folder}/${crypto.randomUUID()}.${ext}`;
  const{error}=await supabase.storage.from('site-images').upload(path,file,{upsert:false});
  if(error)throw error;
  return supabase.storage.from('site-images').getPublicUrl(path).data.publicUrl;
}

export default function PageSectionsEditor({pagePath}){
  const[rows,setRows]=useState([]),[form,setForm]=useState(blank),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
  const load=useCallback(async()=>{const{data,error}=await supabase.from('page_sections').select('*').eq('page_path',pagePath).order('sort_order');if(error)setMsg(error.message);else setRows(data||[])},[pagePath]);
  useEffect(()=>{load();setForm(blank)},[load]);
  const add=async e=>{e.preventDefault();setBusy(true);setMsg('');try{const section_key=(form.section_key||form.title||`section-${Date.now()}`).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');const{error}=await supabase.from('page_sections').insert({...form,page_path:pagePath,section_key});if(error)throw error;setForm(blank);setMsg('Section published.');await load()}catch(x){setMsg(x.message)}finally{setBusy(false)}};
  const patch=async(id,patch)=>{setBusy(true);setMsg('');try{const{error}=await supabase.from('page_sections').update(patch).eq('id',id);if(error)throw error;setMsg('Section updated.');await load()}catch(x){setMsg(x.message)}finally{setBusy(false)}};
  const del=async id=>{if(!window.confirm('Delete this section?'))return;setBusy(true);const{error}=await supabase.from('page_sections').delete().eq('id',id);setMsg(error?.message||'Section deleted.');await load();setBusy(false)};
  const background=async(e,row)=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;setBusy(true);try{const url=await uploadImage(file,`sections/${pagePath.replaceAll('/','-')||'home'}/backgrounds`);await patch(row.id,{background_image_url:url})}catch(x){setMsg(x.message);setBusy(false)}};
  const gallery=async(e,row)=>{const files=[...(e.target.files||[])];e.target.value='';if(!files.length)return;setBusy(true);try{const uploaded=[];for(const file of files)uploaded.push(await uploadImage(file,`sections/${pagePath.replaceAll('/','-')||'home'}/gallery`));await patch(row.id,{image_urls:[...(Array.isArray(row.image_urls)?row.image_urls:[]),...uploaded]})}catch(x){setMsg(x.message);setBusy(false)}};
  return <section className="admin-panel">
    <div className="admin-heading"><div><h3>Page sections & backgrounds</h3><p>Add editable blocks, background pictures and galleries to this page. Changes save to Supabase.</p></div></div>
    {msg&&<div className="admin-hint">{msg}</div>}
    <form onSubmit={add} className="admin-section-create">
      <label>Section name<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Our facilities"/></label>
      <label>Information<textarea rows="3" value={form.body} onChange={e=>setForm({...form,body:e.target.value})} placeholder="Section text"/></label>
      <label>Order<input type="number" value={form.sort_order} onChange={e=>setForm({...form,sort_order:Number(e.target.value)})}/></label>
      <button disabled={busy} className="admin-button primary"><Plus size={16}/>Add section</button>
    </form>
    <div className="admin-section-list">{rows.map(row=><SectionRow key={row.id} row={row} busy={busy} onPatch={patch} onDelete={del} onBackground={background} onGallery={gallery}/>)}</div>
  </section>;
}

function SectionRow({row,busy,onPatch,onDelete,onBackground,onGallery}){
  const[draft,setDraft]=useState(row);
  useEffect(()=>setDraft(row),[row]);
  const images=Array.isArray(draft.image_urls)?draft.image_urls:[];
  return <article className="admin-section-card">
    <div className="admin-section-card-head"><strong>{draft.title||draft.section_key}</strong><div className="admin-actions"><button type="button" className="admin-button" disabled={busy} onClick={()=>onPatch(row.id,{title:draft.title,body:draft.body,sort_order:Number(draft.sort_order)||0,published:!!draft.published})}><Save size={14}/>Save</button><button type="button" className="admin-button danger" disabled={busy} onClick={()=>onDelete(row.id)}><Trash2 size={14}/></button></div></div>
    <label>Heading<input value={draft.title||''} onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
    <label>Information<textarea rows="4" value={draft.body||''} onChange={e=>setDraft({...draft,body:e.target.value})}/></label>
    <div className="admin-section-media">
      <div><span>Background</span>{draft.background_image_url?<img src={draft.background_image_url} alt="Section background"/>:<div className="admin-picture-empty"><ImageIcon/><small>No background</small></div>}<label className="admin-button"><Upload size={14}/>Replace background<input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>onBackground(e,row)}/></label>{draft.background_image_url&&<button className="admin-button" type="button" onClick={()=>onPatch(row.id,{background_image_url:''})}>Remove</button>}</div>
      <div><span>Gallery pictures</span><div className="admin-section-thumbs">{images.map((src,i)=><div key={`${row.id}-${i}`}><img src={src} alt=""/><button type="button" onClick={()=>onPatch(row.id,{image_urls:images.filter((_,n)=>n!==i)})}>×</button></div>)}</div><label className="admin-button"><Upload size={14}/>Add pictures<input hidden multiple type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>onGallery(e,row)}/></label></div>
    </div>
    <label className="admin-check"><input type="checkbox" checked={!!draft.published} onChange={e=>setDraft({...draft,published:e.target.checked})}/>Published</label>
  </article>;
}
