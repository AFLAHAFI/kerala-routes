import {BOAT_DOCKS,cycleStand} from '../../shared/exploration';
import {DrivingRules} from './driving-rules';
import {BUS_MODELS,busModel,busLayout} from '../../shared/buses';
import {DISTRICTS,districtAt,districtBounds,terminalAt} from '../../shared/districts';
import {createNpcs,updateNpcs,releaseDepotNpcs,type NpcPassenger} from './npc';
import {migrateProgress,progression,buy,SHOP_ITEMS} from '../../shared/progression';
import {lightState} from '../../shared/time';
import {createTraffic,advanceTraffic,trafficForPlayers} from '../../shared/traffic.js';
import type {Weather} from '../../shared/types.js';
import {move,SPAWN,blocked,LIMITS} from '../../shared/world.js';
import {STOPS,ROUTES,BUS_SPAWNS,DISCOVERIES,MISSIONS,distance,routeStops} from '../../shared/game-data.js';
import {EMOTES} from '../../shared/types.js';
import type {Input,PlayerState,BusState,Progress,Action,Snapshot} from '../../shared/types.js';
export const emptyProgress=():Progress=>({kp:0,missions:[],journal:[],places:[],driverStops:[]});
export function validInput(v:unknown):v is Input {if(!v||typeof v!=='object')return false;const a=v as Input;return Number.isSafeInteger(a.seq)&&a.seq>=0&&Number.isFinite(a.x)&&Number.isFinite(a.z)&&Math.abs(a.x)<=1&&Math.abs(a.z)<=1&&typeof a.sprint==='boolean'&&(a.throttle===undefined||Number.isFinite(a.throttle)&&Math.abs(a.throttle)<=1)&&(a.steer===undefined||Number.isFinite(a.steer)&&Math.abs(a.steer)<=1)&&(a.brake===undefined||typeof a.brake==='boolean');}
export function cleanName(v:unknown){return typeof v==='string'?v.normalize('NFKC').replace(/[^\p{L}\p{N} _-]/gu,'').trim().slice(0,18):'';}
export function createPlayer(id:string,name:string,index:number):PlayerState{return {id,name,x:SPAWN.x+(index%4)*1.3,z:SPAWN.z-Math.floor(index/4)*1.4,yaw:0,moving:false,sprint:false,color:index%6,seq:0,role:'walker',busId:null,seat:-1,destination:'',progress:emptyProgress(),rideStart:-1,cycle:false,standing:false,settings:{quality:"auto",muted:false}};}
export function step(p:PlayerState,input:Input,dt:number){const dock=BOAT_DOCKS.find(d=>d.id===p.boat),elapsed=Math.min(dt,.05),length=Math.max(1,Math.hypot(input.x,input.z));const pos=dock?{x:Math.max(dock.water.x-dock.water.w/2+3,Math.min(dock.water.x+dock.water.w/2-3,p.x+(input.brake?0:input.x/length)*4*elapsed)),z:Math.max(dock.water.z-dock.water.d/2+3,Math.min(dock.water.z+dock.water.d/2-3,p.z+(input.brake?0:input.z/length)*4*elapsed))}:move(p,input.brake&&p.cycle?0:input.x,input.brake&&p.cycle?0:input.z,input.sprint||p.cycle,elapsed);if(dock)p.boatDistance=(p.boatDistance||0)+distance(p,pos);if(p.cycle)p.cycleDistance=(p.cycleDistance||0)+distance(p,pos);p.moving=distance(p,pos)>.001;p.x=pos.x;p.z=pos.z;p.sprint=input.sprint;p.seq=input.seq;if(p.moving)p.yaw=Math.atan2(input.x,input.z);}
export function busStop(b:BusState){return STOPS.find(s=>distance(s,b)<=s.radius);}
export function seatPosition(b:BusState,seat:number,driver=false){const x=driver?.8:seat>=10?0:(seat%2? .75:-.75),z=(driver?3.6:seat>=10?-1-(seat%2)*1.2:2.4-Math.floor(seat/2)*1.15)*busLayout(b.model).lengthScale;return {x:b.x+Math.cos(b.yaw)*x+Math.sin(b.yaw)*z,z:b.z-Math.sin(b.yaw)*x+Math.cos(b.yaw)*z};}
export function doorPosition(b:BusState){return {x:b.x-Math.cos(b.yaw)*2+Math.sin(b.yaw)*2.8*busLayout(b.model).lengthScale,z:b.z+Math.sin(b.yaw)*2+Math.cos(b.yaw)*2.8*busLayout(b.model).lengthScale};}
function busBlocked(b:BusState,x:number,z:number,yaw:number){const LIMITS=districtBounds(b.x);if(x<LIMITS.minX+2||x>LIMITS.maxX-2||z<LIMITS.minZ+5||z>LIMITS.maxZ-5)return true;for(const dz of [-4.8,0,4.8].map(z=>z*busLayout(b.model).lengthScale))for(const dx of [-1.3,1.3])if(blocked(x+Math.cos(yaw)*dx+Math.sin(yaw)*dz,z-Math.sin(yaw)*dx+Math.cos(yaw)*dz,.25))return true;return false;}
function busSpawn(b:BusState){const original=BUS_SPAWNS.find(s=>s.id===b.id)!;return {...original,x:original.x+districtAt(b.x).offset};}
export function busesOverlap(a:BusState,b:BusState){const axes=(v:BusState)=>[{x:Math.cos(v.yaw),z:-Math.sin(v.yaw)},{x:Math.sin(v.yaw),z:Math.cos(v.yaw)}];const aa=axes(a),bb=axes(b),dot=(u:{x:number;z:number},v:{x:number;z:number})=>u.x*v.x+u.z*v.z;for(const axis of [...aa,...bb]){const radius=(basis:typeof aa,bus:BusState)=>1.5*Math.abs(dot(basis[0],axis))+4.9*busLayout(bus.model).lengthScale*Math.abs(dot(basis[1],axis));if(Math.abs(dot({x:a.x-b.x,z:a.z-b.z},axis))>=radius(aa,a)+radius(bb,b))return false;}return true;}
export function drive(b:BusState,input:Input,dt:number,others:BusState[]=[]){b.braking=!!input.brake||b.handbrake||b.doors;const throttle=input.throttle||0;b.steer=input.steer||0;const model=busModel(b.model);let acceleration=throttle*(throttle<0&&b.speed>0?8:model.acceleration);if(input.brake||b.doors||b.handbrake||!b.driver)acceleration=-Math.sign(b.speed)*12;else acceleration-=b.speed*.14+Math.sign(b.speed)*.5;let next=b.speed+acceleration*dt;if((input.brake||b.doors||b.handbrake||!b.driver)&&Math.sign(next)!==Math.sign(b.speed))next=0;b.speed=Math.max(-4,Math.min(model.maxSpeed,next));if(Math.abs(b.speed)<.05&&Math.abs(throttle)<.05)b.speed=0;const yaw=b.yaw+b.steer*b.speed/6*Math.tan(.48)*dt;const x=b.x+Math.sin(yaw)*b.speed*dt,z=b.z+Math.cos(yaw)*b.speed*dt;if(busBlocked(b,x,z,yaw)||others.some(other=>other.id!==b.id&&busesOverlap({...b,x,z,yaw},other))){b.speed=0;return true;}else{b.x=x;b.z=z;b.yaw=Math.atan2(Math.sin(yaw),Math.cos(yaw));return false;}}
export type RoomState={players:PlayerState[];buses:BusState[];inputs:Record<string,{input:Input;at:number}>;seen:Record<string,number>;lastActions:Record<string,number>;updated:number;weather:Weather;weatherSince:number;traffic:ReturnType<typeof createTraffic>;events:{id:string;text:string;at:number}[]};
export function newRoom(now=Date.now()):RoomState{return {players:[],buses:BUS_SPAWNS.map((s,i)=>({...s,model:['ordinary','city','mini'][i],speed:0,steer:0,driver:null,passengers:[],doors:true,lights:false,autoLights:true,indicator:'off' as const,next:0,served:[],trip:1,requested:false,lastUsed:now,horn:0,finished:false,handbrake:true,direction:1 as const})),inputs:{},seen:{},lastActions:{},updated:now,weather:"clear",weatherSince:now,traffic:createTraffic(),events:[]};}
export class Simulation {
 private rules=new DrivingRules();private trafficDistricts="";
 minute=540;npcs:NpcPassenger[]=[];
 constructor(public state:RoomState=newRoom(),public capacity=12,withNpcs=false){if(withNpcs)this.npcs=createNpcs();}
 join(id:string,name:string,progress?:Progress,now=Date.now()){let p=this.state.players.find(p=>p.id===id);if(p){this.state.seen[id]=now;return p;}if(this.state.players.length>=this.capacity)throw Error('This room is full. Up to '+this.capacity+' travellers can join.');p=createPlayer(id,cleanName(name)||'Traveller',this.state.players.length);if(progress)p.progress=migrateProgress(progress);else p.progress=migrateProgress(p.progress);this.state.players.push(p);this.state.seen[id]=now;return p;}
 input(id:string,v:unknown,now=Date.now()){if(!validInput(v))return false;const p=this.state.players.find(p=>p.id===id);if(!p)return false;const last=this.state.inputs[id];if(last&&v.seq<=last.input.seq)return false;this.state.inputs[id]={input:v,at:now};this.state.seen[id]=now;return true;}
 disconnect(id:string,now=Date.now()){const p=this.state.players.find(p=>p.id===id);if(!p)return;const b=this.state.buses.find(b=>b.id===p.busId);if(b){if(b.driver===id){b.driver=null;b.speed=0;b.doors=true;b.lastUsed=now;}b.passengers=b.passengers.filter(v=>v!==id);}this.state.players=this.state.players.filter(p=>p.id!==id);delete this.state.inputs[id];delete this.state.seen[id];delete this.state.lastActions[id];}
 reward(p:PlayerState,id:string){if(p.progress.missions.includes(id))return;p.progress.missions.push(id);p.progress.kp+=MISSIONS.find(m=>m.id===id)?.reward||100;const v2=progression(p.progress);if(id==='driver')v2.driverXP+=100;else v2.passengerXP+=50;}
 advance(now=Date.now()){
  for(const p of this.state.players)if(p.heldItem&&p.heldItem.until<=now)p.heldItem=null;
  const state=this.state;if(this.npcs.length){const key=[...new Set(state.players.map(p=>districtAt(p.x).id))].sort().join(',');if(key!==this.trafficDistricts){state.traffic=trafficForPlayers(state.traffic,state.players);this.trafficDistricts=key;}}if(now-state.weatherSince>360000){const kinds:Weather[]=["clear","cloudy","light-rain","rain","fog","mist"];state.weather=kinds[(kinds.indexOf(state.weather)+1)%kinds.length];state.weatherSince=now;}let remaining=Math.max(0,Math.min((now-state.updated)/1000,.6));state.updated=now;
  for(const p of [...state.players])if(now-(state.seen[p.id]||0)>15000)this.disconnect(p.id,now);
  const impacts=new Map<string,number>();
  while(remaining>1e-7){const dt=Math.min(1/30,remaining);remaining-=dt;
   for(const p of state.players){const data=state.inputs[p.id],input=data&&now-data.at<450?data.input:{seq:p.seq,x:0,z:0,sprint:false,brake:true};if(p.role==='walker')step(p,input,dt);else if(p.role==='driver'){const b=state.buses.find(b=>b.id===p.busId);if(b&&b.driver===p.id){const ahead=state.traffic.some(t=>{const dx=t.x-b.x,dz=t.z-b.z;const f=dx*Math.sin(b.yaw)+dz*Math.cos(b.yaw),side=dx*Math.cos(b.yaw)-dz*Math.sin(b.yaw);return f>0&&f<9&&Math.abs(side)<2.5;});const before=Math.abs(b.speed);if(drive(b,ahead&&b.speed>0?{...input,brake:true}:input,dt,state.buses))impacts.set(b.id,Math.max(impacts.get(b.id)||0,before));}}}
   advanceTraffic(state.traffic,state.buses,dt,now);
   for(const b of state.buses){if(!b.driver&&Math.abs(b.speed)>.01)drive(b,{seq:0,x:0,z:0,sprint:false,brake:true},dt);}
  }
  if(this.npcs.length)updateNpcs(this.npcs,state.buses,now);
  for(const b of state.buses){
   const driver=state.players.find(p=>p.id===b.driver);if(driver)for(const text of this.rules.inspect(b,driver,now,impacts.get(b.id)||0))state.events.push({id:driver.id,text,at:now});
   if(b.autoLights!==false)b.lights=lightState(this.minute).night>.4;
   if(!b.driver&&!b.passengers.length&&now-b.lastUsed>25000&&distance(b,terminalAt(b.x))>22){const spawn=busSpawn(b);Object.assign(b,{x:spawn.x,z:spawn.z,yaw:spawn.yaw,speed:0,doors:true,next:0,direction:1,served:[],finished:false,handbrake:true,trip:b.trip+1,lastUsed:now});}
   const stop=busStop(b),expected=routeStops(b)[b.next];
   if(b.driver&&stop&&stop.id===expected&&Math.abs(b.speed)*3.6<2&&b.doors&&!b.finished){b.served.push(stop.id);const driver=state.players.find(p=>p.id===b.driver)!;const stopReward=b.route+':'+stop.id;if(!driver.progress.driverStops.includes(stopReward)){driver.progress.driverStops.push(stopReward);driver.progress.kp+=10;progression(driver.progress).driverXP+=20;}b.requested=false;
    for(const id of b.passengers){const p=state.players.find(p=>p.id===id);if(!p)continue;if(p.rideStart===b.trip&&b.direction===1&&stop.id==='mananchira')this.reward(p,'first-journey');if(p.rideStart===b.trip&&b.next===routeStops(b).length-1){if(!p.progress.missions.includes('passenger'))p.progress.kp+=75;this.reward(p,'passenger');}}
    if(b.next===routeStops(b).length-1){b.finished=true;const rating=this.rules.finish(b,driver);if(rating)state.events.push({id:driver.id,text:rating,at:now});progression(driver.progress).rating=Math.min(100,(progression(driver.progress).rating??100)+2);progression(driver.progress).routesCompleted++;progression(driver.progress).driverXP+=50;this.reward(driver,'driver');}else b.next++;
   }
   if(b.driver){const p=state.players.find(p=>p.id===b.driver);if(p){Object.assign(p,seatPosition(b,0,true));p.yaw=b.yaw;p.moving=false;}}
   b.passengers.forEach((id,index)=>{const p=state.players.find(p=>p.id===id);if(p){p.seat=index;Object.assign(p,seatPosition(b,p.standing?10+index%2:index));p.yaw=b.yaw;p.moving=false;}});
  }
  for(const p of state.players){const d=districtAt(p.x);const v=progression(p.progress);if(Math.abs(p.x-(d.offset+515))<615&&Math.abs(p.z)<90&&!v.districts.includes(d.id)){v.districts.push(d.id);v.passengerXP+=50;p.progress.kp+=25;}if((p.boatDistance||0)>=80)this.reward(p,'lake-explorer');if((p.cycleDistance||0)>=200)this.reward(p,'cycle-trail');}
  for(const p of state.players)for(const stop of STOPS)if(distance(p,stop)<stop.radius&&!p.progress.places.includes(stop.id)){p.progress.places.push(stop.id);p.progress.kp+=20;progression(p.progress).passengerXP+=10;}

  state.events=state.events.filter(e=>now-e.at<4000).slice(-8);
 }
 action(id:string,a:Action,now=Date.now()):{ok:boolean;message:string}{
  const p=this.state.players.find(p=>p.id===id);if(!p)return {ok:false,message:'Rejoin the room to continue.'};
  if(!a||typeof a.type!=='string'||a.target!==undefined&&typeof a.target!=='string')return {ok:false,message:'Invalid action.'};
  if(now-(this.state.lastActions[id]||0)<160)return {ok:false,message:'Please wait a moment.'};this.state.lastActions[id]=now;this.state.seen[id]=now;
  const fail=(message:string)=>({ok:false,message});const ok=(message:string)=>({ok:true,message});const b=this.state.buses.find(b=>b.id===(p.busId||a.target));
  if(a.type==='boat'){
   if(p.role!=='walker')return fail('Leave the bus before boating.');const dock=BOAT_DOCKS.find(d=>d.id===(p.boat||a.target));if(!dock)return fail('Find a lake dock in Wayanad or Palakkad.');if(p.boat){if(distance(p,{x:dock.water.x-24,z:dock.water.z-12})>8)return fail('Return to the southwest dock to leave your boat.');p.boat=null;Object.assign(p,{x:dock.x,z:dock.z});return ok('Boat returned to the dock.');}if(distance(p,dock)>7)return fail('Walk closer to the boat dock.');p.boat=dock.id;p.cycle=false;Object.assign(p,{x:dock.water.x-24,z:dock.water.z-12});return ok('Use movement controls to paddle. Return here to disembark.');
  }
  if(a.type==='bus-model'){
   const model=BUS_MODELS.find(m=>m.id===a.target);if(!model)return fail('Unknown bus variant.');if(!b||p.role!=='driver'||b.driver!==id||b.passengers.some(id=>this.state.players.some(p=>p.id===id))||Math.abs(b.speed)>.3||distance(b,terminalAt(b.x))>22)return fail('Choose a variant in an empty stopped bus at the terminal.');if(progression(p.progress).driverXP<model.xp)return fail('Earn '+model.xp+' Driver XP to unlock this variant.');releaseDepotNpcs(this.npcs,b,now);b.model=model.id;b.name=model.name;b.paint=model.color;return ok(model.name+' ready · '+busLayout(model.id).capacity+' passenger seats.');
  }
  if(a.type==='district')return fail('Follow the connecting roads to travel between districts.');
  if(a.type==='buy'){

   if(p.role!=='walker'||distance(p,{x:districtAt(p.x).offset-32,z:15})>12)return fail('Visit the market bakery counter on foot to shop.');
   const duplicate=progression(p.progress).purchases.includes(a.requestId||'');
   const result=buy(p.progress,a.target||'',a.requestId||'');
   if(result.ok&&!duplicate&&SHOP_ITEMS.find(i=>i.id===a.target)?.kind==='food')p.heldItem={kind:a.target!,until:now+4000};
   return result;
  }
  if(a.type==='equip'){
   const item=SHOP_ITEMS.find(i=>i.id===a.target),v2=progression(p.progress);
   if(!item||!v2.owned.includes(item.id))return fail('Buy this item first.');
   if(['outfit','bag','bicycle'].includes(item.kind)){v2.equipped[item.kind]=item.id;return ok(item.name+' equipped.');}
   if(!b||p.role!=='driver'||b.driver!==id||distance(b,terminalAt(b.x))>22||Math.abs(b.speed)>.3||b.passengers.some(id=>this.state.players.some(p=>p.id===id)))return fail('Customize at the terminal after real passengers have exited.');
   releaseDepotNpcs(this.npcs,b,now);
   if(item.kind==='paint')b.paint=item.value;else if(item.kind==='seat')b.seatStyle=item.value;else if(item.kind==='horn')b.hornPreset=item.value;else if(item.kind!=='food'){(b.cosmetics??={})[item.kind]=item.value;}else return fail('This item cannot be equipped.');
   v2.equipped[item.kind]=item.id;return ok(item.name+' equipped.');
  }
  if(a.type==='auto-lights'||a.type==='indicator'){if(!b||b.driver!==id||p.role!=='driver')return fail('Only the driver can use that control.');if(a.type==='auto-lights'){b.autoLights=true;return ok('Automatic headlights enabled.');}if(!['off','left','right'].includes(a.target||''))return fail('Choose left, right or off.');b.indicator=a.target as 'off'|'left'|'right';return ok('Indicator '+a.target);}
  if(a.type==='claim'){
   if(p.role!=='walker'||p.boat||!b||b.driver||distance(p,b)>8||!busStop(b)||Math.abs(b.speed)>.3)return fail('Approach an available stopped bus at a marked stop.');
   for(const [kind,itemId] of Object.entries(progression(p.progress).equipped)){const item=SHOP_ITEMS.find(v=>v.id===itemId);if(item&&kind==='paint')b.paint=item.value;if(item&&kind==='seat')b.seatStyle=item.value;if(item&&kind==='horn')b.hornPreset=item.value;if(item&&['livery','wheel','curtain','dashboard','interior','board','mirror'].includes(kind))(b.cosmetics??={})[kind]=item.value;}b.driver=p.id;b.lastUsed=now;p.role='driver';p.busId=b.id;p.cycle=false;return ok('You are the driver. Close doors with F, release the handbrake with B, then use W/S and A/D.');
  }
  if(a.type==='board'){
   if(p.role!=='walker'||p.boat||!b||b.passengers.length>=busLayout(b.model).capacity||distance(p,doorPosition(b))>4||Math.abs(b.speed)*3.6>=2||!b.doors||!busStop(b))return fail('Wait near the open left-side door at a marked stop. The bus must be stopped.');
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
   if(a.type==='light'){b.autoLights=false;b.lights=!b.lights;return ok(b.lights?'Headlights on.':'Headlights off.');}
   if(a.type==='horn'){b.horn=now;return ok('Horn.');}
   const d=districtAt(b.x);if(!a.target||!(d.id==='kozhikode'?['A','B','CM','CW','CK']:d.id==='malappuram'?['M','MP']:[d.route]).includes(a.target))return fail('Choose a route in this district.');if(distance(b,terminalAt(b.x))>22||Math.abs(b.speed)>.3||b.passengers.some(id=>this.state.players.some(p=>p.id===id)))return fail('Change route at the terminal, stopped with no passengers.');releaseDepotNpcs(this.npcs,b,now);b.route=a.target;b.direction=1;b.next=0;b.served=[];b.finished=false;b.trip++;return ok('Route selected: '+ROUTES[b.route].name);
  }
  if(a.type==='return-route'){if(!b||p.role!=='driver'||!b.finished||Math.abs(b.speed)>.3||!b.doors||busStop(b)?.id!==routeStops(b).at(-1))return fail('Finish the route, stop and open doors at the final stop.');b.direction=b.direction===1?-1:1;b.next=1;b.served=[routeStops(b)[0]];b.finished=false;b.trip++;for(const id of b.passengers){const rider=this.state.players.find(p=>p.id===id);if(rider)rider.rideStart=b.trip;}return ok('Return journey ready. Turn the bus around, then follow the next stop.');}
  if(a.type==='posture'){if(!b||p.role!=='passenger')return fail('Board a bus first.');p.standing=!p.standing;return ok(p.standing?'Standing in the aisle.':'Seated.');}
  if(a.type==='weather'){if(p.role!=='driver')return fail('Only a driver can change shared weather.');if(!['clear','cloudy','rain','evening','light-rain','heavy-rain','fog','mist'].includes(a.target||''))return fail('Choose a weather preset.');this.state.weather=a.target as Weather;this.state.weatherSince=now;return ok('Shared weather: '+a.target);}
  if(a.type==='request-stop'){if(!b||p.role!=='passenger')return fail('Board a bus to request a stop.');if(a.target&&ROUTES[b.route].stops.includes(a.target))p.destination=a.target;b.requested=true;return ok('Stop requested. The driver can see your request.');}
  if(a.type==='interact'){
   const item=DISCOVERIES.find(v=>v.id===a.target);if(p.role!=='walker'||!item||distance(p,item)>5)return fail('Walk closer to the discovery marker.');if(p.progress.journal.includes(item.id))return fail('Already recorded in your journal.');if(item.id==='sunset-point'&&(this.minute<1020||this.minute>1140))return fail('Return between 17:00 and 19:00 for the sunset photograph.');if(item.id==='dawn-bird'&&(this.minute<300||this.minute>420))return fail('Return between 05:00 and 07:00 for the dawn photograph.');if(item.id==='night-pier'&&(this.minute<1140&&this.minute>300))return fail('Return after 19:00 or before 05:00 for the night photograph.');p.progress.journal.push(item.id);p.progress.kp+=25;progression(p.progress).passengerXP+=15;
   const needed=DISCOVERIES.filter(v=>v.group===item.group);if(MISSIONS.some(m=>m.id===item.group)&&needed.every(v=>p.progress.journal.includes(v.id)))this.reward(p,item.group);return ok(item.name+' added to your journal. +25 KP');
  }
  if(a.type==='cycle'){if(p.role!=='walker'||p.boat)return fail('Leave the bus or boat before cycling.');if(!p.cycle&&distance(p,cycleStand(p.x))>7)return fail('Find the cycle stand in Kattangal.');p.cycle=!p.cycle;return ok(p.cycle?'Cycle ready. Use the movement controls.':'Cycle parked.');}
  if(a.type==='recover'){
   if(p.role==='passenger')return fail('Ask the driver to stop. If they disconnect, use Exit after the bus stops.');if(b&&p.role==='driver'){if(b.passengers.length||Math.abs(b.speed)>.3)return fail('Recovery requires an empty, stopped bus.');const spawn=busSpawn(b);Object.assign(b,{x:spawn.x,z:spawn.z,yaw:spawn.yaw,speed:0,doors:true,next:0,direction:1,served:[],finished:false,handbrake:true,trip:b.trip+1});}else Object.assign(p,{...SPAWN,x:SPAWN.x+districtAt(p.x).offset,boat:null,cycle:false});return ok('Returned to the terminal.');
  }
  if(a.type==='emote'){if(!EMOTES.includes(a.target as any))return fail('Choose a preset greeting.');this.state.events.push({id:p.id,text:p.name+': '+a.target,at:now});return ok(a.target!);}
  return fail('Unknown action.');
 }
 snapshot(now=Date.now()):Snapshot{return {npcs:this.npcs,time:now,players:this.state.players,buses:this.state.buses,events:this.state.events,weather:this.state.weather,traffic:this.state.traffic};}
}
