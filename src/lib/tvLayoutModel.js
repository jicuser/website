export const TV_LAYOUTS = Object.freeze(['full','split','stacked','triple']);
export const TV_ORIENTATIONS = Object.freeze(['landscape','portrait']);
export const TV_CONTENT = Object.freeze(['prayer','poster','announcements','clock','stream','camera','text','next-prayer']);
export function normaliseTVLayout(input={}) {
 const orientation=TV_ORIENTATIONS.includes(input.orientation)?input.orientation:'landscape';
 const layout=TV_LAYOUTS.includes(input.layout)?input.layout:'full';
 const count=layout==='full'?1:layout==='triple'?3:2;
 const contents=Array.from({length:count},(_,i)=>TV_CONTENT.includes(input.contents?.[i])?input.contents[i]:(i===0?'prayer':'poster'));
 const size=Number(input.primarySize);
 const primarySize=Number.isFinite(size)?Math.max(25,Math.min(75,Math.round(size/5)*5)):50;
 return {orientation,layout,contents,primarySize};
}
export function tvGridTemplate(config){const {orientation,layout,primarySize}=normaliseTVLayout(config);if(layout==='full')return {gridTemplateColumns:'1fr',gridTemplateRows:'1fr'};if(layout==='triple')return orientation==='portrait'?{gridTemplateColumns:'1fr',gridTemplateRows:'repeat(3,minmax(0,1fr))'}:{gridTemplateColumns:'repeat(3,minmax(0,1fr))',gridTemplateRows:'1fr'};const tracks=`${primarySize}fr ${100-primarySize}fr`;return layout==='stacked'||orientation==='portrait'?{gridTemplateColumns:'1fr',gridTemplateRows:tracks}:{gridTemplateColumns:tracks,gridTemplateRows:'1fr'};}
