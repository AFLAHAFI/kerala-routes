import type {BusState,PlayerState} from '../../shared/types';
import {SIGNALS,signalColor,speedLimit} from '../../shared/road-rules';
import {districtAt,roadZ} from '../../shared/districts';
import {progression} from '../../shared/progression';
type Previous={x:number;z:number;speed:number;at:number;wrongSince:number;speedSince:number;driver:string|null};
/** Warnings and small XP reductions only. Never takes a player's KP. */
export class DrivingRules {
 private previous=new Map<string,Previous>();private cooldown=new Map<string,number>();
 inspect(bus:BusState,driver:PlayerState,now:number,impactSpeed=0){
  const messages:string[]=[],old=this.previous.get(bus.id),d=districtAt(bus.x),z=roadZ(d,bus.x-d.offset);
  const next:Previous={x:bus.x,z:bus.z,speed:bus.speed,at:now,wrongSince:old?.wrongSince||0,speedSince:old?.speedSince||0,driver:bus.driver};
  const violation=(kind:string)=>{const key=driver.id+':'+kind;if(now-(this.cooldown.get(key)??-Infinity)<30000)return;this.cooldown.set(key,now);const v=progression(driver.progress);v.violations=(v.violations||0)+1;v.rating=Math.max(0,(v.rating??100)-4);const repeated=v.violations>1;if(repeated)v.driverXP=Math.max(0,v.driverXP-5);messages.push((repeated?'−5 Driver XP · ':'Warning · ')+kind+' · KP unchanged');};
  if(old&&old.driver===driver.id&&now-old.at<1000&&Math.hypot(bus.x-old.x,bus.z-old.z)<12){
   for(const s of SIGNALS)if(signalColor(now,s.offset)==='red'&&(old.x-s.x)*(bus.x-s.x)<0&&Math.abs(bus.z-s.z)<8)violation('Red signal');
   const moving=Math.abs(bus.speed)>3,wrong=moving&&Math.abs(bus.z-z)>1&&Math.abs(bus.z-z)<6&&(bus.z-z)*Math.sin(bus.yaw)>0;
   next.wrongSince=wrong?(old.wrongSince||now):0;if(next.wrongSince&&now-next.wrongSince>8000)violation('Keep left');
   const speeding=Math.abs(bus.speed)*3.6>speedLimit(bus.x)+8;next.speedSince=speeding?(old.speedSince||now):0;if(next.speedSince&&now-next.speedSince>5000)violation('Severe speeding');
   if(impactSpeed>7)violation('Heavy impact');
  }else{next.wrongSince=0;next.speedSince=0;}
  this.previous.set(bus.id,next);return messages;
 }
 forget(id:string){this.previous.delete(id);for(const key of this.cooldown.keys())if(key.startsWith(id+':'))this.cooldown.delete(key);}
}
