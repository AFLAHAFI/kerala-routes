import {signalAhead} from './road-rules';import {districtAt,roadZ,DISTRICTS,type District} from './districts';
import type {BusState} from './types';
export type TrafficState={id:string;kind:'car'|'auto'|'bike'|'truck';x:number;z:number;yaw:number;speed:number;cruise:number};
export function createTraffic(d:District=DISTRICTS[0],count=12):TrafficState[]{return Array.from({length:count},(_,i)=>{const x=-65+i*1120/count;return {id:d.id==='kozhikode'?'traffic-'+i:'traffic-'+d.id+'-'+i,kind:(['car','auto','bike','truck'] as const)[i%4],x:d.offset+x,z:roadZ(d,x)+(i%2?3.4:-3.4),yaw:i%2?-Math.PI/2:Math.PI/2,speed:0,cruise:6+(i%3)};});}
/** A room owns at most twelve cars, shared across occupied districts. */
export function trafficForPlayers(traffic:TrafficState[],players:{x:number}[]){const active=[...new Set(players.map(p=>districtAt(p.x).id))].sort(),existing=new Map(traffic.map(t=>[t.id,t]));return active.flatMap(id=>createTraffic(DISTRICTS.find(d=>d.id===id)!,Math.floor(12/active.length)).map(t=>existing.get(t.id)||t));}
export function advanceTraffic(traffic:TrafficState[],buses:BusState[],dt:number,now=Date.now()){
 for(const car of traffic){const d=districtAt(car.x);let direction=car.yaw>0?1:-1;
  const blocked=[...buses,...traffic.filter(t=>t.id!==car.id)].some(v=>Math.abs(v.z-car.z)<2.8&&(v.x-car.x)*direction>0&&(v.x-car.x)*direction<(('passengers' in v)?15:8));
  const desired=blocked||signalAhead(car.x,car.z,direction,now)?0:car.cruise;car.speed+=Math.max(-10*dt,Math.min(3*dt,desired-car.speed));car.x+=direction*car.speed*dt;
  if(car.x>d.offset+1115){car.x=d.offset+1115;direction=-1;}else if(car.x<d.offset-86){car.x=d.offset-86;direction=1;}
  const local=car.x-d.offset;car.z=roadZ(d,local)-direction*3.4;car.yaw=Math.atan2(direction,roadZ(d,local+direction)-roadZ(d,local));
 }
}
