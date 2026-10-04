import {busLayout} from '../../shared/buses';
import {STOPS,routeStops} from '../../shared/game-data';import type {BusState} from '../../shared/types';
import {seatPosition,doorPosition,busStop} from './simulation';
export type NpcPassenger={id:string;name:string;x:number;z:number;yaw:number;state:'waiting'|'aboard'|'walking';busId:string|null;stop:string;destination:string;seat:number;until:number};
export function createNpcs():NpcPassenger[]{return Array.from({length:5},(_,i)=>({id:'npc-'+i,name:'Local traveller',x:28+i,z:13,yaw:0,state:'waiting',busId:null,stop:'terminal',destination:'',seat:-1,until:0}));}
/** A depot visit releases NPC seats and gives the driver time to customize. */
export function releaseDepotNpcs(npcs:NpcPassenger[],bus:BusState,now:number){
 const stop=busStop(bus);if(!stop)return;
 const leaving=new Set(npcs.filter(n=>n.busId===bus.id).map(n=>n.id));
 bus.passengers=bus.passengers.filter(id=>!leaving.has(id));
 for(const npc of npcs)if(leaving.has(npc.id))Object.assign(npc,{state:'walking',busId:null,stop:stop.id,destination:'',seat:-1,x:stop.x+5,z:stop.z+6,until:now+30000});
}
export function updateNpcs(npcs:NpcPassenger[],buses:BusState[],now:number){
 for(const npc of npcs){
  if(npc.state==='walking'){if(now<npc.until){const stop=STOPS.find(s=>s.id===npc.stop)!;npc.x=stop.x+2+Math.max(0,Math.min(5000,now-(npc.until-5000)))*.0006;npc.z=stop.z+6;continue;}npc.state='waiting';npc.x=STOPS.find(s=>s.id===npc.stop)!.x+5;npc.z=STOPS.find(s=>s.id===npc.stop)!.z+5;}
  if(npc.state==='waiting'){
   const bus=buses.find(b=>b.driver&&b.doors&&Math.abs(b.speed)<.3&&b.passengers.length<busLayout(b.model).capacity&&busStop(b)?.id===npc.stop&&routeStops(b).indexOf(npc.stop)<routeStops(b).length-1);
   if(!bus)continue;const stops=routeStops(bus),remaining=stops.slice(stops.indexOf(npc.stop)+1);npc.destination=remaining[Number(npc.id.slice(-1))%remaining.length];npc.state='aboard';npc.busId=bus.id;bus.passengers.push(npc.id);
  }
  if(npc.state==='aboard'){
   const bus=buses.find(b=>b.id===npc.busId);if(!bus){npc.state='waiting';npc.busId=null;continue;}
   const stop=busStop(bus);npc.seat=bus.passengers.indexOf(npc.id);Object.assign(npc,seatPosition(bus,npc.seat));npc.yaw=bus.yaw;
   const target=STOPS.find(s=>s.id===npc.destination);if(target&&Math.hypot(bus.x-target.x,bus.z-target.z)<80)bus.requested=true;
   if(bus.doors&&Math.abs(bus.speed)<.3&&stop&&(stop.id===npc.destination||!bus.driver)){
    bus.passengers=bus.passengers.filter(id=>id!==npc.id);Object.assign(npc,doorPosition(bus));npc.state='walking';npc.busId=null;npc.stop=stop.id;npc.until=now+5000;npc.seat=-1;
   }
  }
 }
}
