import type {Progress} from './types';
export type V2Progress={version:2;rating?:number;violations?:number;driverXP:number;passengerXP:number;owned:string[];equipped:Record<string,string>;districts:string[];routesCompleted:number;purchases:string[]};
export const DRIVER_LEVELS=[{xp:0,name:'Local Driver'},{xp:200,name:'Town Driver'},{xp:600,name:'District Driver'},{xp:1400,name:'Inter-District Driver'},{xp:3000,name:'Expert Driver'}];
export function driverLevel(xp:number){return [...DRIVER_LEVELS].reverse().find(level=>xp>=level.xp)?.name||DRIVER_LEVELS[0].name;}
export function migrateProgress(progress:Progress):Progress {
 const copy=structuredClone(progress);const p=copy.v2;
 copy.v2={version:2,rating:Math.max(0,Math.min(100,p?.rating??100)),violations:p?.violations||0,driverXP:Math.max(0,Number(p?.driverXP)||0),passengerXP:Math.max(0,Number(p?.passengerXP)||0),owned:[...(p?.owned||[])],equipped:{...(p?.equipped||{})},districts:[...(p?.districts||['kozhikode'])],routesCompleted:Math.max(0,Number(p?.routesCompleted)||0),purchases:[...(p?.purchases||[])].slice(-100)};
 return copy;
}
export function progression(progress:Progress):V2Progress{if(!progress.v2)progress.v2=migrateProgress(progress).v2;return progress.v2!;}
export type ShopItem={id:string;name:string;cost:number;kind:'food'|'paint'|'seat'|'horn'|'outfit'|'livery'|'wheel'|'curtain'|'dashboard'|'interior'|'board'|'mirror'|'bag'|'bicycle';value:string};
export const SHOP_ITEMS:ShopItem[]=[
 {id:'tea',name:'Tea',cost:5,kind:'food',value:'Tea'},
 {id:'water',name:'Drinking water',cost:3,kind:'food',value:'Water'},
 {id:'chips',name:'Banana chips',cost:12,kind:'food',value:'Banana chips'},
 {id:'halwa',name:'Kozhikode halwa',cost:18,kind:'food',value:'Halwa'},
 {id:'biriyani',name:'Malabar biriyani',cost:30,kind:'food',value:'Biriyani'},
 {id:'pathiri',name:'Malappuram pathiri',cost:18,kind:'food',value:'Pathiri'},
 {id:'coffee',name:'Wayanad coffee',cost:8,kind:'food',value:'Coffee'},
 {id:'thalassery',name:'Thalassery biriyani',cost:30,kind:'food',value:'Thalassery biriyani'},
 {id:'idli',name:'Ramassery idli',cost:15,kind:'food',value:'Ramassery idli'},
 {id:'pazham-pori',name:'Pazham pori',cost:10,kind:'food',value:'Banana fritters'},
 {id:'livery-gold',name:'Golden ribbon livery',cost:90,kind:'livery',value:'#e7bd63'},
 {id:'wheel-cream',name:'Cream wheel covers',cost:65,kind:'wheel',value:'#eee0bd'},
 {id:'curtain-maroon',name:'Maroon curtains',cost:55,kind:'curtain',value:'#873e50'},
 {id:'dashboard-flower',name:'Dashboard flower',cost:35,kind:'dashboard',value:'flower'},
 {id:'interior-teal',name:'Teal cabin lighting',cost:60,kind:'interior',value:'#70c5b4'},
 {id:'board-amber',name:'Amber route board',cost:45,kind:'board',value:'amber'},
 {id:'mirror-chrome',name:'Chrome mirror covers',cost:40,kind:'mirror',value:'#c2d1d0'},
 {id:'bag-rust',name:'Rust traveller bag',cost:35,kind:'bag',value:'#b97046'},
 {id:'bicycle-teal',name:'Teal bicycle frame',cost:45,kind:'bicycle',value:'#38988f'},
 {id:'paint-green',name:'Forest green paint',cost:80,kind:'paint',value:'#376d57'},
 {id:'paint-blue',name:'Coastal blue paint',cost:80,kind:'paint',value:'#347da1'},
 {id:'paint-red',name:'Terracotta paint',cost:80,kind:'paint',value:'#b84e37'},
 {id:'seat-sand',name:'Sand seat fabric',cost:50,kind:'seat',value:'#b9a37d'},
 {id:'seat-teal',name:'Teal seat fabric',cost:50,kind:'seat',value:'#496c65'},
 {id:'horn-low',name:'Low horn preset',cost:40,kind:'horn',value:'low'},
 {id:'outfit-ocean',name:'Ocean outfit',cost:60,kind:'outfit',value:'#407fa1'}
];
/** Caller validates physical location and role; all prices come from the server catalog. */
export function buy(progress:Progress,itemId:string,requestId:string){
 const item=SHOP_ITEMS.find(i=>i.id===itemId),v2=progression(progress);
 if(typeof requestId!=='string'||!/^[a-zA-Z0-9_-]{8,80}$/.test(requestId))return {ok:false,message:'Invalid purchase request.'};
 if(v2.purchases.includes(requestId))return {ok:true,message:'Purchase already completed.'};
 if(!item)return {ok:false,message:'Unknown shop item.'};
 if(item.kind!=='food'&&v2.owned.includes(item.id))return {ok:false,message:'You already own this item.'};
 if(!Number.isFinite(progress.kp)||progress.kp<item.cost)return {ok:false,message:'Not enough KP.'};
 progress.kp-=item.cost;v2.purchases.push(requestId);if(v2.purchases.length>100)v2.purchases.shift();
 if(item.kind==='food'){const journal='food-shop:'+item.id;if(!progress.journal.includes(journal)){progress.journal.push(journal);v2.passengerXP+=10;}}
 else v2.owned.push(item.id);
 return {ok:true,message:'Purchased '+item.name+' · '+item.cost+' KP'};
}
