import type {BusState,PlayerState} from '../../shared/types';
import {SIGNALS,signalColor,speedLimit} from '../../shared/road-rules';
import {districtAt,roadZ} from '../../shared/districts';
import {STOPS,routeStops} from '../../shared/game-data';
import {progression} from '../../shared/progression';
type Previous={x:number;z:number;speed:number;at:number;wrongSince:number;speedSince:number;stoppedSince:number;driver:string|null};
/** Warnings and small XP reductions only. Never takes a player's KP. */
export class DrivingRules {
 private trips=new Map<string,{key:string;metres:number;harsh:number;violations:number;lastHarsh:number}>();
 private previous=new Map<string,Previous>();private cooldown=new Map<string,number>();
 inspect(bus:BusState,driver:PlayerState,now:number,impactSpeed=0){
  const key=bus.trip+':'+bus.driver;let trip=this.trips.get(bus.id);if(!trip||trip.key!==key){trip={key,metres:0,harsh:0,violations:0,lastHarsh:0};this.trips.set(bus.id,trip);}
  const messages:string[]=[],old=this.previous.get(bus.id),d=districtAt(bus.x),z=roadZ(d,bus.x-d.offset);
  const next:Previous={x:bus.x,z:bus.z,speed:bus.speed,at:now,wrongSince:old?.wrongSince||0,speedSince:old?.speedSince||0,stoppedSince:old?.stoppedSince||0,driver:bus.driver};
  const violation=(kind:string)=>{const key=driver.id+':'+kind;if(now-(this.cooldown.get(key)??-Infinity)<30000)return;this.cooldown.set(key,now);trip!.violations++;const v=progression(driver.progress);v.violations=(v.violations||0)+1;v.rating=Math.max(0,(v.rating??100)-4);const repeated=v.violations>1;if(repeated)v.driverXP=Math.max(0,v.driverXP-5);messages.push((repeated?'−5 Driver XP · ':'Warning · ')+kind+' · KP unchanged');};
  if(old&&old.driver===driver.id&&now-old.at<1000&&Math.hypot(bus.x-old.x,bus.z-old.z)<12){
   const elapsed=(now-old.at)/1000;if(elapsed>0){trip.metres+=Math.hypot(bus.x-old.x,bus.z-old.z);if(old.speed>6&&(old.speed-bus.speed)/elapsed>9&&now-trip.lastHarsh>3000){trip.harsh++;trip.lastHarsh=now;}}
   const stops=routeStops(bus),expected=STOPS.find(s=>s.id===stops[bus.next]),prior=STOPS.find(s=>s.id===stops[Math.max(0,bus.next-1)]);
   if(!bus.finished&&bus.next>0&&expected&&prior){const dx=expected.x-prior.x,dz=expected.z-prior.z,length=Math.hypot(dx,dz);const along=(bus.x-expected.x)*dx+(bus.z-expected.z)*dz;const before=(old.x-expected.x)*dx+(old.z-expected.z)*dz;if(length>0&&before<expected.radius*length&&along>=expected.radius*length)violation('Missed required stop');}
   const unsafe=bus.doors&&Math.abs(bus.speed)<.2&&!STOPS.some(s=>Math.hypot(s.x-bus.x,s.z-bus.z)<s.radius)&&Math.abs(bus.z-z)<5;next.stoppedSince=unsafe?(old.stoppedSince||now):0;if(next.stoppedSince&&now-next.stoppedSince>10000)violation('Unsafe stopping in lane');
   for(const s of SIGNALS)if(signalColor(now,s.offset)==='red'&&(old.x-s.x)*(bus.x-s.x)<0&&Math.abs(bus.z-s.z)<8)violation('Red signal');
   const moving=Math.abs(bus.speed)>3,wrong=moving&&Math.abs(bus.z-z)>1&&Math.abs(bus.z-z)<6&&(bus.z-z)*Math.sin(bus.yaw)>0;
   next.wrongSince=wrong?(old.wrongSince||now):0;if(next.wrongSince&&now-next.wrongSince>8000)violation('Keep left');
   const speeding=Math.abs(bus.speed)*3.6>speedLimit(bus.x)+8;next.speedSince=speeding?(old.speedSince||now):0;if(next.speedSince&&now-next.speedSince>5000)violation('Severe speeding');
   if(impactSpeed>7)violation('Heavy impact');
  }else{next.wrongSince=0;next.speedSince=0;next.stoppedSince=0;}
  this.previous.set(bus.id,next);return messages;
 }
 finish(bus:BusState,driver:PlayerState){
  const trip=this.trips.get(bus.id);if(!trip||trip.key!==bus.trip+':'+driver.id||trip.metres<100)return '';
  const score=Math.max(0,100-trip.violations*12-trip.harsh*3),v=progression(driver.progress);
  v.rating=Math.round((v.rating??100)*.7+score*.3);
  const delivered=bus.passengers.length>0,bonus=score>=80?(delivered?30:20):score>=60?10:0;
  driver.progress.kp+=bonus;v.driverXP+=bonus;
  this.trips.delete(bus.id);return 'Route rating '+score+'/100 · +'+bonus+' KP / Driver XP';
 }
 forget(id:string){this.previous.delete(id);for(const key of this.cooldown.keys())if(key.startsWith(id+':'))this.cooldown.delete(key);}
}
