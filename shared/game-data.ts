import {DISTRICTS,roadZ} from './districts';
export const STOPS = [
 {id:'terminal',name:'KSRTC Terminal',ml:'കെ.എസ്.ആർ.ടി.സി. ടെർമിനൽ',x:33,z:8,radius:17},
 {id:'mavoor',name:'Mavoor Road',ml:'മാവൂർ റോഡ്',x:1,z:0,radius:10},
 {id:'mananchira',name:'Mananchira',ml:'മാനാഞ്ചിറ',x:-42,z:0,radius:10},
 {id:'sm-street',name:'SM Street',ml:'മിഠായിത്തെരുവ്',x:-62,z:-32,radius:11},
 {id:'beach',name:'Kozhikode Beach',ml:'കോഴിക്കോട് ബീച്ച്',x:-84,z:-61,radius:13},
 {id:'medical',name:'Medical College area',ml:'മെഡിക്കൽ കോളേജ്',x:280,z:0,radius:15},
 {id:'kunnamangalam',name:'Kunnamangalam',ml:'കുന്നമംഗലം',x:550,z:0,radius:15},
 {id:'kattangal',name:'Kattangal',ml:'കട്ടാങ്ങൽ',x:820,z:0,radius:15},
 {id:'nit',name:'NIT Calicut area',ml:'എൻ.ഐ.ടി. കോഴിക്കോട്',x:1070,z:0,radius:18}
];
export const ROUTES:Record<string,{name:string;stops:string[];color:string}> = {
 A:{name:'City & Beach',stops:['terminal','mavoor','mananchira','sm-street','beach'],color:'#e0a449'},
 B:{name:'City & Suburban',stops:['terminal','medical','kunnamangalam','kattangal','nit'],color:'#71b5ae'}
};
export type RouteId=string;
const townNames:Record<string,string[]>={malappuram:['Malappuram stand','Kottakkal market','Tirur road','Kottakkunnu-inspired park','Perinthalmanna road'],wayanad:['Kalpetta stand','Vythiri','Lakkidi viewpoint','Tea country','Forest edge'],kannur:['Kannur stand','Thalassery road','Payyambalam promenade','Heritage coast','Taliparamba road'],palakkad:['Palakkad stand','Ottappalam road','Shoranur riverside','Paddy country','Ramassery road']};
for(const d of DISTRICTS.slice(1)){const ids=['terminal','town','village','viewpoint','outskirts'];const points=[33,280,550,820,1070];for(let i=0;i<ids.length;i++)STOPS.push({id:d.id+'-'+ids[i],name:townNames[d.id][i],ml:d.name,x:d.offset+points[i],z:i?roadZ(d,points[i]):8,radius:17});ROUTES[d.route]={name:d.name+' Explorer',stops:ids.map(id=>d.id+'-'+id),color:'#7bbb99'};}
Object.assign(ROUTES,{
 CM:{name:'Kozhikode – Malappuram',stops:['terminal','nit','malappuram-terminal'],color:'#c4a64f'},
 CW:{name:'Kozhikode – Wayanad',stops:['terminal','nit','wayanad-terminal'],color:'#6b985e'},
 CK:{name:'Kozhikode – Kannur',stops:['terminal','nit','kannur-terminal'],color:'#569bad'},
 MP:{name:'Malappuram – Palakkad',stops:['malappuram-terminal','malappuram-outskirts','palakkad-terminal'],color:'#b0a459'}
});
export const MISSIONS=[
 {id:'first-journey',title:'First Bus Journey',description:'Board at the terminal and ride as a passenger to Mananchira.',reward:100},
 {id:'sunset',title:'Sunset Photographer',description:'Photograph the coastal viewpoint on the beach.',reward:100},
 {id:'food',title:'Mittayi Explorer',description:'Discover three foods around the shopping quarter.',reward:100},
 {id:'clean',title:'Clean Coast',description:'Collect five pieces of litter from the beach.',reward:100},
 {id:'heritage',title:'City Heritage',description:'Discover three landmarks in Mananchira.',reward:100},
 {id:'plants',title:'Green Kozhikode',description:'Photograph three different plants around Kattangal.',reward:100},
 {id:'passenger',title:'Passenger Challenge',description:'Ride a full route as a passenger, from the terminal to the final stop.',reward:100},
 {id:'driver',title:'First Driver Shift',description:'Drive a full route and serve every stop in order.',reward:100}
];
MISSIONS.push(...DISTRICTS.slice(1).map(d=>({id:d.id,title:d.name+' Explorer',description:'Record all five district discoveries.',reward:150})),{id:'lake-explorer',title:'Lake Explorer',description:'Paddle 80 metres on a lake.',reward:100},{id:'cycle-trail',title:'Cycle Trail',description:'Cycle 200 metres.',reward:100},{id:'dawn-wildlife',title:'Dawn Wildlife',description:'Photograph the Wayanad bird lookout between 05:00 and 07:00.',reward:125},{id:'night-photo',title:'Night on the Coast',description:'Photograph the pier after 19:00 or before 05:00.',reward:125});
export type Discovery={id:string;name:string;category:'Food'|'Plants'|'Culture'|'Places'|'Wildlife'|'Environment';x:number;z:number;action:'discover'|'photo'|'collect';group:string;description:string};
export const DISCOVERIES:Discovery[]=[
 {id:'sunset-point',name:'Old pier viewpoint',category:'Places',x:-91,z:-44,action:'photo',group:'sunset',description:'The Arabian Sea and the old pier: a moment from the Malabar coast.'},
 ...['Kozhikodan halwa','Banana chips','Malabar chaya'].map((name,i)=>({id:'food-'+i,name,category:'Food' as const,x:-35+i*16,z:15,action:'discover' as const,group:'food',description:['Halwa is closely associated with Kozhikode’s sweet shops.','Thin banana slices are fried into a familiar Kerala snack.','Chaya means tea: a familiar pause at a roadside tea shop.'][i]})),
 ...['Heritage pavilion','Square banyan','Mananchira pond'].map((name,i)=>({id:'heritage-'+i,name,category:'Culture' as const,x:[-41,-60,-23][i],z:[56,52,44][i],action:'discover' as const,group:'heritage',description:'An original landmark inspired by the public squares and heritage of Kozhikode.'})),
 ...['Coconut palm','Banana plant','Banyan tree'].map((name,i)=>({id:'plant-'+i,name,category:'Plants' as const,x:795+i*20,z:18,action:'photo' as const,group:'plants',description:['Coconut palms are a familiar feature of coastal Kerala.','Bananas are cultivated for their fruit and leaves.','Banyan trees develop aerial roots and broad, spreading crowns.'][i]})),
 ...Array.from({length:5},(_,i)=>({id:'litter-'+i,name:'Beach litter '+(i+1),category:'Environment' as const,x:-89+(i%2)*5,z:-25+i*9,action:'collect' as const,group:'clean',description:'A cleaner coast starts with picking up litter.'})),
 {id:'bird',name:'Coastal bird',category:'Wildlife',x:-87,z:22,action:'photo',group:'extra',description:'Observe wildlife quietly and give birds space.'},
 {id:'shell',name:'Hidden seashell',category:'Places',x:-94,z:43,action:'discover',group:'extra',description:'A small coastal discovery. Leave living shells in their habitat.'}
];
for(const d of DISTRICTS.slice(1)){for(const [i,category] of (['Places','Food','Plants','Wildlife','Culture'] as const).entries())DISCOVERIES.push({id:d.id+'-discovery-'+i,name:d.name+' '+['viewpoint','local flavours','green trail','bird lookout','heritage corner'][i],category,x:d.offset+230+i*150,z:roadZ(d,230+i*150)+15,action:'photo',group:d.id,description:'A fictional game-scale discovery inspired by '+d.name+'.'});}
DISCOVERIES.push({id:'dawn-bird',name:'Dawn bird lookout',category:'Wildlife',x:6830,z:roadZ(DISTRICTS[2],830)+15,action:'photo',group:'dawn-wildlife',description:'A quiet dawn observation in the game forest.'},{id:'night-pier',name:'Night pier photograph',category:'Places',x:-91,z:-40,action:'photo',group:'night-photo',description:'The coast under a night sky.'});
export const BUS_SPAWNS=[{id:'bus-1',name:'Kerala Routes Transit',x:32,z:16,yaw:-Math.PI/2,route:'A' as RouteId,color:'#b84e37'},{id:'bus-2',name:'Malabar Line',x:46,z:16,yaw:-Math.PI/2,route:'B' as RouteId,color:'#287f79'},{id:'bus-3',name:'Coast Connector',x:49,z:8,yaw:-Math.PI/2,route:'A' as RouteId,color:'#a67b42'}];
export const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);

export const routeStops=(b:{route:RouteId;direction?:number})=>b.direction===-1?[...ROUTES[b.route].stops].reverse():ROUTES[b.route].stops;
