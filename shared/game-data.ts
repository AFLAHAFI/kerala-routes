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
export const ROUTES = {
 A:{name:'City & Beach',stops:['terminal','mavoor','mananchira','sm-street','beach'],color:'#e0a449'},
 B:{name:'City & Suburban',stops:['terminal','medical','kunnamangalam','kattangal','nit'],color:'#71b5ae'}
};
export type RouteId=keyof typeof ROUTES;
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
export const BUS_SPAWNS=[{id:'bus-1',name:'Kerala Routes Transit',x:32,z:16,yaw:-Math.PI/2,route:'A' as RouteId,color:'#b84e37'},{id:'bus-2',name:'Malabar Line',x:50,z:16,yaw:-Math.PI/2,route:'B' as RouteId,color:'#287f79'}];
export const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);

export const routeStops=(b:{route:RouteId;direction?:number})=>b.direction===-1?[...ROUTES[b.route].stops].reverse():ROUTES[b.route].stops;
