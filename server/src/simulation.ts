import {createTraffic,advanceTraffic} from '../../shared/traffic.js';
import type {Weather} from '../../shared/types.js';
import {move,SPAWN,blocked,LIMITS} from '../../shared/world.js';
import {STOPS,ROUTES,BUS_SPAWNS,DISCOVERIES,MISSIONS,distance,routeStops} from '../../shared/game-data.js';
import {EMOTES} from '../../shared/types.js';
import type {Input,PlayerState,BusState,Progress,Action,Snapshot} from '../../shared/types.js';
export const emptyProgress=():Progress=>({kp:0,missions:[],journal:[],places:[],driverStops:[]});
export function validInput(v:unknown):v is Input {if(!v||typeof v!=='object')return false;const a=v as Input;return Number.isSafeInteger(a.seq)&&a.seq>=0&&Number.isFinite(a.x)&&Number.isFinite(a.z)&&Math.abs(a.x)<=1&&Math.abs(a.z)<=1&&typeof a.sprint==='boolean'&&(a.throttle===undefined||Number.isFinite(a.throttle)&&Math.abs(a.throttle)<=1)&&(a.steer===undefined||Number.isFinite(a.steer)&&Math.abs(a.steer)<=1)&&(a.brake===undefined||typeof a.brake==='boolean');}
export function cleanName(v:unknown){return typeof v==='string'?v.normalize('NFKC').replace(/[^\p{L}\p{N} _-]/gu,'').trim().slice(0,18):'';}
export function createPlayer(id:string,name:string,index:number):PlayerState{return {id,name,x:SPAWN.x+(index%4)*1.3,z:SPAWN.z-Math.floor(index/4)*1.4,yaw:0,moving:false,sprint:false,color:index%6,seq:0,role:'walker',busId:null,seat:-1,destination:'',progress:emptyProgress(),rideStart:-1,cycle:false,standing:false,settings:{quality:"auto",muted:false}};}
export function step(p:PlayerState,input:Input,dt:number){const pos=move(p,input.x,input.z,input.sprint||p.cycle,Math.min(dt,.05));p.moving=distance(p,pos)>.001;p.x=pos.x;p.z=pos.z;p.sprint=input.sprint;p.seq=input.seq;if(p.moving)p.yaw=Math.atan2(input.x,input.z);}
export function busStop(b:BusState){return STOPS.find(s=>distance(s,b)<=s.radius);}
export function seatPosition(b:BusState,seat:number,driver=false){const x=driver?.8:seat>=10?0:(seat%2? .75:-.75),z=driver?3.6:seat>=10?-1-(seat%2)*1.2:2.4-Math.floor(seat/2)*1.15;return {x:b.x+Math.cos(b.yaw)*x+Math.sin(b.yaw)*z,z:b.z-Math.sin(b.yaw)*x+Math.cos(b.yaw)*z};}
export function doorPosition(b:BusState){return {x:b.x-Math.cos(b.yaw)*2+Math.sin(b.yaw)*2.8,z:b.z+Math.sin(b.yaw)*2+Math.cos(b.yaw)*2.8};}
function busBlocked(b:BusState,x:number,z:number,yaw:number){if(x<LIMITS.minX+2||x>LIMITS.maxX-2||z<LIMITS.minZ+5||z>LIMITS.maxZ-5)return true;for(const dz of [-4,0,4])for(const dx of [-1.3,1.3])if(blocked(x+Math.cos(yaw)*dx+Math.sin(yaw)*dz,z-Math.sin(yaw)*dx+Math.cos(yaw)*dz,.25))return true;return false;}
export function busesOverlap(a:BusState,b:BusState){const axes=(v:BusState)=>[{x:Math.cos(v.yaw),z:-Math.sin(v.yaw)},{x:Math.sin(v.yaw),z:Math.cos(v.yaw)}];const aa=axes(a),bb=axes(b),dot=(u:{x:number;z:number},v:{x:number;z:number})=>u.x*v.x+u.z*v.z;for(const axis of [...aa,...bb]){const radius=(basis:typeof aa)=>1.5*Math.abs(dot(basis[0],axis))+4.9*Math.abs(dot(basis[1],axis));if(Math.abs(dot({x:a.x-b.x,z:a.z-b.z},axis))>=radius(aa)+radius(bb))return false;}return true;}
export function drive(b:BusState,input:Input,dt:number,others:BusState[]=[]){const throttle=input.throttle||0;b.steer=input.steer||0;let acceleration=throttle*(throttle<0&&b.speed>0?8:3.8);if(input.brake||b.doors||b.handbrake||!b.driver)acceleration=-Math.sign(b.speed)*12;else acceleration-=b.speed*.14+Math.sign(b.speed)*.5;let next=b.speed+acceleration*dt;if((input.brake||b.doors||b.handbrake||!b.driver)&&Math.sign(next)!==Math.sign(b.speed))next=0;b.speed=Math.max(-4,Math.min(16,next));if(Math.abs(b.speed)<.05&&Math.abs(throttle)<.05)b.speed=0;const yaw=b.yaw+b.steer*b.speed/6*Math.tan(.48)*dt;const x=b.x+Math.sin(yaw)*b.speed*dt,z=b.z+Math.cos(yaw)*b.speed*dt;if(busBlocked(b,x,z,yaw)||others.some(other=>other.id!==b.id&&busesOverlap({...b,x,z,yaw},other))){b.speed=0;}else{b.x=x;b.z=z;b.yaw=Math.atan2(Math.sin(yaw),Math.cos(yaw));}}
export type RoomState={players:PlayerState[];buses:BusState[];inputs:Record<string,{input:Input;at:number}>;seen:Record<string,number>;lastActions:Record<string,number>;updated:number;weather:Weather;weatherSince:number;traffic:ReturnType<typeof createTraffic>;events:{id:string;text:string;at:number}[]};
export function newRoom(now=Date.now()):RoomState{return {players:[],buses:BUS_SPAWNS.map(s=>({...s,speed:0,steer:0,driver:null,passengers:[],doors:true,lights:false,next:0,served:[],trip:1,requested:false,lastUsed:now,horn:0,finished:false,handbrake:true,direction:1 as const})),inputs:{},seen:{},lastActions:{},updated:now,weather:"clear",weatherSince:now,traffic:createTraffic(),events:[]};}
export class Simulation {
 constructor(public state:RoomState=newRoom()){}
 join(id:string,name:string,progress?:Progress,now=Date.now()){let p=this.state.players.find(p=>p.id===id);if(p){this.state.seen[id]=now;return p;}if(this.state.players.length>=12)throw Error('This room is full. Up to 12 travellers can join.');p=createPlayer(id,cleanName(name)||'Traveller',this.state.players.length);if(progress)p.progress=progress;this.state.players.push(p);this.state.seen[id]=now;return p;}
 input(id:string,v:unknown,now=Date.now()){if(!validInput(v))return false;const p=this.state.players.find(p=>p.id===id);if(!p)return false;const last=this.state.inputs[id];if(last&&v.seq<=last.input.seq)return false;this.state.inputs[id]={input:v,at:now};this.state.seen[id]=now;return true;}
 disconnect(id:string,now=Date.now()){const p=this.state.players.find(p=>p.id===id);if(!p)return;const b=this.state.buses.find(b=>b.id===p.busId);if(b){if(b.driver===id){b.driver=null;b.speed=0;b.doors=true;b.lastUsed=now;}b.passengers=b.passengers.filter(v=>v!==id);}this.state.players=this.state.players.filter(p=>p.id!==id);delete this.state.inputs[id];delete this.state.seen[id];delete this.state.lastActions[id];}
 reward(p:PlayerState,id:string){if(p.progress.missions.includes(id))return;p.progress.missions.push(id);p.progress.kp+=MISSIONS.find(m=>m.id===id)?.reward||100;}
 advance(now=Date.now()){
  const state=this.state;if(now-state.weatherSince>360000){const kinds:Weather[]=["clear","cloudy","rain","evening"];state.weather=kinds[(kinds.indexOf(state.weather)+1)%4];state.weatherSince=now;}let remaining=Math.max(0,Math.min((now-state.updated)/1000,.6));state.updated=now;
  for(const p of [...state.players])if(now-(state.seen[p.id]||0)>15000)this.disconnect(p.id,now);
  while(remaining>1e-7){const dt=Math.min(1/30,remaining);remaining-=dt;
   for(const p of state.players){const data=state.inputs[p.id],input=data&&now-data.at<450?data.input:{seq:p.seq,x:0,z:0,sprint:false,brake:true};if(p.role==='walker')step(p,input,dt);else if(p.role==='driver'){const b=state.buses.find(b=>b.id===p.busId);if(b&&b.driver===p.id){const ahead=state.traffic.some(t=>{const dx=t.x-b.x,dz=t.z-b.z;const f=dx*Math.sin(b.yaw)+dz*Math.cos(b.yaw),side=dx*Math.cos(b.yaw)-dz*Math.sin(b.yaw);return f>0&&f<9&&Math.abs(side)<2.5;});drive(b,ahead&&b.speed>0?{...input,brake:true}:input,dt,state.buses);}}}
   advanceTraffic(state.traffic,state.buses,dt);
   for(const b of state.buses){if(!b.driver&&Math.abs(b.speed)>.01)drive(b,{seq:0,x:0,z:0,sprint:false,brake:true},dt);}
  }
  for(const b of state.buses){
   if(!b.driver&&!b.passengers.length&&now-b.lastUsed>25000&&distance(b,STOPS[0])>22){const spawn=BUS_SPAWNS.find(s=>s.id===b.id)!;Object.assign(b,{x:spawn.x,z:spawn.z,yaw:spawn.yaw,speed:0,doors:true,next:0,direction:1,served:[],finished:false,handbrake:true,trip:b.trip+1,lastUsed:now});}
   const stop=busStop(b),expected=routeStops(b)[b.next];
   if(b.driver&&stop&&stop.id===expected&&Math.abs(b.speed)*3.6<2&&b.doors&&!b.finished){b.served.push(stop.id);const driver=state.players.find(p=>p.id===b.driver)!;const stopReward=b.route+':'+stop.id;if(!driver.progress.driverStops.includes(stopReward)){driver.progress.driverStops.push(stopReward);driver.progress.kp+=10;}b.requested=false;
    for(const id of b.passengers){const p=state.players.find(p=>p.id===id);if(!p)continue;if(p.rideStart===b.trip&&b.direction===1&&stop.id==='mananchira')this.reward(p,'first-journey');if(p.rideStart===b.trip&&b.next===routeStops(b).length-1){if(!p.progress.missions.includes('passenger'))p.progress.kp+=75;this.reward(p,'passenger');}}
    if(b.next===routeStops(b).length-1){b.finished=true;this.reward(driver,'driver');}else b.next++;
   }
   if(b.driver){const p=state.players.find(p=>p.id===b.driver);if(p){Object.assign(p,seatPosition(b,0,true));p.yaw=b.yaw;p.moving=false;}}
   b.passengers.forEach((id,index)=>{const p=state.players.find(p=>p.id===id);if(p){p.seat=index;Object.assign(p,seatPosition(b,p.standing?10+index%2:index));p.yaw=b.yaw;p.moving=false;}});
  }
  for(const p of state.players)for(const stop of STOPS)if(distance(p,stop)<stop.radius&&!p.progress.places.includes(stop.id)){p.progress.places.push(stop.id);p.progress.kp+=20;}
  state.events=state.events.filter(e=>now-e.at<4000).slice(-8);
 }
 action(id:string,a:Action,now=Date.now()):{ok:boolean;message:string}{
  const p=this.state.players.find(p=>p.id===id);if(!p)return {ok:false,message:'Rejoin the room to continue.'};
  if(!a||typeof a.type!=='string'||a.target!==undefined&&typeof a.target!=='string')return {ok:false,message:'Invalid action.'};
  if(now-(this.state.lastActions[id]||0)<160)return {ok:false,message:'Please wait a moment.'};this.state.lastActions[id]=now;this.state.seen[id]=now;
  const fail=(message:string)=>({ok:false,message});const ok=(message:string)=>({ok:true,message});const b=this.state.buses.find(b=>b.id===(p.busId||a.target));
  if(a.type==='claim'){
   if(p.role!=='walker'||!b||b.driver||distance(p,b)>8||!busStop(b)||Math.abs(b.speed)>.3)return fail('Approach an available stopped bus at a marked stop.');
   b.driver=p.id;b.lastUsed=now;p.role='driver';p.busId=b.id;p.cycle=false;return ok('You are the driver. Close doors with F, release the handbrake with B, then use W/S and A/D.');
  }
  if(a.type==='board'){
   if(p.role!=='walker'||!b||b.passengers.length>=10||distance(p,doorPosition(b))>4||Math.abs(b.speed)*3.6>=2||!b.doors||!busStop(b))return fail('Wait near the open left-side door at a marked stop. The bus must be stopped.');
   p.role='passenger';p.standing=false;p.busId=b.id;p.cycle=false;p.seat=b.passengers.length;b.passengers.push(id);p.rideStart=busStop(b)?.id===routeStops(b)[0]&&b.next<=1?b.trip:-1;return ok('You are on board. Pick a destination or request a stop.');
  }
  if(a.type==='exit'){
   if(!b||p.role==='walker')return fail('You are already on foot.');if(Math.abs(b.speed)*3.6>=2||!b.doors||(!busStop(b)&&b.driver))return fail('Exit at a marked stop after the driver stops and opens the doors.');
   if(p.role==='driver'){b.driver=null;b.lastUsed=now;}else b.passengers=b.passengers.filter(v=>v!==id);Object.assign(p,doorPosition(b));p.role='walker';p.busId=null;p.seat=-1;p.rideStart=-1;return ok('You are back on foot.');
  }
  if(['door','light','horn','route','handbrake'].includes(a.type)){
   if(!b||p.role!=='driver'||b.driver!==id)return fail('Only this bus’s driver can use that control.');
   if(a.type==='handbrake'){b.handbrake=!b.handbrake;return ok(b.handbrake?'Handbrake on.':'Handbrake released.');}
   if(a.type==='door'){if(Math.abs(b.speed)*3.6>=2)return fail('Stop the bus before opening or closing the doors.');b.doors=!b.doors;return ok(b.doors?'Doors open.':'Doors closed.');}
   if(a.type==='light'){b.lights=!b.lights;return ok(b.lights?'Headlights on.':'Headlights off.');}
   if(a.type==='horn'){b.horn=now;return ok('Horn.');}
   if(a.target!=='A'&&a.target!=='B')return fail('Choose route A or B.');if(distance(b,STOPS[0])>22||Math.abs(b.speed)>.3||b.passengers.length)return fail('Change route at the terminal, stopped with no passengers.');b.route=a.target;b.direction=1;b.next=0;b.served=[];b.finished=false;b.trip++;return ok('Route selected: '+ROUTES[b.route].name);
  }
  if(a.type==='return-route'){if(!b||p.role!=='driver'||!b.finished||Math.abs(b.speed)>.3||!b.doors||busStop(b)?.id!==routeStops(b).at(-1))return fail('Finish the route, stop and open doors at the final stop.');b.direction=b.direction===1?-1:1;b.next=1;b.served=[routeStops(b)[0]];b.finished=false;b.trip++;for(const id of b.passengers){const rider=this.state.players.find(p=>p.id===id);if(rider)rider.rideStart=b.trip;}return ok('Return journey ready. Turn the bus around, then follow the next stop.');}
  if(a.type==='posture'){if(!b||p.role!=='passenger')return fail('Board a bus first.');p.standing=!p.standing;return ok(p.standing?'Standing in the aisle.':'Seated.');}
  if(a.type==='weather'){if(p.role!=='driver')return fail('Only a driver can change shared weather.');if(!['clear','cloudy','rain','evening'].includes(a.target||''))return fail('Choose a weather preset.');this.state.weather=a.target as Weather;this.state.weatherSince=now;return ok('Shared weather: '+a.target);}
  if(a.type==='request-stop'){if(!b||p.role!=='passenger')return fail('Board a bus to request a stop.');if(a.target&&ROUTES[b.route].stops.includes(a.target))p.destination=a.target;b.requested=true;return ok('Stop requested. The driver can see your request.');}
  if(a.type==='interact'){
   const item=DISCOVERIES.find(v=>v.id===a.target);if(p.role!=='walker'||!item||distance(p,item)>5)return fail('Walk closer to the discovery marker.');if(p.progress.journal.includes(item.id))return fail('Already recorded in your journal.');p.progress.journal.push(item.id);p.progress.kp+=25;
   const needed=DISCOVERIES.filter(v=>v.group===item.group);if(['sunset','food','heritage','plants','clean'].includes(item.group)&&needed.every(v=>p.progress.journal.includes(v.id)))this.reward(p,item.group);return ok(item.name+' added to your journal. +25 KP');
  }
  if(a.type==='cycle'){if(p.role!=='walker')return fail('Leave the bus before cycling.');if(!p.cycle&&distance(p,{x:810,z:13})>7)return fail('Find the cycle stand in Kattangal.');p.cycle=!p.cycle;return ok(p.cycle?'Cycle ready. Use the movement controls.':'Cycle parked.');}
  if(a.type==='recover'){
   if(p.role==='passenger')return fail('Ask the driver to stop. If they disconnect, use Exit after the bus stops.');if(b&&p.role==='driver'){if(b.passengers.length||Math.abs(b.speed)>.3)return fail('Recovery requires an empty, stopped bus.');const spawn=BUS_SPAWNS.find(v=>v.id===b.id)!;Object.assign(b,{x:spawn.x,z:spawn.z,yaw:spawn.yaw,speed:0,doors:true,next:0,direction:1,served:[],finished:false,handbrake:true,trip:b.trip+1});}else Object.assign(p,SPAWN);return ok('Returned to the terminal.');
  }
  if(a.type==='emote'){if(!EMOTES.includes(a.target as any))return fail('Choose a preset greeting.');this.state.events.push({id:p.id,text:p.name+': '+a.target,at:now});return ok(a.target!);}
  return fail('Unknown action.');
 }
 snapshot(now=Date.now()):Snapshot{return {time:now,players:this.state.players,buses:this.state.buses,events:this.state.events,weather:this.state.weather,traffic:this.state.traffic};}
}
