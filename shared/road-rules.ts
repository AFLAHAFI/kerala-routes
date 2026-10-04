import {DISTRICTS,districtAt,roadZ} from './districts';
export type SignalColor='red'|'yellow'|'green';
export const SIGNALS=DISTRICTS.flatMap(d=>[180,700].map((x,i)=>({id:d.id+'-'+i,x:d.offset+x,z:roadZ(d,x),offset:i*17000})));
export function signalColor(now:number,offset=0):SignalColor{const phase=((now+offset)%60000+60000)%60000;return phase<40000?'green':phase<45000?'yellow':'red';}
export function speedLimit(x:number){const d=districtAt(x),local=x-d.offset;return local<220||d.biome==='town'?35:d.biome==='forest'?40:50;}
export function signalAhead(x:number,z:number,direction:number,now:number){return SIGNALS.some(s=>signalColor(now,s.offset)!=='green'&&(s.x-x)*direction>0&&(s.x-x)*direction<20&&Math.abs(s.z-z)<10);}
