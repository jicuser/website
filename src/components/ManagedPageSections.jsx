import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

export default function ManagedPageSections(){
  const { pathname } = useLocation();
  const [sections,setSections]=useState([]);

  useEffect(()=>{
    let active=true;
    supabase.from('page_sections')
      .select('id,section_key,title,body,background_image_url,image_urls,sort_order,published')
      .eq('page_path',pathname)
      .eq('published',true)
      .order('sort_order',{ascending:true})
      .then(({data,error})=>{if(active&&!error)setSections(data||[])});
    return()=>{active=false};
  },[pathname]);

  if(!sections.length)return null;
  return <div className="managed-page-sections">
    {sections.map(section=>{
      const images=Array.isArray(section.image_urls)?section.image_urls:[];
      const style=section.background_image_url?{backgroundImage:`linear-gradient(rgba(7,17,27,.72),rgba(7,17,27,.72)),url("${section.background_image_url}")`}:undefined;
      return <section key={section.id} className="managed-page-section" style={style}>
        <div className="managed-page-section-inner">
          <div className="managed-page-section-copy">
            {section.title&&<h2>{section.title}</h2>}
            {section.body&&<p>{section.body}</p>}
          </div>
          {images.length>0&&<div className="managed-page-section-gallery">{images.map((src,i)=><img key={`${section.id}-${i}`} src={src} alt={`${section.title||'JIC'} ${i+1}`}/>)}</div>}
        </div>
      </section>;
    })}
  </div>;
}
