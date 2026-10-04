export type Pose={x:number;z:number;yaw:number};
/** Holds immutable received poses. No extrapolation beyond authoritative positions. */
export class MotionBuffer {
 private frames:{at:number;poses:Map<string,Pose>}[]=[];
 push(at:number,poses:(Pose&{id:string})[]){this.frames.push({at,poses:new Map(poses.map(p=>[p.id,{x:p.x,z:p.z,yaw:p.yaw}]))});if(this.frames.length>12)this.frames.shift();}
 sample(id:string,at:number):Pose|undefined {
  let a=this.frames[0],b=this.frames.at(-1);if(!a||!b)return;
  if(at<=a.at)return a.poses.get(id);
  for(let i=1;i<this.frames.length;i++)if(this.frames[i].at>=at){a=this.frames[i-1];b=this.frames[i];break;}
  const p=a.poses.get(id),q=b.poses.get(id);if(!p||!q)return q;
  // Teleports/recovery should not sweep a bus across the map.
  if(Math.hypot(q.x-p.x,q.z-p.z)>15)return {...q};
  const f=Math.max(0,Math.min(1,(at-a.at)/Math.max(1,b.at-a.at)));
  return {x:p.x+(q.x-p.x)*f,z:p.z+(q.z-p.z)*f,yaw:p.yaw+Math.atan2(Math.sin(q.yaw-p.yaw),Math.cos(q.yaw-p.yaw))*f};
 }
 reset(){this.frames=[];}
}
