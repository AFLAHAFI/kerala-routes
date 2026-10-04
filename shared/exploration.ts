import {DISTRICTS,districtAt,roadZ} from './districts';
export const BOAT_DOCKS=DISTRICTS.filter(d=>['wayanad','palakkad'].includes(d.id)).map(d=>({id:d.id+'-lake',name:d.name+' lake',x:d.offset+450,z:38,water:{x:d.offset+480,z:60,w:60,d:36}}));
export function cycleStand(x:number){const d=districtAt(x);return {x:d.offset+810,z:d.id==='kozhikode'?13:roadZ(d,810)+13};}
