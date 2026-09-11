/** Rebuild the seven path-only logo compositions from one set of geometry.
 * The wordmark is traced from the supplied master, not a system-font substitute.
 * Run: node scripts/build-brand.mjs. No runtime or additional dependencies.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const destination = resolve('public/brand');
mkdirSync(destination, { recursive: true });
const lettering = readFileSync('scripts/brand-wordmark.svg', 'utf8').match(/<path[\s\S]*?<\/path>|<path[^>]*\/>/g).join('');
const palettes = { light: { metal: '#89501B', ink: '#0C1930' }, dark: { metal: '#D6AF62', ink: '#F4F6FA' } };
const escapeXml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const pillar = `<path d="M55 19a10 10 0 1 0 10 13A9 9 0 0 1 55 19Z"/>
  <circle cx="52" cy="47" r="4"/><circle cx="52" cy="59" r="4.5"/><circle cx="52" cy="72" r="5"/>
  <circle cx="52" cy="93" r="12"/>
  <path d="M40 109h24v6l-4 4H44l-4-4Zm4 13h16v23H44ZM35 149h34v7l-5 5H40l-5-5Zm5 15h24v93H40ZM34 261h36v7l-5 5H39l-5-5Zm5 15h26v88H39ZM34 368h36v7l-5 5H39l-5-5Zm5 15h26v197H39Z"/>`;
const arch = 'M112 578V412Q112 340 240 282Q368 340 368 412V578';
const panels = [[124,432,32,138],[168,432,32,138],[218,424,44,154],[280,432,32,138],[324,432,32,138]];
const rosette = `<path d="M16 0 20.7 4.7 27.3 4.7 27.3 11.3 32 16 27.3 20.7 27.3 27.3 20.7 27.3 16 32 11.3 27.3 4.7 27.3 4.7 20.7 0 16 4.7 11.3 4.7 4.7 11.3 4.7Z M16 6 19 13 26 16 19 19 16 26 13 19 6 16 13 13Z" fill="none" stroke="black" stroke-width="1.5"/>`;
function definitions(id) {
  return `<defs>
    <pattern id="${id}-star" width="32" height="32" patternUnits="userSpaceOnUse">${rosette}</pattern>
    <clipPath id="${id}-arch"><path d="${arch}Z"/></clipPath>
    <mask id="${id}-entrance" maskUnits="userSpaceOnUse" x="0" y="0" width="480" height="600">
      <g fill="white">${pillar}<g transform="translate(376)">${pillar}</g><path d="M65 257h350v323H65ZM0 578h480v2H0Z"/></g>
      <g fill="none" stroke="black" stroke-width="2.7" stroke-linejoin="round">
        <path d="${arch}M112 412h256M118 390h244M198 306v82m84-82v82M209 301v86h62v-86"/>
        ${panels.map(([x,y,w,h])=>`<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`).join('')}
      </g>
      <g clip-path="url(#${id}-arch)">
        <path d="M122 290h71v92h-71ZM214 298h52v84h-52ZM287 290h71v92h-71ZM122 397h71v9h-71ZM204 397h72v9h-72ZM287 397h71v9h-71Z" fill="url(#${id}-star)"/>
        ${panels.map(([x,y,w,h])=>`<rect x="${x+4}" y="${y+4}" width="${w-8}" height="${h-8}" fill="url(#${id}-star)"/>`).join('')}
      </g>
    </mask>
  </defs>`;
}
const wordmark = (x,y,w) => `<g transform="translate(${x} ${y}) scale(${w/970})" fill="currentColor">${lettering}</g>`;
const tower = (x,y,scale) => `<g transform="translate(${x} ${y}) scale(${scale})" class="metal">${pillar}</g>`;
const entrance = (id,x,y,scale) => `<g transform="translate(${x} ${y}) scale(${scale})"><rect width="480" height="600" class="metal" mask="url(#${id}-entrance)"/></g>`;
export const variants = [
  ['horizontal', 'Horizontal', 1480, 620, id => entrance(id,10,0,1)+wordmark(510,208,950)],
  ['centred', 'Centred entrance', 720, 880, id => entrance(id,15,0,1.44)+wordmark(145,175,430)],
  ['compact', 'Compact horizontal', 1260, 390, id => entrance(id,6,0,.65)+wordmark(338,60,910)],
  ['wordmark', 'Wordmark', 990, 370, () => wordmark(10,10,970)],
  ['entrance', 'Entrance', 500, 600, id => entrance(id,10,0,1)],
  ['minaret', 'Single minaret', 100, 600, () => tower(0,0,1)],
  ['pillars', 'Pillars & wordmark', 1120, 385, () => tower(0,0,.65)+tower(1052,0,.65)+wordmark(104,37,910)],
];
const svg = (name,label,w,h,body,theme) => {
  const id=`jic-${name}-${theme}`;
  const palette=palettes[theme];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${id}-title"><title id="${id}-title">Jamatia Islamic Centre — ${escapeXml(label)}</title><style>.metal{fill:${palette.metal}}</style>${definitions(id)}<g style="color:${palette.ink}">${body(id)}</g></svg>\n`;
};
for(const [name,label,w,h,body] of variants) for(const theme of Object.keys(palettes)) {
  writeFileSync(`${destination}/jic-${name}-${theme}.svg`,svg(name,label,w,h,body,theme));
}
const samples=variants.map(([name,label,w,h,body],index)=>{
  const x=(index%2)*800+30,y=Math.floor(index/2)*270+20,scale=Math.min(720/w,205/h);
  const id=`sheet-${name}`;
  return `${definitions(id)}<g transform="translate(${x+(720-w*scale)/2} ${y}) scale(${scale})" style="color:#0C1930">${body(id)}</g><text x="${x+360}" y="${y+235}" text-anchor="middle" fill="#425167" font-family="system-ui,sans-serif" font-size="18">${index+1}. ${escapeXml(label)}</text>`;
}).join('');
writeFileSync(`${destination}/jic-variations.svg`,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1110"><title>Jamatia Islamic Centre — seven logo variations</title><rect width="1600" height="1110" fill="white"/><style>.metal{fill:#89501B}</style>${samples}</svg>\n`);
