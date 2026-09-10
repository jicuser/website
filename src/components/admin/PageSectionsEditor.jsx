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
  const add=async e=>{e.preventDefault();setBusy(true);setMsg('');try{const section_key=(form.section_key||form.title||`section-${Date.now()}`).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');const{error}=await supabase.from('page_sections').insert({...form,page_path:pagePath,section_key}).select('id').single();if(error)throw error;setForm(blank);window.dispatchEvent(new Event('jic-content-updated'));setMsg('Section added to database.');await load()}catch(x){setMsg(x.message)}finally{setBusy(false)}};
  const saveRow=async(id,draft,pendingBackground,pendingGallery)=>{setBusy(true);setMsg('');try{let background_image_url=draft.background_image_url||'';let image_urls=Array.isArray(draft.image_urls)?[...draft.image_urls]:[];const folder=pagePath.replaceAll('/','-')||'home';if(pendingBackground)background_image_url=await uploadImage(pendingBackground,`sections/${folder}/backgrounds`);for(const file of pendingGallery||[])image_urls.push(await uploadImage(file,`sections/${folder}/gallery`));const payload={title:draft.title||'',body:draft.body||'',sort_order:Number(draft.sort_order)||0,published:!!draft.published,background_image_url,image_urls};const{error}=await supabase.from('page_sections').update(payload).eq('id',id).select('id').single();if(error)throw error;window.dispatchEvent(new Event('jic-content-updated'));setMsg('Section updated in database.');await load()}catch(x){setMsg(x.message)}finally{setBusy(false)}};
  const del=async id=>{if(!window.confirm('Delete this section?'))return;setBusy(true);const{error}=await supabase.from('page_sections').delete().eq('id',id).select('id').single();setMsg(error?.message||'Section deleted.');await load();setBusy(false)};
  return <section className="admin-panel">
    <div className="admin-heading"><div><h3>Page sections & backgrounds</h3><p>Edit freely here. Supabase is only updated when you press Add section, Update database, or Delete.</p></div></div>
    {msg&&<div className="admin-hint">{msg}</div>}
    <form onSubmit={add} className="admin-section-create">
      <label>Section name<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Our facilities"/></label>
      <label>Information<textarea rows="3" value={form.body} onChange={e=>setForm({...form,body:e.target.value})} placeholder="Section text"/></label>
      <label>Order<input type="number" value={form.sort_order} onChange={e=>setForm({...form,sort_order:Number(e.target.value)})}/></label>
      <button disabled={busy} className="admin-button primary"><Plus size={16}/>Add section</button>
    </form>
    <div className="admin-section-list">{rows.map(row=><SectionRow key={row.id} row={row} busy={busy} onSave={saveRow} onDelete={del}/>)}</div>
  </section>;
}

function SectionRow({row,busy,onSave,onDelete}){
  const[draft,setDraft]=useState(row),[dirty,setDirty]=useState(false),[pendingBackground,setPendingBackground]=useState(null),[pendingBackgroundPreview,setPendingBackgroundPreview]=useState(''),[pendingGallery,setPendingGallery]=useState([]),[pendingGalleryPreviews,setPendingGalleryPreviews]=useState([]);
  useEffect(()=>{setDraft(row);setDirty(false);setPendingBackground(null);setPendingGallery([]);setPendingBackgroundPreview('');setPendingGalleryPreviews([])},[row]);
  const change=patch=>{setDraft(d=>({...d,...patch}));setDirty(true)};
  const chooseBackground=e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;setPendingBackground(file);setPendingBackgroundPreview(URL.createObjectURL(file));setDirty(true)};
  const chooseGallery=e=>{const files=[...(e.target.files||[])];e.target.value='';if(!files.length)return;setPendingGallery(g=>[...g,...files]);setPendingGalleryPreviews(p=>[...p,...files.map(f=>URL.createObjectURL(f))]);setDirty(true)};
  const save=async()=>{await onSave(row.id,draft,pendingBackground,pendingGallery)};
  const images=Array.isArray(draft.image_urls)?draft.image_urls:[];
  const backgroundPreview=pendingBackgroundPreview||draft.background_image_url;
  return <article className="admin-section-card">
    <div className="admin-section-card-head"><strong>{draft.title||draft.section_key}</strong><div className="admin-actions"><button type="button" className="admin-button primary" disabled={busy||!dirty} onClick={save}><Save size={14}/>{busy?'Updating…':'Update database'}</button><button type="button" className="admin-button danger" disabled={busy} onClick={()=>onDelete(row.id)}><Trash2 size={14}/></button></div></div>
    <label>Heading<input value={draft.title||''} onChange={e=>change({title:e.target.value})}/></label>
    <label>Information<textarea rows="4" value={draft.body||''} onChange={e=>change({body:e.target.value})}/></label>
    <div className="admin-section-media">
      <div><span>Background</span>{backgroundPreview?<img src={backgroundPreview} alt="Section background preview"/>:<div className="admin-picture-empty"><ImageIcon/><small>No background</small></div>}<label className="admin-button"><Upload size={14}/>Choose background<input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseBackground}/></label>{backgroundPreview&&<button className="admin-button" type="button" onClick={()=>{setPendingBackground(null);setPendingBackgroundPreview('');change({background_image_url:''})}}>Remove</button>}</div>
      <div><span>Gallery pictures</span><div className="admin-section-thumbs">{images.map((src,i)=><div key={`${row.id}-${i}`}><img src={src} alt=""/><button type="button" onClick={()=>change({image_urls:images.filter((_,n)=>n!==i)})}>×</button></div>)}{pendingGalleryPreviews.map((src,i)=><div key={`pending-${i}`}><img src={src} alt="New gallery preview"/><button type="button" onClick={()=>{setPendingGallery(g=>g.filter((_,n)=>n!==i));setPendingGalleryPreviews(p=>p.filter((_,n)=>n!==i));setDirty(true)}}>×</button></div>)}</div><label className="admin-button"><Upload size={14}/>Choose pictures<input hidden multiple type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseGallery}/></label></div>
    </div>
    <label className="admin-check"><input type="checkbox" checked={!!draft.published} onChange={e=>change({published:e.target.checked})}/>Published</label>
    <small>{dirty?'Draft changes — not yet published':'Saved'}</small>
  </article>;
}
