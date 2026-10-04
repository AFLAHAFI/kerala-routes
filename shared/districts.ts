export const DISTRICTS=[
 {id:'kozhikode',name:'Kozhikode',offset:0,route:'B',biome:'coast',ground:'#729568',wall:'#e7d5b4'},
 {id:'malappuram',name:'Malappuram',offset:3000,route:'M',biome:'town',ground:'#688a4e',wall:'#eed3a6'},
 {id:'wayanad',name:'Wayanad',offset:6000,route:'W',biome:'forest',ground:'#466f4c',wall:'#b69575'},
 {id:'kannur',name:'Kannur',offset:9000,route:'K',biome:'coast',ground:'#88a56b',wall:'#dca979'},
 {id:'palakkad',name:'Palakkad',offset:12000,route:'P',biome:'fields',ground:'#a4ad63',wall:'#e5d2a0'}
] as const;
export type District=typeof DISTRICTS[number];
export function districtAt(x:number):District{return DISTRICTS[Math.max(0,Math.min(4,Math.round(x/3000)))];}
export function districtBounds(_x:number){return {minX:-99,maxX:13130,minZ:-78,maxZ:620};}
export function roadZ(d:District,localX:number){return d.biome==='forest'&&localX>100?Math.sin((localX-100)/95)*23:0;}
const buildingCache=new Map<string,ReturnType<typeof makeBuildings>>();
export function districtBuildings(d:District){let buildings=buildingCache.get(d.id);if(!buildings){buildings=makeBuildings(d);buildingCache.set(d.id,buildings);}return buildings;}
function makeBuildings(d:District){return Array.from({length:d.biome==='town'?26:14},(_,i)=>{const x=d.offset+50+i*(d.biome==='town'?40:75),side=i%2?1:-1;return {x,z:roadZ(d,x-d.offset)+side*30,w:12+(i%3)*2,d:10,h:5+i%3*2,color:d.wall};});}
export function terminalAt(x:number){const d=districtAt(x);return {x:d.offset+33,z:8,id:d.id==='kozhikode'?'terminal':d.id+'-terminal'};}

export type RoadPoint={x:number;z:number};
export const CONNECTIONS=[
 {id:'CM',from:'kozhikode',to:'malappuram',name:'Malappuram road',towns:['Kozhikode','Ramanattukara','Kottakkal','Malappuram'],points:[{x:1100,z:0},{x:1160,z:160},{x:2850,z:160},{x:2910,z:0}]},
 {id:'CW',from:'kozhikode',to:'wayanad',name:'Wayanad ghat road',towns:['Kozhikode','Thamarassery','Lakkidi','Vythiri','Kalpetta'],points:[{x:1160,z:160},{x:1300,z:340},{x:5300,z:340},{x:5500,z:470},{x:5660,z:290},{x:5820,z:430},{x:5910,z:0}]},
 {id:'CK',from:'kozhikode',to:'kannur',name:'Malabar coastal road',towns:['Kozhikode','Koyilandy','Vadakara','Thalassery','Kannur'],points:[{x:1300,z:340},{x:1420,z:570},{x:8800,z:570},{x:8910,z:0}]},
 {id:'MP',from:'malappuram',to:'palakkad',name:'Bharathapuzha road',towns:['Malappuram','Perinthalmanna','Shoranur','Ottappalam','Palakkad'],points:[{x:4100,z:0},{x:4200,z:160},{x:11800,z:160},{x:11910,z:0}]}
] as const;
export const ROAD_SEGMENTS=CONNECTIONS.flatMap(road=>road.points.slice(1).map((b,i)=>({a:road.points[i],b,road:road.id})));
export function segmentDistance(p:RoadPoint,a:RoadPoint,b:RoadPoint){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz)));return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);}
export function onWorldLand(x:number,z:number,r=0){return DISTRICTS.some(d=>x>=d.offset-99+r&&x<=d.offset+1130-r&&z>=-78+r&&z<=90-r)||ROAD_SEGMENTS.some(s=>segmentDistance({x,z},s.a,s.b)<=38-r);}
export function onConnector(x:number,z:number){return z>85&&ROAD_SEGMENTS.some(s=>segmentDistance({x,z},s.a,s.b)<38);}
