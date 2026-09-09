import {NAV_GROUPS} from './nav';
import {standaloneSections} from './sectionRoutes';
import {IMAGES} from './images';
export const EDITABLE_PAGES=Array.from(new Map([...NAV_GROUPS.flatMap(g=>[{name:g.name,path:g.path,group:g.name},...g.children.map(c=>({...c,group:g.name}))]),...standaloneSections.map(([path,group,name])=>({path:`/${path}`,group,name}))].map(p=>[p.path,p])).values());
export const pageKey=path=>`page:${path}`;
export const pageDefaults=page=>page.path==='/'?{title:'A place for faith.\nA home for community.',body:'Worship. Learn. Grow. Together.\nA stronger community for a brighter tomorrow.',image:IMAGES.homeHero}:{title:page.name,body:'',image:''};
export const overviewPaths=new Set(['/about','/services','/projects','/madrassah','/youth','/team','/contact','/financial-history','/prayer-times','/prayer-times/monthly','/prayer-times/jummah']);
