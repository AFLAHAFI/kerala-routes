export const DISTRICTS=[
 {id:'kozhikode',name:'Kozhikode',offset:0,route:'B',biome:'coast',ground:'#729568',wall:'#e7d5b4'},
 {id:'malappuram',name:'Malappuram',offset:3000,route:'M',biome:'town',ground:'#688a4e',wall:'#eed3a6'},
 {id:'wayanad',name:'Wayanad',offset:6000,route:'W',biome:'forest',ground:'#466f4c',wall:'#b69575'},
 {id:'kannur',name:'Kannur',offset:9000,route:'K',biome:'coast',ground:'#88a56b',wall:'#dca979'},
 {id:'palakkad',name:'Palakkad',offset:12000,route:'P',biome:'fields',ground:'#a4ad63',wall:'#e5d2a0'}
] as const;
export type District=typeof DISTRICTS[number];
export function districtAt(x:number):District{return DISTRICTS[Math.max(0,Math.min(4,Math.round(x/3000)))];}
export function districtBounds(x:number){const d=districtAt(x);return {minX:d.offset-99,maxX:d.offset+1130,minZ:-78,maxZ:90};}
export function roadZ(d:District,localX:number){return d.biome==='forest'&&localX>100?Math.sin((localX-100)/95)*23:0;}
const buildingCache=new Map<string,ReturnType<typeof makeBuildings>>();
export function districtBuildings(d:District){let buildings=buildingCache.get(d.id);if(!buildings){buildings=makeBuildings(d);buildingCache.set(d.id,buildings);}return buildings;}
function makeBuildings(d:District){return Array.from({length:d.biome==='town'?26:14},(_,i)=>{const x=d.offset+50+i*(d.biome==='town'?40:75),side=i%2?1:-1;return {x,z:roadZ(d,x-d.offset)+side*30,w:12+(i%3)*2,d:10,h:5+i%3*2,color:d.wall};});}
export function terminalAt(x:number){const d=districtAt(x);return {x:d.offset+33,z:8,id:d.id==='kozhikode'?'terminal':d.id+'-terminal'};}
