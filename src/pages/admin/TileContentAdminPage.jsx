import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ImagePlus, Save, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const DEFAULT_TILES=[
  {key:'services',title:'Services',text:'Religious, educational and community services for all.',image:''},
  {key:'projects',title:'Projects',text:'Building for a stronger future.',image:''},
  {key:'youth',title:'Youth',text:'Activities, programs and opportunities.',image:''},
  {key:'madrassah',title:'Madrassah',text:'Islamic education for the next generation.',image:''},
];

async function uploadTileImage(file,key){
  if(!file)return null;if(!file.type.startsWith('image/'))throw new Error('Please choose an image file.');if(file.size>8*1024*1024)throw new Error('Image must be under 8 MB.');
  const ext=file.name.split('.').pop()?.toLowerCase()||'jpg';const path=`home-tiles/${key}-${crypto.randomUUID()}.${ext}`;
  const{error}=await supabase.storage.from('site-images').upload(path,file,{cacheControl:'3600',upsert:false});if(error)throw error;
  return supabase.storage.from('site-images').getPublicUrl(path).data.publicUrl;
}

export default function TileContentAdminPage(){
  const[tiles,setTiles]=useState(DEFAULT_TILES);const[busy,setBusy]=useState(false);const[message,setMessage]=useState('');const[error,setError]=useState('');
  useEffect(()=>{supabase.from('page_content').select('content_value').eq('content_key','home_tiles').maybeSingle().then(({data})=>{if(!data?.content_value)return;try{const saved=JSON.parse(data.content_value);if(Array.isArray(saved))setTiles(DEFAULT_TILES.map(base=>({...base,...(saved.find(x=>x.key===base.key)||{})})));}catch{}});},[]);
  const update=(index,patch)=>setTiles(rows=>rows.map((row,i)=>i===index?{...row,...patch}:row));
  const chooseImage=async(index,file)=>{try{setBusy(true);setError('');setMessage('Uploading image…');const url=await uploadTileImage(file,tiles[index].key);if(url)update(index,{image:url});setMessage('Image uploaded. Press Save changes to publish it.');}catch(e){setError(e.message||String(e));setMessage('');}finally{setBusy(false);}};
  const save=async()=>{try{setBusy(true);setError('');setMessage('');const payload={content_key:'home_tiles',content_value:JSON.stringify(tiles),content_type:'json',page:'home',updated_at:new Date().toISOString()};const{error:saveError}=await supabase.from('page_content').upsert(payload,{onConflict:'content_key'});if(saveError)throw saveError;setMessage('Home tiles updated successfully.');}catch(e){setError(e.message||String(e));}finally{setBusy(false);}};

  return <div className="min-h-screen bg-slate-950 px-3 py-5 text-white sm:px-4 sm:py-8"><div className="mx-auto max-w-5xl">
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><Link to="/admin" className="mb-3 inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"><ArrowLeft size={16}/>Back to admin</Link><h1 className="text-2xl font-bold sm:text-3xl">Homepage tile content</h1><p className="mt-1 max-w-2xl text-sm text-slate-400">Edit the text inside the four fixed homepage tiles. Images are optional; when removed, the tile becomes the same translucent glass style as the header.</p></div><button onClick={save} disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50 sm:w-auto"><Save size={17}/>{busy?'Working…':'Save changes'}</button></div>
    {message&&<div className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</div>}{error&&<div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>}
    <div className="grid gap-4 md:grid-cols-2">{tiles.map((tile,index)=><section key={tile.key} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-2xl sm:p-5"><div className="mb-4 text-xs font-semibold uppercase tracking-[.16em] text-amber-300">Fixed tile: {tile.key}</div><label className="mb-3 block text-sm font-medium">Heading<input className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-white outline-none focus:border-amber-300/50" value={tile.title} onChange={e=>update(index,{title:e.target.value})}/></label><label className="mb-3 block text-sm font-medium">Description<textarea rows="3" className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-white outline-none focus:border-amber-300/50" value={tile.text} onChange={e=>update(index,{text:e.target.value})}/></label>{tile.image&&<img src={tile.image} alt="" className="mb-3 h-36 w-full rounded-xl object-cover"/>}<div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]"><input className="min-w-0 rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white" placeholder="Optional image URL" value={tile.image||''} onChange={e=>update(index,{image:e.target.value})}/><label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-sm"><ImagePlus size={16}/>Upload<input type="file" accept="image/*" className="hidden" onChange={e=>chooseImage(index,e.target.files?.[0])}/></label><button type="button" onClick={()=>update(index,{image:''})} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/80 hover:bg-white/10"><Trash2 size={16}/>Remove</button></div></section>)}</div>
  </div></div>;
}
