/** Original fictional variants share one tested chassis, seating layout and physics integrator. */
export const BUS_MODELS=[
 {id:'ordinary',name:'Malabar Ordinary',xp:0,acceleration:3.8,maxSpeed:16,color:'#b84e37',trim:'#efe2bb',roof:'plain'},
 {id:'city',name:'Townlink City',xp:0,acceleration:4.2,maxSpeed:14,color:'#287f79',trim:'#e8e5cf',roof:'plain'},
 {id:'private',name:'Mango Private Line',xp:100,acceleration:4,maxSpeed:16,color:'#c49531',trim:'#3b6564',roof:'rack'},
 {id:'fast',name:'Red Kite Fast Passenger',xp:200,acceleration:3.7,maxSpeed:17,color:'#a84339',trim:'#d4c4a4',roof:'vent'},
 {id:'hill',name:'Green Trail Hill Service',xp:400,acceleration:4.3,maxSpeed:14,color:'#456c48',trim:'#c9b983',roof:'rack'},
 {id:'coast',name:'Sea Breeze Coastal',xp:600,acceleration:3.6,maxSpeed:16,color:'#3e89a0',trim:'#ecdda9',roof:'vent'},
 {id:'intercity',name:'District Connector',xp:900,acceleration:3.3,maxSpeed:18,color:'#654f83',trim:'#ded3c2',roof:'ac'},
 {id:'mini',name:'Village Mini',xp:150,acceleration:4.5,maxSpeed:14,color:'#b8733c',trim:'#f0dcad',roof:'vent'},
 {id:'tourer',name:'Kerala Voyager',xp:1400,acceleration:3,maxSpeed:18,color:'#416b83',trim:'#d5b979',roof:'ac'}
] as const;
export function busModel(id?:string){return BUS_MODELS.find(b=>b.id===id)||BUS_MODELS[0];}

/** Dimensions are shared by geometry, collisions, doors and passenger anchors. */
export function busLayout(id?:string){return id==='mini'?{lengthScale:.78,heightScale:.94,capacity:6}:id==='tourer'||id==='intercity'?{lengthScale:1.08,heightScale:1.06,capacity:10}:{lengthScale:1,heightScale:1,capacity:10};}
